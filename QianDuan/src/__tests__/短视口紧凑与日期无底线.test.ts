import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { 声明块清单, 求几何算式 } from './主题令牌真源'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8').replace(/\r\n/g, '\n')

const 登录 = 读('views/登录内容.vue')
const 日期组件 = 读('components/认证/出生日期选择器.vue')
const 全局样式 = 读('styles/全局.css')
const 令牌源码 = 读('styles/设计令牌.css')
const 块们 = 声明块清单(令牌源码)

function 取样式块(源码: string, 名: string): string {
  const 匹配 = /<style[^>]*>([\s\S]*?)<\/style>/.exec(源码)
  expect(匹配, 名 + ' 缺少 style 块').not.toBeNull()
  return (匹配 as RegExpMatchArray)[1]
}

const 登录样式 = 取样式块(登录, '登录内容.vue')
const 日期样式 = 取样式块(日期组件, '出生日期选择器.vue')

function 取块(块: string, 选择器: string): string {
  const 起 = 块.indexOf(选择器)
  expect(起, '缺少规则块 ' + 选择器).toBeGreaterThan(-1)
  return 块.slice(起, 块.indexOf('}', 起) + 1)
}

function 取值(块: string, 属性: string): string | null {
  const 匹配 = new RegExp('(?:^|[;{\\s])' + 属性.replace(/-/g, '\\-') + ':\\s*([^;}]+)').exec(块)
  return 匹配 ? 匹配[1].trim().replace(/\s+/g, ' ') : null
}

function 匹配右括号(文本: string, 左: number): number {
  let 深度 = 0
  for (let i = 左; i < 文本.length; i++) {
    if (文本[i] === '{') 深度++
    else if (文本[i] === '}') {
      深度--
      if (深度 === 0) return i
    }
  }
  throw new Error('样式块花括号不配对')
}

function 媒体上下文(文本: string, 头: string): string {
  const 起 = 文本.indexOf(头)
  expect(起, '缺少媒体查询 ' + 头).toBeGreaterThan(-1)
  const 内容起 = 文本.indexOf('{', 起) + 1
  return 文本.slice(内容起, 匹配右括号(文本, 内容起 - 1))
}

describe('出生日期分段输入不画底线', () => {
  it('全局输入底线链逐条排除分段日期输入', () => {
    const 排除链们 = [...全局样式.matchAll(/:not\(:is\(([^()]*)\)\)/g)].map((项) => 项[1])
    const 底线规则数 = 排除链们.filter((链) => 链.includes('.fenlie-shuru')).length
    const 排除数 = 排除链们.filter((链) => 链.includes('.duan-shuru')).length
    expect(底线规则数).toBeGreaterThan(0)
    expect(排除数, '底线规则未逐条排除 .duan-shuru').toBe(底线规则数)
  })

  it('分段输入自身声明无底线背景，错误态自行补出实线', () => {
    const 常态 = 取块(日期样式, '.chushengriqi .duan-shuru.duan-shuru {')
    expect(取值(常态, 'border-bottom-width')).toBe('0 !important')
    expect(取值(常态, 'background-image')).toBe('none !important')
    const 错误 = 取块(日期样式, '.chushengriqi .duan-shuru.duan-shuru.duan-shuru--cuo-wu {')
    expect(取值(错误, 'border-bottom-width')).toBe('var(--shuru-xian-changtai-kuan-du) !important')
    expect(取值(错误, 'border-bottom-style')).toBe('solid !important')
    expect(取值(错误, 'border-bottom-color')).toBe('var(--shuru-xian-cuowu-se) !important')
  })

  it('日期组容器仍由布局侧关闭底线伪元素', () => {
    expect(登录).toContain('<div class="shuru-zu shangFu wu-di-xian">')
    const 全局卡片 = 读('styles/认证卡片.css')
    expect(全局卡片).toContain('.shuru-zu.wu-di-xian::after')
  })
})

describe('矮视口下表单窗口不塌陷', () => {
  const 紧凑 = 媒体上下文(登录样式, '@media (max-height: 640px)')
  const 极限紧凑 = 媒体上下文(登录样式, '@media (max-height: 520px)')
  const 卡面 = 取块(登录样式, '.biaodan-rongqi {')
  const 扇形 = 取块(登录样式, '.biaodan-rongqi::before {')
  const 扇形下缘 = 求几何算式(取值(扇形, 'top') as string, 块们) + 求几何算式(取值(扇形, 'height') as string, 块们)
  const 标题上内距 = 求几何算式('var(--jiange-da)', 块们)

  it('两个档位都收回卡面上下内距与标题上下外距', () => {
    expect(取值(取块(紧凑, '.biaodan-rongqi {'), '--ka-duan-luo')).toBe('var(--jiange-xiao)')
    expect(取值(取块(紧凑, '.biaodan-tou {'), 'margin-top')).toBe('var(--jiange-4)')
    expect(取值(取块(紧凑, '.biaodan-tou {'), 'margin-bottom')).toBe('var(--jiange-4)')
    expect(取值(取块(极限紧凑, '.biaodan-rongqi {'), '--ka-duan-luo')).toBe('var(--jiange-6)')
    expect(取值(取块(极限紧凑, '.biaodan-tou {'), 'margin-top')).toBe('var(--jiange-2)')
    expect(取值(取块(极限紧凑, '.biaodan-tou {'), 'margin-bottom')).toBe('var(--jiange-2)')
  })

  it('卡面上内距保持标题低于扇形下缘，紧凑时标题不会压到扇形', () => {
    expect(取值(卡面, 'padding')).toBe('var(--ka-duan-luo) var(--ka-heng-nei-ju)')
    for (const 档 of [紧凑, 极限紧凑]) {
      expect(取值(取块(档, '.biaodan-rongqi {'), 'padding-top')).toBe('var(--jiange-da)')
    }
    expect(标题上内距).toBeGreaterThan(扇形下缘)
  })

  it('极限档标题降一档字号并收起副标题，两页仍只用字号令牌', () => {
    expect(取值(取块(极限紧凑, '.biaodan-biao-ti {'), 'font-size')).toBe('var(--ziti-da)')
    expect(取值(取块(极限紧凑, '.biaodan-fu-biao-ti {'), 'display')).toBe('none')
    expect(登录样式).not.toMatch(/font-size:\s*\d/)
  })

  it('紧凑模式只收紧纵向节奏，44px 触控热区与内金线几何不受影响', () => {
    for (const 档 of [紧凑, 极限紧凑]) {
      expect(档).not.toContain('biaoqian-anniu')
      expect(档).not.toContain('shuru-anniu-re-ku')
      expect(档).not.toContain('--ka-heng-nei-ju')
    }
    expect(取值(取块(登录样式, '.biaoqian-anniu {'), 'min-height')).toBe('var(--shuru-anniu-re-ku)')
  })
})
