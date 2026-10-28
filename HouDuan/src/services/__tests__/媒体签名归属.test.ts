import { afterEach, describe, expect, it, vi } from 'vitest'

const chaXunMock = vi.hoisted(() => vi.fn(async () => ({ rows: [] as unknown[], rowCount: 0 })))
const huoQuMock = vi.hoisted(() => vi.fn(async (): Promise<string | null> => null))

vi.mock('../../数据库', () => ({
  数据库: { query: chaXunMock },
}))
vi.mock('../../redis', () => ({
  redis: {
    get: huoQuMock,
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
  },
}))

import { shengChengQianMingURL, yanZhengQianMing, zhongXinQianMingMeiTiURL } from '../媒体存储'

const SHA = 'a'.repeat(64)
const YONG_HU = '6ef2a94a-67be-4e9b-9c93-f0a2c9df6f21'
const QI_TA_REN = '6ef2a94a-67be-4e9b-9c93-f0a2c9df6f99'

function jieXiCanShu(url: string): Record<string, string> {
  const canShu = new URL(url, 'http://localhost').searchParams
  return {
    e: canShu.get('e') ?? '',
    u: canShu.get('u') ?? '',
    t: canShu.get('t') ?? '',
    s: canShu.get('s') ?? '',
  }
}

afterEach(() => {
  chaXunMock.mockReset()
  chaXunMock.mockImplementation(async () => ({ rows: [], rowCount: 0 }))
  huoQuMock.mockReset()
  huoQuMock.mockImplementation(async () => null)
})

describe('媒体签名必须绑定用户归属', () => {
  it('签名URL必须带用户与签发时间参数', () => {
    const url = shengChengQianMingURL(SHA, YONG_HU)
    const canShu = jieXiCanShu(url)
    expect(canShu.u).toBe(YONG_HU)
    expect(canShu.t).not.toBe('')
    expect(canShu.e).not.toBe('')
    expect(canShu.s).not.toBe('')
  })

  it('归属校验通过时签名有效', async () => {
    const url = shengChengQianMingURL(SHA, YONG_HU)
    const { e, u, t, s } = jieXiCanShu(url)
    chaXunMock.mockResolvedValueOnce({ rows: [{ yi: 1 }], rowCount: 1 })
    await expect(yanZhengQianMing(SHA, e, u, s, t)).resolves.toBe(true)
  })

  it('缺用户或缺签发时间的匿名签名一律拒绝', async () => {
    const url = shengChengQianMingURL(SHA, YONG_HU)
    const { e, u, t, s } = jieXiCanShu(url)
    await expect(yanZhengQianMing(SHA, e, '', s, t)).resolves.toBe(false)
    await expect(yanZhengQianMing(SHA, e, undefined, s, t)).resolves.toBe(false)
    await expect(yanZhengQianMing(SHA, e, u, s, '')).resolves.toBe(false)
    await expect(yanZhengQianMing(SHA, e, u, s, undefined)).resolves.toBe(false)
  })

  it('签名用户对该媒体无归属时拒绝下载', async () => {
    const taRenUrl = shengChengQianMingURL(SHA, QI_TA_REN)
    const { e, u, t, s } = jieXiCanShu(taRenUrl)
    chaXunMock.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await expect(yanZhengQianMing(SHA, e, u, s, t)).resolves.toBe(false)
  })

  it('签发时间早于用户媒体撤销时间时拒绝', async () => {
    const url = shengChengQianMingURL(SHA, YONG_HU)
    const { e, u, t, s } = jieXiCanShu(url)
    huoQuMock.mockResolvedValueOnce(String(Date.now() + 1000))
    await expect(yanZhengQianMing(SHA, e, u, s, t)).resolves.toBe(false)
  })

  it('签名被篡改时拒绝', async () => {
    const url = shengChengQianMingURL(SHA, YONG_HU)
    const { e, u, t, s } = jieXiCanShu(url)
    const weiZao = 'f'.repeat(s.length)
    await expect(yanZhengQianMing(SHA, e, u, weiZao, t)).resolves.toBe(false)
  })

  it('重新签名仍绑定指定用户且换签发时间', () => {
    const cunChuZhi = `/api/媒体/${SHA}`
    const chongXin = zhongXinQianMingMeiTiURL(cunChuZhi, YONG_HU)
    expect(chongXin).not.toBeNull()
    const canShu = jieXiCanShu(chongXin as string)
    expect(canShu.u).toBe(YONG_HU)
    expect(canShu.t).not.toBe('')
  })
})
