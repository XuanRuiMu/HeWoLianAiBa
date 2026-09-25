import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  redis: { lpush: vi.fn(), ltrim: vi.fn(), pexpire: vi.fn(), lrange: vi.fn(), get: vi.fn(), set: vi.fn(), incr: vi.fn() },
  db: { query: vi.fn() },
  debug: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import { huoQuZengLiangQuXian, jiLuZengLiang, jiSuanMuBiaoQuXian, jiSuanXiShu, yingYongHuiHuaBaoDi } from '../好感度缓存'

const 变化 = { xin_ren_du_bian_hua: 1, qin_mi_du_bian_hua: 2, qu_wei_du_bian_hua: 3, guan_huai_du_bian_hua: 4, li_you: '理由' }

beforeEach(() => {
  vi.clearAllMocks()
  假.redis.lpush.mockResolvedValue(1)
  假.redis.ltrim.mockResolvedValue('OK')
  假.redis.pexpire.mockResolvedValue(1)
  假.redis.lrange.mockResolvedValue([])
  假.redis.get.mockResolvedValue(null)
  假.redis.set.mockResolvedValue('OK')
  假.redis.incr.mockResolvedValue(1)
  假.db.query.mockResolvedValue({ rows: [] })
})

describe('好感度缓存业务分支', () => {
  it('目标曲线、增量写入和缓存系数覆盖空数据、异常与达标', async () => {
    expect(jiSuanMuBiaoQuXian(100, 0)).toBeGreaterThan(0)
    await jiLuZengLiang('用户', '角色', 10, 5, 1, 3)
    假.redis.lpush.mockRejectedValueOnce(new Error('redis'))
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await expect(jiLuZengLiang('用户', '角色', 10, 5, 2, 3)).resolves.toBeUndefined()
    expect(假.debug.error).toHaveBeenCalled()
    await expect(jiSuanXiShu('用户', '角色', 100, 0)).resolves.toMatchObject({ xiShu: 1 })
    假.redis.lrange.mockResolvedValueOnce([JSON.stringify({ shuaiJianHouZengLiang: 1, lianXu: 4 })])
    await expect(jiSuanXiShu('用户', '角色', 100, 0)).resolves.toMatchObject({ xiShu: 2.1, lianXuWeiDaBiao: 5 })
    假.redis.lrange.mockRejectedValueOnce(new Error('redis'))
    await expect(jiSuanXiShu('用户', '角色', 100, 0)).resolves.toMatchObject({ xiShu: 1 })
  })

  it('回底曲线覆盖触发、累计、类别跃迁和 Redis 故障', async () => {
    假.redis.get.mockResolvedValueOnce('5')
    await expect(yingYongHuiHuaBaoDi('会话', 变化)).resolves.toMatchObject({ xin_ren_du_bian_hua: 1 })
    假.redis.get.mockResolvedValueOnce('0')
    假.redis.incr.mockResolvedValueOnce(1)
    await expect(yingYongHuiHuaBaoDi('会话', { ...变化, xin_ren_du_bian_hua: 20 })).resolves.toMatchObject({ xin_ren_du_bian_hua: 20 })
    假.redis.get.mockResolvedValueOnce('0')
    await expect(yingYongHuiHuaBaoDi('会话', { ...变化, xin_ren_du_bian_hua: -20 })).resolves.toMatchObject({ xin_ren_du_bian_hua: -20 })
    假.redis.get.mockRejectedValueOnce(new Error('redis'))
    await expect(yingYongHuiHuaBaoDi('会话', 变化)).resolves.toEqual(变化)
  })

  it('读取增量曲线过滤坏 JSON并返回当前系数', async () => {
    假.redis.lrange.mockResolvedValueOnce(['坏数据', JSON.stringify({ shuaiJianHouZengLiang: 2 })])
    await expect(huoQuZengLiangQuXian('用户', '角色', 100, 1)).resolves.toMatchObject({ lieBiao: [{ shuaiJianHouZengLiang: 2 }], dangQianXiShu: 1 })
  })
})
