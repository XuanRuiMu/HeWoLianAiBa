import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import 登录内容 from '@/views/登录内容.vue'
import { 使用认证表单仓库 } from '@/stores/认证表单'

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
const 布局源 = readFileSync(resolve(__dirname, '../layouts/认证布局.vue'), 'utf8')
const 路由源 = readFileSync(resolve(__dirname, '../router/index.ts'), 'utf8')

function 取样式(源: string): string {
  const 匹配 = /<style[^>]*>([\s\S]*?)<\/style>/.exec(源)
  expect(匹配).not.toBeNull()
  return (匹配 as RegExpMatchArray)[1].replace(/\/\*[\s\S]*?\*\//g, '')
}

const 视图样式 = 取样式(视图源)
const 布局样式 = 取样式(布局源)

async function 挂载(moShi: 'dengLu' | 'zhuCe', 真实过渡 = false): Promise<VueWrapper> {
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
  const wrapper = mount(登录内容, {
    attachTo: document.body,
    global: {
      plugins: [pinia, 路由],
      ...(真实过渡 ? { stubs: { transition: false, 'transition-stub': false } } : {}),
    },
  })
  await 路由.isReady()
  await flushPromises()
  return wrapper
}

async function 切换(wrapper: VueWrapper, 目标: 'dengLu' | 'zhuCe'): Promise<void> {
  const 序 = 目标 === 'dengLu' ? 0 : 1
  await wrapper.findAll('.biaoqian-anniu')[序].trigger('click')
  await flushPromises()
}

function 样式声明(选择器: string, 属性: string): string {
  const 转义 = 选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const 匹配 = new RegExp(`${转义}\\s*\\{([^}]*)\\}`).exec(视图样式)
  expect(匹配, `未找到 ${选择器} 样式`).not.toBeNull()
  const 声明 = new RegExp(`(?:^|;)\\s*${属性}\\s*:\\s*([^;]+)`).exec((匹配 as RegExpMatchArray)[1])
  expect(声明, `${选择器} 缺少 ${属性}`).not.toBeNull()
  return (声明 as RegExpMatchArray)[1].trim()
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.resetAllMocks()
  document.head.querySelectorAll('style[data-fp07]').forEach((节) => 节.remove())
})

afterEach(() => {
  document.body.innerHTML = ''
  document.head.querySelectorAll('style[data-fp07]').forEach((节) => 节.remove())
})

