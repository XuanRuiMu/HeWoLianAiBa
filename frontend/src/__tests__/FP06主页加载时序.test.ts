import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import 登录内容 from '@/views/登录内容.vue'
import 认证布局 from '@/layouts/认证布局.vue'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { 使用用户仓库 } from '@/stores/用户'

/**
 * FP-06：登录折叠/飞走退场动画完成后，主页元素才允许加载。
 * 判据：提交成功→定格层在位期间「主页阴影」不得出现；两段动画（900+800ms）跑完后主页出现、定格层清零、
 * 动画集合回落基线；减动效档不建层、不等待，主页立即随导航出现。
 */

vi.mock('@/api/认证', () => ({
  faSongMa: vi.fn(),
  jianChaShouJiHao: vi.fn(),
  dengLu: vi.fn(),
  zhuCe: vi.fn(),
}))
vi.mock('@/api/请求', () => ({
  huoQuCuoWuXiangYing: vi.fn((cuoWu: unknown) => (cuoWu as { response?: unknown }).response),
}))

function 装减动效桩(匹配: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    (查询: string) =>
      ({
        matches: 匹配 && 查询.includes('reduce'),
        media: 查询,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      }) as unknown as MediaQueryList,
  )
}

interface 影动画 {
  目标: Element
  时长: number
  已注销: boolean
  finished: Promise<unknown>
  cancel(): void
}

const 动画册: 影动画[] = []

function 装动画桩(): void {
  动画册.length = 0
  const 动画方法 = function (
    this: Element,
    _帧列表: Keyframe[] | Keyframe,
    选项: number | KeyframeAnimationOptions,
  ): unknown {
    const 时长 =
      typeof 选项 === 'number' ? 选项 : ((选项 as KeyframeAnimationOptions).duration ?? 0) as number
    const 影: 影动画 = {
      目标: this,
      时长,
      已注销: false,
      finished: Promise.resolve(),
      cancel() {
        影.已注销 = true
      },
    }
    影.finished = new Promise<影动画>((解决) => {
      setTimeout(() => {
        if (!影.已注销) 解决(影)
      }, 时长)
    })
    动画册.push(影)
    return 影
  }
  Object.defineProperty(Element.prototype, 'animate', {
    value: 动画方法,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(document, 'getAnimations', {
    value: () => 动画册.filter((影) => !影.已注销),
    configurable: true,
    writable: true,
  })
}

function 拆动画桩(): void {
  delete (Element.prototype as unknown as { animate?: unknown }).animate
  delete (document as unknown as { getAnimations?: unknown }).getAnimations
}

interface 盒 {
  left: number
  top: number
  width: number
  height: number
}
const 矩形表 = new WeakMap<Element, 盒>()
const 原始矩形 = Element.prototype.getBoundingClientRect

function 成盒(盒值: 盒): DOMRect {
  return {
    ...盒值,
    right: 盒值.left + 盒值.width,
    bottom: 盒值.top + 盒值.height,
    x: 盒值.left,
    y: 盒值.top,
    toJSON: () => ({}),
  } as unknown as DOMRect
}

function 装几何桩(): void {
  Element.prototype.getBoundingClientRect = function (this: Element): DOMRect {
    const 记录 = 矩形表.get(this)
    if (记录) return 成盒(记录)
    const 样式 = (this as HTMLElement).style
    const 宽 = 样式.getPropertyValue('--dingge-kuan')
    const 高 = 样式.getPropertyValue('--dingge-gao')
    if (宽 && 高) {
      return 成盒({
        left: Number.parseFloat(样式.getPropertyValue('--dingge-zuo')),
        top: Number.parseFloat(样式.getPropertyValue('--dingge-shang')),
        width: Number.parseFloat(宽),
        height: Number.parseFloat(高),
      })
    }
    return 原始矩形.call(this)
  }
}

function 拆几何桩(): void {
  Element.prototype.getBoundingClientRect = 原始矩形
}

async function 建场景(): Promise<{ wrapper: VueWrapper; router: Router }> {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/',
        component: 认证布局,
        children: [
          {
            path: '',
            name: 'zhuJieMian',
            component: { template: '<div class="zhu-ye">主页</div>' },
            meta: { xuYaoDengLu: true },
          },
          {
            path: 'login',
            name: 'dengLu',
            component: 登录内容,
            meta: { xuYaoDengLu: false },
          },
          {
            path: 'forgot-password',
            name: 'wangJiMiMa',
            component: { template: '<div>找回密码</div>' },
            meta: { xuYaoDengLu: false },
          },
        ],
      },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.push('/login')
  const wrapper = mount({ template: '<router-view/>' }, {
    attachTo: document.body,
    global: { plugins: [pinia, router] },
  })
  await router.isReady()
  await flushPromises()
  const 用户仓库 = 使用用户仓库()
  用户仓库.zhiXingDengLu = vi.fn(async () => {
    用户仓库.认证状态 = '已认证'
  })
  return { wrapper, router }
}

function 定格层(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.biaodan-rongqi.juan-zhou-dingge')
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.resetAllMocks()
  vi.useFakeTimers()
  装减动效桩(false)
  装动画桩()
  装几何桩()
})

