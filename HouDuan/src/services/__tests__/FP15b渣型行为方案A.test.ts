import { describe, expect, it } from 'vitest'
import { gouJianWriterPrompt, gouJianDirectorPrompt } from '../Prompt构建器'
import { jieXiDirectorXiangYing } from '../Director'
import type { AIYinQingShuRu } from '../../types'

const HUA_SHU = ['你很有趣，值得研究', '感情对我来说是低优先级', '我不是在忽冷忽热，我就是这样']

function 造输入(shiZhaXing: boolean): AIYinQingShuRu {
  return {
    yong_hu_id: 'u-1',
    jiao_se_id: 'j-1',
    jiao_se: {
      id: 'j-1',
      ming_zi: '沈砚',
      wei_xin_ming: '沈砚',
      xing_bie: 'nan',
      mbti_lei_xing: 'INTJ',
      ie_lei_xing: 'I',
      re_shen_lei_xing: '慢热',
      nian_ling: 25,
      shen_fen: '设计师',
      wai_mao: '冷淡',
      xing_ge: '理性克制',
      bei_jing_gu_shi: '',
      xi_hao: ['看书'],
      yan_yu_feng_ge: '一针见血',
      xing_wei_te_dian: '',
      tou_xiang: '',
      xi_huan_de_lei_xing: '',
      jia_ting_bei_jing: '',
      qing_gan_jing_li: '',
      shi_fou_zha_xing: shiZhaXing,
      zha_fa_miao_shu: '用智力碾压和冷幽默让你着迷，但本质上把你当作观察对象。',
      hua_shu: [...HUA_SHU],
      bao_lu_fang_shi: '分析你的情绪和反应像做实验，缺乏真正的情感投入。',
      shi_po_xian_suo: ['把你当案例讨论', '情绪波动很小', '对你的痛苦反应冷淡'],
      shi_jie_xin_xi: { cheng_shi: '厦门' },
    },
    hao_gan_du: { xin_ren_du: 160, qin_mi_du: 112, qu_wei_du: 88, guan_huai_du: 92, zong_fen: 463, guan_xi_jie_duan: '朋友' },
    dui_hua_li_shi: [],
    yong_hu_xin_xiao_xi: '我今天有点累，想找你说说话',
    shi_fou_di_yi_lun: false,
    tu_pian_shou_quan: true,
    yong_hu_xing_bie: 'nv',
  } as unknown as AIYinQingShuRu
}

describe('FP15b 渣型方案A：具体动作指令', () => {
  it('渣型角色的写手 prompt 含每轮动作指令与可直接引用的话术原句', () => {
    const tiShi = gouJianWriterPrompt(造输入(true))
    expect(tiShi).toContain('本轮渣动作')
    expect(tiShi).toContain('本轮就从这些里挑一句')
    expect(tiShi).toContain('推拉')
    expect(tiShi).toContain('延迟回应')
    expect(tiShi).toContain('本轮至少让对方看到一句能引用、能被识破的渣迹象')
    for (const hua of HUA_SHU) expect(tiShi).toContain(hua)
  })

  it('非渣型角色的写手 prompt 不含渣动作指令，也不含渣话术', () => {
    const tiShi = gouJianWriterPrompt(造输入(false))
    expect(tiShi).not.toContain('本轮渣动作')
    expect(tiShi).not.toContain('本轮就从这些里挑一句')
    expect(tiShi).not.toContain('推拉')
    expect(tiShi).not.toContain('延迟回应')
    for (const hua of HUA_SHU) expect(tiShi).not.toContain(hua)
  })

  it('渣型角色的导演 prompt 输出格式含渣动作字段与可落地指令', () => {
    const tiShi = gouJianDirectorPrompt(造输入(true))
    expect(tiShi).toContain('"渣动作"')
    expect(tiShi).toContain('先从角色的话术里挑一句能直接说出口的')
    expect(tiShi).toContain('填进「渣动作」字段')
  })

  it('非渣型角色的导演 prompt 输出格式不含渣动作字段', () => {
    const tiShi = gouJianDirectorPrompt(造输入(false))
    expect(tiShi).not.toContain('"渣动作"')
    expect(tiShi).not.toContain('填进「渣动作」字段')
  })
})

describe('FP15b 渣型方案A：Director 透传', () => {
  it('Director 解析能读出中文键渣动作字段', () => {
    const jieGuo = jieXiDirectorXiangYing(JSON.stringify({
      '回复策略': '接住对方的话',
      '渣动作': '先用「你很有趣，值得研究」接住，再冷一句把话递回去',
    }))
    expect(jieGuo.jieXiChengGong).toBe(true)
    expect(jieGuo.ceLue.zha_dong_zuo).toBe('先用「你很有趣，值得研究」接住，再冷一句把话递回去')
  })

  it('Director 解析能读出拼音键 zha_dong_zuo，空串视为未给', () => {
    const jia = jieXiDirectorXiangYing(JSON.stringify({ zha_dong_zuo: '挑一句原句再反问吊着' }))
    expect(jia.ceLue.zha_dong_zuo).toBe('挑一句原句再反问吊着')
    const yi = jieXiDirectorXiangYing(JSON.stringify({ 渣动作: '   ' }))
    expect(yi.jieXiChengGong).toBe(true)
    expect(yi.ceLue.zha_dong_zuo).toBeUndefined()
  })

  it('导演给的渣动作能进入写手 prompt 的独立动作层', () => {
    const dongZuo = '本轮先说「感情对我来说是低优先级」，再冷一句收住'
    const tiShi = gouJianWriterPrompt(造输入(true), {
      hui_fu_ce_lue: '淡淡接住',
      zha_dong_zuo: dongZuo,
    })
    expect(tiShi).toContain('【本轮渣动作（导演指定，必须落地）】')
    expect(tiShi).toContain(dongZuo)
    expect(tiShi).toContain('让对方能引用、能识破')
  })

  it('未给渣动作时不出现导演指定层', () => {
    const tiShi = gouJianWriterPrompt(造输入(true), { hui_fu_ce_lue: '淡淡接住' })
    expect(tiShi).not.toContain('【本轮渣动作（导演指定，必须落地）】')
  })
})
