import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisGet = vi.fn(async (_key: string) => null)
const redisSet = vi.fn(async () => 'OK')
const redisDel = vi.fn(async () => 1)

vi.mock('../../redis', () => ({
  redis: {
    get: redisGet,
    set: redisSet,
    del: redisDel,
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
  },
}))

vi.mock('../../数据库', () => ({
  数据库: {
    query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
    connect: vi.fn(),
    on: vi.fn(),
  },
}))

vi.mock('../胜利失败条件', () => ({
  jianCeYongHuXiaoXiBingChuLi: vi.fn(async () => null),
  chuLiAIHuiFuHouJieShuJianCha: vi.fn(async () => null),
  chuLiYouXiJieShu: vi.fn(async () => null),
  结算暂存神经病: vi.fn(async () => null),
}))

vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuHaoGanDuBianHua: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
}))

import * as fs from 'node:fs'
import * as path from 'node:path'

describe('等待表白状态不递归（Redis 风暴回归）', () => {
  beforeEach(() => {
    redisGet.mockClear()
    redisSet.mockClear()
    redisDel.mockClear()
    redisGet.mockResolvedValue(null)
  })

  it('源码里异步确认内部只调内存版，绝不回调自身或异步回源', () => {
    const 源 = fs.readFileSync(path.resolve(__dirname, '../../services/AI回复调度器.ts'), 'utf8')
    const 匹配 = 源.match(/private async 异步确认等待表白状态\([\s\S]*?\n  \}/)
    expect(匹配).not.toBeNull()
    const 函数体 = 匹配![0]
    expect(函数体).toContain('this.内存中是否等待表白回复()')
    expect(函数体).not.toContain('this.异步确认等待表白状态()')
    expect(函数体).not.toContain('this.异步回源等待表白状态()')
    expect(函数体).not.toContain('this.是否等待表白回复()')
  })

  it('源码里不存在 fire-and-forget 的回源函数', () => {
    const 源 = fs.readFileSync(path.resolve(__dirname, '../../services/AI回复调度器.ts'), 'utf8')
    expect(源).not.toContain('private 异步回源等待表白状态')
  })

  it('同步判定只查内存，不触发任何 Redis 调用', () => {
    const 源 = fs.readFileSync(path.resolve(__dirname, '../../services/AI回复调度器.ts'), 'utf8')
    const 匹配 = 源.match(/private 是否等待表白回复\([\s\S]*?\n  \}/)
    expect(匹配).not.toBeNull()
    expect(匹配![0]).not.toContain('redis.')
  })
})
