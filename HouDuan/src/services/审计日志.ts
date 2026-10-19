import { 数据库 } from '../数据库'
import { yinBiMinGanZiDuan } from '../utils/掩码'
import type { ShenJiRiZhi } from '../types'

export async function jiLuShenJiRiZhi(riZhi: ShenJiRiZhi): Promise<void> {
  // C8：写入前对详情中的手机号等敏感字段做掩码，日志不落完整明文手机号
  const anQuanXiangQing = riZhi.xiang_qing
    ? yinBiMinGanZiDuan(riZhi.xiang_qing as Record<string, unknown>)
    : null
  await 数据库.query(
    `INSERT INTO "审计日志" ("用户ID", "IP", "事件类型", "详情", "类型")
     VALUES ($1, $2, $3, $4, $5)`,
    [
      riZhi.yong_hu_id || null,
      riZhi.ip,
      riZhi.shi_jian_lei_xing,
      anQuanXiangQing ? JSON.stringify(anQuanXiangQing) : null,
      riZhi.lei_xing || '普通',
    ],
  )
}
