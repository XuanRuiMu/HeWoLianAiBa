import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { 按档解析全部, 声明块清单, 解析几何数值 } from './主题令牌真源'


export type 特异度 = [number, number, number]

export interface 规则 {
  序号: number
  选择器: string
  文本: string
  声明: Map<string, string>
  重要: Set<string>
}

export interface 探针 {
  标签: string
  类?: string[]
  属性?: Record<string, string>
  焦点可见?: boolean
  祖先链?: 探针[]
  悬停?: boolean
  激活?: boolean
  禁用?: boolean
  选中?: boolean
  焦点在内?: boolean
}

export interface 层叠结果 {
  规则: 规则
  特异度: 特异度
  值: string
}

export function 读取全局基线(): string {
  return readFileSync(resolve(__dirname, '../styles/全局.css'), 'utf8')
}

function 匹配右括号(文本: string, 左: number): number {
  let 深度 = 0
  for (let i = 左; i < 文本.length; i++) {
    if (文本[i] === '{') 深度++
    else if (文本[i] === '}' && --深度 === 0) return i
  }
  throw new Error('CSS 花括号不闭合')
}

function 建规则(头: string, 体: string, 序号: number): 规则 {
  const 声明 = new Map<string, string>()
  const 重要 = new Set<string>()
  for (const 条 of 体.split(';')) {
    const 冒号 = 条.indexOf(':')
    if (冒号 < 0) continue
    const 属性 = 条.slice(0, 冒号).trim().toLowerCase()
    if (!属性) continue
    const 原值 = 条.slice(冒号 + 1).replace(/\s+/g, ' ').trim()
    if (/!important$/i.test(原值)) 重要.add(属性)
    声明.set(属性, 原值.replace(/!important$/i, '').trim())
  }
  return { 序号, 选择器: 头.replace(/\s+/g, ' ').trim(), 文本: `${头}{${体}}`, 声明, 重要 }
}

export function 规则清单(源: string): 规则[] {
  const 结果: 规则[] = []
  const 序 = { 值: 0 }
  const 收集 = (文本: string): void => {
    let 头 = ''
    let i = 0
    while (i < 文本.length) {
      const c = 文本[i]
      if (c !== '{') {
        头 += c
        i++
        continue
      }
      const 末 = 匹配右括号(文本, i)
      const 体 = 文本.slice(i + 1, 末)
      if (体.includes('{')) 收集(体)
      else if (头.trim()) 结果.push(建规则(头, 体, 序.值++))
      头 = ''
      i = 末 + 1
    }
  }
  收集(源.replace(/\/\*[\s\S]*?\*\//g, ''))
  return 结果
}

export function 拆分选择器组(选择器: string): string[] {
  const 结果: string[] = []
  let 缓冲 = ''
  let 深度 = 0
  for (const c of 选择器) {
    if (c === '(' || c === '[') 深度++
    else if (c === ')' || c === ']') 深度--
    if (c === ',' && 深度 === 0) {
      结果.push(缓冲.trim())
      缓冲 = ''
      continue
    }
    缓冲 += c
  }
  结果.push(缓冲.trim())
  return 结果.filter(Boolean)
}

function 函数参数(串: string): string {
  const 开 = 串.indexOf('(')
  if (开 < 0 || !串.endsWith(')')) throw new Error(`伪类参数解析失败：${串}`)
  return 串.slice(开 + 1, -1)
}

function 切简单片段(复合: string): string[] {
  const 结果: string[] = []
  let 缓冲 = ''
  let 深度 = 0
  const 收尾 = (): void => {
    if (缓冲) {
      结果.push(缓冲)
      缓冲 = ''
    }
  }
  for (const c of 复合) {
    if (深度 === 0) {
      if (c === ' ' || c === '>' || c === '+' || c === '~') {
        if (缓冲) throw new Error(`本判定不支持组合器（后代/子代/兄弟）：${复合}`)
        continue
      }
      const 标点开新段 =
        (c === '.' || c === '#' || c === ':' || c === '[') &&
        缓冲 !== '' &&
        !(c === ':' && 缓冲.endsWith(':'))
      const 标签开新段 =
        /[a-zA-Z*]/.test(c) && 缓冲 !== '' && /[\])]/.test(缓冲[缓冲.length - 1])
      if (标点开新段 || 标签开新段) 收尾()
    }
    缓冲 += c
    if (c === '(' || c === '[') 深度++
    else if (c === ')' || c === ']') 深度--
    if (深度 < 0) throw new Error(`括号不闭合：${复合}`)
  }
  收尾()
  return 结果
}

