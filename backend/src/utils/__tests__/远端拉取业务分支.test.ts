import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const 假 = vi.hoisted(() => ({ lookup: vi.fn(), debug: { warn: vi.fn() } }))

vi.mock('dns', () => ({ promises: { lookup: 假.lookup } }))
vi.mock('../debug日志', () => ({ debug日志: 假.debug }))

import { peiZhi } from '../../config'
import { liuShiXiaZaiYuanChengWenJian, yanZhengYuanChengURL } from '../远端拉取'

const 原下载配置 = { ...peiZhi.yuanChengLaQu, yunXuXieYi: [...peiZhi.yuanChengLaQu.yunXuXieYi], yuMingBaiMingDan: [...peiZhi.yuanChengLaQu.yuMingBaiMingDan] }
let 临时目录 = ''

beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(peiZhi.yuanChengLaQu, { yunXuXieYi: ['https:'], yuMingBaiMingDan: ['example.com'], zuiDaZiJie: 10, chaoShiHaoMiao: 1000 })
  假.lookup.mockResolvedValue([{ address: '93.184.216.34' }])
})

afterEach(async () => {
  Object.assign(peiZhi.yuanChengLaQu, 原下载配置)
  vi.unstubAllGlobals()
  if (临时目录) await rm(临时目录, { recursive: true, force: true })
  临时目录 = ''
})

describe('远端拉取业务分支', () => {
  it('URL 校验覆盖非法协议、凭据、内网、白名单、DNS 和成功', async () => {
    await expect(yanZhengYuanChengURL('not-url')).resolves.toMatchObject({ he_fa: false })
    await expect(yanZhengYuanChengURL('http://example.com/a')).resolves.toMatchObject({ he_fa: false })
    await expect(yanZhengYuanChengURL('https://user:pass@example.com/a')).resolves.toMatchObject({ he_fa: false })
    await expect(yanZhengYuanChengURL('https://localhost/a')).resolves.toMatchObject({ he_fa: false })
    await expect(yanZhengYuanChengURL('https://10.0.0.1/a')).resolves.toMatchObject({ he_fa: false })
    await expect(yanZhengYuanChengURL('https://other.example/a')).resolves.toMatchObject({ he_fa: false })
    假.lookup.mockResolvedValueOnce([])
    await expect(yanZhengYuanChengURL('https://example.com/a')).resolves.toMatchObject({ he_fa: false })
    假.lookup.mockResolvedValueOnce([{ address: '127.0.0.1' }])
    await expect(yanZhengYuanChengURL('https://example.com/a')).resolves.toMatchObject({ he_fa: false })
    假.lookup.mockRejectedValueOnce(new Error('dns'))
    await expect(yanZhengYuanChengURL('https://example.com/a')).resolves.toMatchObject({ he_fa: false })
    await expect(yanZhengYuanChengURL('https://example.com/a')).resolves.toMatchObject({ he_fa: true, jieXi: expect.any(URL) })
  })

  it('流式下载覆盖校验失败、响应失败、超限、正常和异常', async () => {
    await expect(liuShiXiaZaiYuanChengWenJian('bad-url', '目标')).resolves.toMatchObject({ cheng_gong: false })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValueOnce({ ok: false, body: null, headers: new Headers() })
    await expect(liuShiXiaZaiYuanChengWenJian('https://example.com/a', '目标')).resolves.toMatchObject({ cheng_gong: false })
    const cancel = vi.fn()
    fetchMock.mockResolvedValueOnce({ ok: true, body: { cancel }, headers: new Headers({ 'content-length': '20', 'content-type': 'image/png' }) })
    await expect(liuShiXiaZaiYuanChengWenJian('https://example.com/a', '目标')).resolves.toMatchObject({ cheng_gong: false })
    expect(cancel).toHaveBeenCalled()
    临时目录 = await mkdtemp(join(tmpdir(), 'fp02-remote-'))
    const 目标 = join(临时目录, 'image.png')
    const 正常流 = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('12345')); controller.close() } })
    fetchMock.mockResolvedValueOnce({ ok: true, body: 正常流, headers: new Headers({ 'content-type': 'image/png; charset=utf-8' }) })
    await expect(liuShiXiaZaiYuanChengWenJian('https://example.com/a', 目标)).resolves.toMatchObject({ cheng_gong: true, zi_jie: 5, mime: 'image/png' })
    const 超限流 = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('12345678901')); controller.close() } })
    fetchMock.mockResolvedValueOnce({ ok: true, body: 超限流, headers: new Headers() })
    await expect(liuShiXiaZaiYuanChengWenJian('https://example.com/a', join(临时目录, 'too-large'))).resolves.toMatchObject({ cheng_gong: false })
    fetchMock.mockRejectedValueOnce(new Error('网络'))
    await expect(liuShiXiaZaiYuanChengWenJian('https://example.com/a', join(临时目录, 'network'))).resolves.toMatchObject({ cheng_gong: false })
  })
})
