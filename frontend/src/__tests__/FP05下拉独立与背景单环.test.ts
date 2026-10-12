import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createPinia, setActivePinia } from 'pinia'

function 读源码(相对路径: string): string {
  return readFileSync(resolve(__dirname, 相对路径), 'utf-8')
}

const 翻译框源 = 读源码('../components/聊天/翻译结果框.vue').replace(/\/\*[\s\S]*?\*\//g, '')
const 战绩源 = 读源码('../views/过往战绩.vue').replace(/\/\*[\s\S]*?\*\//g, '')
const 账号源 = 读源码('../views/账号与安全.vue')

function 规则体(源: string, 选择器: string): string {
  const 无注释 = 源.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, ' ')
  const 转义 = 选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`${转义}\\s*\\{([^}]*)\\}`).exec(无注释)?.[1] ?? ''
}

vi.mock('@/api/社交', () => ({
  huoQuYongHuSheZhi: vi.fn(),
  baoCunLiaoTianBeiJing: vi.fn(),
  baoCunQiPao: vi.fn().mockResolvedValue(undefined),
  baoCunYinSiSheZhi: vi.fn().mockResolvedValue(undefined),
  qingKongPaiWeiShuJu: vi.fn().mockResolvedValue(undefined),
}))

describe('FP-05 需求9 翻译下拉与战绩下拉各自独立四态俱全', () => {
  it('两套各存一份类名不共用统一组件', () => {
    expect(翻译框源).toContain('.fanyi-yuyan-xiala')
    expect(翻译框源).not.toContain('yi-dong-fenlei')
    expect(战绩源).toContain('.yi-dong-fenlei')
    expect(战绩源).not.toContain('fanyi-yuyan-xiala')
  })

  it('箭头同源但度量各自独立', () => {
    const 箭头 = "stroke='%23999' stroke-width='1.5'"
    expect(翻译框源).toContain(箭头)
    expect(战绩源).toContain(箭头)
    expect(翻译框源).toContain('background-position: right 12px center')
    expect(战绩源).toContain('background-position: right 12px center')
    const 翻译内边距 = /\.fanyi-yuyan-xiala\s*\{[^}]*padding:\s*([^;]+);/.exec(翻译框源)?.[1] ?? ''
    const 战绩内边距 = /\.yi-dong-fenlei\s*\{[^}]*padding:\s*([^;]+);/.exec(战绩源)?.[1] ?? ''
    expect(翻译内边距).not.toBe('')
    expect(战绩内边距).not.toBe('')
    expect(翻译内边距.replace(/\s+/g, ' ')).not.toBe(战绩内边距.replace(/\s+/g, ' '))
  })

  it('翻译下拉四态俱全', () => {
    expect(翻译框源).toMatch(/\.fanyi-yuyan-xiala\s*\{[^}]*border:/)
    expect(翻译框源).toMatch(/\.fanyi-yuyan-xiala:hover:not\(:disabled\)\s*\{[^}]*border-color:/)
    expect(翻译框源).toMatch(/\.fanyi-yuyan-xiala:disabled\s*\{[^}]*opacity:/)
    expect(翻译框源).toMatch(/\.fanyi-yuyan-xiala:focus-visible/)
  })

  it('战绩下拉四态俱全且悬停走战绩紫 bespoke', () => {
    expect(战绩源).toMatch(/\.yi-dong-fenlei\s*\{[^}]*border:/)
    const 悬停 = 规则体(战绩源, '.yi-dong-fenlei:hover:not(:disabled)')
    expect(悬停).toMatch(/border-color:\s*var\(--yanse-zhanji\)/)
    expect(战绩源).toMatch(/\.yi-dong-fenlei:disabled\s*\{[^}]*opacity:/)
    expect(战绩源).toMatch(/\.yi-dong-fenlei:focus-visible\s*\{[^}]*outline:/)
    const 翻译悬停 = 规则体(翻译框源, '.fanyi-yuyan-xiala:hover:not(:disabled)')
    expect(翻译悬停).not.toContain('--yanse-zhanji')
  })
})

