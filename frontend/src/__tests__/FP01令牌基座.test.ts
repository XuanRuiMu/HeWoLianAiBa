import { readFileSync, readdirSync, statSync } from 'node:fs'
import { existsSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { 声明块清单, 按档解析全部, 声明位置, 塌陷令牌清单 } from './主题令牌真源'
import {
  互换文档序,
  比较特异度,
  令牌名,
  层叠焦点环,
  拆解轮廓,
  规则清单,
  type 探针,
  type 规则,
} from './CSS级联真源'

// FP-01 令牌基座契约：卡面 / 选中态阴影与辉光 / 性别与选中框 / 单行几何 / 滚动条光标 + global 焦点环形状。
// 本 FP 只定义令牌与 global 规则源，不改任何 .vue，故这里全部是「令牌层」断言（源码级像素数学）。

const 令牌源码 = readFileSync(resolve(__dirname, '../styles/variables.css'), 'utf8')
const 全局源码 = readFileSync(resolve(__dirname, '../styles/global.css'), 'utf8')
const 块们 = 声明块清单()
const 浅色 = 按档解析全部('light', 块们)
const 深色 = 按档解析全部('dark', 块们)

function 取值(档: 'light' | 'dark', 名: string): string {
  const 表 = 档 === 'light' ? 浅色 : 深色
  const 值 = 表.get(名)
  expect(值, `令牌 ${名} 在 ${档} 档未定义（塌陷）`).toBeDefined()
  return (值 as string).trim()
}

/** 共用 :root 块专属令牌：与主题档无关，只能声明一次 */
function 共用取值(名: string): string {
  const 位置 = 声明位置(名, 块们)
  expect(位置, `${名} 只能住在共用 :root 块`).toEqual({ 共用: true, 浅色: false, 深色: false })
  const 值 = 浅色.get(名)
  expect(值, `${名} 共用块未定义`).toBeDefined()
  expect(深色.get(名), `${名} 两档解析不等`).toBe(值)
  return (值 as string).trim()
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
  const hex = 值.match(/#([0-9a-fA-F]{6})\b/)
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
  throw new Error(`无法从取值解析颜色：${值}`)
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

/** 半透明前景压在实色底上的合成结果（不透明等价色） */
function 压合(前景: { rgb: RGB; alpha: number }, 底色: RGB): RGB {
  return [0, 1, 2].map((i) => 前景.rgb[i] * 前景.alpha + 底色[i] * (1 - 前景.alpha)) as RGB
}

function 通道色差(a: RGB, b: RGB): number {
  return Math.max(...[0, 1, 2].map((i) => Math.abs(a[i] - b[i])))
}

/** 卡面之下真正会出现的两档底色极值：--beijing-zhuse（最狠档）与 --beijing-ciuse */
function 档内底色(档: 'light' | 'dark'): RGB[] {
  return [取值(档, '--beijing-zhuse'), 取值(档, '--beijing-ciuse')].map((值) => 解析色(值).rgb)
}

function 卡面实色(档: 'light' | 'dark'): RGB[] {
  const 面 = 解析色(取值(档, '--moshi-kapian-zheyan'))
  return 档内底色(档).map((底) => 压合(面, 底))
}

const 卡面令牌 = [
  '--moshi-kapian-zheyan',
  '--kapian-mian-biankuang',
  '--kapian-mian-zhengwen',
  '--kapian-mian-biaoti',
] as const

const 选中态令牌 = ['--xuanzhong-wenben-yinying', '--xuanzhong-qiangdiao-yinying'] as const

const 性别基础令牌 = [
  '--xingbie-nan-1',
  '--xingbie-nan-2',
  '--xingbie-nan-wenben',
  '--xingbie-nv-1',
  '--xingbie-nv-2',
  '--xingbie-nv-wenben',
  '--xingbie-zhongxing-1',
  '--xingbie-zhongxing-2',
  '--xingbie-zhongxing-wenben',
] as const

const 选中框令牌 = [
  '--xingbie-nan-xuan-biankuang',
  '--xingbie-nan-xuan-beijing',
  '--xingbie-nan-xuan-wenben',
  '--xingbie-nv-xuan-biankuang',
  '--xingbie-nv-xuan-beijing',
  '--xingbie-nv-xuan-wenben',
  '--xingbie-zhongxing-xuan-biankuang',
  '--xingbie-zhongxing-xuan-beijing',
  '--xingbie-zhongxing-xuan-wenben',
  // FP-15b 补齐的环两层（FP22e 状态环违规账本点名的正确落点：--xingbie-*-xuan-* 一族新增环令牌）
  '--xingbie-nan-xuan-huan',
  '--xingbie-nan-xuan-guangyun',
  '--xingbie-nv-xuan-huan',
  '--xingbie-nv-xuan-guangyun',
] as const

const 几何令牌 = [
  '--shuru-danxing-gao-du',
  '--shuru-tubiao-chicun',
  '--shuru-tubiao-glyph-chicun',
  // FP-22c：输入区度量从 聊天页面.vue / 好友聊天.vue 的 .shuru-rongqi 局部上收到共用 :root，
  // 与本族同规则（量纲与主题档无关）。--shuru-re-ku 那套旧拼法与 --shuru-anniu-re-ku 合一，
  // 保留带部件名的后者（--shuru-<部件>-<属性>）
  '--shuru-kuang-zihao',
  '--shuru-kuang-hangao',
  '--shuru-kuang-hangxing-gao',
  '--shuru-kuang-shang-xia-neidian',
  '--shuru-kuang-zuo-you-neidian',
  '--shuru-kuang-biankuang',
  '--shuru-anniu-re-ku',
  '--gundong-tiao-cursor',
  '--gundong-tiao-huakuai-cursor',
  '--gundong-tiao-guidao-cursor',
  '--jujiao-huan-kuan-du-wenben',
  '--jujiao-huan-pian-yi-wenben',
] as const

const 全部新令牌 = [...卡面令牌, ...选中态令牌, ...选中框令牌]

describe('FP-01 令牌基座：三段式与作用域', () => {
  it('variables.css 仍是三段式（本 FP 未另开第四块）', () => {
    expect(块们.map((块) => 块.选择器)).toEqual([
      ':root',
      ':root[data-theme="light"]',
      ':root, :root[data-theme="dark"]',
    ])
  })

  it('新增色令牌深浅两档均有定义，未进塌陷账本，且两档通道色差 ≥24', () => {
    const 塌陷 = 塌陷令牌清单(块们)
    for (const 名 of 全部新令牌) {
      expect(塌陷.includes(名), `${名} 单侧声明（另一档塌陷）`).toBe(false)
      const 差 = 通道色差(解析色(取值('light', 名)).rgb, 解析色(取值('dark', 名)).rgb)
      expect(差, `${名} 深浅两档通道色差仅 ${差}，不足 24`).toBeGreaterThanOrEqual(24)
    }
  })

  it('几何/光标令牌与主题无关，只住共用 :root 块且两档等值', () => {
    for (const 名 of 几何令牌) 共用取值(名)
    expect(共用取值('--shuru-danxing-gao-du')).toBe('35px')
    expect(共用取值('--shuru-tubiao-chicun')).toBe('var(--shuru-danxing-gao-du)')
    expect(共用取值('--shuru-tubiao-glyph-chicun')).toBe('22px')
    expect(共用取值('--shuru-anniu-re-ku')).toBe('44px')
    // FP-22c 上收的两页输入区度量：取值必须与上收前 .shuru-rongqi 局部逐字相同（零视觉变化）
    expect(共用取值('--shuru-kuang-zihao')).toBe('16px')
    expect(共用取值('--shuru-kuang-hangao')).toBe('1.4')
    expect(共用取值('--shuru-kuang-hangxing-gao')).toBe(
      'calc(var(--shuru-kuang-zihao) * var(--shuru-kuang-hangao))',
    )
    expect(共用取值('--shuru-kuang-shang-xia-neidian')).toBe('6px')
    expect(共用取值('--shuru-kuang-zuo-you-neidian')).toBe('12px')
    expect(共用取值('--shuru-kuang-biankuang')).toBe('0.5px')
  })

  it('滚动条光标统一为普通箭头且不出现 text、pointer 或 grab', () => {
    for (const 名 of [
      '--gundong-tiao-cursor',
      '--gundong-tiao-huakuai-cursor',
      '--gundong-tiao-guidao-cursor',
    ] as const) {
      expect(共用取值(名)).toBe('default')
    }
  })
})

describe('FP-01 卡面组：压在任何一档底色上都读得清', () => {
  it('卡面四件套两档齐备', () => {
    for (const 名 of 卡面令牌) {
      for (const 档 of ['light', 'dark'] as const) expect(取值(档, 名)).not.toBe('')
    }
  })

  it('卡面内正文/标题对「卡面压在两档底色极值上」的对比度均 ≥7:1', () => {
    for (const 档 of ['light', 'dark'] as const) {
      const 面 = 卡面实色(档)
      for (const 名 of ['--kapian-mian-zhengwen', '--kapian-mian-biaoti'] as const) {
        const 字 = 解析色(取值(档, 名))
        面.forEach((底, i) => {
          const 实际 = 对比度(压合(字, 底), 底)
          expect(
            实际,
            `${档} 档 ${名} 在第 ${i + 1} 组底色上对比度 ${实际.toFixed(2)}`,
          ).toBeGreaterThanOrEqual(7)
        })
      }
    }
  })

  it('卡面边框压在卡面上与卡面对比度 ≥3:1（可辨边界，不再是 .13 alpha 的隐形边）', () => {
    for (const 档 of ['light', 'dark'] as const) {
      卡面实色(档).forEach((底) => {
        const 边 = 压合(解析色(取值(档, '--kapian-mian-biankuang')), 底)
        expect(对比度(边, 底), `${档} 档卡面边框不可辨`).toBeGreaterThanOrEqual(3)
      })
    }
  })

  it('卡面底色本身在两档之间是"亮卡面 vs 暗卡面"，通道差 ≥24 且亮度反向', () => {
    const 亮 = 相对亮度(卡面实色('light')[0])
    const 暗 = 相对亮度(卡面实色('dark')[0])
    expect(亮 - 暗).toBeGreaterThan(0.6)
    expect(通道色差(卡面实色('light')[0], 卡面实色('dark')[0])).toBeGreaterThanOrEqual(24)
  })
})

describe('FP-01 选中态文字阴影/辉光：两档各自"在其底色上可分辨"', () => {
  it('阴影色两档通道差 ≥24，且方向正确——深色档=亮辉光、浅色档=暗阴影', () => {
    for (const 名 of 选中态令牌) {
      const 浅 = 解析色(取值('light', 名))
      const 深 = 解析色(取值('dark', 名))
      expect(通道色差(浅.rgb, 深.rgb), `${名} 两档阴影色同色`).toBeGreaterThanOrEqual(24)
      const 浅面 = 卡面实色('light')[0]
      const 深面 = 卡面实色('dark')[0]
      const 浅有效 = 相对亮度(压合(浅, 浅面))
      const 深有效 = 相对亮度(压合(深, 深面))
      // 病灶：黑色阴影写在深色 baseline 上 → 与底色同明度，选中态读不出来
      expect(深有效 - 相对亮度(深面), `${名} 深色档不是亮于底色的辉光`).toBeGreaterThan(0.15)
      expect(相对亮度(浅面) - 浅有效, `${名} 浅色档不是暗于底色的阴影`).toBeGreaterThan(0.15)
    }
  })

  it('阴影令牌是完整 box/text-shadow 值（含偏移与模糊半径），消费方直接引用不再补数字', () => {
    for (const 名 of 选中态令牌) {
      for (const 档 of ['light', 'dark'] as const) {
        expect(取值(档, 名)).toMatch(/^-?[\d.]+px -?[\d.]+px [\d.]+px rgba?\(/)
      }
    }
  })
})

describe('FP-01 性别组：深色档补齐可辨识取值', () => {
  /**
   * 已知缺陷账本（`档:组:止`）。FP-15b 已修 `light:nv:1`（旧 #e6a9be 白字 1.95:1 →
   * 新 #a34f74 白字 5.35:1），账本清空 ⇒ 六组「字 ≥3:1 于底色 / -1 ≥3:1 于卡面」判据
   * 现在对全部组合生效（改前是跳过一条，属收紧而非放宽）。
   */
  const 已知缺陷: string[] = []

  it('性别底色 -1/-2 两档通道差 ≥24（原病灶：深浅两档字面同值）', () => {
    for (const 名 of 性别基础令牌.filter((项) => !项.endsWith('wenben'))) {
      const 差 = 通道色差(解析色(取值('light', 名)).rgb, 解析色(取值('dark', 名)).rgb)
      expect(差, `${名} 深浅两档仍同值（差 ${差}）`).toBeGreaterThanOrEqual(24)
    }
  })

  it('性别底色两档：同档文字对比 ≥3，-1 与同档卡面分离 ≥3', () => {
    for (const 档 of ['light', 'dark'] as const) {
      const 面 = 卡面实色(档)
      for (const 组 of ['nan', 'nv', 'zhongxing'] as const) {
        const 字 = 解析色(取值(档, `--xingbie-${组}-wenben`))
        for (const 止 of ['1', '2'] as const) {
          if (已知缺陷.includes(`${档}:${组}:${止}`)) continue
          const 底 = 解析色(取值(档, `--xingbie-${组}-${止}`))
          const 实底 = 压合(底, 底.rgb)
          expect(
            对比度(压合(字, 底.rgb), 底.rgb),
            `${档} 档 --xingbie-${组}-${止} 上的字看不清`,
          ).toBeGreaterThanOrEqual(3)
          if (止 === '1') {
            面.forEach((卡) =>
              expect(
                对比度(实底, 卡),
                `${档} 档 --xingbie-${组}-1 与卡面无分离`,
              ).toBeGreaterThanOrEqual(3),
            )
          }
        }
      }
    }
  })
})

describe('FP-01 性别选中框三件套', () => {
  it('边框对卡面 ≥3、文字对染色底 ≥7、染色底对卡面通道差 ≥24，两档各自达标', () => {
    for (const 组 of ['nan', 'nv', 'zhongxing'] as const) {
      for (const 档 of ['light', 'dark'] as const) {
        const 面 = 卡面实色(档)
        const 边 = 解析色(取值(档, `--xingbie-${组}-xuan-biankuang`))
        const 染 = 解析色(取值(档, `--xingbie-${组}-xuan-beijing`))
        const 字 = 解析色(取值(档, `--xingbie-${组}-xuan-wenben`))
        面.forEach((卡) => {
          expect(对比度(压合(边, 卡), 卡), `${档} ${组} 选中框边框不可辨`).toBeGreaterThanOrEqual(3)
          const 染后 = 压合(染, 卡)
          expect(通道色差(染后, 卡), `${档} ${组} 选中框底色 wash 不出来`).toBeGreaterThanOrEqual(
            24,
          )
          expect(
            对比度(压合(字, 染后), 染后),
            `${档} ${组} 选中框文字对比不足`,
          ).toBeGreaterThanOrEqual(7)
        })
      }
    }
  })
})

describe('FP-01 global.css 滚动条单一真源', () => {
  it('滚动条三态光标全部消费 --gundong-tiao-*-cursor 令牌', () => {
    expect(全局源码).toMatch(/::-webkit-scrollbar\s*\{[^}]*cursor:\s*var\(--gundong-tiao-cursor\)/)
    expect(全局源码).toMatch(
      /::-webkit-scrollbar-track\s*\{[^}]*cursor:\s*var\(--gundong-tiao-guidao-cursor\)/,
    )
    expect(全局源码).toMatch(
      /::-webkit-scrollbar-thumb(?:[^}]*)\{[^}]*cursor:\s*var\(--gundong-tiao-huakuai-cursor\)/,
    )
  })

  it('滚动条规则源完备：track/thumb/thumb:hover/corner + Firefox 分支', () => {
    for (const 选择器 of [
      '::-webkit-scrollbar',
      '::-webkit-scrollbar-track',
      '::-webkit-scrollbar-thumb',
      '::-webkit-scrollbar-thumb:hover',
      '::-webkit-scrollbar-corner',
    ]) {
      expect(全局源码.includes(选择器), `global.css 缺 ${选择器}`).toBe(true)
    }
    expect(全局源码).toMatch(/::-webkit-scrollbar-corner\s*\{[^}]*background:\s*transparent/)
    expect(全局源码).toMatch(
      /scrollbar-color:\s*var\(--gundong-tiao-huakuai\)\s+var\(--gundong-tiao-guidao\)/,
    )
  })

  it('FP-20：全库 ::-webkit-scrollbar* 规则的 cursor 只准消费 --gundong-tiao-*-cursor 令牌，不得出现 text', () => {
    const 允许令牌 = new Set([
      '--gundong-tiao-cursor',
      '--gundong-tiao-huakuai-cursor',
      '--gundong-tiao-guidao-cursor',
    ])
    const 遍历 = (目录: string): string[] => {
      const 结果: string[] = []
      for (const 项 of readdirSync(目录)) {
        if (项 === '__tests__') continue
        const 全路径 = resolve(目录, 项)
        if (statSync(全路径).isDirectory()) 结果.push(...遍历(全路径))
        else if (项.endsWith('.vue') || 项.endsWith('.css')) 结果.push(全路径)
      }
      return 结果
    }
    const 根 = resolve(__dirname, '..')
    const 样式文本 = (源: string, 文件: string): string =>
      文件.endsWith('.vue')
        ? [...源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
        : 源
    const 违规: string[] = []
    let 命中 = 0
    for (const 文件 of 遍历(根)) {
      const 相对 = 文件.slice(根.length + 1).split(sep).join('/')
      const 源 = readFileSync(文件, 'utf8')
      for (const 规则 of 规则清单(样式文本(源, 文件))) {
        if (!规则.选择器.includes('::-webkit-scrollbar')) continue
        命中++
        const 值 = 规则.声明.get('cursor')
        if (值 === undefined) continue
        const 匹 = /^var\(\s*(--gundong-tiao-(?:cursor|huakuai-cursor|guidao-cursor))\s*\)$/.exec(
          值,
        )
        if (!匹 || !允许令牌.has(匹[1])) 违规.push(`${相对} ${规则.选择器} cursor: ${值}`)
        if (/(^|[\s:,(])text\b/.test(值)) 违规.push(`${相对} ${规则.选择器} 禁止 cursor: text`)
      }
    }
    expect(命中, '全库未扫到任何 ::-webkit-scrollbar 规则，取样口径失效').toBeGreaterThan(0)
    expect(违规, '滚动条 cursor 必须 ∈ var(--gundong-tiao-*-cursor)，且不得是 text').toEqual([])
  })
})

describe('FP-01 global.css 焦点环：令牌驱动单一规则源，不再靠源码顺序压制', () => {
  const 规则们 = 规则清单(全局源码)
  /** 层叠判定的两个探针：文本控件吃窄环，checkbox 这类非文本 input 吃标准环 */
  const 文本控件: 探针 = { 标签: 'input', 类: ['shuru-kuang'], 属性: {}, 焦点可见: true }
  const 非文本控件: 探针 = { 标签: 'input', 类: [], 属性: { type: 'checkbox' }, 焦点可见: true }

  it('outline 绘制只由"标准环 + 文本控件窄环"两条规则产生，取值全走令牌', () => {
    const 画环 = 规则们.filter((项) => 项.声明.has('outline'))
    expect(画环).toHaveLength(2)
    // 旧断言把两条声明文本逐字比到toEqual里（`var(--a) solid var(--b)` 差一个空格/折行/
    // 部件换序就假红）。这里比的是**拆解并代入真源后的成分对**：宽令牌 → 偏移令牌。
    const 配对 = Object.fromEntries(
      画环.map((项) => {
        const 形 = 拆解轮廓(项.声明.get('outline') as string)
        expect(形.样式).toBe('solid')
        expect(形.颜色令牌).toBe('--jujiao-huan-yanse')
        return [形.宽度令牌, 令牌名(项.声明.get('outline-offset') as string, 'outline-offset')]
      }),
    )
    expect(配对).toEqual({
      '--jujiao-huan-kuan-du': '--jujiao-huan-pian-yi',
      '--jujiao-huan-kuan-du-wenben': '--jujiao-huan-pian-yi-wenben',
    })
  })

  it('文本控件档靠**特异度**压过标准环：判定用层叠结果，不用源码下标（与书写顺序无关）', () => {
    const 窄环 = 层叠焦点环(规则们, 文本控件)
    const 标准环 = 层叠焦点环(规则们, 非文本控件)
    expect(窄环.规则.选择器).not.toBe(标准环.规则.选择器)
    // 「与源码顺序无关」这句话的全部依据是特异度**严格不等**，而不是"写在后面"
    expect(标准环.特异度).toEqual([0, 0, 0])
    expect(窄环.特异度).toEqual([0, 1, 0])
    expect(比较特异度(窄环.特异度, 标准环.特异度)).toBeGreaterThan(0)
    // 解析后的生效像素（var() 代入 + 真源求值），不是声明文本
    expect(窄环.宽度令牌).toBe('--jujiao-huan-kuan-du-wenben')
    expect(窄环.宽度像素).toBe(1)
    expect(窄环.偏移像素).toBe(0)
    expect(标准环.宽度令牌).toBe('--jujiao-huan-kuan-du')
    expect(标准环.宽度像素).toBe(2)
    expect(标准环.偏移像素).toBe(2)

    // 反证①（旧断言会假红的等价改写）：把两条规则的文档序整体互换，运行时结果一字不变。
    const 换位 = 互换文档序(规则们, 窄环.规则.选择器, 标准环.规则.选择器)
    const 换位窄环 = 换位.find((项) => 项.选择器 === 窄环.规则.选择器) as 规则
    const 换位标准环 = 换位.find((项) => 项.选择器 === 标准环.规则.选择器) as 规则
    expect(窄环.规则.序号 > 标准环.规则.序号).toBe(true)
    expect(换位窄环.序号 > 换位标准环.序号).toBe(false) // ← 旧 `search()` 下标断言在此翻脸
    expect(层叠焦点环(换位, 文本控件).宽度像素).toBe(1) // ← 层叠结果不动
    expect(层叠焦点环(换位, 非文本控件).宽度像素).toBe(2)

    // 反证②（旧断言看不见的真实回归）：窄环选择器漏登记一个控件类 ⇒ 该类掉回 2px 宽环。
    // 文档序与声明文本都没变，旧的"下标 + 逐字声明"两层断言都仍绿；层叠判定当场红。
    const 夹具源 =
      ':where(:focus-visible){outline: var(--jujiao-huan-kuan-du) solid var(--jujiao-huan-yanse);' +
      'outline-offset: var(--jujiao-huan-pian-yi);}' +
      ':where(.shuru-kuang, .fenlie-shuru):focus-visible{outline: var(--jujiao-huan-kuan-du-wenben) solid' +
      ' var(--jujiao-huan-yanse);outline-offset: var(--jujiao-huan-pian-yi-wenben);}'
    const 坏夹具源 = 夹具源.replace('.shuru-kuang, ', '')
    const 夹具规则 = 规则清单(夹具源)
    const 坏夹具规则 = 规则清单(坏夹具源)
    // 旧断言的两个操作数在坏夹具里一个都没动：下标序照旧、声明文本照旧 ⇒ 两层都假绿
    expect(坏夹具源.search(/:where\(:focus-visible\)\s*\{/)).toBeLessThan(
      坏夹具源.search(/\):focus-visible\s*\{\s*outline:\s*var\(--jujiao-huan-kuan-du-wenben\)/),
    )
    const 坏夹具窄环声明 = (坏夹具规则.find((项) => 项.声明.get('outline')?.includes('-wenben')) as 规则)
      .声明.get('outline') as string
    expect(拆解轮廓(坏夹具窄环声明).宽度令牌).toBe('--jujiao-huan-kuan-du-wenben')
    expect(层叠焦点环(夹具规则, 文本控件).宽度像素).toBe(1)
    expect(层叠焦点环(坏夹具规则, 文本控件).宽度像素).toBe(2)
  })

  it('文本控件豁免改为"收窄环"而非 outline:none，仍给出等效可见焦点指示', () => {
    expect(全局源码).not.toMatch(/outline:\s*none/)
    expect(全局源码).toMatch(/:where\(\s*input:not\(\[type='checkbox'\]/)
    expect(共用取值('--jujiao-huan-kuan-du-wenben')).toBe('1px')
    expect(共用取值('--jujiao-huan-pian-yi-wenben')).toBe('0px')
  })

  it('焦点环颜色仍走暖灰蓝品牌档且明暗互异（不被改回文本色）', () => {
    expect(取值('light', '--jujiao-huan-yanse')).toBe('#5a7a94')
    expect(取值('dark', '--jujiao-huan-yanse')).toBe('#8eafc5')
    expect(全局源码).not.toMatch(/outline:[^;]*var\(--wenben-zhuse\)/)
  })
})

describe('FP-01 孤立 theme.css 已被移除', () => {
  it('styles/theme.css 不再存在', () => {
    expect(existsSync(resolve(__dirname, '../styles/theme.css'))).toBe(false)
  })

  it('全仓源码零引用 theme.css（入口清单与 @import 都不含它）', () => {
    const 入口 = readFileSync(resolve(__dirname, '../main.ts'), 'utf8')
    expect(入口).not.toMatch(/theme\.css/)
    expect(令牌源码).not.toMatch(/@import/)
    expect(全局源码.match(/@import[^;]+;/g)).toEqual(["@import './variables.css';"])
  })
})

describe('FP-01 已知既有缺陷账本（新增即红，修复即红——强制 conscious 同步）', () => {
  it('浅色档 --xingbie-nv-1 白字对比已由 FP-15b 修到 ≥4.5:1（旧值 #e6a9be 实测 1.95:1）', () => {
    const 底 = 解析色(取值('light', '--xingbie-nv-1'))
    const 字 = 解析色(取值('light', '--xingbie-nv-wenben'))
    const 实际 = 对比度(压合(字, 底.rgb), 底.rgb)
    expect(
      实际,
      `浅色粉白字实测 ${实际.toFixed(2)}——FP-15b 把 #e6a9be 抬到 #a34f74，判据由 <3 改为 ≥4.5`,
    ).toBeGreaterThanOrEqual(4.5)
  })
})
