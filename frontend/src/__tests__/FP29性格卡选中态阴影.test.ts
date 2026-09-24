import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { 令牌名, 层叠胜出, 规则清单, type 探针, type 规则 } from './CSS级联真源'
import { 声明块清单, 按档解析全部, 塌陷令牌清单, 声明位置, type 主题档 } from './主题令牌真源'

/**
 * FP-29（需求 #17）：选中性格卡片的标题阴影必须**深浅两档均可辨**，且一律吃 FP-01 的
 * `--xuanzhong-wenben-yinying` / `--xuanzhong-qiangdiao-yinying`（这两枚落地前全库零消费者
 * ＝需求 #17 此前无人认领的机器证据）。
 *
 * 判据层级（FP-24b 立的口径）：
 *  - 「组件到底吃不吃令牌」= `CSS级联真源::层叠胜出` 的**结果** + `令牌名()`（非单一 var() 即抛错）；
 *  - 「两档看不看得见」= variables.css 真源解析出 rgba，压到**由组件规则自己算出的卡面**上，
 *    比 Δmax 与相对亮度差；页底用纯黑/纯白夹逼（FP-16 同法），文字阴影另按高斯峰值稀释复核；
 *  - 「同类点穷尽」= 源码层账本（与 FP22e 状态环账本同口径：新增即红、改完不删条目也红）。
 *    账本只是清单，不充当可辨性判据。
 */

const 源码根 = resolve(__dirname, '..')
const 块们 = 声明块清单()
const 令牌表: Record<主题档, Map<string, string>> = {
  light: 按档解析全部('light', 块们),
  dark: 按档解析全部('dark', 块们),
}

const 文字令牌 = '--xuanzhong-wenben-yinying'
const 辉光令牌 = '--xuanzhong-qiangdiao-yinying'
const 可见下限 = 24 // 本任务"可见条带"口径（FP-03 / FP-27 同判据）
const 亮度下限 = 0.15 // FP-01 两档方向判据同一下限
const 笔画宽 = 2 // 11–14px 字重的标题笔画量级

type RGB = [number, number, number]
interface 色 {
  rgb: RGB
  alpha: number
}
interface 阴影层 {
  内: boolean
  偏移X: number
  偏移Y: number
  模糊: number
  扩散: number
  色: 色
}

/** 改前组件里的四条字面量（原样抄回，只用于钉"这就是需求 #17 的病灶"） */
const 改前 = {
  代号阴影: { rgb: [0, 0, 0], alpha: 0.4 } as 色,
  中文阴影: { rgb: [0, 0, 0], alpha: 0.35 } as 色,
  卡辉光: { rgb: [217, 140, 166], alpha: 0.28 } as 色,
  卡辉光浅: { rgb: [196, 87, 126], alpha: 0.25 } as 色,
}

function 解析色(值: string): 色 {
  const 函数 = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/.exec(值)
  if (函数)
    return {
      rgb: [Number(函数[1]), Number(函数[2]), Number(函数[3])] as RGB,
      alpha: 函数[4] === undefined ? 1 : Number(函数[4]),
    }
  const 十六 = /#([0-9a-fA-F]{6})\b/.exec(值)
  if (十六) {
    const h = 十六[1] as string
    return {
      rgb: [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ] as RGB,
      alpha: 1,
    }
  }
  throw new Error(`取不到颜色：${值}`)
}

/** 顶层逗号/空格切分（括号内的不算：`rgba(20, 24, 33, .22)` 是一个整体） */
function 切顶层(串: string, 分: ',' | ' '): string[] {
  const 结果: string[] = []
  let 缓冲 = ''
  let 深度 = 0
  for (const c of 串) {
    if (c === '(' || c === '[') 深度++
    else if (c === ')' || c === ']') 深度--
    if (c === 分 && 深度 === 0) {
      if (缓冲) 结果.push(缓冲.trim())
      缓冲 = ''
      continue
    }
    缓冲 += c
  }
  if (缓冲.trim()) 结果.push(缓冲.trim())
  return 结果
}

/** 把 `var()` 全部代入该档 variables.css 真源；引用未定义令牌即抛错（幻影令牌不得静默放行） */
function 展开令牌(串: string, 档: 主题档): string {
  let 式 = 串
  for (let i = 0; i < 8; i++) {
    const 匹配 = /var\(\s*(--[A-Za-z0-9-]+)\s*\)/.exec(式)
    if (!匹配) return 式
    const 值 = 令牌表[档].get(匹配[1] as string)
    if (值 === undefined) throw new Error(`variables.css 未定义令牌 ${匹配[1]}`)
    式 = 式.replace(匹配[0], 值)
  }
  throw new Error(`var() 嵌套过深：${串}`)
}

