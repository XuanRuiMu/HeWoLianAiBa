import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import 资料设置向导 from '@/views/资料设置向导.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

const 向导 = readFileSync(resolve(__dirname, '../views/资料设置向导.vue'), 'utf8')
const 样式 = 向导.slice(向导.indexOf('<style'))

function 规则体们(选择器: string): string[] {
  const 转义 = 选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const 出: string[] = []
  for (const 匹配 of 样式.matchAll(new RegExp(`(?:^|\\n)\\s*${转义}\\s*\\{([^}]*)\\}`, 'g'))) {
    出.push(匹配[1])
  }
  expect(出.length, `缺少规则 ${选择器}`).toBeGreaterThan(0)
  return 出
}

function 规则体(选择器: string): string {
  return 规则体们(选择器)[0]
}

beforeEach(() => {
  localStorage.clear()
})

const 清理们: Array<() => void> = []

afterEach(() => {
  while (清理们.length) 清理们.pop()?.()
})

describe('性格卡零白填充：hover、聚焦、选中三态均无背景叠加', () => {
  it('hover 态只动边框与位移，不写任何背景', () => {
    const 体 = 规则体('.mbti-kaPian:hover:not(.beiXuanZhong)')
    expect(体).not.toContain('background')
    expect(体).toContain('border-color: var(--xingge-gao-guang-bian-ji)')
    expect(体).toContain('transform: translateY(-1px)')
  })

  it('选中态只动边框与光晕，不写任何背景叠加', () => {
    const 体 = 规则体('.mbti-kaPian.beiXuanZhong')
    expect(体).not.toContain('background')
    expect(体).toContain('border: 1px solid var(--xingge-gao-guang-bian-zhong)')
    expect(体).toContain('box-shadow: 0 0 10px var(--xingge-liu-guang-di)')
  })

  it('随机卡不再自带 hover 与选中的独立背景规则，统一走通用卡规则', () => {
    expect(样式).not.toContain('.suiJi-kaPian:hover:not(.beiXuanZhong)')
    expect(样式).not.toContain('.suiJi-kaPian.beiXuanZhong {')
  })

  it('白色填充令牌随填充一起删除，不留零消费者幻影令牌', () => {
    expect(样式).not.toContain('--xingge-gao-guang-ji:')
    expect(样式).not.toContain('--xingge-gao-guang-zhong:')
  })

  it('浅色档不再需要 hover 边框覆写（令牌已按主题分流）', () => {
    expect(样式).not.toContain(":root[data-theme='light'] .mbti-kaPian:hover")
  })
})

