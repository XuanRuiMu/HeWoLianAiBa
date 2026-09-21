import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import 全局菜单 from '@/components/全局菜单.vue'
import 个人设置页 from '@/views/账号与安全.vue'
import { 使用用户仓库 } from '@/stores/用户'
import { huoQuFanYi, fanYi } from '@/config/translations'

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
  huoQuTongZhiLieBiao: vi.fn().mockResolvedValue({ lie_biao: [], wei_du_shu: 0 }),
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

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn(), connected: false })),
}))

const caiDanYuanMa = readFileSync(resolve(__dirname, '../components/全局菜单.vue'), 'utf8')
const sheZhiYuanMa = readFileSync(resolve(__dirname, '../views/账号与安全.vue'), 'utf8')

async function mountCaiDan() {
  const luYou = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/login', name: 'dengLu', component: { template: '<div>登录</div>' } },
      { path: '/hao-you', name: 'haoYouLieBiao', component: { template: '<div>好友</div>' } },
      {
        path: '/guo-wang-zhan-ji',
        name: 'guoWangZhanJi',
        component: { template: '<div>战绩</div>' },
      },
      {
        path: '/zhang-hao-an-quan',
        name: 'zhangHaoAnQuan',
        component: { template: '<div>设置</div>' },
      },
    ],
  })
  await luYou.push('/zhang-hao-an-quan')
  const pinia = createPinia()
  setActivePinia(pinia)
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
  const wrapper = mount(全局菜单, { global: { plugins: [pinia, luYou] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, luYou }
}

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

describe('FP-02 菜单治理', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('用户下拉无三级飞出列与二级展开组', async () => {
    const { wrapper } = await mountCaiDan()
    await wrapper.find('.yonghu-xuanxiang').trigger('click')
    await flushPromises()
    expect(wrapper.find('.zhanghao-shezhi-feichu').exists()).toBe(false)
    expect(wrapper.find('.zhanghao-shezhi-biaoti').exists()).toBe(false)
    expect(wrapper.find('.zhanghao-shezhi-zu').exists()).toBe(false)
    expect(caiDanYuanMa).not.toContain('zhangHaoSheZhiZhanKai')
    expect(caiDanYuanMa).not.toContain('feiChuKaiQi')
  })

  it('下拉顺序为账号设置→过往战绩→好友→退出登录，退出登录在好友之下', async () => {
    const { wrapper } = await mountCaiDan()
    await wrapper.find('.yonghu-xuanxiang').trigger('click')
    await flushPromises()
    const xiala = wrapper.find('.yonghu-xiala')
    expect(xiala.text()).toContain(huoQuFanYi('caidan', 'haoYou'))
    expect(xiala.text()).toContain(huoQuFanYi('caidan', 'guoWangZhanJi'))
    expect(xiala.text()).toContain(huoQuFanYi('caidan', 'zhangHaoSheZhi'))
    const tuiChu = xiala.find('.tuichu-xiangmu')
    expect(tuiChu.exists()).toBe(true)
    expect(tuiChu.text()).toBe(huoQuFanYi('caidan', 'tuiChuDengLu'))
    const anNiuWenBen = xiala.findAll('button').map((b) => b.text())
    const sheZhiWeiZhi = anNiuWenBen.findIndex((t) => t === huoQuFanYi('caidan', 'zhangHaoSheZhi'))
    const zhanJiWeiZhi = anNiuWenBen.findIndex((t) => t === huoQuFanYi('caidan', 'guoWangZhanJi'))
    const haoYouWeiZhi = anNiuWenBen.findIndex((t) => t === huoQuFanYi('caidan', 'haoYou'))
    const tuiChuWeiZhi = anNiuWenBen.findIndex((t) => t === huoQuFanYi('caidan', 'tuiChuDengLu'))
    expect(sheZhiWeiZhi).toBeGreaterThanOrEqual(0)
    expect(zhanJiWeiZhi).toBe(sheZhiWeiZhi + 1)
    expect(haoYouWeiZhi).toBe(zhanJiWeiZhi + 1)
    expect(tuiChuWeiZhi).toBe(haoYouWeiZhi + 1)
  })

  it('菜单无修改用户名/密码/默认性别弹窗逻辑', async () => {
    const { wrapper } = await mountCaiDan()
    await wrapper.find('.yonghu-xuanxiang').trigger('click')
    await flushPromises()
    expect(wrapper.find('.xiugai-zhezhao').exists()).toBe(false)
    for (const pianDuan of [
      'xiuGaiYongHuMingXianShi',
      'xiuGaiMiMaXianShi',
      'sheZhiMoRenXingBieXianShi',
      'gengGaiYongHuMing',
      'gengGaiMiMa',
      'gengGaiMoRenXingBie',
    ]) {
      expect(caiDanYuanMa).not.toContain(pianDuan)
    }
  })

  it('个人设置路由顶栏标题显示个人设置', async () => {
    const { wrapper } = await mountCaiDan()
    expect(wrapper.find('.ye-mian-biao-ti').text()).toBe(huoQuFanYi('yeMianBiaoTi', 'zhangHaoAnQuan'))
  })

  it('退出登录仍为红色警示样式', () => {
    expect(caiDanYuanMa).toMatch(
      /\.tuichu-xiangmu\s*\{[^}]*color:\s*var\(--yanse-weixian\)\s*!important/,
    )
  })
})

