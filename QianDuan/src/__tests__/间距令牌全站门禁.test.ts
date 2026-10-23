import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { 声明块清单, 声明位置, 按档解析全部, 求几何算式 } from './主题令牌真源'


const 块们 = 声明块清单()
const 浅色解析 = 按档解析全部('light', 块们)
const 深色解析 = 按档解析全部('dark', 块们)

const 八档: Array<{ 令牌: string; 值: string; 新增: boolean }> = [
  { 令牌: '--jiange-da', 值: '24px', 新增: false },
  { 令牌: '--jiange-zhong', 值: '16px', 新增: false },
  { 令牌: '--jiange-12', 值: '12px', 新增: true },
  { 令牌: '--jiange-10', 值: '10px', 新增: true },
  { 令牌: '--jiange-xiao', 值: '8px', 新增: false },
  { 令牌: '--jiange-6', 值: '6px', 新增: true },
  { 令牌: '--jiange-4', 值: '4px', 新增: true },
  { 令牌: '--jiange-2', 值: '2px', 新增: true },
]

const 源码根 = resolve(__dirname, '..')

function 列出全部Vue(目录 = 源码根): string[] {
  const 出: string[] = []
  for (const 条目 of readdirSync(目录)) {
    const 全 = join(目录, 条目)
    if (statSync(全).isDirectory()) {
      if (条目 === 'node_modules' || 条目 === '__tests__') continue
      出.push(...列出全部Vue(全))
    } else if (条目.endsWith('.vue')) {
      出.push(relative(源码根, 全).replace(/\\/g, '/'))
    }
  }
  return 出.sort()
}

const 收编文件 = 列出全部Vue()

const 战绩链路文件 = [
  'views/过往战绩.vue',
  'components/战绩分类管理.vue',
  'components/空态.vue',
]

function 读(相对: string): string {
  return readFileSync(resolve(源码根, 相对), 'utf8')
}

function 取样式(相对: string): string {
  const 源 = 读(相对)
  const 块们 = [...源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
  if (!块们.length) throw new Error(`${相对} 缺少 <style> 块`)
  return 块们.join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
}


const 间距族名 = [
  'margin', 'padding', 'gap', 'row-gap', 'column-gap', 'grid-gap', 'grid-row-gap', 'grid-column-gap',
  'scroll-margin', 'scroll-padding',
]
const gap族名 = 间距族名.filter((名) => 名 !== 'margin' && 名 !== 'padding' && 名 !== 'scroll-margin' && 名 !== 'scroll-padding')
const 间距属性 = new RegExp(`^(?:-(?:webkit|moz|ms|o)-)?(?:${间距族名.join('|')})(?:-[a-z]+)*$`)
const gap属性 = new RegExp(`^(?:${gap族名.join('|')})$`)

const 长度字面量 =
  /\d+(?:\.\d+)?(?:px|rem|em|pt|cm|mm|in|pc|q|ch|ex|lh|rlh|vi|vb|vmin|vmax|svh|lvh|dvh|cqw|cqh|cqi|cqb|cqmin|cqmax)\b/gi

function 剥函数片段(源: string): string {
  let 出 = ''
  let i = 0
  while (i < 源.length) {
    const 头 = /^(var|env)\s*\(/.exec(源.slice(i))
    if (头) {
      let 深度 = 0
      let j = i + 头[0].length - 1
      for (; j < 源.length; j++) {
        if (源[j] === '(') 深度++
        else if (源[j] === ')') {
          深度--
          if (深度 === 0) break
        }
      }
      const 内 = 源.slice(i + 头[0].length, j)
      let 深 = 0
      let 逗 = -1
      for (let k = 0; k < 内.length; k++) {
        if (内[k] === '(') 深++
        else if (内[k] === ')') 深--
        else if (内[k] === ',' && 深 === 0) {
          逗 = k
          break
        }
      }
      if (逗 >= 0) 出 += 剥函数片段(内.slice(逗 + 1))
      i = j + 1
      continue
    }
    出 += 源[i]
    i++
  }
  return 出
}

function 裸长度(值: string): string | null {
  const 残 = 剥函数片段(值)
  for (const 命中 of 残.matchAll(长度字面量)) {
    if (parseFloat(命中[0]) !== 0) return 命中[0]
  }
  return null
}

function 扫间距声明文本(文本: string): Array<{ 属性: string; 值: string }> {
  const 出: Array<{ 属性: string; 值: string }> = []
  for (const 规则 of 文本.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const 声明 of 规则[2].matchAll(/(?:^|;)\s*([a-zA-Z-]+)\s*:\s*([^;]+)/g)) {
      const 属性 = 声明[1].toLowerCase()
      if (间距属性.test(属性)) 出.push({ 属性, 值: 声明[2].trim() })
    }
  }
  return 出
}


type 声明对 = { 属性: string; 值: string }
const 边序 = ['top', 'right', 'bottom', 'left'] as const
type 边 = (typeof 边序)[number]

function 切上下文(样式: string): Array<{ 标签: string; 文本: string }> {
  const 上下文: Array<{ 标签: string; 文本: string }> = []
  let 基础 = ''
  let i = 0
  while (i < 样式.length) {
    const 头 = /@(?:media|supports|container|layer)[^{};]*\{/.exec(样式.slice(i))
    if (!头) {
      基础 += 样式.slice(i)
      break
    }
    const 起点 = i + 头.index
    基础 += 样式.slice(i, 起点)
    let 深度 = 0
    let j = 起点 + 头[0].length - 1
    for (; j < 样式.length; j++) {
      if (样式[j] === '{') 深度++
      else if (样式[j] === '}') {
        深度--
        if (深度 === 0) break
      }
    }
    上下文.push({
      标签: 样式.slice(起点, 起点 + 头[0].length - 1).trim(),
      文本: 样式.slice(起点 + 头[0].length, j),
    })
    i = j + 1
  }
  上下文.unshift({ 标签: 'base', 文本: 基础 })
  return 上下文
}

function 取主体(选择器: string): string {
  const s = 选择器.trim()
  let 起 = 0
  let 深 = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '(' || c === '[') 深++
    else if (c === ')' || c === ']') 深--
    else if (深 === 0 && (c === '>' || c === '+' || c === '~' || /\s/.test(c))) 起 = i + 1
  }
  return s.slice(起).trim()
}

