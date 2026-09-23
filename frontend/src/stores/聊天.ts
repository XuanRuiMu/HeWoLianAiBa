import { defineStore } from 'pinia'
import { ref, computed, watch, onScopeDispose } from 'vue'
import { io, Socket } from 'socket.io-client'
import type { 消息, 角色, DuoMeiTiLeiXing } from '@/types'
import { duQuLingPai } from '@/utils/令牌存储'
import {
  huoQuXiaoXi,
  faSongXiaoXi as faSongXiaoXiApi,
  shangChuanMeiTi,
  DUO_MEI_TI_LEI_XING_SHANG_CHUAN_LEI_BIE,
  cheHuiXiaoXi as cheHuiXiaoXiApi,
  biaoJiYiDu,
  huoQuJiaoSeXiangQing,
} from '@/api/聊天'
import { huoQuFanYi } from '@/config/translations'
import { queDingMiDengJian } from '@/utils/发件箱'
import {
  BIAO_QING_BAO_MEI_TI_LEI_BIE,
  guiYiXiaoXiLeiXing,
  keTiJiaoKuai,
  kuaiDaoXiaoXiLeiXing,
  kuaiDaoZhengWen,
  shiBenDiLinShiXiaoXi,
} from '@/utils/消息内容块'
import type { DaiFaKuai } from '@/composables/use待发图文'
import type { XiaoXiKuai, XiaoXiKuaiChuCan } from '@/types'
import { track } from '@/utils/埋点'
import { 使用用户仓库 } from '@/stores/用户'

export interface MeiTiFuJia {
  shiChangHaoMiao?: number
  wenJianMing?: string
  zhuanXieWenBen?: string
  /** FP-06b：发送已在服务端的媒体（我的表情），跳过上传，复用同一条乐观更新链路 */
  yiYouMeiTi?: { meiTiId: string; meiTiUrl: string | null }
}

/**
 * FP-09b「角色回复」投递契约（与后端 AIHuiFuXiaoXiShiJian 同源）：
 * `轮次` = 服务端调度器实例内单调递增的处理 ID，`驱动消息ID` = 触发本轮的那条用户消息 ID。
 * 两者都是可选字段：秘密指令 / 主动多模态 / 夺舍等旁路推送不带它们，前端必须照旧接受，不得因缺字段丢消息。
 */
export interface JiaoSeHuiFuShiJian {
  角色ID: string
  消息列表: 消息[]
  轮次?: number | null
  驱动消息ID?: string | null
}

