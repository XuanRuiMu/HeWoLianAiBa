import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import 通用菜单 from '@/components/通用菜单.vue'

describe('通用菜单异步打开清理', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (回调: FrameRequestCallback) =>
      window.setTimeout(() => 回调(0), 0),
    )
    vi.stubGlobal('cancelAnimationFrame', (标识: number) => window.clearTimeout(标识))
  })

  afterEach(() => {
    document.body.replaceChildren()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function 挂载菜单() {
    const 添加监听 = vi.spyOn(window, 'addEventListener')
    const 移除监听 = vi.spyOn(window, 'removeEventListener')
    const 壳 = mount(通用菜单, {
      attachTo: document.body,
      props: {
        moShi: 'quanJu',
        moXingZhi: 'yi',
        xuanXiang: [
          { zhi: 'yi', wenZi: '选项一' },
          { zhi: 'er', wenZi: '选项二' },
        ],
      },
    })
    const 监听数量 = (类型: string): number => {
      const 已添加 = new Set(
        添加监听.mock.calls.filter(([名称]) => 名称 === 类型).map(([, 回调]) => 回调),
      )
      return (
        已添加.size -
        移除监听.mock.calls.filter(([名称, 回调]) => 名称 === 类型 && 已添加.has(回调)).length
      )
    }
    return { 壳, 监听数量 }
  }

  it('打开途中关闭后不重新注册跟踪监听或产生帧', async () => {
    const { 壳, 监听数量 } = 挂载菜单()
    try {
      const 触发器 = 壳.get('button').element as HTMLButtonElement
      触发器.click()
      触发器.click()
      await nextTick()
      await nextTick()
      expect(触发器.getAttribute('aria-expanded')).toBe('false')
      expect(监听数量('scroll')).toBe(0)
      expect(监听数量('resize')).toBe(0)
      await vi.advanceTimersByTimeAsync(200)
      window.dispatchEvent(new Event('resize'))
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      壳.unmount()
    }
  })

  it('打开途中卸载后不重新注册跟踪监听或产生帧', async () => {
    const { 壳, 监听数量 } = 挂载菜单()
    const 触发器 = 壳.get('button').element as HTMLButtonElement
    触发器.click()
    壳.unmount()
    await nextTick()
    await nextTick()
    expect(监听数量('scroll')).toBe(0)
    expect(监听数量('resize')).toBe(0)
    window.dispatchEvent(new Event('resize'))
    expect(vi.getTimerCount()).toBe(0)
  })
})
