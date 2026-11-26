import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { AI配置 } from '../../config/AI配置'

const chaXunMock = vi.hoisted(() => vi.fn())
const moXingMock = vi.hoisted(() => vi.fn())
const redisSetMock = vi.hoisted(() => vi.fn(async () => 'OK' as const))
const redisDelMock = vi.hoisted(() => vi.fn(async () => 1 as const))

vi.mock('../../数据库', () => ({
  数据库: { query: (...c: unknown[]) => chaXunMock(...c) },
}))
vi.mock('../../redis', () => ({
  redis: { set: redisSetMock, del: redisDelMock },
}))
vi.mock('../../utils/通用模型调用', () => ({ 按配置调用: moXingMock }))

import { huiXiangLiShiYuanWen, gouZaoHuiXiangChaXun } from '../历史回想'
import { shengChengBingLuoKuZhaiYao, duQuTongBuZhaiYao } from '../对话摘要'

const YongHu = 'u-fpf'
const JiaoSe = 'j-fpf'

beforeEach(() => {
  chaXunMock.mockReset()
  moXingMock.mockReset()
  redisSetMock.mockClear()
  redisDelMock.mockClear()
  redisSetMock.mockResolvedValue('OK')
})

afterEach(() => {
  chaXunMock.mockReset()
  moXingMock.mockReset()
})

describe('回想检索语句的硬约束', () => {
  it('语句含用户+角色隔离，参数化，不把已撤回硬编码为false，不含字面量 5000', () => {
    const { yuJu, canShu } = gouZaoHuiXiangChaXun(YongHu, JiaoSe, ['周五', '海边'])
    expect(yuJu).toContain('"用户ID" = $1')
    expect(yuJu).toContain('"角色ID" = $2')
    expect(canShu[0]).toBe(YongHu)
    expect(canShu[1]).toBe(JiaoSe)
    expect(yuJu).not.toMatch(/已撤回\s*=\s*false/i)
    expect(yuJu).not.toMatch(/LIMIT\s+5000\b/i)
  })

  it('关键词超过配置上限会被裁剪，预算不随输入膨胀', () => {
    const ciZu = Array.from({ length: 100 }, (_, i) => `词${i}`)
    const { canShu } = gouZaoHuiXiangChaXun(YongHu, JiaoSe, ciZu)
    expect(canShu.length).toBeLessThanOrEqual(2 + AI配置.huiXiang.zuiDaCiShu + 5)
  })

  it('空关键词不生成 ILIKE 条件，仍然参数化并附带配额参数', () => {
    const { yuJu, canShu } = gouZaoHuiXiangChaXun(YongHu, JiaoSe, [])
    expect(yuJu).not.toMatch(/ILIKE/i)
    expect(canShu[0]).toBe(YongHu)
    expect(canShu[1]).toBe(JiaoSe)
  })
})

describe('撤回原文只在内部链路透出为带标记片段', () => {
  it('双方原文带TA/你前缀，撤回行带（已撤回）标记且不丢失原文', async () => {
    chaXunMock.mockResolvedValue({
      rows: [
        { ID: 'm-1', 发送者: 'yonghu', 创建时间: new Date('2026-10-01T10:00:00Z'), 已撤回: false, 回想文本: '我们约好的那个周五去的地方是海边' },
        { ID: 'm-2', 发送者: 'jiaose', 创建时间: new Date('2026-10-01T10:01:00Z'), 已撤回: true, 回想文本: '对，就是那个周五的海边（撤回前）' },
      ],
    })

    const jieGuo = await huiXiangLiShiYuanWen(YongHu, JiaoSe, '我们约好的那个周五去的地方')
    expect(jieGuo.zhaoDao).toBe(true)
    expect(jieGuo.duanLuo).toHaveLength(2)
    expect(jieGuo.duanLuo![0].已撤回).toBe(false)
    expect(jieGuo.duanLuo![1].已撤回).toBe(true)
    const wenBen = jieGuo.yuanWen.join('\n')
    expect(wenBen).toContain('TA: 我们约好的那个周五去的地方是海边')
    expect(wenBen).toContain('你（已撤回）: 对，就是那个周五的海边（撤回前）')
  })
})