function 含伪元素(选择器: string): boolean {
  return (
    /::/.test(选择器) ||
    /:(?:before|after|first-line|first-letter)\b/i.test(选择器) ||
    /:(?:-webkit-|-moz-|-ms-)\w+/i.test(选择器)
  )
}


type 模板元素 = { 标签: string; 类集合: Set<string> }

function 顶层切分(源: string, 分隔: string): string[] {
  const 出: string[] = []
  let 深 = 0
  let 引: string | null = null
  let 起 = 0
  for (let i = 0; i < 源.length; i++) {
    const c = 源[i]
    if (引) {
      if (c === 引) 引 = null
      continue
    }
    if (c === '"' || c === "'") {
      引 = c
      continue
    }
    if (c === '(' || c === '[' || c === '{') 深++
    else if (c === ')' || c === ']' || c === '}') 深--
    else if (c === 分隔 && 深 === 0) {
      出.push(源.slice(起, i))
      起 = i + 1
    }
  }
  出.push(源.slice(起))
  return 出
}

function 顶层冒号位置(源: string): number {
  let 深 = 0
  let 引: string | null = null
  for (let i = 0; i < 源.length; i++) {
    const c = 源[i]
    if (引) {
      if (c === 引) 引 = null
      continue
    }
    if (c === '"' || c === "'") {
      引 = c
      continue
    }
    if (c === '(' || c === '[' || c === '{') 深++
    else if (c === ')' || c === ']' || c === '}') 深--
    else if (c === ':' && 深 === 0) return i
  }
  return -1
}

function 取动态类键(表达式: string): string[] {
  const 出: string[] = []
  const 对象 = /^\s*\{([\s\S]*)\}\s*$/.exec(表达式)
  if (!对象) return 出
  for (const 项 of 顶层切分(对象[1], ',')) {
    const 冒 = 顶层冒号位置(项)
    if (冒 < 0) continue
    const 键 = 项.slice(0, 冒).trim().replace(/^['"]|['"]$/g, '')
    if (/^[A-Za-z_][\w-]*$/.test(键)) 出.push(键)
  }
  return 出
}

function 取类集合(属性串: string): Set<string> {
  const 出 = new Set<string>()
  for (const 匹 of 属性串.matchAll(/(?:^|\s)class="([^"]*)"/g)) {
    for (const 类 of 匹[1].split(/\s+/)) if (类) 出.add(类)
  }
  for (const 匹 of 属性串.matchAll(/(?:^|\s)(?::class|v-bind:class)="([^"]*)"/g)) {
    for (const 键 of 取动态类键(匹[1])) 出.add(键)
  }
  return 出
}

function 解析模板元素(相对: string): 模板元素[] {
  const 源 = 读(相对)
  const 模板 = /<template>([\s\S]*)<\/template>/.exec(源)?.[1]
  if (模板 === undefined) throw new Error(`${相对} 缺少 <template> 块（修正M 无法解析目标元素类集合）`)
  const 出: 模板元素[] = []
  let i = 0
  while (i < 模板.length) {
    const 起 = 模板.indexOf('<', i)
    if (起 < 0) break
    const 名匹 = /^<([A-Za-z][\w-]*)/.exec(模板.slice(起))
    if (!名匹) {
      i = 起 + 1
      continue
    }
    let j = 起 + 名匹[0].length
    let 引: string | null = null
    for (; j < 模板.length; j++) {
      const c = 模板[j]
      if (引) {
        if (c === 引) 引 = null
        continue
      }
      if (c === '"' || c === "'") {
        引 = c
        continue
      }
      if (c === '>') break
    }
    const 类集合 = 取类集合(模板.slice(起 + 名匹[0].length, j))
    if (类集合.size) 出.push({ 标签: 名匹[1], 类集合 })
    i = j + 1
  }
  return 出
}

const 模板元素缓存 = new Map<string, 模板元素[]>()
function 读模板元素(相对: string): 模板元素[] {
  const 缓存 = 模板元素缓存.get(相对)
  if (缓存) return 缓存
  const 元素们 = 解析模板元素(相对)
  模板元素缓存.set(相对, 元素们)
  return 元素们
}

