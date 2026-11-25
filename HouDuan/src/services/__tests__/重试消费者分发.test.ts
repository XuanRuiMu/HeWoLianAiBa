import { describe, expect, it, vi, beforeEach } from 'vitest'

const chaXunMock = vi.hoisted(() => vi.fn())
const shengChengTouXiangMock = vi.hoisted(() => vi.fn())
const redisMock = vi.hoisted(() => ({
  get: vi.fn(async () => null),
  set: vi.fn(async () => 'OK'),
  del: vi.fn(async () => 1),
  incr: vi.fn(async () => 1),
  expire: vi.fn(async () => 1),
  lpush: vi.fn(async () => 1),
  ltrim: vi.fn(async () => 'OK'),
  lrange: vi.fn(async () => []),
  rpop: vi.fn(async (_jian?: unknown): Promise<string | null> => null),
  pexpire: vi.fn(async () => 1),
  llen: vi.fn(async () => 0),
}))

vi.mock('../../redis', () => ({
  redis: redisMock,
  daiRongDuanZhiXing: vi.fn(async (_mingCheng: string, dongZuo: () => Promise<unknown>) => dongZuo()),
  redisRongDuanShiFouKaiLu: vi.fn(() => false),
  dengDaiRedisJiuXu: vi.fn(async () => undefined),
  tanCeRedisJiuXu: vi.fn(async () => true),
  biaoJiRedisYiTanCeShiBai: vi.fn(),
  gouJianRedisLianJiePeiZhi: vi.fn(() => ({ host: '127.0.0.1', port: 6379 })),
}))

vi.mock('../../数据库', () => ({
  数据库: { query: (...c: unknown[]) => chaXunMock(...c) },
}))

vi.mock('../头像生成', () => ({
  生成角色头像: (...c: unknown[]) => shengChengTouXiangMock(...c),
}))

import { chuLiYiXiang, xiaoFeiDuiLieJian } from '../重试消费者'

describe('重试消费者按队列类型分发', () => {
  beforeEach(() => {
    chaXunMock.mockReset()
    shengChengTouXiangMock.mockReset()
    redisMock.rpop.mockReset()
    redisMock.rpop.mockResolvedValue(null)
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

  it('昨日队列键内的滞留项也能被消费', async () => {
    const zuoRiJian = `ai_zhong_shi_dui_lie:${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}`
    expect(zuoRiJian).toMatch(/^ai_zhong_shi_dui_lie:\d{4}-\d{2}-\d{2}$/)
    let ciShu = 0
    redisMock.rpop.mockImplementation(async (jian: unknown) => {
      if (String(jian) !== zuoRiJian) return null
      ciShu += 1
      return ciShu === 1 ? JSON.stringify({ leiXing: 'touXiangShengCheng', yuanYin: 'j-1' }) : null
    })
    chaXunMock.mockResolvedValue({
      rows: [{ 用户ID: 'u-1', 年龄: 22, 性别: 'nv', MBTI: 'INFP', 性格: '安静', 预设类型: '大学生', 外貌: '长发', 爱好: ['阅读'] }],
      rowCount: 1,
    })
    shengChengTouXiangMock.mockResolvedValue({ chengGong: true })

    await xiaoFeiDuiLieJian(zuoRiJian)

    expect(redisMock.rpop).toHaveBeenCalledWith(zuoRiJian)
    expect(shengChengTouXiangMock).toHaveBeenCalledTimes(1)
    expect(shengChengTouXiangMock.mock.calls[0][0]).toEqual(expect.objectContaining({ jiaoSeId: 'j-1' }))
  })

  it('消费昨日键遇到空队列时安全结束', async () => {
    await expect(xiaoFeiDuiLieJian('ai_zhong_shi_dui_lie:2026-01-01')).resolves.toBeUndefined()
    expect(shengChengTouXiangMock).not.toHaveBeenCalled()
  })
})
