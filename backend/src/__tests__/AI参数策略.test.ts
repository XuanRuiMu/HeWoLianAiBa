import { describe, it, expect } from 'vitest'
import { jiSuanAIChanShu } from '../config/AI参数策略'
import { AI_PEI_ZHI } from '../config/AI配置'

const AI_MO_XING = 'deepseek-v4-flash'

describe('FP-01 AI参数策略引擎', () => {
  it('不传上下文 → 仅用基座值（向后兼容，温度/模型不变）', () => {
    const leiXing = 'writer' as const
    const ji = AI_PEI_ZHI.moXing[leiXing]
    const jieGuo = jiSuanAIChanShu(leiXing)

    expect(jieGuo.moXing).toBe(AI_MO_XING)
    expect(jieGuo.wenDu).toBe(ji.wenDu)
    expect(jieGuo.top_p).toBe(ji.top_p)
    expect(jieGuo.zuiDaTokens).toBe(ji.zuiDaTokens)
    expect(jieGuo.siKaoMoShi).toBe(ji.siKaoMoShi)
  })

  it('人设 E 型 → 温度 +0.1', () => {
    const ji = AI_PEI_ZHI.moXing.director
    const jieGuo = jiSuanAIChanShu('director', { jiaoSe: { ie_lei_xing: 'E' } })
    expect(jieGuo.wenDu).toBe(Number((ji.wenDu + 0.1).toFixed(2)))
  })

  it('人设 I 型 → 温度 -0.05', () => {
    const ji = AI_PEI_ZHI.moXing.director
    const jieGuo = jiSuanAIChanShu('director', { jiaoSe: { ie_lei_xing: 'I' } })
    expect(jieGuo.wenDu).toBe(Number((ji.wenDu - 0.05).toFixed(2)))
  })

  it('人设快热 → 温度 +0.05，慢热 → -0.05', () => {
    const ji = AI_PEI_ZHI.moXing.director
    const kuaiRe = jiSuanAIChanShu('director', { jiaoSe: { re_shen_lei_xing: '快热' } })
    const manRe = jiSuanAIChanShu('director', { jiaoSe: { re_shen_lei_xing: '慢热' } })
    expect(kuaiRe.wenDu).toBe(Number((ji.wenDu + 0.05).toFixed(2)))
    expect(manRe.wenDu).toBe(Number((ji.wenDu - 0.05).toFixed(2)))
  })

  it('渣型 → 温度 +0.05', () => {
    const ji = AI_PEI_ZHI.moXing.director
    const jieGuo = jiSuanAIChanShu('director', { jiaoSe: { shi_fou_zha_xing: true } })
    expect(jieGuo.wenDu).toBe(Number((ji.wenDu + 0.05).toFixed(2)))
  })

  it('发散思维（文本含"脑洞"） → 温度 +0.05', () => {
    const ji = AI_PEI_ZHI.moXing.director
    const jieGuo = jiSuanAIChanShu('director', { jiaoSe: { xing_ge: '脑洞清奇' } })
    expect(jieGuo.wenDu).toBe(Number((ji.wenDu + 0.05).toFixed(2)))
  })

  it('暖性文本 → 温度 +0.1，理性文本 → -0.1', () => {
    const ji = AI_PEI_ZHI.moXing.director
    const nuan = jiSuanAIChanShu('director', { jiaoSe: { xing_ge: '温柔浪漫' } })
    const li = jiSuanAIChanShu('director', { jiaoSe: { xing_ge: '理性冷静' } })
    expect(nuan.wenDu).toBe(Number((ji.wenDu + 0.1).toFixed(2)))
    expect(li.wenDu).toBe(Number((ji.wenDu - 0.1).toFixed(2)))
  })

  it('关系阶段 热恋 → +0.05，冷淡 → -0.05', () => {
    const ji = AI_PEI_ZHI.moXing.director
    const reLian = jiSuanAIChanShu('director', { haoGanDu: { guan_xi_jie_duan: 'reLian' } })
    const lengDan = jiSuanAIChanShu('director', { haoGanDu: { guan_xi_jie_duan: 'lengDan' } })
    expect(reLian.wenDu).toBe(Number((ji.wenDu + 0.05).toFixed(2)))
    expect(lengDan.wenDu).toBe(Number((ji.wenDu - 0.05).toFixed(2)))
  })

  it('场景 吵架 → -0.15，表白/浪漫 → +0.1，安慰 → +0.05', () => {
    const ji = AI_PEI_ZHI.moXing.director
    const chaoJia = jiSuanAIChanShu('director', { changJing: 'chaoJia' })
    const biaoBai = jiSuanAIChanShu('director', { changJing: 'biaoBai' })
    const langMan = jiSuanAIChanShu('director', { changJing: 'langMan' })
    const anWei = jiSuanAIChanShu('director', { changJing: 'anWei' })
    expect(chaoJia.wenDu).toBe(Number((ji.wenDu - 0.15).toFixed(2)))
    expect(biaoBai.wenDu).toBe(Number((ji.wenDu + 0.1).toFixed(2)))
    expect(langMan.wenDu).toBe(Number((ji.wenDu + 0.1).toFixed(2)))
    expect(anWei.wenDu).toBe(Number((ji.wenDu + 0.05).toFixed(2)))
  })

  it('温度始终钳制在 [0,2] 且保留 2 位小数', () => {
    for (const leiXing of Object.keys(AI_PEI_ZHI.moXing) as (keyof typeof AI_PEI_ZHI.moXing)[]) {
      const jieGuo = jiSuanAIChanShu(leiXing, {
        jiaoSe: { ie_lei_xing: 'I', re_shen_lei_xing: '慢热', xing_ge: '理性冷静高冷' },
        haoGanDu: { guan_xi_jie_duan: 'lengDan' },
        changJing: 'chaoJia',
      })
      expect(jieGuo.wenDu).toBeGreaterThanOrEqual(0)
      expect(jieGuo.wenDu).toBeLessThanOrEqual(2)
      expect(Number.isInteger(jieGuo.wenDu * 100)).toBe(true)
    }
  })

  it('top_p 来自基座配置', () => {
    expect(jiSuanAIChanShu('writer').top_p).toBe(0.95)
    expect(jiSuanAIChanShu('anQuanShenHe').top_p).toBe(0.1)
    expect(jiSuanAIChanShu('qingGanFenXi').top_p).toBe(0.2)
  })

  it('所有场景 moXing 固定为 deepseek-v4-flash', () => {
    for (const leiXing of Object.keys(AI_PEI_ZHI.moXing) as (keyof typeof AI_PEI_ZHI.moXing)[]) {
      expect(jiSuanAIChanShu(leiXing).moXing).toBe(AI_MO_XING)
    }
  })
})
