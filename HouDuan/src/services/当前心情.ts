import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'

const RiZhiLeiXing = '当前心情'

export const XinQingLieBiao = [
  '开心',
  '平静',
  '好奇',
  '期待',
  '心动',
  '甜蜜',
  '愉悦',
  '烦躁',
  '难过',
  '委屈',
  '生气',
  '冷淡',
  '疲惫',
  '焦虑',
] as const

export type XinQingMing = (typeof XinQingLieBiao)[number]

export function shiFouHeFaXinQing(zhi: unknown): zhi is XinQingMing {
  return typeof zhi === 'string' && (XinQingLieBiao as readonly string[]).includes(zhi)
}

const FuFanMing = new Set<XinQingMing>(['烦躁', '难过', '委屈', '生气', '焦虑'])

export function shiFuMianXinQing(ming: unknown): boolean {
  return shiFouHeFaXinQing(ming) && FuFanMing.has(ming)
}

export const XinQingPeiZhi = {
  zuiDiQiangDu: 0,
  zuiGaoQiangDu: 100,
  huiTuiZhi: 12 * 60 * 60 * 1000,
  banZhi: 12 * 60 * 60 * 1000,
  banZhiFuMian: 6 * 60 * 60 * 1000,
  banZhiZhengMian: 12 * 60 * 60 * 1000,
  zuiDiBanZhi: 4 * 60 * 60 * 1000,
  zuiGaoBanZhi: 36 * 60 * 60 * 1000,
  chaoShiCha: 30 * 24 * 60 * 60 * 1000,
} as const

function quXianZhi(qiangDu: number): number {
  const shu = Number(qiangDu)
  if (!Number.isFinite(shu)) return XinQingPeiZhi.zuiDiQiangDu
  return Math.max(XinQingPeiZhi.zuiDiQiangDu, Math.min(XinQingPeiZhi.zuiGaoQiangDu, Math.round(shu)))
}

export function suanBanZhiHaoMiao(qiangDu: number, fuMian: boolean): number {
  const ji = quXianZhi(qiangDu)
  const jiChu = fuMian ? XinQingPeiZhi.banZhiFuMian : XinQingPeiZhi.banZhiZhengMian
  const tiaoZheng = XinQingPeiZhi.zuiDiBanZhi + (ji / 100) * (XinQingPeiZhi.zuiGaoBanZhi - XinQingPeiZhi.zuiDiBanZhi)
  const banZhi = Math.round((jiChu + tiaoZheng) / 2)
  return Math.max(XinQingPeiZhi.zuiDiBanZhi, Math.min(XinQingPeiZhi.zuiGaoBanZhi, banZhi))
}

export interface XinQingZhuangTai {
  ming: XinQingMing | null
  qiangDu: number
  gengXinShiJian: number
}

export function jieGuoXinQing(
  dangQian: XinQingZhuangTai | null | undefined,
  dangQianShiJian: number = Date.now(),
): { ming: XinQingMing | null; qiangDu: number } {
  if (!dangQian || !shiFouHeFaXinQing(dangQian.ming)) return { ming: null, qiangDu: 0 }

  const gengXin = Number(dangQian.gengXinShiJian)
  const benCi = Number(dangQianShiJian)
  if (!Number.isFinite(gengXin) || !Number.isFinite(benCi)) {
    return { ming: dangQian.ming, qiangDu: quXianZhi(dangQian.qiangDu) }
  }

  const guoQuHaoMiao = Math.max(0, benCi - gengXin)
  if (guoQuHaoMiao <= 0) {
    return { ming: dangQian.ming, qiangDu: quXianZhi(dangQian.qiangDu) }
  }

  const shuaiTuiLv = suanBanZhiHaoMiao(dangQian.qiangDu, shiFuMianXinQing(dangQian.ming))
  const shengXia = quXianZhi(Number(dangQian.qiangDu) * Math.pow(0.5, guoQuHaoMiao / shuaiTuiLv))
  if (shengXia <= 0) return { ming: null, qiangDu: 0 }
  return { ming: dangQian.ming, qiangDu: shengXia }
}

export function jiLuXinQingBianHua(
  jiaoSeId: string,
  ming: XinQingMing,
  qiangDu: number,
  laiYuan: string,
  shiJian: number = Date.now(),
): void {
  debug日志.debug(RiZhiLeiXing, '心情更新', {
    xiang_qing: {
      jiao_se_id: jiaoSeId,
      xin_qing: ming,
      qiang_du: quXianZhi(qiangDu),
      lai_yuan: (laiYuan || '').slice(0, 60),
      shi_jian: new Date(shiJian).toISOString(),
    },
  })
}

export async function duQuDangQianXinQing(jiaoSeId: string): Promise<XinQingZhuangTai | null> {
  const jieGuo = await 数据库.query(
    `SELECT "当前心情" AS ming, "心情强度" AS qiang_du, "心情更新时刻" AS geng_xin
     FROM "角色" WHERE "ID" = $1 LIMIT 1`,
    [jiaoSeId],
  )
  const hang = jieGuo.rows[0]
  if (!hang || !hang.ming) return null
  return {
    ming: String(hang.ming) as XinQingMing,
    qiangDu: Number(hang.qiang_du) || 0,
    gengXinShiJian: Number(hang.geng_xin) || 0,
  }
}

export async function xieRuDangQianXinQing(
  jiaoSeId: string,
  ming: XinQingMing | null,
  qiangDu: number,
  laiYuan: string,
): Promise<void> {
  if (!ming) {
    await 数据库.query(
      `UPDATE "角色" SET "当前心情" = NULL, "心情强度" = 0, "心情来源" = NULL, "心情更新时刻" = NULL WHERE "ID" = $1`,
      [jiaoSeId],
    )
    return
  }
  const qiang = quXianZhi(qiangDu)
  const shiJian = Date.now()
  await 数据库.query(
    `UPDATE "角色" SET "当前心情" = $2, "心情强度" = $3, "心情来源" = $4, "心情更新时刻" = $5 WHERE "ID" = $1`,
    [jiaoSeId, ming, qiang, (laiYuan || '').slice(0, 200), shiJian],
  )
  jiLuXinQingBianHua(jiaoSeId, ming, qiang, laiYuan, shiJian)
}

export async function gengXinXinQingRuHeShiHou(
  jiaoSeId: string,
  ming: XinQingMing | null,
  qiangDu: number,
  laiYuan: string,
  shiJian: number,
): Promise<void> {
  if (!ming) return
  const qiang = quXianZhi(qiangDu)
  await 数据库.query(
    `UPDATE "角色" SET "当前心情" = $2, "心情强度" = $3, "心情来源" = $4, "心情更新时刻" = $5 WHERE "ID" = $1`,
    [jiaoSeId, ming, qiang, (laiYuan || '').slice(0, 200), shiJian],
  )
}