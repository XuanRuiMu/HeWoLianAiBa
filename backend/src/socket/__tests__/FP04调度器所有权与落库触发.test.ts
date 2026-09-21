import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Server } from 'socket.io'
import { 初始化聊天Socket, luoKuChuFaJiaoSeTiaoDuQi, 清理调度器映射 } from '../聊天'
import { zhuanFaYongHuXiaoXiGeiGuanLiYuan } from '../夺舍'
import { huoQuJiaoSeIELeiXing } from '../../services/AI输入准备'

const 常 = vi.hoisted(() => ({
  用户ID: '22222222-2222-4222-8222-222222222222',
  角色ID: '11111111-1111-4111-8111-111111111111',
}))

const 假 = vi.hoisted(() => {
  type 假调度器 = {
    角色ID: string
    用户ID: string
    序号: number
    处理用户消息: ReturnType<typeof vi.fn>
    重置: ReturnType<typeof vi.fn>
  }
  return {
    调度器实例: [] as 假调度器[],
    推送记录: [] as { 房间: string; 事件: string; 数据: unknown }[],
    认领成功: true,
    被夺舍: false,
    /** 模拟 Redis 里现存的认领者标识（set 写入、释放时比对） */
    在册认领者: null as string | null,
    释放的锁: [] as string[],
  }
})

const 锁键 = `tiao_du_qi_suo:${常.用户ID}:${常.角色ID}`

vi.mock('../../services/AI回复调度器', () => ({
  AI回复调度器: vi.fn(function (角色ID: string, 用户ID: string) {
    const 实例 = {
      角色ID,
      用户ID,
      序号: 假.调度器实例.length + 1,
      处理用户消息: vi.fn().mockResolvedValue(undefined),
      重置: vi.fn(),
    }
    假.调度器实例.push(实例)
    return 实例
  }),
}))

vi.mock('../../redis', () => ({
  redis: {
    set: vi.fn(async (_键: string, 认领者: string) => {
      if (!假.认领成功) return null
      假.在册认领者 = 认领者
      return 'OK'
    }),
    get: vi.fn(async () => 假.在册认领者),
    del: vi.fn(async (键: string) => {
      假.释放的锁.push(键)
      假.在册认领者 = null
      return 1
    }),
    publish: vi.fn(async () => 1),
    incr: vi.fn(async () => 1),
    pexpire: vi.fn(async () => 1),
  },
}))

vi.mock('../../services/AI输入准备', () => ({
  huoQuJiaoSeIELeiXing: vi.fn(async () => 'E' as const),
  huoQuJiaoSeHuiFuYanChiHaoMiao: vi.fn(async () => 1000),
}))

vi.mock('../../services/夺舍', () => ({
  huoQuJiaoSeYongHuId: vi.fn(async () => 常.用户ID),
  jiaoSeShiFouBeiDuoShe: vi.fn(async () => 假.被夺舍),
}))

vi.mock('../夺舍', () => ({
  zhuanFaYongHuXiaoXiGeiGuanLiYuan: vi.fn(async () => undefined),
}))