/** 阴影串 → 层数组。部件只认 inset / 长度 / 一个颜色，超出即抛错，绝不给近似值 */
function 解析阴影(串: string, 档: 主题档): 阴影层[] {
  return 切顶层(展开令牌(串, 档), ',').map((层串) => {
    const 部件 = 切顶层(层串, ' ')
    const 内 = 部件[0] === 'inset'
    const 数值 = 部件.filter((项) => /^(-?[\d.]+px|0)$/.test(项)).map((项) => Number(项.replace(/px$/, '')))
    const 色部 = 部件.filter((项) => !/^(-?[\d.]+px|0)$/.test(项))
    if (数值.length > 4) throw new Error(`阴影层长度部件过多：${层串}`)
    if (色部.length !== 1) throw new Error(`阴影层颜色不唯一或缺失：${层串}`)
    const 色 = 解析色(色部[0] as string)
    const [偏移X = 0, 偏移Y = 0, 模糊 = 0, 扩散 = 0] = 数值
    return { 内, 偏移X, 偏移Y, 模糊, 扩散, 色 }
  })
}

const 线性 = (v: number): number => {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}
const 相对亮度 = (色: 色): number =>
  0.2126 * 线性(色.rgb[0]) + 0.7152 * 线性(色.rgb[1]) + 0.0722 * 线性(色.rgb[2])
const 通道差 = (a: RGB, b: RGB): number => Math.max(...[0, 1, 2].map((i) => Math.abs(a[i] - b[i])))
const 压合 = (上: 色, 下: RGB): RGB =>
  [0, 1, 2].map((i) => 上.rgb[i] * 上.alpha + 下[i] * (1 - 上.alpha)) as RGB
const 亮度差 = (上: 色, 下: RGB): number =>
  相对亮度({ rgb: 压合(上, 下), alpha: 1 }) - 相对亮度({ rgb: 下, alpha: 1 })

/**
 * 名义 alpha 在模糊后被稀释成笔画中心真正能达到的**峰值**：CSS blur 半径 ≈ 2σ，
 * 宽 2px 的笔画与高斯核卷积后峰值系数 ≈ 笔画宽 /(σ√(2π))。8px 模糊能把 .55 摊成 ≈.11 的雾。
 * 只有文字阴影需要这个口径；卡外辉光画在大面积平面上、不被笔画稀释，故按名义值判。
 */
function 峰值色(层: 阴影层): 色 {
  const σ = Math.max(层.模糊 / 2, 0.0001)
  return { rgb: 层.色.rgb, alpha: 层.色.alpha * Math.min(1, 笔画宽 / (σ * Math.sqrt(2 * Math.PI))) }
}

function 读样式块(相对路径: string): string {
  const 源 = readFileSync(join(源码根, 相对路径), 'utf8')
  const 段: string[] = []
  for (const 匹配 of 源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) 段.push(匹配[1] as string)
  if (!段.length) throw new Error(`${相对路径} 找不到 <style> 块`)
  return 段.join('\n')
}

function 规则of(相对路径: string): 规则[] {
  return 规则清单(相对路径.endsWith('.css') ? readFileSync(join(源码根, 相对路径), 'utf8') : 读样式块(相对路径))
}

const 向导规则 = 规则of('views/资料设置向导.vue')

function 根探针(档: 主题档): 探针 {
  return { 标签: 'root', 属性: { 'data-theme': 档 } }
}
function 向导祖先(档: 主题档): 探针[] {
  return [根探针(档), { 标签: 'div', 类: ['ziliao-shezhi'] }]
}
function 向导卡探针(档: 主题档): 探针 {
  return { 标签: 'div', 类: ['ziliao-kapian'], 属性: {}, 祖先链: 向导祖先(档) }
}
function 性格卡探针(档: 主题档, 选中: boolean, 随机 = false): 探针 {
  return {
    标签: 'button',
    类: ['mbti-kaPian', ...(随机 ? ['suiJi-kaPian'] : []), ...(选中 ? ['beiXuanZhong'] : [])],
    属性: {},
    祖先链: [...向导祖先(档), 向导卡探针(档)],
  }
}
function 网格探针(档: 主题档): 探针 {
  return {
    标签: 'div',
    类: ['mbti-wangGe'],
    属性: {},
    祖先链: [...向导祖先(档), 向导卡探针(档)],
  }
}
function 标题探针(档: 主题档, 类: 'mbti-daiMa' | 'mbti-zhongWen', 选中: boolean): 探针 {
  return {
    标签: 'span',
    类: [类],
    属性: {},
    祖先链: [...向导祖先(档), 向导卡探针(档), 网格探针(档), 性格卡探针(档, 选中)],
  }
}

