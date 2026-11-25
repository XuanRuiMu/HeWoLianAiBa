import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const 接口 = vi.hoisted(() => ({
  取挑战: vi.fn(),
  发码: vi.fn(),
  重置: vi.fn(),
}))

const 请求 = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

vi.mock('@/api/请求', () => ({
  default: 请求,
}))

vi.mock('@/api/认证', () => ({
  YanZhengMaYongTu: { zhuCe: 'zhuCe', chongZhiMiMa: 'chongZhiMiMa' },
  huoQuRenJiTiaoZhan: 接口.取挑战,
  faSongMa: 接口.发码,
  chongZhiMiMa: 接口.重置,
  jianChaShouJiHao: vi.fn(),
  gengGaiMiMa: vi.fn(),
}))

vi.mock('@/config/翻译表', () => ({
  huoQuFanYi: (_fenLei: string, jian: string) => jian,
}))

import 人机测试 from '@/components/认证/人机测试.vue'

Element.prototype.getAnimations = () => []
Element.prototype.animate = () =>
  ({ cancel: () => undefined, finished: Promise.resolve() }) as unknown as Animation

const 挑战样例 = {
  id: 'rj_0123456789abcdef0123456789abcdef',
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 64"><circle cx="6" cy="6" r="2"/></svg>',
  guoQiMiao: 120,
}

function 取体元素(选择器: string): HTMLElement {
  const 元素 = document.body.querySelector(选择器)
  if (!元素) throw new Error(`找不到元素：${选择器}`)
  return 元素 as HTMLElement
}

beforeEach(() => {
  document.body.innerHTML = ''
  接口.取挑战.mockReset()
  接口.发码.mockReset()
  接口.重置.mockReset()
  接口.取挑战.mockResolvedValue(挑战样例)
})

