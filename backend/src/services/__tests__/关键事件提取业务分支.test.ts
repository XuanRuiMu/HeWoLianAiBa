import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  gen: vi.fn(),
  db: { query: vi.fn() },
  debug: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../utils/DeepSeek客户端', () => ({ genJuPeiZhiTiaoYong: 假.gen }))
vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import { duQuGuanJianShiJianZhuRu, mingZhongPaiXu, tiQuBingLuoKuGuanJianShiJian, tiQuGuanJianShiJian } from '../关键事件提取'

beforeEach(() => {
  vi.clearAllMocks()
  假.gen.mockResolvedValue({ neiRong: '[]' })
  假.db.query.mockResolvedValue({ rows: [], rowCount: 0 })
})

describe('关键事件提取业务分支', () => {
  it('抽取覆盖取消、数组、嵌入 JSON、非法形状和异常', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(tiQuGuanJianShiJian('聊天', '角色', undefined, controller.signal)).resolves.toEqual([])
    假.gen.mockResolvedValueOnce({ neiRong: '[{"事件类型":"表白","描述":"确认关系","确信度":0.8}]' })
    await expect(tiQuGuanJianShiJian('聊天', '角色')).resolves.toEqual([{ shi_jian_lei_xing: '表白', miao_shu: '确认关系', que_xin_du: 0.8 }])
    假.gen.mockResolvedValueOnce({ neiRong: '前缀 [{"事件类型":"吵架","描述":"争执","确信度":"bad"}] 后缀' })
    await expect(tiQuGuanJianShiJian('聊天', '角色')).resolves.toEqual([{ shi_jian_lei_xing: '吵架', miao_shu: '争执', que_xin_du: 0 }])
    假.gen.mockResolvedValueOnce({ neiRong: '{}' })
    await expect(tiQuGuanJianShiJian('聊天', '角色')).resolves.toEqual([])
    假.gen.mockRejectedValueOnce(new Error('AI失败'))
    await expect(tiQuGuanJianShiJian('聊天', '角色')).resolves.toEqual([])
  })

  it('落表覆盖空描述、去重、插入和数据库异常', async () => {
    假.gen.mockResolvedValueOnce({ neiRong: '[{"事件类型":"表白","描述":" 确认关系 ","确信度":1},{"事件类型":"空","描述":" ","确信度":1}]' })
    假.db.query.mockResolvedValueOnce({ rowCount: 0 })
    await expect(tiQuBingLuoKuGuanJianShiJian('用户', '角色', '聊天', '角色')).resolves.toHaveLength(2)
    假.gen.mockResolvedValueOnce({ neiRong: '[{"事件类型":"重复","描述":"旧事件","确信度":1}]' })
    假.db.query.mockResolvedValueOnce({ rowCount: 1 })
    await expect(tiQuBingLuoKuGuanJianShiJian('用户', '角色', '聊天', '角色')).resolves.toHaveLength(1)
    假.gen.mockResolvedValueOnce({ neiRong: '[{"事件类型":"新事件","描述":"新事件","确信度":1}]' })
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await expect(tiQuBingLuoKuGuanJianShiJian('用户', '角色', '聊天', '角色')).resolves.toHaveLength(1)
  })

  it('检索注入覆盖空结果、排序、默认字段和异常', async () => {
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(duQuGuanJianShiJianZhuRu('用户', '角色')).resolves.toBe('')
    假.db.query.mockResolvedValueOnce({ rows: [
      { 事件类型: '旧事件', 描述: '无关内容', 创建时间: new Date('2024-01-01') },
      { 事件类型: '新事件', 描述: '当前消息相关', 创建时间: new Date('2024-01-02') },
    ] })
    const 结果 = await duQuGuanJianShiJianZhuRu('用户', '角色', 1, '当前消息')
    expect(结果).toContain('当前消息相关')
    expect(结果).not.toContain('无关内容')
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await expect(duQuGuanJianShiJianZhuRu('用户', '角色')).resolves.toBe('')
  })

  it('相关性排序在同分时按时间倒序', () => {
    const 数据 = [
      { wenBen: '旧消息', chuangJian: 1 },
      { wenBen: '新消息', chuangJian: 2 },
    ]
    mingZhongPaiXu(数据, '')
    expect(数据[0].wenBen).toBe('新消息')
  })
})
