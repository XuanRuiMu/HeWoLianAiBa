import { describe, expect, it } from 'vitest'
import { AI_PEI_ZHI } from '../../config/AI配置'
import {
  dangWeiZhuanGaiLv,
  jieXiZhuDongDangWei,
  shengChengKaiChangBai,
  sheZhiKaiChangBaiMock,
  type KaiChangBaiShengChengCanShu,
} from '../开场白生成'

const 人设: KaiChangBaiShengChengCanShu = {
  mbti_lei_xing: 'INFP',
  ie_lei_xing: 'I',
  re_shen_lei_xing: '慢热',
  shi_fou_zha_xing: false,
  xing_ge: '安静，不太主动',
  yan_yu_feng_ge: '话少，句子短',
  xi_huan_de_lei_xing: '温和的人',
  xing_bie: '女',
  ming_zi: '林小满',
  bei_jing_gu_shi: '普通家庭',
  qing_gan_jing_li: '没谈过',
  jia_ting_bei_jing: '父母和睦',
  tou_xiang: '',
  biao_qian: ['安静'],
}

describe('开场白由人设决定', () => {
  it('四档映射到配置里的开口率，不是随机数', () => {
    const 表 = AI_PEI_ZHI.prompt.kaiChangBaiZhuDongDangWei
    expect(dangWeiZhuanGaiLv('主动型')).toBe(表['主动型'])
    expect(dangWeiZhuanGaiLv('中间型')).toBe(表['中间型'])
    expect(dangWeiZhuanGaiLv('被动型')).toBe(表['被动型'])
    expect(dangWeiZhuanGaiLv('极被动型')).toBe(表['极被动型'])
  })

  it('主动型的开口率必须高于中间型，中间型高于被动型', () => {
    expect(dangWeiZhuanGaiLv('主动型')).toBeGreaterThan(dangWeiZhuanGaiLv('中间型'))
    expect(dangWeiZhuanGaiLv('中间型')).toBeGreaterThan(dangWeiZhuanGaiLv('被动型'))
    expect(dangWeiZhuanGaiLv('被动型')).toBeGreaterThan(dangWeiZhuanGaiLv('极被动型'))
  })

  it('四档错峰后整体期望落在 50% 附近', () => {
    const 表 = AI_PEI_ZHI.prompt.kaiChangBaiZhuDongDangWei
    const 分布: Record<string, number> = { 主动型: 0.37, 中间型: 0.51, 被动型: 0.12 }
    const 期望 = Object.entries(分布).reduce((he, [dangWei, quan]) => he + 表[dangWei] * quan, 0)
    expect(期望).toBeGreaterThan(0.4)
    expect(期望).toBeLessThan(0.6)
  })

  it('未知档位退回默认档，不抛错', () => {
    expect(jieXiZhuDongDangWei('??')).toBe(AI_PEI_ZHI.prompt.kaiChangBaiMoRenZhuDongDangWei)
    expect(jieXiZhuDongDangWei(undefined)).toBe(AI_PEI_ZHI.prompt.kaiChangBaiMoRenZhuDongDangWei)
  })

  it('档位名夹在多余文字里也能认出来', () => {
    expect(jieXiZhuDongDangWei('我觉得是主动型吧')).toBe('主动型')
    expect(jieXiZhuDongDangWei('被动型')).toBe('被动型')
  })

  it('极被动型几乎不发，主动型大概率发', () => {
    expect(dangWeiZhuanGaiLv('极被动型')).toBeLessThan(0.1)
    expect(dangWeiZhuanGaiLv('主动型')).toBeGreaterThan(0.7)
  })
})

describe('开场白生成结果的落库口径', () => {
  it('mock 返回空数组时就是不发，不会被兜底补一条', async () => {
    sheZhiKaiChangBaiMock(() => ({
      zhu_dong_dang_wei: '极被动型',
      zhu_dong_kai_kou_gai_lv: 0.02,
      xiao_xi_lie_biao: [],
    }))
    const jieGuo = await shengChengKaiChangBai(人设)
    expect(jieGuo.xiao_xi_lie_biao).toEqual([])
    expect(jieGuo.zhu_dong_dang_wei).toBe('极被动型')
    sheZhiKaiChangBaiMock(null)
  })

  it('mock 给出的档位与条数原样透传', async () => {
    sheZhiKaiChangBaiMock(() => ({
      zhu_dong_dang_wei: '主动型',
      zhu_dong_kai_kou_gai_lv: 0.85,
      xiao_xi_lie_biao: ['刚下课', '你吃了吗', '今天好冷'],
    }))
    const jieGuo = await shengChengKaiChangBai(人设)
    expect(jieGuo.zhu_dong_kai_kou_gai_lv).toBe(0.85)
    expect(jieGuo.xiao_xi_lie_biao).toHaveLength(3)
    sheZhiKaiChangBaiMock(null)
  })

  it('mock 不给档位时退回默认档', async () => {
    sheZhiKaiChangBaiMock(() => ({
      zhu_dong_dang_wei: '',
      zhu_dong_kai_kou_gai_lv: 0.5,
      xiao_xi_lie_biao: ['嗨'],
    }))
    const jieGuo = await shengChengKaiChangBai(人设)
    expect(jieGuo.zhu_dong_dang_wei).toBe(AI_PEI_ZHI.prompt.kaiChangBaiMoRenZhuDongDangWei)
    sheZhiKaiChangBaiMock(null)
  })
})
