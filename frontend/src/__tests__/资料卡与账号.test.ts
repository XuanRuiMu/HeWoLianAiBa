import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import ZhangHaoAnQuan from '@/views/账号与安全.vue'
import YongHuZiLiaoKa from '@/components/用户资料卡.vue'
import { huoQuFanYi } from '@/config/translations'
import { KE_JIAN_XING_LIE_BIAO, shiHeFaKeJianXing } from '@/api/资料'

vi.mock('@/api/社交', () => ({
  huoQuYongHuSheZhi: vi.fn().mockResolvedValue({
    uid: 'ceshi-uid',
    shou_ji_hao: '13800138000',
    tou_xiang: null,
    qian_ming: '旧签名',
    qian_ming_ke_jian_xing: 'gong_kai',
    qian_ming_bai_ming_dan: [],
    liao_tian_bei_jing: 'moRen',
    gong_kai_zhang_hao: true,
    gong_kai_shou_ji_hao: false,
    gong_kai_you_xiang: false,
    bang_ding_you_xiang: '',
  }),
  baoCunLiaoTianBeiJing: vi.fn().mockResolvedValue(undefined),
  baoCunYinSiSheZhi: vi.fn().mockResolvedValue(undefined),
  qingKongPaiWeiShuJu: vi.fn().mockResolvedValue(undefined),
  huoQuHaoYouLieBiao: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/api/资料', async (yuanShi) => {
  const shiJi = (await yuanShi()) as Record<string, unknown>
  return {
    ...shiJi,
    baoCunQianMing: vi.fn().mockResolvedValue(undefined),
    baoCunQianMingBaiMingDan: vi.fn().mockResolvedValue(undefined),
    shangChuanTouXiang: vi.fn().mockResolvedValue('/api/媒体/abc?e=1&s=2'),
    huoQuMingPian: vi.fn().mockResolvedValue({
      id: 'yong-hu-1',
      yong_hu_ming: '测试名',
      ni_cheng: null,
      tou_xiang: null,
      qian_ming: '你好世界',
      shi_hao_you: true,
      shi_zi_ji: false,
    }),
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

function chuangJianLuYou() {
  const luYou = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div></div>' } }],
  })
  return luYou
}

describe('可见性枚举前后端同源', () => {
  it('五值齐全且非法值拒绝', () => {
    expect([...KE_JIAN_XING_LIE_BIAO]).toEqual(['gong_kai', 'jin_hao_you', 'jin_bu_fen_ren', 'bu_ke_jian', 'jin_zi_ji'])
    expect(shiHeFaKeJianXing('gong_kai')).toBe(true)
    expect(shiHeFaKeJianXing('quan_bu')).toBe(false)
  })

  it('可见性翻译键齐全', () => {
    for (const jian of [
      'keJianXingBiaoTi',
      'keJianXingGongKai',
      'keJianXingJinHaoYou',
      'keJianXingJinBuFenRen',
      'keJianXingBuKeJian',
      'keJianXingJinZiJi',
    ] as const) {
      expect(huoQuFanYi('sheZhi', jian)).toBeTruthy()
    }
  })
})

describe('账号与安全：头像与签名', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  async function mountZhangHao() {
    const luYou = chuangJianLuYou()
    luYou.push('/')
    await luYou.isReady()
    const wrapper = mount(ZhangHaoAnQuan, {
      global: { plugins: [createPinia(), luYou] },
      attachTo: document.body,
    })
    await flushPromises()
    return wrapper
  }

  it('渲染头像卡与签名卡', async () => {
    const wrapper = await mountZhangHao()
    const wenBen = wrapper.text()
    expect(wenBen).toContain(huoQuFanYi('sheZhi', 'touXiangBiaoTi'))
    expect(wenBen).toContain(huoQuFanYi('sheZhi', 'qianMingBiaoTi'))
    expect(wenBen).toContain(huoQuFanYi('sheZhi', 'keJianXingBiaoTi'))
    wrapper.unmount()
  })

  it('签名草稿回填且字数上限500', async () => {
    const wrapper = await mountZhangHao()
    const shuRu = wrapper.find('.qianming-shuru')
    expect((shuRu.element as HTMLTextAreaElement).value).toBe('旧签名')
    expect(shuRu.attributes('maxlength')).toBe('500')
    wrapper.unmount()
  })

  it('无违规时不显示封禁卡', async () => {
    const wrapper = await mountZhangHao()
    expect(wrapper.text()).not.toContain(huoQuFanYi('sheZhi', 'fengJinYiFen'))
    wrapper.unmount()
  })

  it('封禁中显示状态与申诉入口', async () => {
    const ziLiao = await import('@/api/资料')
    vi.mocked(ziLiao.huoQuFengJinZhuangTai).mockResolvedValueOnce({
      bei_feng_jin: true,
      ji_bie: 'feng_jin_1_fen',
      wei_gui_ci_shu: 1,
      jie_feng_shi_jian: new Date(Date.now() + 60000).toISOString(),
      shen_su_zhuang_tai: 'wu',
    })
    const wrapper = await mountZhangHao()
    const wenBen = wrapper.text()
    expect(wenBen).toContain(huoQuFanYi('sheZhi', 'fengJinYiFen'))
    expect(wenBen).toContain(huoQuFanYi('sheZhi', 'tiJiaoShenSu'))
    wrapper.unmount()
  })
})

describe('用户资料卡', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('加载名片展示签名与发消息', async () => {
    const wrapper = mount(YongHuZiLiaoKa, {
      props: { yongHuId: 'yong-hu-1' },
      global: { plugins: [createPinia()] },
      attachTo: document.body,
    })
    await flushPromises()
    const wenBen = wrapper.text()
    expect(wenBen).toContain('你好世界')
    expect(wenBen).toContain(huoQuFanYi('haoYou', 'faXiaoXi'))
    await wrapper.find('.ziliaoka-anniu-zu .anniu-que-ren').trigger('click')
    expect(wrapper.emitted('fa-xiao-xi')).toBeTruthy()
    wrapper.unmount()
  })
})
