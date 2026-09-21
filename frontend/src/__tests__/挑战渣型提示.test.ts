import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 挑战渣型提示 from '@/components/挑战渣型提示.vue'
import { huoQuFanYi } from '@/config/translations'

function chuangJianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div>主页</div>' } }],
  })
}

describe('挑战渣型提示组件', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('渲染渣型概率提示文案', () => {
    const wrapper = mount(挑战渣型提示, {
      props: { zhaXingGaiLv: 0.3 },
      global: { plugins: [createPinia(), chuangJianLuYou()] },
    })

    expect(wrapper.find('.zha-xing-ti-shi').exists()).toBe(true)
    const qiWangWenZi = huoQuFanYi('tiaoZhan', 'zhaXingGaiLvTiShi').replace('{probability}', '30')
    expect(wrapper.text()).toContain(qiWangWenZi)
  })

  it('不同概率值正确显示百分比', () => {
    const wrapper = mount(挑战渣型提示, {
      props: { zhaXingGaiLv: 0.5 },
      global: { plugins: [createPinia(), chuangJianLuYou()] },
    })

    const qiWangWenZi = huoQuFanYi('tiaoZhan', 'zhaXingGaiLvTiShi').replace('{probability}', '50')
    expect(wrapper.text()).toContain(qiWangWenZi)
  })

  it('概率为 0 时不渲染组件', () => {
    const wrapper = mount(挑战渣型提示, {
      props: { zhaXingGaiLv: 0 },
      global: { plugins: [createPinia(), chuangJianLuYou()] },
    })

    expect(wrapper.find('.zha-xing-ti-shi').exists()).toBe(false)
  })

  it('概率值正确四舍五入', () => {
    const wrapper = mount(挑战渣型提示, {
      props: { zhaXingGaiLv: 0.333 },
      global: { plugins: [createPinia(), chuangJianLuYou()] },
    })

    const qiWangWenZi = huoQuFanYi('tiaoZhan', 'zhaXingGaiLvTiShi').replace('{probability}', '33')
    expect(wrapper.text()).toContain(qiWangWenZi)
  })
})
