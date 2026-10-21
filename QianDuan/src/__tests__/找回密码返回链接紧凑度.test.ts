import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 源码 = readFileSync(resolve(__dirname, '../views/找回密码.vue'), 'utf8')

function 取样式(源: string): string {
  const 匹配 = /<style[^>]*>([\s\S]*?)<\/style>/.exec(源)
  expect(匹配, '找回密码缺少 style 块').not.toBeNull()
  return (匹配 as RegExpMatchArray)[1]
}

function 取块(块: string, 选择器: string): string {
  const 归一 = 块.replace(/\r\n/g, '\n')
  const 裸 = 归一.indexOf(选择器)
  expect(裸, '缺少规则块 ' + 选择器).toBeGreaterThan(-1)
  const 行首 = 归一.indexOf('\n' + 选择器)
  const 起 = 行首 >= 0 ? 行首 : 裸
  const 余 = 归一.slice(起)
  return 余.slice(0, 余.indexOf('}') + 1)
}

function 取值(块: string, 属性: string): string | null {
  const 匹配 = new RegExp('(?:^|[;{\\s])' + 属性.replace(/-/g, '\\-') + ':\\s*([^;}]+)').exec(块)
  return 匹配 ? 匹配[1].trim() : null
}

const 样式 = 取样式(源码)

describe('找回密码返回登录：按钮到链接文字的间距', () => {
  it('链接不再用 12px 外边距加 6px 上下内边距撑空', () => {
    const 链接 = 取块(样式, '.zhaohui-fan-hui {')
    expect(取值(链接, 'margin-top')).toBe('var(--jiange-xiao)')
    expect(取值(链接, 'padding')).toBe('0 var(--jiange-12)')
    expect(取值(链接, 'min-height')).toBeNull()
    expect(取值(链接, 'text-decoration')).toBe('underline')
  })

  it('44px 热区从链接顶边向下外扩，不撑高可见盒也不压住提交按钮', () => {
    const 热区 = 取块(样式, '.zhaohui-fan-hui::before {')
    expect(取值(热区, 'top')).toBe('0')
    expect(取值(热区, 'height')).toBe('var(--shuru-anniu-re-ku)')
    expect(取值(热区, 'min-width')).toBe('var(--shuru-anniu-re-ku)')
    expect(取值(热区, 'transform')).toBe('translateX(-50%)')
    expect(热区是否仍纵向居中(热区)).toBe(false)
  })

  it('外层容器不叠 gap，间距只由表单 24px 与链接 8px 外边距承担', () => {
    expect(取值(取块(样式, '.biaodan-neirong-qu {'), 'gap')).toBe('0')
    expect(取值(取块(样式, '.zhaohui-biao-dan {'), 'gap')).toBe('var(--jiange-da)')
  })
})

function 热区是否仍纵向居中(块: string): boolean {
  return 取值(块, 'top') !== '50%' && !/translate\(-50%,\s*-50%\)/.test(块)
}
