const 免加固类型 = new Set([
  'checkbox',
  'radio',
  'file',
  'range',
  'color',
  'button',
  'submit',
  'reset',
  'hidden',
  'image',
])

const 加固标记 = 'jinZhiZiDongTianChong'

export function 加固文本输入(元素: HTMLInputElement | HTMLTextAreaElement): void {
  if (元素.dataset[加固标记] === 'true') return
  const 类型 = 元素 instanceof HTMLInputElement ? 元素.type.toLowerCase() : 'textarea'
  if (免加固类型.has(类型)) return
  元素.dataset[加固标记] = 'true'
  元素.setAttribute('autocomplete', 类型 === 'password' ? 'new-password' : 'off')
  元素.setAttribute('autocorrect', 'off')
  元素.setAttribute('autocapitalize', 'off')
  元素.setAttribute('spellcheck', 'false')
  元素.setAttribute('data-lpignore', 'true')
  if (元素.readOnly || 元素 === document.activeElement) return
  // 只读态让 Chromium 在页面载入时跳过启发式填充；用户第一次触碰即恢复可输入，
  // 因此不会影响正常输入、Tab 焦点或移动端键盘。
  元素.readOnly = true
  const 解锁 = () => {
    元素.readOnly = false
    元素.removeEventListener('pointerdown', 解锁)
    元素.removeEventListener('focus', 解锁)
    元素.removeEventListener('keydown', 解锁)
  }
  元素.addEventListener('pointerdown', 解锁, { once: true })
  元素.addEventListener('focus', 解锁, { once: true })
  元素.addEventListener('keydown', 解锁, { once: true })
}

function 扫描节点(根: ParentNode): void {
  根.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach(加固文本输入)
}

export interface 自动填充守卫 {
  扫描: () => void
  开始: () => void
  停止: () => void
}

export function 创建自动填充守卫(是否免禁页: () => boolean): 自动填充守卫 {
  let 观察者: MutationObserver | null = null

  function 扫描(): void {
    if (是否免禁页()) return
    扫描节点(document)
  }

  function 开始(): void {
    扫描()
    if (观察者 || typeof MutationObserver === 'undefined') return
    观察者 = new MutationObserver((记录) => {
      if (是否免禁页()) return
      for (const 条目 of 记录) {
        for (const 节点 of 条目.addedNodes) {
          if (!(节点 instanceof HTMLElement)) continue
          if (节点.matches('input, textarea')) 加固文本输入(节点 as HTMLInputElement | HTMLTextAreaElement)
          扫描节点(节点)
        }
      }
    })
    观察者.observe(document.body, { childList: true, subtree: true })
  }

  function 停止(): void {
    观察者?.disconnect()
    观察者 = null
  }

  return { 扫描, 开始, 停止 }
}
