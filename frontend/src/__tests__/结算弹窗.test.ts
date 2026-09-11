import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import JieSuanTanChuang from '@/components/聊天/结算弹窗.vue'

describe('JieSuanTanChuang 结算弹窗组件', () => {
  let vibrateSpy: ReturnType<typeof vi.fn>
  let originalMatchMedia: typeof window.matchMedia
  let originalVibrate: typeof navigator.vibrate

  beforeEach(() => {
    originalMatchMedia = window.matchMedia
    originalVibrate = navigator.vibrate

    // 在 jsdom 中添加 navigator.vibrate
    if (!('vibrate' in navigator)) {
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn().mockReturnValue(true),
        writable: true,
        configurable: true,
      })
    }

    vibrateSpy = vi.spyOn(navigator, 'vibrate').mockImplementation(() => true)

    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    vibrateSpy?.mockRestore()
    window.matchMedia = originalMatchMedia
    if (originalVibrate === undefined) {
       
      delete (navigator as any).vibrate
    } else {
      Object.defineProperty(navigator, 'vibrate', {
        value: originalVibrate,
        writable: true,
        configurable: true,
      })
    }
  })

  it('胜利时显示庆祝图标和标题', () => {
    const wrapper = mount(JieSuanTanChuang, {
      props: {
        youXiShiJianZhanKai: true,
        youXiShiJianLeiXing: 'shengli',
        youXiShiJianNeiRong: '恭喜通关！',
      },
    })
    expect(wrapper.text()).toContain('恭喜通关')
    expect(wrapper.find('.youxi-tubiao').text()).toBe('🎉')
  })

  it('失败时显示失败图标和标题', () => {
    const wrapper = mount(JieSuanTanChuang, {
      props: {
        youXiShiJianZhanKai: true,
        youXiShiJianLeiXing: 'shibai',
        youXiShiJianNeiRong: '这次没成',
      },
    })
    expect(wrapper.text()).toContain('这次没成')
    expect(wrapper.find('.youxi-tubiao').text()).toBe('💔')
  })

  it('胜利打开时调用 navigator.vibrate', async () => {
    const wrapper = mount(JieSuanTanChuang, {
      props: {
        youXiShiJianZhanKai: false,
        youXiShiJianLeiXing: 'shengli',
        youXiShiJianNeiRong: '恭喜通关！',
      },
    })

    await wrapper.setProps({ youXiShiJianZhanKai: true })
    await nextTick()

    expect(vibrateSpy).toHaveBeenCalledWith([100, 50, 100, 50, 200])
  })

  it('失败打开时不调用 navigator.vibrate', async () => {
    const wrapper = mount(JieSuanTanChuang, {
      props: {
        youXiShiJianZhanKai: false,
        youXiShiJianLeiXing: 'shibai',
        youXiShiJianNeiRong: '这次没成',
      },
    })

    await wrapper.setProps({ youXiShiJianZhanKai: true })
    await nextTick()

    expect(vibrateSpy).not.toHaveBeenCalled()
  })

  it('prefers-reduced-motion 为 true 时不渲染彩带', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const wrapper = mount(JieSuanTanChuang, {
      props: {
        youXiShiJianZhanKai: true,
        youXiShiJianLeiXing: 'shengli',
        youXiShiJianNeiRong: '恭喜通关！',
      },
    })

    expect(wrapper.find('.cai-dai').exists()).toBe(false)
  })

  it('prefers-reduced-motion 为 false 时渲染彩带', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const wrapper = mount(JieSuanTanChuang, {
      props: {
        youXiShiJianZhanKai: true,
        youXiShiJianLeiXing: 'shengli',
        youXiShiJianNeiRong: '恭喜通关！',
      },
    })

    expect(wrapper.findAll('.cai-dai').length).toBe(30)
  })

  it('包含返回首页和查看战绩按钮', () => {
    const wrapper = mount(JieSuanTanChuang, {
      props: {
        youXiShiJianZhanKai: true,
        youXiShiJianLeiXing: 'shengli',
        youXiShiJianNeiRong: '恭喜通关！',
      },
    })

    const buttons = wrapper.findAll('.youxi-anniu')
    expect(buttons.length).toBe(2)
    expect(buttons[0].text()).toBe('返回首页')
    expect(buttons[1].text()).toBe('查看战绩')
  })

  it('点击返回首页触发自定义事件', async () => {
    const wrapper = mount(JieSuanTanChuang, {
      props: {
        youXiShiJianZhanKai: true,
        youXiShiJianLeiXing: 'shengli',
        youXiShiJianNeiRong: '恭喜通关！',
      },
    })

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    await wrapper.find('.fanhui').trigger('click')
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: '结算-返回首页',
      }),
    )
  })

  it('点击查看战绩触发自定义事件', async () => {
    const wrapper = mount(JieSuanTanChuang, {
      props: {
        youXiShiJianZhanKai: true,
        youXiShiJianLeiXing: 'shengli',
        youXiShiJianNeiRong: '恭喜通关！',
      },
    })

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    await wrapper.find('.chakan').trigger('click')
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: '结算-查看战绩',
      }),
    )
  })

  it('点击遮罩层关闭弹窗', async () => {
    const wrapper = mount(JieSuanTanChuang, {
      props: {
        youXiShiJianZhanKai: true,
        youXiShiJianLeiXing: 'shengli',
        youXiShiJianNeiRong: '恭喜通关！',
      },
    })

    await wrapper.find('.youxi-zhezhao').trigger('click.self')
    expect(wrapper.emitted('update:youXiShiJianZhanKai')).toBeTruthy()
    expect(wrapper.emitted('update:youXiShiJianZhanKai')?.[0]).toEqual([false])
  })
})