const 目标元素缓存 = new Map<string, 模板元素[]>()
function 目标元素们(目标: string): 模板元素[] {
  const 类名 = 目标.replace(/^\./, '').trim()
  const 缓存 = 目标元素缓存.get(类名)
  if (缓存) return 缓存
  const 命中: 模板元素[] = []
  for (const 文件 of 战绩链路文件) {
    for (const 元素 of 读模板元素(文件)) {
      if (元素.类集合.has(类名)) 命中.push(元素)
    }
  }
  if (!命中.length) {
    throw new Error(`修正M：无法从模板解析承载 .${类名} 的元素，拒绝静默退回近似匹配`)
  }
  目标元素缓存.set(类名, 命中)
  return 命中
}

function 拆主体(主体: string): { 标签: string; 类集合: Set<string> } {
  const 标签 = /^([A-Za-z][\w-]*)/.exec(主体)?.[1] ?? ''
  const 类集合 = new Set<string>()
  for (const 匹 of 主体.matchAll(/\.([A-Za-z_][\w-]*)/g)) 类集合.add(匹[1])
  return { 标签, 类集合 }
}

function 主体作用于(主体: string, 目标: string): boolean {
  if (含伪元素(主体)) return false
  const { 标签, 类集合 } = 拆主体(主体)
  if (!类集合.size) return false
  for (const 元素 of 目标元素们(目标)) {
    if (标签 && 标签 !== 元素.标签) continue
    let 全含 = true
    for (const 类 of 类集合) {
      if (!元素.类集合.has(类)) {
        全含 = false
        break
      }
    }
    if (全含) return true
  }
  return false
}

function 收集声明对(文本: string, 选择器片段: string, 属性族: RegExp): 声明对[] {
  const 出: 声明对[] = []
  for (const 规则 of 文本.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const 命中 = 规则[1].split(',').some((s) => 主体作用于(取主体(s), 选择器片段))
    if (!命中) continue
    for (const 声明 of 规则[2].matchAll(/(?:^|;)\s*([a-zA-Z-]+)\s*:\s*([^;]+)/g)) {
      const 属性 = 声明[1].toLowerCase()
      if (属性族.test(属性)) 出.push({ 属性, 值: 声明[2].trim() })
    }
  }
  return 出
}

function 简写分量(值: string, 边: 边): string {
  const 部 = 值.trim().split(/\s+/)
  if (部.length === 1) return 部[0]
  if (部.length === 2) return 边 === 'top' || 边 === 'bottom' ? 部[0] : 部[1]
  if (部.length === 3) return 边 === 'left' || 边 === 'right' ? 部[1] : 边 === 'top' ? 部[0] : 部[2]
  return 部[边序.indexOf(边)]
}

function 逻辑分量(值: string, 端: 'start' | 'end'): string {
  const 部 = 值.trim().split(/\s+/)
  return 部.length === 1 ? 部[0] : 端 === 'start' ? 部[0] : 部[1]
}

function 有效盒边(对们: 声明对[], 简写: 'margin' | 'padding', 边: 边): string {
  let 值 = '0'
  for (const { 属性, 值: 当前值 } of 对们) {
    if (属性 === 简写) 值 = 简写分量(当前值, 边)
    else if (属性 === `${简写}-${边}`) 值 = 当前值
    // 逻辑属性（horizontal-tb + ltr）：block 轴→top/bottom，inline 轴→left/right
    else if (属性 === `${简写}-block-start` && 边 === 'top') 值 = 当前值
    else if (属性 === `${简写}-block-end` && 边 === 'bottom') 值 = 当前值
    else if (属性 === `${简写}-inline-start` && 边 === 'left') 值 = 当前值
    else if (属性 === `${简写}-inline-end` && 边 === 'right') 值 = 当前值
    else if (属性 === `${简写}-block` && (边 === 'top' || 边 === 'bottom'))
      值 = 逻辑分量(当前值, 边 === 'top' ? 'start' : 'end')
    else if (属性 === `${简写}-inline` && (边 === 'left' || 边 === 'right'))
      值 = 逻辑分量(当前值, 边 === 'left' ? 'start' : 'end')
  }
  return 值
}

function 盒边口径(
  文件: string,
  选择器: string,
  简写: 'margin' | 'padding',
  边: 边,
): { base: number; 全并: number } {
  const 上下文们 = 切上下文(取样式(文件))
  const 属性族 = new RegExp(`^${简写}(-[a-z]+)*$`)
  const 基础值 = 有效盒边(收集声明对(上下文们[0].文本, 选择器, 属性族), 简写, 边)
  let 全并 = 基础值
  for (const 上 of 上下文们.slice(1)) {
    const 对们 = 收集声明对(上.文本, 选择器, 属性族)
    if (对们.length) 全并 = 有效盒边([{ 属性: 简写, 值: 全并 }, ...对们], 简写, 边)
  }
  return { base: 求几何算式(基础值, 块们), 全并: 求几何算式(全并, 块们) }
}

function 单值口径(文件: string, 选择器: string, 属性族: RegExp): { base: number; 全并: number } {
  const 上下文们 = 切上下文(取样式(文件))
  const 取末值 = (文本: string): string => {
    let 值 = '0'
    for (const 对 of 收集声明对(文本, 选择器, 属性族)) 值 = 对.值
    return 值.trim().split(/\s+/)[0]
  }
  const 基础值 = 取末值(上下文们[0].文本)
  let 全并 = 基础值
  for (const 上 of 上下文们.slice(1)) {
    const 对们 = 收集声明对(上.文本, 选择器, 属性族)
    if (对们.length) 全并 = 对们[对们.length - 1].值.trim().split(/\s+/)[0]
  }
  return { base: 求几何算式(基础值, 块们), 全并: 求几何算式(全并, 块们) }
}


