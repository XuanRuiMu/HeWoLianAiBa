import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  redis: { get: vi.fn(), incr: vi.fn(), pexpire: vi.fn(), set: vi.fn(), del: vi.fn() },
  db: { query: vi.fn() },
  realIP: vi.fn(),
  mail: { faSongGaoJing: vi.fn(async () => true) },
  debug: { warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../utils/真实IP', () => ({ huoQuZhenShiIP: 假.realIP }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))
vi.mock('../../utils/邮件告警', () => 假.mail)

import { IP是否被封禁, 清除违规和封禁, 清除所有封禁记录, 获取IP, 记录违规, tiJiaoIPShengSu } from '../IP封禁'

beforeEach(() => {
  vi.clearAllMocks()
  假.realIP.mockReturnValue('::ffff:192.168.1.1')
  假.redis.get.mockResolvedValue(null)
  假.redis.incr.mockResolvedValue(1)
  假.redis.pexpire.mockResolvedValue(1)
  假.redis.set.mockResolvedValue('OK')
  假.redis.del.mockResolvedValue(1)
  假.db.query.mockResolvedValue({ rows: [] })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('IP封禁业务分支', () => {
  it('真实IP归一化和封禁状态覆盖无数据、过期、有效', async () => {
    expect(获取IP({} as never)).toBe('192.168.1.1')
    假.realIP.mockReturnValue('2001:db8::1')
    expect(获取IP({} as never)).toBe('2001:db8::1')
    假.redis.get.mockResolvedValueOnce(null)
    await expect(IP是否被封禁('1.1.1.1')).resolves.toEqual({ 已封禁: false })
    假.redis.get.mockResolvedValueOnce(JSON.stringify({ 解封时间: '2000-01-01T00:00:00.000Z', 原因: '旧' }))
    await expect(IP是否被封禁('1.1.1.1')).resolves.toEqual({ 已封禁: false })
    expect(假.redis.del).toHaveBeenCalledWith('封禁:1.1.1.1')
    假.redis.get.mockResolvedValueOnce(JSON.stringify({ 解封时间: '2999-01-01T00:00:00.000Z', 原因: '活跃' }))
    await expect(IP是否被封禁('1.1.1.1')).resolves.toMatchObject({ 已封禁: true, 原因: '活跃' })
  })

  it('违规阶梯覆盖首次、时长升级、封禁落库和 NAT 告警', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    假.redis.incr.mockResolvedValueOnce(1)
    await expect(记录违规('1.1.1.1')).resolves.toEqual({ 次数: 1, 已封禁: false })
    expect(假.redis.pexpire).toHaveBeenCalled()
    for (const 次数 of [2, 3, 4, 5, 50]) {
      假.redis.incr.mockResolvedValueOnce(次数)
      const 结果 = await 记录违规(`ip-${次数}`, '原因', '严重')
      expect(结果.次数).toBe(次数)
      expect(结果.已封禁).toBe(true)
      expect(结果.封禁时长).toBeGreaterThan(0)
    }
    expect(假.db.query).toHaveBeenCalled()
    expect(假.mail.faSongGaoJing).toHaveBeenCalled()
    now.mockRestore()
  })

  it('清理、申诉和封禁记录删除覆盖参数校验与数据库失败边界', async () => {
    await 清除违规和封禁('1.1.1.1')
    expect(假.redis.del).toHaveBeenNthCalledWith(1, '违规:1.1.1.1')
    expect(假.redis.del).toHaveBeenNthCalledWith(2, '封禁:1.1.1.1')
    await expect(tiJiaoIPShengSu('1.1.1.1', '   ')).resolves.toMatchObject({ cheng_gong: false })
    假.redis.get.mockResolvedValueOnce(null)
    await expect(tiJiaoIPShengSu('1.1.1.1', '申诉理由')).resolves.toMatchObject({ cheng_gong: false })
    假.redis.get.mockResolvedValueOnce(JSON.stringify({ 解封时间: '2999-01-01T00:00:00.000Z', 原因: '活跃' }))
    await expect(tiJiaoIPShengSu('1.1.1.1', '  申诉理由  ')).resolves.toMatchObject({ cheng_gong: true })
    expect(假.db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO "封禁记录"'), expect.arrayContaining(['IP申诉：申诉理由']))
    await 清除所有封禁记录('1.1.1.1')
    expect(假.db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM "封禁记录"'), ['1.1.1.1'])
  })
})
