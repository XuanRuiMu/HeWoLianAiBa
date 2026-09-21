import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import ZhangHaoAnQuan from '@/views/账号与安全.vue'
import LiaoTianYe from '@/views/聊天页面.vue'
import { huoQuFanYi } from '@/config/translations'
import { QI_PAO_YU_SHE_XUAN_XIANG, QI_PAO_YU_SHE_BIAO } from '@/config/气泡主题'
import { QI_PAO_WEN_AN } from '@/config/气泡主题文案'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用聊天仓库 } from '@/stores/聊天'

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
  shangChuanLiaoTianBeiJing: vi.fn().mockResolvedValue('https://cdn.example.com/beijing/lian-lu.jpg'),
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

vi.mock('@/api/聊天', () => ({
  huoQuXiaoXi: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
  faSongXiaoXi: vi.fn().mockResolvedValue({
    id: 'x2',
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'u1',
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '测试消息',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: true,
  }),
  cheHuiXiaoXi: vi.fn(),
  biaoJiYiDu: vi.fn(),
  huoQuJiaoSeXiangQing: vi.fn().mockResolvedValue({
    jiao_se: {
      id: 'j1',
      ming_zi: '测试角色',
      wei_xin_ming: '小甜心',
      tou_xiang: 'https://example.com/avatar.png',
      xing_bie: 'nv',
      nian_ling: 22,
      wai_mao: '',
      xing_ge: '',
      bei_jing_gu_shi: '',
      xi_hao: [],
      yan_yu_feng_ge: '',
      biao_qian: [],
      re_du: 0,
      chuang_jian_shi_jian: new Date().toISOString(),
    },
    dang_an_zhuang_tai: null,
  }),
  chuangJianHuiHua: vi.fn().mockResolvedValue({
    id: 'h1',
    jiao_se_id: 'j1',
    yong_hu_id: 'u1',
    kai_shi_shi_jian: Date.now(),
    zui_hou_xiao_xi_shi_jian: Date.now(),
    wei_du_xiao_xi_shu: 0,
  }),
  huoQuJunShiLieBiao: vi.fn().mockResolvedValue({ junShiLieBiao: [] }),
  qingQiuJunShiZhiDao: vi.fn(),
  huoQuJunShiJiLu: vi.fn().mockResolvedValue([]),
  huoQuFuPan: vi.fn().mockResolvedValue({
    fu_pan_nei_rong: null,
    fu_pan_shi_jian_xian: [],
    fu_pan_pi_zhu: null,
    jun_shi_zhi_dao_ji_lu: [],
    guan_jian_shi_jian: [],
    jia_zai_zhong: false,
  }),
  shengChengJiaoSe: vi.fn(),
  queRenJiaoSe: vi.fn(),
}))

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

const ZI_DING_YI_URL = 'https://cdn.example.com/beijing/lian-lu.jpg'

let pinia: Pinia

