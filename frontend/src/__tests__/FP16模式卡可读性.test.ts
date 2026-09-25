import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { 声明块清单, 按档解析全部 } from './主题令牌真源'
import { 规则清单 } from './CSS级联真源'

const 主页源码 = readFileSync(resolve(__dirname, '../views/主页内容.vue'), 'utf8')
const 样式源码 = [...主页源码.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
  .map((项) => 项[1])
  .join('\n')
const 规则们 = 规则清单(样式源码)
const 令牌们 = 声明块清单()

type RGB = [number, number, number]
type 色 = { rgb: RGB; alpha: number }
type 主题档 = 'light' | 'dark'

const 主题清单: 主题档[] = ['light', 'dark']
const 模式清单 = ['putong', 'tiaozhan'] as const
const 模式选择器 = {
  putong: '.putong-moshi-kapian',
  tiaozhan: '.tiaozhan-moshi-kapian',
} as const

function 归一(值: string): string {
  return 值.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim()
}

function 声明of(选择器: string, 属性: string): string {
  const 命中 = 规则们.filter((项) => 项.选择器 === 选择器 && 项.声明.has(属性))
  expect(命中, `${选择器}{${属性}} 应恰好一处声明`).toHaveLength(1)
  return 归一(命中[0].声明.get(属性) as string)
}

function 首个声明of(选择器: string, 属性: string): string {
  const 命中 = 规则们.filter((项) => 项.选择器 === 选择器 && 项.声明.has(属性))
  expect(命中.length, `${选择器}{${属性}} 至少应有一处声明`).toBeGreaterThan(0)
  return 归一(命中[0].声明.get(属性) as string)
}

function 取值(档: 主题档, 令牌: string): string {
  const 值 = 按档解析全部(档, 令牌们).get(令牌)
  expect(值, `${档} 档缺少 ${令牌}`).toBeDefined()
  return (值 as string).trim()
}

function 解析色(值: string): 色 {
  const rgb = 值.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/)
  if (rgb) {
    return {
      rgb: [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] as RGB,
      alpha: rgb[4] === undefined ? 1 : Number(rgb[4]),
    }
  }
  const hex = 值.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i)
  if (!hex) throw new Error(`无法解析颜色：${值}`)
  return {
    rgb: [
      Number.parseInt(hex[1].slice(0, 2), 16),
      Number.parseInt(hex[1].slice(2, 4), 16),
      Number.parseInt(hex[1].slice(4, 6), 16),
    ],
    alpha: hex[2] ? Number.parseInt(hex[2], 16) / 255 : 1,
  }
}

function 压合(前景: RGB, alpha: number, 底: RGB): RGB {
  return [0, 1, 2].map((下标) => 前景[下标] * alpha + 底[下标] * (1 - alpha)) as RGB
}

