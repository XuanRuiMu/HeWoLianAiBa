import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const 项目根 = resolve(__dirname, '..', '..')
const 读 = (相对: string) => readFileSync(resolve(项目根, 相对), 'utf8')

type 假窗口 = Record<string, unknown> & EventTarget & { __caodiWanCheng?: unknown }

function 建揭示窗口(选项: { 独立?: boolean; 弱动画?: boolean; 超时?: number } = {}) {
  const 窗口 = new EventTarget() as 假窗口
  窗口.CustomEvent = CustomEvent
  窗口.parent = 选项.独立 ? 窗口 : { postMessage: vi.fn() }
  窗口.location = {
    search: `?jieShiChaoShi=${选项.超时 ?? 8000}&diaoShi=0`,
    origin: 'http://localhost:5173',
  }
  窗口.matchMedia = vi.fn(() => ({ matches: !!选项.弱动画 }))
  窗口.__caoDiZhunBeiZhuangTai = { zhunBei: false, riZhi: [] }
  const 进度 = { value: -1 }
  const 效果 = {
    getUniform: () => 进度,
    tweaksValue: { progress: -1 },
    tween: { kill: vi.fn() },
  }
  let 完成回调: (() => void) | null = null
  const 启动 = vi.fn((回调: () => void) => {
    完成回调 = 回调
  })
  窗口.__experience = {
    postProcessing: {
      startReveal: 启动,
      waterColorRevealIntegration: { waterColorRevealEffect: 效果 },
    },
  }
  const 完成记录: Array<{ yuanYin?: string }> = []
  窗口.addEventListener('cao-di-jie-shi-wan-cheng', (事件) => {
    完成记录.push((事件 as CustomEvent).detail || {})
  })
  new Function('window', 读('public/grass-bg/scripts/block-06.js'))(窗口)
  return {
    窗口,
    进度,
    效果,
    启动,
    完成记录,
    触发完成回调: () => {
      完成回调?.()
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

describe('开场揭示在隐藏状态完成', () => {
  it('就绪后开始揭示，完成回调加稳定延迟后置进度 1 并通知父页', () => {
    vi.useFakeTimers()
    const 环境 = 建揭示窗口()
    expect(环境.进度.value).toBe(0)
    环境.窗口.dispatchEvent(new CustomEvent('cao-di-jiu-xu'))
    expect(环境.启动).toHaveBeenCalledTimes(1)
    expect(环境.进度.value).toBe(0)
    环境.触发完成回调()
    vi.advanceTimersByTime(499)
    expect(环境.进度.value).toBe(0)
    vi.advanceTimersByTime(1)
    expect(环境.进度.value).toBe(1)
    expect(环境.效果.tween.kill).toHaveBeenCalled()
    expect(环境.完成记录).toEqual([{ yuanYin: 'callback' }])
  })

  it('揭示迟迟不回调时硬超时收尾，不会让 iframe 永远停在蓝底', () => {
    vi.useFakeTimers()
    const 环境 = 建揭示窗口({ 超时: 8000 })
    环境.窗口.dispatchEvent(new CustomEvent('cao-di-jiu-xu'))
    vi.advanceTimersByTime(7999)
    expect(环境.进度.value).toBe(0)
    vi.advanceTimersByTime(1)
    expect(环境.进度.value).toBe(1)
    expect(环境.效果.tween.kill).toHaveBeenCalled()
    expect(环境.完成记录).toEqual([{ yuanYin: 'chaoShi' }])
  })

  it('弱动画偏好下直接完成，不播放水彩揭示', () => {
    vi.useFakeTimers()
    const 环境 = 建揭示窗口({ 弱动画: true })
    环境.窗口.dispatchEvent(new CustomEvent('cao-di-jiu-xu'))
    expect(环境.启动).not.toHaveBeenCalled()
    expect(环境.进度.value).toBe(1)
    expect(环境.完成记录).toEqual([{ yuanYin: 'reduced-motion' }])
  })

  it('父页强制收尾会立即结束揭示并可重复通知', () => {
    vi.useFakeTimers()
    const 环境 = 建揭示窗口()
    环境.窗口.dispatchEvent(new CustomEvent('cao-di-jiu-xu'))
    环境.窗口.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'grass-reveal-finish' },
        origin: 'http://localhost:5173',
      }),
    )
    expect(环境.进度.value).toBe(1)
    expect(环境.效果.tween.kill).toHaveBeenCalled()
    expect(环境.完成记录).toEqual([{ yuanYin: 'waiBu' }])
    环境.窗口.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'grass-reveal-finish' },
        origin: 'http://localhost:5173',
      }),
    )
    expect(环境.完成记录).toEqual([{ yuanYin: 'waiBu' }, { yuanYin: 'waiBu-chongFu' }])
  })

  it('独立打开背景页时直接显示最终草地，不播放揭示', () => {
    vi.useFakeTimers()
    const 环境 = 建揭示窗口({ 独立: true })
    环境.窗口.dispatchEvent(new CustomEvent('cao-di-jiu-xu'))
    expect(环境.启动).not.toHaveBeenCalled()
    expect(环境.进度.value).toBe(1)
    expect(环境.完成记录).toEqual([])
  })
})

describe('父页握手模块转发揭示完成', () => {
  it('就绪后转发 jie-shi-wan-cheng 及原因', () => {
    vi.useFakeTimers()
    const { 窗口, 收到 } = 建握手窗口()
    vi.advanceTimersByTime(300)
    expect(收到.some((消息) => 消息.zhuangTai === 'jiu-xu')).toBe(true)
    窗口.dispatchEvent(new CustomEvent('cao-di-jie-shi-wan-cheng', { detail: { yuanYin: 'callback' } }))
    const 完成 = 收到.find((消息) => 消息.zhuangTai === 'jie-shi-wan-cheng')
    expect(完成?.yuanYin).toBe('callback')
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