async function mountZhangHao() {
  const luYou = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', component: { template: '<div></div>' } }],
  })
  luYou.push('/')
  await luYou.isReady()
  const wrapper = mount(ZhangHaoAnQuan, {
    global: { plugins: [pinia, luYou] },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

async function mountLiaoTian() {
  const luYou = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div>主页</div>' } },
      { path: '/chat/:huiHuaId', component: LiaoTianYe },
    ],
  })
  await luYou.push('/chat/h1')
  await luYou.isReady()
  const 用户仓库 = 使用用户仓库()
  用户仓库.dangQianYongHu = {
    id: 'u1',
    shou_ji_hao: '13800138000',
    yong_hu_ming: '测试用户',
    ni_cheng: '测试昵称',
    xing_bie: 'male',
    mu_biao_xing_bie: 'female',
    xing_ge_xuan_ze: 'INTJ',
    ren_she_biao_qian: 'neiLianXueBa',
    yun_xu_zha_nan_zha_nv: false,
    tou_xiang: null,
    sheng_ri: null,
    qian_ming: null,
    huo_yue_ren_she_id: null,
    hai_wang_fen_shu: 0,
    chuang_jian_shi_jian: new Date().toISOString(),
    geng_xin_shi_jian: new Date().toISOString(),
  }
  用户仓库.令牌 = 'test-token'
  const 聊天仓库 = 使用聊天仓库()
  聊天仓库.jiaoSeXinXi = {
    id: 'j1',
    ming_zi: '测试角色',
    wei_xin_ming: '小甜心',
    xing_bie: 'nv',
    nian_ling: 22,
    wai_mao: '',
    xing_ge: '',
    bei_jing_gu_shi: '',
    xi_hao: [],
    yan_yu_feng_ge: '',
    tou_xiang: '',
    bei_jing_tu: null,
    biao_qian: [],
    re_du: 0,
    chuang_jian_shi_jian: new Date().toISOString(),
  }
  const wrapper = mount({ template: '<div><router-view /></div>' }, {
    global: { plugins: [pinia, luYou] },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

function sheZhiWenJian(shuRu: unknown, wenJian: File) {
  const yuanSu = shuRu as HTMLInputElement
  Object.defineProperty(yuanSu, 'files', { value: [wenJian], configurable: true })
}

describe('FP-C 用户视角全链路验证', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pinia = createPinia()
    setActivePinia(pinia)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('账号外观分组存在背景上传入口且文案来自翻译文件', async () => {
    const wrapper = await mountZhangHao()
    expect(wrapper.find('#mian-ban-waiGuan').exists()).toBe(true)
    expect(wrapper.find('#liao-tian-bei-jing').exists()).toBe(true)
    expect(wrapper.find('#liao-tian-bei-jing .kapian-biao-ti').text()).toBe(
      huoQuFanYi('sheZhi', 'liaoTianBeiJing'),
    )
    expect(wrapper.find('.zi-ding-yi-shang-chuan').exists()).toBe(true)
    expect(wrapper.find('.zi-ding-yi-shang-chuan').text()).toBe(
      huoQuFanYi('sheZhi', 'shangChuanZiDingYiBeiJing'),
    )
    expect(wrapper.find('.zi-ding-yi-bei-jing-qu input[type="file"]').exists()).toBe(true)
    expect(wrapper.findAll('.beijing-xiangmu').length).toBe(6)
    wrapper.unmount()
  })

  it('账号外观分组存在气泡双槽选择器且文案来自气泡文案单源', async () => {
    const wrapper = await mountZhangHao()
    const kaPian = wrapper.find('#qi-pao-xuan-ze')
    expect(kaPian.exists()).toBe(true)
    expect(kaPian.text()).toContain(QI_PAO_WEN_AN.biaoTi)
    expect(kaPian.text()).toContain(QI_PAO_WEN_AN.ziJiBiaoTi)
    expect(kaPian.text()).toContain(QI_PAO_WEN_AN.aiBiaoTi)
    expect(kaPian.findAll('[role="radiogroup"]')).toHaveLength(2)
    expect(kaPian.findAll('[role="radio"]')).toHaveLength(QI_PAO_YU_SHE_XUAN_XIANG.length * 2)
    wrapper.unmount()
  })

  it('上传成功后store变为自定义URL且聊天页背景内联样式含该URL', async () => {
    const zhangHao = await mountZhangHao()
    const shuRu = zhangHao.find('.zi-ding-yi-bei-jing-qu input[type="file"]')
    sheZhiWenJian(shuRu.element, new File(['tu-pian'], 'bei-jing.png', { type: 'image/png' }))
    await shuRu.trigger('change')
    await flushPromises()
    const 仓库 = 使用用户设置仓库()
    expect(仓库.liaoTianBeiJing).toBe(ZI_DING_YI_URL)
    expect(仓库.shiZiDingYi).toBe(true)
    const liaoTian = await mountLiaoTian()
    const quYu = liaoTian.find('.xiaoxi-quyu')
    expect(quYu.exists()).toBe(true)
    expect(quYu.attributes('style') || '').toContain(ZI_DING_YI_URL)
    zhangHao.unmount()
    liaoTian.unmount()
  })

  it('切换气泡后持久化接口被调用且聊天页CSS变量变化', async () => {
    const zhangHao = await mountZhangHao()
    const liaoTianQian = await mountLiaoTian()
    const qianYangShi = liaoTianQian.find('.xiaoxi-quyu').attributes('style') || ''
    liaoTianQian.unmount()
    const kaPian = zhangHao.find('#qi-pao-xuan-ze')
    const anNiu = kaPian.findAll('[role="radio"]')
    await anNiu[1].trigger('click')
    await flushPromises()
    const sheJiao = await import('@/api/社交')
    expect(vi.mocked(sheJiao.baoCunQiPao)).toHaveBeenCalledWith({ ziJi: QI_PAO_YU_SHE_XUAN_XIANG[1] })
    const 仓库 = 使用用户设置仓库()
    expect(仓库.qiPaoZiJi).toBe(QI_PAO_YU_SHE_XUAN_XIANG[1])
    const liaoTianHou = await mountLiaoTian()
    const houYangShi = liaoTianHou.find('.xiaoxi-quyu').attributes('style') || ''
    expect(houYangShi).toContain(QI_PAO_YU_SHE_BIAO[QI_PAO_YU_SHE_XUAN_XIANG[1]].beiJing)
    expect(houYangShi).not.toBe(qianYangShi)
    zhangHao.unmount()
    liaoTianHou.unmount()
  })

  it('删除背景后回默认且聊天页背景内联样式清空', async () => {
    const sheJiao = await import('@/api/社交')
    vi.mocked(sheJiao.huoQuYongHuSheZhi).mockResolvedValue({
      uid: 'u1',
      shou_ji_hao: '13800138000',
      tou_xiang: null,
      qian_ming: null,
      qian_ming_ke_jian_xing: 'gong_kai',
      qian_ming_bai_ming_dan: [],
      liao_tian_bei_jing: ZI_DING_YI_URL,
      qi_pao_zi_ji: 'weiXinLv',
      qi_pao_ai: 'yunBai',
      gong_kai_zhang_hao: true,
      gong_kai_shou_ji_hao: false,
      gong_kai_you_xiang: false,
      bang_ding_you_xiang: '',
    })
    const zhangHao = await mountZhangHao()
    expect(zhangHao.find('.zi-ding-yi-yu-lan-tu').exists()).toBe(true)
    expect(zhangHao.find('.zi-ding-yi-shan-chu').text()).toBe(
      huoQuFanYi('sheZhi', 'shanChuZiDingYiBeiJing'),
    )
    await zhangHao.find('.zi-ding-yi-shan-chu').trigger('click')
    await flushPromises()
    expect(vi.mocked(sheJiao.baoCunLiaoTianBeiJing)).toHaveBeenCalledWith('moRen')
    expect(使用用户设置仓库().liaoTianBeiJing).toBe('moRen')
    const liaoTian = await mountLiaoTian()
    const yangShi = liaoTian.find('.xiaoxi-quyu').attributes('style') || ''
    expect(yangShi).not.toContain(ZI_DING_YI_URL)
    zhangHao.unmount()
    liaoTian.unmount()
  })
})
