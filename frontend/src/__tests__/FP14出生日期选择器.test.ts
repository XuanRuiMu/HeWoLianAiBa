import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 出生日期选择器 from '@/components/认证/出生日期选择器.vue'
import 登录内容 from '@/views/登录内容.vue'
import { huoQuFanYi } from '@/config/translations'
import { 按档解析全部, 声明位置, 求几何算式, 解析几何数值 } from './主题令牌真源'
import { 拆分选择器组, 令牌名, 规则清单 } from './CSS级联真源'

/**
 * FP-14（需求 #13）：自绘 `YYYY-MM-DD` 出生日期选择器。
 *
 * 根因（用户已裁定）：原生 `input[type="date"]` 的分段占位（"yyyy/mm/日"）由 UA 决定，页面代码
 * 改不动 ⇒ 控件整只换掉。本文件钉的是换掉之后必须仍然成立的五件事：
 *  ① 显示口径：零填充 GB/T 7408-2005 扩展表示法 `YYYY-MM-DD`，与 UA 无关；对外 `v-model` 仍是同格式字符串；
 *  ② 校验语义不回归：必填 / 真实日期（2 月 30 日一类）/ min=1900-01-01 / max=今天 一律**夹紧而不产出非法值**，
 *    报错文案仍取既有翻译键（`renZheng.chuShengRiQiGeShiCuoWu`、`renZheng.weiChengNianRenJinZhi`），未新造未改值；
 *  ③ 未满 18 周岁硬拦截不回归；
 *  ④ 键盘可达：三段可聚焦、方向键改值、翻页键翻年、段间左右移动且端点不逃出控件；
 *  ⑤ 组件内零像素/零色值字面量，几何由 variables.css 共用 :root 令牌求成解析值。
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

/** 与 登录内容.vue:634 的日期解析真源同一个正则——对外值格式漂移即红 */
const 扩展表示法 = /^(\d{4})-(\d{2})-(\d{2})$/

function 挂载控件(覆盖: Record<string, string> = {}): VueWrapper {
  return mount(出生日期选择器, {
    props: {
      modelValue: '',
      idQianZhui: 'zhuce-chushengriqi',
      zuiXiao: '1900-01-01',
      zuiDa: 今天串,
      ...覆盖,
    },
    attachTo: document.body,
  })
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
      const 元 =节 as HTMLElement
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

async function 挂载注册(): Promise<{ wrapper: VueWrapper }> {
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
  await 路由.isReady()
  await flushPromises()
  await wrapper.find('#zhuce-shoujihao').setValue('13800138000')
  await wrapper.find('#zhuce-yanzhengma').setValue('123456')
  await wrapper.find('#zhuce-yonghuming').setValue('测试用户')
  await wrapper.find('#zhuce-mima').setValue('password123')
  return { wrapper }
}

function 按年龄出生日期(岁: number): [string, string, string] {
  const d = new Date(今天.getFullYear() - 岁, 今天.getMonth(), 今天.getDate())
  const 串 = 本地日期串(d)
  return [串.slice(0, 4), 串.slice(5, 7), 串.slice(8, 10)] as [string, string, string]
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('FP-14 ①：零填充显示与解析值', () => {
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
    wrapper.unmount()
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
    wrapper.unmount()
  })

  it('外部传入零填充值时三段按零填充回显（v-model 双向同一契约）', () => {
    const wrapper = 挂载控件({ modelValue: '1995-03-07' })
    expect(整串显示(wrapper)).toBe('1995-03-07')
    wrapper.unmount()
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
    wrapper.unmount()
  })
})

