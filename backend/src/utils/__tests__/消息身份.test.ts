import { describe, it, expect, vi } from 'vitest'
import { shengChengXiTongTiShiId } from '../消息身份'

describe('FP-04 合成系统提示 ID 唯一入口', () => {
  it('同一毫秒内连续生成的 ID 互不相同（前端按 id 幂等去重，相同即被吞）', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1700000000000)
    try {
      const 生成 = Array.from({ length: 5 }, () => shengChengXiTongTiShiId())
      expect(new Set(生成).size).toBe(5)
      for (const 项 of 生成) {
        expect(项).toMatch(/^sys-1700000000000-\d+$/)
      }
    } finally {
      vi.useRealTimers()
    }
  })
})