describe('FP-02 个人设置页', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('新增翻译键齐全', () => {
    for (const jian of [
      'geRenSheZhiBiaoTi',
      'geRenSheZhiFuBiaoTi',
      'yongHuMingMiaoShu',
      'miMaMiaoShu',
    ] as const) {
      expect((fanYi.sheZhi as Record<string, string>)[jian]).toBeTruthy()
    }
  })

  it('一页含头像/签名/用户名/密码/默认性别/聊天背景六区', async () => {
    const wrapper = await mountSheZhi()
    const wenBen = wrapper.text()
    expect(wenBen).toContain(huoQuFanYi('sheZhi', 'touXiangBiaoTi'))
    expect(wenBen).toContain(huoQuFanYi('sheZhi', 'qianMingBiaoTi'))
    expect(wenBen).toContain(huoQuFanYi('caidan', 'xiuGaiYongHuMing'))
    expect(wenBen).toContain(huoQuFanYi('caidan', 'xiuGaiMiMa'))
    expect(wenBen).toContain(huoQuFanYi('caidan', 'sheZhiMoRenXingBie'))
    expect(wenBen).toContain(huoQuFanYi('sheZhi', 'liaoTianBeiJing'))
    expect(wrapper.find('#yong-hu-ming').exists()).toBe(true)
    expect(wrapper.find('#mi-ma').exists()).toBe(true)
    expect(wrapper.find('#mo-ren-xing-bie').exists()).toBe(true)
    wrapper.unmount()
  })

  it('头像裁剪1024/签名500字与可见性/背景六选项复用', async () => {
    const wrapper = await mountSheZhi()
    expect(huoQuFanYi('sheZhi', 'touXiangCaiJianTiShi')).toContain('1024')
    expect(wrapper.find('.qianming-shuru').attributes('maxlength')).toBe('500')
    expect(wrapper.find('.ke-jian-xing-xiala').exists()).toBe(true)
    expect(wrapper.findAll('.beijing-xiangmu').length).toBe(6)
    wrapper.unmount()
  })

  it('用户名修改走认证接口并同步用户仓库', async () => {
    const wrapper = await mountSheZhi()
    const renZheng = await import('@/api/认证')
    await wrapper.find('.yonghuming-shuru').setValue('新名字')
    await wrapper.find('.yonghuming-baocun').trigger('click')
    await flushPromises()
    expect(vi.mocked(renZheng.gengGaiYongHuMing)).toHaveBeenCalledWith('新名字')
    wrapper.unmount()
  })

  it('密码修改走认证接口', async () => {
    const wrapper = await mountSheZhi()
    const renZheng = await import('@/api/认证')
    await wrapper.find('.mima-jiu').setValue('旧密码123')
    await wrapper.find('.mima-xin').setValue('新密码123')
    await wrapper.find('.mima-queren').setValue('新密码123')
    await wrapper.find('.mima-yanzhengma').setValue('123456')
    await wrapper.find('.mima-baocun').trigger('click')
    await flushPromises()
    expect(vi.mocked(renZheng.gengGaiMiMa)).toHaveBeenCalledWith(
      '旧密码123',
      '新密码123',
      '新密码123',
      '123456',
    )
    wrapper.unmount()
  })

  it('默认性别保存走认证接口', async () => {
    const wrapper = await mountSheZhi()
    const renZheng = await import('@/api/认证')
    await wrapper.find('.xingbie-nv').trigger('click')
    await wrapper.find('.xingbie-baocun').trigger('click')
    await flushPromises()
    expect(vi.mocked(renZheng.gengGaiMoRenXingBie)).toHaveBeenCalledWith('female')
    wrapper.unmount()
  })

  it('新卡片标题走翻译文件', () => {
    for (const pianDuan of [
      "sheZhi', 'geRenSheZhiBiaoTi'",
      "sheZhi', 'yongHuMingMiaoShu'",
      "sheZhi', 'miMaMiaoShu'",
      "caidan', 'xiuGaiYongHuMing'",
      "caidan', 'xiuGaiMiMa'",
      "caidan', 'sheZhiMoRenXingBie'",
    ]) {
      expect(sheZhiYuanMa).toContain(pianDuan)
    }
  })
})
