import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import 登录内容 from '@/views/登录内容.vue'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { 使用用户仓库 } from '@/stores/用户'
import { 声明位置, 求几何算式, 解析几何数值 } from './主题令牌真源'
import { 层叠胜出, 规则清单, 读取全局基线, type 规则 } from './CSS级联真源'

/**
 * FP-05（需求 #15）：登录/注册成功后的**真定格**飞行守卫。
 *
 * 判据一律走「计算样式 + 动画集合 + 实测矩形」，不做文本包含式断言。
 *  ① 飞行层存在期间活卡片（及其两条 .juanzhou-gan / .biaodan-neirong-qu / 滚动口）逐属性计算样式
 *    与入场前全等，且 style 属性自始至终不存在；
 *  ② 动画集合在飞行结束后回到基线（改前缺陷：`juanQiDongHua.cancel()` 只注销容器，两条 .juanzhou-gan
 *    与 .biaodan-neirong-qu 的 fill:'forwards' 永不注销 ⇒ 泄漏）；
 *  ③ 飞行终点中心与 .yonghu-xuanxiang 矩形中心偏差 ≤2px；
 *  ④ prefers-reduced-motion：不建层、不建动画、不做位移、直接切换、零遗留；
 *  ⑤ 注册成功路径与登录路径同构（注册确实有飞行语义：改前改后都走同一个入口函数）。
 *
 * jsdom 环境缺口（本文件先用探针确认过，不是猜的）：`Element.prototype.animate` 与
 * `document.getAnimations` 在 jsdom 里都不存在，`getBoundingClientRect` 恒为全 0，
 * getComputedStyle 不做 var()/calc() 代入（原样返回 'var(--x)'）。故：
 *  - ② 由本文件安装的 WAAPI 桩承载，桩按规范语义实现「fill:forwards 跑完后动画仍留在
 *    getAnimations() 里，只有 cancel() 才摘掉」——那正是本单要修的泄漏判据；
 *  - ③ 的几何由「按快照层内联自定义属性算盒」的几何桩承载；
 *  - 收束端点由注入样式给一对**与改前脚本字面量（28/14）不同**的值（31/15），关键帧读到 31/15
 *    就不可能是脚本自带数字；令牌与生产规则本身由下方层叠/令牌用例钉。
 */

vi.mock('@/api/认证', () => ({
  faSongMa: vi.fn(),
  jianChaShouJiHao: vi.fn(),
  dengLu: vi.fn(),
  zhuCe: vi.fn(),
}))
vi.mock('@/api/请求', () => ({
  huoQuCuoWuXiangYing: vi.fn((cuoWu: unknown) => (cuoWu as { response?: unknown }).response),
}))

/* ---------------- 取样源：视图样式 + 共用令牌 ---------------- */

const 视图源 = readFileSync(resolve(__dirname, '../views/登录内容.vue'), 'utf8')

