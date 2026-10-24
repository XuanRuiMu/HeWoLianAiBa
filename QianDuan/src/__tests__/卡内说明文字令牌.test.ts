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

  it('MBTI 卡容器与说明文字各自声明令牌，不靠继承拿色', () => {
    expect(规则体(向导, '.mbti-kaPian')).toContain(`color: var(${令牌名})`)
    const 说明 = 规则体(向导, '.mbti-miaoShu')
    expect(说明).toContain('color: var(--kapian-shuoming-wenben)')
    expect(说明).not.toContain('--wenben-tishi')
  })

  it('MBTI 选中态与浅色档不再覆写说明文字颜色', () => {
    expect(向导).not.toContain('.mbti-kaPian.beiXuanZhong .mbti-miaoShu')
    expect(向导).not.toContain(":root[data-theme='light'] .mbti-miaoShu")
    expect(向导).not.toContain('--wenben-tishi')
  })

  it('第一步性别卡与第二步对象卡的小字同走该令牌', () => {
    expect(规则体(向导, '.xingBie-kaPian')).toContain(`color: var(${令牌名})`)
    expect(规则体(向导, '.xingBie-mingCheng')).toContain('color: var(--kapian-shuoming-wenben)')
    expect(向导).not.toContain(":root[data-theme='light'] .xingBie-mingCheng")
  })

  it('第三步随机卡与 MBTI 卡共用同一容器类', () => {
    expect(向导).toContain('class="mbti-kaPian suiJi-kaPian"')
    expect(规则体(向导, '.mbti-kaPian')).toContain(`color: var(${令牌名})`)
  })
  it.each([
    ['1440 暗色 MBTI 静置', '暗色', 'rgb(61, 57, 88)'],
    ['1440 暗色 MBTI 选中', '暗色', 'rgb(92, 87, 114)'],
    ['1440 暗色 随机卡选中', '暗色', 'rgb(72, 72, 100)'],
    ['1440 暗色 性别卡静置', '暗色', 'rgb(65, 60, 91)'],
    ['1440 浅色 MBTI 静置', '浅色', 'rgb(244, 239, 249)'],
    ['1440 浅色 MBTI 选中', '浅色', 'rgb(244, 239, 249)'],
    ['1440 浅色 随机卡选中', '浅色', 'rgb(244, 239, 249)'],
    ['1440 浅色 性别卡静置', '浅色', 'rgb(244, 239, 249)'],
    ['390 暗色 MBTI 静置', '暗色', 'rgb(25, 27, 45)'],
    ['390 暗色 MBTI 选中', '暗色', 'rgb(58, 59, 74)'],
    ['390 暗色 性别卡静置', '暗色', 'rgb(25, 27, 45)'],
    ['390 浅色 MBTI 静置', '浅色', 'rgb(234, 230, 237)'],
    ['390 浅色 MBTI 选中', '浅色', 'rgb(234, 230, 237)'],
    ['390 浅色 性别卡静置', '浅色', 'rgb(234, 230, 237)'],
  ])('%s 的说明文字与实测卡面对比度不小于 4.5:1', (组合, 主题, 卡面) => {
    const 前景 = 主题 === '暗色' ? 深色表.get(令牌名) : 浅色表.get(令牌名)
    expect(前景, `${组合} 未解析到说明文字令牌`).toBeDefined()
    expect(对比度(String(前景), 卡面)).toBeGreaterThanOrEqual(4.5)
  })
})

const 向导样式 = 向导.slice(向导.indexOf('<style'))

function 局部令牌表(选择器: string): Map<string, string> {
  const 出 = new Map<string, string>()
  for (const 规则 of 向导样式.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (规则[1].replace(/\s+/g, ' ').trim() !== 选择器) continue
    for (const 条 of 规则[2].matchAll(/(-{2}[A-Za-z0-9-]+)\s*:\s*([^;]+);/g)) {
      出.set(条[1], 条[2].trim())
    }
  }
  return 出
}

function 拆色(值: string): { 通道: number[]; alpha: number } {
  const 十六 = /^#([0-9a-f]{6})$/i.exec(值.trim())
  if (十六) {
    const 串 = 十六[1]
    return {
      通道: [0, 2, 4].map((位) => Number.parseInt(串.slice(位, 位 + 2), 16)),
      alpha: 1,
    }
  }
  const 函数 = /^rgba?\(([^)]+)\)$/i.exec(值.trim())
  expect(函数, `无法解析颜色 ${值}`).not.toBeNull()
  const 段 = (函数 as RegExpMatchArray)[1].split(',').map((项) => Number.parseFloat(项.trim()))
  return { 通道: 段.slice(0, 3), alpha: 段.length > 3 ? 段[3] : 1 }
}

function 代入(值: string, 局部: Map<string, string>, 令牌: Map<string, string>): string {
  let 式 = 值
  for (let 轮 = 0; 轮 < 8 && 式.includes('var('); 轮++) {
    const 匹配 = /var\(\s*(--[A-Za-z0-9-]+)\s*\)/.exec(式)
    if (!匹配) break
    const 替 = 局部.get(匹配[1]) ?? 令牌.get(匹配[1])
    expect(替, `${匹配[1]} 未定义，无法求值`).toBeDefined()
    式 = 式.replace(匹配[0], String(替))
  }
  return 式.trim()
}

function 压色(前景: number[], alpha: number, 背景: number[]): number[] {
  return [0, 1, 2].map((位) => 前景[位] * alpha + 背景[位] * (1 - alpha))
}

