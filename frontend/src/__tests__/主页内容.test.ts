import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
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
      {
        path: '/tiao-zhan',
        name: 'tiaoZhanZhuYe',
        component: { template: '<div>挑战主页</div>' },
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

  it('挑战模式入口隐藏“排位赛”标签', async () => {
    const { wrapper } = await mountZuJian()

    const tiaozhanKapian = wrapper.find('.tiaozhan-moshi-kapian')
    const paiWeiSaiWenBen = huoQuFanYi('zhuYe', 'paiWeiSaiBiaoQian')

    expect(tiaozhanKapian.text()).not.toContain(paiWeiSaiWenBen)
    expect(tiaozhanKapian.find('.tiaozhan-zhuangtai-biaoqian').exists()).toBe(false)
  })

  it('点击普通模式入口跳转到资料设置向导路径', async () => {
    const { wrapper, luYou } = await mountZuJian()

    const putongKapian = wrapper.find('.putong-moshi-kapian')
    await putongKapian.trigger('click')
    await flushPromises()

    expect(luYou.currentRoute.value.path).toBe('/profile-setup')
    expect(luYou.currentRoute.value.query.moshi).toBe('putong')
  })

  it('点击挑战模式入口跳转到挑战主页', async () => {
    const { wrapper, luYou } = await mountZuJian()

    const tiaozhanKapian = wrapper.find('.tiaozhan-moshi-kapian')
    await tiaozhanKapian.trigger('click')
    await flushPromises()

    expect(luYou.currentRoute.value.path).toBe('/tiao-zhan')
  })

  it('主页不再包含吴昊阳 DOM 静态贴图（主角已移入草地 3D 背景）', async () => {
    const { wrapper } = await mountZuJian()

    expect(wrapper.find('.juese-tupian').exists()).toBe(false)
    expect(wrapper.find('.juese-zhanshi-qu').exists()).toBe(false)
    expect(wrapper.html()).not.toContain('吴昊阳')
  })

  describe('FP-01 主页净化：无罩染无底板，草地直透', () => {
    const zhuYeYuanMa = readFileSync(resolve(__dirname, '../views/主页内容.vue'), 'utf8')

    it('无染色罩层元素与样式，根容器透明', async () => {
      const { wrapper } = await mountZuJian()
      expect(wrapper.find('.zhuye-ranse').exists()).toBe(false)
      expect(zhuYeYuanMa).not.toContain('zhuye-ranse')
      expect(zhuYeYuanMa).not.toContain('ranSeLeiMing')
      expect(zhuYeYuanMa).toContain('background: transparent')
    })

    it('无备案页脚引用', async () => {
      const { wrapper } = await mountZuJian()
      expect(wrapper.text()).not.toContain('备案进行中')
      expect(zhuYeYuanMa).not.toContain('BeiAnYeJiao')
    })
  })

  describe('FP-03 开始体验深色hover同色', () => {
    const zhuYeYuanMa = readFileSync(resolve(__dirname, '../views/主页内容.vue'), 'utf8')
    const bianLiangCss = readFileSync(resolve(__dirname, '../styles/variables.css'), 'utf8')

    it('开始体验文案走translations无硬编码', async () => {
      const { wrapper } = await mountZuJian()
      expect(zhuYeYuanMa).toContain("huoQuFanYi('zhuYe', 'kaiShiTiYan')")
      expect(zhuYeYuanMa).toContain("huoQuFanYi('zhuYe', 'jieShouTiaoZhan')")
      expect(wrapper.find('.kaishi-wenben').exists()).toBe(true)
      expect(wrapper.text()).toContain(huoQuFanYi('zhuYe', 'kaiShiTiYan'))
      expect(wrapper.text()).toContain(huoQuFanYi('zhuYe', 'jieShouTiaoZhan'))
    })

    it('开始文本与箭头使用设计令牌单源', () => {
      expect(zhuYeYuanMa).toContain('color: var(--zhuye-kaishi-wenben)')
      expect(zhuYeYuanMa).toContain('color: var(--zhuye-kaishi-jiantou)')
      expect(bianLiangCss).toContain('--zhuye-kaishi-wenben:')
      expect(bianLiangCss).toContain('--zhuye-kaishi-jiantou:')
    })

    it('深色白系浅色黑系各一套令牌值', () => {
      expect(bianLiangCss).toMatch(/--zhuye-kaishi-wenben:\s*rgba\(255,\s*255,\s*255,\s*0\.45\)/)
      expect(bianLiangCss).toMatch(/--zhuye-kaishi-jiantou:\s*rgba\(255,\s*255,\s*255,\s*0\.12\)/)
      expect(bianLiangCss).toMatch(/--zhuye-kaishi-wenben:\s*rgba\(0,\s*0,\s*0,\s*0\.55\)/)
      expect(bianLiangCss).toMatch(/--zhuye-kaishi-jiantou:\s*rgba\(0,\s*0,\s*0,\s*0\.1\)/)
    })

    it('无重复hover变色规则与硬编码hover色', () => {
      expect(zhuYeYuanMa).not.toContain('.putong-moshi-kapian:hover .kaishi-wenben')
      expect(zhuYeYuanMa).not.toContain('.tiaozhan-moshi-kapian:hover .kaishi-wenben')
      expect(zhuYeYuanMa).not.toContain('.putong-moshi-kapian:hover .kaishi-jiantou')
      expect(zhuYeYuanMa).not.toContain('.tiaozhan-moshi-kapian:hover .kaishi-jiantou')
      expect(zhuYeYuanMa).not.toContain('#e84a7a')
    })

    it('hover仅位移无颜色闪烁', () => {
      expect(zhuYeYuanMa).toContain('.moshi-kapian:hover .kaishi-jiantou')
      expect(zhuYeYuanMa).toMatch(
        /\.moshi-kapian:hover \.kaishi-jiantou\s*\{[^}]*transform:\s*translateX\(4px\)/,
      )
      expect(zhuYeYuanMa).toMatch(/\.kaishi-jiantou\s*\{[^}]*transition:\s*transform/)
    })
  })
})
