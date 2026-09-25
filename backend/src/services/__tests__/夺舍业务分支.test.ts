import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn(), expire: vi.fn(), keys: vi.fn() },
  db: { query: vi.fn() },
  debug: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import { duoSheXinTiao, huoQuDuoSheGuanLiYuan, huoQuDuoSheXinTiaoGeMiao, huoQuDuoSheZuYueMiao, huoQuJiaoSeYongHuId, jiLuDuoShe, jieShuDuoShe, jiaoSeShiFouBeiDuoShe, shanChuDuoSheZhuangTai, sheZhiDuoSheZhuangTai, shiFangGuanLiYuanQuanBuDuoShe } from '../夺舍'

beforeEach(() => {
  vi.clearAllMocks()
  假.redis.get.mockResolvedValue(null)
  假.redis.set.mockResolvedValue('OK')
  假.redis.del.mockResolvedValue(1)
  假.redis.expire.mockResolvedValue(1)
  假.redis.keys.mockResolvedValue([])
  假.db.query.mockResolvedValue({ rows: [] })
})

describe('夺舍租约业务分支', () => {
  it('设置租约覆盖空闲、抢占、审计失败回滚和心跳', async () => {
    await expect(sheZhiDuoSheZhuangTai('角色', '管理')).resolves.toEqual({ cheng_gong: true, qiang_zhan: false })
    假.redis.get.mockResolvedValueOnce('旧管理')
    await expect(sheZhiDuoSheZhuangTai('角色', '管理')).resolves.toMatchObject({ qiang_zhan: true })
    假.db.query.mockRejectedValueOnce(new Error('落库失败'))
    await expect(sheZhiDuoSheZhuangTai('角色', '管理')).rejects.toThrow('夺舍落库失败')
    假.redis.get.mockResolvedValueOnce('管理')
    await expect(duoSheXinTiao('角色', '管理')).resolves.toBe(true)
    假.redis.get.mockResolvedValueOnce('其他')
    await expect(duoSheXinTiao('角色', '管理')).resolves.toBe(false)
    expect(await huoQuDuoSheZuYueMiao()).toBe(300)
    expect(await huoQuDuoSheXinTiaoGeMiao()).toBe(60)
  })

  it('释放、查询、角色归属和审计结束覆盖空值与异常', async () => {
    await shanChuDuoSheZhuangTai('角色')
    expect(假.redis.del).toHaveBeenCalledTimes(2)
    假.redis.keys.mockResolvedValueOnce(['夺舍:角色', '夺舍:xin_tiao:角色'])
    假.redis.get.mockResolvedValueOnce('管理')
    await expect(shiFangGuanLiYuanQuanBuDuoShe('管理')).resolves.toEqual(['角色'])
    假.redis.keys.mockRejectedValueOnce(new Error('redis'))
    await expect(shiFangGuanLiYuanQuanBuDuoShe('管理')).resolves.toEqual([])
    假.redis.get.mockResolvedValueOnce('管理')
    await expect(huoQuDuoSheGuanLiYuan('角色')).resolves.toBe('管理')
    假.redis.get.mockResolvedValueOnce('管理')
    await expect(jiaoSeShiFouBeiDuoShe('角色')).resolves.toBe(true)
    假.db.query.mockResolvedValueOnce({ rows: [{ 用户ID: '用户' }] })
    await expect(huoQuJiaoSeYongHuId('角色')).resolves.toBe('用户')
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(huoQuJiaoSeYongHuId('角色')).resolves.toBeNull()
    await jiLuDuoShe('管理', '角色')
    假.redis.get.mockResolvedValueOnce('其他')
    await expect(jieShuDuoShe('管理', '角色')).resolves.toBe(false)
    假.redis.get.mockResolvedValueOnce('管理')
    await expect(jieShuDuoShe('管理', '角色')).resolves.toBe(true)
  })
})
