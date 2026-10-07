import { describe, it, expect, vi, beforeEach } from 'vitest'

const 假 = vi.hoisted(() => ({
  shengChengDirectorCeLue: vi.fn(),
  shengChengWriterHuiFu: vi.fn(),
}))

vi.mock('../Director', () => ({ shengChengDirectorCeLue: 假.shengChengDirectorCeLue }))
vi.mock('../Writer', () => ({ shengChengWriterHuiFu: 假.shengChengWriterHuiFu }))
vi.mock('../重试队列', () => ({ paiRuZhongShiDuiLie: vi.fn() }))

const { yunXingAIYinQing } = await import('../AI引擎')
const { guoLvAiWeiXiaoXi } = await import('../../config/去AI味配置')

const shuRu = {
  yong_hu_id: 'u1',
  jiao_se_id: 'j1',
  jiao_se: { wei_xin_ming: '小美', xing_ge: '沉稳', mbti_lei_xing: 'ISTJ', ie_lei_xing: 'I' },
  yong_hu_xin_xiao_xi: '在干嘛',
  dui_hua_li_shi: [],
  hao_gan_du: { zong_fen: 500, guan_xi_jie_duan: 'shuXi' },
  shi_fou_di_yi_lun: false,
} as never

function paiZhi(tiaoShu: string[]) {
  假.shengChengDirectorCeLue.mockResolvedValue({
    cheng_gong: true,
    ce_lue: {
      yong_hu_yi_tu: '闲聊',
      qing_gan_fen_xi: '平静',
      hui_fu_ce_lue: '自然发挥',
      shi_fou_hui_fu: true,
      hui_fu_tiao_shu: tiaoShu.length,
      shi_jian_qing_xu: '正常',
      shi_fou_che_hui: false,
      shi_fou_zhu_dong_biao_bai: false,
    },
  })
  假.shengChengWriterHuiFu.mockResolvedValue({
    xiao_xi_lie_biao: tiaoShu,
    yuan_wen: tiaoShu.join('\n'),
  })
}

describe('FP-08 过AI味输出过滤层', () => {
  beforeEach(() => vi.clearAllMocks())

  it('含客服腔短语的条目被过滤，正常口语保留', async () => {
    paiZhi(['作为 AI，我很乐意帮助你解决问题哦', '哈哈哈哈', '无语了', '嗯…这也行？'])
    const r = await yunXingAIYinQing(shuRu)
    expect(r.xiao_xi_lie_biao).toEqual(['哈哈哈哈', '无语了', '嗯…这也行？'])
  })

  it('碎片化口语独立不误伤', async () => {
    paiZhi(['嗯…', '哈哈', '无语', '行吧'])
    const r = await yunXingAIYinQing(shuRu)
    expect(r.xiao_xi_lie_biao).toEqual(['嗯…', '哈哈', '无语', '行吧'])
  })

  it('全部命中时列表清空并按既有空回复契约走失败标记', async () => {
    paiZhi(['我理解你的感受，我很乐意帮助你'])
    const r = await yunXingAIYinQing(shuRu)
    expect(r.xiao_xi_lie_biao).toEqual([])
    expect(r.shi_fou_hui_fu).toBe(false)
  })

  it('纯规则函数：命中删除、未命中保留、可配置词表', () => {
    const r = guoLvAiWeiXiaoXi(['很抱歉，作为AI我无法', '在干嘛呢'])
    expect(r.beiFengSha.length + r.baoLiu.length).toBe(2)
    expect(r.baoLiu).toContain('在干嘛呢')
    const ziDingYi = guoLvAiWeiXiaoXi(['随便一句'], ['随便'])
    expect(ziDingYi.baoLiu).toEqual([])
  })
})
