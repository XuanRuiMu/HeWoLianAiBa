import { XIAO_XI_KUAI_PEI_ZHI, TU_PIAN_XIAO_XI_LEI_XING, XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import type { XiaoXiKuai, XiaoXiKuaiChuCan, XiaoXiKuaiLeiXing, 消息 } from '@/types/类型定义'


export const XIAO_XI_KUAI_LEI_XING = { wenZi: 'wenzi', tuPian: 'tupian' } as const

const TU_XIANG_MEI_TI_LEI_BIE = new Set<string>(['tupian', 'biaoqingshu'])

export const BIAO_QING_BAO_MEI_TI_LEI_BIE = 'biaoqingshu'

const ZAI_TI_ZHAN_WEI = new Set<string>([
  XIAO_XI_KUAI_PEI_ZHI.tuPianZhanWei,
  XIAO_XI_KUAI_PEI_ZHI.biaoQingBaoZhanWei,
])

const UUID_GE_SHI = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function shiUUID(zhi: unknown): zhi is string {
  return typeof zhi === 'string' && UUID_GE_SHI.test(zhi.trim().toLowerCase())
}

export function guiYiKuaiLeiXing(zhi: unknown): XiaoXiKuaiLeiXing | null {
  if (typeof zhi !== 'string') return null
  const xiaoXie = zhi.trim().toLowerCase()
  if (xiaoXie === XIAO_XI_KUAI_LEI_XING.wenZi || xiaoXie === 'wenben') return XIAO_XI_KUAI_LEI_XING.wenZi
  if (xiaoXie === XIAO_XI_KUAI_LEI_XING.tuPian) return XIAO_XI_KUAI_LEI_XING.tuPian
  return null
}

export function guiYiXiaoXiLeiXing(leiXing: unknown): string {
  if (typeof leiXing !== 'string') return 'wenben'
  const xiaoXie = leiXing.trim().toLowerCase()
  if (xiaoXie === 'tupian') return 'tuPian'
  if (xiaoXie === 'biaoqingbao') return 'biaoQingBao'
  if (xiaoXie === 'yuyin') return 'yuYin'
  if (xiaoXie === 'wenjian') return 'wenJian'
  return leiXing
}

export function shiTuXiangMeiTiLeiBie(leiBie: unknown): boolean {
  return typeof leiBie === 'string' && TU_XIANG_MEI_TI_LEI_BIE.has(leiBie)
}

export function shiBiaoQingBaoMeiTiLeiBie(leiBie: unknown): boolean {
  return (
    typeof leiBie === 'string' && leiBie.trim().toLowerCase() === BIAO_QING_BAO_MEI_TI_LEI_BIE
  )
}

export function shiBiaoQingBaoKuai(
  kuai: { lei_xing?: unknown; mei_ti_lei_bie?: unknown } | null | undefined,
): boolean {
  if (!kuai) return false
  return (
    guiYiKuaiLeiXing(kuai.lei_xing) === XIAO_XI_KUAI_LEI_XING.tuPian &&
    shiBiaoQingBaoMeiTiLeiBie(kuai.mei_ti_lei_bie)
  )
}

function nianKuaiMeiTiUrl(xiang: Record<string, unknown>): string | null {
  const zhi = xiang.mei_ti_url
  return typeof zhi === 'string' && zhi !== '' ? zhi : null
}

export function guiYiKuaiLieBiao(zhi: unknown): XiaoXiKuaiChuCan[] | null {
  let shuZu: unknown = zhi
  if (typeof shuZu === 'string') {
    const miao = shuZu.trim()
    if (miao === '') return null
    try {
      shuZu = JSON.parse(miao)
    } catch {
      return null
    }
  }
  if (!Array.isArray(shuZu)) return null
  const jieGuo: XiaoXiKuaiChuCan[] = []
  for (const yuan of shuZu) {
    if (typeof yuan !== 'object' || yuan === null || Array.isArray(yuan)) continue
    const xiang = yuan as Record<string, unknown>
    const leiXing = guiYiKuaiLeiXing(xiang.lei_xing)
    if (!leiXing) continue
    if (leiXing === XIAO_XI_KUAI_LEI_XING.tuPian) {
      if (!shiUUID(xiang.mei_ti_id)) continue
      const kuai: XiaoXiKuaiChuCan = {
        lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian,
        mei_ti_id: typeof xiang.mei_ti_id === 'string' ? xiang.mei_ti_id.trim() : '',
      }
      const url = nianKuaiMeiTiUrl(xiang)
      if (url) kuai.mei_ti_url = url
      if (typeof xiang.mei_ti_lei_bie === 'string') kuai.mei_ti_lei_bie = xiang.mei_ti_lei_bie
      jieGuo.push(kuai)
      continue
    }
    jieGuo.push({
      lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi,
      nei_rong: typeof xiang.nei_rong === 'string' ? xiang.nei_rong : '',
    })
  }
  return jieGuo.length > 0 ? jieGuo : null
}

export function fanGouKuaiCongXiaoXi(
  xiaoXi: Pick<消息, 'nei_rong' | 'lei_xing' | 'mei_ti_id' | 'mei_ti_url' | 'mei_ti_lei_bie'>,
): XiaoXiKuaiChuCan[] {
  const jieGuo: XiaoXiKuaiChuCan[] = []
  const leiXing = guiYiXiaoXiLeiXing(xiaoXi.lei_xing)
  const shiTuXiang =
    (TU_PIAN_XIAO_XI_LEI_XING as readonly string[]).includes(leiXing) ||
    shiTuXiangMeiTiLeiBie(xiaoXi.mei_ti_lei_bie)
  const meiTiId = typeof xiaoXi.mei_ti_id === 'string' && xiaoXi.mei_ti_id ? xiaoXi.mei_ti_id : ''
  const youTuXiangKuai = shiTuXiang && meiTiId !== ''
  if (youTuXiangKuai) {
    jieGuo.push({
      lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian,
      mei_ti_id: meiTiId,
      ...(xiaoXi.mei_ti_url ? { mei_ti_url: xiaoXi.mei_ti_url } : {}),
      ...(xiaoXi.mei_ti_lei_bie ? { mei_ti_lei_bie: xiaoXi.mei_ti_lei_bie } : {}),
    } as XiaoXiKuaiChuCan)
  }
  const neiRong = typeof xiaoXi.nei_rong === 'string' ? xiaoXi.nei_rong : ''
  if (neiRong !== '' && !(youTuXiangKuai && ZAI_TI_ZHAN_WEI.has(neiRong))) {
    jieGuo.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: neiRong })
  }
  if (jieGuo.length === 0) jieGuo.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: '' })
  return jieGuo
}

