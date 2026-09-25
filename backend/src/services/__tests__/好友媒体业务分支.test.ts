import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  db: { query: vi.fn() },
  audit: vi.fn(),
  path: vi.fn(),
  fanYi: vi.fn((_: string, key: string) => key),
}))
vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../DeepSeek视觉审核', () => ({ shenHeTuPianAnQuan: 假.audit }))
vi.mock('../媒体存储', () => ({ huoQuBenDiLuJing: 假.path }))
vi.mock('../../config/translations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../config/translations')>()),
  huoQuFanYi: 假.fanYi,
}))

import { shenHeHaoYouMeiTi, yanZhengHaoYouMeiTiGuiShu } from '../好友媒体'

const UUID = '550e8400-e29b-41d4-a716-446655440000'
const 媒体 = { 上传者ID: '用户', SHA256: 'hash', MIME: 'image/png', 类别: 'tupian' }

beforeEach(() => {
  vi.clearAllMocks()
  假.db.query.mockResolvedValue({ rows: [] })
  假.audit.mockResolvedValue({ wei_gui: false, lei_xing: '', li_you: '' })
  假.path.mockReturnValue('/tmp/media.png')
})

describe('好友媒体业务分支', () => {
  it('归属校验覆盖非法 UUID、缺失、非本人、类型不符和成功', async () => {
    await expect(yanZhengHaoYouMeiTiGuiShu('bad', '用户', 'tupian')).resolves.toEqual({ he_fa: false, ti_shi: 'meiTiBiXuXianChuanShu' })
    await expect(yanZhengHaoYouMeiTiGuiShu(UUID, '用户', 'tupian')).resolves.toEqual({ he_fa: false, ti_shi: 'meiTiBuCunZai' })
    假.db.query.mockResolvedValueOnce({ rows: [{ ...媒体, 上传者ID: '他人' }] })
    await expect(yanZhengHaoYouMeiTiGuiShu(UUID, '用户', 'tupian')).resolves.toEqual({ he_fa: false, ti_shi: 'meiTiBuCunZai' })
    假.db.query.mockResolvedValueOnce({ rows: [媒体] })
    await expect(yanZhengHaoYouMeiTiGuiShu(UUID, '用户', 'yin')).resolves.toEqual({ he_fa: false, ti_shi: 'meiTiBuCunZai' })
    假.db.query.mockResolvedValueOnce({ rows: [媒体] })
    await expect(yanZhengHaoYouMeiTiGuiShu(UUID, '用户', 'tuPian')).resolves.toEqual({ he_fa: true, ti_shi: '' })
  })

  it('媒体审核覆盖不存在、非图片、路径缺失和审核通过', async () => {
    await expect(shenHeHaoYouMeiTi(UUID)).resolves.toEqual({ wei_gui: true, lei_xing: '媒体不存在', li_you: '媒体不存在' })
    假.db.query.mockResolvedValueOnce({ rows: [{ ...媒体, MIME: 'application/pdf', 类别: 'wenjian' }] })
    await expect(shenHeHaoYouMeiTi(UUID)).resolves.toEqual({ wei_gui: false, lei_xing: '', li_you: '' })
    假.db.query.mockResolvedValueOnce({ rows: [媒体] })
    假.path.mockReturnValueOnce(null as never)
    await expect(shenHeHaoYouMeiTi(UUID)).resolves.toMatchObject({ wei_gui: true, lei_xing: expect.any(String) })
    假.db.query.mockResolvedValueOnce({ rows: [媒体] })
    假.audit.mockResolvedValueOnce({ wei_gui: true, lei_xing: '违规', li_you: '原因' })
    await expect(shenHeHaoYouMeiTi(UUID)).resolves.toEqual({ wei_gui: true, lei_xing: '违规', li_you: '原因' })
  })
})
