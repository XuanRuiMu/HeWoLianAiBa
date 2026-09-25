import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({ db: { query: vi.fn() }, jun: vi.fn() }))
vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../军师缓存', () => ({ huoQuJunShiJiLuLieBiao: 假.jun }))
vi.mock('../../config/translations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../config/translations')>()),
  huoQuFanYi: vi.fn((_: string, key: string) => key),
}))

import { gengXinFuPanNeiRong, huoQuDangAnLieBiao, huoQuDangAnXiangQing, piLiangShanChuDangAn, shanChuDangAn } from '../战绩'

const 行 = { ID: '档案', 用户ID: '用户', 角色ID: '角色', 微信昵称: '', 是否渣型: false, 结果类型: 'happy', 是否封存: false, 好感度总分: 3, 关系阶段: '朋友', 聊天天数: 2, 消息总数: 4, 创建时间: '2026-01-01', MBTI: '', 性别: 'nv', 结局文案: null, 最后消息时间: null, 模式: 'putong' }

beforeEach(() => {
  vi.clearAllMocks()
  假.db.query.mockResolvedValue({ rows: [] })
  假.jun.mockResolvedValue([])
})

describe('战绩业务分支', () => {
  it('列表和详情覆盖映射、进行中、复盘数组/对象/坏 JSON与军师记录', async () => {
    假.db.query.mockResolvedValueOnce({ rows: [行] })
    await expect(huoQuDangAnLieBiao('用户')).resolves.toHaveLength(1)
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(huoQuDangAnXiangQing('用户', '档案')).resolves.toBeNull()
    假.db.query.mockResolvedValueOnce({ rows: [{ ...行, 复盘数据: 'bad' }] })
    await expect(huoQuDangAnXiangQing('用户', '档案')).resolves.toMatchObject({ fu_pan_shu_ju: null, fu_pan_pi_zhu: null })
    假.db.query.mockResolvedValueOnce({ rows: [{ ...行, 复盘数据: { pi_zhu: [{ xu_hao: 1, ping_lun: '好', qing_gan: '积极' }, { xu_hao: 0, ping_lun: '坏' }] } }] })
    await expect(huoQuDangAnXiangQing('用户', '档案')).resolves.toMatchObject({ fu_pan_pi_zhu: [{ xu_hao: 1, ping_lun: '好', qing_gan: '积极' }] })
    假.db.query.mockResolvedValueOnce({ rows: [{ ...行, 复盘数据: [1, 2] }] })
    await expect(huoQuDangAnXiangQing('用户', '档案')).resolves.toMatchObject({ fu_pan_shu_ju: [1, 2] })
  })

  it('更新、单删和批删覆盖空与非空结果', async () => {
    await expect(gengXinFuPanNeiRong('档案', '内容', [{ xu_hao: 1, ping_lun: '好' }])).resolves.toBeUndefined()
    假.db.query.mockResolvedValueOnce({ rows: [{ ID: '档案' }] })
    await expect(shanChuDangAn('用户', '档案')).resolves.toBe(true)
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(shanChuDangAn('用户', '不存在')).resolves.toBe(false)
    await expect(piLiangShanChuDangAn('用户', [])).resolves.toEqual([])
    假.db.query.mockResolvedValueOnce({ rows: [{ ID: 'a' }, { ID: 'b' }] })
    await expect(piLiangShanChuDangAn('用户', ['a', 'b'])).resolves.toEqual(['a', 'b'])
  })
})
