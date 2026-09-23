import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import 登录内容 from '@/views/登录内容.vue'
import { 按档解析全部, 声明位置, 塌陷令牌清单, 解析几何数值, type 主题档 } from './主题令牌真源'
import { 令牌名 } from './CSS级联真源'

/**
 * FP-03c：FP-03 为治理需求 #1 删掉 `.dixian-dixian` 装饰线后引入的两个可用性回归。
 *  ①未聚焦输入框零可见边界；②焦点环上边线打穿 `.fudong-biaoqian` 上浮后的字脚。
 *
 * 判据一律是**解析后的值**：几何/颜色先由 jsdom 的真实层叠给出「哪条声明生效、生效值是哪个令牌」，
 * 再由 variables.css 三段式真源把令牌求成该档的实际色/像素（jsdom 不做 var() 计算，见
 * 主题令牌真源.ts 注释）。本文件不出现任何「源码包含某字符串」式断言（B10 病灶）。
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

const 令牌表: Record<主题档, Map<string, string>> = {
  light: 按档解析全部('light'),
  dark: 按档解析全部('dark'),
}

const 视图样式源 = (() => {
  const 全源 = readFileSync(resolve(__dirname, '../views/登录内容.vue'), 'utf8')
  const 段 = [...全源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((匹) => 匹[1])
  expect(段.length, '登录内容.vue 的 <style> 块数量变了，取样口径需复核').toBe(1)
  return 段[0].replace(/\/\*[\s\S]*?\*\//g, '')
})()

type RGB = [number, number, number]

/** 只认 `#hex` 与 `rgba?(r,g,b[,a])` 两种字面量——项目色令牌全用这两种写法，其它一律抛错不猜 */
function 解析色(值: string): { rgb: RGB; alpha: number } {
  const 净 = 值.trim()
  const 十六 = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(净)
  if (十六) {
    const 全 =
      十六[1].length === 3
        ? 十六[1]
            .split('')
            .map((符) => 符 + 符)
            .join('')
        : 十六[1]
    return {
      rgb: [
        Number.parseInt(全.slice(0, 2), 16),
        Number.parseInt(全.slice(2, 4), 16),
        Number.parseInt(全.slice(4, 6), 16),
      ],
      alpha: 1,
    }
  }
  const 函 = /^rgba?\(([^)]+)\)$/.exec(净)
  if (函) {
    const 部 = 函[1].split(',').map((项) => Number(项.trim()))
    if (部.length !== 3 && 部.length !== 4) throw new Error(`无法解析颜色：${值}`)
    return { rgb: [部[0], 部[1], 部[2]] as RGB, alpha: 部.length === 4 ? 部[3] : 1 }
  }
  throw new Error(`无法解析颜色：${值}`)
}

function 压合(前: { rgb: RGB; alpha: number }, 后: RGB): RGB {
  return 前.rgb.map((通道, i) => 前.alpha * 通道 + (1 - 前.alpha) * 后[i]) as RGB
}

/** fp11 门禁 / 焦点白条取样-fp03.ts 的「亮条」第一半：与卡底最大通道差 */
function 通道色差(a: RGB, b: RGB): number {
  return Math.max(...a.map((通道, i) => Math.abs(通道 - b[i])))
}