describe('FP-07 认证双向过渡', () => {
  it('登录→注册与注册→登录均按 DOM 顺序保留双向表单，并只让目标表单可访问', async () => {
    const 节 = document.createElement('style')
    节.dataset.fp07 = '1'
    节.textContent =
      '.biaodan-qiehuan-you-leave-active,.biaodan-qiehuan-you-enter-active,.biaodan-qiehuan-zuo-leave-active,.biaodan-qiehuan-zuo-enter-active{transition-duration:80ms}'
    document.head.appendChild(节)

    for (const [起, 终, 方向] of [
      ['dengLu', 'zhuCe', 'you'],
      ['zhuCe', 'dengLu', 'zuo'],
    ] as const) {
      const wrapper = await 挂载(起, true)
      await 切换(wrapper, 终)
      const 表单们 = wrapper.findAll('form')
      expect(表单们.map((表单) => 表单.attributes('data-form-mode'))).toEqual(['dengLu', 'zhuCe'])
      const 离场 = 表单们.find((表单) => 表单.attributes('data-form-mode') === 起)
      const 入场 = 表单们.find((表单) => 表单.attributes('data-form-mode') === 终)
      expect(离场).toBeDefined()
      expect(入场).toBeDefined()
      expect(离场!.attributes('aria-hidden')).toBe('true')
      expect(离场!.attributes('inert')).toBeDefined()
      expect(离场!.attributes('tabindex')).toBe('-1')
      expect(入场!.attributes('aria-hidden')).toBeUndefined()
      expect(入场!.attributes('inert')).toBeUndefined()
      expect(入场!.attributes('tabindex')).toBeUndefined()
      expect(wrapper.find(`.biaodan-qiehuan-${方向}-enter-active`).exists()).toBe(true)
      wrapper.unmount()
    }
  })

  it('稳定态只保留目标表单，切换后不存在仍可聚焦的隐藏控件', async () => {
    const wrapper = await 挂载('dengLu')
    expect(wrapper.findAll('form')).toHaveLength(1)
    expect(wrapper.find('form').attributes('aria-hidden')).toBeUndefined()
    expect(wrapper.find('form').attributes('inert')).toBeUndefined()
    await 切换(wrapper, 'zhuCe')
    expect(wrapper.findAll('form')).toHaveLength(1)
    expect(wrapper.find('form').attributes('data-form-mode')).toBe('zhuCe')
    expect(wrapper.find('form').attributes('aria-hidden')).toBeUndefined()
    expect(wrapper.find('form').attributes('inert')).toBeUndefined()
    expect(wrapper.find('form').attributes('tabindex')).toBeUndefined()
    expect(视图源).not.toMatch(/v-show/)
    wrapper.unmount()
  })

  it('切换高度由 CSS 网格行与高度过渡承担，不写运行时高度或依赖完成定时器', () => {
    expect(样式声明('.biaodan-moshi-pane', 'display')).toBe('grid')
    expect(样式声明('.biaodan-moshi-pane', 'grid-template-rows')).toBe('0fr')
    expect(样式声明('.biaodan-moshi-pane.shi-fu-yong', 'grid-template-rows')).toBe('1fr')
    expect(样式声明('.biaodan-moshi-pane', 'transition')).toMatch(/grid-template-rows/)
    expect(样式声明('.biaodan-rongqi', 'transition')).toMatch(/height/)
    const 切换函数 = /function qieHuanMoShi[\s\S]*?\n}/.exec(视图源)?.[0] ?? ''
    expect(切换函数).not.toMatch(/setTimeout|requestAnimationFrame|style\.height/)
    expect(布局源).not.toMatch(/addEventListener\(['"]resize['"]/)
  })
})

describe('FP-07 独立滚动口与响应式降级', () => {
  it('滚动口独立于标签与错误提示，切换时宿主节点和占位契约恒定', async () => {
    const wrapper = await 挂载('dengLu')
    const 滚动口 = wrapper.find('.biaodan-gundong')
    expect(滚动口.exists()).toBe(true)
    expect(滚动口.find('.biaoqian-qiehuan').exists()).toBe(false)
    expect(滚动口.find('.cuowu-tishi').exists()).toBe(false)
    expect(滚动口.find('.biaodan-xingwei').exists()).toBe(true)
    const 原节点 = 滚动口.element
    const 原类 = [...(原节点 as HTMLElement).classList]
    expect(样式声明('.biaodan-gundong', 'overflow-y')).toBe('auto')
    expect(样式声明('.biaodan-gundong', 'min-height')).toBe('0')
    expect(样式声明('.biaodan-gundong', 'flex')).toBe('1')
    await 切换(wrapper, 'zhuCe')
    expect(wrapper.find('.biaodan-gundong').element).toBe(原节点)
    expect([...(原节点 as HTMLElement).classList]).toEqual(原类)
    wrapper.unmount()
  })

  it('移动断点同时约束认证根层与卡片，不让长表单把外层滚动口撑开', () => {
    const 移动段 = /@media\s*\(max-width:\s*767px\)\s*\{([\s\S]*)\n\}/.exec(布局样式)?.[1] ?? ''
    expect(移动段).toMatch(/\.yemian-buju\.denglu-moshi :deep\(\.denglu-neirong\)/)
    expect(移动段).toMatch(/\.yemian-buju\.denglu-moshi :deep\(\.biaodan-rongqi\)/)
    expect(移动段).toMatch(/var\(--jiange-/)
    expect(布局样式).toMatch(/\.yemian-buju\.denglu-moshi[\s\S]*?overflow-y:\s*hidden/)
  })

  it('减动效立即稳定切换：网格高度与横向位移均归零且不保留过渡', () => {
    const 减动效段 = [...视图样式.matchAll(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/g)]
      .map((匹配) => 匹配[1])
      .join('\n')
    expect(减动效段).toMatch(/\.biaodan-moshi-pane[\s\S]*?transition:\s*none/)
    expect(减动效段).toMatch(/\.biaodan-qiehuan-you-enter-active[\s\S]*?transition:\s*none/)
    expect(减动效段).toMatch(/\.biaodan-qiehuan-you-enter-from[\s\S]*?transform:\s*none/)
    expect(减动效段).toMatch(/\.biaodan-qiehuan-zuo-enter-from[\s\S]*?transform:\s*none/)
  })

  it('实际路由仍由认证布局承载登录内容，废弃 LoginView 不参与路由', () => {
    expect(路由源).toMatch(/layouts\/认证布局\.vue/)
    expect(路由源).toMatch(/views\/登录内容\.vue/)
    expect(路由源).not.toMatch(/LoginView/)
  })
})
