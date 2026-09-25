import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  配: { ttsServiceUrl: 'http://tts.test', internalToken: '1234567890123456', ttsEnabled: true },
  fetch: vi.fn(),
  liuShi: vi.fn(),
  gaoJing: vi.fn(),
  debug: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}))

vi.mock('../../config', () => ({ peiZhi: 假.配 }))
vi.mock('../../config/translations', () => ({ huoQuFanYi: vi.fn() }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))
vi.mock('../../utils/邮件告警', () => ({ faSongGaoJing: 假.gaoJing }))
vi.mock('../媒体存储', () => ({ liuShiBaoCunMeiTi: 假.liuShi }))

import { 尝试合成语音, 合成语音 } from '../TTS服务'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', 假.fetch)
  假.配.ttsServiceUrl = 'http://tts.test'
  假.配.internalToken = '1234567890123456'
  假.配.ttsEnabled = true
  假.fetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ audio_hex: '00ff', duration_ms: 1234 }) })
  假.liuShi.mockResolvedValue({ mediaId: '媒体' })
  假.gaoJing.mockResolvedValue(undefined)
})

describe('TTS服务业务分支', () => {
  it('成功合成、落盘并返回媒体信息', async () => {
    await expect(合成语音({ text: '你好', voiceId: '声音', roleId: '角色' })).resolves.toEqual({ mediaId: '媒体', durationMs: 1234 })
    expect(假.fetch).toHaveBeenCalledWith('http://tts.test/api/tts/synthesize', expect.objectContaining({ method: 'POST' }))
    expect(假.liuShi).toHaveBeenCalled()
    expect(假.debug.info).toHaveBeenCalled()
  })

  it('服务错误、媒体错误和空令牌均告警并传播或降级', async () => {
    假.fetch.mockResolvedValueOnce({ ok: false, status: 502, text: vi.fn().mockResolvedValue('上游错误') })
    await expect(合成语音({ text: '你好', voiceId: '声音' })).rejects.toThrow('502')
    假.fetch.mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ audio_hex: '00', duration_ms: 1 }) })
    假.liuShi.mockRejectedValueOnce(new Error('存储失败'))
    await expect(合成语音({ text: '你好', voiceId: '声音' })).rejects.toThrow('存储失败')
    假.配.internalToken = '短'
    await expect(合成语音({ text: '你好', voiceId: '声音' })).rejects.toThrow('令牌')
    假.配.ttsEnabled = false
    await expect(尝试合成语音({ text: '你好', voiceId: '声音' })).resolves.toBeNull()
  })

  it('响应读取和告警拒绝也走内部降级回调', async () => {
    假.fetch.mockResolvedValueOnce({ ok: false, status: 503, text: vi.fn().mockRejectedValue(new Error('读取失败')) })
    await expect(合成语音({ text: '你好', voiceId: '声音' })).rejects.toThrow('503')
    假.fetch.mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ audio_hex: '00', duration_ms: 1 }) })
    假.liuShi.mockRejectedValueOnce(new Error('存储失败'))
    假.gaoJing.mockRejectedValueOnce(new Error('告警失败'))
    await expect(合成语音({ text: '你好', voiceId: '声音' })).rejects.toThrow('存储失败')
  })

  it('启用时捕获合成错误并返回空结果', async () => {
    假.fetch.mockRejectedValueOnce(new Error('网络'))
    await expect(尝试合成语音({ text: '你好', voiceId: '声音' })).resolves.toBeNull()
    expect(假.gaoJing).toHaveBeenCalled()
  })
})
