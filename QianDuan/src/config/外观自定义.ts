import { huoQuFanYi } from '@/config/翻译表'

export const WAI_GUAN_BEI_JING_YU_SHE = [
  'moRen',
  'miWuSenLin',
  'haiYangZhiLan',
  'fenSeMengJing',
  'yeKongXingHe',
  'miSeTianYuan',
  'chenWuQing',
  'muZiXingYe',
] as const

export type WaiGuanBeiJingYuShe = (typeof WAI_GUAN_BEI_JING_YU_SHE)[number]

export const BEI_JING_FEN_ZU: Record<'qian' | 'shen', readonly WaiGuanBeiJingYuShe[]> = {
  qian: ['chenWuQing', 'fenSeMengJing', 'miSeTianYuan'],
  shen: ['miWuSenLin', 'haiYangZhiLan', 'muZiXingYe', 'yeKongXingHe'],
}

export const WAI_GUAN_BEI_JING_MING_CHENG_ZUI_DA_ZI_FU = 20
export const WAI_GUAN_QI_PAO_MING_CHENG_ZUI_DA_ZI_FU = 12
export const WAI_GUAN_MEI_LEI_ZUI_DA_TIAO_SHU = 24
export const WAI_GUAN_MO_REN_WEN_ZI_YAN_SE = '#FFFFFF'
export const WAI_GUAN_DUI_BI_DU_ZUI_XIAO = 4.5
export const WAI_GUAN_YAN_SE_GE_SHI = /^#[0-9a-f]{6}$/i
export const WAI_GUAN_YAN_SE_XUAN_XIANG = ['#FFFFFF', '#333333', '#000000', '#FFD166', '#8BD3C7', '#FF9AA2'] as const
export const WAI_GUAN_TU_PIAN_ZUI_DA_ZI_JIE = 20 * 1024 * 1024
export const WAI_GUAN_TU_PIAN_ZUI_DA_BIAN = 10000
export const WAI_GUAN_TU_PIAN_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

export const WAI_GUAN_QI_PAO_YAN_SE_XUAN_XIANG = ['#FFFFFF', '#333333', '#000000'] as const

const MENG_CENG_LIANG = { r: 255, g: 255, b: 255, a: 0.86 }
const MENG_CENG_AN = { r: 0, g: 0, b: 0, a: 0.72 }
const QI_PAO_MENG_CENG_LIANG = { r: 255, g: 255, b: 255, a: 0.62 }
const QI_PAO_MENG_CENG_AN = { r: 0, g: 0, b: 0, a: 0.55 }
const ZUI_HUAI_BEI_JING = { liang: 0, an: 255 }
const MEI_TI_SHA_GE_SHI = /\/api\/媒体\/([0-9a-f]{64})(?:\?|$)/i

export interface WaiGuanYanSeZu {
  r: number
  g: number
  b: number
}

export function huoQuBeiJingYuSheMing(jian: string): string {
  switch (jian) {
    case 'moRen': return huoQuFanYi('sheZhi', 'beiJingMoRen')
    case 'miWuSenLin': return huoQuFanYi('sheZhi', 'beiJingSenLin')
    case 'haiYangZhiLan': return huoQuFanYi('sheZhi', 'beiJingHaiYang')
    case 'fenSeMengJing': return huoQuFanYi('sheZhi', 'beiJingFenSe')
    case 'yeKongXingHe': return huoQuFanYi('sheZhi', 'beiJingYeKong')
    case 'miSeTianYuan': return huoQuFanYi('sheZhi', 'beiJingTianYuan')
    case 'chenWuQing': return huoQuFanYi('sheZhi', 'beiJingChenWu')
    case 'muZiXingYe': return huoQuFanYi('sheZhi', 'beiJingMuZi')
    default: return jian
  }
}

export interface WaiGuanMengCeng {
  r: number
  g: number
  b: number
  a: number
}

export interface WaiGuanTiaoMu {
  id: string
  mingCheng: string
  tuDiZhi: string
  wenZiYanSe: string
}

export interface WaiGuanFuGai {
  mingCheng: string
  wenZiYanSe: string
}

export interface WaiGuanDangQianQiPao {
  ziJi: string
  ai: string
}

export interface WaiGuanShuJu {
  beiJing: WaiGuanTiaoMu[]
  qiPao: WaiGuanTiaoMu[]
  beiJingFuGai: Record<string, WaiGuanFuGai>
  dangQianQiPao: WaiGuanDangQianQiPao
}

export interface WaiGuanChuCanTiaoMu {
  id: string
  ming_cheng: string
  tu_di_zhi: string
  wen_zi_yan_se: string
}

