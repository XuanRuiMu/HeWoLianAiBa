import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory, type Router } from 'vue-router'
import 登录内容 from '@/views/登录内容.vue'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { 按档解析全部, 声明位置, 求几何算式, type 主题档 } from './主题令牌真源'
import { 规则清单, 读取全局基线 } from './CSS级联真源'

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

const 全局源 = 读取全局基线()
const 全局净 = 全局源.replace(/\/\*[\s\S]*?\*\//g, '')
const 全局规则 = 规则清单(全局净)

const 视图全源 = readFileSync(resolve(__dirname, '../views/登录内容.vue'), 'utf8')
const 视图样式 = (() => {
  const 段 = [...视图全源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((匹) => 匹[1])
  expect(段.length).toBe(1)
  return 段[0].replace(/\/\*[\s\S]*?\*\//g, '')
})()
const 视图规则 = 规则清单(视图样式)

function 令牌表(档: 主题档): Map<string, string> {
  return 按档解析全部(档)
}

function 像素(值: string, 属性: string): number {
  const 紧 = 值.trim()
  // jsdom 对 var()/calc() 不做代入求值：长写原样返回字符串、简写塌成 0 —— 统一走求几何算式
  if (/var\(|calc\(/.test(紧)) return 求几何算式(紧)
  const 数 = Number.parseFloat(紧)
  expect(Number.isFinite(数), `${属性} 取不到像素值（实测 "${值}"）`).toBe(true)
  return 数
}

/** jsdom 把带 calc(var()) 的 padding 简写塌成 0 ⇒ 输入盒边改从源码声明求值（与 FP04b 同口径） */
function 源码盒边(选择器: string, 属性: string): number {
  const 命中 = 视图规则
    .filter((项) => 项.声明.has(属性) && 拆分选择器(项.选择器).some((串) => 串.trim() === 选择器))
    .sort((甲, 乙) => 甲.序号 - 乙.序号)
  expect(命中.length, `未找到 ${选择器} { ${属性} }`).toBeGreaterThan(0)
  return 求几何算式(命中[命中.length - 1].声明.get(属性) as string)
}

function 拆分选择器(组: string): string[] {
  return 组.split(',').map((串) => 串.trim())
}

function 注入视图样式(档: 主题档): () => void {
  const 节 = document.createElement('style')
  节.dataset.fpa1 = '1'
  节.textContent = 视图样式
  document.head.appendChild(节)
  document.documentElement.setAttribute('data-theme', 档)
  return () => {
    节.remove()
    document.documentElement.removeAttribute('data-theme')
  }
}

async function 挂载(档: 主题档, 模式: 'dengLu' | 'zhuCe' = 'dengLu'): Promise<{ wrapper: VueWrapper; 清理: () => void }> {
  const 路由: Router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/login', name: 'dengLu', component: 登录内容 },
    ],
  })
  const pinia = createPinia()
  setActivePinia(pinia)
  使用认证表单仓库().moShi = 模式
  const wrapper = mount(登录内容, { attachTo: document.body, global: { plugins: [路由] } })
  await flushPromises()
  return { wrapper, 清理: 注入视图样式(档) }
}

function 计算(元: Element | null): CSSStyleDeclaration {
  expect(元).not.toBeNull()
  return getComputedStyle(元 as HTMLElement)
}

afterEach(() => {
  document.querySelectorAll('style[data-fpa1]').forEach((节) => 节.remove())
  document.body.innerHTML = ''
})

describe('FPA1 ①：全站非聊天输入框只吃 global 单真源', () => {
  it('静置 1px 令牌色由 global 给出', () => {
    const 基 = 全局规则.filter((项) => 项.声明.has('border-bottom-color'))
    expect(基.some((项) => 项.声明.get('border-bottom-color') === 'var(--shuru-xian-changtai-se)')).toBe(true)
    expect(基.some((项) => 项.声明.get('border-bottom-width') === 'var(--shuru-xian-changtai-kuan-du)')).toBe(true)
    const 表 = 令牌表('light')
    expect(表.get('--shuru-xian-changtai-kuan-du')).toBe('1px')
    expect(表.get('--shuru-xian-jujiao-kuan-du')).toBe('2px')
    expect(表.get('--shuru-sao-chu-shi-chang')).toBe('0.38s')
  })

  it('聚焦六段扫出：background-image 吃 --shuru-sao-jianbian 且六段', () => {
    const 基 = 全局规则.filter((项) => 项.声明.has('background-image'))
    expect(基.some((项) => (项.声明.get('background-image') as string).includes('var(--shuru-sao-jianbian)'))).toBe(true)
    for (const 档 of ['light', 'dark'] as 主题档[]) {
      const 表 = 令牌表(档)
      const 渐变 = 表.get('--shuru-sao-jianbian') as string
      expect(渐变.includes('linear-gradient'), `${档} 档渐变不是 linear-gradient`).toBe(true)
      const 停靠 = 渐变.match(/(\d+)%/g) ?? []
      expect(停靠.length, `${档} 档渐变停靠数 ${停靠.length} 不是六段`).toBeGreaterThanOrEqual(6)
      expect(渐变.includes('var(--shuru-xian-jujiao-se)'), `${档} 档渐变未吃聚焦色令牌`).toBe(true)
    }
  })

  it('浅色由左向右变深、深色由左向右变浅', () => {
    const 浅 = 令牌表('light').get('--shuru-sao-jianbian') as string
    const 深 = 令牌表('dark').get('--shuru-sao-jianbian') as string
    const 取浓度序 = (渐变: string): number[] => {
      const 紧 = 渐变.replace(/\s+/g, ' ')
      const 段 = [...紧.matchAll(/var\(--shuru-xian-jujiao-se\)\s*(\d+)%/g)].map((匹) => Number(匹[1]))
      if (段.length >= 6) return 段
      return [...紧.matchAll(/color-mix\([^)]*?(\d+)%/g)].map((匹) => Number(匹[1]))
    }
    const 浅序 = 取浓度序(浅)
    const 深序 = 取浓度序(深)
    expect(浅序.length, '浅色档取不到六段浓度序').toBeGreaterThanOrEqual(6)
    expect(深序.length, '深色档取不到六段浓度序').toBeGreaterThanOrEqual(6)
    const 浅递增 = 浅序.every((值, 序) => 序 === 0 || 值 >= 浅序[序 - 1])
    const 深递减 = 深序.every((值, 序) => 序 === 0 || 值 <= 深序[序 - 1])
    expect(浅递增, `浅色档不是由左向右变深：${浅序.join(',')}`).toBe(true)
    expect(深递减, `深色档不是由左向右变浅：${深序.join(',')}`).toBe(true)
  })

  it('扫出过渡约 0.38s 专用曲线且左起', () => {
    const 基 = 全局规则.filter((项) => 项.声明.has('transition-duration'))
    expect(基.some((项) => (项.声明.get('transition-duration') as string).includes('var(--shuru-sao-chu-shi-chang)'))).toBe(true)
    expect(基.some((项) => (项.声明.get('transition-timing-function') as string).includes('var(--quxian-sao-chu)'))).toBe(true)
    expect(基.some((项) => 项.声明.get('background-size') === '0% var(--shuru-xian-jujiao-kuan-du)')).toBe(true)
    expect(全局净.includes('background-position') && 全局净.includes('left bottom')).toBe(true)
    expect(全局净.includes('background-repeat') && 全局净.includes('no-repeat')).toBe(true)
    const 表 = 令牌表('light')
    expect(表.get('--quxian-sao-chu')).toBe('cubic-bezier(0.22, 0.9, 0.24, 1)')
  })

  it('登录注册所有输入框表现一致：同一类名同一真源，无逐字段覆盖', () => {
    const 模板 = 视图全源.slice(0, 视图全源.indexOf('<script'))
    const 输入框类 = [...模板.matchAll(/class="fenlie-shuru"/g)].length
    expect(输入框类, '登录注册输入框数漂移').toBeGreaterThanOrEqual(6)
    const 异轨边线 = 视图规则.filter(
      (项) =>
        项.选择器.includes('fenlie-shuru') &&
        (项.声明.get('border-bottom-color') !== undefined ||
          项.声明.get('border-bottom-width') !== undefined) &&
        !(
          项.声明.get('border-bottom-color') === 'var(--shuru-xian-changtai-se)' &&
          (项.声明.get('border-bottom-width') === undefined ||
            项.声明.get('border-bottom-width') === 'var(--shuru-xian-changtai-kuan-du)')
        ),
    )
    expect(异轨边线, `局部仍有异轨发丝线：${异轨边线.map((项) => 项.选择器).join(' / ')}`).toEqual([])
    expect(视图样式.includes('background-image: none'), '局部仍在灭 global 扫出层').toBe(false)
  })

  it('新令牌深浅成对且有真实消费者', () => {
    expect(声明位置('--shuru-sao-jianbian')).toEqual({ 共用: false, 浅色: true, 深色: true })
    expect(全局源.includes('var(--shuru-sao-jianbian)')).toBe(true)
  })
})

describe('FPA1 ②：登录手机号浮标签零遮盖', () => {
  it('light/dengLu：空态无文本，上浮态标签盒与输入文本无重叠且衬底同令牌', async () => {
    const 错误 = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { wrapper, 清理 } = await 挂载('light', 'dengLu')
      const 输入 = wrapper.find('#denglu-shoujihao').element as HTMLInputElement
      expect(输入.value).toBe('')
      const 组 = 输入.parentElement as HTMLElement
      expect(组.classList.contains('shangFu')).toBe(false)
      await wrapper.find('#denglu-shoujihao').setValue('13800138000')
      await flushPromises()
      expect(组.classList.contains('shangFu')).toBe(true)
      const 标式 = 计算(组.querySelector('.fudong-biaoqian'))
      const 组式 = 计算(组)
      const 输入式 = 计算(输入)
      expect(标式.position).toBe('absolute')
      const 标签顶 = 像素(标式.top, 'top')
      const 标签高 = 像素(标式.lineHeight, 'line-height')
      const 标签下 = 标签顶 + 标签高
      const 文字顶 = 像素(组式.paddingTop, '组 padding-top') + 源码盒边('.fenlie-shuru', 'padding-top')
      expect(标签下, `标签盒下沿 ${标签下} 越过输入文字顶 ${文字顶}`).toBeLessThan(文字顶)
      expect(文字顶 - 标签下, '标签与文字间隙不足').toBeGreaterThanOrEqual(7)
      const 卡式 = 计算(wrapper.find('.biaodan-rongqi').element)
      expect(标式.backgroundColor).toBe(卡式.backgroundColor)
      expect(错误).not.toHaveBeenCalled()
      清理()
      wrapper.unmount()
    } finally {
      错误.mockRestore()
    }
  })

  it('dark/zhuCe：劣化复现（无事件晚填经 focusin 同步）后仍零遮盖', async () => {
    const 错误 = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const { wrapper, 清理 } = await 挂载('dark', 'zhuCe')
      const 输入 = wrapper.find('#zhuce-shoujihao').element as HTMLInputElement
      输入.value = '13800138000'
      wrapper.find('.biaodan-rongqi').element.dispatchEvent(new Event('focusin', { bubbles: true }))
      await flushPromises()
      const 组 = 输入.parentElement as HTMLElement
      expect(组.classList.contains('shangFu')).toBe(true)
      const 标式 = 计算(组.querySelector('.fudong-biaoqian'))
      const 组式 = 计算(组)
      const 输入式 = 计算(输入)
      const 标签顶 = 像素(标式.top, 'top')
      const 标签高 = 像素(标式.lineHeight, 'line-height')
      const 标签下 = 标签顶 + 标签高
      const 文字顶 = 像素(组式.paddingTop, '组 padding-top') + 源码盒边('.fenlie-shuru', 'padding-top')
      expect(标签下).toBeLessThan(文字顶)
      expect(文字顶 - 标签下).toBeGreaterThanOrEqual(7)
      expect(错误).not.toHaveBeenCalled()
      清理()
      wrapper.unmount()
    } finally {
      错误.mockRestore()
    }
  })
})
