import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  YU_YIN_YIN_LIANG_MO_REN,
  duQuYuYinYinLiang,
  sheZhiYuYinYinLiang,
  yuYinYinLiangSeXiang,
  yuYinYinLiangZengYi,
  语音音量键,
  语音音量表,
} from '@/utils/语音音量存储'

const 存储键 = 'yuYinYinLiang'

describe('每条语音独立音量', () => {
  beforeEach(() => {
    localStorage.clear()
    语音音量表.clear()
  })

  it('消息键优先用客户端序号，缺省回落到媒体地址', () => {
    expect(语音音量键({ id: 'a1' })).toBe('x:a1')
    expect(语音音量键({ id: 'a1', ke_hu_duan_id: 'k9' })).toBe('x:k9')
    expect(语音音量键({ mei_ti_url: 'https://x/y.webm' })).toBe('u:https://x/y.webm')
    expect(语音音量键({})).toBe('')
  })

  it('默认落在最中间，取值夹在 0 到 1 之间', () => {
    expect(YU_YIN_YIN_LIANG_MO_REN).toBe(0.5)
    expect(duQuYuYinYinLiang({ id: 'm1' })).toBe(0.5)
    expect(sheZhiYuYinYinLiang({ id: 'm1' }, 2)).toBe(1)
    expect(sheZhiYuYinYinLiang({ id: 'm2' }, -3)).toBe(0)
    expect(sheZhiYuYinYinLiang({ id: 'm3' }, Number.NaN)).toBe(0.5)
    expect(duQuYuYinYinLiang({ id: 'm1' })).toBe(1)
  })

  it('中位即 100%：滑杆中点倍率为 1，底端 0、顶端 2', () => {
    expect(YU_YIN_YIN_LIANG_MO_REN).toBe(0.5)
    expect(yuYinYinLiangZengYi(0.5)).toBe(1)
    expect(yuYinYinLiangZengYi(0)).toBe(0)
    expect(yuYinYinLiangZengYi(1)).toBe(2)
    expect(yuYinYinLiangZengYi(0.25)).toBeCloseTo(0.5, 6)
  })

  it('增益全程单调递增，滑杆每一档都对应不同倍率', () => {
    const 取样点 = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]
    const 倍率们 = 取样点.map((值) => yuYinYinLiangZengYi(值))
    expect(new Set(倍率们).size).toBe(取样点.length)
    for (let 序 = 1; 序 < 倍率们.length; 序 += 1) {
      expect(倍率们[序]).toBeGreaterThan(倍率们[序 - 1])
    }
  })

  it('与全局音量相乘，最终封顶在系统上限 1', () => {
    const 合成 = (全局: number, 值: number) =>
      Math.max(0, Math.min(1, 全局 * yuYinYinLiangZengYi(值)))
    expect(合成(1, 0.5)).toBe(1)
    expect(合成(0.5, 0.5)).toBe(0.5)
    expect(合成(0.5, 1)).toBe(1)
    expect(合成(0.5, 0)).toBe(0)
    expect(合成(0.5, 0.25)).toBe(0.25)
  })

  it('圆点颜色从黄到红，中点橙色', () => {
    expect(yuYinYinLiangSeXiang(0)).toContain('hsl(55.0')
    expect(yuYinYinLiangSeXiang(0.5)).toContain('hsl(27.5')
    expect(yuYinYinLiangSeXiang(1)).toContain('hsl(0.0')
  })

  it('逐条写入本地存储且互不影响', async () => {
    vi.useFakeTimers()
    sheZhiYuYinYinLiang({ id: 'a' }, 0.2)
    sheZhiYuYinYinLiang({ id: 'b' }, 0.9)
    vi.advanceTimersByTime(400)
    const 原文 = localStorage.getItem(存储键)
    expect(原文).not.toBeNull()
    const 对象 = JSON.parse(原文 as string) as Record<string, number>
    expect(对象['x:a']).toBe(0.2)
    expect(对象['x:b']).toBe(0.9)
    vi.useRealTimers()
  })

  it('同一条重复写入同值只落盘一次', () => {
    vi.useFakeTimers()
    const 落盘 = vi.spyOn(localStorage, 'setItem')
    sheZhiYuYinYinLiang({ id: 'c' }, 0.4)
    sheZhiYuYinYinLiang({ id: 'c' }, 0.4)
    vi.advanceTimersByTime(400)
    expect(落盘).toHaveBeenCalledTimes(1)
    落盘.mockRestore()
    vi.useRealTimers()
  })
})
