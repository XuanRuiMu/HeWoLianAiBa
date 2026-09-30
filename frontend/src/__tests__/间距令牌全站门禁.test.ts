import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { 声明块清单, 声明位置, 按档解析全部, 求几何算式 } from './主题令牌真源'

// FP-K1b批1：间距令牌补齐五档（八档体系）+ 三文件间距收编 + "默认分类"框上下对称性。
//   三文件 = views/过往战绩.vue / components/战绩分类管理.vue / components/空态.vue（修正U：后二者口径准确化）。
//   修正U："空态.vue 为独立共享组件（类名 .kong-tai），由 views/好友聊天.vue、views/好友列表.vue 消费，
//   非战绩页消费"——战绩页的空态用其**自己的内联** `.kong-zhuangtai`（模板 :50-53），与 空态.vue 无关；
//   本门禁仍按令牌化口径扫描三文件全部间距声明，扫面范围不变。
// 根因见 .agents/evidence/traces/FP-K1a-间距审计-20260929.md §2：滚动容器零上内边距 + 下侧三层间距叠加。
// 第 2 轮三轴审查修正见 .agents/evidence/traces/FP-K1b批1-验证-20260929-2.md：
//   修正2 = 门禁三类漏网（同行声明 / 含 var() 即整条豁免 / 多值混写）→ 改为"剥 var()/env() 后查残留长度字面量"；
//   修正3 = 对称性断言只看第一条声明 → 改为按 @media 切上下文逐口径断言；
//   修正4 = 五枚新令牌改 px 数值命名，消除"zhong-xiao / xiao-zhong 互为倒序"的误用陷阱。
// 第 3 轮三轴复审修正见 .agents/evidence/traces/FP-K1b批1-验证-20260929-3.md：
//   修正A = 选择器子串 includes 假绿 → 精确比较；修正B = 剥 var()/env() 吞掉 fallback 裸 px → 保留 fallback 参与匹配；
//   修正C = 单位大小写/冷门单位漏网 + 0px 误判 → 补单位、加 i、零值长度放行；
//   修正D = 盒边解析对逻辑属性失明 → 补 padding-block-start 等；修正E = "margin 不塌陷"不变量显式钉住；
//   修正F = 只扫首个 <style> 块 → 拼接全部块；修正G = 注释交叉引用精确化；修正H = 删旧不合格截图。
// 第 4 轮三轴复审修正见 .agents/evidence/traces/FP-K1b批1-验证-20260929-4.md：
//   修正I = 整串全等漏掉后代/复合选择器 → 改按**主体选择器(subject)**匹配（排除伪元素与祖先位置）；
//   修正J = gap 的 grid 别名未覆盖 → 纳入 grid-gap/grid-row-gap/grid-column-gap；
//   修正K = 上下文只切 @media → 纳入 @supports/@container/@layer；修正L = 能力边界登记（见下）。
//
// ─────────────────────────── 门禁能力边界（已知抓不到，诚实登记） ───────────────────────────
// 本门禁只做**静态源码**检查（正则 + 括号配对 + 模板类集合解析），以下写法它抓不到，**不修**或需人工复核：
//   1. [FP-K1c批3 已收口] 间距值藏在组件局部自定义属性里：`--foo-gap: 8px; gap: var(--foo-gap);`
//      —— 新增「间距族自定义属性专项规则」：vue 文件内间距语义名自定义属性（含 jiange/gap/margin/padding/
//      jianju/jianxi/neidian/neibian）含裸长度即红。合法几何常量（如 `--zhanji-yi-dong-zuo-kuan: 74px`）
//      不在间距语义名内，仍放行。注意 variables.css 是令牌真源，不套用本规则。
//   2. 值经 `calc()`/`min()`/`max()`/`clamp()` 内的**非 var 数字**：如 `gap: calc(1rem + 2px)`——
//      会被判红（残留长度），但 `gap: calc(100% / 8)`（无长度单位）不判红；本门禁只认长度单位字面量。
//      已覆盖单位（修正P）：px/rem/em/pt/cm/mm/in/pc/q + ch/ex/lh/rlh/vi/vb/vmin/vmax/svh/lvh/dvh
//      + cqw/cqh/cqi/cqb/cqmin/cqmax；**无单位**的纯数字相对算式（如 `calc(100% / 8)`）仍不在管辖内。
//   3. 通过 JS/内联样式（`el.style.paddingTop = '8px'`）或 `<style>` 之外注入的间距：静态门禁完全看不到。
//   4. 简写与逻辑属性并存时的**层叠优先级**只按源码顺序近似（`padding` 后跟 `padding-block-start` 视为后者覆盖），
//      未实现完整 CSS 层叠（特异性/来源/层叠层）；对"同文件同选择器顺序书写"的项目惯例足够。
//   5. 主体选择器匹配**基于模板真实类集合**（修正M）：解析 .vue 模板取承载目标类元素的完整类集合
//      （静态 class="…" 全部类 + :class 对象字面量的静态键）与标签名；主体类集合 ⊆ 元素类集合、标签
//      （若主体带）相等、且无伪元素才算命中。**残留**：`:is()/:where()/:has()` 内的目标、`&` 嵌套语法、
//      属性选择器内的类名、`:class` 的**动态值**（如 `:class="某函数()"` 返回的类名）、`*` 通配与
//      `:deep()`、以及模板中无法静态解析的类（组件外部传入）均不展开。若目标类在模板中找不到，
//      测试**显式抛错**（不静默退回近似），需人工核对。
//   6. 本轮已收口（不再是边界）：旧式单冒号厂商伪元素（修正N）、`@layer …;` 语句式（修正Q）、
//      属性前缀别名 `-webkit-margin-before` 等（修正P）、目标类非首位/元素前缀/共同类（修正M）。
//   7. [FP-K1c批3 已升级] 本门禁覆盖**全站 .vue**（递归列出 src 下全部 .vue 文件，排除 __tests__）。
//      通用裸px扫描、滚动容器 padding-top 恒 0、间距族自定义属性专项均全站生效。
//      战绩页链路专属断言（对称性、flex 父级）仍只套用 过往战绩.vue / 战绩分类管理.vue / 空态.vue。
//      其中 空态.vue 为独立共享组件（类名 .kong-tai），由 views/好友聊天.vue、views/好友列表.vue 消费，
//      非战绩页消费——战绩页空态是它自己的内联 `.kong-zhuangtai`。
//   8. 对称断言的**读面是手工枚举**（第6轮 BlindSpot 复核登记，当前未触发）：现读 5 处 —— 父级
//      `.zhanji-yemian` 的 padding-top、容器 `.zhanji-liebiao` 的 margin-top/padding-top、
//      `.fenlei-biao-qian-lan` 的 padding-bottom、容器 gap、`.kong-zhuangtai` 的 margin-top。
//      **未读**：容器首个子项 `.fenlei-guan-li-lan`（战绩分类管理.vue:154-161，在扫面内）的
//      margin-top/padding-top，以及 `.fenlei-biao-qian-lan` 自身的 margin-top —— 若日后给它们加间距，
//      视觉对称会被破坏而断言仍绿（二者现均未声明间距，故未触发）。更上层祖先（如 `认证布局.vue` 的
//      `.yemian-buju`，不在扫面内）带 padding-top 同理，属**理论边界**（该处现为 `padding:0`）。
//      收口方向：读面改为按 DOM 父子链自动推导，或在 FP-K1c 全站门禁统一评估。
//      [FP-K1c批3 已收口] 本文件已改名为「间距令牌全站门禁.test.ts」，旧口径「点名链路收编」已去除。

