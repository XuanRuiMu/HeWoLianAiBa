import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DuanWangHengFu from '@/components/断网横幅.vue'

describe('DuanWangHengFu 断网横幅组件', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('在线时不显示横幅', () => {
    const wrapper = mount(DuanWangHengFu)
    expect(wrapper.find('.duan-wang-heng-fu').exists()).toBe(false)
  })

  it('监听 offline 事件显示横幅', async () => {
    const wrapper = mount(DuanWangHengFu)
    expect(wrapper.find('.duan-wang-heng-fu').exists()).toBe(false)

    window.dispatchEvent(new Event('offline'))
    await nextTick()

    expect(wrapper.find('.duan-wang-heng-fu').exists()).toBe(true)
    expect(wrapper.text()).toContain('网络已断开')
  })

  it('监听 online 事件隐藏横幅', async () => {
    const wrapper = mount(DuanWangHengFu)

    window.dispatchEvent(new Event('offline'))
    await nextTick()
    expect(wrapper.find('.duan-wang-heng-fu').exists()).toBe(true)

    window.dispatchEvent(new Event('online'))
    await nextTick()

    expect(wrapper.find('.duan-wang-heng-fu').exists()).toBe(false)
  })

  it('恢复在线后自动消失', async () => {
    const wrapper = mount(DuanWangHengFu)

    window.dispatchEvent(new Event('offline'))
    await nextTick()
    expect(wrapper.find('.duan-wang-heng-fu').exists()).toBe(true)

    window.dispatchEvent(new Event('online'))
    await nextTick()

    expect(wrapper.find('.duan-wang-heng-fu').exists()).toBe(false)
  })

  it('点击关闭按钮隐藏横幅', async () => {
    const wrapper = mount(DuanWangHengFu)

    window.dispatchEvent(new Event('offline'))
    await nextTick()
    expect(wrapper.find('.duan-wang-heng-fu').exists()).toBe(true)

    await wrapper.find('.duan-wang-guan-bi').trigger('click')
    expect(wrapper.find('.duan-wang-heng-fu').exists()).toBe(false)
  })

  it('包含无障碍属性', async () => {
    const wrapper = mount(DuanWangHengFu)

    window.dispatchEvent(new Event('offline'))
    await nextTick()

    const banner = wrapper.find('.duan-wang-heng-fu')
    expect(banner.attributes('role')).toBe('alert')
    expect(banner.attributes('aria-live')).toBe('polite')
  })

  it('关闭按钮包含 aria-label', async () => {
    const wrapper = mount(DuanWangHengFu)

    window.dispatchEvent(new Event('offline'))
    await nextTick()

    const closeBtn = wrapper.find('.duan-wang-guan-bi')
    expect(closeBtn.attributes('aria-label')).toBe('关闭')
  })

  interface DuanWangHengFuVM {
    xianShiDuanWang: () => void
    yinCangDuanWang: () => void
  }

  it('暴露 xianShiDuanWang 和 yinCangDuanWang 方法供测试', () => {
    const wrapper = mount(DuanWangHengFu)
    const vm = wrapper.vm as DuanWangHengFuVM

    expect(typeof vm.xianShiDuanWang).toBe('function')
    expect(typeof vm.yinCangDuanWang).toBe('function')
  })
})
