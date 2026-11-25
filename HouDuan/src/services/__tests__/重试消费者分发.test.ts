import { describe, expect, it, vi, beforeEach } from 'vitest'

const chaXunMock = vi.hoisted(() => vi.fn())
const shengChengTouXiangMock = vi.hoisted(() => vi.fn())

vi.mock('../../redis', () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    lpush: vi.fn(async () => 1),
    ltrim: vi.fn(async () => 'OK'),
    lrange: vi.fn(async () => []),
    rpop: vi.fn(async () => null),
    pexpire: vi.fn(async () => 1),
    llen: vi.fn(async () => 0),
  },
}))

vi.mock('../../数据库', () => ({
  数据库: { query: (...c: unknown[]) => chaXunMock(...c) },
}))

vi.mock('../头像生成', () => ({
  生成角色头像: (...c: unknown[]) => shengChengTouXiangMock(...c),
}))

import { chuLiYiXiang } from '../重试消费者'

describe('重试消费者按队列类型分发', () => {
  beforeEach(() => {
    chaXunMock.mockReset()
    shengChengTouXiangMock.mockReset()
  })

  it('touXiangShengCheng 项触发头像补生成（入队与消费类型一致）', async () => {
    chaXunMock.mockResolvedValue({
      rows: [{ 用户ID: 'u-1', 年龄: 22, 性别: 'nv', MBTI: 'INFP', 性格: '安静', 预设类型: '大学生', 外貌: '长发', 爱好: ['阅读'] }],
      rowCount: 1,
    })
    shengChengTouXiangMock.mockResolvedValue({ chengGong: true })
    await chuLiYiXiang({ leiXing: 'touXiangShengCheng', yuanYin: 'j-1' })
    expect(shengChengTouXiangMock).toHaveBeenCalledTimes(1)
    const canShu = shengChengTouXiangMock.mock.calls[0][0] as { 用户ID: string; jiaoSeId: string }
    expect(canShu.用户ID).toBe('u-1')
    expect(canShu.jiaoSeId).toBe('j-1')
  })

  it('角色不存在时跳过且不抛错', async () => {
    chaXunMock.mockResolvedValue({ rows: [], rowCount: 0 })
    await expect(chuLiYiXiang({ leiXing: 'touXiangShengCheng', yuanYin: 'j-bad' })).resolves.toBeUndefined()
    expect(shengChengTouXiangMock).not.toHaveBeenCalled()
  })

  it('其他类型（DaoYan/quAiWeiChouJian/HaoGanDuPingPan）只记录不触发补生成', async () => {
    for (const leiXing of ['DaoYan', 'quAiWeiChouJian', 'HaoGanDuPingPan']) {
      await chuLiYiXiang({ leiXing, yuanYin: 'x' })
    }
    expect(shengChengTouXiangMock).not.toHaveBeenCalled()
  })

  it('旧的中文类型「头像生成」不再是消费入口（历史断链类型已废弃）', async () => {
    await chuLiYiXiang({ leiXing: '头像生成', yuanYin: 'j-1' })
    expect(shengChengTouXiangMock).not.toHaveBeenCalled()
  })
})
