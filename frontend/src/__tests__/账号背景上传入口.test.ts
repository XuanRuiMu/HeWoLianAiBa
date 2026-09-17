import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 个人设置页 from '@/views/账号与安全.vue'
import { huoQuFanYi } from '@/config/translations'
import { 使用用户设置仓库 } from '@/stores/用户设置'

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
    gong_kai_zhang_hao: true,
    gong_kai_shou_ji_hao: false,
    gong_kai_you_xiang: false,
    bang_ding_you_xiang: '',
  }),
  baoCunLiaoTianBeiJing: vi.fn().mockResolvedValue(undefined),
  shangChuanLiaoTianBeiJing: vi.fn().mockResolvedValue('https://cdn.example.com/beijing/zi-ding-yi.jpg'),
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

async function mountSheZhi() {
  setActivePinia(createPinia())
  const luYou = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div></div>' } }],
  })
  luYou.push('/')
  await luYou.isReady()
  const wrapper = mount(个人设置页, {
    global: { plugins: [createPinia(), luYou] },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

function sheZhiWenJian(shuRu: unknown, wenJian: File) {
  const yuanSu = shuRu as HTMLInputElement
  Object.defineProperty(yuanSu, 'files', { value: [wenJian], configurable: true })
}

describe('FP-A 背景自定义上传入口', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('外观卡片内出现上传按钮与隐藏input且不改动6预设', async () => {
    const wrapper = await mountSheZhi()
    expect(wrapper.find('#liao-tian-bei-jing').exists()).toBe(true)
    expect(wrapper.find('.zi-ding-yi-shang-chuan').exists()).toBe(true)
    expect(wrapper.find('.zi-ding-yi-shang-chuan').text()).toBe(
      huoQuFanYi('sheZhi', 'shangChuanZiDingYiBeiJing'),
    )
    expect(wrapper.find('.zi-ding-yi-bei-jing-qu input[type="file"]').exists()).toBe(true)
    expect(wrapper.findAll('.beijing-xiangmu').length).toBe(6)
    wrapper.unmount()
  })

  it('上传成功先压缩再走上传接口并调store保存', async () => {
    const wrapper = await mountSheZhi()
    const sheJiao = await import('@/api/社交')
    const yaSuo = await import('@/utils/图片压缩')
    const wenJian = new File(['tu-pian'], 'bei-jing.png', { type: 'image/png' })
    const shuRu = wrapper.find('.zi-ding-yi-bei-jing-qu input[type="file"]')
    sheZhiWenJian(shuRu.element, wenJian)
    await shuRu.trigger('change')
    await flushPromises()
    expect(vi.mocked(yaSuo.yaSuoTuPiang)).toHaveBeenCalledWith(wenJian)
    expect(vi.mocked(sheJiao.shangChuanLiaoTianBeiJing)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sheJiao.baoCunLiaoTianBeiJing)).toHaveBeenCalledWith(
      'https://cdn.example.com/beijing/zi-ding-yi.jpg',
    )
    const 仓库 = 使用用户设置仓库()
    expect(仓库.liaoTianBeiJing).toBe('https://cdn.example.com/beijing/zi-ding-yi.jpg')
    expect(wrapper.text()).toContain(huoQuFanYi('sheZhi', 'baoCunChengGong'))
    wrapper.unmount()
  })

  it('非法文件拒绝上传并提示新键文案', async () => {
    const wrapper = await mountSheZhi()
    const sheJiao = await import('@/api/社交')
    const wenJian = new File(['wen-ben'], 'e.txt', { type: 'text/plain' })
    const shuRu = wrapper.find('.zi-ding-yi-bei-jing-qu input[type="file"]')
    sheZhiWenJian(shuRu.element, wenJian)
    await shuRu.trigger('change')
    await flushPromises()
    expect(vi.mocked(sheJiao.shangChuanLiaoTianBeiJing)).not.toHaveBeenCalled()
    expect(vi.mocked(sheJiao.baoCunLiaoTianBeiJing)).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain(huoQuFanYi('sheZhi', 'beiJingFeiFaWenJianTiShi'))
    wrapper.unmount()
  })

  it('自定义态出现预览与删除按钮删除后回默认', async () => {
    const sheJiao = await import('@/api/社交')
    vi.mocked(sheJiao.huoQuYongHuSheZhi).mockResolvedValue({
      uid: 'u1',
      shou_ji_hao: '13800138000',
      tou_xiang: null,
      qian_ming: null,
      qian_ming_ke_jian_xing: 'gong_kai',
      qian_ming_bai_ming_dan: [],
      liao_tian_bei_jing: 'https://cdn.example.com/beijing/zi-ding-yi.jpg',
      gong_kai_zhang_hao: true,
      gong_kai_shou_ji_hao: false,
      gong_kai_you_xiang: false,
      bang_ding_you_xiang: '',
    })
    const wrapper = await mountSheZhi()
    expect(wrapper.find('.zi-ding-yi-yu-lan-tu').exists()).toBe(true)
    expect(wrapper.find('.zi-ding-yi-yu-lan-tu').attributes('src')).toBe(
      'https://cdn.example.com/beijing/zi-ding-yi.jpg',
    )
    expect(wrapper.text()).toContain(huoQuFanYi('sheZhi', 'ziDingYiBeiJingYuLan'))
    await wrapper.find('.zi-ding-yi-shan-chu').trigger('click')
    await flushPromises()
    expect(vi.mocked(sheJiao.baoCunLiaoTianBeiJing)).toHaveBeenCalledWith('moRen')
    const 仓库 = 使用用户设置仓库()
    expect(仓库.liaoTianBeiJing).toBe('moRen')
    wrapper.unmount()
  })
})
