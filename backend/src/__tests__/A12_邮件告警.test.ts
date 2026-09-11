import { describe, it, expect, afterAll, vi } from 'vitest'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { peiZhi } from '../config'
import {
  faSongGaoJing,
  sheZhiGaoJingCeShiGouZi,
  chongZhiGaoJingLengQue,
  jiLuAIChengGong,
  jiLuAIShiBai,
} from '../utils/邮件告警'

describe('A12 邮件告警通道', () => {
  const yuanShouJianRen = peiZhi.gaoJing.shouJianRenLieBiao

  afterAll(async () => {
    sheZhiGaoJingCeShiGouZi(null)
    chongZhiGaoJingLengQue()
    ;(peiZhi.gaoJing as { shouJianRenLieBiao: string[] }).shouJianRenLieBiao = yuanShouJianRen
    vi.restoreAllMocks()
    await 数据库.end()
    await redis.quit()
  })

  it('未配置收件人时降级为日志且不抛错', async () => {
    ;(peiZhi.gaoJing as { shouJianRenLieBiao: string[] }).shouJianRenLieBiao = []
    sheZhiGaoJingCeShiGouZi(null)
    chongZhiGaoJingLengQue()
    const jieGuo = await faSongGaoJing('wei_pei_zhi', '测试告警', '内容')
    expect(jieGuo).toBe(false)
  })

  it('配置后发送成功；冷却窗口内不重复发送', async () => {
    ;(peiZhi.gaoJing as { shouJianRenLieBiao: string[] }).shouJianRenLieBiao = ['ops@example.com']
    const yiFaSongLieBiao: Array<{ biao_ti: string; nei_rong: string }> = []
    sheZhiGaoJingCeShiGouZi(async (youJian) => {
      yiFaSongLieBiao.push(youJian)
      return true
    })
    chongZhiGaoJingLengQue()

    expect(await faSongGaoJing('jian1', '第一次告警', 'A')).toBe(true)
    expect(await faSongGaoJing('jian1', '第二次告警', 'B')).toBe(false)
    expect(yiFaSongLieBiao).toHaveLength(1)
    expect(yiFaSongLieBiao[0].biao_ti).toBe('第一次告警')

    // 不同告警键互不影响冷却
    expect(await faSongGaoJing('jian2', '另一类告警', 'C')).toBe(true)
    expect(yiFaSongLieBiao).toHaveLength(2)

    // 清空冷却后同键可再次发送
    chongZhiGaoJingLengQue()
    expect(await faSongGaoJing('jian1', '第三次告警', 'D')).toBe(true)
    expect(yiFaSongLieBiao).toHaveLength(3)
  })

  it('发送失败返回false且不抛错', async () => {
    ;(peiZhi.gaoJing as { shouJianRenLieBiao: string[] }).shouJianRenLieBiao = ['ops@example.com']
    sheZhiGaoJingCeShiGouZi(async () => {
      throw new Error('smtp down')
    })
    chongZhiGaoJingLengQue()
    const jieGuo = await faSongGaoJing('shi_bai_jian', '失败场景', 'x')
    expect(jieGuo).toBe(false)
  })

  it('连续AI失败达阈值触发一次告警，成功后重置', async () => {
    const yuanYuZhi = peiZhi.aiLianXuShiBaiGaoJingYuZhi
    ;(peiZhi as { aiLianXuShiBaiGaoJingYuZhi: number }).aiLianXuShiBaiGaoJingYuZhi = 3
    ;(peiZhi.gaoJing as { shouJianRenLieBiao: string[] }).shouJianRenLieBiao = ['ops@example.com']
    const yiFaSongLieBiao: Array<{ biao_ti: string }> = []
    sheZhiGaoJingCeShiGouZi(async (youJian) => {
      yiFaSongLieBiao.push({ biao_ti: youJian.biao_ti })
      return true
    })
    chongZhiGaoJingLengQue()
    try {
      await jiLuAIShiBai('err-1')
      await jiLuAIShiBai('err-2')
      expect(yiFaSongLieBiao).toHaveLength(0)
      await jiLuAIShiBai('err-3')
      expect(yiFaSongLieBiao).toHaveLength(1)
      expect(yiFaSongLieBiao[0].biao_ti).toContain('连续失败')

      // 冷却窗口内继续失败不再发
      await jiLuAIShiBai('err-4')
      await jiLuAIShiBai('err-5')
      await jiLuAIShiBai('err-6')
      expect(yiFaSongLieBiao).toHaveLength(1)

      // 成功后计数重置：重新累计到阈值才会再次触发（清冷却后）
      jiLuAIChengGong()
      chongZhiGaoJingLengQue()
      await jiLuAIShiBai('e1')
      await jiLuAIShiBai('e2')
      expect(yiFaSongLieBiao).toHaveLength(1)
    } finally {
      ;(peiZhi as { aiLianXuShiBaiGaoJingYuZhi: number }).aiLianXuShiBaiGaoJingYuZhi = yuanYuZhi
      jiLuAIChengGong()
    }
  })
})
