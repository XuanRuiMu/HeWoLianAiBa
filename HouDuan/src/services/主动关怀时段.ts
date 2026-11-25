import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'
import { huoQuShiQu, shiQuXianZaiShiJian } from '../config/语言与时区'

const JingMoJieShu = 8

export interface HuoDongShiDuan {
  xiaoShi: number
  quanZhong: number
}

export async function huoQuYongHuHuoDongFenBu(
  yongHuId: string,
  jiaoSeId: string,
  shiQu?: string,
): Promise<HuoDongShiDuan[]> {
  try {
    const zhengShiQu = huoQuShiQu(shiQu)
    const jieGuo = await 数据库.query(
      `SELECT EXTRACT(HOUR FROM ("创建时间" AT TIME ZONE $3)) AS xiao_shi, COUNT(*) AS shu
       FROM "消息"
       WHERE "用户ID" = $1 AND "角色ID" = $2 AND "发送者" = 'yonghu'
         AND "创建时间" > NOW() - INTERVAL '30 days'
       GROUP BY 1
       ORDER BY 1`,
      [yongHuId, jiaoSeId, zhengShiQu],
    )
    const fenBu = jieGuo.rows.map((hang) => ({
      xiaoShi: Number(hang.xiao_shi),
      quanZhong: Number(hang.shu) || 0,
    }))
    if (fenBu.length === 0) {
      return [
        { xiaoShi: 12, quanZhong: 3 },
        { xiaoShi: 18, quanZhong: 3 },
        { xiaoShi: 21, quanZhong: 2 },
      ]
    }
    return fenBu
  } catch (cuoWu) {
    debug日志.warn('主动关怀', '读取用户活跃分布失败，使用默认时段', { xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) } })
    return [
      { xiaoShi: 12, quanZhong: 3 },
      { xiaoShi: 18, quanZhong: 3 },
      { xiaoShi: 21, quanZhong: 2 },
    ]
  }
}

function riQiChaTianShu(qi: string, zhi: string): number {
  const a = Date.UTC(Number(qi.slice(0, 4)), Number(qi.slice(5, 7)) - 1, Number(qi.slice(8, 10)))
  const b = Date.UTC(Number(zhi.slice(0, 4)), Number(zhi.slice(5, 7)) - 1, Number(zhi.slice(8, 10)))
  return Math.round((b - a) / (24 * 3600 * 1000))
}

function tuiSuanShiQuPianYiHaoMiao(shiQu: string, now: Date): number {
  const dangDi = shiQuXianZaiShiJian(shiQu, now)
  const utcRiQi = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
  const dangDiFen = dangDi.xiaoShi * 60 + dangDi.fenZhong
  const utcFen = now.getUTCHours() * 60 + now.getUTCMinutes()
  return ((riQiChaTianShu(utcRiQi, dangDi.riQi) * 24 * 60) + dangDiFen - utcFen) * 60 * 1000
}

export function caiYangHuoDongShiKe(fenBu: HuoDongShiDuan[], now: Date, shiQu?: string): Date | null {
  const heFa = fenBu.filter((d) => d.xiaoShi >= JingMoJieShu && d.xiaoShi < 24)
  const chi = heFa.length > 0 ? heFa : fenBu
  const zong = chi.reduce((he, d) => he + d.quanZhong, 0)
  if (zong <= 0) return null
  let suiji = Math.random() * zong
  let xuanZhong = chi[chi.length - 1].xiaoShi
  for (const d of chi) {
    suiji -= d.quanZhong
    if (suiji <= 0) { xuanZhong = d.xiaoShi; break }
  }
  if (shiQu) {
    const pianYiHaoMiao = tuiSuanShiQuPianYiHaoMiao(huoQuShiQu(shiQu), now)
    const dangDiZhong = new Date(now.getTime() + pianYiHaoMiao)
    dangDiZhong.setUTCHours(xuanZhong, Math.floor(Math.random() * 60), 0, 0)
    if (dangDiZhong.getTime() <= now.getTime() + pianYiHaoMiao) {
      dangDiZhong.setUTCDate(dangDiZhong.getUTCDate() + 1)
    }
    const muBiaoHaoMiao = dangDiZhong.getTime() - pianYiHaoMiao
    if (muBiaoHaoMiao - now.getTime() > 48 * 3600 * 1000) return null
    return new Date(muBiaoHaoMiao)
  }
  const muBiao = new Date(now)
  muBiao.setHours(xuanZhong, Math.floor(Math.random() * 60), 0, 0)
  if (muBiao.getTime() <= now.getTime()) muBiao.setDate(muBiao.getDate() + 1)
  if (muBiao.getTime() - now.getTime() > 48 * 3600 * 1000) return null
  return muBiao
}
