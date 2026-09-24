import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import 登录内容 from '@/views/登录内容.vue'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { 按档解析全部, 声明位置, 求几何算式, 解析几何数值, type 主题档 } from './主题令牌真源'
import { 拆分选择器组, 令牌名, 规则清单 } from './CSS级联真源'

/**
 * FP-04b（需求 #2 后半句「手机号/密码 的标签太挤，要调上下间距」）。
 *
 * 判据全在**解析值 + 层叠结果**层，不出现「源码含某字符串」式断言（B10 病灶）：
 *  ① 间距数值由 variables.css 共用 `:root` 真源求出（`解析几何数值`），两档逐值相等；
 *  ② 几何量（标签 top/line-height、输入框 padding/border、组 margin）取自挂载后的 jsdom 层叠结果；
 *  ③ jsdom 无布局引擎 ⇒ 这里量的是「盒模型算式」。真机 getBoundingClientRect 由取证工人用
 *     浏览器现场取证已有的三列（与下一项间隙 / 上一项底线→本标签顶 /
 *     标签底→输入文字顶）复采；本文件三列与那三列**逐字同定义**，预测值可与实测直接对照。
 *
 * 「太挤」有两个净空口径，都被钉在本文件：
 *  · 相邻字段矩形间隙（getBoundingClientRect 口径）= .shuru-zu 的 margin-bottom；
 *  · 上一项**文字底**到本项上浮标签顶 = 上值 − 前项下内边距+发丝线 − 标签向上侵入量。
 *    旧值 24 时第二条只剩 8px（标签贴着上一项字脚）⇒ 本单按 8px 节奏上抬一档到 32，第二条变 16。
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

const 视图样式 = (() => {
  const 全源 = readFileSync(resolve(__dirname, '../views/登录内容.vue'), 'utf8')
  const 段 = [...全源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((匹) => 匹[1])
  expect(段.length, '登录内容.vue 的 <style> 块数量变了，取样口径需复核').toBe(1)
  return 段[0].replace(/\/\*[\s\S]*?\*\//g, '')
})()

const 全部规则 = 规则清单(视图样式)
const 令牌表: Record<主题档, Map<string, string>> = {
  light: 按档解析全部('light'),
  dark: 按档解析全部('dark'),
}

/** 该选择器作为**简单选择器**命中的规则里，层叠胜出的那条声明值（同特异度按文档序后者胜） */
function 层叠声明(简单选择器: string, 属性: string): string {
  const 命中 = 全部规则
    .filter(
      (规则) =>
        规则.声明.has(属性) &&
        拆分选择器组(规则.选择器).some((串) => 串.trim() === 简单选择器),
    )
    .sort((甲, 乙) => 甲.序号 - 乙.序号)
  expect(命中.length, `未找到 ${简单选择器} { ${属性} } 声明`).toBeGreaterThan(0)
  return 命中[命中.length - 1].声明.get(属性) as string
}

/** 局部量纲令牌的算式必须是「共用节奏令牌之和」；数值由同一份求值器对**真实算式**求值 ⇒ 压回 8px 本文件必红 */
const 间距算式 = 层叠声明('.shuru-zu', '--ziduan-jian-ju')
const 间距数值 = 求几何算式(间距算式)

/** fp02 取证 spec 的取样面：表单直接子级里的字段组（登录 2 组 / 注册 5 组 ⇒ 1 对 + 4 对相邻） */
const 字段序: Record<'dengLu' | 'zhuCe', string[]> = {
  dengLu: ['denglu-shoujihao', 'denglu-mima'],
  zhuCe: [
    'zhuce-shoujihao',
    'zhuce-yanzhengma',
    'zhuce-yonghuming',
    'zhuce-mima',
    'zhuce-chushengriqi',
  ],
}

function 像素(值: string, 属性: string): number {
  const 数 = Number.parseFloat(值)
  expect(Number.isFinite(数), `${属性} 取不到像素值（实测 "${值}"）`).toBe(true)
  return 数
}

function 注入样式(档: 主题档): () => void {
  const 节 = document.createElement('style')
  节.dataset.fp04b = '1'
  节.textContent = 视图样式
  document.head.appendChild(节)
  document.documentElement.setAttribute('data-theme', 档)
  return () => {
    节.remove()
    document.documentElement.removeAttribute('data-theme')
  }
}

async function 挂载(档: 主题档, 模式: 'dengLu' | 'zhuCe') {
  const 路由: Router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/login', name: 'dengLu', component: 登录内容 },
    ],
  })
  setActivePinia(createPinia())
  使用认证表单仓库().moShi = 模式
  const wrapper: VueWrapper = mount(登录内容, {
    attachTo: document.body,
    global: { plugins: [路由] },
  })
  await flushPromises()
  // 逐字段填值把标签推到上浮态：上浮态才是纵向间距的最近点（标签会向上越出字段盒）
  for (const id of 字段序[模式]) {
    if (id === 'zhuce-chushengriqi') continue // 该组模板上恒挂 shangFu
    await wrapper.find(`#${id}`).setValue('FP04b取样值')
  }
  await flushPromises()
  return { wrapper, 清理: 注入样式(档) }
}

