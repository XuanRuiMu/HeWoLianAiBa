import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { 声明块清单, 按档解析全部, 解析几何数值 } from './主题令牌真源'

// FP-22e 焦点环单一真源收口：全库本地 outline 环声明只准吃 --jujiao-huan-* 一族令牌。
// 审计 B5/S1 的事实前提：FP-01 把 global.css 改成 :where(:focus-visible)(0,0,0) + 文本控件档 (0,1,0)
// 之后，仍有 14 条 (0,2,0) 本地 outline 以无关源码序的方式压掉它，并把 --yeLv / --taoTu / #ffd500 /
// #ff2d95 三套并行环色留在页面上；其中 3 条 `:focus{outline:none}` 直接让输入框丢掉焦点反馈。
// 本文件是「收口 + 不许复发」的机器证据：声明文法、逐点档别、解析值、两档可分辨。
//
// FP-24a 扩面（第二波独立审计 ④）：扫描面从「账号与安全 + 过往战绩」两个视图扩到**全部视图**，
// 并把 `box-shadow` 的**描边环层**（零偏移 + 零模糊 + 非零扩散，即 ring 写法）纳入同一口径 ——
// 只扫 outline 会放过 `过往战绩.vue` 选中卡那类"用阴影画的环"（FP-22g 前为 `inset 0 0 0 2px #ff2d95`）。

const 视图目录 = resolve(__dirname, '../views')
const 视图清单 = readdirSync(视图目录)
  .filter((名) => 名.endsWith('.vue'))
  .sort()
const 视图源码: Record<string, string> = Object.fromEntries(
  视图清单.map((名) => [名, readFileSync(resolve(视图目录, 名), 'utf8')]),
)

const 账号源码 = 视图源码['账号与安全.vue']
const 战绩源码 = 视图源码['过往战绩.vue']

const 块们 = 声明块清单()
const 两档解析: Record<'light' | 'dark', Map<string, string>> = {
  light: 按档解析全部('light', 块们),
  dark: 按档解析全部('dark', 块们),
}

const 环 = {
  标准: 'var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse)',
  文本: 'var(--jujiao-huan-kuan-du-wenben) solid var(--jujiao-huan-yanse)',
  虚线: 'var(--jujiao-huan-kuan-du) dashed var(--jujiao-huan-yanse)',
} as const
const 偏移: Record<keyof typeof 环, string> = {
  标准: 'var(--jujiao-huan-pian-yi)',
  文本: 'var(--jujiao-huan-pian-yi-wenben)',
  虚线: 'var(--jujiao-huan-pian-yi)',
}

