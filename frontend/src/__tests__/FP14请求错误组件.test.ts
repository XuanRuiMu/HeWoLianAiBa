import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compileStyle, parse as sfcParse } from '@vue/compiler-sfc'
import 请求错误 from '@/components/请求错误.vue'
import { chuangJianQianTaiCuoWu } from '@/utils/前台错误'
import { QIAN_TAI_DAI_MA, huoQuLianAiMa } from '@/config/前台错误码'
import { huoQuFanYi } from '@/config/translations'

function chuangJianKeChongShiCuoWu() {
  return chuangJianQianTaiCuoWu({
    code: QIAN_TAI_DAI_MA.SERVICE_UNAVAILABLE,
    retryable: true,
    traceId: 'request-0123456789abcdef',
    httpStatus: 503,
    houTaiBaoFeng: {
      code: QIAN_TAI_DAI_MA.SERVICE_UNAVAILABLE,
      message: 'SELECT secret FROM config at /srv/app/server.js',
      traceId: 'request-0123456789abcdef',
      retryable: true,
    },
  })
}

describe('FP-14 统一请求错误组件', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('最终渲染沉浸文案、恋爱码与可复制按钮且不泄露内部原文', async () => {
    const cuoWu = chuangJianKeChongShiCuoWu()
    const wrapper = mount(请求错误, { props: { cuoWu } })

    expect(wrapper.get('[role="alert"]').attributes('aria-live')).toBe('assertive')
    expect(wrapper.get('[role="alert"]').attributes('aria-atomic')).toBe('true')
    expect(cuoWu.message).toBe(cuoWu.lianAiWenAn)
    expect(wrapper.get('.qian-tai-cuo-wu-wen-an').text()).toBe(cuoWu.lianAiWenAn)
    expect(wrapper.get('.qian-tai-cuo-wu-lian-ai-ma').text()).toBe(cuoWu.lianAiMa)
    expect(wrapper.get('.qian-tai-cuo-wu-lian-ai-ma').text()).toBe(
      huoQuLianAiMa(QIAN_TAI_DAI_MA.SERVICE_UNAVAILABLE),
    )
    expect(wrapper.find('.qian-tai-cuo-wu-fu-zhi').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('影响')
    expect(wrapper.text()).not.toContain('下一步')
    expect(wrapper.text()).not.toContain('诊断信息')
    expect(wrapper.text()).not.toContain('错误码')
    expect(wrapper.text()).not.toContain('追踪编号')
    expect(wrapper.text()).not.toContain(QIAN_TAI_DAI_MA.SERVICE_UNAVAILABLE)
    expect(wrapper.text()).not.toContain('request-0123456789abcdef')
    expect(wrapper.text()).not.toContain('SELECT secret')
    expect(wrapper.text()).not.toContain('/srv/app/server.js')

    await wrapper.get('.qian-tai-cuo-wu-chong-shi').trigger('click')
    expect(wrapper.emitted('chongShi')).toHaveLength(1)
  })

  it('不可重试错误不展示重试动作，空值与取消请求不占页面空间', () => {
    const buKeChongShi = chuangJianQianTaiCuoWu({
      code: QIAN_TAI_DAI_MA.PERMISSION_DENIED,
      retryable: false,
    })
    const buKeChongShiWrapper = mount(请求错误, { props: { cuoWu: buKeChongShi } })
    expect(buKeChongShiWrapper.find('.qian-tai-cuo-wu-chong-shi').exists()).toBe(false)
    expect(buKeChongShiWrapper.get('.qian-tai-cuo-wu-lian-ai-ma').text()).toBe(
      huoQuLianAiMa(QIAN_TAI_DAI_MA.PERMISSION_DENIED),
    )

    const quXiao = chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.QU_XIAO, retryable: false })
    expect(mount(请求错误, { props: { cuoWu: quXiao } }).find('.qian-tai-cuo-wu').exists()).toBe(false)
    expect(mount(请求错误, { props: { cuoWu: null } }).find('.qian-tai-cuo-wu').exists()).toBe(false)
  })

  it('恋爱码可复制，复制失败给出翻译反馈', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const wrapper = mount(请求错误, { props: { cuoWu: chuangJianKeChongShiCuoWu() } })

    expect(wrapper.find('details').exists()).toBe(false)
    await wrapper.get('.qian-tai-cuo-wu-fu-zhi').trigger('click')
    await vi.waitFor(() => expect(wrapper.get('.qian-tai-cuo-wu-fu-zhi-zhuang-tai').text()).toBe(
      huoQuFanYi('tongYong', 'qianTaiCuoWuFuZhiChengGong'),
    ))
    expect(writeText).toHaveBeenCalledWith(
      huoQuLianAiMa(QIAN_TAI_DAI_MA.SERVICE_UNAVAILABLE),
    )

    writeText.mockRejectedValueOnce(new Error('permission denied'))
    await wrapper.get('.qian-tai-cuo-wu-fu-zhi').trigger('click')
    await vi.waitFor(() => expect(wrapper.get('.qian-tai-cuo-wu-fu-zhi-zhuang-tai').text()).toBe(
      huoQuFanYi('tongYong', 'qianTaiCuoWuFuZhiShiBai'),
    ))
  })

  it('双主题、移动端与 reduced-motion 由组件自身覆盖且样式只吃现有令牌', () => {
    expect(wrapper样式()).toContain(":root[data-theme='light']")
    expect(wrapper样式()).toContain('var(--wenben-zhuse)')
    expect(wrapper样式()).toContain('var(--beijing-kaopian)')
    expect(wrapper样式()).toMatch(/@media\s*\(max-width:\s*640px\)/)
    expect(wrapper样式()).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    expect(wrapper样式()).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/)
  })

  it('FP-K2 编译产物回归门（第二落点）：浅色卡面规则必须仍绑定面板本体，不被编译器丢弃后代段', () => {
    // 与 FPD主题账号挑战.test.ts 的 FP-K2 门同判据双落点：:global 包判断再接后代的写法会被
    // scoped 编译器丢弃后代段，只剩文档根——错误面板浅色档会吃不到底色。门必须在组件自己的
    // 测试文件里也钉一份，防止单侧文件被删改时回归静默漏网。
    const 错误面板源码 = readFileSync(resolve(__dirname, '../components/请求错误.vue'), 'utf8')
    const { descriptor } = sfcParse(错误面板源码, { filename: '请求错误.vue' })
    const 编译 = compileStyle({
      source: descriptor.styles[0]!.content,
      filename: '请求错误.vue',
      id: 'data-v-fpk2',
      scoped: true,
    })
    expect(编译.errors, '请求错误.vue 样式编译报错').toEqual([])
    const 规则块 = 编译.code.split('}')
    const 浅色块 = 规则块.find((块) => 块.includes(":root[data-theme='light']"))
    expect(浅色块, '浅色档面板卡面规则在编译产物中丢失').toBeTruthy()
    const 浅色选择器 = (浅色块 as string).slice(0, (浅色块 as string).indexOf('{')).trim()
    expect(
      浅色选择器,
      `浅色卡面被编译到文档根、错误面板浅色档吃不到底色：${浅色选择器}`,
    ).toMatch(/:root\[data-theme='light'\]\s+\.qian-tai-cuo-wu\[data-v-/)
    expect(浅色块 as string).toContain('var(--beijing-kaopian)')
  })
})

function wrapper样式(): string {
  return readFileSync(resolve(__dirname, '../components/请求错误.vue'), 'utf8')
}
