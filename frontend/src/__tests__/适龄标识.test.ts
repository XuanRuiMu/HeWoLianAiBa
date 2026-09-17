import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fanYi } from '@/config/translations'
import 登录内容 from '@/views/登录内容.vue'
import 主页内容 from '@/views/主页内容.vue'
import { 使用认证表单仓库 } from '@/stores/认证表单'

vi.mock('@/api/认证', () => ({
  faSongMa: vi.fn(),
  jianChaShouJiHao: vi.fn(),
  dengLu: vi.fn(),
  zhuCe: vi.fn(),
  huoQuYongHuXinXi: vi.fn(),
}))

vi.mock('@/api/请求', () => ({
  huoQuCuoWuXiangYing: vi.fn((cuoWu) => (cuoWu as { response?: unknown }).response),
}))

vi.mock('/favicon.svg', () => ({ default: '/favicon.svg' }))

const dangQianMuLu = dirname(fileURLToPath(import.meta.url))
const zhuYeYuanMa = readFileSync(resolve(dangQianMuLu, '../views/主页内容.vue'), 'utf8')
const dengLuYuanMa = readFileSync(resolve(dangQianMuLu, '../views/登录内容.vue'), 'utf8')

function chuangJianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: 主页内容 },
      { path: '/login', name: 'dengLu', component: 登录内容 },
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

async function mountDengLuNeiRong(moShi: 'dengLu' | 'zhuCe' = 'dengLu') {
  const luYou = chuangJianLuYou()
  const pinia = createPinia()
  setActivePinia(pinia)
  const biaoDanCangKu = 使用认证表单仓库()
  biaoDanCangKu.moShi = moShi

  const wrapper = mount(登录内容, {
    global: {
      plugins: [pinia, luYou],
    },
    attachTo: document.body,
  })
  await luYou.isReady()
  await flushPromises()
  return { wrapper, luYou }
}

async function mountZhuYeNeiRong() {
  const huiFuTuPianJiaZai = pingBiTuPianJiaZai()
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
  return { wrapper, luYou, huiFuTuPianJiaZai }
}

describe('FP-01 仅限16岁标识已删除', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetAllMocks()
  })

  it('翻译文件无 renZheng.shiLingTiShi 键', () => {
    expect('shiLingTiShi' in fanYi.renZheng).toBe(false)
  })

  it('主页与登录源码无适龄标识引用与样式', () => {
    for (const yuanMa of [zhuYeYuanMa, dengLuYuanMa]) {
      expect(yuanMa).not.toContain('shiLingTiShi')
      expect(yuanMa).not.toContain('shi-ling-biao-shi')
      expect(yuanMa).not.toContain('仅限16岁及以上用户')
    }
  })

  it('登录页渲染无适龄标识元素', async () => {
    for (const moShi of ['dengLu', 'zhuCe'] as const) {
      const { wrapper } = await mountDengLuNeiRong(moShi)
      expect(wrapper.find('.shi-ling-biao-shi').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('仅限16岁及以上用户')
      wrapper.unmount()
    }
  })

  it('主页渲染无适龄标识元素', async () => {
    const { wrapper, huiFuTuPianJiaZai } = await mountZhuYeNeiRong()
    expect(wrapper.find('.shi-ling-biao-shi').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('仅限16岁及以上用户')
    if (huiFuTuPianJiaZai) huiFuTuPianJiaZai()
  })

  it('未成年注册拦截键保留（与删除的展示标识无关）', async () => {
    const { huoQuFanYi } = await import('@/config/translations')
    expect(huoQuFanYi('renZheng', 'weiChengNianRenJinZhi')).toContain('18周岁')
  })
})
