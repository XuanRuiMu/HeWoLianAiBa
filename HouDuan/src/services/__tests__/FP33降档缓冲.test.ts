import { beforeEach, describe, expect, it, vi } from 'vitest'

const 存储 = new Map<string, string>()

vi.mock('../../redis', () => ({
  redis: {
    get: vi.fn(async (键: string) => 存储.get(键) ?? null),
    set: vi.fn(async (键: string, 值: string) => {
      存储.set(键, 值)
      return 'OK'
    }),
    del: vi.fn(async (键: string) => {
      存储.delete(键)
      return 1
    }),
  },
}))

vi.mock('../../数据库', () => ({
  数据库: { query: vi.fn(async () => ({ rows: [], rowCount: 0 })) },
}))

vi.mock('../胜利失败条件', () => ({ chuLiYouXiJieShu: vi.fn(async () => null) }))
vi.mock('../好感度缓存', () => ({ jiLuZengLiang: vi.fn(async () => undefined) }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuHaoGanDuBianHua: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
}))

import { 计算确认阶段, huoQuJieDuanMing } from '../好感度'
import { HaoGanDuPeiZhi } from '../../config/好感度配置'

const 用户 = 'u-降档'
const 角色 = 'j-降档'

describe('降档缓冲', () => {
  beforeEach(() => {
    存储.clear()
  })

  it('升档立即生效', async () => {
    expect(await 计算确认阶段(用户, 角色, 300, 420)).toBe('朋友')
    expect(await 计算确认阶段(用户, 角色, 420, 510)).toBe('好友')
  })

  it('单轮掉档不生效，仍显示原阶段', async () => {
    await 计算确认阶段(用户, 角色, 950, 950)
    expect(await 计算确认阶段(用户, 角色, 950, 880)).toBe('深爱')
  })

  it('连续两轮掉档才生效', async () => {
    await 计算确认阶段(用户, 角色, 950, 950)
    expect(await 计算确认阶段(用户, 角色, 950, 880)).toBe('深爱')
    expect(await 计算确认阶段(用户, 角色, 880, 870)).toBe('热恋')
  })

  it('掉档后回升会重置计数', async () => {
    await 计算确认阶段(用户, 角色, 950, 950)
    expect(await 计算确认阶段(用户, 角色, 950, 880)).toBe('深爱')
    expect(await 计算确认阶段(用户, 角色, 880, 905)).toBe('深爱')
    expect(await 计算确认阶段(用户, 角色, 905, 880)).toBe('深爱')
  })

  it('跨多档的暴跌也要连续两轮才降，且第二轮直接落到真实档', async () => {
    await 计算确认阶段(用户, 角色, 950, 950)
    expect(await 计算确认阶段(用户, 角色, 950, 420)).toBe('深爱')
    expect(await 计算确认阶段(用户, 角色, 420, 410)).toBe('朋友')
  })

  it('阈值随配置走：连降轮数取自配置', async () => {
    expect(HaoGanDuPeiZhi.jiangDangQueRenLunShu).toBe(2)
  })

  it('真实分数仍在掉，只是显示阶段被缓冲住', async () => {
    expect(huoQuJieDuanMing(880)).toBe('热恋')
    await 计算确认阶段(用户, 角色, 950, 950)
    expect(await 计算确认阶段(用户, 角色, 950, 880)).toBe('深爱')
    expect(huoQuJieDuanMing(880)).toBe('热恋')
  })

  it('无历史记录时以旧分数所在阶段为基准，同样要连续两轮才降', async () => {
    expect(await 计算确认阶段(用户, 角色, 420, 400)).toBe('朋友')
    expect(await 计算确认阶段(用户, 角色, 400, 390)).toBe('熟悉')
  })

  it('首次就是升档则立即生效', async () => {
    expect(await 计算确认阶段('u-新', 'j-新', 200, 420)).toBe('朋友')
  })
})
