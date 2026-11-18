import { describe, expect, it, vi, beforeEach } from 'vitest'

const chaXunMock = vi.hoisted(() => vi.fn())
vi.mock('../../数据库', () => ({
  数据库: { query: (...c: unknown[]) => chaXunMock(...c) },
}))

import { huiXiangLiShiYuanWen } from '../历史回想'

describe('历史回想', () => {
  beforeEach(() => {
    chaXunMock.mockReset()
  })

  it('命中时返回去重后的原文片段', async () => {
    chaXunMock.mockResolvedValue({
      rows: [
        { 内容: '我最喜欢吃的火锅是麻辣锅底', 创建时间: '2026-11-01' },
        { 内容: '我最喜欢吃的火锅是麻辣锅底', 创建时间: '2026-11-02' },
        { 内容: '上次你说想学做菜', 创建时间: '2026-11-03' },
      ],
    })
    const jieGuo = await huiXiangLiShiYuanWen('u-1', 'j-1', '之前听你说喜欢吃火锅')
    expect(jieGuo.zhaoDao).toBe(true)
    expect(jieGuo.yuanWen).toHaveLength(2)
  })

  it('查无时返回 buZu=true，让 AI 照实说没印象', async () => {
    chaXunMock.mockResolvedValue({ rows: [] })
    const jieGuo = await huiXiangLiShiYuanWen('u-1', 'j-1', '之前听你说去过月球')
    expect(jieGuo.zhaoDao).toBe(false)
    expect(jieGuo.buZu).toBe(true)
  })

  it('数据库异常时按查无处理，不抛错', async () => {
    chaXunMock.mockRejectedValue(new Error('db down'))
    const jieGuo = await huiXiangLiShiYuanWen('u-1', 'j-1', '之前听你说喜欢火锅')
    expect(jieGuo.zhaoDao).toBe(false)
    expect(jieGuo.buZu).toBe(true)
  })
})
