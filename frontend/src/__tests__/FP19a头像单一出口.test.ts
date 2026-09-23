import { readFileSync, readdirSync, statSync } from 'node:fs'
import { parse } from '@vue/compiler-sfc'
import { resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { huoQuFanYi } from '@/config/translations'
import 头像 from '@/components/头像.vue'
import { 层叠胜出, 规则清单 } from './CSS级联真源'
import type { 探针 } from './CSS级联真源'

/**
 * FP-19a（需求 #11 / 根因 R5）门禁：头像**不允许被选中**，纯 emoji 头像也按图片处理。
 *
 * 判据落在「层叠解析值 + 挂载后的 DOM 结构 + 解析出的模板 AST」上，不用源码字符串包含冒充行为断言。
 * 本仓 vitest 未开 `test.css`，SFC 的 `<style scoped>` 不注入 jsdom，故样式判定走
 * `__tests__/CSS级联真源.ts`（命中 → 特异度 → 文档序），与书写位置/换行/注释无关。
 */

const 前端根 = resolve(__dirname, '..')
const 相对 = (文件: string): string => 文件.slice(前端根.length + 1).split(sep).join('/')
const 出口文件 = 'components/头像.vue'
const 出口源 = readFileSync(resolve(前端根, 出口文件), 'utf8')
const 头像文案 = huoQuFanYi('haoYou', 'touXiang')

function 取样式块(源: string): string {
  return [...源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((块) => 块[1])
    .join('\n')
}

function 遍历源文件(目录: string, 后缀: string[]): string[] {
  const 结果: string[] = []
  for (const 项 of readdirSync(目录)) {
    const 全路径 = resolve(目录, 项)
    if (statSync(全路径).isDirectory()) {
      if (项 === '__tests__' || 项 === 'node_modules') continue
      结果.push(...遍历源文件(全路径, 后缀))
    } else if (后缀.some((后缀名) => 项.endsWith(后缀名))) {
      结果.push(全路径)
    }
  }
  return 结果
}

const vue文件们 = 遍历源文件(前端根, ['.vue']).sort()
const 源文件们 = 遍历源文件(前端根, ['.vue', '.css']).sort()
const 源码 = new Map<string, string>(
  源文件们.map((文件) => [相对(文件), readFileSync(文件, 'utf8')]),
)
const 取源 = (文件: string): string => 源码.get(文件) ?? ''

/**
 * 账本单位 = 含 `touxiang` 的源行（入场实测的 13 面地图口径）。
 * 其中「头像令牌消费行」（`var(--touxiang-*)`）**不算待收点**：令牌名住在 `styles/variables.css`
 * （本波禁改），且消费的是背景/阴影值而不是头像元素样式；这类行由下面的 令牌消费登记 逐条钉住，
 * 不做静默豁免——多一条、少一条、换了令牌名都会红。
 */
const 是令牌消费 = (行: string): boolean => /var\(\s*--touxiang-/.test(行)

interface 面计数 {
  文件: string
  待收点: number
  消费点: number
}

function 统计面(文件: string): 面计数 {
  const 行们 = 取源(文件).split('\n')
  const 命中 = 行们.filter((行) => 行.includes('touxiang'))
  const 消费 = 命中.filter(是令牌消费).length
  return { 文件, 待收点: 命中.length - 消费, 消费点: 消费 }
}

const 实测面们 = vue文件们
  .map((文件) => 相对(文件))
  .filter((文件) => 文件 !== 出口文件)
  .map(统计面)

/** 本波转换的四个高频面：待收点必须归零（留一条即红），且必须已接出口组件。 */
const 本波面 = [
  'views/聊天页面.vue',
  'components/全局菜单.vue',
  'views/好友列表.vue',
  'views/好友聊天.vue',
]

/**
 * FP-19b（收口波）：交棒账本已清空 ⇒ 本表恒为 `[]`。**双向相等**断言保留原力度：
 * 任何一个 .vue 再冒出一行含 `touxiang` 的非令牌行 ⇒ 红；把已收口的面回填再登记 ⇒ 也红。
 * （引用气泡块的 1 条＝FP-19a 假注释，已按事实改称 `.xiaoxi-wei`；头像裁剪的 1 条＝上传
 * File 文件名，按仓库拼音命名规范改为 `touXiang.` 前缀，不再是小写样式词。）
 */
const 未收口账本: 面计数[] = []

/** 头像令牌消费行的登记（同双向相等；本波把 `--touxiang-*` 的声明处留在 variables.css 不动）。 */
const 令牌消费登记: { 文件: string; 声明: string; 数量: number }[] = [
  { 文件: 'views/聊天页面.vue', 声明: 'background: var(--touxiang-beijing-moren);', 数量: 2 },
  { 文件: 'views/好友聊天.vue', 声明: 'background: var(--touxiang-beijing-moren);', 数量: 1 },
  { 文件: 'components/全局菜单.vue', 声明: 'background: var(--touxiang-touming-beijing);', 数量: 1 },
  { 文件: 'components/通话界面.vue', 声明: 'background: var(--touxiang-beijing-moren);', 数量: 1 },
  { 文件: 'components/通话界面.vue', 声明: 'box-shadow: var(--touxiang-yinying);', 数量: 1 },
  { 文件: 'views/添加微信.vue', 声明: 'background: var(--touxiang-touming-beijing);', 数量: 1 },
  { 文件: 'views/添加微信.vue', 声明: 'box-shadow: var(--touxiang-yinying);', 数量: 1 },
]

function 实测令牌消费(): string[] {
  const 结果: string[] = []
  for (const 文件 of vue文件们.map(相对)) {
    if (文件 === 出口文件) continue
    for (const 行 of 取源(文件).split('\n')) {
      if (行.includes('touxiang') && 是令牌消费(行)) 结果.push(`${文件}|${行.trim()}`)
    }
  }
  return 结果
}

/* ---------------------------------- 模板 AST ---------------------------------- */

interface 模板节点 {
  type: number
  tag?: string
  props?: { type: number; name?: string; rawName?: string; exp?: { content?: string } }[]
  children?: 模板节点[]
  alternate?: 模板节点
  ifBranches?: 模板节点[] | null
  [键: string]: unknown
}

function 遍历元素(节点: 模板节点 | undefined, 访问: (元: 模板节点) => void): void {
  if (!节点) return
  if (节点.type === 1 && 节点.tag) 访问(节点)
  for (const 子 of 节点.children ?? []) 遍历元素(子, 访问)
  for (const 子 of 节点.ifBranches ?? []) 遍历元素(子, 访问)
  if (节点.alternate) 遍历元素(节点.alternate, 访问)
}

function 元素清单(文件: string): 模板节点[] {
  const { descriptor, errors } = parse(取源(文件), { filename: 文件 })
  expect(errors, `${文件} SFC 解析失败`).toEqual([])
  const 结果: 模板节点[] = []
  遍历元素(descriptor.template?.ast as unknown as 模板节点, (元) => 结果.push(元))
  return 结果
}

const 绑定名 = (元: 模板节点, 原始名: string): boolean =>
  (元.props ?? []).some((项) => 项.rawName === 原始名 || 项.name === 原始名)

const 表达式含 = (元: 模板节点, 式: RegExp): boolean =>
  (元.props ?? []).some((项) => 式.test(项.exp?.content ?? ''))

/* ---------------------------------- 层叠判定 ---------------------------------- */

const 出口规则们 = 规则清单(取样式块(出口源))
const 图探针: 探针 = { 标签: 'img', 类: ['touxiang'] }
const 字探针: 探针 = { 标签: 'span', 类: ['touxiang', 'touxiang--zi'] }

function 出口层叠值(目标: 探针, 属性: string): string | null {
  const 结果 = 层叠胜出(出口规则们, 目标, 属性)
  return 结果 ? 结果.值 : null
}

describe('FP-19a 头像出口契约：URL 与 emoji 一律按图片处理', () => {
  it('URL 型渲染为 img：role=img + alt 取翻译键 + draggable=false，src 原样透传', () => {
    const wrapper = mount(头像, { props: { touXiang: 'https://cdn/x.png', moRenZi: '🧑' } })
    const 图 = wrapper.find('img')
    expect(图.exists()).toBe(true)
    expect(图.attributes('role')).toBe('img')
    expect(图.attributes('alt')).toBe(头像文案)
    expect(图.attributes('draggable')).toBe('false')
    expect(图.attributes('src')).toBe('https://cdn/x.png')
    expect(图.classes()).toContain('touxiang')
    expect(图.classes()).not.toContain('touxiang--zi')
    expect(wrapper.text()).toBe('')
  })

  it('emoji 型不再是裸文本：同一出口、role=img + aria-label + draggable=false', () => {
    const wrapper = mount(头像, { props: { touXiang: '😀', moRenZi: '😀' } })
    const 字 = wrapper.find('span')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(字.classes()).toEqual(['touxiang', 'touxiang--zi'])
    expect(字.attributes('role')).toBe('img')
    expect(字.attributes('aria-label')).toBe(头像文案)
    expect(字.attributes('draggable')).toBe('false')
    expect(字.text()).toBe('😀')
  })

  it('空头像字段落回占位分支（不产生 src="" 的空图）', () => {
    for (const 值 of [null, undefined, '', '   ']) {
      const wrapper = mount(头像, { props: { touXiang: 值, moRenZi: '🧑' } })
      expect(wrapper.find('img').exists(), `输入 ${JSON.stringify(值)} 不应按图片渲染`).toBe(false)
      expect(wrapper.find('span').attributes('role')).toBe('img')
      expect(wrapper.find('span').text()).toBe('🧑')
    }
  })

  it('两条分支共用同一套可交互属性：层叠胜出 user-select/-webkit-user-drag 全为 none', () => {
    for (const 目标 of [图探针, 字探针]) {
      expect(出口层叠值(目标, 'user-select'), JSON.stringify(目标)).toBe('none')
      expect(出口层叠值(目标, '-webkit-user-select'), JSON.stringify(目标)).toBe('none')
      expect(出口层叠值(目标, '-webkit-user-drag'), JSON.stringify(目标)).toBe('none')
    }    expect(出口层叠值(图探针, 'object-fit')).toBe('cover')
    expect(出口层叠值(图探针, 'display')).toBe('block')
    expect(出口层叠值(字探针, 'display')).toBe('flex')
  })

  it('组件内零色值/零像素字面量，几何只吃百分比与宿主槽', () => {
    const 样式 = 取样式块(出口源)
    expect([...样式.matchAll(/#[0-9a-fA-F]{3,8}\b|\brgba?\(/g)]).toEqual([])
    expect([...样式.matchAll(/\b\d*\.?\d+(px|rem|em|vh|vw)\b/g)]).toEqual([])
    expect(出口层叠值(图探针, 'width')).toBe('100%')
    expect(出口层叠值(图探针, 'height')).toBe('100%')
  })

  it('无硬编码文案：全文件中文字面量只剩模块路径，alt 由翻译键给出', () => {
    const 中文字面量 = [...出口源.matchAll(/(['"])([^'"\n]*\p{Script=Han}[^'"\n]*)\1/gu)].map(
      (匹) => 匹[2],
    )
    expect(中文字面量.every((串) => 串.startsWith('@/'))).toBe(true)
    expect(mount(头像, { props: { touXiang: '/a.png' } }).attributes('alt')).toBe(头像文案)
    expect(mount(头像, { props: { touXiang: '😀', moRenZi: '😀' } }).attributes('aria-label')).toBe(
      头像文案,
    )
  })
})

describe('FP-19a 四个已转换面：只剩出口组件在渲染头像', () => {
  const 出口标签数: Record<string, number> = {
    'views/聊天页面.vue': 2,
    'components/全局菜单.vue': 2,
    'views/好友列表.vue': 2,
    'views/好友聊天.vue': 1,
  }

  for (const 文件 of 本波面) {
    it(`${文件}：头像一律经 <TouXiang>，无自带 img，无头像样式声明行`, () => {
      const 元素们 = 元素清单(文件)
      const 出口们 = 元素们.filter((元) => 元.tag === 'TouXiang')
      expect(出口们.length).toBe(出口标签数[文件])
      for (const 元 of 出口们) {
        expect(绑定名(元, ':tou-xiang'), '出口组件必须拿到头像字段原值').toBe(true)
        expect(绑定名(元, ':mo-ren-zi'), '出口组件必须拿到占位字').toBe(true)
      }
      expect(
        出口们.some((元) => 表达式含(元, /tou_?xiang/i)),
        '出口组件绑的必须是头像字段本身',
      ).toBe(true)
      const 自画头像 = 元素们.filter(
        (元) => 元.tag === 'img' && /tou_?xiang/i.test((元.props ?? []).map((项) => 项.exp?.content ?? '').join(' ')),
      )
      expect(自画头像.map((元) => 元.tag), '仍有绕过出口的头像 img').toEqual([])
      expect(统计面(文件).待收点, '已收口面不得再有任何头像样式声明行').toBe(0)
    })
  }

  it('本波四面都不再声明 .touxiang* 选择器，且未把 .banben-wenben 的禁选加回去', () => {
    for (const 文件 of 本波面) {
      const 头像选择器 = 规则清单(取样式块(取源(文件))).filter((规则) =>
        规则.选择器.includes('touxiang'),
      )
      expect(头像选择器.map((规则) => 规则.选择器), 文件).toEqual([])
    }
    const 菜单规则 = 规则清单(取样式块(取源('components/全局菜单.vue')))
    const 版本禁选 = 菜单规则.filter(
      (规则) => 规则.选择器.includes('banben-wenben') && 规则.声明.has('user-select'),
    )
    expect(版本禁选).toEqual([])
  })
})

describe('FP-19a 全库账本（只准缩短）与同类点穷尽', () => {
  it('待收点账本已清空：任何面再出现 touxiang 样式/渲染行即红（双向相等）', () => {
    const 实测 = 实测面们.filter((面) => 面.待收点 > 0)
    expect(实测.sort((甲, 乙) => 甲.文件.localeCompare(乙.文件))).toEqual(
      [...未收口账本].sort((甲, 乙) => 甲.文件.localeCompare(乙.文件)),
    )
    expect(未收口账本.length).toBe(0)
  })

  it('本波四面的待收点为 0 且不在账本里', () => {
    for (const 文件 of 本波面) {
      expect(统计面(文件).待收点, 文件).toBe(0)
      expect(未收口账本.map((项) => 项.文件)).not.toContain(文件)
    }
  })

  it('头像令牌消费行逐条登记（variables.css 的 --touxiang-* 本波不动，消费点不静默豁免）', () => {
    expect(实测令牌消费().sort()).toEqual(
      令牌消费登记
        .flatMap((项) => Array.from({ length: 项.数量 }, () => `${项.文件}|${项.声明}`))
        .sort(),
    )
  })

  /** 声明头像元素样式规则（选择器末段含 touxiang）的文件：本波四面必须为 0，其余面双向登记 */
  function 声明头像规则的文件(): string[] {
    return [...源码.entries()]
      .filter(
        ([文件, 源]) =>
          文件 !== 出口文件 &&
          规则清单(取样式块(源)).some((规则) =>
            规则.选择器
              .split(',')
              .some((串) => (串.trim().split(/\s+/).slice(-1)[0] ?? '').includes('touxiang')),
          ),
      )
      .map(([文件]) => 文件)
      .sort()
  }

  /** FP-19b 收口后：声明头像元素样式规则（选择器末段含 touxiang）的面 = 0，出口组件之外一张不留 */
  const 头像规则账本: string[] = []

  it('出口唯一：.touxiang* 样式规则只登记在未收口面里，-webkit-user-drag 全库只有一处声明', () => {
    const 实测 = 声明头像规则的文件()
    expect(实测, '头像样式规则账本陈化或新增第二份声明').toEqual(头像规则账本)
    expect(实测.every((文件) => 未收口账本.some((项) => 项.文件 === 文件))).toBe(true)
    for (const 文件 of 本波面) expect(实测).not.toContain(文件)

    const 拖拽声明 = [...源码.entries()]
      .filter(([, 源]) => /-webkit-user-drag\s*:/m.test(源))
      .map(([文件]) => 文件)
    expect(拖拽声明).toEqual([出口文件])
  })

  /**
   * FP-19b 验收③：需求 #11 两波合并后的**全库穷尽断言**。
   * 判据走模板 AST：出口组件之外，任何 `<img>`/`<span>` 只要属性绑定表达式碰头像数据
   * （`tou_xiang`/`touXiang` 标识符，含 `shiTuPianDiZhi(` 判据调用）即为绕过出口的渲染点 ⇒ 红。
   * 第二条腿：凡源里消费 `tou_xiang` 字段或 `shiTuPianDiZhi(` 判据的 .vue 面，必须 import 出口组件。
   * （utils/头像.ts 的判据真源只准 头像.vue 与呈现方数据加工函数消费，不准再出现在模板里。）
   */
  it('全库穷尽：img/span 形态的头像渲染点只剩出口组件内部；消费头像数据的面必接出口', () => {
    const 绕过出口: string[] = []
    for (const 文件 of vue文件们.map(相对)) {
      if (文件 === 出口文件) continue
      for (const 元 of 元素清单(文件)) {
        if (元.tag !== 'img' && 元.tag !== 'span') continue
        const 式子 = (元.props ?? []).map((项) => 项.exp?.content ?? '').join(' ')
        if (/tou_?xiang/i.test(式子)) 绕过出口.push(`${文件}<${元.tag}>`)
      }
    }
    expect(绕过出口).toEqual([])

    const 未接出口 = vue文件们
      .map(相对)
      .filter((文件) => 文件 !== 出口文件)
      .filter((文件) => {
        const 源 = 取源(文件)
        const 取数 = /tou_xiang|shiTuPianDiZhi\(/.test(源)
        return 取数 && !源.includes("@/components/头像.vue'")
      })
    expect(未接出口).toEqual([])
  })
})

/**
 * FP-31 H1（第三波 Standards 轴）：兜底默认字形**只准住在出口组件**。
 * 旧形态＝FP-19a 自己刚立的"单一出口"被调用点破掉——`聊天页面.vue:83/:89` 写成
 * `:mo-ren-zi="…tou_xiang || '👤'"` / `|| '🧑'`，字形真源出现第二份（同时违反零硬编码 [P0]）。
 * 新契约＝调用点只传数据（头像原值）+ 声明身份档 `shen-fen`，兜底字形由 `头像.vue` 内的
 * `MO_REN_ZI` 给出。FP-19b 收口后账本只剩出口一行（jiaose/yonghu/duijue 三枚字形）：
 * 任何调用点回填字形⇒红；出口外的登记陈化⇒红。`过往战绩` 的战报海报输入改从出口具名导出
 * `MO_REN_ZI` 取字形，调用点同样零字面量。
 */
describe('FP-31 H1 兜底字形只在出口，调用点只传数据', () => {
  const 兜底字形 = ['👤', '🧑', '⚔️']
  const 命中数 = (源: string): number =>
    兜底字形.reduce((计, 字) => 计 + 源.split(字).length - 1, 0)

  const 字形账本: Array<{ 文件: string; 命中: number }> = [
    { 文件: 'components/头像.vue', 命中: 3 },
  ]

  it('出口持有 jiaose/yonghu 两档兜底字形常量，并由 shenFen 通道取值', () => {
    const 常量 = /const MO_REN_ZI\s*=\s*\{([^}]*)\}/.exec(出口源)
    expect(常量, '头像.vue 不再持有兜底字形常量 ⇒ 单一出口失效').not.toBeNull()
    expect(常量[1]).toContain('jiaose')
    expect(常量[1]).toContain('yonghu')
    expect(出口源).toMatch(/shenFen\?:\s*'jiaose'\s*\|\s*'yonghu'/)
    expect(出口源).toMatch(/props\.shenFen\s*\?\s*MO_REN_ZI\[props\.shenFen\]/)
  })

  it('全库 .vue 的默认字形命中 = 账本（调用点回填⇒红，收口不销账⇒红）', () => {
    const 实测 = vue文件们
      .map(相对)
      .map((文件) => ({ 文件, 命中: 命中数(取源(文件)) }))
      .filter((面) => 面.命中 > 0)
      .sort((甲, 乙) => 甲.文件.localeCompare(乙.文件))
    expect(实测).toEqual([...字形账本].sort((甲, 乙) => 甲.文件.localeCompare(乙.文件)))
    for (const 文件 of 本波面)
      expect(命中数(取源(文件)), `${文件} 已接出口，不得再出现任何默认字形`).toBe(0)
  })

  it('四个已转换面传给出口的占位字是纯数据表达式；聊天页两面显式声明身份档', () => {
    for (const 文件 of 本波面) {
      const 出口们 = 元素清单(文件).filter((元) => 元.tag === 'TouXiang')
      expect(出口们.length, 文件).toBeGreaterThan(0)
      for (const 元 of 出口们) {
        const 式 = (元.props ?? [])
          .filter((项) => 项.rawName === ':mo-ren-zi' || 项.name === ':mo-ren-zi')
          .map((项) => 项.exp?.content ?? '')
          .join(' | ')
        expect(式.trim(), `${文件} 的出口必须把占位字数据传进来`).not.toBe('')
        expect(命中数(式), `${文件} 的 :mo-ren-zi 又写了默认字形：${式}`).toBe(0)
      }
    }
    const 聊天页出口 = 元素清单('views/聊天页面.vue').filter((元) => 元.tag === 'TouXiang')
    expect(聊天页出口).toHaveLength(2)
    for (const 元 of 聊天页出口)
      expect(绑定名(元, 'shen-fen'), '聊天页两出口须声明身份档，否则组件兜底无从落值').toBe(true)
  })
})

/**
 * FP-19b（收口波）：交回的 9 面 + 地图外的 挑战主页 全部接上同一出口。
 * 专属手势不回归：军师指导/军师记录详情 的「图片加载失败→落文字分支」经组件新增的
 * `error` 事件透传（原生 img 的 @error 语义上收为出口事件，宿主逻辑保持）；
 * 头像裁剪的裁剪交互不经头像出口（canvas 取景，与被禁选的呈现层头像是两回事）。
 */
describe('FP-19b 第二波收口面：一律经 <TouXiang>，绑定纯数据、零字形、零头像样式行', () => {
  const 出口标签数: Record<string, number> = {
    'views/添加微信.vue': 1,
    'components/通话界面.vue': 2,
    'views/账号与安全.vue': 3,
    'components/用户资料卡.vue': 1,
    'components/军师指导.vue': 1,
    'views/军师记录详情.vue': 1,
    'views/过往战绩.vue': 1,
    'views/挑战主页.vue': 1,
  }
  const 兜底字形 = ['👤', '🧑', '⚔️']
  const 命中数 = (源: string): number =>
    兜底字形.reduce((计, 字) => 计 + 源.split(字).length - 1, 0)

  for (const [文件, 数] of Object.entries(出口标签数)) {
    it(`${文件}：${数} 个出口标签，:tou-xiang/:mo-ren-zi 已绑且占位字是纯数据，待收点为 0`, () => {
      const 出口们 = 元素清单(文件).filter((元) => 元.tag === 'TouXiang')
      expect(出口们.length, 文件).toBe(数)
      for (const 元 of 出口们) {
        expect(绑定名(元, ':tou-xiang'), `${文件} 出口必须拿到头像字段原值`).toBe(true)
        expect(绑定名(元, ':mo-ren-zi'), `${文件} 出口必须拿到占位字数据`).toBe(true)
        const 式 = (元.props ?? [])
          .filter((项) => 项.rawName === ':mo-ren-zi' || 项.name === ':mo-ren-zi')
          .map((项) => 项.exp?.content ?? '')
          .join(' | ')
        expect(命中数(式), `${文件} 的 :mo-ren-zi 又写了默认字形：${式}`).toBe(0)
      }
      expect(统计面(文件).待收点, `${文件} 已收口，不得再有 touxiang 样式/渲染行`).toBe(0)
      expect(命中数(取源(文件)), `${文件} 默认字形必须为 0（真源在出口 MO_REN_ZI）`).toBe(0)
    })
  }

  it('无头像数据可传的三面（通话界面×2/挑战主页）显式声明身份档，由出口给兜底字形', () => {
    for (const 文件 of ['components/通话界面.vue', 'views/挑战主页.vue']) {
      const 出口们 = 元素清单(文件).filter((元) => 元.tag === 'TouXiang')
      expect(出口们.length, 文件).toBeGreaterThan(0)
      for (const 元 of 出口们)
        expect(绑定名(元, 'shen-fen'), `${文件} 出口须声明身份档`).toBe(true)
    }
  })

  it('两波合计：全库 .vue 里小写 touxiang 只剩出口组件自身与登记的令牌消费行', () => {
    const 残留 = vue文件们
      .map(相对)
      .filter((文件) => 文件 !== 出口文件)
      .filter(
        (文件) =>
          取源(文件)
            .split('\n')
            .filter((行) => 行.includes('touxiang') && !/var\(\s*--touxiang-/.test(行))
            .length > 0,
      )
    expect(残留).toEqual([])
  })
})