function 字段组清单(wrapper: VueWrapper, 模式: 'dengLu' | 'zhuCe'): HTMLElement[] {
  const 组 = [...wrapper.element.querySelectorAll('form > .shuru-zu')] as HTMLElement[]
  expect(组.length, '取样字段组数与字段清单不符').toBe(字段序[模式].length)
  return 组
}

function 上浮标签(组: HTMLElement): HTMLElement {
  const 标 = 组.querySelector('.fudong-biaoqian') as HTMLElement | null
  expect(标, '字段组里没有浮动标签，取样无效').not.toBeNull()
  expect(组.classList.contains('shangFu'), '标签未进入上浮态，取样无效').toBe(true)
  return 标 as HTMLElement
}

/** 一对相邻字段的纵向净空；口径与 fp02 取证 spec 的同名列一一对应 */
function 量一对(前: HTMLElement, 后: HTMLElement) {
  const 组式 = getComputedStyle(前)
  const 前输入框 = 前.querySelector('.fenlie-shuru') as HTMLElement
  const 后输入框 = 后.querySelector('.fenlie-shuru') as HTMLElement
  const 前式 = getComputedStyle(前输入框)
  const 后式 = getComputedStyle(后输入框)
  const 标式 = getComputedStyle(上浮标签(后))
  const 标签顶 = 像素(标式.top, 'top')
  const 标签盒高 = 像素(标式.lineHeight, 'line-height')
  const 侵入 = Math.max(0, -标签顶)
  const 原点偏移 = 像素(组式.paddingTop, '组 padding-top') + 像素(组式.marginTop, '组 margin-top')
  const 文字顶 = 原点偏移 + 像素(后式.paddingTop, 'padding-top') + 像素(后式.marginTop, '输入框 margin-top')
  const 前文字底 =
    像素(前式.paddingBottom, '前项 padding-bottom') + 像素(前式.borderBottomWidth, '前项 border-bottom-width')
  return {
    间距令牌: 令牌名(组式.marginBottom, 'margin-bottom'),
    矩形间隙: 间距数值,
    上浮标签顶到上一项底线: 间距数值 - 侵入,
    上一项文字底到本标签顶: 间距数值 - 前文字底 - 侵入,
    标签底到输入文字顶: 文字顶 - (标签顶 + 标签盒高),
    标签盒下沿: 标签顶 + 标签盒高,
    输入文字顶: 文字顶,
  }
}

afterEach(() => {
  document.querySelectorAll('style[data-fp04b]').forEach((节) => 节.remove())
})

