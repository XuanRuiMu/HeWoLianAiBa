import { 数据库 } from '../数据库'

export const KE_JIAN_XING_LIE_BIAO = [
  'gong_kai',
  'jin_hao_you',
  'jin_bu_fen_ren',
  'bu_ke_jian',
  'jin_zi_ji',
] as const

export type KeJianXing = (typeof KE_JIAN_XING_LIE_BIAO)[number]

export function shiHeFaKeJianXing(zhi: unknown): zhi is KeJianXing {
  return typeof zhi === 'string' && (KE_JIAN_XING_LIE_BIAO as readonly string[]).includes(zhi)
}

export interface KeJianShangXiaWen {
  chaKanZheId: string | null
  yongYouZheId: string
  shiHaoYou: boolean
  baiMingDan: string[]
}

export function panDuanKeJian(keJianXing: KeJianXing, wen: KeJianShangXiaWen): boolean {
  const shiBenRen = wen.chaKanZheId !== null && wen.chaKanZheId === wen.yongYouZheId
  if (shiBenRen) {
    return keJianXing !== 'bu_ke_jian'
  }
  switch (keJianXing) {
    case 'gong_kai':
      return true
    case 'jin_hao_you':
      return wen.shiHaoYou
    case 'jin_bu_fen_ren':
      return wen.chaKanZheId !== null && wen.baiMingDan.includes(wen.chaKanZheId)
    case 'bu_ke_jian':
    case 'jin_zi_ji':
    default:
      return false
  }
}

export async function chaXunShiHaoYou(a: string, b: string): Promise<boolean> {
  if (!a || !b || a === b) return false
  const jieGuo = await 数据库.query(
    `SELECT 1 FROM "好友申请" WHERE "状态" = 'accepted' AND (("申请者ID" = $1 AND "接收者ID" = $2) OR ("申请者ID" = $2 AND "接收者ID" = $1)) LIMIT 1`,
    [a, b],
  )
  return jieGuo.rows.length > 0
}

export interface QianMingKeJianXinXi {
  qianMing: string | null
  keJianXing: KeJianXing
  baiMingDan: string[]
}

export async function duQuQianMingKeJianXinXi(yongHuId: string): Promise<QianMingKeJianXinXi | null> {
  const jieGuo = await 数据库.query(
    `SELECT "签名", "签名可见性", "签名白名单" FROM "用户" WHERE "ID" = $1 LIMIT 1`,
    [yongHuId],
  )
  if (!jieGuo.rows.length) return null
  const hang = jieGuo.rows[0] as Record<string, unknown>
  const keJianXingRaw = hang['签名可见性']
  const baiMingDanRaw = hang['签名白名单']
  return {
    qianMing: hang['签名'] ? String(hang['签名']) : null,
    keJianXing: shiHeFaKeJianXing(keJianXingRaw) ? keJianXingRaw : 'gong_kai',
    baiMingDan: Array.isArray(baiMingDanRaw) ? baiMingDanRaw.map((x) => String(x)) : [],
  }
}

export async function guoLvQianMing(
  yongYouZheId: string,
  chaKanZheId: string | null,
): Promise<string | null> {
  const xinXi = await duQuQianMingKeJianXinXi(yongYouZheId)
  if (!xinXi || !xinXi.qianMing) return null
  const shiHaoYou = chaKanZheId ? await chaXunShiHaoYou(chaKanZheId, yongYouZheId) : false
  const keJian = panDuanKeJian(xinXi.keJianXing, {
    chaKanZheId,
    yongYouZheId,
    shiHaoYou,
    baiMingDan: xinXi.baiMingDan,
  })
  return keJian ? xinXi.qianMing : null
}
