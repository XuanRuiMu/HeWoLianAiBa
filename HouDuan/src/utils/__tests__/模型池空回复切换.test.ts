import { beforeEach, describe, expect, it, vi } from 'vitest'
import { 按配置调用, zhuCeMoXingChi, qingKongMoXingChi, 模型池快照 } from '../../utils/通用模型调用'

describe('模型池空回复必须切换而不是算成功', () => {
  beforeEach(() => {
    qingKongMoXingChi()
    vi.restoreAllMocks()
  })

  it('空正文与只有思考内容的返回不会交给上层，会尝试下一个模型', async () => {
    process.env.XU_KE_ZHEN_SHI_WAI_HU = 'true'
    const 调用: string[] = []
    globalThis.fetch = vi.fn(async (url: string) => {
      调用.push(url)
      if (调用.length === 1) {
        return new Response(JSON.stringify({ choices: [{ message: { content: null, reasoning_content: 'only thinking' }, finish_reason: 'length' }] }), { status: 200 })
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: '换模型后的正常回答' }, finish_reason: 'stop' }] }), { status: 200 })
    }) as unknown as typeof fetch

    zhuCeMoXingChi([
      { moXing: 'kong', jiChu: 'http://one.test', miYao: 'x' },
      { moXing: 'hao', jiChu: 'http://two.test', miYao: 'x' },
    ])

    const 结果 = await 按配置调用('XieShou', [{ jiaoSe: 'user', neiRong: '说一句话' }])
    expect(结果.neiRong).toBe('换模型后的正常回答')
    expect(调用.length).toBe(2)
    const 快照 = 模型池快照()
    expect(快照.find((x) => x['模型'] === 'kong')?.['连续失败']).toBe(1)
    expect(快照.find((x) => x['模型'] === 'hao')?.['成功']).toBe(1)
  })
})
