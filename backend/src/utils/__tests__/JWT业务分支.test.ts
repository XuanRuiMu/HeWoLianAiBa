import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  redis: { set: vi.fn(), sadd: vi.fn(), expire: vi.fn(), eval: vi.fn(), exists: vi.fn(), smembers: vi.fn(), del: vi.fn(), srem: vi.fn(), get: vi.fn() },
  sign: vi.fn(() => 'signed-token'),
  verify: vi.fn(() => ({ yongHuId: '用户' })),
}))

vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('jsonwebtoken', () => ({ default: { sign: 假.sign, verify: 假.verify } }))

import { peiZhi } from '../../config'
import { cheXiaoYongHuSuoYouRefreshToken, cunChuRefreshToken, huoQuCheXiaoJian, huoQuLingPaiZuiDaYouXiaoQiMiao, jianCeRefreshTokenChongFu, lingPaiShiFouYiCheXiao, shanChuRefreshToken, shengChengLingPai, xiaoHaoRefreshToken, xieRuCheXiaoShiJianCuo, yanZhengLingPai } from '../jwt'

const 原JwtGuoQi = peiZhi.jwtGuoQi

beforeEach(() => {
  vi.clearAllMocks()
  假.redis.set.mockResolvedValue('OK')
  假.redis.sadd.mockResolvedValue(1)
  假.redis.expire.mockResolvedValue(1)
  假.redis.eval.mockResolvedValue(1)
  假.redis.exists.mockResolvedValue(0)
  假.redis.smembers.mockResolvedValue([])
  假.redis.del.mockResolvedValue(1)
  假.redis.srem.mockResolvedValue(1)
  假.redis.get.mockResolvedValue(null)
  peiZhi.jwtGuoQi = '25m'
})

afterEach(() => {
  peiZhi.jwtGuoQi = 原JwtGuoQi
  vi.restoreAllMocks()
})

describe('JWT与刷新令牌业务分支', () => {
  it('存储、吊销、删除刷新令牌覆盖有无数据分支', async () => {
    await cunChuRefreshToken('用户', '令牌')
    expect(假.redis.set).toHaveBeenCalledWith('refresh_token:用户:令牌', '用户', 'EX', expect.any(Number))
    await cheXiaoYongHuSuoYouRefreshToken('用户')
    假.redis.smembers.mockResolvedValueOnce(['令牌1', '令牌2'])
    await cheXiaoYongHuSuoYouRefreshToken('用户')
    expect(假.redis.del).toHaveBeenCalledWith('refresh_token:用户:令牌1', 'refresh_token:用户:令牌2')
    await shanChuRefreshToken('令牌', '用户')
    expect(假.redis.srem).toHaveBeenCalledWith('refresh_token_user:用户', '令牌')
  })

  it('消费 Lua 结果覆盖成功、用户不匹配和不存在', async () => {
    假.redis.eval.mockResolvedValueOnce(1)
    await expect(xiaoHaoRefreshToken('令牌', '用户')).resolves.toEqual({ chengGong: true })
    假.redis.eval.mockResolvedValueOnce(-1)
    await expect(xiaoHaoRefreshToken('令牌', '用户')).resolves.toMatchObject({ chengGong: false })
    假.redis.eval.mockResolvedValueOnce(0)
    await expect(xiaoHaoRefreshToken('令牌', '用户')).resolves.toMatchObject({ chengGong: false })
  })

  it('复用检测覆盖墓碑不存在、活跃和已消费', async () => {
    假.redis.exists.mockResolvedValueOnce(0)
    await expect(jianCeRefreshTokenChongFu('令牌', '用户')).resolves.toBe(false)
    假.redis.exists.mockResolvedValueOnce(1).mockResolvedValueOnce(1)
    await expect(jianCeRefreshTokenChongFu('令牌', '用户')).resolves.toBe(false)
    假.redis.exists.mockResolvedValueOnce(1).mockResolvedValueOnce(0)
    await expect(jianCeRefreshTokenChongFu('令牌', '用户')).resolves.toBe(true)
  })

  it('有效期解析和注销时间判断覆盖格式、时间来源和边界', async () => {
    peiZhi.jwtGuoQi = '2s'
    expect(huoQuLingPaiZuiDaYouXiaoQiMiao()).toBe(2)
    peiZhi.jwtGuoQi = '坏格式'
    expect(huoQuLingPaiZuiDaYouXiaoQiMiao()).toBe(1500)
    expect(huoQuCheXiaoJian('用户')).toBe('jwt_yong_hu_cheXiao:用户')
    await xieRuCheXiaoShiJianCuo('用户')
    expect(假.redis.set).toHaveBeenCalledWith('jwt_yong_hu_cheXiao:用户', expect.any(String), 'EX', 1500)
    await expect(lingPaiShiFouYiCheXiao('')).resolves.toBe(false)
    await expect(lingPaiShiFouYiCheXiao('用户')).resolves.toBe(false)
    假.redis.get.mockResolvedValue('1000')
    await expect(lingPaiShiFouYiCheXiao('用户')).resolves.toBe(false)
    await expect(lingPaiShiFouYiCheXiao('用户', 1)).resolves.toBe(true)
    await expect(lingPaiShiFouYiCheXiao('用户', 0, 1000)).resolves.toBe(true)
    await expect(lingPaiShiFouYiCheXiao('用户', 0, 1001)).resolves.toBe(false)
  })

  it('签发和验证显式固定 HS256 与载荷', () => {
    const 载荷 = { yongHuId: '用户', tokenType: 'refresh' as const }
    expect(shengChengLingPai(载荷)).toBe('signed-token')
    expect(假.sign).toHaveBeenCalledWith(expect.objectContaining({ ...载荷, qianFaHaoMiao: expect.any(Number) }), expect.any(String), expect.objectContaining({ algorithm: 'HS256' }))
    expect(yanZhengLingPai('token')).toEqual({ yongHuId: '用户' })
    expect(假.verify).toHaveBeenCalledWith('token', expect.any(String), { algorithms: ['HS256'] })
  })
})
