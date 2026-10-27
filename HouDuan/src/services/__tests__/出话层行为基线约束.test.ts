import { describe, it, expect } from 'vitest'
import { gouJianWriterPrompt, gouJianDirectorPrompt } from '../Prompt构建器'
import type { AIYinQingShuRu } from '../../types'

function 造输入(追加: Record<string, unknown> = {}): AIYinQingShuRu {
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
      xing_ge: '充满热情、创意十足',
      bei_jing_gu_shi: '',
      xi_hao: ['拍照', '旅行'],
      yan_yu_feng_ge: '跳跃热情',
      xing_wei_te_dian: '',
      tou_xiang: '',
      xi_huan_de_lei_xing: '',
      jia_ting_bei_jing: '',
      qing_gan_jing_li: '',
      shi_fou_zha_xing: false,
      shi_jie_xin_xi: { cheng_shi: '长沙', jia_ting_ren_shu: 3 },
    },
    hao_gan_du: { xin_ren_du: 160, qin_mi_du: 112, qu_wei_du: 88, guan_huai_du: 92, zong_fen: 463, guan_xi_jie_duan: '朋友' },
    dui_hua_li_shi: [],
    yong_hu_xin_xiao_xi: '今天好累啊',
    shi_fou_di_yi_lun: false,
    tu_pian_shou_quan: true,
    yong_hu_xing_bie: 'nan',
    ...追加,
  } as unknown as AIYinQingShuRu
}

describe('出话层新增约束（真人行为基线导向）', () => {
  it('禁止回头挑对方前后矛盾——真人在 2431 条语料里 0 例', () => {
    const 提示 = gouJianWriterPrompt(造输入())
    expect(提示).toContain('别回头挑他前后矛盾')
    expect(提示).toContain('别反问「这不矛盾吗」')
  })

  it('对方在问具体问题时，要求第一句就在回答', () => {
    const 提示 = gouJianWriterPrompt(造输入())
    expect(提示).toContain('第一句就在回答这件事')
    expect(提示).toContain('别先反问「是在叫我吗」')
  })

  it('对方邀约时不得凭空答应自己没有依据的档期', () => {
    const 写手 = gouJianWriterPrompt(造输入({ yong_hu_xin_xiao_xi: '今晚有空吗一起吃饭' }))
    expect(写手).toContain('你自己那天有没有事')
    expect(写手).toContain('不是一律秒答应')

    const 导演 = gouJianDirectorPrompt(造输入({ yong_hu_xin_xiao_xi: '今晚有空吗一起吃饭' }))
    expect(导演).toContain('先看这个角色自己有没有那段时间的事')
    expect(导演).toContain('真人被约的时候经常是')
  })

  it('禁止约人时连着三连问', () => {
    const 导演 = gouJianDirectorPrompt(造输入({ yong_hu_xin_xiao_xi: '今晚有空吗一起吃饭' }))
    expect(导演).toContain('别一上来就问「几点」「在哪」「吃什么」连着三连问')
  })
})
