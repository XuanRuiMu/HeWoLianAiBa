import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { 解析主色档, 解析选中框配色档, 解析性别配色档 } from '@/utils/性别'
import { 令牌名, 层叠胜出, 规则清单, type 探针, type 规则 } from './CSS级联真源'
import { 声明块清单, 按档解析全部, 塌陷令牌清单, type 主题档 } from './主题令牌真源'

/**
 * FP-15b（需求 #16）性别驱动配色的前端消费面守门。
 *
 * 判据一律是**层叠结果 + var()/color-mix() 求值后的计算值**（FP-24b 立的口径）：
 * 组件声明 → 组件内局部自定义属性（含祖先继承）→ variables.css 令牌真源 → 字面色，
 * 一条链走到可比较的 rgb + alpha。源码字符串包含式断言（B10 病灶）在本文件里不作为验收判据。
 */

const 源码根 = resolve(__dirname, '..')
const 块们 = 声明块清单()
const 令牌表: Record<主题档, Map<string, string>> = {
  light: 按档解析全部('light', 块们),
  dark: 按档解析全部('dark', 块们),
}

function 读样式块(相对路径: string): string {
  const 源 = readFileSync(join(源码根, 相对路径), 'utf8')
  const 命中 = /<style[^>]*>([\s\S]*)<\/style>/.exec(源)
  if (!命中) throw new Error(`${相对路径} 找不到 <style> 块`)
  return 命中[1]
}

const 向导规则 = 规则清单(读样式块('views/资料设置向导.vue'))
const 安全规则 = 规则清单(读样式块('views/账号与安全.vue'))
const 挑战规则 = 规则清单(读样式块('views/挑战主页.vue'))

type RGB = [number, number, number]
interface 色 {
  rgb: RGB
  alpha: number
}

function 解析色(值: string): 色 {
  const 函数 = 值.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/)
  if (函数) {
    return {
      rgb: [Number(函数[1]), Number(函数[2]), Number(函数[3])] as RGB,
      alpha: 函数[4] === undefined ? 1 : Number(函数[4]),
    }
  }
  const 十六 = 值.match(/#([0-9a-fA-F]{6})\b/)
  if (十六) {
    const h = 十六[1]
    return {
      rgb: [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ] as RGB,
      alpha: 1,
    }
  }
  throw new Error(`链尾取不到颜色：${值}`)
}

/**
 * 自定义属性按 CSS 继承规则求值：自身 → 父 → 祖父 …… 最近一处声明胜出。
 * 非继承属性（border-color 等）不走这里，只查自身命中的规则。
 */
function 取声明值(规则们: 规则[], 探针: 探针, 名: string, 档: 主题档): string {
  const 候选: 探针[] = [探针]
  const 链 = 探针.祖先链 ?? []
  for (let i = 链.length - 1; i >= 0; i--) {
    候选.push({ ...链[i], 祖先链: i > 0 ? 链.slice(0, i) : undefined })
  }
  for (const 项 of 候选) {
    const 值 = 层叠胜出(规则们, 项, 名)?.值
    if (值) return 值
  }
  const 全局 = 令牌表[档].get(名)
  if (全局) return 全局
  throw new Error(`${名} 在组件局部（含祖先）与 variables.css 真源里都解析不出 = 幻影令牌`)
}

/** 把 var() 链与 color-mix(in srgb, X p%, transparent) 求值到字面色；超出支持范围即抛错不给近似值 */
function 求值到色(原值: string, 规则们: 规则[], 探针: 探针, 档: 主题档, 深度 = 0): 色 {
  if (深度 > 12) throw new Error(`var() 链过深：${原值}`)
  const 串 = 原值.trim()
  const 混 = /^color-mix\(\s*in srgb\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*transparent\s*\)$/i.exec(串)
  if (混) {
    const 内 = 求值到色(混[1], 规则们, 探针, 档, 深度 + 1)
    return { rgb: 内.rgb, alpha: 内.alpha * (Number(混[2]) / 100) }
  }
  const 变量 = /var\(\s*(--[A-Za-z0-9-]+)\s*\)/.exec(串)
  if (变量) {
    const 值 = 取声明值(规则们, 探针, 变量[1], 档)
    return 求值到色(串.replace(变量[0], 值), 规则们, 探针, 档, 深度 + 1)
  }
  return 解析色(串)
}

