import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('../数据库', () => ({
  数据库: { query: vi.fn() },
}))

vi.mock('../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), info: vi.fn() },
}))

import { 数据库 } from '../数据库'
import { jiLuSiKao, SI_KAO_SHI_JIAN_BAI_MING_DAN } from '../services/思考记录'

const 查询 = vi.mocked(数据库.query)

afterEach(() => {
  查询.mockReset()
})

describe('思考记录落库', () => {
  it('深度思考原文超1500截断并记原文长度', async () => {
    查询.mockResolvedValueOnce({ rows: [] } as never)
    const 长文 = '思'.repeat(1600)
    const 结果 = await jiLuSiKao({
      yong_hu_id: 'yong-hu-1',
      jiao_se_id: 'jiao-se-1',
      shi_jian: 'guan-li-yuan-shen-du-si-kao',
      lai_yuan: 'Director',
      nei_rong: 长文,
      lun_ci: 7,
    })
    expect(结果.cheng_gong).toBe(true)
    const 参数 = 查询.mock.calls[0][1] as unknown[]
    expect(String(参数[6]).length).toBe(1502)
    expect(String(参数[6]).endsWith('……')).toBe(true)
    expect(参数[7]).toBe(1600)
    expect(参数[8]).toBe(7)
  })

  it('未知事件与空内容拒绝落库且不碰库', async () => {
    const 未知 = await jiLuSiKao({
      yong_hu_id: 'yong-hu-1',
      jiao_se_id: 'jiao-se-1',
      shi_jian: 'wei-zhi-shi-jian' as never,
      nei_rong: '内容',
    })
    expect(未知.cheng_gong).toBe(false)
    const 空 = await jiLuSiKao({
      yong_hu_id: 'yong-hu-1',
      jiao_se_id: 'jiao-se-1',
      shi_jian: 'guan-li-yuan-gou-jian-guo-cheng',
      nei_rong: '   ',
    })
    expect(空.cheng_gong).toBe(false)
    expect(查询).not.toHaveBeenCalled()
  })

  it('四类事件白名单与落库失败返回失败', async () => {
    expect(SI_KAO_SHI_JIAN_BAI_MING_DAN).toHaveLength(4)
    查询.mockRejectedValueOnce(new Error('库挂了'))
    const 结果 = await jiLuSiKao({
      yong_hu_id: 'yong-hu-1',
      jiao_se_id: 'jiao-se-1',
      shi_jian: 'guan-li-yuan-hao-gan-du-bian-hua',
      nei_rong: '信任1',
    })
    expect(结果.cheng_gong).toBe(false)
  })

  it('018迁移幂等可重放', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const 迁移 = fs.readFileSync(
      path.resolve(__dirname, '../../database/migrations/018_思考记录.sql'),
      'utf8',
    )
    expect(迁移).toContain('CREATE TABLE IF NOT EXISTS "思考记录"')
    expect(迁移).toContain('思考记录_事件合法')
    expect(迁移).toContain('idx_思考记录_用户ID_角色ID_创建时间')
    expect(迁移).toContain('guan-li-yuan-shen-du-si-kao')
  })
})
