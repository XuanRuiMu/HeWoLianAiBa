import { describe, expect, it } from 'vitest'
import { gouJianWriterPrompt } from '../Prompt构建器'
import type { AIYinQingShuRu } from '../../types'

function 造输入(gengDuo: Record<string, unknown> = {}): AIYinQingShuRu {
  return {
    yong_hu_id: 'u-1',
    jiao_se_id: 'j-1',
    jiao_se: {
      id: 'j-1',
      ming_zi: '罗一帆',
      wei_xin_ming: '南风',
      xing_bie: 'nan',
      mbti_lei_xing: 'ENFP',
      ie_lei_xing: 'E',
      re_shen_lei_xing: '快热',
      nian_ling: 18,
      shen_fen: '大学生',
      wai_mao: '眼睛有光',
      xing_ge: '充满热情',
      bei_jing_gu_shi: '',
      xi_hao: ['拍照'],
      yan_yu_feng_ge: '跳跃',
      xing_wei_te_dian: '',
      tou_xiang: '',
      xi_huan_de_lei_xing: '',
      jia_ting_bei_jing: '',
      qing_gan_jing_li: '',
      shi_fou_zha_xing: false,
      shi_jie_xin_xi: {},
    },
    hao_gan_du: {
      xin_ren_du: 160,
      qin_mi_du: 112,
      qu_wei_du: 88,
      guan_huai_du: 92,
      zong_fen: 463,
      guan_xi_jie_duan: '朋友',
    },
    dui_hua_li_shi: [],
    yong_hu_xin_xiao_xi: '在吗',
    shi_fou_di_yi_lun: false,
    tu_pian_shou_quan: true,
    yong_hu_xing_bie: 'nan',
    ...gengDuo,
  } as unknown as AIYinQingShuRu
}

describe('语言层进提示词', () => {
  it('中国时区用户默认中文', () => {
    const 提示 = gouJianWriterPrompt(造输入({ yong_hu_yu_yan: 'zh' }))
    expect(提示).toContain('【这轮用哪种语言】')
    expect(提示).toContain('对方平时用中文')
  })

  it('美国时区用户默认英文', () => {
    const 提示 = gouJianWriterPrompt(造输入({ yong_hu_yu_yan: 'en' }))
    expect(提示).toContain('对方平时用英文')
  })

  it('会多门语言时列出清单', () => {
    const 提示 = gouJianWriterPrompt(
      造输入({
        yong_hu_yu_yan: 'en',
        jiao_se: { chi_you_yu_yan: ['en', 'zh'] },
      }),
    )
    expect(提示).toContain('你会这些语言')
    expect(提示).toContain('英文')
    expect(提示).toContain('中文')
  })

  it('用户没要求换语言时不出现强制条款', () => {
    const 提示 = gouJianWriterPrompt(造输入({ yong_hu_yu_yan: 'zh' }))
    expect(提示).not.toContain('一个字都别混别的语言')
  })

  it('本轮强制换语言时压过默认', () => {
    const 提示 = gouJianWriterPrompt(
      造输入({ yong_hu_yu_yan: 'zh' }),
      { qiang_zhi_yu_yan: 'en' },
    )
    expect(提示).toContain('对方这轮明确要求了')
    expect(提示).toContain('一个字都别混别的语言')
  })

  it('历史约定的语言排在本轮强制之后', () => {
    const 提示 = gouJianWriterPrompt(
      造输入({ yong_hu_yu_yan: 'zh', qiang_zhi_yu_yan: 'en' }),
    )
    expect(提示).toContain('对方之前说过')
    expect(提示).toContain('英文')
  })

  it('换语言要求跟默认语言一样时也能正常输出', () => {
    const 提示 = gouJianWriterPrompt(
      造输入({ yong_hu_yu_yan: 'zh' }),
      { qiang_zhi_yu_yan: 'zh' },
    )
    expect(提示).toContain('中文')
    expect(提示).toContain('一个字都别混别的语言')
  })
})
