import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  create: vi.fn(),
  OpenAI: vi.fn(function (this: { responses: { create: typeof vi.fn } }) {
    this.responses = { create: 假.create }
  }),
  debug: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  aiLog: vi.fn(),
  mail: { faSongGaoJing: vi.fn(async () => true), jiLuAIJiLu: vi.fn(), jiLuAIShiBai: vi.fn(), jiLuAIChengGong: vi.fn() },
  usage: vi.fn(async () => undefined),
}))

vi.mock('openai', () => ({ default: 假.OpenAI }))
vi.mock('../../config', () => ({
  peiZhi: {
    kaiFaMoShi: true,
    deepSeek: { apiMiYao: 'test-key', jiChuUrl: 'http://127.0.0.1:9' },
  },
}))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug, jiLuAIJiLu: 假.aiLog }))
vi.mock('../邮件告警', () => 假.mail)
vi.mock('../../services/用量统计', () => ({ jiLuShiYongLiang: 假.usage }))

import {
  chongZhiDeepSeekKeHuDuan,
  chongZhiRongDuan,
  genJuPeiZhiTiaoYong,
  huoQuDeepSeekKeHuDuan,
  huoQuMockTiaoYong,
  sheZhiMockTiaoYong,
  tiaoYongDeepSeek,
  yuSuanBaoHu,
  type DuiHuaXiaoXi,
} from '../DeepSeek客户端'

const 成功响应 = {
  output: [
    { type: 'message', content: [{ type: 'output_text', text: '可见回复' }] },
    { type: 'reasoning', content: [{ type: 'reasoning_text', text: '思考内容' }] },
  ],
  status: 'incomplete',
  usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15, input_tokens_details: { cached_tokens: 20 } },
}

const 消息: DuiHuaXiaoXi[] = [{ jiaoSe: 'user', neiRong: '你好' }]

beforeEach(() => {
  vi.clearAllMocks()
  process.env.XU_KE_ZHEN_SHI_WAI_HU = 'true'
  process.env.DEEPSEEK_BASE_URL = 'http://127.0.0.1:9'
  process.env.DEEPSEEK_API_KEY = 'test-key'
  假.create.mockResolvedValue(成功响应)
  假.usage.mockResolvedValue(undefined)
  假.mail.faSongGaoJing.mockResolvedValue(true)
  sheZhiMockTiaoYong(null)
  chongZhiRongDuan()
  chongZhiDeepSeekKeHuDuan()
})

afterEach(() => {
  vi.useRealTimers()
  delete process.env.XU_KE_ZHEN_SHI_WAI_HU
})

