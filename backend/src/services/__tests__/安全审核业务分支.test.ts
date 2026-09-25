import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  ciKu: vi.fn(),
  saoMiao: vi.fn(),
  ai: vi.fn(),
  prompt: vi.fn((xiaoXi: string) => xiaoXi),
  debug: { error: vi.fn() },
  peiZhi: {
    shuRuWeiJinCiLieBiao: [] as string[],
    weiJiGanYu: { guanJianCi: ['自杀'], yuanZhuReXian: '热线' },
  },
  fanYi: vi.fn((_: string, key: string) => key),
}))

vi.mock('../../config', () => ({ peiZhi: 假.peiZhi }))
vi.mock('../审核词库', () => ({ jiaZaiZuiXinCiKu: 假.ciKu, saoMiaoNeiRong: 假.saoMiao }))
vi.mock('../../utils/DeepSeek客户端', () => ({ genJuPeiZhiTiaoYong: 假.ai }))
vi.mock('../Prompt构建器', () => ({ gouJianAnQuanShenHePrompt: 假.prompt }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))
vi.mock('../../config/translations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../config/translations')>()),
  huoQuFanYi: 假.fanYi,
}))

import { chongZhiCiKuHuanCun, jianCeWeiJiXinHao, shenHeNeiRongAnQuan } from '../安全审核'

beforeEach(() => {
  vi.clearAllMocks()
  chongZhiCiKuHuanCun()
  假.peiZhi.shuRuWeiJinCiLieBiao = []
  假.ciKu.mockResolvedValue({ ciKu: ['坏话'] })
  假.saoMiao.mockReturnValue({ weiGui: false })
  假.ai.mockResolvedValue({ neiRong: JSON.stringify({ 确信度: 0.9, 违规: true, 严重程度: '严重', 类型: '攻击', 理由: '命中规则' }) })
})

describe('安全审核业务分支', () => {
  it('危机检测覆盖空值和普通文本', () => {
    expect(jianCeWeiJiXinHao('')).toBeNull()
    expect(jianCeWeiJiXinHao('今天天气不错')).toBeNull()
  })

  it('本地词库和AI结果覆盖拦截、放行及严重程度映射', async () => {
    假.saoMiao.mockReturnValueOnce({ weiGui: true, leiBie: '辱骂', mingZhongCi: '坏话' })
    await expect(shenHeNeiRongAnQuan('坏话')).resolves.toMatchObject({ wei_gui: true, lei_xing: '辱骂' })
    await expect(shenHeNeiRongAnQuan('正常文本')).resolves.toMatchObject({ wei_gui: true, yan_zhong_cheng_du: 'yan_zhong' })
    假.ai.mockResolvedValueOnce({ neiRong: '前缀 {"确信度":0.7,"违规":false,"严重程度":"轻微"} 后缀' })
    await expect(shenHeNeiRongAnQuan('正常文本')).resolves.toMatchObject({ wei_gui: false, yan_zhong_cheng_du: 'qing_wei' })
  })

  it('AI失败时覆盖旧词库命中和安全降级', async () => {
    假.ai.mockRejectedValueOnce(new Error('模型不可用'))
    假.peiZhi.shuRuWeiJinCiLieBiao = ['危险']
    await expect(shenHeNeiRongAnQuan('危险内容')).resolves.toMatchObject({ wei_gui: true, lei_xing: '本地词库拦截' })
    假.ai.mockRejectedValueOnce(new Error('模型不可用'))
    假.peiZhi.shuRuWeiJinCiLieBiao = []
    await expect(shenHeNeiRongAnQuan('普通内容')).resolves.toMatchObject({ wei_gui: true, lei_xing: '审核服务不可用' })
  })
})
