import { describe, it, expect } from 'vitest'
import { yingSheJieGuoLeiXing } from '../services/战绩'
import { huoQuFanYi } from '../config/translations'
import type { YouXiJieGuoLeiXing } from '../types'

// 回归：jieJu 翻译文案改版后，新落库的战绩必须按「当前文案」正确归类，
// 否则会像此前秘籍通关（结果类型=「在一起了 💕」）那样被错判为「进行中」。
describe('yingSheJieGuoLeiXing 分组归类', () => {
  const 胜利枚举: YouXiJieGuoLeiXing[] = [
    'sheng_li_ai_qing',
    'sheng_li_hu_shan_sheng_li',
    'sheng_li_shi_po',
    'sheng_li_shen_jing_bing',
  ]
  const 失败枚举: YouXiJieGuoLeiXing[] = [
    'shi_bai_guo_zao_biao_bai',
    'shi_bai_hu_shan_shi_bai',
    'shi_bai_cuo_wu_shi_po',
    'shi_bai_hao_gan_du_gui_ling',
    'shi_bai_ju_jue_biao_bai',
    'shi_bai_bei_qi_pian',
    'shi_bai_bei_zha_xing_qi_pian',
    'shi_bai_shen_jing_bing',
  ]

  it('当前翻译文案都能正确映射到对应枚举（不遗漏、不串组）', () => {
    for (const leiXing of [...胜利枚举, ...失败枚举]) {
      const wenBen = huoQuFanYi('jieJu', leiXing)
      expect(wenBen, `翻译缺失: ${leiXing}`).toBeTruthy()
      expect(yingSheJieGuoLeiXing(wenBen, false)).toBe(leiXing)
      expect(yingSheJieGuoLeiXing(wenBen, true)).toBe(leiXing)
    }
  })

  it('秘籍通关（当前文案「在一起了 💕」）归类为胜利-爱情而非进行中', () => {
    const wenBen = huoQuFanYi('jieJu', 'sheng_li_ai_qing')
    expect(wenBen).toContain('在一起')
    expect(yingSheJieGuoLeiXing(wenBen, false)).toBe('sheng_li_ai_qing')
  })

  it('兼容改版前的历史旧文案（如「胜利-爱情」）仍归类正确', () => {
    expect(yingSheJieGuoLeiXing('胜利-爱情', false)).toBe('sheng_li_ai_qing')
    expect(yingSheJieGuoLeiXing('胜利-互删胜利', false)).toBe('sheng_li_hu_shan_sheng_li')
    expect(yingSheJieGuoLeiXing('失败-被欺骗', true)).toBe('shi_bai_bei_qi_pian')
    expect(yingSheJieGuoLeiXing('失败-被诈型欺骗', true)).toBe('shi_bai_bei_zha_xing_qi_pian')
  })

  it('进行中（未封存且无对应结局文案）归类为 jinxing_zhong', () => {
    expect(yingSheJieGuoLeiXing('', false)).toBe('jinxing_zhong')
    expect(yingSheJieGuoLeiXing('随便一段文本', false)).toBe('jinxing_zhong')
  })

  it('未知结局文案但已封存，归类为默认失败', () => {
    expect(yingSheJieGuoLeiXing('未知文案', true)).toBe('shi_bai_hao_gan_du_gui_ling')
  })
})
