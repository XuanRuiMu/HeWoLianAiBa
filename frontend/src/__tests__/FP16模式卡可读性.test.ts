import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { 声明块清单, 按档解析全部 } from './主题令牌真源'
import { 令牌名, 规则清单 } from './CSS级联真源'

// FP-16（需求 #3「挑战模式/普通模式卡片的背景透明度必须提高，字看不清」）。
// 判据全部走**解析后的值**：颜色从 主页内容.vue 的声明里读出，var() 经 variables.css 真源求值，
// alpha 与底色先算成实色再算 WCAG 对比度。「源码字符串包含」在本文件里只用于
// "这条声明引用了哪枚令牌"这一层，可读性结论一律由数值判定给出。
//
// 两条被本文件钉住的事实（FP-01 交回的第 ① 项，I3 被证伪）：
//   · 改前标题 #ffffff 压在 alpha .05–.11 的卡面上本就 ≥13:1 —— 背景 alpha 不是"字看不清"的主因；
//   · 改前副标题 rgba(255,255,255,.42) 实测 <7:1 —— 只提 alpha 治不好它，文字色必须同时改吃令牌。
// 用户原话要求"背景透明度必须提高"，故两件事都做；下面三例反证把"只做一半必不达标"钉成红灯。

const 主页源码 = readFileSync(resolve(__dirname, '../views/主页内容.vue'), 'utf8')
const 样式源码 = [...主页源码.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
  .map((项) => 项[1])
  .join('\n')
const 规则们 = 规则清单(样式源码)
const 块们 = 声明块清单()

type RGB = [number, number, number]
type 色 = { rgb: RGB; alpha: number }
type 主题档 = 'light' | 'dark'
type 模式 = 'putong' | 'tiaozhan'

const 模式卡: Record<模式, string> = {
  putong: '.putong-moshi-kapian',
  tiaozhan: '.tiaozhan-moshi-kapian',
}
const 模式清单 = Object.keys(模式卡) as 模式[]
const 浅色前缀 = ":root[data-theme='light'] "

/** 改前形态（git 基线逐字抄录，只用于反证，不参与"当前实现"的判定） */
const 改前 = {
  wash: {
    dark: {
      putong: ['rgba(107, 140, 166, 0.11)', 'rgba(147, 130, 186, 0.07)', 'rgba(107, 140, 166, 0.05)'],
      tiaozhan: ['rgba(255, 107, 157, 0.11)', 'rgba(251, 146, 60, 0.07)', 'rgba(255, 107, 157, 0.05)'],
    },
    light: {
      putong: ['rgba(245, 248, 252, 0.82)', 'rgba(240, 244, 250, 0.78)', 'rgba(245, 248, 252, 0.74)'],
      tiaozhan: ['rgba(255, 248, 250, 0.82)', 'rgba(255, 245, 240, 0.78)', 'rgba(255, 248, 250, 0.74)'],
    },
  } as Record<主题档, Record<模式, string[]>>,
  标题: { dark: '#ffffff', light: '#191919' } as Record<主题档, string>,
  副标题: { dark: 'rgba(255, 255, 255, 0.42)', light: 'rgba(0, 0, 0, 0.55)' } as Record<主题档, string>,
  /**
   * FP-16b：预览行的**旧相乘形态**（只用于反证）。静止态由两个通道共同决定：
   * `.yulan-xiangmu{opacity:.62}` × `.yulan-wenzi{color:rgba(...,.55)}` ⇒ 有效 alpha .34/.3596。
   */
  预览行: {
    字色: { dark: 'rgba(255, 255, 255, 0.55)', light: 'rgba(0, 0, 0, 0.58)' } as Record<主题档, string>,
    行透明度: 0.62,
  },
}

/** 本 FP 独占的卡面规则块：改后声明清单（几何一字未动，故此处同时是"只改颜色层"的证据） */
const 卡面规则基线: Record<string, Record<string, string>> = {
  [模式卡.putong]: {
    'background-color': 'var(--kapian-mian-beijing)',
    'background-image':
      'linear-gradient(135deg, rgba(107, 140, 166, 0.11) 0%, rgba(147, 130, 186, 0.07) 50%, rgba(107, 140, 166, 0.05) 100%)',
    border: '1px solid var(--kapian-mian-biankuang)',
  },
  [模式卡.tiaozhan]: {
    'background-color': 'var(--kapian-mian-beijing)',
    'background-image':
      'linear-gradient(135deg, rgba(255, 107, 157, 0.11) 0%, rgba(251, 146, 60, 0.07) 50%, rgba(255, 107, 157, 0.05) 100%)',
    border: '1px solid var(--kapian-mian-biankuang)',
  },
  [`${浅色前缀}${模式卡.putong}`]: {
    'background-image':
      'linear-gradient(135deg, rgba(245, 248, 252, 0.82) 0%, rgba(240, 244, 250, 0.78) 50%, rgba(245, 248, 252, 0.74) 100%)',
  },
  [`${浅色前缀}${模式卡.tiaozhan}`]: {
    'background-image':
      'linear-gradient(135deg, rgba(255, 248, 250, 0.82) 0%, rgba(255, 245, 240, 0.78) 50%, rgba(255, 248, 250, 0.74) 100%)',
  },
  '.kapian-biaoti': {
    'font-size': '16px',
    'font-weight': '700',
    color: 'var(--kapian-mian-biaoti)',
    margin: '0',
    'letter-spacing': '0.5px',
  },
  '.kapian-fubiaoti': {
    'font-size': '11.5px',
    color: 'var(--kapian-mian-zhengwen)',
    margin: '0',
  },
}

/** 卡面规则块内改前既有的色值字面量（FP-16 一条未新增；新增即红，清掉一条也须同步本账本。
 *  FP-16b 缩短 2 条：`.yulan-wenzi` 的两档字面量随「预览行颜色上收到 .yulan-xiangmu 单一真源」消失 ⇒ 24 条） */
const 卡面色值字面量账本: string[] = [  `${模式卡.putong} | background-image | rgba(107, 140, 166, 0.11)`,
  `${模式卡.putong} | background-image | rgba(147, 130, 186, 0.07)`,
  `${模式卡.putong} | background-image | rgba(107, 140, 166, 0.05)`,
  `${模式卡.tiaozhan} | background-image | rgba(255, 107, 157, 0.11)`,
  `${模式卡.tiaozhan} | background-image | rgba(251, 146, 60, 0.07)`,
  `${模式卡.tiaozhan} | background-image | rgba(255, 107, 157, 0.05)`,
  `${浅色前缀}${模式卡.putong} | background-image | rgba(245, 248, 252, 0.82)`,
  `${浅色前缀}${模式卡.putong} | background-image | rgba(240, 244, 250, 0.78)`,
  `${浅色前缀}${模式卡.putong} | background-image | rgba(245, 248, 252, 0.74)`,
  `${浅色前缀}${模式卡.tiaozhan} | background-image | rgba(255, 248, 250, 0.82)`,
  `${浅色前缀}${模式卡.tiaozhan} | background-image | rgba(255, 245, 240, 0.78)`,
  `${浅色前缀}${模式卡.tiaozhan} | background-image | rgba(255, 248, 250, 0.74)`,
  `${模式卡.putong}:hover | border-color | rgba(107, 140, 166, 0.25)`,
  `${模式卡.tiaozhan}:hover | border-color | rgba(255, 107, 157, 0.25)`,
  `${模式卡.putong} .kapian-tubiao-qu | background | rgba(107, 140, 166, 0.28)`,
  `${模式卡.putong} .kapian-tubiao-qu | background | rgba(196, 160, 176, 0.18)`,
  `${模式卡.tiaozhan} .kapian-tubiao-qu | background | rgba(255, 107, 157, 0.28)`,
  `${模式卡.tiaozhan} .kapian-tubiao-qu | background | rgba(251, 191, 36, 0.18)`,
  `${浅色前缀}${模式卡.putong} .kapian-tubiao-qu | background | rgba(107, 140, 166, 0.1)`,
  `${浅色前缀}${模式卡.putong} .kapian-tubiao-qu | background | rgba(196, 160, 176, 0.06)`,
  `${浅色前缀}${模式卡.tiaozhan} .kapian-tubiao-qu | background | rgba(255, 107, 157, 0.1)`,
  `${浅色前缀}${模式卡.tiaozhan} .kapian-tubiao-qu | background | rgba(251, 191, 36, 0.06)`,
  '.kapian-dibu | border-top | rgba(255, 255, 255, 0.04)',
  `${浅色前缀}.kapian-dibu | border-top-color | rgba(0, 0, 0, 0.03)`,
]

/** 卡片基础盒的改前声明（`background: transparent` 是主页背景契约的锚点，一字未动） */
const 卡面几何基线: Record<string, [string, string, Record<string, string>]> = {
  卡: [
    '.moshi-kapian',
    'max-width',
    {
      width: '100%',
      'max-width': '360px',
      position: 'relative',
      padding: '0',
      border: 'none',
      'border-radius': '22px',
      cursor: 'pointer',
      overflow: 'hidden',
      'text-align': 'left',
      background: 'transparent',
      transition:
        'transform 0.4s var(--quxian-biao-zhun), box-shadow 0.4s var(--quxian-biao-zhun)',
    },
  ],
  图标区: [
    '.kapian-tubiao-qu',
    'flex-shrink',
    {
      'flex-shrink': '0',
      width: '48px',
      height: '48px',
      display: 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'border-radius': '14px',
      transition: 'transform 0.3s ease',
    },
  ],
}

/**
 * FP-16b 预览行的改前（git 基线）**非颜色**属性逐字冻结：几何、字号、字重、错峰时序、hover 位移
 * 一条都不许被这次改动顺手碰过。颜色通道单列在下面（那是本 FP 唯一允许变化的地方）。
 */
const 预览行选择器 = '.yulan-xiangmu'
const 预览行hover选择器 = '.moshi-kapian:hover .yulan-xiangmu'
const 预览文字选择器 = '.yulan-wenzi'
const 预览行规则基线: Record<string, [string, string, Record<string, string>]> = {
  预览区: [
    '.kapian-yulan-qu',
    'display',
    { display: 'flex', 'flex-direction': 'column', gap: '7px', padding: '0 22px 12px' },
  ],
  预览行: [
    预览行选择器,
    'display',
    {
      display: 'flex',
      'align-items': 'center',
      gap: '10px',
      color: 'color-mix(in srgb, var(--kapian-mian-zhengwen) 75%, transparent)',
      transition: 'color 0.3s ease, transform 0.3s ease',
    },
  ],
  预览点: [
    '.yulan-dian',
    'width',
    { width: '5px', height: '5px', 'border-radius': '50%', 'flex-shrink': '0' },
  ],
  普通预览点: [
    `${模式卡.putong} .yulan-dian`,
    'background',
    {
      background: 'var(--nuanhui-lan)',
      'box-shadow': '0 0 5px rgba(107, 140, 166, 0.35)',
    },
  ],
  挑战预览点: [
    `${模式卡.tiaozhan} .yulan-dian`,
    'background',
    {
      background: 'var(--yanse-biaobai)',
      'box-shadow': '0 0 5px rgba(255, 107, 157, 0.35)',
    },
  ],
  预览文字: [预览文字选择器, 'font-weight', { 'font-size': '12px', 'font-weight': '400' }],
  错峰1: ['.yulan-xiangmu-1', 'transform-origin', { 'transform-origin': 'left center' }],
  错峰2: [
    '.yulan-xiangmu-2',
    'transform-origin',
    { 'transform-origin': 'left center', 'transition-delay': '0.05s' },
  ],
  错峰3: [
    '.yulan-xiangmu-3',
    'transform-origin',
    { 'transform-origin': 'left center', 'transition-delay': '0.1s' },
  ],
  位移1: ['.moshi-kapian:hover .yulan-xiangmu-1', 'transform', { transform: 'translateX(4px)' }],
  位移2: ['.moshi-kapian:hover .yulan-xiangmu-2', 'transform', { transform: 'translateX(5px)' }],
  位移3: ['.moshi-kapian:hover .yulan-xiangmu-3', 'transform', { transform: 'translateX(4px)' }],
}

/** 预览行 hover 时长/缓动的改前值：本次只换被过渡的**通道名**，0.3s 与 ease 一字未动 */
const 预览行过渡改前 = {
  transition: 'opacity 0.3s ease, transform 0.3s ease',
  行几何: { display: 'flex', 'align-items': 'center', gap: '10px' },
  窄屏字号: ['10px', '11px', '12px'],
}

function 取值(档: 主题档, 名: string): string {
  const 值 = 按档解析全部(档, 块们).get(名)
  expect(值, `令牌 ${名} 在 ${档} 档未定义（单侧声明会塌陷）`).toBeDefined()
  return (值 as string).trim()
}

function 解析色(值: string): 色 {
  const 函数 = 值.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/)
  if (函数)
    return {
      rgb: [Number(函数[1]), Number(函数[2]), Number(函数[3])] as RGB,
      alpha: 函数[4] === undefined ? 1 : Number(函数[4]),
    }
  const 十六 = 值.match(/^#([0-9a-fA-F]{6})$/)
  if (十六) {
    const h = 十六[1]
    return {
      rgb: [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ] as RGB,
      alpha: 1,
    }
  }
  throw new Error(`无法解析颜色：${值}`)
}

function 通道线性(v: number): number {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}
function 相对亮度(色值: RGB): number {
  return (
    0.2126 * 通道线性(色值[0]) + 0.7152 * 通道线性(色值[1]) + 0.0722 * 通道线性(色值[2])
  )
}
function 对比度(a: RGB, b: RGB): number {
  const x = 相对亮度(a)
  const y = 相对亮度(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
/** 半透明前景压在实色底上的等价实色 */
function 压合(前景: 色, 底: RGB): RGB {
  return [0, 1, 2].map((i) => 前景.rgb[i] * 前景.alpha + 底[i] * (1 - 前景.alpha)) as RGB
}

/** CSS 声明的空白归一（折行/括号内空格不算改动，色值与关键字仍逐字比） */
function 归一(值: string): string {
  return 值
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim()
}
const 归一表 = (基线: Record<string, string>) =>
  Object.fromEntries(Object.entries(基线).map(([属性, 值]) => [属性, 归一(值)]))

function 声明of(选择器: string, 属性: string): string {
  const 命中 = 规则们.filter((项) => 项.选择器 === 选择器 && 项.声明.has(属性))
  expect(命中, `${选择器}{${属性}} 应恰好一处声明，实际 ${命中.length} 处`).toHaveLength(1)
  return 归一(命中[0].声明.get(属性) as string)
}

/** 基础规则按"锚属性"挑，避免与同名媒体查询块（只写尺寸）混淆 */
function 基础规则(选择器: string, 锚属性: string): Record<string, string> {
  const 命中 = 规则们.filter((项) => 项.选择器 === 选择器 && 项.声明.has(锚属性))
  expect(命中, `${选择器} 缺基础规则（锚属性 ${锚属性}）`).toHaveLength(1)
  return Object.fromEntries([...命中[0].声明].map(([属性, 值]) => [属性, 归一(值)]))
}

/** 组件声明 -> 真源求值实色；写了字面量即红灯（验收②「全部颜色经令牌」由此机器可判） */
function 令牌实色(档: 主题档, 选择器: string, 属性: string, 期望令牌: string): 色 {
  const 声明 = 声明of(选择器, 属性)
  let 引用: string
  try {
    引用 = 令牌名(声明, 属性)
  } catch {
    引用 = `（字面量：${声明}）`
  }
  expect(引用, `${选择器}{${属性}} 必须引用 ${期望令牌}`).toBe(期望令牌)
  return 解析色(取值(档, 期望令牌))
}

/** 卡面某档某模式的全部生效实色：底色令牌先压在背景上，再叠色相 wash 的三个停靠点 */
function 卡面实色集(档: 主题档, 模式: 模式, 底: RGB): RGB[] {
  const 基面 = 压合(解析色(取值(档, '--kapian-mian-beijing')), 底)
  const 声明 = 声明of((档 === 'light' ? 浅色前缀 : '') + 模式卡[模式], 'background-image')
  const 停靠点 = [...声明.matchAll(/rgba?\([^)]*\)/g)].map((项) => 解析色(项[0]))
  expect(停靠点.length, `${模式} 卡面色相层应有 3 个停靠点`).toBe(3)
  return 停靠点.map((项) => 压合(项, 基面))
}

function 改前面集(档: 主题档, 底: RGB): RGB[] {
  return 模式清单.flatMap((模式) =>
    改前.wash[档][模式].map((项) => 压合(解析色(项), 底)),
  )
}

/**
 * 卡面之下可能出现的底色。**契约两档**＝FP-01 口径（--beijing-zhuse / --beijing-ciuse），
 * 用它复现审计的 13:1 与 3.7:1 两个数；**夹逼集**再并上纯黑与纯白——主页背景层（草地贴图/照片）
 * 归另一名 agent，本波不做浏览器取色故不猜其值，而半透明面板对底色的合成结果对底色列分量单调，
 * 最坏情形必落在两端，两端达标即对任意背景达标。改后判据一律用夹逼集。
 */
function 契约底色集(档: 主题档): RGB[] {
  return [
    解析色(取值(档, '--beijing-zhuse')).rgb,
    解析色(取值(档, '--beijing-ciuse')).rgb,
  ]
}
function 夹逼底色集(档: 主题档): RGB[] {
  return [...契约底色集(档), [0, 0, 0] as RGB, [255, 255, 255] as RGB]
}

function 最坏对比度(
  面集: (档: 主题档, 底: RGB) => RGB[],
  字: 色,
  档: 主题档,
  底集: RGB[],
): number {
  let 最坏 = Number.POSITIVE_INFINITY
  for (const 底 of 底集) for (const 面 of 面集(档, 底)) 最坏 = Math.min(最坏, 对比度(压合(字, 面), 面))
  return 最坏
}

function 实测表() {
  const 现 = (档: 主题档, 选择器: string, 令牌: string, 底集: RGB[]) =>
    最坏对比度(卡面实色集2, 令牌实色(档, 选择器, 'color', 令牌), 档, 底集)
  const 夹 = (档: 主题档) => 夹逼底色集(档)
  const 契 = (档: 主题档) => 契约底色集(档)
  const 旧面 = (档: 主题档, 字色: string, 底集: RGB[]) =>
    最坏对比度(改前面集, 解析色(字色), 档, 底集)
  return {
    /** 验收①：改后 + 任意背景 */
    改后: {
      标题: {
        dark: 现('dark', '.kapian-biaoti', '--kapian-mian-biaoti', 夹('dark')),
        light: 现('light', '.kapian-biaoti', '--kapian-mian-biaoti', 夹('light')),
      },
      副标题: {
        dark: 现('dark', '.kapian-fubiaoti', '--kapian-mian-zhengwen', 夹('dark')),
        light: 现('light', '.kapian-fubiaoti', '--kapian-mian-zhengwen', 夹('light')),
      },
    },
    /** 反证 (a)：FP-01 口径下改前两档底色的实测——标题够、副标题不够 */
    改前: {
      标题: {
        dark: 旧面('dark', 改前.标题.dark, 契('dark')),
        light: 旧面('light', 改前.标题.light, 契('light')),
      },
      副标题: {
        dark: 旧面('dark', 改前.副标题.dark, 契('dark')),
        light: 旧面('light', 改前.副标题.light, 契('light')),
      },
    },
    /** 反证 (b)：只提 alpha、字色不改（两档口径下都仍不达标） */
    只提alpha: {
      dark: 最坏对比度(卡面实色集2, 解析色(改前.副标题.dark), 'dark', 契('dark')),
      light: 最坏对比度(卡面实色集2, 解析色(改前.副标题.light), 'light', 契('light')),
    },
    /** 反证 (c)：只改字色、卡面仍半透明——背景一换档就跌破 7:1，这正是要提 alpha 的理由 */
    只改字色: {
      dark: 旧面('dark', 取值('dark', '--kapian-mian-zhengwen'), 夹('dark')),
      light: 旧面('light', 取值('light', '--kapian-mian-zhengwen'), 夹('light')),
    },
  }
}
function 卡面实色集2(档: 主题档, 底: RGB): RGB[] {
  return 模式清单.flatMap((模式) => 卡面实色集(档, 模式, 底))
}

/* ---------- FP-16b：预览行的透明度通道迁移。判据沿用上面同一套 解析色/压合/对比度/卡面实色集/夹逼底色集，
   不另立口径；唯一新增的是"读哪一条声明"的继承链解析（颜色通道 × 链上残留 opacity）。 ---------- */

/** 属性未声明 → null（走继承）；同一选择器同一属性声明两处即红（R3：一个属性一份真源） */
function 声明可缺(选择器: string, 属性: string): string | null {
  const 命中 = 规则们.filter((项) => 项.选择器 === 选择器 && 项.声明.has(属性))
  expect(命中.length, `${选择器}{${属性}} 声明点数应为 0 或 1`).toBeLessThanOrEqual(1)
  return 命中.length ? 归一(命中[0].声明.get(属性) as string) : null
}

/**
 * 令牌色的两种合法形态：`var(--x)`＝满 alpha，`color-mix(in srgb, var(--x) P%, transparent)`＝低 alpha 变体
 * （与 transparent 在 srgb 下混合，等价于把令牌 alpha 乘 P%，因此能直接喂给同一个 `压合`）。
 * 写了色值字面量就在这里抛错——"组件里塞个 rgba 省事"这种回退过不了判据。
 */
function 令牌通道色(声明: string, 档: 主题档): { 色: 色; 令牌: string; 比例: number } {
  const 满 = /^var\(\s*(--[A-Za-z0-9-]+)\s*\)$/.exec(声明)
  if (满) return { 色: 解析色(取值(档, 满[1])), 令牌: 满[1], 比例: 1 }
  const 混合 =
    /^color-mix\(\s*in srgb\s*,\s*var\(\s*(--[A-Za-z0-9-]+)\s*\)\s+([\d.]+)%\s*,\s*transparent\s*\)$/.exec(
      声明,
    )
  if (混合) {
    const 底 = 解析色(取值(档, 混合[1]))
    const 比例 = Number(混合[2]) / 100
    return { 色: { rgb: 底.rgb, alpha: 底.alpha * 比例 }, 令牌: 混合[1], 比例 }
  }
  throw new Error(
    `预览行的颜色必须是 --kapian-mian-* 的 var() 或 color-mix(…, transparent) 形态，实际：${声明}`,
  )
}

/** 预览行文字在该态下**真正渲染**出的色：颜色通道 × 继承链上残留的 opacity（残留＝第三条会漂移的通道） */
function 预览行字色(档: 主题档, 态: '静止' | 'hover'): 色 {
  const 颜色声明 =
    态 === 'hover'
      ? 声明可缺(预览行hover选择器, 'color') ?? 声明可缺(预览行选择器, 'color')
      : 声明可缺(预览行选择器, 'color')
  expect(颜色声明, 'FP-16b：预览行缺颜色真源（.yulan-xiangmu 未声明 color）').not.toBeNull()
  const 通道 = 令牌通道色(颜色声明 as string, 档)
  const 透明度声明 =
    态 === 'hover'
      ? 声明可缺(预览行hover选择器, 'opacity') ?? 声明可缺(预览行选择器, 'opacity')
      : 声明可缺(预览行选择器, 'opacity')
  const 倍数 = 透明度声明 === null ? 1 : Number(透明度声明)
  expect(Number.isFinite(倍数), `opacity 应为数字，实际：${透明度声明}`).toBe(true)
  return { rgb: 通道.色.rgb, alpha: 通道.色.alpha * 倍数 }
}

/** 预览行字色对「两张卡 × 3 停靠点 wash × 4 档夹逼背景」的最坏对比度——与验收①同一口径 */
function 预览最坏(档: 主题档, 字: 色): number {
  return 最坏对比度(卡面实色集2, 字, 档, 夹逼底色集(档))
}
const 相乘 = (字: string, 倍数: number): 色 => {
  const 色值 = 解析色(字)
  return { rgb: 色值.rgb, alpha: 色值.alpha * 倍数 }
}

/** 渐显的可见跨度：hover 相对静止的最坏对比度提升倍数（两态同色即 1.0 ⇒ 判据必红） */
const 跨度of = (档: 主题档, 静止字: 色, hover字: 色): number =>
  预览最坏(档, hover字) / 预览最坏(档, 静止字)

const 预览表 = {
  /** 验收①：改后的静止态与 hover 态，深浅两档（夹逼任意背景） */
  静止: {
    dark: 预览最坏('dark', 预览行字色('dark', '静止')),
    light: 预览最坏('light', 预览行字色('light', '静止')),
  },
  hover: {
    dark: 预览最坏('dark', 预览行字色('dark', 'hover')),
    light: 预览最坏('light', 预览行字色('light', 'hover')),
  },
  /** 验收②：静止→hover 的真实跨度 */
  跨度: {
    dark: 跨度of('dark', 预览行字色('dark', '静止'), 预览行字色('dark', 'hover')),
    light: 跨度of('light', 预览行字色('light', '静止'), 预览行字色('light', 'hover')),
  },
  /** 反证夹具 (a)：把渐显删掉（hover 与静止同色）代回同一判据 ⇒ 恰为 1.0，按 ≥1.4 必红 */
  无渐显跨度: {
    dark: 跨度of('dark', 预览行字色('dark', '静止'), 预览行字色('dark', '静止')),
    light: 跨度of('light', 预览行字色('light', '静止'), 预览行字色('light', '静止')),
  },
  /** 反证夹具 (b)：旧相乘形态 opacity .62 × rgba(...,.55/.58) 压在改后卡面上（同一算法下 2.5/2.8；
   *   FP-16 遗留记的 2.49/3.01 用的是契约两档底色口径，夹逼口径把纯黑/纯白也算进来，更严） */
  旧相乘: {
    dark: 预览最坏('dark', 相乘(改前.预览行.字色.dark, 改前.预览行.行透明度)),
    light: 预览最坏('light', 相乘(改前.预览行.字色.light, 改前.预览行.行透明度)),
  },
}

const 表 = 实测表()
const 一位 = (v: number) => Number(v.toFixed(1))

describe('FP-16 卡面颜色层：底色/边框/标题/副标题全部经令牌', () => {
  it('卡面底色与边框吃 --kapian-mian-{beijing,biankuang}，深浅两档共用同一条引用', () => {
    for (const 模式 of 模式清单) {
      expect(声明of(模式卡[模式], 'background-color')).toBe('var(--kapian-mian-beijing)')
      // 边框宽度（1px）与改前一致：只换颜色，不动几何
      expect(声明of(模式卡[模式], 'border')).toBe('1px solid var(--kapian-mian-biankuang)')
    }
    for (const 档 of ['light', 'dark'] as 主题档[]) {
      expect(解析色(取值(档, '--kapian-mian-beijing')).alpha).toBeGreaterThanOrEqual(0.9)
    }
  })

  it('标题/副标题吃 --kapian-mian-{biaoti,zhengwen}，两档各有值', () => {
    expect(声明of('.kapian-biaoti', 'color')).toBe('var(--kapian-mian-biaoti)')
    expect(声明of('.kapian-fubiaoti', 'color')).toBe('var(--kapian-mian-zhengwen)')
    for (const 令牌 of ['--kapian-mian-biaoti', '--kapian-mian-zhengwen'])
      for (const 档 of ['light', 'dark'] as 主题档[]) expect(取值(档, 令牌)).not.toBe('')
  })

  it('改前的卡面/文字色字面量已消失，浅色档文字覆盖块随之作废', () => {
    // 标题的 #ffffff 与副标题的 rgba(0,0,0,.55) 在本文件其它无关规则里仍有同名取值，
    // 卡面这一层的证明由 令牌实色()（写了字面量即红）与下面的账本给出
    for (const 残留 of [
      'rgba(255, 255, 255, 0.42)',
      'rgba(107, 140, 166, 0.13)',
      'rgba(255, 107, 157, 0.13)',
      'rgba(107, 140, 166, 0.22)',
      'rgba(255, 107, 157, 0.22)',
    ])
      expect(样式源码.includes(残留), `残留改前字面量：${残留}`).toBe(false)
    expect(样式源码).not.toContain(`${浅色前缀}.kapian-biaoti`)
    expect(样式源码).not.toContain(`${浅色前缀}.kapian-fubiaoti`)
  })

  it('卡面规则块色值字面量账本只准缩短（FP-16 零新增；余下是既有 wash/图标块色相债，归 FP-20）', () => {
    const 选择器判定 =
      /(moshi-kapian|kapian-tubiao|kapian-xinxi|kapian-dingbu|kapian-yulan|kapian-dibu|kapian-biaoti|kapian-fubiaoti|yulan-|kaishi-)/
    const 属性判定 = new Set([
      'color',
      'background',
      'background-color',
      'background-image',
      'border',
      'border-top',
      'border-color',
      'border-top-color',
    ])
    const 实测: string[] = []
    for (const 项 of 规则们) {
      if (!选择器判定.test(项.选择器)) continue
      for (const [属性, 值] of 项.声明) {
        if (!属性判定.has(属性)) continue
        for (const 字面 of (值.match(/rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}\b/g) ?? []).sort())
          实测.push(`${项.选择器} | ${属性} | ${字面}`)
      }
    }
    expect(实测.sort()).toEqual([...卡面色值字面量账本].sort())
  })
})

describe('FP-16 可读性实测（验收①，判据为解析后的值）', () => {
  it('深色档：标题与副标题对「令牌面板 + 3 停靠点 wash × 4 档底色」的最坏情形 ≥7:1', () => {
    expect(表.改后.标题.dark, '深色标题').toBeGreaterThanOrEqual(7)
    expect(表.改后.副标题.dark, '深色副标题').toBeGreaterThanOrEqual(7)
  })

  it('浅色档：同上', () => {
    expect(表.改后.标题.light, '浅色标题').toBeGreaterThanOrEqual(7)
    expect(表.改后.副标题.light, '浅色副标题').toBeGreaterThanOrEqual(7)
  })

  it('实测最坏值钉到小数一位（卡面令牌或 wash 漂移即红；这些数即证据里的对比度表）', () => {
    expect({
      改后标题深: 一位(表.改后.标题.dark),
      改后副标题深: 一位(表.改后.副标题.dark),
      改后标题浅: 一位(表.改后.标题.light),
      改后副标题浅: 一位(表.改后.副标题.light),
      改前标题深: 一位(表.改前.标题.dark),
      改前副标题深: 一位(表.改前.副标题.dark),
      改前标题浅: 一位(表.改前.标题.light),
      改前副标题浅: 一位(表.改前.副标题.light),
      只提alpha深: 一位(表.只提alpha.dark),
      只提alpha浅: 一位(表.只提alpha.light),
      只改字色深: 一位(表.只改字色.dark),
      只改字色浅: 一位(表.只改字色.light),
    }).toEqual({
      // 改后 = 验收①的四格实测最坏值（任意背景夹逼口径），全部 ≥7
      改后标题深: 11.3,
      改后副标题深: 8.8,
      改后标题浅: 15.8,
      改后副标题浅: 11.8,
      // 改前（FP-01 契约两档口径）：标题本就够，副标题 3.8/4.6 才是"字看不清"的真因
      改前标题深: 14.5,
      改前副标题深: 3.8,
      改前标题浅: 15.7,
      改前副标题浅: 4.6,
      // 半成品形态：只提 alpha 仍是 3.8/4.7；只改字色在背景换档时跌到 1.1/6.6
      只提alpha深: 3.8,
      只提alpha浅: 4.7,
      只改字色深: 1.1,
      只改字色浅: 6.6,
    })
  })
})

describe('FP-16 反证：判据有牙，只做一半必不达标', () => {
  it('改前形态：标题本就 ≥13:1（I3 证伪），副标题却 <7:1 —— 看不清的真因是文字色', () => {
    expect(表.改前.标题.dark, '改前标题若也看不清，则 I3 未被证伪').toBeGreaterThanOrEqual(13)
    expect(表.改前.副标题.dark, '改前副标题若已达标，本 FP 根因判断作废').toBeLessThan(7)
    expect(表.改前.副标题.light).toBeLessThan(7)
  })

  it('只提卡面 alpha、副标题仍写 rgba(255,255,255,.42) → 深浅两档都跌破 7:1', () => {
    for (const 档 of ['light', 'dark'] as 主题档[])
      expect(表.只提alpha[档], `${档} 档只提 alpha 的形态`).toBeLessThan(7)
  })

  it('只改文字色、卡面仍是 alpha .05–.11 → 副标题同样跌破 7:1（故两件事都得做）', () => {
    for (const 档 of ['light', 'dark'] as 主题档[])
      expect(表.只改字色[档], `${档} 档只改字色的形态`).toBeLessThan(7)
  })
})

describe('FP-16 只改颜色层（验收③的静态一半）', () => {
  it('本 FP 独占的 6 条卡面规则：声明清单逐字冻结，几何与字体属性一字未动', () => {
    const 锚of = (基线: Record<string, string>) =>
      ('color' in 基线 ? 'color' : 'background-color' in 基线 ? 'background-color' : 'background-image')
    for (const [选择器, 基线] of Object.entries(卡面规则基线))
      expect(基础规则(选择器, 锚of(基线)), 选择器).toEqual(归一表(基线))
  })

  it('.moshi-kapian 与 .kapian-tubiao-qu 基础声明逐字冻结（含主页背景契约的 background: transparent）', () => {
    for (const [名称, [选择器, 锚属性, 基线]] of Object.entries(卡面几何基线))
      expect(基础规则(选择器, 锚属性), 名称).toEqual(归一表(基线))
  })

  it('两张卡片各一个标题与副标题，文案仍走 translations 未改字', () => {
    const 模板 = (主页源码.match(/<template>([\s\S]*)<\/template>/) ?? [])[1] ?? ''
    expect([...模板.matchAll(/class="kapian-biaoti"/g)].length).toBe(2)
    expect([...模板.matchAll(/class="kapian-fubiaoti"/g)].length).toBe(2)
    for (const 键 of ['putongMoShi', 'putongFuBiaoTi', 'tiaoZhanMoShi', 'tiaoZhanFuBiaoTi'])
      expect(模板).toContain(`huoQuFanYi('zhuYe', '${键}')`)
  })
})

/* ================= FP-16b（需求 #3 的卡内残留：预览行字看不清） =================
   根因与 I3 同构：`.yulan-xiangmu{opacity:.62}` × `.yulan-wenzi{color:rgba(...,.55)}` 相乘 ⇒ 有效 alpha
   .34/.3596 ⇒ 静止实测 2.5–3.0:1，抬卡面 alpha 对它无效。治理＝把「渐显」整条搬到颜色通道：
   静止吃 `--kapian-mian-zhengwen` 的 color-mix 低 alpha 变体、hover 吃满 alpha，透明度只此一处。 */
describe('FP-16b 通道迁移：透明度只有一处真源，渐显由颜色通道承载', () => {
  it('静止 = 卡面正文令牌的 color-mix 低 alpha 变体，hover = 同一枚令牌的满 alpha（验收②）', () => {
    const 静止 = 令牌通道色(声明of(预览行选择器, 'color'), 'dark')
    const hover = 令牌通道色(声明of(预览行hover选择器, 'color'), 'dark')
    expect(静止.令牌).toBe('--kapian-mian-zhengwen')
    expect(hover.令牌).toBe('--kapian-mian-zhengwen')
    expect(静止.比例).toBeLessThan(1)
    expect(静止.比例).toBeGreaterThanOrEqual(0.5)
    expect(hover.比例).toBe(1)
  })

  it('预览行文字不再自带 color，预览行也不再声明任何 opacity（旧相乘形态不得回来）', () => {
    expect(
      声明可缺(预览文字选择器, 'color'),
      '.yulan-wenzi 自带 color ⇒ 会与 .yulan-xiangmu 的透明度相乘成第二条通道',
    ).toBeNull()
    expect(声明可缺(`${浅色前缀}${预览文字选择器}`, 'color'), '浅色档文字覆盖块应随令牌按档切换而作废').toBeNull()
    for (const 选择器 of [预览行选择器, 预览行hover选择器])
      expect(声明可缺(选择器, 'opacity'), `${选择器} 仍声明 opacity ⇒ 第三条会漂移的通道`).toBeNull()
    for (const 残留 of ['rgba(255, 255, 255, 0.55)', 'rgba(0, 0, 0, 0.58)'])
      expect(样式源码.includes(残留), `残留改前字面量：${残留}`).toBe(false)
  })

  it('hover 时长/缓动一字未动：把改前 transition 的通道名 opacity 换成 color 即得现值（验收③）', () => {
    expect(声明of(预览行选择器, 'transition')).toBe(
      归一(预览行过渡改前.transition).replace('opacity', 'color'),
    )
  })

  it('预览行 12 条规则声明清单逐字冻结：几何、字号、字重、错峰时序、hover 位移一条未碰（验收③）', () => {
    for (const [名称, [选择器, 锚属性, 基线]] of Object.entries(预览行规则基线))
      expect(基础规则(选择器, 锚属性), 名称).toEqual(归一表(基线))
    const 行 = 基础规则(预览行选择器, 'display')
    for (const [属性, 值] of Object.entries(预览行过渡改前.行几何))
      expect(行[属性], `预览行几何 ${属性}`).toBe(归一(值))
    const 字号 = 规则们
      .filter((项) => 项.选择器 === 预览文字选择器 && 项.声明.has('font-size'))
      .map((项) => 归一(项.声明.get('font-size') as string))
      .sort()
    expect(字号, '窄屏两档预览行字号未动').toEqual(预览行过渡改前.窄屏字号)
  })

  it('三行预览 + 一个圆点的模板结构未改，文案仍走 translations', () => {
    const 模板 = (主页源码.match(/<template>([\s\S]*)<\/template>/) ?? [])[1] ?? ''
    expect([...模板.matchAll(/class="yulan-xiangmu /g)].length).toBe(5)
    expect([...模板.matchAll(/class="yulan-wenzi"/g)].length).toBe(5)
    expect([...模板.matchAll(/class="yulan-dian"/g)].length).toBe(5)
  })
})

describe('FP-16b 预览行可读性实测（验收①：静止/hover × 深浅 = 四格，夹逼任意背景）', () => {
  it('静止态与 hover 态、深浅两档的最坏值均 ≥4.5:1', () => {
    for (const 档 of ['light', 'dark'] as 主题档[]) {
      expect(预览表.静止[档], `${档} 档静止态`).toBeGreaterThanOrEqual(4.5)
      expect(预览表.hover[档], `${档} 档 hover 态`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('hover 比静止显著更亮——渐显的视觉结果仍在（两态同色即 1.0 ⇒ 红）', () => {
    for (const 档 of ['light', 'dark'] as 主题档[]) {
      expect(预览表.跨度[档], `${档} 档渐显跨度`).toBeGreaterThan(1)
      expect(预览表.跨度[档], `${档} 档渐显跨度`).toBeGreaterThanOrEqual(1.4)
    }
  })

  it('实测最坏值钉到小数一位（令牌/wash/夹逼底色任一漂移即红；这些数即证据里的四档两态表）', () => {
    expect({
      改后静止深: 一位(预览表.静止.dark),
      改后静止浅: 一位(预览表.静止.light),
      改后hover深: 一位(预览表.hover.dark),
      改后hover浅: 一位(预览表.hover.light),
      改前静止深: 一位(预览表.旧相乘.dark),
      改前静止浅: 一位(预览表.旧相乘.light),
      跨度深: Number(预览表.跨度.dark.toFixed(2)),
      跨度浅: Number(预览表.跨度.light.toFixed(2)),
    }).toEqual({
      改后静止深: 5.8,
      改后静止浅: 5.6,
      改后hover深: 8.8,
      改后hover浅: 11.8,
      改前静止深: 2.8,
      改前静止浅: 2.5,
      跨度深: 1.53,
      跨度浅: 2.11,
    })
  })
})

describe('FP-16b 反证：两条新判据都有牙', () => {
  it('把 hover 渐显删掉（两态同色）⇒ 跨度恰为 1.0，按 ≥1.4 必红', () => {
    for (const 档 of ['light', 'dark'] as 主题档[])
      expect(预览表.无渐显跨度[档], `${档} 档无渐显形态的跨度`).toBeLessThan(1.4)
  })

  it('把 opacity .62 × rgba(...,.55) 的旧相乘形态放回去 ⇒ 静止态跌回 2.5/2.8，按 ≥4.5 必红', () => {
    for (const 档 of ['light', 'dark'] as 主题档[])
      expect(预览表.旧相乘[档], `${档} 档旧相乘形态`).toBeLessThan(4.5)
  })
})