afterEach(() => {
  document.body.innerHTML = ''
  拆几何桩()
  拆动画桩()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('FP-06：退场动画完成后才加载主页元素', () => {
  it('登录成功→收束→飞行期间主页不渲染；两段动画结束后主页才挂载、定格层清零、集合回基线', async () => {
    const { wrapper } = await 建场景()
    const 卡 = wrapper.find('.biaodan-rongqi').element
    矩形表.set(卡, { left: 120, top: 90, width: 400, height: 520 })
    const 用户位 = document.createElement('div')
    用户位.className = 'yonghu-xuanxiang'
    document.body.appendChild(用户位)
    矩形表.set(用户位, { left: 16, top: 20, width: 132, height: 44 })

    await wrapper.find('#denglu-shoujihao').setValue('13800000000')
    await wrapper.find('#denglu-mima').setValue('miMa123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(定格层(), '未建定格快照层').not.toBeNull()
    expect(wrapper.find('.zhu-ye').exists(), '退场动画期间主页已渲染').toBe(false)
    expect(使用用户仓库().mingChengKeJian).toBe(false)

    await vi.advanceTimersByTimeAsync(900)
    await flushPromises()
    expect(wrapper.find('.zhu-ye').exists(), '收束段主页已渲染').toBe(false)
    expect(定格层(), '收束结束后定格层被提前摘除').not.toBeNull()

    await vi.advanceTimersByTimeAsync(800)
    await flushPromises()
    expect(wrapper.find('.zhu-ye').exists(), '飞行结束后主页仍未挂载').toBe(true)
    expect(定格层(), '飞行结束后定格层未移除').toBeNull()
    expect(document.getAnimations(), '动画集合未回到基线').toEqual([])
    expect(使用用户仓库().mingChengKeJian).toBe(true)
    wrapper.unmount()
  })

  it('减动效档：不建层、不延迟，主页随导航立即出现且无遗留动画', async () => {
    装减动效桩(true)
    const { wrapper } = await 建场景()
    const 用户位 = document.createElement('div')
    用户位.className = 'yonghu-xuanxiang'
    document.body.appendChild(用户位)
    矩形表.set(用户位, { left: 16, top: 20, width: 132, height: 44 })

    await wrapper.find('#denglu-shoujihao').setValue('13800000000')
    await wrapper.find('#denglu-mima').setValue('miMa123456')
    await wrapper.find('form').trigger('submit')
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()

    expect(定格层(), '减动效档仍建了定格层').toBeNull()
    expect(document.getAnimations()).toEqual([])
    expect(wrapper.find('.zhu-ye').exists(), '减动效档主页被错误延迟').toBe(true)
    wrapper.unmount()
  })
})
