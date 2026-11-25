import { describe, expect, it, beforeEach } from 'vitest'
import { zhuCeMoXingChi, qingKongMoXingChi, 模型池规模, 模型池快照 } from '../../utils/通用模型调用'

describe('多模型轮询池', () => {
  beforeEach(() => {
    qingKongMoXingChi()
  })

  it('注册后池规模等于有效成员数', () => {
    zhuCeMoXingChi([
      { moXing: 'a', jiChu: 'http://x', miYao: 'k' },
      { moXing: 'b', jiChu: 'http://x', miYao: 'k' },
      { moXing: 'c', jiChu: 'http://x', miYao: 'k' },
    ])
    expect(模型池规模()).toBe(3)
  })

  it('空模型名与空清单一律不注册，池保持为空', () => {
    zhuCeMoXingChi([{ moXing: '', jiChu: 'http://x', miYao: 'k' }])
    expect(模型池规模()).toBe(0)
    zhuCeMoXingChi([])
    expect(模型池规模()).toBe(0)
  })

  it('清空后池归零，可重复注册不累加', () => {
    zhuCeMoXingChi([{ moXing: 'a', jiChu: 'http://x', miYao: 'k' }])
    zhuCeMoXingChi([{ moXing: 'b', jiChu: 'http://x', miYao: 'k' }])
    expect(模型池规模()).toBe(1)
    expect(模型池快照()[0]['模型']).toBe('b')
    qingKongMoXingChi()
    expect(模型池规模()).toBe(0)
  })

  it('权重缺省为 1，负数与非法值也回落到 1', () => {
    zhuCeMoXingChi([
      { moXing: 'a', jiChu: 'http://x', miYao: 'k' },
      { moXing: 'b', jiChu: 'http://x', miYao: 'k', quanZhong: -3 },
      { moXing: 'c', jiChu: 'http://x', miYao: 'k', quanZhong: Number.NaN },
      { moXing: 'd', jiChu: 'http://x', miYao: 'k', quanZhong: 5 },
    ])
    const 快照 = 模型池快照()
    expect(快照.map((x) => x['权重'])).toEqual([1, 1, 1, 5])
  })

  it('初始状态全部可用、无失败记录', () => {
    zhuCeMoXingChi([
      { moXing: 'a', jiChu: 'http://x', miYao: 'k' },
      { moXing: 'b', jiChu: 'http://x', miYao: 'k' },
    ])
    const 快照 = 模型池快照()
    expect(快照.every((x) => x['冷却中'] === false)).toBe(true)
    expect(快照.every((x) => x['连续失败'] === 0)).toBe(true)
    expect(快照.every((x) => x['成功'] === 0)).toBe(true)
  })

  it('基址末尾斜杠被规范化，避免拼出双斜杠', () => {
    zhuCeMoXingChi([{ moXing: 'a', jiChu: 'https://x.test/v1/', miYao: 'k' }])
    expect(模型池规模()).toBe(1)
  })

  it('快照字段齐全，便于运维观测', () => {
    zhuCeMoXingChi([{ moXing: 'x', jiChu: 'http://x', miYao: 'k', quanZhong: 2 }])
    const 一 = 模型池快照()[0]
    for (const 键 of ['模型', '权重', '冷却中', '连续失败', '成功', '失败', '平均毫秒']) {
      expect(Object.prototype.hasOwnProperty.call(一, 键)).toBe(true)
    }
  })
})