export interface WaiGuanChuCan {
  bei_jing: WaiGuanChuCanTiaoMu[]
  qi_pao: WaiGuanChuCanTiaoMu[]
  bei_jing_fu_gai: Record<string, WaiGuanFuGai>
  dang_qian_qi_pao: WaiGuanDangQianQiPao
}

export function kongWaiGuanShuJu(): WaiGuanShuJu {
  return { beiJing: [], qiPao: [], beiJingFuGai: {}, dangQianQiPao: { ziJi: '', ai: '' } }
}

export function tiQuWaiGuanSha(zhi: string | null | undefined): string | null {
  if (!zhi) return null
  const piPei = MEI_TI_SHA_GE_SHI.exec(zhi.trim())
  return piPei ? piPei[1].toLowerCase() : null
}

export function jieXiYanSe(zhi: string): WaiGuanYanSeZu | null {
  if (!WAI_GUAN_YAN_SE_GE_SHI.test(zhi)) return null
  return {
    r: parseInt(zhi.slice(1, 3), 16),
    g: parseInt(zhi.slice(3, 5), 16),
    b: parseInt(zhi.slice(5, 7), 16),
  }
}

function zhuanXianXing(tongDao: number): number {
  const biLi = tongDao / 255
  return biLi <= 0.04045 ? biLi / 12.92 : Math.pow((biLi + 0.055) / 1.055, 2.4)
}

export function xiangDuiLiangDu(yanSe: WaiGuanYanSeZu): number {
  return 0.2126 * zhuanXianXing(yanSe.r) + 0.7152 * zhuanXianXing(yanSe.g) + 0.0722 * zhuanXianXing(yanSe.b)
}

export function jiSuanDuiBiDu(qianJing: WaiGuanYanSeZu, houJing: WaiGuanYanSeZu): number {
  const qian = xiangDuiLiangDu(qianJing)
  const hou = xiangDuiLiangDu(houJing)
  const liang = Math.max(qian, hou)
  const an = Math.min(qian, hou)
  return (liang + 0.05) / (an + 0.05)
}

export function heChengMengCeng(mengCeng: WaiGuanMengCeng, beiJingHui: number): WaiGuanYanSeZu {
  const rongHe = (ceng: number): number => Math.round(ceng * mengCeng.a + beiJingHui * (1 - mengCeng.a))
  return { r: rongHe(mengCeng.r), g: rongHe(mengCeng.g), b: rongHe(mengCeng.b) }
}

export function xuanZeMengCeng(yanSe: WaiGuanYanSeZu): 'liang' | 'an' {
  const liangDuiBi = jiSuanDuiBiDu(yanSe, heChengMengCeng(MENG_CENG_LIANG, ZUI_HUAI_BEI_JING.liang))
  const anDuiBi = jiSuanDuiBiDu(yanSe, heChengMengCeng(MENG_CENG_AN, ZUI_HUAI_BEI_JING.an))
  return liangDuiBi >= anDuiBi ? 'liang' : 'an'
}

export function shiKeYongWenZiYanSe(zhi: string): boolean {
  const yanSe = jieXiYanSe(zhi)
  if (!yanSe) return false
  const mengCeng = xuanZeMengCeng(yanSe)
  const houJing =
    mengCeng === 'liang'
      ? heChengMengCeng(MENG_CENG_LIANG, ZUI_HUAI_BEI_JING.liang)
      : heChengMengCeng(MENG_CENG_AN, ZUI_HUAI_BEI_JING.an)
  return jiSuanDuiBiDu(yanSe, houJing) >= WAI_GUAN_DUI_BI_DU_ZUI_XIAO
}

export function xuanZeQiPaoMengCeng(yanSe: WaiGuanYanSeZu): 'liang' | 'an' {
  const liangDuiBi = jiSuanDuiBiDu(yanSe, heChengMengCeng(QI_PAO_MENG_CENG_LIANG, ZUI_HUAI_BEI_JING.liang))
  const anDuiBi = jiSuanDuiBiDu(yanSe, heChengMengCeng(QI_PAO_MENG_CENG_AN, ZUI_HUAI_BEI_JING.an))
  return liangDuiBi >= anDuiBi ? 'liang' : 'an'
}

export function shiKeYongQiPaoWenZiYanSe(zhi: string): boolean {
  const yanSe = jieXiYanSe(zhi)
  if (!yanSe) return false
  const ceng = xuanZeQiPaoMengCeng(yanSe)
  const houJing =
    ceng === 'liang'
      ? heChengMengCeng(QI_PAO_MENG_CENG_LIANG, ZUI_HUAI_BEI_JING.liang)
      : heChengMengCeng(QI_PAO_MENG_CENG_AN, ZUI_HUAI_BEI_JING.an)
  return jiSuanDuiBiDu(yanSe, houJing) >= WAI_GUAN_DUI_BI_DU_ZUI_XIAO
}

