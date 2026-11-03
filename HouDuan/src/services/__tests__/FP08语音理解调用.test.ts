import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { huanCunGet, huanCunSetex, zhuanMa, ffmpegLuJing, laQuBenDiLuJing } = vi.hoisted(() => ({
  huanCunGet: vi.fn<(jian: string) => Promise<string | null>>(async () => null),
  huanCunSetex: vi.fn<(jian: string, miao: number, zhi: string) => Promise<string>>(async () => 'OK'),
  zhuanMa: vi.fn<() => Promise<Buffer | null>>(async () => Buffer.from('RIFFfake-wav-bytes')),
  ffmpegLuJing: vi.fn<() => Promise<string | null>>(async () => 'ffmpeg'),
  laQuBenDiLuJing: vi.fn<(sha256: string) => string | null>(() => '/tmp/media/xx'),
}))

vi.mock('../../redis', () => ({
  redis: { get: huanCunGet, setex: huanCunSetex },
}))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('../../config/多模态配置', () => ({
  huoQuDuoMoTaiPeiZhi: vi.fn(),
  huoQuYinPinLiJieMiYao: vi.fn(() => 'ce-shi-mi-yao'),
}))
vi.mock('../../utils/音频转码', () => ({
  huoQuFFmpegLuJing: ffmpegLuJing,
  tiQuYinPinWeiWav: zhuanMa,
}))
vi.mock('../媒体存储', () => ({
  huoQuBenDiLuJing: laQuBenDiLuJing,
}))

import { duQuYinPinShiJianHuanCun, huoQuYinPinShiJianMiaoShuZhiJie, qingChuYinPinShiJianNeiCunHuanCun } from '../语音理解调用'
import { huoQuDuoMoTaiPeiZhi } from '../../config/多模态配置'

const quanLiangPeiZhi = {
  yuYinLiJieQiYong: true,
  guiJiLiuDongJiChuUrl: 'https://api.siliconflow.example/v1',
  guiJiLiuDongYuYinMoXing: 'SenseVoiceSmall',
  yinPinLiJieQiYong: true,
  yinPinLiJieJiChuUrl: 'https://dashscope.example/compatible-mode/v1',
  yinPinLiJieMoXing: 'qwen3.8-omni-flash',
  yinPinLiJieZuiDaZiJie: 10485760,
  shiPinLiJieQiYong: false,
  tuXiangShengChengQiYong: false,
  tuXiangShengChengJiChuUrl: 'https://api.siliconflow.example/v1',
  tuXiangShengChengMoXing: 'Kolors',
  shiPinShengChengQiYong: false,
  shiPinShengChengJiChuUrl: 'https://api.siliconflow.example/v1',
  shiPinShengChengMoXing: 'Wan2.2',
  meiRiShengChengShangXian: 10,
  qingQiuChaoShiHaoMiao: 1000,
  shengTuTiShiCiZuiDaZiFu: 200,
  shiPinTiShiCiZuiDaZiFu: 200,
  zhuDongShengTuZuiDiZongFen: 0,
  zhuDongShengTuGaiLv: 0,
  zhuDongShengTuRiShangXian: 3,
}

const sha256 = 'a'.repeat(64)
const wavZiJie = Buffer.from('RIFFfake-wav-bytes')

function jiaXiangYing(neiRong: unknown, zhuangTaiMa = 200): Response {
  return {
    ok: zhuangTaiMa >= 200 && zhuangTaiMa < 300,
    status: zhuangTaiMa,
    json: async () => ({ choices: [{ message: { content: neiRong } }] }),
  } as unknown as Response
}

