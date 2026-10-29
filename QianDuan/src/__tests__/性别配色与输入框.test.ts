import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import 长方框输入框 from '@/components/表单/长方框输入框.vue'
import { 领取聚焦入场许可, 重置聚焦秩序 } from '@/utils/输入聚焦秩序'
import '@/styles/设计令牌.css'
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
      '--shuru-gao-liang-liang-nan',
      '--shuru-gao-liang-liang-nv',
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

describe('圆角长方形输入框：左下起笔、两路等长、右上汇合', () => {
  const 输入框 = 读('components/表单/长方框输入框.vue')
  const 描边 = 读('components/表单/圆角描边.vue')
  const 横条 = 读('components/表单/横条输入框.vue')

  it('默认仍是圆角长方形，不额外加高光与外部光圈', () => {
    expect(输入框).toContain('border: var(--chang-fang-kuang-hou-du) solid var(--chang-fang-kuang-hui-se)')
    expect(输入框).toContain('border-radius: var(--chang-fang-kuang-yuan-jiao)')
    expect(输入框).not.toContain('box-shadow')
    expect(输入框).not.toContain('linear-gradient(')
    expect(输入框).not.toContain('focus-within::before')
    expect(输入框).not.toContain('focus-within::after')
  })

  it('描边只覆盖原有边框：线宽取边框令牌、起点在左下圆弧中点、终点在右上圆弧中点', () => {
    expect(输入框).toContain('<component :is="圆角描边" ref="描边组件" :激活="聚焦中" />')
    expect(输入框).toContain('--miao-bian-kuan: var(--chang-fang-kuang-hou-du)')
    expect(描边).toContain('stroke-width: var(--miao-bian-kuan, 2px)')
    expect(描边).toContain('stroke-dasharray: 1 1')
    expect(描边).toContain('stroke-dashoffset: 1')
    expect(描边.match(/pathLength="1"/g)?.length, '两条路径都要归一').toBe(2)
    expect(描边).toContain('左 + 径 - 径 * Math.SQRT1_2')
    expect(描边).toContain('下 - 径 + 径 * Math.SQRT1_2')
    expect(描边).toContain('右 - 径 + 径 * Math.SQRT1_2')
    expect(描边).toContain('上 + 径 - 径 * Math.SQRT1_2')
  })

  it('时长只读设计令牌，JS 无第二份 840/800 兜底，减动效归零', () => {
    const 令牌 = 读('styles/设计令牌.css')
    expect(输入框).toContain('--miao-bian-shi-chang: var(--shuru-gao-liang-shi-chang)')
    expect(输入框).toContain(
      '--miao-bian-tui-chu-shi-chang: var(--shuru-gao-liang-tui-chu-shi-chang)',
    )
    expect(描边).toContain("读时长('--miao-bian-shi-chang')")
    expect(描边).toContain("读时长('--miao-bian-tui-chu-shi-chang')")
    expect(描边).not.toContain('兜底')
    expect(描边).not.toContain('840')
    expect(描边).not.toContain('800')
    expect(令牌).toContain('--shuru-gao-liang-shi-chang: 840ms')
    expect(令牌).toContain('--shuru-gao-liang-tui-chu-shi-chang: 800ms')
    expect(描边).toContain("const 曲线 = 'cubic-bezier(0.4, 0, 0.2, 1)'")
    expect(描边).toContain('路.animate(')
    expect(描边.split('路.animate(').length - 1, '只应有一处统一的描边调用').toBe(1)
    expect(描边).toContain("fill: 'forwards'")
    expect(描边).toContain('duration: 减动效() ? 0 : 时长')
    expect(描边).toContain('(prefers-reduced-motion: reduce)')
  })

  it('回退为 800ms、画入仍 840ms，回退恰为原 200ms 的四倍', () => {
    const 令牌 = 读('styles/设计令牌.css')
    const 取毫秒 = (名: string): number => {
      const 匹配 = new RegExp(名 + ':\\s*(\\d+(?:\\.\\d+)?)ms').exec(令牌)
      expect(匹配, `令牌缺少 ${名}`).not.toBeNull()
      return Number((匹配 as RegExpMatchArray)[1])
    }
    const 画入 = 取毫秒('--shuru-gao-liang-shi-chang')
    const 回退 = 取毫秒('--shuru-gao-liang-tui-chu-shi-chang')
    expect(画入).toBe(840)
    expect(回退).toBe(800)
    expect(回退).toBe(200 * 4)
  })

  it('测试环境把设计令牌真注入了文档，:root 计算值与令牌文件逐字一致', () => {
    const 令牌 = 读('styles/设计令牌.css')
    for (const 名 of ['--shuru-gao-liang-shi-chang', '--shuru-gao-liang-tui-chu-shi-chang']) {
      const 匹配 = new RegExp(名 + ':\\s*([^;\\n]+);').exec(令牌)
      expect(匹配, `令牌缺少 ${名}`).not.toBeNull()
      expect(
        getComputedStyle(document.documentElement).getPropertyValue(名).trim(),
        `文档中的 ${名} 与令牌文件不一致`,
      ).toBe((匹配 as RegExpMatchArray)[1].trim())
    }
  })

  it('失焦沿原路退回，与横条输入框同一套染色语言', () => {
    expect(描边).toContain("读时长('--miao-bian-tui-chu-shi-chang')")
    expect(描边).toContain("读时长('--miao-bian-shi-chang'")
    expect(横条).not.toContain('圆角描边')
    expect(横条).not.toContain('miao-bian')
  })

  it('聚焦入场许可只在字段身份变化时返回真', () => {
    重置聚焦秩序()
    const 甲 = document.createElement('input')
    const 乙 = document.createElement('input')
    expect(领取聚焦入场许可(null)).toBe(false)
    expect(领取聚焦入场许可(甲)).toBe(true)
    expect(领取聚焦入场许可(甲)).toBe(false)
    expect(领取聚焦入场许可(乙)).toBe(true)
    expect(领取聚焦入场许可(甲)).toBe(true)
  })

  it('同一字段失焦再聚焦不重播，切换到新字段才播放入场', async () => {
    const 原动画 = SVGElement.prototype.animate
    const 原清单 = SVGElement.prototype.getAnimations
    const 原帧 = globalThis.requestAnimationFrame
    const 调用: number[] = []
    Object.defineProperty(SVGElement.prototype, 'getAnimations', {
      configurable: true,
      value: () => [],
    })
    Object.defineProperty(SVGElement.prototype, 'animate', {
      configurable: true,
      value: (_帧: Keyframe[], 选项: KeyframeEffectOptions) => {
        调用.push(选项.duration as number)
        return { cancel: vi.fn() }
      },
    })
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: (回调: FrameRequestCallback) => {
        回调(0)
        return 0
      },
    })
    const 包甲 = mount(长方框输入框, { attachTo: document.body })
    const 包乙 = mount(长方框输入框, { attachTo: document.body })
    try {
      重置聚焦秩序()
      const 甲 = 包甲.find('input')
      const 乙 = 包乙.find('input')
      await 甲.trigger('focus')
      await nextTick()
      expect(调用.slice(-2)).toEqual([840, 840])
      await 甲.trigger('blur')
      await new Promise((结束) => setTimeout(结束, 140))
      expect(调用.slice(-2)).toEqual([800, 800])
      await 甲.trigger('focus')
      await nextTick()
      expect(调用.slice(-2)).toEqual([0, 0])
      await 乙.trigger('focus')
      await nextTick()
      expect(调用.slice(-2)).toEqual([840, 840])
    } finally {
      包甲.unmount()
      包乙.unmount()
      Object.defineProperty(SVGElement.prototype, 'animate', { configurable: true, value: 原动画 })
      Object.defineProperty(SVGElement.prototype, 'getAnimations', {
        configurable: true,
        value: 原清单,
      })
      Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: 原帧 })
    }
  })

  it('真实聚焦与失焦分别产生 840ms 和 800ms 双路动画，减动效时归零', async () => {
    const 原动画 = SVGElement.prototype.animate
    const 原动画清单 = SVGElement.prototype.getAnimations
    const 原媒体 = globalThis.matchMedia
    const 原帧 = globalThis.requestAnimationFrame
    const 调用: Array<{ 帧: Keyframe[]; 选项: KeyframeEffectOptions }> = []
    let 挂载包: VueWrapper | null = null
    let 减动效 = false
    Object.defineProperty(SVGElement.prototype, 'getAnimations', {
      configurable: true,
      value: () => [],
    })
    Object.defineProperty(SVGElement.prototype, 'animate', {
      configurable: true,
      value: (帧: Keyframe[], 选项: KeyframeEffectOptions) => {
        调用.push({ 帧, 选项 })
        return { cancel: vi.fn() }
      },
    })
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: 减动效 }),
    })
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: (回调: FrameRequestCallback) => {
        回调(0)
        return 0
      },
    })
    try {
      const 包 = mount(长方框输入框, { attachTo: document.body })
      挂载包 = 包
      const 输入 = 包.find('input')
      await 输入.trigger('focus')
      await nextTick()
      await 输入.trigger('blur')
      await nextTick()
      await new Promise((结束) => setTimeout(结束, 140))
      expect(调用.map((项) => 项.选项.duration)).toEqual([840, 840, 800, 800])
      expect(调用[0].帧.map((帧) => 帧.strokeDashoffset)).toEqual([1, 0])
      expect(调用[2].帧.map((帧) => 帧.strokeDashoffset)).toEqual([0, 1])
      减动效 = true
      重置聚焦秩序()
      await 输入.trigger('focus')
      await nextTick()
      expect(调用.slice(-2).map((项) => 项.选项.duration)).toEqual([0, 0])    } finally {
      挂载包?.unmount()
      Object.defineProperty(SVGElement.prototype, 'animate', { configurable: true, value: 原动画 })
      Object.defineProperty(SVGElement.prototype, 'getAnimations', {
        configurable: true,
        value: 原动画清单,
      })
      Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: 原媒体 })
      Object.defineProperty(globalThis, 'requestAnimationFrame', {
        configurable: true,
        value: 原帧,
      })
    }
  })

  it('描边色取性别高亮令牌，女档切换', () => {
    expect(输入框).toContain('--miao-bian-se: var(--chang-fang-kuang-gao-liang-liang)')
    expect(输入框).toContain(":root[data-xing-bie='nv'] .chang-fang-kuang-ke")
    expect(读('根组件.vue')).toContain('document.documentElement.dataset.xingBie')
  })
})