vi.mock('../../utils/debug日志', () => ({
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// FP-19：加入聊天会按 FP-18 角色入口同步管理房间；本文件只测所有权时序，一律按非管理员（不入管理房间）
vi.mock('../../middleware/管理员', () => ({
  anYongHuIdJuBeiNengLi: vi.fn(async () => false),
}))

const 假Io = {
  on: vi.fn(),
  to: vi.fn(),
  emit: vi.fn(),
}

vi.mock('../../socket/io', () => ({
  huoQuIo: vi.fn(() => 假Io),
}))

type 假Socket = {
  id: string
  yong_hu: { yongHuId: string }
  监听: Record<string, (参数: unknown) => unknown>
  on: (事件: string, 处理: (参数: unknown) => unknown) => void
  emit: ReturnType<typeof vi.fn>
  join: ReturnType<typeof vi.fn>
  leave: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  触发: (事件: string, 参数?: unknown) => Promise<unknown>
}

function chuangJian假Socket(id: string): 假Socket {
  const 监听: Record<string, (参数: unknown) => unknown> = {}
  return {
    id,
    yong_hu: { yongHuId: 常.用户ID },
    监听,
    on: (事件: string, 处理: (参数: unknown) => unknown) => {
      监听[事件] = 处理
    },
    emit: vi.fn(),
    join: vi.fn(),
    // FP-19：加入聊天会按身份同步管理房间（非管理员走 leave），假 socket 必须实现同名 API
    leave: vi.fn(),
    disconnect: vi.fn(),
    触发: async (事件: string, 参数?: unknown) => await 监听[事件]?.(参数),
  }
}

function chuangJian连接处理() {
  const 连接监听: Array<(socket: unknown) => void> = []
  假Io.on = vi.fn((事件: string, 处理: (socket: unknown) => void) => {
    if (事件 === 'connection') 连接监听.push(处理)
  })
  假Io.to = vi.fn((房间: string) => ({
    emit: (事件: string, 数据: unknown) => 假.推送记录.push({ 房间, 事件, 数据 }),
  }))
  return 连接监听
}

async function jiaRuLiaoTian(socket: 假Socket, 角色ID: string = 常.角色ID) {
  const 连接监听 = chuangJian连接处理()
  初始化聊天Socket(假Io as unknown as Server)
  for (const 处理 of 连接监听) 处理(socket)
  await socket触发加入(socket, 角色ID)
}

async function socket触发加入(socket: 假Socket, 角色ID: string) {
  await socket.触发('加入聊天', 角色ID)
}

const 落库消息 = {
  id: '999',
  hui_hua_id: 常.角色ID,
  fa_song_zhe_id: 常.用户ID,
  fa_song_zhe_lei_xing: 'yonghu' as const,
  ai_biao_shi: false,
  nei_rong: '插话内容',
  lei_xing: 'wenben',
  shi_jian_chuo: 1700000000000,
  yi_du: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  清理调度器映射()
  假.调度器实例.length = 0
  假.推送记录.length = 0
  假.认领成功 = true
  假.被夺舍 = false
  假.在册认领者 = null
  假.释放的锁.length = 0
})

describe('FP-04 调度器单实例所有权', () => {
  it('同一 user:role 的两个 socket 加入聊天只产生一个调度器', async () => {
    const 甲 = chuangJian假Socket('socket-甲')
    const 乙 = chuangJian假Socket('socket-乙')
    await jiaRuLiaoTian(甲)
    await jiaRuLiaoTian(乙)

    expect(假.调度器实例).toHaveLength(1)
    expect(假.调度器实例[0]?.重置).not.toHaveBeenCalled()
  })

  it('Redis 认领失败时不新建也不覆盖已在跑的调度器', async () => {
    假.认领成功 = false
    const 甲 = chuangJian假Socket('socket-甲')
    await jiaRuLiaoTian(甲)
    expect(假.调度器实例).toHaveLength(0)

    假.认领成功 = true
    const 乙 = chuangJian假Socket('socket-乙')
    await jiaRuLiaoTian(乙)
    expect(假.调度器实例).toHaveLength(1)

    假.认领成功 = false
    const 丙 = chuangJian假Socket('socket-丙')
    await jiaRuLiaoTian(丙)
    expect(假.调度器实例).toHaveLength(1)
    expect(假.调度器实例[0]?.重置).not.toHaveBeenCalled()
  })

  it('归属 socket 全部断开才重置调度器，多标签下单个标签断开不误杀', async () => {
    const 甲 = chuangJian假Socket('socket-甲')
    const 乙 = chuangJian假Socket('socket-乙')
    await jiaRuLiaoTian(甲)
    await jiaRuLiaoTian(乙)
    const 唯一 = 假.调度器实例[0]
    expect(唯一).toBeDefined()

    await 甲.触发('disconnect')
    expect(唯一?.重置).not.toHaveBeenCalled()

    await 乙.触发('disconnect')
    expect(唯一?.重置).toHaveBeenCalledTimes(1)
  })

  it('后端不再监听无 payload 的 socket「发送消息」触发信号', async () => {
    const 甲 = chuangJian假Socket('socket-甲')
    await jiaRuLiaoTian(甲)
    expect(甲.监听['发送消息']).toBeUndefined()
    expect(甲.监听['加入聊天']).toBeTypeOf('function')
  })

  it('最后一个归属 socket 断开时释放 Redis 认领锁（认领与释放标识必须一致）', async () => {
    const 甲 = chuangJian假Socket('socket-甲')
    await jiaRuLiaoTian(甲)
    expect(假.在册认领者, '加入聊天必须以进程标识认领').toBeTypeOf('string')

    await 甲.触发('disconnect')

    expect(假.释放的锁).toEqual([锁键])
    expect(假.在册认领者).toBeNull()
  })

  it('仍有归属 socket 时断开不得释放锁', async () => {
    const 甲 = chuangJian假Socket('socket-甲')
    const 乙 = chuangJian假Socket('socket-乙')
    await jiaRuLiaoTian(甲)
    await jiaRuLiaoTian(乙)

    await 甲.触发('disconnect')

    expect(假.释放的锁).toEqual([])
    expect(假.在册认领者).toBeTypeOf('string')
  })

  it('同一 socket 切换角色时释放旧角色的锁并接管新角色', async () => {
    const 另一角色ID = '44444444-4444-4444-8444-444444444444'
    const 甲 = chuangJian假Socket('socket-甲')
    await jiaRuLiaoTian(甲)
    await socket触发加入(甲, 另一角色ID)

    expect(假.释放的锁).toEqual([`tiao_du_qi_suo:${常.用户ID}:${常.角色ID}`])
    expect(假.调度器实例).toHaveLength(2)
    expect(假.调度器实例[1]?.角色ID).toBe(另一角色ID)
  })

  it('落库路径先建的调度器被随后的加入聊天复用，不产生第二实例', async () => {
    await luoKuChuFaJiaoSeTiaoDuQi(常.用户ID, 常.角色ID, 落库消息)
    expect(假.调度器实例).toHaveLength(1)

    const 甲 = chuangJian假Socket('socket-甲')
    await jiaRuLiaoTian(甲)

    expect(假.调度器实例).toHaveLength(1)
    await 甲.触发('disconnect')
    expect(假.调度器实例[0]?.重置).toHaveBeenCalledTimes(1)
    expect(假.释放的锁).toEqual([锁键])
  })

  it('清理调度器映射连无归属 socket 的落库记录一并重置', async () => {
    await luoKuChuFaJiaoSeTiaoDuQi(常.用户ID, 常.角色ID, 落库消息)

    清理调度器映射()

    expect(假.调度器实例[0]?.重置).toHaveBeenCalledTimes(1)
  })
})

describe('FP-04 AI 触发链由服务端落库路径主导', () => {
  it('socket 已连接时用户消息落库触发对应角色调度器', async () => {
    const 甲 = chuangJian假Socket('socket-甲')
    await jiaRuLiaoTian(甲)
    await luoKuChuFaJiaoSeTiaoDuQi(常.用户ID, 常.角色ID, 落库消息)

    expect(假.调度器实例).toHaveLength(1)
    expect(假.调度器实例[0]?.处理用户消息).toHaveBeenCalledTimes(1)
  })

  it('socket 从未连接（未加入聊天）时用户消息落库依然触发 AI，不被吞', async () => {
    chuangJian连接处理()
    初始化聊天Socket(假Io as unknown as Server)
    await luoKuChuFaJiaoSeTiaoDuQi(常.用户ID, 常.角色ID, 落库消息)

    expect(假.调度器实例).toHaveLength(1)
    expect(假.调度器实例[0]?.处理用户消息).toHaveBeenCalledTimes(1)
  })

  it('调度器归属 socket 断开后再次落库依然触发 AI（重建而非静默丢弃）', async () => {
    const 甲 = chuangJian假Socket('socket-甲')
    await jiaRuLiaoTian(甲)
    await 甲.触发('disconnect')
    await luoKuChuFaJiaoSeTiaoDuQi(常.用户ID, 常.角色ID, 落库消息)

    expect(假.调度器实例).toHaveLength(2)
    expect(假.调度器实例[1]?.处理用户消息).toHaveBeenCalledTimes(1)
  })

  it('角色被夺舍时转发用户消息给管理员且不触发 AI', async () => {
    假.被夺舍 = true
    await luoKuChuFaJiaoSeTiaoDuQi(常.用户ID, 常.角色ID, 落库消息)

    expect(zhuanFaYongHuXiaoXiGeiGuanLiYuan).toHaveBeenCalledWith(
      假Io,
      常.角色ID,
      常.用户ID,
      落库消息,
    )
    expect(假.调度器实例).toHaveLength(0)
  })

  it('角色不存在时不创建调度器且不抛错', async () => {
    vi.mocked(huoQuJiaoSeIELeiXing).mockResolvedValueOnce(null as unknown as 'E')
    await expect(
      luoKuChuFaJiaoSeTiaoDuQi(常.用户ID, 常.角色ID, 落库消息),
    ).resolves.toBeUndefined()
    expect(假.调度器实例).toHaveLength(0)
  })

  it('非法角色 ID 直接拒绝，不产生调度器也不抛错', async () => {
    await expect(
      luoKuChuFaJiaoSeTiaoDuQi(常.用户ID, '非UUID', 落库消息),
    ).resolves.toBeUndefined()
    expect(假.调度器实例).toHaveLength(0)
  })
})
