import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import 挑战积分榜 from '@/views/挑战积分榜.vue'
import 通知页面 from '@/views/通知页面.vue'
import 用户资料卡 from '@/components/用户资料卡.vue'
import { huoQuFanYi } from '@/config/translations'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import { huoQuPaiHangBang } from '@/api/挑战'
import { huoQuTongZhiLieBiao } from '@/api/通知'
import { huoQuMingPian } from '@/api/资料'

vi.mock('@/api/挑战')
vi.mock('@/api/通知')
vi.mock('@/api/资料')
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn(), connected: false })),
  Socket: class {},
}))

/** 后端原文含内部路径与堆栈，任何出口都不得把它渲染给玩家 */
const HOU_TAI_YU_WEN = 'SQL 失败 at /srv/app/server.js stack: at db.js:42'

function houTaiCuoWu(zhuangTai: number, daiMa: string): AxiosError {
  const config = { url: '/测试' } as InternalAxiosRequestConfig
  const response = {
    status: zhuangTai,
    statusText: '',
    data: { cheng_gong: false, ti_shi: HOU_TAI_YU_WEN, code: daiMa, traceId: 'req-outlet-0001' },
    headers: {},
    config,
  } as AxiosResponse
  return new AxiosError('request failed', 'ERR_BAD_RESPONSE', config, undefined, response)
}

function duYiGeChuKou(wrapper: ReturnType<typeof mount>): void {
  const daiMa = wrapper.get('.qian-tai-cuo-wu-dai-ma').text()
  const yingXiang = wrapper.get('.qian-tai-cuo-wu-ying-xiang').text()
  const xiaYiBu = wrapper.get('.qian-tai-cuo-wu-xia-yi-bu').text()
  expect(daiMa).toBe(QIAN_TAI_DAI_MA.INTERNAL_ERROR)
  expect(yingXiang).toBe(huoQuFanYi('tongYong', 'fuWuWenTiYingXiang'))
  expect(xiaYiBu).toBe(huoQuFanYi('tongYong', 'fuWuWenTiXiaYiBu'))
  expect(wrapper.text()).not.toContain(HOU_TAI_YU_WEN)
  expect(wrapper.text()).not.toContain('/srv/app')
  expect(wrapper.get('[role="alert"]').exists()).toBe(true)
  expect(wrapper.get('.qian-tai-cuo-wu-zhen-cha').text()).toContain('req-outlet-0001')
}

describe('FP-14 关键失败出口统一渲染', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('挑战积分榜：加载失败给出码/影响/下一步与追踪编号，重试重新请求', async () => {
    vi.mocked(huoQuPaiHangBang)
      .mockRejectedValueOnce(houTaiCuoWu(500, 'INTERNAL_ERROR'))
      .mockResolvedValueOnce([])
    const luYou = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(挑战积分榜, { global: { plugins: [pinia, luYou] } })
    await flushPromises()

    duYiGeChuKou(wrapper as never)
    await wrapper.get('.qian-tai-cuo-wu-chong-shi').trigger('click')
    await flushPromises()
    expect(vi.mocked(huoQuPaiHangBang)).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.qian-tai-cuo-wu').exists()).toBe(false)
  })

  it('通知页面：加载失败给出码/影响/下一步，重试重新请求', async () => {
    vi.mocked(huoQuTongZhiLieBiao)
      .mockRejectedValueOnce(houTaiCuoWu(500, 'INTERNAL_ERROR'))
      .mockResolvedValueOnce({ lie_biao: [], wei_du_shu: 0 } as never)
    const luYou = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(通知页面, { global: { plugins: [pinia, luYou] } })
    await flushPromises()

    duYiGeChuKou(wrapper as never)
    await wrapper.get('.qian-tai-cuo-wu-chong-shi').trigger('click')
    await flushPromises()
    expect(vi.mocked(huoQuTongZhiLieBiao)).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.qian-tai-cuo-wu').exists()).toBe(false)
  })

  it('用户资料卡：加载失败给出码/影响/下一步，重试重新请求', async () => {
    vi.mocked(huoQuMingPian)
      .mockRejectedValueOnce(houTaiCuoWu(500, 'INTERNAL_ERROR'))
      .mockResolvedValueOnce({
        id: 'u-2',
        yong_hu_ming: '小满',
        ni_cheng: '小满',
        tou_xiang: null,
        xing_bie: 'female',
        sheng_rì: null,
      } as never)
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(用户资料卡, { props: { yongHuId: 'u-2' } })
    await flushPromises()

    duYiGeChuKou(wrapper as never)
    await wrapper.get('.qian-tai-cuo-wu-chong-shi').trigger('click')
    await flushPromises()
    expect(vi.mocked(huoQuMingPian)).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.qian-tai-cuo-wu').exists()).toBe(false)
  })

  it('401 鉴权失败给的是鉴权分类文案，不混入服务侧措辞', async () => {
    vi.mocked(huoQuPaiHangBang).mockRejectedValueOnce(
      houTaiCuoWu(401, 'AUTHENTICATION_REQUIRED'),
    )
    const luYou = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(挑战积分榜, { global: { plugins: [pinia, luYou] } })
    await flushPromises()

    expect(wrapper.get('.qian-tai-cuo-wu-dai-ma').text()).toBe(
      QIAN_TAI_DAI_MA.AUTHENTICATION_REQUIRED,
    )
    expect(wrapper.get('.qian-tai-cuo-wu-ying-xiang').text()).toBe(
      huoQuFanYi('tongYong', 'jianQuanWenTiYingXiang'),
    )
    expect(wrapper.get('.qian-tai-cuo-wu-xia-yi-bu').text()).toBe(
      huoQuFanYi('tongYong', 'jianQuanWenTiXiaYiBu'),
    )
    expect(wrapper.find('.qian-tai-cuo-wu-chong-shi').exists()).toBe(false)
  })
})
