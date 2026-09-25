import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  readFile: vi.fn(),
  query: vi.fn(),
  benDiLuJing: vi.fn(),
  debug: { warn: vi.fn(), error: vi.fn() },
}))

vi.mock('fs', () => ({ default: { promises: { readFile: 假.readFile } } }))
vi.mock('../../数据库', () => ({ 数据库: { query: 假.query } }))
vi.mock('../媒体存储', () => ({ huoQuBenDiLuJing: 假.benDiLuJing }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import { mianFeiZhuanXieYuYin, sheZhiYuYinZhuanXieMock } from '../语音转写'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('GUI_JI_LIU_DONG_API_MI_YAO', 'test-key')
  vi.stubEnv('GUI_JI_LIU_DONG_YU_YIN_MO_XING', 'whisper-test')
  vi.stubEnv('GUI_JI_LIU_DONG_JI_CHU_URL', 'http://127.0.0.1:9/v1/')
  假.query.mockResolvedValue({ rows: [{ SHA256: 'ABC', MIME: 'audio/webm' }] })
  假.benDiLuJing.mockReturnValue('C:/media/audio.webm')
  假.readFile.mockResolvedValue(Buffer.from('audio'))
  sheZhiYuYinZhuanXieMock(null)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  sheZhiYuYinZhuanXieMock(null)
  vi.restoreAllMocks()
})

describe('语音转写业务分支', () => {
  it('mock 成功、空白和异常均返回受控结果', async () => {
    const mock = vi.fn(async () => '  转写结果  ')
    sheZhiYuYinZhuanXieMock(mock)
    await expect(mianFeiZhuanXieYuYin({ meiTiId: '媒体' })).resolves.toBe('转写结果')
    expect(mock).toHaveBeenCalledWith({ meiTiId: '媒体' })
    sheZhiYuYinZhuanXieMock(async () => '   ')
    await expect(mianFeiZhuanXieYuYin({ meiTiId: '媒体' })).resolves.toBeNull()
    sheZhiYuYinZhuanXieMock(async () => { throw new Error('mock失败') })
    await expect(mianFeiZhuanXieYuYin({ meiTiId: '媒体' })).resolves.toBeNull()
  })

  it('真实转写覆盖输入、配置、数据库、文件和响应分支', async () => {
    await expect(mianFeiZhuanXieYuYin({ meiTiId: ' ' })).resolves.toBeNull()
    vi.stubEnv('GUI_JI_LIU_DONG_API_MI_YAO', '')
    await expect(mianFeiZhuanXieYuYin({ meiTiId: '媒体' })).resolves.toBeNull()
    vi.stubEnv('GUI_JI_LIU_DONG_API_MI_YAO', 'test-key')
    vi.stubEnv('GUI_JI_LIU_DONG_YU_YIN_MO_XING', '')
    await expect(mianFeiZhuanXieYuYin({ meiTiId: '媒体' })).resolves.toBeNull()
    vi.stubEnv('GUI_JI_LIU_DONG_YU_YIN_MO_XING', 'whisper-test')
    假.query.mockResolvedValueOnce({ rows: [] })
    await expect(mianFeiZhuanXieYuYin({ meiTiId: '媒体' })).resolves.toBeNull()
    假.query.mockRejectedValueOnce(new Error('db'))
    await expect(mianFeiZhuanXieYuYin({ meiTiId: '媒体' })).resolves.toBeNull()
    假.benDiLuJing.mockReturnValueOnce('')
    await expect(mianFeiZhuanXieYuYin({ meiTiId: '媒体' })).resolves.toBeNull()
    假.readFile.mockRejectedValueOnce(new Error('file'))
    await expect(mianFeiZhuanXieYuYin({ meiTiId: '媒体' })).resolves.toBeNull()
    假.readFile.mockResolvedValueOnce(Buffer.alloc(0))
    await expect(mianFeiZhuanXieYuYin({ meiTiId: '媒体' })).resolves.toBeNull()
  })

  it('上游响应覆盖 wen_ben、text、空字段、非成功和异常', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ wen_ben: ' 语音文字 ' }) })
    await expect(mianFeiZhuanXieYuYin({ meiTiId: '媒体' })).resolves.toBe('语音文字')
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ text: '备用文字' }) })
    await expect(mianFeiZhuanXieYuYin({ meiTiId: '媒体' })).resolves.toBe('备用文字')
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await expect(mianFeiZhuanXieYuYin({ meiTiId: '媒体' })).resolves.toBeNull()
    fetchMock.mockResolvedValueOnce({ ok: false })
    await expect(mianFeiZhuanXieYuYin({ meiTiId: '媒体' })).resolves.toBeNull()
    fetchMock.mockRejectedValueOnce(new Error('网络'))
    await expect(mianFeiZhuanXieYuYin({ meiTiId: '媒体' })).resolves.toBeNull()
    for (const mime of ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm']) {
      假.query.mockResolvedValueOnce({ rows: [{ SHA256: 'hash', MIME: mime }] })
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ text: mime }) })
      await expect(mianFeiZhuanXieYuYin({ meiTiId: `媒体-${mime}` })).resolves.toBe(mime)
    }
  })
})
