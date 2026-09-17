import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('FP-08 YH-078 非幂等不重试', () => {
  let 实例: { get: unknown; post: unknown; put: unknown; patch: unknown; delete: unknown }
  let 请求拦截器: ((配置: { headers?: Record<string, string>; signal?: unknown; method?: string; url?: string }) => unknown) | null = null

  beforeEach(async () => {
    vi.resetModules()
    请求拦截器 = null
    let 调用次数 = 0
    vi.doMock('axios', () => ({
      default: {
        create: vi.fn(() => ({
          get: vi.fn(async () => {
            调用次数 += 1
            if (调用次数 === 1) {
              const 错误 = { isAxiosError: true, response: { status: 503, data: {} }, config: { method: 'get', url: '/x' } }
              throw 错误
            }
            return { data: { cheng_gong: true }, config: { method: 'get', url: '/x' } }
          }),
          post: vi.fn(async (_url: string, _数据: unknown, 配置?: { headers?: Record<string, string> }) => {
            调用次数 += 1
            if (调用次数 >= 1 && !(配置?.headers && (配置.headers as Record<string, string>)['Idempotency-Key'])) {
              return { data: { cheng_gong: true }, config: { method: 'post', url: _url } }
            }
            return { data: { cheng_gong: true }, config: { method: 'post', url: _url } }
          }),
          put: vi.fn(async () => ({ data: { cheng_gong: true }, config: {} })),
          patch: vi.fn(async () => ({ data: { cheng_gong: true }, config: {} })),
          delete: vi.fn(async () => ({ data: { cheng_gong: true }, config: {} })),
          interceptors: {
            request: { use: (fn: (配置: unknown) => unknown) => { 请求拦截器 = fn as typeof 请求拦截器 } },
            response: { use: vi.fn() },
          },
        })),
        isAxiosError: (值: unknown) => (值 as { isAxiosError?: boolean }).isAxiosError === true,
      },
    }))
    vi.doMock('@/router', () => ({ default: { push: vi.fn() } }))
    vi.doMock('@/stores/用户', () => ({ 使用用户仓库: () => Promise.resolve({ 清空用户状态: vi.fn() }) }))
    const 模块 = await import('@/api/请求')
    实例 = 模块.请求实例 as unknown as typeof 实例
  })

  it('GET 可重试：503 后自动重发', async () => {
    const 取 = 实例.get as (url: string) => Promise<unknown>
    await expect(取('/x')).resolves.toBeTruthy()
  })

  it('POST 默认不重试：503 只发一次', async () => {
    let 发起次数 = 0
    vi.resetModules()
    vi.doMock('axios', () => ({
      default: {
        create: vi.fn(() => ({
          get: vi.fn(),
          post: vi.fn(async () => {
            发起次数 += 1
            throw { isAxiosError: true, response: { status: 503, data: {} }, config: { method: 'post', url: '/y' } }
          }),
          put: vi.fn(),
          patch: vi.fn(),
          delete: vi.fn(),
          interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
        })),
        isAxiosError: (值: unknown) => (值 as { isAxiosError?: boolean }).isAxiosError === true,
      },
    }))
    vi.doMock('@/router', () => ({ default: { push: vi.fn() } }))
    vi.doMock('@/stores/用户', () => ({ 使用用户仓库: () => Promise.resolve({ 清空用户状态: vi.fn() }) }))
    const 模块 = await import('@/api/请求')
    const 发 = (模块.请求实例 as unknown as { post: (url: string, 数据?: unknown) => Promise<unknown> }).post
    await expect(发('/y', { a: 1 })).rejects.toBeTruthy()
    expect(发起次数).toBe(1)
  })

  it('POST 携带幂等键时透传 Idempotency-Key 头', async () => {
    let 收到头: Record<string, string> | null = null
    vi.resetModules()
    vi.doMock('axios', () => ({
      default: {
        create: vi.fn(() => ({
          get: vi.fn(),
          post: vi.fn(async (_url: string, _数据: unknown, 配置?: { headers?: Record<string, string> }) => {
            收到头 = (配置?.headers || {}) as Record<string, string>
            return { data: { cheng_gong: true }, config: {} }
          }),
          put: vi.fn(),
          patch: vi.fn(),
          delete: vi.fn(),
          interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
        })),
        isAxiosError: () => false,
      },
    }))
    vi.doMock('@/router', () => ({ default: { push: vi.fn() } }))
    vi.doMock('@/stores/用户', () => ({ 使用用户仓库: () => Promise.resolve({ 清空用户状态: vi.fn() }) }))
    const 模块 = await import('@/api/请求')
    const 发 = (模块.请求实例 as unknown as { post: (url: string, 数据?: unknown, 配置?: unknown) => Promise<unknown> }).post
    await 发('/z', { a: 1 }, { miDengJian: 'jian-1' })
    expect(收到头?.['Idempotency-Key']).toBe('jian-1')
  })
})
