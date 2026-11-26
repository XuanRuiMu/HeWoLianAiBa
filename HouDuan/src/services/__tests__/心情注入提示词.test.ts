import { describe, expect, it } from 'vitest'
import { gouJianWriterPrompt, gouJianDirectorPrompt } from '../Prompt构建器'
import type { AIYinQingShuRu } from '../../types'

function 造输入(xinQing?: string, qiangDu?: number): AIYinQingShuRu {
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
    dang_qian_xin_qing: xinQing,
    xin_qing_qiang_du: qiangDu,
    dui_hua_li_shi: [],
    yong_hu_xin_xiao_xi: '在吗',
    shi_fou_di_yi_lun: false,
    tu_pian_shou_quan: true,
    yong_hu_xing_bie: 'nan',
  } as unknown as AIYinQingShuRu
}

describe('心情进提示词', () => {
  it('给了心情就注入对应的人话', () => {
    const 提示 = gouJianWriterPrompt(造输入('生气', 80))
    expect(提示).toContain('你此刻的状态')
    expect(提示).toContain('气头上')
    expect(提示).toContain('特别明显')
  })

  it('强度低时说成不太明显', () => {
    const 提示 = gouJianWriterPrompt(造输入('开心', 15))
    expect(提示).toContain('一点点')
  })

  it('没给心情时不注入这一行', () => {
    const 提示 = gouJianWriterPrompt(造输入())
    expect(提示).not.toContain('你此刻的状态')
  })

  it('心情值不在白名单时不注入，也不报错', () => {
    const 提示 = gouJianWriterPrompt(造输入('乱写的', 50))
    expect(提示).not.toContain('你此刻的状态')
  })

  it('导演提示词里也带 TA 此刻的状态', () => {
    const 提示 = gouJianDirectorPrompt(造输入('烦躁', 60))
    expect(提示).toContain('TA 此刻的状态')
    expect(提示).toContain('有点烦')
  })

  it('导演输出格式里包含心情三个字段', () => {
    const 提示 = gouJianDirectorPrompt(造输入('平静', 30))
    expect(提示).toContain('"心情"')
    expect(提示).toContain('"心情强度"')
    expect(提示).toContain('"心情理由"')
  })
})
