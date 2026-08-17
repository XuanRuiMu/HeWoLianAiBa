import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 主页内容 from '@/views/主页内容.vue'
import { huoQuFanYi } from '@/config/translations'

vi.mock('@/api/认证', () => ({
  faSongMa: vi.fn(),
  jianChaShouJiHao: vi.fn(),
  dengLu: vi.fn(),
  zhuCe: vi.fn(),
  huoQuYongHuXinXi: vi.fn(),
}))

vi.mock('/favicon.svg', () => ({ default: '/favicon.svg' }))

function chuangJianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: 主页内容 },
      { path: '/login', name: 'dengLu', component: { template: '<div>登录</div>' } },
      {
        path: '/profile-setup',
        name: 'ziLiaoSheZhi',
        component: { template: '<div>资料设置</div>' },
      },
    ],
  })
}

describe('主页内容组件', () => {
  let huiFuTuPianJiaZai: (() => void) | null = null

  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  afterEach(() => {
    if (huiFuTuPianJiaZai) {
      huiFuTuPianJiaZai()
      huiFuTuPianJiaZai = null
    }
  })

  function pingBiTuPianJiaZai() {
    const YuanShiImage = window.Image
    class JiaImage {
      src = ''
      alt = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 0)
      }
    }
    vi.stubGlobal('Image', JiaImage)
    return () => {
      vi.stubGlobal('Image', YuanShiImage)
    }
  }

  async function mountZuJian() {
    huiFuTuPianJiaZai = pingBiTuPianJiaZai()
    const luYou = chuangJianLuYou()
    const pinia = createPinia()
    setActivePinia(pinia)

    const wrapper = mount(主页内容, {
      global: {
        plugins: [pinia, luYou],
      },
      attachTo: document.body,
    })
    await luYou.isReady()
    await flushPromises()
    return { wrapper, luYou }
  }

  it('渲染普通模式和挑战模式两个入口元素', async () => {
    const { wrapper } = await mountZuJian()

    const putongWenBen = huoQuFanYi('zhuYe', 'putongMoShi')
    const tiaozhanWenBen = huoQuFanYi('zhuYe', 'tiaoZhanMoShi')

    const putongKapian = wrapper.find('.putong-moshi-kapian')
    const tiaozhanKapian = wrapper.find('.tiaozhan-moshi-kapian')

    expect(putongKapian.exists()).toBe(true)
    expect(tiaozhanKapian.exists()).toBe(true)
    expect(putongKapian.text()).toContain(putongWenBen)
    expect(tiaozhanKapian.text()).toContain(tiaozhanWenBen)
  })

  it('挑战模式入口包含“即将推出”文本', async () => {
    const { wrapper } = await mountZuJian()

    const tiaozhanKapian = wrapper.find('.tiaozhan-moshi-kapian')
    const jiJiangTuiChuWenBen = huoQuFanYi('zhuYe', 'jiJiangTuiChu')

    expect(tiaozhanKapian.text()).toContain(jiJiangTuiChuWenBen)
    expect(tiaozhanKapian.find('.jijiang-tuichu-biaoqian').exists()).toBe(true)
  })

  it('点击普通模式入口跳转到资料设置向导路径', async () => {
    const { wrapper, luYou } = await mountZuJian()

    const putongKapian = wrapper.find('.putong-moshi-kapian')
    await putongKapian.trigger('click')
    await flushPromises()

    expect(luYou.currentRoute.value.path).toBe('/profile-setup')
    expect(luYou.currentRoute.value.query.moshi).toBe('putong')
  })

  it('点击挑战模式入口不触发路由跳转', async () => {
    const { wrapper, luYou } = await mountZuJian()

    const qiShiLuJing = luYou.currentRoute.value.path
    const tiaozhanKapian = wrapper.find('.tiaozhan-moshi-kapian')
    await tiaozhanKapian.trigger('click')
    await flushPromises()

    expect(luYou.currentRoute.value.path).toBe(qiShiLuJing)
  })

  it('主页不再包含吴昊阳 DOM 静态贴图（主角已移入草地 3D 背景）', async () => {
    const { wrapper } = await mountZuJian()

    expect(wrapper.find('.juese-tupian').exists()).toBe(false)
    expect(wrapper.find('.juese-zhanshi-qu').exists()).toBe(false)
    expect(wrapper.html()).not.toContain('吴昊阳')
  })
})