export function huoQuXianShiKuai(xiaoXi: 消息): XiaoXiKuaiChuCan[] {
  return guiYiKuaiLieBiao(xiaoXi.nei_rong_kuai) ?? fanGouKuaiCongXiaoXi(xiaoXi)
}

function youTuPianKuai(kuai: XiaoXiKuai[]): boolean {
  return kuai.some((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian)
}

export function shiXuYaoKuaiXuanRan(xiaoXi: 消息): boolean {
  return youTuPianKuai(huoQuXianShiKuai(xiaoXi))
}

export function kuaiDaoZhengWen(
  kuai: XiaoXiKuai[],
  xuanXiang?: { leiBieOf?: (meiTiId?: string | null) => string | undefined },
): string {
  let jieGuo = ''
  for (const xiang of kuai) {
    if (xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi) {
      jieGuo += xiang.nei_rong ?? ''
      continue
    }
    const leiBie = xuanXiang?.leiBieOf?.(xiang.mei_ti_id)
    jieGuo += shiBiaoQingBaoMeiTiLeiBie(leiBie)
      ? XIAO_XI_KUAI_PEI_ZHI.biaoQingBaoZhanWei
      : XIAO_XI_KUAI_PEI_ZHI.tuPianZhanWei
  }
  return jieGuo
}

export function kuaiDaoXiaoXiLeiXing(
  kuai: Array<{ lei_xing: unknown; nei_rong?: string; mei_ti_id?: string | null; mei_ti_lei_bie?: string | null }>,
): string {
  const youWenZi = kuai.some(
    (xiang) => guiYiKuaiLeiXing(xiang.lei_xing) === XIAO_XI_KUAI_LEI_XING.wenZi && (xiang.nei_rong ?? '') !== '',
  )
  const shouTuPian = kuai.find((xiang) => guiYiKuaiLeiXing(xiang.lei_xing) === XIAO_XI_KUAI_LEI_XING.tuPian)
  if (!youWenZi && shouTuPian) {
    return shiBiaoQingBaoMeiTiLeiBie(shouTuPian.mei_ti_lei_bie) ? 'biaoQingBao' : 'tuPian'
  }
  return 'wenben'
}

export function keTiJiaoKuai(
  kuai: Array<{ lei_xing: unknown; nei_rong?: string; mei_ti_id?: string | null; mei_ti_lei_bie?: string | null }>,
): XiaoXiKuai[] {
  const jieGuo: XiaoXiKuai[] = []
  for (const xiang of kuai) {
    const leiXing = guiYiKuaiLeiXing(xiang.lei_xing)
    if (!leiXing) continue
    if (leiXing === XIAO_XI_KUAI_LEI_XING.tuPian) {
      if (!shiUUID(xiang.mei_ti_id)) continue
      const tuKuai: XiaoXiKuai = {
        lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian,
        mei_ti_id: typeof xiang.mei_ti_id === 'string' ? xiang.mei_ti_id.trim() : '',
      }
      if (xiang.mei_ti_lei_bie) (tuKuai as { mei_ti_lei_bie?: string }).mei_ti_lei_bie = xiang.mei_ti_lei_bie
      jieGuo.push(tuKuai)
      continue
    }
    const wenZi = (xiang.nei_rong ?? '').trim()
    if (wenZi === '') continue
    jieGuo.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: wenZi })
  }
  return jieGuo
}

