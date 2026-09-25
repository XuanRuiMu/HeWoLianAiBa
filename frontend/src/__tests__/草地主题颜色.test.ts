import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const 草地页面路径 = path.resolve(process.cwd(), 'public', 'grass-bg', 'grass-bg.html')
const 夜色 = ['#b07be0', '#7a3fa0', '#5e2d8a', '#2e1450']

interface 颜色 {
  值: string
  set(值: string): void
  copy(颜色: 颜色): void
  clone(): 颜色
}

interface uniform {
  value: 颜色
}

interface 材质 {
  uniforms: Record<string, uniform>
}

function 读取主题脚本(): string {
  const html = fs.readFileSync(草地页面路径, 'utf8')
  const 注释起点 = html.indexOf('/* 主题联动')
  const 脚本起点 = html.lastIndexOf('<script>', 注释起点) + '<script>'.length
  const 脚本终点 = html.indexOf('</script>', 脚本起点)
  expect(注释起点).toBeGreaterThan(-1)
  expect(脚本终点).toBeGreaterThan(脚本起点)
  return html.slice(脚本起点, 脚本终点)
}

function 造颜色(初值: string): 颜色 {
  return {
    值: 初值,
    set(值: string) {
      this.值 = 值
    },
    copy(颜色: 颜色) {
      this.值 = 颜色.值
    },
    clone() {
      return 造颜色(this.值)
    },
  }
}

function 造材质(浅色: string, 深色: string): 材质 {
  return {
    uniforms: {
      uLightGreen: { value: 造颜色(浅色) },
      uDarkGreen: { value: 造颜色(深色) },
      uLightDirt: { value: 造颜色(浅色) },
      uDarkDirt: { value: 造颜色(深色) },
    },
  }
}

function 造前景地面材质(浅色: string, 深色: string): 材质 {
  return {
    uniforms: {
      uGrassLightColor: { value: 造颜色(浅色) },
      uGrassDarkColor: { value: 造颜色(深色) },
    },
  }
}

function 造远处地面材质(): 材质 {
  return {
    uniforms: {
      uGrassColor: { value: 造颜色('#d9a441') },
      uGrassColorAlt: { value: 造颜色('#9c6b1e') },
      uDirtColor: { value: 造颜色('#b08746') },
      uRockColor: { value: 造颜色('#8a6a38') },
      uWaterColor: { value: 造颜色('#3a6ea5') },
      uSnowColor: { value: 造颜色('#ffffff') },
    },
  }
}

function 启动主题脚本(草材质: 材质[], 场景材质: 材质[] = []) {
  class 空观察器 {
    observe() {}
    disconnect() {}
  }

  const 假窗口 = {
    parent: undefined as unknown,
    __grassMats: 草材质,
    __experience: {
      scene: {
        traverse(回调: (对象: { material: 材质 }) => void) {
          场景材质.forEach((material) => 回调({ material }))
        },
      },
      engine: { camera: { group: { rotation: { x: 0, y: 0 } } } },
    },
    addEventListener: vi.fn(),
  }
  假窗口.parent = 假窗口
  const 脚本 = 读取主题脚本().replace(
    'setInterval(syncTheme, 400);',
    'window.__syncThemeForTest = syncTheme;',
  )
  new Function(
    'window',
    'document',
    'MutationObserver',
    'requestAnimationFrame',
    脚本,
  )(假窗口, document, 空观察器, () => 0)
  const 测试窗口 = 假窗口 as typeof 假窗口 & { __syncThemeForTest?: () => void }
  expect(测试窗口.__syncThemeForTest).toBeTypeOf('function')
  return { 假窗口, 同步主题: 测试窗口.__syncThemeForTest! }
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  vi.restoreAllMocks()
})

describe('草地主题颜色', () => {
  it('草材质尚未创建时仍记录深色主题覆盖值', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    const { 假窗口, 同步主题 } = 启动主题脚本([])

    同步主题()

    expect(假窗口.__grassOverride).toEqual(夜色)
  })

  it('草叶、前景岛屿地面与远处地面随深浅主题同步', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    const 草叶材质 = 造材质('#d9a441', '#9c6b1e')
    const 顶岛地面 = 造前景地面材质('#d9a441', '#9c6b1e')
    const 主岛地面 = 造前景地面材质('#d9a441', '#9c6b1e')
    const 远处地面 = 造远处地面材质()
    const { 同步主题 } = 启动主题脚本([草叶材质], [顶岛地面, 主岛地面, 远处地面])

    同步主题()

    expect(草叶材质.uniforms.uLightGreen.value.值).toBe('#b07be0')
    expect(草叶材质.uniforms.uDarkGreen.value.值).toBe('#7a3fa0')
    expect(顶岛地面.uniforms.uGrassLightColor.value.值).toBe('#b07be0')
    expect(主岛地面.uniforms.uGrassDarkColor.value.值).toBe('#7a3fa0')
    expect(远处地面.uniforms.uGrassColor.value.值).toBe('#b07be0')

    document.documentElement.setAttribute('data-theme', 'light')
    同步主题()

    expect(草叶材质.uniforms.uLightGreen.value.值).toBe('#d9a441')
    expect(顶岛地面.uniforms.uGrassLightColor.value.值).toBe('#d9a441')
    expect(主岛地面.uniforms.uGrassDarkColor.value.值).toBe('#9c6b1e')
    expect(远处地面.uniforms.uGrassColor.value.值).toBe('#d9a441')
  })
})