describe('DeepSeek 客户端调用与响应解析', () => {
  it('客户端单例、重置和 mock 注入按配置工作', () => {
    const 第一次 = huoQuDeepSeekKeHuDuan()
    expect(huoQuDeepSeekKeHuDuan()).toBe(第一次)
    expect(假.OpenAI).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'test-key', baseURL: 'http://127.0.0.1:9' }))
    chongZhiDeepSeekKeHuDuan()
    expect(huoQuDeepSeekKeHuDuan()).not.toBe(第一次)
    const mock函数 = vi.fn(async () => ({ neiRong: 'mock', yuanShuJu: {}, xinXi: { role: 'assistant', content: 'mock' } }))
    sheZhiMockTiaoYong(mock函数)
    expect(huoQuMockTiaoYong()).toBe(mock函数)
    sheZhiMockTiaoYong(null)
    expect(huoQuMockTiaoYong()).toBeNull()
  })

  it('mock 模式直接返回，不创建外部客户端', async () => {
    const mock函数 = vi.fn(async () => ({ neiRong: 'mock', yuanShuJu: {}, xinXi: { role: 'assistant', content: 'mock' } }))
    sheZhiMockTiaoYong(mock函数)
    await expect(tiaoYongDeepSeek({ xiaoXi: 消息 })).resolves.toMatchObject({ neiRong: 'mock' })
    expect(mock函数).toHaveBeenCalledWith({ xiaoXi: 消息 })
    expect(假.create).not.toHaveBeenCalled()
  })

  it('真实调用透传模型、JSON、思考、token、温度、top_p、外部 signal，并记录用量', async () => {
    const controller = new AbortController()
    const 结果 = await tiaoYongDeepSeek({
      xiaoXi: 消息,
      moXing: 'test-model',
      xiangYingGeShi: { type: 'json_object' },
      siKaoMoShi: 'enabled',
      reasoningEffort: 'high',
      zuiDaTokens: 99,
      wenDu: 0.3,
      top_p: 0.96,
    }, 'writer', controller.signal)
    expect(结果).toMatchObject({ neiRong: '可见回复', siKaoNeiRong: '思考内容', shiYongLiang: { shuRuToken: 10, shuChuToken: 5, zongToken: 15, mingZhongToken: 10 } })
    expect(假.create).toHaveBeenCalledWith(expect.objectContaining({ model: 'test-model', text: { format: { type: 'json_object' } }, reasoning: { effort: 'high' }, max_output_tokens: 99, temperature: 0.3, top_p: 0.96 }), expect.objectContaining({ signal: controller.signal }))
    await vi.waitFor(() => expect(假.usage).toHaveBeenCalledWith(expect.objectContaining({ moXingLeiXing: 'writer', shuRuToken: 10, mingZhongToken: 10 })))
    expect(假.debug.warn).toHaveBeenCalledWith('DeepSeek客户端', expect.stringContaining('响应被截断'))
    expect(假.mail.jiLuAIChengGong).toHaveBeenCalled()
  })

  it('开发模式记录最终参数，配置生成器复用统一参数计算', async () => {
    await tiaoYongDeepSeek({ xiaoXi: [{ jiaoSe: 'user', neiRong: [{ type: 'input_text', text: 'x' }, { type: 'input_image', image_url: 'data:image/png;base64,x' }] }] })
    expect(假.debug.debug).toHaveBeenCalledWith('DeepSeek客户端', '[AI参数] 最终生效参数', expect.anything())
    sheZhiMockTiaoYong(async (参数) => ({ neiRong: 参数.xiaoXi[0]?.jiaoSe === 'user' ? '生成' : '', yuanShuJu: {}, xinXi: { role: 'assistant', content: '生成' } }))
    await expect(genJuPeiZhiTiaoYong('qingGanFenXi', 消息)).resolves.toMatchObject({ neiRong: '生成' })
  })

  it('上下文预算对字符串、文本块、图片和无正预算保持正确行为', () => {
    expect(yuSuanBaoHu(消息, 0)).toEqual(消息)
    expect(yuSuanBaoHu([{ jiaoSe: 'user', neiRong: [{ type: 'input_text', text: 'a' }, { type: 'input_image', image_url: 'x' }] }], 2000)).toHaveLength(1)
  })
})

describe('DeepSeek 错误分类、重试和取消', () => {
  it('客户端未授权外呼时阻止真实请求', async () => {
    delete process.env.XU_KE_ZHEN_SHI_WAI_HU
    await expect(tiaoYongDeepSeek({ xiaoXi: 消息 })).rejects.toThrow('禁止真实外呼')
    expect(假.create).not.toHaveBeenCalled()
  })

  it('不可重试错误立即抛出并记录失败告警', async () => {
    const 错误 = Object.assign(new Error('bad request'), { status: 400 })
    假.create.mockRejectedValueOnce(错误)
    await expect(tiaoYongDeepSeek({ xiaoXi: 消息 })).rejects.toThrow('bad request')
    expect(假.aiLog).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.any(Number), false, 'bad request')
  })

  it('可重试错误退避后成功，外部取消在等待和调用前短路', async () => {
    vi.useFakeTimers()
    假.create.mockRejectedValueOnce({ status: 500 }).mockResolvedValueOnce(成功响应)
    const promise = tiaoYongDeepSeek({ xiaoXi: 消息 })
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toMatchObject({ neiRong: '可见回复' })
    expect(假.create).toHaveBeenCalledTimes(2)
    const controller = new AbortController()
    controller.abort()
    await expect(tiaoYongDeepSeek({ xiaoXi: 消息 }, 'writer', controller.signal)).rejects.toThrow('调用已取消')
  })

  it('达到连续失败阈值后熔断，非 HTTP 错误按可重试处理', async () => {
    vi.useFakeTimers()
    const 错误 = Object.assign(new Error('status 503'), { status: 503 })
    假.create.mockRejectedValue(错误)
    for (let i = 0; i < 5; i += 1) {
      const promise = tiaoYongDeepSeek({ xiaoXi: 消息 })
      const 断言 = expect(promise).rejects.toThrow('status 503')
      await vi.runAllTimersAsync()
      await 断言
    }
    await expect(tiaoYongDeepSeek({ xiaoXi: 消息 })).rejects.toThrow('这次没有回复出来，请重试当前操作')
    chongZhiRongDuan()
    假.create.mockResolvedValueOnce(成功响应)
    await expect(tiaoYongDeepSeek({ xiaoXi: 消息 })).resolves.toMatchObject({ neiRong: '可见回复' })
  })
})
