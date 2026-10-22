import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const 样式 = readFileSync(resolve(__dirname, '../styles/认证卡片.css'), 'utf8').replace(/\r\n/g, '\n')

const 自动填充块 = (() => {
  const 起 = 样式.indexOf('.fenlie-shuru:-webkit-autofill,')
  expect(起, '缺少自动填充规则').toBeGreaterThan(-1)
  return 样式.slice(起, 样式.indexOf('}', 起) + 1)
})()

describe('输入框自动填充底色', () => {
  it('用内阴影遮住浏览器强制的自动填充底色', () => {
    expect(自动填充块).toContain('inset 0 0 0 1000px var(--renzheng-mian-se)')
    expect(自动填充块).toContain('-webkit-box-shadow: inset 0 0 0 1000px var(--renzheng-mian-se) !important')
    expect(自动填充块).toContain('box-shadow: inset 0 0 0 1000px var(--renzheng-mian-se) !important')
  })

  it('自动填充态仍保留文字色与自动填充动画标记', () => {
    expect(自动填充块).toContain('-webkit-text-fill-color: #efe9dc !important')
    expect(自动填充块).toContain('caret-color: #d5b878 !important')
    expect(自动填充块).toContain('animation-name: ziDongTianChongKaiShi')
  })
})
