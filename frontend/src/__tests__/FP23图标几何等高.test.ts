import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { 声明位置, 解析几何数值 } from './主题令牌真源'

/**
 * FP-23（需求 #9 的真正落地）。
 *
 * 缺陷本体：FP-01 交付了 `--shuru-tubiao-chicun: var(--shuru-danxing-gao-du)` 与
 * `--shuru-tubiao-glyph-chicun: 22px` 两枚令牌，但**全库源码内消费者为 0**，
 * `聊天页面.vue` 的语音/表情/加号三枚图标盒仍写死 44×44（svg 28×28），
 * `好友聊天.vue` 的相册/文件入口写死 44×44（svg 20×20）—— 即输入框 35px、图标 44px，
 * 「图标与输入框等高」一字未动，而 variables.css 的注释当时已声称"图标盒吃它"（假注释）。
 *
 * 本文件不复用"源码里出现了某个字符串"那种判定：字面量在位只证明字符串存在，证明不了数值同源
 * （审计 B10 的病理）。三条口径全部落在**解析值**上：
 *  ①盒高等于输入框单行高：图标盒两轴引用的令牌，代入 var()/calc() 后必须等于
 *    `--shuru-danxing-gao-du`，也必须等于 `use输入框.ts` 未测量时的回落值那条算式；
 *  ②等比不被压扁：字形宽高引用**同一枚**令牌 ⇒ 结构上不可能非等比；再加模板侧 viewBox 为正方形，
 *    两条合起来才是"不改变自身比例"的机器证明；
 *  ③触控热区不缩水：热区由 `::before` 以 `--shuru-anniu-re-ku` 外扩，其解析值必须 ≥ 可见盒，
 *    且宿主规则必须有 `position: relative`（否则绝对定位的伪元素锚到别的祖先上，热区直接脱离按钮）。
 *
 * ④顺带把 BS-1 那枚病理钉死：两枚图标令牌若再次变成零消费者（只被自身测试钉住），本文件即红。
 */

const 源目录 = resolve(__dirname, '..')
const 读 = (相对路径: string) => readFileSync(resolve(源目录, 相对路径), 'utf-8')

const 聊天页源 = 读('views/聊天页面.vue')
const 好友页源 = 读('views/好友聊天.vue')
const 输入区源 = 读('components/聊天/图文输入区.vue')

interface 图标点 {
  页: string
  源: string
  盒: string
  glyph令牌: string | null
  glyph字面量?: string
}

/** 输入行（.shuru-rongqi）内的全部图标按钮：一处漏改即破坏等高构造 */
const 图标点清单: 图标点[] = [
  { 页: '聊天页面.vue', 源: 聊天页源, 盒: '.yuyin-anniu', glyph令牌: '--shuru-tubiao-glyph-chicun' },
  { 页: '聊天页面.vue', 源: 聊天页源, 盒: '.biaoqing-anniu', glyph令牌: '--shuru-tubiao-glyph-chicun' },
  { 页: '聊天页面.vue', 源: 聊天页源, 盒: '.gengduo-plus-anniu', glyph令牌: '--shuru-tubiao-glyph-chicun' },
  { 页: '好友聊天.vue', 源: 好友页源, 盒: '.meiti-rukou', glyph令牌: '--shuru-tubiao-glyph-chicun' },
  {
    页: '聊天页面.vue',
    源: 聊天页源,
    盒: '.zhan-kai-anniu',
    // 展开/折叠的 chevron 是二级指示符，刻意小于主 glyph 且全站仅此一处（不构成第二真源）：
    // 判定为「必要保留 14px」。它两轴同值 ⇒ 等比仍由第二条口径保证
    glyph令牌: null,
    glyph字面量: '14px',
  },
]

/** 取选择器列表中命中该简单选择器的规则体；同一选择器被多条规则命中时按源码序拼接。
 *  只扫 <style> 段：模板里的 `class="x"` 与脚本里的对象字面量都带花括号，混进来会污染选择器切分。
 *  注释整段剥掉：CSS 注释紧贴在选择器之前时会被算进选择器文本，令命中判定假失败 */
