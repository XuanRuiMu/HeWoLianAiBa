import { describe, expect, it } from 'vitest'
import {
  jiSuanShiJiZengLiang,
  quMoShiBeiLv,
  fenJieSiWei,
  huoQuJieDuanMing,
  jiSuanZongFen,
} from '../好感度'
import { HaoGanDuPeiZhi } from '../../config/好感度配置'
import { 查基础分, 阶段感知评分表, 行为顺序, 关系阶段顺序 } from '../../config/阶段感知评分'
import { 归一四维, 四维之和, 按权重分配整数 } from '../../utils/整数分配'
import { 生成人设初始分, 生成四维初值 } from '../初始好感度'

describe('分数核心：模式倍率与封顶', () => {
  it('普通模式倍率为 2，排位为 1', () => {
    expect(quMoShiBeiLv('putong')).toBe(2)
    expect(quMoShiBeiLv('tiaozhan')).toBe(1)
    expect(quMoShiBeiLv('')).toBe(2)
    expect(quMoShiBeiLv(undefined)).toBe(2)
  })

  it('普通模式 25 分基础分实际加 50', () => {
    expect(jiSuanShiJiZengLiang(100, 25, 2)).toBe(50)
    expect(jiSuanShiJiZengLiang(100, 25, 1)).toBe(25)
  })

  it('封顶后正增量归零', () => {
    expect(jiSuanShiJiZengLiang(1000, 25, 2)).toBe(0)
    expect(jiSuanShiJiZengLiang(1000, 1, 2)).toBe(0)
  })

  it('封顶后负增量照扣', () => {
    expect(jiSuanShiJiZengLiang(1000, -12, 2)).toBe(-24)
    expect(jiSuanShiJiZengLiang(1000, -35, 2)).toBe(-70)
    expect(jiSuanShiJiZengLiang(1000, -12, 1)).toBe(-12)
  })

  it('最低保留 5 分，不会归零', () => {
    expect(jiSuanShiJiZengLiang(30, -18, 2)).toBe(-25)
    expect(jiSuanShiJiZengLiang(5, -18, 2)).toBe(0)
    expect(jiSuanShiJiZengLiang(20, -18, 2)).toBe(-15)
  })

  it('四维和恒等于总分', () => {
    for (const 分 of [5, 30, 101, 250, 500, 777, 999, 1000]) {
      const 四维 = fenJieSiWei(分)
      expect(四维.xin_ren_du + 四维.qin_mi_du + 四维.qu_wei_du + 四维.guan_huai_du).toBe(四维.zong_fen)
      expect(四维.zong_fen).toBe(分)
    }
  })

  it('jiSuanZongFen 就是四维直和', () => {
    expect(jiSuanZongFen({ xin_ren_du: 35, qin_mi_du: 25, qu_wei_du: 20, guan_huai_du: 20 })).toBe(100)
    expect(jiSuanZongFen({ xin_ren_du: 0, qin_mi_du: 0, qu_wei_du: 0, guan_huai_du: 0 })).toBe(
      HaoGanDuPeiZhi.fanWei.zuiDiFen,
    )
  })
})

describe('归一四维', () => {
  it('和超上限时压到上限且四维和不变', () => {
    const 结果 = 归一四维({ xin_ren_du: 900, qin_mi_du: 800, qu_wei_du: 700, guan_huai_du: 600 }, 5, 1000)
    expect(结果.zong_fen).toBe(1000)
    expect(四维之和(结果)).toBe(1000)
  })

  it('和低于下限时补到下限', () => {
    const 结果 = 归一四维({ xin_ren_du: 0, qin_mi_du: 0, qu_wei_du: 0, guan_huai_du: 0 }, 5, 1000)
    expect(结果.zong_fen).toBe(5)
    expect(四维之和(结果)).toBe(5)
  })

  it('区间内原样返回', () => {
    const 结果 = 归一四维({ xin_ren_du: 40, qin_mi_du: 30, qu_wei_du: 20, guan_huai_du: 10 }, 5, 1000)
    expect(结果).toEqual({ xin_ren_du: 40, qin_mi_du: 30, qu_wei_du: 20, guan_huai_du: 10, zong_fen: 100 })
  })

  it('按权重分配整数和恒定', () => {
    for (const 目标 of [0, 1, 7, 30, 250, 999, 1000]) {
      const 分配 = 按权重分配整数(目标, [0.35, 0.25, 0.2, 0.2])
      expect(分配.reduce((合, 值) => 合 + 值, 0)).toBe(目标)
    }
  })
})

