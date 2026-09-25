import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({ redis: { lpush: vi.fn(), ltrim: vi.fn(), pexpire: vi.fn(), llen: vi.fn() }, debug: { error: vi.fn() } }))
vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import { duQuZhongShiDuiLieChangDu, paiRuZhongShiDuiLie } from '../重试队列'

beforeEach(() => {
  vi.clearAllMocks()
  假.redis.lpush.mockResolvedValue(1)
  假.redis.ltrim.mockResolvedValue('OK')
  假.redis.pexpire.mockResolvedValue(1)
  假.redis.llen.mockResolvedValue(2)
})

describe('重试队列业务分支', () => {
  it('入队写入日期键并限制长度，Redis 异常不外抛', async () => {
    await paiRuZhongShiDuiLie({ leiXing: 'haoGanDuPingPan', yuanYin: '解析失败' })
    expect(假.redis.lpush).toHaveBeenCalledWith(expect.stringContaining('ai_zhong_shi_dui_lie:'), expect.any(String))
    假.redis.lpush.mockRejectedValueOnce(new Error('redis'))
    await expect(paiRuZhongShiDuiLie({ leiXing: 'director', yuanYin: '失败' })).resolves.toBeUndefined()
    expect(假.debug.error).toHaveBeenCalled()
  })

  it('读取长度覆盖指定日期、默认日期和异常', async () => {
    await expect(duQuZhongShiDuiLieChangDu('2026-01-01')).resolves.toBe(2)
    await expect(duQuZhongShiDuiLieChangDu()).resolves.toBe(2)
    假.redis.llen.mockRejectedValueOnce(new Error('redis'))
    await expect(duQuZhongShiDuiLieChangDu()).resolves.toBe(0)
  })
})
