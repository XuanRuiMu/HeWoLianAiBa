import { 数据库 } from '../数据库'
import type { ShenJiRiZhi } from '../types'

export async function jiLuShenJiRiZhi(riZhi: ShenJiRiZhi): Promise<void> {
  await 数据库.query(
    `INSERT INTO "审计日志" ("用户ID", "IP", "事件类型", "详情", "类型")
     VALUES ($1, $2, $3, $4, $5)`,
    [
      riZhi.yong_hu_id || null,
      riZhi.ip,
      riZhi.shi_jian_lei_xing,
      riZhi.xiang_qing ? JSON.stringify(riZhi.xiang_qing) : null,
      riZhi.lei_xing || '普通',
    ],
  )
}
