import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Server } from 'socket.io'
import { luoKuChuFaJiaoSeTiaoDuQi, 清理调度器映射 } from '../聊天'
import { debug日志, jiLuXiaoXiCaoZuo } from '../../utils/debug日志'
import { redis } from '../../redis'

const 常 = vi.hoisted(() => ({
  用户ID: '22222222-2222-4222-8222-222222222222',
  角色ID: '11111111-1111-4111-8111-111111111111',
}))

const 假 = vi.hoisted(() => {
  type 假调度器 = {
    角色ID: string
    用户ID: string
    处理用户消息: ReturnType<typeof vi.fn>
    重置: ReturnType<typeof vi.fn>
  }
  return {
    调度器实例: [] as 假调度器[],
    /** Redis 认领锁的仿真台账：键 → 认领者标识；存在即代表 NX 写入会失败 */
    在册认领者: new Map<string, string>(),
    /** 模拟 Redis 读取抖动（get 抛错）：不得据此判死在跑轮次 */
    读取抛错: false,
    续期调用: [] as Array<{ 键: string; 毫秒: number }>,
  }
})

const 锁键 = `tiao_du_qi_suo:${常.用户ID}:${常.角色ID}`
const 锁TTL毫秒 = 30000

vi.mock('../../services/AI回复调度器', () => ({
  AI回复调度器: vi.fn(function (角色ID: string, 用户ID: string) {
    const 实例 = {
      角色ID,
      用户ID,
      处理用户消息: vi.fn().mockResolvedValue(undefined),
      重置: vi.fn(),
    }
    假.调度器实例.push(实例)
    return 实例
  }),
}))

vi.mock('../../redis', () => ({
  redis: {
    set: vi.fn(async (键: string, 认领者: string) => {
      if (假.在册认领者.has(键)) return null
      假.在册认领者.set(键, 认领者)
      return 'OK'
    }),
    get: vi.fn(async (键: string) => {
      if (假.读取抛错) throw new Error('REDIS_DOWN connection refused')
      return 假.在册认领者.get(键) ?? null
    }),
    del: vi.fn(async (键: string) => {
      假.在册认领者.delete(键)
      return 1
    }),
    pexpire: vi.fn(async (键: string, 毫秒: number) => {
      假.续期调用.push({ 键, 毫秒 })
      return 1
    }),
    publish: vi.fn(async () => 1),
    incr: vi.fn(async () => 1),
  },
}))

vi.mock('../../services/AI输入准备', () => ({
  huoQuJiaoSeIELeiXing: vi.fn(async () => 'E' as const),
  huoQuJiaoSeHuiFuYanChiHaoMiao: vi.fn(async () => 1000),
}))

vi.mock('../../services/夺舍', () => ({
  huoQuJiaoSeYongHuId: vi.fn(async () => 常.用户ID),
  jiaoSeShiFouBeiDuoShe: vi.fn(async () => false),
}))

vi.mock('../夺舍', () => ({
  zhuanFaYongHuXiaoXiGeiGuanLiYuan: vi.fn(async () => undefined),
}))

vi.mock('../../utils/debug日志', () => ({
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../socket/io', () => ({
  huoQuIo: vi.fn(() => ({ to: vi.fn(() => ({ emit: vi.fn() })) }) as unknown as Server),
}))

const 落库消息 = {
  id: '999',
  hui_hua_id: 常.角色ID,
  fa_song_zhe_id: 常.用户ID,
  fa_song_zhe_lei_xing: 'yonghu' as const,
  ai_biao_shi: false,
  nei_rong: '我插入的一句',
  lei_xing: 'wenben',
  shi_jian_chuo: 1700000000000,
  yi_du: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  清理调度器映射()
  假.调度器实例.length = 0
  假.在册认领者.clear()
  假.读取抛错 = false
  假.续期调用.length = 0
})

afterEach(() => {
  清理调度器映射()
  vi.useRealTimers()
})

