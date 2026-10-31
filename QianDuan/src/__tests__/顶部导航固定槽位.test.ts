import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import 全局菜单 from '@/components/全局菜单.vue'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用聊天仓库 } from '@/stores/聊天'
import { teZhengKaiGuanCuoWu } from '@/utils/TeZhengKaiGuan'
import { chuangJianQianTaiCuoWu } from '@/utils/前台错误'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'

const { 强制刷新当前页面 } = vi.hoisted(() => ({ 强制刷新当前页面: vi.fn() }))

vi.mock('@/utils/页面刷新', () => ({ 强制刷新当前页面 }))

beforeEach(() => {
  强制刷新当前页面.mockClear()
  window.history.replaceState(null, '')
})

const 源码根 = resolve(__dirname, '..')
const 菜单源 = readFileSync(resolve(源码根, 'components/全局菜单.vue'), 'utf8')

function 取样式块(源: string): string {
  return [...源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((匹) => 匹[1])
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

function 取模板块(源: string): string {
  const 匹 = /<template>([\s\S]*)<\/template>/.exec(源)
  if (!匹) throw new Error('全局菜单.vue 缺少 <template> 块')
  return 匹[1]
}

function 声明值(样式: string, 选择器: string, 属性: string): string[] {
  const 出: string[] = []
  for (const 规则 of 样式.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const 命中 = 规则[1]
      .split(',')
      .some((部) => 部.trim().replace(/:hover|:focus-visible/g, '') === 选择器)
    if (!命中) continue
    for (const 声明 of 规则[2].matchAll(/(?:^|;)\s*([a-zA-Z-]+)\s*:\s*([^;]+)/g)) {
      if (声明[1].toLowerCase() === 属性) 出.push(声明[2].trim())
    }
  }
  return 出
}

const 样式 = 取样式块(菜单源)
const 模板 = 取模板块(菜单源)

describe('要求2/7 顶部导航：返回、主页与撤销槽位恒定宽度', () => {
  it('返回/主页/撤销被固定宽度槽位包裹，槽位 flex 不伸缩', () => {
    expect(模板).toMatch(/<div class="caidan-zuo">[\s\S]{0,1200}?<div class="fanhui-cao-wei">/)
    expect(声明值(样式, '.fanhui-cao-wei', 'width')).toEqual(['var(--daohanglan-cao-wei-kuan)'])
    expect(声明值(样式, '.fanhui-cao-wei', 'flex')).toEqual(['none'])
  })

  it('槽位内从左到右依次为返回、主页、撤销，撤销图标为与返回镜像的右箭头', () => {
    const 槽位起点 = 模板.indexOf('<div class="fanhui-cao-wei">')
    const 槽位终点 = 模板.indexOf('ref="yongHuChuFaQi"')
    expect(槽位起点).toBeGreaterThanOrEqual(0)
    expect(槽位终点).toBeGreaterThan(槽位起点)
    const 槽位 = 模板.slice(槽位起点, 槽位终点)
    const 返回位 = 槽位.indexOf('class="fanhui-anniu')
    const 主页位 = 槽位.indexOf('class="zhuye-anniu')
    const 撤销位 = 槽位.indexOf('class="chexiao-anniu')
    expect(返回位).toBeGreaterThanOrEqual(0)
    expect(主页位).toBeGreaterThan(返回位)
    expect(撤销位).toBeGreaterThan(主页位)
    const 撤销块 = 槽位.slice(撤销位, 槽位.indexOf('</button>', 撤销位))
    expect(撤销块).toMatch(/M9 5l7 7-7 7/)
    expect(槽位.slice(返回位, 主页位)).toMatch(/M15 5l-7 7 7 7/)
  })

  it('更多按钮位于最左固定槽位，先于返回槽位与个人信息，浮层按左对齐展开', () => {
    const 左区起点 = 模板.indexOf('<div class="caidan-zuo">')
    const 中区起点 = 模板.indexOf('<div class="caidan-zhong">')
    const 右区起点 = 模板.indexOf('<div class="caidan-you">')
    expect(左区起点).toBeGreaterThanOrEqual(0)
    expect(中区起点).toBeGreaterThan(左区起点)
    expect(右区起点).toBeGreaterThan(中区起点)
    const 左区 = 模板.slice(左区起点, 中区起点)
    const 右区 = 模板.slice(右区起点)
    const 更多位 = 左区.indexOf('ref="qitaChuFaQi"')
    expect(更多位).toBeGreaterThanOrEqual(0)
    expect(更多位).toBeLessThan(左区.indexOf('<div class="fanhui-cao-wei">'))
    expect(更多位).toBeLessThan(左区.indexOf('ref="yongHuChuFaQi"'))
    expect(右区).not.toContain('qita-xuanxiang')
    expect(菜单源).toMatch(/使用浮层定位\(qitaChuFaQi,\s*qitaFuCeng,\s*\{\s*duiQi:\s*'zuo',/)
  })

  it('槽位宽度由三枚按钮尺寸与两个间距档推导，无第二处字面量', () => {
    expect(样式).toMatch(
      /--daohanglan-cao-wei-kuan:\s*calc\(var\(--daohanglan-anniu-chi\) \* 3 \+ var\(--jiange-xiao\) \* 2\)/,
    )
    for (const 选择器 of ['.fanhui-anniu', '.zhuye-anniu', '.chexiao-anniu']) {
      expect(声明值(样式, 选择器, 'width')).toEqual(['var(--daohanglan-anniu-chi)'])
      expect(声明值(样式, 选择器, 'height')).toEqual(['var(--daohanglan-anniu-chi)'])
    }
  })

  it('桌面三栏等宽居中，窄屏改为自适应起止列且标题左对齐，两处网格声明同源', () => {
    expect(声明值(样式, '.caidan-neirong', 'grid-template-columns')).toEqual([
      'minmax(0, 1fr) auto minmax(0, 1fr)',
      'auto minmax(0, 1fr) auto',
    ])
    expect([...菜单源.matchAll(/grid-template-columns/g)]).toHaveLength(2)
    expect(声明值(样式, '.caidan-zhong', 'justify-content')).toEqual(['center', 'flex-start'])
    expect(菜单源).toMatch(
      /@media \(max-width: 440px\) \{[\s\S]*?\.caidan-neirong \{[\s\S]*?grid-template-columns: auto minmax\(0, 1fr\) auto/,
    )
  })
})

describe('要求2 顶部导航：只留图标，不留文字标签', () => {
  it('返回/主页/更多的文字标签与其显隐规则全部删除', () => {
    for (const 死类 of ['fanhui-wenzi', 'zhuye-wenzi', 'qita-wenzi']) {
      expect(菜单源, `残留 ${死类}`).not.toContain(死类)
    }
    expect(菜单源).not.toMatch(/\.caidan-zuo\s*\{[^}]*gap:\s*var\(--jiange-da\)/)
  })

  it('图标按钮保留 title 与 aria-label 作为可读名称', () => {
    expect(模板).toMatch(/class="fanhui-anniu[\s\S]{0,220}?:title="huoQuFanYi\('caidan', 'fanHui'\)"/)
    expect(模板).toMatch(
      /class="fanhui-anniu[\s\S]{0,260}?:aria-label="huoQuFanYi\('caidan', 'fanHui'\)"/,
    )
    expect(模板).toMatch(/class="zhuye-anniu[\s\S]{0,220}?:aria-label="huoQuFanYi\('caidan', 'zhuYe'\)"/)
    expect(模板).toMatch(
      /class="chexiao-anniu[\s\S]{0,420}?:title="huoQuFanYi\('caidan', 'cheXiao'\)"/,
    )
    expect(模板).toMatch(
      /class="chexiao-anniu[\s\S]{0,460}?:aria-label="huoQuFanYi\('caidan', 'cheXiao'\)"/,
    )
    expect(模板).toMatch(/class="qita-xuanxiang[\s\S]{0,400}?:aria-label="huoQuFanYi\('caidan', 'gengDuo'\)"/)
  })
})

describe('要求3 顶部导航：非聊天页中间完全空出', () => {
  it('页面标题 h1 与路由标题映射整体删除', () => {
    for (const 死标识 of ['ye-mian-biao-ti', 'dangQianYeMianBiaoTi', 'fanYiBiaoTiDuiZhao']) {
      expect(菜单源, `残留 ${死标识}`).not.toContain(死标识)
    }
  })

  it('会话名仍是中间唯一内容，且受自身 max-width 约束不外溢', () => {
    expect(模板).toMatch(/<div class="caidan-zhong">\s*<div v-if="xianShiHuiHuaMing"/)
    expect(声明值(样式, '.jiaose-mingcheng-caidan', 'max-width')).toEqual([
      '180px',
      '80px',
      '70px',
      '100%',
    ])
    expect(声明值(样式, '.jiaose-mingcheng-caidan', 'overflow')).toEqual(['hidden'])
  })
})

const 空路由 = { path: '/', component: { template: '<div />' } }

async function 挂载完整于(名字: string): Promise<{ 壳: VueWrapper; 路由: Router }> {
  const 路由 = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: 空路由.component },
      { path: '/login', name: 'dengLu', component: 空路由.component },
      { path: '/guo-wang-zhan-ji', name: 'guoWangZhanJi', component: 空路由.component },
      { path: '/qi-pao-she-zhi', name: 'qiPaoSheZhi', component: 空路由.component },
      { path: '/chat/:huiHuaId', name: 'liaoTian', component: 空路由.component },
    ],
  })
  await 路由.push({ name: 名字, params: 名字 === 'liaoTian' ? { huiHuaId: 'ce-shi' } : {} })
  await 路由.isReady()
  const 壳 = mount(全局菜单, { global: { plugins: [createPinia(), 路由] }, attachTo: document.body })
  return { 壳, 路由 }
}

async function 挂载于(名字: string): Promise<VueWrapper> {
  return (await 挂载完整于(名字)).壳
}

describe('要求1 头像槽位跨页面结构一致', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('主页、战绩页与登录页都渲染同宽槽位，主页三钮可见而登录页三钮隐藏', async () => {
    const 主页 = await 挂载完整于('zhuJieMian')
    const 战绩 = await 挂载完整于('guoWangZhanJi')
    const 登录 = await 挂载完整于('dengLu')
    try {
      for (const { 壳 } of [主页, 战绩, 登录]) {
        const 槽位 = 壳.get('.fanhui-cao-wei')
        expect(槽位.exists()).toBe(true)
        expect(槽位.element.nextElementSibling?.classList.contains('yonghu-xuanxiang')).toBe(true)
        expect(壳.findAll('.yonghu-xuanxiang')).toHaveLength(1)
        expect(壳.findAll('.chexiao-anniu')).toHaveLength(1)
      }
      for (const { 壳 } of [主页, 战绩]) {
        expect(壳.findAll('.fanhui-anniu.yincang')).toHaveLength(0)
        expect(壳.findAll('.zhuye-anniu.yincang')).toHaveLength(0)
        expect(壳.findAll('.chexiao-anniu.yincang')).toHaveLength(0)
      }
      expect(登录.壳.findAll('.fanhui-anniu.yincang')).toHaveLength(1)
      expect(登录.壳.findAll('.zhuye-anniu.yincang')).toHaveLength(1)
      expect(登录.壳.findAll('.chexiao-anniu.yincang')).toHaveLength(1)
    } finally {
      主页.壳.unmount()
      战绩.壳.unmount()
      登录.壳.unmount()
    }
  })

  it('非聊天页中间无任何子元素，聊天页保留个人固定槽位且中间只放会话名容器', async () => {
    const 战绩 = await 挂载于('guoWangZhanJi')
    const 气泡 = await 挂载于('qiPaoSheZhi')
    const 聊天 = await 挂载于('liaoTian')
    try {
      for (const 壳 of [战绩, 气泡]) {
        expect(壳.get('.caidan-zhong').element.children).toHaveLength(0)
        expect(壳.get('.caidan-zhong').text()).toBe('')
      }
      expect(聊天.get('.caidan-zhong').element.children).toHaveLength(0)
      expect(聊天.get('.fanhui-cao-wei').element.nextElementSibling?.classList.contains('yonghu-xuanxiang')).toBe(
        true,
      )
      expect(聊天.find('.qita-xuanxiang').exists()).toBe(true)
    } finally {
      战绩.unmount()
      气泡.unmount()
      聊天.unmount()
    }
  })
})

describe('要求7 撤销键与主页键行为', () => {
  it('撤销键在主页可见，无前进历史时保持可见但禁用且不触发前进', async () => {
    const { 壳, 路由 } = await 挂载完整于('zhuJieMian')
    const 前进 = vi.spyOn(路由, 'forward')
    try {
      const 撤销 = 壳.get('.chexiao-anniu')
      expect(撤销.classes()).not.toContain('yincang')
      expect(撤销.attributes('disabled')).toBeDefined()
      expect(撤销.attributes('aria-disabled')).toBe('true')
      expect(撤销.attributes('title')).toBe('撤销')
      await 撤销.trigger('click')
      expect(前进).not.toHaveBeenCalled()
    } finally {
      壳.unmount()
    }
  })

  it('popstate 报告可前进历史后撤销键启用并调用 router.forward', async () => {
    const { 壳, 路由 } = await 挂载完整于('guoWangZhanJi')
    const 前进 = vi.spyOn(路由, 'forward')
    try {
      expect(壳.get('.chexiao-anniu').attributes('disabled')).toBeDefined()
      const 历史状态 = { forward: '/guo-wang-zhan-ji' }
      window.history.replaceState(历史状态, '')
      window.dispatchEvent(new PopStateEvent('popstate', { state: 历史状态 }))
      await nextTick()
      const 撤销 = 壳.get('.chexiao-anniu')
      expect(撤销.attributes('disabled')).toBeUndefined()
      expect(撤销.attributes('aria-disabled')).toBe('false')
      await 撤销.trigger('click')
      expect(前进).toHaveBeenCalledTimes(1)
    } finally {
      壳.unmount()
    }
  })

  it('主页点击主页按钮强制刷新当前页面，不再重复跳转', async () => {
    const { 壳, 路由 } = await 挂载完整于('zhuJieMian')
    const 跳转 = vi.spyOn(路由, 'push')
    try {
      await 壳.get('.zhuye-anniu').trigger('click')
      expect(强制刷新当前页面).toHaveBeenCalledTimes(1)
      expect(跳转).not.toHaveBeenCalled()
    } finally {
      壳.unmount()
    }
  })

  it('非主页点击主页按钮回到主页，不触发刷新', async () => {
    const { 壳, 路由 } = await 挂载完整于('guoWangZhanJi')
    const 跳转 = vi.spyOn(路由, 'push')
    try {
      await 壳.get('.zhuye-anniu').trigger('click')
      expect(跳转).toHaveBeenCalledWith('/')
      expect(强制刷新当前页面).not.toHaveBeenCalled()
    } finally {
      壳.unmount()
    }
  })
})

describe('FP-04 聊天顶栏真实宽度状态机', () => {
  async function 挂载几何菜单(名字: 'liaoTian' | 'zhuJieMian' = 'liaoTian') {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (回调: FrameRequestCallback) =>
      window.setTimeout(() => 回调(0), 0),
    )
    vi.stubGlobal('cancelAnimationFrame', (标识: number) => window.clearTimeout(标识))
    let 触发尺寸变化 = (): void => undefined
    const 活动尺寸观察器 = new Set<可控尺寸观察器>()
    class 可控尺寸观察器 implements ResizeObserver {
      private readonly 回调: ResizeObserverCallback
      constructor(回调: ResizeObserverCallback) {
        this.回调 = 回调
        活动尺寸观察器.add(this)
      }
      observe(元素: Element): void {
        if (元素.classList.contains('caidan-neirong')) {
          触发尺寸变化 = (): void => this.回调([], this)
        }
      }
      unobserve(): void {}
      disconnect(): void {
        活动尺寸观察器.delete(this)
      }
    }
    vi.stubGlobal('ResizeObserver', 可控尺寸观察器)
    const 添加监听 = vi.spyOn(window, 'addEventListener')
    const 移除监听 = vi.spyOn(window, 'removeEventListener')
    const 监听数量 = (类型: string): number => {
      const 已添加 = new Set(
        添加监听.mock.calls.filter(([名称]) => 名称 === 类型).map(([, 回调]) => 回调),
      )
      return (
        已添加.size -
        移除监听.mock.calls.filter(([名称, 回调]) => 名称 === 类型 && 已添加.has(回调)).length
      )
    }
    const pinia = createPinia()
    setActivePinia(pinia)
    const 用户 = 使用用户仓库()
    用户.dangQianYongHu = { id: 'yong-hu', ni_cheng: '测试用户' } as never
    const 聊天 = 使用聊天仓库()
    聊天.jiaoSeXinXi = { id: 'jiao-se', wei_xin_ming: '一个用于验证布局稳定性的很长对象名称' } as never
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'zhuJieMian', component: 空路由.component },
        { path: '/chat/:huiHuaId', name: 'liaoTian', component: 空路由.component },
        { path: '/tong-zhi', name: 'tongZhi', component: 空路由.component },
        { path: '/zhang-hao-an-quan', name: 'zhangHaoAnQuan', component: 空路由.component },
      ],
    })
    await router.push(
      名字 === 'liaoTian' ? { name: 'liaoTian', params: { huiHuaId: 'ce-shi' } } : { name: 名字 },
    )
    await router.isReady()
    const 壳 = mount(全局菜单, { global: { plugins: [pinia, router] }, attachTo: document.body })
    const 内容 = 壳.get('.caidan-neirong').element as HTMLElement
    let 可用宽度 = 250
    const 存在可见 = (选择器: string): boolean => {
      const 元素 = 内容.querySelector<HTMLElement>(选择器)
      return !!元素 && !元素.classList.contains('yincang')
    }
    Object.defineProperty(内容, 'clientWidth', { configurable: true, get: () => 可用宽度 })
    Object.defineProperty(内容, 'scrollWidth', {
      configurable: true,
      get: () => {
        let 需求宽度 = 80 + 120 + 36
        if (内容.querySelector('.yonghu-xuanxiang')) 需求宽度 += 100
        if (内容.querySelector('.duifang-shuru-tishi')) 需求宽度 += 40
        if (内容.querySelector('.junshi-kaiGuanWeiQueRen')) 需求宽度 += 40
        if (存在可见('.junshi-anniu')) 需求宽度 += 60
        if (存在可见('.zhuti-qiehuan-anniu')) 需求宽度 += 36
        if (存在可见('.tongzhi-anniu')) 需求宽度 += 36
        if (存在可见('.banben-wenben')) 需求宽度 += 50
        return 需求宽度
      },
    })
    const 等待测量 = async (): Promise<void> => {
      for (let 次数 = 0; 次数 < 12; 次数 += 1) {
        await vi.advanceTimersByTimeAsync(60)
        await nextTick()
      }
    }
    const 稳定测量 = async (): Promise<void> => {
      触发尺寸变化()
      await 等待测量()
    }
    return {
      壳,
      router,
      pinia,
      稳定测量,
      等待测量,
      监听数量,
      活动尺寸观察器数量: (): number => 活动尺寸观察器.size,
      触发尺寸变化: (): void => 触发尺寸变化(),
      设置宽度: (宽度: number): void => {
        可用宽度 = 宽度
      },
      清理: (): void => {
        壳.unmount()
        teZhengKaiGuanCuoWu.value = null
        document.body.replaceChildren()
        vi.clearAllTimers()
        vi.useRealTimers()
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
      },
    }
  }

  function 期望可见集合(壳: VueWrapper, 数量: number): void {
    expect(壳.find('.junshi-anniu').exists()).toBe(数量 >= 1)
    expect(壳.get('.fanhui-anniu').classes()).not.toContain('yincang')
    expect(壳.get('.chexiao-anniu').classes()).not.toContain('yincang')
    expect(壳.get('.zhuye-anniu').classes()).not.toContain('yincang')
    expect(壳.get('.yonghu-xuanxiang').classes().includes('yincang')).toBe(数量 < 2)
    expect(壳.find('.zhuti-qiehuan-anniu').exists()).toBe(数量 >= 3)
    expect(壳.find('.tongzhi-anniu').exists()).toBe(数量 >= 4)
    expect(壳.find('.banben-wenben').exists()).toBe(数量 >= 5)
  }

  it('窄屏一次收敛到最小集合，空间增加后严格恢复军师与个人信息，三钮始终固定', async () => {
    const 环境 = await 挂载几何菜单()
    try {
      await 环境.稳定测量()
      期望可见集合(环境.壳, 0)
      expect(环境.壳.get('.jiaose-mingcheng-caidan').text()).toBe('一个用于验证布局稳定性的很长对象名称')
      expect(环境.壳.find('.qita-xuanxiang').exists()).toBe(true)
      环境.设置宽度(400)
      await 环境.稳定测量()
      期望可见集合(环境.壳, 2)
    } finally {
      环境.清理()
    }
  })

  it('双向跨越多档都严格按优先级收敛，重复测量不抖动也不留轮询', async () => {
    const 环境 = await 挂载几何菜单()
    try {
      for (const [宽度, 数量] of [
        [520, 5],
        [480, 4],
        [440, 3],
        [400, 2],
        [250, 0],
        [400, 2],
        [440, 3],
        [480, 4],
        [520, 5],
      ] as const) {
        环境.设置宽度(宽度)
        await 环境.稳定测量()
        期望可见集合(环境.壳, 数量)
        expect(环境.壳.attributes('data-shou-na-dang')).toBe(String(5 - 数量))
      }
      const 稳定档位 = 环境.壳.attributes('data-shou-na-dang')
      await 环境.稳定测量()
      await 环境.稳定测量()
      expect(环境.壳.attributes('data-shou-na-dang')).toBe(稳定档位)
      期望可见集合(环境.壳, 5)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      环境.清理()
    }
  })

  it('个人槽位收起时关闭其浮层并把残留焦点交给永久更多按钮', async () => {
    const 环境 = await 挂载几何菜单()
    try {
      环境.设置宽度(520)
      await 环境.稳定测量()
      const 个人 = 环境.壳.get('.yonghu-xuanxiang')
      ;(个人.element as HTMLButtonElement).focus()
      await 个人.trigger('click')
      await nextTick()
      expect(document.querySelector('.yonghu-caidan-fuceng')).not.toBeNull()
      环境.设置宽度(250)
      await 环境.稳定测量()
      expect(环境.壳.get('nav').attributes('data-shou-na-dang')).toBe('5')
      期望可见集合(环境.壳, 0)
      expect(document.querySelector('.yonghu-caidan-fuceng')).toBeNull()
      expect(document.activeElement).toBe(环境.壳.get('.qita-xuanxiang').element)
    } finally {
      环境.清理()
    }
  })

  it('卸载后观察回调与待执行帧全部失效，不再产生测量任务', async () => {
    const 环境 = await 挂载几何菜单()
    try {
      await 环境.稳定测量()
      环境.壳.unmount()
      expect(vi.getTimerCount()).toBe(0)
      环境.触发尺寸变化()
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      环境.清理()
    }
  })

  it('容器 scrollWidth 漏报 flex-end 左溢出时仍按子项真实 rect 收起版本', async () => {
    const 环境 = await 挂载几何菜单()
    try {
      环境.设置宽度(520)
      const 右区 = 环境.壳.get('.caidan-you').element as HTMLElement
      Object.defineProperty(右区, 'clientWidth', { configurable: true, get: () => 300 })
      Object.defineProperty(右区, 'scrollWidth', { configurable: true, get: () => 300 })
      const 原始矩形 = HTMLElement.prototype.getBoundingClientRect
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
        if (this === 右区) {
          return { left: 200, right: 500, width: 300, top: 0, bottom: 52, height: 52, x: 200, y: 0 } as DOMRect
        }
        if (this.classList.contains('banben-wenben')) {
          return { left: 490, right: 560, width: 70, top: 0, bottom: 36, height: 36, x: 490, y: 0 } as DOMRect
        }
        return 原始矩形.call(this)
      })
      await 环境.稳定测量()
      期望可见集合(环境.壳, 4)
      expect(环境.壳.find('.banben-wenben').exists()).toBe(false)
    } finally {
      环境.清理()
    }
  })

  it('长名字只在标题自身省略，不误判为顶栏溢出或挤掉可操作项', async () => {
    const 环境 = await 挂载几何菜单()
    try {
      环境.设置宽度(520)
      const 标题 = 环境.壳.get('.jiaose-mingcheng-caidan').element as HTMLElement
      Object.defineProperty(标题, 'clientWidth', { configurable: true, get: () => 80 })
      Object.defineProperty(标题, 'scrollWidth', { configurable: true, get: () => 1000 })
      await 环境.稳定测量()
      期望可见集合(环境.壳, 5)
      expect(标题.textContent).toBe('一个用于验证布局稳定性的很长对象名称')
      expect(声明值(样式, '.jiaose-mingcheng-caidan', 'text-overflow')).toEqual(['ellipsis'])
      expect(声明值(样式, '.jiaose-mingcheng-caidan', 'white-space')).toEqual(['nowrap'])
    } finally {
      环境.清理()
    }
  })

  it('最小顶栏把五项命令全部归入可键盘操作的更多菜单，三钮固定，军师命令同源并关闭浮层', async () => {
    const 环境 = await 挂载几何菜单()
    const 军师事件 = vi.fn()
    window.addEventListener('junshi-zhankai', 军师事件)
    try {
      await 环境.稳定测量()
      期望可见集合(环境.壳, 0)
      await 环境.壳.get('.qita-xuanxiang').trigger('keydown', { key: 'ArrowDown' })
      await nextTick()
      await nextTick()
      for (const 标识 of ['jun-shi', 'ge-ren', 'zhu-ti', 'tong-zhi', 'ban-ben']) {
        expect(document.querySelector(`[data-testid="qita-caidan-${标识}"]`)).not.toBeNull()
      }
      expect(document.activeElement?.getAttribute('role')).toBe('menuitem')
      expect(document.querySelector('[data-testid="qita-caidan-ban-ben"]')?.textContent).toContain('版本号')
      expect(
        Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter(
          (元素) => 元素.textContent?.trim() === '账号设置',
        ),
      ).toHaveLength(1)
      const 军师菜单项 = document.querySelector<HTMLButtonElement>('[data-testid="qita-caidan-jun-shi"]')
      expect(军师菜单项).not.toBeNull()
      军师菜单项?.click()
      expect(军师事件).toHaveBeenCalledTimes(1)
      await nextTick()
      expect(document.querySelector('.qita-caidan-fuceng')).toBeNull()
    } finally {
      window.removeEventListener('junshi-zhankai', 军师事件)
      环境.清理()
    }
  })

  it('最小宽度下主页三钮仍固定可见，更多菜单不再重复主页入口', async () => {
    const 环境 = await 挂载几何菜单('zhuJieMian')
    try {
      await 环境.稳定测量()
      期望可见集合(环境.壳, 0)
      expect(环境.壳.get('nav').attributes('data-shou-na-dang')).toBe('5')
      await 环境.壳.get('.qita-xuanxiang').trigger('keydown', { key: 'ArrowDown' })
      await nextTick()
      await nextTick()
      expect(document.querySelector('[data-testid="qita-caidan-zhu-ye"]')).toBeNull()
      await 环境.壳.get('.zhuye-anniu').trigger('click')
      expect(强制刷新当前页面).toHaveBeenCalledTimes(1)
    } finally {
      环境.清理()
    }
  })

  it('特征开关错误动态出现和消失时无需尺寸回调也按优先级重测', async () => {
    const 环境 = await 挂载几何菜单()
    try {
      环境.设置宽度(520)
      await 环境.稳定测量()
      期望可见集合(环境.壳, 5)
      teZhengKaiGuanCuoWu.value = chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.WANG_LUO })
      await 环境.等待测量()
      expect(环境.壳.find('.junshi-kaiGuanWeiQueRen').exists()).toBe(true)
      期望可见集合(环境.壳, 4)
      teZhengKaiGuanCuoWu.value = null
      await 环境.等待测量()
      expect(环境.壳.find('.junshi-kaiGuanWeiQueRen').exists()).toBe(false)
      期望可见集合(环境.壳, 5)
    } finally {
      环境.清理()
    }
  })

  it('对方输入提示动态出现和消失时无需尺寸回调也按优先级重测', async () => {
    const 环境 = await 挂载几何菜单()
    try {
      环境.设置宽度(520)
      await 环境.稳定测量()
      期望可见集合(环境.壳, 5)
      const 聊天 = 使用聊天仓库(环境.pinia)
      聊天.aiZhuangTai = 'zheng_zai_shu_ru'
      await 环境.等待测量()
      expect(环境.壳.find('.duifang-shuru-tishi').exists()).toBe(true)
      expect(环境.壳.get('.duifang-shuru-tishi').text()).toBe('对方正在输入...')
      期望可见集合(环境.壳, 4)
      聊天.aiZhuangTai = 'kong_xian'
      await vi.advanceTimersByTimeAsync(1000)
      await 环境.等待测量()
      expect(环境.壳.find('.duifang-shuru-tishi').exists()).toBe(false)
      期望可见集合(环境.壳, 5)
    } finally {
      环境.清理()
    }
  })

  it.each(['.yonghu-xuanxiang', '.qita-xuanxiang'])('菜单打开途中关闭后不恢复 Observer、帧或 DOM 监听', async (选择器) => {
    const 环境 = await 挂载几何菜单()
    try {
      await 环境.稳定测量()
      const 原尺寸观察器数量 = 环境.活动尺寸观察器数量()
      const 原缩放监听数量 = 环境.监听数量('resize')
      const 触发器 = 环境.壳.get(选择器).element as HTMLButtonElement
      触发器.click()
      触发器.click()
      await 环境.等待测量()
      expect(触发器.getAttribute('aria-expanded')).toBe('false')
      expect(环境.活动尺寸观察器数量()).toBe(原尺寸观察器数量)
      expect(环境.监听数量('resize')).toBe(原缩放监听数量)
      expect(环境.监听数量('scroll')).toBe(0)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      环境.清理()
    }
  })

  it('菜单打开途中卸载后不恢复 Observer、帧或 DOM 监听', async () => {
    const 环境 = await 挂载几何菜单()
    try {
      await 环境.稳定测量()
      const 触发器 = 环境.壳.get('.qita-xuanxiang').element as HTMLButtonElement
      触发器.click()
      环境.壳.unmount()
      await 环境.等待测量()
      expect(环境.活动尺寸观察器数量()).toBe(0)
      expect(环境.监听数量('resize')).toBe(0)
      expect(环境.监听数量('scroll')).toBe(0)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      环境.清理()
    }
  })
})