describe('FP-K1b批1 间距令牌八档体系', () => {
  it('八档齐备：既有三档数值不动，新增五档取值正确', () => {
    for (const { 令牌, 值 } of 八档) {
      expect(浅色解析.get(令牌), `${令牌} 浅色档取值`).toBe(值)
      expect(深色解析.get(令牌), `${令牌} 深色档取值`).toBe(值)
    }
  })

  it('八档序严格递减：da24 > zhong16 > 12 > 10 > xiao8 > 6 > 4 > 2', () => {
    const 值序 = 八档.map(({ 令牌 }) => 求几何算式(`var(${令牌})`, 块们))
    expect(值序).toEqual([24, 16, 12, 10, 8, 6, 4, 2])
    for (let i = 1; i < 值序.length; i++) {
      expect(值序[i], `第 ${i + 1} 档未严格小于上一档`).toBeLessThan(值序[i - 1])
    }
  })

  it('新增五档只住共用 :root 块（不含 data-theme 分支），深浅同值不塌陷', () => {
    for (const { 令牌, 新增 } of 八档) {
      if (!新增) continue
      expect(声明位置(令牌, 块们), `${令牌} 只能声明在共用 :root 块`).toEqual({
        共用: true,
        浅色: false,
        深色: false,
      })
      const 全文件出现次数 = [...读('styles/设计令牌.css').matchAll(new RegExp(`${令牌}\\s*:`, 'g'))]
        .length
      expect(全文件出现次数, `${令牌} 应全文件只声明一次（纯追加）`).toBe(1)
    }
  })

  it('新增五档均有消费者（全站 vue），不留零消费者幻影令牌', () => {
    const 全部源 = 收编文件.map(读).join('\n')
    for (const { 令牌, 新增 } of 八档) {
      if (!新增) continue
      expect(
        new RegExp(`var\\(\\s*${令牌}\\s*[,)]`).test(全部源),
        `${令牌} 在全站 vue 内无消费者`,
      ).toBe(true)
    }
  })
})

