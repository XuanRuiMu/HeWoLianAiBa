import { beforeEach, afterAll, describe, expect, it, vi } from 'vitest'
import { writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const { 查询, 配置 } = vi.hoisted(() => ({
  查询: vi.fn(),
  配置: {
    guiJiLiuDongJiChuUrl: 'https://asr.example.com',
    guiJiLiuDongYuYinMoXing: 'test-asr',
    qingQiuChaoShiHaoMiao: 5000,
  },
}))

const LinShiYinPin = join(tmpdir(), `yuyin-ceshi-${Date.now()}.webm`)
writeFileSync(LinShiYinPin, Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x01]))
afterAll(() => {
  try {
    rmSync(LinShiYinPin)
  } catch {
    return
  }
})

vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  jiLuAIJiLu: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
}))
vi.mock('../../config/多模态配置', () => ({
  huoQuDuoMoTaiPeiZhi: vi.fn(() => 配置),
  huoQuGuiJiLiuDongMiYao: vi.fn(() => 'ce-shi-mi-yao'),
}))
vi.mock('../../数据库', () => ({
  数据库: { query: 查询 },
}))
vi.mock('../媒体存储', () => ({
  huoQuBenDiLuJing: vi.fn(() => LinShiYinPin),
}))

import { mianFeiZhuanXieYuYin, sheZhiYuYinZhuanXieMock } from '../语音转写'

const MeiTiId = '11111111-1111-4111-8111-111111111111'

function jiaASR(shuJu: unknown, zhuangTai = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(typeof shuJu === 'string' ? shuJu : JSON.stringify(shuJu), {
        status: zhuangTai,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  )
}

describe('语音转写空结果语义', () => {
  beforeEach(() => {
    sheZhiYuYinZhuanXieMock(null)
    查询.mockReset()
    查询.mockResolvedValue({ rows: [{ SHA256: 'abc123', MIME: 'audio/webm' }] })
    vi.unstubAllGlobals()
  })

  it('识别成功但无文字（无人声/纯伴奏）返回空串而不是null', async () => {
    jiaASR({ text: '   ' })
    await expect(mianFeiZhuanXieYuYin({ meiTiId: MeiTiId })).resolves.toBe('')
  })

  it('识别成功返回清理后的文本', async () => {
    jiaASR({ text: '  晚上一起吃饭  ' })
    await expect(mianFeiZhuanXieYuYin({ meiTiId: MeiTiId })).resolves.toBe('晚上一起吃饭')
  })

  it('ASR返回非2xx是真实失败，返回null', async () => {
    jiaASR({ cuo_wu: 'bad' }, 500)
    await expect(mianFeiZhuanXieYuYin({ meiTiId: MeiTiId })).resolves.toBeNull()
  })

  it('ASR网络异常是真实失败，返回null且不抛错', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('网络断了')
      }),
    )
    await expect(mianFeiZhuanXieYuYin({ meiTiId: MeiTiId })).resolves.toBeNull()
  })

  it('mock空串同样返回空串语义', async () => {
    sheZhiYuYinZhuanXieMock(async () => '')
    await expect(mianFeiZhuanXieYuYin({ meiTiId: MeiTiId })).resolves.toBe('')
  })
})
