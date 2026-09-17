process.env.ADMIN_PHONES = '13800000000'
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://lovewithme:test-password@localhost:5432/lovewithme'
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-bytes-long'
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test'
}

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/好感度')
vi.mock('../数据库')
vi.mock('../services/消息', async (yuanShi) => {
  const shiJi = await yuanShi<typeof import('../services/消息')>()
  return { ...shiJi, baoCunJiaoSeMeiTiXiaoXi: vi.fn() }
})
vi.mock('../redis', () => ({
  redis: { get: vi.fn(), incr: vi.fn(), expire: vi.fn(), decr: vi.fn() },
}))
vi.mock('../socket/io', () => ({ huoQuIo: vi.fn(() => null) }))
vi.mock('../services/媒体存储', async (yuanShi) => {
  const shiJi = await yuanShi<typeof import('../services/媒体存储')>()
  return { ...shiJi, liuShiBaoCunMeiTi: vi.fn() }
})

import { huoQuWanZhengHaoGanDu } from '../services/好感度'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { liuShiBaoCunMeiTi } from '../services/媒体存储'
import { baoCunJiaoSeMeiTiXiaoXi } from '../services/消息'
import {
  panDuanKeFouZhuDongShengTu,
  huoQuZhuDongShengTuZiGe,
  changShiZhuDongShengTu,
} from '../services/主动多模态'

describe('主动生图资格判定', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(redis.get).mockResolvedValue('0')
    vi.mocked(redis.incr).mockResolvedValue(1)
    vi.mocked(redis.expire).mockResolvedValue(1)
  })

  it('封存角色直接无资格', () => {
    expect(
      panDuanKeFouZhuDongShengTu({ zongFen: 999, waiMao: '俊朗', fengCun: true, suiJiShu: 0, gaiLv: 1, zuiDiFen: 100 }),
    ).toBe(false)
  })

  it('无外貌描述直接无资格', () => {
    expect(
      panDuanKeFouZhuDongShengTu({ zongFen: 999, waiMao: '  ', fengCun: false, suiJiShu: 0, gaiLv: 1, zuiDiFen: 100 }),
    ).toBe(false)
  })

  it('好感度未达门槛无资格', () => {
    expect(
      panDuanKeFouZhuDongShengTu({ zongFen: 50, waiMao: '俊朗', fengCun: false, suiJiShu: 0, gaiLv: 1, zuiDiFen: 100 }),
    ).toBe(false)
  })

  it('随机数超出概率无资格', () => {
    expect(
      panDuanKeFouZhuDongShengTu({ zongFen: 500, waiMao: '俊朗', fengCun: false, suiJiShu: 0.9, gaiLv: 0.08, zuiDiFen: 100 }),
    ).toBe(false)
  })

  it('达标且命中概率有资格', () => {
    expect(
      panDuanKeFouZhuDongShengTu({ zongFen: 500, waiMao: '俊朗', fengCun: false, suiJiShu: 0.01, gaiLv: 0.08, zuiDiFen: 100 }),
    ).toBe(true)
  })

  it('好感度缺失时按无资格降级不抛错', async () => {
    vi.mocked(huoQuWanZhengHaoGanDu).mockResolvedValue(null)
    const ziGe = await huoQuZhuDongShengTuZiGe('yong-hu-1', 'jiao-se-1')
    expect(ziGe.keYi).toBe(false)
    expect(ziGe.zongFen).toBe(0)
  })

  it('角色不存在时按无资格降级', async () => {
    vi.mocked(huoQuWanZhengHaoGanDu).mockResolvedValue({ zong_fen: 500 } as never)
    vi.mocked(数据库.query).mockResolvedValue({ rows: [] } as never)
    const ziGe = await huoQuZhuDongShengTuZiGe('yong-hu-1', 'jiao-se-1')
    expect(ziGe.keYi).toBe(false)
    expect(ziGe.fengCun).toBe(true)
  })

  it('FP-05 YH-036 单次判定：命中概率+未达日上限+生图成功 → 落库推送返回true', async () => {
    vi.mocked(huoQuWanZhengHaoGanDu).mockResolvedValue({ zong_fen: 700 } as never)
    vi.mocked(数据库.query).mockResolvedValue({ rows: [{ 外貌: '清秀长发', 封存: false }] } as never)
    vi.mocked(liuShiBaoCunMeiTi).mockResolvedValue({ mediaId: 'm-1', sha256: 'a'.repeat(64), mime: 'image/png', daXiao: 10, leiBie: 'tupian', yuanShiWenJianMing: 'x.png' })
    vi.mocked(baoCunJiaoSeMeiTiXiaoXi).mockResolvedValue({ id: 'x-1' } as never)
    const { sheZhiShengTuMock } = await import('../services/图像生成')
    sheZhiShengTuMock(async () => ({ cheng_gong: true, tuPianZiJie: Buffer.from('tu'), mime: 'image/png' }))
    try {
      const jieGuo = await changShiZhuDongShengTu({ yongHuId: 'u-1', jiaoSeId: 'j-1', huiFuWenBen: '今晚月色真美', suiJiShu: 0 })
      expect(jieGuo).toBe(true)
      expect(vi.mocked(baoCunJiaoSeMeiTiXiaoXi)).toHaveBeenCalled()
    } finally {
      sheZhiShengTuMock(null)
    }
  })

  it('FP-05 YH-036 日上限已满 → 直接返回false不生图', async () => {
    vi.mocked(huoQuWanZhengHaoGanDu).mockResolvedValue({ zong_fen: 700 } as never)
    vi.mocked(数据库.query).mockResolvedValue({ rows: [{ 外貌: '清秀长发', 封存: false }] } as never)
    vi.mocked(redis.get).mockResolvedValue('3')
    const jieGuo = await changShiZhuDongShengTu({ yongHuId: 'u-1', jiaoSeId: 'j-1', huiFuWenBen: 'hi', suiJiShu: 0 })
    expect(jieGuo).toBe(false)
  })
})