function 胜出值(规则们: 规则[], 探针: 探针, 属性: string): string {
  const 胜出 = 层叠胜出(规则们, 探针, 属性)
  if (!胜出) throw new Error(`探针 ${JSON.stringify(探针.类)} 上没有任何规则声明 ${属性}`)
  return 胜出.值
}

/** 探针上该属性的层叠胜出值，求值到可比较的颜色 */
function 计算色(规则们: 规则[], 探针: 探针, 属性: string, 档: 主题档): 色 {
  return 求值到色(胜出值(规则们, 探针, 属性), 规则们, 探针, 档)
}

/** 双色标线性渐变（主按钮底色）：两个色标各自求值 */
function 计算渐变(规则们: 规则[], 探针: 探针, 档: 主题档): 色[] {
  const 值 = 胜出值(规则们, 探针, 'background')
  const 命中 = /^linear-gradient\([^,]+,\s*(.+?)\s*,\s*(.+?)\s*\)$/.exec(值.trim())
  if (!命中) throw new Error(`background 不是「两个色标的线性渐变」：${值}`)
  return [命中[1], 命中[2]].map((标) => 求值到色(标, 规则们, 探针, 档))
}

function 等色(实际: 色, 期望: string, 期望alpha?: number): void {
  const 期 = 解析色(期望)
  expect(
    [实际.rgb, Number(实际.alpha.toFixed(3))],
    `解析出的色值与真源实测不符（期望 ${期望}）`,
  ).toStrictEqual([期.rgb, Number((期望alpha ?? 期.alpha).toFixed(3))])
}

/** 需求 #16 的四个组合：对象性别 / 用户默认性别 → 选中框应落哪一档 */
const 组合表: { 名: string; 对象: unknown; 默认: unknown; 框: 'nan' | 'nv' }[] = [
  { 名: '对象=男 → 蓝框', 对象: 'male', 默认: null, 框: 'nan' },
  { 名: '对象=女 → 粉框（压过默认性别）', 对象: 'nv', 默认: 'male', 框: 'nv' },
  { 名: '未选对象 + 默认男 → 反色粉框', 对象: null, 默认: 'male', 框: 'nv' },
  { 名: '未选对象 + 无默认 → 粉框', 对象: null, 默认: null, 框: 'nv' },
]

/**
 * variables.css 真源的逐字实测值（FP-22c 口径：既钉「引用同一批令牌」，也钉「解析值等于实测值」）。
 * 抄在断言侧是为了让"漂了"可被看见：改令牌值不顺手改这里必红。
 */
const 选中框实测: Record<'nan' | 'nv', Record<主题档, { 边框: string; 底色: string; 文字: string }>> =
  {
    nan: {
      light: { 边框: '#3a7bc8', 底色: 'rgba(74, 144, 217, 0.2)', 文字: '#1f4a7a' },
      dark: { 边框: '#6aa8e8', 底色: 'rgba(106, 168, 232, 0.22)', 文字: '#cfe4fb' },
    },
    nv: {
      light: { 边框: '#c77b98', 底色: 'rgba(199, 123, 152, 0.2)', 文字: '#7a2f4d' },
      dark: { 边框: '#f2a3c4', 底色: 'rgba(242, 163, 196, 0.22)', 文字: '#ffd9e8' },
    },
  }

const 主色实测: Record<'nan' | 'nv' | 'zhongxing', Record<主题档, { 一: string; 二: string }>> = {
  nan: { light: { 一: '#4a90d9', 二: '#3a7bc8' }, dark: { 一: '#2f7fe0', 二: '#1f6ac8' } },
  nv: { light: { 一: '#a34f74', 二: '#c77b98' }, dark: { 一: '#c77b98', 二: '#a85f7d' } },
  zhongxing: { light: { 一: '#8e8e93', 二: '#636366' }, dark: { 一: '#6f84a0', 二: '#5b6f8a' } },
}

type 主色档名 = 'nan' | 'nv' | 'zhongxing'

