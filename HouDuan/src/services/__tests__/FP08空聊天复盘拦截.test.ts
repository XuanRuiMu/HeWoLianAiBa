import { beforeEach, describe, expect, it, vi } from 'vitest'

const { 查询 } = vi.hoisted(() => ({ 查询: vi.fn() }))
const { 消息列表 } = vi.hoisted(() => ({ 消息列表: vi.fn() }))
const { 调用模型 } = vi.hoisted(() => ({ 调用模型: vi.fn() }))
const { 落库 } = vi.hoisted(() => ({ 落库: vi.fn(async () => undefined) }))

vi.mock('../../数据库', () => ({
  数据库: {
    query: 查询,
    connect: vi.fn(async () => ({ release: () => undefined, query: vi.fn() })),
  },
}))
vi.mock('../../redis', () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    keys: vi.fn(async () => []),
    hget: vi.fn(async () => null),
    hset: vi.fn(async () => 1),
    sadd: vi.fn(async () => 1),
    smembers: vi.fn(async () => []),
    lrange: vi.fn(async () => []),
  },
}))
vi.mock('../../socket/io', () => ({ huoQuIo: vi.fn(() => null) }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  jiLuAIJiLu: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
}))
vi.mock('../消息', () => ({ huoQuXiaoXiLieBiao: 消息列表 }))
vi.mock('../战绩', () => ({ gengXinFuPanNeiRong: 落库 }))
vi.mock('../关键事件提取', () => ({ tiQuBingLuoKuGuanJianShiJian: vi.fn(async () => []) }))
vi.mock('../文档文本提取', () => ({ buQiWenJianTiQuWenBen: vi.fn(async (lieBiao: unknown) => lieBiao) }))
vi.mock('../../utils/DeepSeek客户端', () => ({ genJuPeiZhiTiaoYong: 调用模型 }))

import {
  FU_PAN_YOU_XIAO_XIAO_XI_SHU_YU_JU,
  huoQuFuPanYouXiaoXiaoXiShu,
  shengChengFuPan,
  复盘状态,
} from '../复盘'

const YONG_HU = '11111111-1111-4111-8111-111111111111'
const JIAO_SE = '22222222-2222-4222-8222-222222222222'
const DANG_AN = '33333333-3333-4333-8333-333333333333'

const 正常消息 = {
  id: 'm-1',
  hui_hua_id: JIAO_SE,
  fa_song_zhe_id: YONG_HU,
  fa_song_zhe_lei_xing: 'yonghu',
  ai_biao_shi: false,
  nei_rong: '今天好累',
  lei_xing: 'wenBen',
  shi_jian_chuo: Date.parse('2026-10-28T12:00:00.000Z'),
  yi_du: true,
  yi_che_hui: false,
}

beforeEach(() => {
  查询.mockReset()
  消息列表.mockReset()
  调用模型.mockReset()
  落库.mockClear()
})

describe('空聊天复盘拦截', () => {
  it('有效消息计数只收真实对话，排除系统消息、撤回与内心活动', async () => {
    expect(FU_PAN_YOU_XIAO_XIAO_XI_SHU_YU_JU).toContain(`"发送者" IN ('yonghu', 'jiaose')`)
    expect(FU_PAN_YOU_XIAO_XIAO_XI_SHU_YU_JU).toContain('COALESCE("已撤回", false) = false')
    expect(FU_PAN_YOU_XIAO_XIAO_XI_SHU_YU_JU).toContain('COALESCE("类型", \'wenBen\') <> ALL($3::varchar[])')

    查询.mockResolvedValueOnce({ rows: [{ 有效消息数: 0 }] })
    await expect(huoQuFuPanYouXiaoXiaoXiShu(YONG_HU, JIAO_SE)).resolves.toBe(0)
    expect(查询).toHaveBeenCalledWith(FU_PAN_YOU_XIAO_XIAO_XI_SHU_YU_JU, [
      YONG_HU,
      JIAO_SE,
      ['neiXinHuoDong'],
    ])

    查询.mockResolvedValueOnce({ rows: [{ 有效消息数: '7' }] })
    await expect(huoQuFuPanYouXiaoXiaoXiShu(YONG_HU, JIAO_SE)).resolves.toBe(7)

    查询.mockResolvedValueOnce({ rows: [] })
    await expect(huoQuFuPanYouXiaoXiaoXiShu(YONG_HU, JIAO_SE)).resolves.toBe(0)
  })

  it('零有效消息时不调模型、不写库，直接返回空状态', async () => {
    查询.mockResolvedValueOnce({ rows: [{ 有效消息数: 0 }] })

    const jieGuo = await shengChengFuPan(YONG_HU, JIAO_SE, DANG_AN)

    expect(jieGuo).toBeNull()
    expect(消息列表).not.toHaveBeenCalled()
    expect(调用模型).not.toHaveBeenCalled()
    expect(落库).not.toHaveBeenCalled()
    expect(查询).toHaveBeenCalledTimes(1)
    expect(复盘状态.无聊天记录).toBe('wu_liao_tian_ji_lu')
  })

  it('仅有系统消息与撤回消息的聊天同样不进入生成链路', async () => {
    查询.mockResolvedValueOnce({ rows: [{ 有效消息数: 0 }] })

    const jieGuo = await shengChengFuPan(YONG_HU, JIAO_SE, DANG_AN)

    expect(jieGuo).toBeNull()
    expect(消息列表).not.toHaveBeenCalled()
    expect(调用模型).not.toHaveBeenCalled()
    expect(落库).not.toHaveBeenCalled()
  })

  it('存在有效消息时正常生成并落库，行为不变', async () => {
    查询
      .mockResolvedValueOnce({ rows: [{ 有效消息数: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
    消息列表.mockResolvedValueOnce({ lie_biao: [正常消息], zong_shu: 1 })
    调用模型.mockResolvedValueOnce({
      neiRong: JSON.stringify({
        pi_zhu: [{ xu_hao: 1, pi_zhu_nei_rong: '开场很自然', qing_gan: '积极' }],
        zong_jie: {
          dui_xiang_lei_xing: '正常',
          yong_hu_biao_xian: '节奏稳',
          guan_jian_zhuan_zhe_dian: '主动开话题',
          gai_jin_jian_yi: '继续推进',
        },
      }),
    })

    const jieGuo = await shengChengFuPan(YONG_HU, JIAO_SE, DANG_AN)

    expect(jieGuo?.fu_pan_nei_rong).toContain('用户表现：节奏稳')
    expect(jieGuo?.fu_pan_pi_zhu).toHaveLength(1)
    expect(调用模型).toHaveBeenCalledTimes(1)
    expect(落库).toHaveBeenCalledTimes(1)
    expect(落库).toHaveBeenCalledWith(DANG_AN, jieGuo?.fu_pan_nei_rong, jieGuo?.fu_pan_pi_zhu)
  })
})
