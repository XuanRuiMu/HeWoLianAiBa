import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  peiZhi: { deepSeek: { apiMiYao: 'key' } },
  ai: { prompt: { kaiChangBaiFaSongGaiLv: 0.42 }, deepSeek: { apiMiYao: 'fallback' }, moXing: {} },
  genJu: vi.fn(),
}))

vi.mock('../../config', () => ({ peiZhi: 假.peiZhi }))
vi.mock('../../config/AI配置', () => ({ AI_PEI_ZHI: 假.ai }))
vi.mock('../../utils/DeepSeek客户端', () => ({ genJuPeiZhiTiaoYong: 假.genJu }))

import { huoQuKaiChangBaiMock, sheZhiKaiChangBaiMock, shengChengKaiChangBai } from '../开场白生成'
import { CUO_WU_DAI_MA } from '../../config/错误码注册表'
import { jiSuanKaiChangBaiGaiLv as jiSuanGaiLv } from '../开场白概率'

const canShu = {
  mbti_lei_xing: 'INTJ', ie_lei_xing: 'I', re_shen_lei_xing: '慢热', shi_fou_zha_xing: false,
  xing_ge: '安静', yan_yu_feng_ge: '简短', xi_huan_de_lei_xing: '真诚', xing_bie: 'nv', ming_zi: '小明',
  bei_jing_gu_shi: '背景', qing_gan_jing_li: '经历', jia_ting_bei_jing: '家庭', tou_xiang: '头像', biao_qian: ['标签'],
} as never

beforeEach(() => {
  vi.clearAllMocks()
  假.peiZhi.deepSeek.apiMiYao = 'key'
  假.genJu.mockResolvedValue({ neiRong: '前缀 {"xiao_xi_lie_biao":["你好","我叫小明","13800138000"]} 后缀' })
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  sheZhiKaiChangBaiMock(null)
})

describe('开场白生成与概率业务分支', () => {
  it('mock结果经过安全过滤、姓名过滤和条数上限', async () => {
    const mock = vi.fn(() => ({ xiao_xi_lie_biao: ['你好', '我叫小明', '微信 abcdef', 'A', 'B', 'C'] }))
    sheZhiKaiChangBaiMock(mock)
    expect(huoQuKaiChangBaiMock()).toBe(mock)
    const 结果 = await shengChengKaiChangBai(canShu)
    expect(结果.xiao_xi_lie_biao).toEqual(['你好', 'A', 'B', 'C'])
  })

  it('无AI或解析失败按真实阶段返回错误', async () => {
    vi.stubEnv('VITEST', 'true')
    const 结果 = await shengChengKaiChangBai(canShu)
    expect(结果.xiao_xi_lie_biao.length).toBeGreaterThan(0)
    vi.stubEnv('VITEST', 'false')
    假.peiZhi.deepSeek.apiMiYao = ''
    假.ai.deepSeek.apiMiYao = ''
    await expect(shengChengKaiChangBai(canShu)).rejects.toMatchObject({ code: CUO_WU_DAI_MA.ROLE_GENERATION_MODEL_UNAVAILABLE })
    假.peiZhi.deepSeek.apiMiYao = 'key'
    假.ai.deepSeek.apiMiYao = 'fallback'
    假.genJu.mockResolvedValueOnce({ neiRong: '不是JSON' })
    await expect(shengChengKaiChangBai(canShu)).rejects.toMatchObject({ code: CUO_WU_DAI_MA.ROLE_GENERATION_RESPONSE_INVALID })
  })

  it('AI有效结果走上下文，空结果与网络异常按阶段返回错误', async () => {
    vi.stubEnv('VITEST', 'false')
    假.genJu.mockResolvedValueOnce({ neiRong: '{"xiao_xi_lie_biao":["嗨","在忙吗"]}' })
    await expect(shengChengKaiChangBai(canShu, { jiaoSe: {} } as never)).resolves.toEqual({ xiao_xi_lie_biao: ['嗨', '在忙吗'] })
    假.genJu.mockResolvedValueOnce({ neiRong: '{"xiao_xi_lie_biao":[]}' })
    await expect(shengChengKaiChangBai(canShu)).rejects.toMatchObject({ code: CUO_WU_DAI_MA.ROLE_GENERATION_RESPONSE_INVALID })
    假.genJu.mockRejectedValueOnce(new Error('网络'))
    await expect(shengChengKaiChangBai(canShu)).rejects.toMatchObject({ code: CUO_WU_DAI_MA.ROLE_GENERATION_MODEL_CALL_FAILED })
  })

  it('概率解析覆盖测试兜底、百分数、小数、非法值和异常阶段', async () => {
    vi.stubEnv('VITEST', 'true')
    await expect(jiSuanGaiLv(canShu)).resolves.toBe(0.42)
    vi.stubEnv('VITEST', 'false')
    假.genJu.mockResolvedValueOnce({ neiRong: '概率 73' })
    await expect(jiSuanGaiLv(canShu)).resolves.toBe(0.73)
    假.genJu.mockResolvedValueOnce({ neiRong: '0.73' })
    await expect(jiSuanGaiLv(canShu)).resolves.toBe(0.73)
    假.genJu.mockResolvedValueOnce({ neiRong: '超过范围 101' })
    await expect(jiSuanGaiLv(canShu)).rejects.toMatchObject({ code: CUO_WU_DAI_MA.ROLE_GENERATION_RESPONSE_INVALID })
    假.genJu.mockResolvedValueOnce({ neiRong: '没有数字' })
    await expect(jiSuanGaiLv(canShu)).rejects.toMatchObject({ code: CUO_WU_DAI_MA.ROLE_GENERATION_RESPONSE_INVALID })
    假.genJu.mockRejectedValueOnce(new Error('模型'))
    await expect(jiSuanGaiLv(canShu)).rejects.toMatchObject({ code: CUO_WU_DAI_MA.ROLE_GENERATION_MODEL_CALL_FAILED })
  })
})