/**
 * 该档下探针上**层叠胜出**的阴影串（与书写位置/空白无关）；无声明返回空串。
 * 探针自带主题根，这里核对"探针的档 == 解析令牌的档"，防复制粘贴串档。
 */
function 层叠串(属性: 'text-shadow' | 'box-shadow', 探针: 探针, 档: 主题档): string {
  const 根 = 探针.祖先链 ? (探针.祖先链[0] as 探针) : undefined
  if (!根 || (根.属性 ?? {})['data-theme'] !== 档)
    throw new Error(`探针所在主题档 ${根 ? (根.属性 ?? {})['data-theme'] : '无根'} 与解析档 ${档} 不一致`)
  const 胜出 = 层叠胜出(向导规则, 探针, 属性)
  return 胜出 ? 胜出.值 : ''
}

/** 卡面 = 性格卡背景压在向导卡面上；两层背景都由组件规则自己声明，不抄常量 */
function 卡面(档: 主题档, 页底: RGB): { 卡: RGB; 父: RGB } {
  const 父 = 压合(取背景(向导卡探针(档)), 页底)
  return { 卡: 压合(取背景(性格卡探针(档, true)), 父), 父 }
}

function 取背景(探针: 探针): 色 {
  const 简写 = 层叠胜出(向导规则, 探针, 'background')
  const 长写 = 层叠胜出(向导规则, 探针, 'background-color')
  const 胜出 = !简写 ? 长写 : !长写 ? 简写 : 长写.特异度 > 简写.特异度 ? 长写 : 简写
  if (!胜出) throw new Error(`探针 ${JSON.stringify(探针.类)} 上没有任何背景声明`)
  if (/gradient\(/.test(胜出.值))
    throw new Error(`背景是渐变，本文件未建模这一形态：${胜出.值}`)
  return 解析色(胜出.值)
}

const 夹逼页底: Record<主题档, { 名: string; 底: RGB; 真实: boolean }[]> = {
  light: [
    { 名: '页底=纯白（浅色档真实底色方向）', 底: [255, 255, 255], 真实: true },
    { 名: '页底=纯黑（反向夹逼）', 底: [0, 0, 0], 真实: false },
  ],
  dark: [
    { 名: '页底=纯黑（深色档真实底色方向）', 底: [0, 0, 0], 真实: true },
    { 名: '页底=纯白（反向夹逼）', 底: [255, 255, 255], 真实: false },
  ],
}

function 源码清单(相对目录 = ''): string[] {
  const 跳过 = new Set(['node_modules', 'dist', '__tests__', 'coverage'])
  const 出: string[] = []
  const 走 = (目录: string): void => {
    for (const 项 of readdirSync(目录, { withFileTypes: true })) {
      if (项.isDirectory()) {
        if (!跳过.has(项.name)) 走(join(目录, 项.name))
      } else if (/\.(vue|css)$/.test(项.name)) {
        出.push(join(目录, 项.name).slice(源码根.length + 1).replace(/\\/g, '/'))
      }
    }
  }
  走(join(源码根, 相对目录))
  return 出.sort()
}

function 剥注释(源: string): string {
  return 源.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
}

const 选中语义 = /(beiXuanZhong|xuanZhong|dangQian|:checked)/
const 有字面色 = (层: string): boolean => /#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(/.test(层)

interface 账本项 {
  键: string
  归属: string
  理由: string
}

/** 全库「选中态阴影」里仍带颜色字面量的层（形状字面量另论：FP-22e 冻的正是环形状） */
function 选中态违规层(): string[] {
  const 结果: string[] = []
  for (const 文件 of [...源码清单('views'), ...源码清单('components')]) {
    for (const 块 of 规则of(文件)) {
      if (!选中语义.test(块.选择器)) continue
      for (const 属性 of ['text-shadow', 'box-shadow'] as const) {
        const 值 = 块.声明.get(属性)
        if (!值) continue
        for (const 层 of 切顶层(值, ',')) {
          if (有字面色(层))
            结果.push(`${文件}|${块.选择器}|${属性}|${层.replace(/\s+/g, ' ').trim()}`)
        }
      }
    }
  }
  return [...new Set(结果)].sort()
}

/** 全库 text-shadow 仍带字面量的点（不分状态）；`none` 与纯令牌都不算 */
function 文字阴影字面量点(): string[] {
  const 结果: string[] = []
  for (const 文件 of 源码清单()) {
    for (const 块 of 规则of(文件)) {
      const 值 = 块.声明.get('text-shadow')
      if (!值 || !/[\d.]+px/.test(值)) continue
      for (const 层 of 切顶层(值, ',')) {
        if (/[\d.]+px/.test(层)) 结果.push(`${文件}|${块.选择器}|text-shadow|${层.replace(/\s+/g, ' ').trim()}`)
      }
    }
  }
  return [...new Set(结果)].sort()
}

const 选中态阴影账本: 账本项[] = [
  // FP-22g 清账：深/浅两档选中卡 box-shadow 的 inset 0 0 0 2px #ff2d95 层已改吃
  // var(--xuanzhong-huan-yanse)（值原样收编），字面量层消失 ⇒ 按"改完请删条目"删对应两
  // 条（原 归属 FP-22g ①/②）。下方两条硬光晕层保留：rgba 字面量仍在源码，归④像素取证。
  {
    键: 'views/过往战绩.vue|.zhanji-kapian.xuanZhong > .zhanji-kapian-nei|box-shadow|4px 4px 0 rgba(255, 45, 149, 0.35)',
    归属: 'FP-22g ①',
    理由: '选中态硬光晕层（magenta），FP-22g①「环与光晕割裂」的裁决对象，须像素取证',
  },
  {
    键: "views/过往战绩.vue|:root[data-theme='light'] .zhanji-kapian.xuanZhong > .zhanji-kapian-nei|box-shadow|4px 4px 0 rgba(255, 45, 149, 0.45)",
    归属: 'FP-22g ①',
    理由: '同上（浅色档硬光晕层）',
  },
]

const 文字阴影字面量账本: 账本项[] = [
  {
    键: 'views/登录内容.vue|.biaodan-biaoti|text-shadow|0 2px 10px rgba(0, 0, 0, 0.35)',
    归属: 'FP-20',
    理由:
      '认证卡标题（非选中态）。登录内容.vue 本波归 FP-03/FP-05 且列禁止触碰；' +
      '两档可辨性此处无缺陷（深底亮字 + 暗阴影），令牌化归收口审计',
  },
  {
    键: 'views/资料设置向导.vue|.zhaNv-tishi-huaxian|text-shadow|0 0 8px rgba(255, 215, 0, 0.3)',
    归属: 'FP-20',
    理由: '提示文案金色下划线（非选中态，与本单判据不同族）；形状收编待令牌穷尽审计',
  },
]

describe('FP-29 令牌归位：两档成对 + 终结"FP-01 造完没人接"', () => {
  for (const 令牌 of [文字令牌, 辉光令牌]) {
    it(`${令牌} 深浅两档均有定义且不在塌陷账本`, () => {
      const 位 = 声明位置(令牌, 块们)
      expect(位.浅色, `${令牌} 缺 :root[data-theme="light"] 档定义`).toBe(true)
      expect(位.深色, `${令牌} 缺深色 baseline 档定义`).toBe(true)
      expect(塌陷令牌清单(块们), `${令牌} 只在单侧主题块声明`).not.toContain(令牌)
    })

    it(`${令牌} 消费者 ≥1（零消费者令牌＝需求 #17 无人认领的机器证据）`, () => {
      const 正则 = new RegExp(`var\\(\\s*${令牌.replace(/-/g, '\\-')}\\s*[,)]`)
      const 命中 = 源码清单().filter(
        (文件) =>
          !文件.endsWith('styles/variables.css') &&
          正则.test(剥注释(readFileSync(join(源码根, 文件), 'utf8'))),
      )
      expect(命中.length, `${令牌} 全库零消费者`).toBeGreaterThanOrEqual(1)
      expect(命中, `${令牌} 的消费者必须落在被治理的性格卡视图`).toContain('views/资料设置向导.vue')
    })
  }

  it('档位归属实测：暗阴影住在浅色块、亮辉光住在深色 baseline（派单把 :207-208 记成深色档，实为浅色档）', () => {
    const 探针 = 标题探针('light', 'mbti-zhongWen', true)
    const 浅层 = 解析阴影(层叠串('text-shadow', 探针, 'light'), 'light')
    const 深层 = 解析阴影(层叠串('text-shadow', 标题探针('dark', 'mbti-zhongWen', true), 'dark'), 'dark')
    const 浅面 = 卡面('light', [255, 255, 255]).卡
    const 深面 = 卡面('dark', [0, 0, 0]).卡
    expect(亮度差((浅层[0] as 阴影层).色, 浅面), '浅色档标题阴影应暗于卡面').toBeLessThan(0)
    expect(亮度差((深层[0] as 阴影层).色, 深面), '深色档标题阴影应亮于卡面').toBeGreaterThan(0)
  })
})

describe('FP-29 组件吃令牌：层叠胜出值必须是单一 var()，组件内零字面量', () => {
  for (const 档 of ['dark', 'light'] as 主题档[]) {
    it(`${档} 档：标题两枚 text-shadow 与两卡 box-shadow 全部吃 --xuanzhong-*（含随机性格卡）`, () => {
      for (const 类 of ['mbti-daiMa', 'mbti-zhongWen'] as const) {
        const 值 = 层叠串('text-shadow', 标题探针(档, 类, true), 档)
        expect(值, `${类} 选中态没有 text-shadow`).not.toBe('')
        expect(令牌名(值, `${档}/${类} text-shadow`)).toBe(文字令牌)
      }
      for (const 随机 of [false, true]) {
        const 值 = 层叠串('box-shadow', 性格卡探针(档, true, 随机), 档)
        expect(值, '选中卡没有 box-shadow').not.toBe('')
        expect(令牌名(值, `${档} box-shadow`)).toBe(辉光令牌)
      }
    })

    it(`${档} 档：未选中卡一条阴影都不许有（选中态语义不得泄漏到静置态）`, () => {
      for (const 属性 of ['text-shadow', 'box-shadow'] as const) {
        expect(层叠胜出(向导规则, 性格卡探针(档, false), 属性), `${属性} 泄漏到静置卡`).toBeNull()
        for (const 类 of ['mbti-daiMa', 'mbti-zhongWen'] as const)
          expect(
            层叠胜出(向导规则, 标题探针(档, 类, false), 属性),
            `${属性} 泄漏到静置标题`,
          ).toBeNull()
      }
    })

    it(`${档} 档：选中态阴影只由一条不带主题前缀的规则给出（浅色档不得再写第二份）`, () => {
      for (const [属性, 探针] of [
        ['box-shadow', 性格卡探针('light', true)],
        ['text-shadow', 标题探针('light', 'mbti-zhongWen', true)],
        ['text-shadow', 标题探针('light', 'mbti-daiMa', true)],
      ] as const) {
        const 胜出 = 层叠胜出(向导规则, 探针, 属性)
        expect(胜出, `${属性} 在浅色档失踪`).not.toBeNull()
        expect(
          (胜出 as { 规则: 规则 }).规则.选择器.includes('data-theme'),
          `${属性} 由浅色档另写一份（${(胜出 as { 规则: 规则 }).规则.选择器}）＝第二真源回潮`,
        ).toBe(false)
      }
    })
  }
})

describe('FP-29 两档实测可辨：Δmax / 相对亮度差（页底纯黑纯白夹逼）', () => {
  for (const 档 of ['dark', 'light'] as 主题档[]) {
    const 方向 = 档 === 'dark' ? 1 : -1
    for (const { 名, 底, 真实 } of 夹逼页底[档]) {
      const { 卡, 父 } = 卡面(档, 底)

      it(`${档} 档·${名}：文字阴影 Δmax ≥${可见下限}、|ΔL| ≥${亮度下限}、方向正确`, () => {
        const 层 = 解析阴影(层叠串('text-shadow', 标题探针(档, 'mbti-zhongWen', true), 档), 档)
        expect(层.length).toBe(1)
        const 色 = (层[0] as 阴影层).色
        expect(通道差(压合(色, 卡), 卡), `${档} 名义 Δmax`).toBeGreaterThanOrEqual(可见下限)
        expect(亮度差(色, 卡) * 方向, `${档} 名义亮度差`).toBeGreaterThanOrEqual(亮度下限)
        if (真实) {
          const 峰 = 峰值色(层[0] as 阴影层)
          expect(通道差(压合(峰, 卡), 卡), `${档} 峰值（模糊稀释后）Δmax`).toBeGreaterThanOrEqual(
            可见下限,
          )
          expect(亮度差(峰, 卡) * 方向, `${档} 峰值亮度差`).toBeGreaterThanOrEqual(0.04)
        }
      })

      it(`${档} 档·${名}：卡外辉光 Δmax ≥${可见下限}、方向正确`, () => {
        const 层 = 解析阴影(层叠串('box-shadow', 性格卡探针(档, true), 档), 档)
        expect(层.length).toBe(1)
        const 色 = (层[0] as 阴影层).色
        expect(通道差(压合(色, 父), 父), `${档} 辉光 Δmax`).toBeGreaterThanOrEqual(可见下限)
        expect(亮度差(色, 父) * 方向, `${档} 辉光方向`).toBeGreaterThan(0)
      })
    }
  }

  it('深色档改前字面量按同一算式必不可辨（Δmax <24 且与底同明度）＝需求 #17 复现', () => {
    const { 卡 } = 卡面('dark', [0, 0, 0])
    for (const [名, 色] of Object.entries({ 代号阴影: 改前.代号阴影, 中文阴影: 改前.中文阴影 })) {
      expect(通道差(压合(色, 卡), 卡), `${名} 改前竟已可辨？与本单算式不符`).toBeLessThan(可见下限)
      expect(Math.abs(亮度差(色, 卡)), `${名} 改前亮度差过大`).toBeLessThan(0.05)
    }
  })

  it('浅色档改后比改前更轻（用户报的"阴影很重"不得反向）', () => {
    const { 卡 } = 卡面('light', [255, 255, 255])
    const 后 = (解析阴影(层叠串('text-shadow', 标题探针('light', 'mbti-zhongWen', true), 'light'), 'light')[0] as 阴影层).色
    expect(通道差(压合(后, 卡), 卡)).toBeLessThanOrEqual(通道差(压合(改前.代号阴影, 卡), 卡) * 0.55)
    expect(通道差(压合(后, 卡), 卡)).toBeGreaterThanOrEqual(可见下限)
  })

  it('浅色档辉光改后不弱于改前（收编令牌不得把选中卡变得更难分辨）', () => {
    const { 父 } = 卡面('light', [255, 255, 255])
    const 后 = (解析阴影(层叠串('box-shadow', 性格卡探针('light', true), 'light'), 'light')[0] as 阴影层).色
    expect(通道差(压合(后, 父), 父)).toBeGreaterThanOrEqual(通道差(压合(改前.卡辉光浅, 父), 父))
  })
})

describe('FP-29 同类点穷尽：选中态阴影与 text-shadow 字面量钉成账本', () => {
  it('性格卡家族（mbti/suiJi × 选中态标题/卡体）源码里 text-shadow/box-shadow 零字面量', () => {
    const 残留: string[] = []
    for (const 块 of 向导规则) {
      if (!/\.(mbti|suiJi)-kaPian/.test(块.选择器) || !选中语义.test(块.选择器)) continue
      for (const 属性 of ['text-shadow', 'box-shadow'] as const) {
        const 值 = 块.声明.get(属性)
        if (!值) continue
        for (const 层 of 切顶层(值, ','))
          if (/[\d.]+px|#[0-9a-fA-F]|rgba?\(/.test(层)) 残留.push(`${块.选择器}|${属性}|${层}`)
      }
    }
    expect(残留).toStrictEqual([])
  })

  it('全库「选中态阴影」仍带颜色字面量的层 = 账本，不新增不陈化', () => {
    const 实际 = 选中态违规层()
    expect(实际, '选中态阴影出现未登记的字面色，或账本已陈化（改完请删条目）').toEqual(
      选中态阴影账本.map((项) => 项.键).sort(),
    )
    for (const 项 of 选中态阴影账本) {
      expect(项.理由.trim(), `${项.键} 缺理由`).not.toBe('')
      expect(项.归属, `${项.键} 未写归属 FP`).toMatch(/^FP-\d/)
      expect(实际, `${项.键} 已不在源码里，账本条目必须删除`).toContain(项.键)
    }
  })

  it('全库 text-shadow 带字面量的点 = 账本（本单收的两条已归零），不新增不陈化', () => {
    const 实际 = 文字阴影字面量点()
    expect(实际, 'text-shadow 出现未登记的字面量，或账本已陈化').toEqual(
      文字阴影字面量账本.map((项) => 项.键).sort(),
    )
    for (const 项 of 文字阴影字面量账本) {
      expect(项.理由.trim()).not.toBe('')
      expect(项.归属).toMatch(/^FP-\d/)
      expect(实际, `${项.键} 已不在源码里，账本条目必须删除`).toContain(项.键)
    }
  })
})
