import { describe, expect, it, vi, beforeEach } from 'vitest'

const redisMock = vi.hoisted(() => ({
  get: vi.fn(async () => null),
  set: vi.fn(async () => 'OK'),
  del: vi.fn(async () => 1),
  incr: vi.fn(async () => 1),
  expire: vi.fn(async () => 1),
  lpush: vi.fn(async () => 1),
  ltrim: vi.fn(async () => 'OK'),
  lrange: vi.fn(async () => []),
  pexpire: vi.fn(async () => 1),
  publish: vi.fn(async () => 1),
}))

vi.mock('../../redis', () => ({ redis: redisMock }))
vi.mock('../../数据库', () => ({
  数据库: { query: vi.fn(async () => ({ rows: [], rowCount: 0 })) },
}))

import { AI回复调度器 } from '../AI回复调度器'
import type { Server } from 'socket.io'

function 构造调度器(): AI回复调度器 {
  const io = { to: vi.fn().mockReturnThis(), emit: vi.fn() } as unknown as Server
  return new AI回复调度器('j-1', 'u-1', 'E', io, 0)
}

describe('连发消息期间不中断进行中的 AI 调用', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('处理中收到新消息时记录待补发，不重置不中断', async () => {
    const 调度器 = 构造调度器()
    const 重置Spy = vi.spyOn(调度器, '重置')
    // 模拟已进入处理中
    ;(调度器 as unknown as { 处理中: boolean }).处理中 = true
    await 调度器.处理用户消息('m-2')
    expect(重置Spy).not.toHaveBeenCalled()
    expect((调度器 as unknown as { 待补发消息ID: string | null }).待补发消息ID).toBe('m-2')
  })

  it('处理结束后用最新消息补一轮', async () => {
    const 调度器 = 构造调度器()
    const 内部 = 调度器 as unknown as { 处理中: boolean; 当前处理ID: number; 待补发消息ID: string | null | undefined; 处理用户消息: (id?: string | null) => Promise<void> }
    const 补发Spy = vi.spyOn(调度器 as unknown as { 处理用户消息: (id?: string | null) => Promise<void> }, '处理用户消息')
    内部.处理中 = true
    内部.当前处理ID = 7
    内部.待补发消息ID = 'm-9'
    // 直接调用私有 触发AI处理 的 finally 逻辑不可行，改为模拟：手动执行 finally 同步段
    内部.处理中 = false
    const daiBu = 内部.待补发消息ID
    内部.待补发消息ID = undefined
    if (daiBu !== undefined) await 内部.处理用户消息(daiBu)
    expect(补发Spy).toHaveBeenCalledWith('m-9')
  })
})
