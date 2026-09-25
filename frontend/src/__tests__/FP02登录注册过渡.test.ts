import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import 登录内容 from '@/views/登录内容.vue'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { 声明位置, 求几何算式, 解析几何数值 } from './主题令牌真源'
import {
  拆分选择器组,
  层叠胜出,
  规则清单,
  读取全局基线,
  type 规则,
} from './CSS级联真源'

/**
 * FP-02（需求 #14）：登录↔注册切换的丝滑过渡守卫。
 *
 * 判据口径沿用 FP-24b：几何/过渡属性走「层叠结果 + var() 解析值」，DOM 形态走真实挂载探针，
 * 不做「源码包含某字符串」式断言。
 *  ① 切换后 DOM 只剩目标表单（离场层必须随过渡卸载，不残留、不与目标表单长期共存）；
 *  ② 切换后 activeElement 不残留在上一表单（含 FP-14 三段日期控件的段级焦点）；
 *  ③ 位移量吃既有共用 :root 令牌（--jiange-xiao），prefers-reduced-motion 档内位移归零、
 *    减动效下切换立即稳定；离场层留在独立行且由层叠结果 position:relative + pointer-events:none 钉住；
 *  ④ FP-03c / FP-04a / FP-04b 既有契约逐点复测（滚动口宿主恒类、发丝线令牌、字段间距令牌）。
 */

vi.mock('@/api/认证', () => ({
  faSongMa: vi.fn(),
  jianChaShouJiHao: vi.fn(),
  dengLu: vi.fn(),
  zhuCe: vi.fn(),
  huoQuYongHuXinXi: vi.fn(),
}))
vi.mock('@/api/请求', () => ({
  huoQuCuoWuXiangYing: vi.fn((cuoWu: unknown) => (cuoWu as { response?: unknown }).response),
}))

const 视图源 = readFileSync(resolve(__dirname, '../views/登录内容.vue'), 'utf8')