/** 非嵌套 CSS 的 (选择器串, 声明表) 清单；@media 头因内含 `{` 自然不成块，其内层规则各自成块 */
function 规则清单(源: string) {
  const 净源 = 源.replace(/\/\*[\s\S]*?\*\//g, '')
  return [...净源.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((匹配) => ({
    选择器: 匹配[1].replace(/\s+/g, ' ').trim(),
    声明: new Map<string, string>(
      [...匹配[2].matchAll(/([a-z-]+)\s*:\s*([^;]+);/g)].map((条) => [
        条[1],
        条[2].replace(/\s+/g, ' ').trim(),
      ]),
    ),
  }))
}

/** 旧用例仍按两个视图点名，新用例按文件名点名（同一份 视图源码，不再各存一份路径） */
const 视图别名: Record<'账号' | '战绩', string> = {
  账号: '账号与安全.vue',
  战绩: '过往战绩.vue',
}

function 含该选择器的规则(文件: '账号' | '战绩', 选择器: string) {
  return 规则清单(视图源码[视图别名[文件]]).filter((块) =>
    块.选择器
      .split(',')
      .map((部) => 部.trim())
      .includes(选择器),
  )
}

/** 一个源码里所有 outline 系声明（含 @media 内的长写法） */
function 环声明清单of源(源: string) {
  const 净源 = 源.replace(/\/\*[\s\S]*?\*\//g, '')
  return [
    ...净源.matchAll(/\b(outline(?:-width|-color|-style|-offset)?)\s*:\s*([^;]+);/g),
  ].map((匹配) => ({ 属性: 匹配[1], 值: 匹配[2].replace(/\s+/g, ' ').trim() }))
}

/** 全库这两个视图里每一条 outline 系声明（含 @media 内的长写法） */
function 环声明清单(文件: '账号' | '战绩') {
  return 环声明清单of源(视图源码[视图别名[文件]])
}

type RGB = [number, number, number]

function 解析色(值: string): { rgb: RGB; alpha: number } {
  const rgba = 值.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/)
  if (rgba) {
    return {
      rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])] as RGB,
      alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
    }
  }
  const hex = 值.match(/#([0-9a-fA-F]{6})/)
  if (hex) {
    const h = hex[1]
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

function 压合(前景: { rgb: RGB; alpha: number }, 底色: RGB): RGB {
  return [0, 1, 2].map((i) => 前景.rgb[i] * 前景.alpha + 底色[i] * (1 - 前景.alpha)) as RGB
}

function 线性(v: number): number {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function 相对亮度(色: RGB): number {
  return 0.2126 * 线性(色[0]) + 0.7152 * 线性(色[1]) + 0.0722 * 线性(色[2])
}

function 对比度(a: RGB, b: RGB): number {
  const l1 = 相对亮度(a)
  const l2 = 相对亮度(b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

describe('FP-22e 声明文法：本地 outline 环只剩令牌一种写法', () => {
  it('全部视图每一条 outline / outline-offset / outline-width 声明的取值全部来自 --jujiao-huan-* 族', () => {
    const 允许值 = new Set<string>([
      ...Object.values(环),
      偏移.标准,
      偏移.文本,
      'var(--jujiao-huan-kuan-du)',
      'var(--jujiao-huan-kuan-du-wenben)',
    ])
    for (const 文件 of 视图清单) {
      for (const 条 of 环声明清单of源(视图源码[文件])) {
        expect(
          允许值.has(条.值),
          `${文件} 视图残留非令牌环声明：${条.属性}: ${条.值}`,
        ).toBe(true)
      }
    }
  })

  it('全视图 outline:none 与四套并行环色（--yeLv/--taoTu/#ffd500/#ff2d95）在环声明中归零', () => {
    for (const 文件 of 视图清单) {
      for (const 条 of 环声明清单of源(视图源码[文件])) {
        expect(条.值, `${文件} 视图仍有撤环写法`).not.toMatch(/none|0/)
        expect(条.值, `${文件} 视图环声明仍混用并行环色`).not.toMatch(
          /#|--yeLv|--taoTu|\d+px/,
        )
      }
    }
  })

  it('收口点总数 = 14 条收口 + 1 条按控件类型拆档新增 + 1 条减动效长写法（少一条即有点跑掉）', () => {
    expect(环声明清单('账号').filter((条) => 条.属性 === 'outline')).toHaveLength(12)
    expect(环声明清单('账号').filter((条) => 条.属性 === 'outline-offset')).toHaveLength(12)
    expect(环声明清单('账号').filter((条) => 条.属性 === 'outline-width')).toHaveLength(1)
    expect(环声明清单('战绩').filter((条) => 条.属性 === 'outline')).toHaveLength(3)
    expect(环声明清单('战绩').filter((条) => 条.属性 === 'outline-offset')).toHaveLength(2)
  })

  it('--yeLv / --taoTu 作为非环属性（border/background/文字色）未被误删', () => {
    expect(账号源码).toMatch(/border-color:\s*var\(--yeLv\)/)
    expect(账号源码).toMatch(/border:\s*2\.5px solid var\(--taoTu\)/)
    expect(战绩源码).toMatch(/border-color:\s*#ffd500/)
  })
})

describe('FP-22e 逐点档别：文本控件吃窄环、非文本与高亮环吃标准环', () => {
  const 点清单: { 文件: '账号' | '战绩'; 选择器: string; 环: keyof typeof 环 }[] = [
    { 文件: '账号', 选择器: '.sou-suo-shuru:focus', 环: '文本' },
    { 文件: '账号', 选择器: '.biao-qian-lan button:focus-visible', 环: '标准' },
    { 文件: '账号', 选择器: '.zhi-wu-ka-pian.sou-zhong-gao-liang', 环: '标准' },
    { 文件: '账号', 选择器: '.she-zhi-shuru:focus', 环: '文本' },
    { 文件: '账号', 选择器: '.qianming-shuru:focus', 环: '文本' },
    { 文件: '账号', 选择器: ".kai-guan-hang input[type='checkbox']:focus-visible", 环: '标准' },
    { 文件: '账号', 选择器: '.beijing-xiangmu.beiXuanZhong', 环: '标准' },
    { 文件: '账号', 选择器: '.anniu-fu-zhu:focus-visible', 环: '标准' },
    { 文件: '账号', 选择器: '.sou-suo-shuru:focus-visible', 环: '文本' },
    { 文件: '账号', 选择器: ".kai-guan-rongqi input[type='checkbox']:focus-visible", 环: '标准' },
    { 文件: '账号', 选择器: '.zhang-hao-an-quan .qianming-shuru:focus-visible', 环: '文本' },
    { 文件: '账号', 选择器: '.zhang-hao-an-quan .mao-dian:target', 环: '标准' },
    { 文件: '战绩', 选择器: '.gouxuan-anniu:focus-visible', 环: '标准' },
    { 文件: '战绩', 选择器: '.caozuo-anniu.fenxiang:focus-visible', 环: '标准' },
    { 文件: '战绩', 选择器: '.zhanji-kapian.sortable-ghost', 环: '虚线' },
  ]

  for (const 点 of 点清单) {
    it(`${点.文件}视图 ${点.选择器} → ${点.环}环`, () => {
      // 同选择器可能还有别的规则（浅色覆盖 / 减动效档），只审真正画环的那些
      const 有环 = 含该选择器的规则(点.文件, 点.选择器).filter((块) => 块.声明.has('outline'))
      expect(有环.length, `找不到画环的规则块：${点.选择器}`).toBeGreaterThan(0)
      for (const 块 of 有环) {
        expect(块.声明.get('outline'), `${点.选择器} 环形状不对`).toBe(环[点.环])
        // 落点空位（虚线）不写偏移：外层是纯定位槽，撑开会顶动兄弟卡片
        if (点.环 === '虚线') {
          expect(块.声明.has('outline-offset'), `${点.选择器} 不该有偏移声明`).toBe(false)
        } else {
          expect(块.声明.get('outline-offset'), `${点.选择器} 缺 outline-offset 声明`).toBe(
            偏移[点.环],
          )
        }
      }
    })
  }

  it('减动效档的 .mao-dian:target 只把环宽收窄，仍吃同一族令牌（不留 1px 字面量）', () => {
    const 命中 = 规则清单(账号源码).filter(
      (块) => 块.选择器 === '.zhang-hao-an-quan .mao-dian:target' && 块.声明.has('outline-width'),
    )
    expect(命中).toHaveLength(1)
    expect(命中[0].声明.get('outline-width')).toBe('var(--jujiao-huan-kuan-du-wenben)')
  })
})

describe('FP-22e 令牌解析值与两档可分辨', () => {
  it('环宽/偏移解析后为 2px+2px 与 1px+0px，两档取值一致且没有 0 宽环', () => {
    expect(解析几何数值('--jujiao-huan-kuan-du')).toBe(2)
    expect(解析几何数值('--jujiao-huan-pian-yi')).toBe(2)
    expect(解析几何数值('--jujiao-huan-kuan-du-wenben')).toBe(1)
    expect(解析几何数值('--jujiao-huan-pian-yi-wenben')).toBe(0)
    for (const 档 of ['light', 'dark'] as const) {
      const 表 = 两档解析[档]
      for (const 名 of ['--jujiao-huan-kuan-du', '--jujiao-huan-pian-yi']) {
        expect(表.get(名), `${名} 在 ${档} 档塌陷`).toBe('2px')
      }
    }
  })

  it('环色两档各自有定义且互异（同色即无档差，深浅两档不可能同时可分辨）', () => {
    const 浅 = 两档解析.light.get('--jujiao-huan-yanse')
    const 深 = 两档解析.dark.get('--jujiao-huan-yanse')
    expect(浅).toBeDefined()
    expect(深).toBeDefined()
    expect(浅).not.toBe(深)
  })

  // WCAG 2.2 SC 1.4.11 非文本对比 ≥3:1。面取自两个视图自己的卡面/底板（含浅色档覆盖），
  // 并逐条回源核对字面量仍在位——面一旦被改，本用例先红，不会留下过期的对比结论。
  const 可分辨样本: {
    档: 'light' | 'dark'
    面: string
    压在: string
    出处: string
    源码: string
  }[] = [
    {
      档: 'light',
      面: '#fffdf7',
      压在: '#fffdf7',
      出处: '账号与安全.vue .zhang-hao-an-quan 的 --kaPian',
      源码: 账号源码,
    },
    {
      档: 'light',
      面: '#f6f1e7',
      压在: '#f6f1e7',
      出处: '账号与安全.vue .zhang-hao-an-quan 的 --miZhi',
      源码: 账号源码,
    },
    {
      档: 'dark',
      面: '#2a251e',
      压在: '#2a251e',
      出处: "账号与安全.vue :global(:root[data-theme='dark']) .zhang-hao-an-quan 的 --kaPian",
      源码: 账号源码,
    },
    {
      档: 'dark',
      面: '#1e1b16',
      压在: '#1e1b16',
      出处: "账号与安全.vue :global(:root[data-theme='dark']) .zhang-hao-an-quan 的 --miZhi",
      源码: 账号源码,
    },
    {
      档: 'light',
      面: 'rgba(255, 255, 255, 0.92)',
      压在: '#f5f5f5',
      出处: "过往战绩.vue :root[data-theme='light'] .piliang-gongju-lan",
      源码: 战绩源码,
    },
    {
      档: 'light',
      面: '#fafaf7',
      压在: '#fafaf7',
      出处: "过往战绩.vue :root[data-theme='light'] .zhanji-kapian > .zhanji-kapian-nei 渐变终点",
      源码: 战绩源码,
    },
    {
      档: 'dark',
      面: 'rgba(30, 30, 40, 0.94)',
      压在: '#111111',
      出处: '过往战绩.vue .zhanji-kapian-nei 渐变起点',
      源码: 战绩源码,
    },
    {
      档: 'dark',
      面: 'rgba(27, 27, 36, 0.88)',
      压在: '#292929',
      出处: '过往战绩.vue .piliang-gongju-lan',
      源码: 战绩源码,
    },
  ]

  for (const 样本 of 可分辨样本) {
    it(`${样本.档} 档环色对 ${样本.出处} ≥3:1`, () => {
      expect(样本.源码, `${样本.出处} 的取值已改动，请重测对比`).toContain(样本.面)
      const 环色 = 解析色(两档解析[样本.档].get('--jujiao-huan-yanse') as string)
      const 面 = 压合(解析色(样本.面), 解析色(样本.压在).rgb)
      const 实际 = 对比度(环色.rgb, 面)
      expect(实际, `${样本.档} 档 ${样本.出处} 上环不可辨`).toBeGreaterThanOrEqual(3)
    })
  }
})

describe('FP-22e 单行高度首帧第 7 处字面量归零', () => {
  // FP-10c 契约演进（按落地事实改判，判据不降反升）：旧判据读的是 use输入框.ts 的 JS 源码，
  // 钉"未测量首帧不得带像素字面量、必须回落给令牌"。那条量高链连同文件已被真内联输入区删除
  // ——不存在"首帧未测量"这一刻，旧判据的对象整体作废，留着就是钉一个不存在的形态（空转测试）。
  // 本 FP 想守的那条性质（折叠档高度只有一个来源、零像素字面量）改由**真正决定盒高的地方**守：
  // ① JS 量高文件必须仍在"已删除"状态（复活即第二套量高真源）；
  // ② 组件里 .shuru-kuang 的 min-/max-height 两条必须各自是**单一 var() 令牌**；
  // ③ 这两条令牌解析出来必须等于 --shuru-danxing-gao-du 的 35；
  // ④ 组件样式体内不得再出现任何 height 像素字面量（旧判据只管首帧，现在管全部帧）。
  it('折叠档高度只剩 CSS 令牌一条来源，JS 量高链不得复活', () => {
    expect(
      existsSync(resolve(__dirname, '../composables/use输入框.ts')),
      'JS 量高 composable 又回来了 = 第 7 处字面量的宿主复活',
    ).toBe(false)
    const 组件源 = readFileSync(resolve(__dirname, '../components/聊天/图文输入区.vue'), 'utf8')
    const 样式段 = 组件源.slice(组件源.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')
    const 规则 = /(?:^|\})\s*\.shuru-kuang\s*\{([^}]*)\}/.exec(样式段)?.[1] ?? ''
    expect(规则, '找不到 .shuru-kuang 规则').not.toBe('')
    for (const 属性 of ['min-height', 'max-height']) {
      const 值 = new RegExp(`(?:^|;)\\s*${属性}\\s*:\\s*([^;]+)`).exec(规则)?.[1]?.trim() ?? ''
      expect(/^var\(\s*(--[a-z0-9-]+)\s*\)$/.exec(值)?.[1], `${属性} 不是单一 var() 令牌：${值}`).toBe(
        '--shuru-danxing-gao-du',
      )
    }
    expect(解析几何数值('--shuru-danxing-gao-du')).toBe(35)
    expect(样式段, '组件样式体内出现 height 像素字面量 = 第二处折叠高度').not.toMatch(
      /(?:min-|max-)?height\s*:\s*[\d.]+px/,
    )
  })
})

/**
 * FP-24a ④ 守门扩面（第二波独立审计 ④：只扫 outline 会放过"用阴影画的环"）。
 *
 * outline 侧：扫描面从 2 视图 → **全部视图**，且把声明点总数冻结成账本（多一条少一条都红）。
 * box-shadow 侧的**描边环口径**（这是判据，不是豁免清单）：一条 `box-shadow` 的某个层同时满足
 *  ①形状是环 —— `[inset] 0 0 0 <扩散≠0>`，即零偏移 + 零模糊 + 非零扩散，浏览器画出来就是一条描边；
 *  ②所在规则的选择器带**状态语义** —— 环表达的是「焦点 / 选中 / 落点 / 命中」这类状态。
 * 静态卡框（`登录内容.vue` 鎏金双线框、`管理员监控.vue` 面板 inset 描边）不是状态环：
 * 把它们改吃 --jujiao-huan-* 会毁掉美术方向，属口径误伤，故由 ② 排除而不是豁免登记。
 */
const 状态选择器模式 =
  /:(?:hover|active|focus(?:-visible|-within)?|target|checked)\b|\.(?:xuanZhong|beiXuanZhong)\b|sou-zhong|huo-?dong|sortable-(?:ghost|drag|chosen)/

const 环层模式 = /^(?:inset\s+)?0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+(\d*\.?\d+)(px|em|rem)\s+(.+)$/i

/** 只切顶层逗号：`rgba(255, 45, 149, 0.12)` 里的逗号不能把一个环层劈成两段 */
function 顶层逗号切分(值: string): string[] {
  const 层: string[] = []
  let 深度 = 0
  let 当前 = ''
  for (const 符 of 值) {
    if (符 === '(') 深度 += 1
    else if (符 === ')') 深度 -= 1
    if (符 === ',' && 深度 === 0) {
      if (当前.trim()) 层.push(当前.trim())
      当前 = ''
      continue
    }
    当前 += 符
  }
  if (当前.trim()) 层.push(当前.trim())
  return 层
}

interface 描边环层 {
  文件: string
  选择器: string
  层: string
  颜色: string
  状态环: boolean
  吃真源: boolean
}

function 描边环层清单of源(源: string, 文件: string): 描边环层[] {
  const 结果: 描边环层[] = []
  for (const 块 of 规则清单(源)) {
    const 值 = 块.声明.get('box-shadow')
    if (!值) continue
    for (const 层 of 顶层逗号切分(值)) {
      const 匹配 = 环层模式.exec(层)
      if (!匹配) continue
      if (Number(匹配[1]) === 0) continue // 扩散 0 ⇒ 画不出来，不是环
      结果.push({
        文件,
        选择器: 块.选择器,
        层: 层.replace(/\s+/g, ' ').trim(),
        颜色: 匹配[3].replace(/\s+/g, ' ').trim(),
        状态环: 状态选择器模式.test(块.选择器),
        // FP-15b：--xingbie-*-xuan-* 一族（含 -huan / -guangyun 两枚环令牌）自本单起算真源，
        // 原「正确落点是 --xingbie-*-xuan-* 一族新增环令牌，归 FP-15 配色重构」的两条账本已落地
        吃真源: /^var\(\s*--(?:jujiao-huan-yanse|jujiao-huan-[\w-]*|xuanzhong-[\w-]*|xingbie-[\w-]*)\s*\)$/.test(
          匹配[3].trim(),
        ),
      })
    }
  }
  return 结果
}

function 全部描边环层(): 描边环层[] {
  return 视图清单.flatMap((文件) => 描边环层清单of源(视图源码[文件], 文件))
}

/**
 * 违规账本（= 白名单，逐项写理由 + 归属 FP；只允许缩短，不得陈化）。
 * 判"能不能就地改色"的标准是：改完是否只是把同一处状态的既有颜色换成族内色。
 * 曾登记的 5 层（FP-15b 性别选中 2 + FP-22g 过往战绩 3）都不满足——它们承担的是**选中/性别**语义，
 * 换色会连带改变语义或撞响另一处配色，需要设计裁决，故登记而非静默改色（PROGRESS FP-20 行已记同一批）；
 * 两批已随各自裁决清账，账本现归零，再出现未吃真源的状态环必须在此登记、不得静默改色。
 *
 * FP-22g 清账（旧→新，账本按"改完不删条目也红"的约定缩短）：
 *   过往战绩.vue 选中卡（深/浅两档）`inset 0 0 0 2px #ff2d95` → `var(--xuanzhong-huan-yanse)`
 *   （值仍 #ff2d95，与同块保留的 magenta 硬阴影/背景同族 = 验收①"统一到同一族色"）；
 *   `.zhanji-kapian.sortable-ghost` 落点光晕 `0 0 0 4px rgba(255, 45, 149, 0.12)` →
 *   `var(--xuanzhong-guangyun-yanse)`（值原样收编）。
 *
 * **环/光晕职责结论（验收①②，一句话）：环承担焦点、光晕承担选中** —— 焦点/拖拽落点的环只吃
 * --jujiao-huan-* 族色（落点 dashed、键盘焦点 solid，非色彩通道再分一档）；选中态的内描边、
 * 同块 magenta 硬阴影/背景与落点光晕只吃 --xuanzhong-* 族（#ff2d95，与焦点环蓝灰拉开一档色 =
 * 验收②）。两族异色是「焦点 vs 选中」的语义分界而非割裂；像素取证按验收④留统一验证阶段。
 */
const 状态环违规账本: { 键: string; 归属: string; 理由: string }[] = [
  // FP-15b 已清账（旧→新，账本按"改完不删条目也红"的约定缩短）：
  //   资料设置向导.vue|.xingBie-kaPian.beiXuanZhong|0 0 0 3px rgba(217, 140, 166, 0.14)
  //   资料设置向导.vue|:root[data-theme='light'] .xingBie-kaPian.beiXuanZhong|0 0 0 3px rgba(217, 140, 166, 0.15)
  // 两性统一写死成粉的性别选中环改为 .ziliao-kapian .xingBie-kaPian.beiXuanZhong[data-dang='nan|nv']
  // 吃 --xingbie-{nan,nv}-xuan-{huan,guangyun}（浅档那条同特异度覆写随令牌成对而删除）。
  // FP-22g 已清账：见上方结论注释（3 条 → --xuanzhong-huan-yanse / --xuanzhong-guangyun-yanse）。
]

describe('FP-24a ④ 扩面：outline 声明点在全部视图被冻结成账本', () => {
  const 收口视图计数: Record<string, number> = {
    '过往战绩.vue': 5, // 3 outline + 2 outline-offset（FP-22e 收口）
    '登录内容.vue': 2, // 1 + 1（FP-03 交付）
    '账号与安全.vue': 25, // 12 + 12 + 1 条减动效长写法（FP-22e 收口）
  }

  it('扫描面确实是全部视图（>2），且只有账本内三个视图带 outline 声明、条数逐视图冻结', () => {
    expect(视图清单.length).toBeGreaterThan(2)
    const 实际: Record<string, number> = {}
    for (const 文件 of 视图清单) {
      const 数 = 环声明清单of源(视图源码[文件]).length
      if (数 > 0) 实际[文件] = 数
    }
    expect(实际).toEqual(收口视图计数)
  })
})

describe('FP-24a ④ 扩面：box-shadow 描边环纳入同一口径', () => {
  it('检测器自证（夹具）：零偏移零模糊非零扩散才判环，状态选择器才算状态环，不误伤硬阴影/辉光', () => {
    const 夹具 = [
      '.jia-a:focus { box-shadow: inset 0 0 0 2px #ff2d95; }',
      '.jia-b { box-shadow: inset 0 0 0 1px #cccccc; }',
      '.jia-c:hover { box-shadow: 5px 5px 0 #14141a; }',
      '.jia-d { box-shadow: 0 0 8px #4ade80; }',
      '.jia-e:active { box-shadow: 0 0 0 #14141a; }',
      '.jia-f.xuanZhong { box-shadow: 0 0 0 3px rgba(1, 2, 3, 0.4), 0 10px 26px rgba(1, 2, 3, 0.2); }',
      '.jia-g:focus-visible { box-shadow: inset 0 0 0 2px var(--jujiao-huan-yanse); }',
    ].join('\n')
    const 环 = 描边环层清单of源(夹具, '夹具.vue')
    expect(环.map((项) => 项.选择器)).toEqual([
      '.jia-a:focus',
      '.jia-b',
      '.jia-f.xuanZhong',
      '.jia-g:focus-visible',
    ])
    expect(环.filter((项) => 项.状态环).map((项) => 项.选择器)).toEqual([
      '.jia-a:focus',
      '.jia-f.xuanZhong',
      '.jia-g:focus-visible',
    ])
    expect(环.find((项) => 项.选择器 === '.jia-g:focus-visible')?.吃真源).toBe(true)
    expect(环.filter((项) => 项.状态环 && !项.吃真源).map((项) => 项.层)).toEqual([
      'inset 0 0 0 2px #ff2d95',
      '0 0 0 3px rgba(1, 2, 3, 0.4)',
    ])
  })

  it('全部视图的描边环层总数被冻结（新增任何一层环都要在这里记账，环形状本身不许漂）', () => {
    const 环 = 全部描边环层()
    expect(环.length).toBe(9) // 9 层环：3 过往战绩 + 4 登录内容鎏金双线 + 2 性别卡选中
    expect(环.filter((项) => 项.状态环).length).toBe(5)
    // 静态卡框必须由"状态"这一半排除，而不是由账本兜住
    expect(
      环.filter((项) => !项.状态环).map((项) => `${项.文件}|${项.选择器}`),
      '出现新的非状态环层：它是静态装饰还是漏判的状态环，须重判口径',
    ).toEqual([
      '登录内容.vue|.biaodan-rongqi',
      '登录内容.vue|.biaodan-rongqi',
      "登录内容.vue|:root[data-theme='light'] .biaodan-rongqi",
      "登录内容.vue|:root[data-theme='light'] .biaodan-rongqi",
    ])
  })

  it('状态环里未吃 --jujiao-huan-*/--xuanzhong-* 的位置 = 违规账本，不新增不陈化，且每条都带理由与归属', () => {
    const 违规 = 全部描边环层().filter((项) => 项.状态环 && !项.吃真源)
    const 键 = 违规.map((项) => `${项.文件}|${项.选择器}|${项.层}`)
    expect(键.sort(), '状态环出现未登记的硬编码色，或账本已陈化（改完请删对应条目）').toEqual(
      状态环违规账本.map((项) => 项.键).sort(),
    )
    for (const 项 of 状态环违规账本) {
      expect(项.理由.trim(), `${项.键} 缺改色需设计判断的理由`).not.toBe('')
      expect(项.归属, `${项.键} 未写归属 FP`).toMatch(/^FP-\d+/)
      const [文件, 选择器, 层] = 项.键.split('|')
      expect(
        全部描边环层().some((项2) => 项2.文件 === 文件 && 项2.选择器 === 选择器 && 项2.层 === 层),
        `${项.键} 已不在源码里，账本条目必须删除`,
      ).toBe(true)
    }
  })
})

describe('FP-22g 选中态 magenta 令牌：深浅成对 + 有消费者 + 与焦点环拉开一档', () => {
  it('环/晕两枚深浅两档均定义，取值逐字 = 改前字面量（原样收编，零视觉漂移）', () => {
    for (const 档 of ['light', 'dark'] as const) {
      expect(两档解析[档].get('--xuanzhong-huan-yanse')).toBe('#ff2d95')
      expect(两档解析[档].get('--xuanzhong-guangyun-yanse')).toBe('rgba(255, 45, 149, 0.12)')
    }
  })

  it('消费者在位（选中卡 border+inset 深浅共 4 处 / 落点光晕 1 处），选中环色两档均与焦点环色异色', () => {
    expect(战绩源码.match(/var\(--xuanzhong-huan-yanse\)/g) ?? []).toHaveLength(4)
    expect(战绩源码.match(/var\(--xuanzhong-guangyun-yanse\)/g) ?? []).toHaveLength(1)
    for (const 档 of ['light', 'dark'] as const) {
      expect(
        两档解析[档].get('--xuanzhong-huan-yanse'),
        `${档} 档选中环与焦点环同色 = 验收② 未拉开`,
      ).not.toBe(两档解析[档].get('--jujiao-huan-yanse'))
    }
  })
})
