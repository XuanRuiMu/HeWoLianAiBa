import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { 声明块清单, 按档解析全部, 求几何算式 } from './主题令牌真源'

const 块们 = 声明块清单()
const 浅色表 = 按档解析全部('light', 块们)
const 深色表 = 按档解析全部('dark', 块们)
const 战绩源 = readFileSync(resolve(__dirname, '../views/过往战绩.vue'), 'utf8')
const 战绩样式 = [...战绩源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
const 缩进令牌 = '--zhanji-yi-dong-zuo-kuan'
const 触屏判据 = '(hover: none) and (pointer: coarse)'
const 窄视口判据 = '(max-width: 1023px)'

function 匹配右括号(文本: string, 左: number): number {
  let 深度 = 0
  for (let i = 左; i < 文本.length; i++) {
    if (文本[i] === '{') 深度++
    else if (文本[i] === '}') {
      深度--
      if (深度 === 0) return i
    }
  }
  throw new Error('样式块花括号不配对')
}

function 媒体头清单(): string[] {
  return [...战绩样式.matchAll(/@media([^{}]*)\{/g)].map((匹) => 匹[1].trim())
}

function 媒体上下文(头子串: string): string {
  const 出: string[] = []
  const 正 = /@media([^{}]*)\{/g
  let 匹: RegExpExecArray | null
  while ((匹 = 正.exec(战绩样式))) {
    if (!匹[1].includes(头子串)) continue
    const 内 = 匹.index + 匹[0].length
    出.push(战绩样式.slice(内, 匹配右括号(战绩样式, 内 - 1)))
  }
  expect(出.length, `未找到 @media 头含「${头子串}」的上下文`).toBeGreaterThan(0)
  return 出.join('\n')
}

function 基线上下文(): string {
  let 文本 = 战绩样式
  const 正 = /@media[^{}]*\{/g
  let 匹: RegExpExecArray | null
  while ((匹 = 正.exec(文本))) {
    const 尾 = 匹配右括号(文本, 匹.index + 匹[0].length - 1)
    文本 = 文本.slice(0, 匹.index) + 文本.slice(尾 + 1)
    正.lastIndex = 匹.index
  }
  return 文本
}

function 规则体(上下文: string, 选择器: string): string {
  const 转义 = 选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const 匹配 = new RegExp(`(?:^|[}\\s])${转义}\\s*\\{([^}]*)\\}`).exec(上下文)
  expect(匹配, `缺少规则 ${选择器}`).not.toBeNull()
  return (匹配 as RegExpMatchArray)[1]
}

function 声明(体: string, 属性: string): string | null {
  const 匹 = new RegExp(`(?:^|;)\\s*${属性}\\s*:\\s*([^;]+)`).exec(体)
  return 匹 ? 匹[1].trim().replace(/\s+/g, ' ') : null
}

describe('过往战绩窄屏卡片操作区零横向溢出', () => {
  const 窄屏 = 媒体上下文('(max-width: 640px)')
  const 操作区 = 规则体(窄屏, '.zhanji-you')

  it('回归锁：操作区不得再用 width:100% 叠左缩进（旧写法整行多出 74px 被屏幕裁切）', () => {
    expect(声明(操作区, 'width'), 'width:100% 与 margin-left 叠加必然溢出，禁止复活').toBeNull()
  })

  it('外框几何恒等式：margin-left + flex-basis 恰好等于一行（100%）', () => {
    const 缩进字面量 = new RegExp(`${缩进令牌}:\\s*([^;]+);`).exec(战绩样式)?.[1].trim()
    expect(缩进字面量, `${缩进令牌} 必须在 .zhanji-yemian 上声明`).toBeDefined()
    const 缩进 = 求几何算式(String(缩进字面量), 块们)
    expect(缩进, '缩进宽必须是正长度，否则恒等式无意义').toBeGreaterThan(0)
    expect(声明(操作区, 'margin-left')).toBe(`var(${缩进令牌})`)
    expect(声明(操作区, 'flex'), '必须用 flex 简写同时给出收缩性与基准').toBe(
      `1 1 calc(100% - var(${缩进令牌}))`,
    )
  })

  it('操作区横排可换行且不被最小宽度锁死', () => {
    expect(声明(操作区, 'flex-direction')).toBe('row')
    expect(声明(操作区, 'flex-wrap')).toBe('wrap')
    expect(声明(操作区, 'min-width')).toBe('0')
  })

  it('基线 flex-shrink:0 只服务宽屏，窄屏由 flex 简写接管', () => {
    const 基线 = 规则体(基线上下文(), '.zhanji-you')
    expect(声明(基线, 'flex-shrink')).toBe('0')
    expect(声明(基线, 'width')).toBeNull()
    expect(声明(基线, 'flex-direction')).toBe('column')
  })

  it('分类下拉的窄屏收缩规则挂在真实元素上（防死选择器空转）', () => {
    expect(/<TongYongXiaLa[^>]*class="yi-dong-fenlei"/.test(战绩源)).toBe(true)
    const 下拉 = 规则体(窄屏, '.yi-dong-fenlei')
    expect(声明(下拉, 'flex')).toBe('1 1 auto')
    expect(声明(下拉, 'min-width')).toBe('0')
    expect(声明(下拉, 'max-width')).toBe('none')
  })

  it('同类溢出一起收口：卡片内层换行、信息列与左栏允许收缩', () => {
    expect(声明(规则体(窄屏, '.zhanji-kapian-nei'), 'flex-wrap')).toBe('wrap')
    const 基线 = 基线上下文()
    for (const 选择器 of ['.zhanji-zuo', '.zhanji-xinxi', '.zuihou-xiao-xi']) {
      expect(声明(规则体(基线, 选择器), 'min-width'), `${选择器} 缺 min-width:0 会撑破窄屏`).toBe('0')
    }
    expect(声明(规则体(基线, '.zuihou-nei-rong'), 'text-overflow')).toBe('ellipsis')
    expect(声明(规则体(基线, '.paixu-weidu-zu'), 'flex-wrap')).toBe('wrap')
    expect(声明(规则体(基线, '.paixu-biaoqian'), 'flex-shrink')).toBe('0')
    expect(声明(规则体(基线, '.zhanji-wei'), 'flex-shrink')).toBe('0')
  })
})

describe('过往战绩非桌面端可见滚动条', () => {
  it('判据不嗅探 UA，触屏与窄视口两条并列', () => {
    const 头 = 媒体头清单().find((一) => 一.includes(触屏判据))
    expect(头, '缺少触屏媒体查询').toBeDefined()
    expect(头).toContain(窄视口判据)
    expect(战绩源).not.toMatch(/navigator\.userAgent/i)
  })

  it('滚动容器在非桌面端常驻滚动条，配色走 --gundong-tiao-* 令牌', () => {
    const 体 = 规则体(媒体上下文(触屏判据), '.zhanji-liebiao')
    expect(声明(体, 'overflow-y')).toBe('scroll')
    expect(声明(体, 'scrollbar-width')).toBe('auto')
    expect(声明(体, 'scrollbar-color')).toBe('var(--gundong-tiao-huakuai) var(--gundong-tiao-guidao)')
    expect(体).not.toMatch(/\d+px/)
  })

  it('滑块/轨道/宽度复用项目既有滚动条令牌，不自造一套', () => {
    const 上下文 = 媒体上下文(触屏判据)
    expect(声明(规则体(上下文, '.zhanji-liebiao::-webkit-scrollbar'), 'width')).toBe(
      'var(--gundong-tiao-kuan-du)',
    )
    const 滑块 = 规则体(上下文, '.zhanji-liebiao::-webkit-scrollbar-thumb')
    expect(声明(滑块, 'background')).toBe('var(--gundong-tiao-huakuai)')
    expect(声明(滑块, 'border-radius')).toBe('var(--gundong-tiao-kuan-du)')
    expect(声明(规则体(上下文, '.zhanji-liebiao::-webkit-scrollbar-track'), 'background')).toBe(
      'var(--gundong-tiao-guidao)',
    )
  })

  it('桌面端保持现状：基线仍是 auto 溢出 + thin 滚动条 + 透明轨道', () => {
    const 基线 = 规则体(基线上下文(), '.zhanji-liebiao')
    expect(声明(基线, 'overflow-y')).toBe('auto')
    expect(声明(基线, 'scrollbar-width')).toBe('thin')
    expect(声明(规则体(基线上下文(), '.zhanji-liebiao::-webkit-scrollbar-track'), 'background')).toBe(
      'transparent',
    )
  })

  it('滚动条令牌明暗成对：深浅档颜色不塌陷、宽度两档一致', () => {
    for (const 令牌 of ['--gundong-tiao-huakuai', '--gundong-tiao-guidao']) {
      expect(浅色表.get(令牌), `${令牌} 浅色档缺失`).toBeTruthy()
      expect(深色表.get(令牌), `${令牌} 深色档缺失`).toBeTruthy()
      expect(浅色表.get(令牌)).not.toBe(深色表.get(令牌))
    }
    expect(浅色表.get('--gundong-tiao-kuan-du')).toBe('8px')
    expect(深色表.get('--gundong-tiao-kuan-du')).toBe('8px')
    expect(求几何算式('var(--gundong-tiao-kuan-du)', 块们)).toBeGreaterThan(0)
  })
})
