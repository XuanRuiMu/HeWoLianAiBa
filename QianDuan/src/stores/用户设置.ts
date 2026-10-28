import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  huoQuYongHuSheZhi,
  baoCunLiaoTianBeiJing,
  baoCunQiPao,
  baoCunYinSiSheZhi,
  qingKongPaiWeiShuJu,
  shangChuanWaiGuanTuPian,
  baoCunWaiGuan,
  shangChuanDuiXiangTouXiang as shangChuanDuiXiangTouXiangApi,
} from '@/api/社交'
import { shiHeFaKeJianXing, type KeJianXing } from '@/api/资料'
import { 使用主题仓库, 浅色值 } from '@/stores/主题'
import {
  QI_PAO_ZI_JI_MO_REN,
  QI_PAO_AI_MO_REN,
  guiYiHuaQiPao,
  huoQuQiPaoCSSBianLiang,
  shiHeFaQiPao,
  type QiPaoYuShe,
} from '@/config/气泡主题'
import { huoQuFanYi } from '@/config/翻译表'
import { huoQuQiPaoMingCheng } from '@/config/气泡主题文案'
import { 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'
import { baoCunShuJu, duQuShuJu } from '@/utils/本地存储'
import { TuPianChiCunCuoWu, yaSuoTuPiang } from '@/utils/图片压缩'
import {
  BEI_JING_FEN_ZU,
  WAI_GUAN_BEI_JING_MING_CHENG_ZUI_DA_ZI_FU,
  WAI_GUAN_DUI_BI_DU_ZUI_XIAO,
  WAI_GUAN_MEI_LEI_ZUI_DA_TIAO_SHU,
  WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
  WAI_GUAN_QI_PAO_MIAO_BIAN_YAN_SE_MO_REN,
  WAI_GUAN_QI_PAO_MING_CHENG_ZUI_DA_ZI_FU,
  WAI_GUAN_QI_PAO_WEI_BA_ZHAN_WEI,
  WAI_GUAN_TU_PIAN_MIME,
  WAI_GUAN_TU_PIAN_ZUI_DA_BIAN,
  WAI_GUAN_TU_PIAN_ZUI_DA_ZI_JIE,
  WAI_GUAN_YAN_SE_GE_SHI,
  guiYiWaiGuanChuCan,
  huoQuBeiJingYuSheMing,
  huoQuLaShenChiCunZhi,
  huoQuMiaoBianYangShi,
  huoQuQiPaoBeiJingZhi,
  huoQuWeiBaChiCun,
  huoQuWeiBaWeiZhiZhi,
  huoQuYuanJiaoDangZhi,
  kongWaiGuanShuJu,
  shiHeFaLaShenMoShi,
  shiHeFaWeiBaMoShi,
  shiHeFaWeiBaWeiZhi,
  shiHeFaYuanJiaoDangWei,
  shiKeYongQiPaoWenZiYanSe,
  shiKeYongWenZiYanSe,
  tiQuWaiGuanSha,
  xiaYiGeZiDingYiMing,
  huoQuQiPaoMengCengZhi,
  type QiPaoWeiBaMoShi,
  type QiPaoWeiBaWeiZhi,
  type QiPaoYuanJiaoDangWei,
  type WaiGuanLaShenMoShi,
  type WaiGuanTiaoMu,
  type WaiGuanShuJu,
  type WaiGuanYanSeZu,
} from '@/config/外观自定义'
import { caiJiBianYuanYanSe } from '@/utils/外观采样'

export const LIAO_TIAN_BEI_JING_XUAN_XIANG = ['moRen', 'miWuSenLin', 'haiYangZhiLan', 'fenSeMengJing', 'yeKongXingHe', 'miSeTianYuan', 'chenWuQing', 'muZiXingYe'] as const

export type LiaoTianBeiJing = string

export const BEI_JING_URL_ZUI_DA_CHANG_DU = 2000

export const ZHU_YE_BEI_JING_YU_SHUI_JIAN = 'zhuYeBeiJingYuShui'

export const ZHU_YE_BEI_JING_YU_SHUI_MO_REN = true

export const BEI_JING_LA_SHEN_MO_SHI_JIAN = 'beiJingLaShenMoShi'

export const QI_PAO_LA_SHEN_MO_SHI_JIAN = 'qiPaoLaShenMoShi'

export const QI_PAO_WEI_BA_MO_SHI_JIAN = 'qiPaoWeiBaMoShi'

export const QI_PAO_WEI_BA_WEI_ZHI_JIAN = 'qiPaoWeiBaWeiZhi'

export const QI_PAO_YUAN_JIAO_DANG_WEI_JIAN = 'qiPaoYuanJiaoDangWei'

export const QI_PAO_MIAO_BIAN_KAI_QI_JIAN = 'qiPaoMiaoBianKaiQi'

export const QI_PAO_MIAO_BIAN_YAN_SE_JIAN = 'qiPaoMiaoBianYanSe'

export const LA_SHEN_MO_SHI_MO_REN: WaiGuanLaShenMoShi = 'dengBi'

function duQuLaShenMoShi(jian: string): WaiGuanLaShenMoShi {
  const zhi = duQuShuJu<unknown>(jian, LA_SHEN_MO_SHI_MO_REN)
  return shiHeFaLaShenMoShi(zhi) ? zhi : LA_SHEN_MO_SHI_MO_REN
}

function duQuDangWeiZhi<T extends string>(jian: string, jiaoYan: (zhi: unknown) => zhi is T, moRen: T): T {
  const zhi = duQuShuJu<unknown>(jian, moRen)
  return jiaoYan(zhi) ? zhi : moRen
}

function duQuKaiQi(jian: string): boolean {
  return duQuShuJu<boolean>(jian, false) === true
}

function duQuYanSeJian(jian: string, moRen: string): string {
  const zhi = duQuShuJu<unknown>(jian, moRen)
  return typeof zhi === 'string' && WAI_GUAN_YAN_SE_GE_SHI.test(zhi) ? zhi.toUpperCase() : moRen
}

const MEI_TI_QIAN_MING_LU_JING = /^\/api\/媒体\/[0-9a-f]{64}(\?e=\d{1,12}&s=[0-9a-f]+)?$/
const MEI_TI_XIN_QIAN_MING_LU_JING =
  /^\/api\/媒体\/[0-9a-f]{64}\?e=\d{1,12}&u=[0-9a-f-]{36}&t=\d{1,15}&s=[0-9a-f]+$/i

export function shiYuSheBeiJing(zhi: unknown): boolean {
  return typeof zhi === 'string' && (LIAO_TIAN_BEI_JING_XUAN_XIANG as readonly string[]).includes(zhi)
}

export function shiZiDingYiBeiJingURL(zhi: unknown): boolean {
  if (typeof zhi !== 'string') return false
  const qingLi = zhi.trim()
  if (!qingLi || qingLi.length > BEI_JING_URL_ZUI_DA_CHANG_DU) return false
  if (qingLi.startsWith('/')) {
    return MEI_TI_QIAN_MING_LU_JING.test(qingLi) || MEI_TI_XIN_QIAN_MING_LU_JING.test(qingLi)
  }
  let jieXi: URL
  try {
    jieXi = new URL(qingLi)
  } catch {
    return false
  }
  return jieXi.protocol === 'https:'
}

export function huoQuBeiJingNeiLianYangShi(beiJing: string, laShenMoShi: WaiGuanLaShenMoShi = 'dengBi'): Record<string, string> {
  if (!shiZiDingYiBeiJingURL(beiJing)) return {}
  const anQuanURL = beiJing.trim().replace(/["\\\n\r]/g, '')
  return {
    backgroundImage: `url("${anQuanURL}")`,
    backgroundSize: huoQuLaShenChiCunZhi(laShenMoShi),
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
}

export function huoQuYuanSuNeiLianYangShi(tuDiZhi: string): Record<string, string> {
  if (!shiZiDingYiBeiJingURL(tuDiZhi)) return {}
  const anQuanURL = tuDiZhi.trim().replace(/["\\\n\r]/g, '')
  return {
    backgroundImage: `url("${anQuanURL}")`,
    backgroundSize: '100% 100%',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }
}

export interface BeiJingXiangMu {
  leiXing: 'yuShe' | 'ziDingYi'
  jian: string
  mingCheng: string
  wenZiYanSe: string
  tuDiZhi: string
  sha: string | null
}

function yanZhengWaiGuanMing(mingCheng: string, zuiDaZiFu: number): string {
  const qingLi = mingCheng.trim()
  if (!qingLi) throw new Error(huoQuFanYi('sheZhi', 'waiGuanMingChengWeiKong'))
  if (Array.from(qingLi).length > zuiDaZiFu) {
    throw new Error(huoQuFanYi('sheZhi', 'waiGuanMingChengTaiChang').replace('{n}', String(zuiDaZiFu)))
  }
  return qingLi
}

function yanZhengWaiGuanYanSe(yanSe: string, leiBie: 'beiJing' | 'qiPao'): string {
  const qingLi = yanSe.trim().toUpperCase()
  if (!qingLi) return ''
  if (!WAI_GUAN_YAN_SE_GE_SHI.test(qingLi)) throw new Error(huoQuFanYi('tongYong', 'canShuBuHeFa'))
  const keYong = leiBie === 'qiPao' ? shiKeYongQiPaoWenZiYanSe(qingLi) : shiKeYongWenZiYanSe(qingLi)
  if (!keYong) throw new Error(huoQuFanYi('sheZhi', 'waiGuanWenZiYanSeDuiBiDuBuZu'))
  return qingLi
}

function chuangJianBiaoShi(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ziFu) => {
    const suiJi = Math.floor(Math.random() * 16)
    const zhi = ziFu === 'x' ? suiJi : (suiJi & 0x3) | 0x8
    return zhi.toString(16)
  })
}

function shiTuPianWenJian(wenJian: File): boolean {
  const mime = (wenJian.type || '').toLowerCase()
  return (WAI_GUAN_TU_PIAN_MIME as readonly string[]).includes(mime)
}

async function jianYanBingYaSuo(wenJian: File): Promise<Blob> {
  if (!shiTuPianWenJian(wenJian)) throw new Error(huoQuFanYi('sheZhi', 'waiGuanTuPianFeiFa'))
  if (wenJian.size > WAI_GUAN_TU_PIAN_ZUI_DA_ZI_JIE) {
    throw new Error(huoQuFanYi('sheZhi', 'waiGuanTuPianTaiDa'))
  }
  try {
    return await yaSuoTuPiang(wenJian, WAI_GUAN_TU_PIAN_ZUI_DA_BIAN)
  } catch (cuoWu: unknown) {
    if (cuoWu instanceof TuPianChiCunCuoWu) {
      throw new Error(
        huoQuFanYi('sheZhi', 'waiGuanTuPianChiCunTaiDa').replace('{n}', String(WAI_GUAN_TU_PIAN_ZUI_DA_BIAN)),
        { cause: cuoWu },
      )
    }
    throw new Error(huoQuFanYi('sheZhi', 'waiGuanTuPianFeiFa'), { cause: cuoWu })
  }
}

export const 使用用户设置仓库 = defineStore('用户设置', () => {
  const yongHuBianHao = ref('')
  const shouJiHao = ref('')
  const touXiang = ref<string | null>(null)
  const qianMing = ref<string | null>(null)
  const qianMingKeJianXing = ref<KeJianXing>('gong_kai')
  const qianMingBaiMingDan = ref<string[]>([])
  const liaoTianBeiJingQian = ref<string>('moRen')
  const liaoTianBeiJingShen = ref<string>('moRen')
  const waiGuan = ref<WaiGuanShuJu>(kongWaiGuanShuJu())
  const duiXiangTouXiang = ref<string | null>(null)
  const duiXiangJiaoSeId = ref<string | null>(null)
  const qiPaoZiJi = ref<QiPaoYuShe>(QI_PAO_ZI_JI_MO_REN)
  const qiPaoAI = ref<QiPaoYuShe>(QI_PAO_AI_MO_REN)
  const gongKaiZhangHao = ref(true)
  const gongKaiShouJiHao = ref(false)
  const gongKaiYouXiang = ref(false)
  const zhuYeBeiJingYuShui = ref(duQuShuJu<boolean>(ZHU_YE_BEI_JING_YU_SHUI_JIAN, ZHU_YE_BEI_JING_YU_SHUI_MO_REN) !== false)
  const beiJingLaShenMoShi = ref<WaiGuanLaShenMoShi>(duQuLaShenMoShi(BEI_JING_LA_SHEN_MO_SHI_JIAN))
  const qiPaoLaShenMoShi = ref<WaiGuanLaShenMoShi>(duQuLaShenMoShi(QI_PAO_LA_SHEN_MO_SHI_JIAN))
  const qiPaoWeiBaMoShi = ref<QiPaoWeiBaMoShi>(duQuDangWeiZhi(QI_PAO_WEI_BA_MO_SHI_JIAN, shiHeFaWeiBaMoShi, 'moRen'))
  const qiPaoWeiBaWeiZhi = ref<QiPaoWeiBaWeiZhi>(duQuDangWeiZhi(QI_PAO_WEI_BA_WEI_ZHI_JIAN, shiHeFaWeiBaWeiZhi, 'shang'))
  const qiPaoYuanJiaoDangWei = ref<QiPaoYuanJiaoDangWei>(duQuDangWeiZhi(QI_PAO_YUAN_JIAO_DANG_WEI_JIAN, shiHeFaYuanJiaoDangWei, 'zhong'))
  const qiPaoMiaoBianKaiQi = ref(duQuKaiQi(QI_PAO_MIAO_BIAN_KAI_QI_JIAN))
  const qiPaoMiaoBianYanSe = ref(duQuYanSeJian(QI_PAO_MIAO_BIAN_YAN_SE_JIAN, WAI_GUAN_QI_PAO_MIAO_BIAN_YAN_SE_MO_REN))
  const bangDingYouXiang = ref('')
  const yiJiaZai = ref(false)
  const caoZuoCuoWu = ref<QianTaiCuoWu | null>(null)
  let jiaZaiZhong: Promise<void> | null = null
  let chongShiCaoZuo: (() => unknown) | null = null

  function jiLuCuoWu(cuoWu: unknown, chongShi?: () => unknown): void {
    const zhengChangHua = 归一前台错误(cuoWu)
    if (!zhengChangHua.xianShi) return
    caoZuoCuoWu.value = zhengChangHua
    chongShiCaoZuo = chongShi || null
  }

  function qingCuoWu(): void {
    caoZuoCuoWu.value = null
    chongShiCaoZuo = null
  }

  async function chongShi(): Promise<void> {
    const daiZhi = chongShiCaoZuo
    if (!daiZhi) return
    await daiZhi()
  }

  async function jiaZai(): Promise<void> {
    if (yiJiaZai.value && !caoZuoCuoWu.value) return
    if (jiaZaiZhong) return jiaZaiZhong
    qingCuoWu()
    jiaZaiZhong = zhiXingJiaZai().finally(() => {
      jiaZaiZhong = null
    })
    return jiaZaiZhong
  }

  async function zhiXingJiaZai(): Promise<void> {
    let quXiao = false
    try {
      const sheZhi = await huoQuYongHuSheZhi()
      yongHuBianHao.value = sheZhi.uid
      shouJiHao.value = sheZhi.shou_ji_hao
      touXiang.value = sheZhi.tou_xiang
      qianMing.value = sheZhi.qian_ming
      if (shiHeFaKeJianXing(sheZhi.qian_ming_ke_jian_xing)) {
        qianMingKeJianXing.value = sheZhi.qian_ming_ke_jian_xing
      }
      qianMingBaiMingDan.value = Array.isArray(sheZhi.qian_ming_bai_ming_dan) ? sheZhi.qian_ming_bai_ming_dan : []
      const yiChanQian = typeof sheZhi.liao_tian_bei_jing_qian === 'string' && sheZhi.liao_tian_bei_jing_qian
      const yiChanShen = typeof sheZhi.liao_tian_bei_jing_shen === 'string' && sheZhi.liao_tian_bei_jing_shen
      if (yiChanQian && (shiYuSheBeiJing(yiChanQian) || shiZiDingYiBeiJingURL(yiChanQian))) liaoTianBeiJingQian.value = yiChanQian
      else if (typeof sheZhi.liao_tian_bei_jing === 'string' && (shiYuSheBeiJing(sheZhi.liao_tian_bei_jing) || shiZiDingYiBeiJingURL(sheZhi.liao_tian_bei_jing))) liaoTianBeiJingQian.value = sheZhi.liao_tian_bei_jing
      if (yiChanShen && (shiYuSheBeiJing(yiChanShen) || shiZiDingYiBeiJingURL(yiChanShen))) liaoTianBeiJingShen.value = yiChanShen
      else if (typeof sheZhi.liao_tian_bei_jing === 'string' && (shiYuSheBeiJing(sheZhi.liao_tian_bei_jing) || shiZiDingYiBeiJingURL(sheZhi.liao_tian_bei_jing))) liaoTianBeiJingShen.value = sheZhi.liao_tian_bei_jing
      qiPaoZiJi.value = guiYiHuaQiPao(sheZhi.qi_pao_zi_ji, QI_PAO_ZI_JI_MO_REN)
      qiPaoAI.value = guiYiHuaQiPao(sheZhi.qi_pao_ai, QI_PAO_AI_MO_REN)
      waiGuan.value = guiYiWaiGuanChuCan(sheZhi.wai_guan)
      duiXiangTouXiang.value = sheZhi.dui_xiang_tou_xiang || null
      duiXiangJiaoSeId.value = sheZhi.dui_xiang_jiao_se_id || null
      gongKaiZhangHao.value = sheZhi.gong_kai_zhang_hao
      gongKaiShouJiHao.value = sheZhi.gong_kai_shou_ji_hao
      gongKaiYouXiang.value = sheZhi.gong_kai_you_xiang
      bangDingYouXiang.value = sheZhi.bang_ding_you_xiang
    } catch (cuoWu: unknown) {
      const zhengChangHua = 归一前台错误(cuoWu)
      if (!zhengChangHua.xianShi) {
        quXiao = true
        return
      }
      jiLuCuoWu(cuoWu, jiaZai)
    } finally {
      if (quXiao) yiJiaZai.value = false
      else if (!caoZuoCuoWu.value) yiJiaZai.value = true
    }
  }

  async function qieHuanBeiJing(beiJing: string, moShi?: 'qian' | 'shen'): Promise<void> {
    const 旧前 = liaoTianBeiJingQian.value
    const 旧深 = liaoTianBeiJingShen.value
    if (moShi === 'qian') liaoTianBeiJingQian.value = beiJing
    else if (moShi === 'shen') liaoTianBeiJingShen.value = beiJing
    else {
      liaoTianBeiJingQian.value = beiJing
      liaoTianBeiJingShen.value = beiJing
    }
    try {
      await baoCunLiaoTianBeiJing(beiJing, moShi)
    } catch (cuoWu: unknown) {
      liaoTianBeiJingQian.value = 旧前
      liaoTianBeiJingShen.value = 旧深
      jiLuCuoWu(cuoWu, () => baoCunLiaoTianBeiJing(beiJing, moShi))
    }
  }

  async function tongBuBeiJing(yuan: 'qian' | 'shen'): Promise<void> {
    const laiYuan = yuan === 'qian' ? liaoTianBeiJingQian.value : liaoTianBeiJingShen.value
    const muDi = yuan === 'qian' ? 'shen' : 'qian'
    await qieHuanBeiJing(laiYuan, muDi)
  }

  async function qingChuZiDingYiBeiJing(): Promise<void> {
    await qieHuanBeiJing('moRen')
  }

  async function zhiXingWaiGuanXiuGai(xiuGai: (caoAn: WaiGuanShuJu) => void): Promise<void> {
    const kuaiZhao = JSON.parse(JSON.stringify(waiGuan.value)) as WaiGuanShuJu
    xiuGai(waiGuan.value)
    try {
      const chuCan = await baoCunWaiGuan(waiGuan.value)
      waiGuan.value = guiYiWaiGuanChuCan(chuCan)
    } catch (cuoWu: unknown) {
      waiGuan.value = kuaiZhao
      jiLuCuoWu(cuoWu)
      throw cuoWu
    }
  }

  function quTiaoMuLieBiao(leiBie: 'beiJing' | 'qiPao'): WaiGuanTiaoMu[] {
    return leiBie === 'beiJing' ? waiGuan.value.beiJing : waiGuan.value.qiPao
  }

  function quYiYouWaiGuanMing(leiBie: 'beiJing' | 'qiPao', paiChuId = ''): string[] {
    const mingCheng = quTiaoMuLieBiao(leiBie)
      .filter((xiang) => xiang.id !== paiChuId)
      .map((xiang) => xiang.mingCheng)
    if (leiBie === 'beiJing') {
      for (const fuGai of Object.values(waiGuan.value.beiJingFuGai)) {
        if (fuGai?.mingCheng) mingCheng.push(fuGai.mingCheng)
      }
    } else {
      for (const fuGai of Object.values(waiGuan.value.qiPaoFuGai)) {
        if (fuGai?.mingCheng) mingCheng.push(fuGai.mingCheng)
      }
    }
    return mingCheng
  }

  async function shangChuanWaiGuan(leiBie: 'beiJing' | 'qiPao', wenJian: File): Promise<WaiGuanTiaoMu> {
    const lieBiao = quTiaoMuLieBiao(leiBie)
    if (lieBiao.length >= WAI_GUAN_MEI_LEI_ZUI_DA_TIAO_SHU) {
      throw new Error(huoQuFanYi('sheZhi', 'waiGuanTiaoMuTaiDuo'))
    }
    const yaSuoHou = await jianYanBingYaSuo(wenJian)
    const tuDiZhi = await shangChuanWaiGuanTuPian(yaSuoHou)
    const tiaoMu: WaiGuanTiaoMu = {
      id: chuangJianBiaoShi(),
      mingCheng: xiaYiGeZiDingYiMing(leiBie, quYiYouWaiGuanMing(leiBie)),
      tuDiZhi,
      wenZiYanSe: WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
    }
    await zhiXingWaiGuanXiuGai((caoAn) => {
      if (leiBie === 'beiJing') caoAn.beiJing.push(tiaoMu)
      else caoAn.qiPao.push(tiaoMu)
    })
    return tiaoMu
  }

  async function gengXinWaiGuanTiaoMu(
    leiBie: 'beiJing' | 'qiPao',
    id: string,
    buFen: { mingCheng: string; wenZiYanSe: string },
  ): Promise<void> {
    const zuiDa = leiBie === 'beiJing' ? WAI_GUAN_BEI_JING_MING_CHENG_ZUI_DA_ZI_FU : WAI_GUAN_QI_PAO_MING_CHENG_ZUI_DA_ZI_FU
    const mingCheng = yanZhengWaiGuanMing(buFen.mingCheng, zuiDa)
    const wenZiYanSe = yanZhengWaiGuanYanSe(buFen.wenZiYanSe, leiBie)
    await zhiXingWaiGuanXiuGai((caoAn) => {
      const lieBiao = leiBie === 'beiJing' ? caoAn.beiJing : caoAn.qiPao
      const zhaoDao = lieBiao.find((xiang) => xiang.id === id)
      if (zhaoDao) {
        zhaoDao.mingCheng = mingCheng
        zhaoDao.wenZiYanSe = wenZiYanSe
      }
    })
  }

  async function huanYuanWaiGuan(leiBie: 'beiJing' | 'qiPao', id: string): Promise<void> {
    const moRenMing = xiaYiGeZiDingYiMing(leiBie, quYiYouWaiGuanMing(leiBie, id))
    await zhiXingWaiGuanXiuGai((caoAn) => {
      const muBiao = leiBie === 'beiJing' ? caoAn.beiJing : caoAn.qiPao
      const zhaoDao = muBiao.find((xiang) => xiang.id === id)
      if (zhaoDao) {
        zhaoDao.mingCheng = moRenMing
        zhaoDao.wenZiYanSe = WAI_GUAN_MO_REN_WEN_ZI_YAN_SE
      }
    })
  }

  async function shanChuWaiGuan(leiBie: 'beiJing' | 'qiPao', id: string): Promise<void> {
    const tiaoMu = quTiaoMuLieBiao(leiBie).find((xiang) => xiang.id === id)
    if (!tiaoMu) return
    const sha = tiQuWaiGuanSha(tiaoMu.tuDiZhi)
    await zhiXingWaiGuanXiuGai((caoAn) => {
      if (leiBie === 'beiJing') caoAn.beiJing = caoAn.beiJing.filter((xiang) => xiang.id !== id)
      else {
        caoAn.qiPao = caoAn.qiPao.filter((xiang) => xiang.id !== id)
        if (caoAn.dangQianQiPao.ziJi === id) caoAn.dangQianQiPao.ziJi = ''
        if (caoAn.dangQianQiPao.ai === id) caoAn.dangQianQiPao.ai = ''
      }
    })
    if (leiBie !== 'beiJing' || !sha) return
    const qianShiCi = tiQuWaiGuanSha(liaoTianBeiJingQian.value) === sha
    const shenShiCi = tiQuWaiGuanSha(liaoTianBeiJingShen.value) === sha
    if (qianShiCi) await qieHuanBeiJing('moRen', 'qian')
    if (shenShiCi) await qieHuanBeiJing('moRen', 'shen')
  }

  function quBeiJingYuSheMing(jian: string): string {
    const fuGai = waiGuan.value.beiJingFuGai[jian]
    if (fuGai && fuGai.mingCheng) return fuGai.mingCheng
    return huoQuBeiJingYuSheMing(jian as (typeof LIAO_TIAN_BEI_JING_XUAN_XIANG)[number])
  }

  function quBeiJingYuSheYanSe(jian: string): string {
    return waiGuan.value.beiJingFuGai[jian]?.wenZiYanSe || ''
  }

  async function gengXinBeiJingYuShe(
    jian: string,
    buFen: { mingCheng: string; wenZiYanSe: string },
  ): Promise<void> {
    const xiaYiBu = {
      mingCheng: yanZhengWaiGuanMing(buFen.mingCheng, WAI_GUAN_BEI_JING_MING_CHENG_ZUI_DA_ZI_FU),
      wenZiYanSe: yanZhengWaiGuanYanSe(buFen.wenZiYanSe, 'beiJing'),
    }
    await zhiXingWaiGuanXiuGai((caoAn) => {
      caoAn.beiJingFuGai[jian] = xiaYiBu
    })
  }

  function quQiPaoYuSheMing(jian: string): string {
    const fuGai = waiGuan.value.qiPaoFuGai[jian]
    if (fuGai && fuGai.mingCheng) return fuGai.mingCheng
    return huoQuQiPaoMingCheng(jian as QiPaoYuShe)
  }

  function quQiPaoYuSheYanSe(jian: string): string {
    return waiGuan.value.qiPaoFuGai[jian]?.wenZiYanSe || ''
  }

  async function gengXinQiPaoYuShe(
    jian: string,
    buFen: { mingCheng: string; wenZiYanSe: string },
  ): Promise<void> {
    const xiaYiBu = {
      mingCheng: yanZhengWaiGuanMing(buFen.mingCheng, WAI_GUAN_QI_PAO_MING_CHENG_ZUI_DA_ZI_FU),
      wenZiYanSe: yanZhengWaiGuanYanSe(buFen.wenZiYanSe, 'qiPao'),
    }
    await zhiXingWaiGuanXiuGai((caoAn) => {
      caoAn.qiPaoFuGai[jian] = xiaYiBu
    })
  }

  async function huanYuanQiPaoYuShe(jian: string): Promise<void> {
    await zhiXingWaiGuanXiuGai((caoAn) => {
      delete caoAn.qiPaoFuGai[jian]
    })
  }

  async function huanYuanBeiJingYuShe(jian: string): Promise<void> {
    await zhiXingWaiGuanXiuGai((caoAn) => {
      delete caoAn.beiJingFuGai[jian]
    })
  }

  async function huanYuanWaiGuanXiang(
    leiBie: 'beiJing' | 'qiPao',
    xiangMu: { jian: string; leiXing: 'yuShe' | 'ziDingYi' },
  ): Promise<void> {
    if (leiBie === 'beiJing' && xiangMu.leiXing === 'yuShe') {
      await huanYuanBeiJingYuShe(xiangMu.jian)
      return
    }
    if (leiBie === 'qiPao' && xiangMu.leiXing === 'yuShe') {
      await huanYuanQiPaoYuShe(xiangMu.jian)
      return
    }
    await huanYuanWaiGuan(leiBie, xiangMu.jian)
  }

  function beiJingXiangMuLieBiao(moShi: 'qian' | 'shen'): BeiJingXiangMu[] {
    const lieBiao: BeiJingXiangMu[] = [
      {
        leiXing: 'yuShe',
        jian: 'moRen',
        mingCheng: quBeiJingYuSheMing('moRen'),
        wenZiYanSe: quBeiJingYuSheYanSe('moRen'),
        tuDiZhi: 'moRen',
        sha: null,
      },
    ]
    for (const jian of BEI_JING_FEN_ZU[moShi]) {
      lieBiao.push({
        leiXing: 'yuShe',
        jian,
        mingCheng: quBeiJingYuSheMing(jian),
        wenZiYanSe: quBeiJingYuSheYanSe(jian),
        tuDiZhi: jian,
        sha: null,
      })
    }
    for (const tiaoMu of waiGuan.value.beiJing) {
      lieBiao.push({
        leiXing: 'ziDingYi',
        jian: tiaoMu.id,
        mingCheng: tiaoMu.mingCheng,
        wenZiYanSe: tiaoMu.wenZiYanSe,
        tuDiZhi: tiaoMu.tuDiZhi,
        sha: tiQuWaiGuanSha(tiaoMu.tuDiZhi),
      })
    }
    return lieBiao
  }

  function shiDangQianBeiJing(moShi: 'qian' | 'shen', xiangMu: BeiJingXiangMu): boolean {
    const dangQian = moShi === 'qian' ? liaoTianBeiJingQian.value : liaoTianBeiJingShen.value
    if (xiangMu.leiXing === 'yuShe') return dangQian === xiangMu.jian
    const dangQianSha = tiQuWaiGuanSha(dangQian)
    return !!dangQianSha && dangQianSha === xiangMu.sha
  }

  const dangQianZiJiQiPaoTu = computed<WaiGuanTiaoMu | null>(
    () => waiGuan.value.qiPao.find((xiang) => xiang.id === waiGuan.value.dangQianQiPao.ziJi) || null,
  )
  const dangQianAiQiPaoTu = computed<WaiGuanTiaoMu | null>(
    () => waiGuan.value.qiPao.find((xiang) => xiang.id === waiGuan.value.dangQianQiPao.ai) || null,
  )

  const dangQianQiPaoBiaoShu = computed(() => {
    const ziJi = dangQianZiJiQiPaoTu.value?.mingCheng || huoQuFanYi('qiPao', qiPaoZiJi.value)
    const ai = dangQianAiQiPaoTu.value?.mingCheng || huoQuFanYi('qiPao', qiPaoAI.value)
    return `${ziJi}/${ai}`
  })

  const dangQianBeiJingBiaoShu = computed(() => {
    const moShi = 使用主题仓库().dangQianZhuti === 浅色值 ? 'qian' : 'shen'
    const dangQian = liaoTianBeiJing.value
    if (shiYuSheBeiJing(dangQian)) return quBeiJingYuSheMing(dangQian)
    const sha = tiQuWaiGuanSha(dangQian)
    const zhaoDao = waiGuan.value.beiJing.find((xiang) => tiQuWaiGuanSha(xiang.tuDiZhi) === sha)
    return zhaoDao ? zhaoDao.mingCheng : huoQuFanYi('sheZhi', 'beiJingMoRen')
  })

  async function xuanZeZiDingYiQiPao(buWei: 'ziJi' | 'ai', id: string): Promise<void> {
    if (!waiGuan.value.qiPao.some((xiang) => xiang.id === id)) throw new Error(huoQuFanYi('tongYong', 'canShuBuHeFa'))
    await zhiXingWaiGuanXiuGai((caoAn) => {
      caoAn.dangQianQiPao[buWei] = id
    })
  }

  async function qingChuZiDingYiQiPao(buWei: 'ziJi' | 'ai'): Promise<void> {
    if (!waiGuan.value.dangQianQiPao[buWei]) return
    await zhiXingWaiGuanXiuGai((caoAn) => {
      caoAn.dangQianQiPao[buWei] = ''
    })
  }

  async function xuanZeYuSheQiPao(buWei: 'ziJi' | 'ai', yuShe: QiPaoYuShe): Promise<void> {
    await qingChuZiDingYiQiPao(buWei)
    await qieHuanQiPao(buWei, yuShe)
  }

  async function qieHuanQiPao(buWei: 'ziJi' | 'ai', yuShe: QiPaoYuShe): Promise<void> {
    if (!shiHeFaQiPao(yuShe)) throw new Error(huoQuFanYi('tongYong', 'canShuBuHeFa'))
    if (buWei === 'ziJi') qiPaoZiJi.value = yuShe
    else qiPaoAI.value = yuShe
    try {
      await baoCunQiPao(buWei === 'ziJi' ? { ziJi: yuShe } : { ai: yuShe })
    } catch (cuoWu: unknown) {
      jiLuCuoWu(cuoWu, () => baoCunQiPao(buWei === 'ziJi' ? { ziJi: yuShe } : { ai: yuShe }))
    }
  }

  const liaoTianBeiJing = computed(() => (使用主题仓库().dangQianZhuti === 浅色值 ? liaoTianBeiJingQian.value : liaoTianBeiJingShen.value))
  const shiYuShe = computed(() => shiYuSheBeiJing(liaoTianBeiJing.value))
  const shiZiDingYi = computed(() => shiZiDingYiBeiJingURL(liaoTianBeiJing.value))
  const beiJingNeiLianYangShi = computed(() => huoQuBeiJingNeiLianYangShi(liaoTianBeiJing.value, beiJingLaShenMoShi.value))

  const ziJiQiPaoCSSBianLiang = computed(() => {
    const bianLiang = huoQuQiPaoCSSBianLiang(qiPaoZiJi.value, qiPaoAI.value)
    const ziJiTu = dangQianZiJiQiPaoTu.value
    const aiTu = dangQianAiQiPaoTu.value
    if (ziJiTu && shiZiDingYiBeiJingURL(ziJiTu.tuDiZhi)) {
      bianLiang['--qipao-ziJi-beiJing'] = huoQuQiPaoBeiJingZhi(ziJiTu.tuDiZhi, ziJiTu.wenZiYanSe, qiPaoLaShenMoShi.value)
      bianLiang['--qipao-ziJi-wenBen'] = ziJiTu.wenZiYanSe || WAI_GUAN_MO_REN_WEN_ZI_YAN_SE
      bianLiang['--qipao-ziJi-weiBa'] = qiPaoWeiBaYanSeLu.value['ziJi-' + ziJiTu.id] || WAI_GUAN_QI_PAO_WEI_BA_ZHAN_WEI
    }
    if (aiTu && shiZiDingYiBeiJingURL(aiTu.tuDiZhi)) {
      bianLiang['--qipao-duiFang-beiJing'] = huoQuQiPaoBeiJingZhi(aiTu.tuDiZhi, aiTu.wenZiYanSe, qiPaoLaShenMoShi.value)
      bianLiang['--qipao-duiFang-wenBen'] = aiTu.wenZiYanSe || WAI_GUAN_MO_REN_WEN_ZI_YAN_SE
      bianLiang['--qipao-duiFang-weiBa'] = qiPaoWeiBaYanSeLu.value['ai-' + aiTu.id] || WAI_GUAN_QI_PAO_WEI_BA_ZHAN_WEI
    }
    return bianLiang
  })

  const qiPaoXingZhuangBianLiang = computed<Record<string, string>>(() => {
    const chiCun = huoQuWeiBaChiCun(qiPaoWeiBaMoShi.value)
    return {
      '--qipao-yuanjiao': huoQuYuanJiaoDangZhi(qiPaoYuanJiaoDangWei.value),
      '--qipao-weiba-shang': huoQuWeiBaWeiZhiZhi(qiPaoWeiBaWeiZhi.value),
      '--qipao-weiba-kuan': chiCun.kuan,
      '--qipao-weiba-ban': chiCun.ban,
      '--qipao-miaoBian-yangShi': huoQuMiaoBianYangShi(qiPaoMiaoBianKaiQi.value, qiPaoMiaoBianYanSe.value),
    }
  })

  const qiPaoCSSBianLiang = computed<Record<string, string>>(() => ({
    ...ziJiQiPaoCSSBianLiang.value,
    ...qiPaoXingZhuangBianLiang.value,
  }))

  const qiPaoWeiBaYanSeLu = ref<Record<string, string>>({})
  const weiBaCaiYangZhong = new Set<string>()

  function quQiPaoWeiBaYanSe(buWei: 'ziJi' | 'ai', tiaoMu: WaiGuanTiaoMu): string {
    return qiPaoWeiBaYanSeLu.value[buWei + '-' + tiaoMu.id] || ''
  }

  async function queRenQiPaoWeiBaYanSe(buWei: 'ziJi' | 'ai', tiaoMu: WaiGuanTiaoMu): Promise<void> {
    const jian = buWei + '-' + tiaoMu.id
    if (qiPaoWeiBaYanSeLu.value[jian] || weiBaCaiYangZhong.has(jian)) return
    if (!shiZiDingYiBeiJingURL(tiaoMu.tuDiZhi)) return
    weiBaCaiYangZhong.add(jian)
    try {
      const mengCengZhi = huoQuQiPaoMengCengZhi(tiaoMu.wenZiYanSe || WAI_GUAN_MO_REN_WEN_ZI_YAN_SE)
      const yanSe = await caiJiBianYuanYanSe(tiaoMu.tuDiZhi, buWei === 'ziJi' ? 'you' : 'zuo', mengCengZhi)
      qiPaoWeiBaYanSeLu.value[jian] = yanSe || WAI_GUAN_QI_PAO_WEI_BA_ZHAN_WEI
    } finally {
      weiBaCaiYangZhong.delete(jian)
    }
  }

  async function queRenQuanBuQiPaoWeiBaYanSe(): Promise<void> {
    for (const tiaoMu of waiGuan.value.qiPao) {
      void queRenQiPaoWeiBaYanSe('ziJi', tiaoMu)
      void queRenQiPaoWeiBaYanSe('ai', tiaoMu)
    }
  }

  async function shangChuanDuiXiangTouXiang(wenJian: File): Promise<void> {
    const yaSuoHou = await jianYanBingYaSuo(wenJian)
    const jieGuo = await shangChuanDuiXiangTouXiangApi(yaSuoHou)
    duiXiangTouXiang.value = jieGuo.dui_xiang_tou_xiang
    duiXiangJiaoSeId.value = jieGuo.dui_xiang_jiao_se_id
  }

  async function baoCunYinSi(canShu: { gongKaiZhangHao?: boolean; gongKaiShouJiHao?: boolean; gongKaiYouXiang?: boolean }): Promise<void> {
    if (canShu.gongKaiZhangHao !== undefined) gongKaiZhangHao.value = canShu.gongKaiZhangHao
    if (canShu.gongKaiShouJiHao !== undefined) gongKaiShouJiHao.value = canShu.gongKaiShouJiHao
    if (canShu.gongKaiYouXiang !== undefined) gongKaiYouXiang.value = canShu.gongKaiYouXiang
    try {
      await baoCunYinSiSheZhi(canShu)
    } catch (cuoWu: unknown) {
      jiLuCuoWu(cuoWu, () => baoCunYinSiSheZhi(canShu))
    }
  }

  async function qingKongPaiWei(): Promise<void> {
    try {
      await qingKongPaiWeiShuJu()
    } catch (cuoWu: unknown) {
      jiLuCuoWu(cuoWu, qingKongPaiWei)
    }
  }

  function qieHuanZhuYeBeiJingYuShui(开: boolean): void {
    zhuYeBeiJingYuShui.value = 开 !== false
    baoCunShuJu(ZHU_YE_BEI_JING_YU_SHUI_JIAN, zhuYeBeiJingYuShui.value)
  }

  function shiYongLaShenMoShi(leiBie: 'beiJing' | 'qiPao', moShi: WaiGuanLaShenMoShi): void {
    if (!shiHeFaLaShenMoShi(moShi)) return
    const jian = leiBie === 'beiJing' ? BEI_JING_LA_SHEN_MO_SHI_JIAN : QI_PAO_LA_SHEN_MO_SHI_JIAN
    const muBiaoRef = leiBie === 'beiJing' ? beiJingLaShenMoShi : qiPaoLaShenMoShi
    muBiaoRef.value = moShi
    baoCunShuJu(jian, muBiaoRef.value)
  }

  function shiYongQiPaoXingZhuang(buFen: {
    weiBaMoShi?: QiPaoWeiBaMoShi
    weiBaWeiZhi?: QiPaoWeiBaWeiZhi
    yuanJiaoDangWei?: QiPaoYuanJiaoDangWei
    miaoBianKaiQi?: boolean
    miaoBianYanSe?: string
  }): void {
    if (buFen.weiBaMoShi && shiHeFaWeiBaMoShi(buFen.weiBaMoShi)) {
      qiPaoWeiBaMoShi.value = buFen.weiBaMoShi
      baoCunShuJu(QI_PAO_WEI_BA_MO_SHI_JIAN, qiPaoWeiBaMoShi.value)
    }
    if (buFen.weiBaWeiZhi && shiHeFaWeiBaWeiZhi(buFen.weiBaWeiZhi)) {
      qiPaoWeiBaWeiZhi.value = buFen.weiBaWeiZhi
      baoCunShuJu(QI_PAO_WEI_BA_WEI_ZHI_JIAN, qiPaoWeiBaWeiZhi.value)
    }
    if (buFen.yuanJiaoDangWei && shiHeFaYuanJiaoDangWei(buFen.yuanJiaoDangWei)) {
      qiPaoYuanJiaoDangWei.value = buFen.yuanJiaoDangWei
      baoCunShuJu(QI_PAO_YUAN_JIAO_DANG_WEI_JIAN, qiPaoYuanJiaoDangWei.value)
    }
    if (typeof buFen.miaoBianKaiQi === 'boolean') {
      qiPaoMiaoBianKaiQi.value = buFen.miaoBianKaiQi
      baoCunShuJu(QI_PAO_MIAO_BIAN_KAI_QI_JIAN, qiPaoMiaoBianKaiQi.value)
    }
    if (typeof buFen.miaoBianYanSe === 'string' && WAI_GUAN_YAN_SE_GE_SHI.test(buFen.miaoBianYanSe.trim())) {
      qiPaoMiaoBianYanSe.value = buFen.miaoBianYanSe.trim().toUpperCase()
      baoCunShuJu(QI_PAO_MIAO_BIAN_YAN_SE_JIAN, qiPaoMiaoBianYanSe.value)
    }
  }

  return {
    yongHuBianHao,
    shouJiHao,
    touXiang,
    qianMing,
    qianMingKeJianXing,
    qianMingBaiMingDan,
    liaoTianBeiJing,
    liaoTianBeiJingQian,
    liaoTianBeiJingShen,
    beiJingLaShenMoShi,
    qiPaoLaShenMoShi,
    qiPaoWeiBaMoShi,
    qiPaoWeiBaWeiZhi,
    qiPaoYuanJiaoDangWei,
    qiPaoMiaoBianKaiQi,
    qiPaoMiaoBianYanSe,
    qiPaoWeiBaYanSeLu,
    waiGuan,
    duiXiangTouXiang,
    duiXiangJiaoSeId,
    qiPaoZiJi,
    qiPaoAI,
    qiPaoCSSBianLiang,
    dangQianZiJiQiPaoTu,
    dangQianAiQiPaoTu,
    dangQianQiPaoBiaoShu,
    dangQianBeiJingBiaoShu,
    shiYuShe,
    shiZiDingYi,
    beiJingNeiLianYangShi,
    gongKaiZhangHao,
    gongKaiShouJiHao,
    gongKaiYouXiang,
    bangDingYouXiang,
    yiJiaZai,
    caoZuoCuoWu,
    qingCuoWu,
    chongShi,
    jiaZai,
    qieHuanBeiJing,
    qingChuZiDingYiBeiJing,
    tongBuBeiJing,
    qieHuanQiPao,
    xuanZeYuSheQiPao,
    xuanZeZiDingYiQiPao,
    qingChuZiDingYiQiPao,
    beiJingXiangMuLieBiao,
    shiDangQianBeiJing,
    quBeiJingYuSheMing,
    quBeiJingYuSheYanSe,
    gengXinBeiJingYuShe,
    huanYuanBeiJingYuShe,
    huanYuanWaiGuanXiang,
    quQiPaoYuSheMing,
    quQiPaoYuSheYanSe,
    gengXinQiPaoYuShe,
    huanYuanQiPaoYuShe,
    shangChuanWaiGuan,
    gengXinWaiGuanTiaoMu,
    huanYuanWaiGuan,
    shanChuWaiGuan,
    shangChuanDuiXiangTouXiang,
    baoCunYinSi,
    qingKongPaiWei,
    zhuYeBeiJingYuShui,
    qieHuanZhuYeBeiJingYuShui,
    shiYongLaShenMoShi,
    shiYongQiPaoXingZhuang,
    quQiPaoWeiBaYanSe,
    queRenQiPaoWeiBaYanSe,
    queRenQuanBuQiPaoWeiBaYanSe,
  }
})