/** 同上第二半：WCAG 相对亮度 */
function 相对亮度(色值: RGB): number {
  const [r, g, b] = 色值.map((通道) => {
    const 线 = 通道 / 255
    return 线 <= 0.03928 ? 线 / 12.92 : Math.pow((线 + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function 像素(值: string, 属性: string): number {
  const 数 = Number.parseFloat(值)
  expect(Number.isFinite(数), `层叠结果里 ${属性} 取不到像素值（实测 "${值}"）`).toBe(true)
  return 数
}

function 注入样式(档: 主题档): () => void {
  const 节 = document.createElement('style')
  节.dataset.fp03c = '1'
  节.textContent = 视图样式源
  document.head.appendChild(节)
  document.documentElement.setAttribute('data-theme', 档)
  return () => {
    节.remove()
    document.documentElement.removeAttribute('data-theme')
  }
}

async function 挂载登录(档: 主题档): Promise<{ wrapper: VueWrapper; 清理: () => void }> {
  const 路由: Router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/login', name: 'dengLu', component: 登录内容 },
    ],
  })
  setActivePinia(createPinia())
  const wrapper = mount(登录内容, { attachTo: document.body, global: { plugins: [路由] } })
  await flushPromises()
  return { wrapper, 清理: 注入样式(档) }
}

function 计算(元: Element | undefined | null): CSSStyleDeclaration {
  const 目标 =元 as HTMLElement | null
  expect(目标, '取样元素不存在').not.toBeNull()
  return getComputedStyle(目标 as HTMLElement)
}

afterEach(() => {
  document.querySelectorAll('style[data-fp03c]').forEach((节) => 节.remove())
})

describe('FP-03c ①：未聚焦输入框必须有「可见但不刺眼」的静置边界', () => {
  for (const 档 of ['light', 'dark'] as 主题档[]) {
    it(`${档} 档：层叠结果给出 1px solid 下边界，且边界色吃 --renzheng-shuru-xian-se`, async () => {
      const { wrapper, 清理 } = await 挂载登录(档)
      const 输入框 = wrapper.find('#denglu-shoujihao').element
      const 式 = 计算(输入框)
      expect(式.borderBottomStyle, 'FP-03c 回归①：静置输入框没有实线下边界').toBe('solid')
      const 宽 = 像素(式.borderBottomWidth, 'border-bottom-width')
      expect(宽, `静置边界宽 ${宽}px，不是发丝线`).toBeGreaterThan(0)
      expect(宽, `静置边界宽 ${宽}px，粗于 1px 就不是发丝线`).toBeLessThanOrEqual(1)
      expect(令牌名(式.borderBottomColor, 'border-bottom-color'), '边界色未吃静置边界令牌').toBe(
        '--renzheng-shuru-xian-se',
      )
      清理()
      wrapper.unmount()
    })

    it(`${档} 档：解析值判据——压在卡面上既看得见，又不满足 fp11 的「亮条」定义`, async () => {
      const { 清理 } = await 挂载登录(档)
      const 表 = 令牌表[档]
      const 卡面 = 解析色(表.get('--renzheng-mian-se') as string)
      const 边界 = 解析色(表.get('--renzheng-shuru-xian-se') as string)
      expect(卡面.alpha, '卡面色必须是不透明实色，否则标签缺口衬底盖不住环').toBe(1)
      expect(边界.alpha, '边界令牌得是带 alpha 的发丝线').toBeGreaterThan(0)
      expect(边界.alpha, `边界 alpha ${边界.alpha} 已是实色线，会读成"刺眼"`).toBeLessThanOrEqual(0.2)
      const 压后 = 压合(边界, 卡面.rgb)
      const 差 = 通道色差(压后, 卡面.rgb)
      expect(差, `${档} 档边界压在卡面上通道色差仅 ${差.toFixed(1)}，等于没有边界`).toBeGreaterThanOrEqual(8)
      const 是亮条 = 差 >= 24 && 相对亮度(压后) >= 相对亮度(卡面.rgb) + 0.05
      expect(
        是亮条,
        `${档} 档边界构成 fp11 门禁口径的亮条（Δ=${差.toFixed(1)}，L=${相对亮度(
          压后,
        ).toFixed(3)} vs 卡面 ${相对亮度(卡面.rgb).toFixed(3)}）＝需求 #1 白线回归`,
      ).toBe(false)
      清理()
    })

    it(`${档} 档：边界不靠第二真源——本档层叠胜出的仍是同一枚令牌（无同值镜像声明）`, async () => {
      const { wrapper, 清理 } = await 挂载登录(档)
      const 式 = 计算(wrapper.find('#denglu-mima').element)
      expect(令牌名(式.borderBottomColor, 'border-bottom-color')).toBe('--renzheng-shuru-xian-se')
      const 卡 = 计算(wrapper.find('.biaodan-rongqi').element)
      expect(令牌名(卡.backgroundColor, 'background-color')).toBe('--renzheng-mian-se')
      清理()
      wrapper.unmount()
    })
  }

  it('两枚新令牌深浅两档成对声明，且都有真实消费者', () => {
    const 塌陷 = 塌陷令牌清单()
    const 全库源 = readFileSync(resolve(__dirname, '../views/登录内容.vue'), 'utf8')
    for (const 名 of ['--renzheng-mian-se', '--renzheng-shuru-xian-se']) {
      expect(塌陷.includes(名), `${名} 只在单侧主题块声明（另一档塌陷）`).toBe(false)
      expect(声明位置(名), `${名} 应成对住在深浅两档`).toEqual({
        共用: false,
        浅色: true,
        深色: true,
      })
      const 次数 = 全库源.match(new RegExp(`var\\(\\s*${名}\\s*[,)]`, 'g'))?.length ?? 0
      expect(次数, `${名} 消费者为 0（FP-01 零消费者令牌病理）`).toBeGreaterThan(0)
    }
  })

  it('删掉的装饰线没有借道回来（挂载 DOM 内 .dixian-dixian 归零）', async () => {
    const { wrapper, 清理 } = await 挂载登录('dark')
    expect(document.querySelectorAll('.dixian-dixian').length).toBe(0)
    清理()
    wrapper.unmount()
  })
})

describe('FP-03c ②：焦点环上边线不得穿过上浮标签字脚', () => {
  const 环宽 = 解析几何数值('--jujiao-huan-kuan-du-wenben')
  const 环偏 = 解析几何数值('--jujiao-huan-pian-yi-wenben')

  it('窄环仍是 1px 零偏移——解法只能是标签留缺口，不许把环推远', () => {
    expect(环偏, 'outline-offset 被加大＝把缺陷搬走而不是修掉（派单明令禁止）').toBe(0)
    expect(环宽, '窄环宽度不再吃 --jujiao-huan-kuan-du-wenben 的 1px').toBe(1)
  })

  for (const 档 of ['light', 'dark'] as 主题档[]) {
    it(`${档} 档：上浮标签的衬底盒完整盖住环带，并留 ≥1px 富余`, async () => {
      const { wrapper, 清理 } = await 挂载登录(档)
      await wrapper.find('#denglu-shoujihao').trigger('focus')
      await flushPromises()
      const 组 = wrapper.find('#denglu-shoujihao').element.parentElement as HTMLElement
      expect(组.classList.contains('shangFu'), '聚焦后标签未进入上浮态，取样无效').toBe(true)
      const 标 = 计算(组.querySelector('.fudong-biaoqian'))
      expect(标.position, '标签不再是定位元素，衬底盖不住环').toBe('absolute')
      const 上 = 像素(标.top, 'top')
      const 高 = 像素(标.lineHeight, 'line-height')
      const 环上沿 = -环宽 - 环偏
      expect(上, `标签盒上沿 ${上} 没盖住环带上沿 ${环上沿}`).toBeLessThanOrEqual(环上沿 - 1)
      expect(上 + 高, `标签盒下沿 ${上 + 高} 没盖住环带下沿 0`).toBeGreaterThanOrEqual(1)
      清理()
      wrapper.unmount()
    })

    it(`${档} 档：衬底色与卡面同一枚令牌且不透明，缺口左右留白不吃掉文字起线`, async () => {
      const { wrapper, 清理 } = await 挂载登录(档)
      const 组 = (wrapper.find('#denglu-shoujihao').element as HTMLElement)
        .parentElement as HTMLElement
      const 标 = 计算(组.querySelector('.fudong-biaoqian'))
      const 令牌 = 令牌名(标.backgroundColor, 'background-color')
      expect(令牌, '标签衬底与卡面不是同一枚令牌（缺口会露出色差）').toBe('--renzheng-mian-se')
      expect(解析色(令牌表[档].get(令牌) as string).alpha, '半透明衬底盖不住环').toBe(1)
      const 左内边距 = 像素(标.paddingLeft, 'padding-left')
      expect(左内边距, '衬底没有横向留白，环仍在字脚起笔处穿过').toBeGreaterThanOrEqual(2)
      expect(像素(标.marginLeft, 'margin-left'), '留白没被 margin 抵消，标签文字会与输入文字错开').toBe(
        -左内边距,
      )
      expect(像素(标.paddingRight, 'padding-right'), '右半边留白不对称').toBeGreaterThanOrEqual(左内边距)
      清理()
      wrapper.unmount()
    })
  }

  it('标签盒与输入框共用同一纵坐标原点（组与输入框都无 margin/padding-top）', async () => {
    const { wrapper, 清理 } = await 挂载登录('dark')
    const 输入框元素 = wrapper.find('#denglu-shoujihao').element as HTMLElement
    const 组 = 输入框元素.parentElement as HTMLElement
    expect(像素(计算(组).paddingTop, 'padding-top'), '宿主组有上内边距，标签 top 与环不同源').toBe(0)
    expect(像素(计算(输入框元素).marginTop, 'margin-top'), '输入框有上外边距，标签 top 与环不同源').toBe(0)
    清理()
    wrapper.unmount()
  })
})