describe('语音理解调用（阿里百炼 qwen-omni 音频事件描述）', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => jiaXiangYing('一个人在轻声哼唱，背景有风声')))
    vi.mocked(huoQuDuoMoTaiPeiZhi).mockReturnValue(quanLiangPeiZhi)
    process.env.XU_KE_ZHEN_SHI_WAI_HU = 'true'
    qingChuYinPinShiJianNeiCunHuanCun()
    huanCunGet.mockClear().mockResolvedValue(null)
    huanCunSetex.mockClear()
    zhuanMa.mockClear().mockResolvedValue(wavZiJie)
    ffmpegLuJing.mockClear().mockResolvedValue('ffmpeg')
    laQuBenDiLuJing.mockClear()
  })

  afterEach(() => {
    delete process.env.XU_KE_ZHEN_SHI_WAI_HU
    vi.unstubAllGlobals()
    vi.mocked(huoQuDuoMoTaiPeiZhi).mockReset()
  })

  it('请求体结构：model、modalities=text、input_audio(base64, wav)、指令词与密钥头', async () => {
    const jieGuo = await huoQuYinPinShiJianMiaoShuZhiJie({ sha256, mime: 'audio/webm;codecs=opus' })
    expect(jieGuo).toBe('一个人在轻声哼唱，背景有风声')
    const diaoYong = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(diaoYong[0])).toBe('https://dashscope.example/compatible-mode/v1/chat/completions')
    expect(diaoYong[1].method).toBe('POST')
    expect(diaoYong[1].headers.Authorization).toBe('Bearer ce-shi-mi-yao')
    const qingQiuTi = JSON.parse(diaoYong[1].body)
    expect(qingQiuTi.model).toBe('qwen3.8-omni-flash')
    expect(qingQiuTi.modalities).toEqual(['text'])
    const neiRong = qingQiuTi.messages[0].content
    expect(neiRong[0].type).toBe('input_audio')
    expect(neiRong[0].input_audio.data).toBe(wavZiJie.toString('base64'))
    expect(neiRong[0].input_audio.format).toBe('wav')
    expect(neiRong[1].type).toBe('text')
    expect(String(neiRong[1].text)).toContain('200')
    expect(String(neiRong[1].text)).toContain('唱歌')
    expect(String(neiRong[1].text)).toContain('不讨好')
    expect(huanCunSetex).toHaveBeenCalledTimes(1)
    const [jian, ttl] = huanCunSetex.mock.calls[0]
    expect(String(jian)).toBe(`yuyin_shijian:${sha256}:qwen3.8-omni-flash`)
    expect(ttl).toBe(7 * 24 * 60 * 60)
  })

  it('Redis 缓存命中时不发任何网络请求也不再转码', async () => {
    huanCunGet.mockResolvedValueOnce(JSON.stringify('缓存里的描述'))
    const jieGuo = await huoQuYinPinShiJianMiaoShuZhiJie({ sha256, mime: 'audio/wav' })
    expect(jieGuo).toBe('缓存里的描述')
    expect(fetch).not.toHaveBeenCalled()
    expect(zhuanMa).not.toHaveBeenCalled()
    expect(huanCunSetex).not.toHaveBeenCalled()
  })

  it('缓存读取异常时继续走真实调用链', async () => {
    huanCunGet.mockRejectedValueOnce(new Error('缓存挂了'))
    const jieGuo = await huoQuYinPinShiJianMiaoShuZhiJie({ sha256, mime: 'audio/wav' })
    expect(jieGuo).toBe('一个人在轻声哼唱，背景有风声')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('Redis 故障时靠内存缓存兜底，同一段音频不重复外呼', async () => {
    huanCunGet.mockRejectedValue(new Error('缓存挂了'))
    const diYiCi = await huoQuYinPinShiJianMiaoShuZhiJie({ sha256, mime: 'audio/wav' })
    const diErCi = await huoQuYinPinShiJianMiaoShuZhiJie({ sha256, mime: 'audio/wav' })
    expect(diYiCi).toBe('一个人在轻声哼唱，背景有风声')
    expect(diErCi).toBe('一个人在轻声哼唱，背景有风声')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('开关关闭时直接降级返回 null', async () => {
    vi.mocked(huoQuDuoMoTaiPeiZhi).mockReturnValue({ ...quanLiangPeiZhi, yinPinLiJieQiYong: false })
    expect(await huoQuYinPinShiJianMiaoShuZhiJie({ sha256, mime: 'audio/wav' })).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
    expect(zhuanMa).not.toHaveBeenCalled()
  })

  it('转码失败时降级返回 null 且不发请求', async () => {
    zhuanMa.mockResolvedValueOnce(null)
    expect(await huoQuYinPinShiJianMiaoShuZhiJie({ sha256, mime: 'audio/wav' })).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
    expect(huanCunSetex).not.toHaveBeenCalled()
  })

  it('本机没有 ffmpeg 时降级返回 null 且不发请求', async () => {
    ffmpegLuJing.mockResolvedValueOnce(null)
    expect(await huoQuYinPinShiJianMiaoShuZhiJie({ sha256, mime: 'audio/wav' })).toBeNull()
    expect(zhuanMa).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('base64 载荷超过配置的最大字节时降级返回 null 且不发请求', async () => {
    vi.mocked(huoQuDuoMoTaiPeiZhi).mockReturnValue({ ...quanLiangPeiZhi, yinPinLiJieZuiDaZiJie: 8 })
    expect(await huoQuYinPinShiJianMiaoShuZhiJie({ sha256, mime: 'audio/wav' })).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
    expect(huanCunSetex).not.toHaveBeenCalled()
  })

  it('接口返回非2xx或空内容时降级返回 null，且不写缓存', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jiaXiangYing('内容', 500)))
    expect(await huoQuYinPinShiJianMiaoShuZhiJie({ sha256, mime: 'audio/wav' })).toBeNull()
    expect(huanCunSetex).not.toHaveBeenCalled()
    vi.stubGlobal('fetch', vi.fn(async () => jiaXiangYing('   ')))
    expect(await huoQuYinPinShiJianMiaoShuZhiJie({ sha256, mime: 'audio/wav' })).toBeNull()
    expect(huanCunSetex).not.toHaveBeenCalled()
  })

  it('content 为分段数组时按 text 分片拼接，且描述截断到200字', async () => {
    const changMiaoShu = '长'.repeat(260)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jiaXiangYing([{ type: 'text', text: changMiaoShu }])),
    )
    const jieGuo = await huoQuYinPinShiJianMiaoShuZhiJie({ sha256, mime: 'audio/wav' })
    expect(jieGuo).toBe('长'.repeat(200))
  })

  it('非法 sha256 或非音频 MIME 直接返回 null', async () => {
    expect(await huoQuYinPinShiJianMiaoShuZhiJie({ sha256: 'duan', mime: 'audio/wav' })).toBeNull()
    expect(await huoQuYinPinShiJianMiaoShuZhiJie({ sha256, mime: 'video/mp4' })).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('VITEST 环境未开外呼许可时拒绝真实外呼（守卫与 DeepSeek客户端 同款）', async () => {
    delete process.env.XU_KE_ZHEN_SHI_WAI_HU
    await expect(huoQuYinPinShiJianMiaoShuZhiJie({ sha256, mime: 'audio/wav' })).rejects.toThrow(
      /禁止真实外呼/,
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('缓存键按 sha256+模型 组合，读取缓存解析回原文', async () => {
    huanCunGet.mockResolvedValueOnce(JSON.stringify('按模型分开的描述'))
    const jieGuo = await duQuYinPinShiJianHuanCun(sha256, 'moxing-a')
    expect(jieGuo).toBe('按模型分开的描述')
    expect(String(huanCunGet.mock.calls[0][0])).toBe(`yuyin_shijian:${sha256}:moxing-a`)
  })
})
