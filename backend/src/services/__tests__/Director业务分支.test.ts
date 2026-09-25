import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  图片: vi.fn(),
  prompt: vi.fn(() => '提示'),
  ai: vi.fn(),
  retry: vi.fn(),
  debug: { error: vi.fn() },
}))

vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))
vi.mock('../../utils/DeepSeek客户端', () => ({ genJuPeiZhiTiaoYong: 假.ai }))
vi.mock('../Prompt构建器', () => ({ gouJianDirectorPrompt: 假.prompt }))
vi.mock('../重试队列', () => ({ paiRuZhongShiDuiLie: 假.retry }))
vi.mock('../对话渲染', () => ({ zhuRuBenLunTuXiangKuai: 假.图片 }))

import { shengChengDirectorCeLue } from '../Director'

const shuRu = { dui_hua_li_shi: [{ id: '1', nei_rong: '你好' }] } as never

beforeEach(() => {
  vi.clearAllMocks()
  假.图片.mockResolvedValue([])
  假.ai.mockResolvedValue({ neiRong: JSON.stringify({ 用户意图: '聊天', 回复条数: 9, 是否回复: true }), siKaoNeiRong: '思考' })
})

describe('Director业务分支', () => {
  it('解析完整策略、限制条数并注入图片上下文', async () => {
    假.图片.mockResolvedValue([{ type: 'input_image', image_url: 'data:image/png;base64,x' }])
    await expect(shengChengDirectorCeLue(shuRu, { jiaoSe: {} } as never, new AbortController().signal)).resolves.toMatchObject({ cheng_gong: true, ce_lue: { hui_fu_tiao_shu: 5 }, si_kao: '思考' })
    expect(假.ai).toHaveBeenCalledWith('director', expect.any(Array), expect.anything(), expect.any(AbortSignal))
  })

  it('解析失败入重试队列，普通异常、429和402均返回降级策略', async () => {
    假.ai.mockResolvedValueOnce({ neiRong: '前缀 {坏JSON} 后缀' })
    await expect(shengChengDirectorCeLue(shuRu)).resolves.toMatchObject({ cheng_gong: false, cuo_wu: 'JIE_XI_SHI_BAI' })
    expect(假.retry).toHaveBeenCalledWith({ leiXing: 'director', yuanYin: 'jie_xi_shi_bai' })
    假.ai.mockRejectedValueOnce(Object.assign(new Error('限流'), { zhuangTaiMa: 429 }))
    await expect(shengChengDirectorCeLue(shuRu)).resolves.toMatchObject({ cuo_wu: 'XIAN_LIU_429' })
    假.ai.mockRejectedValueOnce(new Error('402'))
    await expect(shengChengDirectorCeLue(shuRu)).resolves.toMatchObject({ cuo_wu: 'YU_E_BU_ZU_402' })
    假.ai.mockRejectedValueOnce(new Error('普通错误'))
    await expect(shengChengDirectorCeLue(shuRu)).resolves.toMatchObject({ cuo_wu: '普通错误' })
  })
})
