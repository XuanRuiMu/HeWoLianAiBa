import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const 项目根 = resolve(__dirname, '..', '..')
const 读 = (相对: string) => readFileSync(resolve(项目根, 相对), 'utf8')

type 假窗口 = Record<string, unknown> & EventTarget

function 建揭示窗口(选项: { 独立?: boolean; 弱动画?: boolean; 缺波浪?: boolean } = {}) {
  const 窗口 = new EventTarget() as 假窗口
  窗口.CustomEvent = CustomEvent
  窗口.parent = 选项.独立 ? 窗口 : { postMessage: vi.fn() }
  窗口.location = {
    search: '?jieShiChaoShi=8000&yuReHaoMiao=10&diaoShi=0',
    origin: 'http://localhost:5173',
  }
  窗口.matchMedia = vi.fn(() => ({ matches: !!选项.弱动画 }))
  窗口.__caoDiZhunBeiZhuangTai = { zhunBei: false, riZhi: [] }

  const 进度 = { value: -1 }
  const 效果 = {
    duration: 0.06,
    getUniform: (名称: string) => {
      if (名称 === 'uProgress') return 进度
      return { value: 0 }
    },
    tweaksValue: { progress: -1 },
    tween: { kill: vi.fn() },
    start: vi.fn(),
    configure: vi.fn(),
  }
  const 波浪进度 = { value: -1 }
  const 波浪材质 = { visible: false }
  const 波浪网格 = { visible: false }
  const 波浪 = 选项.缺波浪
    ? null
    : {
        mesh: 波浪网格,
        material: 波浪材质,
        config: { revealDuration: 0.05 },
        tween: { kill: vi.fn() },
        setProgress: vi.fn((值: number) => {
          波浪进度.value = 值
        }),
      }
  窗口.__experience = {
    revealMesh: 波浪,
    postProcessing: {
      waterColorRevealIntegration: { waterColorRevealEffect: 效果 },
    },
  }

  let raf回调: ((时间: number) => void) | null = null
  vi.stubGlobal('requestAnimationFrame', vi.fn((回调: (时间: number) => void) => {
    raf回调 = 回调
    return 1
  }))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())

  const 可播放记录: Array<{ yuanYin?: string }> = []
  const 完成记录: Array<{ yuanYin?: string }> = []
  窗口.addEventListener('cao-di-ke-bo-fang', (事件) => {
    可播放记录.push((事件 as CustomEvent).detail || {})
  })
  窗口.addEventListener('cao-di-jie-shi-wan-cheng', (事件) => {
    完成记录.push((事件 as CustomEvent).detail || {})
  })

  new Function('window', 读('public/grass-bg/scripts/block-06.js'))(窗口)

  return {
    窗口,
    进度,
    效果,
    波浪,
    波浪进度,
    波浪材质,
    波浪网格,
    可播放记录,
    完成记录,
    触发就绪: () => {
      窗口.dispatchEvent(new CustomEvent('cao-di-jiu-xu'))
    },
    执行帧: (时间: number) => {
      const 回调 = raf回调
      raf回调 = null
      if (回调) 回调(时间)
    },
    触发波浪开始: () => {
      窗口.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'grass-wave-start' },
          origin: 'http://localhost:5173',
        }),
      )
    },
    触发强制收尾: () => {
      窗口.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'grass-reveal-finish' },
          origin: 'http://localhost:5173',
        }),
      )
    },
  }
}

function 建握手窗口() {
  const 收到: Array<Record<string, unknown>> = []
  const 窗口 = new EventTarget() as 假窗口
  窗口.CustomEvent = CustomEvent
  窗口.parent = { postMessage: vi.fn((消息: Record<string, unknown>) => 收到.push(消息)) }
  窗口.location = { origin: 'http://localhost:5173', search: '' }
  窗口.WebGLRenderingContext = function 占位() {}
  窗口.__caoDiZhunBeiZhuangTai = {
    zhunBei: true,
    jieDuan: 'jiuXu',
    haoShi: 123,
    chongJianCiShu: 0,
    riZhi: [{ m: 'zhunBei', t: 1 }],
  }
  窗口.__dcm = {}
  窗口.__experience = {
    engine: {
      renderer: { instance: { render: vi.fn() } },
      camera: {},
      canvas: { addEventListener: vi.fn() },
    },
  }
  new Function('window', 读('public/grass-bg/scripts/block-09.js'))(窗口)
  return { 窗口, 收到 }
}

