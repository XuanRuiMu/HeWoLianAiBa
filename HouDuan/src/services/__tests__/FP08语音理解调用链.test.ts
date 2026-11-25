import { beforeEach, describe, expect, it, vi } from 'vitest'

const { 查询, zhiJieDiaoYong } = vi.hoisted(() => ({
  查询: vi.fn<(sql: string, canShu?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number }>>(
    async () => ({ rows: [], rowCount: 0 }),
  ),
  zhiJieDiaoYong: vi.fn<(canShu: { sha256: string; mime: string }) => Promise<string | null>>(async () => null),
}))

vi.mock('../../数据库', () => ({
  数据库: { query: 查询 },
}))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('../语音理解调用', () => ({
  huoQuYinPinShiJianMiaoShuZhiJie: zhiJieDiaoYong,
}))

import { buQiYinPinShiJianMiaoShu, huoQuYinPinShiJianMiaoShu, sheZhiYuYinLiJieMock } from '../语音理解'

const sha256 = 'a'.repeat(64)

describe('FP8 语音理解调用链（死桩替换后）', () => {
  beforeEach(() => {
    查询.mockClear().mockResolvedValue({ rows: [], rowCount: 0 })
    zhiJieDiaoYong.mockClear().mockResolvedValue(null)
    sheZhiYuYinLiJieMock(null)
  })

  it('合法音频输入走真实调用链并透传描述', async () => {
    zhiJieDiaoYong.mockResolvedValueOnce('一个在唱歌')
    expect(await huoQuYinPinShiJianMiaoShu({ sha256, mime: 'audio/webm' })).toBe('一个在唱歌')
    expect(zhiJieDiaoYong).toHaveBeenCalledWith({ sha256, mime: 'audio/webm' })
  })

  it('调用链抛错时吞掉异常返回 null，不阻断聊天', async () => {
    zhiJieDiaoYong.mockRejectedValueOnce(new Error('上游挂了'))
    expect(await huoQuYinPinShiJianMiaoShu({ sha256, mime: 'audio/webm' })).toBeNull()
  })

  it('非法sha256或非音频mime不进入调用链', async () => {
    expect(await huoQuYinPinShiJianMiaoShu({ sha256: 'duan', mime: 'audio/webm' })).toBeNull()
    expect(await huoQuYinPinShiJianMiaoShu({ sha256, mime: 'video/mp4' })).toBeNull()
    expect(zhiJieDiaoYong).not.toHaveBeenCalled()
  })

  it('mock钩子仍可用且优先于真实调用链，mock抛错也降级为null', async () => {
    sheZhiYuYinLiJieMock(async () => 'mock描述')
    expect(await huoQuYinPinShiJianMiaoShu({ sha256, mime: 'audio/webm' })).toBe('mock描述')
    expect(zhiJieDiaoYong).not.toHaveBeenCalled()
    sheZhiYuYinLiJieMock(async () => {
      throw new Error('mock炸了')
    })
    expect(await huoQuYinPinShiJianMiaoShu({ sha256, mime: 'audio/webm' })).toBeNull()
  })

  it('buQiYinPinShiJianMiaoShu：非语音消息不查库直接返回null', async () => {
    expect(await buQiYinPinShiJianMiaoShu({ lei_xing: 'wenBen', mei_ti_id: 'm-1' })).toBeNull()
    expect(查询).not.toHaveBeenCalled()
  })

  it('buQiYinPinShiJianMiaoShu：语音消息查媒体表后按sha256+mime取描述', async () => {
    查询.mockResolvedValueOnce({ rows: [{ SHA256: sha256.toUpperCase(), MIME: 'audio/webm;codecs=opus' }], rowCount: 1 })
    zhiJieDiaoYong.mockResolvedValueOnce('描述内容')
    expect(await buQiYinPinShiJianMiaoShu({ lei_xing: 'yuYin', mei_ti_id: 'm-1' })).toBe('描述内容')
    const sql = String(查询.mock.calls[0][0])
    expect(sql).toContain('媒体文件')
    expect(查询.mock.calls[0][1]).toEqual(['m-1'])
    expect(zhiJieDiaoYong).toHaveBeenCalledWith({ sha256, mime: 'audio/webm;codecs=opus' })
  })

  it('buQiYinPinShiJianMiaoShu：查库失败或媒体不存在时返回null不抛错', async () => {
    查询.mockRejectedValueOnce(new Error('库挂了'))
    expect(await buQiYinPinShiJianMiaoShu({ lei_xing: 'yuYin', mei_ti_id: 'm-1' })).toBeNull()
    查询.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    expect(await buQiYinPinShiJianMiaoShu({ lei_xing: 'yuYin', mei_ti_id: 'm-1' })).toBeNull()
    expect(await buQiYinPinShiJianMiaoShu({ lei_xing: 'yuYin', mei_ti_id: '' })).toBeNull()
  })
})
