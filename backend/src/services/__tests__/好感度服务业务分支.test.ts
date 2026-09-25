import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  db: { query: vi.fn() },
  cache: { jiLuZengLiang: vi.fn() },
  win: { chuLiYouXiJieShu: vi.fn() },
  debug: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../好感度缓存', () => ({ jiLuZengLiang: 假.cache.jiLuZengLiang }))
vi.mock('../胜利失败条件', () => ({ chuLiYouXiJieShu: 假.win.chuLiYouXiJieShu }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug, jiLuHaoGanDuBianHua: vi.fn() }))

import { chuShiHuaHaoGanDu, fenJieSiWei, gengXinHaoGanDu, huoQuGongKaiHaoGanDuXinXi, huoQuJieDuanMing, huoQuJieDuanXinXi, huoQuLiuCengJiMingCheng, huoQuWanZhengHaoGanDu, huoQuXinQing, jiSuanShuaiJianBianHua, jiSuanSiWeiBianHuaHouDeZongFen, jiSuanZongFen, sheZhiMiJiHaoGanDu } from '../好感度'

const 变化 = { xin_ren_du_bian_hua: 1, qin_mi_du_bian_hua: 1, qu_wei_du_bian_hua: 1, guan_huai_du_bian_hua: 1 }
const 基础记录 = { 信任度: 10, 亲密度: 20, 趣味度: 30, 关怀度: 40, 总分: 100, 关系阶段: '认识' }

beforeEach(() => {
  vi.clearAllMocks()
  假.db.query.mockResolvedValue({ rows: [] })
  假.cache.jiLuZengLiang.mockResolvedValue(undefined)
  假.win.chuLiYouXiJieShu.mockResolvedValue(undefined)
})

describe('好感度业务分支', () => {
  it('纯计算覆盖截断、阶段、六维派生和衰减', () => {
    expect(jiSuanZongFen({ xin_ren_du: 2000, qin_mi_du: 2000, qu_wei_du: 2000, guan_huai_du: 2000 })).toBe(1000)
    expect(jiSuanZongFen({ xin_ren_du: -1, qin_mi_du: -1, qu_wei_du: -1, guan_huai_du: -1 })).toBe(0)
    expect(jiSuanShuaiJianBianHua(1000, 100)).toBe(10)
    expect(jiSuanShuaiJianBianHua(0, 100)).toBe(100)
    expect(fenJieSiWei(100)).toMatchObject({ zong_fen: 100 })
    expect(huoQuJieDuanXinXi(100).jieDuanMing).toBe('冷淡')
    expect(huoQuJieDuanMing(250)).toBe('认识')
    expect(huoQuXinQing(450)).toBe('愉悦')
    expect(huoQuLiuCengJiMingCheng(700)).toBe('暧昧')
    expect(jiSuanSiWeiBianHuaHouDeZongFen(50, 变化)).toBeGreaterThan(50)
  })

  it('完整和公开好感度读取覆盖空行、字段默认值与派生阶段', async () => {
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(huoQuWanZhengHaoGanDu('用户', '角色')).resolves.toBeNull()
    假.db.query.mockResolvedValueOnce({ rows: [基础记录] })
    await expect(huoQuWanZhengHaoGanDu('用户', '角色')).resolves.toMatchObject({ xin_ren_du: 10, qin_mi_du: 20, zong_fen: 100 })
    假.db.query.mockResolvedValueOnce({ rows: [{ 信任度: null, 亲密度: null, 趣味度: null, 关怀度: null, 总分: null, 关系阶段: null }] })
    await expect(huoQuWanZhengHaoGanDu('用户', '角色')).resolves.toMatchObject({ xin_ren_du: 0, guan_xi_jie_duan: '冷淡' })
    假.db.query.mockResolvedValue({ rows: [基础记录] })
    await expect(huoQuGongKaiHaoGanDuXinXi('用户', '角色')).resolves.toEqual({ jie_duan: '冷淡', xin_qing: '平淡' })
  })

  it('更新好感度覆盖不存在、原子更新成功、零行和异常', async () => {
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(gengXinHaoGanDu('用户', '角色', 变化)).resolves.toMatchObject({ cheng_gong: false, zhuang_tai_ma: 404 })
    假.db.query.mockImplementation(async (sql: string) => {
      if (sql.includes('RETURNING')) return { rowCount: 1, rows: [{ 总分: 110 }] }
      if (sql.includes('SELECT *')) return { rows: [基础记录] }
      return { rows: [] }
    })
    await expect(gengXinHaoGanDu('用户', '角色', 变化, 2, 3, 4)).resolves.toMatchObject({ cheng_gong: true, hao_gan_du: { zong_fen: 110 } })
    expect(假.cache.jiLuZengLiang).toHaveBeenCalled()
    假.db.query.mockImplementation(async (sql: string) => {
      if (sql.includes('RETURNING')) return { rowCount: 0, rows: [] }
      if (sql.includes('SELECT *')) return { rows: [基础记录] }
      return { rows: [] }
    })
    await expect(gengXinHaoGanDu('用户', '角色', 变化)).resolves.toMatchObject({ cheng_gong: false, zhuang_tai_ma: 404 })
    假.db.query.mockRejectedValue(new Error('db'))
    await expect(gengXinHaoGanDu('用户', '角色', 变化)).resolves.toMatchObject({ cheng_gong: false, zhuang_tai_ma: 500 })
  })

  it('秘籍和初始化覆盖口令、资源不存在、成功写入与胜负副作用', async () => {
    await expect(sheZhiMiJiHaoGanDu('用户', '角色', '错误')).resolves.toMatchObject({ cheng_gong: false, zhuang_tai_ma: 401 })
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(sheZhiMiJiHaoGanDu('用户', '角色', 'whosyourdaddy')).resolves.toMatchObject({ cheng_gong: false, zhuang_tai_ma: 404 })
    假.db.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT *')) return { rows: [基础记录] }
      if (sql.includes('SELECT "是否渣型"')) return { rows: [{ 是否渣型: true, 对局模式: 'paiwei' }] }
      return { rows: [] }
    })
    await expect(sheZhiMiJiHaoGanDu('用户', '角色', 'whosyourdaddy')).resolves.toMatchObject({ cheng_gong: true, hao_gan_du: { zong_fen: 1000 } })
    expect(假.win.chuLiYouXiJieShu).toHaveBeenCalled()
    await chuShiHuaHaoGanDu('用户', '角色', 2000)
    expect(假.db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO "好感度"'), expect.arrayContaining(['用户', '角色']))
  })
})