describe('FP-09 调度器认领锁续期（F19 跨进程双调度器）', () => {
  it('认领锁以 PX 30000 + NX 写入，认领者是进程标识而非 socket.id', async () => {
    await luoKuChuFaJiaoSeTiaoDuQi(常.用户ID, 常.角色ID, 落库消息)

    expect(假.调度器实例).toHaveLength(1)
    const 写锁 = vi.mocked(redis.set).mock.calls.find((次) => 次[0] === 锁键)
    expect(写锁, '认领锁必须写在 tiao_du_qi_suo:用户:角色 上').toBeDefined()
    expect(写锁?.[3]).toBe(锁TTL毫秒)
    expect(写锁?.[4]).toBe('NX')
    expect(假.在册认领者.get(锁键)).toMatch(/^\d+-/)
  })

  it('本地调度器存活期间持续续期，锁不在 TTL 内先到期', async () => {
    await luoKuChuFaJiaoSeTiaoDuQi(常.用户ID, 常.角色ID, 落库消息)
    const 实例 = 假.调度器实例[0]!

    // 推进 20s（< TTL 30s）：锁必须已被续期，否则旧实现此时锁已蒸发
    await vi.advanceTimersByTimeAsync(20000)

    const 本锁续期 = 假.续期调用.filter((次) => 次.键 === 锁键)
    expect(本锁续期.length, '锁在 TTL 内未续期 ⇒ 过期后别的进程可建第二实例').toBeGreaterThan(0)
    expect(本锁续期.every((次) => 次.毫秒 === 锁TTL毫秒)).toBe(true)
    expect(实例.重置, '仍持有锁时不得作废在跑轮次').not.toHaveBeenCalled()
  })

  it('锁易主时本进程立即作废轮次并放弃记录，不再冒用他人锁新建第二实例', async () => {
    await luoKuChuFaJiaoSeTiaoDuQi(常.用户ID, 常.角色ID, 落库消息)
    const 实例 = 假.调度器实例[0]!
    expect(实例.处理用户消息).toHaveBeenCalledTimes(1)

    // 别的进程抢到锁（旧锁过期后被认领）
    假.在册认领者.set(锁键, 'other-pid-999')
    await vi.advanceTimersByTimeAsync(10000)

    expect(实例.重置, '锁易主后旧轮次仍在投递即双 AI 回复').toHaveBeenCalledTimes(1)
    expect(假.续期调用.filter((次) => 次.键 === 锁键)).toHaveLength(0)

    // 本进程记录已丢弃：再次落库只留痕跳过，绝不新建第二实例
    await luoKuChuFaJiaoSeTiaoDuQi(常.用户ID, 常.角色ID, { ...落库消息, id: '1000' })
    expect(假.调度器实例).toHaveLength(1)
    expect(实例.处理用户消息).toHaveBeenCalledTimes(1)
    expect(
      vi.mocked(jiLuXiaoXiCaoZuo).mock.calls.some((次) => 次[0] === '用户消息落库但AI触发被跳过'),
      '跳过必须留痕，供跨进程部署排障',
    ).toBe(true)
  })

  it('Redis 读取抖动不误杀在跑轮次，也不抛未捕获异常', async () => {
    await luoKuChuFaJiaoSeTiaoDuQi(常.用户ID, 常.角色ID, 落库消息)
    const 实例 = 假.调度器实例[0]!
    假.读取抛错 = true

    let 推进异常: unknown = null
    try {
      await vi.advanceTimersByTimeAsync(20000)
    } catch (错) {
      推进异常 = 错
    }
    expect(推进异常).toBeNull()

    expect(实例.重置, 'Redis 抖动一次就把轮次判死，等于用户永远等不到回复').not.toHaveBeenCalled()
    expect(假.续期调用).toHaveLength(0)
    expect(假.在册认领者.get(锁键), '读取失败不得顺手删锁').toBeTruthy()
  })
})

describe('FP-09 触发链的驱动消息与认领失败口径（F16/F18）', () => {
  it('落库触发把「刚落库那条消息的 ID」作为驱动消息传给调度器', async () => {
    await luoKuChuFaJiaoSeTiaoDuQi(常.用户ID, 常.角色ID, 落库消息)

    expect(假.调度器实例[0]!.处理用户消息).toHaveBeenCalledWith(落库消息.id)
  })

  it('消息缺 ID 时不触发也不抛错（脏 payload 优雅降级）', async () => {
    await expect(
      luoKuChuFaJiaoSeTiaoDuQi(常.用户ID, 常.角色ID, { ...落库消息, id: '' }),
    ).resolves.toBeUndefined()
    expect(假.调度器实例).toHaveLength(0)
  })

  it('认领失败既留 warn 也留消息操作记录，且不产生第二调度器', async () => {
    假.在册认领者.set(锁键, 'other-pid-111')

    await expect(luoKuChuFaJiaoSeTiaoDuQi(常.用户ID, 常.角色ID, 落库消息)).resolves.toBeUndefined()

    expect(假.调度器实例).toHaveLength(0)
    expect(vi.mocked(debug日志.warn)).toHaveBeenCalled()
    expect(jiLuXiaoXiCaoZuo).toHaveBeenCalledWith(
      '用户消息落库但AI触发被跳过',
      常.用户ID,
      常.角色ID,
      'yonghu',
      expect.objectContaining({ xiao_xi_id: 落库消息.id, chu_fa: 'tiao_du_qi_ren_ling_shi_bai' }),
    )
    expect(
      假.续期调用,
      '未持有锁的进程不得对他人锁做任何操作',
    ).toHaveLength(0)
  })
})