describe('FP-K1c批3 全站间距收编门禁', () => {
  it('全站 vue 内 margin/padding/gap/scroll-* 声明一律消费设计令牌（白名单仅 0/auto/百分比/视口单位）', () => {
    const 违规: string[] = []
    for (const 文件 of 收编文件) {
      for (const { 属性, 值 } of 扫间距声明文本(取样式(文件))) {
        const 裸 = 裸长度(值)
        if (裸) 违规.push(`${文件} → ${属性}: ${值}（裸 ${裸}）`)
      }
    }
    expect(违规, `仍有裸 px 间距未令牌化：\n${违规.join('\n')}`).toEqual([])
  })

  it('静态门禁自证：三类漏网合成反例必须判红，令牌算式不得误判', () => {
    const 反例 = [
      '.a { padding: 8px; }', // ① 选择器与声明同行
      '.b { padding: calc(16px + var(--jiange-4)); }', // ② 值中含 var() 仍须查残留 px
      '.c { gap: var(--jiange-xiao) 6px; }', // ③ 多值混写
    ]
    for (const 文本 of 反例) {
      const 命中 = 扫间距声明文本(文本).filter((声明) => 裸长度(声明.值))
      expect(命中.length, `漏网反例：${文本}`).toBeGreaterThan(0)
    }
    const 合法 = [
      '.d { padding: calc(var(--jiange-da) + var(--jiange-zhong)); }',
      '.e { gap: var(--jiange-12); }',
      '.f { margin: 0 var(--jiange-4); }',
      '.g { padding: 0; }',
      '.h { margin-left: auto; }',
      '.i { padding: 12vh 50%; }',
    ]
    for (const 文本 of 合法) {
      const 命中 = 扫间距声明文本(文本).filter((声明) => 裸长度(声明.值))
      expect(命中, `误判合法写法：${文本}`).toEqual([])
    }
  })

  it('门禁自证·修正B：var()/env() 的 fallback 内裸长度必须判红，0/auto fallback 放行', () => {
    const 判红 = [
      'var(--jiange-zhong, 16px)', // fallback 裸 16px
      'calc(var(--jiange-da, 24px) + var(--jiange-zhong))', // 嵌套 calc 内 fallback 裸 24px
    ]
    for (const 值 of 判红) {
      expect(裸长度(值), `fallback 裸长度漏网：${值}`).not.toBeNull()
    }
    const 放行 = ['var(--x, 0)', 'var(--x, auto)', 'var(--jiange-zhong)', 'env(safe-area-inset-top, 0px)']
    for (const 值 of 放行) {
      expect(裸长度(值), `误判合法 fallback：${值}`).toBeNull()
    }
  })

  it('门禁自证·修正C：单位大小写/冷门单位必须判红，零值长度放行', () => {
    for (const 值 of ['8PX', '2pt', '0.5cm', '3MM', '1in', '2pc', '4q']) {
      expect(裸长度(值), `单位漏网：${值}`).not.toBeNull()
    }
    for (const 值 of ['0px', '0rem', '0.0px', '0cm', '0']) {
      expect(裸长度(值), `零值长度被误判：${值}`).toBeNull()
    }
  })

  it('门禁自证·修正A/I：主体选择器匹配——子串污染排除、后代/复合命中、伪元素与祖先位置排除', () => {
    const 文本 = '.zhanji-liebiao { gap: 12px; } .zhanji-liebiao-neirong { gap: 99px; }'
    const 命中 = 收集声明对(文本, '.zhanji-liebiao', /^gap$/)
    expect(命中.length, '子串匹配会同时命中 .zhanji-liebiao-neirong（假绿）').toBe(1)
    expect(命中[0].值).toBe('12px')

    expect(收集声明对('.zhanji-liebiao.tuo-zhuai-zhong { gap: 5px; }', '.zhanji-liebiao', /^gap$/)).toHaveLength(1)
    expect(收集声明对('.zhanji-liebiao:hover { gap: 5px; }', '.zhanji-liebiao', /^gap$/)).toHaveLength(1)
    expect(收集声明对(":root[data-theme='light'] .kong-zhuangtai { padding-top: 8px; }", '.kong-zhuangtai', /^padding(-[a-z]+)*$/)).toHaveLength(1)

    expect(收集声明对('.zhanji-liebiao::-webkit-scrollbar-track { padding-top: 8px; }', '.zhanji-liebiao', /^padding(-[a-z]+)*$/)).toEqual([])
    expect(收集声明对('.zhanji-liebiao::before { padding-top: 8px; }', '.zhanji-liebiao', /^padding(-[a-z]+)*$/)).toEqual([])
    expect(收集声明对('.zhanji-liebiao .zhanji-kapian { padding-top: 8px; }', '.zhanji-liebiao', /^padding(-[a-z]+)*$/)).toEqual([])
    expect(收集声明对('.fenlei-kong-zhuangtai { padding-top: 8px; }', '.kong-zhuangtai', /^padding(-[a-z]+)*$/)).toEqual([])
  })

  it('门禁自证·修正J：gap 的 grid 别名（grid-gap/grid-row-gap/grid-column-gap）必须纳入', () => {
    for (const 属性 of ['grid-gap', 'grid-row-gap', 'grid-column-gap']) {
      const 命中 = 扫间距声明文本(`.x { ${属性}: 8px; }`)
      expect(命中.length, `${属性} 未被识别为间距属性`).toBe(1)
      expect(裸长度(命中[0].值), `${属性} 裸 8px 漏网`).not.toBeNull()
    }
  })

  it('门禁自证·修正K：@supports/@container/@layer 内的间距覆盖必须纳入上下文切分', () => {
    for (const 头 of ['@supports (display: grid)', '@container (min-width: 400px)', '@layer base']) {
      const 样式 = `${头} { .zhanji-liebiao { padding-top: 8px; } }`
      const 上下文们 = 切上下文(样式)
      expect(上下文们.length, `${头} 未被切为独立上下文`).toBe(2)
      const 对们 = 收集声明对(上下文们[1].文本, '.zhanji-liebiao', /^padding(-[a-z]+)*$/)
      expect(有效盒边(对们, 'padding', 'top'), `${头} 内的 padding-top 覆盖漏网`).toBe('8px')
    }
  })

  it('门禁自证·修正M：按模板真实类集合匹配——目标类非首位（元素前缀/共同类）必须命中', () => {
    const 边族 = /^margin(-[a-z]+)*$/
    expect(收集声明对('div.kong-zhuangtai { margin-top: 16px; }', '.kong-zhuangtai', 边族), '元素前缀 div.').toHaveLength(1)
    expect(收集声明对('.jiaZai-cuoWu-zhuangtai { margin-top: 16px; }', '.kong-zhuangtai', 边族), '共同类（非首位）').toHaveLength(1)
    expect(收集声明对('main.zhanji-liebiao { margin-top: 0; }', '.zhanji-liebiao', 边族), '元素前缀 main.').toHaveLength(1)
    expect(收集声明对('.kong-zhuangtai.jiaZai-cuoWu-zhuangtai { margin-top: 16px; }', '.kong-zhuangtai', 边族)).toHaveLength(1)
    expect(收集声明对('.zhanji-liebiao-neirong { gap: 99px; }', '.zhanji-liebiao', /^gap$/)).toEqual([])
    expect(收集声明对('.fenlei-kong-zhuangtai { padding-top: 8px; }', '.kong-zhuangtai', /^padding(-[a-z]+)*$/)).toEqual([])
    expect(收集声明对('.zhanji-liebiao .zhanji-kapian { padding-top: 8px; }', '.zhanji-liebiao', /^padding(-[a-z]+)*$/)).toEqual([])
    expect(收集声明对('.zhanji-liebiao::-webkit-scrollbar-track { padding-top: 8px; }', '.zhanji-liebiao', /^padding(-[a-z]+)*$/)).toEqual([])
    expect(() => 收集声明对('.x { margin-top: 8px; }', '.bu-cun-zai-de-lei', 边族)).toThrow()
  })

  it('门禁自证·修正N：旧式单冒号厂商伪元素必须排除（不误红 padding-top 恒 0 断言）', () => {
    expect(含伪元素('.zhanji-liebiao:-webkit-scrollbar')).toBe(true)
    expect(含伪元素('.zhanji-liebiao:-moz-focus-inner')).toBe(true)
    expect(含伪元素('.zhanji-liebiao:-ms-input-placeholder')).toBe(true)
    expect(含伪元素('.zhanji-liebiao::before')).toBe(true)
    expect(含伪元素('.zhanji-liebiao:hover')).toBe(false)
    expect(收集声明对('.zhanji-liebiao:-webkit-scrollbar { padding-top: 8px; }', '.zhanji-liebiao', /^padding(-[a-z]+)*$/)).toEqual([])
  })

  it('门禁自证·修正O：对称断言的 gap 族与裸px门禁同源（grid-gap 覆盖不再假绿）', () => {
    for (const 属性 of ['gap', 'row-gap', 'column-gap', 'grid-gap', 'grid-row-gap', 'grid-column-gap']) {
      expect(gap属性.test(属性), `${属性} 应属 gap 单值族`).toBe(true)
      expect(间距属性.test(属性), `${属性} 应属间距属性（同源）`).toBe(true)
    }
    for (const 属性 of ['margin', 'padding', 'margin-top', 'padding-block-start']) {
      expect(gap属性.test(属性), `${属性} 不应属 gap 单值族`).toBe(false)
    }
    const 文本 = '@media (min-width: 1px) { .zhanji-liebiao { grid-gap: var(--jiange-xiao); } }'
    const 对们 = 收集声明对(切上下文(文本)[1].文本, '.zhanji-liebiao', gap属性)
    expect(对们, 'grid-gap 覆盖未被 gap 族读到').toHaveLength(1)
  })

  it('门禁自证·修正P：长度单位集补全 + 旧式属性前缀别名', () => {
    for (const 值 of [
      '2ch', '3ex', '1lh', '2rlh', '1vi', '1vb', '1vmin', '1vmax', '2svh', '2lvh', '2dvh',
      '3cqw', '3cqh', '3cqi', '3cqb', '3cqmin', '3cqmax',
    ]) {
      expect(裸长度(值), `单位漏网：${值}`).not.toBeNull()
    }
    for (const 属性 of ['-webkit-margin-before', '-moz-padding-start', '-ms-margin-after', 'margin-block-start']) {
      const 命中 = 扫间距声明文本(`.x { ${属性}: 8px; }`)
      expect(命中.length, `${属性} 未被识别为间距属性`).toBe(1)
      expect(裸长度(命中[0].值), `${属性} 裸 8px 漏网`).not.toBeNull()
    }
  })

  it('门禁自证·修正Q：@layer 语句式（分号结尾无块）不得被误当上下文头', () => {
    const 样式 = '@layer base;\n.zhanji-liebiao { padding-top: 8px; }'
    const 上下文们 = 切上下文(样式)
    expect(上下文们.length, '@layer 语句式不应产生额外上下文').toBe(1)
    const 对们 = 收集声明对(上下文们[0].文本, '.zhanji-liebiao', /^padding(-[a-z]+)*$/)
    expect(有效盒边(对们, 'padding', 'top'), '@layer 语句式后的规则被误判为非 base').toBe('8px')
  })

  it('门禁自证·修正D：逻辑属性必须纳入盒边解析（padding-block-start 等价 padding-top）', () => {
    expect(有效盒边([{ 属性: 'padding-block-start', 值: '16px' }], 'padding', 'top')).toBe('16px')
    expect(有效盒边([{ 属性: 'padding-block-end', 值: '8px' }], 'padding', 'bottom')).toBe('8px')
    expect(有效盒边([{ 属性: 'padding-block', 值: '12px 6px' }], 'padding', 'top')).toBe('12px')
    expect(有效盒边([{ 属性: 'padding-block', 值: '12px 6px' }], 'padding', 'bottom')).toBe('6px')
    expect(有效盒边([{ 属性: 'margin-inline-start', 值: '4px' }], 'margin', 'left')).toBe('4px')
  })

  it('门禁自证·修正T：父级 `.zhanji-yemian` 的 padding-top 必须计入上间距（注入即判红）', () => {
    const 战绩 = 'views/过往战绩.vue'
    const 合法父级 = 盒边口径(战绩, '.zhanji-yemian', 'padding', 'top')
    expect(合法父级.base, '[base] 父级 .zhanji-yemian 的 padding-top 应为 0').toBe(0)
    expect(合法父级.全并, '[全并] 父级 .zhanji-yemian 的 padding-top 应为 0').toBe(0)

    const 注入 = 收集声明对('.zhanji-yemian { padding-top: 16px; }', '.zhanji-yemian', /^padding(-[a-z]+)*$/)
    const 注入父级上 = 求几何算式(有效盒边(注入, 'padding', 'top'), 块们)
    const 容器上边距 = 盒边口径(战绩, '.zhanji-liebiao', 'margin', 'top').base
    const 容器上内边距 = 盒边口径(战绩, '.zhanji-liebiao', 'padding', 'top').base
    const 注入后上 = 注入父级上 + 容器上边距 + 容器上内边距
    const 改前上 = 容器上边距 + 容器上内边距 
    expect(改前上, '旧读面（不含父级 padding-top）读到的上间距仍为 16 → 假绿').toBe(16)
    expect(注入父级上, '注入的父级 padding-top 必须被读到（旧读面读不到）').toBe(16)
    expect(注入后上, '注入父级 padding-top 后上间距必须 ≠ 16（否则假绿）').not.toBe(16)
    expect(注入后上, '注入后上间距应为 32').toBe(32)
  })

  it('"默认分类"框上下间距对称：基础口径与媒体覆盖口径下 上 == 下 == 16px', () => {
    const 战绩 = 'views/过往战绩.vue'
    const 分类 = 'components/战绩分类管理.vue'
    const 父级上内边距 = 盒边口径(战绩, '.zhanji-yemian', 'padding', 'top')
    const 容器上边距 = 盒边口径(战绩, '.zhanji-liebiao', 'margin', 'top')
    const 容器上内边距 = 盒边口径(战绩, '.zhanji-liebiao', 'padding', 'top')
    const 标签栏下内边距 = 盒边口径(分类, '.fenlei-biao-qian-lan', 'padding', 'bottom')
    const 列表gap = 单值口径(战绩, '.zhanji-liebiao', gap属性)
    const 空态卡上边距 = 盒边口径(战绩, '.kong-zhuangtai', 'margin', 'top')

    for (const 口径 of ['base', '全并'] as const) {
      const 上 = 父级上内边距[口径] + 容器上边距[口径] + 容器上内边距[口径]
      const 下 = 标签栏下内边距[口径] + 列表gap[口径] + 空态卡上边距[口径]
      expect(容器上内边距[口径], `[${口径}] 滚动容器上内边距必须为 0（sticky 贴顶）`).toBe(0)
      expect(空态卡上边距[口径], `[${口径}] 空态卡不得叠加上外边距（gap 单机制）`).toBe(0)
      expect(上, `[${口径}] 上间距`).toBe(16)
      expect(下, `[${口径}] 下间距`).toBe(16)
      expect(上, `[${口径}] 上下不对称：上 ${上} / 下 ${下}`).toBe(下)
    }
  })

  it('滚动容器不得带 padding-top：任何口径下都必须为 0（sticky 后代不被推离容器顶）', () => {
    const 战绩 = 'views/过往战绩.vue'
    for (const 上 of 切上下文(取样式(战绩))) {
      const 对们 = 收集声明对(上.文本, '.zhanji-liebiao', /^padding(-[a-z]+)*$/)
      if (!对们.length) continue
      expect(有效盒边(对们, 'padding', 'top'), `[${上.标签}] padding-top 被改回非 0`).toBe('0')
    }
  })

  it('上间距依赖 flex 列父级：`.zhanji-yemian` 必须是 display:flex + flex-direction:column（修正E）', () => {
    const 战绩 = 'views/过往战绩.vue'
    const 父级 = 收集声明对(取样式(战绩), '.zhanji-yemian', /^display$|^flex-direction$/)
    const 取 = (属性: string): string => 父级.find((对) => 对.属性 === 属性)?.值 ?? ''
    expect(取('display'), '`.zhanji-yemian` 必须是 flex 容器（否则子项 margin 塌陷）').toBe('flex')
    expect(取('flex-direction'), '`.zhanji-yemian` 必须是列方向').toBe('column')
  })
})


