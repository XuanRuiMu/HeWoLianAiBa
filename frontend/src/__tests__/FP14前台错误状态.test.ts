import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { use前台错误 } from '@/composables/use前台错误'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import { huoQuFanYi } from '@/config/translations'

function dengHouDengDai<T = void>() {
  let jieJue!: (zhi: T) => void
  let paiXu!: (zhi: T) => void
  const qingQiu = new Promise<T>((resolve, reject) => {
    jieJue = resolve
    paiXu = reject
  })
  return { qingQiu, jieJue, paiXu }
}

function zhuangPei() {
  let yong!: ReturnType<typeof use前台错误>
  const wrapper = mount(
    defineComponent({
      setup() {
        yong = use前台错误()
        return () => h('div')
      },
    }),
  )
  return { wrapper, yong }
}

describe('FP-14 前台错误状态与竞态', () => {
  it('后发请求成功后，较早失败不得覆盖新页面状态', async () => {
    const { yong } = zhuangPei()
    const laoQingQiu = dengHouDengDai<string>()
    const xinQingQiu = dengHouDengDai<string>()

    const lao = yong.yunXing(() => laoQingQiu.qingQiu)
    const xin = yong.yunXing(() => xinQingQiu.qingQiu)
    xinQingQiu.jieJue('新页面')
    await xin
    laoQingQiu.paiXu(new Error('旧页面失败'))
    await lao

    expect(yong.cuoWu.value).toBeNull()
    expect(yong.zhuangTai.value).toBe('idle')
  })

  it('失败后只重放页面提供的动作一次，重试中禁用重复触发', async () => {
    const { yong } = zhuangPei()
    const zhongShi = vi.fn().mockRejectedValue({ isAxiosError: true, code: 'ERR_NETWORK' })
    await yong.yunXing(zhongShi, { chongShi: zhongShi })

    expect({ code: yong.cuoWu.value?.code, state: yong.zhuangTai.value }).toEqual({
      code: QIAN_TAI_DAI_MA.WANG_LUO,
      state: 'error',
    })
    expect(yong.cuoWu.value?.xianShi).toBe(true)
    const houDe = dengHouDengDai<void>()
    zhongShi.mockImplementationOnce(() => houDe.qingQiu)
    const zhongShiZhong = yong.chongShi()
    await Promise.resolve()
    expect(yong.zhuangTai.value).toBe('loading')
    await yong.chongShi()
    expect(zhongShi).toHaveBeenCalledTimes(2)
    houDe.jieJue()
    await zhongShiZhong
    expect(yong.zhuangTai.value).toBe('idle')
    expect(yong.cuoWu.value).toBeNull()
  })

  it('Abort 不显示错误，组件卸载后的迟到失败也不再写状态', async () => {
    const { wrapper, yong } = zhuangPei()
    const qingQiu = dengHouDengDai<void>()
    const wuXian = yong.yunXing(() => qingQiu.qingQiu)
    wrapper.unmount()
    qingQiu.paiXu({ code: 'ERR_CANCELED' } as unknown as Error)
    await wuXian
    expect(yong.cuoWu.value).toBeNull()
    expect(yong.zhuangTai.value).toBe('idle')
  })

  it('手动接收错误时保留稳定模型与用户可读最终文案', async () => {
    const { yong } = zhuangPei()
    yong.jieShou(
      {
        code: QIAN_TAI_DAI_MA.RESOURCE_CONFLICT,
        message: 'raw SQL /srv/app',
      } as Error & { code?: string },
      () => undefined,
    )
    expect(yong.cuoWu.value?.code).toBe(QIAN_TAI_DAI_MA.WEI_ZHI)
    expect(yong.cuoWu.value?.yingXiang).toBe(huoQuFanYi('tongYong', 'tongYongWenTiYingXiang'))
    expect(yong.cuoWu.value?.message).not.toContain('SQL')
  })
})
