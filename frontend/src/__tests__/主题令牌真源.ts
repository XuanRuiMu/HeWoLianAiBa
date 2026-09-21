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
