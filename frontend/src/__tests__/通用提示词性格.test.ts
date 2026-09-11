import { describe, it, expect } from 'vitest'
import { congTongYongTiShiCiTuiCeXingGe } from '@/utils/通用提示词性格'

describe('通用提示词性格推测', () => {
  it('空串与无关键词返回null走纯随机', () => {
    expect(congTongYongTiShiCiTuiCeXingGe('')).toBeNull()
    expect(congTongYongTiShiCiTuiCeXingGe('今天天气不错')).toBeNull()
  })

  it('热情开朗想象温柔随性指向ENFP', () => {
    expect(
      congTongYongTiShiCiTuiCeXingGe('热情开朗喜欢交朋友，脑洞大有想象力，温柔体贴爱笑，随性自由爱冒险'),
    ).toBe('ENFP')
  })

  it('内向务实理性计划指向ISTJ', () => {
    expect(
      congTongYongTiShiCiTuiCeXingGe('内向安静喜欢独处，务实踏实靠谱，理性冷静讲逻辑，计划自律守时'),
    ).toBe('ISTJ')
  })

  it('单轴平票按默认字母兼顾', () => {
    expect(congTongYongTiShiCiTuiCeXingGe('外向但也内向')).toBe('INFP')
  })
})