describe('FP-05 需求12 背景三态单环化', () => {
  it('选中单环化有边无环', () => {
    const 选中 = 规则体(账号源, '.beijing-xiangmu.beiXuanZhong')
    expect(选中).not.toBe('')
    expect(选中).toMatch(/border-color:/)
    expect(选中).not.toMatch(/outline:/)
  })

  it('搜索高亮单环化有环无选中色边框', () => {
    const 高亮 = 规则体(账号源, '.zhi-wu-ka-pian.sou-zhong-gao-liang')
    expect(高亮).not.toBe('')
    expect(高亮).toMatch(/outline:/)
    expect(高亮).not.toContain('var(--taoTu)')
  })

  it('未选中悬停选中三色可辨', () => {
    const 基态 = 规则体(账号源, '.beijing-xiangmu')
    const 悬停 = 规则体(账号源, '.zhang-hao-an-quan .beijing-xiangmu:hover:not(.beiXuanZhong)')
    const 选中 = 规则体(账号源, '.beijing-xiangmu.beiXuanZhong')
    const 基色 = /border:\s*[^;]*var\((--[^)]+)\)/.exec(基态)?.[1] ?? ''
    const 悬色 = /border-color:\s*var\((--[^)]+)\)/.exec(悬停)?.[1] ?? ''
    const 选色 = /border-color:\s*var\((--[^)]+)\)/.exec(选中)?.[1] ?? ''
    expect(基色).not.toBe('')
    expect(悬色).not.toBe('')
    expect(选色).not.toBe('')
    expect(new Set([基色, 悬色, 选色]).size).toBe(3)
  })

  it('悬停已选项不丢选中', () => {
    const 选中悬停 = 规则体(账号源, '.zhang-hao-an-quan .beijing-xiangmu.beiXuanZhong:hover')
    expect(选中悬停).toMatch(/border-color:\s*var\(--yeLvShen\)/)
    const 男选中悬停 = 规则体(
      账号源,
      '.zhang-hao-an-quan .xingbie-kapian.xingbie-nan.beiXuanZhong:hover',
    )
    const 女选中悬停 = 规则体(
      账号源,
      '.zhang-hao-an-quan .xingbie-kapian.xingbie-nv.beiXuanZhong:hover',
    )
    expect(男选中悬停).toMatch(/border-color:\s*var\(--xingbie-nan-xuan-biankuang\)/)
    expect(女选中悬停).toMatch(/border-color:\s*var\(--xingbie-nv-xuan-biankuang\)/)
  })

  it('顶层默认按钮口径与分组一致查双列', () => {
    const 模板 = 账号源.slice(0, 账号源.indexOf('<style'))
    expect(模板).toContain('liaoTianBeiJingQian')
    expect(模板).toContain('liaoTianBeiJingShen')
    expect(模板).not.toMatch(/设置仓库\.liaoTianBeiJing ===/)
  })

  it('全仓同类双边框清零有边有环不同时出现', () => {
    for (const [名, 源] of [
      ['账号', 账号源],
      ['战绩', 战绩源],
    ] as const) {
      const 无注释 = 源.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, ' ')
      for (const 匹配 of 无注释.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const 选择器 = 匹配[1].replace(/\s+/g, ' ').trim()
        const 体 = 匹配[2]
        if (!/(beiXuanZhong|sou-zhong-gao-liang)/.test(选择器)) continue
        if (!/outline:/.test(体)) continue
        expect(
          体,
          `${名} ${选择器} 双边框未根治`,
        ).not.toMatch(/border(-color|-width)?\s*:/)
      }
    }
  })
})

describe('FP-05 需求12 背景切换失败回滚', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('保存失败恢复旧值并记录错误', async () => {
    const 社交 = await import('@/api/社交')
    vi.mocked(社交.baoCunLiaoTianBeiJing).mockRejectedValueOnce(new Error('wang-luo-boom'))
    const { 使用用户设置仓库 } = await import('@/stores/用户设置')
    const 仓库 = 使用用户设置仓库()
    仓库.liaoTianBeiJingQian = 'fenSeMengJing'
    仓库.liaoTianBeiJingShen = 'miWuSenLin'
    await 仓库.qieHuanBeiJing('yeKongXingHe', 'qian')
    expect(仓库.liaoTianBeiJingQian).toBe('fenSeMengJing')
    expect(仓库.liaoTianBeiJingShen).toBe('miWuSenLin')
    expect(仓库.caoZuoCuoWu).not.toBeNull()
  })

  it('保存成功保持新值', async () => {
    const 社交 = await import('@/api/社交')
    vi.mocked(社交.baoCunLiaoTianBeiJing).mockResolvedValueOnce(undefined)
    const { 使用用户设置仓库 } = await import('@/stores/用户设置')
    const 仓库 = 使用用户设置仓库()
    仓库.liaoTianBeiJingQian = 'fenSeMengJing'
    await 仓库.qieHuanBeiJing('yeKongXingHe', 'qian')
    expect(仓库.liaoTianBeiJingQian).toBe('yeKongXingHe')
  })
})
