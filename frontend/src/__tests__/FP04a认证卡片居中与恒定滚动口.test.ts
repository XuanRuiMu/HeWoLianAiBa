import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import 登录内容 from '@/views/登录内容.vue'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { 按档解析全部, 解析几何数值, type 主题档 } from './主题令牌真源'
import {
  层叠胜出,
  拆分选择器组,
  规则清单,
  读取全局基线,
  type 层叠结果,
  type 规则,
} from './CSS级联真源'

/**
 * FP-04a（需求 #2 的前半）：认证卡片居中 + 登录/注册两态按需滚动口。
 *
 * 判据口径（FP-24b 立的规矩，本文件不拿「源码包含某字符串」冒充行为断言）：
 *  ①**探针取样自真实挂载结果**——两态各自 mount，滚动口元素的 class 列表直接来自 DOM。模板里
 *    只要把认证滚动口改回 `scroll`，无溢出时就会占位；认证专属伪元素只允许作用域挂在滚动口上，
 *    颜色恢复仍消费 global.css 既有滚动条令牌。
 *  ②**属性取值走层叠真源**——`CSS级联真源.层叠胜出` 按「命中 → 特异度 → 文档序」裁决，与书写
 *    位置/换行/块内声明先后无关；像素值一律由 `主题令牌真源.解析几何数值` 求 var() 与 calc()。
 *  ③真机像素级（条宽可辨、四档中心偏差 ≤4px）由后续取证工人复核，见 traces/FP-04a。
 */

vi.mock('@/api/认证', () => ({
  faSongMa: vi.fn(),
  jianChaShouJiHao: vi.fn(),
  dengLu: vi.fn(),
  zhuCe: vi.fn(),
  huoQuYongHuXinXi: vi.fn(),
}))
vi.mock('@/api/请求', () => ({
  huoQuCuoWuXiangYing: vi.fn((cuoWu: unknown) => (cuoWu as { response?: unknown }).response),
}))

const 视图源 = readFileSync(resolve(__dirname, '../views/登录内容.vue'), 'utf8')

