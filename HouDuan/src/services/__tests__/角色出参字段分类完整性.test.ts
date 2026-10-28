import { describe, expect, it, vi } from 'vitest'

vi.mock('../../redis', () => ({
  redis: {
    set: vi.fn(async () => 'OK'),
    get: vi.fn(async () => null),
    del: vi.fn(async () => 1),
  },
}))

import {
  JIAO_SE_YIN_SI_ZI_DUAN,
  touYingWanJiaKeJianJiaoSe,
  type ShengChengJiaoSeJieGuo,
} from '../角色生成'

const 全字段夹具: Record<keyof ShengChengJiaoSeJieGuo, unknown> = {
  id: '00000000-0000-4000-8000-000000000001',
  ming_zi: '内部名',
  xing_bie: 'nv',
  nian_ling: 20,
  shen_fen: '学生',
  wai_mao: '短发',
  xing_ge: '安静',
  bei_jing_gu_shi: '背景故事',
  xi_hao: ['读书'],
  yan_yu_feng_ge: '轻声',
  xing_wei_te_dian: '爱低头',
  tou_xiang: '👩',
  biao_qian: ['标签'],
  xi_huan_de_lei_xing: '文静',
  jia_ting_bei_jing: '家庭',
  qing_gan_jing_li: '经历',
  shi_fou_zha_xing: false,
  zha_fa_miao_shu: '渣发',
  hua_shu: ['话术'],
  bao_lu_fang_shi: '暴露',
  shi_po_xian_suo: ['破绽'],
  yu_she_lei_xing: 'INFP',
  mbti_lei_xing: 'INFP',
  ie_lei_xing: 'I',
  sui_ji_xing_ge: false,
  re_shen_lei_xing: '慢热',
  hui_fu_yan_chi_hao_miao: 1200,
  wei_xin_ming: '微信名',
  zhen_shi_ming: '真名',
  shi_jie_xin_xi: { cheng_shi: '城' },
  xi_tong_ti_shi: '系统提示',
  ba_da_mo_kuai: {
    ji_ben_xin_xi: '基本信息',
    wai_mao: '外貌',
    xing_ge: '性格',
    bei_jing: '背景',
    yan_yu: '言语',
    xing_wei: '行为',
    guan_xi: '关系',
    xi_tong_ti_shi: '提示',
  },
  hao_gan_du_zong_fen: 520,
  voice_id: 'yin-se',
  yao_kai_kou: true,
}

const 玩家可见字段 = [
  'id',
  'xing_bie',
  'nian_ling',
  'shen_fen',
  'wai_mao',
  'xing_ge',
  'xi_hao',
  'yan_yu_feng_ge',
  'xing_wei_te_dian',
  'tou_xiang',
  'biao_qian',
  'xi_huan_de_lei_xing',
  'jia_ting_bei_jing',
  'qing_gan_jing_li',
  'yu_she_lei_xing',
  'mbti_lei_xing',
  'ie_lei_xing',
  'sui_ji_xing_ge',
  're_shen_lei_xing',
  'hui_fu_yan_chi_hao_miao',
  'wei_xin_ming',
  'voice_id',
  'yao_kai_kou',
] as const satisfies readonly (keyof ShengChengJiaoSeJieGuo)[]

const 玩家不可见字段 = [
  ...JIAO_SE_YIN_SI_ZI_DUAN,
  'shi_fou_zha_xing',
  'zha_fa_miao_shu',
  'hua_shu',
  'bao_lu_fang_shi',
  'shi_po_xian_suo',
  'hao_gan_du_zong_fen',
] as const satisfies readonly (keyof ShengChengJiaoSeJieGuo)[]

type 未分类字段 = Exclude<
  keyof ShengChengJiaoSeJieGuo,
  (typeof 玩家可见字段)[number] | (typeof 玩家不可见字段)[number]
>

const 分类已穷尽: 未分类字段 extends never ? true : ['存在未分类字段', 未分类字段] = true

describe('角色出参字段分类完整性', () => {
  it('每个角色字段都必须被显式归类为玩家可见或玩家不可见', () => {
    expect(分类已穷尽).toBe(true)
    expect(new Set(玩家可见字段).size).toBe(玩家可见字段.length)
    expect(new Set(玩家不可见字段).size).toBe(玩家不可见字段.length)
    const 交集 = 玩家可见字段.filter((名) =>
      (玩家不可见字段 as readonly string[]).includes(名),
    )
    expect(交集, `字段同时出现在两张表：${交集.join('、')}`).toEqual([])
  })

  it('玩家透出层的键集恰等于可见字段表，新增字段不会默认透出', () => {
    const 透出 = touYingWanJiaKeJianJiaoSe(全字段夹具) as Record<string, unknown>
    expect(Object.keys(透出).sort()).toEqual([...玩家可见字段].sort())
    for (const 名 of 玩家不可见字段) {
      expect(名 in 透出, `${名} 泄漏到玩家透出层`).toBe(false)
    }
  })

  it('全字段夹具的敏感值不会出现在序列化结果中', () => {
    const 序列化 = JSON.stringify(touYingWanJiaKeJianJiaoSe(全字段夹具))
    for (const 值 of ['内部名', '真名', '背景故事', '系统提示', '渣发', '话术', '520']) {
      expect(序列化).not.toContain(值)
    }
    expect(序列化).toContain('微信名')
  })

  it('夹具外新增的敏感字段默认不可见（fail-closed）', () => {
    const 带新增敏感字段 = {
      ...全字段夹具,
      ce_shi_min_gan_xin_zi_duan: '绝密新增字段内容',
    } as unknown as ShengChengJiaoSeJieGuo
    const 透出 = touYingWanJiaKeJianJiaoSe(带新增敏感字段) as unknown as Record<string, unknown>
    expect('ce_shi_min_gan_xin_zi_duan' in 透出).toBe(false)
    expect(JSON.stringify(透出)).not.toContain('绝密新增字段内容')
  })
})
