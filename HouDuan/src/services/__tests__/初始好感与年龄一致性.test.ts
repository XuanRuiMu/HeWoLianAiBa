import { describe, expect, it } from 'vitest'
import {
  shengChengHaoGanDuZongFen,
  shengChengHaoGanDuSiWei,
  shengChengJiaoSe,
} from '../角色生成'
import { fenJieSiWei, jiSuanZongFen, jiSuanShiJiZengLiang } from '../好感度'
import { haoGanDuJiChuFanWei } from '../../config/角色配置'
import { HaoGanDuPeiZhi } from '../../config/好感度配置'
import { gouJianHaoGanDuPingPanPrompt } from '../Prompt构建器'

describe('初始好感度按人设基准波动', () => {
  it('ESFP/外向基准分高于 INTJ/内向', () => {
    expect(haoGanDuJiChuFanWei.ESFP[0]).toBeGreaterThan(haoGanDuJiChuFanWei.INTJ[0])
  })

  it('同一 MBTI 多次生成会在区间内波动而不是恒定', () => {
    const [下界, 上界] = haoGanDuJiChuFanWei.ESFP
    const 结果集 = new Set<number>()
    for (let i = 0; i < 120; i += 1) 结果集.add(shengChengHaoGanDuZongFen('ESFP', false))
    for (const 分 of 结果集) {
      expect(分).toBeGreaterThanOrEqual(下界)
      expect(分).toBeLessThanOrEqual(上界)
    }
    expect(结果集.size).toBeGreaterThan(1)
  })

  it('渣型加成读取配置且不会把初始分推到暧昧档', () => {
    const 普通 = shengChengHaoGanDuZongFen('INTJ', false)
    let 渣型最高 = 0
    let 渣型最低 = Number.MAX_SAFE_INTEGER
    for (let i = 0; i < 200; i += 1) {
      const 分 = shengChengHaoGanDuZongFen('INTJ', true)
      渣型最高 = Math.max(渣型最高, 分)
      渣型最低 = Math.min(渣型最低, 分)
    }
    expect(渣型最高).toBeGreaterThanOrEqual(普通)
    expect(渣型最高).toBeLessThanOrEqual(HaoGanDuPeiZhi.zhaXing.eWaiJiaFen.I.shangXian)
    expect(渣型最低).toBeGreaterThan(haoGanDuJiChuFanWei.INTJ[1])
    expect(渣型最高).toBeLessThan(601)
  })

  it('四维初始值按权重分配，直和严格等于总分', () => {
    const 总分 = 250
    const siWei = shengChengHaoGanDuSiWei('ESFP', 总分)
    expect(siWei.zong_fen).toBe(总分)
    expect(jiSuanZongFen(siWei)).toBe(总分)
    expect(siWei.xin_ren_du).toBeGreaterThan(siWei.qu_wei_du)
    expect(fenJieSiWei(总分).zong_fen).toBe(总分)
  })
})

describe('年龄与身份年级一致', () => {
  it('用户指定 27 岁时不会生成大专大二，而是匹配工作身份', () => {
    for (let i = 0; i < 30; i += 1) {
      const jiaoSe = shengChengJiaoSe({
        yong_hu_id: `u-${i}`,
        xing_bie: 'nan',
        mu_biao_xing_bie: 'nan',
        mbti_lei_xing: 'ESFP',
        xin_mu_zhong_de_ta: { nian_ling: 27, zhen_shi_ming: '林烁' },
      })
      expect(jiaoSe.nian_ling).toBe(27)
      expect(jiaoSe.shen_fen).not.toContain('大专')
      expect(jiaoSe.shen_fen).not.toContain('大学')
      expect(String(jiaoSe.shi_jie_xin_xi.nian_ji || '')).not.toContain('大二')
      expect(String(jiaoSe.shi_jie_xin_xi.nian_ji || '')).not.toContain('大三')
    }
  })

  it('用户指定 20 岁学生仍在学生身份范围', () => {
    const jiaoSe = shengChengJiaoSe({
      yong_hu_id: 'u-student',
      xing_bie: 'nan',
      mu_biao_xing_bie: 'nan',
      mbti_lei_xing: 'ESFP',
      xin_mu_zhong_de_ta: { nian_ling: 20 },
    })
    expect(jiaoSe.nian_ling).toBe(20)
    expect(['大学生', '大专生'].some((s) => jiaoSe.shen_fen.includes(s))).toBe(true)
  })

  it('年级由年龄推导：18岁不会是大四，21岁不会是大一', () => {
    for (let i = 0; i < 40; i += 1) {
      const jiaoSe18 = shengChengJiaoSe({
        yong_hu_id: `u18-${i}`,
        xing_bie: 'nan',
        mu_biao_xing_bie: 'nan',
        mbti_lei_xing: 'ESFP',
        xin_mu_zhong_de_ta: { nian_ling: 18 },
      })
      const 年级18 = String(jiaoSe18.shi_jie_xin_xi.nian_ji || '')
      expect(['大一', '大二']).toContain(年级18)
      const jiaoSe21 = shengChengJiaoSe({
        yong_hu_id: `u21-${i}`,
        xing_bie: 'nan',
        mu_biao_xing_bie: 'nan',
        mbti_lei_xing: 'ESFP',
        xin_mu_zhong_de_ta: { nian_ling: 21 },
      })
      const 年级21 = String(jiaoSe21.shi_jie_xin_xi.nian_ji || '')
      expect(['大三', '大四']).toContain(年级21)
    }
  })
})

describe('好感度增量与评判锚点', () => {
  it('正增量不再随分数衰减，负增量同样不衰减', () => {
    expect(jiSuanShiJiZengLiang(100, 10, 1)).toBe(10)
    expect(jiSuanShiJiZengLiang(900, 10, 1)).toBe(10)
    expect(jiSuanShiJiZengLiang(900, -20, 1)).toBe(-20)
    expect(jiSuanShiJiZengLiang(100, -20, 1)).toBe(-20)
  })

  it('评判提示词包含行为判定标准、当前阶段与渣型分支', () => {
    const 提示词 = gouJianHaoGanDuPingPanPrompt(
      '在吗',
      '你好',
      '阿烁',
      { jiaoSe: { shi_fou_zha_xing: true, re_shen_lei_xing: '快热' } } as never,
      undefined,
      '用户: 在吗\n阿烁: 你好',
      '冷淡',
    )
    expect(提示词).toContain('【怎么判断这条消息】')
    expect(提示词).toContain('客套')
    expect(提示词).toContain('过界玩笑')
    expect(提示词).toContain('低情商')
    expect(提示词).toContain('严重冒犯')
    expect(提示词).toContain('【此刻的关系：冷淡')
    expect(提示词).toContain('渣型')
    expect(提示词).toContain('"行为"')
  })

  it('评判提示词按阶段变化文案', () => {
    const 冷淡 = gouJianHaoGanDuPingPanPrompt('吃了吗', '嗯', '阿烁', undefined, undefined, '用户: 在吗', '冷淡')
    const 深爱 = gouJianHaoGanDuPingPanPrompt('吃了吗', '嗯', '阿烁', undefined, undefined, '用户: 在吗', '深爱')
    expect(冷淡).toContain('冷淡')
    expect(深爱).toContain('深爱')
    expect(冷淡).not.toBe(深爱)
  })
})