describe('FP-K1c批3 补充间距档', () => {
  const 补充档: Array<{ 令牌: string; 值: string }> = [
    { 令牌: '--jiange-15', 值: '15px' },
    { 令牌: '--jiange-13', 值: '13px' },
    { 令牌: '--jiange-11', 值: '11px' },
    { 令牌: '--jiange-9', 值: '9px' },
    { 令牌: '--jiange-7', 值: '7px' },
    { 令牌: '--jiange-5', 值: '5px' },
    { 令牌: '--jiange-3', 值: '3px' },
    { 令牌: '--jiange-1', 值: '1px' },
  ]

  it('补充八档齐备且住在共用 :root 块', () => {
    for (const { 令牌, 值 } of 补充档) {
      expect(浅色解析.get(令牌), `${令牌} 浅色档取值`).toBe(值)
      expect(深色解析.get(令牌), `${令牌} 深色档取值`).toBe(值)
      expect(声明位置(令牌, 块们), `${令牌} 只能声明在共用 :root 块`).toEqual({
        共用: true,
        浅色: false,
        深色: false,
      })
    }
  })

  it('补充八档序严格递减 15>13>11>9>7>5>3>1', () => {
    const 值序 = 补充档.map(({ 令牌 }) => 求几何算式(`var(${令牌})`, 块们))
    expect(值序).toEqual([15, 13, 11, 9, 7, 5, 3, 1])
    for (let i = 1; i < 值序.length; i++) {
      expect(值序[i], `第 ${i + 1} 档未严格小于上一档`).toBeLessThan(值序[i - 1])
    }
  })

  it('补充档均有消费者（全站 vue）', () => {
    const 全部源 = 收编文件.map(读).join('\n')
    for (const { 令牌 } of 补充档) {
      expect(
        new RegExp(`var\\(\\s*${令牌}\\s*[,)]`).test(全部源),
        `${令牌} 在全站 vue 内无消费者`,
      ).toBe(true)
    }
  })

  it('滚动偏移几何令牌 --biaoqian-lan-gao-du 齐备', () => {
    expect(浅色解析.get('--biaoqian-lan-gao-du')).toBe('76px')
    expect(深色解析.get('--biaoqian-lan-gao-du')).toBe('76px')
    expect(声明位置('--biaoqian-lan-gao-du', 块们).共用).toBe(true)
  })
})

