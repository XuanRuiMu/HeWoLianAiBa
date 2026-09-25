import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  db: { query: vi.fn() },
  io: vi.fn(),
  audit: vi.fn(),
}))
vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../socket/io', () => ({ huoQuIo: 假.io }))
vi.mock('../审计日志', () => ({ jiLuShenJiRiZhi: 假.audit }))
vi.mock('../../config/translations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../config/translations')>()),
  huoQuFanYi: vi.fn((_: string, key: string) => key),
}))

import { biaoJiSuoYouTongZhiYiDu, biaoJiTongZhiYiDu, chuangJianTongZhi, guanLiYuanFaSongTongZhi, huoQuTongZhiLieBiao } from '../通知'

const hang = { ID: '通知', 发送者ID: '发送者', 接收者ID: '接收者', 标题: '标题', 内容: '内容', 已读: false, 创建时间: '时间', 已读时间: null }

beforeEach(() => {
  vi.clearAllMocks()
  假.io.mockReturnValue(null)
  假.audit.mockResolvedValue(undefined)
})

describe('通知业务分支', () => {
  it('列表映射、数量解析和数量边界', async () => {
    假.db.query.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT')) return { rows: [{ count: '2' }] }
      return { rows: [hang, { ...hang, 发送者ID: null, 已读: true, 创建时间: null, 已读时间: '已读时间' }] }
    })
    await expect(huoQuTongZhiLieBiao('用户', 0)).resolves.toMatchObject({ wei_du_shu: 2, lie_biao: [{ fa_song_zhe_id: '发送者' }, { yi_du: true }] })
    expect(假.db.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $2'), ['用户', 1])
  })

  it('单条和批量标记已读覆盖无结果与成功', async () => {
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(biaoJiTongZhiYiDu('用户', '通知')).resolves.toBeNull()
    假.db.query.mockResolvedValueOnce({ rows: [{ ...hang, 已读: true, 已读时间: '已读时间' }] })
    await expect(biaoJiTongZhiYiDu('用户', '通知')).resolves.toMatchObject({ yi_du: true })
    await expect(biaoJiSuoYouTongZhiYiDu('用户')).resolves.toBeUndefined()
  })

  it('创建通知覆盖显式IO、默认IO和无IO', async () => {
    假.db.query.mockResolvedValue({ rows: [hang] })
    const io = { to: vi.fn(() => ({ emit: vi.fn() })) }
    await expect(chuangJianTongZhi({ jie_shou_zhe_id: '接收者', biao_ti: '标题', nei_rong: '内容' }, io as never)).resolves.toMatchObject({ id: '通知' })
    expect(io.to).toHaveBeenCalledWith('接收者')
    await chuangJianTongZhi({ jie_shou_zhe_id: '接收者', biao_ti: '标题', nei_rong: '内容' })
  })

  it('管理员通知覆盖长度、目标、FK跳过、普通错误和审计', async () => {
    const 基本 = { guan_li_yuan_id: '管理员', mu_biao: '全员', biao_ti: '标题', nei_rong: '内容', ip: 'ip' }
    await expect(guanLiYuanFaSongTongZhi({ ...基本, biao_ti: 'x'.repeat(101) })).resolves.toMatchObject({ zhuang_tai_ma: 400 })
    await expect(guanLiYuanFaSongTongZhi({ ...基本, nei_rong: 'x'.repeat(2001) })).resolves.toMatchObject({ zhuang_tai_ma: 400 })
    await expect(guanLiYuanFaSongTongZhi({ ...基本, mu_biao: '无效' })).resolves.toMatchObject({ zhuang_tai_ma: 400 })
    await expect(guanLiYuanFaSongTongZhi({ ...基本, mu_biao: '指定' })).resolves.toMatchObject({ zhuang_tai_ma: 400 })
    假.db.query.mockImplementation(async (sql: string) => sql.includes('SELECT "ID"') ? { rows: [{ ID: '甲' }, { ID: '乙' }] } : { rows: [hang] })
    await expect(guanLiYuanFaSongTongZhi(基本)).resolves.toMatchObject({ cheng_gong: true, fa_song_shu: 2 })
    假.db.query.mockImplementation(async (sql: string) => sql.startsWith('SELECT "ID"') ? { rows: [] } : { rows: [hang] })
    await expect(guanLiYuanFaSongTongZhi({ ...基本, mu_biao: '指定', jie_shou_zhe_ids: ['甲', '', 1] })).resolves.toMatchObject({ fa_song_shu: 1 })
    假.db.query.mockImplementation(async (sql: string) => sql.includes('INSERT') ? (() => { throw { code: '23503' } })() : { rows: [hang] })
    await expect(guanLiYuanFaSongTongZhi({ ...基本, mu_biao: '指定', jie_shou_zhe_ids: ['甲'] })).resolves.toMatchObject({ cheng_gong: true, fa_song_shu: 0 })
    假.db.query.mockImplementation(async (sql: string) => sql.includes('INSERT') ? (() => { throw { code: '99999' } })() : { rows: [hang] })
    await expect(guanLiYuanFaSongTongZhi({ ...基本, mu_biao: '指定', jie_shou_zhe_ids: ['甲'] })).rejects.toMatchObject({ code: '99999' })
  })
})
