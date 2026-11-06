import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 源码根 = resolve(__dirname, '..')
const 项目根 = resolve(源码根, '..')
const 读 = (相对: string) => readFileSync(resolve(项目根, 相对), 'utf8')

interface JiaZhen {
  han: (shiJian: number) => void
}

interface JiaZhouQi {
  han: (...can: unknown[]) => void
  miao: number
  ciShu: number
}

function 假现场() {
  const 帧队列 = new Map<number, JiaZhen>()
  let 帧号 = 0
  const 周期间隔 = new Map<number, JiaZhouQi>()
  let 周期号 = 0
  const 观察者记录: Array<{ 连接: boolean }> = []
  let 时钟 = 0

  class 假观察者 {
    记录: { 连接: boolean }
    constructor(_回调用) {
      this.记录 = { 连接: false }
      观察者记录.push(this.记录)
    }

    observe() {
      this.记录.连接 = true
    }

    disconnect() {
      this.记录.连接 = false
    }

    takeRecords() {
      return []
    }
  }

  const 窗口: Record<string, unknown> = {
    requestAnimationFrame(回调用: (shiJian: number) => void) {
      帧号 += 1
      const id = 帧号
      帧队列.set(id, { han: 回调用 })
      return id
    },
    cancelAnimationFrame(id: number) {
      帧队列.delete(id)
    },
    setInterval(回调用: (...can: unknown[]) => void, miao: number) {
      周期号 += 1
      const id = 周期号
      周期间隔.set(id, { han: 回调用, miao, ciShu: 0 })
      return id
    },
    clearInterval(id: number) {
      周期间隔.delete(id)
    },
    MutationObserver: 假观察者,
    addEventListener() {},
  }

  function 跑一帧() {
    const 本帧 = [...帧队列.entries()]
    帧队列.clear()
    时钟 += 16
    for (const [, 项] of 本帧) 项.han(时钟)
    return 本帧.length
  }

  function 推进时间(haoMiao: number) {
    const 轮数 = Math.max(1, Math.round(haoMiao / 16))
    let 总帧 = 0
    for (let i = 0; i < 轮数; i += 1) 总帧 += 跑一帧()
    return 总帧
  }

  function 走周期(次数: number) {
    for (let i = 0; i < 次数; i += 1) {
      for (const [, 项] of 周期间隔) {
        项.ciShu += 1
        项.han()
      }
    }
  }

  return {
    窗口,
    跑一帧,
    推进时间,
    走周期,
    在途帧: () => 帧队列.size,
    登记帧: () => 帧号,
    活动周期: () => 周期间隔.size,
    周期登记: () => 周期间隔.size,
    连接观察者: () => 观察者记录.filter((记) => 记.连接).length,
    观察者总数: () => 观察者记录.length,
    时钟: () => 时钟,
  }
}

function 装调度器(现场: ReturnType<typeof 假现场>) {
  const 源码 = 读('public/grass-bg/scripts/block-00.js')
  new Function('window', 源码)(现场.窗口)
  const 接口 = 现场.窗口.__caoDiXunHuan as {
    sheZanTing: (yao: boolean, yuanYin?: string) => boolean
    kaiZanTingMen: (yuanYin?: string) => boolean
    yiYunXuZanTing: () => boolean
    yiZuSai: () => boolean
    guiDangChongFang: (ming: string, han: () => void) => boolean
    guiDangChongFangLieBiao: () => string[]
    jiShu: () => {
      zhenQingQiu: number
      zhenZhiXing: number
      zhenZaiCe: number
      zhouQiZhiXing: number
      duanKaiCiShu: number
      chongFangCiShu: number
      yiZanTing: boolean
      menYiKai: boolean
      qiang: { zhenDengDai: number; zhenZaiTu: number; zhouQiZong: number; zhouQiHuoYue: number; guanChaLian: number; guanChaZong: number }
    }
  }
  return 接口
}

function 造循环(现场: ReturnType<typeof 假现场>, 名: string) {
  const 状态 = { 执行: 0, 最后时间: 0, 累计增量: 0 }
  const 窗口 = 现场.窗口 as unknown as {
    requestAnimationFrame: (han: (shiJian: number) => void) => number
  }
  function 圈(shiJian: number) {
    状态.执行 += 1
    if (状态.最后时间) 状态.累计增量 += shiJian - 状态.最后时间
    状态.最后时间 = shiJian
    窗口.requestAnimationFrame(圈)
  }
  窗口.requestAnimationFrame(圈)
  return { 名, 状态 }
}

