import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 聊天页面 from '@/views/聊天页面.vue'
import QuanJuCaiDan from '@/components/全局菜单.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import type { 消息 } from '@/types'

vi.mock('@/router', () => ({
  default: { push: vi.fn().mockResolvedValue(true) },
}))

vi.mock('@/api/聊天', () => ({
  huoQuXiaoXi: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
  faSongXiaoXi: vi.fn(),
  cheHuiXiaoXi: vi.fn(),
  biaoJiYiDu: vi.fn(),
  huoQuJiaoSeXiangQing: vi.fn().mockResolvedValue({
    jiao_se: {
      id: 'j1',
      ming_zi: '测试角色',
      wei_xin_ming: '小甜心',
      tou_xiang: '',
      xing_bie: 'nv',
      bei_jing_gu_shi: '',
      xing_ge: '',
      yan_yu_feng_ge: '',
      chuang_jian_shi_jian: new Date().toISOString(),
    },
    dang_an_zhuang_tai: null,
  }),
  chuangJianHuiHua: vi.fn(),
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

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}))

function chuangJianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/chat/:huiHuaId', name: 'liaoTian', component: 聊天页面 },
    ],
  })
}

async function mountLiaoTianYeMian() {
  const luYou = chuangJianLuYou()
  await luYou.push('/chat/h1')
  const pinia = createPinia()
  setActivePinia(pinia)

  const 用户仓库 = 使用用户仓库()
  用户仓库.dangQianYongHu = {
    id: 'u1',
    shou_ji_hao: '13800138000',
    yong_hu_ming: '测试用户',
    ni_cheng: null,
    xing_bie: 'male',
    mu_biao_xing_bie: null,
    xing_ge_xuan_ze: null,
    ren_she_biao_qian: null,
    yun_xu_zha_nan_zha_nv: false,
    tou_xiang: null,
    sheng_ri: null,
    qian_ming: null,
    guan_li_yuan: false,
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

  const wrapper = mount(
    {
      components: { QuanJuCaiDan },
      template: '<div><QuanJuCaiDan /><router-view /></div>',
    },
    { global: { plugins: [pinia, luYou] }, attachTo: document.body },
  )
  await flushPromises()
  return { wrapper, luYou, 聊天仓库 }
}

function zaoXiaoXi(xuHao: number): 消息 {
  return {
    id: `x-${xuHao}`,
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: `历史消息${xuHao}`,
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now() - (10000 - xuHao) * 1000,
    yi_du: true,
  }
}

describe('M5 自研虚拟渲染（窗口化）', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('消息量低于全量渲染阈值时全部挂载，行为与旧版一致', async () => {
    const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
    聊天仓库.xiaoXiLieBiao = Array.from({ length: 50 }, (_, i) => zaoXiaoXi(i + 1))
    await flushPromises()

    const xiangMu = wrapper.findAll('.xiaoxi-xiangmu')
    expect(xiangMu.length).toBe(50)
    wrapper.unmount()
  })

  it('超过阈值后仅渲染末尾窗口，DOM 数量有界', async () => {
    const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
    聊天仓库.xiaoXiLieBiao = Array.from({ length: 400 }, (_, i) => zaoXiaoXi(i + 1))
    await flushPromises()

    const xiangMu = wrapper.findAll('.xiaoxi-xiangmu')
    // 初始窗口 120 条 + 少量时间标签分支；远小于 400
    expect(xiangMu.length).toBeGreaterThan(0)
    expect(xiangMu.length).toBeLessThanOrEqual(130)
    // 最新一条必须可见
    expect(wrapper.text()).toContain('历史消息400')
    // 窗口外的最旧消息不渲染
    expect(wrapper.text()).not.toContain('历史消息1')
    wrapper.unmount()
  })

  it('向上滚动到顶时扩展窗口且不强制改变查看位置', async () => {
    const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
    聊天仓库.xiaoXiLieBiao = Array.from({ length: 400 }, (_, i) => zaoXiaoXi(i + 1))
    聊天仓库.haiYouGengDuo = false
    await flushPromises()

    const quYu = wrapper.find('.xiaoxi-quyu').element as HTMLElement
    Object.defineProperty(quYu, 'scrollHeight', { value: 5000, configurable: true })
    Object.defineProperty(quYu, 'clientHeight', { value: 800, configurable: true })
    Object.defineProperty(quYu, 'scrollTop', { value: 0, configurable: true, writable: true })

    quYu.dispatchEvent(new Event('scroll'))
    await flushPromises()
    await vi.advanceTimersByTimeAsync(50)
    await flushPromises()

    // 窗口扩大：更早的消息进入 DOM
    expect(wrapper.findAll('.xiaoxi-xiangmu').length).toBeGreaterThan(120)
    // 锚点稳定：jsdom 无布局差值为 0，scrollTop 不被强制修改（保留查看位置）
    expect(quYu.scrollTop).toBe(0)
    wrapper.unmount()
  })

  it('上滑加载更多后继续上滚逐步揭示更早消息（视口内容保持稳定）', async () => {
    const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
    // 首屏 300 条（已超阈值），服务端还有更多
    聊天仓库.xiaoXiLieBiao = Array.from({ length: 300 }, (_, i) => zaoXiaoXi(i + 1))
    聊天仓库.zongShu = 460
    聊天仓库.haiYouGengDuo = true

    const { huoQuXiaoXi } = await import('@/api/聊天')
    vi.mocked(huoQuXiaoXi).mockResolvedValue({
      lie_biao: Array.from({ length: 50 }, (_, i) => zaoXiaoXi(-i)),
      zong_shu: 460,
      hai_you_geng_duo: true,
    })

    // 触发加载更多按钮：数据进入内存，但更早消息尚未渲染（窗口化）
    const anNiu = wrapper.find('.jiazaigengduo-anniu')
    expect(anNiu.exists()).toBe(true)
    await anNiu.trigger('click')
    await flushPromises()
    expect(聊天仓库.xiaoXiLieBiao.length).toBe(350)
    // 原有最新消息仍稳定渲染（尾部窗口语义，视口不跳变）
    expect(wrapper.text()).toContain('历史消息300')

    // 继续向上滚动 → 窗口渐进扩展（230→150→70→0），更早消息进入 DOM
    const quYu = wrapper.find('.xiaoxi-quyu').element as HTMLElement
    Object.defineProperty(quYu, 'scrollHeight', { value: 6000, configurable: true })
    Object.defineProperty(quYu, 'clientHeight', { value: 800, configurable: true })
    Object.defineProperty(quYu, 'scrollTop', { value: 0, configurable: true, writable: true })
    for (let i = 0; i < 3; i++) {
      quYu.dispatchEvent(new Event('scroll'))
      await flushPromises()
      await vi.advanceTimersByTimeAsync(50)
      await flushPromises()
    }

    expect(wrapper.text()).toContain('历史消息-49')
    wrapper.unmount()
  })
})
