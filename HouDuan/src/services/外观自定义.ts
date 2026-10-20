import { huoQuFanYi } from '../config/translations'
import {
  shengChengMeiTiYinYong,
  tiQuMeiTiSha,
  zhongXinQianMingMeiTiURL,
} from './媒体存储'

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

export const WAI_GUAN_BEI_JING_MING_CHENG_ZUI_DA_ZI_FU = 20
export const WAI_GUAN_QI_PAO_MING_CHENG_ZUI_DA_ZI_FU = 12
export const WAI_GUAN_MEI_LEI_ZUI_DA_TIAO_SHU = 24
export const WAI_GUAN_YAN_SE_GE_SHI = /^#[0-9a-f]{6}$/i
export const WAI_GUAN_MO_REN_WEN_ZI_YAN_SE = '#FFFFFF'
export const WAI_GUAN_DUI_BI_DU_ZUI_XIAO = 4.5

const MENG_CENG_LIANG = { r: 255, g: 255, b: 255, a: 0.86 }
const MENG_CENG_AN = { r: 0, g: 0, b: 0, a: 0.72 }
const ZUI_HUAI_BEI_JING = { liang: 0, an: 255 }

export interface WaiGuanYanSeZu {
  r: number
  g: number
  b: number
}

export interface WaiGuangMengCeng {
  r: number
  g: number
  b: number
  a: number
}

export interface WaiGuanTiaoMu {
  id: string
  mingCheng: string
  meiTiYinYong: string
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

export class WaiGuanCuoWu extends Error {
  readonly fanYiJian: string

