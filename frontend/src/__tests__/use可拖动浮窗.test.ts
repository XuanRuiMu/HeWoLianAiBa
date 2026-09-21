import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { use可拖动浮窗 } from '@/composables/use可拖动浮窗'

interface 宿主选项 {
  存储键?: string
  横向停靠?: 'zuo' | 'you'
  停靠边距?: number
  最小宽?: number
  最小高?: number
  默认宽?: number
  默认高占比?: number
  标题栏高?: number
  可缩放?: boolean
  支持最小化?: boolean
}

type 浮窗返回值 = ReturnType<typeof use可拖动浮窗>

function 挂载浮窗(覆盖: 宿主选项 = {}) {
  let 暴露!: 浮窗返回值
  const 宿主 = defineComponent({
    setup() {
      const 元素: Ref<HTMLElement | null> = ref(null)
      暴露 = use可拖动浮窗({
        元素,
        存储键: 覆盖.存储键 ?? 'ce-shi:fu-chuang',
        横向停靠: 覆盖.横向停靠,
        停靠边距: 覆盖.停靠边距,
        最小宽: 覆盖.最小宽,
        最小高: 覆盖.最小高,
        默认宽: 覆盖.默认宽,
        默认高占比: 覆盖.默认高占比,
        标题栏高: 覆盖.标题栏高,
        可缩放: 覆盖.可缩放,
        支持最小化: 覆盖.支持最小化,
      })
      return () =>
        h('div', { ref: 元素, style: 暴露.浮窗样式.value, class: 'fu-chuang' }, [
          h('header', { class: 'biaoti-lan', onPointerdown: 暴露.开始拖动 }, [
            h('button', { class: 'an' }, 'an'),
          ]),
        ])
    },
  })
  const wrapper = mount(宿主)
  return { wrapper, 取浮窗: () => 暴露 }
}

function 视觉视口(宽: number, 高: number) {
  const 监听 = new Map<string, Set<() => void>>()
  const 假 = {
    width: 宽,
    height: 高,
    addEventListener(类型: string, cb: EventListenerOrEventListenerObject) {
      if (!监听.has(类型)) 监听.set(类型, new Set())
      监听.get(类型)!.add(cb as () => void)
    },
    removeEventListener(类型: string, cb: EventListenerOrEventListenerObject) {
      监听.get(类型)?.delete(cb as () => void)
    },
    派发(类型: string) {
      监听.get(类型)?.forEach((cb) => cb())
    },
    监听数(类型: string) {
      return 监听.get(类型)?.size ?? 0
    },
  }
  Object.defineProperty(window, 'visualViewport', { value: 假, configurable: true })
  return 假
}

function 指针(类型: string, x?: number, y?: number): MouseEvent {
  return new MouseEvent(类型, { clientX: x, clientY: y, bubbles: true, cancelable: true })
}

async function 拖动(wrapper: VueWrapper, 起点: [number, number], 终点: [number, number]) {
  wrapper.find('.biaoti-lan').element.dispatchEvent(指针('pointerdown', 起点[0], 起点[1]))
  window.dispatchEvent(指针('pointermove', 终点[0], 终点[1]))
  await nextTick()
}

