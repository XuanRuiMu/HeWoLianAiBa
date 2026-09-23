import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// variables.css 三段式（:root 共用 / :root[data-theme=light] / :root,:root[data-theme=dark]）的令牌真源解析。
// 单侧主题块声明的令牌在另一档按 CSS 规则塌陷（F23 根因），故"两档是否均有定义"必须可机器审计。

export type 主题档 = 'light' | 'dark'

export interface 选择器段 {
  选择器: string
  特异度: number
  适用: (档: 主题档) => boolean
}

export interface 声明块 {
  序号: number
  选择器: string
  段: 选择器段[]
  声明: Map<string, string>
}

const 白名单段: Record<string, { 特异度: number; 适用: (档: 主题档) => boolean }> = {
  ':root': { 特异度: 1, 适用: () => true },
  ':root[data-theme="light"]': { 特异度: 2, 适用: (档) => 档 === 'light' },
  ':root[data-theme="dark"]': { 特异度: 2, 适用: (档) => 档 === 'dark' },
}

export function 读取令牌源码(): string {
  return readFileSync(resolve(__dirname, '../styles/variables.css'), 'utf8')
}

/** 只切顶层块（variables.css 不含嵌套 at-rule）；出现未登记选择器直接抛错，防止有人另开第四块绕审计 */
export function 声明块清单(源 = 读取令牌源码()): 声明块[] {
  const 净源 = 源.replace(/\/\*[\s\S]*?\*\//g, '')
  const 块们: 声明块[] = []
  for (const 匹配 of 净源.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const 选择器 = 匹配[1].replace(/\s+/g, ' ').trim()
    if (!选择器) continue
    const 段: 选择器段[] = 选择器.split(',').map((部) => {
      const 键 = 部.trim()
      const 定义 = 白名单段[键]
      if (!定义) throw new Error(`variables.css 出现未登记的选择器段：${键}`)
      return { 选择器: 键, 特异度: 定义.特异度, 适用: 定义.适用 }
    })
    const 声明 = new Map<string, string>()
    for (const 条 of 匹配[2].matchAll(/(-{2}[A-Za-z0-9-]+)\s*:\s*([^;]+);/g)) {
      声明.set(条[1], 条[2].trim())
    }
    块们.push({ 序号: 块们.length, 选择器, 段, 声明 })
  }
  return 块们
}

/** 某档下该档真正生效的取值：特异度优先，同特异度按源码顺序后者胜 */
export function 按档解析全部(档: 主题档, 块们 = 声明块清单()): Map<string, string> {
  const 胜出 = new Map<string, { 值: string; 特异度: number; 序号: number }>()
  for (const 块 of 块们) {
    const 适用段 = 块.段.filter((部) => 部.适用(档))
    if (适用段.length === 0) continue
    const 特异度 = Math.max(...适用段.map((部) => 部.特异度))
    for (const [名, 值] of 块.声明) {
      const 现 = 胜出.get(名)
      if (!现 || 特异度 > 现.特异度 || (特异度 === 现.特异度 && 块.序号 >= 现.序号)) {
        胜出.set(名, { 值, 特异度, 序号: 块.序号 })
      }
    }
  }
  return new Map([...胜出].map(([名, 项]) => [名, 项.值]))
}

export function 所有声明令牌(块们 = 声明块清单()): string[] {
  return [...new Set(块们.flatMap((块) => [...块.声明.keys()]))]
}

/** 令牌声明在哪几个块里：用于"只能住在共用块"这类归档约束 */
export function 声明位置(令牌: string, 块们 = 声明块清单()) {
  return {
    共用: 块们.some((块) => 块.选择器 === ':root' && 块.声明.has(令牌)),
    浅色: 块们.some((块) => 块.选择器 === ':root[data-theme="light"]' && 块.声明.has(令牌)),
    深色: 块们.some((块) => 块.选择器.startsWith(':root,') && 块.声明.has(令牌)),
  }
}

/** 只在单侧主题块声明、另一档解析不出值的令牌 = 会塌陷的令牌 */
export function 塌陷令牌清单(块们 = 声明块清单()): string[] {
  const 浅色 = 按档解析全部('light', 块们)
  const 深色 = 按档解析全部('dark', 块们)
  return 所有声明令牌(块们).filter((名) => !深色.has(名) || !浅色.has(名))
}

function 代入变量(源: string, 表: Map<string, string>, 深度 = 0): string {
  const 匹配 = /var\(\s*(--[A-Za-z0-9-]+)\s*\)/.exec(源)
  if (!匹配) return 源
  if (深度 >= 8) throw new Error(`var() 嵌套过深：${源}`)
  const 值 = 表.get(匹配[1])
  if (值 === undefined) throw new Error(`引用了 variables.css 未定义的令牌 ${匹配[1]}`)
  return 代入变量(源.replace(匹配[0], 值), 表, 深度 + 1)
}

/**
 * 几何（量纲类）令牌代入 var() 并求 calc() 后真正生效的数值，px 与无纲量都按数字返回。
 * 受支持算式：`乘积项 + 乘积项`，乘积项为 `因子 * 因子`，因子只能是数字——超出即抛错，绝不静默给近似值。
 * FP-22c 用它把「.vue 里引用了哪个令牌」升级为「引用后算出来的值等于全局真源」，
 * 这是把度量从页面局部上收到共用 :root 块后唯一可机器证明同源的方式（jsdom 不做 var() 计算）。
 */
export function 解析几何数值(令牌: string, 块们 = 声明块清单()): number {
  const 表 = 按档解析全部('light', 块们)
  const 原始 = 表.get(令牌)
  if (原始 === undefined) throw new Error(`variables.css 未定义令牌 ${令牌}`)
  return 求几何算式(原始, 块们)
}

/**
 * 对**任意一条算式**（不必是 variables.css 里的令牌）做同一套 var() 代入 + calc() 求值。
 * `解析几何数值` 的算式grammar 唯一真源就是这里；组件内以 `calc(var(--真源) + var(--真源))`
 * 派生的局部量纲令牌（如 FP-04b 的 `--ziduan-jian-ju`）也由此求值，从而"引用了哪个令牌"
 * 与"引用之后算出多少像素"两层都能机器判定，不必在测试里另写一份求值器（那会是第二真源）。
 */
export function 求几何算式(原始: string, 块们 = 声明块清单()): number {
  const 表 = 按档解析全部('light', 块们)
  let 式 = 代入变量(原始, 表).trim()
  const calc = /^calc\(([\s\S]*)\)$/.exec(式)
  if (calc) 式 = calc[1]
  const 和 = 式
    .replace(/px/g, ' ')
    .split('+')
    .reduce((累计, 项式) => {
      const 因子 = 项式.split('*').map((项) => 项.trim())
      for (const 项 of 因子) {
        if (!/^\d*\.?\d+$/.test(项)) throw new Error(`不支持的算式：${原始}`)
      }
      return 累计 + 因子.reduce((积, 项) => 积 * Number(项), 1)
    }, 0)
  if (!Number.isFinite(和)) throw new Error(`算式求值失败：${原始}`)
  return 和
}

