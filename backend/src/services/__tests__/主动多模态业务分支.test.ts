import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  db: { query: vi.fn() },
  redis: { get: vi.fn(), incr: vi.fn(), expire: vi.fn() },
  hao: { huoQuWanZhengHaoGanDu: vi.fn() },
  image: { shengChengTuXiang: vi.fn() },
  media: { liuShiBaoCunMeiTi: vi.fn() },
  message: { baoCunJiaoSeMeiTiXiaoXi: vi.fn() },
  io: { huoQuIo: vi.fn() },
  debug: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('../好感度', () => ({ huoQuWanZhengHaoGanDu: 假.hao.huoQuWanZhengHaoGanDu }))
vi.mock('../图像生成', () => ({ shengChengTuXiang: 假.image.shengChengTuXiang }))
vi.mock('../媒体存储', () => ({ liuShiBaoCunMeiTi: 假.media.liuShiBaoCunMeiTi }))
vi.mock('../消息', () => ({ baoCunJiaoSeMeiTiXiaoXi: 假.message.baoCunJiaoSeMeiTiXiaoXi }))
vi.mock('../../socket/io', () => ({ huoQuIo: 假.io.huoQuIo }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import { changShiZhuDongShengTu, huoQuZhuDongShengTuZiGe, panDuanKeFouZhuDongShengTu } from '../主动多模态'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('TU_XIANG_SHENG_CHENG_QI_YONG', 'true')
  vi.stubEnv('ZHU_DONG_SHENG_TU_ZUI_DI_ZONG_FEN', '10')
  vi.stubEnv('ZHU_DONG_SHENG_TU_GAI_LV', '1')
  vi.stubEnv('ZHU_DONG_SHENG_TU_RI_SHANG_XIAN', '2')
  假.db.query.mockResolvedValue({ rows: [{ 外貌: '短发', 封存: false }] })
  假.redis.get.mockResolvedValue('0')
  假.redis.incr.mockResolvedValue(1)
  假.redis.expire.mockResolvedValue(1)
  假.hao.huoQuWanZhengHaoGanDu.mockResolvedValue({ zong_fen: 100 })
  假.image.shengChengTuXiang.mockResolvedValue({ cheng_gong: true, tuPianZiJie: Buffer.from('图'), mime: 'image/png' })
  假.media.liuShiBaoCunMeiTi.mockResolvedValue({ mediaId: '媒体' })
  假.message.baoCunJiaoSeMeiTiXiaoXi.mockResolvedValue({ id: '消息' })
  假.io.huoQuIo.mockReturnValue(null)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('主动多模态业务分支', () => {
  it('资格判断覆盖封存、无外貌、低分和随机门槛', () => {
    expect(panDuanKeFouZhuDongShengTu({ zongFen: 100, waiMao: '短发', fengCun: true, suiJiShu: 0, gaiLv: 1, zuiDiFen: 10 })).toBe(false)
    expect(panDuanKeFouZhuDongShengTu({ zongFen: 100, waiMao: '', fengCun: false, suiJiShu: 0, gaiLv: 1, zuiDiFen: 10 })).toBe(false)
    expect(panDuanKeFouZhuDongShengTu({ zongFen: 9, waiMao: '短发', fengCun: false, suiJiShu: 0, gaiLv: 1, zuiDiFen: 10 })).toBe(false)
    expect(panDuanKeFouZhuDongShengTu({ zongFen: 100, waiMao: '短发', fengCun: false, suiJiShu: 0.9, gaiLv: 1, zuiDiFen: 10 })).toBe(true)
  })

  it('资格查询覆盖无好感、无角色和正常角色', async () => {
    假.hao.huoQuWanZhengHaoGanDu.mockResolvedValueOnce(null)
    await expect(huoQuZhuDongShengTuZiGe('用户', '角色')).resolves.toMatchObject({ keYi: false, fengCun: true })
    假.hao.huoQuWanZhengHaoGanDu.mockResolvedValueOnce({ zong_fen: 100 })
    假.db.query.mockResolvedValueOnce({ rows: [] })
    await expect(huoQuZhuDongShengTuZiGe('用户', '角色')).resolves.toMatchObject({ keYi: false })
    假.hao.huoQuWanZhengHaoGanDu.mockResolvedValueOnce({ zong_fen: 100 })
    假.db.query.mockResolvedValueOnce({ rows: [{ 外貌: '', 封存: false }] })
    await expect(huoQuZhuDongShengTuZiGe('用户', '角色')).resolves.toMatchObject({ keYi: false, waiMao: '' })
  })

  it('生成流程覆盖开关、异常、门槛、日限额、失败和成功通知', async () => {
    vi.stubEnv('TU_XIANG_SHENG_CHENG_QI_YONG', 'false')
    await expect(changShiZhuDongShengTu({ yongHuId: '用户', jiaoSeId: '角色', huiFuWenBen: '回复' })).resolves.toBe(false)
    vi.stubEnv('TU_XIANG_SHENG_CHENG_QI_YONG', 'true')
    假.hao.huoQuWanZhengHaoGanDu.mockRejectedValueOnce(new Error('查询失败'))
    await expect(changShiZhuDongShengTu({ yongHuId: '用户', jiaoSeId: '角色', huiFuWenBen: '回复' })).resolves.toBe(false)
    假.hao.huoQuWanZhengHaoGanDu.mockResolvedValueOnce({ zong_fen: 0 })
    await expect(changShiZhuDongShengTu({ yongHuId: '用户', jiaoSeId: '角色', huiFuWenBen: '回复' })).resolves.toBe(false)
    假.hao.huoQuWanZhengHaoGanDu.mockResolvedValue({ zong_fen: 100 })
    假.redis.get.mockResolvedValue('2')
    await expect(changShiZhuDongShengTu({ yongHuId: '用户', jiaoSeId: '角色', huiFuWenBen: '回复', suiJiShu: 0 })).resolves.toBe(false)
    假.redis.get.mockResolvedValue('0')
    假.image.shengChengTuXiang.mockResolvedValueOnce({ cheng_gong: false })
    await expect(changShiZhuDongShengTu({ yongHuId: '用户', jiaoSeId: '角色', huiFuWenBen: '回复', suiJiShu: 0 })).resolves.toBe(false)
    假.image.shengChengTuXiang.mockResolvedValueOnce({ cheng_gong: true, tuPianZiJie: Buffer.from('图') })
    假.media.liuShiBaoCunMeiTi.mockRejectedValueOnce(new Error('保存失败'))
    await expect(changShiZhuDongShengTu({ yongHuId: '用户', jiaoSeId: '角色', huiFuWenBen: '回复', suiJiShu: 0 })).resolves.toBe(false)
    假.media.liuShiBaoCunMeiTi.mockResolvedValue({ mediaId: '媒体' })
    假.message.baoCunJiaoSeMeiTiXiaoXi.mockRejectedValueOnce(new Error('消息失败'))
    await expect(changShiZhuDongShengTu({ yongHuId: '用户', jiaoSeId: '角色', huiFuWenBen: '回复', suiJiShu: 0 })).resolves.toBe(false)
    const emit = vi.fn()
    假.io.huoQuIo.mockReturnValue({ to: vi.fn(() => ({ emit })) })
    await expect(changShiZhuDongShengTu({ yongHuId: '用户', jiaoSeId: '角色', huiFuWenBen: '回复', suiJiShu: 0 })).resolves.toBe(true)
    expect(emit).toHaveBeenCalled()
  })
})
