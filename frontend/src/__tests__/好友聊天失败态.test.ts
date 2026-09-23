import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import HaoYouLiaoTian from '@/views/好友聊天.vue'
import { huoQuFanYi } from '@/config/translations'
import { xieRuShuRuQu } from './输入区夹具'

vi.mock('@/api/社交', () => ({
  huoQuHaoYouXiaoXi: vi.fn(),
  faSongHaoYouXiaoXi: vi.fn(),
  cheHuiHaoYouXiaoXi: vi.fn(),
  biaoJiHaoYouYiDu: vi.fn().mockResolvedValue(undefined),
  huoQuHaoYouLieBiao: vi.fn().mockResolvedValue([]),
  huoQuYongHuSheZhi: vi.fn().mockResolvedValue({
    uid: 'u',
    shou_ji_hao: '',
    tou_xiang: null,
    qian_ming: null,
    qian_ming_ke_jian_xing: 'gong_kai',
    qian_ming_bai_ming_dan: [],
    liao_tian_bei_jing: 'moRen',
    gong_kai_zhang_hao: true,
    gong_kai_shou_ji_hao: false,
    gong_kai_you_xiang: false,
    bang_ding_you_xiang: '',
  }),
}))

function juJueCuoWu(status: number) {
  return {
    isAxiosError: true,
    response: { status, data: { cheng_gong: false, ti_shi: status === 403 ? '对方还不是你的好友' : '出错了' } },
  }
}

async function mountLiaoTian() {
  setActivePinia(createPinia())
  const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/hao-you/:haoYouId', component: HaoYouLiaoTian }],
  })
  router.push('/hao-you/hao-you-1')
  await router.isReady()
  const wrapper = mount(HaoYouLiaoTian, {
    global: { plugins: [createPinia(), router] },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

describe('好友聊天失败态不出戏', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('非好友403时显示空态而非整页崩溃', async () => {
    const sheJiao = await import('@/api/社交')
    vi.mocked(sheJiao.huoQuHaoYouXiaoXi).mockRejectedValueOnce(juJueCuoWu(403))
    const wrapper = await mountLiaoTian()
    expect(wrapper.find('.kong-tai').exists()).toBe(true)
    expect(wrapper.text()).toContain(huoQuFanYi('haoYou', 'feiHaoYou'))
    expect(wrapper.text()).toContain(huoQuFanYi('haoYou', 'fanHuiHaoYouLieBiao'))
    wrapper.unmount()
  })

  it('消息加载500时显示重试空态，重试成功恢复', async () => {
    const sheJiao = await import('@/api/社交')
    vi.mocked(sheJiao.huoQuHaoYouXiaoXi)
      .mockRejectedValueOnce(juJueCuoWu(500))
      .mockResolvedValueOnce([])
    const wrapper = await mountLiaoTian()
    expect(wrapper.find('.kong-tai').exists()).toBe(true)
    expect(wrapper.text()).toContain(huoQuFanYi('haoYou', 'xiaoXiJiaZaiShiBai'))
    await wrapper.find('.kong-tai-anniu').trigger('click')
    await flushPromises()
    expect(wrapper.find('.kong-tai').exists()).toBe(false)
    expect(wrapper.find('.shuru-kuang').exists()).toBe(true)
    wrapper.unmount()
  })

  it('发送失败就地提示不抛到全局', async () => {
    const sheJiao = await import('@/api/社交')
    vi.mocked(sheJiao.huoQuHaoYouXiaoXi).mockResolvedValueOnce([])
    vi.mocked(sheJiao.faSongHaoYouXiaoXi).mockRejectedValueOnce(juJueCuoWu(403))
    const wrapper = await mountLiaoTian()
    await xieRuShuRuQu(wrapper, '你好')
    await wrapper.find('.fasong-anniu').trigger('click')
    await flushPromises()
    expect(wrapper.find('.fasong-tishi').exists()).toBe(true)
    wrapper.unmount()
  })

  it('输入栏恒只有发送按钮，空内容时禁用不可点', async () => {
    const sheJiao = await import('@/api/社交')
    vi.mocked(sheJiao.huoQuHaoYouXiaoXi).mockResolvedValueOnce([])
    const wrapper = await mountLiaoTian()

    await xieRuShuRuQu(wrapper, '')
    await flushPromises()
    const kong = wrapper.find('.fasong-anniu')
    expect(kong.exists()).toBe(true)
    expect(kong.isVisible()).toBe(true)
    expect(kong.attributes('disabled')).toBeDefined()
    expect(kong.attributes('aria-disabled')).toBe('true')

    await kong.trigger('click')
    await flushPromises()
    expect(sheJiao.faSongHaoYouXiaoXi).not.toHaveBeenCalled()

    await xieRuShuRuQu(wrapper, '在吗')
    const feiKong = wrapper.find('.fasong-anniu')
    expect(feiKong.exists()).toBe(true)
    expect(feiKong.attributes('disabled')).toBeUndefined()
    expect(feiKong.attributes('aria-disabled')).toBe('false')
    wrapper.unmount()
  })
})