const 零: 特异度 = [0, 0, 0]

type 组合器 = ' ' | '>' | '+' | '~'

export function 拆段(复合: string): { 段: string[]; 组合器: 组合器[] } {
  const 段: string[] = []
  const 组合器: 组合器[] = []
  let 缓冲 = ''
  let 深度 = 0
  const 收尾 = (): boolean => {
    if (!缓冲) return false
    段.push(缓冲.trim())
    缓冲 = ''
    return true
  }
  for (const c of 复合) {
    if (c === '(' || c === '[') 深度++
    else if (c === ')' || c === ']') 深度--
    if (深度 === 0 && (c === ' ' || c === '>' || c === '+' || c === '~')) {
      const 刚收尾 = 收尾()
      if (c === ' ') {
        if (刚收尾) 组合器.push(' ')
        continue
      }
      const 末 = 组合器.length - 1
      if (!刚收尾 && 末 >= 0 && 组合器[末] === ' ') 组合器[末] = c
      else 组合器.push(c)
      continue
    }
    缓冲 += c
  }
  收尾()
  if (段.length === 0 || 组合器.length !== 段.length - 1)
    throw new Error(`选择器的组合器与段数对不上：${复合}`)
  return { 段: 段.filter(Boolean), 组合器 }
}

function 累加(...项: 特异度[]): 特异度 {
  return [0, 1, 2].map((i) => 项.reduce((s, x) => s + x[i], 0)) as 特异度
}

export function 比较特异度(a: 特异度, b: 特异度): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]
  return 0
}

const 函数伪类 = new Set(['is', 'matches', 'any', 'not'])

function 伪类名(串: string): string {
  return (串.replace(/^:+/, '').split('(')[0] || '').toLowerCase()
}

function 伪类特异度(串: string): 特异度 {
  const 名字 = 伪类名(串)
  if (名字 === 'where') return 零
  if (函数伪类.has(名字))
    return 拆分选择器组(函数参数(串)).reduce<特异度>(
      (最佳, 子) => (比较特异度(特异度(子), 最佳) > 0 ? 特异度(子) : 最佳),
      零,
    )
  if (串.includes('(')) throw new Error(`未登记的带参伪类：${串}`)
  return [0, 1, 0]
}

function 片段特异度(片段: string): 特异度 {
  if (片段 === '*') return 零
  if (片段.startsWith('#')) return [1, 0, 0]
  if (片段.startsWith('.')) return [0, 1, 0]
  if (片段.startsWith('[')) return [0, 1, 0]
  if (片段.startsWith('::')) return [0, 0, 1]
  if (片段.startsWith(':')) return 伪类特异度(片段)
  if (/^[a-zA-Z][\w-]*$/.test(片段)) return [0, 0, 1]
  throw new Error(`未识别的简单片段：${片段}`)
}

export function 特异度(复合: string): 特异度 {
  return 累加(...拆段(复合).段.flatMap(切简单片段).map(片段特异度))
}

