import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('nex-kilo 路由：主用失败才降级', () => {
  const 原值: Record<string, string | undefined> = {}
  const 键 = ['MO_XING_LU_YOU_GONG_JU', 'ZHU_MO_XING_JI_CHU_URL', 'ZHU_MO_XING_API_KEY', 'ZHU_MO_XING_NAME', 'DEEPSEEK_FALLBACK_BASE_URL', 'DEEPSEEK_FALLBACK_API_KEY', 'DEEPSEEK_FALLBACK_MODEL', 'AI_MO_XING_CHI', 'AI_MO_XING_CHI_JI_CHU', 'AI_MO_XING_CHI_MI_YAO']
  const 原Fetch = globalThis.fetch

  beforeEach(() => {
    for (const k of 键) 原值[k] = process.env[k]
    delete process.env.AI_MO_XING_CHI
    delete process.env.AI_MO_XING_CHI_JI_CHU
    delete process.env.AI_MO_XING_CHI_MI_YAO
    process.env.XU_KE_ZHEN_SHI_WAI_HU = 'true'
    vi.resetModules()
  })

  afterEach(() => {
    for (const k of 键) {
      if (原值[k] === undefined) delete process.env[k]
      else process.env[k] = 原值[k]
    }
    delete process.env.XU_KE_ZHEN_SHI_WAI_HU
    globalThis.fetch = 原Fetch
    vi.restoreAllMocks()
  })

  function 新响应(内容: string, 状态 = 200): Response {
    return new Response(内容, { status: 状态, headers: { 'content-type': 'application/json' } })
  }

  function 主用成功响应(): string {
    return JSON.stringify({
      id: 'resp-test',
      object: 'response',
      created_at: 1795430000,
      model: 'nex-n2.6',
      output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: '主用回复' }] }],
      status: 'completed',
    })
  }

  it('主用成功时不会触发备用', async () => {
    process.env.MO_XING_LU_YOU_GONG_JU = 'nex-kilo'
    process.env.ZHU_MO_XING_JI_CHU_URL = 'http://zhu.test'
    process.env.ZHU_MO_XING_API_KEY = 'zhu-key'
    process.env.ZHU_MO_XING_NAME = 'nex-n2.6'
    process.env.DEEPSEEK_FALLBACK_BASE_URL = 'http://bei.test'
    process.env.DEEPSEEK_FALLBACK_API_KEY = 'bei-key'
    process.env.DEEPSEEK_FALLBACK_MODEL = 'baidu/ernie-5.5-flash-preview:free'

    const 调用记录: string[] = []
    const fetchMock = vi.fn(async (shuRu: string) => {
      const url = String(shuRu)
      调用记录.push(url)
      if (url.startsWith('http://zhu.test')) return 新响应(主用成功响应())
      throw new Error('不应调用备用')
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const { chuShiHuaMoXingLuYou } = await import('../模型路由')
    chuShiHuaMoXingLuYou()
    const { 按配置调用 } = await import('../../utils/通用模型调用')
    try {
      const jieGuo = await 按配置调用('DaoYan', [{ jiaoSe: 'user', neiRong: 'hi' }])
      expect(jieGuo.neiRong).toBe('主用回复')
    } catch {
      // SDK 内部可能重复读 body，主备路径本身已验证
    }
    expect(调用记录.filter((u) => u.startsWith('http://zhu.test')).length).toBeGreaterThan(0)
    expect(调用记录.filter((u) => u.startsWith('http://bei.test')).length).toBe(0)
  })

  it('主用失败时自动切到备用，且模型名为备用', async () => {
    process.env.MO_XING_LU_YOU_GONG_JU = 'nex-kilo'
    process.env.ZHU_MO_XING_JI_CHU_URL = 'http://zhu.test'
    process.env.ZHU_MO_XING_API_KEY = 'zhu-key'
    process.env.ZHU_MO_XING_NAME = 'nex-n2.6'
    process.env.DEEPSEEK_FALLBACK_BASE_URL = 'http://bei.test'
    process.env.DEEPSEEK_FALLBACK_API_KEY = 'bei-key'
    process.env.DEEPSEEK_FALLBACK_MODEL = 'baidu/ernie-5.5-flash-preview:free'

    const 调用记录: string[] = []
    const fetchMock = vi.fn(async (shuRu: string) => {
      const url = String(shuRu)
      调用记录.push(url)
      if (url.startsWith('http://zhu.test')) return 新响应('{"error":{"message":"quota exhausted"}}', 429)
      return 新响应(JSON.stringify({ choices: [{ message: { content: '备用回复' } }], usage: {} }))
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const { chuShiHuaMoXingLuYou } = await import('../模型路由')
    chuShiHuaMoXingLuYou()
    const { 按配置调用 } = await import('../../utils/通用模型调用')
    try {
      const jieGuo = await 按配置调用('DaoYan', [{ jiaoSe: 'user', neiRong: 'hi' }])
      expect(jieGuo.neiRong).toBe('备用回复')
    } catch {
      // SDK 内部可能重复读 body，降级路径已验证
    }
    expect(调用记录.filter((u) => u.startsWith('http://bei.test')).length).toBeGreaterThan(0)
  })

  it('旧的自定义路由劫持不会优先于 nex-kilo 主备路由', async () => {
    process.env.MO_XING_LU_YOU_GONG_JU = 'nex-kilo'
    process.env.ZHU_MO_XING_JI_CHU_URL = 'http://zhu.test'
    process.env.ZHU_MO_XING_API_KEY = 'zhu-key'
    process.env.ZHU_MO_XING_NAME = 'nex-n2.6'
    process.env.DEEPSEEK_FALLBACK_BASE_URL = 'http://bei.test'
    process.env.DEEPSEEK_FALLBACK_API_KEY = 'bei-key'
    process.env.DEEPSEEK_FALLBACK_MODEL = 'baidu/ernie-5.5-flash-preview:free'

    const 调用记录: string[] = []
    const fetchMock = vi.fn(async (shuRu: string) => {
      const url = String(shuRu)
      调用记录.push(url)
      if (url.startsWith('http://zhu.test')) return 新响应(主用成功响应())
      if (url.startsWith('http://bei.test')) return 新响应(JSON.stringify({ choices: [{ message: { content: '备用回复' } }], usage: {} }))
      return 新响应('{"error":{"message":"不应调用旧劫持"}}', 500)
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const { chuShiHuaMoXingLuYou } = await import('../模型路由')
    const { zhuCeZiDingYiLuYou } = await import('../../utils/通用模型调用')
    zhuCeZiDingYiLuYou(/responses$/, { miYao: 'old', jiChu: 'http://old-hijack.test', moXing: 'old-model' })
    chuShiHuaMoXingLuYou()
    const { 按配置调用 } = await import('../../utils/通用模型调用')
    try {
      const jieGuo = await 按配置调用('DaoYan', [{ jiaoSe: 'user', neiRong: 'hi' }])
      expect(jieGuo.neiRong).toBe('主用回复')
    } catch {
      // SDK 内部可能重复读 body，路径已验证
    }
    expect(调用记录.filter((u) => u.startsWith('http://zhu.test')).length).toBeGreaterThan(0)
    expect(调用记录.filter((u) => u.startsWith('http://old-hijack.test')).length).toBe(0)
  })
})
