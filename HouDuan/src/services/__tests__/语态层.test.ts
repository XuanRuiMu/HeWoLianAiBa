import { describe, it, expect } from 'vitest'
import { gouJianYuTaiCeng } from '../语态层'
import { gouJianWriterPrompt } from '../Prompt构建器'
import type { AIYinQingShuRu } from '../../types'

function 造输入(追加: Record<string, unknown> = {}): AIYinQingShuRu {
  return {
    yong_hu_id: 'u-1',
    jiao_se_id: 'j-1',
    jiao_se: {
      wei_xin_ming: '林知夏',
      mbti_lei_xing: 'INTP',
      shen_fen: '大学生',
      shi_fou_zha_xing: false,
      xing_bie: 'nv',
      nian_ling: 22,
      cheng_shi: '杭州',
      zhi_ye: '学生',
      xing_ge_biao_qian: [],
      ai_hao: [],
      shuo_hua_feng_ge: '简短',
      bao_lu_fang_shi: '',
      hua_shu: [],
      bei_jing_gu_shi: '',
      tou_xiang_url: '',
    },
    hao_gan_du: {
      xin_ren_du: 150,
      qin_mi_du: 110,
      qu_wei_du: 90,
      guan_huai_du: 80,
      zong_fen: 430,
      guan_xi_jie_duan: '熟悉',
    },
    dui_hua_li_shi: [],
    yong_hu_xin_xiao_xi: '今天加班到八点 饿得不行',
    shi_fou_di_yi_lun: false,
    tu_pian_shou_quan: false,
    ...追加,
  } as unknown as AIYinQingShuRu
}

describe('语态层', () => {
  it('有用户消息时给出在忙与语态指令', () => {
    const 块 = gouJianYuTaiCeng(造输入(), () => 0.5)
    expect(块).toContain('【你最近在忙】')
    expect(块).toContain('【这一轮你就这样回】')
    expect(块).toContain('【别复读】')
  })

  it('没有用户消息（角色主动发）时不插语态', () => {
    expect(gouJianYuTaiCeng(造输入({ yong_hu_xin_xiao_xi: '' }))).toBe('')
    expect(gouJianYuTaiCeng(造输入({ zui_jia_shuo_de_shi: '想说点别的' }))).toBe('')
  })

  it('对方表白时必须回应这件事本身', () => {
    const 块 = gouJianYuTaiCeng(造输入({ yong_hu_xin_xiao_xi: '林知夏 我喜欢你 咱俩在一起吧' }), () => 0.5)
    expect(块).toContain('【这一刻你躲不掉】')
    expect(块).toContain('明确的回应')
  })

  it('普通消息不触发表白约束', () => {
    expect(gouJianYuTaiCeng(造输入(), () => 0.5)).not.toContain('【这一刻你躲不掉】')
  })

  it('同一角色的在忙跨轮稳定', () => {
    const 甲 = gouJianYuTaiCeng(造输入(), () => 0.1)
    const 乙 = gouJianYuTaiCeng(造输入({ yong_hu_xin_xiao_xi: '周末一般你都在干嘛' }), () => 0.9)
    const 取忙 = (块: string) => 块.split('【你最近在忙】')[1].split('【这一轮你就这样回】')[0]
    expect(取忙(甲)).toBe(取忙(乙))
  })

  it('说过的那件事不再出现在在忙里', () => {
    const 首轮 = gouJianYuTaiCeng(造输入(), () => 0.5)
    const 待办 = 首轮.split('【你最近在忙】')[1].split('\n')[1].split('；')
    const 二轮 = gouJianYuTaiCeng(
      造输入({
        dui_hua_li_shi: [{ fa_song_zhe_lei_xing: 'jiaose', nei_rong: 待办[0], fa_song_zhe_ming: '她' }],
      }),
      () => 0.5,
    )
    expect(二轮).not.toContain(待办[0])
  })
})

describe('Writer 提示词接入', () => {
  it('要回时带上语态层', () => {
    const 提示 = gouJianWriterPrompt(造输入(), { shi_fou_hui_fu: true, shi_jian_qing_xu: '正常' })
    expect(提示).toContain('【这一轮你就这样回】')
  })

  it('已读不回时不带语态层', () => {
    const 提示 = gouJianWriterPrompt(造输入(), { shi_fou_hui_fu: false, shi_jian_qing_xu: '低' })
    expect(提示).toContain('这次先不回')
    expect(提示).not.toContain('【这一轮你就这样回】')
  })

  it('语态层排在最后，不打断历史前缀的缓存', () => {
    const 提示 = gouJianWriterPrompt(造输入(), { shi_fou_hui_fu: true })
    const 语态位 = 提示.indexOf('【这一轮你就这样回】')
    const 人设位 = 提示.indexOf('【你自己】')
    expect(人设位).toBeGreaterThan(-1)
    expect(语态位).toBeGreaterThan(人设位)
    expect(提示.endsWith('对方已经知道的信息不用重复。')).toBe(true)
  })
})