function 样式源码(全源: string): string {
  const 段 = [...全源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((匹) => 匹[1])
  expect(段.length, '登录内容.vue 的 <style> 块数量变了，取样口径需复核').toBe(1)
  return 段[0].replace(/\/\*[\s\S]*?\*\//g, '')
}

/** @keyframes 的帧选择器不是元素选择器 ⇒ 整块剔除（FP-02/FP-04a 同法，此处只有一层嵌套） */
function 剔帧(源: string): string {
  return 源.replace(/@keyframes[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '')
}

const 样式表: 规则[] = [
  ...规则清单(剔帧(读取全局基线())),
  ...规则清单(剔帧(样式源码(视图源))),
]
  .map((规则项, 序) => ({ ...规则项, 序号: 序 }))
  // 层叠真源的语法面只到「无 id、无组合器、无伪元素」的简单选择器 ⇒ 先把形态外的片段摘掉，
  // 整条都不可判定的规则直接不参与（FP-02/FP-04a 的剔除账本在本单只需登记，不需重算）
  .flatMap((规则项) => {
    const 简单 = 规则项.选择器
      .split(',')
      .map((串) => 串.trim())
      .filter((串) => 串 && !/[#]|::|[ \t>+~]/.test(串))
    return 简单.length ? [{ ...规则项, 选择器: 简单.join(', ') }] : []
  })

function 层叠值(属性: string, 类: string[]): string {
  const 结果 = 层叠胜出(样式表, { 标签: 'div', 类, 属性: {} }, 属性)
  expect(结果, `类 ${类.join(' ')} 上 ${属性} 没有生效声明`).not.toBeNull()
  return (结果 as { 值: string }).值
}

/**
 * jsdom（本仓版本）不提供 `window.matchMedia`（探针实测 typeof === 'undefined'），而它是生产
 * 减动效分支的唯一开关 ⇒ 与 setup.ts 给 ResizeObserver 装桩同一口径，由测试安装它。
 * 生产侧未对缺失的 matchMedia 兜底：真浏览器里 matchMedia 恒在，为不可能场景加分支只会掩盖真缺陷。
 */
function 装减动效桩(匹配: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    (查询: string) =>
      ({
        matches: 匹配 && 查询.includes('reduce'),
        media: 查询,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      }) as unknown as MediaQueryList,
  )
}


/* ---------------- WAAPI 桩（jsdom 无此实现） ---------------- */

interface 影动画 {
  目标: Element
  帧: Keyframe[]
  时长: number
  填充: string | null
  已注销: boolean
  finished: Promise<unknown>
  cancel(): void
}

const 动画册: 影动画[] = []

function 装动画桩(): void {
  动画册.length = 0
  const 动画方法 = function (
    this: Element,
    帧列表: Keyframe[] | Keyframe,
    选项: number | KeyframeAnimationOptions,
  ): unknown {
    const 对象 = typeof 选项 === 'number' ? { duration: 选项 } : 选项
    const 影: 影动画 = {
      目标: this,
      帧: Array.isArray(帧列表) ? 帧列表 : [帧列表],
      时长: typeof 对象.duration === 'number' ? 对象.duration : 0,
      填充: (对象 as KeyframeAnimationOptions).fill ?? null,
      已注销: false,
      finished: Promise.resolve(),
      cancel() {
        影.已注销 = true
      },
    }
    // 规范语义：定时器到点即完成，但 fill:forwards 的动画完成后**仍留在 getAnimations() 里**，
    // 只有 cancel() 才把它摘出去 ⇒ ② 与「cancel 补全前后」反证的判据来源
    影.finished = new Promise<影动画>((解决) => {
      setTimeout(() => {
        if (!影.已注销) 解决(影)
      }, 影.时长)
    })
    动画册.push(影)
    return 影
  }
  Object.defineProperty(Element.prototype, 'animate', {
    value: 动画方法,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(document, 'getAnimations', {
    value: () => 动画册.filter((影) => !影.已注销),
    configurable: true,
    writable: true,
  })
}

function 拆动画桩(): void {
  delete (Element.prototype as unknown as { animate?: unknown }).animate
  delete (document as unknown as { getAnimations?: unknown }).getAnimations
}

/* ---------------- 几何桩（jsdom 的 rect 恒为全 0） ---------------- */

interface 盒 {
  left: number
  top: number
  width: number
  height: number
}

const 活卡盒: 盒 = { left: 120, top: 90, width: 400, height: 520 }
const 用户位盒: 盒 = { left: 16, top: 20, width: 132, height: 44 }
/** 与改前脚本里那两个写死的数字（28 筒高 / 14 杆高）都不同 ⇒ 读到它 = 值来自 CSS 而非脚本 */
const 注入筒高 = 31
const 注入杆高 = 15

const 矩形表 = new WeakMap<Element, 盒>()
const 原始矩形 = Element.prototype.getBoundingClientRect

function 成盒(盒值: 盒): DOMRect {
  return {
    ...盒值,
    right: 盒值.left + 盒值.width,
    bottom: 盒值.top + 盒值.height,
    x: 盒值.left,
    y: 盒值.top,
    toJSON: () => ({}),
  } as unknown as DOMRect
}

function 装几何桩(): void {
  Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
    const 记录 = 矩形表.get(this)
    if (记录) return 成盒(记录)
    // 快照层：几何由脚本写进内联自定义属性、由 .juan-zhou-dingge 转接 ⇒ 按同一套值算盒
    const 样式 = (this as HTMLElement).style
    const 宽 = 样式.getPropertyValue('--dingge-kuan')
    const 高 = 样式.getPropertyValue('--dingge-gao')
    if (宽 && 高) {
      return 成盒({
        left: Number.parseFloat(样式.getPropertyValue('--dingge-zuo')),
        top: Number.parseFloat(样式.getPropertyValue('--dingge-shang')),
        width: Number.parseFloat(宽),
        height: Number.parseFloat(高),
      })
    }
    return 原始矩形.call(this)
  }
}

function 拆几何桩(): void {
  Element.prototype.getBoundingClientRect = 原始矩形
}

/* ---------------- 注入样式：让计算样式读得出真值 ---------------- */

const 计算属性清单 = [
  'opacity',
  'border-radius',
  'padding',
  'position',
  'left',
  'top',
  'width',
  'height',
  'margin',
  'overflow',
  'overflow-y',
  'pointer-events',
  'will-change',
  'visibility',
  'display',
  'z-index',
  'box-shadow',
  'background-color',
  'transform',
] as const

function 计算样式快照(元素: Element): Record<string, string> {
  const 样式 = getComputedStyle(元素)
  const 快照: Record<string, string> = {}
  for (const 属性 of 计算属性清单) 快照[属性] = 样式.getPropertyValue(属性)
  return 快照
}

let 样式节: HTMLStyleElement | null = null

function 装注入样式(): void {
  样式节 = document.createElement('style')
  样式节.dataset.fp05 = '1'
  // 声明序与生产一致：基态在前、目标态在后（同特异度靠源码序生效）
  样式节.textContent = [
    '.biaodan-rongqi{opacity:0.75;border-radius:13px;padding:9px;overflow:hidden;pointer-events:auto}',
    '.juanzhou-gan{height:0;opacity:0}',
    '.juan-zhou-dingge{position:fixed;left:var(--dingge-zuo);top:var(--dingge-shang);width:var(--dingge-kuan);height:var(--dingge-gao);margin:0;pointer-events:none}',
    `.juan-zhou-dingge-shousuo{height:${注入筒高}px;border-radius:${注入杆高}px;padding:0}`,
    `.juan-zhou-dingge-gan{height:${注入杆高}px;opacity:1}`,
  ].join('')
  document.head.appendChild(样式节)
}

function 拆注入样式(): void {
  样式节?.remove()
  样式节 = null
}

/* ---------------- 挂载与触发 ---------------- */

interface 场景 {
  wrapper: VueWrapper
  路由: Router
  推送: ReturnType<typeof vi.fn>
  卡: HTMLElement
  用户位: HTMLElement
  基线: number
}

async function 建场景(形: 'dengLu' | 'zhuCe'): Promise<场景> {
  const 路由 = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/login', name: 'dengLu', component: 登录内容 },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  const bd = 使用认证表单仓库()
  bd.moShi = 形
  if (形 === 'zhuCe') {
    // 表单各值一律从 store 取初值 ⇒ 预置一份合法注册资料，注册成功链才可被触发
    bd.zhuCeShouJiHao = '13800000000'
    bd.zhuCeYanZhengMa = '123456'
    bd.zhuCeYongHuMing = '定格测试者'
    bd.zhuCeMiMa = 'miMa123456'
    bd.zhuCeChuShengRiQi = '1990-05-10'
    bd.tongYiXieYi = true
  }
  const 用户仓库 = 使用用户仓库()
  用户仓库.zhiXingDengLu = vi.fn(async () => {})
  用户仓库.zhiXingZhuCe = vi.fn(async () => {})
  const wrapper = mount(登录内容, { attachTo: document.body, global: { plugins: [pinia, 路由] } })
  await 路由.isReady()
  await flushPromises()

  const 推送 = vi.fn(async () => undefined)
  // 拦下导航：组件留在屏幕上，「飞行层存在期间活卡片未被改写」才可被逐属性比对
  ;(路由 as unknown as { push: unknown }).push = 推送

  const 卡 = wrapper.find('.biaodan-rongqi').element as HTMLElement
  矩形表.set(卡, 活卡盒)
  const 用户位 = document.createElement('div')
  用户位.className = 'yonghu-xuanxiang'
  document.body.appendChild(用户位)
  矩形表.set(用户位, 用户位盒)

  return { wrapper, 路由, 推送, 卡, 用户位, 基线: document.getAnimations().length }
}

async function 提交表单(场景: 场景, 形: 'dengLu' | 'zhuCe'): Promise<void> {
  if (形 === 'dengLu') {
    await 场景.wrapper.find('#denglu-shoujihao').setValue('13800000000')
    await 场景.wrapper.find('#denglu-mima').setValue('miMa123456')
  }
  await 场景.wrapper.find('form').trigger('submit')
  await flushPromises()
}

/** 走完「收束 → 飞行」两段（700ms + 600ms），末尾留给清理的一拍微任务 */
async function 跑到结束(): Promise<void> {
  await vi.advanceTimersByTimeAsync(700)
  await flushPromises()
  await vi.advanceTimersByTimeAsync(600)
  await flushPromises()
}

function 定格层(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.biaodan-rongqi.juan-zhou-dingge')
}

function 活着的动画(): 影动画[] {
  return 动画册.filter((影) => !影.已注销)
}

function 末帧值(影: 影动画, 属性: string): string {
  const 帧 = 影.帧[影.帧.length - 1] ?? {}
  const 值 = (帧 as Record<string, unknown>)[属性]
  return Array.isArray(值) ? String(值[值.length - 1]) : 值 === undefined ? '' : String(值)
}

function 中心(盒值: 盒): { x: number; y: number } {
  return { x: 盒值.left + 盒值.width / 2, y: 盒值.top + 盒值.height / 2 }
}

function 平移量(文本: string): { x: number; y: number } | null {
  const 匹 = /translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/.exec(文本)
  return 匹 ? { x: Number(匹[1]), y: Number(匹[2]) } : null
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.resetAllMocks()
  vi.useFakeTimers()
  装减动效桩(false)
  装动画桩()
  装几何桩()
  装注入样式()
})

afterEach(() => {
  document.body.innerHTML = ''
  拆注入样式()
  拆几何桩()
  拆动画桩()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('FP-05 ①：飞行层存在期间活 DOM 一个样式都不被改写', () => {
  it('登录成功→收束→飞行全程：活卡片/两条卷轴杆/内容区/滚动口零内联 style，逐属性计算样式与入场前全等', async () => {
    const 场景 = await 建场景('dengLu')
    const 目标们: Record<string, HTMLElement> = {
      卡: 场景.卡,
      上杆: 场景.卡.querySelector('.juanzhou-gan-shang') as HTMLElement,
      下杆: 场景.卡.querySelector('.juanzhou-gan-xia') as HTMLElement,
      内容区: 场景.卡.querySelector('.biaodan-neirong-qu') as HTMLElement,
      滚动口: 场景.卡.querySelector('.biaodan-gundong') as HTMLElement,
    }
    const 入场前: Record<string, Record<string, string>> = {}
    for (const [名, 元] of Object.entries(目标们)) {
      expect(元, `取样元素 ${名} 不在位`).toBeTruthy()
      expect(元.getAttribute('style'), `${名} 入场前就带内联样式`).toBeNull()
      入场前[名] = 计算样式快照(元)
    }
    await 提交表单(场景, 'dengLu')

    expect(定格层(), '未建定格快照层').not.toBeNull()
    for (const [名, 元] of Object.entries(目标们)) {
      expect(元.getAttribute('style'), `收束期 ${名} 被写了内联样式`).toBeNull()
      expect(计算样式快照(元), `收束期 ${名} 的计算样式与入场前不一致`).toEqual(入场前[名])
    }

    await vi.advanceTimersByTimeAsync(700)
    await flushPromises()
    expect(定格层(), '收束结束后快照层被提前摘除').not.toBeNull()
    for (const [名, 元] of Object.entries(目标们)) {
      expect(元.getAttribute('style'), `飞行期 ${名} 被写了内联样式`).toBeNull()
      expect(计算样式快照(元), `飞行期 ${名} 的计算样式与入场前不一致`).toEqual(入场前[名])
    }

    await vi.advanceTimersByTimeAsync(600)
    await flushPromises()
    expect(定格层(), '飞行结束后快照层未移除').toBeNull()
    for (const [名, 元] of Object.entries(目标们)) {
      expect(元.getAttribute('style'), `${名} 动画结束后残留内联样式`).toBeNull()
      expect(计算样式快照(元), `${名} 动画结束后计算样式未回到入场前`).toEqual(入场前[名])
    }
    expect(场景.推送).toHaveBeenCalledWith('/')
    expect(使用用户仓库().mingChengKeJian).toBe(true)
    场景.wrapper.unmount()
  })

  it('每一条动画的宿主都在快照层子树内（活 DOM 上一条动画都没有）', async () => {
    const 场景 = await 建场景('dengLu')
    await 提交表单(场景, 'dengLu')
    const 层 = 定格层() as HTMLElement
    expect(层).toBeTruthy()
    await 跑到结束()
    expect(动画册.length, '收束 3 条 + 容器 1 条 + 飞行 1 条 = 5 条').toBeGreaterThanOrEqual(5)
    for (const 影 of 动画册) {
      expect(影.目标 === 层 || 层.contains(影.目标), '有动画挂在活 DOM 上 = 就地改写活 DOM').toBe(true)
      expect(影.填充, "动画缺 fill:forwards ⇒ 收束态守不住").toBe('forwards')
    }
    场景.wrapper.unmount()
  })
})

describe('FP-05 ②：动画集合回到基线（改前的 fill:forwards 泄漏已收口）', () => {
  it('飞行中集合高于基线，飞行结束回到基线值', async () => {
    const 场景 = await 建场景('dengLu')
    expect(场景.基线, '基线应为 0（jsdom 无 CSS 动画）').toBe(0)
    await 提交表单(场景, 'dengLu')
    expect(活着的动画().length).toBeGreaterThan(场景.基线)
    await vi.advanceTimersByTimeAsync(700)
    await flushPromises()
    expect(document.getAnimations().length, '收束完成时就回落到基线 = 飞行段根本没建动画').toBeGreaterThan(
      场景.基线,
    )
    await vi.advanceTimersByTimeAsync(600)
    await flushPromises()
    expect(document.getAnimations().length, '动画集合未回到基线 ⇒ fill:forwards 泄漏').toBe(场景.基线)
    场景.wrapper.unmount()
  })

  it('快照层被摘除时，集合里不留任何挂在该子树上的动画', async () => {
    const 场景 = await 建场景('dengLu')
    await 提交表单(场景, 'dengLu')
    await 跑到结束()
    expect(定格层()).toBeNull()
    expect(document.getAnimations()).toEqual([])
    场景.wrapper.unmount()
  })
})

describe('FP-05 ③：飞行终点与 .yonghu-xuanxiang 中心偏差 ≤2px', () => {
  it('位移取两矩形中心差、缩放取落点宽/快照宽 ⇒ 两轴落点偏差均 ≤2px', async () => {
    const 场景 = await 建场景('dengLu')
    await 提交表单(场景, 'dengLu')
    await vi.advanceTimersByTimeAsync(700)
    await flushPromises()
    const 层 = 定格层() as HTMLElement
    const 飞行 = 活着的动画().filter((影) => 影.目标 === 层).at(-1) as 影动画 | undefined
    expect(飞行, '收束后没有第二段（飞行）动画').toBeDefined()
    const 变换 = 末帧值(飞行, 'transform')
    expect(变换, '飞行末帧缺 transform ⇒ 没有位移').toBeTruthy()
    const 平移 = 平移量(变换)
    expect(平移, `位移不是可解析的 translate(px, px)：${变换}`).not.toBeNull()

    const 起点 = 中心(活卡盒)
    const 落点 = 中心(用户位盒)
    expect(Math.abs(起点.x + 平移!.x - 落点.x), 'X 轴落点偏差').toBeLessThanOrEqual(2)
    expect(Math.abs(起点.y + 平移!.y - 落点.y), 'Y 轴落点偏差').toBeLessThanOrEqual(2)
    const 缩放匹 = /scale\(\s*([\d.]+)\s*\)/.exec(变换)
    expect(缩放匹, `缩放端点不可解析：${变换}`).not.toBeNull()
    expect(Number(缩放匹![1]), '末态宽不等于落点宽 ⇒ 落点尺寸没吃实测矩形').toBeCloseTo(
      用户位盒.width / 活卡盒.width,
      6,
    )
    expect(末帧值(飞行, 'opacity'), '末态未淡出').toBe('0')
    await 跑到结束()
    场景.wrapper.unmount()
  })

  it('快照层几何 = 入场前实测矩形（四端全走内联自定义属性，脚本不另立第二套度量）', async () => {
    const 场景 = await 建场景('dengLu')
    await 提交表单(场景, 'dengLu')
    const 样式 = (定格层() as HTMLElement).style
    expect(样式.getPropertyValue('--dingge-zuo')).toBe(`${活卡盒.left}px`)
    expect(样式.getPropertyValue('--dingge-shang')).toBe(`${活卡盒.top}px`)
    expect(样式.getPropertyValue('--dingge-kuan')).toBe(`${活卡盒.width}px`)
    expect(样式.getPropertyValue('--dingge-gao')).toBe(`${活卡盒.height}px`)
    await 跑到结束()
    场景.wrapper.unmount()
  })
})

describe('FP-05 ④：prefers-reduced-motion 不做位移、直接切换、零遗留', () => {
  it('减动效档：不建层、零动画、活卡片零内联样式，且仍然导航并恢复昵称可见', async () => {
    装减动效桩(true)
    const 场景 = await 建场景('dengLu')
    const 入场前 = 计算样式快照(场景.卡)
    await 提交表单(场景, 'dengLu')
    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()
    expect(定格层(), '减动效档仍建了定格层').toBeNull()
    expect(动画册, '减动效档建了动画').toEqual([])
    expect(场景.卡.getAttribute('style'), '减动效档给活卡片写了内联样式（改前是 opacity:0）').toBeNull()
    expect(计算样式快照(场景.卡)).toEqual(入场前)
    expect(场景.推送).toHaveBeenCalledWith('/')
    expect(使用用户仓库().mingChengKeJian).toBe(true)
    场景.wrapper.unmount()
  })

  it('落点缺失时同退化：不建层、不改写活 DOM、照常导航', async () => {
    const 场景 = await 建场景('dengLu')
    场景.用户位.remove()
    const 入场前 = 计算样式快照(场景.卡)
    await 提交表单(场景, 'dengLu')
    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()
    expect(定格层()).toBeNull()
    expect(动画册).toEqual([])
    expect(场景.卡.getAttribute('style')).toBeNull()
    expect(计算样式快照(场景.卡)).toEqual(入场前)
    expect(场景.推送).toHaveBeenCalledWith('/')
    场景.wrapper.unmount()
  })
})

describe('FP-05 ⑤：注册成功路径同构', () => {
  it('注册成功走同一条定格飞行链：建层→收束→飞行→清理，活卡片同样零内联样式', async () => {
    const 场景 = await 建场景('zhuCe')
    const 入场前 = 计算样式快照(场景.卡)
    expect(使用认证表单仓库().moShi, '前置：注册态没挂上').toBe('zhuCe')
    await 提交表单(场景, 'zhuCe')
    const 层 = 定格层()
    expect(层, '注册成功后未建定格层 ⇒ 注册路径无飞行语义（本单判定不成立）').not.toBeNull()
    expect(活着的动画().length, '注册路径的收束段动画条数与登录路径不同构').toBeGreaterThanOrEqual(4)
    expect(场景.卡.getAttribute('style')).toBeNull()
    expect(计算样式快照(场景.卡)).toEqual(入场前)
    await 跑到结束()
    expect(定格层()).toBeNull()
    expect(document.getAnimations()).toEqual([])
    for (const 影 of 动画册) expect(影.已注销, '注册路径有动画未被注销').toBe(true)
    expect(场景.卡.getAttribute('style')).toBeNull()
    expect(计算样式快照(场景.卡)).toEqual(入场前)
    expect(场景.推送).toHaveBeenCalledWith('/')
    场景.wrapper.unmount()
  })
})

describe('FP-05 快照保真：零依赖的 DOM 克隆快照', () => {
  it('快照层是活卡片的克隆：类名与结构在位，id 摘净、整层退出无障碍树且不可交互', async () => {
    const 场景 = await 建场景('dengLu')
    await 提交表单(场景, 'dengLu')
    const 层 = 定格层() as HTMLElement
    expect(层.classList.contains('biaodan-rongqi'), '快照未克隆卡片本体').toBe(true)
    expect(层.querySelectorAll('.juanzhou-gan').length).toBe(2)
    expect(层.querySelector('.biaodan-neirong-qu')).not.toBeNull()
    expect(层.querySelector('.biaodan-gundong')).not.toBeNull()
    expect(层.id).toBe('')
    expect(层.querySelectorAll('[id]').length, '快照里留着 id ⇒ 与活表单撞 id').toBe(0)
    expect(层.getAttribute('aria-hidden')).toBe('true')
    expect(层.hasAttribute('inert')).toBe(true)
    expect(getComputedStyle(层).pointerEvents).toBe('none')
    await 跑到结束()
    场景.wrapper.unmount()
  })

  it('input 的当前值被回填进快照（cloneNode 不带 property 值 ⇒「真定格」才成立）', async () => {
    const 场景 = await 建场景('dengLu')
    await 提交表单(场景, 'dengLu')
    const 层 = 定格层() as HTMLElement
    const 值们 = Array.from(层.querySelectorAll('input')).map((元) => (元 as HTMLInputElement).value)
    expect(值们).toContain('13800000000')
    await 跑到结束()
    场景.wrapper.unmount()
  })
})

describe('FP-05 令牌契约：几何吃令牌与实测矩形，脚本内零像素/色值字面量', () => {
  it('收束关键帧读的是 CSS 解析值（31/15），不是改前脚本写死的 28/14', async () => {
    const 场景 = await 建场景('dengLu')
    await 提交表单(场景, 'dengLu')
    const 层 = 定格层() as HTMLElement
    const 收束 = 活着的动画().find((影) => 影.目标 === 层) as 影动画
    expect(收束, '容器收束动画未建').toBeDefined()
    expect(末帧值(收束, 'height'), '收束高度未取自 CSS').toBe(`${注入筒高}px`)
    expect(末帧值(收束, 'border-radius'), '筒圆角未由筒高派生').toBe(`${注入杆高}px`)
    expect(末帧值(收束, 'padding')).toBe('0px')
    const 杆 = 层.querySelector('.juanzhou-gan') as HTMLElement
    const 杆动画 = 动画册.find((影) => 影.目标 === 杆) as 影动画
    expect(杆动画, '快照层上的卷轴杆动画未建').toBeDefined()
    expect(末帧值(杆动画, 'height'), '杆高未取自 CSS').toBe(`${注入杆高}px`)
    expect(末帧值(杆动画, 'opacity')).toBe('1')
    await 跑到结束()
    场景.wrapper.unmount()
  })

  it('全部关键帧零色值字面量，且出现的每个 px 数值都可追溯到实测矩形或 CSS 端值', async () => {
    const 场景 = await 建场景('dengLu')
    await 提交表单(场景, 'dengLu')
    const 两端 = (盒值: 盒) => [
      盒值.left,
      盒值.top,
      盒值.left + 盒值.width,
      盒值.top + 盒值.height,
      中心(盒值).x,
      中心(盒值).y,
      盒值.width,
      盒值.height,
    ]
    const 原始 = [...两端(活卡盒), ...两端(用户位盒)]
    const 可允许 = new Set<number>([0, 注入筒高, 注入杆高, ...原始])
    for (const a of 原始) {
      可允许.add(a / 2)
      for (const b of 原始) 可允许.add(Math.abs(a - b) / 2)
    }
    const 违规: string[] = []
    for (const 影 of 动画册) {
      for (const 帧 of 影.帧) {
        for (const [属性, 值] of Object.entries(帧)) {
          if (属性 === 'offset' || 值 === undefined || 值 === null) continue
          const 文本 = String(值)
          if (/#|rgba?\(/.test(文本)) 违规.push(`色值字面量 ${属性}:${文本}`)
          for (const 匹 of 文本.matchAll(/(-?[\d.]+)px/g)) {
            if (!可允许.has(Math.abs(Number(匹[1])))) 违规.push(`像素字面量 ${属性}:${文本}`)
          }
        }
      }
    }
    expect(违规, '脚本自带了追溯不到实测矩形/令牌的数值').toEqual([])
    await 跑到结束()
    场景.wrapper.unmount()
  })

  it('新令牌只在共用 :root，且各有 var() 消费者；两档解析同值、杆高/圆角由筒高派生', () => {
    for (const 令牌 of ['--juanzhou-tong-gao-du', '--ceng-jingge']) {
      expect(声明位置(令牌), `${令牌} 不在共用 :root 块`).toEqual({
        共用: true,
        浅色: false,
        深色: false,
      })
    }
    expect(层叠值('height', ['juan-zhou-dingge-shousuo'])).toBe('var(--juanzhou-tong-gao-du)')
    expect(层叠值('border-radius', ['juan-zhou-dingge-shousuo'])).toBe(
      'calc(var(--juanzhou-tong-gao-du) * 0.5)',
    )
    expect(层叠值('height', ['juan-zhou-dingge-gan'])).toBe('calc(var(--juanzhou-tong-gao-du) * 0.5)')
    expect(层叠值('z-index', ['juan-zhou-dingge'])).toBe('var(--ceng-jingge)')
    expect(解析几何数值('--juanzhou-tong-gao-du')).toBe(28)
    expect(求几何算式('calc(var(--juanzhou-tong-gao-du) * 0.5)')).toBe(14)
  })

  it('定格层几何端 = 脚本自定义属性；收束类与杆目标类在层叠里确实压过基态', () => {
    expect(层叠值('position', ['juan-zhou-dingge'])).toBe('fixed')
    expect(层叠值('left', ['juan-zhou-dingge'])).toBe('var(--dingge-zuo)')
    expect(层叠值('height', ['juan-zhou-dingge'])).toBe('var(--dingge-gao)')
    expect(
      层叠值('height', ['biaodan-rongqi', 'juan-zhou-dingge', 'juan-zhou-dingge-shousuo']),
      '收束期高度未被目标态接管 ⇒ 又会变成脚本字面量',
    ).toBe('var(--juanzhou-tong-gao-du)')
    expect(层叠值('height', ['juanzhou-gan', 'juan-zhou-dingge-gan'])).toBe(
      'calc(var(--juanzhou-tong-gao-du) * 0.5)',
    )
    expect(层叠值('opacity', ['juanzhou-gan', 'juan-zhou-dingge-gan'])).toBe('1')
  })

  it('既有契约不被本单改写：卡片 overflow:hidden 仍由 CSS 承担，活卡片类名集合恒定', async () => {
    expect(层叠值('overflow', ['biaodan-rongqi'])).toBe('hidden')
    expect(层叠值('flex-shrink', ['juanzhou-gan'])).toBe('0')
    const 场景 = await 建场景('dengLu')
    const 前 = [...场景.卡.classList]
    await 提交表单(场景, 'dengLu')
    expect([...场景.卡.classList], '本单给活卡片挂了状态类').toEqual(前)
    await 跑到结束()
    expect([...场景.卡.classList]).toEqual(前)
    expect(视图源).not.toContain('.style.overflow')
    场景.wrapper.unmount()
  })
})
