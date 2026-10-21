import { beforeEach, describe, expect, it, vi } from 'vitest'

const 查询 = vi.fn(async () => ({ rows: [], rowCount: 0 }))

vi.mock('../../数据库', () => ({
  数据库: { query: (...canShu: unknown[]) => 查询(...canShu) },
}))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))
vi.mock('../../config/多模态配置', () => ({
  huoQuDuoMoTaiPeiZhi: () => ({ guiJiLiuDongYuYinMoXing: 'm', guiJiLiuDongJiChuUrl: 'u', qingQiuChaoShiHaoMiao: 1 }),
  huoQuGuiJiLiuDongMiYao: () => 'k',
}))
vi.mock('../媒体存储', () => ({ huoQuBenDiLuJing: () => null }))

import { buQiYuYinZhuanXie, sheZhiYuYinZhuanXieMock } from '../语音转写'

const 语音消息 = { lei_xing: 'yuYin', nei_rong: '', mei_ti_id: 'm-1' }

describe('语音消息在触发AI前补转写', () => {
  beforeEach(() => {
    查询.mockClear()
    sheZhiYuYinZhuanXieMock(null)
  })

  it('转写成功后把文字带进消息，并回写数据库', async () => {
    sheZhiYuYinZhuanXieMock(async () => '今天下午有空吗')
    const jieGuo = await buQiYuYinZhuanXie(语音消息)
    expect(jieGuo.nei_rong).toBe('今天下午有空吗')
    expect(查询).toHaveBeenCalledTimes(1)
    const sql = String(查询.mock.calls[0][0])
    expect(sql).toContain('UPDATE')
    expect(sql).toContain('yuYin')
  })

  it('非语音消息原样返回，不做任何数据库操作', async () => {
    const jieGuo = await buQiYuYinZhuanXie({ lei_xing: 'wenben', nei_rong: '在吗', mei_ti_id: null })
    expect(jieGuo.nei_rong).toBe('在吗')
    expect(查询).not.toHaveBeenCalled()
  })

  it('已经有内容的语音不重复转写', async () => {
    const 转写 = vi.fn(async () => '不该被调用')
    sheZhiYuYinZhuanXieMock(转写)
    const jieGuo = await buQiYuYinZhuanXie({ ...语音消息, nei_rong: '已经转过' })
    expect(jieGuo.nei_rong).toBe('已经转过')
    expect(转写).not.toHaveBeenCalled()
  })

  it('没有媒体ID时原样返回', async () => {
    const jieGuo = await buQiYuYinZhuanXie({ ...语音消息, mei_ti_id: null })
    expect(jieGuo.nei_rong).toBe('')
    expect(查询).not.toHaveBeenCalled()
  })

  it('转写返回空（纯伴奏、无人声）时原样返回，不让流程崩', async () => {
    sheZhiYuYinZhuanXieMock(async () => null)
    const jieGuo = await buQiYuYinZhuanXie(语音消息)
    expect(jieGuo.nei_rong).toBe('')
    expect(查询).not.toHaveBeenCalled()
  })

  it('转写抛错时吞掉异常，消息原样交给后续流程', async () => {
    sheZhiYuYinZhuanXieMock(async () => {
      throw new Error('网络断了')
    })
    const jieGuo = await buQiYuYinZhuanXie(语音消息)
    expect(jieGuo.nei_rong).toBe('')
  })

  it('回写数据库失败也要把转写文字交给AI', async () => {
    sheZhiYuYinZhuanXieMock(async () => '晚上一起吃饭')
    查询.mockRejectedValueOnce(new Error('数据库挂了'))
    const jieGuo = await buQiYuYinZhuanXie(语音消息)
    expect(jieGuo.nei_rong).toBe('晚上一起吃饭')
  })

  it('转写文本前后空白会被清掉', async () => {
    sheZhiYuYinZhuanXieMock(async () => '  你睡了吗  ')
    const jieGuo = await buQiYuYinZhuanXie(语音消息)
    expect(jieGuo.nei_rong).toBe('你睡了吗')
  })
})
