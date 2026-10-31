import { defineStore } from 'pinia'
import { ref, computed, watch, onScopeDispose } from 'vue'
import { io, Socket } from 'socket.io-client'
import type { 消息, 角色, DuoMeiTiLeiXing } from '@/types/类型定义'
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
import { huoQuFanYi, fanYi } from '@/config/翻译表'
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
import type { XiaoXiKuai, XiaoXiKuaiChuCan } from '@/types/类型定义'
import { track } from '@/utils/埋点'
import { 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'
import { 使用用户仓库 } from '@/stores/用户'

export interface MeiTiFuJia {
  shiChangHaoMiao?: number
  wenJianMing?: string
  zhuanXieWenBen?: string
  yiYouMeiTi?: { meiTiId: string; meiTiUrl: string | null }
}

export interface JiaoSeHuiFuShiJian {
  角色ID: string
  消息列表: 消息[]
  轮次?: number | null
  驱动消息ID?: string | null
}

export interface HaoGanDuZengLiangShiJian {
  shi_jian_id: string
  jiao_se_id: string
  xin_ren_du_bian_hua?: number
  qin_mi_du_bian_hua?: number
  qu_wei_du_bian_hua?: number
  guan_huai_du_bian_hua?: number
  zong_fen_bian_hua?: number
}

export interface HaoGanDuZengLiangJiLu {
  xin_ren_du_bian_hua: number
  qin_mi_du_bian_hua: number
  qu_wei_du_bian_hua: number
  guan_huai_du_bian_hua: number
  zong_fen_bian_hua: number
}

export const 使用聊天仓库 = defineStore('聊天', () => {
  const dangQianHuiHuaId = ref<string | null>(null)
  const xiaoXiLieBiao = ref<消息[]>([])
  const aiZhuangTai = ref<'kong_xian' | 'deng_dai_zhong' | 'zheng_zai_shu_ru'>('kong_xian')
  let zuiHouXuHao = 0
  const ZHENG_ZAI_SHU_RU_XIAO_SHI_YAN_CHI_HAO_MIAO = 1000

  const xianShiZhengZaiShuRu = ref(false)
  let yanChiDingShiQi: ReturnType<typeof setTimeout> | null = null
  let huLueJianTing = false

  function qingLiYanChiDingShiQi() {
    if (yanChiDingShiQi !== null) {
      clearTimeout(yanChiDingShiQi)
      yanChiDingShiQi = null
    }
  }

  function qiangZhiYinChangXianShi() {
    qingLiYanChiDingShiQi()
    huLueJianTing = true
    aiZhuangTai.value = 'kong_xian'
    huLueJianTing = false
    xianShiZhengZaiShuRu.value = false
  }

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
    清空媒体重发()
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

  const haoGanDuBianHuaJiLu = ref<Record<string, HaoGanDuZengLiangJiLu>>({})
  const yiShouZengLiangIds = new Set<string>()
  const zengLiangIdDuiLie: string[] = []
  const ZENG_LIANG_ID_SHANG_XIAN = 500
  const ZENG_LIANG_BAI_MING_DAN = new Set([
    'shi_jian_id',
    'jiao_se_id',
    'xin_ren_du_bian_hua',
    'qin_mi_du_bian_hua',
    'qu_wei_du_bian_hua',
    'guan_huai_du_bian_hua',
    'zong_fen_bian_hua',
  ])
  const ZENG_LIANG_WEI_DU = [
    'xin_ren_du_bian_hua',
    'qin_mi_du_bian_hua',
    'qu_wei_du_bian_hua',
    'guan_huai_du_bian_hua',
    'zong_fen_bian_hua',
  ] as const

  function jieShouHaoGanDuZengLiang(shuJu: HaoGanDuZengLiangShiJian): void {
    if (typeof shuJu !== 'object' || shuJu === null) return
    const fuZai = shuJu as unknown as Record<string, unknown>
    if (typeof fuZai.shi_jian_id !== 'string' || typeof fuZai.jiao_se_id !== 'string') return
    if (fuZai.jiao_se_id !== dangQianHuiHuaId.value) return
    for (const jian of Object.keys(fuZai)) {
      if (!ZENG_LIANG_BAI_MING_DAN.has(jian)) return
    }
    const shuZhi: Record<(typeof ZENG_LIANG_WEI_DU)[number], number> = {
      xin_ren_du_bian_hua: 0,
      qin_mi_du_bian_hua: 0,
      qu_wei_du_bian_hua: 0,
      guan_huai_du_bian_hua: 0,
      zong_fen_bian_hua: 0,
    }
    for (const wei of ZENG_LIANG_WEI_DU) {
      const zhi = fuZai[wei]
      if (zhi === undefined) continue
      if (typeof zhi !== 'number' || !Number.isInteger(zhi)) return
      shuZhi[wei] = zhi
    }
    const shiJianId = fuZai.shi_jian_id
    if (yiShouZengLiangIds.has(shiJianId)) return
    yiShouZengLiangIds.add(shiJianId)
    zengLiangIdDuiLie.push(shiJianId)
    if (zengLiangIdDuiLie.length > ZENG_LIANG_ID_SHANG_XIAN) {
      const zuiJiu = zengLiangIdDuiLie.shift()
      if (zuiJiu) yiShouZengLiangIds.delete(zuiJiu)
    }
    const jiaoSeId = fuZai.jiao_se_id
    const yiYou: HaoGanDuZengLiangJiLu =
      haoGanDuBianHuaJiLu.value[jiaoSeId] ?? {
        xin_ren_du_bian_hua: 0,
        qin_mi_du_bian_hua: 0,
        qu_wei_du_bian_hua: 0,
        guan_huai_du_bian_hua: 0,
        zong_fen_bian_hua: 0,
      }
    haoGanDuBianHuaJiLu.value = {
      ...haoGanDuBianHuaJiLu.value,
      [jiaoSeId]: {
        xin_ren_du_bian_hua: yiYou.xin_ren_du_bian_hua + shuZhi.xin_ren_du_bian_hua,
        qin_mi_du_bian_hua: yiYou.qin_mi_du_bian_hua + shuZhi.qin_mi_du_bian_hua,
        qu_wei_du_bian_hua: yiYou.qu_wei_du_bian_hua + shuZhi.qu_wei_du_bian_hua,
        guan_huai_du_bian_hua: yiYou.guan_huai_du_bian_hua + shuZhi.guan_huai_du_bian_hua,
        zong_fen_bian_hua: yiYou.zong_fen_bian_hua + shuZhi.zong_fen_bian_hua,
      },
    }
  }

  function qingChuJiaoSeZengLiangJiLu(jiaoSeId: string): void {
    if (!(jiaoSeId in haoGanDuBianHuaJiLu.value)) return
    const fuBen = { ...haoGanDuBianHuaJiLu.value }
    delete fuBen[jiaoSeId]
    haoGanDuBianHuaJiLu.value = fuBen
  }

  const haoGanDuZengLiangBiaoQian = computed<Array<{ mingCheng: string; shuZhi: number }>>(() => {
    const huiHuaId = dangQianHuiHuaId.value
    if (!huiHuaId) return []
    const jiLu = haoGanDuBianHuaJiLu.value[huiHuaId]
    const weiDu = fanYi.zhanJi.haoGanDuWeiDu
    return [
      { mingCheng: weiDu.xinRenBianHua, shuZhi: jiLu?.xin_ren_du_bian_hua ?? 0 },
      { mingCheng: weiDu.qinMiBianHua, shuZhi: jiLu?.qin_mi_du_bian_hua ?? 0 },
      { mingCheng: weiDu.quWeiBianHua, shuZhi: jiLu?.qu_wei_du_bian_hua ?? 0 },
      { mingCheng: weiDu.guanHuaiBianHua, shuZhi: jiLu?.guan_huai_du_bian_hua ?? 0 },
      { mingCheng: weiDu.zongFenBianHua, shuZhi: jiLu?.zong_fen_bian_hua ?? 0 },
    ]
  })

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
  const shouPingJiaZaiZhong = ref(false)
  const jiaZaiShiBai = ref(false)
  const shouPingQianTaiCuoWu = ref<QianTaiCuoWu | null>(null)
  const jiaoSeQianTaiCuoWu = ref<QianTaiCuoWu | null>(null)
  let jiaZaiDaiCi = 0
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

  const 监控存储键前缀 = 'guanli-jiankong-huihua:'
  const 旧监控存储键前缀 = 'guanli-jiankong:'
  const 监控偏好保留键 = new Set(['guanli-jiankong:fu-chuang', 'guanli-jiankong:pian-hao'])
  const 监控会话键上限 = 20
  function 监控存储键(huiHuaId: string | null): string | null {
    if (!huiHuaId) return null
    return `${监控存储键前缀}${huiHuaId}`
  }
  function 清扫旧监控存档() {
    if (typeof localStorage === 'undefined') return
    const 旧键: string[] = []
    for (let xuHao = 0; xuHao < localStorage.length; xuHao++) {
      const jian = localStorage.key(xuHao)
      if (!jian || !jian.startsWith(旧监控存储键前缀)) continue
      if (监控偏好保留键.has(jian)) continue
      旧键.push(jian)
    }
    for (const jian of 旧键) localStorage.removeItem(jian)
  }
  function 清理监控存档上限() {
    if (typeof sessionStorage === 'undefined') return
    const xiang: Array<{ jian: string; shiJian: number }> = []
    for (let xuHao = 0; xuHao < sessionStorage.length; xuHao++) {
      const jian = sessionStorage.key(xuHao)
      if (!jian || !jian.startsWith(监控存储键前缀)) continue
      let shiJian = 0
      try {
        const yuanWen = sessionStorage.getItem(jian)
        if (yuanWen) {
          shiJian = (JSON.parse(yuanWen) as { cun_dang_shi_jian?: number }).cun_dang_shi_jian ?? 0
        }
      } catch {
        shiJian = 0
      }
      xiang.push({ jian, shiJian })
    }
    if (xiang.length <= 监控会话键上限) return
    xiang.sort((a, b) => a.shiJian - b.shiJian)
    const yaoShan = xiang.slice(0, xiang.length - 监控会话键上限)
    for (const xiangMu of yaoShan) sessionStorage.removeItem(xiangMu.jian)
  }
  function 持久化监控() {
    try {
      const 键 = 监控存储键(dangQianHuiHuaId.value)
      if (!键 || typeof sessionStorage === 'undefined') return
      sessionStorage.setItem(
        键,
        JSON.stringify({
          cun_dang_shi_jian: Date.now(),
          gouJian: gouJianGuoChengLieBiao.value.slice(-监控最大条数),
          haoGanDu: haoGanDuBianHuaLieBiao.value.slice(-监控最大条数),
          yinCang: yinCangXinXiLieBiao.value.slice(-监控最大条数),
          shenDuSiKao: shenDuSiKaoLieBiao.value.slice(-监控最大条数),
        }),
      )
      清扫旧监控存档()
      清理监控存档上限()
    } catch {
      return
    }
  }
  function 读取监控历史(huiHuaId: string) {
    gouJianGuoChengLieBiao.value = []
    haoGanDuBianHuaLieBiao.value = []
    yinCangXinXiLieBiao.value = []
    shenDuSiKaoLieBiao.value = []
    清扫旧监控存档()
    try {
      const 键 = 监控存储键(huiHuaId)
      if (!键 || typeof sessionStorage === 'undefined') return
      const 原文 = sessionStorage.getItem(键)
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
      return
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
  const faSongShiBaiJiHe = ref(new Set<string>())
  const faSongRenWuBiao = new Map<string, Promise<消息 | null>>()

  interface 媒体重发上下文 {
    leiXing: DuoMeiTiLeiXing
    wenJian: File | Blob | null
    fuJia: MeiTiFuJia
    yinYongXiaoXiId: string | null
    benDiYuLan: string | null
  }

  const 媒体重发表 = new Map<string, 媒体重发上下文>()
  const 媒体重发上限 = 50

  function 记录媒体重发(keHuDuanId: string, shangXiaWen: 媒体重发上下文): void {
    媒体重发表.set(keHuDuanId, shangXiaWen)
    while (媒体重发表.size > 媒体重发上限) {
      const zuiJiu = 媒体重发表.keys().next().value
      if (!zuiJiu || zuiJiu === keHuDuanId) break
      媒体重发表.delete(zuiJiu)
    }
  }

  function 移除媒体重发(keHuDuanId?: string | null): void {
    if (keHuDuanId) 媒体重发表.delete(keHuDuanId)
  }

  function 清空媒体重发(): void {
    for (const shangXiaWen of 媒体重发表.values()) {
      if (shangXiaWen.benDiYuLan) cheXiaoYuLanURL(shangXiaWen.benDiYuLan)
    }
    媒体重发表.clear()
  }

  function 清除发送失败(keHuDuanId?: string | null): void {
    if (!keHuDuanId) return
    if (faSongShiBaiJiHe.value.has(keHuDuanId)) faSongShiBaiJiHe.value.delete(keHuDuanId)
  }

  function 清理已确认媒体(keHuDuanId?: string | null, fuWuQiXiaoXi?: 消息): void {
    if (!keHuDuanId) return
    const shangXiaWen = 媒体重发表.get(keHuDuanId)
    if (!shangXiaWen) return
    if (fuWuQiXiaoXi?.mei_ti_url && shangXiaWen.benDiYuLan) {
      cheXiaoYuLanURL(shangXiaWen.benDiYuLan)
    }
    媒体重发表.delete(keHuDuanId)
  }

  function 标记发送失败(xiaoXi: 消息): void {
    const keHuDuanId = xiaoXi.ke_hu_duan_id
    if (!keHuDuanId) return
    faSongShiBaiJiHe.value.add(keHuDuanId)
    const suoYin = xiaoXiLieBiao.value.findIndex((m) => m.ke_hu_duan_id === keHuDuanId)
    if (suoYin !== -1) {
      xiaoXiLieBiao.value[suoYin] = { ...xiaoXiLieBiao.value[suoYin], fa_song_zhong: false }
    }
  }

  let yiJieShouLunCi = 0
  let yiJieShouLunCiDongQiaoId: string | null = null
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

  function guiYiDanTiaoLeiXing(xiaoXi: 消息): void {
    const guiYiLeiXing = guiYiXiaoXiLeiXing(xiaoXi.lei_xing)
    if (guiYiLeiXing !== xiaoXi.lei_xing && typeof xiaoXi.lei_xing === 'string') {
      xiaoXi.lei_xing = guiYiLeiXing as 消息['lei_xing']
    }
  }

  function guiYiXiaoXiLieBiao<T extends 消息>(lieBiao: T[]): T[] {
    for (const xiaoXi of lieBiao) guiYiDanTiaoLeiXing(xiaoXi)
    return lieBiao
  }

  function jiaRuXiaoXi(xiaoXi: 消息): boolean {
    if (!xiaoXi || typeof xiaoXi.id !== 'string' || !xiaoXi.id) return false
    guiYiDanTiaoLeiXing(xiaoXi)
    if (!Array.isArray(xiaoXiLieBiao.value)) xiaoXiLieBiao.value = []
    const lieBiao = xiaoXiLieBiao.value
    if (xiaoXi.ke_hu_duan_id) {
      const zhanWeiSuoYin = lieBiao.findIndex((m) => m.ke_hu_duan_id === xiaoXi.ke_hu_duan_id)
      if (zhanWeiSuoYin !== -1) {
        if (lieBiao[zhanWeiSuoYin].id === xiaoXi.id) return false
        const yiCunZaiSuoYin = lieBiao.findIndex((m) => m.id === xiaoXi.id)
        if (yiCunZaiSuoYin !== -1 && yiCunZaiSuoYin !== zhanWeiSuoYin) {
          lieBiao.splice(zhanWeiSuoYin, 1)
          return true
        }
        lieBiao.splice(zhanWeiSuoYin, 1, xiaoXi)
        return true
      }
    }
    if (lieBiao.some((m) => m.id === xiaoXi.id)) return false
    lieBiao.push(xiaoXi)
    return true
  }

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

  const socketHuiHuaId = ref<string | null>(null)
  let socketYiFangQi = false

  let jianKongYiDingYue = false

  function queBaoJianKongDingYue(mubiaoSocket?: Socket): void {
    const xieYiLianJie = mubiaoSocket ?? socketLianJie.value
    if (!xieYiLianJie || jianKongYiDingYue) return
    if (!使用用户仓库().keGuanLiZhiDu) return
    jianKongYiDingYue = true

    xieYiLianJie.on('管理员_构建过程', (shuJu: { 阶段: string; 说明: string; 内容?: string; 时间: number; 轮次?: number }) => {
      添加监控项(gouJianGuoChengLieBiao, {
        阶段: shuJu.阶段,
        说明: shuJu.说明,
        内容: typeof shuJu.内容 === 'string' ? shuJu.内容 : undefined,
        时间: shuJu.时间,
        轮次: typeof shuJu.轮次 === 'number' ? shuJu.轮次 : undefined,
      })
    })

    xieYiLianJie.on('管理员_好感度变化', (shuJu: { 变化: Record<string, number>; 时间: number; 轮次?: number }) => {
      添加监控项(haoGanDuBianHuaLieBiao, {
        变化: shuJu.变化,
        时间: shuJu.时间,
        轮次: typeof shuJu.轮次 === 'number' ? shuJu.轮次 : undefined,
      })
    })

    xieYiLianJie.on('管理员_隐藏信息', (shuJu: { 类型: string; 内容: string; 时间: number; 轮次?: number }) => {
      添加监控项(yinCangXinXiLieBiao, {
        类型: shuJu.类型,
        内容: shuJu.内容,
        时间: shuJu.时间,
        轮次: typeof shuJu.轮次 === 'number' ? shuJu.轮次 : undefined,
      })
    })

    xieYiLianJie.on('管理员_深度思考', (shuJu: { 来源: string; 内容: string; 时间: number; 轮次?: number }) => {
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
    const xieYiLianJie = io({
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

    xieYiLianJie.on('connect', () => {
      qingKongLunCiZhuangTai()
      if (socketHuiHuaId.value) xieYiLianJie.emit('加入聊天', socketHuiHuaId.value)
    })

    const jianKongQi = xieYiLianJie.io as unknown as { on?: (shiJian: string, chuli: () => void) => void }
    jianKongQi?.on?.('reconnect_failed', () => {
      socketYiFangQi = true
    })

    xieYiLianJie.on('角色回复', (shuJu: JiaoSeHuiFuShiJian) => {
      if (!shuJu || shuJu.角色ID !== dangQianHuiHuaId.value) return
      if (判定并登记轮次(shuJu)) return
      if (Array.isArray(shuJu.消息列表)) {
        shuJu.消息列表.forEach((xiaoXi) => jiaRuXiaoXi(xiaoXi))
      }
      补全旧内心消息()
    })

    xieYiLianJie.on(
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

    xieYiLianJie.on(
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

    xieYiLianJie.on('AI催促', (shuJu: { jiao_se_id: string; nei_rong: string }) => {
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

    xieYiLianJie.on('消息撤回', (shuJu: { hui_hua_id: string; xiao_xi_id: string }) => {
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

    xieYiLianJie.on('已读不回', (shuJu: { jiao_se_id: string; yuan_yin: string }) => {
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

    xieYiLianJie.on('disconnect', () => {
      lianJieZhong.value = false
      qiangZhiYinChangXianShi()
      zuiHouXuHao = 0
    })

    xieYiLianJie.on('好感度增量', (shuJu: HaoGanDuZengLiangShiJian) => {
      jieShouHaoGanDuZengLiang(shuJu)
    })

    queBaoJianKongDingYue(xieYiLianJie)

    return xieYiLianJie
  }

  type KeJieBangSocket = { disconnect: () => void; removeAllListeners?: () => void }

  function jieBangSocket(xieYiLianJie: KeJieBangSocket) {
    if (typeof xieYiLianJie.removeAllListeners === 'function') xieYiLianJie.removeAllListeners()
    xieYiLianJie.disconnect()
  }

  function lianJieSocket(huiHuaId: string) {
    if (!socketLianJie.value || socketYiFangQi) {
      if (socketLianJie.value) jieBangSocket(socketLianJie.value)
      socketLianJie.value = chuangJianSocket()
      socketYiFangQi = false
    }
    const xieYiLianJie = socketLianJie.value
    if (socketHuiHuaId.value === huiHuaId) return
    socketHuiHuaId.value = huiHuaId
    zuiHouXuHao = 0
    if (xieYiLianJie.connected) xieYiLianJie.emit('加入聊天', huiHuaId)
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

  const yuZaiHuiHuaId = ref<string | null>(null)
  let yuZaiShiJian = 0
  const YU_ZAI_YOU_XIAO_HAO_MIAO = 30000

  function biaoJiYuZai(huiHuaId: string) {
    yuZaiHuiHuaId.value = huiHuaId
    yuZaiShiJian = Date.now()
  }

  async function jiaZaiXiaoXi(
    huiHuaId: string,
    jieDuanTiShi?: (jieDuan: 'xiaoXi' | 'jiaoSe') => void,
  ) {
    if (yuZaiHuiHuaId.value === huiHuaId && Date.now() - yuZaiShiJian < YU_ZAI_YOU_XIAO_HAO_MIAO) {
      yuZaiHuiHuaId.value = null
      return
    }
    const benCi = ++jiaZaiDaiCi
    if (dangQianHuiHuaId.value && dangQianHuiHuaId.value !== huiHuaId) 持久化监控()
    qingChuJiaoSeZengLiangJiLu(huiHuaId)
    dangQianHuiHuaId.value = huiHuaId
    读取监控历史(huiHuaId)
    xiaoXiLieBiao.value = []
    faSongShiBaiJiHe.value = new Set()
    faSongRenWuBiao.clear()
    清空媒体重发()
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
    shouPingQianTaiCuoWu.value = null
    jiaoSeQianTaiCuoWu.value = null
    try {
      try {
        const jieGuo = await huoQuXiaoXi(huiHuaId, yeMa.value, meiYeTiaoShu.value)
        if (benCi !== jiaZaiDaiCi) return
        const fuWuLieBiao = [...jieGuo.lie_biao].reverse()
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
        haiYouGengDuo.value = jieGuo.hai_you_geng_duo ?? jieGuo.lie_biao.length < jieGuo.zong_shu
        补全旧内心消息()
        try {
          await biaoJiYiDu(huiHuaId)
        } catch {
          /* 已读回执失败不打断首屏渲染 */
        }
      } catch (cuoWu: unknown) {
        if (benCi !== jiaZaiDaiCi) return
        console.error('聊天首屏消息加载失败', cuoWu)
        xiaoXiLieBiao.value = []
        zongShu.value = 0
        haiYouGengDuo.value = false
        jiaZaiShiBai.value = true
        shouPingQianTaiCuoWu.value = 归一前台错误(cuoWu)
      }
      jieDuanTiShi?.('xiaoXi')
      try {
        const { jiao_se, dang_an_zhuang_tai } = await huoQuJiaoSeXiangQing(huiHuaId)
        if (benCi !== jiaZaiDaiCi) return
        jiaoSeXinXi.value = jiao_se
        jiaoSeQianTaiCuoWu.value = null
        if (dang_an_zhuang_tai) {
          youXiYiJieShu.value = dang_an_zhuang_tai.you_xi_yi_jie_shu
          keJiXuLiaoTian.value = dang_an_zhuang_tai.ke_ji_xu_liao_tian
        }
      } catch (cuoWu: unknown) {
        if (benCi !== jiaZaiDaiCi) return
        console.error('聊天角色详情加载失败', cuoWu)
        jiaoSeXinXi.value = null
        jiaoSeQianTaiCuoWu.value = 归一前台错误(cuoWu)
      }
      jieDuanTiShi?.('jiaoSe')
    } finally {
      if (benCi === jiaZaiDaiCi) shouPingJiaZaiZhong.value = false
    }
  }

  async function jiaZaiGengDuoXiaoXi(): Promise<boolean> {
    if (!dangQianHuiHuaId.value || jiaZaiGengDuoZhong.value || !haiYouGengDuo.value) return false
    jiaZaiGengDuoZhong.value = true
    try {
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

  function duiQiLeDaXiangXiaoXi(乐观消息: 消息, fuWuQiXiaoXi: 消息, jiaGong?: (x: 消息) => 消息): boolean {
    if (乐观消息.hui_hua_id && 乐观消息.hui_hua_id !== dangQianHuiHuaId.value) return false
    const fuWuMiDengJian = fuWuQiXiaoXi.mi_deng_jian
    const shiBenTiao =
      fuWuQiXiaoXi.fa_song_zhe_lei_xing === 'yonghu' &&
      typeof 乐观消息.mi_deng_jian === 'string' &&
      乐观消息.mi_deng_jian !== '' &&
      typeof fuWuMiDengJian === 'string' &&
      fuWuMiDengJian !== '' &&
      fuWuMiDengJian === 乐观消息.mi_deng_jian
    const keHuDuanId = 乐观消息.ke_hu_duan_id
    if (!shiBenTiao) {
      const dengJingXiaoXi = jiaGong ? jiaGong(fuWuQiXiaoXi) : fuWuQiXiaoXi
      const suoYin = keHuDuanId
        ? xiaoXiLieBiao.value.findIndex((m) => m.ke_hu_duan_id === keHuDuanId)
        : -1
      if (suoYin !== -1) xiaoXiLieBiao.value.splice(suoYin, 1)
      清理已确认媒体(keHuDuanId, fuWuQiXiaoXi)
      if (keHuDuanId) {
        const jieGuanXiaoXi = { ...dengJingXiaoXi, ke_hu_duan_id: keHuDuanId }
        jiaRuXiaoXi(jieGuanXiaoXi)
        标记发送失败(jieGuanXiaoXi)
      } else {
        jiaRuXiaoXi(dengJingXiaoXi)
      }
      return false
    }
    jiLuYiQueRenYongHuId(fuWuQiXiaoXi.id)
    清除发送失败(keHuDuanId)
    清理已确认媒体(keHuDuanId, fuWuQiXiaoXi)
    const dengJingXiaoXi = jiaGong ? jiaGong(fuWuQiXiaoXi) : fuWuQiXiaoXi
    const buQiShiChangHaoMiao =
      dengJingXiaoXi.mei_ti_shi_chang_hao_miao ?? 乐观消息.mei_ti_shi_chang_hao_miao ?? null
    jiaRuXiaoXi({
      ...dengJingXiaoXi,
      mi_deng_jian: 乐观消息.mi_deng_jian ?? dengJingXiaoXi.mi_deng_jian ?? null,
      ke_hu_duan_id: keHuDuanId,
      ...(buQiShiChangHaoMiao !== null ? { mei_ti_shi_chang_hao_miao: buQiShiChangHaoMiao } : {}),
    })
    return true
  }

  async function zhiXingFaSongRenWu(乐观消息: 消息): Promise<消息 | null> {
    const miDengJian = queDingMiDengJian(乐观消息)
    const dangQianHuiHua = 乐观消息.hui_hua_id
    const tiJiaoKuai: XiaoXiKuai[] | undefined = Array.isArray(乐观消息.nei_rong_kuai)
      ? keTiJiaoKuai(乐观消息.nei_rong_kuai)
      : undefined
    const daiKuai = tiJiaoKuai && tiJiaoKuai.length > 0 ? tiJiaoKuai : undefined
    const yinYong = 乐观消息.bei_yong_xiao_xi_id
      ? { beiYongXiaoXiId: 乐观消息.bei_yong_xiao_xi_id }
      : undefined
    try {
      const { xiaoXi, weiJiGanYu, yuanZhuReXian, ganYuTiShi, chaoShiTiXingMiao } = daiKuai
        ? await faSongXiaoXiApi({
            huiHuaId: dangQianHuiHua,
            neiRong: 乐观消息.nei_rong,
            miDengJian,
            leiXing: 乐观消息.lei_xing,
            meiTiId: 乐观消息.mei_ti_id ?? null,
            neiRongKuai: daiKuai,
            yinYong,
          })
        : await faSongXiaoXiApi({
            huiHuaId: dangQianHuiHua,
            neiRong: 乐观消息.nei_rong,
            miDengJian,
            yinYong,
          })
      if (乐观消息.hui_hua_id === dangQianHuiHuaId.value) {
        duiQiLeDaXiangXiaoXi(乐观消息, xiaoXi)
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
      }
      return xiaoXi
    } catch (cuoWu: unknown) {
      console.error('发送消息失败', cuoWu)
      if (乐观消息.hui_hua_id === dangQianHuiHuaId.value) {
        标记发送失败(乐观消息)
        sheZhiCuoWu(归一前台错误(cuoWu).yingXiang)
      }
      return null
    }
  }

  async function faSongYiTiaoYongHuXiaoXi(乐观消息: 消息): Promise<消息 | null> {
    const keHuDuanId = 乐观消息.ke_hu_duan_id
    if (keHuDuanId) {
      const zaiTu = faSongRenWuBiao.get(keHuDuanId)
      if (zaiTu) return zaiTu
    }
    const renWu = zhiXingFaSongRenWu(乐观消息)
    if (keHuDuanId) {
      faSongRenWuBiao.set(keHuDuanId, renWu)
      const shouWei = () => {
        if (faSongRenWuBiao.get(keHuDuanId) === renWu) faSongRenWuBiao.delete(keHuDuanId)
      }
      renWu.then(shouWei, shouWei)
    }
    return renWu
  }

  function qingLiYinYongId(zhi: string | null | undefined): string | null {
    if (!zhi) return null
    const beiYongXing = xiaoXiLieBiao.value.find((m) => m.id === zhi)
    if (beiYongXing && shiBenDiLinShiXiaoXi(beiYongXing)) {
      console.warn('聊天仓库：引用目标仍是本地乐观气泡（未落库），本次按无引用发送', { id: zhi })
      return null
    }
    return zhi
  }

  async function faSongXiaoXi(
    neiRong: string,
    yinYongXiaoXiId?: string | null,
  ): Promise<消息 | null> {
    if (!dangQianHuiHuaId.value || !neiRong.trim()) return null
    qingChuJiaoSeZengLiangJiLu(dangQianHuiHuaId.value)
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

  function 由消息恢复媒体上下文(xiaoXi: 消息): 媒体重发上下文 | null {
    if (!(xiaoXi.lei_xing in DUO_MEI_TI_LEI_XING_SHANG_CHUAN_LEI_BIE)) return null
    return {
      leiXing: xiaoXi.lei_xing as DuoMeiTiLeiXing,
      wenJian: null,
      fuJia: {
        ...(typeof xiaoXi.mei_ti_shi_chang_hao_miao === 'number'
          ? { shiChangHaoMiao: xiaoXi.mei_ti_shi_chang_hao_miao }
          : {}),
        ...(xiaoXi.mei_ti_yuan_shi_wen_jian_ming
          ? { wenJianMing: xiaoXi.mei_ti_yuan_shi_wen_jian_ming }
          : {}),
      },
      yinYongXiaoXiId: xiaoXi.bei_yong_xiao_xi_id ?? null,
      benDiYuLan: xiaoXi.ben_di_yu_lan_url ?? null,
    }
  }

  async function 确保媒体标识(xiaoXi: 消息, shangXiaWen: 媒体重发上下文): Promise<string> {
    if (typeof xiaoXi.mei_ti_id === 'string' && xiaoXi.mei_ti_id) return xiaoXi.mei_ti_id
    const wenJian = shangXiaWen.wenJian
    if (!wenJian) throw new Error(huoQuFanYi('duoMeiTi', 'faSongShiBai'))
    const shangChuan = await shangChuanMeiTi(
      xiaoXi.hui_hua_id,
      wenJian,
      DUO_MEI_TI_LEI_XING_SHANG_CHUAN_LEI_BIE[shangXiaWen.leiXing],
      shangXiaWen.leiXing === 'yuYin' && typeof shangXiaWen.fuJia.shiChangHaoMiao === 'number'
        ? { shiChangHaoMiao: shangXiaWen.fuJia.shiChangHaoMiao }
        : undefined,
    )
    xiaoXi.mei_ti_id = shangChuan.mediaId
    shangXiaWen.wenJian = null
    return shangChuan.mediaId
  }

  async function 执行媒体发送(
    xiaoXi: 消息,
    shangXiaWen: 媒体重发上下文,
    miDengJian: string,
  ): Promise<消息 | null> {
    try {
      const meiTiId = await 确保媒体标识(xiaoXi, shangXiaWen)
      const suiWenBen =
        shangXiaWen.leiXing === 'yuYin' && typeof shangXiaWen.fuJia.zhuanXieWenBen === 'string'
          ? shangXiaWen.fuJia.zhuanXieWenBen.trim().slice(0, 500)
          : ''
      const { xiaoXi: fuWuQiXiaoXi } = await faSongXiaoXiApi({
        huiHuaId: xiaoXi.hui_hua_id,
        neiRong: suiWenBen,
        miDengJian,
        leiXing: shangXiaWen.leiXing,
        meiTiId,
        ...(shangXiaWen.yinYongXiaoXiId
          ? { yinYong: { beiYongXiaoXiId: shangXiaWen.yinYongXiaoXiId } }
          : {}),
      })
      const fuWuQiURL =
        fuWuQiXiaoXi.mei_ti_url || shangXiaWen.benDiYuLan || xiaoXi.mei_ti_url || ''
      if (fuWuQiXiaoXi.mei_ti_url) cheXiaoYuLanURL(shangXiaWen.benDiYuLan)
      duiQiLeDaXiangXiaoXi(xiaoXi, fuWuQiXiaoXi, (duiQiXiaoXi) => ({
        ...duiQiXiaoXi,
        mei_ti_url: fuWuQiURL,
        ben_di_yu_lan_url: duiQiXiaoXi.mei_ti_url ? null : shangXiaWen.benDiYuLan,
        ben_di_da_xiao_zi_jie:
          duiQiXiaoXi.ben_di_da_xiao_zi_jie ?? xiaoXi.ben_di_da_xiao_zi_jie ?? null,
      }))
      移除媒体重发(xiaoXi.ke_hu_duan_id)
      return fuWuQiXiaoXi
    } catch (cuoWu: unknown) {
      console.error('发送多媒体消息失败', cuoWu)
      if (xiaoXi.hui_hua_id === dangQianHuiHuaId.value) {
        标记发送失败(xiaoXi)
        if (xiaoXi.ke_hu_duan_id) 记录媒体重发(xiaoXi.ke_hu_duan_id, shangXiaWen)
        sheZhiCuoWu(归一前台错误(cuoWu).yingXiang)
      }
      return null
    }
  }

  async function 重发图文消息(xiaoXi: 消息): Promise<消息 | null> {
    const kuai = Array.isArray(xiaoXi.nei_rong_kuai) ? xiaoXi.nei_rong_kuai : []
    const tiJiaoKuai = keTiJiaoKuai(kuai)
    if (tiJiaoKuai.length === 0) {
      标记发送失败(xiaoXi)
      sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'faSongShiBai'))
      return null
    }
    try {
      const { xiaoXi: fuWuQiXiaoXi } = await faSongXiaoXiApi({
        huiHuaId: xiaoXi.hui_hua_id,
        neiRong: xiaoXi.nei_rong,
        miDengJian: queDingMiDengJian(xiaoXi),
        leiXing: xiaoXi.lei_xing,
        meiTiId: xiaoXi.mei_ti_id ?? null,
        neiRongKuai: tiJiaoKuai,
        ...(xiaoXi.bei_yong_xiao_xi_id
          ? { yinYong: { beiYongXiaoXiId: xiaoXi.bei_yong_xiao_xi_id } }
          : {}),
      })
      duiQiLeDaXiangXiaoXi(xiaoXi, fuWuQiXiaoXi, (duiQiXiaoXi) => ({
        ...duiQiXiaoXi,
        nei_rong_kuai: Array.isArray(duiQiXiaoXi.nei_rong_kuai)
          ? duiQiXiaoXi.nei_rong_kuai
          : kuai,
      }))
      return fuWuQiXiaoXi
    } catch (cuoWu: unknown) {
      console.error('发送图文混排消息失败', cuoWu)
      if (xiaoXi.hui_hua_id === dangQianHuiHuaId.value) {
        标记发送失败(xiaoXi)
        sheZhiCuoWu(归一前台错误(cuoWu).yingXiang)
      }
      return null
    }
  }

  async function chongShiFaSongXiaoXi(keHuDuanId: string): Promise<boolean> {
    if (!keHuDuanId || !faSongShiBaiJiHe.value.has(keHuDuanId)) return false
    const suoYin = xiaoXiLieBiao.value.findIndex((m) => m.ke_hu_duan_id === keHuDuanId)
    if (suoYin === -1) {
      faSongShiBaiJiHe.value.delete(keHuDuanId)
      移除媒体重发(keHuDuanId)
      return false
    }
    const yuanQiPao = xiaoXiLieBiao.value[suoYin]
    faSongShiBaiJiHe.value.delete(keHuDuanId)
    qingChuCuoWu()
    const chongFaXiaoXi: 消息 = { ...yuanQiPao, fa_song_zhong: true }
    xiaoXiLieBiao.value.splice(suoYin, 1, chongFaXiaoXi)
    if (
      Array.isArray(yuanQiPao.nei_rong_kuai) &&
      yuanQiPao.nei_rong_kuai.some((kuai) => kuai.lei_xing === 'tupian')
    ) {
      return (await 重发图文消息(chongFaXiaoXi)) !== null
    }
    if (yuanQiPao.lei_xing !== 'wenben') {
      const shangXiaWen = 媒体重发表.get(keHuDuanId) ?? 由消息恢复媒体上下文(chongFaXiaoXi)
      if (!shangXiaWen) {
        标记发送失败(chongFaXiaoXi)
        sheZhiCuoWu(huoQuFanYi('duoMeiTi', 'faSongShiBai'))
        return false
      }
      return (
        (await 执行媒体发送(chongFaXiaoXi, shangXiaWen, queDingMiDengJian(chongFaXiaoXi))) !== null
      )
    }
    const jieGuo = await faSongYiTiaoYongHuXiaoXi(chongFaXiaoXi)
    return jieGuo !== null
  }

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
    const benCiMiDengJian = queDingMiDengJian(linShiXiaoXi)
    jiaRuXiaoXi(linShiXiaoXi)
    const shangXiaWen: 媒体重发上下文 = {
      leiXing,
      wenJian,
      fuJia: { ...fuJia },
      yinYongXiaoXiId: beiYongId,
      benDiYuLan,
    }
    记录媒体重发(linShiId, shangXiaWen)
    return 执行媒体发送(linShiXiaoXi, shangXiaWen, benCiMiDengJian)
  }

  async function faSongTuWenXiaoXi(
    daiFaKuai: DaiFaKuai[],
    yinYongXiaoXiId?: string | null,
    miDengJian?: string | null,
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
    if (miDengJian) linShiXiaoXi.mi_deng_jian = miDengJian
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
        nei_rong_kuai: Array.isArray(fuWuQiXiaoXi.nei_rong_kuai)
          ? fuWuQiXiaoXi.nei_rong_kuai
          : chuCanKuai,
      }))
      return xiaoXi
    } catch (cuoWu: unknown) {
      console.error('发送图文混排消息失败', cuoWu)
      if (linShiXiaoXi.hui_hua_id === dangQianHuiHuaId.value) {
        标记发送失败(linShiXiaoXi)
        sheZhiCuoWu(归一前台错误(cuoWu).yingXiang)
      }
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
      const tiShi = 归一前台错误(cuoWu).yingXiang
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
      const tiShi = 归一前台错误(cuoWu).yingXiang
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
    jiaZaiDaiCi += 1
    持久化监控()
    dangQianHuiHuaId.value = null
    haoGanDuBianHuaJiLu.value = {}
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
    shouPingQianTaiCuoWu.value = null
    jiaoSeQianTaiCuoWu.value = null
    faSongShiBaiJiHe.value = new Set()
    faSongRenWuBiao.clear()
    清空媒体重发()
    duanKaiSocket()
  }

  return {
    dangQianHuiHuaId,
    haoGanDuZengLiangBiaoQian,
    jieShouHaoGanDuZengLiang,
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
    shouPingQianTaiCuoWu,
    jiaoSeQianTaiCuoWu,
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
    biaoJiYuZai,
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
