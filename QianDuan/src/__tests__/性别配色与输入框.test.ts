import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { 使用性别框体配色, 使用默认性别卡配色 } from '@/composables/use性别框体配色'
import { 解析性别框体色档 } from '@/utils/性别'
import { 按档解析全部, 声明块清单 } from './主题令牌真源'

const 源码根 = resolve(__dirname, '..')
const 读 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')
const 块们 = 声明块清单()
const 浅色 = 按档解析全部('light', 块们)
const 深色 = 按档解析全部('dark', 块们)

function 亮度(色: string): number {
  const 匹配 = /^#([0-9a-f]{6})$/i.exec(色.trim())
  expect(匹配, `非十六进制色值：${色}`).not.toBeNull()
  const 数值 = parseInt((匹配 as RegExpMatchArray)[1], 16)
  const 通道 = [(数值 >> 16) & 255, (数值 >> 8) & 255, 数值 & 255].map((值) => {
    const 比例 = 值 / 255
    return 比例 <= 0.03928 ? 比例 / 12.92 : ((比例 + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * 通道[0] + 0.7152 * 通道[1] + 0.0722 * 通道[2]
}

describe('性别框体色档唯一解析', () => {
  it('自身优先，其次默认性别，两者皆无兜底男档', () => {
    expect(解析性别框体色档('female', 'male')).toBe('nv')
    expect(解析性别框体色档('male', 'female')).toBe('nan')
    expect(解析性别框体色档(null, 'female')).toBe('nv')
    expect(解析性别框体色档('', 'male')).toBe('nan')
    expect(解析性别框体色档(null, null)).toBe('nan')
    expect(解析性别框体色档('未知写法', null)).toBe('nan')
  })

  it('填充与边框出自同一档，不再有第二套解析', () => {
    const 男 = 使用性别框体配色({ 自身性别: 'male', 默认性别: 'female' })
    expect(男.色档.value).toBe('nan')
    expect(男.样式.value.backgroundColor).toBe('var(--xingbie-nan-xuan-beijing)')
    expect(男.样式.value.borderColor).toBe('var(--xingbie-nan-xuan-biankuang)')
    const 女 = 使用性别框体配色({ 自身性别: 'female', 默认性别: 'male' })
    expect(女.色档.value).toBe('nv')
    expect(女.样式.value.backgroundColor).toBe('var(--xingbie-nv-xuan-beijing)')
    expect(女.样式.value.borderColor).toBe('var(--xingbie-nv-xuan-biankuang)')
  })

  it('默认性别卡档位走淡填充 + 深边框，且与饱和帧同档', () => {
    const 男 = 使用默认性别卡配色({ 自身性别: 'male', 默认性别: null })
    expect(男.样式.value.backgroundColor).toBe('var(--xingbie-nan-tan-beijing)')
    expect(男.样式.value.borderColor).toBe('var(--xingbie-nan-shen-biankuang)')
    expect(男.样式.value.color).toBe('var(--xingbie-nan-tan-wenben)')
    const 女 = 使用默认性别卡配色({ 自身性别: null, 默认性别: 'female' })
    expect(女.色档.value).toBe('nv')
    expect(女.样式.value.backgroundColor).toBe('var(--xingbie-nv-tan-beijing)')
    expect(女.样式.value.borderColor).toBe('var(--xingbie-nv-shen-biankuang)')
  })
})

describe('性别深浅令牌成对且边框确为填充的深色版', () => {
  it('两套主题均定义淡填充/淡文字/深边框与输入高亮令牌', () => {
    const 令牌 = [
      '--xingbie-nan-tan-beijing',
      '--xingbie-nan-tan-wenben',
      '--xingbie-nan-shen-biankuang',
      '--xingbie-nv-tan-beijing',
      '--xingbie-nv-tan-wenben',
      '--xingbie-nv-shen-biankuang',
      '--shuru-gao-liang-dan-nan',
      '--shuru-gao-liang-liang-nan',
      '--shuru-gao-liang-guang-nan',
      '--shuru-gao-liang-dan-nv',
      '--shuru-gao-liang-liang-nv',
      '--shuru-gao-liang-guang-nv',
    ]
    for (const 名 of 令牌) {
      expect(浅色.get(名), `浅色档缺少 ${名}`).toBeTruthy()
      expect(深色.get(名), `深色档缺少 ${名}`).toBeTruthy()
    }
  })

  it('边框亮度低于同档填充，淡填充亮度高于饱和填充', () => {
    for (const [档, 填充令牌, 边框令牌] of [
      ['浅男', '--xingbie-nan-xuan-beijing', '--xingbie-nan-xuan-biankuang'],
      ['浅女', '--xingbie-nv-xuan-beijing', '--xingbie-nv-xuan-biankuang'],
    ] as const) {
      expect(亮度(浅色.get(边框令牌) as string), `${档} 边框不是深色`).toBeLessThan(
        亮度(浅色.get(填充令牌) as string),
      )
    }
    for (const [档, 填充令牌, 边框令牌] of [
      ['深男', '--xingbie-nan-xuan-beijing', '--xingbie-nan-xuan-biankuang'],
      ['深女', '--xingbie-nv-xuan-beijing', '--xingbie-nv-xuan-biankuang'],
    ] as const) {
      expect(亮度(深色.get(边框令牌) as string), `${档} 边框不是深色`).toBeLessThan(
        亮度(深色.get(填充令牌) as string),
      )
    }
    expect(亮度(浅色.get('--xingbie-nan-tan-beijing') as string)).toBeGreaterThan(
      亮度(浅色.get('--xingbie-nan-xuan-beijing') as string),
    )
    expect(亮度(浅色.get('--xingbie-nv-tan-beijing') as string)).toBeGreaterThan(
      亮度(浅色.get('--xingbie-nv-xuan-beijing') as string),
    )
  })
})

describe('圆角输入框两条高亮线与实现收敛', () => {
  const 输入框 = 读('components/表单/长方框输入框.vue')

  it('真实 border + 圆角，聚焦只留底边与右边两条渐变线', () => {
    expect(输入框).toContain('border: var(--chang-fang-kuang-hou-du) solid var(--chang-fang-kuang-hui-se)')
    expect(输入框).toContain('border-radius: var(--chang-fang-kuang-yuan-jiao)')
    expect(输入框).toContain(':focus-within::before')
    expect(输入框).toContain(':focus-within::after')
    expect(输入框.match(/linear-gradient\(/g)?.length, '只应剩底边与右边两条渐变').toBe(2)
    expect(输入框).not.toContain('@keyframes')
    expect(输入框).not.toContain('data-jiao-dian-guo')
  })

  it('两条线共用同一时长令牌（同时出发、同时到位）', () => {
    expect(输入框).toContain('transition-duration: var(--shuru-gao-liang-shi-chang)')
    expect(输入框).not.toContain('shuru-bian-yi')
  })

  it('女档由根节点属性切换，未设置或男档走蓝色', () => {
    expect(输入框).toContain(":root[data-xing-bie='nv'] .chang-fang-kuang-ke")
    expect(输入框).toContain('var(--shuru-gao-liang-dan-nan)')
    expect(输入框).toContain('var(--shuru-gao-liang-dan-nv)')
    expect(读('根组件.vue')).toContain('document.documentElement.dataset.xingBie')
  })
})

describe('第三步悬停取对象性别半透明、选中取自身性别', () => {
  const 向导 = 读('views/资料设置向导.vue')

  it('悬停边框取对象性别档并混入 50% 透明', () => {
    expect(向导).toContain("--mbti-xuan-ze-bian: var(--xingbie-nan-xuan-biankuang)")
    expect(向导).toContain("--mbti-xuan-ze-bian: var(--xingbie-nv-xuan-biankuang)")
    expect(向导).toContain('color-mix(in srgb, var(--mbti-xuan-ze-bian) 50%, transparent)')
  })

  it('选中边框随自身性别档，滚动区左右同值内边距不裁高亮环', () => {
    expect(向导).toContain('--xuanzhong-xingbie-bian: var(--xingbie-nan-xuan-biankuang)')
    expect(向导).toContain('--xuanzhong-xingbie-bian: var(--xingbie-nv-xuan-biankuang)')
    expect(向导).toContain('padding-inline: var(--jiange-4)')
    expect(向导).not.toContain('padding-right: var(--jiange-4)')
  })

  it('渣型勾选框复用共享组件，注册页同款尺寸与 accent 令牌', () => {
    expect(向导).toContain('<XingBieGouXuan')
    expect(向导).not.toContain('class="zhaXing-gouxuan"')
    const 勾选框 = 读('components/表单/性别勾选框.vue')
    expect(勾选框).toContain('width: var(--gou-xuan-chi-cun)')
    expect(勾选框).toContain('height: var(--gou-xuan-chi-cun)')
    expect(勾选框).toContain('accent-color: var(--xing-bie-gou-xuan-se)')
    expect(勾选框).toContain('--xingbie-nan-xuan-biankuang')
    expect(勾选框).toContain('--xingbie-nv-xuan-biankuang')
    expect(勾选框).toContain('indeterminate')
  })
})
