import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * FP-13 红灯复现：角色读回与落库两处性别口径。
 * 缺陷 A：anIdChaJiaoSeXiangQing 用 `row.性别 === '女' ? 'nv' : 'nan'` 读回，
 *         库内规范写法 nv 被读成 nan。
 * 缺陷 B：baoCunJiaoSe 的 INSERT 用 `xing_bie === 'nan' ? '男' : '女'` 落库，
 *         写入的是展示写法而非内部规范形态 —— 迁移 024 的 CHECK 一旦生效，
 *         这条写入路径会让每次建角色都直接失败，必须先归一。
 */

const 语句记录: Array<{ 文本: string; 参数: unknown[] }> = []
let 角色行: Record<string, unknown> = {}

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => {
      语句记录.push({ 文本, 参数 })
      if (文本.includes('INSERT INTO "角色"')) {
        return { rows: [{ ID: 'r1' }], rowCount: 1 }
      }
      if (文本.includes('FROM "角色"')) {
        return { rows: [角色行], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    },
  },
}))

vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../utils/昵称解析', () => ({
  huoQuNiChengKu: vi.fn(() => ({ nan: ['小刚'], nv: ['小美'] })),
}))

vi.mock('../AI输入准备', () => ({
  baoCunJiaoSeXiaoXi: vi.fn(async () => undefined),
}))

vi.mock('../开场白生成', () => ({
  shengChengKaiChangBai: vi.fn(async () => ({ xiao_xi_lie_biao: [] })),
}))

vi.mock('../开场白概率', () => ({
  jiSuanKaiChangBaiGaiLv: vi.fn(async () => 0),
}))

import { anIdChaJiaoSeXiangQing, baoCunJiaoSe, shengChengJiaoSe } from '../角色生成'

function 取落库性别(对局模式内性别: 'nan' | 'nv'): unknown {
  const 插入 = 语句记录.find((项) => 项.文本.includes('INSERT INTO "角色"'))
  expect(插入, '未捕获到角色 INSERT').toBeDefined()
  // 列顺序：用户ID, 名字, 性别 → 参数下标 2
  void 对局模式内性别
  return 插入!.参数[2]
}

beforeEach(() => {
  语句记录.length = 0
})

describe('角色性别读回', () => {
  it.each([
    ['nv', 'nv'],
    ['女', 'nv'],
    ['female', 'nv'],
    ['nan', 'nan'],
    ['男', 'nan'],
    ['male', 'nan'],
  ])('%s 必须读回为内部规范形态 %s', async (原始, 期望) => {
    角色行 = {
      ID: 'r1',
      名字: '小美',
      性别: 原始,
      年龄: 22,
      爱好: [],
      标签: [],
      世界信息: {},
      MBTI: 'INFP',
      预设类型: 'INFP',
      IE类型: 'I',
      热身类型: '慢热',
      微信昵称: '小美',
      真实姓名: '',
    }
    const jieGuo = await anIdChaJiaoSeXiangQing('r1')
    expect(jieGuo).not.toBeNull()
    expect(jieGuo!.xing_bie).toBe(期望)
  })
})

describe('角色性别落库卡口', () => {
  it('内部形态 nv 落库必须写 nv，禁止写展示文案 女', async () => {
    const jiaoSe = shengChengJiaoSe({ yong_hu_id: 'u1', xing_bie: 'nv' })
    expect(jiaoSe.xing_bie).toBe('nv')
    await baoCunJiaoSe('u1', jiaoSe)
    expect(取落库性别('nv')).toBe('nv')
  })

  it('内部形态 nan 落库必须写 nan，禁止写展示文案 男', async () => {
    const jiaoSe = shengChengJiaoSe({ yong_hu_id: 'u1', xing_bie: 'nan' })
    await baoCunJiaoSe('u1', jiaoSe)
    expect(取落库性别('nan')).toBe('nan')
  })

  it('落库值只能是迁移 024 CHECK 允许的二值集合', async () => {
    for (const 形态 of ['nv', 'nan'] as const) {
      语句记录.length = 0
      const jiaoSe = shengChengJiaoSe({ yong_hu_id: 'u1', xing_bie: 形态 })
      await baoCunJiaoSe('u1', jiaoSe)
      expect(['nan', 'nv']).toContain(取落库性别(形态))
    }
  })
})
