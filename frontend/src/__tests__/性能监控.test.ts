import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Metric } from 'web-vitals'

const huiDiaoMap: Record<string, (metric: Metric) => void> = {}

vi.mock('web-vitals', () => ({
  onLCP: (cb: (m: Metric) => void) => {
    huiDiaoMap.LCP = cb
  },
  onINP: (cb: (m: Metric) => void) => {
    huiDiaoMap.INP = cb
  },
  onCLS: (cb: (m: Metric) => void) => {
    huiDiaoMap.CLS = cb
  },
  onFCP: (cb: (m: Metric) => void) => {
    huiDiaoMap.FCP = cb
  },
  onTTFB: (cb: (m: Metric) => void) => {
    huiDiaoMap.TTFB = cb
  },
}))

import { chuShiHuaXingNengJianKong, chongZhiXingNengJianKong } from '@/utils/性能监控'
import { sheZhiCuoWuShangBaoHanShu } from '@/utils/错误上报'

function chuangJianZhiBiao(
  name: Metric['name'],
  value: number,
  rating: Metric['rating'] = 'good',
): Metric {
  return {
    name,
    value,
    rating,
    delta: value,
    id: `test-${name}`,
    entries: [],
    navigationType: 'navigate',
    navigationId: 0,
  }
}

describe('FP-04 性能监控', () => {
  beforeEach(() => {
    chongZhiXingNengJianKong()
    Object.keys(huiDiaoMap).forEach((k) => delete huiDiaoMap[k])
    sheZhiCuoWuShangBaoHanShu(null)
  })

  it('chuShiHuaXingNengJianKong 注册 LCP/INP/CLS/FCP/TTFB 回调', () => {
    chuShiHuaXingNengJianKong()

    expect(huiDiaoMap.LCP).toBeDefined()
    expect(huiDiaoMap.INP).toBeDefined()
    expect(huiDiaoMap.CLS).toBeDefined()
    expect(huiDiaoMap.FCP).toBeDefined()
    expect(huiDiaoMap.TTFB).toBeDefined()
  })

  it('LCP 回调触发上报 lei_xing=xingNengZhiBiao', () => {
    const shangBao = vi.fn()
    sheZhiCuoWuShangBaoHanShu(shangBao)
    chuShiHuaXingNengJianKong()

    huiDiaoMap.LCP(chuangJianZhiBiao('LCP', 1500, 'good'))

    expect(shangBao).toHaveBeenCalledOnce()
    const canShu = shangBao.mock.calls[0][0]
    expect(canShu.fuJia.shangBaoLeiXing).toBe('xingNengZhiBiao')
    expect(canShu.cuoWu.zhiBiaoMing).toBe('LCP')
    expect(canShu.cuoWu.zhi).toBe(1500)
    expect(canShu.cuoWu.pingFen).toBe('good')
    expect(canShu.cuoWu.daoHangLeiXing).toBe('navigate')
    expect(typeof canShu.cuoWu.id).toBe('string')
    expect(typeof canShu.shiJianChuo).toBe('number')
  })

  it('INP 回调触发上报（FID 已被 INP 替代）', () => {
    const shangBao = vi.fn()
    sheZhiCuoWuShangBaoHanShu(shangBao)
    chuShiHuaXingNengJianKong()

    huiDiaoMap.INP(chuangJianZhiBiao('INP', 80, 'needs-improvement'))

    expect(shangBao).toHaveBeenCalledOnce()
    const canShu = shangBao.mock.calls[0][0]
    expect(canShu.cuoWu.zhiBiaoMing).toBe('INP')
    expect(canShu.cuoWu.zhi).toBe(80)
    expect(canShu.cuoWu.pingFen).toBe('needs-improvement')
  })

  it('CLS 回调触发上报', () => {
    const shangBao = vi.fn()
    sheZhiCuoWuShangBaoHanShu(shangBao)
    chuShiHuaXingNengJianKong()

    huiDiaoMap.CLS(chuangJianZhiBiao('CLS', 0.05, 'good'))

    expect(shangBao).toHaveBeenCalledOnce()
    expect(shangBao.mock.calls[0][0].cuoWu.zhiBiaoMing).toBe('CLS')
  })

  it('FCP 回调触发上报', () => {
    const shangBao = vi.fn()
    sheZhiCuoWuShangBaoHanShu(shangBao)
    chuShiHuaXingNengJianKong()

    huiDiaoMap.FCP(chuangJianZhiBiao('FCP', 900, 'good'))

    expect(shangBao).toHaveBeenCalledOnce()
    expect(shangBao.mock.calls[0][0].cuoWu.zhiBiaoMing).toBe('FCP')
  })

  it('TTFB 回调触发上报', () => {
    const shangBao = vi.fn()
    sheZhiCuoWuShangBaoHanShu(shangBao)
    chuShiHuaXingNengJianKong()

    huiDiaoMap.TTFB(chuangJianZhiBiao('TTFB', 200, 'good'))

    expect(shangBao).toHaveBeenCalledOnce()
    expect(shangBao.mock.calls[0][0].cuoWu.zhiBiaoMing).toBe('TTFB')
  })

  it('未设置上报 hook 时回调仍安全无副作用', () => {
    expect(() => {
      chuShiHuaXingNengJianKong()
      huiDiaoMap.LCP(chuangJianZhiBiao('LCP', 100))
    }).not.toThrow()
  })

  it('重复调用只初始化一次', () => {
    chuShiHuaXingNengJianKong()
    const lcp1 = huiDiaoMap.LCP
    chuShiHuaXingNengJianKong()
    const lcp2 = huiDiaoMap.LCP
    expect(lcp1).toBe(lcp2)
  })
})
