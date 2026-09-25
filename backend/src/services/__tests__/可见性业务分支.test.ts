import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({ query: vi.fn() }))

vi.mock('../../数据库', () => ({ 数据库: { query: 假.query } }))

import {
  KE_JIAN_XING_LIE_BIAO,
  chaXunShiHaoYou,
  duQuQianMingKeJianXinXi,
  guoLvQianMing,
  panDuanKeJian,
  shiHeFaKeJianXing,
} from '../可见性'

beforeEach(() => {
  vi.clearAllMocks()
  假.query.mockResolvedValue({ rows: [] })
})

describe('可见性业务分支', () => {
  it('合法性和本人、公开、好友、白名单、私密规则均正确', () => {
    expect(KE_JIAN_XING_LIE_BIAO).toHaveLength(5)
    expect(shiHeFaKeJianXing('gong_kai')).toBe(true)
    expect(shiHeFaKeJianXing('未知')).toBe(false)
    expect(shiHeFaKeJianXing(null)).toBe(false)
    const 上下文 = { chaKanZheId: '查看者', yongYouZheId: '拥有者', shiHaoYou: true, baiMingDan: ['查看者'] }
    expect(panDuanKeJian('gong_kai', 上下文)).toBe(true)
    expect(panDuanKeJian('jin_hao_you', 上下文)).toBe(true)
    expect(panDuanKeJian('jin_hao_you', { ...上下文, shiHaoYou: false })).toBe(false)
    expect(panDuanKeJian('jin_bu_fen_ren', 上下文)).toBe(true)
    expect(panDuanKeJian('jin_bu_fen_ren', { ...上下文, baiMingDan: [] })).toBe(false)
    expect(panDuanKeJian('bu_ke_jian', 上下文)).toBe(false)
    expect(panDuanKeJian('jin_zi_ji', 上下文)).toBe(false)
    expect(panDuanKeJian('gong_kai', { ...上下文, chaKanZheId: '拥有者' })).toBe(true)
    expect(panDuanKeJian('bu_ke_jian', { ...上下文, chaKanZheId: '拥有者' })).toBe(false)
  })

  it('好友查询对空值、自反和数据库结果分支正确', async () => {
    await expect(chaXunShiHaoYou('', 'b')).resolves.toBe(false)
    await expect(chaXunShiHaoYou('a', 'a')).resolves.toBe(false)
    假.query.mockResolvedValueOnce({ rows: [{}] })
    await expect(chaXunShiHaoYou('a', 'b')).resolves.toBe(true)
    假.query.mockResolvedValueOnce({ rows: [] })
    await expect(chaXunShiHaoYou('a', 'b')).resolves.toBe(false)
    expect(假.query).toHaveBeenCalledWith(expect.stringContaining('好友申请'), ['a', 'b'])
  })

  it('读取签名处理不存在、空签名、非法可见性和非数组白名单', async () => {
    假.query.mockResolvedValueOnce({ rows: [] })
    await expect(duQuQianMingKeJianXinXi('用户')).resolves.toBeNull()
    假.query.mockResolvedValueOnce({ rows: [{ 签名: '', 签名可见性: '未知', 签名白名单: '错误' }] })
    await expect(duQuQianMingKeJianXinXi('用户')).resolves.toEqual({ qianMing: null, keJianXing: 'gong_kai', baiMingDan: [] })
    假.query.mockResolvedValueOnce({ rows: [{ 签名: 123, 签名可见性: 'jin_zi_ji', 签名白名单: [1, '2'] }] })
    await expect(duQuQianMingKeJianXinXi('用户')).resolves.toEqual({ qianMing: '123', keJianXing: 'jin_zi_ji', baiMingDan: ['1', '2'] })
  })

  it('过滤签名覆盖公开、好友、白名单、私密和缺失资源', async () => {
    假.query.mockResolvedValueOnce({ rows: [{ 签名: '公开签名', 签名可见性: 'gong_kai', 签名白名单: [] }] })
    await expect(guoLvQianMing('拥有者', null)).resolves.toBe('公开签名')
    假.query.mockResolvedValueOnce({ rows: [{ 签名: '', 签名可见性: 'gong_kai', 签名白名单: [] }] })
    await expect(guoLvQianMing('拥有者', '查看者')).resolves.toBeNull()
    假.query.mockResolvedValueOnce({ rows: [{ 签名: '好友签名', 签名可见性: 'jin_hao_you', 签名白名单: [] }] })
    假.query.mockResolvedValueOnce({ rows: [{}] })
    await expect(guoLvQianMing('拥有者', '查看者')).resolves.toBe('好友签名')
    假.query.mockResolvedValueOnce({ rows: [{ 签名: '好友签名', 签名可见性: 'jin_hao_you', 签名白名单: [] }] })
    假.query.mockResolvedValueOnce({ rows: [] })
    await expect(guoLvQianMing('拥有者', '查看者')).resolves.toBeNull()
    假.query.mockResolvedValueOnce({ rows: [{ 签名: '名单签名', 签名可见性: 'jin_bu_fen_ren', 签名白名单: ['查看者'] }] })
    假.query.mockResolvedValueOnce({ rows: [] })
    await expect(guoLvQianMing('拥有者', '查看者')).resolves.toBe('名单签名')
    假.query.mockResolvedValueOnce({ rows: [{ 签名: '私密签名', 签名可见性: 'bu_ke_jian', 签名白名单: [] }] })
    假.query.mockResolvedValueOnce({ rows: [{}] })
    await expect(guoLvQianMing('拥有者', '查看者')).resolves.toBeNull()
  })
})
