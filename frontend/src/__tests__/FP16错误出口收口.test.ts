import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import RequestError from '@/components/请求错误.vue'
import FanYiJieGuo from '@/components/聊天/翻译结果框.vue'
import { chuangJianQianTaiCuoWu } from '@/utils/前台错误'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import { huoQuFanYi } from '@/config/translations'

describe('FP-16 翻译出口接入统一请求错误契约', () => {
  it('翻译结果框在错误态渲染稳定码与具体中文原因，不再退化成 FRONTEND_UNKNOWN_ERROR', () => {
    const cuoWu = chuangJianQianTaiCuoWu({
      code: QIAN_TAI_DAI_MA.WANG_LUO,
      retryable: true,
      yingXiang: huoQuFanYi('liaoTian', 'fanYiShiBai'),
    })
    const wrapper = mount(FanYiJieGuo, {
      props: { zhuangTai: 'error', jieGuo: '', yuanYu: 'auto', cuoWu },
    })

    expect(wrapper.get('.qian-tai-cuo-wu-dai-ma').text()).toBe(QIAN_TAI_DAI_MA.WANG_LUO)
    expect(wrapper.get('.qian-tai-cuo-wu-ying-xiang').text()).toBe(
      huoQuFanYi('liaoTian', 'fanYiShiBai'),
    )
    expect(wrapper.get('.qian-tai-cuo-wu-xia-yi-bu').text()).toBe(
      huoQuFanYi('tongYong', 'wangLuoWenTiXiaYiBu'),
    )
    expect(wrapper.get('.qian-tai-cuo-wu-chong-shi').exists()).toBe(true)
  })

  it('翻译结果框未接错误模型时也不得显示 FRONTEND_UNKNOWN_ERROR 这种无信息退化码', () => {
    const wrapper = mount(FanYiJieGuo, {
      props: { zhuangTai: 'error', jieGuo: '', yuanYu: 'auto' },
    })

    const daiMa = wrapper.get('.qian-tai-cuo-wu-dai-ma').text()
    expect(daiMa).not.toBe(QIAN_TAI_DAI_MA.WEI_ZHI)
    expect(wrapper.get('.qian-tai-cuo-wu-ying-xiang').text()).toBe(
      huoQuFanYi('liaoTian', 'fanYiShiBai'),
    )
  })

  it('好友聊天页把 use长按菜单 的翻译错误模型透传给翻译结果框', () => {
    const yuanMa = readFileSync(resolve(__dirname, '../views/好友聊天.vue'), 'utf8')
    const fanYiKuai = yuanMa.slice(yuanMa.indexOf('<FanYiJieGuo'), yuanMa.indexOf('/>', yuanMa.indexOf('<FanYiJieGuo')))
    expect(fanYiKuai).toContain(':cuo-wu="huoQuFanYiCuoWu(xiaoXi)"')
    expect(yuanMa).toContain('huoQuFanYiCuoWu,')
  })

  it('聊天页与好友聊天页的原文语言「自动」文案不再自称译为中文', () => {
    expect(huoQuFanYi('liaoTian', 'fanYiZiDong')).not.toContain('译为中文')
    expect(huoQuFanYi('liaoTian', 'fanYiZiDong')).toContain('自动')
  })
})