function 样式源码(全源: string): string {
  const 段 = [...全源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((匹) => 匹[1])
  expect(段.length, '登录内容.vue 的 <style> 块数量变了，取样口径需复核').toBe(1)
  return 段[0].replace(/\/\*[\s\S]*?\*\//g, '')
}

/** @keyframes 的帧选择器不是元素选择器，交层叠判定会抛错 ⇒ 先整块剔除（与 FP04a 同法） */
function 剔帧(源: string): string {
  let 出 = ''
  let 位 = 0
  for (;;) {
    const 余 = 源.slice(位)
    const 匹 = /@keyframes[^{]*\{/.exec(余)
    if (!匹) return 出 + 余
    出 += 余.slice(0, 匹.index)
    let 深度 = 1
    let 扫 = 位 + 匹.index + 匹[0].length
    while (扫 < 源.length && 深度 > 0) {
      if (源[扫] === '{') 深度++
      else if (源[扫] === '}') 深度--
      扫++
    }
    位 = 扫
  }
}

/** 按大括号配平把顶层 @media 块从主源里拆出来：主源 = 常档，媒体段 = 条件档 */
function 拆媒体(源: string): { 主体: string; 媒体段: { 条件: string; 内容: string }[] } {
  const 媒体段: { 条件: string; 内容: string }[] = []
  let 主体 = ''
  let 位 = 0
  for (;;) {
    const 余 = 源.slice(位)
    const 匹 = /@media[^{]*\{/.exec(余)
    if (!匹) {
      主体 += 余
      break
    }
    主体 += 余.slice(0, 匹.index)
    let 深度 = 1
    let 扫 = 位 + 匹.index + 匹[0].length
    while (扫 < 源.length && 深度 > 0) {
      if (源[扫] === '{') 深度++
      else if (源[扫] === '}') 深度--
      扫++
    }
    媒体段.push({
      条件: 匹[0]
        .slice('@media'.length, -1)
        .replace(/\s+/g, ' ')
        .trim(),
      内容: 源.slice(位 + 匹.index + 匹[0].length, 扫 - 1),
    })
    位 = 扫
  }
  return { 主体, 媒体段 }
}

const 样式全 = 剔帧(样式源码(视图源))
const { 主体: 常档源, 媒体段 } = 拆媒体(样式全)

/** 本单判定要问的属性；含组合器/id/伪元素的选择器不喂层叠真源（它会抛错），先按 FP04a 同法切成账本 */
const 查询面 = new Set([
  'transform',
  'transition',
  'opacity',
  'position',
  'pointer-events',
  'top',
  'overflow-y',
  'min-height',
  'max-height',
  'flex',
  'margin-bottom',
  'border-bottom-color',
  '--ziduan-jian-ju',
])

function 建表(源: string): { 可用: 规则[]; 剔除: string[] } {
  const 全 = [...规则清单(剔帧(读取全局基线())), ...规则清单(源)].map((规则, 序) => ({
    ...规则,
    序号: 序,
  }))
  const 可用: 规则[] = []
  const 剔除: string[] = []
  for (const 规则 of 全) {
    const 属性们 = [...规则.声明.keys()].filter((性) => 查询面.has(性))
    if (属性们.length === 0) continue
    const 组 = 拆分选择器组(规则.选择器)
    const 简单 = 组.filter((串) => !/[#]|::|[ \t>+~]/.test(串.trim()))
    for (const 串 of 组.filter((项) => !简单.includes(项)))
      剔除.push(`${串.trim()} {${属性们.join(',')}}`)
    if (简单.length) 可用.push({ ...规则, 选择器: 简单.join(', ') })
  }
  return { 可用, 剔除 }
}

const { 可用: 常档表, 剔除: 常档剔除 } = 建表(常档源)
const { 可用: 减档表 } = 建表(媒体段.length ? 媒体段[0].内容 : '')

function 层叠(属性: string, 类: string[], 表: 规则[] = 常档表): string {
  const 结果 = 层叠胜出(表, { 标签: 'div', 类, 属性: {} }, 属性)
  expect(结果, `类 ${类.join(' ')} 上 ${属性} 没有生效声明`).not.toBeNull()
  return (结果 as { 值: string }).值
}

function 等待帧(n: number): Promise<void> {
  return new Promise((解决) => {
    let 计 = 0
    const 踏 = (): void => {
      计 += 1
      if (计 >= n) 解决()
      else requestAnimationFrame(踏)
    }
    requestAnimationFrame(踏)
  })
}

async function 挂载(moShi: 'dengLu' | 'zhuCe', 启用真实过渡 = false): Promise<VueWrapper> {
  const 路由: Router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/login', name: 'dengLu', component: 登录内容 },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  使用认证表单仓库().moShi = moShi
  const wrapper = mount(登录内容, {
    attachTo: document.body,
    // @vue/test-utils 默认把 <Transition> 换成 transition-stub（同步换 DOM，观察不到过渡窗口）；
    // 本单窗口判定用例必须关桩走真实 BaseTransition 代码路径。其余用例保持默认存根 ⇒ 与
    // FP04a/登录内容.test.ts 的挂载形态逐字一致，两形态并测 ⇒ 切换契约在存根与真实过渡下都不破。
    global: {
      plugins: [pinia, 路由],
      ...(启用真实过渡 ? { stubs: { transition: false, 'transition-stub': false } } : {}),
    },
  })
  await 路由.isReady()
  await flushPromises()
  return wrapper
}

async function 点标签(wrapper: VueWrapper, 序: number): Promise<void> {
  await wrapper.findAll('.biaoqian-anniu')[序].trigger('click')
  await flushPromises()
}

function 含选择器的表单(wrapper: VueWrapper, 选择器: string): VueWrapper | undefined {
  return wrapper
    .findAll('form')
    .find((形) => 形.element.querySelector(选择器) !== null || 形.element.matches(选择器))
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.resetAllMocks()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('FP-02 ①：切换后 DOM 只存在目标表单（离场层随过渡卸载，无共存残留）', () => {
  it('过渡窗口内（以注入非零时长钉住离场态）：入场表单同帧可达、离场层挂过渡类；结束后只剩目标表单', async () => {
    const 节 = document.createElement('style')
    节.dataset.fp02 = '1'
    节.textContent =
      '.biaodan-qiehuan-you-leave-active,.biaodan-qiehuan-zuo-leave-active{transition-property:opacity;transition-duration:0.5s}.biaodan-qiehuan-you-enter-active,.biaodan-qiehuan-zuo-enter-active{transition-property:opacity;transition-duration:0.5s}'
    document.head.appendChild(节)
    try {
      const wrapper = await 挂载('dengLu', true)
      await 点标签(wrapper, 1)
      expect(wrapper.find('#zhuce-shoujihao').exists(), '目标表单必须与切换同帧在场（FP-04a 同步契约）').toBe(
        true,
      )
      const 离场 = 含选择器的表单(wrapper, '#denglu-shoujihao')
      expect(离场, '离场层未进入过渡窗口（Transition 未接上 v-if/v-else 分支）').toBeDefined()
      expect(离场!.classes()).toContain('biaodan-qiehuan-you-leave-active')
      const 入场 = 含选择器的表单(wrapper, '#zhuce-shoujihao')
      expect(入场).toBeDefined()
      expect(入场!.classes()).toContain('biaodan-qiehuan-you-enter-active')
      await 等待帧(3)
      expect(离场!.classes()).toContain('biaodan-qiehuan-you-leave-to')
      await new Promise((解决) => {
        setTimeout(解决, 700)
      })
      await 等待帧(6)
      await flushPromises()
      const 余 = wrapper.findAll('form')
      expect(余.length, '过渡结束后离场层未卸载 ⇒ 上一表单与目标表单共存').toBe(1)
      expect(余[0].element.querySelector('#denglu-shoujihao')).toBeNull()
    } finally {
      节.remove()
      document.querySelectorAll('style[data-fp02]').forEach((项) => 项.remove())
    }
  })

  for (const [起, 起选择器, 终, 终选择器, 终段] of [
    ['dengLu', '#denglu-shoujihao', 'zhuCe', '#zhuce-shoujihao', '#zhuce-chushengriqi-ri'],
    ['zhuCe', '#zhuce-shoujihao', 'dengLu', '#denglu-shoujihao', null],
  ] as const) {
    it(`${起}→${终}：过渡结束后 DOM 只剩目标表单，上一表单（含三段日期控件）整体卸载`, async () => {
      const wrapper = await 挂载(起)
      await 点标签(wrapper, 终 === 'zhuCe' ? 1 : 0)
      await 等待帧(8)
      await flushPromises()
      const 表单们 = wrapper.findAll('form')
      expect(表单们.length, '离场层未卸载 ⇒ 两套表单在 DOM 里重叠共存').toBe(1)
      expect(表单们[0].element.querySelector(起选择器), '上一表单残留').toBeNull()
      expect(表单们[0].element.querySelector(终选择器), '目标表单不在了').not.toBeNull()
      for (const 类 of [
        'biaodan-qiehuan-you-leave-active',
        'biaodan-qiehuan-you-enter-active',
        'biaodan-qiehuan-zuo-leave-active',
        'biaodan-qiehuan-zuo-enter-active',
      ])
        expect(表单们[0].classes(), `过渡结束后仍挂着 ${类}`).not.toContain(类)
      if (终段) expect(wrapper.find(终段).exists(), '注册态三段日期控件未就位').toBe(true)
      wrapper.unmount()
    })
  }

  it('滚动口宿主类名集合前后恒定（FP-04a：宿主恒在、零额外类）', async () => {
    const wrapper = await 挂载('dengLu')
    const 宿主 = wrapper.find('.biaodan-gundong').element as HTMLElement
    const 前 = [...宿主.classList]
    await 点标签(wrapper, 1)
    await 等待帧(8)
    await flushPromises()
    expect([...宿主.classList], '切换后滚动口宿主长出了状态类').toEqual(前)
    await 点标签(wrapper, 0)
    await 等待帧(8)
    await flushPromises()
    expect([...宿主.classList]).toEqual(前)
    wrapper.unmount()
  })
})

describe('FP-02 ②：切换后焦点不残留上一表单（含段级焦点）', () => {
  // 真实过渡下离场表单会在 DOM 里多活一段过渡窗口：此时“焦点不在表单内”只能由
  // qieHuanMoShi 的显式注销达成（jsdom 只在节点被移除时才归位 body），存根态测不到这一层
  it('聚焦登录密码后切注册：activeElement 立即离开表单', async () => {
    const wrapper = await 挂载('dengLu', true)
    const 密码 = wrapper.find('#denglu-mima').element as HTMLInputElement
    密码.focus()
    expect(document.activeElement, '前置：未获得焦点').toBe(密码)
    await 点标签(wrapper, 1)
    const 当前 = document.activeElement as HTMLElement | null
    expect(当前?.closest('form'), '焦点残留在表单内（含离场层）').toBeNull()
    expect(当前).toBe(document.body)
    wrapper.unmount()
  })

  it('聚焦注册三段日期控件的月段后切登录：段级焦点同样被注销', async () => {
    const wrapper = await 挂载('zhuCe', true)
    const 月段 = wrapper.find('#zhuce-chushengriqi-yue').element as HTMLInputElement
    月段.focus()
    expect(document.activeElement, '前置：段未获得焦点').toBe(月段)
    await 点标签(wrapper, 0)
    const 当前 = document.activeElement as HTMLElement | null
    expect(当前?.closest('form'), '段级焦点残留在表单内').toBeNull()
    expect(当前).toBe(document.body)
    wrapper.unmount()
  })

  it('标签按钮自身的焦点不被误注销（只清表单内焦点）', async () => {
    const wrapper = await 挂载('dengLu')
    const 标签钮 = wrapper.findAll('.biaoqian-anniu')[1].element as HTMLElement
    标签钮.focus()
    await 点标签(wrapper, 1)
    expect(document.activeElement, '点标签切换不该把标签自己的焦点踢没').toBe(标签钮)
    wrapper.unmount()
  })
})

describe('FP-02 ③：过渡几何按目标模式横向派生；减动效档立即稳定切换', () => {
  it('登录→注册向右、注册→登录向左，入场与离场反向且吃 --jiange-xiao', () => {
    const 方向们 = [
      ['you', 'translateX(var(--jiange-xiao))', 'translateX(calc(var(--jiange-xiao) * -1))'],
      ['zuo', 'translateX(calc(var(--jiange-xiao) * -1))', 'translateX(var(--jiange-xiao))'],
    ] as const
    for (const [方向, 入场值, 离场值] of 方向们) {
      const 入场 = 层叠('transform', [`biaodan-qiehuan-${方向}-enter-from`])
      const 离场 = 层叠('transform', [`biaodan-qiehuan-${方向}-leave-to`])
      expect(入场, `${方向} 入场位移不应含像素字面量`).toBe(入场值)
      expect(离场, `${方向} 离场位移不应含像素字面量`).toBe(离场值)
      expect(入场).not.toMatch(/translateY/)
      expect(离场).not.toMatch(/translateY/)
    }
    expect(解析几何数值('--jiange-xiao')).toBeGreaterThan(0)
    expect(求几何算式('calc(var(--jiange-xiao) * 1)')).toBe(解析几何数值('--jiange-xiao'))
    const 过渡位移规则 = 规则清单(样式全).filter(
      (规则) => 规则.选择器.includes('biaodan-qiehuan') && 规则.声明.has('transform'),
    )
    expect(过渡位移规则.length).toBeGreaterThan(0)
    expect(过渡位移规则.some((规则) => 规则.声明.get('transform')?.includes('translateY'))).toBe(
      false,
    )
  })

  it('目标模式派生过渡名：注册→登录真实窗口使用 zuo 方向类', async () => {
    const wrapper = await 挂载('zhuCe', true)
    await 点标签(wrapper, 0)
    const 离场 = 含选择器的表单(wrapper, '#zhuce-shoujihao')
    const 入场 = 含选择器的表单(wrapper, '#denglu-shoujihao')
    expect(离场).toBeDefined()
    expect(入场).toBeDefined()
    expect(离场!.classes()).toContain('biaodan-qiehuan-zuo-leave-active')
    expect(入场!.classes()).toContain('biaodan-qiehuan-zuo-enter-active')
    wrapper.unmount()
  })

  it('双向切换保留两表单已输入值', async () => {
    const wrapper = await 挂载('dengLu')
    const miMa = wrapper.find('#denglu-mima')
    await miMa.setValue('dengLuBaoChi123')
    await 点标签(wrapper, 1)
    expect(wrapper.find('#zhuce-shoujihao').exists()).toBe(true)
    await 点标签(wrapper, 0)
    expect((wrapper.find('#denglu-mima').element as HTMLInputElement).value).toBe('dengLuBaoChi123')
    wrapper.unmount()

    const zhuCeWrapper = await 挂载('zhuCe')
    const shouJiHao = zhuCeWrapper.find('#zhuce-shoujihao')
    await shouJiHao.setValue('13800138000')
    await 点标签(zhuCeWrapper, 0)
    expect(zhuCeWrapper.find('#denglu-shoujihao').exists()).toBe(true)
    await 点标签(zhuCeWrapper, 1)
    expect((zhuCeWrapper.find('#zhuce-shoujihao').element as HTMLInputElement).value).toBe('13800138000')
    zhuCeWrapper.unmount()
  })

  it('离场层留在独立行且禁交互：position:relative / pointer-events:none 为层叠生效值，宿主为滚动口本体', () => {
    for (const 类 of ['biaodan-qiehuan-you-leave-active', 'biaodan-qiehuan-zuo-leave-active']) {
      expect(层叠('position', [类])).toBe('relative')
      expect(层叠('pointer-events', [类])).toBe('none')
      expect(层叠胜出(常档表, { 标签: 'form', 类: [类], 属性: {} }, 'top')).toBeNull()
    }
    expect(层叠('position', ['biaodan-gundong'])).toBe('relative')
  })

  it('淡切通道常挂：双向 enter/leave-active 的 transition 生效值同时含 opacity 与 transform', () => {
    for (const 类 of [
      'biaodan-qiehuan-you-enter-active',
      'biaodan-qiehuan-you-leave-active',
      'biaodan-qiehuan-zuo-enter-active',
      'biaodan-qiehuan-zuo-leave-active',
    ]) {
      const 值 = 层叠('transition', [类])
      expect(值, `${类} 未过渡 opacity ⇒ 退化为硬切`).toMatch(/opacity/)
      expect(值, `${类} 未过渡 transform ⇒ 位移档形同虚设`).toMatch(/transform/)
    }
  })

  it('视图内条件块只此一档 prefers-reduced-motion（无视口条件块，与 FP-04b 同前提），其内双向位移与过渡归零', () => {
    expect(媒体段.map((段) => 段.条件)).toEqual(['(prefers-reduced-motion: reduce)'])
    for (const 类 of [
      'biaodan-qiehuan-you-enter-from',
      'biaodan-qiehuan-you-leave-to',
      'biaodan-qiehuan-zuo-enter-from',
      'biaodan-qiehuan-zuo-leave-to',
    ]) {
      expect(层叠('transform', [类], 减档表), `${类} 在减动效档仍有位移`).toBe('none')
    }
    for (const 类 of [
      'biaodan-qiehuan-you-enter-active',
      'biaodan-qiehuan-you-leave-active',
      'biaodan-qiehuan-zuo-enter-active',
      'biaodan-qiehuan-zuo-leave-active',
    ])
      expect(
        层叠胜出(减档表, { 标签: 'div', 类, 属性: {} }, 'transition')?.值 ?? null,
        `${类} 在减动效档仍有过渡`,
      ).toBe('none')
  })

  it('零新增令牌：本单消费的两枚量纲/缓动真源都在共用 :root 且两档同值', () => {
    for (const 令牌 of ['--jiange-xiao', '--quxian-tan-chu']) {
      expect(声明位置(令牌), `${令牌} 不在共用 :root 块`).toEqual({
        共用: true,
        浅色: false,
        深色: false,
      })
    }
  })
})

describe('FP-02 层叠判定的形态账本（判定盲区必须显式登记，FP04a 同法）', () => {
  it('因 id/组合器/伪元素形态被剔除出判定的查询面声明 = 已登记清单，新增即红', () => {
    expect([...常档剔除].sort()).toEqual(
      [
        // 现状登记（FP04a 同法）：全部为既有装饰/派生层，无一属于本单过渡类；
        // 新增形态必须显式入账而不是被静默放行。
        '#ban-ben-ti-shi {position,top}',
        '.anniu-zhuyao::before {position,top,transition}',
        '.biaodan-rongqi::before {position,top,pointer-events}',
        '.biaodan-zu label {margin-bottom}',
        '.biaoqian-anniu.huoyue::after {position,transform}',
        '.boli-kapian::after {position,top,pointer-events}',
        '.ji-zhu-wen-ben.yi-gou-xuan::after {position,top,transform}',
        '.ji-zhu-wen-ben::before {position,top,transform,transition}',
        '.mima-zu .fenlie-shuru {flex}',
        '.shuru-zu.shangFu .fudong-biaoqian {top}',
        '.shuru-zu:focus-within .fudong-biaoqian {top}',
        '.shuru-zu:has(.fenlie-shuru:-webkit-autofill) .fudong-biaoqian {top}',
        ":root[data-theme='light'] .biaoqian-qiehuan {border-bottom-color}",
        ":where( input:not( [type='checkbox'], [type='radio'], [type='button'], [type='submit'], [type='reset'], [type='file'], [type='image'], [type='range'], [type='color'], [type='hidden'] ), textarea, [contenteditable]:not([contenteditable='false']) ):not([data-chat-scope='true'] *):not([data-chat-input='true']) {border-bottom-color}",
        ":where( input:not( [type='checkbox'], [type='radio'], [type='button'], [type='submit'], [type='reset'], [type='file'], [type='image'], [type='range'], [type='color'], [type='hidden'] ), textarea, [contenteditable]:not([contenteditable='false']) ):not([data-chat-scope='true'] *):not([data-chat-input='true']):disabled {border-bottom-color}",
        ":where( input:not( [type='checkbox'], [type='radio'], [type='button'], [type='submit'], [type='reset'], [type='file'], [type='image'], [type='range'], [type='color'], [type='hidden'] ), textarea, [contenteditable]:not([contenteditable='false']) ):not([data-chat-scope='true'] *):not([data-chat-input='true']):focus {border-bottom-color}",
        ":where( input:not( [type='checkbox'], [type='radio'], [type='button'], [type='submit'], [type='reset'], [type='file'], [type='image'], [type='range'], [type='color'], [type='hidden'] ), textarea, [contenteditable]:not([contenteditable='false']) ):not([data-chat-scope='true'] *):not([data-chat-input='true']):focus-visible {border-bottom-color}",
        ":where( input:not( [type='checkbox'], [type='radio'], [type='button'], [type='submit'], [type='reset'], [type='file'], [type='image'], [type='range'], [type='color'], [type='hidden'] ), textarea, [contenteditable]:not([contenteditable='false']) ):not([data-chat-scope='true'] *):not([data-chat-input='true']):is([aria-invalid='true'], [data-error='true'], .is-error) {border-bottom-color}",
        ":where( input:not( [type='checkbox'], [type='radio'], [type='button'], [type='submit'], [type='reset'], [type='file'], [type='image'], [type='range'], [type='color'], [type='hidden'] ), textarea, [contenteditable]:not([contenteditable='false']) ):not([data-chat-scope='true'] *):not([data-chat-input='true']):read-only {border-bottom-color}",
      ].sort(),
    )
  })
})

describe('FP-02 ④：FP-03c / FP-04a / FP-04b 既有契约逐点复测', () => {
  it('FP-04a：滚动口层叠结果改为 auto（无溢出不占滚动条、溢出仍可滚），其余高度契约不变', () => {
    expect(层叠('overflow-y', ['biaodan-gundong'])).toBe('auto')
    expect(层叠('min-height', ['biaodan-gundong'])).toBe('0')
    expect(层叠('flex', ['biaodan-gundong'])).toBe('1')
    expect(
      层叠胜出(常档表, { 标签: 'div', 类: ['biaodan-gundong'], 属性: {} }, 'max-height'),
      '滚动口又长出局部高度上界',
    ).toBeNull()
  })

  it('FP-04b：字段间距仍吃派生令牌 --ziduan-jian-ju = calc(--jiange-da + --jiange-xiao)', () => {
    expect(层叠('margin-bottom', ['shuru-zu'])).toBe('var(--ziduan-jian-ju)')
    expect(层叠('--ziduan-jian-ju', ['shuru-zu'])).toBe(
      'calc(var(--jiange-da) + var(--jiange-xiao))',
    )
  })

  it('FP-03c：未聚焦输入框发丝线颜色仍吃 --renzheng-shuru-xian-se', () => {
    expect(层叠('border-bottom-color', ['fenlie-shuru'])).toBe('var(--renzheng-shuru-xian-se)')
  })

  it('切换不引入内联样式写点：两态来回后表单容器/滚动口仍零内联 style（FP-02 旧契约 + 无测量 hack）', async () => {
    const wrapper = await 挂载('dengLu')
    await 点标签(wrapper, 1)
    await 等待帧(8)
    await flushPromises()
    await 点标签(wrapper, 0)
    await 等待帧(8)
    await flushPromises()
    const 容器 = wrapper.find('.biaodan-rongqi').element as HTMLElement
    const 滚动 = wrapper.find('.biaodan-gundong').element as HTMLElement
    expect(容器.getAttribute('style'), '.biaodan-rongqi 被写入内联样式').toBeNull()
    expect(滚动.getAttribute('style'), '.biaodan-gundong 被写入内联样式').toBeNull()
    wrapper.unmount()
  })
})
