import { describe, it, expect, vi, beforeEach } from 'vitest'

let 档案行: Record<string, unknown>[] = []
let 角色行: Record<string, unknown>[] = []

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string) => {
      if (文本.includes('FROM "游戏档案"')) return { rows: 档案行, rowCount: 档案行.length }
      if (文本.includes('FROM "角色"')) return { rows: 角色行, rowCount: 角色行.length }
      return { rows: [], rowCount: 0 }
    },
  },
}))

vi.mock('../../redis', () => ({ redis: { set: vi.fn(), del: vi.fn(), get: vi.fn() } }))
vi.mock('../../socket/io', () => ({ huoQuIo: () => null }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
}))
vi.mock('../军师缓存', () => ({ huoQuJunShiJiLuLieBiao: async () => [] }))
vi.mock('../媒体存储', () => ({ shengChengQianMingURL: () => null }))

import { huoQuDangAnLieBiao, huoQuDangAnXiangQing } from '../战绩'
import { huoQuJiaoSeSuoYouZhe } from '../消息'

const 基此行 = {
  ID: 'a1',
  用户ID: 'u1',
  角色ID: 'r1',
  角色名字: '小美',
  微信昵称: '小美',
  是否渣型: true,
  是否封存: true,
  好感度总分: 30,
  关系阶段: '认识',
  聊天天数: 2,
  消息总数: 9,
  创建时间: '2026-09-01T00:00:00.000Z',
  最后消息时间: null,
  模式: 'putong',
  MBTI: 'ENFP',
}

function 设档案(覆盖: Record<string, unknown>): void {
  档案行 = [{ ...基此行, ...覆盖 }]
}

beforeEach(() => {
  档案行 = []
  角色行 = []
})

describe('过往战绩读取按性别渲染结局', () => {
  it('新枚举键行按角色性别渲染', async () => {
    设档案({ 结果类型: 'shi_bai_bei_qi_pian', 性别: 'nv' })
    const [项] = await huoQuDangAnLieBiao('u1')
    expect(项.jie_guo_lei_xing).toBe('被渣女骗了')
    expect(项.jie_guo_lei_xing_yuan).toBe('shi_bai_bei_qi_pian')
  })

  it('同一枚举对男性角色渲染渣男', async () => {
    设档案({ 结果类型: 'shi_bai_bei_zha_xing_qi_pian', 性别: '男' })
    const [项] = await huoQuDangAnLieBiao('u1')
    expect(项.jie_guo_lei_xing).toBe('被渣男套路了')
  })

  it('性别写法 female/nv 归一为女', async () => {
    设档案({ 结果类型: 'shi_bai_bei_qi_pian', 性别: 'female' })
    const [项] = await huoQuDangAnLieBiao('u1')
    expect(项.jie_guo_lei_xing).toBe('被渣女骗了')
  })

  it('性别缺失回落中性文案', async () => {
    设档案({ 结果类型: 'shi_bai_bei_qi_pian', 性别: null })
    const [项] = await huoQuDangAnLieBiao('u1')
    expect(项.jie_guo_lei_xing).toBe('被渣型骗了')
  })

  it('历史文案行重新按当前性别渲染，不被错分', async () => {
    设档案({ 结果类型: '失败-被诈型欺骗', 性别: 'nv' })
    const [项] = await huoQuDangAnLieBiao('u1')
    expect(项.jie_guo_lei_xing_yuan).toBe('shi_bai_bei_zha_xing_qi_pian')
    expect(项.jie_guo_lei_xing).toBe('被渣女套路了')
    expect(项.jie_guo_lei_xing_yuan.startsWith('sheng_li')).toBe(false)
  })

  it('文案改版前的中性行也重新渲染成性别变体', async () => {
    设档案({ 结果类型: '识破渣型', 是否封存: false, 性别: '男' })
    const [项] = await huoQuDangAnLieBiao('u1')
    expect(项.jie_guo_lei_xing_yuan).toBe('sheng_li_shi_po')
    expect(项.jie_guo_lei_xing).toBe('识破渣男')
    expect(项.jie_guo_lei_xing.startsWith('sheng_li')).toBe(false)
  })

  it('胜利行仍归入胜利组', async () => {
    设档案({ 结果类型: '在一起了 💕', 是否封存: false, 性别: 'nv' })
    const [项] = await huoQuDangAnLieBiao('u1')
    expect(项.jie_guo_lei_xing_yuan).toBe('sheng_li_ai_qing')
    expect(项.jie_guo_lei_xing).toBe('在一起了 💕')
    expect(项.you_xi_jie_shu_shi_jian).not.toBeNull()
  })

  it('空结局未封存行算进行中且无文案', async () => {
    设档案({ 结果类型: '', 是否封存: false, 性别: 'nv' })
    const [项] = await huoQuDangAnLieBiao('u1')
    expect(项.jie_guo_lei_xing_yuan).toBe('jinxing_zhong')
    expect(项.jie_guo_lei_xing).toBe('')
    expect(项.you_xi_jie_shu_shi_jian).toBeNull()
  })

  it('免打扰结局不再被兜底错分成好感度归零', async () => {
    设档案({ 结果类型: 'shi_bai_mian_da_rao', 性别: 'nv' })
    const [项] = await huoQuDangAnLieBiao('u1')
    expect(项.jie_guo_lei_xing_yuan).toBe('shi_bai_mian_da_rao')
    expect(项.jie_guo_lei_xing).toBe('TA将你设为了免打扰')
  })

  it('详情接口与列表口径一致', async () => {
    设档案({ 结果类型: 'shi_bai_bei_qi_pian', 性别: 'nv', 复盘数据: null, 复盘内容: null })
    const 详情 = await huoQuDangAnXiangQing('u1', 'a1')
    expect(详情?.jie_guo_lei_xing).toBe('被渣女骗了')
    expect(详情?.jie_guo_lei_xing_yuan).toBe('shi_bai_bei_qi_pian')
  })
})

describe('角色归属信息按性别渲染结局', () => {
  const 角色ID = '22222222-2222-4222-8222-222222222222'

  it('枚举键结局状态渲染为性别化文案', async () => {
    角色行 = [
      { 用户ID: 'u1', 封存: true, 可继续聊天: false, 结局状态: 'shi_bai_bei_qi_pian', 是否渣型: true, 性别: 'nv' },
    ]
    const 信息 = await huoQuJiaoSeSuoYouZhe(角色ID)
    expect(信息?.jie_ju_zhuang_tai).toBe('被渣女骗了')
  })

  it('历史文案结局状态同样重渲染', async () => {
    角色行 = [
      { 用户ID: 'u1', 封存: false, 可继续聊天: true, 结局状态: '在一起了 💕', 是否渣型: false, 性别: 'nan' },
    ]
    const 信息 = await huoQuJiaoSeSuoYouZhe(角色ID)
    expect(信息?.jie_ju_zhuang_tai).toBe('在一起了 💕')
  })

  it('进行中角色结局状态为空串', async () => {
    角色行 = [
      { 用户ID: 'u1', 封存: false, 可继续聊天: true, 结局状态: '', 是否渣型: false, 性别: 'nv' },
    ]
    const 信息 = await huoQuJiaoSeSuoYouZhe(角色ID)
    expect(信息?.jie_ju_zhuang_tai).toBe('')
  })
})