describe('主聊天窗口：最近原文窗口由token驱动而非条数，>5000条短消息不被截断', () => {
  it('生成摘要时查询语句按用户+角色+锚点+类型过滤，无LIMIT字面量', async () => {
    const yuanZhi = AI配置.zhaiYao.zuiJinYuanWenToken
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = 0
    try {
      chaXunMock
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ dai_shu: 2 }] })
        .mockResolvedValueOnce({ rows: [{ zi_fu_shu: Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6) }] })
        .mockResolvedValueOnce({
          rows: [
            { 内容: '早', 发送者: 'yonghu', 创建时间: new Date('2026-11-20T10:00:00Z'), 客户端序号: 1, ID: 'm-1' },
            { 内容: '晚', 发送者: 'jiaose', 创建时间: new Date('2026-11-20T10:01:00Z'), 客户端序号: 2, ID: 'm-2' },
          ],
        })
      moXingMock.mockResolvedValueOnce({ neiRong: '新记忆' })
      chaXunMock.mockResolvedValueOnce({ rows: [] })

      const jieGuo = await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')
      expect(jieGuo).toBe(true)
      const liaoSql = String(chaXunMock.mock.calls[3][0])
      expect(liaoSql).not.toMatch(/LIMIT\s+\d+/i)
      expect(liaoSql).toContain('"用户ID" = $1')
      expect(liaoSql).toContain('"角色ID" = $2')
      expect(liaoSql).toContain('创建时间" >= $3')
    } finally {
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = yuanZhi
    }
  })

  it('长候选列表下保留窗口只取最近约 zuiJinYuanWenToken 的原文，更早的进入摘要', async () => {
    const yuanZhi = AI配置.zhaiYao.zuiJinYuanWenToken
    ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = 600
    try {
      const zaoQiTiaoShu = 6000
      const zaoQiNeiRong = '早'.repeat(200)
      const zuiJinNeiRong = '最近'.repeat(50)
      const hangLieBiao = [
        ...Array.from({ length: zaoQiTiaoShu }, (_, i) => ({
          内容: zaoQiNeiRong,
          发送者: i % 2 === 0 ? 'yonghu' : 'jiaose',
          创建时间: new Date(Date.UTC(2026, 9, 1, 0, 0, i)),
          客户端序号: i,
          ID: `m-${i}`,
        })),
        { 内容: zuiJinNeiRong, 发送者: 'yonghu', 创建时间: new Date(Date.UTC(2026, 10, 1, 0, 0, 0)), 客户端序号: zaoQiTiaoShu, ID: 'm-last-user' },
        { 内容: zuiJinNeiRong, 发送者: 'jiaose', 创建时间: new Date(Date.UTC(2026, 10, 1, 0, 0, 1)), 客户端序号: zaoQiTiaoShu + 1, ID: 'm-last-jiao' },
      ]

      chaXunMock
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ dai_shu: hangLieBiao.length }] })
        .mockResolvedValueOnce({ rows: [{ zi_fu_shu: Math.ceil(AI配置.zhaiYao.yaSuoTokenYuZhi / 0.6) }] })
        .mockResolvedValueOnce({ rows: hangLieBiao.slice(0, AI配置.zhaiYao.piLiangTiaoShu) })
        .mockResolvedValueOnce({ rows: hangLieBiao.slice(AI配置.zhaiYao.piLiangTiaoShu) })
      moXingMock.mockResolvedValueOnce({ neiRong: '窗口前的要点' })
      chaXunMock.mockResolvedValueOnce({ rows: [] })

      const jieGuo = await shengChengBingLuoKuZhaiYao(YongHu, JiaoSe, '糖糖')
      expect(jieGuo).toBe(true)
      expect(moXingMock).toHaveBeenCalledTimes(1)

      const tiShi = String(moXingMock.mock.calls[0][1][1].neiRong)
      expect(tiShi).toContain('早'.repeat(200))
      expect(tiShi).not.toContain(zuiJinNeiRong)

      const xieKu = chaXunMock.mock.calls[4]
      expect(String(xieKu[0])).toContain('INSERT INTO "对话摘要"')
      expect(xieKu[1][0]).toBe(YongHu)
      expect(xieKu[1][1]).toBe(JiaoSe)
      expect(xieKu[1][2]).toBe('窗口前的要点')
      const maoDian = xieKu[1][4]
      expect(typeof maoDian).toBe('string')
      expect(Date.parse(maoDian as string)).toBeLessThan(Date.parse('2026-11-01T00:00:00Z'))

      const jiYi = duQuTongBuZhaiYao(YongHu, JiaoSe)
      expect(jiYi).toContain('窗口前的要点')
    } finally {
      ;(AI配置.zhaiYao as { zuiJinYuanWenToken: number }).zuiJinYuanWenToken = yuanZhi
    }
  }, 30000)
})