describe('FP-08 草地背景统一暂停调度器', () => {
  it('调度器在所有背景脚本之前加载，且是唯一的暂停入口', () => {
    const 背景页 = 读('public/grass-bg/grass-bg.html')
    const 调度器位置 = 背景页.indexOf('scripts/block-00.js')
    const 引擎加载位置 = 背景页.indexOf('scripts/block-02.js')
    const 循环所在 = 背景页.indexOf('scripts/block-05.js')
    expect(调度器位置).toBeGreaterThan(-1)
    expect(调度器位置).toBeLessThan(引擎加载位置)
    expect(调度器位置).toBeLessThan(循环所在)
    expect(背景页).toMatch(/<script src="\.\/scripts\/block-00\.js"><\/script>/)
    for (const 名 of ['block-05.js', 'block-07.js', 'block-08.js']) {
      expect(读(`public/grass-bg/scripts/${名}`)).not.toContain('__caoDiZanTing')
    }
  })

  it('主页态下循环满帧运行，切到聊天页后一帧都不再派发', () => {
    const 现场 = 假现场()
    const 调度器 = 装调度器(现场)
    const 圈 = [造循环(现场, 'shi-cha'), 造循环(现场, 'wan-qu'), 造循环(现场, 'ji-wei'), 造循环(现场, 'wu')]
    expect(现场.在途帧()).toBe(4)

    现场.推进时间(1000)
    const 每圈主页帧 = 圈[0].状态.执行
    expect(每圈主页帧).toBeGreaterThan(40)
    expect(调度器.jiShu().qiang.zhenDengDai).toBe(0)

    调度器.kaiZanTingMen('jiu-xu')
    调度器.sheZanTing(true, 'grass-pause')
    expect(调度器.yiZuSai()).toBe(true)
    expect(现场.窗口.__caoDiZanTing).toBe(true)
    const 冻结前帧 = 圈.map((quan) => quan.状态.执行)
    现场.跑一帧()
    expect(现场.在途帧()).toBe(0)
    const 总帧 = 现场.推进时间(1000)
    expect(总帧).toBe(0)
    expect(圈.map((quan) => quan.状态.执行)).toEqual(冻结前帧)
  })

  it('恢复后循环数量不翻倍、时间基准被重置，来回切三次仍是同样多的圈', () => {
    const 现场 = 假现场()
    const 调度器 = 装调度器(现场)
    const 圈 = [造循环(现场, 'shi-cha'), 造循环(现场, 'wan-qu'), 造循环(现场, 'ji-wei'), 造循环(现场, 'wu')]
    调度器.kaiZanTingMen('jiu-xu')
    调度器.guiDangChongFang('ji-wei', () => {
      圈[2].状态.最后时间 = 0
    })

    现场.推进时间(320)
    expect(现场.在途帧()).toBe(4)

    for (let ci = 0; ci < 3; ci += 1) {
      调度器.sheZanTing(true, 'grass-pause')
      现场.跑一帧()
      expect(现场.在途帧()).toBe(0)
      expect(现场.推进时间(1600)).toBe(0)
      调度器.sheZanTing(false, 'grass-pause')
      expect(现场.在途帧()).toBe(4)
      圈[2].状态.累计增量 = 0
      现场.跑一帧()
      expect(圈[2].状态.累计增量).toBeLessThanOrEqual(16)
      现场.推进时间(320)
      expect(现场.在途帧()).toBe(4)
    }
    expect(圈.every((quan) => quan.状态.执行 > 10)).toBe(true)
    expect(圈[0].状态.执行).toBe(圈[3].状态.执行)
  })

  it('未就绪时切到聊天页立即冻结循环，就绪门打开也不重启，切回主页照常恢复', () => {
    const 现场 = 假现场()
    const 调度器 = 装调度器(现场)
    const 圈 = [造循环(现场, 'shi-cha'), 造循环(现场, 'wan-qu'), 造循环(现场, 'ji-wei'), 造循环(现场, 'wu')]
    调度器.guiDangChongFang('ji-wei', () => {
      圈[2].状态.最后时间 = 0
    })
    现场.推进时间(320)
    expect(调度器.yiZuSai()).toBe(false)
    expect(现场.在途帧()).toBe(4)
    expect(圈[0].状态.执行).toBeGreaterThan(10)

    调度器.sheZanTing(true, 'grass-pause')
    expect(调度器.yiZuSai()).toBe(true)
    expect(现场.窗口.__caoDiZanTing).toBe(true)
    现场.跑一帧()
    expect(现场.在途帧()).toBe(0)
    const 冻结帧数 = 圈.map((quan) => quan.状态.执行)
    expect(现场.推进时间(1600)).toBe(0)
    expect(圈.map((quan) => quan.状态.执行)).toEqual(冻结帧数)

    调度器.kaiZanTingMen('jiu-xu')
    expect(调度器.yiZuSai()).toBe(true)
    expect(调度器.jiShu().menYiKai).toBe(true)
    expect(现场.在途帧()).toBe(0)
    expect(现场.推进时间(1600)).toBe(0)
    expect(圈.map((quan) => quan.状态.执行)).toEqual(冻结帧数)

    调度器.sheZanTing(false, 'grass-pause')
    expect(现场.在途帧()).toBe(4)
    圈[2].状态.累计增量 = 0
    现场.跑一帧()
    expect(圈[2].状态.累计增量).toBeLessThanOrEqual(16)
    现场.推进时间(640)
    expect(现场.在途帧()).toBe(4)
    expect(圈[0].状态.执行).toBeGreaterThan(冻结帧数[0])
    expect(调度器.jiShu().zhenZaiCe).toBe(4)
  })

  it('未就绪时来回切三次聊天页，每个循环仍只有一个在途帧且计数不翻倍', () => {
    const 现场 = 假现场()
    const 调度器 = 装调度器(现场)
    const 圈 = [造循环(现场, 'shi-cha'), 造循环(现场, 'wan-qu'), 造循环(现场, 'ji-wei'), 造循环(现场, 'wu')]
    expect(调度器.yiZuSai()).toBe(false)
    现场.推进时间(160)
    const 执行数 = 圈.map((quan) => quan.状态.执行)
    expect(执行数[0]).toBeGreaterThan(0)
    expect(执行数[0]).toBe(执行数[3])
    expect(调度器.yiZuSai()).toBe(false)

    for (let ci = 0; ci < 3; ci += 1) {
      调度器.sheZanTing(true, 'grass-pause')
      expect(调度器.yiZuSai()).toBe(true)
      现场.跑一帧()
      expect(现场.在途帧()).toBe(0)
      expect(现场.推进时间(1600)).toBe(0)
      expect(调度器.jiShu().qiang.zhenDengDai).toBe(4)
      expect(调度器.jiShu().qiang.zhenZaiTu).toBe(0)
      调度器.sheZanTing(false, 'grass-pause')
      expect(现场.在途帧()).toBe(4)
      expect(调度器.jiShu().qiang.zhenDengDai).toBe(0)
      现场.推进时间(160)
      expect(现场.在途帧()).toBe(4)
      expect(调度器.jiShu().zhenZaiCe).toBe(4)
    }
    const 末帧数 = 圈.map((quan) => quan.状态.执行)
    expect(末帧数[0]).toBe(末帧数[3])
    expect(末帧数.every((n) => n === 末帧数[0])).toBe(true)
    expect(末帧数[0] / 执行数[0]).toBeLessThanOrEqual(4)
  })

  it('未就绪时的常驻定时器与观察者一并停用，门开也不复活', () => {
    const 现场 = 假现场()
    const 调度器 = 装调度器(现场)
    const 窗口 = 现场.窗口 as unknown as {
      setInterval: (han: () => void, miao: number) => number
      MutationObserver: new (cb: MutationCallback) => MutationObserver
    }
    let 次数 = 0
    窗口.setInterval(() => {
      次数 += 1
    }, 200)
    const 观察 = new 窗口.MutationObserver(() => {})
    观察.observe(现场.窗口 as unknown as Node, { attributes: true })
    expect(现场.活动周期()).toBe(1)
    expect(现场.连接观察者()).toBe(1)

    调度器.sheZanTing(true, 'grass-pause')
    expect(现场.活动周期()).toBe(0)
    expect(现场.连接观察者()).toBe(0)
    现场.走周期(5)
    expect(次数).toBe(0)

    调度器.kaiZanTingMen('jiu-xu')
    expect(现场.活动周期()).toBe(0)
    expect(现场.连接观察者()).toBe(0)
    现场.走周期(5)
    expect(次数).toBe(0)

    调度器.sheZanTing(false, 'grass-pause')
    expect(现场.活动周期()).toBe(1)
    expect(现场.连接观察者()).toBe(1)
    现场.走周期(3)
    expect(次数).toBe(3)
  })

  it('未就绪阶段的就绪超时在暂停期顺延，恢复后仍照常报失败', () => {
    vi.useFakeTimers()
    try {
      const 握手源码 = 读('public/grass-bg/scripts/block-09.js')
      const 收到: Array<{ zhuangTai: string; yuanYin?: string }> = []
      const 暂停 = { 要: false }
      const 假窗口: Record<string, unknown> = {
        parent: {
          postMessage: vi.fn((xinXi: { zhuangTai: string }) => {
            收到.push(xinXi)
          }),
        },
        location: { origin: 'http://localhost:5173', search: '' },
        WebGLRenderingContext: function LinShi() {},
        addEventListener: vi.fn(),
        __caoDiXunHuan: {
          yiZuSai: () => 暂停.要,
          sheZanTing: vi.fn(),
          kaiZanTingMen: vi.fn(),
        },
      }
      new Function('window', 握手源码)(假窗口)
      暂停.要 = true
      vi.advanceTimersByTime(70000)
      expect(收到.some((xinXi) => xinXi.zhuangTai === 'shi-bai')).toBe(false)
      暂停.要 = false
      vi.advanceTimersByTime(40000)
      const shiBai = 收到.find((xinXi) => xinXi.zhuangTai === 'shi-bai')
      expect(shiBai?.yuanYin).toBe('chao-shi')
    } finally {
      vi.useRealTimers()
    }
  })

  it('常驻定时器暂停时真正卸载、恢复后同一句柄重新生效', () => {
    const 现场 = 假现场()
    const 调度器 = 装调度器(现场)
    const 窗口 = 现场.窗口 as unknown as {
      setInterval: (han: () => void, miao: number) => number
      clearInterval: (id: number) => void
    }
    let 次数 = 0
    const 句柄 = 窗口.setInterval(() => {
      次数 += 1
    }, 1200)
    const 备查 = 窗口.setInterval(() => {}, 300)
    expect(现场.活动周期()).toBe(2)

    现场.走周期(3)
    expect(次数).toBe(3)

    调度器.kaiZanTingMen('jiu-xu')
    调度器.sheZanTing(true, 'grass-pause')
    expect(现场.活动周期()).toBe(0)
    现场.走周期(5)
    expect(次数).toBe(3)

    调度器.sheZanTing(false, 'grass-pause')
    expect(现场.活动周期()).toBe(2)
    现场.走周期(2)
    expect(次数).toBe(5)

    窗口.clearInterval(句柄)
    窗口.clearInterval(备查)
    expect(现场.周期登记()).toBe(0)
  })

  it('跨文档观察者暂停即断开，恢复后重新观察并重放最后一次主题值', () => {
    const 现场 = 假现场()
    const 调度器 = 装调度器(现场)
    let 重放次数 = 0
    let 观察次数 = 0
    const 窗口 = 现场.窗口 as unknown as { MutationObserver: new (cb: MutationCallback) => MutationObserver }
    const 观察 = new 窗口.MutationObserver(() => {
      观察次数 += 1
    })
    观察.observe(现场.窗口 as unknown as Node, { attributes: true })
    expect(现场.连接观察者()).toBe(1)

    调度器.guiDangChongFang('zhu-ti', () => {
      重放次数 += 1
    })
    调度器.kaiZanTingMen('jiu-xu')
    expect(重放次数).toBe(1)
    调度器.sheZanTing(true, 'grass-pause')
    expect(现场.连接观察者()).toBe(0)
    expect(调度器.jiShu().qiang.guanChaZong).toBe(1)

    调度器.sheZanTing(false, 'grass-pause')
    expect(现场.连接观察者()).toBe(1)
    expect(重放次数).toBe(2)
    expect(调度器.guiDangChongFangLieBiao()).toContain('zhu-ti')
    expect(观察次数).toBe(0)
  })

  it('等待中的帧回调可被取消，恢复后不会多出幽灵循环', () => {
    const 现场 = 假现场()
    const 调度器 = 装调度器(现场)
    const 窗口 = 现场.窗口 as unknown as {
      requestAnimationFrame: (han: (shiJian: number) => void) => number
      cancelAnimationFrame: (id: number) => void
    }
    const 圈 = 造循环(现场, 'jie-shi')
    let 取消执行 = 0
    const 句柄 = 窗口.requestAnimationFrame(() => {
      取消执行 += 1
    })
    expect(调度器.jiShu().zhenZaiCe).toBe(2)

    调度器.kaiZanTingMen('jiu-xu')
    调度器.sheZanTing(true, 'grass-pause')
    现场.跑一帧()
    expect(调度器.jiShu().qiang.zhenDengDai).toBe(2)
    expect(圈.状态.执行).toBe(0)

    窗口.cancelAnimationFrame(句柄)
    expect(调度器.jiShu().zhenZaiCe).toBe(1)

    调度器.sheZanTing(false, 'grass-pause')
    现场.推进时间(160)
    expect(取消执行).toBe(0)
    expect(圈.状态.执行).toBe(10)
    expect(调度器.jiShu().qiang.zhenDengDai).toBe(0)
    expect(现场.在途帧()).toBe(1)
  })

  it('调度器计数可供实测比对', () => {
    const 现场 = 假现场()
    const 调度器 = 装调度器(现场)
    造循环(现场, 'shi-cha')
    造循环(现场, 'wan-qu')
    现场.推进时间(320)
    const 前 = 调度器.jiShu()
    expect(前.zhenZhiXing).toBeGreaterThan(0)
    expect(前.yiZanTing).toBe(false)
    调度器.kaiZanTingMen('jiu-xu')
    调度器.sheZanTing(true, 'grass-pause')
    现场.推进时间(1000)
    const 后 = 调度器.jiShu()
    expect(后.zhenZhiXing).toBe(前.zhenZhiXing)
    expect(后.yiZanTing).toBe(true)
    expect(后.qiang.zhenDengDai).toBe(2)
    expect(后.qiang.zhenZaiTu).toBe(0)
  })

  it('背景页把暂停标志升级为调度器单一开关，并在就绪与失败两处开门', () => {
    const 握手 = 读('public/grass-bg/scripts/block-09.js')
    expect(握手).toContain("__caoDiXunHuan")
    expect(握手).toContain("xun.sheZanTing(yao, 'grass-pause')")
    expect(握手).toContain("kaiZanTingMen('jiu-xu')")
    expect(握手).toContain("kaiZanTingMen('shi-bai')")
    expect(握手).toContain('if (window.__caoDiZanTing && yiYunXuZanTing()) return;')
    expect(握手).toContain("type !== 'grass-pause'")
    expect(握手).toContain('__caoDiZanTing')
  })

  it('各补丁块只登记重放钩子，不再各自判断暂停标志', () => {
    const 主题 = 读('public/grass-bg/scripts/block-05.js')
    const 清扫 = 读('public/grass-bg/scripts/block-03.js')
    const 雨 = 读('public/grass-bg/scripts/block-10.js')
    const 场景 = 读('public/grass-bg/scripts/block-08.js')
    expect(主题).toContain("guiDangChongFang('zhu-ti', 同步主题)")
    expect(清扫).toContain("guiDangChongFang('qing-li', sweep)")
    expect(雨).toContain("guiDangChongFang('yu-shui', 同步雨)")
    expect(场景).toContain("guiDangChongFang('ji-wei', function () { lastT = 0; })")
    expect(场景).toContain('if (dt > 0.25) dt = 0.25;')
    expect(主题).toContain('requestAnimationFrame(parallaxLoop)')
    expect(读('public/grass-bg/scripts/block-07.js')).toContain('requestAnimationFrame(loop)')
  })

  it('父页重建等待有句柄可清理，陀螺仪订阅按是否需要背景注销', () => {
    const 根 = 读('src/根组件.vue')
    expect(根).toContain('let beiJingChongShiDengDaiDingShiQi: ReturnType<typeof setTimeout> | null = null')
    expect(根).toContain('function qingLiBeiJingChongShiDengDai(): void')
    expect(根).toContain('beiJingChongShiDengDaiDingShiQi = setTimeout(')
    expect(根).toContain('caoDiPeiZhi.beiJingChongShiDengDaiHaoMiao')
    expect(根).toContain('qingLiBeiJingChongShiDengDai()')
    expect(根).not.toMatch(/setTimeout\(\(\) => \{\s*yingJiaZaiBeiJing\.value = true\s*\}, 2000\)/)
    expect(根).toContain('function zhuXiaoLuoPan()')
    expect(根).toContain('watch(shiYongCaoDiBeiJing')
    expect(根).toMatch(/function zhuCeLuoPan\(\) \{[\s\S]{0,160}!shiYongCaoDiBeiJing\.value/)
    expect(根).toMatch(/function qiDongLuoPan\(\)[\s\S]{0,200}!shiYongCaoDiBeiJing\.value/)
    expect(根).toMatch(/onBeforeUnmount\(\(\) => \{[\s\S]*zhuXiaoLuoPan\(\)[\s\S]*qingLiBeiJingChongShiDengDai\(\)/)
    expect(根).not.toContain("onBeforeUnmount() {\n  window.removeEventListener('deviceorientation'")
  })

  it('重建等待间隔从站点配置读取', () => {
    const 配置 = 读('src/config/站点配置.ts')
    expect(配置).toContain('beiJingChongShiDengDaiHaoMiao: number')
    expect(配置).toContain('beiJingChongShiDengDaiHaoMiao: 2000')
  })
})
