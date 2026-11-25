import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { 按配置调用, zhuCeMoXingChi, qingKongMoXingChi, 模型池快照 } from '../通用模型调用'

const 外呼许可 = () => { process.env.XU_KE_ZHEN_SHI_WAI_HU = 'true' }
const 释放 = () => { delete process.env.XU_KE_ZHEN_SHI_WAI_HU }

describe('模型池空回复与真实模型名', () => {
  beforeEach(() => {
    qingKongMoXingChi()
    vi.restoreAllMocks()
    外呼许可()
  })
  afterEach(() => {
    qingKongMoXingChi()
    释放()
  })

  it('空正文成员失败后切换，且返回/日志使用真实模型名', async () => {
    const 调用: string[] = []
    const 模型响应 = [
      { model: 'actual-empty', choices: [{ message: { content: null, reasoning_content: 'only-thinking' }, finish_reason: 'length' }] },
      { model: 'actual-good', choices: [{ message: { content: '切换后正常回答' }, finish_reason: 'stop' }] },
    ]
    globalThis.fetch = vi.fn(async (url: string) => {
      const d = 模型响应[Math.min(调用.length, 1)]
      调用.push(d.model)
      if (String(url).endsWith('/responses')) {
        return new Response(JSON.stringify({ model: d.model, output: [{ type: 'message', content: [{ type: 'output_text', text: d.choices[0].message.content ?? '' }] }] }), { status: 200 })
      }
      return new Response(JSON.stringify(d), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }) as unknown as typeof fetch

    zhuCeMoXingChi([
      { moXing: 'empty-model', jiChu: 'http://one.test', miYao: 'x' },
      { moXing: 'good-model', jiChu: 'http://two.test', miYao: 'x' },
    ])

    const 结果 = await 按配置调用('XieShou', [{ jiaoSe: 'user', neiRong: '说一句话' }])
    expect(结果.moXing).toBe('actual-good')
    const 快照 = 模型池快照()
    expect(快照.find((x) => x['模型'] === 'empty-model')?.['连续失败']).toBe(1)
    expect(快照.find((x) => x['模型'] === 'good-model')?.['成功']).toBe(1)
  })

  it('取消请求不计入成员失败', async () => {
    const 调用: string[] = []
    globalThis.fetch = vi.fn(async (url: string, init?: RequestInit) => {
      调用.push(String(url))
      const signal = init?.signal
      await new Promise((_, reject) => {
        setTimeout(() => reject(new DOMException('aborted', 'AbortError')), 20)
        signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
      })
      throw new Error('不可达')
    }) as unknown as typeof fetch
    zhuCeMoXingChi([{ moXing: 'cancel-model', jiChu: 'http://cancel.test', miYao: 'x' }])
    const 控制 = new AbortController()
    setTimeout(() => 控制.abort(), 5)
    await expect(按配置调用('XieShou', [{ jiaoSe: 'user', neiRong: '说一句话' }], 控制.signal)).rejects.toThrow()
    expect(模型池快照()[0]['连续失败']).toBe(0)
  })
})