describe('性格卡高光边框：仅交互态出现局部水墨流动', () => {
  it('静止卡不显示高光也不运行动画', () => {
    const 体 = 规则体('.mbti-kaPian::after')
    expect(体).toContain('opacity: 0')
    expect(体).not.toContain('animation:')
  })

  it('高光环为恒定实线边框，不再是 conic 渐变环', () => {
    const 体 = 规则体('.mbti-kaPian::after')
    expect(体).toContain('border: 2px solid var(--xingge-liu-guang-yan)')
    expect(体).not.toContain('conic-gradient')
    expect(体).toContain('opacity: 0')
    expect(体).toContain('pointer-events: none')
  })

  it('hover、键盘聚焦、选中分别启动同一呼吸与漂移动画，不复制高光逻辑', () => {
    for (const 选择器 of [
      '.mbti-kaPian:hover:not(.beiXuanZhong)::after',
      '.mbti-kaPian:focus-visible::after',
      '.mbti-kaPian.beiXuanZhong::after',
    ]) {
      expect(规则体(选择器)).toContain(
        'xingge-huxi var(--xingge-huxi-zhouqi) ease-in-out infinite alternate',
      )
      expect(规则体(选择器)).toContain(
        'xingge-liu-guang-piao var(--xingge-piao-zhouqi) ease-in-out infinite alternate',
      )
    }
    expect(样式.match(/animation:\s+xingge-huxi /g)).toHaveLength(3)
    const 呼吸体 = 规则体('@keyframes xingge-huxi')
    expect(呼吸体).toContain('opacity')
    expect(呼吸体).toContain('var(--xingge-huxi-an)')
    expect(呼吸体).not.toMatch(/transform|rotate|translate|width|height|border-width/)
    const 漂移体 = 规则体('@keyframes xingge-liu-guang-piao')
    expect(漂移体).toContain('background-position')
    expect(漂移体).not.toMatch(/transform|rotate|translate|width|height|border-width/)
  })

  it('呼吸周期落在肉眼可辨但不闪烁的区间，且由组件变量统一调参', () => {
    const 令牌 = 规则体们('.ziliao-kapian').join('\n')
    const 呼吸 = 令牌.match(/--xingge-huxi-zhouqi:\s*([\d.]+)s/)
    expect(呼吸).not.toBeNull()
    expect(Number(呼吸![1])).toBeGreaterThanOrEqual(2.2)
    expect(Number(呼吸![1])).toBeLessThanOrEqual(3)
    const 漂移 = 令牌.match(/--xingge-piao-zhouqi:\s*([\d.]+)s/)
    expect(漂移).not.toBeNull()
    expect(Number(漂移![1])).toBeGreaterThanOrEqual(6)
    expect(令牌).toContain('--xingge-huxi-an: 0.4')
    expect(令牌).toContain('--xingge-huxi-liang: 1')
    expect(令牌).toContain('--xingge-huxi-an-xuan: 0.82')
  })

  it('hover 与聚焦不叠发光阴影，只有选中态额外呼吸外发光', () => {
    for (const 选择器 of [
      '.mbti-kaPian:hover:not(.beiXuanZhong)',
      '.mbti-kaPian:focus-visible',
    ]) {
      expect(规则体(选择器)).not.toContain('box-shadow')
      expect(规则体(选择器)).not.toContain('animation')
    }
    const 选中体 = 规则体('.mbti-kaPian.beiXuanZhong')
    expect(选中体).toContain(
      'animation: xingge-huxi-guang-yun var(--xingge-huxi-zhouqi) ease-in-out infinite alternate',
    )
    const 光晕体 = 规则体('@keyframes xingge-huxi-guang-yun')
    expect(光晕体).toContain('box-shadow')
    expect(光晕体).not.toMatch(/transform|width|height|inset/)
  })

  it('水墨层用四层局部渐变和边框遮罩，不产生全卡白色填充', () => {
    const 体 = 规则体('@supports ((-webkit-mask-composite: xor) or (mask-composite: exclude))')
    expect(体).toContain('.mbti-kaPian::after')
    expect(体.match(/radial-gradient\(/g)).toHaveLength(4)
    expect(体).toContain('padding: var(--jiange-2)')
    expect(体).toContain('border-width: 0')
    expect(体).toContain('-webkit-mask-composite: xor')
    expect(体).toContain('mask-composite: exclude')
    expect(体).not.toContain('background-color:')
  })

  it('不支持 mask 时保留无填充的边框透明度降级', () => {
    const 体 = 规则体('.mbti-kaPian::after')
    expect(体).toContain('border: 2px solid var(--xingge-liu-guang-yan)')
    expect(体).not.toContain('background:')
    expect(体).not.toContain('mask:')
  })

  it('hover 与键盘聚焦从同一低亮度起点开始流动', () => {
    for (const 选择器 of [
      '.mbti-kaPian:hover:not(.beiXuanZhong)::after',
      '.mbti-kaPian:focus-visible::after',
    ]) {
      const 体 = 规则体(选择器)
      expect(体).toContain('opacity: 0.55')
      expect(体).toContain('animation:')
      expect(体).toContain('xingge-huxi var(--xingge-huxi-zhouqi)')
    }
  })

  it('选中态全亮呼吸', () => {
    const 体 = 规则体('.mbti-kaPian.beiXuanZhong::after')
    expect(体).toContain('opacity: 1')
    expect(体).toContain('--xingge-huxi-an: var(--xingge-huxi-an-xuan)')
    expect(体).toContain('xingge-huxi var(--xingge-huxi-zhouqi)')
  })

  it('转圈时代的角度属性已整体移除', () => {
    expect(向导).not.toContain('--xingge-liu-guang-jiao')
    expect(向导).not.toContain('xingge-liu-guang ')
    expect(向导).not.toContain('@property')
  })

  it('键盘聚焦撤掉全局 outline 改用高亮边框指示', () => {
    const 体 = 规则体('.mbti-kaPian:focus-visible')
    expect(体).toContain('outline: none')
    expect(体).toContain('border-color: var(--xingge-gao-guang-bian-zhong)')
  })

  it('减动效偏好下呼吸停转', () => {
    const 减动效块 = 样式.slice(样式.indexOf('@media (prefers-reduced-motion: reduce)'))
    const 卡环体 = 减动效块.slice(
      减动效块.indexOf('.mbti-kaPian::after {'),
      减动效块.indexOf('}', 减动效块.indexOf('.mbti-kaPian::after {')),
    )
    expect(卡环体).toContain('transition: none !important')
    expect(卡环体).toContain('animation: none !important')
    const 选中块 = 减动效块.slice(
      减动效块.indexOf('.mbti-kaPian.beiXuanZhong {'),
      减动效块.indexOf('}', 减动效块.indexOf('.mbti-kaPian.beiXuanZhong {')),
    )
    expect(选中块).toContain('animation: none !important')
  })
})

describe('深浅主题下高光边框令牌均清晰可见', () => {
  it('深色档流光与边框为白色系', () => {
    const 深块 = 规则体们('.ziliao-kapian').join('\n')
    expect(深块).toContain('--xingge-gao-guang-bian-ji: rgba(255, 255, 255, 0.18)')
    expect(深块).toContain('--xingge-gao-guang-bian-zhong: rgba(255, 255, 255, 0.4)')
    expect(深块).toContain('--xingge-liu-guang-yan: rgba(255, 255, 255, 0.95)')
    expect(深块).toContain('--xingge-liu-guang-di: rgba(255, 255, 255, 0.22)')
  })

  it('浅色档流光与边框换深紫系，白光不在浅卡面消失', () => {
    const 体 = 规则体(":root[data-theme='light'] .ziliao-kapian")
    expect(体).toContain('--xingge-gao-guang-bian-ji: rgba(120, 90, 140, 0.2)')
    expect(体).toContain('--xingge-gao-guang-bian-zhong: rgba(90, 60, 110, 0.42)')
    expect(体).toContain('--xingge-liu-guang-yan: rgba(90, 60, 110, 0.88)')
    expect(体).toContain('--xingge-liu-guang-di: rgba(90, 60, 110, 0.24)')
  })
})

describe('随机卡与普通卡共享盒模型', () => {
  const 样式内容 = 样式.replace(/^<style[^>]*>/, '').replace(/<\/style>\s*$/, '')
  const 窄屏起点 = 样式内容.indexOf('@media (max-width: 480px)')
  const 窄屏终点 = 样式内容.indexOf('\n@keyframes', 窄屏起点)
  const 窄屏块 = 样式内容.slice(窄屏起点, 窄屏终点)
  const 窄屏内容 = 窄屏块.slice(窄屏块.indexOf('{') + 1, 窄屏块.lastIndexOf('}'))

  function 读取长度(值: string, 根样式: CSSStyleDeclaration): number {
    const 变量 = 值.match(/var\((--[^)]+)\)/)
    const 实际值 = 变量 ? 根样式.getPropertyValue(变量[1]) : 值
    return Number.parseFloat(实际值) || 0
  }

  function 创建矩形(left: number, top: number, width: number, height: number): DOMRect {
    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    } as DOMRect
  }

  function 挂载几何栅格(普通数量: number, 窄屏: boolean) {
    const pinia = createPinia()
    setActivePinia(pinia)
    const 仓库 = 使用认证表单仓库()
    仓库.ziLiaoShuJu.xingBie = 'male'
    仓库.ziLiaoShuJu.muBiaoXingBie = 'female'
    仓库.ziLiaoDangQianBuZhou = 3
    const 包 = mount(资料设置向导, {
      attachTo: document.body,
      global: { plugins: [pinia] },
    })
    const 样式元素 = document.createElement('style')
    样式元素.textContent = `:root { --jiange-2: 2px; --jiange-4: 4px; --jiange-6: 6px; --jiange-xiao: 8px; --jiange-10: 10px; }\n${样式内容}\n${窄屏 ? 窄屏内容 : ''}`
    document.head.append(样式元素)
    清理们.push(() => {
      包.unmount()
      样式元素.remove()
    })

    const 网格 = 包.get('.mbti-wangGe').element as HTMLElement
    const 普通卡们 = Array.from(
      网格.querySelectorAll<HTMLElement>('.mbti-kaPian:not(.suiJi-kaPian)'),
    )
    for (const 卡 of 普通卡们.slice(普通数量)) 卡.remove()
    const 可见普通卡们 = 普通卡们.slice(0, 普通数量)
    const 随机卡 = 网格.querySelector<HTMLElement>('.mbti-kaPian.suiJi-kaPian')!
    const 卡们 = [...可见普通卡们, 随机卡]
    const 根样式 = getComputedStyle(document.documentElement)
    const 网格样式 = getComputedStyle(网格)
    const 列匹配 = 网格样式.gridTemplateColumns.match(/repeat\((\d+)/)
    expect(列匹配).not.toBeNull()
    const 列数 = Number(列匹配![1])
    const 列间距 =
      读取长度(网格样式.columnGap, 根样式) || 读取长度(网格样式.gap, 根样式)
    const 行间距 =
      读取长度(网格样式.rowGap, 根样式) || 读取长度(网格样式.gap, 根样式)
    const 网格宽度 = 400
    const 轨道宽度 = (网格宽度 - 列间距 * (列数 - 1)) / 列数
    const 占用 = new Set<string>()
    let 当前行 = 1
    let 当前列 = 1

    for (const 卡 of 卡们) {
      const 卡样式 = getComputedStyle(卡)
      const 定位 = 卡样式.gridColumn
      const 起跨 = 定位.match(/^(\d+)\s*\/\s*span\s+(\d+)$/)
      const 起止 = 定位.match(/^(\d+)\s*\/\s*(\d+)$/)
      const 跨列匹配 = 定位.match(/span\s+(\d+)/)
      let 开始列 = 起跨 || 起止 ? Number((起跨 || 起止)![1]) : 0
      let 跨列 = 起跨
        ? Number(起跨[2])
        : 起止
          ? Number(起止[2]) - 开始列
          : 跨列匹配
            ? Number(跨列匹配[1])
            : 1
      if (/-1\s*$/.test(定位)) {
        开始列 = 1
        跨列 = 列数
      }
      const 最小高度 = 读取长度(卡样式.minHeight, 根样式)
      let 行 = 当前行
      let 列 = 开始列 || 当前列
      const 冲突 = (候选行: number, 候选列: number) =>
        Array.from({ length: 跨列 }, (_, 偏移) => `${候选行}:${候选列 + 偏移}`).some(
          (键) => 占用.has(键),
        )
      while (
        列 + 跨列 > 列数 + 1 ||
        冲突(行, 列) ||
        (!开始列 && 列 < 当前列 && 行 === 当前行)
      ) {
        if (!开始列 && 列 + 跨列 <= 列数 + 1) {
          列++
        } else {
          行++
          列 = 开始列 || 1
        }
      }
      for (let 偏移 = 0; 偏移 < 跨列; 偏移++) 占用.add(`${行}:${列 + 偏移}`)
      当前行 = 行
      当前列 = 列 + 跨列
      if (当前列 > 列数) {
        当前行++
        当前列 = 1
      }
      const 区域左 = (列 - 1) * (轨道宽度 + 列间距)
      const 区域宽 = 轨道宽度 * 跨列 + 列间距 * (跨列 - 1)
      const 宽度表达式 = 卡样式.width.match(
        /calc\(\(100% - (\d+) \* (var\(--[^)]+\))\) \/ (\d+)\)/,
      )
      const 宽度 = 宽度表达式
        ? (网格宽度 - Number(宽度表达式[1]) * 读取长度(宽度表达式[2], 根样式)) /
          Number(宽度表达式[3])
        : 区域宽
      const 左 =
        卡样式.justifySelf === 'center' ? 区域左 + (区域宽 - 宽度) / 2 : 区域左
      const 上 = (行 - 1) * (最小高度 + 行间距)
      const 矩形 = 创建矩形(左, 上, 宽度, 最小高度)
      vi.spyOn(卡, 'getBoundingClientRect').mockReturnValue(矩形)
    }
    vi.spyOn(网格, 'getBoundingClientRect').mockReturnValue(
      创建矩形(0, 0, 网格宽度, 0),
    )
    return { 包, 网格, 普通卡们: 可见普通卡们, 随机卡, 列数 }
  }

  function 期望几何(普通数量: number, 窄屏: boolean, 预期列数: number) {
    const { 网格, 普通卡们, 随机卡, 列数 } = 挂载几何栅格(普通数量, 窄屏)
    expect(列数).toBe(预期列数)
    expect(普通卡们).toHaveLength(普通数量)
    const 随机矩形 = 随机卡.getBoundingClientRect()
    const 网格矩形 = 网格.getBoundingClientRect()
    expect(随机矩形.left + 随机矩形.width / 2).toBeCloseTo(
      网格矩形.left + 网格矩形.width / 2,
      6,
    )
    expect(
      普通卡们.every((卡) => 卡.getBoundingClientRect().bottom < 随机矩形.top),
    ).toBe(true)
    expect(普通卡们.some((卡) => 卡.getBoundingClientRect().top === 随机矩形.top)).toBe(
      false,
    )
    for (const 卡 of 普通卡们) {
      const 矩形 = 卡.getBoundingClientRect()
      expect(随机矩形.width).toBeCloseTo(矩形.width, 6)
      expect(随机矩形.height).toBeCloseTo(矩形.height, 6)
    }
    const 普通行 = new Map<number, number>()
    for (const 卡 of 普通卡们) {
      const 上 = 卡.getBoundingClientRect().top
      普通行.set(上, (普通行.get(上) || 0) + 1)
    }
    expect(普通行.size).toBe(Math.ceil(普通数量 / 预期列数))
    expect(Array.from(普通行.values()).at(-1)).toBe(((普通数量 - 1) % 预期列数) + 1)
  }

  for (const 普通数量 of [16, 15, 14]) {
    it(`桌面 ${普通数量} 张普通卡时随机卡等宽、独占下一行并居中`, () => {
      期望几何(普通数量, false, 4)
    })
  }

  for (const 普通数量 of [16, 15, 14]) {
    it(`窄屏 ${普通数量} 张普通卡时随机卡等宽、独占下一行并居中`, () => {
      期望几何(普通数量, true, 3)
    })
  }

  it.each([false, true])('窄屏=%s 时两类卡的盒模型与共享文字样式完全一致', (窄屏) => {
    const { 普通卡们, 随机卡 } = 挂载几何栅格(15, 窄屏)
    const 普通卡 = 普通卡们[0]
    const 普通样式 = getComputedStyle(普通卡)
    const 随机样式 = getComputedStyle(随机卡)
    for (const 属性 of [
      'box-sizing',
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
      'min-height',
      'border-top-width',
      'border-right-width',
      'border-bottom-width',
      'border-left-width',
      'border-style',
      'border-color',
      'border-radius',
    ]) {
      expect(随机样式.getPropertyValue(属性)).toBe(普通样式.getPropertyValue(属性))
    }
    const 根样式 = getComputedStyle(document.documentElement)
    const 水平盒差 =
      读取长度(普通样式.paddingLeft, 根样式) +
      读取长度(普通样式.paddingRight, 根样式) +
      读取长度(普通样式.borderLeftWidth, 根样式) +
      读取长度(普通样式.borderRightWidth, 根样式)
    const 垂直盒差 =
      读取长度(普通样式.paddingTop, 根样式) +
      读取长度(普通样式.paddingBottom, 根样式) +
      读取长度(普通样式.borderTopWidth, 根样式) +
      读取长度(普通样式.borderBottomWidth, 根样式)
    expect(随机卡.getBoundingClientRect().width - 水平盒差).toBeCloseTo(
      普通卡.getBoundingClientRect().width - 水平盒差,
      6,
    )
    expect(随机卡.getBoundingClientRect().height - 垂直盒差).toBeCloseTo(
      普通卡.getBoundingClientRect().height - 垂直盒差,
      6,
    )
    for (const 类名 of ['mbti-zhongWen', 'mbti-miaoShu']) {
      const 普通文字 = getComputedStyle(普通卡.querySelector(`.${类名}`)!)
      const 随机文字 = getComputedStyle(随机卡.querySelector(`.${类名}`)!)
      for (const 属性 of ['font-size', 'font-weight', 'color', 'line-height']) {
        expect(随机文字.getPropertyValue(属性)).toBe(普通文字.getPropertyValue(属性))
      }
    }
  })

  it('随机卡和普通卡位于同一栅格且只多一个布局类', () => {
    const { 普通卡们, 随机卡 } = 挂载几何栅格(16, false)
    expect(随机卡.parentElement).toBe(普通卡们[0].parentElement)
    expect(随机卡.classList).toHaveLength(2)
    expect(Array.from(随机卡.classList).sort()).toEqual(['mbti-kaPian', 'suiJi-kaPian'])
  })
})