function 样式源码(全源: string): string {
  const 段 = [...全源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((匹) => 匹[1])
  expect(段.length, '登录内容.vue 的 <style> 块数量变了，取样口径需复核').toBe(1)
  return 段[0].replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * `规则清单` 透明展开 @media/@supports（它们不加特异度），但 @keyframes 的帧选择器
 * （from/to/0%）不是元素选择器，交给层叠判定只会抛「未识别的简单片段」⇒ 先整块剔除。
 */
function 剔帧(源: string): string {
  let 出 = ''
  let 位 = 0
  for (;;) {
    const 余 = 源.slice(位)
    const 匹 = /@keyframes[^{]*\{/.exec(余)
    if (!匹) return 出 + 余
    出 += 余.slice(0, 匹.index)
    let 深度 = 1
    let 扫 = 位 + 匹.index + 匹[0].length
    while (扫 < 源.length && 深度 > 0) {
      if (源[扫] === '{') 深度++
      else if (源[扫] === '}') 深度--
      扫++
    }
    位 = 扫
  }
}

const 视图样式 = 剔帧(样式源码(视图源))
const 全局样式 = 剔帧(读取全局基线())

/**
 * 合并成一份可裁决的规则表：global.css 由 main.ts 先注入、组件 scoped 样式后注入，
 * 文档序取「全局在前、组件在后」（同特异度时组件胜，与运行时一致）。
 */
const 规则表: 规则[] = [...规则清单(全局样式), ...规则清单(视图样式)].map((规则, 序) => ({
  ...规则,
  序号: 序,
}))

/** 本单全部判定要问的属性；不在其中的规则不参与剔除账（避免把无关声明也算成盲区） */
const 查询面 = new Set([
  'overflow',
  'overflow-y',
  'height',
  'max-height',
  'min-height',
  'margin',
  'margin-top',
  'top',
  'display',
  'place-items',
  'grid-template-rows',
  'flex',
  'flex-direction',
  'flex-shrink',
])

/**
 * 层叠真源的语法面只到「无 id、无组合器、无伪元素」的简单选择器（见 CSS级联真源 抛错清单）。
 * 这里按查询面把规则表裁成可用集，并把**因形态而被剔除的选择器**记成账本：形态外的一旦
 * 声明了查询面里的属性，就会进账本，最后一个用例钉住账本内容 ⇒ 新增形态（例如有人给卡片
 * 链写 `.denglu-neirong > * { max-height: 400px }`）必红，而不是被静默当成「没有这条声明」。
 */
function 切可用集(): { 可用: 规则[]; 剔除: string[] } {
  const 可用: 规则[] = []
  const 剔除: string[] = []
  for (const 规则 of 规则表) {
    const 属性们 = [...规则.声明.keys()].filter((性) => 查询面.has(性))
    if (属性们.length === 0) continue
    const 组 = 拆分选择器组(规则.选择器)
    const 简单 = 组.filter((串) => !/[#]|::|[ \t>+~]/.test(串.trim()))
    for (const 串 of 组.filter((项) => !简单.includes(项)))
      剔除.push(`${串} {${属性们.join(',')}}`)
    if (简单.length) 可用.push({ ...规则, 选择器: 简单.join(', ') })
  }
  return { 可用, 剔除 }
}

const { 可用: 可用规则, 剔除: 剔除账本 } = 切可用集()

function 生效(属性: string, 类: string[], 标签 = 'div'): 层叠结果 | null {
  return 层叠胜出(可用规则, { 标签, 类, 属性: {} }, 属性)
}

function 生效值(属性: string, 类: string[], 标签 = 'div'): string {
  const 结果 = 生效(属性, 类, 标签)
  expect(结果, `层叠结果里 ${属性} 没有任何生效声明（类 ${类.join(' ')}）`).not.toBeNull()
  return (结果 as 层叠结果).值
}

function 未声明(属性: string, 类: string[]): void {
  expect(生效(属性, 类), `${属性} 仍在这组类上生效，裁切/约束层没有删净`).toBeNull()
}

function 无像素字面量(属性: string, 类: string[]): void {
  const 值 = 生效值(属性, 类)
  expect(/\d+(?:\.\d+)?px/i.test(值), `${属性} 的生效值是像素字面量（零硬编码）：${值}`).toBe(false)
}

async function 挂载(moShi: 'dengLu' | 'zhuCe'): Promise<{ wrapper: VueWrapper; 路由: Router }> {
  const 路由: Router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/login', name: 'dengLu', component: 登录内容 },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  使用认证表单仓库().moShi = moShi
  const wrapper = mount(登录内容, { attachTo: document.body, global: { plugins: [pinia, 路由] } })
  await 路由.isReady()
  await flushPromises()
  return { wrapper, 路由 }
}

function 滚动口类(wrapper: VueWrapper): string[] {
  const 元 = wrapper.findAll('.biaodan-gundong')
  expect(元.length, '滚动口宿主数量不是 1——认证滚动口只有一个容器').toBe(1)
  return [...(元[0].element as HTMLElement).classList]
}

const 令牌表: Record<主题档, Map<string, string>> = {
  light: 按档解析全部('light'),
  dark: 按档解析全部('dark'),
}

function 条宽(档: 主题档): number {
  const 值 = 令牌表[档].get('--gundong-tiao-kuan-du')
  expect(值, `${档} 档没有滚动条宽度真源`).not.toBeUndefined()
  const 数 = Number(String(值).replace(/px$/i, '').trim())
  expect(Number.isFinite(数), `${档} 档宽度令牌不是像素数：${值}`).toBe(true)
  return 数
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.resetAllMocks()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('FP-04a ①：登录与注册两态的认证滚动口按需出现（不改变宿主类契约）', () => {
  for (const moShi of ['dengLu', 'zhuCe'] as const) {
    it(`${moShi} 态：滚动口层叠结果 overflow-y = auto，宿主上不挂任何状态类`, async () => {
      const { wrapper } = await 挂载(moShi)
      const 类 = 滚动口类(wrapper)
      expect(
        类.filter((名) => 名 !== 'biaodan-gundong'),
        'FP-04a 回归：滚动口宿主又长出了 JS 状态类（R2 的 xuyao-gundong 形态）',
      ).toEqual([])
      expect(生效值('overflow-y', 类), '滚动口不是按需可滚（无溢出时也会占滚动条）').toBe('auto')
      expect(生效值('min-height', 类), 'min-height 不为 0 ⇒ flex:1 缩不下去，溢出无人吸收').toBe('0')
      expect(生效值('flex', 类)).toBe('1')
      wrapper.unmount()
    })
  }

  it('切换登录↔注册：滚动口宿主类名不随模式跳变（旧实现是切到注册才有滚动口）', async () => {
    const { wrapper } = await 挂载('dengLu')
    const 切换前 = 滚动口类(wrapper).join(' ')
    await wrapper.findAll('.biaoqian-anniu')[1].trigger('click')
    await flushPromises()
    expect(wrapper.find('#zhuce-shoujihao').exists(), '未切到注册表单').toBe(true)
    expect(滚动口类(wrapper).join(' '), '切到注册态后滚动口宿主类名变了').toBe(切换前)
    await wrapper.findAll('.biaoqian-anniu')[0].trigger('click')
    await flushPromises()
    expect(wrapper.find('#denglu-shoujihao').exists(), '未切回登录表单').toBe(true)
    expect(滚动口类(wrapper).join(' '), '切回登录态后滚动口宿主类名变了').toBe(切换前)
    wrapper.unmount()
  })

  it('认证视图滚动条覆盖仅限滚动口，颜色恢复走 global.css 既有令牌', () => {
    const 滚动条选择器 = (源: string): string[] =>
      规则清单(剔帧(源))
        .flatMap((规则) => 拆分选择器组(规则.选择器))
        .filter((串) => 串.includes('::-webkit-scrollbar'))
        .map((串) => 串.trim())
    const 本地选择器 = 滚动条选择器(视图样式)
    expect(本地选择器.length).toBeGreaterThan(0)
    expect(本地选择器.every((串) => 串.startsWith('.biaodan-gundong'))).toBe(true)
    expect(本地选择器.some((串) => 串.includes(':hover'))).toBe(true)
    expect(本地选择器.some((串) => 串.includes(':focus-within'))).toBe(true)
    expect(滚动条选择器(全局样式).sort()).toEqual(
      [
        '::-webkit-scrollbar',
        '::-webkit-scrollbar-corner',
        '::-webkit-scrollbar-thumb',
        '::-webkit-scrollbar-thumb:hover',
        '::-webkit-scrollbar-track',
        '::-webkit-scrollbar-track:hover',
        ':where(*:focus, *:focus-visible, *:focus-within)::-webkit-scrollbar-thumb',
        ':where(*:focus, *:focus-visible, *:focus-within)::-webkit-scrollbar-track',
      ].sort(),
    )
    expect(视图源).toMatch(/\.biaodan-gundong\s*\{[^}]*scrollbar-color:\s*transparent\s+transparent/)
    expect(视图源).toMatch(/\.biaodan-gundong:hover,\s*\.biaodan-gundong:focus-within\s*\{[^}]*scrollbar-color:\s*var\(--gundong-tiao-huakuai\)\s+var\(--gundong-tiao-guidao\)/)
  })

  it('条宽 ≥7px 且浅/深两档同源（取值走令牌解析，不读源码字面量）', () => {
    const 浅 = 条宽('light')
    const 深 = 条宽('dark')
    expect(浅, '浅色档滚动条宽度不足 7px，取证会判「像素不可辨」').toBeGreaterThanOrEqual(7)
    expect(深, '深色档滚动条宽度不足 7px，取证会判「像素不可辨」').toBeGreaterThanOrEqual(7)
    expect(深, '两档条宽不等 = 换主题时滚动口宽度跳变').toBe(浅)
    expect(解析几何数值('--gundong-tiao-kuan-du')).toBe(浅)
  })
})

describe('FP-04a ②：R2 的三层滚动口收敛为「卡片圆角裁切 + 一层认证滚动口」', () => {
  it('中间层 .biaodan-neirong-qu 的 overflow:hidden 裁切层已删，且真的可被压缩', () => {
    const 类 = ['biaodan-neirong-qu']
    未声明('overflow', 类)
    未声明('overflow-y', 类)
    expect(生效值('min-height', 类)).toBe('0')
    expect(生效值('flex', 类)).toBe('1')
    expect(生效值('display', 类)).toBe('flex')
    expect(生效值('flex-direction', 类)).toBe('column')
  })

  it('标签栏不再自带 overflow:visible 这类初值噪声声明', () => {
    未声明('overflow', ['biaoqian-qiehuan'])
    未声明('overflow-y', ['biaoqian-qiehuan'])
  })

  it('卡片本体与主按钮的 overflow:hidden 各有承重理由（冻结现状，防被当冗余裁切层删）', () => {
    expect(
      生效值('overflow', ['biaodan-rongqi']),
      '.biaodan-rongqi 的 hidden 裁的是 .juanzhou-gan 的 110% 宽与卡片圆角，删了会外溢',
    ).toBe('hidden')
    expect(
      生效值('overflow', ['anniu-zhuyao']),
      '.anniu-zhuyao 的 hidden 是 ::before 高光扫过的遮罩层，删了金亮条会划出按钮',
    ).toBe('hidden')
  })

  it('FP-05 已把定格动画整体搬到一次性快照层：活卡片不再被就地写内联 overflow', () => {
    // 旧契约（FP-04a 登记）是"保留 :736 的 JS 内联 overflow，因为 FP-05 在途依赖它"。
    // FP-05 交付后动画宿主改成克隆快照层，这条内联写点作废 ⇒ 反向钉成"活 DOM 上不得再有 overflow 写点"，
    // 承重的仍是下面那条 CSS 层的 overflow:hidden（圆角与卷轴杆 110% 宽的裁切）。
    expect(视图源, '活卡片上不得再出现内联 overflow 改写').not.toContain('.style.overflow')
    expect(生效值('overflow', ['biaodan-rongqi'])).toBe('hidden')
  })
})

describe('FP-04a ③：卡片居中机制——确定高参照 + 网格居中，零像素魔法数字', () => {
  const 根 = ['denglu-neirong']
  const 卡 = ['biaodan-rongqi']

  it('根层高度吃满认证布局内容盒，成为确定高的居中参照', () => {
    expect(生效值('height', 根), '根层没有确定高 ⇒ 卡片的 max-height:100% 会静默失效').toBe('100%')
    expect(生效值('display', 根)).toBe('grid')
    expect(生效值('place-items', 根)).toBe('center')
    expect(
      生效值('grid-template-rows', 根),
      'auto 行只会被撑大不会被压小 ⇒ 必须 minmax(0,1fr) 才封得住顶',
    ).toBe('minmax(0, 1fr)')
  })

  it('居中不吃像素外边距：margin 生效值为 auto，且不存在 margin-top/top 的像素硬顶', () => {
    expect(生效值('margin', 根), 'FP-02 契约：四边 auto，不得写回 margin:0 auto').toBe('auto')
    未声明('margin-top', 根)
    未声明('margin-top', 卡)
    未声明('top', 卡)
    无像素字面量('height', 根)
    无像素字面量('grid-template-rows', 根)
    无像素字面量('max-height', 卡)
  })

  it('卡片以百分比封顶（视口变则上界变），旧 50vh 局部量已作废', () => {
    expect(
      生效值('max-height', 卡),
      '卡片没有相对确定高的上界 ⇒ 短视口下卡片顶出视口、居中必偏',
    ).toBe('100%')
    expect(生效('max-height', ['biaodan-gundong']), '滚动口不该再有局部 vh/像素上界').toBeNull()
  })

  it('卷轴杆 flex-shrink:0 —— 它是 FP-05 动画宿主，不参与压缩', () => {
    expect(生效值('flex-shrink', ['juanzhou-gan'])).toBe('0')
  })

  it('本单不新增零消费者令牌：几何真源仍只有 --gundong-tiao-kuan-du 一枚，且两档同值', () => {
    for (const 档 of ['light', 'dark'] as 主题档[]) {
      expect(令牌表[档].has('--gundong-tiao-kuan-du'), `${档} 档缺滚动条宽度真源`).toBe(true)
    }
    expect(条宽('light')).toBe(8)
    expect(条宽('dark')).toBe(8)
  })
})

describe('FP-04a ④：需求 #1 的成果不被恢复', () => {
  for (const moShi of ['dengLu', 'zhuCe'] as const) {
    it(`${moShi} 态挂载 DOM 内 .dixian-dixian 归零，视图样式表里也没有它的规则`, async () => {
      const { wrapper } = await 挂载(moShi)
      expect(document.querySelectorAll('.dixian-dixian').length).toBe(0)
      wrapper.unmount()
      const 命中 = 规则清单(视图样式).filter((规则) => 规则.选择器.includes('dixian'))
      expect(命中.map((规则) => 规则.选择器)).toEqual([])
    })
  }
})

describe('FP-04a 层叠判定的形态账本（判定盲区必须显式登记）', () => {
  const 目标类 = [
    'denglu-neirong',
    'biaodan-rongqi',
    'biaodan-gundong',
    'biaodan-neirong-qu',
    'biaoqian-qiehuan',
    'anniu-zhuyao',
    'juanzhou-gan',
  ]

  it('探针所属类上，因 id/组合器/伪元素形态被剔除出判定的声明 = 已登记清单，新增即红', () => {
    expect(剔除账本.filter((项) => 目标类.some((类) => 项.includes(`.${类}`))).sort()).toEqual([
      // 两枚装饰层（卡顶扇形放射纹 / 主按钮高光扫过），都是 position:absolute 的 ::before，
      // 结构上不可能命中元素探针；除它们之外，本单探针类上没有第四种形态的几何声明。
      '.anniu-zhuyao::before {top,height}',
      '.biaodan-rongqi::before {top,height}',
    ])
  })
})