function 匹配属性(串: string, 探针: 探针): boolean {
  const 体 = 串.slice(1, -1).replace(/\s+/g, '')
  const 等号 = 体.indexOf('=')
  const 名 = (等号 < 0 ? 体 : 体.slice(0, 等号)).replace(/^[\^$*~|]?/, '')
  const 值 = 等号 < 0 ? undefined : 体.slice(等号 + 1).replace(/^["']|["']$/g, '')
  const 现值 = (探针.属性 ?? {})[名]
  return 值 === undefined ? 现值 !== undefined : 现值 === 值
}

function 匹配片段(片段: string, 探针: 探针): boolean {
  if (片段 === '*') return true
  if (片段.startsWith('.')) return (探针.类 ?? []).includes(片段.slice(1))
  if (片段.startsWith('#')) throw new Error(`本判定不支持 id 选择器：${片段}`)
  if (片段.startsWith('[')) return 匹配属性(片段, 探针)
  if (片段.startsWith('::')) return false
  if (片段.startsWith(':')) {
    const 名字 = 伪类名(片段)
    const 参数 = 片段.includes('(') ? 拆分选择器组(函数参数(片段)) : null
    const 组 = (串: string): boolean => 匹配复合(串, 探针)
    if (名字 === 'where' || 名字 === 'is' || 名字 === 'matches' || 名字 === 'any')
      return 参数!.some(组)
    if (名字 === 'not') return !参数!.some(组)
    if (参数) throw new Error(`未登记的带参伪类：${片段}`)
    if (名字 === 'root') return 探针.标签 === 'root'
    const 状态字段 = 状态伪类[名字]
    if (状态字段) return 探针[状态字段] === true
    if (名字 === 'focus-visible' || 名字 === 'focus') return 探针.焦点可见 === true
    throw new Error(`未登记的伪类：${片段}`)
  }
  if (/^[a-zA-Z][\w-]*$/.test(片段)) return 探针.标签 === 片段.toLowerCase()
  throw new Error(`未识别的简单片段：${片段}`)
}

const 状态伪类: Record<string, '悬停' | '激活' | '禁用' | '选中' | '焦点在内'> = {
  hover: '悬停',
  active: '激活',
  disabled: '禁用',
  checked: '选中',
  'focus-within': '焦点在内',
}

export function 匹配复合(复合: string, 探针: 探针): boolean {
  const { 段, 组合器 } = 拆段(复合)
  const 叶 = 段[段.length - 1] as string
  if (!切简单片段(叶).every((片段) => 匹配片段(片段, 探针))) return false
  if (段.length === 1) return true
  const 链 = 探针.祖先链
  if (!链) throw new Error(`选择器 ${复合} 含组合器，探针必须提供祖先链（不供给判"不命中"）`)
  let i = 链.length - 1
  for (let s = 段.length - 2; s >= 0; s--) {
    const 连接 = 组合器[s] as 组合器
    if (连接 === '+' || 连接 === '~') throw new Error(`本判定不支持兄弟组合器：${复合}`)
    const 段串 = 段[s] as string
    if (连接 === '>') {
      if (i < 0 || !切简单片段(段串).every((片段) => 匹配片段(片段, 链[i]))) return false
      i--
    } else {
      while (i >= 0 && !切简单片段(段串).every((片段) => 匹配片段(片段, 链[i]))) i--
      if (i < 0) return false
      i--
    }
  }
  return true
}

export function 命中特异度(规则: 规则, 探针: 探针): 特异度 | null {
  let 最佳: 特异度 | null = null
  for (const 串 of 拆分选择器组(规则.选择器)) {
    if (!匹配复合(串, 探针)) continue
    const 值 = 特异度(串)
    if (!最佳 || 比较特异度(值, 最佳) > 0) 最佳 = 值
  }
  return 最佳
}

export function 层叠胜出(规则们: 规则[], 探针: 探针, 属性: string): 层叠结果 | null {
  let 胜出: 层叠结果 | null = null
  for (const 规则 of 规则们) {
    const 值 = 规则.声明.get(属性)
    if (值 === undefined) continue
    const 命中 = 命中特异度(规则, 探针)
    if (!命中) continue
    if (!胜出) {
      胜出 = { 规则, 特异度: 命中, 值 }
      continue
    }
    const 重要差 = Number(规则.重要.has(属性)) - Number(胜出.规则.重要.has(属性))
    const 特异差 = 比较特异度(命中, 胜出.特异度)
    const 更胜 =
      重要差 !== 0 ? 重要差 > 0 : 特异差 !== 0 ? 特异差 > 0 : 规则.序号 > 胜出.规则.序号
    if (更胜) 胜出 = { 规则, 特异度: 命中, 值 }
  }
  return 胜出
}

export function 互换文档序(规则们: 规则[], 甲选择器: string, 乙选择器: string): 规则[] {
  const 甲 = 规则们.find((项) => 项.选择器 === 甲选择器)
  const 乙 = 规则们.find((项) => 项.选择器 === 乙选择器)
  if (!甲 || !乙) throw new Error(`互换目标不存在：${甲选择器} / ${乙选择器}`)
  return 规则们.map((项) =>
    项 === 甲 ? { ...项, 序号: 乙.序号 } : 项 === 乙 ? { ...项, 序号: 甲.序号 } : 项,
  )
}

export function 令牌名(值: string, 属性: string): string {
  const 匹配 = /^var\(\s*(--[A-Za-z0-9-]+)\s*\)$/.exec(值.trim())
  if (!匹配) throw new Error(`${属性} 的层叠胜出值不是单一 var() 令牌：${值}`)
  return 匹配[1]
}

const 轮廓样式 = new Set([
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
  'none',
  'hidden',
])

const 是颜色 = (值: string): boolean =>
  /^#[0-9a-f]{3,8}$/i.test(值) || /^rgba?\(/i.test(值) || /^hsla?\(/i.test(值)

export interface 轮廓形状 {
  宽度令牌: string
  样式: string
  颜色令牌: string
}

export function 拆解轮廓(
  值: string,
  表: Map<string, string> = 按档解析全部('light', 声明块清单()),
): 轮廓形状 {
  const 部件: string[] = []
  let 缓冲 = ''
  let 深度 = 0
  for (const c of 值) {
    if (c === '(' || c === '[') 深度++
    else if (c === ')' || c === ']') 深度--
    if (c === ' ' && 深度 === 0) {
      if (缓冲) 部件.push(缓冲)
      缓冲 = ''
      continue
    }
    缓冲 += c
  }
  if (缓冲) 部件.push(缓冲)
  const 样式 = 部件.filter((项) => 轮廓样式.has(项.toLowerCase()))
  const 其余 = 部件.filter((项) => !轮廓样式.has(项.toLowerCase()))
  if (样式.length !== 1 || 其余.length !== 2)
    throw new Error(`outline 简写拆不出「一个样式 + 两个 var() 部件」：${值}`)
  const 颜色候选 = 其余.filter((项) => 是颜色(令牌值(项, 表)))
  if (颜色候选.length !== 1)
    throw new Error(`outline 简写里颜色部件不唯一（${其余.join(' / ')}）：${值}`)
  return {
    宽度令牌: 令牌名(其余.find((项) => 项 !== 颜色候选[0]) as string, 'outline-width'),
    样式: 样式[0],
    颜色令牌: 令牌名(颜色候选[0], 'outline-color'),
  }
}

function 令牌值(部件: string, 表: Map<string, string>): string {
  const 匹配 = /^var\(\s*(--[A-Za-z0-9-]+)\s*\)$/.exec(部件.trim())
  if (!匹配) return 部件
  return 表.get(匹配[1]) ?? ''
}

export interface 焦点环结果 {
  规则: 规则
  宽度令牌: string
  宽度像素: number
  偏移令牌: string
  偏移像素: number
  颜色令牌: string
  样式: string
  特异度: 特异度
}

export function 层叠焦点环(规则们: 规则[], 探针: 探针): 焦点环结果 {
  const 胜出 = 层叠胜出(规则们, 探针, 'outline')
  if (!胜出) throw new Error(`探针 ${JSON.stringify(探针)} 上没有任何规则画出 outline`)
  const 偏移 = 层叠胜出(规则们, 探针, 'outline-offset')
  if (!偏移) throw new Error(`探针 ${JSON.stringify(探针)} 上没有任何规则给出 outline-offset`)
  const 形 = 拆解轮廓(胜出.值)
  return {
    规则: 胜出.规则,
    宽度令牌: 形.宽度令牌,
    宽度像素: 解析几何数值(形.宽度令牌),
    偏移令牌: 令牌名(偏移.值, 'outline-offset'),
    偏移像素: 解析几何数值(令牌名(偏移.值, 'outline-offset')),
    颜色令牌: 形.颜色令牌,
    样式: 形.样式,
    特异度: 胜出.特异度,
  }
}
