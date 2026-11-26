import { describe, expect, it } from 'vitest'
import { panDuanBiaoQingZaiTi } from '../表情包载体'
import { jiSuanBiaoQingShouGan } from '../表情包频率'
import type { AIYinQingShuRu } from '../../types'

function 输入(ie: 'I' | 'E', 消息 = '哈哈太搞笑了'): AIYinQingShuRu {
  return {
    yong_hu_id: 'u-1',
    jiao_se_id: 'j-1',
    jiao_se: { nian_ling: 24, ie_lei_xing: ie, re_shen_lei_xing: '快热' },
    hao_gan_du: { guan_xi_jie_duan: '好友', zong_fen: 550 },
    dui_hua_li_shi: [],
    yong_hu_xin_xiao_xi: 消息,
    shi_fou_di_yi_lun: false,
    tu_pian_shou_quan: false,
  } as unknown as AIYinQingShuRu
}

describe('人格决定表情包频率和梗图范围', () => {
  it('风格由年龄档决定，青年档含梗图', () => {
    const 内 = panDuanBiaoQingZaiTi(输入('I'))
    const 外 = panDuanBiaoQingZaiTi(输入('E'))
    expect(内.yunXuFengGe).toContain('梗图')
    expect(外.yunXuFengGe).toContain('梗图')
    expect(外.geiHouXuan).toBe(true)
  })

  it('人设气质决定频率：沙雕搞怪明显比正经严肃发得多', () => {
    const 沙雕 = jiSuanBiaoQingShouGan([], { ie_lei_xing: 'E', re_shen_lei_xing: '快热', ren_she_qi_zhi: ['沙雕搞怪'] }, '好友')
    const 正经 = jiSuanBiaoQingShouGan([], { ie_lei_xing: 'I', re_shen_lei_xing: '慢热', ren_she_qi_zhi: ['正经严肃'] }, '好友')
    expect(沙雕.qiWangJianGeLunShu).toBeLessThan(正经.qiWangJianGeLunShu)
    expect(沙雕.qiWangJianGeLunShu).toBeLessThan(20)
  })

  it('无气质时回退到 IE，外向比内向发得多', () => {
    const 内 = jiSuanBiaoQingShouGan([], { ie_lei_xing: 'I', re_shen_lei_xing: '快热' }, '好友')
    const 外 = jiSuanBiaoQingShouGan([], { ie_lei_xing: 'E', re_shen_lei_xing: '快热' }, '好友')
    expect(外.qiWangJianGeLunShu).toBeLessThan(内.qiWangJianGeLunShu)
  })

  it('长辈人设无论外向与否都不发梗图，年龄档优先', () => {
    const 结果 = panDuanBiaoQingZaiTi(输入('E').jiao_se = { nian_ling: 66, ie_lei_xing: 'E', re_shen_lei_xing: '快热' } as never)
    expect(结果.nianLingDang).toBe('长辈')
    expect(结果.yunXuFengGe).not.toContain('梗图')
  })
})