export const 使用聊天仓库 = defineStore('聊天', () => {
  const dangQianHuiHuaId = ref<string | null>(null)
  const xiaoXiLieBiao = ref<消息[]>([])
  const aiZhuangTai = ref<'kong_xian' | 'deng_dai_zhong' | 'zheng_zai_shu_ru'>('kong_xian')
  let zuiHouXuHao = 0
  // 「正在输入」显示态延迟消失的时长（毫秒），仅在此一处定义，禁止散落硬编码
  const ZHENG_ZAI_SHU_RU_XIAO_SHI_YAN_CHI_HAO_MIAO = 1000

  // 显示层状态：组件消费的是这个，而非真实状态 aiZhuangTai，从而支持延迟消失
  const xianShiZhengZaiShuRu = ref(false)
  let yanChiDingShiQi: ReturnType<typeof setTimeout> | null = null
  let huLueJianTing = false

  function qingLiYanChiDingShiQi() {
    if (yanChiDingShiQi !== null) {
      clearTimeout(yanChiDingShiQi)
      yanChiDingShiQi = null
    }
  }

  // 强制立即隐藏「正在输入」显示态（断线/切会话/清空等重置场景），不走延迟
  function qiangZhiYinChangXianShi() {
    qingLiYanChiDingShiQi()
    huLueJianTing = true
    aiZhuangTai.value = 'kong_xian'
    huLueJianTing = false
    xianShiZhengZaiShuRu.value = false
  }

  // 监听真实状态：从「正在输入」变「非正在输入」时延迟消失；变「正在输入」时立即显示并取消挂起的隐藏定时器
  watch(
    aiZhuangTai,
    (xinZhuangTai, jiuZhuangTai) => {
      if (huLueJianTing) return
      const xinZaiShuRu = xinZhuangTai === 'zheng_zai_shu_ru'
      const jiuZaiShuRu = jiuZhuangTai === 'zheng_zai_shu_ru'
      if (xinZaiShuRu) {
        qingLiYanChiDingShiQi()
        xianShiZhengZaiShuRu.value = true
      } else if (jiuZaiShuRu) {
        qingLiYanChiDingShiQi()
        yanChiDingShiQi = setTimeout(() => {
          xianShiZhengZaiShuRu.value = false
          yanChiDingShiQi = null
        }, ZHENG_ZAI_SHU_RU_XIAO_SHI_YAN_CHI_HAO_MIAO)
      }
    },
    { flush: 'sync' },
  )

  onScopeDispose(() => {
    qingLiYanChiDingShiQi()
    qingLiSuoYouYuLanURL()
  })

  const zhengZaiShuRu = computed(() => xianShiZhengZaiShuRu.value)
  const jiaoSeXinXi = ref<角色 | null>(null)
  const socketLianJie = ref<Socket | null>(null)
  const lianJieZhong = ref(false)
  const youXiShiJian = ref<{ lei_xing: string; xiao_xi: string } | null>(null)
  const youXiYiJieShu = ref(false)
  const keJiXuLiaoTian = ref(false)
  const yiDuBuHuiZhuangTai = ref(false)
  const cuoWuXinXi = ref<string | null>(null)
  const weiJiGanYu = ref<{ yuanZhuReXian: string; ganYuTiShi: string; chaoShiTiXingMiao: number } | null>(null)
  let weiJiChaoShiQi: ReturnType<typeof setTimeout> | null = null

  function sheZhiWeiJiGanYu(ganYu: { yuanZhuReXian: string; ganYuTiShi: string; chaoShiTiXingMiao: number }): void {
    weiJiGanYu.value = ganYu
    if (weiJiChaoShiQi) {
      clearTimeout(weiJiChaoShiQi)
      weiJiChaoShiQi = null
    }
    weiJiChaoShiQi = setTimeout(() => {
      if (weiJiGanYu.value) {
        sheZhiCuoWu(huoQuFanYi('liaoTian', 'weiJiChaoShiTiXing'))
      }
      weiJiChaoShiQi = null
    }, Math.max(1, ganYu.chaoShiTiXingMiao) * 1000)
  }

  function guanBiWeiJiGanYu(): void {
    weiJiGanYu.value = null
    if (weiJiChaoShiQi) {
      clearTimeout(weiJiChaoShiQi)
      weiJiChaoShiQi = null
    }
  }
  const yeMa = ref(1)
  const meiYeTiaoShu = ref(50)
  const zongShu = ref(0)
  const jiaZaiGengDuoZhong = ref(false)
  const haiYouGengDuo = ref(false)
  // 首屏加载态：加载中驱动骨架屏，失败驱动错误插画+重试（与「真的没消息」空态严格分离）
  const shouPingJiaZaiZhong = ref(false)
  const jiaZaiShiBai = ref(false)
  const gouJianGuoChengLieBiao = ref<{ 阶段: string; 说明: string; 内容?: string; 时间: number; 轮次?: number }[]>([])
  const haoGanDuBianHuaLieBiao = ref<{ 变化: Record<string, number>; 时间: number; 轮次?: number }[]>([])
  const yinCangXinXiLieBiao = ref<{ 类型: string; 内容: string; 时间: number; 轮次?: number }[]>([])
  const shenDuSiKaoLieBiao = ref<{ 来源: string; 内容: string; 时间: number; 轮次?: number }[]>([])
  const 监控最大条数 = 100

  function 添加监控项<T>(lieBiao: { value: T[] }, xiang: T) {
    lieBiao.value.push(xiang)
    if (lieBiao.value.length > 监控最大条数) {
      lieBiao.value.splice(0, lieBiao.value.length - 监控最大条数)
    }
    持久化监控()
  }

  // 管理员监控持久化：按会话存本地，关闭重开/刷新后仍可直接看到历史构建信息
  const 监控存储键前缀 = 'guanli-jiankong:'
  function 监控存储键(huiHuaId: string | null): string | null {
    if (!huiHuaId) return null
    return `${监控存储键前缀}${huiHuaId}`
  }
  function 持久化监控() {
    try {
      const 键 = 监控存储键(dangQianHuiHuaId.value)
      if (!键 || typeof localStorage === 'undefined') return
      localStorage.setItem(
        键,
        JSON.stringify({
          gouJian: gouJianGuoChengLieBiao.value.slice(-监控最大条数),
          haoGanDu: haoGanDuBianHuaLieBiao.value.slice(-监控最大条数),
          yinCang: yinCangXinXiLieBiao.value.slice(-监控最大条数),
          shenDuSiKao: shenDuSiKaoLieBiao.value.slice(-监控最大条数),
        }),
      )
    } catch {
      // 存储配额不足等仅影响历史回看，不影响实时监控
    }
  }
  function 读取监控历史(huiHuaId: string) {
    gouJianGuoChengLieBiao.value = []
    haoGanDuBianHuaLieBiao.value = []
    yinCangXinXiLieBiao.value = []
    shenDuSiKaoLieBiao.value = []
    try {
      const 键 = 监控存储键(huiHuaId)
      if (!键 || typeof localStorage === 'undefined') return
      const 原文 = localStorage.getItem(键)
      if (!原文) return
      const 存档 = JSON.parse(原文) as {
        gouJian?: unknown[]
        haoGanDu?: unknown[]
        yinCang?: unknown[]
        shenDuSiKao?: unknown[]
      }
      if (Array.isArray(存档.gouJian)) gouJianGuoChengLieBiao.value = 存档.gouJian.slice(-监控最大条数) as typeof gouJianGuoChengLieBiao.value
      if (Array.isArray(存档.haoGanDu)) haoGanDuBianHuaLieBiao.value = 存档.haoGanDu.slice(-监控最大条数) as typeof haoGanDuBianHuaLieBiao.value
      if (Array.isArray(存档.yinCang)) yinCangXinXiLieBiao.value = 存档.yinCang.slice(-监控最大条数) as typeof yinCangXinXiLieBiao.value
      if (Array.isArray(存档.shenDuSiKao)) shenDuSiKaoLieBiao.value = 存档.shenDuSiKao.slice(-监控最大条数) as typeof shenDuSiKaoLieBiao.value
    } catch {
      // 存档损坏时从空开始，不影响实时监控
    }
  }
  function 补全旧内心消息() {
    try {
      if (!Array.isArray(xiaoXiLieBiao.value) || xiaoXiLieBiao.value.length === 0) return
      if (!Array.isArray(shenDuSiKaoLieBiao.value)) shenDuSiKaoLieBiao.value = []
      const 已有键 = new Set(shenDuSiKaoLieBiao.value.map((项) => `${项.时间}::${项.内容}`))
      let 有新增 = false
      for (const 消息项 of xiaoXiLieBiao.value) {
        if (消息项.lei_xing !== 'neiXinHuoDong' || !消息项.nei_rong) continue
        const 键 = `${消息项.shi_jian_chuo}::${消息项.nei_rong}`
        if (已有键.has(键)) continue
        已有键.add(键)
        shenDuSiKaoLieBiao.value.push({ 来源: '历史消息', 内容: 消息项.nei_rong, 时间: 消息项.shi_jian_chuo })
        有新增 = true
      }
      if (!有新增) return
      if (shenDuSiKaoLieBiao.value.length > 监控最大条数) {
        shenDuSiKaoLieBiao.value.splice(0, shenDuSiKaoLieBiao.value.length - 监控最大条数)
      }
      持久化监控()
    } catch {
      // 补全失败不影响聊天主流程
    }
  }

  const zuiDaXiaoXiChangDu = 500
  let linShiXiaoXiXuHao = 0
  // 发送失败的消息（按 ke_hu_duan_id 记录）：气泡保留原位并显示红色感叹号，点击可重发
  const faSongShiBaiJiHe = ref(new Set<string>())
  // 串行发送队列：上一条发送请求完成（或失败）后才派发下一条，
  // 使网络派发顺序恒等于用户点击顺序，从根本上消除并发乱序。
  let faSongDuiLie: Promise<void> = Promise.resolve()

  // FP-09b 轮次闸门：序号权威已上收服务端后，「角色回复」的每一帧都带 `轮次`（调度器处理 ID）。
  // 用户插话 ⇒ 服务端 重置() 抬号作废旧轮次，前端同步丢弃轮次更小的残余条目，
  // 否则观感就是「AI 连发两条一样的消息」。
  let yiJieShouLunCi = 0
  let yiJieShouLunCiDongQiaoId: string | null = null
  // 服务端已确认落库的本方用户消息 ID（按确认先后）：用于识别「调度器实例重建 ⇒ 轮次重新计数」
  const yiQueRenYongHuXiaoXiId: string[] = []
  const 已确认ID上限 = 50

  function qingKongLunCiZhuangTai(): void {
    yiJieShouLunCi = 0
    yiJieShouLunCiDongQiaoId = null
    yiQueRenYongHuXiaoXiId.length = 0
  }

  function jiLuYiQueRenYongHuId(id: string | null | undefined): void {
    if (!id || yiQueRenYongHuXiaoXiId.includes(id)) return
    yiQueRenYongHuXiaoXiId.push(id)
    if (yiQueRenYongHuXiaoXiId.length > 已确认ID上限) yiQueRenYongHuXiaoXiId.shift()
  }

  // 只认「服务端已确认过的本方消息」：驱动消息比自己当前轮次的驱动更新 ⇒ 这是新一代轮次
  function 驱动消息更靠后(驱动消息ID: unknown): boolean {
    if (typeof 驱动消息ID !== 'string' || !驱动消息ID) return false
    const xinSuoYin = yiQueRenYongHuXiaoXiId.indexOf(驱动消息ID)
    if (xinSuoYin === -1) return false
    if (!yiJieShouLunCiDongQiaoId) return true
    const jiuSuoYin = yiQueRenYongHuXiaoXiId.indexOf(yiJieShouLunCiDongQiaoId)
    if (jiuSuoYin === -1) return true
    return xinSuoYin > jiuSuoYin
  }

  function tiJiaoLunCi(轮次: number, 驱动消息ID: unknown): void {
    yiJieShouLunCi = 轮次
    if (typeof 驱动消息ID === 'string' && 驱动消息ID) yiJieShouLunCiDongQiaoId = 驱动消息ID
  }

  /**
   * 判定并登记这一帧「角色回复」的轮次。返回 true = 作废轮次的残余，整帧丢弃。
   * 缺 `轮次`（旧推送/秘密指令等旁路）或轮次是脏值（非整数、0、负数、NaN）一律按当前轮次接受
   * —— 闸门只丢旧帧，绝不因脏数据吞掉消息。
   */
  function 判定并登记轮次(shuJu: JiaoSeHuiFuShiJian): boolean {
    const 轮次 =
      typeof shuJu.轮次 === 'number' && Number.isInteger(shuJu.轮次) && shuJu.轮次 > 0
        ? shuJu.轮次
        : null
    if (轮次 === null) return false
    if (轮次 >= yiJieShouLunCi) {
      tiJiaoLunCi(轮次, shuJu.驱动消息ID)
      return false
    }
    if (驱动消息更靠后(shuJu.驱动消息ID)) {
      tiJiaoLunCi(轮次, shuJu.驱动消息ID)
      return false
    }
    return true
  }

  /**
   * FP-10b 拼写债收口：把历史/异常数据里 'tupian' 一类的误写收回权威消息类型。
   * 只在真的不同才改写，保持对象身份不变（调用方会按引用比对列表项）。
   * 非字符串（缺字段的畸形行）不动：模板的默认分支本就是文本气泡，改写它等于伪造服务端数据。
   */
  function guiYiDanTiaoLeiXing(xiaoXi: 消息): void {
    const guiYiLeiXing = guiYiXiaoXiLeiXing(xiaoXi.lei_xing)
    if (guiYiLeiXing !== xiaoXi.lei_xing && typeof xiaoXi.lei_xing === 'string') {
      xiaoXi.lei_xing = guiYiLeiXing as 消息['lei_xing']
    }
  }

  /**
   * FP-22a：整表进入 xiaoXiLieBiao 的归一出口。首屏快照（jiaZaiXiaoXi）与上拉加载
   * （jiaZaiGengDuoXiaoXi）两处都是「拿到服务端列表后整体赋值」，早先直接透传裸 lei_xing，
   * 于是同一条 'tupian' 历史行经单条推送是图片气泡、经列表加载就变成空气泡。
   * 现在这两条路径与 jiaRuXiaoXi 共用 guiYiDanTiaoLeiXing 那一份实现：逐条原地改写，
   * 原样返回同一个数组（不改身份、不重排），因此赋值语义与改前完全一致。
   */
  function guiYiXiaoXiLieBiao<T extends 消息>(lieBiao: T[]): T[] {
    for (const xiaoXi of lieBiao) guiYiDanTiaoLeiXing(xiaoXi)
    return lieBiao
  }

  // FP-04 单条消息入口：socket 推送、乐观气泡、服务端回读行都经此处进入 xiaoXiLieBiao，
  // 按 消息.id 幂等去重，并把「临时乐观 ID → 服务端 ID」做成原子替换
  // （同 ke_hu_duan_id 占位就地替换，位置不变）。整表赋值的两条路径不走这里，
  // 但归一口径经上面的 guiYiXiaoXiLieBiao 与本函数共用同一份实现。
  // 旧实现是纯 push 且无 ID 去重，与历史加载路径的去重口径不一致，重复推送即渲染两条。
  function jiaRuXiaoXi(xiaoXi: 消息): boolean {
    if (!xiaoXi || typeof xiaoXi.id !== 'string' || !xiaoXi.id) return false
    guiYiDanTiaoLeiXing(xiaoXi)
    if (!Array.isArray(xiaoXiLieBiao.value)) xiaoXiLieBiao.value = []
    const lieBiao = xiaoXiLieBiao.value
    if (xiaoXi.ke_hu_duan_id) {
      const zhanWeiSuoYin = lieBiao.findIndex((m) => m.ke_hu_duan_id === xiaoXi.ke_hu_duan_id)
      if (zhanWeiSuoYin !== -1) {
        if (lieBiao[zhanWeiSuoYin].id === xiaoXi.id) return false
        lieBiao.splice(zhanWeiSuoYin, 1, xiaoXi)
        return true
      }
    }
    if (lieBiao.some((m) => m.id === xiaoXi.id)) return false
    lieBiao.push(xiaoXi)
    return true
  }

  // 本地合成消息（系统提示/催促/已读不回）的唯一 ID：仅按时间戳会在同毫秒内相互覆盖
  function shengChengBenDiId(qianZhui: string): string {
    linShiXiaoXiXuHao += 1
    return `${qianZhui}-${Date.now()}-${linShiXiaoXiXuHao}`
  }

  const yuLanURLJiHe = new Set<string>()

  function dengJiYuLanURL(wenJian: Blob): string {
    const diZhi = URL.createObjectURL(wenJian)
    yuLanURLJiHe.add(diZhi)
    return diZhi
  }

  function cheXiaoYuLanURL(diZhi?: string | null) {
    if (!diZhi || !yuLanURLJiHe.has(diZhi)) return
    yuLanURLJiHe.delete(diZhi)
    URL.revokeObjectURL(diZhi)
  }

  function qingLiSuoYouYuLanURL() {
    for (const diZhi of [...yuLanURLJiHe]) {
      URL.revokeObjectURL(diZhi)
    }
    yuLanURLJiHe.clear()
  }

  function qingChuCuoWu() {
    cuoWuXinXi.value = null
  }

  function sheZhiCuoWu(xiaoXi: string) {
    cuoWuXinXi.value = xiaoXi
  }

  // FP-04 socket 监听器单所有权：一个 store 生命周期内只建一个 socket 实例、只注册一遍监听。
  // 旧实现以 connected 为早退条件且仅在 connected 时才 disconnect，于是 KeepAlive 下
  // onMounted + onActivated 连续两次调用会在首条连接仍在握手中时再建一条连接，
  // 两条连接同时收 io.to(用户ID) 广播 → 一条「角色回复」渲染两次（AI 像连发两条一样的消息）。
  const socketHuiHuaId = ref<string | null>(null)
  let socketYiFangQi = false

  // FP-19 数据面收口（前端订阅门）：管理员_* 是运营侧监控事件，服务端只把这类帧投递进
  // 「查库鉴权通过的管理房间」，前端同样只在服务端下发的 cha_kan（只读运营数据）能力下
  // 注册这些监听器——普通用户既收不到也不订阅。幂等：同一 socket 生命周期只注册一遍。
  // FP-18 口径：视图门按能力位派生（keGuanLiZhiDu），与管理端/游戏端服务端门禁同源。
  let jianKongYiDingYue = false

  function queBaoJianKongDingYue(mubiaoSocket?: Socket): void {
    const socket = mubiaoSocket ?? socketLianJie.value
    if (!socket || jianKongYiDingYue) return
    if (!使用用户仓库().keGuanLiZhiDu) return
    jianKongYiDingYue = true

    socket.on('管理员_构建过程', (shuJu: { 阶段: string; 说明: string; 内容?: string; 时间: number; 轮次?: number }) => {
      添加监控项(gouJianGuoChengLieBiao, {
        阶段: shuJu.阶段,
        说明: shuJu.说明,
        内容: typeof shuJu.内容 === 'string' ? shuJu.内容 : undefined,
        时间: shuJu.时间,
        轮次: typeof shuJu.轮次 === 'number' ? shuJu.轮次 : undefined,
      })
    })

    socket.on('管理员_好感度变化', (shuJu: { 变化: Record<string, number>; 时间: number; 轮次?: number }) => {
      添加监控项(haoGanDuBianHuaLieBiao, {
        变化: shuJu.变化,
        时间: shuJu.时间,
        轮次: typeof shuJu.轮次 === 'number' ? shuJu.轮次 : undefined,
      })
    })

    socket.on('管理员_隐藏信息', (shuJu: { 类型: string; 内容: string; 时间: number; 轮次?: number }) => {
      添加监控项(yinCangXinXiLieBiao, {
        类型: shuJu.类型,
        内容: shuJu.内容,
        时间: shuJu.时间,
        轮次: typeof shuJu.轮次 === 'number' ? shuJu.轮次 : undefined,
      })
    })

    socket.on('管理员_深度思考', (shuJu: { 来源: string; 内容: string; 时间: number; 轮次?: number }) => {
      添加监控项(shenDuSiKaoLieBiao, {
        来源: shuJu.来源,
        内容: shuJu.内容,
        时间: shuJu.时间,
        轮次: typeof shuJu.轮次 === 'number' ? shuJu.轮次 : undefined,
      })
    })
  }

  function chuangJianSocket(): Socket {
    jianKongYiDingYue = false
    const socket = io({
      path: '/socket.io',
      auth: (cb) => {
        cb({ token: duQuLingPai() })
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    })

    // YH-097 Socket令牌刷新：建连前刷新，auth用回调，重连退避禁拿旧票
    socket.on('connect', () => {
      // 重连后服务端调度器可能已是另一个实例，其轮次会重新计数；闸门基点随之归零，
      // 只丢「闸门记忆」不丢消息（宁可少拦一次，也不能把新实例的合法回复永久判成旧轮次）
      qingKongLunCiZhuangTai()
      if (socketHuiHuaId.value) socket.emit('加入聊天', socketHuiHuaId.value)
    })

    // socket.io 放弃重连后该实例永久失效，此时必须彻底解绑再重建，否则连接再也不回来
    const jianKongQi = socket.io as unknown as { on?: (shiJian: string, chuli: () => void) => void }
    jianKongQi?.on?.('reconnect_failed', () => {
      socketYiFangQi = true
    })

    socket.on('角色回复', (shuJu: JiaoSeHuiFuShiJian) => {
      if (!shuJu || shuJu.角色ID !== dangQianHuiHuaId.value) return
      if (判定并登记轮次(shuJu)) return
      if (Array.isArray(shuJu.消息列表)) {
        shuJu.消息列表.forEach((xiaoXi) => jiaRuXiaoXi(xiaoXi))
      }
      补全旧内心消息()
    })

    socket.on(
      'AI状态',
      (shuJu: {
        jiao_se_id: string
        zhuang_tai: 'kong_xian' | 'deng_dai_zhong' | 'zheng_zai_shu_ru'
        xu_hao: number
        shi_jian: number
      }) => {
        if (shuJu.jiao_se_id !== dangQianHuiHuaId.value) return
        if (shuJu.xu_hao <= zuiHouXuHao) return
        zuiHouXuHao = shuJu.xu_hao
        aiZhuangTai.value = shuJu.zhuang_tai
      },
    )

    socket.on(
      '游戏事件',
      (shuJu: { lei_xing: string; xiao_xi: string; ke_ji_xu_liao_tian?: boolean }) => {
        const xiTongXiaoXi: 消息 = {
          id: shengChengBenDiId('xitong'),
          hui_hua_id: dangQianHuiHuaId.value || '',
          fa_song_zhe_id: '',
          fa_song_zhe_lei_xing: 'xitong',
          nei_rong: shuJu.xiao_xi,
          lei_xing: 'xitong',
          shi_jian_chuo: Date.now(),
          yi_du: true,
          tong_guan_xin_xi: {
            lei_xing: shuJu.lei_xing,
            xiao_xi: shuJu.xiao_xi,
            ke_ji_xu_liao_tian: shuJu.ke_ji_xu_liao_tian,
          },
        }
        jiaRuXiaoXi(xiTongXiaoXi)
        track('biaoBaiJieGuo', { jie_guo: shuJu.lei_xing })
        youXiShiJian.value = shuJu
        youXiYiJieShu.value = true
        keJiXuLiaoTian.value = shuJu.ke_ji_xu_liao_tian === true
      },
    )

    socket.on('AI催促', (shuJu: { jiao_se_id: string; nei_rong: string }) => {
      if (shuJu.jiao_se_id === dangQianHuiHuaId.value) {
        const cuiGuXiaoXi: 消息 = {
          id: shengChengBenDiId('cuigu'),
          hui_hua_id: dangQianHuiHuaId.value || '',
          fa_song_zhe_id: jiaoSeXinXi.value?.id || '',
          fa_song_zhe_lei_xing: 'jiaose',
          nei_rong: shuJu.nei_rong,
          lei_xing: 'wenben',
          shi_jian_chuo: Date.now(),
          yi_du: true,
        }
        jiaRuXiaoXi(cuiGuXiaoXi)
      }
    })

    socket.on('消息撤回', (shuJu: { hui_hua_id: string; xiao_xi_id: string }) => {
      if (shuJu.hui_hua_id === dangQianHuiHuaId.value) {
        const suoYin = xiaoXiLieBiao.value.findIndex((m) => m.id === shuJu.xiao_xi_id)
        if (suoYin !== -1) {
          const xiaoXi = xiaoXiLieBiao.value[suoYin]
          const shiYongHu = xiaoXi.fa_song_zhe_lei_xing === 'yonghu'
          xiaoXiLieBiao.value[suoYin] = {
            ...xiaoXi,
            yi_che_hui: true,
            nei_rong: shiYongHu
              ? huoQuFanYi('liaoTian', 'ninCheHuiLeYiTiaoXiaoXi')
              : huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi'),
          }
        }
      }
    })

    socket.on('已读不回', (shuJu: { jiao_se_id: string; yuan_yin: string }) => {
      if (shuJu.jiao_se_id === dangQianHuiHuaId.value) {
        yiDuBuHuiZhuangTai.value = true
        const xiTongXiaoXi: 消息 = {
          id: shengChengBenDiId('yidubuhui'),
          hui_hua_id: dangQianHuiHuaId.value || '',
          fa_song_zhe_id: '',
          fa_song_zhe_lei_xing: 'xitong',
          nei_rong: huoQuFanYi('liaoTian', 'duiFangYiDuBuHui'),
          lei_xing: 'xitong',
          shi_jian_chuo: Date.now(),
          yi_du: true,
        }
        jiaRuXiaoXi(xiTongXiaoXi)
      }
    })

    socket.on('disconnect', () => {
      lianJieZhong.value = false
      qiangZhiYinChangXianShi()
      zuiHouXuHao = 0
    })

    queBaoJianKongDingYue(socket)

    return socket
  }

  // socketLianJie 是 ref，Vue 的 UnwrapRef 会把 Socket 类实例映射成结构类型，
  // 因此这里按结构接，不要求 nominal 的 Socket 类
  type KeJieBangSocket = { disconnect: () => void; removeAllListeners?: () => void }

  function jieBangSocket(socket: KeJieBangSocket) {
    if (typeof socket.removeAllListeners === 'function') socket.removeAllListeners()
    socket.disconnect()
  }

  function lianJieSocket(huiHuaId: string) {
    if (!socketLianJie.value || socketYiFangQi) {
      if (socketLianJie.value) jieBangSocket(socketLianJie.value)
      socketLianJie.value = chuangJianSocket()
      socketYiFangQi = false
    }
    const socket = socketLianJie.value
    if (socketHuiHuaId.value === huiHuaId) return
    socketHuiHuaId.value = huiHuaId
    // 换会话后服务端可能新建调度器实例，其 xu_hao 从 1 重新计数，须同步重置避免状态被误丢
    zuiHouXuHao = 0
    if (socket.connected) socket.emit('加入聊天', huiHuaId)
    lianJieZhong.value = true
  }

  function duanKaiSocket() {
    if (socketLianJie.value) {
      jieBangSocket(socketLianJie.value)
      socketLianJie.value = null
    }
    socketHuiHuaId.value = null
    socketYiFangQi = false
    lianJieZhong.value = false
  }

  async function jiaZaiXiaoXi(huiHuaId: string) {
    if (dangQianHuiHuaId.value && dangQianHuiHuaId.value !== huiHuaId) 持久化监控()
    dangQianHuiHuaId.value = huiHuaId
    读取监控历史(huiHuaId)
    xiaoXiLieBiao.value = []
    qiangZhiYinChangXianShi()
    zuiHouXuHao = 0
    qingKongLunCiZhuangTai()
    yiDuBuHuiZhuangTai.value = false
    youXiYiJieShu.value = false
    keJiXuLiaoTian.value = false
    cuoWuXinXi.value = null
    yeMa.value = 1
    haiYouGengDuo.value = false
    jiaZaiGengDuoZhong.value = false
    shouPingJiaZaiZhong.value = true
    jiaZaiShiBai.value = false
    try {
      try {
        const jieGuo = await huoQuXiaoXi(huiHuaId, yeMa.value, meiYeTiaoShu.value)
        const fuWuLieBiao = [...jieGuo.lie_biao].reverse()
        // FP-04：快照请求在途期间可能已收到 socket 推送或乐观气泡，整体覆盖会把它们吞掉
        // （观感即「AI 回了但我没看到」）。按 消息.id 与幂等键双口径判重，只补入快照缺失的部分，
        // 与 jiaZaiGengDuoXiaoXi 的去重口径保持一致。FP-09b：判重不再依赖前端自增序号
        // （序号已归服务端权威，本地自增值与服务端落库值对不上，正是「吞消息」的成因）。
        const yiYouId = new Set(fuWuLieBiao.map((m) => m.id))
        const yiYouMiDengJian = new Set(
          fuWuLieBiao
            .map((m) => m.mi_deng_jian)
            .filter((jian): jian is string => typeof jian === 'string' && jian !== ''),
        )
        const buDing = xiaoXiLieBiao.value.filter(
          (m) =>
            !yiYouId.has(m.id) && !(m.mi_deng_jian && yiYouMiDengJian.has(m.mi_deng_jian)),
        )
        xiaoXiLieBiao.value = guiYiXiaoXiLieBiao(
          buDing.length > 0 ? [...fuWuLieBiao, ...buDing] : fuWuLieBiao,
        )
        zongShu.value = jieGuo.zong_shu
        // M6：优先使用后端 keyset 分页的「还有更多」标记，旧后端回退计数比较
        haiYouGengDuo.value = jieGuo.hai_you_geng_duo ?? jieGuo.lie_biao.length < jieGuo.zong_shu
        补全旧内心消息()
        Promise.resolve(biaoJiYiDu(huiHuaId)).catch(() => {})
      } catch (cuoWu: unknown) {
         
        console.error('聊天首屏消息加载失败', cuoWu)
        xiaoXiLieBiao.value = []
        zongShu.value = 0
        haiYouGengDuo.value = false
        jiaZaiShiBai.value = true
      }
      try {
        const { jiao_se, dang_an_zhuang_tai } = await huoQuJiaoSeXiangQing(huiHuaId)
        jiaoSeXinXi.value = jiao_se
        if (dang_an_zhuang_tai) {
          youXiYiJieShu.value = dang_an_zhuang_tai.you_xi_yi_jie_shu
          keJiXuLiaoTian.value = dang_an_zhuang_tai.ke_ji_xu_liao_tian
        }
      } catch (cuoWu: unknown) {
         
        console.error('聊天角色详情加载失败', cuoWu)
        jiaoSeXinXi.value = null
      }
    } finally {
      shouPingJiaZaiZhong.value = false
    }
  }

  async function jiaZaiGengDuoXiaoXi(): Promise<boolean> {
    if (!dangQianHuiHuaId.value || jiaZaiGengDuoZhong.value || !haiYouGengDuo.value) return false
    jiaZaiGengDuoZhong.value = true
    try {
      // M6 keyset 游标：以当前已加载的最旧一条消息为定位（xiaoXiLieBiao 按时间升序，首位最旧）
      const zuiJiu = xiaoXiLieBiao.value[0]
      const youBiao =
        zuiJiu && typeof zuiJiu.shi_jian_chuo === 'number' && zuiJiu.id
          ? {
              xu_hao: (zuiJiu.ke_hu_duan_xu_hao ?? null) as number | null,
              shi_jian_chuo: zuiJiu.shi_jian_chuo,
              id: zuiJiu.id,
            }
          : undefined
      const jieGuo = await huoQuXiaoXi(
        dangQianHuiHuaId.value,
        yeMa.value + 1,
        meiYeTiaoShu.value,
        youBiao,
      )
      const xinLieBiao = jieGuo.lie_biao.filter(
        (xiaoXi) => !xiaoXiLieBiao.value.some((xianYou) => xianYou.id === xiaoXi.id),
      )
      xiaoXiLieBiao.value = guiYiXiaoXiLieBiao([
        ...xinLieBiao.reverse(),
        ...xiaoXiLieBiao.value,
      ])
      补全旧内心消息()
      yeMa.value += 1
      zongShu.value = jieGuo.zong_shu
      // M6：优先使用后端「还有更多」标记；无游标回退时退化为计数比较
      haiYouGengDuo.value = youBiao
        ? Boolean(jieGuo.hai_you_geng_duo) && xinLieBiao.length > 0
        : xiaoXiLieBiao.value.length < jieGuo.zong_shu
      return xinLieBiao.length > 0
    } catch (cuoWu: unknown) {
       
      console.error('聊天历史消息加载失败', cuoWu)
      return false
    } finally {
      jiaZaiGengDuoZhong.value = false
    }
  }

  /**
   * FP-09b：乐观气泡与落库行的对齐只认「消息自身身份」——服务端行的 幂等键 必须等于本条气泡的键
   * （旧后端不回显该字段时退化为「同是用户消息才对齐」）。返回体不是这条气泡时绝不覆盖气泡，
   * 这正是「我插入的消息被吞掉」在前端的表现。
   */
  function duiQiLeDaXiangXiaoXi(乐观消息: 消息, fuWuQiXiaoXi: 消息, jiaGong?: (x: 消息) => 消息): boolean {
    const shiBenTiao =
      fuWuQiXiaoXi.fa_song_zhe_lei_xing === 'yonghu' &&
      (fuWuQiXiaoXi.mi_deng_jian == null || fuWuQiXiaoXi.mi_deng_jian === 乐观消息.mi_deng_jian)
    if (!shiBenTiao) {
      const suoYin = xiaoXiLieBiao.value.findIndex(
        (m) => m.ke_hu_duan_id === 乐观消息.ke_hu_duan_id,
      )
      if (suoYin !== -1) {
        xiaoXiLieBiao.value[suoYin] = { ...xiaoXiLieBiao.value[suoYin], fa_song_zhong: false }
      }
      jiaRuXiaoXi(fuWuQiXiaoXi)
      return false
    }
    jiLuYiQueRenYongHuId(fuWuQiXiaoXi.id)
    const dengJingXiaoXi = jiaGong ? jiaGong(fuWuQiXiaoXi) : fuWuQiXiaoXi
    // FP-04：乐观 ID → 服务端 ID 的替换走统一入口，重复回推/重连补拉都不会多出一条
    jiaRuXiaoXi({
      ...dengJingXiaoXi,
      mi_deng_jian: 乐观消息.mi_deng_jian ?? dengJingXiaoXi.mi_deng_jian ?? null,
      ke_hu_duan_id: 乐观消息.ke_hu_duan_id,
    })
    return true
  }

  // 派发一条已入列的用户消息：串行队列 ⇒ 派发顺序恒等于点击顺序；
  // 幂等键随消息本体上报，重发复用同一把 ⇒ 服务端唯一约束把重放压成一条。
  async function faSongYiTiaoYongHuXiaoXi(乐观消息: 消息): Promise<消息 | null> {
    const miDengJian = queDingMiDengJian(乐观消息)
    const dangQianHuiHua = 乐观消息.hui_hua_id
    // FP-10b：图文混排的气泡重发必须带着**同一份块数组**（顺序就是用户排的），
    // 纯文字气泡保持改造前的三参调用，请求体一字不变。
    const tiJiaoKuai: XiaoXiKuai[] | undefined = Array.isArray(乐观消息.nei_rong_kuai)
      ? keTiJiaoKuai(乐观消息.nei_rong_kuai)
      : undefined
    const daiKuai = tiJiaoKuai && tiJiaoKuai.length > 0 ? tiJiaoKuai : undefined
    // FP-08b（缺陷5）：引用槽就钉在**这条气泡**上（服务端同名出参字段 `bei_yong_xiao_xi_id`），
    // 于是首发与失败重发（`chongShiFaSongXiaoXi` 复用同一颗气泡 + 同一把幂等键）带的永远是
    // 同一个引用——引用是这条消息的身份之一，不是"当前输入框碰巧选中的那条"。
    const yinYong = 乐观消息.bei_yong_xiao_xi_id
      ? { beiYongXiaoXiId: 乐观消息.bei_yong_xiao_xi_id }
      : undefined
    const paiDuiRenWu = faSongDuiLie.then(() =>
      daiKuai
        ? faSongXiaoXiApi({
            huiHuaId: dangQianHuiHua,
            neiRong: 乐观消息.nei_rong,
            miDengJian,
            leiXing: 乐观消息.lei_xing,
            meiTiId: 乐观消息.mei_ti_id ?? null,
            neiRongKuai: daiKuai,
            yinYong,
          })
        : faSongXiaoXiApi({
            huiHuaId: dangQianHuiHua,
            neiRong: 乐观消息.nei_rong,
            miDengJian,
            yinYong,
          }),
    )
    // 无论成败都推进队列，不阻断后续发送
    faSongDuiLie = paiDuiRenWu.then(
      () => undefined,
      () => undefined,
    )

    try {
      const { xiaoXi, weiJiGanYu, yuanZhuReXian, ganYuTiShi, chaoShiTiXingMiao } = await paiDuiRenWu
      duiQiLeDaXiangXiaoXi(乐观消息, xiaoXi)
      // FP-04：AI 触发已搬到服务端落库路径，此处不再发无 payload 的 socket 触发信号
      if (xiaoXiLieBiao.value.filter((m) => m.fa_song_zhe_lei_xing === 'yonghu').length === 1) {
        track('shouTiaoXiaoXi')
      }
      if (weiJiGanYu === true) {
        sheZhiWeiJiGanYu({
          yuanZhuReXian: yuanZhuReXian ?? '',
          ganYuTiShi: ganYuTiShi ?? huoQuFanYi('liaoTian', 'weiJiGanYuTiShi'),
          chaoShiTiXingMiao: chaoShiTiXingMiao ?? 300,
        })
      }
      return xiaoXi
    } catch (cuoWu: unknown) {
      console.error('发送消息失败', cuoWu)
      // 微信式失败态：气泡保留原位并标记失败（红色感叹号），不再直接删除
      faSongShiBaiJiHe.value.add(乐观消息.ke_hu_duan_id as string)
      const suoYin = xiaoXiLieBiao.value.findIndex(
        (m) => m.ke_hu_duan_id === 乐观消息.ke_hu_duan_id,
      )
      if (suoYin !== -1) {
        xiaoXiLieBiao.value[suoYin] = { ...xiaoXiLieBiao.value[suoYin], fa_song_zhong: false }
      }
      const xiaoXi = cuoWu instanceof Error ? cuoWu.message : huoQuFanYi('liaoTian', 'faSongShiBai')
      sheZhiCuoWu(xiaoXi)
      return null
    }
  }

  /**
   * 引用入参的前端守卫（`backend/src/services/消息.ts` 那条「被引用消息 ID 必须是 UUID」的客户端那一半）：
   * 被引用者若**还是本地乐观气泡**，它的 id 是本 store 自己造的临时串，服务端从不认得 ⇒ 请求必 400
   * （`yinYongXiaoXiFeiFa`），而那条气泡还躺在列表里，用户只会看到一句「引用的消息不合法」。
   * 所以这里按「无引用」处理，消息本体照发（与后端 `qingLiMiDengJian` 对脏幂等键的降级口径一致：
   * 脏引用不该顺手把用户刚打的字一起丢掉）。
   *
   * 根因不在这里，而在引用槽：唯一的拒绝口是 `composables/use长按菜单.ts::sheZhiYinYongMuBiao`
   * （临时气泡既没有「引用」菜单项、也进不了槽）。本函数只挡「调用方绕过菜单直接传 id」这一条旁路，
   * 不参与服务端的最终裁定——合法但已被删/越权的引用仍由服务端 4xx。
   */
  function qingLiYinYongId(zhi: string | null | undefined): string | null {
    if (!zhi) return null
    const beiYongXing = xiaoXiLieBiao.value.find((m) => m.id === zhi)
    if (beiYongXing && shiBenDiLinShiXiaoXi(beiYongXing)) {
      console.warn('聊天仓库：引用目标仍是本地乐观气泡（未落库），本次按无引用发送', { id: zhi })
      return null
    }
    return zhi
  }

  /**
   * 文本发送唯一入口。`yinYongXiaoXiId` 是**发送那一刻**右键引用态指向的消息 ID
   * （真源只在 `composables/use长按菜单.ts::yinYongXiaoXi` 一处，由调用方读出来传进来，
   * store 不另存第二份）。它被钉在乐观气泡的 `bei_yong_xiao_xi_id` 上，
   * 由 `faSongYiTiaoYongHuXiaoXi` 经 `api/聊天.ts::faSongXiaoXi` 的 `yinYong` 进 HTTP body。
   */
  async function faSongXiaoXi(
    neiRong: string,
    yinYongXiaoXiId?: string | null,
  ): Promise<消息 | null> {
    if (!dangQianHuiHuaId.value || !neiRong.trim()) return null
    const qingLiNeiRong = neiRong.trim()
    if (qingLiNeiRong.length > zuiDaXiaoXiChangDu) {
      sheZhiCuoWu(huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'))
      return null
    }
    qingChuCuoWu()
    linShiXiaoXiXuHao += 1
    const linShiId = `linshi-${Date.now()}-${linShiXiaoXiXuHao}`
    const beiYongId = qingLiYinYongId(yinYongXiaoXiId)
    const linShiXiaoXi: 消息 = {
      id: linShiId,
      ke_hu_duan_id: linShiId,
      hui_hua_id: dangQianHuiHuaId.value,
      fa_song_zhe_id: '',
      fa_song_zhe_lei_xing: 'yonghu',
      nei_rong: qingLiNeiRong,
      lei_xing: 'wenben',
      shi_jian_chuo: Date.now(),
      yi_du: false,
      fa_song_zhong: true,
      ...(beiYongId ? { bei_yong_xiao_xi_id: beiYongId } : {}),
    }
    jiaRuXiaoXi(linShiXiaoXi)
    return faSongYiTiaoYongHuXiaoXi(linShiXiaoXi)
  }

  async function chongShiFaSongXiaoXi(keHuDuanId: string): Promise<boolean> {
    if (!keHuDuanId || !faSongShiBaiJiHe.value.has(keHuDuanId)) return false
    const suoYin = xiaoXiLieBiao.value.findIndex((m) => m.ke_hu_duan_id === keHuDuanId)
    if (suoYin === -1) {
      faSongShiBaiJiHe.value.delete(keHuDuanId)
      return false
    }
    const yuanQiPao = xiaoXiLieBiao.value[suoYin]
    faSongShiBaiJiHe.value.delete(keHuDuanId)
    qingChuCuoWu()
    // FP-09b：重发原位复用同一条气泡与同一把幂等键（不删掉重建 ⇒ 不新造键）。
    // 上一次请求其实已落库时，服务端按幂等键返回原行，列表里仍只有这一条。
    const chongFaXiaoXi: 消息 = { ...yuanQiPao, fa_song_zhong: true }
    xiaoXiLieBiao.value.splice(suoYin, 1, chongFaXiaoXi)
    const jieGuo = await faSongYiTiaoYongHuXiaoXi(chongFaXiaoXi)
    return jieGuo !== null
  }

  /**
   * 媒体直发唯一入口（语音 / 文件 / 表情包 / 已有媒体的表情）。
   * `yinYongXiaoXiId` 与 `faSongXiaoXi` 的第二参同一语义：**发送那一刻**右键引用态指向的消息 ID，
   * 由调用方从 `use长按菜单.ts::yinYongXiaoXi` 读出来传进来（store 不存第二份）。
   * FP-08d（需求 #5）：媒体消息同样带 `beiYongXiaoXiId` —— 右键能引用的一切消息，发出去的那条
   * 就必须带上被引用者；旧形态「既不带上也不清除」会让引用条在直发后残留悬挂、
   * 并被下一条文字消息继承（作废 FP-08b 的「媒体直发不该带引用」判定，理由见
   * `.agents/evidence/traces/FP-08d-20260922.md`）。
   */
  async function faSongMeiTiXiaoXi(
    leiXing: DuoMeiTiLeiXing,
    wenJian: File | Blob | null,
    fuJia: MeiTiFuJia = {},
    yinYongXiaoXiId?: string | null,
  ): Promise<消息 | null> {
    if (!dangQianHuiHuaId.value) return null
    if (!wenJian && !fuJia.yiYouMeiTi) return null
    qingChuCuoWu()
    linShiXiaoXiXuHao += 1
    const linShiId = `linshi-${Date.now()}-${linShiXiaoXiXuHao}`
    const beiYongId = qingLiYinYongId(yinYongXiaoXiId)
    const benDiYuLan = wenJian ? dengJiYuLanURL(wenJian) : null
    const chuShiURL = fuJia.yiYouMeiTi ? fuJia.yiYouMeiTi.meiTiUrl : null
    const yuanWenJianMing =
      fuJia.wenJianMing || (wenJian instanceof File && wenJian.name ? wenJian.name : '')
    const linShiXiaoXi: 消息 = {
      id: linShiId,
      ke_hu_duan_id: linShiId,
      hui_hua_id: dangQianHuiHuaId.value,
      fa_song_zhe_id: '',
      fa_song_zhe_lei_xing: 'yonghu',
      nei_rong: '',
      lei_xing: leiXing,
      shi_jian_chuo: Date.now(),
      yi_du: false,
      fa_song_zhong: true,
      mei_ti_id: fuJia.yiYouMeiTi ? fuJia.yiYouMeiTi.meiTiId : null,
      mei_ti_url: chuShiURL,
      ben_di_yu_lan_url: benDiYuLan,
      ben_di_da_xiao_zi_jie: wenJian && typeof wenJian.size === 'number' ? wenJian.size : null,
      mei_ti_shi_chang_hao_miao:
        typeof fuJia.shiChangHaoMiao === 'number' ? fuJia.shiChangHaoMiao : null,
      mei_ti_yuan_shi_wen_jian_ming: yuanWenJianMing || null,
      ...(beiYongId ? { bei_yong_xiao_xi_id: beiYongId } : {}),
    }
    // FP-09b：媒体消息同样带稳定幂等键，上传成功但投递重试时不再落两条
    const benCiMiDengJian = queDingMiDengJian(linShiXiaoXi)
    jiaRuXiaoXi(linShiXiaoXi)

    try {
      const huiHuaId = dangQianHuiHuaId.value
      const meiTiId = fuJia.yiYouMeiTi
        ? fuJia.yiYouMeiTi.meiTiId
        : (
            await shangChuanMeiTi(
              huiHuaId,
              wenJian as File | Blob,
              DUO_MEI_TI_LEI_XING_SHANG_CHUAN_LEI_BIE[leiXing],
            )
          ).mediaId
      const suiWenBen =
        leiXing === 'yuYin' && typeof fuJia.zhuanXieWenBen === 'string'
          ? fuJia.zhuanXieWenBen.trim().slice(0, 500)
          : ''
      // FP-08d（需求 #5）：媒体直发**带**引用，且带的是「发送那一刻」引用条指向的那条，
      // 与文本 / 图文混排同一口径（引用是这条消息的身份之一）。无引用态时 body 逐键不变，
      // 服务端 `services/消息.ts::yanZhengBeiYinYong` 对 6 种非法引用形态一律 4xx，不因类型是媒体而旁路。
      const { xiaoXi } = await faSongXiaoXiApi({
        huiHuaId,
        neiRong: suiWenBen,
        miDengJian: benCiMiDengJian,
        leiXing,
        meiTiId,
        ...(beiYongId ? { yinYong: { beiYongXiaoXiId: beiYongId } } : {}),
      })
      const fuWuQiURL = xiaoXi.mei_ti_url || benDiYuLan || chuShiURL || ''
      if (xiaoXi.mei_ti_url) {
        cheXiaoYuLanURL(benDiYuLan)
      }
      // FP-04：乐观 ID → 服务端 ID 的替换走统一入口（原子替换，不重复入列）
      duiQiLeDaXiangXiaoXi(linShiXiaoXi, xiaoXi, (fuWuQiXiaoXi) => ({
        ...fuWuQiXiaoXi,
        mei_ti_url: fuWuQiURL,
        ben_di_yu_lan_url: fuWuQiXiaoXi.mei_ti_url ? null : benDiYuLan,
        ben_di_da_xiao_zi_jie:
          fuWuQiXiaoXi.ben_di_da_xiao_zi_jie ?? linShiXiaoXi.ben_di_da_xiao_zi_jie ?? null,
      }))
      // FP-04：AI 触发已搬到服务端落库路径
      return xiaoXi
    } catch (cuoWu: unknown) {
       
      console.error('发送多媒体消息失败', cuoWu)
      const suoYin = xiaoXiLieBiao.value.findIndex((m) => m.ke_hu_duan_id === linShiId)
      if (suoYin !== -1) {
        xiaoXiLieBiao.value.splice(suoYin, 1)
      }
      cheXiaoYuLanURL(benDiYuLan)
      const tiShi =
        cuoWu instanceof Error && cuoWu.message
          ? cuoWu.message
          : huoQuFanYi('duoMeiTi', 'faSongShiBai')
      sheZhiCuoWu(tiShi)
      return null
    }
  }

  /**
   * FP-10b（缺陷9）图文混排发送：一条消息携带**有序块数组**，图片按用户排的顺序逐张上传，
   * 再把 内容/类型/媒体ID 三个兼容投影按服务端同口径派生后交给 `faSongXiaoXiApi`。
   *
   * 三条硬口径：
   *  ①顺序即用户排的顺序 —— 上传串行（并发会打乱媒体台账与失败定位），块数组不做任何排序；
   *  ②FP-09b 幂等键在**这条消息**上钉死一次，重发（含单张上传失败后整条重试）不换键；
   *  ③单张上传失败 ⇒ 只丢那一张并明确提示，其余块照发；全丢光 ⇒ 走既有「发送失败」提示，
   *    绝不让服务器收到一条空消息，也绝不因脏块抛异常（服务端同样只降级不 500）。
   */
  async function faSongTuWenXiaoXi(
    daiFaKuai: DaiFaKuai[],
    yinYongXiaoXiId?: string | null,
  ): Promise<消息 | null> {
    if (!dangQianHuiHuaId.value || daiFaKuai.length === 0) return null
    qingChuCuoWu()
    linShiXiaoXiXuHao += 1
    const linShiId = `linshi-${Date.now()}-${linShiXiaoXiXuHao}`
    const beiYongId = qingLiYinYongId(yinYongXiaoXiId)
    const huiHuaId = dangQianHuiHuaId.value
    interface KeBianKuai {
      lei_xing: DaiFaKuai['lei_xing']
      nei_rong: string
      mei_ti_id: string | null
      mei_ti_lei_bie: string | null
      yu_lan_url: string | null
      diu_qi: boolean
    }
    const kuai: KeBianKuai[] = daiFaKuai.map((xiang) => ({
      lei_xing: xiang.lei_xing,
      nei_rong: xiang.nei_rong,
      mei_ti_id: xiang.mei_ti_id,
      mei_ti_lei_bie: xiang.mei_ti_lei_bie,
      yu_lan_url: xiang.yu_lan_url,
      diu_qi: false,
    }))

    let youDiuQi = false
    for (let xiaBiao = 0; xiaBiao < kuai.length; xiaBiao++) {
      const xiang = kuai[xiaBiao]
      const yuan = daiFaKuai[xiaBiao]
      if (xiang.lei_xing !== 'tupian' || xiang.mei_ti_id) continue
      const wenJian = yuan?.wen_jian ?? null
      if (!wenJian) {
        youDiuQi = true
        xiang.diu_qi = true
        continue
      }
      try {
        const shangChuan = await shangChuanMeiTi(
          huiHuaId,
          wenJian,
          xiang.mei_ti_lei_bie === BIAO_QING_BAO_MEI_TI_LEI_BIE ? BIAO_QING_BAO_MEI_TI_LEI_BIE : 'tupian',
        )
        xiang.mei_ti_id = shangChuan.mediaId
        if (shangChuan.leiBie) xiang.mei_ti_lei_bie = shangChuan.leiBie
      } catch {
        youDiuQi = true
        xiang.diu_qi = true
      }
    }

    const keYongKuai = kuai.filter((xiang) => !xiang.diu_qi)
    const chuCanKuai: XiaoXiKuaiChuCan[] = keYongKuai
      .filter((xiang) => xiang.lei_xing === 'tupian' || (xiang.nei_rong ?? '').trim() !== '')
      .map((xiang) =>
        xiang.lei_xing === 'tupian'
          ? {
              lei_xing: 'tupian' as const,
              mei_ti_id: xiang.mei_ti_id,
              mei_ti_url: xiang.yu_lan_url,
              ...(xiang.mei_ti_lei_bie ? { mei_ti_lei_bie: xiang.mei_ti_lei_bie } : {}),
            }
          : { lei_xing: 'wenzi' as const, nei_rong: xiang.nei_rong },
      )
    const tiJiaoKuai = keTiJiaoKuai(chuCanKuai)
    if (tiJiaoKuai.length === 0) {
      sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'faSongShiBai'))
      return null
    }
    if (youDiuQi) sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'buFenTuPianShangChuanShiBai'))

    const shouTuKuai = chuCanKuai.find((xiang) => xiang.lei_xing === 'tupian')
    const linShiXiaoXi: 消息 = {
      id: linShiId,
      ke_hu_duan_id: linShiId,
      hui_hua_id: huiHuaId,
      fa_song_zhe_id: '',
      fa_song_zhe_lei_xing: 'yonghu',
      nei_rong: kuaiDaoZhengWen(tiJiaoKuai, {
        leiBieOf: (meiTiId) =>
          chuCanKuai.find((xiang) => xiang.mei_ti_id === meiTiId)?.mei_ti_lei_bie,
      }),
      lei_xing: kuaiDaoXiaoXiLeiXing(chuCanKuai) as 消息['lei_xing'],
      shi_jian_chuo: Date.now(),
      yi_du: false,
      fa_song_zhong: true,
      nei_rong_kuai: chuCanKuai,
      mei_ti_id: shouTuKuai?.mei_ti_id ?? null,
      mei_ti_url: shouTuKuai?.mei_ti_url ?? null,
      ben_di_yu_lan_url: shouTuKuai?.mei_ti_url ?? null,
      ...(beiYongId ? { bei_yong_xiao_xi_id: beiYongId } : {}),
    }
    const benCiMiDengJian = queDingMiDengJian(linShiXiaoXi)
    jiaRuXiaoXi(linShiXiaoXi)

    try {
      const { xiaoXi } = await faSongXiaoXiApi({
        huiHuaId,
        neiRong: linShiXiaoXi.nei_rong,
        miDengJian: benCiMiDengJian,
        leiXing: linShiXiaoXi.lei_xing,
        meiTiId: linShiXiaoXi.mei_ti_id ?? null,
        neiRongKuai: tiJiaoKuai,
        ...(linShiXiaoXi.bei_yong_xiao_xi_id
          ? { yinYong: { beiYongXiaoXiId: linShiXiaoXi.bei_yong_xiao_xi_id } }
          : {}),
      })
      duiQiLeDaXiangXiaoXi(linShiXiaoXi, xiaoXi, (fuWuQiXiaoXi) => ({
        ...fuWuQiXiaoXi,
        // 服务端没回块数组（旧服务端）时保留本地块，至少顺序与缩略图不丢
        nei_rong_kuai: Array.isArray(fuWuQiXiaoXi.nei_rong_kuai)
          ? fuWuQiXiaoXi.nei_rong_kuai
          : chuCanKuai,
      }))
      return xiaoXi
    } catch (cuoWu: unknown) {
      console.error('发送图文混排消息失败', cuoWu)
      // 微信式失败态：气泡留在原位标失败，重发复用同一把幂等键与同一份块数组
      faSongShiBaiJiHe.value.add(linShiId)
      const suoYin = xiaoXiLieBiao.value.findIndex((m) => m.ke_hu_duan_id === linShiId)
      if (suoYin !== -1) {
        xiaoXiLieBiao.value[suoYin] = { ...xiaoXiLieBiao.value[suoYin], fa_song_zhong: false }
      }
      const tiShi =
        cuoWu instanceof Error && cuoWu.message
          ? cuoWu.message
          : huoQuFanYi('duoMeiTi', 'faSongShiBai')
      sheZhiCuoWu(tiShi)
      return null
    }
  }

  async function qingQiuShengTu(tiShiCi: string): Promise<消息 | null> {
    if (!dangQianHuiHuaId.value) return null
    const qingXiHou = tiShiCi.trim().slice(0, 200)
    if (!qingXiHou) {
      sheZhiCuoWu(huoQuFanYi('liaoTian', 'xiaoXiNeiRongWeiKong'))
      return null
    }
    qingChuCuoWu()
    try {
      const { qingQiuShengTu: shengTuApi } = await import('@/api/聊天')
      const xiaoXi = await shengTuApi(dangQianHuiHuaId.value, qingXiHou)
      jiaRuXiaoXi(xiaoXi)
      return xiaoXi
    } catch (cuoWu: unknown) {
      const tiShi =
        cuoWu instanceof Error && cuoWu.message
          ? cuoWu.message
          : huoQuFanYi('duoMeiTi', 'shengTuShiBai')
      sheZhiCuoWu(tiShi)
      return null
    }
  }

  async function qingQiuShengChengShiPin(tiShiCi: string): Promise<消息 | null> {
    if (!dangQianHuiHuaId.value) return null
    const qingXiHou = tiShiCi.trim().slice(0, 200)
    if (!qingXiHou) {
      sheZhiCuoWu(huoQuFanYi('liaoTian', 'xiaoXiNeiRongWeiKong'))
      return null
    }
    qingChuCuoWu()
    try {
      const { qingQiuShengChengShiPin: shengShiPinApi } = await import('@/api/聊天')
      const xiaoXi = await shengShiPinApi(dangQianHuiHuaId.value, qingXiHou)
      jiaRuXiaoXi(xiaoXi)
      return xiaoXi
    } catch (cuoWu: unknown) {
      const tiShi =
        cuoWu instanceof Error && cuoWu.message
          ? cuoWu.message
          : huoQuFanYi('duoMeiTi', 'shiPinShengChengShiBai')
      sheZhiCuoWu(tiShi)
      return null
    }
  }

  async function cheHuiXiaoXi(xiaoXiId: string) {
    if (!dangQianHuiHuaId.value) return
    try {
      await cheHuiXiaoXiApi(dangQianHuiHuaId.value, xiaoXiId)
      const suoYin = xiaoXiLieBiao.value.findIndex((m) => m.id === xiaoXiId)
      if (suoYin !== -1) {
        xiaoXiLieBiao.value[suoYin] = {
          ...xiaoXiLieBiao.value[suoYin],
          yi_che_hui: true,
          nei_rong: huoQuFanYi('liaoTian', 'ninCheHuiLeYiTiaoXiaoXi'),
        }
      }
    } catch (e) {
       
      console.warn('撤回消息失败', e)
    }
  }

  function qingKongZhuangTai() {
    持久化监控()
    dangQianHuiHuaId.value = null
    xiaoXiLieBiao.value = []
    qiangZhiYinChangXianShi()
    zuiHouXuHao = 0
    qingKongLunCiZhuangTai()
    jiaoSeXinXi.value = null
    youXiShiJian.value = null
    youXiYiJieShu.value = false
    keJiXuLiaoTian.value = false
    yiDuBuHuiZhuangTai.value = false
    cuoWuXinXi.value = null
    yeMa.value = 1
    zongShu.value = 0
    haiYouGengDuo.value = false
    jiaZaiGengDuoZhong.value = false
    shouPingJiaZaiZhong.value = false
    jiaZaiShiBai.value = false
    faSongShiBaiJiHe.value = new Set()
    duanKaiSocket()
  }

  return {
    dangQianHuiHuaId,
    xiaoXiLieBiao,
    zhengZaiShuRu,
    aiZhuangTai,
    jiaoSeXinXi,
    youXiShiJian,
    youXiYiJieShu,
    keJiXuLiaoTian,
    socketLianJie,
    lianJieZhong,
    yiDuBuHuiZhuangTai,
    cuoWuXinXi,
    weiJiGanYu,
    yeMa,
    meiYeTiaoShu,
    zongShu,
    jiaZaiGengDuoZhong,
    haiYouGengDuo,
    shouPingJiaZaiZhong,
    jiaZaiShiBai,
    faSongShiBaiJiHe,
    gouJianGuoChengLieBiao,
    haoGanDuBianHuaLieBiao,
    yinCangXinXiLieBiao,
    shenDuSiKaoLieBiao,
    zuiDaXiaoXiChangDu,
    lianJieSocket,
    queBaoJianKongDingYue,
    duanKaiSocket,
    jiaZaiXiaoXi,
    jiaZaiGengDuoXiaoXi,
    faSongXiaoXi,
    chongShiFaSongXiaoXi,
    faSongMeiTiXiaoXi,
    faSongTuWenXiaoXi,
    qingQiuShengTu,
    qingQiuShengChengShiPin,
    cheHuiXiaoXi,
    qingKongZhuangTai,
    qingChuCuoWu,
    sheZhiCuoWu,
    sheZhiWeiJiGanYu,
    guanBiWeiJiGanYu,
    补全旧内心消息,
  }
})
