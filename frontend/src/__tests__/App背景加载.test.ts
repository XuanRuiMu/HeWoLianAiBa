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

  it('初始渲染不含背景 iframe，等空闲回调后才挂载', async () => {
    const { wrapper } = await mountApp()

    expect(kongXianHuiDiao).not.toBeNull()
    expect(wrapper.find('iframe.grass-bg-iframe').exists()).toBe(false)
    expect(wrapper.find('.app-rongqi').exists()).toBe(true)

    kongXianHuiDiao!()
    await flushPromises()

    const iframe = wrapper.find('iframe.grass-bg-iframe')
    expect(iframe.exists()).toBe(true)
    expect(iframe.attributes('src')).toBe('/grass-bg/grass-bg.html')
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

  it('除聊天页外的路由显示背景，聊天页隐藏背景', async () => {
    const { wrapper, luYou } = await mountApp()
    kongXianHuiDiao!()
    await flushPromises()

    const duQuIframe = () => {
      const iframe = wrapper.find('iframe.grass-bg-iframe')
      return {
        cunZai: iframe.exists(),
        jiHuo: iframe.classes().includes('is-active'),
        yinCang: iframe.attributes('aria-hidden'),
      }
    }

    expect(duQuIframe().jiHuo).toBe(true)

    await luYou.push('/chat/1')
    await flushPromises()
    expect(duQuIframe().cunZai).toBe(true)
    expect(duQuIframe().jiHuo).toBe(false)
    expect(duQuIframe().yinCang).toBe('true')

    await luYou.push('/tong-zhi')
    await flushPromises()
    expect(duQuIframe().jiHuo).toBe(true)
    expect(duQuIframe().yinCang).toBe('false')
  })

  it('背景加载失败时移除 iframe 且应用主体不受影响', async () => {
    const { wrapper } = await mountApp()
    kongXianHuiDiao!()
    await flushPromises()

    const iframe = wrapper.find('iframe.grass-bg-iframe')
    expect(iframe.exists()).toBe(true)
    await iframe.trigger('error')
    await flushPromises()

    expect(wrapper.find('iframe.grass-bg-iframe').exists()).toBe(false)
    expect(wrapper.find('.app-rongqi').exists()).toBe(true)
    expect(wrapper.text()).toContain('主页')
  })
})
