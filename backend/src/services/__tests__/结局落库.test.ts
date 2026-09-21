import { describe, it, expect, vi, beforeEach } from 'vitest'

const 语句记录: Array<{ 文本: string; 参数: unknown[] }> = []
let 角色性别列: unknown = 'nv'
let 提供事务连接 = false
let 性别查询抛错 = false

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => {
      语句记录.push({ 文本, 参数 })
      if (文本.includes('SELECT "性别"')) {
        if (性别查询抛错) throw new Error('炸库')
        return { rows: [{ 性别: 角色性别列 }], rowCount: 1 }
      }
      if (文本.includes('SELECT "名字"')) {
        return { rows: [{ 名字: '小美', 是否渣型: true }], rowCount: 1 }
      }
      if (文本.includes('SELECT "总分"')) {
        return { rows: [{ 总分: 12, 关系阶段: '认识' }], rowCount: 1 }
      }
      if (文本.includes('COUNT(*)')) return { rows: [{ shu: 3 }], rowCount: 1 }
      if (文本.includes('SELECT "ID" FROM "游戏档案"')) return { rows: [], rowCount: 0 }
      return { rows: [], rowCount: 1 }
    },
    get connect() {
      if (!提供事务连接) return undefined
      return async () => ({
        query: async (文本: string, 参数: unknown[] = []) => {
          语句记录.push({ 文本, 参数 })
          return { rows: [], rowCount: 1 }
        },
        release: () => undefined,
      })
    },
  },
}))

vi.mock('../../redis', () => ({ redis: { set: vi.fn(), del: vi.fn() } }))
vi.mock('../../socket/io', () => ({ huoQuIo: () => null }))
vi.mock('../../utils/DeepSeek客户端', () => ({ genJuPeiZhiTiaoYong: vi.fn() }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  jiLuYouXiJieJu: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
}))
vi.mock('../../config/AI参数策略', () => ({ gouJianJiaoSeShangXiaWen: vi.fn() }))
vi.mock('../AI视觉辅助', () => ({
  gouJianDanTiaoTuXiangKuai: vi.fn(),
  meiTiZhanShiWenBen: vi.fn(),
  shiTuXiangLeiBie: vi.fn(),
}))
vi.mock('../AI输入准备', () => ({ baoCunJiaoSeXiaoXi: vi.fn() }))
vi.mock('../好感度', () => ({
  gengXinHaoGanDu: vi.fn(),
  huoQuWanZhengHaoGanDu: vi.fn(),
}))
vi.mock('../挑战积分', () => ({ jieSuanTiaoZhanDuiJu: vi.fn() }))
vi.mock('../Prompt构建器', () => ({ baoZhuangYongHuNeiRong: (值: string) => 值 }))

import { chuLiYouXiJieShu } from '../胜利失败条件'
import { jiLuYouXiJieJu } from '../../utils/debug日志'

function 取语句(片段: string): { 文本: string; 参数: unknown[] } | undefined {
  return 语句记录.find((记录) => 记录.文本.includes(片段))
}

const 用户ID = '11111111-1111-4111-8111-111111111111'
const 角色ID = '22222222-2222-4222-8222-222222222222'

beforeEach(() => {
  语句记录.length = 0
  角色性别列 = 'nv'
  提供事务连接 = false
  性别查询抛错 = false
  vi.mocked(jiLuYouXiJieJu).mockClear()
})

