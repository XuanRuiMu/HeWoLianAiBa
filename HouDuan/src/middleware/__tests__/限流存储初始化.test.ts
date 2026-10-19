import { describe, it, expect, vi } from 'vitest'

// 冷启动回归（限流 store 初始化）：
// express-rate-limit 在模块加载期调用 store.init() 预加载 Lua 脚本，
// 而 ioredis 的 commandTimeout 从命令入队那一刻起算。历史故障链是——
// ts-node 编译把事件循环阻塞 3s 以上 → 预加载脚本整批超时 → store 初始化失败并
// 往控制台刷 "express-rate-limit: async error during store initialization"，
// 之后每个进程重启都会复现一次。
//
// 本用例把 ioredis 换成"命令入队即开始计时、事件循环随后被阻塞"的假实现，
// 钉死两条不变量：
//   1) 限流 store 的初始化必须真正跑完（脚本预加载确实发出去了）；
//   2) 一条限流初始化错误都不许打到控制台。
const 阻塞毫秒 = 3200
const 命令超时毫秒 = 3000

const 假命令记录 = vi.hoisted(() => [] as string[])

vi.mock('ioredis', () => {
  type 处理函数 = (...canShu: unknown[]) => void

  class 假Redis {
    status = 'connecting'
    options: Record<string, unknown> = {}
    private 排队: Array<() => void> = []
    private 监听表 = new Map<string, 处理函数[]>()

    constructor(_lianJie: string, canShu: Record<string, unknown> = {}) {
      this.options = canShu
      setTimeout(() => {
        // 模拟 ts-node 编译期：握手尚未完成，事件循环被占满，定时器与网络事件全都排在后面
        const jieZhi = Date.now() + 阻塞毫秒
        let kongZhuan = 0
        while (Date.now() < jieZhi) kongZhuan += Math.sqrt(kongZhuan + 1)
        void kongZhuan
        this.status = 'ready'
        for (const faChu of this.排队.splice(0)) faChu()
        this.faSong('ready')
      }, 0)
    }

    on(shiJian: string, chuLi: 处理函数): this {
      const lie = this.监听表.get(shiJian) ?? []
      lie.push(chuLi)
      this.监听表.set(shiJian, lie)
      return this
    }

    once(shiJian: string, chuLi: 处理函数): this {
      const yiCiXing: 处理函数 = (...canShu) => {
        this.off(shiJian, yiCiXing)
        chuLi(...canShu)
      }
      return this.on(shiJian, yiCiXing)
    }

    off(shiJian: string, chuLi: 处理函数): this {
      const lie = this.监听表.get(shiJian) ?? []
      this.监听表.set(
        shiJian,
        lie.filter((xiang) => xiang !== chuLi),
      )
      return this
    }

    private faSong(shiJian: string, ...canShu: unknown[]): void {
      for (const chuLi of [...(this.监听表.get(shiJian) ?? [])]) chuLi(...canShu)
    }

    private zhiXing(mingLing: string[]): Promise<unknown> {
      假命令记录.push(mingLing.join(' '))
      return new Promise((jieShu, juJue) => {
        // 与 ioredis 同语义：超时从入队那一刻起算，回复要等事件循环空出来才处理
        const jiShiQi = setTimeout(() => juJue(new Error('Command timed out')), 命令超时毫秒)
        const huiFu = () => {
          setTimeout(() => {
            clearTimeout(jiShiQi)
            jieShu('假脚本摘要')
          }, 1)
        }
        if (this.status === 'ready') huiFu()
        else this.排队.push(huiFu)
      })
    }

    call(...mingLing: string[]): Promise<unknown> {
      return this.zhiXing(mingLing)
    }

    ping(): Promise<unknown> {
      return this.zhiXing(['PING'])
    }

    quit(): Promise<unknown> {
      return Promise.resolve('OK')
    }

    disconnect(): void {
      this.status = 'end'
    }

    duplicate(): 假Redis {
      return this
    }
  }

  return { default: 假Redis, Redis: 假Redis }
})

describe('限流 RedisStore 冷启动', () => {
  it('事件循环被阻塞时，store 初始化仍完成且不向控制台报错', async () => {
    const kongZhiTaiCuoWu: string[] = []
    const yuanCuoWu = console.error
    console.error = (...canShu: unknown[]) => {
      kongZhiTaiCuoWu.push(canShu.map((xiang) => String(xiang)).join(' '))
    }

    try {
      await import('../限流')
      await new Promise((jieShu) => setTimeout(jieShu, 50))
    } finally {
      console.error = yuanCuoWu
    }

    const yuJiaZai = 假命令记录.filter((mingLing) => mingLing.startsWith('SCRIPT LOAD'))
    expect(yuJiaZai.length).toBeGreaterThanOrEqual(2)
    expect(kongZhiTaiCuoWu).toEqual([])
  })
})
