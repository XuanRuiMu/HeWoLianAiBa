import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
  huoQuCuoWuXiangYing: vi.fn((c: unknown) => (c as { response?: unknown }).response),
}))

const 视图样式 = (() => {
  const 全源 = readFileSync(resolve(__dirname, '../views/登录内容.vue'), 'utf8')
  const 段 = [...全源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((p) => p[1])
  return 段[0].replace(/\/\*[\s\S]*?\*\//g, '')
})()

describe('探针3', () => {
  it('挂载后 computed', async () => {
    const 节 = document.createElement('style')
    节.textContent = 视图样式
    document.head.appendChild(节)
    const 路由 = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
        { path: '/login', name: 'dengLu', component: 登录内容 },
      ],
    })
    setActivePinia(createPinia())
    使用认证表单仓库().moShi = 'dengLu'
    const wrapper = mount(登录内容, { attachTo: document.body, global: { plugins: [路由] } })
    await flushPromises()
    await wrapper.find('#denglu-shoujihao').setValue('138')
    await flushPromises()
    const 输入 = wrapper.find('#denglu-shoujihao').element as HTMLInputElement
    const 组 = 输入.parentElement as HTMLElement
    const 标 = 组.querySelector('.fudong-biaoqian') as HTMLElement
    const 组式 = getComputedStyle(组)
    const 输入式 = getComputedStyle(输入)
    const 标式 = getComputedStyle(标)
    console.log('组 paddingTop=', JSON.stringify(组式.paddingTop), 'marginTop=', JSON.stringify(组式.marginTop))
    console.log('输入 paddingTop=', JSON.stringify(输入式.paddingTop), 'marginTop=', JSON.stringify(输入式.marginTop))
    console.log('标 top=', JSON.stringify(标式.top), 'lineHeight=', JSON.stringify(标式.lineHeight))
    console.log('组 class=', 组.className)
    console.log('样式含 padding-top calc?', 视图样式.includes('padding-top: calc(var(--jiange-zhong)'))
    expect(true).toBe(true)
  })
})
