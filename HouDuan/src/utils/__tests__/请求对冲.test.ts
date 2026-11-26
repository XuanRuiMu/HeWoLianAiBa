import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  创建请求对冲器,
  type DuiChongQingQiu,
  type DuiChongPeiZhi,
} from '../请求对冲'

function 造候选(延迟: number, 正文: string, 状态: { 被取消?: boolean; 发起次数?: number } = {}): DuiChongQingQiu {
  状态.发起次数 = 0
  return {
    标识: 正文,
    async 执行(signal: AbortSignal): Promise<string> {
      状态.发起次数! += 1
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve(正文), 延迟)
        signal.addEventListener('abort', () => {
          clearTimeout(timer)
          状态.被取消 = true
          reject(new Error('cancelled'))
        }, { once: true })
      })
    },
  }
}

const 基础配置: DuiChongPeiZhi = {
  对冲毫秒: 30,
  最大并发: 8,
  每秒新请求: 1000,
  最多候选: 3,
}

describe('请求对冲器', () => {
  afterEach(() => vi.useRealTimers())

  it('首个请求在阈值内返回时只发一个请求，不补发', async () => {
    const s1 = {}
    const q1 = 造候选(10, 'fast', s1)
    const 对冲器 = 创建请求对冲器(基础配置)
    await expect(对冲器.执行([q1])).resolves.toBe('fast')
    expect(s1.发起次数).toBe(1)
    expect(s1.被取消).toBeFalsy()
  })

  it('首个请求超过阈值时延迟补发候选，用最先返回的正文', async () => {
    const sSlow = {}
    const sFast = {}
    const slow = 造候选(500, 'slow', sSlow)
    const fast = 造候选(20, 'fast', sFast)
    const 对冲器 = 创建请求对冲器({ ...基础配置, 对冲毫秒: 20 })
    await expect(对冲器.执行([slow, fast])).resolves.toBe('fast')
    expect(sSlow.发起次数).toBe(1)
    expect(sFast.发起次数).toBe(1)
  })

  it('胜出后取消其余在途请求', async () => {
    const sSlow = {}
    const slow = 造候选(500, 'slow', sSlow)
    const fast = 造候选(15, 'fast')
    const 对冲器 = 创建请求对冲器({ ...基础配置, 对冲毫秒: 15 })
    await expect(对冲器.执行([slow, fast])).resolves.toBe('fast')
    expect(sSlow.被取消).toBe(true)
  })

  it('全部候选失败时抛出错误', async () => {
    const fail: DuiChongQingQiu = { 标识: 'fail', async 执行() { throw new Error('boom') } }
    const 对冲器 = 创建请求对冲器(基础配置)
    await expect(对冲器.执行([fail])).rejects.toThrow()
  })

  it('全局并发闸门限制同时在途请求数', async () => {
    const 配置 = { ...基础配置, 最大并发: 2, 对冲毫秒: 100000 }
    let 在途 = 0
    let 峰值 = 0
    const 造 = (名: string): DuiChongQingQiu => ({
      标识: 名,
      async 执行(signal: AbortSignal) {
        在途++
        峰值 = Math.max(峰值, 在途)
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 30)
          signal.addEventListener('abort', () => { clearTimeout(timer); resolve() }, { once: true })
        })
        在途--
        return 名
      },
    })
    const 对冲器 = 创建请求对冲器(配置)
    const 任务 = Array.from({ length: 5 }, () => 对冲器.执行([造('x')]))
    await Promise.all(任务)
    expect(峰值).toBeLessThanOrEqual(2)
  })

  it('延迟补发：阈值前只发第一个，最多候选数量生效', async () => {
    const s1 = { 发起次数: 0 }
    const s2 = { 发起次数: 0 }
    const s3 = { 发起次数: 0 }
    const c1 = 造候选(500, 'm1', s1)
    const c2 = 造候选(40, 'm2', s2)
    const c3 = 造候选(40, 'm3', s3)
    const 配置 = { ...基础配置, 最多候选: 2, 对冲毫秒: 20 }
    const 对冲器 = 创建请求对冲器(配置)
    const p = 对冲器.执行([c1, c2, c3])
    await new Promise((r) => setTimeout(r, 5))
    expect(s1.发起次数).toBe(1)
    expect(s2.发起次数).toBe(0)
    await expect(p).resolves.toBe('m2')
    expect(s3.发起次数).toBe(0)
  })
})
