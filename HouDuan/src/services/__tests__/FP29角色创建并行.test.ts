import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()
vi.mock('../../数据库', () => ({
  数据库: {
    query: (...canShu: unknown[]) => queryMock(...canShu),
  },
}))
vi.mock('../../redis', () => ({
  redis: {
    hincrby: vi.fn(async () => 1),
    expire: vi.fn(async () => undefined),
    hgetall: vi.fn(async () => ({})),
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
  },
}))
const kaiChangBaiMock = vi.fn()
vi.mock('../开场白生成', () => ({
  shengChengKaiChangBai: (...canShu: unknown[]) => kaiChangBaiMock(...canShu),
}))
const 保存消息Mock = vi.fn()
vi.mock('../AI输入准备', () => ({
  保存角色XiaoXi: (...canShu: unknown[]) => 保存消息Mock(...canShu),
}))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  jiLuAIJiLu: vi.fn(),
}))

import { baoCunJiaoSe } from '../角色生成'

function 造角色(): Record<string, unknown> {
  return {
    ming_zi: '林知夏',
    xing_bie: 'nv',
    nian_ling: 24,
    mbti_lei_xing: 'INFP',
    ie_lei_xing: 'I',
    re_shen_lei_xing: '慢热',
    shi_fou_zha_xing: false,
    wai_mao: '长发',
    xing_ge: '安静',
    yan_yu_feng_ge: '温柔',
    bei_jing_gu_shi: '',
    xi_hao: [],
    biao_qian: [],
    yu_she_lei_xing: 'INFP',
    hao_gan_du_zong_fen: 300,
    hui_fu_yan_chi_hao_miao: 10000,
    shi_jie_xin_xi: {},
    wei_xin_ming: '知夏',
    zhen_shi_ming: '',
  }
}

beforeEach(() => {
  queryMock.mockReset()
  kaiChangBaiMock.mockReset()
  保存消息Mock.mockReset()
  queryMock.mockImplementation(async (sql: string) => {
    if (String(sql).includes('RETURNING')) {
      return { rows: [{ ID: 'j-test', 公开编号: '1' }], rowCount: 1 }
    }
    return { rows: [], rowCount: 1 }
  })
})

describe('FP29 角色创建落库后并发', () => {
  it('头像回调与开场白生成并发：开场白仍挂起时头像回调已启动', async () => {
    let 放行开场白!: (jieGuo: unknown) => void
    const 开场白挂起 = new Promise<unknown>((jie) => { 放行开场白 = jie })
    kaiChangBaiMock.mockReturnValue(开场白挂起)

    const 头像回调 = vi.fn(async () => undefined)
    const 任务 = baoCunJiaoSe('u-test', 造角色() as never, 'putong', 头像回调)

    await new Promise((r) => setImmediate(r))
    expect(kaiChangBaiMock).toHaveBeenCalledTimes(1)
    expect(头像回调).toHaveBeenCalledTimes(1)
    expect(头像回调).toHaveBeenCalledWith('j-test', expect.objectContaining({ ming_zi: '林知夏' }))

    放行开场白({
      zhu_dong_dang_wei: '中间型',
      zhu_dong_kai_kou_gai_lv: 0,
      xiao_xi_lie_biao: [],
    })
    await 任务
  })

  it('头像回调抛错不影响开场白落库与 yao_kai_kou 标志', async () => {
    kaiChangBaiMock.mockResolvedValue({
      zhu_dong_dang_wei: '中间型',
      zhu_dong_kai_kou_gai_lv: 1,
      xiao_xi_lie_biao: ['你好呀'],
    })
    保存消息Mock.mockResolvedValue({ id: 'm-1' })

    const 回调 = vi.fn(async () => { throw new Error('头像生成炸了') })
    const 结果 = await baoCunJiaoSe('u-test', 造角色() as never, 'putong', 回调)

    expect(回调).toHaveBeenCalledTimes(1)
    expect(保存消息Mock).toHaveBeenCalledTimes(1)
    expect((结果 as Record<string, unknown>).yao_kai_kou).toBe(true)
  })

  it('未传落库后回调时与旧行为一致：只生成开场白不报错', async () => {
    kaiChangBaiMock.mockResolvedValue({
      zhu_dong_dang_wei: '被动型',
      zhu_dong_kai_kou_gai_lv: 0,
      xiao_xi_lie_biao: [],
    })
    const 结果 = await baoCunJiaoSe('u-test', 造角色() as never)
    expect(kaiChangBaiMock).toHaveBeenCalledTimes(1)
    expect((结果 as Record<string, unknown>).yao_kai_kou).toBe(false)
  })
})