export function huoQuBeiJingMengCengZhi(zhi: string): string {
  const yanSe = jieXiYanSe(zhi) || jieXiYanSe(WAI_GUAN_MO_REN_WEN_ZI_YAN_SE)
  if (!yanSe) return 'rgba(0, 0, 0, 0.72)'
  return xuanZeMengCeng(yanSe) === 'liang' ? 'rgba(255, 255, 255, 0.86)' : 'rgba(0, 0, 0, 0.72)'
}

export function huoQuQiPaoMengCengZhi(zhi: string): string {
  const yanSe = jieXiYanSe(zhi) || jieXiYanSe(WAI_GUAN_MO_REN_WEN_ZI_YAN_SE)
  if (!yanSe) return 'rgba(0, 0, 0, 0.55)'
  return xuanZeQiPaoMengCeng(yanSe) === 'liang' ? 'rgba(255, 255, 255, 0.62)' : 'rgba(0, 0, 0, 0.55)'
}

export function huoQuQiPaoBeiJingZhi(tuDiZhi: string, wenZiYanSe: string): string {
  const anQuanURL = tuDiZhi.trim().replace(/["\\\n\r]/g, '')
  return `linear-gradient(${huoQuQiPaoMengCengZhi(wenZiYanSe)}, ${huoQuQiPaoMengCengZhi(wenZiYanSe)}), url("${anQuanURL}") center / 100% 100% no-repeat`
}

export function ziDingYiWaiGuanMing(leiBie: 'beiJing' | 'qiPao', xuHao: number): string {
  const jian = leiBie === 'beiJing' ? 'ziDingYiBeiJingMing' : 'ziDingYiQiPaoMing'
  return huoQuFanYi('sheZhi', jian).replace('{n}', String(xuHao))
}

export function xiaYiGeZiDingYiMing(leiBie: 'beiJing' | 'qiPao', yiYouMingCheng: string[]): string {
  const yiYong = new Set(yiYouMingCheng.map((ming) => ming.trim()))
  let xuHao = 1
  while (yiYong.has(ziDingYiWaiGuanMing(leiBie, xuHao))) xuHao += 1
  return ziDingYiWaiGuanMing(leiBie, xuHao)
}

export function guiYiWaiGuanChuCan(can: WaiGuanChuCan | null | undefined): WaiGuanShuJu {
  const chu = kongWaiGuanShuJu()
  if (!can || typeof can !== 'object') return chu
  const duQuLieBiao = (yuan: unknown): WaiGuanTiaoMu[] => {
    if (!Array.isArray(yuan)) return []
    const lieBiao: WaiGuanTiaoMu[] = []
    for (const xiang of yuan) {
      if (!xiang || typeof xiang !== 'object') continue
      const hang = xiang as Record<string, unknown>
      const id = typeof hang.id === 'string' ? hang.id : ''
      const mingCheng = typeof hang.ming_cheng === 'string' ? hang.ming_cheng : ''
      const tuDiZhi = typeof hang.tu_di_zhi === 'string' ? hang.tu_di_zhi : ''
      const wenZiYanSe = typeof hang.wen_zi_yan_se === 'string' ? hang.wen_zi_yan_se : ''
      if (!id || !mingCheng || !tuDiZhi) continue
      lieBiao.push({ id, mingCheng, tuDiZhi, wenZiYanSe })
    }
    return lieBiao
  }
  chu.beiJing = duQuLieBiao(can.bei_jing)
  chu.qiPao = duQuLieBiao(can.qi_pao)
  const fuGai: unknown = can.bei_jing_fu_gai
  if (fuGai && typeof fuGai === 'object' && !Array.isArray(fuGai)) {
    for (const [jian, zhi] of Object.entries(fuGai as Record<string, unknown>)) {
      if (!zhi || typeof zhi !== 'object') continue
      const hang = zhi as Record<string, unknown>
      chu.beiJingFuGai[jian] = {
        mingCheng: typeof hang.mingCheng === 'string' ? hang.mingCheng : typeof hang.ming_cheng === 'string' ? hang.ming_cheng : '',
        wenZiYanSe: typeof hang.wenZiYanSe === 'string' ? hang.wenZiYanSe : typeof hang.wen_zi_yan_se === 'string' ? hang.wen_zi_yan_se : '',
      }
    }
  }
  const dangQian = can.dang_qian_qi_pao
  if (dangQian && typeof dangQian === 'object') {
    const ids = new Set(chu.qiPao.map((tiaoMu) => tiaoMu.id))
    const ziJi = typeof dangQian.ziJi === 'string' && ids.has(dangQian.ziJi) ? dangQian.ziJi : ''
    const ai = typeof dangQian.ai === 'string' && ids.has(dangQian.ai) ? dangQian.ai : ''
    chu.dangQianQiPao = { ziJi, ai }
  }
  return chu
}