describe('结局落库改存枚举键', () => {
  it('三处写入的参数都是枚举键而非展示文案', async () => {
    await chuLiYouXiJieShu(用户ID, 角色ID, 'shi_bai_bei_qi_pian')

    const 角色更新 = 取语句('UPDATE "角色" SET "封存"')
    expect(角色更新?.参数).toEqual([true, false, 'shi_bai_bei_qi_pian', 角色ID])

    const 结局写入 = 取语句('INSERT INTO "游戏结局"')
    expect(结局写入?.参数?.slice(0, 3)).toEqual([用户ID, 角色ID, 'shi_bai_bei_qi_pian'])

    const 档案写入 = 取语句('INSERT INTO "游戏档案"')
    expect(档案写入?.参数?.[4]).toBe('shi_bai_bei_qi_pian')
  })

  it('事务分支内两份重复写入同样存枚举键', async () => {
    提供事务连接 = true
    await chuLiYouXiJieShu(用户ID, 角色ID, 'shi_bai_bei_zha_xing_qi_pian')

    const 角色更新 = 取语句('UPDATE "角色" SET "封存"')
    expect(角色更新?.参数).toEqual([true, false, 'shi_bai_bei_zha_xing_qi_pian', 角色ID])
    const 结局写入 = 取语句('INSERT INTO "游戏结局"')
    expect(结局写入?.参数?.slice(0, 3)).toEqual([
      用户ID,
      角色ID,
      'shi_bai_bei_zha_xing_qi_pian',
    ])
    const 档案写入 = 取语句('INSERT INTO "游戏档案"')
    expect(档案写入?.参数?.[4]).toBe('shi_bai_bei_zha_xing_qi_pian')
  })

  it('落库值再不会被文案污染', async () => {
    await chuLiYouXiJieShu(用户ID, 角色ID, 'shi_bai_bei_qi_pian')
    for (const 记录 of 语句记录) {
      for (const 参数 of 记录.参数) {
        expect(参数).not.toBe('被渣型骗了')
        expect(参数).not.toBe('被渣女骗了')
      }
    }
  })

  it('日志与游戏结束事件记录枚举，返回体才带渲染文案', async () => {
    const 结果 = await chuLiYouXiJieShu(用户ID, 角色ID, 'shi_bai_bei_qi_pian')
    expect(jiLuYouXiJieJu).toHaveBeenCalledWith(用户ID, 角色ID, 'shi_bai_bei_qi_pian')
    expect(结果.jie_guo_lei_xing).toBe('shi_bai_bei_qi_pian')
    expect(结果.zhuang_tai_wen_ben).toBe('被渣女骗了')
  })
})

describe('结局文案按角色性别渲染', () => {
  it('角色性别 nv 出渣女', async () => {
    角色性别列 = 'nv'
    const 结果 = await chuLiYouXiJieShu(用户ID, 角色ID, 'shi_bai_bei_qi_pian')
    expect(结果.zhuang_tai_wen_ben).toBe('被渣女骗了')
  })

  it('角色性别 男 出渣男', async () => {
    角色性别列 = '男'
    const 结果 = await chuLiYouXiJieShu(用户ID, 角色ID, 'shi_bai_bei_qi_pian')
    expect(结果.zhuang_tai_wen_ben).toBe('被渣男骗了')
  })

  it('角色性别缺失出中性文案', async () => {
    角色性别列 = null
    const 结果 = await chuLiYouXiJieShu(用户ID, 角色ID, 'shi_bai_bei_qi_pian')
    expect(结果.zhuang_tai_wen_ben).toBe('被渣型骗了')
  })

  it('角色ID 非法时跳过性别查询并降级为中性文案', async () => {
    const 结果 = await chuLiYouXiJieShu(用户ID, '不是-UUID', 'shi_bai_bei_qi_pian')
    expect(结果.zhuang_tai_wen_ben).toBe('被渣型骗了')
    expect(结果.jie_guo_lei_xing).toBe('shi_bai_bei_qi_pian')
  })

  it('性别查询抛错时结算不中断，降级为中性文案', async () => {
    性别查询抛错 = true
    const 结果 = await chuLiYouXiJieShu(用户ID, 角色ID, 'shi_bai_bei_qi_pian')
    expect(结果.zhuang_tai_wen_ben).toBe('被渣型骗了')
    expect(取语句('UPDATE "角色" SET "封存"')?.参数?.[2]).toBe('shi_bai_bei_qi_pian')
  })

  it('胜利结局的文案与性别无关', async () => {
    角色性别列 = 'nv'
    const 结果 = await chuLiYouXiJieShu(用户ID, 角色ID, 'sheng_li_ai_qing')
    expect(结果.zhuang_tai_wen_ben).toBe('在一起了 💕')
    expect(结果.ke_ji_xu_liao_tian).toBe(true)
    const 角色更新 = 取语句('UPDATE "角色" SET "封存"')
    expect(角色更新?.参数).toEqual([false, true, 'sheng_li_ai_qing', 角色ID])
  })
})
