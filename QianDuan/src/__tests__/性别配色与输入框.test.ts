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
    expect(输入框).toContain('<component :is="圆角描边" :激活="聚焦中" />')
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

  it('两路同一时长同一曲线，画入 420ms、退回 200ms，减动效归零', () => {
    expect(描边).toContain("读时长('--miao-bian-shi-chang', 兜底画入)")
    expect(描边).toContain('const 兜底画入 = 420')
    expect(描边).toContain('const 退回时长 = 200')
    expect(描边).toContain("const 曲线 = 'cubic-bezier(0.4, 0, 0.2, 1)'")
    expect(描边).toContain('路.animate(')
    expect(描边.split('路.animate(').length - 1, '只应有一处统一的描边调用').toBe(1)
    expect(描边).toContain("fill: 'forwards'")
    expect(描边).toContain('duration: 减动效() ? 0 : 时长')
    expect(描边).toContain('(prefers-reduced-motion: reduce)')
  })

  it('失焦沿原路退回，与横条输入框同一套染色语言', () => {
    expect(描边).toContain('描边(0, 1, 退回时长)')
    expect(描边).toContain("读时长('--miao-bian-shi-chang'")
    expect(横条).not.toContain('圆角描边')
    expect(横条).not.toContain('miao-bian')
  })

  it('描边色取性别高亮令牌，女档切换', () => {
    expect(输入框).toContain('--miao-bian-se: var(--chang-fang-kuang-gao-liang-liang)')
    expect(输入框).toContain(":root[data-xing-bie='nv'] .chang-fang-kuang-ke")
    expect(读('根组件.vue')).toContain('document.documentElement.dataset.xingBie')
  })
})

describe('性别卡：淡填充取自身性别、深边框取对象性别', () => {
  const 向导 = 读('views/资料设置向导.vue')

  it('填充与文字取自身性别淡档，未选中时按默认男性', () => {
    expect(向导).toContain('--xuan-zi-ji-bei: var(--xingbie-nan-tan-beijing)')
    expect(向导).toContain("--xuan-zi-ji-bei: var(--xingbie-nv-tan-beijing)")
    expect(向导).toContain('--xuan-zi-ji-wen: var(--xingbie-nan-tan-wenben)')
    expect(向导).toContain('--xuan-zi-ji-wen: var(--xingbie-nv-tan-wenben)')
  })

  it('边框取对象性别深档，未选中时按默认女性', () => {
    expect(向导).toContain('--xuan-dui-xiang-bian: var(--xingbie-nv-shen-biankuang)')
    expect(向导).toContain('--xuan-dui-xiang-bian: var(--xingbie-nan-shen-biankuang)')
    expect(向导).toContain('border: 2px solid var(--xuan-dui-xiang-bian)')
  })

  it('选中态不再走脚本内联色，三步共享同一段样式', () => {
    expect(向导).not.toContain('性别框体样式')
    expect(向导).not.toContain('use性别框体配色')
    expect(向导).toContain('.ziliao-kapian .xingBie-kaPian.beiXuanZhong[data-dang]')
  })

  it('第三步性格卡与性别无关，悬停与选中共用白色高光且选中更实', () => {
    expect(向导).toContain('--xingge-gao-guang-ji: rgba(255, 255, 255, 0.06)')
    expect(向导).toContain('--xingge-gao-guang-zhong: rgba(255, 255, 255, 0.14)')
    expect(向导).toContain('.mbti-kaPian:hover:not(.beiXuanZhong)')
    expect(向导).toContain('.suiJi-kaPian.beiXuanZhong')
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

describe('账号与安全：默认性别与默认对象性别左右双区', () => {
  const 账号页 = 读('views/账号与安全.vue')

  it('左右两区等宽排布，标题各占一区，窄屏改为上下堆叠', () => {
    expect(账号页).toContain('.shuangMoRenHang {')
    expect(账号页).toContain('gap: var(--jiange-da)')
    expect(账号页).toContain('@media (max-width: 640px)')
    expect(账号页).toContain(
      "<h3 class=\"kapian-biao-ti\">{{ huoQuFanYi('caidan', 'sheZhiMoRenXingBie') }}</h3>",
    )
    expect(账号页).toContain(
      "<h3 class=\"kapian-biao-ti\">{{ huoQuFanYi('caidan', 'sheZhiMoRenDuiXiangXingBie') }}</h3>",
    )
  })

  it('男卡恒为淡蓝填充加深蓝边框，女卡恒为淡粉填充加深粉边框', () => {
    expect(账号页).toContain('background-color: var(--xingbie-nan-tan-beijing)')
    expect(账号页).toContain('border-color: var(--xingbie-nan-shen-biankuang)')
    expect(账号页).toContain('color: var(--xingbie-nan-tan-wenben)')
    expect(账号页).toContain('background-color: var(--xingbie-nv-tan-beijing)')
    expect(账号页).toContain('border-color: var(--xingbie-nv-shen-biankuang)')
    expect(账号页).toContain('color: var(--xingbie-nv-tan-wenben)')
  })

  it('选中只加同色 3px 环与 600 字重，禁用饱和填充与旧文字阴影', () => {
    expect(账号页).toContain('box-shadow: 0 0 0 3px var(--xingbie-nan-xuan-huan)')
    expect(账号页).toContain('box-shadow: 0 0 0 3px var(--xingbie-nv-xuan-huan)')
    expect(账号页).toContain('font-weight: 600')
    expect(账号页).not.toContain('var(--xingbie-nan-xuan-beijing)')
    expect(账号页).not.toContain('var(--xingbie-nv-xuan-beijing)')
    expect(账号页).not.toContain('text-shadow: var(--xuanzhong-wenben-yinying)')
  })
})
