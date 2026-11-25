import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'

const chaXunMock = vi.hoisted(() => vi.fn())
vi.mock('../../数据库', () => ({
  数据库: { query: (...c: unknown[]) => chaXunMock(...c) },
}))

import { huoQuYongHuHuoDongFenBu, caiYangHuoDongShiKe } from '../主动关怀时段'

describe('主动关怀时段', () => {
  beforeEach(() => chaXunMock.mockReset())
  afterEach(() => vi.restoreAllMocks())

  it('按历史消息小时分布返回权重', async () => {
    chaXunMock.mockResolvedValue({
      rows: [
        { xiao_shi: 12, shu: 5 },
        { xiao_shi: 18, shu: 2 },
      ],
    })
    const fenBu = await huoQuYongHuHuoDongFenBu('u-1', 'j-1')
    expect(fenBu).toEqual([{ xiaoShi: 12, quanZhong: 5 }, { xiaoShi: 18, quanZhong: 2 }])
  })

  it('按用户时区用 AT TIME ZONE 采样历史小时', async () => {
    chaXunMock.mockResolvedValue({
      rows: [
        { xiao_shi: 12, shu: 5 },
        { xiao_shi: 18, shu: 2 },
      ],
    })
    const fenBu = await huoQuYongHuHuoDongFenBu('u-1', 'j-1', 'America/New_York')
    expect(fenBu).toEqual([{ xiaoShi: 12, quanZhong: 5 }, { xiaoShi: 18, quanZhong: 2 }])
    const tiaoYong = chaXunMock.mock.calls[0]
    expect(String(tiaoYong[0])).toContain('AT TIME ZONE $3')
    expect(tiaoYong[1]).toEqual(['u-1', 'j-1', 'America/New_York'])
  })

  it('无历史时使用默认时段', async () => {
    chaXunMock.mockResolvedValue({ rows: [] })
    const fenBu = await huoQuYongHuHuoDongFenBu('u-1', 'j-1')
    expect(fenBu.length).toBeGreaterThan(0)
  })

  it('采样结果落在 48 小时窗口内且避开凌晨', () => {
    const now = new Date('2026-11-18T20:00:00')
    const fenBu = [{ xiaoShi: 12, quanZhong: 5 }, { xiaoShi: 3, quanZhong: 9 }]
    for (let i = 0; i < 30; i++) {
      const ke = caiYangHuoDongShiKe(fenBu, now)
      expect(ke).not.toBeNull()
      const cha = ke!.getTime() - now.getTime()
      expect(cha).toBeGreaterThan(0)
      expect(cha).toBeLessThanOrEqual(48 * 3600 * 1000)
      expect(ke!.getHours()).toBeGreaterThanOrEqual(8)
    }
  })

  it('传入用户时区时采样时刻落在该时区的活跃小时', () => {
    const now = new Date('2026-11-18T20:00:00Z')
    const fenBu = [{ xiaoShi: 12, quanZhong: 5 }, { xiaoShi: 21, quanZhong: 5 }]
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)
    const ke = caiYangHuoDongShiKe(fenBu, now, 'America/New_York')
    expect(ke).not.toBeNull()
    expect(ke!.toISOString().startsWith('2026-11-19T02:')).toBe(true)
    const cha = ke!.getTime() - now.getTime()
    expect(cha).toBeGreaterThan(0)
    expect(cha).toBeLessThanOrEqual(48 * 3600 * 1000)
  })
})