function 通道线性(值: number): number {
  const v = 值 / 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function 亮度(色值: RGB): number {
  return 0.2126 * 通道线性(色值[0]) + 0.7152 * 通道线性(色值[1]) + 0.0722 * 通道线性(色值[2])
}

function 对比度(甲: RGB, 乙: RGB): number {
  const a = 亮度(甲)
  const b = 亮度(乙)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function 背景集(档: 主题档): RGB[] {
  return [
    [0, 0, 0],
    [255, 255, 255],
    解析色(取值(档, '--beijing-zhuse')).rgb,
    解析色(取值(档, '--beijing-ciuse')).rgb,
  ]
}

function 最坏对比度(档: 主题档, 字色: 色): number {
  const 卡面 = 解析色(取值(档, '--moshi-kapian-zheyan'))
  return Math.min(
    ...背景集(档).map((背景) => {
      const 面板 = 压合(卡面.rgb, 卡面.alpha, 背景)
      return 对比度(压合(字色.rgb, 字色.alpha, 面板), 面板)
    }),
  )
}

describe('FP-09 模式卡统一视觉契约', () => {
  it('普通与挑战仅声明共享类和语义差异，卡面与遮罩统一引用 alpha 0.75 令牌', () => {
    expect(声明of('.moshi-kapian', 'background-color')).toBe('var(--moshi-kapian-zheyan)')
    expect(声明of('.moshi-kapian', 'border')).toBe('1px solid var(--kapian-mian-biankuang)')
    for (const 模式 of 模式清单) {
      expect(声明of(模式选择器[模式], '--moshi-kapian-zhu')).toMatch(/^var\(--/)
      expect(
        规则们.some(
          (项) =>
            项.选择器 === 模式选择器[模式] &&
            (项.声明.has('background-color') ||
              项.声明.has('background-image') ||
              项.声明.has('opacity')),
        ),
      ).toBe(false)
    }
    for (const 档 of 主题清单) {
      expect(解析色(取值(档, '--moshi-kapian-zheyan')).alpha).toBe(0.75)
    }
  })

  it('深浅主题都保留可读文字色，不以降低文字透明度补偿卡面 alpha', () => {
    expect(声明of('.kapian-biaoti', 'color')).toBe('var(--kapian-mian-biaoti)')
    expect(声明of('.kapian-fubiaoti', 'color')).toBe('var(--kapian-mian-zhengwen)')
    expect(声明of('.yulan-xiangmu', 'color')).toBe('var(--kapian-mian-zhengwen)')
    expect(声明of('.kaishi-wenben', 'color')).toBe('var(--kapian-mian-zhengwen)')
    for (const 档 of 主题清单) {
      expect(最坏对比度(档, 解析色(取值(档, '--kapian-mian-biaoti')))).toBeGreaterThanOrEqual(4.5)
      expect(最坏对比度(档, 解析色(取值(档, '--kapian-mian-zhengwen')))).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('模式卡样式不重新引入裸色或逐卡渐变 alpha', () => {
    const 选择器判定 = /(moshi-kapian|kapian-|yulan-|kaishi-)/
    const 颜色属性 = new Set([
      'color',
      'background',
      'background-color',
      'background-image',
      'border',
      'border-color',
      'border-top',
      'border-top-color',
      'box-shadow',
      'outline',
    ])
    const 裸色: string[] = []
    for (const 项 of 规则们) {
      if (!选择器判定.test(项.选择器)) continue
      for (const [属性, 值] of 项.声明) {
        if (!颜色属性.has(属性)) continue
        for (const 色 of 值.match(/rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{3,8}\b/gi) ?? []) {
          裸色.push(`${项.选择器}|${属性}|${色}`)
        }
      }
    }
    expect(裸色).toEqual([])
  })

  it('焦点、hover、active、disabled 与 200 至 300ms 装饰运动均由共享契约覆盖', () => {
    const 全局样式 = readFileSync(resolve(__dirname, '../styles/global.css'), 'utf8')
    expect(全局样式).toMatch(
      /:where\(:focus-visible\)\s*\{[^}]*outline:\s*var\(--jujiao-huan-kuan-du\) solid var\(--jujiao-huan-yanse\)/,
    )
    expect(声明of('.moshi-kapian:hover:not(:disabled)', 'transform')).toBe('translateY(-4px)')
    expect(声明of('.moshi-kapian:active:not(:disabled)', 'transform')).toBe(
      'translateY(-1px) scale(0.99)',
    )
    expect(声明of('.moshi-kapian:disabled', 'cursor')).toBe('not-allowed')
    expect(首个声明of('.moshi-kapian', 'transition')).toBe(
      'transform var(--moshi-kapian-dong-xiao) var(--quxian-biao-zhun)',
    )
    for (const 模式 of 模式清单) {
      expect(声明of(模式选择器[模式], 'animation')).toBe(
        'moshi-kapian-jinru var(--moshi-kapian-dong-xiao) var(--quxian-tan-chu) both',
      )
    }
    const 时长 = Number.parseFloat(取值('light', '--moshi-kapian-dong-xiao'))
    expect(时长).toBeGreaterThanOrEqual(200)
    expect(时长).toBeLessThanOrEqual(300)
  })

  it('reduced-motion 同时关闭模式卡入场、位移和过渡', () => {
    expect(样式源码).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.moshi-kapian[\s\S]*animation: none/,
    )
    expect(样式源码).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.moshi-kapian[\s\S]*transition: none !important/,
    )
  })
})
