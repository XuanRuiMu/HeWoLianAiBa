import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 出生日期选择器 from '@/components/认证/出生日期选择器.vue'
import 登录内容 from '@/views/登录内容.vue'
import { huoQuFanYi, type FanYiZiJian } from '@/config/translations'
import { QIAN_TAI_DAI_MA, huoQuLianAiMa } from '@/config/前台错误码'
import { 按档解析全部, 声明位置, 求几何算式, 解析几何数值, 塌陷令牌清单 } from './主题令牌真源'
import { 拆分选择器组, 令牌名, 规则清单 } from './CSS级联真源'

/**
 * FP-14（需求 #13）+ FP-A2：自绘出生日期选择器 = 三段自绘旋钮 + 日历浮层，两个入口同一契约。
 *
 * 根因（用户已裁定）：原生 `input[type="date"]` 的分段占位（"yyyy/mm/日"）由 UA 决定，页面代码
 * 改不动 ⇒ 控件整只换掉。FP-A2 在此之上把形态升级为双入口，但**对外契约一个字没动**，本文件
 * 钉的就是"升级后仍然成立"的那几件事：
 *  ① 显示与外发口径：零填充 GB/T 7408-2005 扩展表示法 `YYYY-MM-DD`，两个入口写的是同一条外发通道；
 *  ② 三段键盘语义不回归：占位 / 上下键步进 / 翻页键翻年 / 左右键移段 / 越界只夹紧不产非法值；
 *  ③ 日历浮层七件事齐备：月网格、年月导航、min/max 钳制、今日标识、选中态、键盘无障碍、触屏可用，
 *     且深浅两档共用结构仅颜色不同、减动效归零；
 *  ④ 双向同步：v-model 同一字符串，三段定值后浮层跟着走，浮层选中后三段跟着走；
 *  ⑤ 未满 18 周岁硬拦截仍由 views/登录内容.vue 的 jiSuanZhouSui 判定，报错文案仍取既有翻译键；
 *  ⑥ 零硬编码：组件内零像素/零色值字面量、零用户可见硬编码文本，几何与颜色全部吃共用令牌。
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

const 段选择器 = {
  nian: '#zhuce-chushengriqi',
  yue: '#zhuce-chushengriqi-yue',
  ri: '#zhuce-chushengriqi-ri',
} as const

type 段名 = keyof typeof 段选择器

function 零填充(shu: number, weiShu: number): string {
  return String(shu).padStart(weiShu, '0')
}

function 本地日期串(d: Date): string {
  return `${d.getFullYear()}-${零填充(d.getMonth() + 1, 2)}-${零填充(d.getDate(), 2)}`
}

const 今天 = new Date()
const 今天串 = 本地日期串(今天)
const 今年 = 今天.getFullYear()
const 本月 = 今天.getMonth() + 1
/** 全部用例的 min/max 口径：与 views/登录内容.vue 传给组件的两个 prop 逐字一致 */
const 最小 = '1900-01-01'
const 最大 = 今天串

/** 与 登录内容.vue:857 的日期解析真源同一个正则——对外值格式漂移即红 */
const 扩展表示法 = /^(\d{4})-(\d{2})-(\d{2})$/

const 挂载中: VueWrapper[] = []

function 挂载控件(覆盖: Record<string, string> = {}): VueWrapper {
  const wrapper = mount(出生日期选择器, {
    props: {
      modelValue: '',
      idQianZhui: 'zhuce-chushengriqi',
      zuiXiao: 最小,
      zuiDa: 最大,
      ...覆盖,
    },
    attachTo: document.body,
  })
  挂载中.push(wrapper)
  return wrapper
}

function 段元素(wrapper: VueWrapper, ming: 段名): HTMLInputElement {
  return wrapper.find(段选择器[ming]).element as HTMLInputElement
}

function 段显示(wrapper: VueWrapper, ming: 段名): string {
  return 段元素(wrapper, ming).value
}

function 整串显示(wrapper: VueWrapper): string {
  return [...wrapper.element.childNodes]
    .map((节) => {
      if (节.nodeType !== 1) return ''
      const 元 = 节 as HTMLElement
      if (元.tagName === 'INPUT') {
        const 框 = 元 as HTMLInputElement
        return 框.value !== '' ? 框.value : (框.placeholder ?? '')
      }
      return 元.textContent ?? ''
    })
    .join('')
}

/** 录入一段：setValue 走真实 input 事件，再 blur 走失焦提交（与真人敲键盘同一条链） */
async function 录段(wrapper: VueWrapper, ming: 段名, wenBen: string): Promise<void> {
  await wrapper.find(段选择器[ming]).setValue(wenBen)
  await wrapper.find(段选择器[ming]).trigger('blur')
  await flushPromises()
}

async function 录整日(wrapper: VueWrapper, riQi: [string, string, string]): Promise<void> {
  await 录段(wrapper, 'nian', riQi[0])
  await 录段(wrapper, 'yue', riQi[1])
  await 录段(wrapper, 'ri', riQi[2])
}

function 最近外发(wrapper: VueWrapper): string {
  const 事件 = wrapper.emitted('update:modelValue') as unknown[][] | undefined
  if (!事件 || 事件.length === 0) return ''
  return String(事件[事件.length - 1][0])
}

async function 等一等(): Promise<void> {
  await flushPromises()
  await new Promise((解决) => setTimeout(解决, 0))
}

async function 挂载注册(): Promise<VueWrapper> {
  const 路由 = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/login', name: 'dengLu', component: 登录内容 },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  const 仓库 = (await import('@/stores/认证表单')).使用认证表单仓库()
  仓库.moShi = 'zhuCe'
  const wrapper = mount(登录内容, { global: { plugins: [pinia, 路由] }, attachTo: document.body })
  挂载中.push(wrapper)
  await 路由.isReady()
  await flushPromises()
  await wrapper.find('#zhuce-shoujihao').setValue('13800138000')
  await wrapper.find('#zhuce-yanzhengma').setValue('123456')
  await wrapper.find('#zhuce-yonghuming').setValue('测试用户')
  await wrapper.find('#zhuce-mima').setValue('password123')
  return wrapper
}

function 按年龄出生日期(岁: number): [string, string, string] {
  const d = new Date(今年 - 岁, 今天.getMonth(), 今天.getDate())
  const 串 = 本地日期串(d)
  return [串.slice(0, 4), 串.slice(5, 7), 串.slice(8, 10)] as [string, string, string]
}

/* ── 日历浮层取数口：浮层 Teleport 到 body，不在 wrapper.element 子树内，只能走 document ── */

function 浮层(): HTMLElement {
  const yuan = document.querySelector<HTMLElement>('.rili-tanchuang')
  expect(yuan, '日历浮层未挂载').not.toBeNull()
  return yuan as HTMLElement
}

function 浮层在(): boolean {
  return document.querySelector('.rili-tanchuang') !== null
}

function 日格们(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>('.rili-ri')]
}

function 年月文案(): string {
  return document.querySelector('.rili-nian-yue')?.textContent ?? ''
}

function 年月标题(): { nian: number; yue: number } {
  const 匹配 = /^(\d{4})(.+?)(\d{1,2})(.+)$/.exec(年月文案())
  expect(匹配, `年月文案读不出：${年月文案()}`).not.toBeNull()
  return { nian: Number(匹配![1]), yue: Number(匹配![3]) }
}

/** 日格 aria-label 形如「2026年3月7日」，今日格多一个「今天 」前缀 */
function 日格日期(ge: HTMLElement): { nian: number; yue: number; ri: number } {
  const 干净 = (ge.getAttribute('aria-label') ?? '').replace(`${huoQuFanYi('ui', 'riQiJinRi')} `, '')
  const 匹配 = /^(\d{4})(.+?)(\d{1,2})(.+?)(\d{1,2})(.+)$/.exec(干净)
  expect(匹配, `日格 aria-label 读不出：${干净}`).not.toBeNull()
  return { nian: Number(匹配![1]), yue: Number(匹配![3]), ri: Number(匹配![5]) }
}

function 日格串(riQi: { nian: number; yue: number; ri: number }): string {
  return `${零填充(riQi.nian, 4)}-${零填充(riQi.yue, 2)}-${零填充(riQi.ri, 2)}`
}

function 浮层钮(可及名: string): HTMLButtonElement {
  const 命中 = [...document.querySelectorAll<HTMLButtonElement>('.rili-tanchuang button')].find(
    (anNiu) =>
      anNiu.getAttribute('aria-label') === 可及名 || anNiu.textContent?.trim() === 可及名,
  )
  expect(命中, `浮层里找不到按钮：${可及名}`).toBeDefined()
  return 命中 as HTMLButtonElement
}

async function 打开浮层(wrapper: VueWrapper): Promise<void> {
  await wrapper.find('.rili-da-kai').trigger('click')
  await 等一等()
}