export interface KuaiChaoXianQingKuang {
  chaoXian: boolean
  yuanYin: 'kuaishu' | 'tupianshu' | 'zishu' | ''
}

export function panDingKuaiChaoXian(kuai: XiaoXiKuai[]): KuaiChaoXianQingKuang {
  const tupianShu = kuai.filter((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian).length
  if (kuai.length > XIAO_XI_KUAI_PEI_ZHI.zuiDaKuaiShu) return { chaoXian: true, yuanYin: 'kuaishu' }
  if (tupianShu > XIAO_XI_KUAI_PEI_ZHI.zuiDaTuPianShu) return { chaoXian: true, yuanYin: 'tupianshu' }
  const ziShu = kuai
    .filter((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi)
    .reduce((he, xiang) => he + (xiang.nei_rong ?? '').trim().length, 0)
  if (ziShu > XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu) return { chaoXian: true, yuanYin: 'zishu' }
  return { chaoXian: false, yuanYin: '' }
}

export function kuaiYuLanDiZhi(kuai: Array<{ mei_ti_url?: string | null }>): string[] {
  return kuai
    .map((xiang) => xiang.mei_ti_url ?? '')
    .filter((diZhi) => typeof diZhi === 'string' && diZhi.startsWith('blob:'))
}


export const SHU_RU_KONG_HANG_SHOU = '\u200B'

export function quKongHangShou(wenBen: string): string {
  return wenBen.includes(SHU_RU_KONG_HANG_SHOU)
    ? wenBen.split(SHU_RU_KONG_HANG_SHOU).join('')
    : wenBen
}

export function yingSheChuDuanPianYi(jieDianWen: string, duanPianCha: number): number {
  const youXiao = Math.max(0, Math.min(duanPianCha, jieDianWen.length))
  return quKongHangShou(jieDianWen.slice(0, youXiao)).length
}

export function yingSheHuiDuanPianYi(jieDianWen: string, zhengWenPianYi: number): number {
  const zhengWen = quKongHangShou(jieDianWen)
  const mubiao = Math.max(0, Math.min(zhengWenPianYi, zhengWen.length))
  if (mubiao === zhengWen.length) return jieDianWen.length
  let jiShu = 0
  for (let xia = 0; xia < jieDianWen.length; xia++) {
    if (jieDianWen[xia] === SHU_RU_KONG_HANG_SHOU) continue
    jiShu += 1
    if (jiShu > mubiao) return xia
  }
  return jieDianWen.length
}

export function shiXuanGuaMoWeiHuanXing(cao: Node, huan: Node): boolean {
  if (huan.nodeName !== 'BR') return false
  let dangQian: Node | null = huan
  while (dangQian && dangQian !== cao) {
    let dong = dangQian.nextSibling
    while (dong) {
      if (dong.nodeType === Node.TEXT_NODE) {
        if ((dong.textContent ?? '') !== '') return false
      } else if (dong.nodeType === Node.ELEMENT_NODE || dong.nodeName === 'BR') {
        return false
      }
      dong = dong.nextSibling
    }
    dangQian = dangQian.parentNode
  }
  return true
}

export function shiBenDiLinShiXiaoXi(
  xiaoXi: { id?: unknown; ke_hu_duan_id?: unknown } | null | undefined,
): boolean {
  if (!xiaoXi) return false
  const id = xiaoXi.id
  return typeof id === 'string' && id !== '' && xiaoXi.ke_hu_duan_id === id
}
