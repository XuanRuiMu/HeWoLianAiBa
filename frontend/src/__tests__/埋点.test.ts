import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { track } from '@/utils/埋点'
import { yingYongBanBen } from '@/config/站点配置'

const yuanBenNavigator = globalThis.navigator

function anZhuangNavigator(moNi: Record<string, unknown>): void {
  Object.defineProperty(globalThis, 'navigator', {
    value: moNi,
    writable: true,
    configurable: true,
  })
}

function duQuBlobWenBen(blob: Blob): Promise<string> {
  return new Promise((jieJue, juJue) => {
    const duZhe = new FileReader()
    duZhe.onload = () => jieJue(String(duZhe.result))
    duZhe.onerror = () => juJue(duZhe.error)
    duZhe.readAsText(blob)
  })
}

describe('P1-8 埋点 util', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: yuanBenNavigator,
      writable: true,
      configurable: true,
    })
    vi.unstubAllGlobals()
  })

  it('优先使用 sendBeacon 发送 /api/logs，负载含约定字段', async () => {
    const sendBeacon = vi.fn(() => true)
    const fetchMock = vi.fn()
    anZhuangNavigator({ sendBeacon })

    track('zhuCeChengGong', { jie_guo: 'sheng_li_ai_qing' })

    expect(sendBeacon).toHaveBeenCalledOnce()
    expect(fetchMock).not.toHaveBeenCalled()

    const [url, blob] = sendBeacon.mock.calls[0] as [string, Blob]
    expect(url).toBe('/api/logs')
    expect(blob.type).toBe('application/json')

    const fuZai = JSON.parse(await duQuBlobWenBen(blob)) as Record<string, unknown>
    expect(fuZai.lei_xing).toBe('mai_dian')
    expect(fuZai.shi_jian).toBe('zhuCeChengGong')
    expect(fuZai.can_shu).toEqual({ jie_guo: 'sheng_li_ai_qing' })
    expect(fuZai.ban_ben).toBe(yingYongBanBen)
    expect(typeof fuZai.shi_jian_chuo).toBe('number')
  })

  it('can_shu 缺省时负载为空对象', async () => {
    const sendBeacon = vi.fn(() => true)
    anZhuangNavigator({ sendBeacon })

    track('junShiShiYong')

    const [, blob] = sendBeacon.mock.calls[0] as [string, Blob]
    const fuZai = JSON.parse(await duQuBlobWenBen(blob)) as Record<string, unknown>
    expect(fuZai.can_shu).toEqual({})
  })

  it('sendBeacon 不可用时降级 fetch keepalive', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}')))
    anZhuangNavigator({})
    vi.stubGlobal('fetch', fetchMock)

    track('xiangDaoWanCheng')

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/logs')
    expect(init.method).toBe('POST')
    expect(init.keepalive).toBe(true)
    const fuZai = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(fuZai.lei_xing).toBe('mai_dian')
    expect(fuZai.shi_jian).toBe('xiangDaoWanCheng')
  })

  it('sendBeacon 返回 false 时降级 fetch keepalive', async () => {
    const sendBeacon = vi.fn(() => false)
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}')))
    anZhuangNavigator({ sendBeacon })
    vi.stubGlobal('fetch', fetchMock)

    track('biaoBaiJieGuo', { jie_guo: 'shi_bai_ju_jue_biao_bai' })

    expect(sendBeacon).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('sendBeacon 抛错时被吞掉且降级 fetch', async () => {
    const sendBeacon = vi.fn(() => {
      throw new Error('boom')
    })
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}')))
    anZhuangNavigator({ sendBeacon })
    vi.stubGlobal('fetch', fetchMock)

    expect(() => track('zhuCeChengGong')).not.toThrow()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('负载序列化失败（循环引用）时静默不抛错且不发送', () => {
    const sendBeacon = vi.fn(() => true)
    anZhuangNavigator({ sendBeacon })
    const xunHuan: Record<string, unknown> = {}
    xunHuan.ziShen = xunHuan

    expect(() => track('huaDong', xunHuan)).not.toThrow()
    expect(sendBeacon).not.toHaveBeenCalled()
  })

  it('无 navigator.sendBeacon 且无 fetch 的环境下静默不抛错', () => {
    anZhuangNavigator({})
    vi.stubGlobal('fetch', undefined)

    expect(() => track('zhuCeChengGong')).not.toThrow()
  })
})
