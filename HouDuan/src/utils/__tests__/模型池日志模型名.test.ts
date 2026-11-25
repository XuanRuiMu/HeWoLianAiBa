import { afterEach, describe, expect, it, vi } from 'vitest'

describe('模型池日志必须包含真实模型名', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('记录真实模型名，而不是配置分类名', async () => {
    vi.resetModules()
    const 日志: unknown[] = []
    const 响应组 = [
      { model: 'dots-studio/dots-3-note-preview:free', content: '第一句' },
      { model: 'baidu/ernie-5.5-flash-preview:free', content: '第二句' },
    ]
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const 序 = 日志.length
      日志.push(url)
      const d = 响应组[Math.min(序, 响应组.length - 1)]
      return new Response(JSON.stringify({ choices: [{ message: { content: d.content } }], model: d.model }), { status: 200 })
    }))
    process.env.VITEST = ''
    process.env.XU_KE_ZHEN_SHI_WAI_HU = 'true'
    process.env.AI_MO_XING_CHI = 'one|1,two|1'
    process.env.AI_MO_XING_CHI_JI_CHU = 'http://fake.test'
    process.env.AI_MO_XING_CHI_MI_YAO = 'test'
    const { 按配置调用 } = await import('../../utils/DeepSeek客户端')
    await 按配置调用('XieShou', [{ jiaoSe: 'user', neiRong: '说一句' }])
    expect(日志).toHaveLength(2)
    delete process.env.AI_MO_XING_CHI
    delete process.env.AI_MO_XING_CHI_JI_CHU
    delete process.env.AI_MO_XING_CHI_MI_YAO
    vi.resetModules()
  })
})
