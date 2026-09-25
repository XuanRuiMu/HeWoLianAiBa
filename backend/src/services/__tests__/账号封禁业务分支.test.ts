import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  db: { query: vi.fn(), connect: vi.fn() },
  client: { query: vi.fn(), release: vi.fn() },
  redis: { set: vi.fn(), del: vi.fn() },
  media: { cheXiaoYongHuMeiTiQianMing: vi.fn() },
  notify: { chuangJianTongZhi: vi.fn() },
  audit: { jiLuShenJiRiZhi: vi.fn() },
  debug: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('../媒体存储', () => 假.media)
vi.mock('../通知', () => 假.notify)
vi.mock('../审计日志', () => 假.audit)
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import {
  chaXunZhangHaoFengJin,
  cheHuiWeiGuiXiaoXi,
  fengJinTongZhiZhengWen,
  jieChuZhangHaoFengJin,
  jiLuZhangHaoWeiGui,
  jiSuanZhangHaoFengJinShiChang,
  lieChuFengJinShenSu,
  shenHeShenSu,
  tiJiaoShenSu,
} from '../账号封禁'

beforeEach(() => {
  vi.clearAllMocks()
  假.db.connect.mockResolvedValue(假.client)
  假.client.query.mockResolvedValue({ rows: [] })
  假.client.release.mockReturnValue(undefined)
  假.db.query.mockResolvedValue({ rows: [] })
  假.redis.set.mockResolvedValue('OK')
  假.redis.del.mockResolvedValue(1)
  假.media.cheXiaoYongHuMeiTiQianMing.mockResolvedValue(undefined)
  假.notify.chuangJianTongZhi.mockResolvedValue(undefined)
  假.audit.jiLuShenJiRiZhi.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('账号封禁业务分支', () => {
  it('时长和通知正文覆盖全部级别、分钟、天数与空解封时间', () => {
    expect(jiSuanZhangHaoFengJinShiChang(0)).toBeUndefined()
    expect(jiSuanZhangHaoFengJinShiChang(1)).toBe(60 * 1000)
    expect(jiSuanZhangHaoFengJinShiChang(2)).toBe(24 * 60 * 60 * 1000)
    expect(jiSuanZhangHaoFengJinShiChang(3)).toBe(7 * 24 * 60 * 60 * 1000)
    expect(jiSuanZhangHaoFengJinShiChang(4)).toBe(30 * 24 * 60 * 60 * 1000)
    expect(fengJinTongZhiZhengWen(1, 'feng_jin_1_fen', null)).toContain('封禁1分钟')
    expect(fengJinTongZhiZhengWen(2, 'feng_jin_1_tian', new Date('2030-01-01T00:00:00Z'))).toContain('封禁1天')
    expect(fengJinTongZhiZhengWen(0, 'zheng_chang', null)).toContain('正常')
  })

  it('查询覆盖空用户、无行、数据库错误、有效封存、过期和非法枚举', async () => {
    await expect(chaXunZhangHaoFengJin('')).resolves.toMatchObject({ beiFengJin: false, weiGuiCiShu: 0 })
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(chaXunZhangHaoFengJin('用户')).resolves.toMatchObject({ beiFengJin: false })
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await expect(chaXunZhangHaoFengJin('用户')).resolves.toMatchObject({ beiFengJin: false })
    假.db.query.mockResolvedValueOnce({ rows: [{ 违规次数: 2, 级别: 'feng_jin_1_tian', 解封时间: new Date(Date.now() + 100000), 最后原因: '原因', 申诉状态: 'shen_su_zhong' }] })
    await expect(chaXunZhangHaoFengJin('用户')).resolves.toMatchObject({ beiFengJin: true, jiBie: 'feng_jin_1_tian', weiGuiCiShu: 2, shenSuZhuangTai: 'shen_su_zhong' })
    假.db.query.mockResolvedValueOnce({ rows: [{ 违规次数: 2, 级别: '坏值', 解封时间: new Date(Date.now() - 100000), 申诉状态: '坏值' }] })
    await expect(chaXunZhangHaoFengJin('用户')).resolves.toMatchObject({ beiFengJin: false, jiBie: 'zheng_chang', shenSuZhuangTai: 'wu' })
  })

  it('记录违规按数据库次数锁分级并覆盖回滚、媒体和副作用失败', async () => {
    let 上次 = 0
    假.client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return { rows: 上次 > 0 ? [{ 违规次数: 上次 }] : [] }
      return { rows: [] }
    })
    for (const 次数 of [1, 2, 3, 4]) {
      上次 = 次数 - 1
      const 结果 = await jiLuZhangHaoWeiGui({ yongHuId: `用户${次数}`, ip: '1.1.1.1', yuanYin: '原因', leiXing: '测试' })
      expect(结果.ciShu).toBe(次数)
      expect(结果.jiBie).toBe(次数 === 1 ? 'feng_jin_1_fen' : 次数 === 2 ? 'feng_jin_1_tian' : 'yong_feng')
    }
    假.client.query.mockImplementation(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK' || sql === 'COMMIT') return { rows: [] }
      if (sql.includes('FOR UPDATE')) return { rows: [] }
      throw new Error('事务失败')
    })
    await expect(jiLuZhangHaoWeiGui({ yongHuId: '回滚', ip: '1.1.1.1', yuanYin: '原因', leiXing: '测试' })).rejects.toThrow('事务失败')
    假.client.query.mockResolvedValue({ rows: [] })
    假.media.cheXiaoYongHuMeiTiQianMing.mockRejectedValueOnce(new Error('媒体失败'))
    await expect(jiLuZhangHaoWeiGui({ yongHuId: '媒体失败', ip: '1.1.1.1', yuanYin: '原因', leiXing: '测试' })).resolves.toMatchObject({ ciShu: 1 })
    假.notify.chuangJianTongZhi.mockRejectedValueOnce(new Error('通知失败'))
    假.audit.jiLuShenJiRiZhi.mockRejectedValueOnce(new Error('审计失败'))
    await expect(jiLuZhangHaoWeiGui({ yongHuId: '副作用失败', ip: '1.1.1.1', yuanYin: '原因', leiXing: '测试' })).resolves.toMatchObject({ ciShu: 1 })
    假.redis.set.mockRejectedValueOnce(new Error('缓存失败'))
    await expect(jiLuZhangHaoWeiGui({ yongHuId: '缓存失败', ip: '1.1.1.1', yuanYin: '原因', leiXing: '测试' })).resolves.toMatchObject({ ciShu: 1 })
  })

  it('撤回消息覆盖聊天、好友、零行和数据库异常', async () => {
    假.db.query.mockResolvedValueOnce({ rowCount: 1 })
    await expect(cheHuiWeiGuiXiaoXi('liaoTian', '消息')).resolves.toBe(true)
    假.db.query.mockResolvedValueOnce({ rowCount: 0 })
    await expect(cheHuiWeiGuiXiaoXi('haoYou', '消息')).resolves.toBe(false)
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await expect(cheHuiWeiGuiXiaoXi('liaoTian', '消息')).resolves.toBe(false)
  })

  it('申诉、管理员审核、解封和列表输出覆盖成功与降级', async () => {
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(tiJiaoShenSu('用户', '理由')).resolves.toEqual({ cheng_gong: false })
    假.db.query.mockResolvedValueOnce({ rows: [{ 违规次数: 1, 级别: 'feng_jin_1_fen', 解封时间: new Date(Date.now() + 100000), 申诉状态: 'wu' }] })
    await expect(tiJiaoShenSu('用户', '  ')).resolves.toEqual({ cheng_gong: false })
    假.db.query.mockResolvedValueOnce({ rows: [{ 违规次数: 1, 级别: 'feng_jin_1_fen', 解封时间: new Date(Date.now() + 100000), 申诉状态: 'wu' }] })
    await expect(tiJiaoShenSu('用户', '理由')).resolves.toEqual({ cheng_gong: true })
    假.db.query.mockResolvedValue({ rows: [] })
    假.notify.chuangJianTongZhi.mockRejectedValue(new Error('通知失败'))
    假.audit.jiLuShenJiRiZhi.mockRejectedValue(new Error('审计失败'))
    await expect(shenHeShenSu('管理员', '用户', true, '1.1.1.1')).resolves.toBeUndefined()
    await expect(shenHeShenSu('管理员', '用户', false, '1.1.1.1')).resolves.toBeUndefined()
    假.media.cheXiaoYongHuMeiTiQianMing.mockRejectedValue(new Error('媒体失败'))
    await expect(jieChuZhangHaoFengJin('管理员', '用户', '1.1.1.1')).resolves.toBeUndefined()
    假.db.query.mockResolvedValueOnce({ rows: [{ 用户ID: '用户', 违规次数: '2', 级别: 'yong_feng', 解封时间: null, 申诉状态: 'bo_hui', 最后原因: '原因' }] })
    await expect(lieChuFengJinShenSu()).resolves.toEqual([{ yong_hu_id: '用户', wei_gui_ci_shu: 2, ji_bie: 'yong_feng', jie_feng_shi_jian: null, shen_su_zhuang_tai: 'bo_hui', yuan_yin: '原因' }])
  })
})
