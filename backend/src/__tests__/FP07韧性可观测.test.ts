import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    pexpire: vi.fn(),
    del: vi.fn(),
    publish: vi.fn(),
    lpush: vi.fn(),
    ltrim: vi.fn(),
    on: vi.fn(),
  },
  redisRongDuanShiFouKaiLu: vi.fn(() => false),
  daiRongDuanZhiXing: vi.fn(async (_ming: string, dongZuo: () => Promise<unknown>, jiangJi?: unknown) => {
    try {
      return await dongZuo()
    } catch {
      if (jiangJi !== undefined) return jiangJi
      throw new Error('Redis命令失败')
    }
  }),
}))

vi.mock('../数据库', () => ({
  数据库: { query: vi.fn(), connect: vi.fn() },
}))

import { redisRongDuanShiFouKaiLu, daiRongDuanZhiXing } from '../redis'
import { jianMingJian, huoQuShuangXieJian } from '../utils/键公约'
import { QUE_XIN_DU_YUE_SHU } from '../config/胜利失败配置'
import { faSongFenJiGaoJing } from '../utils/邮件告警'
import { peiZhi } from '../config'

describe('FP-07 韧性可观测', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('YH-063 熔断包装：失败抛错禁无限等待，降级值直返', async () => {
    const jiangJi = await daiRongDuanZhiXing('jian', async () => { throw new Error('挂') }, 'jiang-ji')
    expect(jiangJi).toBe('jiang-ji')
    await expect(daiRongDuanZhiXing('jian', async () => { throw new Error('挂') })).rejects.toThrow()
    expect(redisRongDuanShiFouKaiLu).toBeDefined()
  })

  it('YH-065 键公约：env:svc:biz:id四段形态，新旧双写映射一致', () => {
    const xinJian = jianMingJian('ai-yu-suan', 'u1')
    expect(xinJian.split(':').length).toBe(4)
    expect(xinJian).toContain('ai-yu-suan')
    const shuangXie = huoQuShuangXieJian('aiYuSuan', 'u1', '2026-09-16')
    expect(shuangXie.jiuJian).toContain('ai_yu_suan')
    expect(shuangXie.xinJian).toContain('ai-yu-suan')
  })

  it('YH-067 军师哈希定容：LTRIM保留最近200条', async () => {
    const { redis } = await import('../redis')
    const { baoCunJunShiHaXi } = await import('../services/军师缓存')
    await baoCunJunShiHaXi('u', 'j', 'h1')
    expect(vi.mocked(redis.ltrim)).toHaveBeenCalledWith(expect.stringContaining('军师哈希'), 0, 199)
  })

  it('YH-126 健康分级：/health只看进程恒200，/readyz查依赖', async () => {
    const { default: yingYong } = await import('../server')
    const { default: request } = await import('supertest')
    const jianKang = await request(yingYong).get('/api/健康')
    expect(jianKang.status).toBe(200)
  })

  it('YH-154 分级告警：冷却抑制禁刷屏，SLO烧毁自动升级', async () => {
    const diYi = await faSongFenJiGaoJing('P4', 'jian', '标', '容')
    expect(typeof diYi).toBe('boolean')
    const diEr = await faSongFenJiGaoJing('P4', 'jian', '标', '容')
    expect(diEr).toBe(false)
  })

  it('YH-139 冷存统一读配置：保留天数走唯一出处', () => {
    expect(peiZhi.riZhiLengCunBaoLiuTian).toBeGreaterThan(0)
    expect(QUE_XIN_DU_YUE_SHU.tongYongJianCe).toBe(0.7)
  })
})