function 规则体(源码: string, 选择器: string): string {
  const 样式段 = 源码
    .slice(源码.indexOf('<style'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
  const 段: string[] = []
  for (const 匹配 of 样式段.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const 命中 = 匹配[1]
      .split(',')
      .map((项) => 项.replace(/\s+/g, ' ').trim())
      .some((项) => 项 === 选择器)
    if (命中) 段.push(匹配[2])
  }
  return 段.join(';')
}

function 声明(规则: string, 属性: string): string {
  const 匹配 = new RegExp(`(?:^|;|\\n)\\s*${属性}\\s*:\\s*([^;]+)`).exec(规则)
  return 匹配 ? 匹配[1].trim() : ''
}

function 引用令牌(规则: string, 属性: string): string {
  return 声明(规则, 属性).replace(/^var\(\s*(--[a-z0-9-]+)\s*\)$/, '$1')
}

/** 模板侧：某类名按钮内第一枚 <svg> 的 viewBox 宽高（等比判定的另一半证据） */
function 按钮内viewBox(源: string, 类名: string): Array<[number, number]> {
  const 结果: Array<[number, number]> = []
  for (const 匹配 of 源.matchAll(/<button\b[\s\S]*?<\/button>/g)) {
    if (!new RegExp(`class="${类名}(?:"|\\s)`).test(匹配[0])) continue
    const 号 = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(匹配[0])
    if (号) 结果.push([Number(号[1]), Number(号[2])])
  }
  return 结果
}

describe('FP-23 口径①：输入区图标盒高等于输入框折叠态单行高（解析值，不是字符串）', () => {
  const 单行高 = 解析几何数值('--shuru-danxing-gao-du')

  it('--shuru-tubiao-chicun 代入 var() 后就是输入框单行高令牌本身', () => {
    expect(单行高).toBe(35)
    expect(解析几何数值('--shuru-tubiao-chicun')).toBe(单行高)
    // 与 use输入框.ts 的运行时算式同源：ceil(字号×行高 + 上下内边距)，第二处真源即红
    const 算式值 = Math.ceil(
      解析几何数值('--shuru-kuang-zihao') * 解析几何数值('--shuru-kuang-hangao') +
        解析几何数值('--shuru-kuang-shang-xia-neidian') * 2,
    )
    expect(算式值).toBe(单行高)
    // FP-10c 契约演进：旧断言钉的是「use输入框.ts 里出现 'var(--shuru-danxing-gao-du)' 那串 JS 字面量」。
    // 那条 JS 量高链已随真内联输入区整体删除，文件不存在 ⇒ 旧形态作废。改钉**现在真正决定折叠盒高
    // 的那条声明**：图文输入区组件样式里 .shuru-kuang 的 min-height 必须引用这枚令牌。
    // 这是收紧不是放松：旧判据只要文件里任何位置出现过那串就绿，新判据要求它落在具体规则的具体属性上。
    const 折叠规则 = 规则体(输入区源, '.shuru-kuang')
    expect(折叠规则, '找不到 .shuru-kuang 规则').not.toBe('')
    expect(引用令牌(折叠规则, 'min-height'), '折叠档不再吃单行高令牌 = 两套高度').toBe(
      '--shuru-danxing-gao-du',
    )
    expect(解析几何数值(引用令牌(折叠规则, 'min-height'))).toBe(单行高)
  })

  for (const 点 of 图标点清单) {
    it(`${点.页} ${点.盒} 两轴同吃 --shuru-tubiao-chicun，规则体内不留盒高字面量`, () => {
      const 规则 = 规则体(点.源, 点.盒)
      expect(规则, `找不到 ${点.盒} 规则`).not.toBe('')
      expect(引用令牌(规则, 'width'), `${点.盒} width 未吃图标盒令牌`).toBe('--shuru-tubiao-chicun')
      expect(引用令牌(规则, 'height'), `${点.盒} height 未吃图标盒令牌`).toBe('--shuru-tubiao-chicun')
      expect(解析几何数值('--shuru-tubiao-chicun'), `${点.盒} 的解析盒高不等于输入框单行高`).toBe(单行高)
      expect(规则, `${点.盒} 又出现 min-/max- 高度字面量 = 第二套高度`).not.toMatch(
        /(?:min-|max-)?height\s*:\s*\d/,
      )
    })
  }

  it('输入行内不残留 44×44 的图标盒字面量（改前形态不得复活）', () => {
    for (const 点 of 图标点清单) {
      expect(规则体(点.源, 点.盒), `${点.盒} 回到 44px 字面量`).not.toMatch(/44px/)
    }
  })
})

describe('FP-23 口径②：字形保持自身比例，绝不为等高被压扁', () => {
  for (const 点 of 图标点清单) {
    const svg选择器 = `${点.盒} svg`
    it(`${点.页} ${svg选择器} 宽高引用同一取值 ⇒ 两轴恒等`, () => {
      const 规则 = 规则体(点.源, svg选择器)
      expect(规则, `找不到 ${svg选择器} 规则（字形尺寸失去单点约束）`).not.toBe('')
      const 宽 = 声明(规则, 'width')
      const 高 = 声明(规则, 'height')
      expect(宽, `${svg选择器} 缺 width`).not.toBe('')
      expect(高, `${svg选择器} 缺 height`).not.toBe('')
      if (点.glyph令牌) {
        expect(引用令牌(规则, 'width'), `${svg选择器} width 未吃 glyph 令牌`).toBe(点.glyph令牌)
        expect(引用令牌(规则, 'height'), `${svg选择器} height 未吃 glyph 令牌`).toBe(点.glyph令牌)
        expect(
          解析几何数值(点.glyph令牌),
          `${点.glyph令牌} 必须装得进图标盒，否则字形被盒裁切`,
        ).toBeLessThanOrEqual(解析几何数值('--shuru-tubiao-chicun'))
      } else {
        // 必要保留点：允许字面量，但两轴必须同值，且不得大于盒
        expect(宽, `${svg选择器} 必要保留点两轴不同值 = 非等比`).toBe(点.glyph字面量)
        expect(高, `${svg选择器} 必要保留点两轴不同值 = 非等比`).toBe(点.glyph字面量)
        expect(
          Number.parseFloat(点.glyph字面量 as string),
          `${svg选择器} 字形大于图标盒`,
        ).toBeLessThanOrEqual(解析几何数值('--shuru-tubiao-chicun'))
      }
    })

    it(`${点.页} ${点.盒} 模板内 svg 的 viewBox 是正方形（等比缩放的前提）`, () => {
      const 清单 = 按钮内viewBox(点.源, 点.盒.slice(1))
      expect(清单.length, `模板里找不到 ${点.盒} 的 svg`).toBeGreaterThan(0)
      for (const [宽, 高] of 清单) {
        expect(宽, `${点.盒} 的 viewBox 非正方形，两轴同值会把图形拉扁`).toBe(高)
      }
    })
  }
})

describe('FP-23 口径③：等高不得拿触控热区兑换（a11y 回归防线）', () => {
  const 热区 = 解析几何数值('--shuru-anniu-re-ku')

  it('热令牌解析值 ≥ 图标盒解析值：35px 的盒外面仍包着 44px 的可点区', () => {
    expect(热区).toBe(44)
    expect(热区, '触控热区被缩到图标盒以下 = WCAG 目标尺寸回归').toBeGreaterThanOrEqual(
      解析几何数值('--shuru-tubiao-chicun'),
    )
  })

  for (const 点 of 图标点清单) {
    const 热区选择器 = `${点.盒}::before`
    it(`${点.页} ${热区选择器} 以 --shuru-anniu-re-ku 外扩两轴，且宿主已 position: relative`, () => {
      const 规则 = 规则体(点.源, 热区选择器)
      expect(规则, `${热区选择器} 缺失：图标缩到 35px 后没有热区补偿`).not.toBe('')
      expect(声明(规则, 'content'), `${热区选择器} 无 content，伪元素不生成`).toBe("''")
      expect(声明(规则, 'position'), `${热区选择器} 未绝对定位`).toBe('absolute')
      expect(引用令牌(规则, 'width'), `${热区选择器} width 未吃热区令牌`).toBe('--shuru-anniu-re-ku')
      expect(引用令牌(规则, 'height'), `${热区选择器} height 未吃热区令牌`).toBe('--shuru-anniu-re-ku')
      expect(规则体(点.源, 点.盒), `${点.盒} 缺 position: relative，热区会锚到别的祖先`)
        .toMatch(/position:\s*relative/)
    })
  }
})

describe('FP-23 口径④：两枚图标令牌不得再做零消费者令牌（BS-1 病理）', () => {
  const 全部源 = [
    ['views/聊天页面.vue', 聊天页源],
    ['views/好友聊天.vue', 好友页源],
  ] as const

  for (const 令牌 of ['--shuru-tubiao-chicun', '--shuru-tubiao-glyph-chicun']) {
    it(`${令牌} 在两页输入区均有活引用，且引用集不为空`, () => {
      const 消费者 = 全部源.filter(([, 源]) => new RegExp(`var\\(\\s*${令牌}\\s*[,)]`).test(源)).map(([名]) => 名)
      expect(消费者, `${令牌} 又退化成零消费者令牌（FP-01 原缺陷）`).toEqual([
        'views/聊天页面.vue',
        'views/好友聊天.vue',
      ])
    })
  }

  it('variables.css 内不再留"图标盒吃它"式的无主声明：两枚令牌各声明一次且住在共用块', () => {
    const 令牌源 = 读('styles/variables.css')
    for (const 令牌 of ['--shuru-tubiao-chicun', '--shuru-tubiao-glyph-chicun']) {
      expect(
        (令牌源.match(new RegExp(`^[ \\t]*${令牌}[ \\t]*:`, 'gm')) ?? []).length,
        `${令牌} 声明处数 ≠ 1`,
      ).toBe(1)
      const 位置 = 声明位置(令牌)
      expect(位置.共用, `${令牌} 未住在共用 :root 块`).toBe(true)
      expect(位置, `${令牌} 被搬进单侧主题块 = 另一档塌陷`).toEqual({
        共用: true,
        浅色: false,
        深色: false,
      })
    }
  })

  it('两页不得再局部声明这两枚令牌（第二真源）', () => {
    for (const [名, 源] of 全部源) {
      for (const 令牌 of ['--shuru-tubiao-chicun', '--shuru-tubiao-glyph-chicun']) {
        expect(
          new RegExp(`^[ \\t]*${令牌}[ \\t]*:`, 'm').test(源),
          `${名} 又局部声明了 ${令牌}`,
        ).toBe(false)
      }
    }
  })
})
