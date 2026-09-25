import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  gen: vi.fn(),
  full: vi.fn(),
  coefficient: vi.fn(),
  decay: vi.fn(),
  retry: vi.fn(),
  debug: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../utils/DeepSeek客户端', () => ({ genJuPeiZhiTiaoYong: 假.gen }))
vi.mock('../好感度', () => ({ huoQuWanZhengHaoGanDu: 假.full }))
vi.mock('../好感度缓存', () => ({ jiSuanXiShu: 假.coefficient, yingYongHuiHuaBaoDi: 假.decay }))
vi.mock('../重试队列', () => ({ paiRuZhongShiDuiLie: 假.retry }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import { pingPanHaoGanDuBianHua, pingPanHaoGanDuBianHuaNei, pingPanHaoGanDuPiLiang, pingPanHaoGanDuPiLiangNei } from '../好感度评判'

const 有效 = { 信任度变化: 10, 亲密度变化: 20, 趣味度变化: 30, 关怀度变化: 40, 理由: '理由' }

beforeEach(() => {
  vi.clearAllMocks()
  假.gen.mockResolvedValue({ neiRong: JSON.stringify(有效) })
  假.full.mockResolvedValue(null)
  假.coefficient.mockResolvedValue({ xiShu: 1, muBiaoQuXian: 0, lianXuWeiDaBiao: 0, pingJunShuaiJianHou: 0 })
  假.decay.mockImplementation(async (_jian, jieGuo) => jieGuo)
  假.retry.mockResolvedValue(undefined)
})

describe('好感度评判业务分支', () => {
  it('单条评判覆盖有效 JSON、无效 JSON、倍率、缓存、衰减和异常', async () => {
    await expect(pingPanHaoGanDuBianHua('用户', '回复', '角色')).resolves.toMatchObject({ xin_ren_du_bian_hua: 10, li_you: '理由' })
    假.full.mockResolvedValue({ zong_fen: 100, 互动次数: 2 })
    假.coefficient.mockResolvedValue({ xiShu: 2, muBiaoQuXian: 3, lianXuWeiDaBiao: 4, pingJunShuaiJianHou: 5 })
    await expect(pingPanHaoGanDuBianHuaNei('用户', '回复', '角色', undefined, undefined, '用户', '角色')).resolves.toMatchObject({ xiShu: 2, muBiaoQuXian: 3, lianXuWeiDaBiao: 4, pingJunShuaiJianHou: 5 })
    await expect(pingPanHaoGanDuBianHuaNei('用户', '回复', '角色', undefined, '会话')).resolves.toMatchObject({ jieGuo: { li_you: '理由' } })
    假.gen.mockResolvedValueOnce({ neiRong: '无效' })
    await expect(pingPanHaoGanDuBianHua('用户', '回复', '角色')).resolves.toMatchObject({ li_you: 'unknown' })
    假.gen.mockRejectedValueOnce(new Error('AI失败'))
    await expect(pingPanHaoGanDuBianHua('用户', '回复', '角色')).resolves.toMatchObject({ li_you: 'unknown' })
    expect(假.retry).toHaveBeenCalled()
  })

  it('批量评判覆盖空数组、单条、多条、无效输出和异常', async () => {
    await expect(pingPanHaoGanDuPiLiangNei('用户', [], '角色')).resolves.toMatchObject({ xiShu: 1, jieGuo: { li_you: '' } })
    await expect(pingPanHaoGanDuPiLiang('用户', ['回复'], '角色')).resolves.toMatchObject({ li_you: '理由' })
    await expect(pingPanHaoGanDuPiLiang('用户', ['回复1', '回复2'], '角色')).resolves.toMatchObject({ li_you: '理由' })
    假.gen.mockResolvedValueOnce({ neiRong: '{}' })
    await expect(pingPanHaoGanDuPiLiang('用户', ['回复1', '回复2'], '角色')).resolves.toMatchObject({ li_you: 'unknown' })
    假.gen.mockRejectedValueOnce(new Error('批量失败'))
    await expect(pingPanHaoGanDuPiLiang('用户', ['回复1', '回复2'], '角色')).resolves.toMatchObject({ li_you: 'unknown' })
  })
})