async function 敲键(目标: Element, 键: string, 附加: { shiftKey?: boolean } = {}): Promise<void> {
  目标.dispatchEvent(
    new KeyboardEvent('keydown', { key: 键, bubbles: true, cancelable: true, ...附加 }),
  )
  await 等一等()
}

function 光标格(): HTMLButtonElement {
  const 命中 = document.querySelector<HTMLButtonElement>('.rili-ri[data-jiao-dian="true"]')
  expect(命中, '浮层里没有键盘光标格').not.toBeNull()
  return 命中 as HTMLButtonElement
}

/** 浮层内当前可 Tab 到的按钮（与组件的焦点环绕同一口径：非 disabled 且 tabindex ≠ -1） */
function 可环绕钮们(): HTMLButtonElement[] {
  return [...浮层().querySelectorAll<HTMLButtonElement>('button:not([disabled])')].filter(
    (anNiu) => anNiu.tabIndex !== -1,
  )
}

/** 组件样式块取样口：多个 describe 都要读它，故提到模块级（样式纪律是跨判据的公共判据） */
const 组件路径 = resolve(__dirname, '../components/认证/出生日期选择器.vue')
const 组件源码 = readFileSync(组件路径, 'utf8')
const 样式段们 = [...组件源码.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((匹) => 匹[1])
const 净样式 = 样式段们[0].replace(/\/\*[\s\S]*?\*\//g, '')
const 组件规则 = 规则清单(净样式)

function 组件声明(简单选择器: string, 属性: string): string {
  const 值 = 组件声明可选(简单选择器, 属性)
  expect(值, `未找到 ${简单选择器} { ${属性} } 声明`).not.toBeUndefined()
  return 值 as string
}

/** 该声明**必须不存在**时用它：缺席本身就是判据（例如"日格不许排成纵向流"） */
function 组件声明可选(简单选择器: string, 属性: string): string | undefined {
  const 命中 = 组件规则
    .filter(
      (规则) =>
        规则.声明.has(属性) &&
        拆分选择器组(规则.选择器).some((串) => 串.trim() === 简单选择器),
    )
    .sort((甲, 乙) => 甲.序号 - 乙.序号)
  return 命中.length === 0 ? undefined : (命中[命中.length - 1].声明.get(属性) as string)
}

function 数字声明(声明: string, 属性: string): number {
  const 紧 = 声明.trim()
  // jsdom / 源码声明里的 var()/calc() 统一走求几何算式，parseFloat 只兜纯数字
  if (/var\(|calc\(/.test(紧)) return 求几何算式(紧)
  const 数 = Number.parseFloat(紧)
  expect(Number.isFinite(数), `${属性} 读不出数值（"${声明}"）`).toBe(true)
  return 数
}

/** 按空白拆 CSS 简写多值，但不拆开 calc()/var() 括号内的空格 */
function 拆简写值(声明: string): string[] {
  const 出: string[] = []
  let 深度 = 0
  let 当前 = ''
  for (const 字符 of 声明.trim()) {
    if (字符 === '(') 深度 += 1
    else if (字符 === ')') 深度 -= 1
    if (字符 === ' ' && 深度 === 0) {
      if (当前) 出.push(当前)
      当前 = ''
    } else 当前 += 字符
  }
  if (当前) 出.push(当前)
  return 出
}

function 去注释(源: string): string {
  return 源.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

afterEach(() => {
  while (挂载中.length > 0) 挂载中.pop()?.unmount()
  document.body.innerHTML = ''
})

describe('FP-14 ①：三段仍是零填充 YYYY-MM-DD，两入口同一条外发通道', () => {
  it('空态显示的就是 GB/T 7408 扩展表示法 YYYY-MM-DD，且页面上不再有原生 date 控件', () => {
    const wrapper = 挂载控件()
    expect(wrapper.find('input[type="date"]').exists(), '原生控件仍在，占位文案仍由 UA 决定').toBe(false)
    expect(wrapper.find(段选择器.nian).attributes('type')).toBe('text')
    expect(wrapper.find(段选择器.nian).attributes('placeholder')).toBe('YYYY')
    expect(wrapper.find(段选择器.yue).attributes('placeholder')).toBe('MM')
    expect(wrapper.find(段选择器.ri).attributes('placeholder')).toBe('DD')
    const 分隔 = wrapper.findAll('.fenge')
    expect(分隔).toHaveLength(2)
    expect(分隔.map((个) => 个.text()).join('')).toBe('--')
    expect(整串显示(wrapper)).toBe('YYYY-MM-DD')
  })

  it('单目录入后失焦即补零显示，对外值是零填充 YYYY-MM-DD', async () => {
    const wrapper = 挂载控件()
    await 录段(wrapper, 'nian', '1995')
    await 录段(wrapper, 'yue', '3')
    await 录段(wrapper, 'ri', '7')
    expect(段显示(wrapper, 'nian')).toBe('1995')
    expect(段显示(wrapper, 'yue'), '失焦后必须显示 03 而不是 3').toBe('03')
    expect(段显示(wrapper, 'ri'), '失焦后必须显示 07 而不是 7').toBe('07')
    expect(整串显示(wrapper)).toBe('1995-03-07')
    const 外发 = 最近外发(wrapper)
    expect(外发).toBe('1995-03-07')
    expect(扩展表示法.test(外发), `对外值与 登录内容.vue 的解析真源不同格式：${外发}`).toBe(true)
  })

  it('外部传入零填充值时三段按零填充回显（v-model 双向同一契约）', () => {
    const wrapper = 挂载控件({ modelValue: '1995-03-07' })
    expect(整串显示(wrapper)).toBe('1995-03-07')
  })

  it('位数录满即提交：不必失焦也能拿到完整值，且不录满就不外发日期', async () => {
    const wrapper = 挂载控件()
    await 录段(wrapper, 'nian', '1995')
    await wrapper.find(段选择器.yue).setValue('0')
    await flushPromises()
    expect(最近外发(wrapper), '月段只录了 1 位，不足以构成日期').toBe('')
    await wrapper.find(段选择器.yue).setValue('05')
    await flushPromises()
    expect(段显示(wrapper, 'yue')).toBe('05')
  })
})

describe('FP-14 ②：非法日期与越界只夹紧，不产出非法值；报错文案取既有键', () => {
  it('平年 2 月 30 日夹到 2 月 28 日，闰年 2 月 30 日夹到 2 月 29 日', async () => {
    const pingNian = 挂载控件()
    await 录整日(pingNian, ['2001', '02', '30'])
    expect(段显示(pingNian, 'ri')).toBe('28')
    expect(最近外发(pingNian)).toBe('2001-02-28')

    const runNian = 挂载控件()
    await 录整日(runNian, ['2000', '02', '30'])
    expect(段显示(runNian, 'ri')).toBe('29')
    expect(最近外发(runNian)).toBe('2000-02-29')
  })

  it('月份 19 越界夹到 12，月 0 夹到 1（1..12 之外不产出值）', async () => {
    const wrapper = 挂载控件()
    await 录段(wrapper, 'nian', '1995')
    await 录段(wrapper, 'yue', '19')
    expect(段显示(wrapper, 'yue')).toBe('12')
    await 录段(wrapper, 'yue', '0')
    expect(段显示(wrapper, 'yue')).toBe('01')
  })

  it('max=今天：三段都往过了敲，落点恰好是今天，永不产出明天的日期', async () => {
    const wrapper = 挂载控件()
    await 录段(wrapper, 'nian', '3000')
    expect(段显示(wrapper, 'nian'), '年段上界必须是今年（旧 max 属性的等价面）').toBe(String(今年))
    await 录段(wrapper, 'yue', '12')
    expect(段显示(wrapper, 'yue'), '今年之内月段上界必须是本月').toBe(零填充(本月, 2))
    await 录段(wrapper, 'ri', '31')
    expect(段显示(wrapper, 'ri'), '同年同月日段上界必须是今天').toBe(零填充(今天.getDate(), 2))
    expect(最近外发(wrapper)).toBe(今天串)
  })

  it('min=1900-01-01：更早一律落回 1900-01-01', async () => {
    const wrapper = 挂载控件()
    await 录段(wrapper, 'nian', '1899')
    expect(段显示(wrapper, 'nian')).toBe('1900')
    await 录段(wrapper, 'yue', '1')
    await 录段(wrapper, 'ri', '1')
    expect(最近外发(wrapper)).toBe('1900-01-01')
  })

  it('先敲日再改月导致日越界时，日段随当月天数收回（不残留 31 日）', async () => {
    const wrapper = 挂载控件()
    await 录段(wrapper, 'nian', '2001')
    await 录段(wrapper, 'yue', '01')
    await 录段(wrapper, 'ri', '31')
    expect(最近外发(wrapper)).toBe('2001-01-31')
    await 录段(wrapper, 'yue', '02')
    expect(段显示(wrapper, 'ri')).toBe('28')
    expect(最近外发(wrapper)).toBe('2001-02-28')
  })

  it('出生日期留空时提交注册走恋爱码错误出口且不发请求', async () => {
    const wrapper = await 挂载注册()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.qian-tai-cuo-wu-wen-an').text()).toBe(
      huoQuFanYi('lianAi', huoQuLianAiMa(QIAN_TAI_DAI_MA.REQUEST_PARAMETER_INVALID) as never),
    )
    expect(wrapper.find('.qian-tai-cuo-wu-lian-ai-ma').text()).toBe(
      huoQuLianAiMa(QIAN_TAI_DAI_MA.REQUEST_PARAMETER_INVALID),
    )
    expect(huoQuFanYi('renZheng', 'chuShengRiQiGeShiCuoWu')).toBe('请选择有效的出生日期')
    const { zhuCe } = await import('@/api/认证')
    expect(vi.mocked(zhuCe)).not.toHaveBeenCalled()
  })

  it('只录一半时 aria-invalid 报真、外发值仍为空（必填语义不被半成品绕过）', async () => {
    const wrapper = 挂载控件()
    expect(wrapper.find(段选择器.nian).attributes('aria-invalid'), '未触碰的必填框不该先报红').toBe('false')
    await 录段(wrapper, 'nian', '1995')
    expect(wrapper.find(段选择器.nian).attributes('aria-invalid')).toBe('true')
    expect(最近外发(wrapper)).toBe('')
    await 录整日(wrapper, ['1995', '03', '07'])
    expect(wrapper.find(段选择器.nian).attributes('aria-invalid')).toBe('false')
  })
})

describe('FP-14 ③：未满 18 周岁拦截不回归（判定仍归 登录内容.vue）', () => {
  it('17 岁 364 天：按钮禁用，提交路径走恋爱码错误出口，不发请求', async () => {
    const wrapper = await 挂载注册()
    const 差一天 = new Date(今年 - 18, 今天.getMonth(), 今天.getDate() + 1)
    const 串 = 本地日期串(差一天)
    await 录整日(wrapper, [串.slice(0, 4), 串.slice(5, 7), 串.slice(8, 10)])
    await wrapper.find('.xieyi-fuxuan input[type="checkbox"]').setValue(true)
    await flushPromises()
    expect(wrapper.find('form button[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.qian-tai-cuo-wu-wen-an').text()).toBe(
      huoQuFanYi('lianAi', huoQuLianAiMa(QIAN_TAI_DAI_MA.REQUEST_PARAMETER_INVALID) as never),
    )
    const { zhuCe } = await import('@/api/认证')
    expect(vi.mocked(zhuCe)).not.toHaveBeenCalled()
  })

  it('满 18 周岁当天：按钮可用', async () => {
    const wrapper = await 挂载注册()
    await 录整日(wrapper, 按年龄出生日期(18))
    await wrapper.find('.xieyi-fuxuan input[type="checkbox"]').setValue(true)
    await flushPromises()
    expect(wrapper.find('form button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('日历入口不得自带年龄判定：18 岁拦截的唯一判定点仍是 jiSuanZhouSui', () => {
    // 只按"年龄判定"这件事本身来判：组件里不得出现周年/年龄的任何计算或常量（SVG 路径里的
    // M18 之类与年龄无关，不在口径内），也不得引用登录内容页的判定常量名。注释里复述
    // "拦截归 登录内容.vue" 是设计说明不是判定，故先剥注释再判。
    const 脚本 = 组件源码.slice(
      组件源码.indexOf('<script'),
      组件源码.indexOf('</script>'),
    )
    expect(去注释(脚本), '年龄判定被复制进组件 = 第二处真源').not.toMatch(
      /ZHU_CE_ZUI_XIAO_NIAN_LING|[Zz]houSui|[Nn]ianLing/,
    )
    const 视图源码 = readFileSync(resolve(__dirname, '../views/登录内容.vue'), 'utf8')
    expect(视图源码).toMatch(/const ZHU_CE_ZUI_XIAO_NIAN_LING = 18/)
    expect(视图源码).toMatch(/jiSuanZhouSui\(zhuCeChuShengRiQi\.value\)/)
  })
})

describe('FP-14 ④：三段键盘语义（spinbutton）不回归', () => {
  it('三段按 年→月→日 顺序可聚焦，aria 角色/名称/边界齐备', () => {
    const wrapper = 挂载控件()
    const ids = wrapper.findAll('.duan-shuru').map((个) => 个.attributes('id'))
    expect(ids, 'DOM 顺序即 Tab 顺序，不得跳').toEqual([
      'zhuce-chushengriqi',
      'zhuce-chushengriqi-yue',
      'zhuce-chushengriqi-ri',
    ])
    const nian = wrapper.find(段选择器.nian)
    expect(nian.attributes('role')).toBe('spinbutton')
    expect(nian.attributes('aria-label')).toBe('YYYY')
    expect(nian.attributes('aria-required')).toBe('true')
    expect(nian.attributes('aria-valuemin')).toBe('1900')
    expect(nian.attributes('aria-valuemax')).toBe(String(今年))
    const 组 = wrapper.find('.chushengriqi')
    expect(组.attributes('role')).toBe('group')
    expect(组.attributes('aria-label')).toBe(huoQuFanYi('ui', 'chuShengRiQi'))
  })

  it('方向键在段内改值：空段先落到边界，之后按 1 步进并夹紧下界', async () => {
    const wrapper = 挂载控件()
    await wrapper.find(段选择器.nian).trigger('keydown', { key: 'ArrowUp' })
    await 等一等()
    expect(段显示(wrapper, 'nian')).toBe('1900')
    await wrapper.find(段选择器.nian).trigger('keydown', { key: 'ArrowUp' })
    await 等一等()
    expect(段显示(wrapper, 'nian')).toBe('1901')
    for (const _次 of [0, 1, 2]) {
      await wrapper.find(段选择器.nian).trigger('keydown', { key: 'ArrowDown' })
      await 等一等()
    }
    expect(段显示(wrapper, 'nian'), '不得越出 min=1900-01-01').toBe('1900')
  })

  it('年已定时月段上方向键走 01→02，日段按当月天数封顶（2 月按 29 天，闰年）', async () => {
    const wrapper = 挂载控件()
    await 录段(wrapper, 'nian', '2000')
    await wrapper.find(段选择器.yue).trigger('keydown', { key: 'ArrowUp' })
    await 等一等()
    expect(段显示(wrapper, 'yue')).toBe('01')
    await wrapper.find(段选择器.yue).trigger('keydown', { key: 'ArrowUp' })
    await 等一等()
    expect(段显示(wrapper, 'yue')).toBe('02')
    await wrapper.find(段选择器.ri).trigger('keydown', { key: 'ArrowDown' })
    await 等一等()
    expect(段显示(wrapper, 'ri'), '日段空值按下方向键必须落在当月最后一天，不能造出 2 月 31 日').toBe('29')
    expect(最近外发(wrapper), '封顶后的日期必须是真实日期').toBe('2000-02-29')
  })

  it('翻页键翻年：在月段按 PageUp 只动年段，焦点不离开月段', async () => {
    const wrapper = 挂载控件()
    await 录段(wrapper, 'nian', '1995')
    await 录段(wrapper, 'yue', '03')
    await wrapper.find(段选择器.yue).trigger('keydown', { key: 'PageUp' })
    await 等一等()
    expect(段显示(wrapper, 'nian'), 'PageUp 翻年').toBe('1996')
    expect(段显示(wrapper, 'yue'), '翻年不得改动月段').toBe('03')
    expect(document.activeElement?.id, '翻年后焦点必须仍留在原段').toBe('zhuce-chushengriqi-yue')
    await wrapper.find(段选择器.yue).trigger('keydown', { key: 'PageDown' })
    await 等一等()
    expect(段显示(wrapper, 'nian')).toBe('1995')
  })

  it('左右方向键在段间移动，端点不逃出控件', async () => {
    const wrapper = 挂载控件()
    段元素(wrapper, 'nian').focus()
    await wrapper.find(段选择器.nian).trigger('keydown', { key: 'ArrowRight' })
    await 等一等()
    expect(document.activeElement?.id).toBe('zhuce-chushengriqi-yue')
    await wrapper.find(段选择器.yue).trigger('keydown', { key: 'ArrowRight' })
    await 等一等()
    expect(document.activeElement?.id).toBe('zhuce-chushengriqi-ri')
    await wrapper.find(段选择器.ri).trigger('keydown', { key: 'ArrowRight' })
    await 等一等()
    expect(document.activeElement?.id, '日段右端点不得把焦点丢给页面上别的控件').toBe('zhuce-chushengriqi-ri')
    await wrapper.find(段选择器.ri).trigger('keydown', { key: 'ArrowLeft' })
    await 等一等()
    expect(document.activeElement?.id).toBe('zhuce-chushengriqi-yue')
  })

  it('点字段空白带即聚焦首个未填段（触屏下整只字段都是入口）', async () => {
    const wrapper = 挂载控件()
    await 录段(wrapper, 'nian', '1995')
    await wrapper.find('.chushengriqi').trigger('click')
    await 等一等()
    expect(document.activeElement?.id).toBe('zhuce-chushengriqi-yue')
  })

  it('日历钮自带 type=button：点它既不提交表单也不被字段的"聚焦首个空段"抢走', async () => {
    const wrapper = 挂载控件()
    const 钮 = wrapper.find('.rili-da-kai')
    expect(钮.attributes('type'), '缺 type=button ⇒ 点日历会提交注册表单').toBe('button')
    expect(钮.attributes('aria-haspopup')).toBe('dialog')
    await 钮.trigger('click')
    await 等一等()
    expect(浮层在()).toBe(true)
    expect(document.activeElement?.classList.contains('rili-ri'), '焦点被字段抢回三段了').toBe(true)
  })
})

describe('FP-A2 ⑤：日历浮层——月网格 / 年月导航 / min-max 钳制 / 今日标识 / 选中态', () => {
  it('触发钮与对话框的 aria 语义齐备，aria-expanded 随开合同步', async () => {
    const wrapper = 挂载控件({ modelValue: '1995-03-07' })
    const 钮 = wrapper.find('.rili-da-kai')
    expect(钮.attributes('aria-label')).toBe(huoQuFanYi('ui', 'riQiDaKai'))
    expect(钮.attributes('aria-expanded')).toBe('false')
    expect(浮层在()).toBe(false)

    await 打开浮层(wrapper)
    expect(钮.attributes('aria-expanded')).toBe('true')
    const 弹 = 浮层()
    expect(弹.getAttribute('role')).toBe('dialog')
    expect(弹.getAttribute('aria-modal')).toBe('true')
    expect(弹.getAttribute('aria-label')).toBe(huoQuFanYi('ui', 'riQiXuanZe'))
    expect(年月文案()).toBe('1995年3月')
    expect(年月标题()).toEqual({ nian: 1995, yue: 3 })

    await 浮层钮(huoQuFanYi('ui', 'riQiWanCheng')).click()
    await 等一等()
    expect(浮层在()).toBe(false)
    expect(钮.attributes('aria-expanded')).toBe('false')
  })

  it('网格恒为 6 行 × 7 列，周首是周一；每格都是 button 且带 gridcell 角色', async () => {
    const wrapper = 挂载控件({ modelValue: '2001-02-10' })
    await 打开浮层(wrapper)
    const 挂 = [...浮层().querySelectorAll<HTMLElement>('[role="row"]')]
    expect(挂, '1 个周名行 + 6 个日期行 = 7 行').toHaveLength(7)
    expect(浮层().querySelectorAll('[role="row"]:not(.rili-zhou-tou-hang)')).toHaveLength(6)
    expect(浮层().querySelectorAll('[role="columnheader"]')).toHaveLength(7)
    expect(
      [...浮层().querySelectorAll('[role="columnheader"]')].map((ge) => ge.textContent).join(''),
    ).toBe('一二三四五六日')
    for (const 列名 of 浮层().querySelectorAll('[role="columnheader"]')) {
      expect(列名.getAttribute('aria-label'), '短字「一」对读屏不可用，必须补全称').toMatch(
        /^星期.$/,
      )
    }
    const 格们 = 日格们()
    expect(格们).toHaveLength(42)
    for (const ge of 格们) {
      expect(ge.tagName).toBe('BUTTON')
      expect(ge.getAttribute('type'), '缺 type=button ⇒ 会提交注册表单').toBe('button')
      expect(ge.getAttribute('role')).toBe('gridcell')
      expect(ge.getAttribute('aria-label')).not.toBe('')
      expect([0, -1]).toContain(ge.tabIndex)
    }
    expect(格们.filter((ge) => ge.tabIndex === 0), '漫游 tabindex：恒有且仅有一个 tabindex=0').toHaveLength(1)
  })

  it('网格覆盖整月且只多出首尾补位格，不漏日不重日', async () => {
    const wrapper = 挂载控件({ modelValue: '2001-02-10' })
    await 打开浮层(wrapper)
    const 串们 = 日格们().map((ge) => 日格串(日格日期(ge)))
    expect(new Set(串们).size, '同一天在网格里出现两次').toBe(42)
    const fuWei = 日格们().filter((ge) => ge.classList.contains('rili-ri--fu-wei'))
    expect(new Set(fuWei.map((ge) => 日格日期(ge).yue)).size, '补位格只可能来自相邻两个月').toBe(2)
    expect(42 - fuWei.length, '本月 28 天，其余 14 格全是补位').toBe(28)
    for (let ri = 1; ri <= 28; ri++) {
      expect(串们).toContain(`2001-02-${零填充(ri, 2)}`)
    }
    // 补位格只降一档灰度、仍是可达落点：不并排 disabled 外观，权威判据是 aria-disabled
    for (const ge of fuWei) {
      const 在范围内 = 日格串(日格日期(ge)) >= 最小 && 日格串(日格日期(ge)) <= 最大
      expect(ge.getAttribute('aria-disabled') === 'true').toBe(!在范围内)
    }
  })

  it('年月导航：上月/下月/上一年/下一年四个按钮都生效，且标题跟着换', async () => {
    const wrapper = 挂载控件({ modelValue: '2001-06-15' })
    await 打开浮层(wrapper)

    await 浮层钮(huoQuFanYi('ui', 'riQiXiaYiYue')).click()
    await 等一等()
    expect(年月标题()).toEqual({ nian: 2001, yue: 7 })
    expect(document.activeElement?.getAttribute('data-jiao-dian'), '换月后焦点必须跟着光标走').toBe(
      'true',
    )
    expect(日格串(日格日期(光标格())), '换月保留日号（本月无 31 日则被夹到当月最后一天）').toBe(
      '2001-07-15',
    )

    await 浮层钮(huoQuFanYi('ui', 'riQiShangYiNian')).click()
    await 等一等()
    expect(年月标题()).toEqual({ nian: 2000, yue: 7 })
    await 浮层钮(huoQuFanYi('ui', 'riQiXiaYiNian')).click()
    await 等一等()
    expect(年月标题()).toEqual({ nian: 2001, yue: 7 })
  })

  it('min/max 钳制：年月到 min 边界时越界方向按钮 disabled', async () => {
    const wrapper = 挂载控件({ modelValue: 最小 })
    await 打开浮层(wrapper)
    expect(年月标题()).toEqual({ nian: 1900, yue: 1 })
    expect(浮层钮(huoQuFanYi('ui', 'riQiShangYiNian')).disabled).toBe(true)
    expect(浮层钮(huoQuFanYi('ui', 'riQiShangYiYue')).disabled).toBe(true)
    expect(浮层钮(huoQuFanYi('ui', 'riQiXiaYiNian')).disabled).toBe(false)
    expect(浮层钮(huoQuFanYi('ui', 'riQiXiaYiYue')).disabled).toBe(false)
  })

  it('min/max 钳制：年月到 max 边界时越界方向按钮 disabled', async () => {
    const wrapper = 挂载控件({ modelValue: 最大 })
    await 打开浮层(wrapper)
    expect(年月标题()).toEqual({ nian: 今年, yue: 本月 })
    expect(浮层钮(huoQuFanYi('ui', 'riQiXiaYiNian')).disabled).toBe(true)
    expect(浮层钮(huoQuFanYi('ui', 'riQiXiaYiYue')).disabled).toBe(true)
    expect(浮层钮(huoQuFanYi('ui', 'riQiShangYiNian')).disabled).toBe(false)
    expect(浮层钮(huoQuFanYi('ui', 'riQiShangYiYue')).disabled).toBe(false)
  })

  it('min/max 钳制：连点越界方向按钮也开不出非法年月（按钮禁用 + JS 侧仍夹一次）', async () => {
    const wrapper = 挂载控件({ modelValue: '1900-01-15' })
    await 打开浮层(wrapper)
    const 上月 = 浮层钮(huoQuFanYi('ui', 'riQiShangYiYue'))
    const 上年 = 浮层钮(huoQuFanYi('ui', 'riQiShangYiNian'))
    for (let ci = 0; ci < 3; ci++) {
      上月.click()
      上年.click()
      await 等一等()
    }
    expect(年月标题()).toEqual({ nian: 1900, yue: 1 })
    expect(日格串(日格日期(光标格())), '光标也不能被翻到 min 月之外').toBe('1900-01-15')
    expect(最近外发(wrapper), '只翻月不外发').toBe('')
  })

  it('min/max 钳制：越界日 aria-disabled 且点击不生效（不产出非法日期、浮层不误关）', async () => {
    const wrapper = 挂载控件({ modelValue: 最大 })
    await 打开浮层(wrapper)
    for (const ge of 日格们()) {
      const 应禁用 = 日格串(日格日期(ge)) > 最大
      expect(
        ge.getAttribute('aria-disabled') === 'true',
        `${日格串(日格日期(ge))} 的禁用态不对`,
      ).toBe(应禁用)
    }
    const 越界 = 日格们().find((ge) => ge.getAttribute('aria-disabled') === 'true')
    expect(越界, 'max=今天 ⇒ 网格里必然有越界日，判据不许空跑').toBeDefined()
    越界?.click()
    await 等一等()
    expect(最近外发(wrapper), '点了越界日却外发了值').toBe('')
    expect(浮层在(), '点了越界日却把浮层关了').toBe(true)
  })

  it('今日标识：当天格带 aria-current=date 与 .rili-ri--jin-ri，读屏名多出「今天」', async () => {
    const wrapper = 挂载控件({ modelValue: '1995-03-07' })
    await 打开浮层(wrapper)
    const jin = 日格们().filter((ge) => ge.getAttribute('aria-current') === 'date')
    expect(jin, '查看月不是本月时看不到今天标识').toHaveLength(0)
    const 头 = 浮层().querySelector<HTMLButtonElement>('.rili-jiao-bu-anniu')
    expect(头?.textContent?.trim()).toBe(huoQuFanYi('ui', 'riQiJinRi'))
    expect(头?.getAttribute('aria-label')).toBe(huoQuFanYi('ui', 'riQiHuiDaoJinRi'))
    await 头?.click()
    await 等一等()
    expect(年月标题()).toEqual({ nian: 今年, yue: 本月 })
    const jin格们 = 日格们().filter((ge) => ge.classList.contains('rili-ri--jin-ri'))
    expect(jin格们).toHaveLength(1)
    expect(jin格们[0].getAttribute('aria-current')).toBe('date')
    const 期望 = `${huoQuFanYi('ui', 'riQiJinRi')} ${今年}${huoQuFanYi('ui', 'riQiNian')}${本月}${huoQuFanYi('ui', 'riQiYue')}${今天.getDate()}${huoQuFanYi('ui', 'riQiRi')}`
    expect(jin格们[0].getAttribute('aria-label')).toBe(期望)
    expect(日格串(日格日期(jin格们[0]))).toBe(今天串)
  })

  it('选中态：只有当前值那一格 aria-selected=true，另有 6 个 false 而不是全部缺席', async () => {
    const wrapper = 挂载控件({ modelValue: '1995-03-07' })
    await 打开浮层(wrapper)
    const 选中 = 日格们().filter((ge) => ge.getAttribute('aria-selected') === 'true')
    expect(选中).toHaveLength(1)
    expect(选中[0].classList.contains('rili-ri--xuan-zhong')).toBe(true)
    expect(日格串(日格日期(选中[0]))).toBe('1995-03-07')
    expect(日格们().filter((ge) => ge.getAttribute('aria-selected') === 'false')).toHaveLength(41)
  })
})

describe('FP-A2 ⑥：日历键盘无障碍与触屏可用', () => {
  it('打开后焦点落在键盘光标格，Esc 关闭并把焦点还给触发钮', async () => {
    const wrapper = 挂载控件({ modelValue: '1995-03-07' })
    await 打开浮层(wrapper)
    expect(document.activeElement?.getAttribute('data-jiao-dian')).toBe('true')
    expect(日格串(日格日期(document.activeElement as HTMLElement))).toBe('1995-03-07')
    await 敲键(document.activeElement as Element, 'Escape')
    expect(浮层在()).toBe(false)
    expect(document.activeElement?.classList.contains('rili-da-kai'), '关闭后焦点必须回到触发钮').toBe(
      true,
    )
  })

  it('方向键换日/换周，Home/End 到本月首末日，越界自动夹回范围内', async () => {
    const wrapper = 挂载控件({ modelValue: '2001-02-14' })
    await 打开浮层(wrapper)
    const 起 = 光标格()
    起.focus()

    await 敲键(起, 'ArrowRight')
    expect(日格串(日格日期(document.activeElement as HTMLElement))).toBe('2001-02-15')
    await 敲键(document.activeElement as Element, 'ArrowDown')
    expect(日格串(日格日期(document.activeElement as HTMLElement))).toBe('2001-02-22')
    await 敲键(document.activeElement as Element, 'ArrowUp')
    expect(日格串(日格日期(document.activeElement as HTMLElement))).toBe('2001-02-15')
    await 敲键(document.activeElement as Element, 'ArrowLeft')
    expect(日格串(日格日期(document.activeElement as HTMLElement))).toBe('2001-02-14')

    await 敲键(document.activeElement as Element, 'Home')
    expect(日格串(日格日期(document.activeElement as HTMLElement))).toBe('2001-02-01')
    await 敲键(document.activeElement as Element, 'End')
    expect(日格串(日格日期(document.activeElement as HTMLElement))).toBe('2001-02-28')
  })

  it('键盘光标撞 min 时夹回边界当天，绝不跑到范围外去', async () => {
    const wrapper = 挂载控件({ modelValue: '2001-01-10', zuiXiao: '2001-01-10' })
    await 打开浮层(wrapper)
    光标格().focus()
    await 敲键(document.activeElement as Element, 'ArrowUp')
    expect(日格串(日格日期(document.activeElement as HTMLElement)), '越过 min 后必须停在 min 当天').toBe(
      '2001-01-10',
    )
    await 敲键(document.activeElement as Element, 'ArrowLeft')
    expect(日格串(日格日期(document.activeElement as HTMLElement))).toBe('2001-01-10')
    await 敲键(document.activeElement as Element, 'PageUp')
    expect(年月标题(), '翻月撞 min 后查看月也夹回 min 月').toEqual({ nian: 2001, yue: 1 })
    expect(日格串(日格日期(document.activeElement as HTMLElement))).toBe('2001-01-10')
    await 敲键(document.activeElement as Element, 'Home')
    expect(日格串(日格日期(document.activeElement as HTMLElement)), '首末日键同样被 min 夹住').toBe(
      '2001-01-10',
    )
  })

  it('键盘光标撞 max 时夹回边界当天，绝不跑到范围外去', async () => {
    const wrapper = 挂载控件({ modelValue: '2001-03-20', zuiDa: '2001-03-20' })
    await 打开浮层(wrapper)
    光标格().focus()
    await 敲键(document.activeElement as Element, 'ArrowDown')
    expect(日格串(日格日期(document.activeElement as HTMLElement)), '越过 max 后必须停在 max 当天').toBe(
      '2001-03-20',
    )
    await 敲键(document.activeElement as Element, 'ArrowRight')
    expect(日格串(日格日期(document.activeElement as HTMLElement))).toBe('2001-03-20')
    await 敲键(document.activeElement as Element, 'End')
    expect(日格串(日格日期(document.activeElement as HTMLElement)), '末日键同样被 max 夹住').toBe(
      '2001-03-20',
    )
  })

  it('翻页键换月、Shift+翻页键换年，日期在 2 月底被夹到当月最后一天而非溢出', async () => {
    const wrapper = 挂载控件({ modelValue: '2001-01-31' })
    await 打开浮层(wrapper)
    const 起 = 光标格()
    起.focus()
    await 敲键(起, 'PageDown')
    expect(年月标题()).toEqual({ nian: 2001, yue: 2 })
    expect(日格串(日格日期(document.activeElement as HTMLElement)), '1 月 31 日翻到 2 月必须夹成 2 月 28 日').toBe(
      '2001-02-28',
    )
    await 敲键(document.activeElement as Element, 'PageDown', { shiftKey: true })
    expect(年月标题()).toEqual({ nian: 2002, yue: 2 })
    expect(日格串(日格日期(document.activeElement as HTMLElement))).toBe('2002-02-28')
  })

  it('Tab 与 Shift+Tab 在浮层内闭环，焦点跑不到遮罩外的注册表单上', async () => {
    const wrapper = 挂载控件({ modelValue: '2001-06-15' })
    await 打开浮层(wrapper)
    const 环 = 可环绕钮们()
    expect(环.length, '四个年月导航钮 + 光标格 + 今天 + 完成 = 7').toBe(7)
    expect(环[0].getAttribute('aria-label')).toBe(huoQuFanYi('ui', 'riQiShangYiNian'))
    expect(环[环.length - 1].textContent).toBe(huoQuFanYi('ui', 'riQiWanCheng'))

    环[环.length - 1].focus()
    await 敲键(环[环.length - 1], 'Tab')
    expect(document.activeElement, '末位 Tab 必须绕回首项').toBe(环[0])
    await 敲键(环[0], 'Tab', { shiftKey: true })
    expect(document.activeElement, '首位 Shift+Tab 必须绕回末项').toBe(环[环.length - 1])
    expect(document.activeElement?.closest('.rili-tanchuang')).not.toBeNull()
  })

  it('方向键只在日格上生效：焦点在年月导航钮时不换日（日历钮是按钮不是日期格）', async () => {
    const wrapper = 挂载控件({ modelValue: '2001-06-15' })
    await 打开浮层(wrapper)
    const 下一月 = 浮层钮(huoQuFanYi('ui', 'riQiXiaYiYue'))
    下一月.focus()
    const 换月前 = 年月标题()
    await 敲键(下一月, 'ArrowRight')
    expect(年月标题(), '方向键把导航钮当成了日格').toEqual(换月前)
    expect(document.activeElement, '焦点被拽进网格了').toBe(下一月)
  })

  it('日格是真 button ⇒ Enter/Space 由浏览器派发 click 走同一条选中链（jsdom 不合成，故断言点击路径）', async () => {
    const wrapper = 挂载控件({ modelValue: '2001-06-15' })
    await 打开浮层(wrapper)
    const 目标 = 日格们().find((ge) => 日格串(日格日期(ge)) === '2001-06-18')
    expect(目标).toBeDefined()
    目标?.focus()
    目标?.click()
    await 等一等()
    expect(最近外发(wrapper)).toBe('2001-06-18')
    expect(段显示(wrapper, 'nian')).toBe('2001')
    expect(段显示(wrapper, 'yue')).toBe('06')
    expect(段显示(wrapper, 'ri')).toBe('18')
    expect(浮层在()).toBe(false)
  })

  it('遮罩空白处点击也关闭浮层（点外即取消）', async () => {
    const wrapper = 挂载控件({ modelValue: '2001-06-15' })
    await 打开浮层(wrapper)
    const 遮罩 = document.querySelector<HTMLElement>('.rili-zhe-zhao')
    expect(遮罩).not.toBeNull()
    遮罩?.click()
    await 等一等()
    expect(浮层在()).toBe(false)
  })

  it('触屏可用：浮层内每个可点元素都不小于 24px 触控下限，且状态不靠悬停才可辨', () => {
    const 格边长 = 解析几何数值('--rili-ri-ge-kuan')
    const 钮边长 = 解析几何数值('--rili-anniu-chicun')
    const 触控下限 = 24
    expect(格边长, '日格低于触控下限').toBeGreaterThanOrEqual(触控下限)
    expect(钮边长, '日历内方形按钮低于触控下限').toBeGreaterThanOrEqual(触控下限)
    expect(格边长, '日格与导航钮必须方形同边长，否则网格列宽与命中区脱节').toBe(32)
    expect(钮边长).toBe(36)

    // 触屏没有 hover：选中态与今日标识的规则都不得挂在 :hover 上，
    // 那样在真机上就只剩一片"看上去都一样"的灰格
    const 状态选择器 = [
      '.rili-ri--xuan-zhong',
      '.rili-ri--jin-ri',
      '.rili-ri--fu-wei',
      ".rili-ri[aria-disabled='true']",
    ]
    for (const 样式段 of 样式段们) {
      const 净 = 样式段.replace(/\/\*[\s\S]*?\*\//g, '')
      for (const 规则 of 规则清单(净)) {
        for (const 串 of 拆分选择器组(规则.选择器)) {
          if (状态选择器.includes(串.trim())) {
            expect(串, `${串.trim()} 挂在悬停上 = 触屏不可辨`).not.toMatch(/:hover/)
          }
        }
      }
    }
  })
})

describe('FP-A2 ⑦：三段与日历双向同步，v-model 始终是同一个字符串', () => {
  it('三段定值后打开浮层：查看月、选中态、键盘光标三者都已是该值', async () => {
    const wrapper = 挂载控件()
    await 录整日(wrapper, ['2001', '02', '28'])
    await 打开浮层(wrapper)
    expect(年月标题()).toEqual({ nian: 2001, yue: 2 })
    const 选中 = 日格们().find((ge) => ge.getAttribute('aria-selected') === 'true')
    expect(日格串(日格日期(选中 as HTMLButtonElement))).toBe('2001-02-28')
    expect(日格串(日格日期(光标格()))).toBe('2001-02-28')
    expect(最近外发(wrapper), '浮层开关不得改写 v-model').toBe('2001-02-28')
  })

  it('浮层选中后三段零填充回显、外发同串、浮层收起', async () => {
    const wrapper = 挂载控件({ modelValue: '2001-06-15' })
    await 打开浮层(wrapper)
    const 目标 = 日格们().find((ge) => 日格串(日格日期(ge)) === '2001-06-03')
    目标?.click()
    await 等一等()
    expect(整串显示(wrapper)).toBe('2001-06-03')
    expect(最近外发(wrapper)).toBe('2001-06-03')
    expect(浮层在()).toBe(false)
  })

  it('浮层侧对 min 生效：min 当天可选可提交，且不产出边界之外的日期', async () => {
    const wrapper = 挂载控件({ modelValue: '1900-01-15' })
    await 打开浮层(wrapper)
    const 头一天 = 日格们().find((ge) => 日格串(日格日期(ge)) === 最小)
    expect(头一天, 'min 当天必须出现在网格里').toBeDefined()
    expect(头一天?.getAttribute('aria-disabled'), 'min 当天必须可选').toBeNull()
    头一天?.click()
    await 等一等()
    expect(最近外发(wrapper)).toBe(最小)
    expect(整串显示(wrapper)).toBe(最小)
  })

  it('浮层侧对 max 生效：max 当天可选，往后一天即越界不可选', async () => {
    const wrapper = 挂载控件({ modelValue: 最大 })
    await 打开浮层(wrapper)
    const 当天 = 日格们().find((ge) => 日格串(日格日期(ge)) === 最大)
    expect(当天?.getAttribute('aria-disabled'), 'max 当天必须可选').toBeNull()
    const 往后 = [...日格们()]
      .map((ge) => ({ ge, 串: 日格串(日格日期(ge)) }))
      .filter((项) => 项.串 > 最大)
      .sort((甲, 乙) => (甲.串 < 乙.串 ? -1 : 1))[0]
    expect(往后?.ge.getAttribute('aria-disabled'), `${往后?.串} 已越过 max`).toBe('true')
  })

  it('外部改 v-model 后浮层重新打开时跟着走（父级是唯一真源，浮层不留私货）', async () => {
    const wrapper = 挂载控件({ modelValue: '1995-03-07' })
    await wrapper.setProps({ modelValue: '1988-12-31' })
    await flushPromises()
    expect(整串显示(wrapper)).toBe('1988-12-31')
    await 打开浮层(wrapper)
    expect(年月标题()).toEqual({ nian: 1988, yue: 12 })
    const 选中 = 日格们().find((ge) => ge.getAttribute('aria-selected') === 'true')
    expect(日格串(日格日期(选中 as HTMLButtonElement))).toBe('1988-12-31')
  })
})

describe('FP-A2 ⑧：翻译键齐全、组件模板零硬编码玩家可见文本', () => {
  it('日历的 26 枚翻译键逐字钉住取值（键接错线 / 漏一个键 / 串成别的语义都在这里红）', () => {
    const 期望表: [FanYiZiJian<'ui'>, string][] = [
      ['riQiDaKai', '打开日历'],
      ['riQiXuanZe', '选择出生日期'],
      ['riQiShangYiNian', '上一年'],
      ['riQiXiaYiNian', '下一年'],
      ['riQiShangYiYue', '上一月'],
      ['riQiXiaYiYue', '下一月'],
      ['riQiJinRi', '今天'],
      ['riQiHuiDaoJinRi', '回到今天'],
      ['riQiWanCheng', '完成'],
      ['riQiNian', '年'],
      ['riQiYue', '月'],
      ['riQiRi', '日'],
      ['xingQiYi', '一'],
      ['xingQiEr', '二'],
      ['xingQiSan', '三'],
      ['xingQiSi', '四'],
      ['xingQiWu', '五'],
      ['xingQiLiu', '六'],
      ['xingQiRi', '日'],
      ['xingQiYiMing', '星期一'],
      ['xingQiErMing', '星期二'],
      ['xingQiSanMing', '星期三'],
      ['xingQiSiMing', '星期四'],
      ['xingQiWuMing', '星期五'],
      ['xingQiLiuMing', '星期六'],
      ['xingQiRiMing', '星期日'],
    ]
    expect(期望表.length, '键数变了，先复核键表再改断言').toBe(26)
    for (const [键, 期望] of 期望表) {
      expect(huoQuFanYi('ui', 键), `翻译键 ui.${键} 的取值不对`).toBe(期望)
    }
  })

  it('组件模板内零 CJK 汉字：用户可见文本只能来自 translations', () => {
    const 源码 = readFileSync(resolve(__dirname, '../components/认证/出生日期选择器.vue'), 'utf8')
    const 模板段 = 源码.slice(源码.indexOf('<template'), 源码.indexOf('</template>') + 11)
    expect(模板段, '模板里出现硬编码汉字').not.toMatch(/[\u4e00-\u9fff]/)
  })

  it('控制台 0 error 0 warn：三段录入 → 开浮层 → 键盘翻月跨周 → 选中 → 再开再关，全程无 Vue 告警', async () => {
    const 收cuoWu = vi.spyOn(console, 'error').mockImplementation(() => {})
    const 收JingGao = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const wrapper = 挂载控件()
      await 录整日(wrapper, ['2001', '02', '28'])
      await 打开浮层(wrapper)
      expect(日格们()).toHaveLength(42)
      await 敲键(光标格(), 'PageDown')
      expect(年月标题()).toEqual({ nian: 2001, yue: 3 })
      await 敲键(document.activeElement as Element, 'ArrowDown')
      expect(年月标题(), '跨月后查看月跟着光标走').toEqual({ nian: 2001, yue: 4 })
      await 敲键(document.activeElement as Element, 'End')
      expect(日格串(日格日期(光标格()))).toBe('2001-04-30')
      光标格().click()
      await 等一等()
      expect(浮层在()).toBe(false)
      expect(最近外发(wrapper)).toBe('2001-04-30')

      await 打开浮层(wrapper)
      await 敲键(document.activeElement as Element, 'Escape')
      expect(浮层在()).toBe(false)

      const 出错 = 收cuoWu.mock.calls.map((行) => 行.map((项) => String(项)).join(' ')).join(' ｜ ')
      const 警告 = 收JingGao.mock.calls.map((行) => 行.map((项) => String(项)).join(' ')).join(' ｜ ')
      expect(出错, '控制台出现 error').toBe('')
      expect(警告, '控制台出现 warn').toBe('')
    } finally {
      收cuoWu.mockRestore()
      收JingGao.mockRestore()
    }
  })
})

describe('FP-14 ⑨ / FP-A2 ⑨：几何与颜色零硬编码，令牌成对且唯一消费者', () => {
  it('组件只有一块 <style>（取样口径的前提），块内零像素/零色值字面量', () => {
    expect(样式段们.length, '组件的 <style> 块数量变了，取样口径需复核').toBe(1)
    const 命中 = [
      ...净样式.matchAll(/[-+]?\d*\.?\d+(px|rem|em|ch|vh|vw|pt|pc)/gi),
      ...净样式.matchAll(/#[0-9a-fA-F]{3,8}\b/g),
      ...净样式.matchAll(/\b(?:rgb|rgba|hsl|hsla)\s*\(/gi),
    ].map((匹) => 匹[0])
    expect(命中, `组件自带字面量 ⇒ 第二真源：${命中.join(' / ')}`).toEqual([])
    expect(净样式, '颜色只能靠继承宿主 .fenlie-shuru 与既有令牌').not.toMatch(/color-scheme/)
  })

  it('组件不自写焦点环与阴影环——焦点反馈仍由 global.css 的 --jujiao-huan-* 单一真源给', () => {
    const 环声明 = 组件规则.flatMap((规则) =>
      [...规则.声明].filter(([属性]) => /^outline/.test(属性) || 属性 === 'box-shadow').map(([属性, 值]) => `${属性}:${值}`),
    )
    expect(环声明).toEqual([])
  })

  it('减动效归零：组件内零 transition / 零 animation / 零 @keyframes / 零 <Transition>', () => {
    expect(净样式, '日历带进了动效').not.toMatch(/transition|animation|@keyframes/i)
    expect(组件源码, '组件挂了 <Transition>（开合必须是瞬时换面）').not.toMatch(/<Transition|<transition/i)
  })

  it('深浅两档共用结构：组件内零主题分支，且每条颜色声明都吃两档共有的令牌', () => {
    expect(净样式, '组件内出现主题分支 = 两档结构不同构').not.toMatch(/data-theme|\[data-theme|prefers-color-scheme/)
    const 颜色属性 = ['color', 'background-color', 'background', 'border-color', 'border', 'fill', 'stroke', 'opacity']
    const 消费令牌 = new Set<string>()
    for (const 规则 of 组件规则) {
      for (const [属性, 值] of 规则.声明) {
        if (!颜色属性.includes(属性)) continue
        if (值 === 'inherit' || 值 === 'transparent' || 值 === 'none') continue
        for (const 匹 of 值.matchAll(/var\(\s*(--[A-Za-z0-9-]+)\s*\)/g)) 消费令牌.add(匹[1])
      }
    }
    expect(消费令牌.size, '日历的颜色令牌太少，说明有硬编码漏网').toBeGreaterThanOrEqual(7)
    const 塌陷 = 塌陷令牌清单()
    for (const 名 of 消费令牌) {
      expect(塌陷.includes(名), `${名} 单侧声明，另一档塌陷 ⇒ 两档不同构`).toBe(false)
      const 两档 = [按档解析全部('light'), 按档解析全部('dark')]
      for (const 表 of 两档) expect(表.has(名), `${名} 在某一档解析不出`).toBe(true)
    }
    expect(消费令牌.has('--rili-zhe-zhao-beijing')).toBe(true)
  })

  it('段宽吃 --rili-* 令牌：声明里不含数字，解析值等于共用 :root 真源', () => {
    const 年声明 = 组件声明('.duan-shuru--nian', 'width')
    const 二维声明 = 组件声明('.duan-shuru', 'width')
    expect(令牌名(年声明, 'width')).toBe('--rili-nian-kuan')
    expect(令牌名(二维声明, 'width')).toBe('--rili-erwei-kuan')
    expect(年声明).not.toMatch(/\d/)
    expect(二维声明).not.toMatch(/\d/)
    expect(求几何算式(年声明)).toBe(解析几何数值('--rili-nian-kuan'))
    expect(求几何算式(二维声明)).toBe(解析几何数值('--rili-erwei-kuan'))
  })

  it('日历几何：总宽由日格 × 7 + 间距 × 6 + 内边距 × 2 求成，日格/按钮/圆角/今日点各吃一枚令牌', () => {
    const 总宽声明 = 组件声明('.rili-tanchuang', 'width')
    expect(令牌名(总宽声明, 'width')).toBe('--rili-tanchuang-kuan')
    expect(求几何算式(总宽声明)).toBe(解析几何数值('--rili-tanchuang-kuan'))
    // 派生关系在令牌定义处（组件只准引用），故判据读 variables.css 的算式本体
    const 算式 = 按档解析全部('light').get('--rili-tanchuang-kuan') as string
    expect(算式, '总宽不再由日格数列求成').toMatch(
      /var\(--rili-ri-ge-kuan\)\s*\*\s*7\s*\+\s*var\(--rili-tanchuang-zhou-ju\)\s*\*\s*6\s*\+\s*var\(--rili-tanchuang-nei-pad\)\s*\*\s*2/,
    )
    expect(解析几何数值('--rili-tanchuang-kuan')).toBe(
      7 * 解析几何数值('--rili-ri-ge-kuan') +
        6 * 解析几何数值('--rili-tanchuang-zhou-ju') +
        2 * 解析几何数值('--rili-tanchuang-nei-pad'),
    )

    for (const [选择器, 属性, 令牌] of [
      ['.rili-ri', 'height', '--rili-ri-ge-kuan'],
      ['.rili-ri', 'border-radius', '--rili-tanchuang-yuan-jiao'],
      ['.rili-zhou-tou', 'height', '--rili-ri-ge-kuan'],
      ['.rili-anniu', 'width', '--rili-anniu-chicun'],
      ['.rili-anniu', 'height', '--rili-anniu-chicun'],
      ['.rili-da-kai', 'width', '--rili-anniu-chicun'],
      ['.rili-da-kai', 'height', '--rili-anniu-chicun'],
      ['.rili-jiao-bu-anniu', 'height', '--rili-anniu-chicun'],
      ['.rili-ri--jin-ri::after', 'width', '--rili-jin-ri-dian'],
      ['.rili-ri--jin-ri::after', 'height', '--rili-jin-ri-dian'],
      ['.rili-ge', 'gap', '--rili-tanchuang-zhou-ju'],
      ['.rili-tanchuang', 'padding', '--rili-tanchuang-nei-pad'],
      ['.rili-tanchuang', 'border-radius', '--rili-tanchuang-yuan-jiao'],
      ['.rili-zhe-zhao', 'padding', '--rili-tanchuang-nei-pad'],
      ['.rili-zhe-zhao', 'z-index', '--ceng-rili'],
    ] as const) {
      const 声明 = 组件声明(选择器, 属性)
      expect(令牌名(声明, 属性), `${选择器} { ${属性}: ${声明} }`).toBe(令牌)
    }
  })

  it('日历新令牌只住共用 :root 块、深浅两档同值、且唯一消费者是本组件', () => {
    const 新几何 = [
      '--rili-tanchuang-nei-pad',
      '--rili-tanchuang-zhou-ju',
      '--rili-tanchuang-yuan-jiao',
      '--rili-ri-ge-kuan',
      '--rili-anniu-chicun',
      '--rili-jin-ri-dian',
      '--rili-tanchuang-kuan',
      '--rili-nian-kuan',
      '--rili-erwei-kuan',
      '--ceng-rili',
    ]
    for (const 名 of 新几何) {
      expect(声明位置(名), `${名} 写进单侧主题块会让另一档塌陷`).toEqual({
        共用: true,
        浅色: false,
        深色: false,
      })
    }
    const 两档 = [按档解析全部('light'), 按档解析全部('dark')]
    for (const 名 of 新几何) {
      const 值 = 两档.map((表) => 表.get(名))
      expect(值[0], `${名} 浅色档未定义`).toBeTruthy()
      expect(值[1], `${名} 深浅两档取值不等 ⇒ 另一档塌陷`).toBe(值[0])
    }
    const 源码根 = resolve(__dirname, '..')
    function 遍历(dir: string, 累加: string[] = []): string[] {
      for (const 项 of readdirSync(dir, { withFileTypes: true })) {
        const 全路径 = join(dir, 项.name)
        if (项.isDirectory()) {
          if (项.name === 'node_modules') continue
          遍历(全路径, 累加)
        } else if (/\.(css|vue|ts)$/.test(项.name) && !全路径.includes('__tests__')) {
          累加.push(全路径)
        }
      }
      return 累加
    }
    // 令牌定义所在的 variables.css 不算消费者：--rili-tanchuang-kuan 由 --rili-tanchuang-nei-pad
    // 求成，定义文件里必然出现 var(--rili-tanchuang-nei-pad)，那不是"第二个消费点"
    const 全源 = 遍历(源码根).filter((路径) => !路径.endsWith(join('styles', 'variables.css')))
    for (const 名 of 新几何) {
      const 消费者 = 全源
        .filter((路径) => 路径 !== 组件路径)
        .filter((路径) => readFileSync(路径, 'utf8').includes(`var(${名})`))
        .map((路径) => 路径.slice(源码根.length + 1).replace(/\\/g, '/'))
        .sort()
      expect(消费者, `${名} 出现第二消费者 ⇒ 唯一消费者登记失效`).toEqual([])
    }
  })

  it('今日圆点绝对定位：带点那一格的数字不被顶高，整张网格数字同基线', () => {
    expect(组件声明('.rili-ri--jin-ri::after', 'position')).toBe('absolute')
    expect(组件声明('.rili-ri--jin-ri::after', 'bottom')).toBe('var(--rili-tanchuang-zhou-ju)')
    // 日格本体只做单行居中：一旦改成纵向流，今日圆点会把该格数字顶上去，网格就花了
    expect(组件声明可选('.rili-ri', 'flex-direction'), '.rili-ri 排成了纵向流').toBeUndefined()
    expect(组件声明('.rili-ri', 'align-items')).toBe('center')
    expect(组件声明('.rili-ri', 'position')).toBe('relative')
  })

  it('浮层层级：日历落在 协议 与 多媒体授权 之间，不改既有任何相对序', () => {
    const 档位 = (名: string): number => {
      const 值 = 按档解析全部('light').get(`--${名}`)
      expect(值, `层级令牌 --${名} 未定义`).toBeDefined()
      return Number(值)
    }
    expect(档位('ceng-rili')).toBeGreaterThan(档位('ceng-xieyi'))
    expect(档位('ceng-rili')).toBeLessThan(档位('ceng-shouquan'))
    for (const [低, 高] of [
      // --ceng-tonghua 已随 FP-G 删除定义（FP-H 删通话链后零消费者），层级序自此自 军师抽屉 起
      ['ceng-junshi', 'ceng-junshi-jilu'],
      ['ceng-junshi-jilu', 'ceng-xieyi'],
      ['ceng-shouquan', 'ceng-tiaoshi-riji'],
      ['ceng-tiaoshi-riji', 'ceng-tiaoshi-mianban'],
      ['ceng-tiaoshi-mianban', 'ceng-duanwang'],
      ['ceng-duanwang', 'ceng-banben'],
    ] as const) {
      expect(档位(高), `${高} 必须仍高于 ${低}`).toBeGreaterThan(档位(低))
    }
  })

  it('遮罩色深浅成对、两档取值不等（同一 alpha 压在浅底与深底上不是一个可辨的遮罩）', () => {
    const 名 = '--rili-zhe-zhao-beijing'
    expect(声明位置(名)).toEqual({ 共用: false, 浅色: true, 深色: true })
    const 浅 = 按档解析全部('light').get(名)
    const 深 = 按档解析全部('dark').get(名)
    expect(浅).toBeTruthy()
    expect(深).toBeTruthy()
    expect(浅).not.toBe(深)
  })

  it('段宽解析值不小于触控下限，且最窄取证档下三段加分隔符加日历钮不溢出', () => {
    const 年宽 = 解析几何数值('--rili-nian-kuan')
    const 二维宽 = 解析几何数值('--rili-erwei-kuan')
    const 触控下限 = 24
    expect(年宽, '年段要容 4 位数字').toBe(44)
    expect(二维宽).toBe(26)
    for (const [名, 宽] of [
      ['--rili-nian-kuan', 年宽],
      ['--rili-erwei-kuan', 二维宽],
    ] as const) {
      expect(宽, `${名} = ${宽}px 低于 ${触控下限}px 触控下限`).toBeGreaterThanOrEqual(触控下限)
    }

    const 视图样式全源 = readFileSync(resolve(__dirname, '../views/登录内容.vue'), 'utf8')
    const 视图样式段 = [...视图样式全源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((匹) => 匹[1])
    expect(视图样式段.length, '登录内容.vue 的 <style> 块数量变了，取样口径需复核').toBe(1)
    const 视图样式 = 视图样式段[0].replace(/\/\*[\s\S]*?\*\//g, '')
    const 视图规则 = 规则清单(视图样式)
    function 视图声明(选择器: string, 属性: string): string {
      const 命中 = 视图规则
        .filter((规则) => 规则.声明.has(属性) && 规则.选择器.trim() === 选择器)
        .sort((甲, 乙) => 甲.序号 - 乙.序号)
      expect(命中.length, `未找到 ${选择器} { ${属性} }`).toBeGreaterThan(0)
      return 命中[命中.length - 1].声明.get(属性) as string
    }
    /** 四层盒：视口 → .denglu-neirong 左右内边距 → .biaodan-rongqi 左右内边距 + 左右边框 */
    const 水平内边距 = (声明: string, 属性: string): number => {
      const 值 = 拆简写值(声明.trim()).map((段) => 数字声明(段, 属性))
      if (值.length === 1) return 值[0]
      return 值[1]
    }
    const 字段可用宽 = (视口: number): number =>
      视口 -
      2 * 水平内边距(视图声明('.denglu-neirong', 'padding'), 'padding') -
      2 * 水平内边距(视图声明('.biaodan-rongqi', 'padding'), 'padding') -
      2 * 数字声明(视图声明('.biaodan-rongqi', 'border'), 'border')

    const 字号 = 数字声明(视图声明('.fenlie-shuru', 'font-size'), 'font-size')
    const 环宽 = 解析几何数值('--jujiao-huan-kuan-du-wenben')
    const 日历钮 = 解析几何数值('--rili-anniu-chicun')
    /** 分隔符按 1em 上界取，焦点环按每段两侧各一枚环厚取，日历钮按满边长取——都是可机器复核的上界 */
    const 需要宽 = 年宽 + 2 * 二维宽 + 2 * 字号 + 3 * 2 * 环宽 + 日历钮
    for (const 视口 of [375, 320]) {
      const 可用 = 字段可用宽(视口)
      expect(需要宽, `${视口}px 档：三段+分隔符+焦点环+日历钮共需 ${需要宽}px > 可用 ${可用}px ⇒ 横向溢出`).toBeLessThanOrEqual(可用)
    }
  })

  it('浮层总宽在 320px 取证档下装得进视口（浮层按视口居中，不吃字段宽度）', () => {
    const 总宽 = 解析几何数值('--rili-tanchuang-kuan')
    const 内边距 = 解析几何数值('--rili-tanchuang-nei-pad')
    expect(总宽).toBe(280)
    for (const 视口 of [375, 320]) {
      expect(
        总宽 + 2 * 内边距,
        `${视口}px 档：浮层 ${总宽}px + 遮罩左右内边距 ${2 * 内边距}px > 视口 ${视口}px ⇒ 横向溢出`,
      ).toBeLessThanOrEqual(视口)
    }
    expect(总宽, '浮层不该窄到 7 列日格跌破 24px 触控下限').toBeGreaterThanOrEqual(7 * 24)
    expect(总宽, '浮层不该宽到 320px 档装不下').toBeLessThanOrEqual(320 - 2 * 内边距)
  })
})
