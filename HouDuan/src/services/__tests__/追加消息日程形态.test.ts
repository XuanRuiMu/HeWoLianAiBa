import { describe, expect, it } from 'vitest'
import { 构建追加消息判定提示 } from '../追加消息判定'
import type { AIJiaoSeXinXi } from '../../types'

const 角色 = {
  id: 'j-1',
  wei_xin_ming: '小满',
  xing_ge: '外冷内热',
  yan_yu_feng_ge: '短句',
} as unknown as AIJiaoSeXinXi

const 基础 = {
  jiao_se: 角色,
  dui_hua_li_shi: [],
  liangJiaGeHaoMiao: 20 * 60 * 1000,
}

describe('追加消息判定的日程形态', () => {
  it('没有日程时不插入任何日程相关提示行', () => {
    const 提示 = 构建追加消息判定提示(基础)
    expect(提示).not.toContain('你此刻的日程')
    expect(提示).not.toContain('意愿降低')
    expect(提示).not.toContain('意愿大幅降低')
  })

  it('有日程且当前在忙时，插入日程行与在忙降意愿行', () => {
    const 提示 = 构建追加消息判定提示({
      ...基础,
      riChengTiShi: '下午三点在上课',
      dangQianKeNengXing: 'mang',
    })
    expect(提示).toContain('你此刻的日程：下午三点在上课')
    expect(提示).toContain('想主动开口的意愿降低')
    expect(提示).toContain('很短，不展开新话题')
    expect(提示).not.toContain('意愿大幅降低')
  })

  it('有日程但不在忙形态时，只插入日程行不插入降意愿行', () => {
    for (const 形态 of ['xian', 'banMang'] as const) {
      const 提示 = 构建追加消息判定提示({
        ...基础,
        riChengTiShi: '窝在沙发上看剧',
        dangQianKeNengXing: 形态,
      })
      expect(提示).toContain('你此刻的日程：窝在沙发上看剧')
      expect(提示).not.toContain('想主动开口的意愿降低')
    }
  })

  it('睡觉时段无论有无日程都插入睡觉降意愿行', () => {
    const 仅睡觉 = 构建追加消息判定提示({ ...基础, shiShuiMianShiDuan: true })
    expect(仅睡觉).toContain('现在是你的睡觉时间')
    expect(仅睡觉).toContain('意愿大幅降低')
    expect(仅睡觉).not.toContain('你此刻的日程')

    const 睡觉在忙 = 构建追加消息判定提示({
      ...基础,
      riChengTiShi: '白天补觉',
      dangQianKeNengXing: 'mang',
      shiShuiMianShiDuan: true,
    })
    expect(睡觉在忙).toContain('你此刻的日程：白天补觉')
    expect(睡觉在忙).toContain('想主动开口的意愿降低')
    expect(睡觉在忙).toContain('现在是你的睡觉时间')
  })

  it('日程提示不影响既有硬约束：不得报沉默时长、必须只输出 JSON', () => {
    const 提示 = 构建追加消息判定提示({
      ...基础,
      riChengTiShi: '在赶方案',
      dangQianKeNengXing: 'mang',
      shiShuiMianShiDuan: false,
    })
    expect(提示).toContain('不要把 TA 沉默了多久报给 TA')
    expect(提示).toContain('只输出 JSON')
    expect(提示).toContain('20 分钟前')
  })
})
