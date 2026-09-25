import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  redis: { lrange: vi.fn(), lpush: vi.fn(), ltrim: vi.fn(), expire: vi.fn(), set: vi.fn(), get: vi.fn(), del: vi.fn() },
  debug: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import { baoCunJunShiHaXi, baoCunJunShiJiLu, huoQuJunShiJiLuLieBiao, huoQuJunShiZhiDaoZhuangTai, jianChaJunShiChongFu, jiSuanLiaoTianHaXi, shanChuJunShiZhiDaoZhuangTai, sheZhiJunShiZhiDaoZhuangTai } from '../军师缓存'

const 记录 = { jian_yi: '建议', shi_jian: '现在', jiao_se_id: '角色', jiao_se_ming_zi: '角色名', jun_shi_id: '军师', jun_shi_ming_chen: '军师名', jun_shi_tou_xiang: '', dui_hua_zhai_yao: '', liao_tian_ji_lu: [], hou_tai_shu_ju: { hao_gan_du: { zong_fen: 0, xin_ren_du: 0, qin_mi_du: 0, qu_wei_du: 0, guan_huai_du: 0, guan_xi_jie_duan: '冷淡' }, fu_pan_tiao_mu: [] } }
const 状态 = { zhuang_tai: 'zhi_dao_zhong' as const, jun_shi_id: '军师', kai_shi_shi_jian: '现在', you_liao_tian_ji_lu: false }

beforeEach(() => {
  vi.clearAllMocks()
  假.redis.lrange.mockResolvedValue([])
  假.redis.lpush.mockResolvedValue(1)
  假.redis.ltrim.mockResolvedValue('OK')
  假.redis.expire.mockResolvedValue(1)
  假.redis.set.mockResolvedValue('OK')
  假.redis.get.mockResolvedValue(null)
  假.redis.del.mockResolvedValue(1)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('军师缓存业务分支', () => {
  it('哈希只纳入未撤回非系统消息且结果稳定', () => {
    const 消息 = [
      { fa_song_zhe_lei_xing: 'yonghu', nei_rong: '你好', shi_jian_chuo: 0, yi_che_hui: false },
      { fa_song_zhe_lei_xing: 'jiaose', nei_rong: '回复', shi_jian_chuo: 0, yi_che_hui: false },
      { fa_song_zhe_lei_xing: 'yonghu', nei_rong: '撤回', shi_jian_chuo: 0, yi_che_hui: true },
      { fa_song_zhe_lei_xing: 'xitong', nei_rong: '系统', shi_jian_chuo: 0, yi_che_hui: false },
    ] as never[]
    const 哈希 = jiSuanLiaoTianHaXi(消息)
    expect(哈希).toHaveLength(64)
    expect(jiSuanLiaoTianHaXi(消息)).toBe(哈希)
  })

  it('重复检查、哈希和记录保存读取覆盖成功与 Redis 异常', async () => {
    假.redis.lrange.mockResolvedValueOnce(['hash'])
    await expect(jianChaJunShiChongFu('用户', '角色', 'hash')).resolves.toBe(true)
    假.redis.lpush.mockRejectedValueOnce(new Error('redis'))
    await baoCunJunShiHaXi('用户', '角色', 'hash')
    await baoCunJunShiJiLu('用户', '角色', 记录 as never)
    假.redis.lrange.mockResolvedValueOnce([JSON.stringify(记录)])
    await expect(huoQuJunShiJiLuLieBiao('用户', '角色')).resolves.toHaveLength(1)
    假.redis.lrange.mockRejectedValueOnce(new Error('redis'))
    await expect(huoQuJunShiJiLuLieBiao('用户', '角色')).resolves.toEqual([])
    expect(假.debug.error).toHaveBeenCalled()
  })

  it('指导状态覆盖保存、读取、删除和异常降级', async () => {
    await sheZhiJunShiZhiDaoZhuangTai('用户', '角色', 状态)
    expect(假.redis.set).toHaveBeenCalledWith(expect.stringContaining('军师指导状态'), JSON.stringify(状态), 'EX', 300)
    await expect(huoQuJunShiZhiDaoZhuangTai('用户', '角色')).resolves.toBeNull()
    假.redis.get.mockResolvedValueOnce(JSON.stringify(状态))
    await expect(huoQuJunShiZhiDaoZhuangTai('用户', '角色')).resolves.toEqual(状态)
    await shanChuJunShiZhiDaoZhuangTai('用户', '角色')
    假.redis.set.mockRejectedValueOnce(new Error('redis'))
    假.redis.get.mockRejectedValueOnce(new Error('redis'))
    假.redis.del.mockRejectedValueOnce(new Error('redis'))
    await sheZhiJunShiZhiDaoZhuangTai('用户', '角色', 状态)
    await expect(huoQuJunShiZhiDaoZhuangTai('用户', '角色')).resolves.toBeNull()
    await shanChuJunShiZhiDaoZhuangTai('用户', '角色')
  })
})