describe('第三步性格卡键盘可达与选中交互', () => {
  function 挂到第三步(): {
    pinia: Pinia
    仓库: ReturnType<typeof 使用认证表单仓库>
    包: VueWrapper
  } {
    const pinia = createPinia()
    setActivePinia(pinia)
    const 仓库 = 使用认证表单仓库()
    仓库.ziLiaoShuJu.xingBie = 'male'
    仓库.ziLiaoShuJu.muBiaoXingBie = 'female'
    仓库.ziLiaoDangQianBuZhou = 3
    const 包 = mount(资料设置向导, { global: { plugins: [pinia] } })
    return { pinia, 仓库, 包 }
  }

  it('十六张 MBTI 卡加一张随机卡全部是原生 button，Tab 键盘可达', () => {
    const { 包 } = 挂到第三步()
    const 卡们 = 包.findAll('.mbti-kaPian')
    expect(卡们).toHaveLength(17)
    expect(包.findAll('.mbti-kaPian.suiJi-kaPian')).toHaveLength(1)
    for (const 卡 of 卡们) {
      expect(卡.element.tagName).toBe('BUTTON')
      expect(卡.attributes('tabindex')).toBeUndefined()
    }
  })

  it('静置卡无选中类也无内联填充样式', () => {
    const { 包 } = 挂到第三步()
    expect(包.findAll('.mbti-kaPian.beiXuanZhong')).toHaveLength(0)
    for (const 卡 of 包.findAll('.mbti-kaPian')) {
      expect(卡.attributes('style')).toBeUndefined()
    }
  })

  it('选中只切换卡片状态，不覆写文字颜色、字重或阴影', async () => {
    expect(样式).not.toContain('.mbti-kaPian.beiXuanZhong .mbti-daiMa')
    expect(样式).not.toContain('.mbti-kaPian.beiXuanZhong .mbti-zhongWen')
    const { 包 } = 挂到第三步()
    const 目标 = 包.findAll('.mbti-kaPian')[2]
    const 代码 = 目标.find('.mbti-daiMa')
    const 中文 = 目标.find('.mbti-zhongWen')
    const 选前代码属性 = { ...代码.attributes() }
    const 选前中文属性 = { ...中文.attributes() }
    await 目标.trigger('click')
    expect(目标.classes()).toContain('beiXuanZhong')
    expect(代码.attributes()).toEqual(选前代码属性)
    expect(中文.attributes()).toEqual(选前中文属性)
  })

  it('点选性格卡后仅该卡带选中类，且不注入任何内联背景', async () => {
    const { 仓库, 包 } = 挂到第三步()
    const 目标 = 包.findAll('.mbti-kaPian')[2]
    await 目标.trigger('click')

    expect(仓库.ziLiaoShuJu.xingGeXuanZe).toBe('INFJ')
    expect(目标.classes()).toContain('beiXuanZhong')
    expect(包.findAll('.mbti-kaPian.beiXuanZhong')).toHaveLength(1)
    expect(目标.attributes('style')).toBeUndefined()
  })

  it('点随机卡后选中类从性格卡迁移到随机卡', async () => {
    const { 包 } = 挂到第三步()
    const 性格卡 = 包.findAll('.mbti-kaPian')[2]
    await 性格卡.trigger('click')
    const 随机卡 = 包.find('.mbti-kaPian.suiJi-kaPian')
    await 随机卡.trigger('click')

    expect(随机卡.classes()).toContain('beiXuanZhong')
    expect(性格卡.classes()).not.toContain('beiXuanZhong')
    expect(随机卡.attributes('style')).toBeUndefined()
  })
})