function 建主题窗口() {
  const 窗口 = new EventTarget() as 假窗口
  窗口.CustomEvent = CustomEvent
  窗口.parent = 窗口
  窗口.location = { search: '', origin: 'http://localhost:5173' }
  窗口.__grassMats = []
  窗口.__caoDiZhunBeiZhuangTai = { zhunBei: true, riZhi: [] }
  窗口.__dcm = {
    getPhase: () => 'night',
    setPhase: vi.fn(),
    initialized: true,
    on: vi.fn(),
  }
  窗口.__experience = {
    scene: { traverse: vi.fn() },
    engine: { camera: { group: { rotation: { x: 0, y: 0 } } } },
  }
  new Function('window', 读('public/grass-bg/scripts/block-05.js'))(窗口)
  return 窗口
}

function 建草地材质() {
  const 颜色 = () => {
    const 色 = {
      hex: '#000000',
      set(值: string) {
        this.hex = 值
        return this
      },
      getHexString() {
        return this.hex.replace('#', '')
      },
    }
    return { value: 色 }
  }
  return {
    uniforms: {
      uLightGreen: 颜色(),
      uDarkGreen: 颜色(),
      uLightDirt: 颜色(),
      uDarkDirt: 颜色(),
    },
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.documentElement.removeAttribute('data-theme')
})

describe('只保留波浪的开场', () => {
  it('预热后通知父页可播放，波浪材质可见且水彩滤镜已旁路', () => {
    vi.useFakeTimers()
    const 环境 = 建揭示窗口()
    expect(环境.可播放记录).toEqual([])
    环境.触发就绪()
    vi.advanceTimersByTime(10)
    expect(环境.可播放记录).toEqual([{ yuanYin: 'yuRe' }])
    expect(环境.波浪材质.visible).toBe(true)
    expect(环境.波浪网格.visible).toBe(true)
    expect(环境.波浪进度.value).toBe(0)
    expect(环境.进度.value).toBe(1)
    expect(环境.完成记录).toEqual([])
  })

  it('父页启动后波浪从中心展开，展开完成即收尾', () => {
    vi.useFakeTimers()
    const 环境 = 建揭示窗口()
    环境.触发就绪()
    vi.advanceTimersByTime(10)
    环境.触发波浪开始()
    环境.执行帧(0)
    环境.执行帧(50)
    expect(环境.波浪进度.value).toBe(1)
    expect(环境.进度.value).toBe(1)
    expect(环境.波浪材质.visible).toBe(false)
    expect(环境.波浪网格.visible).toBe(false)
    expect(环境.完成记录).toEqual([{ yuanYin: 'zhengChang' }])
  })

  it('弱动画偏好下直接显示最终画面，不播放波浪', () => {
    vi.useFakeTimers()
    const 环境 = 建揭示窗口({ 弱动画: true })
    环境.触发就绪()
    expect(环境.可播放记录).toEqual([{ yuanYin: 'yuRe' }])
    expect(环境.完成记录).toEqual([{ yuanYin: 'zhiJie' }])
    expect(环境.波浪材质.visible).toBe(false)
    expect(环境.进度.value).toBe(1)
  })

  it('父页强制收尾会立刻结束开场并可重复通知', () => {
    vi.useFakeTimers()
    const 环境 = 建揭示窗口()
    环境.触发就绪()
    vi.advanceTimersByTime(10)
    环境.触发强制收尾()
    expect(环境.波浪材质.visible).toBe(false)
    expect(环境.进度.value).toBe(1)
    expect(环境.完成记录).toEqual([{ yuanYin: 'waiBu' }])
    环境.触发强制收尾()
    expect(环境.完成记录).toEqual([{ yuanYin: 'waiBu' }, { yuanYin: 'waiBu-chongFu' }])
  })

  it('水彩滤镜从装载起就常驻旁路，外部再调 start 也不会冒出 0.5 起始值', () => {
    vi.useFakeTimers()
    const 环境 = 建揭示窗口()
    expect(环境.进度.value).toBe(1)
    环境.效果.start(() => {})
    expect(环境.进度.value).toBe(1)
    环境.效果.tweaksValue.progress = 0.5
    环境.效果.configure({ progress: 0.5, duration: 5 })
    expect(环境.进度.value).toBe(1)
    expect(环境.效果.tweaksValue.progress).toBe(1)
  })

  it('波浪层缺失时不崩溃，直接完成并显示最终画面', () => {
    vi.useFakeTimers()
    const 环境 = 建揭示窗口({ 缺波浪: true })
    环境.触发就绪()
    vi.advanceTimersByTime(10)
    expect(环境.可播放记录).toEqual([{ yuanYin: 'yuRe' }])
    expect(环境.完成记录).toEqual([{ yuanYin: 'wuJieKou' }])
    expect(环境.进度.value).toBe(1)
  })

  it('独立打开背景页时预热后直接播放波浪', () => {
    vi.useFakeTimers()
    const 环境 = 建揭示窗口({ 独立: true })
    环境.触发就绪()
    vi.advanceTimersByTime(10)
    expect(环境.可播放记录).toEqual([{ yuanYin: 'yuRe' }])
    expect(环境.波浪材质.visible).toBe(true)
    expect(环境.波浪进度.value).toBe(0)
    环境.执行帧(0)
    环境.执行帧(50)
    环境.执行帧(100)
    环境.执行帧(150)
    expect(环境.完成记录).toEqual([{ yuanYin: 'zhengChang' }])
  })
})

