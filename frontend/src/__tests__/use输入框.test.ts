import { ref, nextTick } from 'vue'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { use输入框 } from '@/composables/use输入框'

function zaoZuHe(scrollHeight: number, clientHeight: number) {
  const el = document.createElement('textarea')
  document.body.appendChild(el)
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true })
  const jiaoDian = vi.spyOn(el, 'focus').mockImplementation(() => {})
  const shuruKuangRef = ref<HTMLTextAreaElement | null>(el)
  const shuRuNeiRong = ref('')
  const zuHe = use输入框({ shuruKuangRef, shuRuNeiRong })
  return { ...zuHe, shuruKuangRef, shuRuNeiRong, el, jiaoDian }
}

describe('use输入框 高度测量与展开态', () => {
  let huoDong: ReturnType<typeof zaoZuHe> | null = null
  beforeEach(() => {
    huoDong = null
  })
  afterEach(() => {
    huoDong?.el.remove()
  })

  it('测量读取自然内容高度，折叠态样式为单行最大高度', async () => {
    huoDong = zaoZuHe(120, 40)
    huoDong.ceLiangShuRuKuang()
    await nextTick()
    expect(huoDong.el.style.height).toBe('')
    expect(huoDong.zhanKaiAnNiuKeYong.value).toBe(true)
    expect(huoDong.shuRuKuangYangShi.value).toEqual({ maxHeight: '40px' })
    expect(huoDong.shuRuKuangZhanKai.value).toBe(false)
    expect(huoDong.shuRuKuangKeZhanKai.value).toBe(true)
  })

  it('单行内容时无展开出口（按钮禁用）', async () => {
    huoDong = zaoZuHe(30, 40)
    huoDong.ceLiangShuRuKuang()
    await nextTick()
    expect(huoDong.shuRuKuangKeZhanKai.value).toBe(false)
    expect(huoDong.zhanKaiAnNiuKeYong.value).toBe(false)
  })

  it('切换展开后聚焦输入框，内容回落后自动收起', async () => {
    huoDong = zaoZuHe(120, 40)
    huoDong.ceLiangShuRuKuang()
    await nextTick()
    huoDong.qieHuanShuRuKuangZhanKai()
    await nextTick()
    expect(huoDong.shuRuKuangZhanKai.value).toBe(true)
    expect(huoDong.jiaoDian).toHaveBeenCalled()
    const zhanKaiYangShi = huoDong.shuRuKuangYangShi.value
    expect(Object.keys(zhanKaiYangShi)).toContain('height')
    expect(Object.keys(zhanKaiYangShi)).toContain('maxHeight')

    Object.defineProperty(huoDong.el, 'scrollHeight', { value: 20, configurable: true })
    huoDong.ceLiangShuRuKuang()
    await nextTick()
    expect(huoDong.shuRuKuangKeZhanKai.value).toBe(false)
    expect(huoDong.shuRuKuangZhanKai.value).toBe(false)
  })

  it('重算时刷新视口高度并重新测量', async () => {
    const yuanGaoDu = window.innerHeight
    Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true })
    try {
      huoDong = zaoZuHe(120, 40)
      huoDong.chongSuanShuRuKuangGaoDu()
      await nextTick()
      expect(huoDong.zhanKaiAnNiuKeYong.value).toBe(true)
    } finally {
      Object.defineProperty(window, 'innerHeight', { value: yuanGaoDu, configurable: true })
    }
  })
})

describe('FP-02 输入框绿线根因去除', () => {
  it('全局输入聚焦不再使用绿色描边', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/global.css'), 'utf-8')
    expect(css).not.toMatch(/:focus-visible\s*{[^}]*var\(--zhuse\)/)
    expect(css).not.toMatch(/\.shuru-kuang:focus\s*{[^}]*var\(--zhuse\)/)
  })
})
