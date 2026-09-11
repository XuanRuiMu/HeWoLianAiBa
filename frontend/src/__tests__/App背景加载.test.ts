import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from '@/App.vue'

vi.mock('@/api/认证', () => ({
  faSongMa: vi.fn(),
  jianChaShouJiHao: vi.fn(),
  dengLu: vi.fn(),
  zhuCe: vi.fn(),
  huoQuYongHuXinXi: vi.fn(),
  gengGaiYongHuMing: vi.fn(),
  gengGaiMiMa: vi.fn(),
}))

vi.mock('@/api/通知', () => ({
  huoQuTongZhiLieBiao: vi.fn().mockResolvedValue({ lie_biao: [], wei_du_shu: 0 }),
  biaoJiTongZhiYiDu: vi.fn(),
  biaoJiQuanBuTongZhiYiDu: vi.fn(),
}))

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}))

function chuangJianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/login', name: 'dengLu', component: { template: '<div>登录</div>' } },
      { path: '/chat/:huiHuaId', name: 'liaoTian', component: { template: '<div>聊天</div>' } },
      { path: '/hao-you/:haoYouId', name: 'haoYouLiaoTian', component: { template: '<div>好友聊天</div>' } },
      { path: '/tong-zhi', name: 'tongZhi', component: { template: '<div>通知</div>' } },
    ],
  })
}

