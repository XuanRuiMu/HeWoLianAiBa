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

  it('命中时返回去掉重复的原文片段并保留发送者与撤回标记', async () => {
    chaXunMock.mockResolvedValue({
      rows: [
        { ID: 'a', 发送者: 'yonghu', 创建时间: '2026-11-01T10:00:00Z', 已撤回: false, 回想文本: '我最喜欢吃的火锅是麻辣锅底' },
        { ID: 'b', 发送者: 'yonghu', 创建时间: '2026-11-02T10:00:00Z', 已撤回: false, 回想文本: '我最喜欢吃的火锅是麻辣锅底' },
        { ID: 'c', 发送者: 'jiaose', 创建时间: '2026-11-03T10:00:00Z', 已撤回: true, 回想文本: '上次你说想学做菜' },
      ],
    })
    const jieGuo = await huiXiangLiShiYuanWen('u-1', 'j-1', '之前听你说喜欢吃火锅')
    expect(jieGuo.zhaoDao).toBe(true)
    expect(jieGuo.yuanWen).toHaveLength(2)
    const wenBen = jieGuo.yuanWen.join('\n')
    expect(wenBen).toContain('TA: 我最喜欢吃的火锅是麻辣锅底')
    expect(wenBen).toContain('你（已撤回）: 上次你说想学做菜')
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

  it('空查询或缺ID不进入数据库', async () => {
    expect((await huiXiangLiShiYuanWen('', 'j-1', '搜')).zhaoDao).toBe(false)
    expect((await huiXiangLiShiYuanWen('u-1', '', '搜')).zhaoDao).toBe(false)
    expect((await huiXiangLiShiYuanWen('u-1', 'j-1', '   ')).zhaoDao).toBe(false)
    expect(chaXunMock).not.toHaveBeenCalled()
  })
})
