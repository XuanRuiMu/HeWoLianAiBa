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

describe('FP-05 单行高度与 CSS 同源度量不冲突', () => {
  // 缺陷5 的解法是把输入框外壳与发送按钮交给同一组 CSS 度量（--shuru-kuang-*），
  // composable 的折叠 max-height 只能「向上取整」，一旦夹紧就会同时改掉两盒高度，
  // 故此处把「ceil(度量) ≥ CSS 声明的单行内容高」钉成契约。
  async function huoQuCSSDanXingGao(): Promise<number> {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const yuanMa = fs.readFileSync(path.resolve(process.cwd(), 'src/views/聊天页面.vue'), 'utf-8')
    const rongqi = yuanMa.match(/\.shuru-rongqi\s*\{[^}]*\}/)?.[0] ?? ''
    const zihao = parseFloat(rongqi.match(/--shuru-kuang-zihao:\s*([\d.]+)px/)?.[1] ?? '')
    const hangao = parseFloat(rongqi.match(/--shuru-kuang-hangao:\s*([\d.]+)/)?.[1] ?? '')
    const neidian = parseFloat(rongqi.match(/--shuru-kuang-shang-xia-neidian:\s*([\d.]+)px/)?.[1] ?? '')
    expect([zihao, hangao, neidian]).toEqual([16, 1.4, 6])
    return zihao * hangao + neidian * 2
  }

  let zuHe: ReturnType<typeof zaoZuHe> | null = null
  afterEach(() => {
    zuHe?.el.remove()
  })

  it('折叠 max-height 取整自同一度量，且永不夹紧 CSS 声明的单行高度', async () => {
    const danXingGao = await huoQuCSSDanXingGao()
    expect(danXingGao).toBeCloseTo(34.4, 6)
    const yuanShi = globalThis.getComputedStyle
    globalThis.getComputedStyle = (() =>
      ({
        lineHeight: `${danXingGao - 12}px`,
        fontSize: '16px',
        paddingTop: '6px',
        paddingBottom: '6px',
        borderTopWidth: '0px',
        borderBottomWidth: '0px',
      })) as unknown as typeof getComputedStyle
    try {
      zuHe = zaoZuHe(danXingGao, 40)
      zuHe.ceLiangShuRuKuang()
      await nextTick()
      expect(zuHe.shuRuKuangYangShi.value).toEqual({ maxHeight: `${Math.ceil(danXingGao)}px` })
      expect(parseFloat(zuHe.shuRuKuangYangShi.value.maxHeight as string)).toBeGreaterThanOrEqual(danXingGao)
    } finally {
      globalThis.getComputedStyle = yuanShi
    }
  })

  it('折叠态内容超一行保持折叠不自动展开，把溢出交给可见滚动条', async () => {
    zuHe = zaoZuHe(120, 34)
    zuHe.ceLiangShuRuKuang()
    await nextTick()
    expect(zuHe.shuRuKuangZhanKai.value).toBe(false)
    expect(zuHe.shuRuKuangKeZhanKai.value).toBe(true)
    expect(zuHe.zhanKaiAnNiuKeYong.value).toBe(true)
    expect(zuHe.shuRuKuangYangShi.value).toEqual({ maxHeight: '34px' })
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