describe('父页握手模块转发可播放与完成', () => {
  it('就绪后转发 ke-bo-fang、jie-shi-wan-cheng 及原因', () => {
    vi.useFakeTimers()
    const { 窗口, 收到 } = 建握手窗口()
    vi.advanceTimersByTime(300)
    expect(收到.some((消息) => 消息.zhuangTai === 'jiu-xu')).toBe(true)
    窗口.dispatchEvent(new CustomEvent('cao-di-ke-bo-fang', { detail: { yuanYin: 'yuRe' } }))
    const 可播放 = 收到.find((消息) => 消息.zhuangTai === 'ke-bo-fang')
    expect(可播放?.yuanYin).toBe('yuRe')
    窗口.dispatchEvent(new CustomEvent('cao-di-jie-shi-wan-cheng', { detail: { yuanYin: 'zhengChang' } }))
    const 完成 = 收到.find((消息) => 消息.zhuangTai === 'jie-shi-wan-cheng')
    expect(完成?.yuanYin).toBe('zhengChang')
    expect(完成?.haoShi).toBe(123)
  })
})

describe('草地材质创建后泥土色立即恢复主题色', () => {
  it('bundle 在 push 后写入棕色时，微任务会改回当前主题的紫色', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', vi.fn())
    document.documentElement.setAttribute('data-theme', 'dark')
    const 窗口 = 建主题窗口()
    const 材质 = 建草地材质()
    ;(窗口.__grassMats as Array<typeof 材质>).push(材质)
    expect(材质.uniforms.uLightDirt.value.hex).toBe('#5e2d8a')
    expect(材质.uniforms.uDarkDirt.value.hex).toBe('#2e1450')
    材质.uniforms.uLightDirt.value.set('#b08746')
    材质.uniforms.uDarkDirt.value.set('#8a6a38')
    await Promise.resolve()
    await Promise.resolve()
    expect(材质.uniforms.uLightDirt.value.hex).toBe('#5e2d8a')
    expect(材质.uniforms.uDarkDirt.value.hex).toBe('#2e1450')
  })
})
