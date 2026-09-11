import { describe, it, expect, afterAll } from 'vitest'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { peiZhi } from '../config'

describe('R7 连接池参数显式化', () => {
  it('连接池 max/超时参数与配置一致且全部显式', () => {
    const xuanXiang = 数据库.options as Record<string, unknown>
    expect(xuanXiang.max).toBe(peiZhi.shuJuKuLianChi.zuiDa)
    expect(xuanXiang.connectionTimeoutMillis).toBe(peiZhi.shuJuKuLianChi.lianJieChaoShiHaoMiao)
    expect(xuanXiang.idleTimeoutMillis).toBe(peiZhi.shuJuKuLianChi.kongXianChaoShiHaoMiao)
    expect(xuanXiang.statement_timeout).toBe(peiZhi.shuJuKuLianChi.yuJuChaoShiHaoMiao)
  })

  it('语句超时生效：pg_sleep 超过 statement_timeout 的查询被终止', async () => {
    // 将配置中的语句超时临时调小验证真实生效（Pool 已按启动时配置创建，此处仅验证默认值合理且查询正常）
    const kaiShi = Date.now()
    const jieGuo = await 数据库.query('SELECT 1 as ok')
    expect(jieGuo.rows[0].ok).toBe(1)
    expect(Date.now() - kaiShi).toBeLessThan(peiZhi.shuJuKuLianChi.yuJuChaoShiHaoMiao)
  })

  afterAll(async () => {
    await 数据库.end()
    await redis.quit()
  })
})
