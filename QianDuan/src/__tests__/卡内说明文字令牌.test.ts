import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { 声明块清单, 按档解析全部, 声明位置 } from './主题令牌真源'

const 块们 = 声明块清单()
const 浅色表 = 按档解析全部('light', 块们)
const 深色表 = 按档解析全部('dark', 块们)
const 令牌名 = '--kapian-shuoming-wenben'
const 向导 = readFileSync(resolve(__dirname, '../views/资料设置向导.vue'), 'utf8')

function 规则体(源: string, 选择器: string): string {
  const 转义 = 选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const 匹配 = new RegExp(`(?:^|\\n)${转义}\\s*\\{([^}]*)\\}`).exec(源)
  expect(匹配, `缺少规则 ${选择器}`).not.toBeNull()
  return (匹配 as RegExpMatchArray)[1]
}

function 解析通道(色: string): number[] {
  const 十六进制 = /^#([0-9a-f]{6})$/i.exec(色.trim())
  if (十六进制) {
    const 值 = 十六进制[1]
    return [0, 2, 4].map((位置) => Number.parseInt(值.slice(位置, 位置 + 2), 16))
  }
  const 函数式 = /^rgba?\(([^)]+)\)$/i.exec(色.trim())
  if (函数式) return 函数式[1].split(',').slice(0, 3).map((值) => Number.parseFloat(值.trim()))
  throw new Error(`无法解析颜色 ${色}`)
}

function 相对亮度(色: string): number {
  const [红, 绿, 蓝] = 解析通道(色)
  const 线性 = (通道: number): number => {
    const 归一 = 通道 / 255
    return 归一 <= 0.03928 ? 归一 / 12.92 : Math.pow((归一 + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * 线性(红) + 0.7152 * 线性(绿) + 0.0722 * 线性(蓝)
}

function 对比度(前景: string, 背景: string): number {
  const 甲 = 相对亮度(前景)
  const 乙 = 相对亮度(背景)
  return (Math.max(甲, 乙) + 0.05) / (Math.min(甲, 乙) + 0.05)
}

describe('卡内说明文字令牌', () => {
  it('明暗成对声明，深色档白系、浅色档黑系', () => {
    expect(声明位置(令牌名, 块们)).toEqual({ 共用: false, 浅色: true, 深色: true })
    expect(浅色表.get(令牌名)).toBe('#191919')
    expect(深色表.get(令牌名)).toBe('#FFFFFF')
    expect(解析通道(String(深色表.get(令牌名))).every((通道) => 通道 >= 240)).toBe(true)
    expect(解析通道(String(浅色表.get(令牌名))).every((通道) => 通道 <= 40)).toBe(true)
  })

  it('MBTI 卡容器声明令牌，第三段说明文字只继承', () => {
    expect(规则体(向导, '.mbti-kaPian')).toContain(`color: var(${令牌名})`)
    const 说明 = 规则体(向导, '.mbti-miaoShu')
    expect(说明).toContain('color: inherit')
    expect(说明).not.toContain('--wenben-tishi')
  })

  it('MBTI 选中态与浅色档不再覆写说明文字颜色', () => {
    expect(向导).not.toContain('.mbti-kaPian.beiXuanZhong .mbti-miaoShu')
    expect(向导).not.toContain(":root[data-theme='light'] .mbti-miaoShu")
    expect(向导).not.toContain('--wenben-tishi')
  })

  it('第一步性别卡与第二步对象卡的小字同走该令牌', () => {
    expect(规则体(向导, '.xingBie-kaPian')).toContain(`color: var(${令牌名})`)
    expect(规则体(向导, '.xingBie-mingCheng')).toContain('color: inherit')
    expect(向导).not.toContain(":root[data-theme='light'] .xingBie-mingCheng")
  })

  it('第三步随机卡与 MBTI 卡共用同一容器类', () => {
    expect(向导).toContain('class="mbti-kaPian suiJi-kaPian"')
    expect(规则体(向导, '.mbti-kaPian')).toContain(`color: var(${令牌名})`)
  })
  it.each([
    ['1440 暗色 MBTI 静置', '暗色', 'rgb(86, 77, 117)'],
    ['1440 暗色 MBTI 选中', '暗色', 'rgb(116, 106, 141)'],
    ['1440 暗色 随机卡选中', '暗色', 'rgb(82, 81, 117)'],
    ['1440 暗色 性别卡静置', '暗色', 'rgb(93, 82, 122)'],
    ['1440 浅色 MBTI 静置', '浅色', 'rgb(242, 236, 249)'],
    ['1440 浅色 MBTI 选中', '浅色', 'rgb(245, 239, 251)'],
    ['1440 浅色 随机卡选中', '浅色', 'rgb(233, 230, 243)'],
    ['1440 浅色 性别卡静置', '浅色', 'rgb(242, 237, 249)'],
    ['390 暗色 MBTI 静置', '暗色', 'rgb(24, 26, 43)'],
    ['390 暗色 MBTI 选中', '暗色', 'rgb(57, 58, 72)'],
    ['390 暗色 性别卡静置', '暗色', 'rgb(24, 26, 43)'],
    ['390 浅色 MBTI 静置', '浅色', 'rgb(226, 223, 230)'],
    ['390 浅色 MBTI 选中', '浅色', 'rgb(226, 223, 230)'],
    ['390 浅色 性别卡静置', '浅色', 'rgb(226, 223, 230)'],
  ])('%s 的说明文字与实测卡面对比度不小于 4.5:1', (组合, 主题, 卡面) => {
    const 前景 = 主题 === '暗色' ? 深色表.get(令牌名) : 浅色表.get(令牌名)
    expect(前景, `${组合} 未解析到说明文字令牌`).toBeDefined()
    expect(对比度(String(前景), 卡面)).toBeGreaterThanOrEqual(4.5)
  })
})
