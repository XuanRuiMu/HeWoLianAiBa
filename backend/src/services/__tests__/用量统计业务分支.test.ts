import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({ db: { query: vi.fn() }, redis: { hincrby: vi.fn(), expire: vi.fn(), hgetall: vi.fn() }, debug: { error: vi.fn() } }))
vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import { huoQuJinRiHuiZong, jiLuShiYongLiang } from '../用量统计'

beforeEach(() => {
  vi.clearAllMocks()
  假.redis.hincrby.mockResolvedValue(1)
  假.redis.expire.mockResolvedValue(1)
  假.redis.hgetall.mockResolvedValue({})
  假.db.query.mockResolvedValue({ rows: [] })
})

describe('用量统计业务分支', () => {
  it('记录用量覆盖零值、归一化、Redis和PG异常', async () => {
    await expect(jiLuShiYongLiang({ moXingLeiXing: '模型', moXing: 'x', shuRuToken: 0, shuChuToken: 0, zongToken: 0 })).resolves.toBeUndefined()
    await jiLuShiYongLiang({ moXingLeiXing: '模型', moXing: 'x', shuRuToken: 1.9, shuChuToken: Number.NaN, zongToken: 0, mingZhongToken: 99 })
    假.redis.hincrby.mockRejectedValueOnce(new Error('redis'))
    await expect(jiLuShiYongLiang({ moXingLeiXing: '模型', moXing: 'x', shuRuToken: 1, shuChuToken: 1, zongToken: 2 })).resolves.toBeUndefined()
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await expect(jiLuShiYongLiang({ moXingLeiXing: '模型', moXing: 'x', shuRuToken: 1, shuChuToken: 1, zongToken: 2 })).resolves.toBeUndefined()
  })

  it('汇总覆盖Redis命中、坏键、PG回退和两侧异常', async () => {
    假.redis.hgetall.mockResolvedValueOnce({ '模型|x:ci_shu': '2', '模型|x:shu_ru': '3', '模型|x:shu_chu': '4', '模型|x:zong': '7', '模型|x:ming_zhong': '1', '坏键': '1', '空|模型:未知': '1' })
    await expect(huoQuJinRiHuiZong('2026-01-01')).resolves.toHaveLength(1)
    假.redis.hgetall.mockResolvedValueOnce({})
    假.db.query.mockResolvedValueOnce({ rows: [{ 模型类型: '模型', 模型: 'x', 次数: 1, 输入Token: 2, 输出Token: 3, 总Token: 5, 缓存命中Token: 1 }] })
    await expect(huoQuJinRiHuiZong('2026-01-01')).resolves.toHaveLength(1)
    假.redis.hgetall.mockRejectedValueOnce(new Error('redis'))
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await expect(huoQuJinRiHuiZong()).resolves.toEqual([])
  })
})