const 块们 = 声明块清单()
const 浅色解析 = 按档解析全部('light', 块们)
const 深色解析 = 按档解析全部('dark', 块们)

/** 八档间距体系（大→小）。既有三枚锚保持语义名（已被其他文件消费），本轮五枚新令牌用 px 数值命名。 */
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

/** 递归列出 src 下全部 .vue 文件（相对路径，正斜杠） */
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

/** FP-K1c批3：全站 .vue 均纳入通用裸px扫描（含滚动容器断言与自定义属性专项） */
const 收编文件 = 列出全部Vue()

/** FP-K1b批1 战绩页链路三文件——四组专属断言（对称性/滚动容器/flex父级）仍只套用它们 */
const 战绩链路文件 = [
  'views/过往战绩.vue',
  'components/战绩分类管理.vue',
  'components/空态.vue',
]

function 读(相对: string): string {
  return readFileSync(resolve(源码根, 相对), 'utf8')
}

/** 取 .vue 的**全部** <style> 块内容并拼接、剥掉 CSS 注释（修正F：只取首块会静默漏掉后续块） */
function 取样式(相对: string): string {
  const 源 = 读(相对)
  const 块们 = [...源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
  if (!块们.length) throw new Error(`${相对} 缺少 <style> 块`)
  return 块们.join('\n').replace(/\/\*[\s\S]*?\*\//g, '')
}

// ─────────────────────────── 静态门禁（修正2 / 修正B / 修正C） ───────────────────────────

/** 间距属性族名（单一真源）：margin/padding 族 + gap 单值族（含历史别名 grid-*，浏览器仍支持）
 *  修正J：纳入 gap 的 grid 别名；修正P：纳入旧式前缀别名（-webkit-margin-before 等）。
 *  FP-K1c批3：纳入 scroll-margin / scroll-padding 族（锚点滚动偏移也是间距量纲）。 */
const 间距族名 = [
  'margin', 'padding', 'gap', 'row-gap', 'column-gap', 'grid-gap', 'grid-row-gap', 'grid-column-gap',
  'scroll-margin', 'scroll-padding',
]
/** gap 单值族：从 间距族名 派生（修正O：对称断言与裸px门禁同源，堵 grid-gap 假绿） */
const gap族名 = 间距族名.filter((名) => 名 !== 'margin' && 名 !== 'padding' && 名 !== 'scroll-margin' && 名 !== 'scroll-padding')
const 间距属性 = new RegExp(`^(?:-(?:webkit|moz|ms|o)-)?(?:${间距族名.join('|')})(?:-[a-z]+)*$`)
const gap属性 = new RegExp(`^(?:${gap族名.join('|')})$`)

/** 长度字面量：大小写不敏感。修正C 补 pt/cm/mm/in/pc/q；修正P 补 ch/ex/lh/rlh/vi/vb/vmin/vmax/svh/lvh/dvh/cqw/cqh/cqi/cqb/cqmin/cqmax */
const 长度字面量 =
  /\d+(?:\.\d+)?(?:px|rem|em|pt|cm|mm|in|pc|q|ch|ex|lh|rlh|vi|vb|vmin|vmax|svh|lvh|dvh|cqw|cqh|cqi|cqb|cqmin|cqmax)\b/gi

/**
 * 剥离 var(...)/env(...) 片段，但**保留 fallback 文本**参与后续匹配（修正B）。
 * `var(--x, 16px)` → 返回 ` 16px`；`calc(var(--a, 24px) + var(--b))` → 返回 `calc( 24px + )`。
 * 仅无 fallback 的 var/env 才整段删除。fallback 内若再嵌 var/env 则递归处理。
 */
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
      // 取第一个顶层逗号之后的 fallback 段（顶层 = 括号深度 0）
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

/** 剥离 var()/env() 后仍残留的**非零**长度字面量——命中即裸硬编码（修正B/C：fallback 也查、0px 等价 0 放行） */
function 裸长度(值: string): string | null {
  const 残 = 剥函数片段(值)
  for (const 命中 of 残.matchAll(长度字面量)) {
    if (parseFloat(命中[0]) !== 0) return 命中[0]
  }
  return null
}

/** 扫一段 CSS 文本里的全部间距声明（不依赖行首；选择器与声明同行也能命中） */
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

// ─────────────────────────── 多口径盒模型解析（修正3） ───────────────────────────

type 声明对 = { 属性: string; 值: string }
const 边序 = ['top', 'right', 'bottom', 'left'] as const
type 边 = (typeof 边序)[number]

/** 按顶层条件分组（@media/@supports/@container/@layer）把样式块切成上下文：'base' 在前，其余为各分组头
 *  修正K：早期只识别 @media；改后上下文归属更正确（检测能力与旧实现等价，见证据-4 修正K）。 */
function 切上下文(样式: string): Array<{ 标签: string; 文本: string }> {
  const 上下文: Array<{ 标签: string; 文本: string }> = []
  let 基础 = ''
  let i = 0
  while (i < 样式.length) {
    // 修正Q：`[^{};]*` 排除 `@layer base;` 这类语句式（分号结尾、无块），否则会被误当上下文头
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

/** 取选择器主体（subject）= 按顶层组合子（空格 / > / + / ~）切分后的最后一段 */
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

/** 伪元素检测：双冒号，或旧式单冒号伪元素（含厂商前缀伪元素；伪元素不影响元素自身盒模型）
 *  修正N：`.zhanji-liebiao:-webkit-scrollbar` 这类单冒号厂商伪元素此前被判为非伪元素 → 误红。 */
function 含伪元素(选择器: string): boolean {
  return (
    /::/.test(选择器) ||
    /:(?:before|after|first-line|first-letter)\b/i.test(选择器) ||
    /:(?:-webkit-|-moz-|-ms-)\w+/i.test(选择器)
  )
}

// ─────────────────────────── 模板类集合解析（修正M） ───────────────────────────

type 模板元素 = { 标签: string; 类集合: Set<string> }

/** 顶层切分（尊重括号/引号嵌套）：修正M 解析 :class 对象字面量用 */
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

/** 首个顶层冒号位置（尊重括号/引号嵌套） */
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

/** 从 :class 对象字面量中取静态键（`{ 'a-b': cond, c: cond }` → ['a-b', 'c']）；非对象字面量返回 [] */
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

/** 从一段标签属性串取完整类集合：静态 class="…" 全部类 + :class 绑定里的静态键 */
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

/** 解析 .vue 的 <template>，返回全部带 class 的元素（标签 + 完整类集合）。
 *  逐标签扫描并跳过引号内的 `>`（模板存在 `v-if="… length > 0"` 这类含 `>` 的属性值）。 */
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
/** 承载目标类（形如 `.kong-zhuangtai`）的模板元素：跨战绩链路三文件解析（对称性/滚动容器等专属断言用）。
 *  修正M 要求：解析不出必须**显式抛错**，不得静默退回旧的 startsWith 近似。 */
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

/** 拆主体复合选择器：前导标签（若有）+ 全部 `.类` 记号 */
function 拆主体(主体: string): { 标签: string; 类集合: Set<string> } {
  const 标签 = /^([A-Za-z][\w-]*)/.exec(主体)?.[1] ?? ''
  const 类集合 = new Set<string>()
  for (const 匹 of 主体.matchAll(/\.([A-Za-z_][\w-]*)/g)) 类集合.add(匹[1])
  return { 标签, 类集合 }
}

/** 主体是否作用于目标元素（修正M：按模板真实类集合判定）。
 *  命中当且仅当：主体类集合 ⊆ 某承载目标类的元素类集合、标签（若主体带）相等、且主体无伪元素。
 *  这同时排除：异名类（`.fenlei-kong-zhuangtai`）、子串类（`.zhanji-liebiao-neirong`）、
 *  目标仅在祖先位置（`.zhanji-liebiao .zhanji-kapian`，取主体后类集合不含目标）、伪元素。
 *  修正I 保留的后代/复合命中（`:root[data-theme='light'] .kong-zhuangtai`、`div.kong-zhuangtai`）依旧成立。 */
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

/** 收集某上下文内、**主体选择器**命中目标、且属性名命中该族的声明（源码顺序） */
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

/** 逻辑属性双值分量：`padding-block: A B` → start=A / end=B（单值则两端同值） */
function 逻辑分量(值: string, 端: 'start' | 'end'): string {
  const 部 = 值.trim().split(/\s+/)
  return 部.length === 1 ? 部[0] : 端 === 'start' ? 部[0] : 部[1]
}

/** 在给定声明序列下求某条盒边的有效值（简写/长属性/逻辑属性按源码顺序覆盖；无声明视为 0）
 *  修正D：补逻辑属性（`padding-block-start` 等），否则 `padding-block-start:16px` 会让
 *  "滚动容器 padding-top 恒 0" 断言仍绿，而真实 padding-top=16px、sticky 穿透带复发。 */
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

/** 盒边在两种口径下的像素值：base=基础规则；全并=基础 + 各条件 at-rule（@media/@supports/@container/@layer）依序覆盖（悲观，任一覆盖都会体现） */
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

/** 单值属性（gap 单值族，含历史别名 grid-*）在两种口径下的像素值 */
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

// ─────────────────────────── 用例 ───────────────────────────

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
      const 全文件出现次数 = [...读('styles/variables.css').matchAll(new RegExp(`${令牌}\\s*:`, 'g'))]
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
    // 反面：纯令牌算式与白名单写法不得误判
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
    // 修正A 核心：`.zhanji-liebiao` 不得被 `.zhanji-liebiao-neirong` 子串污染
    const 文本 = '.zhanji-liebiao { gap: 12px; } .zhanji-liebiao-neirong { gap: 99px; }'
    const 命中 = 收集声明对(文本, '.zhanji-liebiao', /^gap$/)
    expect(命中.length, '子串匹配会同时命中 .zhanji-liebiao-neirong（假绿）').toBe(1)
    expect(命中[0].值).toBe('12px')

    // 修正I：主体 = 目标 + 追加成分（复合/伪类）→ 必须命中（声明真实作用于该元素）
    expect(收集声明对('.zhanji-liebiao.tuo-zhuai-zhong { gap: 5px; }', '.zhanji-liebiao', /^gap$/)).toHaveLength(1)
    expect(收集声明对('.zhanji-liebiao:hover { gap: 5px; }', '.zhanji-liebiao', /^gap$/)).toHaveLength(1)
    // 修正I：后代选择器主体命中（`:root[data-theme='light'] .kong-zhuangtai` 的主体就是 .kong-zhuangtai）
    expect(收集声明对(":root[data-theme='light'] .kong-zhuangtai { padding-top: 8px; }", '.kong-zhuangtai', /^padding(-[a-z]+)*$/)).toHaveLength(1)

    // 修正I：伪元素（不影响元素自身盒模型）与"目标只在祖先位置"必须排除
    expect(收集声明对('.zhanji-liebiao::-webkit-scrollbar-track { padding-top: 8px; }', '.zhanji-liebiao', /^padding(-[a-z]+)*$/)).toEqual([])
    expect(收集声明对('.zhanji-liebiao::before { padding-top: 8px; }', '.zhanji-liebiao', /^padding(-[a-z]+)*$/)).toEqual([])
    expect(收集声明对('.zhanji-liebiao .zhanji-kapian { padding-top: 8px; }', '.zhanji-liebiao', /^padding(-[a-z]+)*$/)).toEqual([])
    // 修正I：异名类不得被当作目标（.fenlei-kong-zhuangtai ≠ .kong-zhuangtai）
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
    // 终审反例（改前 startsWith 漏收，实测 0 条）
    expect(收集声明对('div.kong-zhuangtai { margin-top: 16px; }', '.kong-zhuangtai', 边族), '元素前缀 div.').toHaveLength(1)
    expect(收集声明对('.jiaZai-cuoWu-zhuangtai { margin-top: 16px; }', '.kong-zhuangtai', 边族), '共同类（非首位）').toHaveLength(1)
    expect(收集声明对('main.zhanji-liebiao { margin-top: 0; }', '.zhanji-liebiao', 边族), '元素前缀 main.').toHaveLength(1)
    // 目标在前（复合）仍命中
    expect(收集声明对('.kong-zhuangtai.jiaZai-cuoWu-zhuangtai { margin-top: 16px; }', '.kong-zhuangtai', 边族)).toHaveLength(1)
    // 反向：异名/子串/祖先位置/伪元素仍排除
    expect(收集声明对('.zhanji-liebiao-neirong { gap: 99px; }', '.zhanji-liebiao', /^gap$/)).toEqual([])
    expect(收集声明对('.fenlei-kong-zhuangtai { padding-top: 8px; }', '.kong-zhuangtai', /^padding(-[a-z]+)*$/)).toEqual([])
    expect(收集声明对('.zhanji-liebiao .zhanji-kapian { padding-top: 8px; }', '.zhanji-liebiao', /^padding(-[a-z]+)*$/)).toEqual([])
    expect(收集声明对('.zhanji-liebiao::-webkit-scrollbar-track { padding-top: 8px; }', '.zhanji-liebiao', /^padding(-[a-z]+)*$/)).toEqual([])
    // 显式失败：无法从模板解析的目标类必须抛错（不得静默退回近似）
    expect(() => 收集声明对('.x { margin-top: 8px; }', '.bu-cun-zai-de-lei', 边族)).toThrow()
  })

  it('门禁自证·修正N：旧式单冒号厂商伪元素必须排除（不误红 padding-top 恒 0 断言）', () => {
    expect(含伪元素('.zhanji-liebiao:-webkit-scrollbar')).toBe(true)
    expect(含伪元素('.zhanji-liebiao:-moz-focus-inner')).toBe(true)
    expect(含伪元素('.zhanji-liebiao:-ms-input-placeholder')).toBe(true)
    expect(含伪元素('.zhanji-liebiao::before')).toBe(true)
    // 伪类不是伪元素，仍须参与命中
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
    // 断言级反例：@media 内 grid-gap 覆盖必须被对称断言读到（否则下间距仍算 16 → 假绿）
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
    // 该 padding-top 属无条件规则，须归入 base（否则 base 口径读 0 → 假红）
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
    // 合法状态：父级未声明 padding-top → 0；上间距 = 0(父) + 16(容器 margin-top) + 0(容器 padding-top) = 16
    const 合法父级 = 盒边口径(战绩, '.zhanji-yemian', 'padding', 'top')
    expect(合法父级.base, '[base] 父级 .zhanji-yemian 的 padding-top 应为 0').toBe(0)
    expect(合法父级.全并, '[全并] 父级 .zhanji-yemian 的 padding-top 应为 0').toBe(0)

    // 反例（终审浏览器实证：注入后视觉上=32、视觉下=16，旧读面不含父级 → 仍读 16 → 假绿）
    const 注入 = 收集声明对('.zhanji-yemian { padding-top: 16px; }', '.zhanji-yemian', /^padding(-[a-z]+)*$/)
    const 注入父级上 = 求几何算式(有效盒边(注入, 'padding', 'top'), 块们)
    const 容器上边距 = 盒边口径(战绩, '.zhanji-liebiao', 'margin', 'top').base
    const 容器上内边距 = 盒边口径(战绩, '.zhanji-liebiao', 'padding', 'top').base
    const 注入后上 = 注入父级上 + 容器上边距 + 容器上内边距
    const 改前上 = 容器上边距 + 容器上内边距 // 旧读面：只算容器 margin-top + 容器 padding-top，不含父级
    expect(改前上, '旧读面（不含父级 padding-top）读到的上间距仍为 16 → 假绿').toBe(16)
    expect(注入父级上, '注入的父级 padding-top 必须被读到（旧读面读不到）').toBe(16)
    expect(注入后上, '注入父级 padding-top 后上间距必须 ≠ 16（否则假绿）').not.toBe(16)
    expect(注入后上, '注入后上间距应为 32').toBe(32)
  })

  it('"默认分类"框上下间距对称：基础口径与媒体覆盖口径下 上 == 下 == 16px', () => {
    const 战绩 = 'views/过往战绩.vue'
    const 分类 = 'components/战绩分类管理.vue'
    // 修正T：上间距的"视觉量" = 父级 .zhanji-yemian 的 padding-top + 容器 .zhanji-liebiao 的 margin-top
    // （+ 容器自身 padding-top，须恒 0）。父级 padding-top 若不纳入读面，注入 `.zhanji-yemian{padding-top:16px}`
    // 会让视觉上间距变 32 而门禁仍读 16 → 假绿（终审浏览器实证）。
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
    // 上间距由 `.zhanji-liebiao` 的 margin-top 承担，其成立依赖直接父级是 flex 列容器
    // （flex 项 margin 不塌陷）。若父级改 display:block，margin 会塌陷逃出、上间距失效，
    // 而所有静态断言仍绿——故把该不变量从隐性变显性，显式钉住。
    const 战绩 = 'views/过往战绩.vue'
    const 父级 = 收集声明对(取样式(战绩), '.zhanji-yemian', /^display$|^flex-direction$/)
    const 取 = (属性: string): string => 父级.find((对) => 对.属性 === 属性)?.值 ?? ''
    expect(取('display'), '`.zhanji-yemian` 必须是 flex 容器（否则子项 margin 塌陷）').toBe('flex')
    expect(取('flex-direction'), '`.zhanji-yemian` 必须是列方向').toBe('column')
  })
})

