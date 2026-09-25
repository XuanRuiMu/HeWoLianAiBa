import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({ db: { query: vi.fn() } }))
vi.mock('../../数据库', () => ({ 数据库: 假.db }))

import { jiLuShenJiRiZhi } from '../审计日志'

beforeEach(() => {
  vi.clearAllMocks()
  假.db.query.mockResolvedValue({ rows: [] })
})

describe('审计日志业务分支', () => {
  it('写入时掩码详情并提供默认类型', async () => {
    await jiLuShenJiRiZhi({ yong_hu_id: '用户', ip: '127.0.0.1', shi_jian_lei_xing: '事件', xiang_qing: { 手机号: '13800138000' } })
    expect(假.db.query).toHaveBeenCalledWith(expect.stringContaining('审计日志'), ['用户', '127.0.0.1', '事件', expect.any(String), '普通'])
    await jiLuShenJiRiZhi({ yong_hu_id: '', ip: 'ip', shi_jian_lei_xing: '事件', lei_xing: '管理' })
    expect(假.db.query).toHaveBeenLastCalledWith(expect.any(String), [null, 'ip', '事件', null, '管理'])
  })
})