  constructor(fanYiJian: string) {
    super(fanYiJian)
    this.name = 'WaiGuanCuoWu'
    this.fanYiJian = fanYiJian
  }
}

const UUID_GE_SHI = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function shiUUID(zhi: unknown): zhi is string {
  return typeof zhi === 'string' && UUID_GE_SHI.test(zhi.trim())
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
  const bili = tongDao / 255
  return bili <= 0.04045 ? bili / 12.92 : Math.pow((bili + 0.055) / 1.055, 2.4)
}

export function xiangDuiLiangDu(yanSe: WaiGuanYanSeZu): number {
  return (
    0.2126 * zhuanXianXing(yanSe.r) +
    0.7152 * zhuanXianXing(yanSe.g) +
    0.0722 * zhuanXianXing(yanSe.b)
  )
}

export function jiSuanDuiBiDu(qianJing: WaiGuanYanSeZu, houJing: WaiGuanYanSeZu): number {
  const qian = xiangDuiLiangDu(qianJing)
  const hou = xiangDuiLiangDu(houJing)
  const liang = Math.max(qian, hou)
  const an = Math.min(qian, hou)
  return (liang + 0.05) / (an + 0.05)
}

export function heChengMengCeng(mengCeng: WaiGuangMengCeng, beiJingHui: number): WaiGuanYanSeZu {
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

export function kongWaiGuanShuJu(): WaiGuanShuJu {
  return { beiJing: [], qiPao: [], beiJingFuGai: {}, dangQianQiPao: { ziJi: '', ai: '' } }
}

function quWenBen(zhi: unknown): string {
  return typeof zhi === 'string' ? zhi.trim() : ''
}

function jiSuanZiFuShu(zhi: string): number {
  return Array.from(zhi).length
}

function guiYiYanSe(zhi: unknown): string {
  const wenBen = quWenBen(zhi)
  if (!wenBen) return ''
  if (!WAI_GUAN_YAN_SE_GE_SHI.test(wenBen)) return ''
  return wenBen.toUpperCase()
}

function guiYiMingCheng(zhi: unknown, zuiDa: number): string {
  const wenBen = quWenBen(zhi)
  return jiSuanZiFuShu(wenBen) > zuiDa ? '' : wenBen
}

function guiYiTiaoMu(
  yuan: unknown,
  zuiDaMingCheng: number,
  yanGe: boolean,
): WaiGuanTiaoMu | null {
  if (!yuan || typeof yuan !== 'object') {
    if (yanGe) throw new WaiGuanCuoWu(huoQuFanYi('tongYong', 'canShuBuHeFa'))
    return null
  }
  const xiang = yuan as Record<string, unknown>
  const id = quWenBen(xiang.id)
  const mingCheng = guiYiMingCheng(xiang.mingCheng, zuiDaMingCheng)
  const sha = tiQuMeiTiSha(xiang.tuDiZhi ?? xiang.meiTiYinYong)
  const yanSeYuanShi = quWenBen(xiang.wenZiYanSe)
  const wenZiYanSe = guiYiYanSe(yanSeYuanShi)
  if (yanGe) {
    if (!shiUUID(id)) throw new WaiGuanCuoWu(huoQuFanYi('tongYong', 'canShuBuHeFa'))
    if (!mingCheng) throw new WaiGuanCuoWu(huoQuFanYi('sheZhi', 'waiGuanMingChengBuHeFa'))
    if (!sha) throw new WaiGuanCuoWu(huoQuFanYi('sheZhi', 'waiGuanTuPianBuHeFa'))
    if (yanSeYuanShi && !wenZiYanSe) throw new WaiGuanCuoWu(huoQuFanYi('sheZhi', 'waiGuanYanSeBuHeFa'))
    if (wenZiYanSe && !shiKeYongWenZiYanSe(wenZiYanSe)) {
      throw new WaiGuanCuoWu(huoQuFanYi('sheZhi', 'waiGuanWenZiYanSeDuiBiDuBuZu'))
    }
  }
  if (!shiUUID(id) || !mingCheng || !sha) return null
  return {
    id: id.toLowerCase(),
    mingCheng,
    meiTiYinYong: shengChengMeiTiYinYong(sha),
    wenZiYanSe: wenZiYanSe || WAI_GUAN_MO_REN_WEN_ZI_YAN_SE,
  }
}

function guiYiTiaoMuLieBiao(
  yuan: unknown,
  zuiDaMingCheng: number,
  yanGe: boolean,
): WaiGuanTiaoMu[] {
  if (yuan === undefined || yuan === null) return []
  if (!Array.isArray(yuan)) {
    if (yanGe) throw new WaiGuanCuoWu(huoQuFanYi('tongYong', 'canShuBuHeFa'))
    return []
  }
  if (yuan.length > WAI_GUAN_MEI_LEI_ZUI_DA_TIAO_SHU) {
    if (yanGe) throw new WaiGuanCuoWu(huoQuFanYi('sheZhi', 'waiGuanTiaoMuTaiDuo'))
    return []
  }
  const chu: WaiGuanTiaoMu[] = []
  const yiYou = new Set<string>()
  for (const xiang of yuan) {
    const tiaoMu = guiYiTiaoMu(xiang, zuiDaMingCheng, yanGe)
    if (!tiaoMu) continue
    if (yiYou.has(tiaoMu.id)) {
      if (yanGe) throw new WaiGuanCuoWu(huoQuFanYi('tongYong', 'canShuBuHeFa'))
      continue
    }
    yiYou.add(tiaoMu.id)
    chu.push(tiaoMu)
  }
  return chu
}

function guiYiFuGai(yuan: unknown, yanGe: boolean): Record<string, WaiGuanFuGai> {
  if (yuan === undefined || yuan === null) return {}
  if (typeof yuan !== 'object' || Array.isArray(yuan)) {
    if (yanGe) throw new WaiGuanCuoWu(huoQuFanYi('tongYong', 'canShuBuHeFa'))
    return {}
  }
  const chu: Record<string, WaiGuanFuGai> = {}
  for (const [jian, zhi] of Object.entries(yuan as Record<string, unknown>)) {
    if (!(WAI_GUAN_BEI_JING_YU_SHE as readonly string[]).includes(jian)) {
      if (yanGe) throw new WaiGuanCuoWu(huoQuFanYi('tongYong', 'canShuBuHeFa'))
      continue
    }
    if (!zhi || typeof zhi !== 'object' || Array.isArray(zhi)) {
      if (yanGe) throw new WaiGuanCuoWu(huoQuFanYi('tongYong', 'canShuBuHeFa'))
      continue
    }
    const xiang = zhi as Record<string, unknown>
    const mingCheng = guiYiMingCheng(xiang.mingCheng, WAI_GUAN_BEI_JING_MING_CHENG_ZUI_DA_ZI_FU)
    const yanSeYuanShi = quWenBen(xiang.wenZiYanSe)
    const wenZiYanSe = guiYiYanSe(yanSeYuanShi)
    if (yanGe && yanSeYuanShi && !wenZiYanSe) {
      throw new WaiGuanCuoWu(huoQuFanYi('sheZhi', 'waiGuanYanSeBuHeFa'))
    }
    if (yanGe && wenZiYanSe && !shiKeYongWenZiYanSe(wenZiYanSe)) {
      throw new WaiGuanCuoWu(huoQuFanYi('sheZhi', 'waiGuanWenZiYanSeDuiBiDuBuZu'))
    }
    if (yanGe && quWenBen(xiang.mingCheng) && !mingCheng) {
      throw new WaiGuanCuoWu(huoQuFanYi('sheZhi', 'waiGuanMingChengBuHeFa'))
    }
    if (!mingCheng && !wenZiYanSe) continue
    chu[jian] = { mingCheng, wenZiYanSe }
  }
  return chu
}

function guiYiDangQianQiPao(
  yuan: unknown,
  qiPao: WaiGuanTiaoMu[],
  yanGe: boolean,
): WaiGuanDangQianQiPao {
  const kong = { ziJi: '', ai: '' }
  if (yuan === undefined || yuan === null) return kong
  if (typeof yuan !== 'object' || Array.isArray(yuan)) {
    if (yanGe) throw new WaiGuanCuoWu(huoQuFanYi('tongYong', 'canShuBuHeFa'))
    return kong
  }
  const xiang = yuan as Record<string, unknown>
  const heFa = new Set(qiPao.map((tiaoMu) => tiaoMu.id))
  const quZhi = (jian: string): string => {
    const wenBen = quWenBen(xiang[jian])
    if (!wenBen) return ''
    if (!heFa.has(wenBen.toLowerCase())) {
      if (yanGe) throw new WaiGuanCuoWu(huoQuFanYi('tongYong', 'canShuBuHeFa'))
      return ''
    }
    return wenBen.toLowerCase()
  }
  return { ziJi: quZhi('ziJi'), ai: quZhi('ai') }
}

function guiYiShuJu(yuan: unknown, yanGe: boolean): WaiGuanShuJu {
  if (yuan === undefined || yuan === null) return kongWaiGuanShuJu()
  if (typeof yuan !== 'object' || Array.isArray(yuan)) {
    if (yanGe) throw new WaiGuanCuoWu(huoQuFanYi('tongYong', 'canShuBuHeFa'))
    return kongWaiGuanShuJu()
  }
  const xiang = yuan as Record<string, unknown>
  const beiJing = guiYiTiaoMuLieBiao(
    xiang.beiJing,
    WAI_GUAN_BEI_JING_MING_CHENG_ZUI_DA_ZI_FU,
    yanGe,
  )
  const qiPao = guiYiTiaoMuLieBiao(xiang.qiPao, WAI_GUAN_QI_PAO_MING_CHENG_ZUI_DA_ZI_FU, yanGe)
  return {
    beiJing,
    qiPao,
    beiJingFuGai: guiYiFuGai(xiang.beiJingFuGai, yanGe),
    dangQianQiPao: guiYiDangQianQiPao(xiang.dangQianQiPao, qiPao, yanGe),
  }
}

export function guiYiShangChuanShuJu(yuan: unknown): WaiGuanShuJu {
  return guiYiShuJu(yuan, true)
}

export function guiYiCunChuShuJu(yuan: unknown): WaiGuanShuJu {
  return guiYiShuJu(yuan, false)
}

export function tiQuShuJuNeiSha(数据: WaiGuanShuJu): string[] {
  const shaJi = new Set<string>()
  for (const tiaoMu of [...数据.beiJing, ...数据.qiPao]) {
    const sha = tiQuMeiTiSha(tiaoMu.meiTiYinYong)
    if (sha) shaJi.add(sha)
  }
  return [...shaJi]
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

function chuCanTiaoMu(
  lieBiao: WaiGuanTiaoMu[],
  yongHuId: string,
): WaiGuanChuCanTiaoMu[] {
  return lieBiao.map((tiaoMu) => ({
    id: tiaoMu.id,
    ming_cheng: tiaoMu.mingCheng,
    tu_di_zhi: zhongXinQianMingMeiTiURL(tiaoMu.meiTiYinYong, yongHuId) || '',
    wen_zi_yan_se: tiaoMu.wenZiYanSe,
  }))
}

export function shengChengChuCan(数据: WaiGuanShuJu, yongHuId: string): WaiGuanChuCan {
  return {
    bei_jing: chuCanTiaoMu(数据.beiJing, yongHuId),
    qi_pao: chuCanTiaoMu(数据.qiPao, yongHuId),
    bei_jing_fu_gai: 数据.beiJingFuGai,
    dang_qian_qi_pao: 数据.dangQianQiPao,
  }
}
