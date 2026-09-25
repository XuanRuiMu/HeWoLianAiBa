import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  db: { query: vi.fn() },
  log: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../utils/日志引擎', () => ({ 日志引擎: 假.log }))

import { qingLiGuoQiLiaoTianJiLu, qingLiGuoQiTongZhi, qiDongShuJuBaoCunQingLiDingShiQi, tingZhiShuJuBaoCunQingLi, zhiXingShuJuBaoCunQiXianQingLi } from '../数据保存期限'

beforeEach(() => {
  vi.clearAllMocks()
  假.db.query.mockResolvedValue({ rowCount: 0 })
})

afterEach(() => {
  vi.useRealTimers()
  tingZhiShuJuBaoCunQingLi()
})

describe('数据保存期限业务分支', () => {
  it('聊天和通知分批清理覆盖满批、未满批和总量', async () => {
    假.db.query.mockResolvedValueOnce({ rowCount: 5000 }).mockResolvedValueOnce({ rowCount: 2 })
    await expect(qingLiGuoQiLiaoTianJiLu()).resolves.toBe(5002)
    假.db.query.mockResolvedValueOnce({ rowCount: 0 })
    await expect(qingLiGuoQiTongZhi()).resolves.toBe(0)
    假.db.query.mockResolvedValue({ rowCount: 1 })
    await expect(zhiXingShuJuBaoCunQiXianQingLi()).resolves.toEqual({ liaoTian: 1, tongZhi: 1 })
    expect(假.log.info).toHaveBeenCalled()
  })

  it('定时器启动具备幂等性，执行成功和失败都可停止', async () => {
    vi.useFakeTimers()
    qiDongShuJuBaoCunQingLiDingShiQi()
    qiDongShuJuBaoCunQingLiDingShiQi()
    await vi.advanceTimersByTimeAsync(60 * 1000)
    tingZhiShuJuBaoCunQingLi()
    假.db.query.mockRejectedValue(new Error('db'))
    qiDongShuJuBaoCunQingLiDingShiQi()
    await vi.advanceTimersByTimeAsync(60 * 1000)
    tingZhiShuJuBaoCunQingLi()
    expect(假.log.error).toHaveBeenCalled()
  })
})
