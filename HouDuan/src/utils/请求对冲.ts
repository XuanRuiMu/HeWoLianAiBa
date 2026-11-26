export interface DuiChongQingQiu {
  标识: string
  执行(signal: AbortSignal): Promise<string>
}

export interface DuiChongPeiZhi {
  对冲毫秒: number
  最大并发: number
  每秒新请求: number
  最多候选: number
}

export interface DuiChongQi {
  执行(候选: DuiChongQingQiu[]): Promise<string>
  快照(): { 在途: number; 排队: number; 胜出: number; 补发: number; 取消: number }
}

class XinHaoLiang {
  private 可用: number
  private 等待: Array<() => void> = []
  constructor(上限: number) { this.可用 = 上限 }
  async huoQu(): Promise<() => void> {
    if (this.可用 <= 0) await new Promise<void>((resolve) => this.等待.push(resolve))
    this.可用 -= 1
    let 已释放 = false
    return () => {
      if (已释放) return
      已释放 = true
      this.可用 += 1
      this.等待.shift()?.()
    }
  }
  get 排队数(): number { return this.等待.length }
}

class LingPaiTong {
  private 下次放行 = 0
  private 间隔: number
  constructor(每秒: number) { this.间隔 = Math.max(0, 1000 / Math.max(1, 每秒)) }
  async huoQu(): Promise<void> {
    const xian = Date.now()
    if (this.下次放行 <= xian) { this.下次放行 = xian + this.间隔; return }
    const deng = this.下次放行 - xian
    this.下次放行 += this.间隔
    await new Promise<void>((resolve) => setTimeout(resolve, deng))
  }
}

export function 创建请求对冲器(配置: DuiChongPeiZhi): DuiChongQi {
  const 闸门 = new XinHaoLiang(Math.max(1, 配置.最大并发))
  const 限速 = new LingPaiTong(配置.每秒新请求)
  let 在途 = 0
  let 胜出 = 0
  let 补发 = 0
  let 取消 = 0

  async function 发起(候选: DuiChongQingQiu, signal: AbortSignal): Promise<string> {
    await 限速.huoQu()
    const 释放 = await 闸门.huoQu()
    在途 += 1
    try {
      return await 候选.执行(signal)
    } finally {
      在途 -= 1
      释放()
    }
  }

  return {
    执行(输入: DuiChongQingQiu[]): Promise<string> {
      const 候选 = 输入.slice(0, Math.max(1, 配置.最多候选))
      if (候选.length === 0) return Promise.reject(new Error('[请求对冲] 没有可用候选'))

      const 控制器 = 候选.map(() => new AbortController())
      return new Promise<string>((resolve, reject) => {
        let 已定 = false
        let 已发 = 0
        let 失败数 = 0
        let 计时器: ReturnType<typeof setInterval> | undefined

        const 清理 = () => { if (计时器) { clearInterval(计时器); 计时器 = undefined } }
        const 发一个 = (序号: number) => {
          if (已定 || 序号 >= 候选.length) return
          已发 += 1
          if (序号 > 0) 补发 += 1
          发起(候选[序号], 控制器[序号].signal).then((正文) => {
            if (已定) return
            已定 = true
            清理()
            胜出 += 1
            控制器.forEach((c, i) => {
              if (i === 序号 || c.signal.aborted) return
              c.abort()
              取消 += 1
            })
            resolve(正文)
          }).catch(() => {
            if (已定) return
            失败数 += 1
            if (已发 >= 候选.length && 失败数 >= 已发) {
              已定 = true
              清理()
              reject(new Error('[请求对冲] 所有候选均失败'))
            }
          })
        }

        发一个(0)
        if (候选.length > 1) {
          计时器 = setInterval(() => {
            if (已定) { 清理(); return }
            if (已发 >= 候选.length) { 清理(); return }
            发一个(已发)
          }, Math.max(1, 配置.对冲毫秒))
        }
      })
    },
    快照() { return { 在途, 排队: 闸门.排队数, 胜出, 补发, 取消 } },
  }
}
