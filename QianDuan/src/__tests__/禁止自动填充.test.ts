import { afterEach, describe, expect, it } from 'vitest'
import { 加固文本输入, 创建自动填充守卫 } from '@/utils/禁止自动填充'

function 建输入(属性: Partial<HTMLInputElement> = {}): HTMLInputElement {
  const 元素 = document.createElement('input')
  Object.assign(元素, 属性)
  document.body.appendChild(元素)
  return 元素
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('非认证页禁止浏览器自动填充', () => {
  it('给文本输入写入关闭语义并先锁成只读，触碰后恢复可输入', () => {
    const 元素 = 建输入()
    加固文本输入(元素)
    expect(元素.getAttribute('autocomplete')).toBe('off')
    expect(元素.getAttribute('autocorrect')).toBe('off')
    expect(元素.getAttribute('autocapitalize')).toBe('off')
    expect(元素.getAttribute('spellcheck')).toBe('false')
    expect(元素.getAttribute('data-lpignore')).toBe('true')
    expect(元素.readOnly).toBe(true)
    元素.dispatchEvent(new FocusEvent('focus'))
    expect(元素.readOnly).toBe(false)
  })

  it('密码输入使用 new-password 语义，多行输入同样关闭', () => {
    const 密码 = 建输入({ type: 'password' })
    加固文本输入(密码)
    expect(密码.getAttribute('autocomplete')).toBe('new-password')
    const 多行 = document.createElement('textarea')
    document.body.appendChild(多行)
    加固文本输入(多行)
    expect(多行.getAttribute('autocomplete')).toBe('off')
    expect(多行.readOnly).toBe(true)
  })

  it('勾选、文件、滑杆等非文本控件不改写', () => {
    const 勾选 = 建输入({ type: 'checkbox' })
    加固文本输入(勾选)
    expect(勾选.readOnly).toBe(false)
    expect(勾选.getAttribute('autocomplete')).toBeNull()
  })

  it('免禁页（登录/注册/找回密码）整页跳过', () => {
    const 元素 = 建输入()
    const 守卫 = 创建自动填充守卫(() => true)
    守卫.开始()
    守卫.扫描()
    expect(元素.readOnly).toBe(false)
    expect(元素.getAttribute('autocomplete')).toBeNull()
    守卫.停止()
  })

  it('非免禁页扫描后对所有已有文本框生效', () => {
    const 甲 = 建输入()
    const 乙 = document.createElement('textarea')
    document.body.appendChild(乙)
    const 守卫 = 创建自动填充守卫(() => false)
    守卫.开始()
    守卫.扫描()
    expect(甲.readOnly).toBe(true)
    expect(乙.readOnly).toBe(true)
    守卫.停止()
  })
})