describe('FP-16 retryAfterMs 等待提示与重试锁定', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function chuangJianDengDaiCuoWu(retryAfterMs: number) {
    return chuangJianQianTaiCuoWu({
      code: QIAN_TAI_DAI_MA.RATE_LIMITED,
      retryable: true,
      retryAfterMs,
    })
  }

  it('按后端建议显示剩余秒数，等待期间按钮禁用', async () => {
    const wrapper = mount(RequestError, { props: { cuoWu: chuangJianDengDaiCuoWu(5000) } })

    expect(wrapper.get('.qian-tai-cuo-wu-deng-dai').text()).toContain('5')
    const anNiu = wrapper.get('.qian-tai-cuo-wu-chong-shi')
    expect(anNiu.attributes('disabled')).toBeDefined()

    await vi.advanceTimersByTimeAsync(3000)
    expect(wrapper.get('.qian-tai-cuo-wu-deng-dai').text()).toContain('2')
    expect(wrapper.get('.qian-tai-cuo-wu-chong-shi').attributes('disabled')).toBeDefined()
  })

  it('等待期间点击不触发重试，倒计时结束后可重试一次', async () => {
    const faChongShi = vi.fn()
    const wrapper = mount(RequestError, {
      props: { cuoWu: chuangJianDengDaiCuoWu(2000) },
      attrs: { onChongShi: faChongShi },
    })

    await wrapper.get('.qian-tai-cuo-wu-chong-shi').trigger('click')
    expect(faChongShi).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2100)
    expect(wrapper.find('.qian-tai-cuo-wu-deng-dai').exists()).toBe(false)
    await wrapper.get('.qian-tai-cuo-wu-chong-shi').trigger('click')
    expect(faChongShi).toHaveBeenCalledTimes(1)
  })

  it('重试进行中不重复请求', async () => {
    const faChongShi = vi.fn()
    const wrapper = mount(RequestError, {
      props: { cuoWu: chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.SERVICE_UNAVAILABLE, retryable: true }) },
      attrs: { onChongShi: faChongShi },
    })

    await wrapper.get('.qian-tai-cuo-wu-chong-shi').trigger('click')
    await wrapper.get('.qian-tai-cuo-wu-chong-shi').trigger('click')
    expect(faChongShi).toHaveBeenCalledTimes(1)
  })

  it('切换到新错误时按新的 retryAfterMs 重新计时', async () => {
    const wrapper = mount(RequestError, { props: { cuoWu: chuangJianDengDaiCuoWu(5000) } })
    await vi.advanceTimersByTimeAsync(2000)
    await wrapper.setProps({ cuoWu: chuangJianDengDaiCuoWu(3000) })
    expect(wrapper.get('.qian-tai-cuo-wu-deng-dai').text()).toContain('3')
  })
})

describe('FP-16 特性开关读取失败可恢复呈现', () => {
  it('开关读取失败时登记统一错误模型，且不把开关当作读取成功', async () => {
    vi.resetModules()
    const { laQuTeZhengKaiGuan, teZhengKaiGuanCuoWu, huoQuJunShiKaiGuan } = await import(
      '@/utils/teZhengKaiGuan'
    )
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('toggle boom')),
    )
    teZhengKaiGuanCuoWu.value = null

    await laQuTeZhengKaiGuan()

    const cuoWu = teZhengKaiGuanCuoWu.value
    expect(cuoWu).not.toBeNull()
    expect(cuoWu?.code).toBe(QIAN_TAI_DAI_MA.WANG_LUO)
    expect(cuoWu?.xianShi).toBe(true)
    expect(cuoWu?.yingXiang).not.toContain('toggle boom')
    // 军师入口仍按默认值可见，但界面必须能提示「未确认」而不是假装成功
    expect(huoQuJunShiKaiGuan()).toBe(true)
    vi.unstubAllGlobals()
  })

  it('开关读取成功后清除错误模型', async () => {
    vi.resetModules()
    const { laQuTeZhengKaiGuan, teZhengKaiGuanCuoWu } = await import('@/utils/teZhengKaiGuan')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ junShi: true }) }),
    )
    teZhengKaiGuanCuoWu.value = chuangJianQianTaiCuoWu({ retryable: true })

    await laQuTeZhengKaiGuan()

    expect(teZhengKaiGuanCuoWu.value).toBeNull()
    vi.unstubAllGlobals()
  })

  it('军师入口在开关读取失败时用统一错误模型呈现可恢复入口', () => {
    const yuanMa = readFileSync(resolve(__dirname, '../components/全局菜单.vue'), 'utf8')
    expect(yuanMa).toContain('teZhengKaiGuanCuoWu')
    expect(yuanMa).toContain('RequestError')
    expect(yuanMa).toContain('laQuTeZhengKaiGuan')
  })
})
