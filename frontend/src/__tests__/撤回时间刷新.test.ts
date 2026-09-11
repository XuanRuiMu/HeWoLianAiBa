import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { VueWrapper } from '@vue/test-utils'
import 聊天页面 from '@/views/聊天页面.vue'
import QuanJuCaiDan from '@/components/全局菜单.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import type { 消息 } from '@/types'

vi.mock('@/router', () => ({
  default: { push: vi.fn().mockResolvedValue(true) },
}))

vi.mock('@/api/聊天', () => ({
  huoQuXiaoXi: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
  faSongXiaoXi: vi.fn(),
  cheHuiXiaoXi: vi.fn(),
  biaoJiYiDu: vi.fn(),
  huoQuJiaoSeXiangQing: vi.fn().mockResolvedValue({ jiao_se: null, dang_an_zhuang_tai: null }),
  chuangJianHuiHua: vi.fn(),
  chuLiGaoBai: vi.fn(),
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
  chongQianMeiTiURL: vi.fn(),
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

const liaoTianYeMianLuJing = resolve(__dirname, '../views/聊天页面.vue')
const liaoTianYeMianYuanMa = readFileSync(liaoTianYeMianLuJing, 'utf8')

const JI_ZHUN_SHI_KE = new Date('2026-08-26T12:00:00').getTime()

function chuangJianYongHuXiaoXi(shiJianChuo: number): 消息 {
  return {
    id: `x-${shiJianChuo}`,
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'u1',
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '可撤回消息',
    lei_xing: 'wenben',
    shi_jian_chuo: shiJianChuo,
    yi_du: true,
  }
}

let yiGuaZaiWrapper: VueWrapper | null = null

async function mountLiaoTianYeMian() {
  const luYou = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/chat/:huiHuaId', name: 'liaoTian', component: 聊天页面 },
    ],
  })
  await luYou.push('/chat/h1')
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
    guan_li_yuan: false,
    huo_yue_ren_she_id: null,
    hai_wang_fen_shu: 0,
    chuang_jian_shi_jian: new Date().toISOString(),
    geng_xin_shi_jian: new Date().toISOString(),
  }
  用户仓库.令牌 = 'test-token'

  const 聊天仓库 = 使用聊天仓库()

  const wrapper = mount(
    {
      components: { QuanJuCaiDan },
      template: '<div><QuanJuCaiDan /><router-view /></div>',
    },
    {
      global: {
        plugins: [pinia, luYou],
      },
      attachTo: document.body,
    },
  )
  yiGuaZaiWrapper = wrapper
  await flushPromises()
  return { wrapper, luYou, 聊天仓库 }
}

describe('P1-11 撤回窗口时间刷新策略', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(JI_ZHUN_SHI_KE)
  })

  afterEach(() => {
    if (yiGuaZaiWrapper) {
      yiGuaZaiWrapper.unmount()
      yiGuaZaiWrapper = null
    }
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('撤回窗口内的用户消息在到期时刻后自动隐藏撤回按钮（单次翻转定时器）', async () => {
    const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()

    聊天仓库.xiaoXiLieBiao = [chuangJianYongHuXiaoXi(JI_ZHUN_SHI_KE - 60 * 1000)]
    await flushPromises()

    expect(wrapper.find('.chehui-anniu').exists()).toBe(true)

    await vi.advanceTimersByTimeAsync(XIAO_XI_PEI_ZHI.cheHuiShiXian - 61 * 1000)
    await flushPromises()
    expect(wrapper.find('.chehui-anniu').exists()).toBe(true)

    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()
    expect(wrapper.find('.chehui-anniu').exists()).toBe(false)
  })

  it('挂载后追加的窗口内消息同样在到期时刻隐藏撤回按钮', async () => {
    const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()

    聊天仓库.xiaoXiLieBiao = []
    await flushPromises()
    expect(wrapper.find('.chehui-anniu').exists()).toBe(false)

    聊天仓库.xiaoXiLieBiao = [...聊天仓库.xiaoXiLieBiao, chuangJianYongHuXiaoXi(JI_ZHUN_SHI_KE)]
    await flushPromises()
    expect(wrapper.find('.chehui-anniu').exists()).toBe(true)

    await vi.advanceTimersByTimeAsync(XIAO_XI_PEI_ZHI.cheHuiShiXian + 2000)
    await flushPromises()
    expect(wrapper.find('.chehui-anniu').exists()).toBe(false)
  })

  it('不存在每秒轮询 dangQianShiJian 的 setInterval，改为按到期时刻调度', () => {
    expect(liaoTianYeMianYuanMa).not.toMatch(
      /setInterval\(\s*\(\)\s*=>\s*\{?\s*dangQianShiJian\.value\s*=\s*Date\.now\(\)/,
    )
    expect(liaoTianYeMianYuanMa).not.toContain('qiDongShiJianGengXinQi')
    expect(liaoTianYeMianYuanMa).not.toContain('tingZhiShiJianGengXinQi')
    expect(liaoTianYeMianYuanMa).toContain('jiSuanXiaYiCheHuiDaoQiShiKe')
    expect(liaoTianYeMianYuanMa).toContain('anPaiCheHuiFanZhuan')
    expect(liaoTianYeMianYuanMa).toContain('tingZhiCheHuiFanZhuan')
  })
})
