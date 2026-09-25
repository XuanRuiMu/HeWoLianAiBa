import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  db: { query: vi.fn(), connect: vi.fn() },
  redis: { get: vi.fn(), setex: vi.fn(), del: vi.fn() },
  io: vi.fn(),
  signature: vi.fn(() => '/signed'),
  debug: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('../../socket/io', () => ({ huoQuIo: 假.io }))
vi.mock('../媒体存储', () => ({ shengChengQianMingURL: 假.signature }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug, jiLuXiaoXiCaoZuo: vi.fn(), jiLuSocketShiJian: vi.fn() }))
vi.mock('../../config/translations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../config/translations')>()),
  huoQuFanYi: vi.fn((_: string, key: string) => key),
}))

import { anIdChaXiaoXi, haoYouKuaiTouYing, huiHuaXiaoXiSuoJian, huoQuJiaoSeSuoYouZhe, huoQuXiaoXiLieBiao, qingLiXiaoXiKuaiXieRu, shiXiaoXiaoXiZongShuHuanCun, shiZiYinYong, yanZhengBeiYinYong, yingSheKuaiChuCan } from '../消息'

const ID = '550e8400-e29b-41d4-a716-446655440000'
const 图 = { lei_xing: 'tupian' as const, mei_ti_id: ID }
const 文 = { lei_xing: 'wenzi' as const, nei_rong: '文字' }

beforeEach(() => {
  vi.clearAllMocks()
  假.db.query.mockResolvedValue({ rows: [] })
  假.db.connect.mockResolvedValue({ query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() })
  假.redis.get.mockResolvedValue(null)
  假.redis.setex.mockResolvedValue('OK')
  假.redis.del.mockResolvedValue(1)
  假.io.mockReturnValue(null)
})

describe('消息服务业务分支', () => {
  it('纯函数、引用判定和缓存键', async () => {
    expect(haoYouKuaiTouYing('用户')).toMatchObject({ cheHuiLie: '撤回', sha256Lie: 'SHA256' })
    expect(huiHuaXiaoXiSuoJian('用户', '角色')).toEqual(expect.any(Number))
    expect(shiZiYinYong(null, ID)).toBe(false)
    expect(shiZiYinYong(ID, ID)).toBe(true)
    await expect(yanZhengBeiYinYong(null, '用户', '角色')).resolves.toEqual({ cheng_gong: true, id: null })
    await expect(yanZhengBeiYinYong('bad', '用户', '角色')).resolves.toMatchObject({ zhuang_tai_ma: 400 })
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(yanZhengBeiYinYong(ID, '用户', '角色')).resolves.toMatchObject({ zhuang_tai_ma: 400 })
    假.db.query.mockResolvedValueOnce({ rows: [{ 用户ID: '他人', 角色ID: '角色', 已撤回: false }] })
    await expect(yanZhengBeiYinYong(ID, '用户', '角色')).resolves.toMatchObject({ zhuang_tai_ma: 403 })
    假.db.query.mockResolvedValueOnce({ rows: [{ 用户ID: '用户', 角色ID: '其他', 已撤回: false }] })
    await expect(yanZhengBeiYinYong(ID, '用户', '角色')).resolves.toMatchObject({ zhuang_tai_ma: 400 })
    假.db.query.mockResolvedValueOnce({ rows: [{ 用户ID: '用户', 角色ID: '角色', 已撤回: true }] })
    await expect(yanZhengBeiYinYong(ID, '用户', '角色')).resolves.toMatchObject({ zhuang_tai_ma: 400 })
    假.db.query.mockResolvedValueOnce({ rows: [{ 用户ID: '用户', 角色ID: '角色', 已撤回: false }] })
    await expect(yanZhengBeiYinYong(ID, '用户', '角色')).resolves.toEqual({ cheng_gong: true, id: ID })
  })

  it('块写入清洗覆盖无块、超限、媒体归属和全丢弃', async () => {
    await expect(qingLiXiaoXiKuaiXieRu(null, '用户', '测试')).resolves.toMatchObject({ cheng_gong: true, kuai: null })
    await expect(qingLiXiaoXiKuaiXieRu([{ lei_xing: 'wenzi', nei_rong: 'x'.repeat(1000) }], '用户', '测试')).resolves.toMatchObject({ cheng_gong: false, zhuang_tai_ma: 400 })
    假.db.query.mockResolvedValueOnce({ rows: [{ ID: ID, 类别: 'tupian', 上传者ID: '用户' }] })
    await expect(qingLiXiaoXiKuaiXieRu([图], '用户', '测试')).resolves.toMatchObject({ cheng_gong: true, jianYing: { lei_xing: 'tuPian' } })
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(qingLiXiaoXiKuaiXieRu([图], '用户', '测试')).resolves.toMatchObject({ cheng_gong: false, zhuang_tai_ma: 400 })
  })

  it('块上下文、出参、角色归属和单条查询', async () => {
    假.db.query.mockResolvedValueOnce({ rows: [{ ID: ID, SHA256: 'a'.repeat(64), 类别: 'tupian' }] })
    const 上下文 = await import('../消息').then((m) => m.gouKuaiShangXiaWen([{ ID: '消息', 内容块: [图], 类型: 'tuPian' }]))
    expect(上下文.meiTiOf(ID)).toMatchObject({ lei_bie: 'tupian' })
    expect(上下文.kuaiOf('消息')).toEqual([图])
    expect(yingSheKuaiChuCan({ ID: '消息', 已撤回: true }, 上下文, '撤回')).toEqual([{ lei_xing: 'wenzi', nei_rong: '撤回' }])
    expect(yingSheKuaiChuCan({ ID: '消息', 类型: 'tuPian', 媒体ID: ID, 媒体SHA256: 'a'.repeat(64), 媒体类别: 'tupian' }, { kuaiOf: () => [图], meiTiOf: () => null }, '撤回')).toMatchObject([{ mei_ti_url: '/signed' }])
    await expect(huoQuJiaoSeSuoYouZhe('bad')).resolves.toBeNull()
    假.db.query.mockResolvedValueOnce({ rows: [{ 用户ID: '用户', 封存: false, 可继续聊天: true, 结局状态: null, 是否渣型: false, 性别: 'nv' }] })
    await expect(huoQuJiaoSeSuoYouZhe(ID)).resolves.toMatchObject({ yong_hu_id: '用户' })
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(anIdChaXiaoXi(ID)).resolves.toBeNull()
  })

  it('总数缓存和分页覆盖缓存命中、数据库回查与keyset', async () => {
    await shiXiaoXiaoXiZongShuHuanCun('用户', '角色')
    假.redis.del.mockRejectedValueOnce(new Error('redis'))
    await expect(shiXiaoXiaoXiZongShuHuanCun('用户', '角色')).resolves.toBeUndefined()
    假.db.query.mockImplementation(async (sql: string) => sql.includes('COUNT') ? { rows: [{ zong_shu: '1' }] } : { rows: [{ ID: '消息', 内容: '文字', 类型: 'wenben', 发送者: 'yonghu', 用户ID: '用户', 角色ID: '角色', 创建时间: new Date().toISOString() }] })
    await expect(huoQuXiaoXiLieBiao({ yong_hu_id: '用户', jiao_se_id: '角色' })).resolves.toMatchObject({ zong_shu: 1, hai_you_geng_duo: false })
    假.redis.get.mockResolvedValueOnce('3')
    await expect(huoQuXiaoXiLieBiao({ yong_hu_id: '用户', jiao_se_id: '角色', you_biao_id: 'x', you_biao_shi_jian_chuo: Date.now() })).resolves.toMatchObject({ zong_shu: 3 })
  })
})
