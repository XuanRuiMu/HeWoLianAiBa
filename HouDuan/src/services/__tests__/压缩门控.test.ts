import { beforeEach, describe, expect, it, vi } from 'vitest'

const kaiGuan = vi.hoisted(() => ({ zhi: false }))
vi.mock('../../config/AI配置', async (importOriginal) => {
  const shiJi = await importOriginal<typeof import('../../config/AI配置')>()
  return {
    ...shiJi,
    get yaSuoQiYong() {
      return kaiGuan.zhi
    },
  }
})

import { gouJianWriterPrompt, gouJianDirectorPrompt } from '../Prompt构建器'
import type { AIYinQingShuRu } from '../../types'

function zuZhuangShuRu(jiYiZhaiYao?: string): AIYinQingShuRu {
  return {
    yong_hu_id: 'u-1',
    jiao_se_id: 'j-1',
    jiao_se: {
      id: 'j-1',
      ming_zi: '陈雨桐',
      wei_xin_ming: '小懒猫',
      xing_bie: 'nv',
      mbti_lei_xing: 'INFP',
      ie_lei_xing: 'I',
      re_shen_lei_xing: '慢热',
      nian_ling: 20,
      shen_fen: '大学生',
      wai_mao: '长发温柔',
      xing_ge: '安静内向',
      bei_jing_gu_shi: '来自杭州的大学生',
      xi_hao: ['阅读'],
      yan_yu_feng_ge: '轻声细语',
      xing_wei_te_dian: '',
      tou_xiang: '🌙',
      xi_huan_de_lei_xing: '温柔的人',
      jia_ting_bei_jing: '独生女',
      qing_gan_jing_li: '没谈过恋爱',
      shi_fou_zha_xing: false,
      shi_jie_xin_xi: { cheng_shi: '杭州' },
      ba_da_mo_kuai: {
        ji_ben_xin_xi: '', wai_mao: '', xing_ge: '', bei_jing: '', yan_yu: '', xing_wei: '', guan_xi: '', xi_tong_ti_shi: '',
      },
    },
    hao_gan_du: { xin_ren_du: 100, qin_mi_du: 100, qu_wei_du: 100, guan_huai_du: 100, zong_fen: 400, guan_xi_jie_duan: 'renShi' },
    dui_hua_li_shi: [
      { id: 'm-1', fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '对方', nei_rong: '今天好累啊', shi_jian: '12:00', yi_che_hui: false },
    ],
    yong_hu_xin_xiao_xi: '今天好累啊',
    tu_pian_shou_quan: false,
    shi_fou_di_yi_lun: false,
    ...(jiYiZhaiYao ? { ji_yi_zhai_yao: jiYiZhaiYao } : {}),
  } as AIYinQingShuRu
}

const ZhaiYaoWenBen = '【此前记住的】他下周三要去出差'

beforeEach(() => {
  kaiGuan.zhi = false
})

describe('压缩管线停用门控（W3-C）', () => {
  it('yaSuoQiYong=false 时摘要层不注入 Writer 与 Director 提示词', () => {
    kaiGuan.zhi = false
    const writerTiShi = gouJianWriterPrompt(zuZhuangShuRu(ZhaiYaoWenBen))
    expect(writerTiShi).not.toContain(ZhaiYaoWenBen)
    expect(writerTiShi).toContain('【刚才聊了什么】')
    const directorTiShi = gouJianDirectorPrompt(zuZhuangShuRu(ZhaiYaoWenBen))
    expect(directorTiShi).not.toContain(ZhaiYaoWenBen)
  })

  it('yaSuoQiYong=true 时摘要层恢复注入', () => {
    kaiGuan.zhi = true
    const writerTiShi = gouJianWriterPrompt(zuZhuangShuRu(ZhaiYaoWenBen))
    expect(writerTiShi).toContain(ZhaiYaoWenBen)
    const directorTiShi = gouJianDirectorPrompt(zuZhuangShuRu(ZhaiYaoWenBen))
    expect(directorTiShi).toContain(ZhaiYaoWenBen)
  })

  it('无摘要时开关状态不影响历史层', () => {
    kaiGuan.zhi = true
    const tiShi = gouJianWriterPrompt(zuZhuangShuRu())
    expect(tiShi).toContain('【刚才聊了什么】')
    expect(tiShi).toContain('今天好累啊')
    expect(tiShi).not.toContain('【此前记住的】')
  })
})