describe('use可拖动浮窗', () => {
  beforeEach(() => {
    localStorage.clear()
    视觉视口(1024, 768)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('默认尺寸按 px 下发，不使用不可插值的 auto 与视口单位', () => {
    const { wrapper, 取浮窗 } = 挂载浮窗()
    const 样式 = 取浮窗().浮窗样式.value
    expect(样式.width).toBe('420px')
    expect(样式.height).toBe('422px')
    expect(样式.height).not.toContain('auto')
    expect(样式.height).not.toMatch(/vh|vw|%/)
    expect(样式['--fu-chuang-biaoti-lan-gao']).toBe('44px')
    expect(样式['--fu-chuang-ting-kao-bian-jv']).toBe('24px')
    expect(取浮窗().内容区样式.value.height).toBe('378px')
    wrapper.unmount()
  })

  it('默认高随 visualViewport 变化重算，缩放过后不再跟随', async () => {
    const vv = 视觉视口(1024, 600)
    const { wrapper, 取浮窗 } = 挂载浮窗()
    expect(取浮窗().浮窗样式.value.height).toBe('330px')
    vv.height = 400
    vv.派发('resize')
    await nextTick()
    expect(取浮窗().浮窗样式.value.height).toBe('220px')
    取浮窗().开始缩放(指针('pointerdown', 500, 500), 'xia')
    window.dispatchEvent(指针('pointermove', 500, 560))
    await nextTick()
    window.dispatchEvent(指针('pointerup', 500, 560))
    await nextTick()
    vv.height = 700
    vv.派发('resize')
    await nextTick()
    expect(取浮窗().浮窗样式.value.height).toBe('280px')
    wrapper.unmount()
  })

  it('右停靠：四方向拖到屏外均被钳回完整可见', async () => {
    const { wrapper, 取浮窗 } = 挂载浮窗()
    await 拖动(wrapper, [300, 300], [9000, 9000])
    expect(取浮窗().位移.value).toEqual({ x: 24, y: 24 })
    await 拖动(wrapper, [300, 300], [-9000, -9000])
    expect(取浮窗().位移.value).toEqual({ x: 420 + 24 - 1024, y: 422 + 24 - 768 })
    await 拖动(wrapper, [300, 300], [-9000, 9000])
    expect(取浮窗().位移.value).toEqual({ x: 420 + 24 - 1024, y: 24 })
    await 拖动(wrapper, [300, 300], [9000, -9000])
    expect(取浮窗().位移.value).toEqual({ x: 24, y: 422 + 24 - 768 })
    wrapper.unmount()
  })

  it('左停靠：位移区间按左缘停靠反向钳制', async () => {
    const { wrapper, 取浮窗 } = 挂载浮窗({ 横向停靠: 'zuo' })
    await 拖动(wrapper, [300, 300], [9000, 9000])
    expect(取浮窗().位移.value.x).toBe(1024 - 24 - 420)
    await 拖动(wrapper, [300, 300], [-9000, -9000])
    expect(取浮窗().位移.value.x).toBe(-24)
    expect(取浮窗().位移.value.y).toBe(422 + 24 - 768)
    wrapper.unmount()
  })

  it('未超阈值的按下不进入拖动，标题栏按钮按下不启动拖动', async () => {
    const { wrapper, 取浮窗 } = 挂载浮窗()
    wrapper.find('.biaoti-lan').element.dispatchEvent(指针('pointerdown', 300, 300))
    window.dispatchEvent(指针('pointermove', 302, 302))
    await nextTick()
    expect(取浮窗().拖动中.value).toBe(false)
    expect(取浮窗().位移.value).toEqual({ x: 0, y: 0 })
    window.dispatchEvent(指针('pointerup', 302, 302))
    wrapper.find('.an').element.dispatchEvent(指针('pointerdown', 300, 300))
    window.dispatchEvent(指针('pointermove', 900, 900))
    await nextTick()
    expect(取浮窗().拖动中.value).toBe(false)
    window.dispatchEvent(指针('pointerup', 900, 900))
    wrapper.unmount()
  })

  it('pointercancel 与 pointerup 同样结束拖动并解绑移动监听', async () => {
    const { wrapper, 取浮窗 } = 挂载浮窗()
    await 拖动(wrapper, [300, 300], [360, 360])
    expect(取浮窗().拖动中.value).toBe(true)
    window.dispatchEvent(指针('pointercancel', 360, 360))
    await nextTick()
    expect(取浮窗().拖动中.value).toBe(false)
    const 前 = 取浮窗().位移.value
    window.dispatchEvent(指针('pointermove', 900, 900))
    await nextTick()
    expect(取浮窗().位移.value).toEqual(前)
    wrapper.unmount()
  })

  it('缩放期间内联禁用 transition，结束后恢复动画并持久化', async () => {
    const { wrapper, 取浮窗 } = 挂载浮窗()
    取浮窗().开始缩放(指针('pointerdown', 500, 500), 'youXia')
    window.dispatchEvent(指针('pointermove', 600, 560))
    await nextTick()
    let 样式 = 取浮窗().浮窗样式.value
    expect(样式.width).toBe('520px')
    expect(样式.height).toBe('482px')
    expect(样式.transition).toBe('none')
    window.dispatchEvent(指针('pointerup', 600, 560))
    await nextTick()
    样式 = 取浮窗().浮窗样式.value
    expect(样式.transition).toBeUndefined()
    expect(取浮窗().缩放中.value).toBe(false)
    const 存 = JSON.parse(localStorage.getItem('ce-shi:fu-chuang') as string)
    expect(存.宽).toBe(520)
    expect(存.高).toBe(482)
    wrapper.unmount()
  })

  it('单向手柄只改单向尺寸，且钳到最小尺寸', async () => {
    const { wrapper, 取浮窗 } = 挂载浮窗()
    取浮窗().开始缩放(指针('pointerdown', 500, 500), 'you')
    window.dispatchEvent(指针('pointermove', 560, 999))
    await nextTick()
    expect(取浮窗().浮窗样式.value.width).toBe('480px')
    expect(取浮窗().浮窗样式.value.height).toBe('422px')
    window.dispatchEvent(指针('pointerup', 560, 999))
    取浮窗().开始缩放(指针('pointerdown', 500, 500), 'xia')
    window.dispatchEvent(指针('pointermove', 111, 460))
    await nextTick()
    expect(取浮窗().浮窗样式.value.width).toBe('480px')
    expect(取浮窗().浮窗样式.value.height).toBe('382px')
    window.dispatchEvent(指针('pointerup', 111, 460))
    取浮窗().开始缩放(指针('pointerdown', 500, 500), 'youXia')
    window.dispatchEvent(指针('pointermove', -9000, -9000))
    await nextTick()
    expect(取浮窗().浮窗样式.value.width).toBe('280px')
    expect(取浮窗().浮窗样式.value.height).toBe('200px')
    window.dispatchEvent(指针('pointerup', -9000, -9000))
    wrapper.unmount()
  })

  it('最小化只把高度落到标题栏 px，宽度与内容区高度恒定不重排', async () => {
    const { wrapper, 取浮窗 } = 挂载浮窗({ 标题栏高: 56 })
    const 展开高 = 取浮窗().浮窗样式.value.height
    const 展开宽 = 取浮窗().浮窗样式.value.width
    const 内容高 = 取浮窗().内容区样式.value.height
    取浮窗().切换最小化()
    await nextTick()
    const 样式 = 取浮窗().浮窗样式.value
    expect(样式.height).toBe('56px')
    expect(样式.height).not.toBe(展开高)
    expect(样式.width).toBe(展开宽)
    expect(取浮窗().内容区样式.value.height).toBe(内容高)
    取浮窗().切换最小化()
    await nextTick()
    expect(取浮窗().浮窗样式.value.height).toBe(展开高)
    wrapper.unmount()
  })

  it('不支持最小化时切换最小化无效', () => {
    const { wrapper, 取浮窗 } = 挂载浮窗({ 支持最小化: false })
    取浮窗().切换最小化()
    expect(取浮窗().最小化.value).toBe(false)
    wrapper.unmount()
  })

  it('尺寸突变后重新钳制位移：最小化拖到顶再展开不飞屏', async () => {
    const { wrapper, 取浮窗 } = 挂载浮窗({ 标题栏高: 56 })
    取浮窗().切换最小化()
    await nextTick()
    await 拖动(wrapper, [300, 300], [-9000, -9000])
    expect(取浮窗().位移.value.y).toBe(56 + 24 - 768)
    取浮窗().切换最小化()
    await nextTick()
    expect(取浮窗().位移.value.y).toBe(422 + 24 - 768)
    wrapper.unmount()
  })

  it('视口收窄时重新钳制位移与尺寸，浮窗永不越出视口', async () => {
    const vv = 视觉视口(1024, 768)
    const { wrapper, 取浮窗 } = 挂载浮窗()
    await 拖动(wrapper, [300, 300], [-9000, -9000])
    expect(取浮窗().位移.value.y).toBe(422 + 24 - 768)
    vv.width = 400
    vv.height = 500
    vv.派发('resize')
    await nextTick()
    expect(取浮窗().当前宽.value).toBeLessThanOrEqual(400 - 48)
    expect(取浮窗().浮窗样式.value.width).toBe(`${取浮窗().当前宽.value}px`)
    expect(取浮窗().位移.value.y).toBe(取浮窗().当前高.value + 24 - 500)
    wrapper.unmount()
  })

  it('卸载时解绑拖动/缩放/视口全部监听', () => {
    const vv = 视觉视口(1024, 768)
    const { wrapper } = 挂载浮窗()
    const 移除 = vi.spyOn(window, 'removeEventListener')
    wrapper.unmount()
    const 已移除 = new Set(移除.mock.calls.map((调用) => 调用[0]))
    for (const 类型 of ['pointermove', 'pointerup', 'pointercancel', 'resize']) {
      expect(已移除.has(类型), `未解绑 ${类型}`).toBe(true)
    }
    expect(vv.监听数('resize')).toBe(0)
    expect(vv.监听数('scroll')).toBe(0)
  })

  it('重新挂载后回读位置/尺寸/最小化偏好', async () => {
    const 首次 = 挂载浮窗()
    首次.取浮窗().开始缩放(指针('pointerdown', 500, 500), 'youXia')
    window.dispatchEvent(指针('pointermove', 560, 540))
    await nextTick()
    window.dispatchEvent(指针('pointerup', 560, 540))
    await 拖动(首次.wrapper, [300, 300], [260, 250])
    首次.取浮窗().切换最小化()
    await nextTick()
    首次.wrapper.unmount()

    const 再次 = 挂载浮窗()
    expect(再次.取浮窗().浮窗样式.value.width).toBe('480px')
    expect(再次.取浮窗().浮窗样式.value.height).toBe('44px')
    expect(再次.取浮窗().最小化.value).toBe(true)
    expect(再次.取浮窗().位移.value).toEqual({ x: -40, y: -50 })
    再次.wrapper.unmount()
  })

  it('偏好损坏时回落默认值且不抛错', () => {
    localStorage.setItem('ce-shi:fu-chuang', '{不是JSON')
    const { wrapper, 取浮窗 } = 挂载浮窗()
    expect(取浮窗().浮窗样式.value.width).toBe('420px')
    expect(取浮窗().位移.value).toEqual({ x: 0, y: 0 })
    wrapper.unmount()
  })

  it('回读越界偏好时按视口钳制，不存在拖出屏外找不回的状态', () => {
    localStorage.setItem('ce-shi:fu-chuang', JSON.stringify({ x: -99999, y: -99999 }))
    const { wrapper, 取浮窗 } = 挂载浮窗()
    expect(取浮窗().位移.value).toEqual({ x: 420 + 24 - 1024, y: 422 + 24 - 768 })
    wrapper.unmount()
  })

  it('回读最小化偏好时按标题栏高钳制位移，不用展开高误钳', () => {
    localStorage.setItem(
      'ce-shi:fu-chuang',
      JSON.stringify({ x: 0, y: -600, 宽: null, 高: null, 最小化: true }),
    )
    const { wrapper, 取浮窗 } = 挂载浮窗({ 标题栏高: 56 })
    // 展开高 422 的下界是 422+24-768=-322，会把 -600 拉回；最小化态下界应为 56+24-768=-688
    expect(取浮窗().最小化.value).toBe(true)
    expect(取浮窗().位移.value.y).toBe(-600)
    wrapper.unmount()
  })

  it('pointercancel 结束缩放：撤销 transition 覆盖并停止改尺寸', async () => {
    const { wrapper, 取浮窗 } = 挂载浮窗()
    取浮窗().开始缩放(指针('pointerdown', 500, 500), 'youXia')
    window.dispatchEvent(指针('pointermove', 600, 560))
    await nextTick()
    expect(取浮窗().浮窗样式.value.transition).toBe('none')
    const 已缩放宽 = 取浮窗().浮窗样式.value.width
    window.dispatchEvent(指针('pointercancel', 600, 560))
    await nextTick()
    expect(取浮窗().缩放中.value).toBe(false)
    expect(取浮窗().浮窗样式.value.transition).toBeUndefined()
    window.dispatchEvent(指针('pointermove', 900, 900))
    await nextTick()
    expect(取浮窗().浮窗样式.value.width).toBe(已缩放宽)
    wrapper.unmount()
  })

  it('拖动中途卸载即解绑移动监听：位移冻结且不再写偏好', async () => {
    const { wrapper, 取浮窗 } = 挂载浮窗()
    wrapper.find('.biaoti-lan').element.dispatchEvent(指针('pointerdown', 300, 300))
    window.dispatchEvent(指针('pointermove', 200, 200))
    await nextTick()
    const 卸载前 = { ...取浮窗().位移.value }
    expect(卸载前).toEqual({ x: -100, y: -100 })
    wrapper.unmount()
    localStorage.clear()
    window.dispatchEvent(指针('pointermove', 900, 900))
    await nextTick()
    expect(取浮窗().位移.value).toEqual(卸载前)
    expect(localStorage.getItem('ce-shi:fu-chuang')).toBeNull()
  })

  it('关闭缩放通道时手柄按下不改尺寸', async () => {
    const { wrapper, 取浮窗 } = 挂载浮窗({ 可缩放: false })
    const 前 = 取浮窗().浮窗样式.value
    取浮窗().开始缩放(指针('pointerdown', 500, 500), 'youXia')
    window.dispatchEvent(指针('pointermove', 900, 900))
    await nextTick()
    expect(取浮窗().浮窗样式.value.width).toBe(前.width)
    expect(取浮窗().缩放中.value).toBe(false)
    window.dispatchEvent(指针('pointerup', 900, 900))
    wrapper.unmount()
  })
})
