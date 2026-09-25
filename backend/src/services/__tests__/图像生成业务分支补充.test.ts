import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'

const 假 = vi.hoisted(() => ({
  redis: { incr: vi.fn(), expire: vi.fn(), decr: vi.fn() },
  peiZhi: vi.fn(),
  miYao: vi.fn(),
  debug: { warn: vi.fn(), error: vi.fn() },
  readFile: vi.fn(),
  unlink: vi.fn(),
  validate: vi.fn(),
  download: vi.fn(),
}))
vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('../../config/多模态配置', () => ({ huoQuDuoMoTaiPeiZhi: 假.peiZhi, huoQuTuXiangShengChengMiYao: 假.miYao }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))
vi.mock('../../utils/远端拉取', () => ({ yanZhengYuanChengURL: 假.validate, liuShiXiaZaiYuanChengWenJian: 假.download }))
vi.mock('../../config/translations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../config/translations')>()),
  huoQuFanYi: vi.fn((_: string, key: string) => key),
}))

import { huiTuiShengTuPeiE, jianChaShengTuPeiE, sheZhiShengTuMock, shengChengTuXiang, yanZhengShengTuTiShiCi } from '../图像生成'

const cfg = { meiRiShengChengShangXian: 2, shengTuTiShiCiZuiDaZiFu: 10, tuXiangShengChengQiYong: true, tuXiangShengChengMoXing: 'model', tuXiangShengChengJiChuUrl: 'http://image.test', qingQiuChaoShiHaoMiao: 1000 }

beforeEach(() => {
  vi.clearAllMocks()
  假.peiZhi.mockReturnValue(cfg)
  假.miYao.mockReturnValue('key')
  假.redis.incr.mockResolvedValue(1)
  假.redis.expire.mockResolvedValue(1)
  假.redis.decr.mockResolvedValue(0)
  sheZhiShengTuMock(null)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('图像生成补充业务分支', () => {
  it('提示词、mock、配置和配额分支', async () => {
    expect(yanZhengShengTuTiShiCi(' 提示 ')).toEqual({ heFa: true, qingXiHou: '提示' })
    expect(yanZhengShengTuTiShiCi(null)).toMatchObject({ heFa: false })
    const mock = vi.fn(async () => ({ cheng_gong: true, tuPianZiJie: Buffer.from('x') }))
    sheZhiShengTuMock(mock)
    await expect(shengChengTuXiang({ tiShiCi: '提示', yongHuId: '用户' })).resolves.toMatchObject({ cheng_gong: true })
    sheZhiShengTuMock(null)
    await expect(shengChengTuXiang({ tiShiCi: '', yongHuId: '用户' })).resolves.toMatchObject({ cheng_gong: false })
    假.miYao.mockReturnValue('')
    await expect(shengChengTuXiang({ tiShiCi: '提示', yongHuId: '用户' })).resolves.toMatchObject({ cheng_gong: false })
    假.miYao.mockReturnValue('key')
    假.redis.incr.mockResolvedValueOnce(3)
    await expect(shengChengTuXiang({ tiShiCi: '提示', yongHuId: '限额' })).resolves.toMatchObject({ cheng_gong: false })
  })

  it('URL下载成功、超时和清理失败均走完整路径', async () => {
    假.redis.incr.mockResolvedValue(1)
    假.validate.mockResolvedValue({ he_fa: true })
    假.download.mockResolvedValue({ cheng_gong: true, mime: 'image/png' })
    const readSpy = vi.spyOn(fs.promises, 'readFile').mockResolvedValue(Buffer.from('image'))
    const unlinkSpy = vi.spyOn(fs.promises, 'unlink').mockRejectedValue(new Error('清理失败'))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ images: [{ url: 'https://image.test/a.png' }] }) }))
    const 下载结果 = await shengChengTuXiang({ tiShiCi: '提示', yongHuId: '下载用户' })
    expect(假.validate).toHaveBeenCalled()
    expect(假.download).toHaveBeenCalled()
    expect(readSpy).toHaveBeenCalled()
    expect(unlinkSpy).toHaveBeenCalled()
    expect(下载结果).toMatchObject({ cheng_gong: true })
    vi.useFakeTimers()
    const fetchPromise = vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new Error('超时')))))
    vi.stubGlobal('fetch', fetchPromise)
    const 超时请求 = shengChengTuXiang({ tiShiCi: '提示', yongHuId: '超时用户' })
    await vi.advanceTimersByTimeAsync(1000)
    await expect(超时请求).resolves.toMatchObject({ cheng_gong: false })
    vi.useRealTimers()
  })

  it('Redis和进程内配额回补以及上游失败', async () => {
    假.redis.incr.mockRejectedValueOnce(new Error('redis'))
    await expect(jianChaShengTuPeiE('用户')).resolves.toEqual({ yunXu: true })
    await huiTuiShengTuPeiE('用户')
    假.redis.decr.mockRejectedValueOnce(new Error('redis'))
    await expect(huiTuiShengTuPeiE('用户')).resolves.toBeUndefined()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(shengChengTuXiang({ tiShiCi: '提示', yongHuId: '用户' })).resolves.toMatchObject({ cheng_gong: false })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('网络')))
    await expect(shengChengTuXiang({ tiShiCi: '提示', yongHuId: '用户' })).resolves.toMatchObject({ cheng_gong: false })
  })
})
