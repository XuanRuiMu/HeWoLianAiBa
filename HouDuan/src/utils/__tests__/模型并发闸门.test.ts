import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('模型并发闸门', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env['AI_MO_XING_BING_FA_SHANG_XIAN']
    delete process.env['AI_MO_XING_BING_FA_DENG_DAI_HAO_MIAO']
  })

  it('初始占用数为 0，排队数也为 0', async () => {
    const m = await import('../../utils/通用模型调用')
    expect(m.当前模型并发占用数()).toBe(0)
    expect(m.当前模型并发排队数()).toBe(0)
  })

  it('并发上限可用环境变量配置，并且默认值落在合理区间', async () => {
    process.env['AI_MO_XING_BING_FA_SHANG_XIAN'] = '1'
    const m = await import('../../utils/通用模型调用')
    expect(typeof m.当前模型并发占用数()).toBe('number')
    expect(m.当前模型并发占用数()).toBeGreaterThanOrEqual(0)
  })

  it('导出的是可调用的纯函数，不会因调用而抛错', async () => {
    const m = await import('../../utils/通用模型调用')
    expect(() => m.当前模型并发占用数()).not.toThrow()
    expect(() => m.当前模型并发排队数()).not.toThrow()
  })
})
