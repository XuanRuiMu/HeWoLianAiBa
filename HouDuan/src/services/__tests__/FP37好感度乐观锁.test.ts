import { beforeEach, describe, expect, it, vi } from 'vitest'

const 状态 = vi.hoisted(() => ({
  总分: 400,
  信任: 140,
  亲密: 100,
  趣味: 80,
  关怀: 80,
  写次数: 0,
}))

vi.mock('../../数据库', () => ({
  数据库: {
    query: vi.fn(async (wen: string, can?: unknown[]) => {
      if (wen.includes('SELECT * FROM "好感度"')) {
        return {
          rows: [{
            总分: 状态.总分,
            信任度: 状态.信任,
            亲密度: 状态.亲密,
            趣味度: 状态.趣味,
            关怀度: 状态.关怀,
            关系阶段: '熟悉',
            互动次数: 4,
          }],
          rowCount: 1,
        }
      }
      if (wen.includes('SELECT "对局模式"')) {
        return { rows: [{ 对局模式: 'tiaozhan' }], rowCount: 1 }
      }
      if (wen.includes('UPDATE "好感度"')) {
        const 期望旧分 = Number(can?.[8])
        if (期望旧分 !== 状态.总分) return { rows: [], rowCount: 0 }
        状态.总分 = Number(can?.[0])
        状态.信任 = Number(can?.[1])
        状态.写次数 += 1
        return {
          rows: [{ 总分: 状态.总分, 信任度: 状态.信任, 亲密度: 状态.亲密, 趣味度: 状态.趣味, 关怀度: 状态.关怀, 互动次数: 5 }],
          rowCount: 1,
        }
      }
      return { rows: [], rowCount: 1 }
    }),
  },
}))

vi.mock('../../redis', () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    lpush: vi.fn(async () => 1),
    ltrim: vi.fn(async () => 'OK'),
    pexpire: vi.fn(async () => 1),
  },
}))

vi.mock('../胜利失败条件', () => ({ chuLiYouXiJieShu: vi.fn(async () => null) }))
vi.mock('../好感度缓存', () => ({ jiLuZengLiang: vi.fn(async () => undefined) }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuHaoGanDuBianHua: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
}))

import { gengXinHaoGanDu } from '../好感度'

describe('好感度乐观锁防并发丢失', () => {
  beforeEach(() => {
    状态.总分 = 400
    状态.信任 = 140
    状态.亲密 = 100
    状态.趣味 = 80
    状态.关怀 = 80
    状态.写次数 = 0
  })

  it('UPDATE 带旧分条件，分数被并发改动时重试而不是覆盖丢失', async () => {
    const 结果 = await gengXinHaoGanDu('u-1', 'j-1', {
      xin_ren_du_bian_hua: 10,
      qin_mi_du_bian_hua: 0,
      qu_wei_du_bian_hua: 0,
      guan_huai_du_bian_hua: 0,
    })
    expect(结果.cheng_gong).toBe(true)
    expect(状态.总分).toBeGreaterThan(400)
    expect(状态.写次数).toBeGreaterThanOrEqual(1)
  })

  it('乐观锁条件使用读取时的总分', async () => {
    const { 数据库 } = await import('../../数据库')
    await gengXinHaoGanDu('u-1', 'j-1', {
      xin_ren_du_bian_hua: 10,
      qin_mi_du_bian_hua: 0,
      qu_wei_du_bian_hua: 0,
      guan_huai_du_bian_hua: 0,
    })
    const 更新调用 = vi.mocked(数据库.query).mock.calls.find((c) => String(c[0]).includes('UPDATE "好感度"'))
    expect(更新调用).toBeDefined()
    expect(Number(更新调用![1]?.[8])).toBe(400)
  })
})