describe('App 草地背景独立加载', () => {
  let kongXianHuiDiao: (() => void) | null = null
  const huiFuKongXian: Array<() => void> = []

  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
    kongXianHuiDiao = null
    const yuanKongXian = (window as unknown as Record<string, unknown>).requestIdleCallback
    const yuanShi = window.requestIdleCallback
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
      kongXianHuiDiao = cb
      return 1
    })
    huiFuKongXian.push(() => {
      vi.stubGlobal('requestIdleCallback', yuanKongXian !== undefined ? yuanKongXian : yuanShi)
    })
  })

  afterEach(() => {
    while (huiFuKongXian.length) {
      huiFuKongXian.pop()?.()
    }
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  async function mountApp(chuShiLuYou = '/') {
    const luYou = chuangJianLuYou()
    luYou.push(chuShiLuYou)
    await luYou.isReady()
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(App, {
      global: { plugins: [pinia, luYou] },
      attachTo: document.body,
    })
    await flushPromises()
    return { wrapper, luYou }
  }

  function faSongBeiJingJiuXu(wrapper: { find: (s: string) => { element?: unknown } }) {
    const iframe = wrapper.find('iframe.grass-bg-iframe')
    const yuanSu = iframe.element as HTMLIFrameElement | undefined
    const laiYuan = yuanSu?.contentWindow ?? window
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { source: 'cao-di-bei-jing', zhuangTai: 'jiu-xu' },
        source: laiYuan as Window,
      }),
    )
  }

  function faSongBeiJingShiBai(wrapper: { find: (s: string) => { element?: unknown } }, yuanYin = 'caoDi') {
    const iframe = wrapper.find('iframe.grass-bg-iframe')
    const yuanSu = iframe.element as HTMLIFrameElement | undefined
    const laiYuan = yuanSu?.contentWindow ?? window
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { source: 'cao-di-bei-jing', zhuangTai: 'shi-bai', yuanYin },
        source: laiYuan as Window,
      }),
    )
  }

  it('初始渲染不含背景 iframe，等空闲回调后才挂载', async () => {
    const { wrapper } = await mountApp()

    expect(kongXianHuiDiao).not.toBeNull()
    expect(wrapper.find('iframe.grass-bg-iframe').exists()).toBe(false)
    expect(wrapper.find('.app-rongqi').exists()).toBe(true)

    kongXianHuiDiao!()
    await flushPromises()

    const iframe = wrapper.find('iframe.grass-bg-iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toMatch(/^\/grass-bg\/grass-bg\.html\?v=.+&fenXi=0&xiangSuBi=.+$/)
  })

  it('无 requestIdleCallback 环境下走 setTimeout 兜底加载', async () => {
    vi.stubGlobal('requestIdleCallback', undefined)
    vi.useFakeTimers()
    try {
      const { wrapper } = await mountApp()
      expect(wrapper.find('iframe.grass-bg-iframe').exists()).toBe(false)
      vi.advanceTimersByTime(900)
      await flushPromises()
      expect(wrapper.find('iframe.grass-bg-iframe').exists()).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('除聊天类路由外显示背景，聊天类路由微窗隐藏（文档常驻）', async () => {
    const { wrapper, luYou } = await mountApp()
    kongXianHuiDiao!()
    await flushPromises()

    const duQuIframe = () => {
      const iframe = wrapper.find('iframe.grass-bg-iframe')
      return {
        cunZai: iframe.exists(),
        jiHuo: iframe.exists() && iframe.classes().includes('is-active'),
        guaQi: iframe.exists() && iframe.classes().includes('gua-qi'),
        yinCang: iframe.exists() ? iframe.attributes('aria-hidden') : undefined,
        diZhi: iframe.exists() ? iframe.attributes('src') : undefined,
      }
    }

    expect(duQuIframe().cunZai).toBe(true)
    expect(duQuIframe().jiHuo).toBe(false)
    expect(duQuIframe().guaQi).toBe(false)

    faSongBeiJingJiuXu(wrapper)
    await flushPromises()
    expect(duQuIframe().jiHuo).toBe(true)

    await luYou.push('/chat/1')
    await flushPromises()
    expect(duQuIframe().cunZai).toBe(true)
    // src 永不切换为 about:blank，文档常驻
    expect(duQuIframe().diZhi).toMatch(/^\/grass-bg\/grass-bg\.html\?v=.+&fenXi=0&xiangSuBi=.+$/)
    expect(duQuIframe().guaQi).toBe(true)
    expect(duQuIframe().jiHuo).toBe(false)
    expect(duQuIframe().yinCang).toBe('true')

    // 好友聊天同样挂起背景（与 AI 聊天一致）
    await luYou.push('/hao-you/f1')
    await flushPromises()
    expect(duQuIframe().cunZai).toBe(true)
    expect(duQuIframe().guaQi).toBe(true)

    // 离开聊天类路由直接显示：就绪态保持，无需重新等待 jiu-xu，秒开
    await luYou.push('/tong-zhi')
    await flushPromises()
    expect(duQuIframe().guaQi).toBe(false)
    expect(duQuIframe().jiHuo).toBe(true)
    expect(duQuIframe().yinCang).toBe('false')
  })

  it('进入聊天路由隐藏、离开后秒开：src 恒定、就绪态不重置', async () => {
    const { wrapper, luYou } = await mountApp()
    kongXianHuiDiao!()
    await flushPromises()

    const caoDiDiZhi = wrapper.find('iframe.grass-bg-iframe').attributes('src')
    expect(caoDiDiZhi).toMatch(/^\/grass-bg\/grass-bg\.html\?v=.+&fenXi=0&xiangSuBi=.+$/)
    faSongBeiJingJiuXu(wrapper)
    await flushPromises()

    await luYou.push('/chat/1')
    await flushPromises()
    const guaQiIframe = wrapper.find('iframe.grass-bg-iframe')
    expect(guaQiIframe.exists()).toBe(true)
    expect(guaQiIframe.attributes('src')).toBe(caoDiDiZhi)
    expect(guaQiIframe.classes().includes('gua-qi')).toBe(true)

    await luYou.push('/tong-zhi')
    await flushPromises()
    const huanYuanIframe = wrapper.find('iframe.grass-bg-iframe')
    expect(huanYuanIframe.exists()).toBe(true)
    expect(huanYuanIframe.attributes('src')).toBe(caoDiDiZhi)
    expect(huanYuanIframe.classes().includes('gua-qi')).toBe(false)
    // 未重发 jiu-xu 即已显现：缓存秒开
    expect(huanYuanIframe.classes().includes('is-active')).toBe(true)
  })

  it('刷新直达聊天路由时 iframe 常驻隐藏挂载，应用照常运行', async () => {
    const { wrapper } = await mountApp('/chat/1')
    kongXianHuiDiao!()
    await flushPromises()

    const iframe = wrapper.find('iframe.grass-bg-iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toMatch(/^\/grass-bg\/grass-bg\.html\?v=.+&fenXi=0&xiangSuBi=.+$/)
    expect(iframe.classes().includes('gua-qi')).toBe(true)
    expect(wrapper.find('.app-rongqi').exists()).toBe(true)
  })

  it('背景首次加载失败时重试一次后恢复，耗尽后才移除', async () => {
    vi.useFakeTimers()
    try {
      const { wrapper } = await mountApp()
      kongXianHuiDiao!()
      await flushPromises()

      const diYi = wrapper.find('iframe.grass-bg-iframe')
      expect(diYi.exists()).toBe(true)
      const yuanDiZhi = diYi.attributes('src')
      await diYi.trigger('error')
      await flushPromises()
      expect(wrapper.find('iframe.grass-bg-iframe').exists()).toBe(false)

      await vi.advanceTimersByTimeAsync(2100)
      await flushPromises()
      const chongShi = wrapper.find('iframe.grass-bg-iframe')
      expect(chongShi.exists()).toBe(true)
      expect(chongShi.attributes('src')).toBe(yuanDiZhi)

      await chongShi.trigger('error')
      await flushPromises()
      expect(wrapper.find('iframe.grass-bg-iframe').exists()).toBe(false)
      await vi.advanceTimersByTimeAsync(3000)
      await flushPromises()
      expect(wrapper.find('iframe.grass-bg-iframe').exists()).toBe(false)
      expect(wrapper.find('.app-rongqi').exists()).toBe(true)
      expect(wrapper.find('.cao-di-shibai-ti-shi').exists()).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('门控揭示：就绪前保持隐藏，收到 jiu-xu 后才显现', async () => {
    const { wrapper } = await mountApp()
    kongXianHuiDiao!()
    await flushPromises()

    expect(wrapper.find('iframe.grass-bg-iframe').classes().includes('is-active')).toBe(false)
    faSongBeiJingJiuXu(wrapper)
    await flushPromises()
    expect(wrapper.find('iframe.grass-bg-iframe').classes().includes('is-active')).toBe(true)
  })

  it('门控失败：收到 shi-bai 后隐藏背景并提示，应用照常运行', async () => {
    const { wrapper } = await mountApp()
    kongXianHuiDiao!()
    await flushPromises()
    expect(wrapper.find('iframe.grass-bg-iframe').exists()).toBe(true)

    faSongBeiJingShiBai(wrapper, 'wuHaoYang')
    await flushPromises()

    expect(wrapper.find('iframe.grass-bg-iframe').exists()).toBe(false)
    expect(wrapper.find('.cao-di-shibai-ti-shi').exists()).toBe(true)
    expect(wrapper.find('.app-rongqi').exists()).toBe(true)
  })

  it('FP-02 父层退化淡入（原FP-01中央展开已同步为opacity语义）：父层仅opacity显现无圆形扩散并尊重减少动态偏好', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const yuanMa = readFileSync(resolve(process.cwd(), 'src', 'App.vue'), 'utf8')
    expect(yuanMa).not.toContain('clip-path')
    expect(yuanMa).not.toContain('circle(')
    expect(yuanMa).toContain('.grass-bg-iframe.is-active')
    expect(yuanMa).toContain('opacity: 0')
    expect(yuanMa).toContain('opacity: 1')
    expect(yuanMa).toMatch(/transition:\s*opacity[^;]*ease/)
    expect(yuanMa).not.toMatch(/transition:[^}]*clip-path/)
    expect(yuanMa).toContain('prefers-reduced-motion')
    expect(yuanMa).toContain('transition: none')
    expect(yuanMa).toContain('.grass-bg-iframe.gua-qi')
    expect(yuanMa).toContain('2px')
    expect(yuanMa).toContain('visibility: hidden')
    expect(yuanMa).toContain('inset: 0')
    expect(yuanMa).toContain('width: 100%')
  })
})
