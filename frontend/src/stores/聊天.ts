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
import { track } from '@/utils/埋点'

export interface MeiTiFuJia {
  shiChangHaoMiao?: number
  wenJianMing?: string
  zhuanXieWenBen?: string
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
  // 每会话单调递增的客户端序号（用户消息维度），随请求体上报，作为重载/分页的权威排序来源
  let ke_hu_duan_xu_hao = 0
  // 串行发送队列：上一条发送请求完成（或失败）后才派发下一条，
  // 使网络派发顺序恒等于用户点击顺序，从根本上消除并发乱序。
  let faSongDuiLie: Promise<void> = Promise.resolve()

  function anQuanTuiSong(xiaoXi: 消息) {
    if (!Array.isArray(xiaoXiLieBiao.value)) xiaoXiLieBiao.value = []
    xiaoXiLieBiao.value.push(xiaoXi)
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

  function lianJieSocket(huiHuaId: string) {
    if (socketLianJie.value?.connected && dangQianHuiHuaId.value === huiHuaId) {
      return
    }

    if (socketLianJie.value?.connected) {
      socketLianJie.value.disconnect()
    }

    const 令牌 = duQuLingPai()
    // YH-097 Socket令牌刷新：建连前刷新，auth用回调，重连退避禁拿旧票
    // 根因：401刷新了socket还拿旧票；收敛为建连前刷新+动态auth+退避
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

    socket.on('connect', () => {
      socket.emit('加入聊天', huiHuaId)
    })

    socket.on('角色回复', (shuJu: { 角色ID: string; 消息列表: 消息[] }) => {
      if (shuJu.角色ID === dangQianHuiHuaId.value) {
        shuJu.消息列表.forEach((xiaoXi) => anQuanTuiSong(xiaoXi))
        补全旧内心消息()
        // 角色消息可能回填更大的客户端序号，抬高本地计数器避免后续用户消息冲突
        const zuiDaXuHao = shuJu.消息列表.reduce(
          (zuiDa, x) => Math.max(zuiDa, x.ke_hu_duan_xu_hao ?? 0),
          0,
        )
        if (zuiDaXuHao > ke_hu_duan_xu_hao) ke_hu_duan_xu_hao = zuiDaXuHao
      }
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
          id: `xitong-${Date.now()}`,
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
        anQuanTuiSong(xiTongXiaoXi)
        track('biaoBaiJieGuo', { jie_guo: shuJu.lei_xing })
        youXiShiJian.value = shuJu
        youXiYiJieShu.value = true
        keJiXuLiaoTian.value = shuJu.ke_ji_xu_liao_tian === true
      },
    )

    socket.on('AI催促', (shuJu: { jiao_se_id: string; nei_rong: string }) => {
      if (shuJu.jiao_se_id === dangQianHuiHuaId.value) {
        const cuiGuXiaoXi: 消息 = {
          id: `cuigu-${Date.now()}`,
          hui_hua_id: dangQianHuiHuaId.value || '',
          fa_song_zhe_id: jiaoSeXinXi.value?.id || '',
          fa_song_zhe_lei_xing: 'jiaose',
          nei_rong: shuJu.nei_rong,
          lei_xing: 'wenben',
          shi_jian_chuo: Date.now(),
          yi_du: true,
        }
        anQuanTuiSong(cuiGuXiaoXi)
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
          id: `yidubuhui-${Date.now()}`,
          hui_hua_id: dangQianHuiHuaId.value || '',
          fa_song_zhe_id: '',
          fa_song_zhe_lei_xing: 'xitong',
          nei_rong: huoQuFanYi('liaoTian', 'duiFangYiDuBuHui'),
          lei_xing: 'xitong',
          shi_jian_chuo: Date.now(),
          yi_du: true,
        }
        anQuanTuiSong(xiTongXiaoXi)
      }
    })

    socket.on('disconnect', () => {
      lianJieZhong.value = false
      qiangZhiYinChangXianShi()
      zuiHouXuHao = 0
    })

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

    socketLianJie.value = socket
    lianJieZhong.value = true
  }

  function duanKaiSocket() {
    if (socketLianJie.value) {
      socketLianJie.value.disconnect()
      socketLianJie.value = null
    }
    lianJieZhong.value = false
  }

