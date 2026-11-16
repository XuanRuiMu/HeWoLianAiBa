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

describe('关系阶段描述按中文档名取值', () => {
  it('库里存中文档名时能取到该档的态度描述', () => {
    const 提示 = gouJianWriterPrompt(
      造输入({
        hao_gan_du: {
          xin_ren_du: 160,
          qin_mi_du: 112,
          qu_wei_du: 88,
          guan_huai_du: 92,
          zong_fen: 463,
          guan_xi_jie_duan: '朋友',
        },
      }),
    )
    expect(提示).toContain('关系阶段：朋友')
    expect(提示).toContain('你把对方当朋友，会主动找对方聊天')
    expect(提示).not.toContain('还不太清楚')
  })

  it('未知档名兜底到冷淡而不是报错', () => {
    const 提示 = gouJianWriterPrompt(
      造输入({
        hao_gan_du: {
          xin_ren_du: 160,
          qin_mi_du: 112,
          qu_wei_du: 88,
          guan_huai_du: 92,
          zong_fen: 463,
          guan_xi_jie_duan: '乱写的',
        },
      }),
    )
    expect(提示).toContain('刚认识，没什么话好说')
  })

  it('两档之间的态度描述必须不同——否则玩家升档感觉不到变化', () => {
    const 造 = (duan: string) =>
      gouJianWriterPrompt(
        造输入({
          hao_gan_du: {
            xin_ren_du: 500,
            qin_mi_du: 500,
            qu_wei_du: 500,
            guan_huai_du: 500,
            zong_fen: 2000,
            guan_xi_jie_duan: duan,
          },
        }),
      )
    const 取态度 = (提示: string) => 提示.match(/对 TA 的态度：(.+)/)?.[1] ?? ''
    const 朋友 = 取态度(造('朋友'))
    const 暧昧 = 取态度(造('暧昧'))
    const 热恋 = 取态度(造('热恋'))
    expect(朋友).not.toBe('')
    expect(暧昧).not.toBe('')
    expect(热恋).not.toBe('')
    expect(new Set([朋友, 暧昧, 热恋]).size).toBe(3)
  })
})

describe('Director 输出的关系变化会进 Writer 提示词', () => {
  it('三条取值分别映射成一句人话，且不出现英文枚举值', () => {
    const 造 = (bianHua: '更近' | '更远' | '没变') =>
      gouJianWriterPrompt(造输入(), {
        hui_fu_ce_lue: 'normal',
        shi_jian_qing_xu: '正常',
        shi_fou_hui_fu: true,
        guan_xi_bian_hua: bianHua,
      })

    expect(造('更近')).toContain('对方这条让你觉得：更近')
    expect(造('更远')).toContain('对方这条让你觉得：更远')
    expect(造('没变')).toContain('对方这条让你觉得：没变')

    expect(造('更近')).toContain('心里是软的')
    expect(造('更远')).toContain('有点不是滋味')
  })

  it('Director 没给这个字段时不注入这一行', () => {
    const 提示 = gouJianWriterPrompt(造输入(), {
      hui_fu_ce_lue: 'normal',
      shi_jian_qing_xu: '正常',
      shi_fou_hui_fu: true,
    })
    expect(提示).not.toContain('对方这条让你觉得')
  })
})
