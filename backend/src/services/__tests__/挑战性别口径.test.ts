import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * FP-13 挑战模式性别口径红灯复现。
 * 挑战对局.玩家性别/对象性别 与 角色.性别 是同一语义概念，必须共用同一规范形态；
 * 组别（nan_nv 等）由内部规范形态直接推导，对 API 仍回显展示形态 男/女。
 */

const 语句记录: Array<{ 文本: string; 参数: unknown[] }> = []
let 挑战对局行: Record<string, unknown>[] = []
let 生成入参: Record<string, unknown> = {}

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => {
      语句记录.push({ 文本, 参数 })
      if (文本.includes('SELECT "ID" FROM "挑战对局"')) {
        return { rows: [], rowCount: 0 }
      }
      if (文本.includes('RETURNING "ID", "玩家性别", "对象性别"')) {
        return { rows: 挑战对局行, rowCount: 挑战对局行.length }
      }
      if (文本.includes('FROM "挑战对局"')) {
        return { rows: 挑战对局行, rowCount: 挑战对局行.length }
      }
      if (文本.includes('FROM "挑战积分"')) {
        return { rows: [], rowCount: 0 }
      }
      return { rows: [], rowCount: 1 }
    },
  },
}))

vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../角色生成', () => ({
  shengChengJiaoSe: (canShu: Record<string, unknown>) => {
    生成入参 = canShu
    return { id: 'r1', xing_bie: canShu.xing_bie, ming_zi: '小美' }
  },
  baoCunJiaoSe: vi.fn(async () => undefined),
}))

import { kaiShiTiaoZhan, huoQuDangQianDuiJu, jieSuanTiaoZhanDuiJu } from '../挑战积分'
import { huoQuZuBie } from '../../config/挑战配置'
import { 解析性别 } from '../../utils/性别'

beforeEach(() => {
  语句记录.length = 0
  挑战对局行 = []
  生成入参 = {}
})

function 取插入(片段: string): { 文本: string; 参数: unknown[] } | undefined {
  return 语句记录.find((项) => 项.文本.includes(片段))
}

describe('组别推导', () => {
  it('四种内部规范形态组合各自映射到唯一组别', () => {
    expect(huoQuZuBie('nan', 'nv')).toBe('nan_nv')
    expect(huoQuZuBie('nv', 'nan')).toBe('nv_nan')
    expect(huoQuZuBie('nan', 'nan')).toBe('nan_nan')
    expect(huoQuZuBie('nv', 'nv')).toBe('nv_nv')
  })

  it('展示写法与非规范写法一律经唯一解析入口后再推组别', () => {
    const 归一后 = (值: unknown): 'nan' | 'nv' => 解析性别(值) ?? 'nan'
    expect(huoQuZuBie(归一后('女'), 归一后('nan'))).toBe('nv_nan')
    expect(huoQuZuBie(归一后('female'), 归一后('male'))).toBe('nv_nan')
    expect(huoQuZuBie(归一后('nv'), 归一后('nv'))).toBe('nv_nv')
  })
})

describe('开始挑战', () => {
  it('挑战对局落库的玩家/对象性别必须是内部规范形态', async () => {
    await kaiShiTiaoZhan('u1', 'nv', 'nan')
    const 插入 = 取插入('INSERT INTO "挑战对局"')
    expect(插入, '未捕获到挑战对局 INSERT').toBeDefined()
    expect(插入!.参数[2]).toBe('nv')
    expect(插入!.参数[3]).toBe('nan')
  })

  it('生成角色的性别必须等于对象性别，不得因写法不匹配而反向', async () => {
    await kaiShiTiaoZhan('u1', 'nv', 'nan')
    expect(生成入参.xing_bie).toBe('nan')
    expect(生成入参.mu_biao_xing_bie).toBe('nan')
  })

  it('对象性别为男性时同样不得反向', async () => {
    await kaiShiTiaoZhan('u1', 'nv', 'nv')
    expect(生成入参.xing_bie).toBe('nv')
  })
})

describe('当前对局回显', () => {
  it('库内规范形态 nv 必须回显为展示形态 女', () => {
    挑战对局行 = [
      {
        ID: 'd1',
        角色ID: 'r1',
        玩家性别: 'nv',
        对象性别: 'nan',
        创建时间: '2026-09-19T00:00:00.000Z',
        微信昵称: '小美',
        头像: '',
      },
    ]
    return huoQuDangQianDuiJu('u1').then((jieGuo) => {
      expect(jieGuo).not.toBeNull()
      expect(jieGuo!.wan_jia_xing_bie).toBe('女')
      expect(jieGuo!.dui_xiang_xing_bie).toBe('男')
    })
  })

  it('清洗前的历史展示写法 男/女 必须回显一致（迁移前后行为不变）', async () => {
    挑战对局行 = [
      {
        ID: 'd1',
        角色ID: 'r1',
        玩家性别: '女',
        对象性别: '男',
        创建时间: '2026-09-19T00:00:00.000Z',
        微信昵称: '小美',
        头像: '',
      },
    ]
    const jieGuo = await huoQuDangQianDuiJu('u1')
    expect(jieGuo!.wan_jia_xing_bie).toBe('女')
    expect(jieGuo!.dui_xiang_xing_bie).toBe('男')
  })
})

describe('结算积分', () => {
  it('nv/nan 组合必须计入 nv_nan 组而非 nan_nan', async () => {
    挑战对局行 = [{ ID: 'd1', 玩家性别: 'nv', 对象性别: 'nan' }]
    await jieSuanTiaoZhanDuiJu('u1', 'r1', 'sheng_li_shi_po')
    const 插入 = 取插入('INSERT INTO "挑战积分"')
    expect(插入, '未捕获到挑战积分 INSERT').toBeDefined()
    expect(插入!.参数[1]).toBe('nv_nan')
  })

  it('历史展示写法 女/男 组合同样计入 nv_nan 组', async () => {
    挑战对局行 = [{ ID: 'd1', 玩家性别: '女', 对象性别: '男' }]
    await jieSuanTiaoZhanDuiJu('u1', 'r1', 'sheng_li_shi_po')
    const 插入 = 取插入('INSERT INTO "挑战积分"')
    expect(插入!.参数[1]).toBe('nv_nan')
  })
})