function 根探针(档: 主题档): 探针 {
  return { 标签: 'root', 属性: { 'data-theme': 档 } }
}

function 向导祖先(主色: 主色档名, 档: 主题档): 探针[] {
  return [
    根探针(档),
    { 标签: 'div', 类: ['ziliao-shezhi'] },
    { 标签: 'div', 类: ['ziliao-kapian'], 属性: { 'data-xingbie': 主色 } },
  ]
}

/** 性别卡。data-dang 是卡片**自身**性别档（男卡恒 nan、女卡恒 nv），与"选了谁"无关 */
function 性别卡探针(
  卡: 'ziJi' | 'duiXiang',
  dang: 'nan' | 'nv',
  选中: boolean,
  档: 主题档,
  多: Partial<探针> = {},
): 探针 {
  return {
    标签: 'button',
    类: ['xingBie-kaPian', `${卡}-xingBie-kaPian`, ...(选中 ? ['beiXuanZhong'] : [])],
    属性: { 'data-dang': dang },
    祖先链: 向导祖先('nan', 档),
    ...多,
  }
}

function 勾选框探针(框档: string, 档: 主题档): 探针 {
  return {
    标签: 'input',
    类: ['zhaXing-gouxuan'],
    属性: { type: 'checkbox', 'data-xingbie': 框档 },
    祖先链: [...向导祖先('nan', 档), { 标签: 'label', 类: ['zhaNv-gouxuan'] }],
  }
}

function 主按钮探针(主色: 主色档名, 档: 主题档): 探针 {
  return { 标签: 'button', 类: ['anniu-zhuYao'], 属性: {}, 祖先链: 向导祖先(主色, 档) }
}

function 圆点探针(主色: 主色档名, 档: 主题档): 探针 {
  return {
    标签: 'button',
    类: ['jindu-dian', 'dangQian'],
    属性: {},
    祖先链: 向导祖先(主色, 档),
  }
}

describe('FP-15b 解析口：选中框档与主色档（两套值域不可混比，脏写法不得抛异常）', () => {
  it('对象性别六种写法各自归档；对象已选时无条件压过默认性别', () => {
    for (const 男 of ['男', 'nan', 'NAN ', 'male', 'Male', ' male ']) {
      expect(解析选中框配色档(男, 'female')).toBe('nan')
    }
    for (const 女 of ['女', 'nv', 'NV ', 'female', 'Female', ' female']) {
      expect(解析选中框配色档(女, 'male')).toBe('nv')
    }
  })

  it('对象未选 → 用户默认性别的**反色**（默认男 ⇒ 粉框，默认女 ⇒ 蓝框）', () => {
    expect(解析选中框配色档(null, 'male')).toBe('nv')
    expect(解析选中框配色档(null, 'female')).toBe('nan')
    // 库里落下的第三种写法（FP-15a 实测 '男' 能进库）也必须走反色这一支而不是被静默丢掉
    expect(解析选中框配色档(undefined, '男')).toBe('nv')
    expect(解析选中框配色档(undefined, '女')).toBe('nan')
  })

  it('对象未选且无默认性别（含脏写法）→ 粉框 + 蓝按钮兜底，且不抛异常', () => {
    for (const 脏 of [null, undefined, '', '   ', 'unknown', 0, {}, []]) {
      expect(解析选中框配色档(脏, 脏)).toBe('nv')
      expect(解析主色档(脏, 脏)).toBe('nan')
    }
  })

  it('两档恒不落中性档：中性只留给未选卡面，兜底按需求明文让位给粉/蓝', () => {
    expect(解析性别配色档(null)).toBe('zhongxing')
    for (const 值 of ['male', 'female', null, undefined, 0, {}]) {
      expect(['nan', 'nv']).toContain(解析选中框配色档(值, 值))
      expect(['nan', 'nv']).toContain(解析主色档(值, 值))
    }
  })

  it('自身性别已选时主色档跟自身，未被选中时才回落到默认性别', () => {
    expect(解析主色档('female', 'male')).toBe('nv')
    expect(解析主色档('男', 'female')).toBe('nan')
    expect(解析主色档(null, 'female')).toBe('nv')
  })
})

