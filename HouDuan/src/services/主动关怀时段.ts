import { 数据库 } from '../数据库'
import { debug日志 } from '../utils/debug日志'

const JingMoJieShu = 8

export interface HuoDongShiDuan {
  xiaoShi: number
  quanZhong: number
}

export async function huoQuYongHuHuoDongFenBu(
  yongHuId: string,
  jiaoSeId: string,
): Promise<HuoDongShiDuan[]> {
  try {
    const jieGuo = await 数据库.query(
      `SELECT EXTRACT(HOUR FROM "创建时间") AS xiao_shi, COUNT(*) AS shu
       FROM "消息"
       WHERE "用户ID" = $1 AND "角色ID" = $2 AND "发送者" = 'yonghu'
         AND "创建时间" > NOW() - INTERVAL '30 days'
       GROUP BY 1
       ORDER BY 1`,
      [yongHuId, jiaoSeId],
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

export function caiYangHuoDongShiKe(fenBu: HuoDongShiDuan[], now: Date): Date | null {
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
  const muBiao = new Date(now)
  muBiao.setHours(xuanZhong, Math.floor(Math.random() * 60), 0, 0)
  if (muBiao.getTime() <= now.getTime()) muBiao.setDate(muBiao.getDate() + 1)
  if (muBiao.getTime() - now.getTime() > 48 * 3600 * 1000) return null
  return muBiao
}