describe('人机测试组件', () => {
  it('打开即按用途领取挑战，渲染为data URI图片且不含可注入HTML', async () => {
    const 包装 = mount(人机测试, {
      props: { xianShi: true, yongTu: 'zhuCe' },
      attachTo: document.body,
    })
    await flushPromises()
    await nextTick()
    expect(接口.取挑战).toHaveBeenCalledWith('zhuCe')
    const 图片 = 取体元素('img.renji-tuxiang') as HTMLImageElement
    expect(图片.src.startsWith('data:image/svg+xml')).toBe(true)
    expect(图片.src).toContain(encodeURIComponent('<svg'))
    expect(document.body.querySelector('.renji-tanchuang')?.getAttribute('role')).toBe('dialog')
    expect(document.body.querySelector('.renji-tanchuang')?.getAttribute('aria-modal')).toBe('true')
    包装.unmount()
  })

  it('低矮视口布局契约：按钮行在滚动内容区之外，弹窗自身不滚动', async () => {
    const 包装 = mount(人机测试, {
      props: { xianShi: true, yongTu: 'zhuCe' },
      attachTo: document.body,
    })
    await flushPromises()
    await nextTick()
    const 弹窗 = 取体元素('.renji-tanchuang')
    const 内容区 = 取体元素('.renji-neirong')
    const 按钮行 = 取体元素('.renji-anniu-hang')
    expect(内容区.contains(取体元素('#renji-daan'))).toBe(true)
    expect(内容区.contains(取体元素('img.renji-tuxiang'))).toBe(true)
    expect(内容区.contains(取体元素('.renji-miaoshu') as Node)).toBe(true)
    expect(内容区.contains(按钮行)).toBe(false)
    expect(按钮行.parentElement?.classList.contains('renji-biaodan')).toBe(true)
    expect(按钮行.contains(取体元素('.renji-que-ren'))).toBe(true)
    expect(按钮行.contains(取体元素('.renji-geng-huan'))).toBe(true)
    expect(弹窗.contains(取体元素('.renji-toubu'))).toBe(true)
    包装.unmount()
  })

  it('样式契约：弹窗高度受限双写 vh/dvh，存在矮视口压缩档与滚动区规则', () => {
    const 源 = readFileSync(resolve(__dirname, '../components/认证/人机测试.vue'), 'utf8')
    const 样式 = 源.slice(源.indexOf('<style'))
    expect(样式).toContain('max-height: calc(100vh - var(--jiange-da) * 2)')
    expect(样式).toContain('max-height: calc(100dvh - var(--jiange-da) * 2)')
    expect(样式).toMatch(/\.renji-tanchuang\s*\{[^}]*overflow: hidden/)
    expect(样式).toMatch(/\.renji-neirong\s*\{[^}]*overflow-y: auto/)
    expect(样式).toMatch(/\.renji-neirong\s*\{[^}]*min-height: 0/)
    expect(样式).toContain('@media (max-height: 540px)')
  })

  it('输入自动转大写，确认时提交票据与4位答案', async () => {
    const 包装 = mount(人机测试, {
      props: { xianShi: true, yongTu: 'chongZhiMiMa' },
      attachTo: document.body,
    })
    await flushPromises()
    await nextTick()
    expect(接口.取挑战).toHaveBeenCalledWith('chongZhiMiMa')
    const 输入 = 取体元素('#renji-daan') as HTMLInputElement
    输入.value = ' ab2c '
    输入.dispatchEvent(new Event('input'))
    await nextTick()
    expect(输入.value).toBe('AB2C')
    取体元素('.renji-que-ren').click()
    await nextTick()
    expect(包装.emitted('ti-jiao')?.[0]).toEqual([
      { renJiPiaoJu: 挑战样例.id, renJiDaAn: 'AB2C' },
    ])
    包装.unmount()
  })

  it('答案不足4位时不提交，显示错误并保持弹窗', async () => {
    const 包装 = mount(人机测试, {
      props: { xianShi: true, yongTu: 'zhuCe' },
      attachTo: document.body,
    })
    await flushPromises()
    await nextTick()
    const 输入 = 取体元素('#renji-daan') as HTMLInputElement
    输入.value = 'AB'
    输入.dispatchEvent(new Event('input'))
    await nextTick()
    取体元素('.renji-que-ren').click()
    await nextTick()
    expect(包装.emitted('ti-jiao')).toBeUndefined()
    expect(取体元素('.renji-cuowu').textContent).toContain('renJiYanZhengShiBai')
    expect(document.body.querySelector('.renji-tanchuang')).not.toBeNull()
    包装.unmount()
  })

  it('Esc取消、点击遮罩取消，确认中禁止关闭', async () => {
    const 包装 = mount(人机测试, {
      props: { xianShi: true, yongTu: 'zhuCe' },
      attachTo: document.body,
    })
    await flushPromises()
    const 遮罩 = 取体元素('.renji-zhezhao')
    遮罩.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(包装.emitted('guan-bi')).toHaveLength(1)
    await 包装.setProps({ dengDaiZhong: true })
    遮罩.click()
    await nextTick()
    expect(包装.emitted('guan-bi')).toHaveLength(1)
    包装.unmount()
  })

  it('挑战加载失败显示可重试错误，服务端判错后换新挑战并保留提示', async () => {
    接口.取挑战.mockRejectedValueOnce(new Error('network'))
    const 包装 = mount(人机测试, {
      props: { xianShi: true, yongTu: 'zhuCe' },
      attachTo: document.body,
    })
    await flushPromises()
    await nextTick()
    expect(取体元素('.renji-zhanwei').textContent).toContain('renJiYanZhengShiBai')
    接口.取挑战.mockResolvedValueOnce({ ...挑战样例, id: 'rj_ffffffffffffffffffffffffffffffff' })
    取体元素('.renji-geng-huan').click()
    await flushPromises()
    await nextTick()
    expect(document.body.querySelector('img.renji-tuxiang')).not.toBeNull()
    ;(包装.vm as unknown as { biaoShiYanZhengShiBai: () => void }).biaoShiYanZhengShiBai()
    await flushPromises()
    await nextTick()
    expect(接口.取挑战).toHaveBeenCalledTimes(3)
    expect(取体元素('.renji-cuowu').textContent).toContain('renJiYanZhengShiBai')
    包装.unmount()
  })
})

describe('发码接口契约', () => {
  it('发送码把票据与答案放进请求体，取得挑战时携带用途', async () => {
    const { faSongMa, huoQuRenJiTiaoZhan } = await vi.importActual<typeof import('@/api/认证')>('@/api/认证')
    const 发送 = 请求.post.mockResolvedValueOnce({ data: { cheng_gong: true } })
    await faSongMa(
      '13800000000',
      'zhuCe',
      { signal: new AbortController().signal },
      { renJiPiaoJu: 挑战样例.id, renJiDaAn: 'AB2C' },
    )
    expect(发送).toHaveBeenCalledWith(
      '/认证/发送码',
      {
        shouJiHao: '13800000000',
        yongTu: 'zhuCe',
        renJiPiaoJu: 挑战样例.id,
        renJiDaAn: 'AB2C',
      },
      { signal: expect.any(AbortSignal) },
    )
    const 取得 = 请求.get.mockResolvedValueOnce({
      data: { cheng_gong: true, shu_ju: 挑战样例 },
    })
    const 结果 = await h                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                