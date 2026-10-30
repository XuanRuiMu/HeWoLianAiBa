import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 样式 = readFileSync(resolve(__dirname, '../styles/认证卡片.css'), 'utf8').replace(/\r\n/g, '\n')

function 取块(文本: string, 选择器: string): string {
  const 起 = 文本.indexOf(选择器)
  expect(起, `缺少选择器 ${选择器}`).toBeGreaterThan(-1)
  return 文本.slice(起, 文本.indexOf('}', 起) + 1)
}

function 取值(块: string, 属性: string): string | null {
  const 匹配 = 块.match(new RegExp(`(?:^|\\n)\\s*${属性}:\\s*([^;]+);`))
  return 匹配 ? 匹配[1].trim() : null
}

const 自动填充块 = 取块(样式, '.fenlie-shuru:-webkit-autofill,')
const 输入组块 = 取块(样式, '.shuru-zu {')
const 输入主体块 = 取块(样式, '.shuru-zhu-ti {')
const 底线块 = 取块(样式, '.shuru-zhu-ti::after {')
const 聚焦块 = 取块(样式, '.shuru-zhu-ti:focus-within::after {')
const 日期块 = 取块(样式, '.shuru-zu:has(> .chushengriqi)::after,')
const 减动效块 = 样式.slice(样式.indexOf('@media (prefers-reduced-motion: reduce)'))

describe('输入框自动填充底色', () => {
  it('用内阴影遮住浏览器强制的自动填充底色', () => {
    expect(自动填充块).toContain('inset 0 0 0 1000px var(--renzheng-mian-se)')
    expect(自动填充块).toContain(
      '-webkit-box-shadow: inset 0 0 0 1000px var(--renzheng-mian-se) !important',
    )
    expect(自动填充块).toContain('box-shadow: inset 0 0 0 1000px var(--renzheng-mian-se) !important')
  })

  it('自动填充态仍保留文字色与自动填充动画标记', () => {
    expect(自动填充块).toContain('-webkit-text-fill-color: #efe9dc !important')
    expect(自动填充块).toContain('caret-color: #d5b878 !important')
    expect(自动填充块).toContain('animation-name: ziDongTianChongKaiShi')
  })
})

describe('输入框底线绘制层级', () => {
  it('底线由输入主体 .shuru-zhu-ti::after 绘制，宽度只覆盖文本输入区', () => {
    expect(取值(底线块, 'content')).toBe("''")
    expect(取值(底线块, 'position')).toBe('absolute')
    expect(取值(底线块, 'left')).toBe('0')
    expect(取值(底线块, 'right')).toBe('0')
    expect(取值(底线块, 'bottom')).toBe('0')
    expect(取值(底线块, 'height')).toBe('var(--shuru-xian-changtai-kuan-du)')
    expect(取值(底线块, 'pointer-events')).toBe('none')
  })

  it('伪元素承载常态线与聚焦扫光两层背景', () => {
    expect(取值(底线块, 'background-image')).toContain('var(--shuru-sao-jianbian)')
    expect(取值(底线块, 'background-image')).toContain(
      'linear-gradient(var(--shuru-xian-changtai-se), var(--shuru-xian-changtai-se))',
    )
    expect(取值(底线块, 'background-repeat')).toBe('no-repeat, no-repeat')
    expect(取值(底线块, 'background-position')).toBe('left bottom, left bottom')
    expect(取值(底线块, 'background-size')).toBe('0% 100%, 100% 100%')
    expect(取值(底线块, 'transition-property')).toBe('background-size')
    expect(取值(底线块, 'transition-duration')).toBe('var(--shuru-sao-chu-shi-chang)')
    expect(取值(底线块, 'transition-timing-function')).toBe('var(--quxian-sao-chu)')
  })

  it('承载底线的主体定位为相对，容器与主体都不再用背景图画线', () => {
    expect(取值(输入主体块, 'position')).toBe('relative')
    for (const 块 of [输入组块, 输入主体块]) {
      expect(块).not.toContain('background-image')
      expect(块).not.toContain('background-size')
      expect(块).not.toContain('transition-property')
    }
    expect(样式).not.toContain('.shuru-zu:focus-within {')
  })

  it('聚焦态把扫光层扩满宽度', () => {
    expect(取值(聚焦块, 'background-size')).toBe('100% 100%, 100% 100%')
  })

  it('出生日期字段不画底线，含无 :has 环境的显式类兜底', () => {
    expect(取值(日期块, 'content')).toBe('none')
    expect(样式).toContain('.shuru-zu.wu-di-xian::after')
    expect(样式).toContain('.shuru-zhu-ti.wu-di-xian::after')
    expect(样式).toContain('content: none;')
  })

  it('减动效块关闭伪元素过渡且保留输入框过渡规则', () => {
    expect(减动效块).toContain('.shuru-zhu-ti::after,')
    expect(减动效块).toContain('.shuru-zhu-ti .fenlie-shuru,')
    expect(减动效块).toContain('transition: none;')
  })
})
