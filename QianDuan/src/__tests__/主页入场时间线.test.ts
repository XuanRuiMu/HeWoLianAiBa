import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { 使用用户仓库 } from '@/stores/用户'
import { 主页入场 } from '@/config/设计令牌'

describe('主页入场时间线', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('按绝对时间逐个暴露元素，间隔恒定', () => {
    const 仓 = 使用用户仓库()
    仓.qiDongZhuYeRuChang()
    expect(仓.主页入场序号).toBe(0)
    vi.advanceTimersByTime(主页入场.首元素延迟 - 1)
    expect(仓.主页入场序号).toBe(0)
    vi.advanceTimersByTime(1)
    expect(仓.主页入场序号).toBe(1)
    for (let 序 = 2; 序 <= 主页入场.元素总数; 序 += 1) {
      vi.advanceTimersByTime(主页入场.元素间隔)
      expect(仓.主页入场序号).toBe(序)
    }
  })

  it('重置后未到期的定时器全部作废', () => {
    const 仓 = 使用用户仓库()
    仓.qiDongZhuYeRuChang()
    vi.advanceTimersByTime(主页入场.首元素延迟)
    expect(仓.主页入场序号).toBe(1)
    仓.zhongZhiZhuYeRuChang()
    vi.advanceTimersByTime(主页入场.元素间隔 * 主页入场.元素总数 + 主页入场.首元素延迟)
    expect(仓.主页入场序号).toBe(0)
  })

  it('重复启动不会叠加两套时间线', () => {
    const 仓 = 使用用户仓库()
    仓.qiDongZhuYeRuChang()
    vi.advanceTimersByTime(主页入场.首元素延迟 - 100)
    仓.qiDongZhuYeRuChang()
    vi.advanceTimersByTime(101)
    expect(仓.主页入场序号).toBe(0)
    vi.advanceTimersByTime(主页入场.首元素延迟)
    expect(仓.主页入场序号).toBe(1)
  })
})
