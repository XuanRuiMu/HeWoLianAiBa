import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { use可拖动浮窗, 缩放方向清单 } from '@/composables/use可拖动浮窗'

interface 宿主选项 {
  存储键?: string
  横向停靠?: 'zuo' | 'you'
  纵向停靠?: 'shang' | 'xia'
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
        纵向停靠: 覆盖.纵向停靠,
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
    // 契约演进（FP-06）：改前该值 280 的成因是「下缘手柄向右下拖 60px」把高度写成 220+60，
    // 而盒子被宿主 right/bottom 钉死后其实是向上扩（需求 #7 的反向表现）。
    // 新契约下被拖动的边最多走到视口边界：视口高 400 时上缘在 156，可扩量只有 400-156=244。
    expect(取浮窗().浮窗样式.value.height).toBe('244px')
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
    // 契约演进（FP-06）：旧期望 520x482 是「右下角钉死 ⇒ 往右下拖只往左/上长」的产物（需求 #7）。
    // 新契约 left/top 为真源、被拖动的边止于视口边界：默认盒 左=580 上=322 ⇒ 宽最多 1024-580、高最多 768-322。
    expect(样式.left).toBe('580px')
    expect(样式.top).toBe('322px')
    expect(样式.width).toBe('444px')
    expect(样式.height).toBe('446px')
    expect(样式.transition).toBe('none')
    window.dispatchEvent(指针('pointerup', 600, 560))
    await nextTick()
    样式 = 取浮窗().浮窗样式.value
    expect(样式.transition).toBeUndefined()
    expect(取浮窗().缩放中.value).toBe(false)
    const 存 = JSON.parse(localStorage.getItem('ce-shi:fu-chuang') as string)
    expect(存.宽).toBe(444)
    expect(存.高).toBe(446)
    wrapper.unmount()
  })

  it('单向手柄只改单向尺寸，且钳到最小尺寸', async () => {
    const { wrapper, 取浮窗 } = 挂载浮窗()
    取浮窗().开始缩放(指针('pointerdown', 500, 500), 'you')
    window.dispatchEvent(指针('pointermove', 560, 999))
    await nextTick()
    // 契约演进（FP-06）：+60 的期望 480 同样来自右下钉盒；新契约下右缘到视口右边界即停（1024-580=444）
    expect(取浮窗().浮窗样式.value.width).toBe('444px')
    expect(取浮窗().浮窗样式.value.height).toBe('422px')
    window.dispatchEvent(指针('pointerup', 560, 999))
    取浮窗().开始缩放(指针('pointerdown', 500, 500), 'xia')
    window.dispatchEvent(指针('pointermove', 111, 460))
    await nextTick()
    expect(取浮窗().浮窗样式.value.width).toBe('444px')
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
    // 契约演进（FP-06）：480/462 为右下钉盒时代的尺寸（见上一用例），新契约下 SE 拖到视口边界为 444/446；
    // 本用例真正把守的是「写出的偏好读回来逐值相同」，与具体数字无关，故随新契约同步数值而不放宽断言
    expect(再次.取浮窗().浮窗样式.value.width).toBe('444px')
    expect(再次.取浮窗().浮窗样式.value.height).toBe('44px')
    expect(再次.取浮窗().最小化.value).toBe(true)
    expect(再次.取浮窗().位移.value).toEqual({ x: -16, y: -26 })
    expect(再次.取浮窗().几何.value).toEqual({ 左: 540, 上: 674, 宽: 444, 高: 44 })
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

  describe('FP-06 几何单一真源', () => {
    function 读盒(样式: Record<string, string>) {
      const 盒 = {
        左: Number.parseFloat(样式.left as string),
        上: Number.parseFloat(样式.top as string),
        宽: Number.parseFloat(样式.width as string),
        高: Number.parseFloat(样式.height as string),
      }
      // 缺 left/top 时 parseFloat 得 NaN，而 Object.is(NaN, NaN) 为真 ⇒ 逐值比较会静默自洽。
      // 这里先判「四项都下发且为有限数」，反证（宿主回退到 right/bottom 钉盒）才会真的红
      if (!Object.values(盒).every(Number.isFinite)) {
        throw new Error(`几何未完整下发 px：${JSON.stringify(样式)}`)
      }
      return 盒
    }

    it('浮窗样式下发完整 left/top/width/height 像素值，不再有 transform', () => {
      const { wrapper, 取浮窗 } = 挂载浮窗()
      const 样式 = 取浮窗().浮窗样式.value
      expect(样式.left).toBe('580px')
      expect(样式.top).toBe('322px')
      expect(样式.width).toBe('420px')
      expect(样式.height).toBe('422px')
      expect(样式.transform).toBeUndefined()
      expect(样式.right).toBeUndefined()
      expect(样式.bottom).toBeUndefined()
      // 首帧停靠仍与改前逐像素同位：改前宿主 right:24/bottom:24 ⇒ 左 = 1024-24-420、上 = 768-24-422
      expect(取浮窗().锚定边.value).toEqual({ 横: 'you', 纵: 'xia' })
      wrapper.unmount()
    })

    it('左/上停靠的宿主首帧同位：left=边距、top=边距', () => {
      const { wrapper, 取浮窗 } = 挂载浮窗({ 横向停靠: 'zuo', 纵向停靠: 'shang' })
      expect(取浮窗().几何.value).toEqual({ 左: 24, 上: 24, 宽: 420, 高: 422 })
      expect(取浮窗().锚定边.value).toEqual({ 横: 'zuo', 纵: 'shang' })
      wrapper.unmount()
    })

    it('缩放方向清单是 8 向唯一真源，无重复无缺项', () => {
      expect(缩放方向清单).toHaveLength(8)
      expect(new Set(缩放方向清单).size).toBe(8)
      expect([...缩放方向清单].sort()).toEqual(
        ['xia', 'you', 'youShang', 'youXia', 'zuo', 'zuoShang', 'zuoXia', 'shang'].sort(),
      )
    })

    // 对侧边为锚：左手柄动左缘（left 变、width 反向变），右手柄动右缘（left 不变、width 变），上下同理。
    // 偏移取 ±20，确保不被视口边界与最小尺寸钳住，钉的是方向而不是量。
    it.each(缩放方向清单)('8 向缩放逐向以手柄对侧边为锚：%s', async (方向) => {
      const 小写 = 方向.toLowerCase()
      const 动左 = 小写.includes('zuo')
      const 动右 = 小写.includes('you')
      const 动上 = 小写.includes('shang')
      const 动下 = 小写.includes('xia')
      for (const 偏移 of [20, -20]) {
        const { wrapper, 取浮窗 } = 挂载浮窗()
        const 前 = 读盒(取浮窗().浮窗样式.value)
        取浮窗().开始缩放(指针('pointerdown', 500, 500), 方向)
        window.dispatchEvent(指针('pointermove', 500 + 偏移, 500 + 偏移))
        await nextTick()
        const 后 = 读盒(取浮窗().浮窗样式.value)
        expect(后.左).toBe(动左 ? 前.左 + 偏移 : 前.左)
        expect(后.上).toBe(动上 ? 前.上 + 偏移 : 前.上)
        expect(后.宽).toBe(动左 ? 前.宽 - 偏移 : 动右 ? 前.宽 + 偏移 : 前.宽)
        expect(后.高).toBe(动上 ? 前.高 - 偏移 : 动下 ? 前.高 + 偏移 : 前.高)
        expect(后.左 + 后.宽).toBe(动右 ? 前.左 + 前.宽 + 偏移 : 前.左 + 前.宽)
        expect(后.上 + 后.高).toBe(动下 ? 前.上 + 前.高 + 偏移 : 前.上 + 前.高)
        window.dispatchEvent(指针('pointerup', 500 + 偏移, 500 + 偏移))
        wrapper.unmount()
      }
    })

    it('PROGRESS 点名三断言：SE 向右 ⇒ left 不变且 width 增；向左 ⇒ width 减；向下 ⇒ top 不变且 height 增', async () => {
      const { wrapper, 取浮窗 } = 挂载浮窗()
      const 起 = 读盒(取浮窗().浮窗样式.value)
      取浮窗().开始缩放(指针('pointerdown', 600, 600), 'youXia')
      window.dispatchEvent(指针('pointermove', 620, 600))
      await nextTick()
      const 向右 = 读盒(取浮窗().浮窗样式.value)
      expect(向右.左).toBe(起.左)
      expect(向右.宽).toBeGreaterThan(起.宽)
      expect(向右.上).toBe(起.上)
      expect(向右.高).toBe(起.高)
      window.dispatchEvent(指针('pointermove', 580, 600))
      await nextTick()
      const 向左 = 读盒(取浮窗().浮窗样式.value)
      expect(向左.左).toBe(起.左)
      expect(向左.宽).toBeLessThan(起.宽)
      window.dispatchEvent(指针('pointermove', 580, 620))
      await nextTick()
      const 向下 = 读盒(取浮窗().浮窗样式.value)
      expect(向下.上).toBe(起.上)
      expect(向下.高).toBe(起.高 + 20)
      expect(向下.宽).toBe(起.宽 - 20)
      window.dispatchEvent(指针('pointerup', 580, 620))
      wrapper.unmount()
    })

    it('左手柄向右拖 ⇒ left 增且 width 减（右下角不动）', async () => {
      const { wrapper, 取浮窗 } = 挂载浮窗()
      const 起 = 读盒(取浮窗().浮窗样式.value)
      取浮窗().开始缩放(指针('pointerdown', 200, 400), 'zuo')
      window.dispatchEvent(指针('pointermove', 240, 400))
      await nextTick()
      const 后 = 读盒(取浮窗().浮窗样式.value)
      expect(后.左).toBe(起.左 + 40)
      expect(后.宽).toBe(起.宽 - 40)
      expect(后.左 + 后.宽).toBe(起.左 + 起.宽)
      expect(后.上).toBe(起.上)
      expect(后.高).toBe(起.高)
      window.dispatchEvent(指针('pointerup', 240, 400))
      wrapper.unmount()
    })

    it('上边缘手柄向下拖 ⇒ top 增且 height 减（下缘不动）', async () => {
      const { wrapper, 取浮窗 } = 挂载浮窗()
      const 起 = 读盒(取浮窗().浮窗样式.value)
      取浮窗().开始缩放(指针('pointerdown', 600, 322), 'shang')
      window.dispatchEvent(指针('pointermove', 600, 362))
      await nextTick()
      const 后 = 读盒(取浮窗().浮窗样式.value)
      expect(后.上).toBe(起.上 + 40)
      expect(后.高).toBe(起.高 - 40)
      expect(后.上 + 后.高).toBe(起.上 + 起.高)
      expect(后.左).toBe(起.左)
      expect(后.宽).toBe(起.宽)
      window.dispatchEvent(指针('pointerup', 600, 362))
      wrapper.unmount()
    })

    it('被拖动的边止于视口边界：左上角全程不动，绝不把盒子整体滑回', async () => {
      const { wrapper, 取浮窗 } = 挂载浮窗()
      取浮窗().开始缩放(指针('pointerdown', 600, 600), 'youXia')
      window.dispatchEvent(指针('pointermove', 9000, 9000))
      await nextTick()
      const 后 = 取浮窗().几何.value
      expect(后.左).toBe(580)
      expect(后.上).toBe(322)
      expect(后.左 + 后.宽).toBe(1024)
      expect(后.上 + 后.高).toBe(768)
      window.dispatchEvent(指针('pointerup', 9000, 9000))
      wrapper.unmount()
    })

    it('实时日志消费形态（左/下停靠 + 不可缩放 + 不支持最小化）行为不回归', async () => {
      const { wrapper, 取浮窗 } = 挂载浮窗({
        存储键: 'shishi-rizhi:fu-chuang',
        横向停靠: 'zuo',
        默认宽: 640,
        默认高占比: 0.46,
        最小宽: 320,
        最小高: 220,
        可缩放: false,
        支持最小化: false,
      })
      // 改前宿主 CSS 为 left:24 / bottom:24 ⇒ 左 = 24、上 = 768-24-round(768*0.46)=391
      expect(取浮窗().几何.value).toEqual({ 左: 24, 上: 391, 宽: 640, 高: 353 })
      const 起 = { ...取浮窗().浮窗样式.value }
      for (const 方向 of 缩放方向清单) 取浮窗().开始缩放(指针('pointerdown', 500, 500), 方向)
      window.dispatchEvent(指针('pointermove', 900, 900))
      await nextTick()
      expect(取浮窗().浮窗样式.value).toEqual(起)
      expect(取浮窗().缩放中.value).toBe(false)
      window.dispatchEvent(指针('pointerup', 900, 900))
      取浮窗().切换最小化()
      expect(取浮窗().最小化.value).toBe(false)
      await 拖动(wrapper, [300, 300], [340, 340])
      // 位移仍被「整盒不得越出视口」钳住：下移 40px 只允许到 边距(24) ⇒ 下缘贴视口底
      expect(取浮窗().几何.value.左).toBe(64)
      expect(取浮窗().几何.value.上).toBe(415)
      expect(取浮窗().几何.value.上 + 取浮窗().几何.value.高).toBe(768)
      wrapper.unmount()
    })

    it('旧版无版本号的锚角偏移偏好按迁移读回，且钳回可视区不甩出屏外', () => {
      // 改前持久化的是「相对右下锚角的偏移」，与新的绝对 left/top 不可混读
      localStorage.setItem('ce-shi:fu-chuang', JSON.stringify({ x: 24, y: 24 }))
      const { wrapper, 取浮窗 } = 挂载浮窗()
      expect(取浮窗().几何.value).toEqual({ 左: 604, 上: 346, 宽: 420, 高: 422 })
      expect(取浮窗().位移.value).toEqual({ x: 24, y: 24 })
      wrapper.unmount()

      localStorage.setItem(
        'ce-shi:fu-chuang',
        JSON.stringify({ x: -99999, y: -99999, 宽: null, 高: null, 最小化: false }),
      )
      const 再 = 挂载浮窗()
      expect(再.取浮窗().几何.value).toEqual({ 左: 0, 上: 0, 宽: 420, 高: 422 })
      再.wrapper.unmount()
    })

    it('左停靠宿主的旧版偏移按左缘锚点迁移', () => {
      localStorage.setItem('ce-shi:fu-chuang', JSON.stringify({ x: 0, y: -100 }))
      const { wrapper, 取浮窗 } = 挂载浮窗({ 横向停靠: 'zuo' })
      expect(取浮窗().几何.value).toEqual({ 左: 24, 上: 222, 宽: 420, 高: 422 })
      wrapper.unmount()
    })

    it('新写入的偏好带版本号并存的绝对 left/top 原样读回', async () => {
      const 首次 = 挂载浮窗()
      await 拖动(首次.wrapper, [300, 300], [260, 250])
      window.dispatchEvent(指针('pointerup', 260, 250))
      const 存 = JSON.parse(localStorage.getItem('ce-shi:fu-chuang') as string)
      expect(存.版本).toBe(2)
      expect(存.x).toBe(580 - 40)
      expect(存.y).toBe(322 - 50)
      首次.wrapper.unmount()

      const 再次 = 挂载浮窗()
      expect(再次.取浮窗().几何.value).toEqual({ 左: 540, 上: 272, 宽: 420, 高: 422 })
      再次.wrapper.unmount()
    })

    it('手势结束只 cancel 几何通道动画，getAnimations 长度回到基线', async () => {
      const { wrapper, 取浮窗 } = 挂载浮窗()
      const 根 = wrapper.find('.fu-chuang').element as HTMLElement & {
        getAnimations: () => unknown[]
      }
      // jsdom 无 Web Animations API：按浏览器规则（几何属性发生过渡即产出一条 transition）补桩，
      // 被验的是本 composable 手势结束时是否真的清掉自己那四条通道并把长度还原到基线
      let 列表: { transitionProperty: string; animationName?: string; cancel: () => void }[]
      function 装桩(带几何: boolean) {
        const 无关 = { transitionProperty: '', animationName: 'mai-chong', cancel: vi.fn() }
        列表 = 带几何
          ? [
              无关,
              ...['left', 'top', 'width', 'height'].map((属性) => ({
                transitionProperty: 属性,
                cancel: () => {
                  列表 = 列表.filter((项) => 项.transitionProperty !== 属性)
                },
              })),
            ]
          : [无关]
        根.getAnimations = () => 列表
      }

      装桩(false)
      expect(根.getAnimations()).toHaveLength(1)
      装桩(true)
      expect(根.getAnimations()).toHaveLength(5)
      window.dispatchEvent(指针('pointerup', 1, 1))
      expect(根.getAnimations(), '无手势的 pointerup 不该触发动画清理').toHaveLength(5)

      await 拖动(wrapper, [300, 300], [260, 250])
      装桩(true)
      window.dispatchEvent(指针('pointerup', 260, 250))
      await nextTick()
      expect(根.getAnimations()).toHaveLength(1)
      expect(取浮窗().拖动中.value).toBe(false)

      取浮窗().开始缩放(指针('pointerdown', 500, 500), 'youXia')
      window.dispatchEvent(指针('pointermove', 520, 520))
      await nextTick()
      装桩(true)
      window.dispatchEvent(指针('pointerup', 520, 520))
      await nextTick()
      expect(根.getAnimations()).toHaveLength(1)
      expect(取浮窗().缩放中.value).toBe(false)
      wrapper.unmount()
    })
  })
})
