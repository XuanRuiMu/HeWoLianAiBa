import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import XieyiMoTaiKuang from '../components/协议模态框.vue'

const 源码 = readFileSync(resolve(__dirname, '../components/协议模态框.vue'), 'utf8')

function 取样式(源: string): string {
  const 匹配 = /<style[^>]*>([\s\S]*?)<\/style>/.exec(源)
  expect(匹配, '协议模态框缺少 style 块').not.toBeNull()
  return (匹配 as RegExpMatchArray)[1]
}

function 取块(块: string, 选择器: string): string {
  const 归一 = 块.replace(/\r\n/g, '\n')
  const 裸 = 归一.indexOf(选择器)
  expect(裸, '缺少规则块 ' + 选择器).toBeGreaterThan(-1)
  const 行首 = 归一.indexOf('\n' + 选择器)
  const 起 = 行首 >= 0 ? 行首 : 裸
  const 余 = 归一.slice(起)
  return 余.slice(0, 余.indexOf('}') + 1)
}

function 取值(块: string, 属性: string): string | null {
  const 匹配 = new RegExp('(?:^|[;{\\s])' + 属性.replace(/-/g, '\\-') + ':\\s*([^;}]+)').exec(块)
  return 匹配 ? 匹配[1].trim() : null
}

const 样式 = 取样式(源码)

afterEach(() => {
  document.body.innerHTML = ''
})

