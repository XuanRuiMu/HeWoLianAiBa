process.env.ADMIN_PHONES = process.env.ADMIN_PHONES || '13800000000'
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://localhost:5432/ceshi'
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 优雅停机, 注册停机处理器, fuWuQi, type 停机资源 } from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { guanBiRiZhiYinQing, 日志引擎 } from '../utils/日志引擎'

vi.mock('../数据库', () => ({
  数据库: {
    query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
    end: vi.fn(async () => undefined),
    connect: vi.fn(async () => undefined),
    on: vi.fn(),
  },
}))

vi.mock('../redis', () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    keys: vi.fn(async () => []),
    ttl: vi.fn(async () => -1),
    quit: vi.fn(async () => 'OK'),
    on: vi.fn(),
  },
}))

vi.mock('../utils/日志引擎', () => ({
  chuangJianRiZhiYinQing: vi.fn(),
  sheZhiRiZhiJiBie: vi.fn(() => true),
  huoQuDangQianJiBie: vi.fn(() => 'debug'),
  guanBiRiZhiYinQing: vi.fn(async () => undefined),
  日志引擎: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const diaoYongShunXu: string[] = []
let kongZhiTaiCuoWuSpy: ReturnType<typeof vi.spyOn> | null = null

function 构造停机资源(liJiWanCheng = true): {
  ziYuan: 停机资源
  断开Socket: ReturnType<typeof vi.fn>
  关闭HTTP: ReturnType<typeof vi.fn>
  强退连接: ReturnType<typeof vi.fn>
  退出进程: ReturnType<typeof vi.fn>
} {
  const 断开Socket = vi.fn(() => {
    diaoYongShunXu.push('duanKaiSocket')
  })
  const 关闭HTTP = vi.fn((huiDiao: (cuoWu?: Error | null) => void) => {
    diaoYongShunXu.push('guanBiHTTP')
    if (liJiWanCheng) huiDiao(null)
  })
  const 强退连接 = vi.fn(() => {
    diaoYongShunXu.push('qiangTuiLianJie')
  })
  const 退出进程 = vi.fn((tuiChuMa: number) => {
    diaoYongShunXu.push('tuiChu:' + String(tuiChuMa))
  })
  const ziYuan: 停机资源 = {
    SocketIO: { disconnectSockets: 断开Socket },
    HTTP服务器: { close: 关闭HTTP, closeAllConnections: 强退连接 } as unknown as 停机资源['HTTP服务器'],
    数据库连接池: 数据库 as unknown as 停机资源['数据库连接池'],
    Redis客户端: redis as unknown as 停机资源['Redis客户端'],
    退出进程,
  }
  return { ziYuan, 断开Socket, 关闭HTTP, 强退连接, 退出进程 }
}

describe('FP-05 A10 优雅停机', () => {
  beforeEach(() => {
    diaoYongShunXu.length = 0
    vi.clearAllMocks()
    vi.mocked(数据库.end).mockImplementation(async () => {
      diaoYongShunXu.push('shuJuKu')
    })
    vi.mocked(redis.quit).mockImplementation(async () => {
      diaoYongShunXu.push('redis')
    })
    vi.mocked(guanBiRiZhiYinQing).mockImplementation(async () => {
      diaoYongShunXu.push('riZhi')
    })
    kongZhiTaiCuoWuSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    if (kongZhiTaiCuoWuSpy) {
      kongZhiTaiCuoWuSpy.mockRestore()
      kongZhiTaiCuoWuSpy = null
    }
  })

  it('正常路径：按序断开socket→关HTTP→关DB→关Redis→关日志→退出0，且不触发强退', async () => {
    vi.useFakeTimers()
    const bing = 构造停机资源(true)

    await 优雅停机(bing.ziYuan)
    await vi.advanceTimersByTimeAsync(10000)

    expect(diaoYongShunXu).toEqual([
      'duanKaiSocket',
      'guanBiHTTP',
      'shuJuKu',
      'redis',
      'riZhi',
      'tuiChu:0',
    ])
    expect(bing.断开Socket).toHaveBeenCalledWith(true)
    expect(bing.强退连接).not.toHaveBeenCalled()
  })

  it('超时强退：close回调5秒内未触发时销毁活动连接并继续后续关闭', async () => {
    vi.useFakeTimers()
    const bing = 构造停机资源(false)

    const weiWanCheng = 优雅停机(bing.ziYuan)

    await vi.advanceTimersByTimeAsync(4999)
    expect(bing.强退连接).not.toHaveBeenCalled()
    expect(diaoYongShunXu).toEqual(['duanKaiSocket', 'guanBiHTTP'])

    await vi.advanceTimersByTimeAsync(1)
    await weiWanCheng

    expect(diaoYongShunXu).toEqual([
      'duanKaiSocket',
      'guanBiHTTP',
      'qiangTuiLianJie',
      'shuJuKu',
      'redis',
      'riZhi',
      'tuiChu:0',
    ])
    expect(bing.关闭HTTP).toHaveBeenCalledTimes(1)
    expect(bing.强退连接).toHaveBeenCalledTimes(1)
  })

  it('防重入：同一资源重复与并发调用只执行一次完整停机', async () => {
    vi.useFakeTimers()
    const bing = 构造停机资源(true)

    await Promise.all([优雅停机(bing.ziYuan), 优雅停机(bing.ziYuan)])
    await 优雅停机(bing.ziYuan)

    expect(bing.断开Socket).toHaveBeenCalledTimes(1)
    expect(bing.关闭HTTP).toHaveBeenCalledTimes(1)
    expect(vi.mocked(数据库.end)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(redis.quit)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(guanBiRiZhiYinQing)).toHaveBeenCalledTimes(1)
    expect(bing.退出进程).toHaveBeenCalledTimes(1)
  })

  it('容错：单步关闭失败不阻断后续步骤，最终仍以退出码0结束', async () => {
    vi.useFakeTimers()
    vi.mocked(数据库.end).mockImplementationOnce(async () => {
      diaoYongShunXu.push('shuJuKu')
      throw new Error('shuJuKuGuanBiShiBai')
    })
    vi.mocked(redis.quit).mockImplementationOnce(async () => {
      diaoYongShunXu.push('redis')
      throw new Error('redisGuanBiShiBai')
    })
    vi.mocked(guanBiRiZhiYinQing).mockImplementationOnce(async () => {
      diaoYongShunXu.push('riZhi')
      throw new Error('riZhiGuanBiShiBai')
    })

    const bing = 构造停机资源(true)
    await 优雅停机(bing.ziYuan)

    expect(diaoYongShunXu).toEqual([
      'duanKaiSocket',
      'guanBiHTTP',
      'shuJuKu',
      'redis',
      'riZhi',
      'tuiChu:0',
    ])
    expect(bing.退出进程).toHaveBeenCalledWith(0)
  })

  it('信号与异常处理器注册：SIGTERM/SIGINT/unhandledRejection/uncaughtException均注册且异常走结构化日志后受控停机', () => {
    const jianTingMingDan = ['SIGTERM', 'SIGINT', 'unhandledRejection', 'uncaughtException']
    const onSpy = vi.spyOn(process, 'on')
    const tingJi = vi.fn(async () => undefined)

    注册停机处理器(tingJi)

    const yiZhuCe = onSpy.mock.calls.filter(
      ([shiJian]) => typeof shiJian === 'string' && jianTingMingDan.includes(shiJian),
    )
    expect(yiZhuCe.map(([shiJian]) => shiJian)).toEqual(jianTingMingDan)

    const chuLiQi = Object.fromEntries(
      yiZhuCe.map(([shiJian, chuLi]) => [shiJian, chuLi as (...canShu: unknown[]) => void]),
    )

    chuLiQi.unhandledRejection(new Error('weiChuLiJuJueCeShi'))
    expect(tingJi).toHaveBeenCalledTimes(1)
    expect(日志引擎.error).toHaveBeenCalledTimes(1)
    const [leiXing, , xiangQing] = vi.mocked(日志引擎.error).mock.calls[0]
    expect(leiXing).toBe('tingJi')
    expect(xiangQing).toMatchObject({
      ming_cheng: 'Error',
      zhan: expect.stringContaining('weiChuLiJuJueCeShi'),
    })

    chuLiQi.SIGTERM()
    chuLiQi.SIGINT()
    chuLiQi.uncaughtException(new Error('weiBuHuoYiChangCeShi'))

    expect(tingJi).toHaveBeenCalledTimes(4)
    expect(日志引擎.error).toHaveBeenCalledTimes(2)

    onSpy.mockRestore()
  })

  it('模块导入无副作用：vitest下导入server不监听端口、不注册任何停机信号处理器', async () => {
    const jianTingMingDan = ['SIGTERM', 'SIGINT', 'unhandledRejection', 'uncaughtException']
    const jiXian = jianTingMingDan.map((ming) => [ming, process.listenerCount(ming)] as const)

    vi.resetModules()
    const xinMoKuai = (await import('../server')) as typeof import('../server')

    const dangQian = jianTingMingDan.map((ming) => [ming, process.listenerCount(ming)] as const)
    expect(dangQian).toEqual(jiXian)
    expect(xinMoKuai.fuWuQi.listening).toBe(false)
    expect(typeof xinMoKuai.优雅停机).toBe('function')
    expect(typeof xinMoKuai.注册停机处理器).toBe('function')
  })
})
