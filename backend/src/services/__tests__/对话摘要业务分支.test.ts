import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  db: { query: vi.fn() },
  redis: { set: vi.fn() },
  ai: vi.fn(),
  prompt: vi.fn(() => '摘要提示'),
  debug: { error: vi.fn() },
  config: { zhaiYao: { zuiDaZiFu: 10, chuFaXiaoXiShu: 2, yuanLiaoXiaoXiShu: 3, suoTtlMiao: 60 }, prompt: {} },
}))
vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))
vi.mock('../../config/AI配置', () => ({ AI_PEI_ZHI: 假.config }))
vi.mock('../../utils/DeepSeek客户端', () => ({ genJuPeiZhiTiaoYong: 假.ai }))
vi.mock('../Prompt构建器', () => ({ gouJianJiYiZhaiYaoPrompt: 假.prompt, JI_YI_ZHU_RU_YUE_SHU: '只读' }))
vi.mock('../../config/translations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../config/translations')>()),
  huoQuFanYi: vi.fn((_: string, key: string) => key),
}))

import { duQuDuiHuaZhaiYao, duQuTongBuZhaiYao, gouJianZhaiYaoZhuRuWenBen, huanCunTongBuZhaiYao, qieDuanZhaiYao, shengChengBingLuoKuZhaiYao } from '../对话摘要'

beforeEach(() => {
  vi.clearAllMocks()
  假.db.query.mockResolvedValue({ rows: [] })
  假.redis.set.mockResolvedValue('OK')
  假.ai.mockResolvedValue({ neiRong: '新摘要' })
})

describe('对话摘要业务分支', () => {
  it('截断、读取、注入文本和同步缓存覆盖空值与容量淘汰', async () => {
    expect(qieDuanZhaiYao('短文本')).toBe('短文本')
    expect(qieDuanZhaiYao('第一行\n第二行\n第三行')).toBe('第一行\n第二行')
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(duQuDuiHuaZhaiYao('用户', '角色')).resolves.toBeNull()
    假.db.query.mockResolvedValueOnce({ rows: [{ 摘要内容: '摘要', 概括消息数: 2, 更新时间: '时间', 素材锚点时间: '2026-01-01T00:00:00Z' }] })
    await expect(duQuDuiHuaZhaiYao('用户', '角色')).resolves.toMatchObject({ zhaiYaoNeiRong: '摘要', gaiKuoXiaoXiShu: 2 })
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await expect(duQuDuiHuaZhaiYao('用户', '角色')).resolves.toBeNull()
    expect(gouJianZhaiYaoZhuRuWenBen(null)).toBe('')
    expect(gouJianZhaiYaoZhuRuWenBen({ zhaiYaoNeiRong: '摘要', gaiKuoXiaoXiShu: 1, gengXinShiJian: null })).toContain('摘要')
    huanCunTongBuZhaiYao('用户', '角色', '缓存')
    expect(duQuTongBuZhaiYao('用户', '角色')).toBe('缓存')
    huanCunTongBuZhaiYao('用户', '角色', '')
    expect(duQuTongBuZhaiYao('用户', '角色')).toBe('')
    for (let i = 0; i < 501; i++) huanCunTongBuZhaiYao(`u${i}`, 'r', 'x')
    expect(duQuTongBuZhaiYao('u500', 'r')).toBe('x')
  })

  it('生成摘要覆盖锁、阈值、素材为空、AI失败和成功落库', async () => {
    假.redis.set.mockResolvedValueOnce(null)
    await expect(shengChengBingLuoKuZhaiYao('用户', '角色', '角色名')).resolves.toBe(false)
    假.db.query.mockResolvedValueOnce({ rows: [{ zong_shu: 1 }] })
    await expect(shengChengBingLuoKuZhaiYao('用户', '角色', '角色名')).resolves.toBe(true)
    假.db.query.mockImplementation(async (sql: string) => sql.includes('COUNT') ? { rows: [{ zong_shu: 5 }] } : sql.includes('对话摘要') ? { rows: [] } : { rows: [] })
    await expect(shengChengBingLuoKuZhaiYao('用户', '角色', '角色名')).resolves.toBe(true)
    假.db.query.mockImplementation(async (sql: string) => sql.includes('COUNT') ? { rows: [{ zong_shu: 5 }] } : sql.includes('SELECT "内容"') ? { rows: [] } : { rows: [] })
    await expect(shengChengBingLuoKuZhaiYao('用户', '角色', '角色名')).resolves.toBe(true)
    假.db.query.mockImplementation(async (sql: string) => sql.includes('COUNT') ? { rows: [{ zong_shu: 5 }] } : sql.includes('SELECT "内容"') ? { rows: [{ 内容: '素材', 发送者: 'yonghu', 创建时间: '2026-01-01T00:00:00Z' }] } : { rows: [] })
    假.ai.mockResolvedValueOnce({ neiRong: '' })
    await expect(shengChengBingLuoKuZhaiYao('用户', '角色', '角色名')).resolves.toBe(true)
    假.ai.mockRejectedValueOnce(new Error('模型'))
    await expect(shengChengBingLuoKuZhaiYao('用户', '角色', '角色名')).resolves.toBe(false)
    假.ai.mockResolvedValueOnce({ neiRong: '最终摘要' })
    await expect(shengChengBingLuoKuZhaiYao('用户', '角色', '角色名')).resolves.toBe(true)
    假.redis.set.mockRejectedValueOnce(new Error('redis'))
    await expect(shengChengBingLuoKuZhaiYao('用户', '角色', '角色名')).resolves.toBe(false)
  })
})