describe('FP-15b 四组合 · 选中框计算值（深浅两档 × 边框/底色/文字色）', () => {
  for (const 主题档名 of ['dark', 'light'] as 主题档[]) {
    for (const 组合 of 组合表) {
      it(`${组合.名}｜${主题档名} 档：三件套 == --xingbie-${组合.框}-xuan-*`, () => {
        expect(解析选中框配色档(组合.对象, 组合.默认)).toBe(组合.框)
        const 期望 = 选中框实测[组合.框][主题档名]
        const 探针 = 性别卡探针('duiXiang', 组合.框, true, 主题档名)
        等色(计算色(向导规则, 探针, 'border-color', 主题档名), 期望.边框)
        等色(计算色(向导规则, 探针, 'background-color', 主题档名), 期望.底色)
        等色(计算色(向导规则, 探针, 'color', 主题档名), 期望.文字)
        // 勾选框 = 恒可见的那枚"框"，未选对象时它承担选中框配色
        等色(
          计算色(
            向导规则,
            勾选框探针(解析选中框配色档(组合.对象, 组合.默认), 主题档名),
            'accent-color',
            主题档名,
          ),
          期望.边框,
        )
      })
    }
  }
})

describe('FP-15b 选中框单一真源：卡片自身档驱动，两卡两态互不串色', () => {
  for (const 主题档名 of ['dark', 'light'] as 主题档[]) {
    for (const dang of ['nan', 'nv'] as const) {
      it(`${dang} 卡（自身/对象两处网格同构）在 ${主题档名} 档的边框与悬停边色 == --xingbie-${dang}-xuan-*`, () => {
        const 期望 = 选中框实测[dang][主题档名]
        for (const 卡 of ['ziJi', 'duiXiang'] as const) {
          等色(
            计算色(向导规则, 性别卡探针(卡, dang, true, 主题档名), 'border-color', 主题档名),
            期望.边框,
          )
          等色(
            计算色(
              向导规则,
              性别卡探针(卡, dang, true, 主题档名, { 悬停: true }),
              'border-color',
              主题档名,
            ),
            期望.边框,
          )
          等色(
            计算色(
              向导规则,
              性别卡探针(卡, dang, false, 主题档名, { 悬停: true }),
              'border-color',
              主题档名,
            ),
            期望.边框,
            0.45,
            // 悬停是同一色相的淡出档（alpha 45%），色相必须仍是本卡性别档而非两性统一粉
          )
        }
      })

      it(`${dang} 卡选中态的环两层吃 --xingbie-${dang}-xuan-{huan,guangyun}，不再两性共用一色（${主题档名}）`, () => {
        const 值 = 胜出值(
          向导规则,
          性别卡探针('duiXiang', dang, true, 主题档名),
          'box-shadow',
        )
        const 环 = 值.split(/,(?![^(]*\))/).map((项) => 项.trim())
        expect(环.length).toBe(2)
        expect(令牌名(环[0].replace(/^0 0 0 3px\s+/, ''), 'ring')).toBe(
          `--xingbie-${dang}-xuan-huan`,
        )
        expect(令牌名(环[1].replace(/^0 10px 26px\s+/, ''), 'glow')).toBe(
          `--xingbie-${dang}-xuan-guangyun`,
        )
      })
    }
  }
})