describe('阶段感知评分表', () => {
  it('客套在冷淡期加分、深爱期扣分', () => {
    expect(查基础分('客套', '冷淡')).toBeGreaterThan(0)
    expect(查基础分('客套', '深爱')).toBeLessThan(0)
    expect(查基础分('客套', '冷淡')).toBeGreaterThan(查基础分('客套', '深爱'))
  })

  it('过界玩笑在冷淡期扣分、好友之后加分', () => {
    expect(查基础分('过界玩笑', '冷淡')).toBeLessThan(0)
    expect(查基础分('过界玩笑', '好友')).toBeGreaterThan(0)
    expect(查基础分('过界玩笑', '深爱')).toBeGreaterThan(0)
  })

  it('低情商全阶段都是负分', () => {
    for (const 阶段 of 关系阶段顺序) {
      expect(查基础分('低情商', 阶段)).toBeLessThan(0)
    }
  })

  it('严重冒犯全阶段 -35', () => {
    for (const 阶段 of 关系阶段顺序) {
      expect(查基础分('严重冒犯', 阶段)).toBe(-35)
    }
  })

  it('有效交流全阶段都是正分，且在 -35~25 区间内', () => {
    for (const 阶段 of 关系阶段顺序) {
      const 分 = 查基础分('有效交流', 阶段)
      expect(分).toBeGreaterThan(0)
      expect(分).toBeLessThanOrEqual(25)
    }
  })

  it('五个行为 × 十个阶段全部有值且落在 -35~25', () => {
    for (const 行为 of 行为顺序) {
      for (const 阶段 of 关系阶段顺序) {
        const 分 = 查基础分(行为, 阶段)
        expect(Number.isFinite(分)).toBe(true)
        expect(分).toBeGreaterThanOrEqual(-35)
        expect(分).toBeLessThanOrEqual(25)
      }
    }
  })

  it('未知阶段回落到冷淡档', () => {
    expect(查基础分('客套', '不存在')).toBe(查基础分('客套', '冷淡'))
  })

  it('五行为×十阶段表完整无缺', () => {
    for (const 行为 of 行为顺序) {
      expect(Object.keys(阶段感知评分表[行为]).length).toBe(关系阶段顺序.length)
    }
  })
})

describe('初始分区间', () => {
  it('内向型初始分明显低于外向型', () => {
    const 内向样本 = Array.from({ length: 40 }, () => 生成人设初始分('INTJ', false, 'I'))
    const 外向样本 = Array.from({ length: 40 }, () => 生成人设初始分('ESFP', false, 'E'))
    expect(Math.max(...内向样本)).toBeLessThanOrEqual(70)
    expect(Math.min(...内向样本)).toBeGreaterThanOrEqual(30)
    expect(Math.max(...外向样本)).toBeLessThanOrEqual(250)
    expect(Math.min(...外向样本)).toBeGreaterThanOrEqual(170)
    expect(Math.min(...外向样本)).toBeGreaterThan(Math.max(...内向样本))
  })

  it('内向型不会低于 30，不触发归零判负', () => {
    for (let 次 = 0; 次 < 50; 次 += 1) {
      expect(生成人设初始分('INTP', false, 'I')).toBeGreaterThan(0)
    }
  })

  it('渣型 I 人上限 370、E 人上限 550', () => {
    for (let 次 = 0; 次 < 60; 次 += 1) {
      expect(生成人设初始分('INTJ', true, 'I')).toBeLessThanOrEqual(370)
      expect(生成人设初始分('ESFP', true, 'E')).toBeLessThanOrEqual(550)
    }
  })

  it('渣型一定高于同型非渣型', () => {
    const 非渣 = Array.from({ length: 30 }, () => 生成人设初始分('INTJ', false, 'I'))
    const 渣 = Array.from({ length: 30 }, () => 生成人设初始分('INTJ', true, 'I'))
    expect(Math.min(...渣)).toBeGreaterThan(Math.max(...非渣))
  })

  it('四维初值和等于总分', () => {
    for (const 分 of [30, 70, 120, 250, 370, 550]) {
      const 四维 = 生成四维初值(分)
      expect(四维.xin_ren_du + 四维.qin_mi_du + 四维.qu_wei_du + 四维.guan_huai_du).toBe(分)
      expect(四维.zong_fen).toBe(分)
    }
  })
})

describe('关系阶段判定', () => {
  it('30 分是冷淡，250 分是认识，1000 分是深爱', () => {
    expect(huoQuJieDuanMing(30)).toBe('冷淡')
    expect(huoQuJieDuanMing(250)).toBe('认识')
    expect(huoQuJieDuanMing(1000)).toBe('深爱')
  })
})