describe('FP-K1c批3 滚动容器 padding-top 恒 0 全站断言', () => {
  function 提规则(文本: string): Array<{ 选择器: string; 体: string }> {
    const 出: Array<{ 选择器: string; 体: string }> = []
    for (const 规则 of 文本.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      出.push({ 选择器: 规则[1].trim(), 体: 规则[2] })
    }
    return 出
  }

  function 是滚动容器(体: string): boolean {
    for (const 声明 of 体.matchAll(/(?:^|;)\s*(overflow(?:-x|-y)?)\s*:\s*([^;]+)/g)) {
      if (/auto|scroll/i.test(声明[2])) return true
    }
    return false
  }

  function 是Sticky(体: string): boolean {
    return /(?:^|;)\s*position\s*:\s*sticky/i.test(体)
  }

  it('滚动容器 + 同文件 sticky 后代 → padding-top 必须为 0（全站扫描）', () => {
    const 违规: string[] = []
    for (const 文件 of 收编文件) {
      const 样式 = 取样式(文件)
      const 规则们 = 提规则(样式)
      const 滚动规则们 = 规则们.filter((r) => 是滚动容器(r.体))
      const 有Sticky = 规则们.some((r) => 是Sticky(r.体))
      if (!滚动规则们.length || !有Sticky) continue
      for (const { 选择器, 体 } of 滚动规则们) {
        const 主体 = 取主体(选择器.split(',')[0])
        if (是Sticky(体)) continue
        const 对们 = 扫间距声明文本(体).filter((d) => /^padding(-[a-z]+)*$/.test(d.属性))
        if (!对们.length) continue
        const 上 = 有效盒边(对们, 'padding', 'top')
        if (求几何算式(上, 块们) !== 0) {
          违规.push(`${文件} → ${选择器.slice(0, 50)}: padding-top=${上}（滚动容器含 sticky 后代须恒 0）`)
        }
      }
    }
    expect(违规, `滚动容器 padding-top 非 0：\n${违规.join('\n')}`).toEqual([])
  })

  it('门禁自证：注入滚动容器 padding-top 必须判红', () => {
    const 体 = 'overflow-y: auto; padding-top: 16px;'
    expect(是滚动容器(体)).toBe(true)
    const 对们 = 扫间距声明文本(`.x { ${体} }`).filter((d) => /^padding(-[a-z]+)*$/.test(d.属性))
    const 上 = 有效盒边(对们, 'padding', 'top')
    expect(求几何算式(上, 块们), '注入的 padding-top 必须被读到').toBe(16)
  })
})

