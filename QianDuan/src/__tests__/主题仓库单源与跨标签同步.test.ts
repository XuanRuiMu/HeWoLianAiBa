import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { 使用主题仓库, 主题键, 浅色值, 暗色值 } from '@/stores/主题'

function 派发跨标签事件(键: string | null, 新值: string | null) {
  window.dispatchEvent(new StorageEvent('storage', { key: 键, newValue: 新值 }))
}

describe('主题仓库只有「主题」一份编码', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    setActivePinia(createPinia())
  })

  it('切换主题只写 localStorage「主题」并把同一取值打到 data-theme', () => {
    const 仓库 = 使用主题仓库()
    仓库.chuShiHua()
    仓库.qieHuanZhuti(浅色值)
    expect(localStorage.getItem(主题键)).toBe(浅色值)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    仓库.qieHuanZhuti(暗色值)
    expect(localStorage.getItem(主题键)).toBe(暗色值)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('lian-ai-ba-zhu-ti')).toBeNull()
    expect(localStorage.length).toBe(1)
  })

  it('初始化只读不写，缺失存储值时落暗色默认', () => {
    const 仓库 = 使用主题仓库()
    仓库.chuShiHua()
    expect(仓库.dangQianZhuti).toBe(暗色值)
    expect(localStorage.getItem(主题键)).toBeNull()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('存储值非法时按暗色处理，不污染存储', () => {
    localStorage.setItem(主题键, '随机值')
    const 仓库 = 使用主题仓库()
    仓库.chuShiHua()
    expect(仓库.dangQianZhuti).toBe(暗色值)
    expect(localStorage.getItem(主题键)).toBe('随机值')
  })

  it('初始化清除旧版本镜像键，不留下未在隐私政策声明的数据', () => {
    localStorage.setItem('lian-ai-ba-zhu-ti', 'an-se')
    localStorage.setItem(主题键, 浅色值)
    const 仓库 = 使用主题仓库()
    仓库.chuShiHua()
    expect(localStorage.getItem('lian-ai-ba-zhu-ti')).toBeNull()
    expect(localStorage.getItem(主题键)).toBe(浅色值)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('跨标签同步只认「主题」键，其它键与清空不改动当前主题', () => {
    localStorage.setItem(主题键, 浅色值)
    setActivePinia(createPinia())
    const 仓库 = 使用主题仓库()
    仓库.chuShiHua()
    派发跨标签事件('其它键', 'light')
    expect(仓库.dangQianZhuti).toBe(浅色值)
    派发跨标签事件(主题键, 暗色值)
    expect(仓库.dangQianZhuti).toBe(暗色值)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    派发跨标签事件(主题键, null)
    expect(仓库.dangQianZhuti).toBe(暗色值)
  })

  it('跨标签同步只改 DOM 与状态，不代替其它标签写存储', () => {
    const 仓库 = 使用主题仓库()
    仓库.chuShiHua()
    派发跨标签事件(主题键, 浅色值)
    expect(仓库.dangQianZhuti).toBe(浅色值)
    expect(localStorage.getItem(主题键)).toBeNull()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