function 亮度(色: number[]): number {
  const 线 = (通道: number) => {
    const 归一 = 通道 / 255
    return 归一 <= 0.03928 ? 归一 / 12.92 : Math.pow((归一 + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * 线(色[0]) + 0.7152 * 线(色[1]) + 0.0722 * 线(色[2])
}

function 最坏对比(文字值: string, 卡面值: number[]): number {
  const 文字 = 拆色(文字值)
  const 合成 = 压色(文字.通道, 文字.alpha, 卡面值)
  const 甲 = 亮度(合成)
  const 乙 = 亮度(卡面值)
  return (Math.max(甲, 乙) + 0.05) / (Math.min(甲, 乙) + 0.05)
}

const 深局部 = 局部令牌表('.ziliao-kapian')
const 浅局部 = new Map([...深局部, ...局部令牌表(":root[data-theme='light'] .ziliao-kapian")])
const 白天空 = [255, 255, 255]
const 黑夜空 = [0, 0, 0]

function 取色(名: string, 局部: Map<string, string>, 令牌: Map<string, string>): string {
  const 原始 = 局部.get(名) ?? 令牌.get(名)
  expect(原始, `${名} 未声明`).toBeDefined()
  return 代入(String(原始), 局部, 令牌)
}

function 卡面(局部: Map<string, string>, 令牌: Map<string, string>, 天空: number[]): number[] {
  const 面 = 拆色(取色('--ziliao-beijing', 局部, 令牌))
  return 压色(面.通道, 面.alpha, 天空)
}

function 块面(局部: Map<string, string>, 令牌: Map<string, string>, 天空: number[]): number[] {
  const 卡 = 卡面(局部, 令牌, 天空)
  const 块 = 拆色(取色('--ziliao-kuai-beijing', 局部, 令牌))
  return 压色(块.通道, 块.alpha, 卡)
}

describe('向导卡面不透明度与正文最坏对比度', () => {
  it('卡面背景走 --liuli-* 玻璃令牌真源，不再硬编码 rgba', () => {
    expect(向导).toContain('--ziliao-beijing: var(--liuli-fuchuang-beijing)')
    expect(向导).toContain('--ziliao-kuai-beijing: var(--liuli-kuai-beijing)')
    expect(向导).toContain('background: var(--ziliao-beijing)')
    expect(向导).not.toMatch(/\.ziliao-kapian\s*\{[^}]*background:\s*rgba\(/)
  })

  it('卡片不透明度不得低于暗 0.78 / 浅 0.85（压草地与天空仍读得清）', () => {
    expect(拆色(取色('--ziliao-beijing', 深局部, 深色表)).alpha).toBeGreaterThanOrEqual(0.78)
    expect(拆色(取色('--ziliao-beijing', 浅局部, 浅色表)).alpha).toBeGreaterThanOrEqual(0.85)
  })

  it('暗色档最坏压在白天空上，正文与提示小字对比度不小于 4.5:1', () => {
    const 卡 = 卡面(深局部, 深色表, 白天空)
    const 块 = 块面(深局部, 深色表, 白天空)
    for (const 名 of ['--ziliao-miaoshu-wenben', '--ziliao-tishi-wenben', 令牌名, '--wenben-zhuse']) {
      const 值 = 取色(名, 深局部, 深色表)
      expect(最坏对比(值, 卡), `${名} 暗色档卡面不足 4.5:1`).toBeGreaterThanOrEqual(4.5)
      expect(最坏对比(值, 块), `${名} 暗色档块面不足 4.5:1`).toBeGreaterThanOrEqual(4.5)
    }
    expect(最坏对比('#f2f0fa', 卡)).toBeGreaterThanOrEqual(3)
  })

  it('浅色档最坏压在黑夜空上，正文与提示小字对比度不小于 4.5:1', () => {
    const 卡 = 卡面(浅局部, 浅色表, 黑夜空)
    const 块 = 块面(浅局部, 浅色表, 黑夜空)
    for (const 名 of ['--ziliao-miaoshu-wenben', '--ziliao-tishi-wenben', 令牌名, '--wenben-zhuse']) {
      const 值 = 取色(名, 浅局部, 浅色表)
      expect(最坏对比(值, 卡), `${名} 浅色档卡面不足 4.5:1`).toBeGreaterThanOrEqual(4.5)
      expect(最坏对比(值, 块), `${名} 浅色档块面不足 4.5:1`).toBeGreaterThanOrEqual(4.5)
    }
    expect(最坏对比('#372a3f', 卡)).toBeGreaterThanOrEqual(3)
  })

  it('步骤描述与提示小字明暗两档都用同一组局部令牌，不再各写一套色', () => {
    for (const 名 of [
      '.buZuo-miaoShu',
      '.mbti-zhongWen',
      '.zhaNv-gouxuan',
      '.zhaNv-tishi',
      '.xinmuzhong-ta-tishi',
      '.xinmuzhong-biaoqian',
      '.anniu-fuZhu',
    ]) {
      expect(规则体(向导, 名)).toMatch(/color: var\(--ziliao-[a-z-]+\)/)
    }
    expect(向导).toContain('.suiji-xingge-tishi,\n.yixuan-jiangu-tishi {\n  font-size: 11px;\n  color: var(--ziliao-tishi-wenben);')
    expect(向导).not.toContain(":root[data-theme='light'] .buZuo-miaoShu")
    expect(向导).not.toContain(":root[data-theme='light'] .mbti-zhongWen")
    expect(向导).not.toContain(":root[data-theme='light'] .zhaNv-tishi")
    expect(向导).not.toContain(":root[data-theme='light'] .xinmuzhong-ta-tishi")
  })
})