describe('FP-14 ②：非法日期与越界只夹紧，不产出非法值；报错文案取既有键', () => {
  it('平年 2 月 30 日夹到 2 月 28 日，闰年 2 月 30 日夹到 2 月 29 日', async () => {
    const pingNian = 挂载控件()
    await 录整日(pingNian, ['2001', '02', '30'])
    expect(段显示(pingNian, 'ri')).toBe('28')
    expect(最近外发(pingNian)).toBe('2001-02-28')
    pingNian.unmount()

    const runNian = 挂载控件()
    await 录整日(runNian, ['2000', '02', '30'])
    expect(段显示(runNian, 'ri')).toBe('29')
    expect(最近外发(runNian)).toBe('2000-02-29')
    runNian.unmount()
  })

  it('月份 19 越界夹到 12，月 0 夹到 1（1..12 之外不产出值）', async () => {
    const wrapper = 挂载控件()
    await 录段(wrapper, 'nian', '1995')
    await 录段(wrapper, 'yue', '19')
    expect(段显示(wrapper, 'yue')).toBe('12')
    await 录段(wrapper, 'yue', '0')
    expect(段显示(wrapper, 'yue')).toBe('01')
    wrapper.unmount()
  })

  it('max=今天：三段都往过了敲，落点恰好是今天，永不产出明天的日期', async () => {
    const wrapper = 挂载控件()
    await 录段(wrapper, 'nian', '3000')
    expect(段显示(wrapper, 'nian'), '年段上界必须是今年（旧 max 属性的等价面）').toBe(
      String(今天.getFullYear()),
    )
    await 录段(wrapper, 'yue', '12')
    expect(段显示(wrapper, 'yue'), '今年之内月段上界必须是本月').toBe(零填充(今天.getMonth() + 1, 2))
    await 录段(wrapper, 'ri', '31')
    expect(段显示(wrapper, 'ri'), '同年同月日段上界必须是今天').toBe(零填充(今天.getDate(), 2))
    expect(最近外发(wrapper)).toBe(今天串)
    wrapper.unmount()
  })

  it('min=1900-01-01：更早一律落回 1900-01-01', async () => {
    const wrapper = 挂载控件()
    await 录段(wrapper, 'nian', '1899')
    expect(段显示(wrapper, 'nian')).toBe('1900')
    await 录段(wrapper, 'yue', '1')
    await 录段(wrapper, 'ri', '1')
    expect(最近外发(wrapper)).toBe('1900-01-01')
    wrapper.unmount()
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
    wrapper.unmount()
  })

  it('出生日期留空时提交注册报的是既有键文案，且值一字未改', async () => {
    const { wrapper } = await 挂载注册()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.qian-tai-cuo-wu-ying-xiang').text()).toBe('请选择有效的出生日期')
    expect(huoQuFanYi('renZheng', 'chuShengRiQiGeShiCuoWu')).toBe('请选择有效的出生日期')
    const { zhuCe } = await import('@/api/认证')
    expect(vi.mocked(zhuCe)).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('只录一半时 aria-invalid 报真、外发值仍为空（必填语义不被半成品绕过）', async () => {
    const wrapper = 挂载控件()
    expect(wrapper.find(段选择器.nian).attributes('aria-invalid'), '未触碰的必填框不该先报红').toBe('false')
    await 录段(wrapper, 'nian', '1995')
    expect(wrapper.find(段选择器.nian).attributes('aria-invalid')).toBe('true')
    expect(最近外发(wrapper)).toBe('')
    await 录整日(wrapper, ['1995', '03', '07'])
    expect(wrapper.find(段选择器.nian).attributes('aria-invalid')).toBe('false')
    wrapper.unmount()
  })
})

describe('FP-14 ③：未满 18 周岁拦截不回归', () => {
  it('17 岁 364 天：按钮禁用，提交路径给既有未成年文案，不发请求', async () => {
    const { wrapper } = await 挂载注册()
    const 差一天 = new Date(
      今天.getFullYear() - 18,
      今天.getMonth(),
      今天.getDate() + 1,
    )
    const 串 = 本地日期串(差一天)
    await 录整日(wrapper, [串.slice(0, 4), 串.slice(5, 7), 串.slice(8, 10)])
    await wrapper.find('.xieyi-fuxuan input[type="checkbox"]').setValue(true)
    await flushPromises()
    expect(wrapper.find('form button[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.qian-tai-cuo-wu-ying-xiang').text()).toBe(
      huoQuFanYi('renZheng', 'weiChengNianRenJinZhi'),
    )
    const { zhuCe } = await import('@/api/认证')
    expect(vi.mocked(zhuCe)).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('满 18 周岁当天：按钮可用', async () => {
    const { wrapper } = await 挂载注册()
    await 录整日(wrapper, 按年龄出生日期(18))
    await wrapper.find('.xieyi-fuxuan input[type="checkbox"]').setValue(true)
    await flushPromises()
    expect(wrapper.find('form button[type="submit"]').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })
})

describe('FP-14 ④：键盘可达', () => {
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
    expect(nian.attributes('aria-valuemax')).toBe(String(今天.getFullYear()))
    const 组 = wrapper.find('.chushengriqi')
    expect(组.attributes('role')).toBe('group')
    expect(组.attributes('aria-label')).toBe(huoQuFanYi('ui', 'chuShengRiQi'))
    wrapper.unmount()
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
    wrapper.unmount()
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
    wrapper.unmount()
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
    wrapper.unmount()
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
    wrapper.unmount()
  })

  it('点字段空白带即聚焦首个未填段（触屏下整只字段都是入口）', async () => {
    const wrapper = 挂载控件()
    await 录段(wrapper, 'nian', '1995')
    await wrapper.find('.chushengriqi').trigger('click')
    await 等一等()
    expect(document.activeElement?.id).toBe('zhuce-chushengriqi-yue')
    wrapper.unmount()
  })
})

describe('FP-14 ⑤：几何走共用 :root 令牌，组件内零像素/零色值字面量', () => {
  const 组件路径 = resolve(__dirname, '../components/认证/出生日期选择器.vue')
  const 组件源码 = readFileSync(组件路径, 'utf8')
  const 样式段们 = [...组件源码.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((匹) => 匹[1])
  expect(样式段们.length, '组件的 <style> 块数量变了，取样口径需复核').toBe(1)
  const 样式源 = 样式段们[0]
  const 净样式 = 样式源.replace(/\/\*[\s\S]*?\*\//g, '')
  const 组件规则 = 规则清单(净样式)

  function 组件声明(简单选择器: string, 属性: string): string {
    const 命中 = 组件规则
      .filter(
        (规则) =>
          规则.声明.has(属性) &&
          拆分选择器组(规则.选择器).some((串) => 串.trim() === 简单选择器),
      )
      .sort((甲, 乙) => 甲.序号 - 乙.序号)
    expect(命中.length, `未找到 ${简单选择器} { ${属性} } 声明`).toBeGreaterThan(0)
    return 命中[命中.length - 1].声明.get(属性) as string
  }

  function 数字声明(声明: string, 属性: string): number {
    const 数 = Number.parseFloat(声明)
    expect(Number.isFinite(数), `${属性} 读不出数值（"${声明}"）`).toBe(true)
    return 数
  }

  it('样式块内没有任何像素/相对单位字面量，也没有任何色值字面量', () => {
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

  it('两枚新令牌只住共用 :root 块、深浅两档同值、且唯一消费者是本组件', () => {
    const 块们 = 声明位置('--rili-nian-kuan')
    expect(块们, '--rili-nian-kuan 写进单侧主题块会让另一档塌陷').toEqual({
      共用: true,
      浅色: false,
      深色: false,
    })
    expect(声明位置('--rili-erwei-kuan')).toEqual({ 共用: true, 浅色: false, 深色: false })
    const 两档 = [按档解析全部('light'), 按档解析全部('dark')]
    for (const 名 of ['--rili-nian-kuan', '--rili-erwei-kuan']) {
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
    for (const 名 of ['--rili-nian-kuan', '--rili-erwei-kuan']) {
      const 消费者 = 遍历(源码根)
        .filter((路径) => 路径 !== 组件路径)
        .filter((路径) => readFileSync(路径, 'utf8').includes(`var(${名})`))
        .map((路径) => 路径.slice(源码根.length + 1).replace(/\\/g, '/'))
        .sort()
      expect(消费者, `${名} 出现第二消费者 ⇒ 唯一消费者登记失效`).toEqual([])
    }
  })

  it('段宽解析值不小于触控下限，且最窄取证档下三段加分隔符不溢出', () => {
    const 年宽 = 解析几何数值('--rili-nian-kuan')
    const 二维宽 = 解析几何数值('--rili-erwei-kuan')
    expect(年宽, '年段要容 4 位数字').toBe(44)
    expect(二维宽).toBe(26)
    const 触控下限 = 24
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
      const 值 = 声明.trim().split(/\s+/).map((段) => 数字声明(段, 属性))
      if (值.length === 1) return 值[0]
      if (值.length === 2) return 值[1]
      if (值.length === 3) return 值[1]
      return 值[1]
    }
    const 字段可用宽 = (视口: number): number =>
      视口 -
      2 * 水平内边距(视图声明('.denglu-neirong', 'padding'), 'padding') -
      2 * 水平内边距(视图声明('.biaodan-rongqi', 'padding'), 'padding') -
      2 * 数字声明(视图声明('.biaodan-rongqi', 'border'), 'border')

    const 字号 = 数字声明(视图声明('.fenlie-shuru', 'font-size'), 'font-size')
    const 环宽 = 解析几何数值('--jujiao-huan-kuan-du-wenben')
    /** 分隔符按 1em 上界取，焦点环按每段两侧各一枚环厚取——都是可机器复核的上界，不是观感 */
    const 需要宽 = 年宽 + 2 * 二维宽 + 2 * 字号 + 3 * 2 * 环宽
    for (const 视口 of [375, 320]) {
      const 可用 = 字段可用宽(视口)
      expect(需要宽, `${视口}px 档：三段+分隔符+焦点环共需 ${需要宽}px > 可用 ${可用}px ⇒ 横向溢出`).toBeLessThanOrEqual(可用)
    }
  })
})