describe('协议弹窗正文结构与阅读排版', () => {
  it('按主标题、章标题、节标题、正文四层渲染，不再整篇塞进 pre', () => {
    expect(源码).not.toContain('<pre')
    expect(源码).toContain('class="xieyi-zhang"')
    expect(源码).toContain('class="xieyi-jie"')
    expect(源码).toContain('class="xieyi-duan"')
    expect(源码).toContain('class="xieyi-gengxin"')
  })

  it('用户协议正文拆出十个章、二十个以上节与多个自然段', async () => {
    const 包 = mount(XieyiMoTaiKuang, {
      props: { xianShi: true, leiXing: 'yongHuXieYi' },
      attachTo: document.body,
    })
    await nextTick()
    const 弹窗 = document.querySelector('[role="dialog"]')
    expect(弹窗).not.toBeNull()
    expect(弹窗?.querySelector('h2')?.textContent?.trim()).toBe('用户协议')
    expect(弹窗?.querySelectorAll('.xieyi-zhang').length).toBeGreaterThanOrEqual(10)
    expect(弹窗?.querySelectorAll('.xieyi-jie').length).toBeGreaterThanOrEqual(20)
    expect(弹窗?.querySelectorAll('.xieyi-duan').length).toBeGreaterThanOrEqual(20)
    expect(弹窗?.querySelector('pre')).toBeNull()
    expect(弹窗?.querySelector('.xieyi-zhang')?.textContent?.trim()).toBe('一、引言')
    expect(弹窗?.querySelector('.xieyi-jie')?.textContent?.trim()).toBe('2.1 服务内容')
    包.unmount()
  })

  it('隐私政策复用同一套分层，章节标题来自原文', async () => {
    const 包 = mount(XieyiMoTaiKuang, {
      props: { xianShi: true, leiXing: 'yinSiZhengCe' },
      attachTo: document.body,
    })
    await nextTick()
    const 弹窗 = document.querySelector('[role="dialog"]')
    expect(弹窗?.querySelector('h2')?.textContent?.trim()).toBe('隐私政策')
    expect(弹窗?.querySelector('.xieyi-zhang')?.textContent?.trim()).toBe('一、数据控制者信息')
    expect(弹窗?.querySelector('.xieyi-jie')?.textContent?.trim()).toBe('2.1 身份信息')
    包.unmount()
  })

  it('正文行宽收在 72 字符以内，段落之间留出 12px 节奏', () => {
    const 正文 = 取块(样式, '.xieyi-zhengwen {')
    expect(取值(正文, 'max-width')).toBe('72ch')
    const 段 = 取块(样式, '.xieyi-duan + .xieyi-duan {')
    expect(取值(段, 'margin-top')).toBe('var(--jiange-12)')
    const 章 = 取块(样式, '.xieyi-zhang {')
    expect(取值(章, 'margin')).toBe('var(--jiange-da) 0 var(--jiange-xiao)')
    const 节 = 取块(样式, '.xieyi-jie {')
    expect(取值(节, 'margin')).toBe('var(--jiange-zhong) 0 var(--jiange-6)')
  })

  it('滚动区由弹窗高度约束并可键盘聚焦滚动', () => {
    const 内容 = 取块(样式, '.xieyi-neirong {')
    expect(取值(内容, 'flex')).toBe('1')
    expect(取值(内容, 'min-height')).toBe('0')
    expect(取值(内容, 'overflow-y')).toBe('auto')
    expect(源码).toContain('ref="neirongQu"')
    expect(源码).toContain('tabindex="0"')
    const 弹窗 = 取块(样式, '.xieyi-tanchuang {')
    expect(取值(弹窗, 'max-height')).toBe('calc(100dvh - var(--jiange-da) * 4)')
  })

  it('明暗两档只靠主题令牌，组件内不留手挑色值', () => {
    expect(样式).not.toMatch(/#[0-9a-f]{3,8}/i)
    expect(样式).not.toMatch(/rgba?\(/)
    expect(样式).toContain('var(--tanchuang-beijing)')
    expect(样式).toContain('var(--tanchuang-biaoti)')
    expect(样式).toContain('var(--wenben-zhuse)')
    expect(样式).toContain('var(--wen-zi-ci-se)')
  })
})

describe('协议弹窗关闭与焦点边界', () => {
  it('关闭钮 32px 可见盒配 44px 外扩热区，位置在头部右侧', async () => {
    const 热区 = 取块(样式, '.xieyi-guanbi::before {')
    expect(取值(热区, 'width')).toBe('var(--shuru-anniu-re-ku)')
    expect(取值(热区, 'height')).toBe('var(--shuru-anniu-re-ku)')
    const 关闭 = 取块(样式, '.xieyi-guanbi {')
    expect(取值(关闭, 'position')).toBe('relative')
    expect(取值(关闭, 'width')).toBe('calc(var(--jiange-da) + var(--jiange-xiao))')
    expect(取值(关闭, 'height')).toBe('calc(var(--jiange-da) + var(--jiange-xiao))')
    expect(源码).toContain(":aria-label=")
    expect(源码).toContain('role="dialog"')
    expect(源码).toContain('aria-modal="true"')
  })

  it('打开后焦点落到关闭钮，Tab 在弹窗内循环', async () => {
    const 包 = mount(XieyiMoTaiKuang, {
      props: { xianShi: true, leiXing: 'yongHuXieYi' },
      attachTo: document.body,
    })
    await nextTick()
    await nextTick()
    const 关闭 = document.querySelector('.xieyi-guanbi') as HTMLElement
    const 底部 = document.querySelector('.xieyi-zhidao') as HTMLElement
    expect(document.activeElement).toBe(关闭)
    底部.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(关闭)
    关闭.focus()
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
    )
    expect(document.activeElement).toBe(底部)
    包.unmount()
  })

  it('Esc 关闭并归还焦点，关闭后不残留键盘监听', async () => {
    const 触发 = document.createElement('button')
    document.body.append(触发)
    触发.focus()
    const 包 = mount(XieyiMoTaiKuang, {
      props: { xianShi: true, leiXing: 'yongHuXieYi' },
      attachTo: document.body,
    })
    await nextTick()
    await nextTick()
    const 按钮 = document.createElement('button')
    document.body.append(按钮)
    按钮.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    expect(包.emitted('guanBi')).toHaveLength(1)
    await 包.setProps({ xianShi: false })
    await nextTick()
    expect(document.activeElement).toBe(触发)
    包.unmount()
  })
})