describe('FP-K1c批3 间距族自定义属性专项规则', () => {
  const 间距自定义属性名 = /--(?:[a-zA-Z0-9-]*(?:jiange|gap|margin|padding|jian-?ju|jian-?xi|nei-?dian|nei-?bian)[a-zA-Z0-9-]*)/i

  it('vue 文件内间距族自定义属性不得含裸长度（几何常量须住 variables.css）', () => {
    const 违规: string[] = []
    for (const 文件 of 收编文件) {
      const 样式 = 取样式(文件)
      for (const 声明 of 样式.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;{}]+)/g)) {
        const 名 = 声明[1]
        const 值 = 声明[2].trim()
        if (!间距自定义属性名.test(名)) continue
        const 裸 = 裸长度(值)
        if (裸) 违规.push(`${文件} → ${名}: ${值}（裸 ${裸}）`)
      }
    }
    expect(违规, `间距族自定义属性含裸长度：\n${违规.join('\n')}`).toEqual([])
  })

  it('门禁自证：间距自定义属性含裸 px 必须判红，var()/calc 写法放行', () => {
    expect(间距自定义属性名.test('--foo-gap')).toBe(true)
    expect(间距自定义属性名.test('--ziduan-jian-ju')).toBe(true)
    expect(间距自定义属性名.test('--shuru-kuang-shang-xia-neidian')).toBe(true)
    expect(间距自定义属性名.test('--jiange-xiao')).toBe(true)
    expect(间距自定义属性名.test('--zhanji-yi-dong-zuo-kuan')).toBe(false)
    expect(间距自定义属性名.test('--yuanJiao')).toBe(false)
    expect(裸长度('8px'), '裸 8px 应判红').not.toBeNull()
    expect(裸长度('var(--jiange-xiao)'), 'var() 引用应放行').toBeNull()
    expect(裸长度('calc(var(--jiange-da) + var(--jiange-xiao))'), 'calc 组合应放行').toBeNull()
    expect(裸长度('0'), '零值应放行').toBeNull()
  })

  it('间距族自定义属性专项：scroll-margin/scroll-padding 纳入间距族', () => {
    for (const 属性 of ['scroll-margin', 'scroll-margin-top', 'scroll-padding', 'scroll-padding-bottom']) {
      expect(间距属性.test(属性), `${属性} 应属间距属性`).toBe(true)
    }
    expect(gap属性.test('scroll-margin-top'), 'scroll-margin-top 不应属 gap 单值族').toBe(false)
    for (const 属性 of ['scroll-margin-top', 'scroll-padding-bottom']) {
      const 命中 = 扫间距声明文本(`.x { ${属性}: 76px; }`)
      expect(命中.length, `${属性} 未被识别为间距属性`).toBe(1)
      expect(裸长度(命中[0].值), `${属性} 裸 76px 漏网`).not.toBeNull()
    }
  })
})