describe('FP-04b ①：字段间距走令牌——两档同值、零裸 px、无视口条件块', () => {
  it('margin-bottom 消费局部量纲令牌 --ziduan-jian-ju（值里不含数字，也不含同值兜底）', () => {
    const 声明 = 层叠声明('.shuru-zu', 'margin-bottom')
    expect(令牌名(声明, 'margin-bottom')).toBe('--ziduan-jian-ju')
    expect(声明).not.toMatch(/\d/)
  })

  it('局部令牌只由共用 :root 节奏令牌派生（24+8），组件内不留第二份字面量', () => {
    expect(间距算式).toBe('calc(var(--jiange-da) + var(--jiange-xiao))')
    expect(间距算式).not.toMatch(/\d+px/)
    expect(间距数值).toBe(32)
  })

  it('派生所用令牌只住共用 :root 块，深浅两档逐值相等（F23 深色档塌陷为 0 不得复发）', () => {
    for (const 令牌 of ['--jiange-da', '--jiange-xiao']) {
      expect(声明位置(令牌), `${令牌} 不在共用 :root 块`).toEqual({
        共用: true,
        浅色: false,
        深色: false,
      })
      expect(
        令牌表.dark.get(令牌),
        `${令牌} 深浅两档取值不等 ⇒ 深色档字段间距会塌陷`,
      ).toBe(令牌表.light.get(令牌))
    }
  })

  it('样式表内没有任何视口条件块（唯一 @media 是 prefers-reduced-motion）⇒ 四档视口同值', () => {
    const 前缀 = [...视图样式.matchAll(/@media([^{]*)\{/g)].map((匹) =>
      匹[1].replace(/\s+/g, ' ').trim(),
    )
    expect(前缀, '出现新的 @media 条件块，间距的视口无关性需重新取证').toEqual([
      '(prefers-reduced-motion: reduce)',
    ])
  })

  it('局部令牌有真实消费者（FP-01 零消费者令牌病理）', () => {
    const 消费次数 = 全部规则.filter((规则) =>
      [...规则.声明.values()].some((值) => 值.includes('var(--ziduan-jian-ju)')),
    ).length
    expect(消费次数, '--ziduan-jian-ju 声明了却没人用').toBeGreaterThan(0)
  })
})

for (const 档 of ['light', 'dark'] as 主题档[]) {
  for (const 模式 of ['dengLu', 'zhuCe'] as const) {
    describe(`FP-04b ②：${档} 档 / ${模式} 模式——逐对字段净空`, () => {
      it('每一对相邻字段：矩形间隙 ≥8（需求 #2 契约）且 ≥16（fp02 门禁下限），上浮标签不压上一项底线', async () => {
        const { wrapper, 清理 } = await 挂载(档, 模式)
        const 组 = 字段组清单(wrapper, 模式)
        expect(组.length - 1, '字段对数不符，逐对判定不成立').toBeGreaterThanOrEqual(1)
        for (let i = 0; i < 组.length - 1; i += 1) {
          const 常量 = 量一对(组[i], 组[i + 1])
          const 标 = `${字段序[模式][i]} → ${字段序[模式][i + 1]}`
          expect(常量.间距令牌, `${标} 间距没吃局部令牌`).toBe('--ziduan-jian-ju')
          expect(常量.矩形间隙, `${标} 间隙 ${常量.矩形间隙}px < 8px`).toBeGreaterThanOrEqual(8)
          expect(常量.矩形间隙, `${标} 间隙 ${常量.矩形间隙}px 低于 fp02 门禁的 16px`).toBeGreaterThanOrEqual(16)
          expect(
            常量.上浮标签顶到上一项底线,
            `${标} 上浮标签压上一项字段底线（${常量.上浮标签顶到上一项底线}px）`,
          ).toBeGreaterThanOrEqual(12)
          expect(
            常量.上一项文字底到本标签顶,
            `${标} 上一项文字底到本标签顶只剩 ${常量.上一项文字底到本标签顶}px，标签太挤`,
          ).toBeGreaterThanOrEqual(8)
        }
        清理()
        wrapper.unmount()
      })

      it('每个字段：上浮标签与其自身输入文本不重叠（标签盒下沿在文字行顶之上且留 ≥7px）', async () => {
        const { wrapper, 清理 } = await 挂载(档, 模式)
        const 组 = 字段组清单(wrapper, 模式)
        for (let i = 0; i < 组.length; i += 1) {
          const 常量 = 量一对(组[i], 组[i])
          const 标 = 字段序[模式][i]
          expect(常量.标签盒下沿, `${标} 标签盒下沿越过输入文字行顶`).toBeLessThan(常量.输入文字顶)
          expect(
            常量.标签底到输入文字顶,
            `${标} 上浮标签与输入文字太挤（${常量.标签底到输入文字顶}px）`,
          ).toBeGreaterThanOrEqual(7)
        }
        清理()
        wrapper.unmount()
      })
    })
  }
}

describe('FP-04b ③：不回归——标签/焦点环共用原点与 FP-03c 缺口几何', () => {
  it('字段组仍是零 padding-top / 零 margin-top / 零 padding-bottom（间距只由 margin-bottom 承担）', async () => {
    const { wrapper, 清理 } = await 挂载('dark', 'dengLu')
    for (const 元 of 字段组清单(wrapper, 'dengLu')) {
      const 式 = getComputedStyle(元)
      expect(像素(式.paddingTop, '组 padding-top'), '组加了上内边距 ⇒ 标签与环原点分叉').toBe(0)
      expect(像素(式.marginTop, '组 margin-top'), '组加了上外边距 ⇒ fp02 的间隙列含义变化').toBe(0)
      expect(像素(式.paddingBottom, '组 padding-bottom'), '组加了下内边距 ⇒ 间距不再等于 margin-bottom').toBe(0)
    }
    清理()
    wrapper.unmount()
  })

  it('上浮标签盒仍完整罩住 1px 零偏移焦点环带 [-1,0]（间距改动不得挪走 FP-03c 缺口）', () => {
    const 环宽 = 解析几何数值('--jujiao-huan-kuan-du-wenben')
    const 环偏 = 解析几何数值('--jujiao-huan-pian-yi-wenben')
    expect(环偏, '焦点环偏移被改动 ⇒ 缺口几何的算式前提失效').toBe(0)
    const 上浮候选 = 全部规则
      .filter((规则) =>
        拆分选择器组(规则.选择器).some((串) => 串.trim().endsWith('.shangFu .fudong-biaoqian')),
      )
      .sort((甲, 乙) => 甲.序号 - 乙.序号)
    expect(上浮候选.length, '上浮态标签规则不在了').toBeGreaterThan(0)
    const 上浮 = 上浮候选.filter((规则) => 规则.声明.has('top') && 规则.声明.has('line-height'))
    expect(上浮.length, '深浅两档各写了一份上浮几何 ⇒ 几何出现第二真源，档位一换缺口就会挪走').toBe(1)
    const 顶 = 像素(上浮[0].声明.get('top') as string, 'top')
    const 高 = 像素(上浮[0].声明.get('line-height') as string, 'line-height')
    expect(顶, `标签盒上沿 ${顶} 盖不住环带上沿 ${-环宽 - 环偏}`).toBeLessThanOrEqual(-环宽 - 环偏 - 1)
    expect(顶 + 高, `标签盒下沿 ${顶 + 高} 盖不住环带下沿 0`).toBeGreaterThanOrEqual(1)
  })
})
