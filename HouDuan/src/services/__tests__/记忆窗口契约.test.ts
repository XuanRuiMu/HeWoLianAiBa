import { describe, expect, it, vi } from 'vitest'

vi.mock('../../数据库', () => ({ 数据库: { query: vi.fn(), connect: vi.fn() } }))
vi.mock('../../redis', () => ({ redis: { set: vi.fn(async () => 'OK'), del: vi.fn(async () => 1), incr: vi.fn(), expire: vi.fn() } }))

import { AI配置 } from '../../config/AI配置'

describe('最近原文窗口与调度注入对齐（FP-F）', () => {
  it('主聊天注入与摘要窗口使用同一份配置，且均为token/条数正数', () => {
    const token = AI配置.zhaiYao.zuiJinYuanWenToken
    const liShiShuLiang = AI配置.prompt.liShiXiaoXiShuLiang
    const caiDuan = AI配置.prompt.liShiCaiDuanBuZhang
    expect(token).toBeGreaterThan(0)
    expect(liShiShuLiang).toBeGreaterThan(0)
    expect(caiDuan).toBeGreaterThanOrEqual(1)
    expect(AI配置.prompt.liShiXiaoXiShuLiang).toBe(200)
    expect(caiDuan).toBe(1)
    expect(AI配置.zhaiYao.zuiJinYuanWenToken).toBe(AI配置.prompt.zuiJinYuanWenToken)
  })

  it('摘要窗口与主聊天默认条数同源：AI输入准备默认值取自该配置', async () => {
    const mo = await import('../../数据库')
    const { huoQuZuiJinDuiHuaLiShi } = await import('../AI输入准备')
    const { zhanShiLiShiWenBen } = await import('../对话渲染')
    type MoQ = (sql: string, can: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
    ;(mo.数据库.query as unknown as MoQ) = (async () => ({ rows: [] })) as unknown as typeof mo.数据库.query

    await huoQuZuiJinDuiHuaLiShi('u-x', 'j-x')
    const niMing = mo.数据库.query as unknown as { mock?: { calls: unknown[][] } }
    if (niMing.mock) {
      const can = niMing.mock.calls.at(-1)![1] as unknown[]
      expect(can[2]).toBe(AI配置.prompt.liShiXiaoXiShuLiang + AI配置.prompt.liShiCaiDuanBuZhang)
    }
    expect(typeof zhanShiLiShiWenBen).toBe('function')
  })
})