describe('FP-15b 主按钮 · 计算值（需求兜底「无默认性别 → 蓝按钮」只作用于资料流程主按钮）', () => {
  for (const 主题档名 of ['dark', 'light'] as 主题档[]) {
    it(`未选对象且无默认性别 → 粉框 + 蓝按钮，进度圆点与按钮同源（${主题档名}）`, () => {
      const 框档 = 解析选中框配色档(null, null)
      const 钮档 = 解析主色档(null, null)
      expect([框档, 钮档]).toStrictEqual(['nv', 'nan'])
      const 渐变 = 计算渐变(向导规则, 主按钮探针(钮档, 主题档名), 主题档名)
      等色(渐变[0], 主色实测[钮档][主题档名].一)
      等色(渐变[1], 主色实测[钮档][主题档名].二)
      等色(
        计算色(向导规则, 圆点探针(钮档, 主题档名), 'background-color', 主题档名),
        主色实测[钮档][主题档名].二,
      )
      等色(
        计算色(向导规则, 主按钮探针(钮档, 主题档名), 'color', 主题档名),
        令牌表[主题档名].get(`--xingbie-${钮档}-wenben`) as string,
      )
    })

    it(`自身性别已选时主按钮吃自身档，不被兜底劫持（female ⇒ 粉）（${主题档名}）`, () => {
      const 钮档 = 解析主色档('female', null)
      expect(钮档).toBe('nv')
      const 渐变 = 计算渐变(向导规则, 主按钮探针(钮档, 主题档名), 主题档名)
      等色(渐变[0], 主色实测.nv[主题档名].一)
      等色(渐变[1], 主色实测.nv[主题档名].二)
    })

    it(`按钮底色链上没有任何非令牌的颜色字面量（${主题档名}）`, () => {
      for (const 钮档 of ['nan', 'nv'] as const) {
        for (const 属性 of ['background', 'color'] as const) {
          const 值 = 胜出值(向导规则, 主按钮探针(钮档, 主题档名), 属性)
          const 裸 = 值.replace(/var\(\s*--[a-z0-9-]+\s*\)/g, '')
          expect(裸).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(/)
        }
      }
    })
  }
})

describe('FP-15b 同类点：默认性别卡与挑战性别弹层同样吃性别令牌', () => {
  for (const 主题档名 of ['dark', 'light'] as 主题档[]) {
    it(`账号与安全 · 默认性别选中框按性别分档（改前两性共用 --taoTu 一色）（${主题档名}）`, () => {
      for (const dang of ['nan', 'nv'] as const) {
        const 探针 = {
          标签: 'button',
          类: ['xingbie-kapian', `xingbie-${dang}`, 'beiXuanZhong'],
          属性: {},
          祖先链: [根探针(主题档名), { 标签: 'div', 类: ['zhang-hao-an-quan'] } as 探针],
        }
        const 期望 = 选中框实测[dang][主题档名]
        等色(计算色(安全规则, 探针, 'border-color', 主题档名), 期望.边框)
        等色(计算色(安全规则, 探针, 'background-color', 主题档名), 期望.底色)
        等色(计算色(安全规则, 探针, 'color', 主题档名), 期望.文字)
      }
    })

    it(`挑战主页 · 性别符号色单源，浅色档不再另写一份（${主题档名}）`, () => {
      for (const dang of ['nan', 'nv'] as const) {
        等色(
          计算色(
            挑战规则,
            {
              标签: 'span',
              类: ['xingbie-fuhao'],
              属性: {},
              祖先链: [
                根探针(主题档名),
                { 标签: 'div', 类: ['xingbie-kaPian', dang] } as 探针,
              ],
            },
            'color',
            主题档名,
          ),
          主色实测[dang][主题档名].一,
        )
      }
    })
  }
})

