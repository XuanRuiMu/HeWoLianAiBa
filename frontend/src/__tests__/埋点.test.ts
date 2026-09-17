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

  it('使用 fetch keepalive 发送 /api/logs，负载含约定字段（禁sendBeacon：502无回执刷资源error）', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}')))
    vi.stubGlobal('fetch', fetchMock)

    track('zhuCeChengGong', { jie_guo: 'sheng_li_ai_qing' })

    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/logs')
    expect(init.method).toBe('POST')
    expect(init.keepalive).toBe(true)

    const fuZai = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(fuZai.lei_xing).toBe('mai_dian')
    expect(fuZai.shi_jian).toBe('zhuCeChengGong')
    expect(fuZai.can_shu).toEqual({ jie_guo: 'sheng_li_ai_qing' })
    expect(fuZai.ban_ben).toBe(yingYongBanBen)
    expect(typeof fuZai.shi_jian_chuo).toBe('number')
  })

  it('can_shu 缺省时负载为空对象', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}')))
    vi.stubGlobal('fetch', fetchMock)

    track('junShiShiYong')

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const fuZai = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(fuZai.can_shu).toEqual({})
  })

  it('fetch 发送 keepalive 负载正确', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}')))
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

  it('fetch 抛错时被吞掉不抛错', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error('boom')))
    vi.stubGlobal('fetch', fetchMock)

    track('biaoBaiJieGuo', { jie_guo: 'shi_bai_ju_jue_biao_bai' })

    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('fetch 拒绝时被吞掉不抛错', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error('boom')))
    vi.stubGlobal('fetch', fetchMock)

    expect(() => track('zhuCeChengGong')).not.toThrow()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('负载序列化失败（循环引用）时静默不抛错且不发送', () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response('{}')))
    vi.stubGlobal('fetch', fetchMock)
    const xunHuan: Record<string, unknown> = {}
    xunHuan.ziShen = xunHuan

    expect(() => track('huaDong', xunHuan)).not.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('无 fetch 的环境下静默不抛错', () => {
    vi.stubGlobal('fetch', undefined)

    expect(() => track('zhuCeChengGong')).not.toThrow()
  })
})
