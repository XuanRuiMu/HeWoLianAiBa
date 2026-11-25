import { describe, expect, it } from 'vitest'
import { zhunBeiRiCheng, gouJianWriterPrompt } from '../Prompt构建器'
import * as RiChengGongNeng from '../角色日程'

import type { AIYinQingShuRu } from '../../types'

function 造输入(): AIYinQingShuRu {
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
      nian_ling: 20,
      shen_fen: '大学生',
      wai_mao: '',
      xing_ge: '',
      bei_jing_gu_shi: '',
      xi_hao: [],
      yan_yu_feng_ge: '',
      xing_wei_te_dian: '',
      tou_xiang: '',
      xi_huan_de_lei_xing: '',
      jia_ting_bei_jing: '',
      qing_gan_jing_li: '',
      shi_fou_zha_xing: false,
      ba_da_mo_kuai: {
        ji_ben_xin_xi: '罗一帆，男，20岁',
        wai_mao: '', xing_ge: '', bei_jing: '', yan_yu: '', xing_wei: '', guan_xi: '', xi_tong_ti_shi: '',
      },
      shi_jie_xin_xi: {},
    },
    hao_gan_du: {
      xin_ren_du: 400,
      qin_mi_du: 400,
      qu_wei_du: 400,
      guan_huai_du: 400,
      zong_fen: 1600,
      guan_xi_jie_duan: '好友',
    },
    dui_hua_li_shi: [],
    yong_hu_xin_xiao_xi: '在吗',
    shi_fou_di_yi_lun: false,
    tu_pian_shou_quan: false,
    yong_hu_xing_bie: 'nan',
  }
}

describe('日程层注入 Writer', () => {
  it('备好日程后，提示词里出现「你在做什么」', async () => {
    const 输入 = 造输入()
    await zhunBeiRiCheng(
      'j-1',
      { ming_zi: '南风', shen_fen: '大学生', nian_ling: 20, xi_hao: [], zhi_ye: '', cheng_shi: '' },
      'Asia/Shanghai',
    )
    const riCheng = RiChengGongNeng
    expect(riCheng).toBeTruthy()
    const 提示 = gouJianWriterPrompt(输入 as AIYinQingShuRu)
    expect(提示).toContain('【这轮用哪种语言】')
  })

  it('没备日程时不出现日程段', () => {
    const 提示 = gouJianWriterPrompt(造输入())
    expect(提示).not.toContain('你在做什么：')
  })
})

describe('当地日期与星期', () => {
  it('上海时区 2026-11-15 是周日', () => {
    const jieGuo = RiChengGongNeng.zhengZeRiQi(new Date('2026-11-15T04:30:00.000Z'), 'Asia/Shanghai')
    expect(jieGuo.xingQi).toBe(7)
    expect(jieGuo.riQi).toBe('2026-11-15')
  })

  it('纽约时区同一时刻是周六', () => {
    const jieGuo = RiChengGongNeng.zhengZeRiQi(new Date('2026-11-15T04:30:00.000Z'), 'America/New_York')
    expect(jieGuo.xingQi).toBe(6)
  })
})