import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import ZhangHaoAnQuan from '@/views/账号与安全.vue'
import { QI_PAO_YU_SHE_XUAN_XIANG } from '@/config/气泡主题'
import { QI_PAO_WEN_AN } from '@/config/气泡主题文案'

vi.mock('@/api/认证', () => ({
  gengGaiYongHuMing: vi.fn().mockResolvedValue({ yong_hu_ming: '新名字' }),
  gengGaiMiMa: vi.fn().mockResolvedValue(undefined),
  gengGaiMoRenXingBie: vi.fn().mockResolvedValue(undefined),
  faSongMa: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/api/社交', () => ({
  huoQuYongHuSheZhi: vi.fn().mockResolvedValue({
    uid: 'u1',
    shou_ji_hao: '13800138000',
    tou_xiang: null,
    qian_ming: null,
    qian_ming_ke_jian_xing: 'gong_kai',
    qian_ming_bai_ming_dan: [],
    liao_tian_bei_jing: 'moRen',
    qi_pao_zi_ji: 'weiXinLv',
    qi_pao_ai: 'yunBai',
    gong_kai_zhang_hao: true,
    gong_kai_shou_ji_hao: false,
    gong_kai_you_xiang: false,
    bang_ding_you_xiang: '',
  }),
  baoCunLiaoTianBeiJing: vi.fn().mockResolvedValue(undefined),
  shangChuanLiaoTianBeiJing: vi.fn().mockResolvedValue('https://cdn.example.com/beijing/zi-ding-yi.jpg'),
  baoCunQiPao: vi.fn().mockResolvedValue(undefined),
  baoCunYinSiSheZhi: vi.fn().mockResolvedValue(undefined),
  qingKongPaiWeiShuJu: vi.fn().mockResolvedValue(undefined),
  huoQuHaoYouLieBiao: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/api/资料', async (yuanShi) => {
  const shiJi = (await yuanShi()) as Record<string, unknown>
  return {
    ...shiJi,
    baoCunQianMing: vi.fn().mockResolvedValue(undefined),
    shangChuanTouXiang: vi.fn().mockResolvedValue('/api/媒体/abc?e=1&s=2'),
    huoQuFengJinZhuangTai: vi.fn().mockResolvedValue({
      bei_feng_jin: false,
      ji_bie: 'zheng_chang',
      wei_gui_ci_shu: 0,
      jie_feng_shi_jian: null,
      shen_su_zhuang_tai: 'wu',
    }),
    tiJiaoShenSu: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('@/api/通知', () => ({
  huoQuTongZhiLieBiao: vi.fn().mockResolvedValue({ lie_biao: [], wei_du_shu: 0 }),
  biaoJiTongZhiYiDu: vi.fn(),
  biaoJiQuanBuTongZhiYiDu: vi.fn(),
}))

vi.mock('@/utils/图片压缩', () => ({
  yaSuoTuPiang: vi.fn().mockImplementation(async (wenJian: Blob) => wenJian),
}))

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn(), connected: false })),
}))

async function mountZhangHao() {
  setActivePinia(createPinia())
  const luYou = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div></div>' } }],
  })
  luYou.push('/')
  await luYou.isReady()
  const wrapper = mount(ZhangHaoAnQuan, {
    global: { plugins: [createPinia(), luYou] },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

describe('FP-B 账号外观气泡选择器', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('外观分组内存在气泡卡片且双槽渲染全量预设', async () => {
    const wrapper = await mountZhangHao()
    const kaPian = wrapper.find('#qi-pao-xuan-ze')
    expect(kaPian.exists()).toBe(true)
    expect(kaPian.text()).toContain(QI_PAO_WEN_AN.biaoTi)
    expect(kaPian.text()).toContain(QI_PAO_WEN_AN.ziJiBiaoTi)
    expect(kaPian.text()).toContain(QI_PAO_WEN_AN.aiBiaoTi)
    const zu = kaPian.findAll('[role="radiogroup"]')
    expect(zu).toHaveLength(2)
    expect(kaPian.findAll('[role="radio"]')).toHaveLength(QI_PAO_YU_SHE_XUAN_XIANG.length * 2)
    expect(wrapper.find('#liao-tian-bei-jing').exists()).toBe(true)
    wrapper.unmount()
  })

  it('点击自己槽调store持久化PUT气泡', async () => {
    const wrapper = await mountZhangHao()
    const sheJiao = await import('@/api/社交')
    const kaPian = wrapper.find('#qi-pao-xuan-ze')
    const anNiu = kaPian.findAll('[role="radio"]')
    await anNiu[1].trigger('click')
    await flushPromises()
    expect(vi.mocked(sheJiao.baoCunQiPao)).toHaveBeenCalledWith({ ziJi: QI_PAO_YU_SHE_XUAN_XIANG[1] })
    wrapper.unmount()
  })

  it('点击AI槽调store持久化PUT气泡', async () => {
    const wrapper = await mountZhangHao()
    const sheJiao = await import('@/api/社交')
    const kaPian = wrapper.find('#qi-pao-xuan-ze')
    const anNiu = kaPian.findAll('[role="radio"]')
    await anNiu[QI_PAO_YU_SHE_XUAN_XIANG.length + 2].trigger('click')
    await flushPromises()
    expect(vi.mocked(sheJiao.baoCunQiPao)).toHaveBeenCalledWith({ ai: QI_PAO_YU_SHE_XUAN_XIANG[2] })
    wrapper.unmount()
  })

  it('搜索气泡覆盖新卡片且不破坏背景搜索', async () => {
    const wrapper = await mountZhangHao()
    const souSuo = wrapper.find('#she-zhi-sou-suo')
    await souSuo.setValue(QI_PAO_WEN_AN.biaoTi)
    await flushPromises()
    expect(wrapper.find('#qi-pao-xuan-ze').isVisible()).toBe(true)
    await souSuo.setValue('微信绿')
    await flushPromises()
    expect(wrapper.find('#qi-pao-xuan-ze').isVisible()).toBe(true)
    wrapper.unmount()
  })
})
