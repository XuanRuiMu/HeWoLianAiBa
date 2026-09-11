import { describe, it, expect, afterAll } from 'vitest'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { peiZhi } from '../config'
import {
  qingLiGuoQiShenJiRiZhi,
  tingZhiShenJiRiZhiGuiDang,
} from '../services/审计日志归档'

describe('C6 审计日志定期归档删除', () => {
  it('保留期配置≥6个月', () => {
    expect(peiZhi.shenJiRiZhiBaoLiuTian).toBeGreaterThanOrEqual(183)
  })

  it('超期条目被删除，保留期内条目可追溯', async () => {
    // 写入一条「200天前」的超期日志与一条「1天前」的保留日志
    const chaoQi = await 数据库.query(
      `INSERT INTO "审计日志" ("IP", "事件类型", "类型", "创建时间")
       VALUES ('192.0.2.10', 'C6归档超期测试', '普通', NOW() - ($1 || ' days')::interval)
       RETURNING "ID"`,
      ['200'],
    )
    const baoLiu = await 数据库.query(
      `INSERT INTO "审计日志" ("IP", "事件类型", "类型", "创建时间")
       VALUES ('192.0.2.11', 'C6归档保留测试', '普通', NOW() - '1 day'::interval)
       RETURNING "ID"`,
    )
    const chaoQiId = String(chaoQi.rows[0].ID)
    const baoLiuId = String(baoLiu.rows[0].ID)

    try {
      const shanChuShu = await qingLiGuoQiShenJiRiZhi()
      expect(shanChuShu).toBeGreaterThan(0)

      const chaoQiChaXun = await 数据库.query(`SELECT 1 FROM "审计日志" WHERE "ID" = $1`, [chaoQiId])
      expect(chaoQiChaXun.rows.length).toBe(0)

      const baoLiuChaXun = await 数据库.query(`SELECT "事件类型" FROM "审计日志" WHERE "ID" = $1`, [baoLiuId])
      expect(baoLiuChaXun.rows.length).toBe(1)
      expect(baoLiuChaXun.rows[0].事件类型).toBe('C6归档保留测试')
    } finally {
      await 数据库.query(`DELETE FROM "审计日志" WHERE "ID" = $1`, [baoLiuId])
      await 数据库.query(`DELETE FROM "审计日志" WHERE "ID" = $1`, [chaoQiId])
      await 数据库.query(`DELETE FROM "审计日志" WHERE "事件类型" LIKE 'C6归档%'`)
    }
  })

  afterAll(async () => {
    tingZhiShenJiRiZhiGuiDang()
    await 数据库.end()
    await redis.quit()
  })
})
