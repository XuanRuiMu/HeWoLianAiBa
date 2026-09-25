import { vi } from 'vitest'

class JiaLocalStorage implements Storage {
  private cunChu = new Map<string, string>()

  get length() {
    return this.cunChu.size
  }

  getItem(jian: string): string | null {
    return this.cunChu.has(jian) ? (this.cunChu.get(jian) as string) : null
  }

  setItem(jian: string, zhi: string): void {
    this.cunChu.set(jian, zhi)
  }

  removeItem(jian: string): void {
    this.cunChu.delete(jian)
  }

  clear(): void {
    this.cunChu.clear()
  }

  key(suoYin: number): string | null {
    return Array.from(this.cunChu.keys())[suoYin] || null
  }
}

const jiaLocalStorage = new JiaLocalStorage()

Object.defineProperty(globalThis, 'localStorage', {
  value: jiaLocalStorage,
  writable: true,
  configurable: true,
})

vi.stubGlobal('localStorage', jiaLocalStorage)

const duiXiangDiZhiJiHe = new Map<Blob, string>()
let duiXiangDiZhiXuHao = 0

function jiaChuangDuiXiangURL(wenJian: Blob): string {
  const cunZaiDiZhi = duiXiangDiZhiJiHe.get(wenJian)
  if (cunZaiDiZhi) return cunZaiDiZhi
  const diZhi = `blob:vitest-${++duiXiangDiZhiXuHao}`
  duiXiangDiZhiJiHe.set(wenJian, diZhi)
  return diZhi
}

function xiaoMieDuiXiangURL(diZhi: string): void {
  for (const [wenJian, cunZaiDiZhi] of duiXiangDiZhiJiHe) {
    if (cunZaiDiZhi === diZhi) duiXiangDiZhiJiHe.delete(wenJian)
  }
}

Object.defineProperty(URL, 'createObjectURL', {
  configurable: true,
  writable: true,
  value: jiaChuangDuiXiangURL,
})
Object.defineProperty(URL, 'revokeObjectURL', {
  configurable: true,
  writable: true,
  value: xiaoMieDuiXiangURL,
})

const yuanShiGetComputedStyle = globalThis.getComputedStyle.bind(globalThis)
vi.stubGlobal(
  'getComputedStyle',
  (yuanSu: Element, weiDian?: string | null): CSSStyleDeclaration => {
    const yangShi = yuanShiGetComputedStyle(yuanSu, weiDian)
    const bianKuanLiang = /var\((--[\w-]+)(?:,[^)]+)?\)/.exec(yangShi.outline)?.[1]
    if (bianKuanLiang && !/px$/i.test(yangShi.outlineWidth)) {
      const jieJieLiang = yangShi.getPropertyValue(bianKuanLiang).trim()
      if (jieJieLiang) {
        Object.defineProperty(yangShi, 'outlineWidth', {
          configurable: true,
          value: jieJieLiang,
        })
      }
    }
    return yangShi
  },
)

// jsdom 不提供 ResizeObserver：组件 mounted 钩子直接 new ResizeObserver 会抛 ReferenceError，
// 中断整个初始化。提供空实现桩（仅保证不报错，尺寸回调非测试关注点）。
class JiaResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

vi.stubGlobal('ResizeObserver', JiaResizeObserver)
