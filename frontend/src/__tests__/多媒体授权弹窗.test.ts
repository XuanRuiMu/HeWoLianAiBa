import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import 多媒体授权弹窗 from '@/components/多媒体授权弹窗.vue'
import { huoQuFanYi } from '@/config/translations'

describe('C4 多媒体授权弹窗', () => {
  let wrapper: ReturnType<typeof mount> | null = null

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  it('隐藏时不渲染任何内容', () => {
    wrapper = mount(多媒体授权弹窗, { props: { xianShi: false }, attachTo: document.body })
    expect(document.body.querySelector('[data-testid="shouquan-queren"]')).toBeNull()
  })

  it('显示时渲染标题与双按钮，文案来自翻译文件', () => {
    wrapper = mount(多媒体授权弹窗, { props: { xianShi: true }, attachTo: document.body })
    const wenBen = document.body.textContent || ''
    expect(wenBen).toContain(huoQuFanYi('duoMeiTi', 'shouQuanBiaoTi'))
    expect(wenBen).toContain(huoQuFanYi('duoMeiTi', 'shouQuanZhengWen'))
    const queRenAnNiu = document.body.querySelector('[data-testid="shouquan-queren"]')
    const juJueAnNiu = document.body.querySelector('[data-testid="shouquan-jujue"]')
    expect(queRenAnNiu?.textContent?.trim()).toBe(huoQuFanYi('duoMeiTi', 'tongYiKaiQi'))
    expect(juJueAnNiu?.textContent?.trim()).toBe(huoQuFanYi('duoMeiTi', 'zanBuKaiQi'))
  })

  it('点击同意触发 queRen 事件', async () => {
    wrapper = mount(多媒体授权弹窗, { props: { xianShi: true }, attachTo: document.body })
    const queRenAnNiu = document.body.querySelector(
      '[data-testid="shouquan-queren"]',
    ) as HTMLElement
    queRenAnNiu.click()
    await flushPromises()
    expect(wrapper.emitted('queRen')).toHaveLength(1)
  })

  it('点击暂不开启触发 juJue 事件', async () => {
    wrapper = mount(多媒体授权弹窗, { props: { xianShi: true }, attachTo: document.body })
    const juJueAnNiu = document.body.querySelector('[data-testid="shouquan-jujue"]') as HTMLElement
    juJueAnNiu.click()
    await flushPromises()
    expect(wrapper.emitted('juJue')).toHaveLength(1)
  })

  it('翻译文件包含未授权占位提示与撤回说明', () => {
    const tiShi = huoQuFanYi('duoMeiTi', 'shouQuanWeiKaiQiTiShi')
    expect(tiShi.length).toBeGreaterThan(0)
    expect(huoQuFanYi('duoMeiTi', 'shouQuanKeCheHui')).toContain('账号与安全')
  })
})
