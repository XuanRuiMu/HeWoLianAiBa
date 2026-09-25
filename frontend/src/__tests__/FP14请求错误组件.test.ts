import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import 请求错误 from '@/components/请求错误.vue'
import { chuangJianQianTaiCuoWu } from '@/utils/前台错误'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
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

  it('最终渲染稳定错误码、影响、下一步与可重试动作且不泄露内部原文', async () => {
    const cuoWu = chuangJianKeChongShiCuoWu()
    const wrapper = mount(请求错误, { props: { cuoWu } })

    expect(wrapper.get('[role="alert"]').attributes('aria-live')).toBe('assertive')
    expect(wrapper.get('[role="alert"]').attributes('aria-atomic')).toBe('true')
    expect(wrapper.get('.qian-tai-cuo-wu-dai-ma').text()).toContain(QIAN_TAI_DAI_MA.SERVICE_UNAVAILABLE)
    expect(wrapper.get('.qian-tai-cuo-wu-ying-xiang').text()).toContain(
      huoQuFanYi('tongYong', 'fuWuWenTiYingXiang'),
    )
    expect(wrapper.get('.qian-tai-cuo-wu-xia-yi-bu').text()).toContain(
      huoQuFanYi('tongYong', 'fuWuWenTiXiaYiBu'),
    )
    expect(wrapper.find('details').exists()).toBe(true)
    expect(wrapper.text()).toContain('request-0123456789abcdef')
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
    expect(buKeChongShiWrapper.get('.qian-tai-cuo-wu-dai-ma').text()).toContain(
      QIAN_TAI_DAI_MA.PERMISSION_DENIED,
    )

    const quXiao = chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.QU_XIAO, retryable: false })
    expect(mount(请求错误, { props: { cuoWu: quXiao } }).find('.qian-tai-cuo-wu').exists()).toBe(false)
    expect(mount(请求错误, { props: { cuoWu: null } }).find('.qian-tai-cuo-wu').exists()).toBe(false)
  })

  it('追踪编号只在诊断折叠区并可复制，复制失败给出翻译反馈', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const wrapper = mount(请求错误, { props: { cuoWu: chuangJianKeChongShiCuoWu() } })

    expect(wrapper.get('details').attributes('open')).toBeUndefined()
    await wrapper.get('.qian-tai-cuo-wu-fu-zhi').trigger('click')
    await vi.waitFor(() => expect(wrapper.get('.qian-tai-cuo-wu-fu-zhi-zhuang-tai').text()).toBe(
      huoQuFanYi('tongYong', 'qianTaiCuoWuFuZhiChengGong'),
    ))
    expect(writeText).toHaveBeenCalledWith('request-0123456789abcdef')

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
})

function wrapper样式(): string {
  return readFileSync(resolve(__dirname, '../components/请求错误.vue'), 'utf8')
}
