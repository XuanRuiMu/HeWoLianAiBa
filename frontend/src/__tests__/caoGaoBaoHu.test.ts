import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { useCaoGao, CAO_GAO_JIAN } from '@/composables/use草稿'
import HaoYouLiaoTian from '@/views/好友聊天.vue'
import { huoQuFanYi } from '@/config/translations'

vi.mock('@/api/社交', () => ({
  huoQuHaoYouXiaoXi: vi.fn().mockResolvedValue([]),
  faSongHaoYouXiaoXi: vi.fn().mockResolvedValue({ id: 'x1', shi_jian_chuo: 1 }),
  cheHuiHaoYouXiaoXi: vi.fn().mockResolvedValue(undefined),
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

vi.mock('@/api/资料', () => ({
  huoQuMingPian: vi.fn().mockResolvedValue({
    id: 'hao-you-1',
    yong_hu_ming: '好友',
    ni_cheng: null,
    tou_xiang: null,
    qian_ming: null,
    shi_hao_you: true,
    shi_zi_ji: false,
  }),
}))

describe('FP-08 YH-077 草稿保护', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('输入即按会话键存草稿', async () => {
    const neiRong = ref('')
    const 挂载 = mount({ template: '<div></div>', setup: () => ({}) })
    const { huiFuCaoGao } = useCaoGao(CAO_GAO_JIAN.haoYouLiaoTian('hao-you-1'), neiRong)
    expect(huiFuCaoGao()).toBe(false)
    neiRong.value = '没发完的话'
    await nextTick()
    expect(sessionStorage.getItem('caoGao:haoYou:hao-you-1')).toBe('没发完的话')
    挂载.unmount()
  })

  it('重进回填草稿并提示', async () => {
    sessionStorage.setItem('caoGao:haoYou:hao-you-1', '上次没发完')
    const 挂载 = mount({ template: '<div></div>', setup: () => ({}) })
    const neiRong = ref('')
    const { huiFuCaoGao } = useCaoGao(CAO_GAO_JIAN.haoYouLiaoTian('hao-you-1'), neiRong)
    expect(neiRong.value).toBe('上次没发完')
    expect(huiFuCaoGao()).toBe(false)
    挂载.unmount()
  })

  it('不同会话键隔离', async () => {
    const 挂载 = mount({ template: '<div></div>', setup: () => ({}) })
    const neiRongA = ref('')
    const neiRongB = ref('')
    useCaoGao(CAO_GAO_JIAN.haoYouLiaoTian('a'), neiRongA)
    useCaoGao(CAO_GAO_JIAN.haoYouLiaoTian('b'), neiRongB)
    neiRongA.value = '给A的话'
    await nextTick()
    expect(sessionStorage.getItem('caoGao:haoYou:a')).toBe('给A的话')
    expect(sessionStorage.getItem('caoGao:haoYou:b')).toBeNull()
    挂载.unmount()
  })

  it('发送成功清草稿', async () => {
    sessionStorage.setItem('caoGao:haoYou:hao-you-1', '待发送')
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
    await wrapper.find('.shuru-kuang').setValue('待发送改后发')
    await wrapper.find('.fasong-anniu').trigger('click')
    await flushPromises()
    expect(sessionStorage.getItem('caoGao:haoYou:hao-you-1')).toBeNull()
    wrapper.unmount()
  })

  it('挂载即回填已存草稿', async () => {
    sessionStorage.setItem('caoGao:haoYou:hao-you-1', '上次没发完')
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
    await nextTick()
    expect((wrapper.find('.shuru-kuang').element as HTMLTextAreaElement).value).toBe('上次没发完')
    wrapper.unmount()
  })

  it('发送携带幂等键且连点只发一次', async () => {
    const sheJiao = await import('@/api/社交')
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
    await wrapper.find('.shuru-kuang').setValue('连点只发一次')
    await wrapper.find('.fasong-anniu').trigger('click')
    await wrapper.find('.fasong-anniu').trigger('click')
    await flushPromises()
    expect(vi.mocked(sheJiao.faSongHaoYouXiaoXi).mock.calls.length).toBe(1)
    const miDengJian = vi.mocked(sheJiao.faSongHaoYouXiaoXi).mock.calls[0][2] as string
    expect(typeof miDengJian).toBe('string')
    expect(miDengJian.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('非法会话键不写存储不抛错', async () => {
    const 挂载 = mount({ template: '<div></div>', setup: () => ({}) })
    const neiRong = ref('')
    const { huiFuCaoGao, qingChuCaoGao } = useCaoGao('../../x', neiRong)
    neiRong.value = '内容'
    await nextTick()
    expect(huiFuCaoGao()).toBe(false)
    expect(() => qingChuCaoGao()).not.toThrow()
    expect(sessionStorage.length).toBe(0)
    挂载.unmount()
  })
})