describe('性别卡：第一二步统一按自身色填充、对象色描边', () => {
  const 向导 = 读('views/资料设置向导.vue')
  const 组件 = 读('components/资料设置/性别选择步骤.vue')
  const 取规则 = (源: string, 选择器: string): string => {
    const 始 = 源.indexOf(选择器)
    if (始 < 0) return ''
    const 开 = 源.indexOf('{', 始)
    const 闭 = 源.indexOf('}', 开)
    return 开 < 0 || 闭 < 0 ? '' : 源.slice(开, 闭 + 1)
  }
  const 第一步 = 向导.slice(
    向导.indexOf('v-if="当前步骤 === 1"'),
    向导.indexOf('v-else-if="当前步骤 === 2"'),
  )
  const 第二步 = 向导.slice(
    向导.indexOf('v-else-if="当前步骤 === 2"'),
    向导.indexOf('v-else-if="当前步骤 === 3"'),
  )

  it('两步都直接指向同一性别步骤组件，组件内男女卡各一枚', () => {
    expect(第一步).toContain('<XingBieXuanZeBuZhou')
    expect(第一步).toContain('变体="ziJi"')
    expect(第二步).toContain('变体="duiXiang"')
    expect(向导.match(/<XingBieXuanZeBuZhou/g)?.length).toBe(2)
    expect(组件.match(/data-xuan-xing-bie="nan"/g)?.length).toBe(2)
    expect(组件.match(/data-xuan-xing-bie="nv"/g)?.length).toBe(2)
    expect(向导).not.toContain('data-xuan-xing-bie')
    expect(向导).not.toContain('--xuan-zi-ji-bei')
    expect(向导).not.toContain('--xuan-dui-xiang-bian')
    expect(向导).not.toContain('data-dui-xiang-xingbie')
  })

  it('两步选中态共用同一个通用组合样式，不再各写一套', () => {
    expect(组件).toContain('使用通用性别框体配色')
    expect(组件.match(/性别卡选中样式/g)?.length).toBe(5)
    expect(向导.match(/性别卡选中样式/g)).toBeNull()
  })

  it('向导与组件都不保留个人资料专属的选中 CSS 与色值', () => {
    expect(向导).not.toContain(
      ".ziliao-kapian .xingBie-kaPian.beiXuanZhong[data-xuan-xing-bie",
    )
    expect(向导).not.toContain('--xingbie-nan-tan-beijing')
    expect(向导).not.toContain('--xingbie-nv-tan-beijing')
    expect(向导).not.toContain('--xingbie-nan-shen-biankuang')
    expect(向导).not.toContain('--xingbie-nv-shen-biankuang')
    expect(向导).not.toContain('性别框体样式')
    expect(组件).not.toContain('--xingbie-nan-tan-beijing')
    expect(组件).not.toContain('--xingbie-nv-tan-beijing')
    expect(组件).not.toContain('性别框体样式')
  })

  it('选中卡的图标与名称继承自身性别文字色', () => {
    expect(
      取规则(组件, '.xingBie-kaPian.beiXuanZhong .xingBie-mingCheng'),
    ).toContain('color: inherit')
    expect(
      取规则(组件, '.xingBie-kaPian.beiXuanZhong .xingBie-svg'),
    ).toContain('color: inherit')
  })

  it('第三步性格卡高光改由对象性别色驱动，旧填充方案不复活', () => {
    expect(向导).toContain('--xingge-gao-guang-se: var(--xingge-gao-guang-nan)')
    expect(向导).toContain("--xingge-gao-guang-se: var(--xingge-gao-guang-nv)")
    expect(向导).toContain('.mbti-kaPian:hover:not(.beiXuanZhong)')
    expect(向导).not.toContain('--xingge-gao-guang-ji:')
    expect(向导).not.toContain('--xingge-gao-guang-zhong:')
    expect(向导).not.toContain('mbti-xuan-ze-bian')
    expect(向导).not.toContain('xuanzhong-xingbie-bian')
  })

  it('滚动区左右同值内边距不裁高亮环', () => {
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

describe('账号与安全：默认性别与默认对象性别左右两卡', () => {
  const 账号页 = 读('views/账号与安全.vue')
  const 左卡起点 = 账号页.indexOf('id="mo-ren-xing-bie"')
  const 右卡起点 = 账号页.indexOf('id="mo-ren-dui-xiang-xing-bie"')
  const 左卡 = 账号页.slice(左卡起点, 右卡起点)

  it('两半各成一张同规格卡片，左半不再内嵌默认对象性别', () => {
    expect(左卡起点, '左卡锚点缺失').toBeGreaterThan(-1)
    expect(右卡起点, '右卡锚点缺失').toBeGreaterThan(左卡起点)
    expect(账号页.match(/class="zhi-wu-ka-pian mao-dian xingbie-she-zhi-ka"/g)?.length).toBe(2)
    expect(左卡).toContain("huoQuFanYi('caidan', 'sheZhiMoRenXingBie')")
    expect(左卡).toContain("huoQuFanYi('caidan', 'moRenXingBieMiaoShu')")
    expect(左卡).not.toContain('xingbie-baocun')
    expect(左卡).not.toContain("huoQuFanYi('caidan', 'sheZhiMoRenDuiXiangXingBie')")
    expect(左卡).not.toContain("huoQuFanYi('caidan', 'moRenDuiXiangMiaoShu')")
    expect(左卡).not.toContain('moRenDuiXiangXuanZhong')
    expect(账号页).not.toContain('shuangMoRenHang')
    expect(账号页).not.toContain('class="moRenXingBie"')
    expect(账号页).not.toContain('class="moRenDuiXiangXingBie"')
  })

  it('标题升到与同组卡片一致的 h2，两张卡各自独立承载描述与确定', () => {
    expect(账号页).toContain(
      "<h2 class=\"kapian-biao-ti\">{{ huoQuFanYi('caidan', 'sheZhiMoRenXingBie') }}</h2>",
    )
    expect(账号页).toContain(
      "<h2 class=\"kapian-biao-ti\">{{ huoQuFanYi('caidan', 'sheZhiMoRenDuiXiangXingBie') }}</h2>",
    )
    expect(左卡).not.toContain('<h3 class="kapian-biao-ti">')
  })

  it('未选中为中性卡面与中性边框，男女卡不再各挂一套色', () => {
    expect(账号页).toContain('border: 2px solid var(--bianKuang)')
    expect(账号页).toContain('background-color: var(--kaPian)')
    expect(账号页).not.toContain('.xingbie-kapian.xingbie-nan')
    expect(账号页).not.toContain('.xingbie-kapian.xingbie-nv')
    expect(账号页).not.toContain('class="xingbie-kapian xingbie-nan"')
    expect(账号页).not.toContain('class="xingbie-kapian xingbie-nv"')
  })

  it('每张卡的男女按钮都按自身性别取色：男=淡蓝底深蓝框，女=淡粉底深粉框', () => {
    const 男块 = (() => {
      const 始 = 账号页.indexOf(".xingbie-kapian.beiXuanZhong[data-xuan-xing-bie='nan']")
      const 开 = 账号页.indexOf('{', 始)
      const 闭 = 账号页.indexOf('}', 开)
      return 始 < 0 ? '' : 账号页.slice(开, 闭 + 1)
    })()
    const 女块 = (() => {
      const 始 = 账号页.indexOf(".xingbie-kapian.beiXuanZhong[data-xuan-xing-bie='nv']")
      const 开 = 账号页.indexOf('{', 始)
      const 闭 = 账号页.indexOf('}', 开)
      return 始 < 0 ? '' : 账号页.slice(开, 闭 + 1)
    })()
    expect(男块).toContain('background-color: var(--xingbie-nan-tan-beijing)')
    expect(男块).toContain('border-color: var(--xingbie-nan-shen-biankuang)')
    expect(男块).toContain('color: var(--xingbie-nan-tan-wenben)')
    expect(男块).toContain('box-shadow: 0 0 0 3px var(--xingbie-nan-xuan-huan)')
    expect(女块).toContain('background-color: var(--xingbie-nv-tan-beijing)')
    expect(女块).toContain('border-color: var(--xingbie-nv-shen-biankuang)')
    expect(女块).toContain('color: var(--xingbie-nv-tan-wenben)')
    expect(女块).toContain('box-shadow: 0 0 0 3px var(--xingbie-nv-xuan-huan)')
    expect(账号页.match(/data-xuan-xing-bie="nan"/g)?.length).toBe(2)
    expect(账号页.match(/data-xuan-xing-bie="nv"/g)?.length).toBe(2)
    expect(账号页).not.toContain('--xuan-zi-ji-bei')
    expect(账号页).not.toContain('--xuan-dui-xiang-bian')
    expect(账号页).not.toContain(':data-xingbie="主色档"')
    expect(账号页).not.toContain(':data-dui-xiang-xingbie="对象色档"')
  })

  it('两卡不再有确定按钮，选中即本地生效、离页统一静默保存', () => {
    expect(账号页).not.toContain('xingbie-baocun')
    expect(账号页).not.toContain('baoCunMoRenXingBie')
    expect(账号页).not.toContain('baoCunMoRenDuiXiangXingBie')
    expect(账号页).toContain("function jingMoBaoCunXingBie")
    expect(账号页).toContain('onBeforeRouteLeave(() => {')
    expect(账号页).toContain('onBeforeUnmount(() => {')
  })
})
