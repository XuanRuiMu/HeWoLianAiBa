import { describe, expect, it, vi, beforeEach } from 'vitest'

const { 数据库桩 } = vi.hoisted(() => ({ 数据库桩: { query: vi.fn() } }))

vi.mock('../../数据库', () => ({ 数据库: 数据库桩 }))

vi.mock('../../socket/io', () => ({
  huoQuIo: vi.fn(() => null),
  sheZhiIo: vi.fn(),
}))

vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuYouXiJieJu: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
}))

import { huoQuTongYiFuWuQiShiJianHaoMiao } from '../消息'

describe('消息路由服务器时间统一读取', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('统一读取返回有限正数毫秒时间戳', () => {
    const zhi = huoQuTongYiFuWuQiShiJianHaoMiao()
    expect(Number.isFinite(zhi)).toBe(true)
    expect(zhi).toBeGreaterThan(0)
  })

  it('不查库、不依赖数据库连接', () => {
    huoQuTongYiFuWuQiShiJianHaoMiao()
    expect(数据库桩.query).not.toHaveBeenCalled()
  })
})
