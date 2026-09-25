import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  db: { query: vi.fn() },
  role: { shengChengJiaoSe: vi.fn(), baoCunJiaoSe: vi.fn() },
  debug: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../角色生成', () => ({ shengChengJiaoSe: 假.role.shengChengJiaoSe, baoCunJiaoSe: 假.role.baoCunJiaoSe }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import { huoQuDangQianDuiJu, huoQuPaiHangBang, huoQuWoDeGaiKuang, jieSuanTiaoZhanDuiJu, kaiShiTiaoZhan } from '../挑战积分'

beforeEach(() => {
  vi.clearAllMocks()
  假.db.query.mockResolvedValue({ rows: [], rowCount: 0 })
  假.role.shengChengJiaoSe.mockReturnValue({ id: '角色', xing_bie: 'nv' })
  假.role.baoCunJiaoSe.mockResolvedValue(undefined)
})

describe('挑战积分业务分支', () => {
  it('开始挑战覆盖性别拒绝、进行中冲突、保存失败、占位冲突和成功', async () => {
    await expect(kaiShiTiaoZhan('用户', '错误' as never, 'nv')).rejects.toThrow()
    假.db.query.mockResolvedValueOnce({ rowCount: 1, rows: [{}] })
    await expect(kaiShiTiaoZhan('用户', 'nan', 'nv')).rejects.toMatchObject({ zhuang_tai_ma: 409 })
    假.db.query.mockResolvedValue({ rowCount: 0, rows: [] })
    假.role.baoCunJiaoSe.mockRejectedValueOnce(new Error('保存失败'))
    await expect(kaiShiTiaoZhan('用户', 'nan', 'nv')).rejects.toThrow('保存失败')
    假.role.baoCunJiaoSe.mockResolvedValue(undefined)
    假.db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    假.db.query.mockImplementationOnce(async () => {
      throw Object.assign(new Error('冲突'), { code: '23505' })
    })
    await expect(kaiShiTiaoZhan('用户', 'nan', 'nv')).rejects.toMatchObject({ zhuang_tai_ma: 409 })
    假.db.query.mockResolvedValue({ rowCount: 0, rows: [] })
    await expect(kaiShiTiaoZhan('用户', 'nan', 'nv')).resolves.toMatchObject({ id: '角色' })
  })

  it('查询当前对局覆盖空行、字段默认值和性别归一', async () => {
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(huoQuDangQianDuiJu('用户')).resolves.toBeNull()
    假.db.query.mockResolvedValueOnce({ rows: [{ ID: '对局', 角色ID: '角色', 玩家性别: 'nan', 对象性别: 'bad', 创建时间: '现在', 微信昵称: '', 头像: null }] })
    await expect(huoQuDangQianDuiJu('用户')).resolves.toMatchObject({ id: '对局', wan_jia_xing_bie: '男', dui_xiang_xing_bie: '未知', wei_xin_ming: '', tou_xiang: '' })
  })

  it('结算覆盖无对局、放弃、胜利连胜、普通失败、保护失败和异常', async () => {
    假.db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] })
    await expect(jieSuanTiaoZhanDuiJu('用户', '角色', 'sheng_li_ai_qing')).resolves.toBeUndefined()
    假.db.query.mockImplementation(async (sql: string) => {
      if (sql.includes('RETURNING')) return { rowCount: 1, rows: [{ ID: '对局', 玩家性别: 'nan', 对象性别: 'nv' }] }
      if (sql.includes('SELECT "连胜"')) return { rows: [{ 连胜: 3 }] }
      if (sql.includes('SELECT "胜场"')) return { rows: [] }
      return { rows: [] }
    })
    await jieSuanTiaoZhanDuiJu('用户', '角色', 'shi_bai_fang_qi_tiao_zhan')
    await jieSuanTiaoZhanDuiJu('用户', '角色', 'sheng_li_ai_qing')
    await jieSuanTiaoZhanDuiJu('用户', '角色', 'shi_bai_hao_gan_du_gui_ling')
    假.db.query.mockImplementation(async (sql: string) => {
      if (sql.includes('RETURNING')) return { rowCount: 1, rows: [{ ID: '对局', 玩家性别: 'nan', 对象性别: 'nv' }] }
      if (sql.includes('SELECT "胜场"')) return { rows: [{ 胜场: 3, 负场: 0, 弃权场: 0 }] }
      return { rows: [] }
    })
    await jieSuanTiaoZhanDuiJu('用户', '角色', 'shi_bai_hao_gan_du_gui_ling')
    假.db.query.mockRejectedValue(new Error('db'))
    await expect(jieSuanTiaoZhanDuiJu('用户', '角色', 'sheng_li_ai_qing')).resolves.toBeUndefined()
  })

  it('排行榜和概况覆盖非法组别、字段映射、四组缺省和排名', async () => {
    await expect(huoQuPaiHangBang('非法')).rejects.toMatchObject({ zhuang_tai_ma: 400 })
    假.db.query.mockResolvedValueOnce({ rows: [{ 积分: 1200, 胜场: 1, 负场: 2, 弃权场: 3, 最高连胜: 4, 历史最高分: 1800, 用户名: '用户', 昵称: '' }] })
    await expect(huoQuPaiHangBang('nan_nv')).resolves.toEqual([expect.objectContaining({ pai_ming: 1, yong_hu_ming: '用户', duan_wei: '大师' })])
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(huoQuWoDeGaiKuang('用户')).resolves.toHaveLength(4)
    假.db.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT "组别"')) return { rows: [{ 组别: 'nan_nv', 积分: 100, 胜场: 1, 负场: 0, 弃权场: 0, 连胜: 1, 历史最高分: 100, 更新时间: '现在' }] }
      return { rows: [{ ming_ci: 2 }] }
    })
    const 概况 = await huoQuWoDeGaiKuang('用户')
    expect(概况[0]).toMatchObject({ zu_bie: 'nan_nv', ji_fen: 100, pai_ming: 2 })
    expect(概况[1].ji_fen).toBeNull()
  })
})