  async function jiaZaiXiaoXi(huiHuaId: string) {
    if (dangQianHuiHuaId.value && dangQianHuiHuaId.value !== huiHuaId) 持久化监控()
    dangQianHuiHuaId.value = huiHuaId
    读取监控历史(huiHuaId)
    xiaoXiLieBiao.value = []
    qiangZhiYinChangXianShi()
    zuiHouXuHao = 0
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
        xiaoXiLieBiao.value = [...jieGuo.lie_biao].reverse()
        zongShu.value = jieGuo.zong_shu
        // 以会话内已存在的最大客户端序号为基点，保证新消息序号严格递增且不与其冲突
        ke_hu_duan_xu_hao = jieGuo.lie_biao.reduce(
          (zuiDa, x) => Math.max(zuiDa, x.ke_hu_duan_xu_hao ?? 0),
          0,
        )
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
      xiaoXiLieBiao.value = [...xinLieBiao.reverse(), ...xiaoXiLieBiao.value]
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

  async function faSongXiaoXi(neiRong: string): Promise<消息 | null> {
    if (!dangQianHuiHuaId.value || !neiRong.trim()) return null
    const qingLiNeiRong = neiRong.trim()
    if (qingLiNeiRong.length > zuiDaXiaoXiChangDu) {
      sheZhiCuoWu(huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'))
      return null
    }
    qingChuCuoWu()
    linShiXiaoXiXuHao += 1
    const linShiId = `linshi-${Date.now()}-${linShiXiaoXiXuHao}`
    // 本条待发消息的客户端序号：随点击顺序单调递增，作为权威排序来源上报
    const benCiXuHao = ++ke_hu_duan_xu_hao
    const linShiXiaoXi: 消息 = {
      id: linShiId,
      ke_hu_duan_id: linShiId,
      ke_hu_duan_xu_hao: benCiXuHao,
      hui_hua_id: dangQianHuiHuaId.value,
      fa_song_zhe_id: '',
      fa_song_zhe_lei_xing: 'yonghu',
      nei_rong: qingLiNeiRong,
      lei_xing: 'wenben',
      shi_jian_chuo: Date.now(),
      yi_du: false,
      fa_song_zhong: true,
    }
    anQuanTuiSong(linShiXiaoXi)

    // 进入串行队列：捕获当前会话 ID，避免切会话后误发到其它会话；
    // 队列保证上一条请求完成后再派发本条，杜绝并发到达乱序。
    const dangQianHuiHua = dangQianHuiHuaId.value
    const paiDuiRenWu = faSongDuiLie.then(() =>
      faSongXiaoXiApi(dangQianHuiHua, qingLiNeiRong, benCiXuHao),
    )
    // 无论成败都推进队列，不阻断后续发送
    faSongDuiLie = paiDuiRenWu.then(
      () => undefined,
      () => undefined,
    )

    try {
      const { xiaoXi, shiMiJi, weiJiGanYu, yuanZhuReXian, ganYuTiShi, chaoShiTiXingMiao } = await paiDuiRenWu
      // 服务端可能回写更大的序号（如角色消息回填），同步抬高本地计数器避免后续冲突
      ke_hu_duan_xu_hao = Math.max(ke_hu_duan_xu_hao, xiaoXi.ke_hu_duan_xu_hao ?? 0)
      const suoYin = xiaoXiLieBiao.value.findIndex(
        (m) => m.ke_hu_duan_id === linShiXiaoXi.ke_hu_duan_id,
      )
      if (suoYin !== -1) {
        xiaoXiLieBiao.value[suoYin] = { ...xiaoXi, ke_hu_duan_id: linShiXiaoXi.ke_hu_duan_id }
      }
      if (socketLianJie.value?.connected && !shiMiJi) {
        socketLianJie.value.emit('发送消息')
      }
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
      faSongShiBaiJiHe.value.add(linShiId)
      const suoYin = xiaoXiLieBiao.value.findIndex(
        (m) => m.ke_hu_duan_id === linShiXiaoXi.ke_hu_duan_id,
      )
      if (suoYin !== -1) {
        xiaoXiLieBiao.value[suoYin] = { ...xiaoXiLieBiao.value[suoYin], fa_song_zhong: false }
      }
      const xiaoXi = cuoWu instanceof Error ? cuoWu.message : huoQuFanYi('liaoTian', 'faSongShiBai')
      sheZhiCuoWu(xiaoXi)
      return null
    }
  }

  async function chongShiFaSongXiaoXi(keHuDuanId: string): Promise<boolean> {
    if (!keHuDuanId || !faSongShiBaiJiHe.value.has(keHuDuanId)) return false
    const suoYin = xiaoXiLieBiao.value.findIndex((m) => m.ke_hu_duan_id === keHuDuanId)
    if (suoYin === -1) {
      faSongShiBaiJiHe.value.delete(keHuDuanId)
      return false
    }
    const neiRong = xiaoXiLieBiao.value[suoYin].nei_rong
    // 同帧内先移除失败气泡再入队重发，避免闪烁；重发走统一串行队列与乐观更新
    xiaoXiLieBiao.value.splice(suoYin, 1)
    faSongShiBaiJiHe.value.delete(keHuDuanId)
    qingChuCuoWu()
    const jieGuo = await faSongXiaoXi(neiRong)
    return jieGuo !== null
  }

  async function faSongMeiTiXiaoXi(
    leiXing: DuoMeiTiLeiXing,
    wenJian: File | Blob,
    fuJia: MeiTiFuJia = {},
  ): Promise<消息 | null> {
    if (!dangQianHuiHuaId.value) return null
    qingChuCuoWu()
    linShiXiaoXiXuHao += 1
    const linShiId = `linshi-${Date.now()}-${linShiXiaoXiXuHao}`
    const benCiXuHao = ++ke_hu_duan_xu_hao
    const benDiYuLan = dengJiYuLanURL(wenJian)
    const yuanWenJianMing =
      fuJia.wenJianMing || (wenJian instanceof File && wenJian.name ? wenJian.name : '')
    const linShiXiaoXi: 消息 = {
      id: linShiId,
      ke_hu_duan_id: linShiId,
      ke_hu_duan_xu_hao: benCiXuHao,
      hui_hua_id: dangQianHuiHuaId.value,
      fa_song_zhe_id: '',
      fa_song_zhe_lei_xing: 'yonghu',
      nei_rong: '',
      lei_xing: leiXing,
      shi_jian_chuo: Date.now(),
      yi_du: false,
      fa_song_zhong: true,
      mei_ti_id: null,
      mei_ti_url: null,
      ben_di_yu_lan_url: benDiYuLan,
      ben_di_da_xiao_zi_jie: typeof wenJian.size === 'number' ? wenJian.size : null,
      mei_ti_shi_chang_hao_miao:
        typeof fuJia.shiChangHaoMiao === 'number' ? fuJia.shiChangHaoMiao : null,
      mei_ti_yuan_shi_wen_jian_ming: yuanWenJianMing || null,
    }
    anQuanTuiSong(linShiXiaoXi)

    try {
      const huiHuaId = dangQianHuiHuaId.value
      const shangChuanJieGuo = await shangChuanMeiTi(
        huiHuaId,
        wenJian,
        DUO_MEI_TI_LEI_XING_SHANG_CHUAN_LEI_BIE[leiXing],
      )
      const suiWenBen =
        leiXing === 'yuYin' && typeof fuJia.zhuanXieWenBen === 'string'
          ? fuJia.zhuanXieWenBen.trim().slice(0, 500)
          : ''
      const { xiaoXi } = await faSongXiaoXiApi(
        huiHuaId,
        suiWenBen,
        benCiXuHao,
        leiXing,
        shangChuanJieGuo.mediaId,
      )
      ke_hu_duan_xu_hao = Math.max(ke_hu_duan_xu_hao, xiaoXi.ke_hu_duan_xu_hao ?? 0)
      const fuWuQiURL = xiaoXi.mei_ti_url || benDiYuLan
      if (xiaoXi.mei_ti_url) {
        cheXiaoYuLanURL(benDiYuLan)
      }
      const suoYin = xiaoXiLieBiao.value.findIndex((m) => m.ke_hu_duan_id === linShiId)
      if (suoYin !== -1) {
        xiaoXiLieBiao.value[suoYin] = {
          ...xiaoXi,
          ke_hu_duan_id: linShiId,
          mei_ti_url: fuWuQiURL,
          ben_di_yu_lan_url: xiaoXi.mei_ti_url ? null : benDiYuLan,
          ben_di_da_xiao_zi_jie:
            xiaoXi.ben_di_da_xiao_zi_jie ?? linShiXiaoXi.ben_di_da_xiao_zi_jie ?? null,
        }
      }
      if (socketLianJie.value?.connected) {
        socketLianJie.value.emit('发送消息')
      }
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
      anQuanTuiSong(xiaoXi)
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
      anQuanTuiSong(xiaoXi)
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
    duanKaiSocket,
    jiaZaiXiaoXi,
    jiaZaiGengDuoXiaoXi,
    faSongXiaoXi,
    chongShiFaSongXiaoXi,
    faSongMeiTiXiaoXi,
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