// ─────────────────────────── FP-K1c批3 全站推广新断言 ───────────────────────────

describe('FP-K1c批3 补充间距档', () => {
  /** 八档体系之外的补充档（非节奏值，不能由八档正系数 +/* 组合） */
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
  /** 从 CSS 文本中提取所有规则的 {选择器, 声明体} */
  function 提规则(文本: string): Array<{ 选择器: string; 体: string }> {
    const 出: Array<{ 选择器: string; 体: string }> = []
    for (const 规则 of 文本.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      出.push({ 选择器: 规则[1].trim(), 体: 规则[2] })
    }
    return 出
  }

  /** 某规则是否是滚动容器（overflow: auto/scroll 或 overflow-x/y: auto/scroll） */
  function 是滚动容器(体: string): boolean {
    for (const 声明 of 体.matchAll(/(?:^|;)\s*(overflow(?:-x|-y)?)\s*:\s*([^;]+)/g)) {
      if (/auto|scroll/i.test(声明[2])) return true
    }
    return false
  }

  /** 某规则是否声明 position: sticky */
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
        // 排除 sticky 元素自身（如 .biao-qian-lan 自己是 sticky，不是含 sticky 后代的滚动容器）
        const 主体 = 取主体(选择器.split(',')[0])
        if (是Sticky(体)) continue
        // 只检查滚动容器自身声明了 padding 的情况
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
  /** 含间距语义的自定义属性名模式（jiange/gap/margin/padding/jian-ju/jian-xi/nei-dian/nei-bian 及无连字符变体） */
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
    // 值判定
    expect(裸长度('8px'), '裸 8px 应判红').not.toBeNull()
    expect(裸长度('var(--jiange-xiao)'), 'var() 引用应放行').toBeNull()
    expect(裸长度('calc(var(--jiange-da) + var(--jiange-xiao))'), 'calc 组合应放行').toBeNull()
    expect(裸长度('0'), '零值应放行').toBeNull()
  })

  it('间距族自定义属性专项：scroll-margin/scroll-padding 纳入间距族', () => {
    for (const 属性 of ['scroll-margin', 'scroll-margin-top', 'scroll-padding', 'scroll-padding-bottom']) {
      expect(间距属性.test(属性), `${属性} 应属间距属性`).toBe(true)
    }
    // scroll-margin 不属 gap 单值族
    expect(gap属性.test('scroll-margin-top'), 'scroll-margin-top 不应属 gap 单值族').toBe(false)
    // 裸 px 判红
    for (const 属性 of ['scroll-margin-top', 'scroll-padding-bottom']) {
      const 命中 = 扫间距声明文本(`.x { ${属性}: 76px; }`)
      expect(命中.length, `${属性} 未被识别为间距属性`).toBe(1)
      expect(裸长度(命中[0].值), `${属性} 裸 76px 漏网`).not.toBeNull()
    }
  })
})
