import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../redis', () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    decr: vi.fn(async () => 0),
  },
}))

vi.mock('../../config/多模态配置', () => ({
  huoQuDuoMoTaiPeiZhi: vi.fn(() => ({
    yuYinLiJieQiYong: false,
    guiJiLiuDongJiChuUrl: '',
    guiJiLiuDongYuYinMoXing: '',
    yinPinLiJieQiYong: false,
    yinPinLiJieJiChuUrl: '',
    yinPinLiJieMoXing: '',
    yinPinLiJieZuiDaZiJie: 0,
    shiPinLiJieQiYong: false,
    tuXiangShengChengQiYong: true,
    tuXiangShengChengJiChuUrl: 'https://shengtu.example/v1',
    tuXiangShengChengMoXing: 'test-model',
    shiPinShengChengQiYong: false,
    shiPinShengChengJiChuUrl: '',
    shiPinShengChengMoXing: '',
    meiRiShengChengShangXian: 3,
    qingQiuChaoShiHaoMiao: 5000,
    shengTuTiShiCiZuiDaZiFu: 500,
    shiPinTiShiCiZuiDaZiFu: 500,
    zhuDongShengTuZuiDiZongFen: 300,
    zhuDongShengTuGaiLv: 0.08,
    zhuDongShengTuRiShangXian: 3,
  })),
  huoQuTuXiangShengChengMiYao: vi.fn(() => 'test-key'),
}))

import { diaoYongShengTuJieKou, shengChengTuXiang } from '../图像生成'

const yuanShiFetch = globalThis.fetch

describe('生图底层接口', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = yuanShiFetch
  })

  it('请求体包含负面提示词与图像尺寸', async () => {
    let buHuo: Record<string, unknown> | null = null
    globalThis.fetch = vi.fn(async (_url: unknown, chuShi: { body?: string }) => {
      buHuo = JSON.parse(String(chuShi?.body ?? '{}')) as Record<string, unknown>
      return {
        ok: true,
        json: async () => ({ b64_json: Buffer.from('png').toString('base64') }),
      } as unknown as Response
    }) as unknown as typeof fetch
    const jieGuo = await diaoYongShengTuJieKou({
      tiShiCi: '扁平卡通头像',
      fuMianTiShiCi: '写实,文字',
      tuXiangChiCun: '1024x1024',
    })
    expect(jieGuo.cheng_gong).toBe(true)
    expect(buHuo).toMatchObject({
      model: 'test-model',
      prompt: '扁平卡通头像',
      negative_prompt: '写实,文字',
      image_size: '1024x1024',
    })
  })

  it('省略可选字段时不写入请求体', async () => {
    let buHuo: Record<string, unknown> | null = null
    globalThis.fetch = vi.fn(async (_url: unknown, chuShi: { body?: string }) => {
      buHuo = JSON.parse(String(chuShi?.body ?? '{}')) as Record<string, unknown>
      return {
        ok: true,
        json: async () => ({ b64_json: Buffer.from('png').toString('base64') }),
      } as unknown as Response
    }) as unknown as typeof fetch
    await diaoYongShengTuJieKou({ tiShiCi: '一个苹果' })
    expect(buHuo).toMatchObject({ prompt: '一个苹果' })
    expect('negative_prompt' in (buHuo ?? {})).toBe(false)
    expect('image_size' in (buHuo ?? {})).toBe(false)
  })

  it('生图失败时返还用户当日额度', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    })) as unknown as typeof fetch
    const jieGuo = await shengChengTuXiang({ tiShiCi: '风景', yongHuId: 'u-9' })
    expect(jieGuo.cheng_gong).toBe(false)
    const { redis } = await import('../../redis')
    expect(redis.decr).toHaveBeenCalled()
  })
})