describe('FP-15b 浅色档粉按钮对比度（修 FP-01 已知缺陷账本：旧 #e6a9be 实测 1.95:1）', () => {
  function 线性(v: number): number {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  function 亮度(色: 色): number {
    return 0.2126 * 线性(色.rgb[0]) + 0.7152 * 线性(色.rgb[1]) + 0.0722 * 线性(色.rgb[2])
  }
  function 对比度(a: 色, b: 色): number {
    const l1 = 亮度(a)
    const l2 = 亮度(b)
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  }
  function 实测(档: 主题档): number {
    return 对比度(
      解析色(令牌表[档].get('--xingbie-nv-wenben') as string),
      解析色(令牌表[档].get('--xingbie-nv-1') as string),
    )
  }

  it('浅色档 nv-1 + 白字 ≥4.5:1（WCAG AA 正文下限；旧值 1.95:1）', () => {
    const 实际 = 实测('light')
    expect(实际, `浅色粉 + 白字实测 ${实际.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
  })

  it('深色档同组合不回归：仍 ≥3:1（FP-01 既有契约；AA 正文 4.5 未达成，已记遗留问题）', () => {
    const 实际 = 实测('dark')
    expect(实际, `深色粉 + 白字实测 ${实际.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
  })
})

describe('FP-15b 零硬编码穷尽：被禁字面量只准住在令牌声明行', () => {
  const 被禁 = ['#d98ca6', 'rgba(217, 140, 166', '#9ecbff', '#ffb1cc', '#3d7cc9', '#d4568a']
  const 跳过目录 = new Set(['node_modules', 'dist', '__tests__', 'coverage'])
  const 源文件 = /\.(vue|ts|js|css|html|sql)$/

  function 收集(dir: string, 累加: string[] = []): string[] {
    for (const 项 of readdirSync(dir, { withFileTypes: true })) {
      if (项.isDirectory()) {
        if (!跳过目录.has(项.name)) 收集(join(dir, 项.name), 累加)
      } else if (源文件.test(项.name)) {
        累加.push(join(dir, 项.name))
      }
    }
    return 累加
  }

  function 剥注释(源: string): string {
    return 源
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1')
  }

  function 扫描(): { 命中: string[]; 令牌行: string[] } {
    const 前端根 = resolve(__dirname, '../..')
    const 文件们 = [
      ...收集(join(前端根, 'src')),
      ...收集(resolve(前端根, '../backend/src')),
      ...收集(resolve(前端根, '../backend/database')),
      ...收集(resolve(前端根, '../database')),
    ]
    const 命中: string[] = []
    const 令牌行: string[] = []
    for (const 文件 of 文件们) {
      const 相对 = 文件.slice(前端根.length + 1).replace(/\\/g, '/')
      for (const 行 of 剥注释(readFileSync(文件, 'utf8')).split('\n')) {
        if (!被禁.some((字面) => 行.includes(字面))) continue
        if (
          相对 === 'src/styles/variables.css' &&
          /^\s*--[a-z0-9-]+\s*:\s*\S/.test(行)
        ) {
          令牌行.push(`${相对}|${行.trim()}`)
          continue
        }
        命中.push(`${相对}|${行.trim()}`)
      }
    }
    return { 命中, 令牌行 }
  }

  it('前端 src + 后端 src/database（注释已剥）命中 0，只有 variables.css 的令牌声明行可留', () => {
    expect(扫描().命中).toStrictEqual([])
  })

  it('variables.css 内的残留命中逐条核对 = 柔粉强调档令牌一处（收编自改前组件里的 #d98ca6）', () => {
    expect(扫描().令牌行).toStrictEqual([
      'src/styles/variables.css|--qiangdiao-fen: #d98ca6;',
    ])
  })

  it('FP-15b 新增令牌两档齐备且各有真实消费者（零消费者令牌是本任务点名的病灶）', () => {
    const 塌陷 = 塌陷令牌清单(块们)
    const 新令牌 = [
      '--xingbie-nan-xuan-huan',
      '--xingbie-nan-xuan-guangyun',
      '--xingbie-nv-xuan-huan',
      '--xingbie-nv-xuan-guangyun',
      '--qiangdiao-fen',
    ]
    for (const 令牌 of 新令牌) {
      expect(塌陷, `${令牌} 只在单侧主题块声明（另一档塌陷）`).not.toContain(令牌)
      const 正则 = new RegExp(`var\\(\\s*${令牌.replace(/-/g, '\\-')}\\s*[,)]`)
      const 消费者 = 收集(join(源码根)).filter(
        (文件) =>
          !文件.endsWith('styles/variables.css') && 正则.test(readFileSync(文件, 'utf8')),
      )
      expect(消费者.length, `${令牌} 全库零消费者`).toBeGreaterThan(0)
    }
  })

  it('组件侧被治理的三条声明都只引用令牌（值本身不含任何字面色）', () => {
    const 探针 = 性别卡探针('duiXiang', 'nv', true, 'dark')
    for (const 属性 of ['border-color', 'background-color', 'color'] as const) {
      const 值 = 胜出值(向导规则, 探针, 属性)
      expect(() => 令牌名(值, 属性), `${属性} 的层叠胜出值必须是单一 var() 令牌：${值}`).not.toThrow()
    }
  })
})
