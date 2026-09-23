import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { huoQuFanYi } from '@/config/translations'
import 聊天页面 from '@/views/聊天页面.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { faSongXiaoXi } from '@/api/聊天'
import { xieRuShuRuQu } from './输入区夹具'
import type { 消息 } from '@/types'

/**
 * FP-08b（缺陷5）页面级取证：右键「引用」这条状态必须**穿过发送调用点**走到 API，
 * 且发送成功后引用态清零 —— 否则下一条消息会继承上一条的引用（新 bug）。
 *
 * 外观（引用条长什么样、气泡里的引用块）归 FP-09，本文件只碰引用条根类 `.yinyong-tiao` 的**在/不在**，
 * 因为它就是 `use长按菜单.ts::yinYongXiaoXi` 这唯一真源的投影；请求体形状与幂等路径
 * 由 `FP08b引用发送链路.test.ts` 在 store→api→http 那一层钉。
 */

vi.mock('@/api/聊天', () => ({
  huoQuXiaoXi: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
  faSongXiaoXi: vi.fn(),
  cheHuiXiaoXi: vi.fn(),
  biaoJiYiDu: vi.fn(),
  fanYiWenBen: vi.fn(),
  chongQianMeiTiURL: vi.fn(),
  huoQuJiaoSeXiangQing: vi.fn().mockResolvedValue({
    jiao_se: {
      id: 'j1',
      ming_zi: '测试角色',
      wei_xin_ming: '小甜心',
      tou_xiang: '',
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
  huoQuFuPan: vi.fn().mockResolvedValue({
    fu_pan_nei_rong: null,
    fu_pan_shi_jian_xian: [],
    fu_pan_pi_zhu: null,
    jun_shi_zhi_dao_ji_lu: [],
    guan_jian_shi_jian: [],
    jia_zai_zhong: false,
  }),
}))

vi.mock('@/api/通知', () => ({
  huoQuTongZhiLieBiao: vi.fn().mockResolvedValue({ lie_biao: [], wei_du_shu: 0 }),
  biaoJiTongZhiYiDu: vi.fn(),
  biaoJiQuanBuTongZhiYiDu: vi.fn(),
}))

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn(), connected: false })),
}))

const 被引用ID = 'w1'

function zaoXiaoXi(gengDuo: Partial<消息> = {}): 消息 {
  return {
    id: 被引用ID,
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: '被引用的那句原文',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: true,
    ...gengDuo,
  }
}

function 投递成功(附加: Record<string, unknown> = {}) {
  return {
    xiaoXi: {
      id: 'luo-ku-1',
      hui_hua_id: 'h1',
      fa_song_zhe_id: 'u1',
      fa_song_zhe_lei_xing: 'yonghu',
      nei_rong: '刚发出去的那句',
      lei_xing: 'wenben',
      shi_jian_chuo: Date.now(),
      yi_du: true,
      ...附加,
    },
    shiMiJi: false,
  }
}

const yiGuaZai: Array<{ unmount: () => void }> = []

async function mountChat() {
  const luYou = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/chat/:huiHuaId', name: 'liaoTian', component: 聊天页面 }],
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
    tou_xiang: '',
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
  }
  const wrapper = mount(聊天页面, { global: { plugins: [pinia, luYou] }, attachTo: document.body })
  yiGuaZai.push(wrapper)
  await flushPromises()
  聊天仓库.xiaoXiLieBiao = [zaoXiaoXi()]
  await flushPromises()
  return { wrapper, 聊天仓库 }
}

/** 打开右键菜单并点「引用」（菜单项顺序由 消息配置 单源，FP-08 文本菜单测试已钉） */
async function dianYinYong(wrapper: Awaited<ReturnType<typeof mountChat>>['wrapper']) {
  await wrapper.find('.xiaoxi-xiangmu').trigger('contextmenu', { clientX: 88, clientY: 120 })
  await flushPromises()
  const anNiu = Array.from(document.body.querySelectorAll('.chehui-caidan .chehui-xiangmu'))
  const yinYongAnNiu = anNiu.find((b) => b.textContent === huoQuFanYi('liaoTian', 'yinYong'))
  expect(yinYongAnNiu, '右键菜单里找不到「引用」项').toBeTruthy()
  yinYongAnNiu?.click()
  await flushPromises()
}

async function shuRuBingFaSong(
  wrapper: Awaited<ReturnType<typeof mountChat>>['wrapper'],
  neiRong: string,
) {
  // 契约演进（FP-10c）：输入区载体由 <textarea> 换成图文真内联的 <div contenteditable>，
  // `setValue()` 在 div 上是静默 no-op（VTU 只认 input/textarea/select）⇒ 旧写法等于「发空内容」，
  // `keYiFaSong` 为假 → 按钮 disabled → 零调用，四条语义全部假绿。写入改走 __tests__/输入区夹具.ts
  // 的唯一真路径（写 DOM + 派发 input → 组件 → use待发图文 真源），发送触发仍点 `.fasong-anniu`。
  await xieRuShuRuQu(wrapper, neiRong)
  await flushPromises()
  await wrapper.find('.fasong-anniu').trigger('click')
  await flushPromises()
  await flushPromises()
}

beforeEach(() => {
  vi.mocked(faSongXiaoXi).mockReset()
  vi.mocked(faSongXiaoXi).mockResolvedValue(投递成功() as never)
})

afterEach(() => {
  while (yiGuaZai.length) yiGuaZai.pop()?.unmount()
  vi.clearAllMocks()
})

describe('FP-08b ② 引用态必须穿过发送调用点（页面级）', () => {
  it('右键引用后点发送：store→api 的入参对象带着 beiYongXiaoXiId', async () => {
    const { wrapper } = await mountChat()
    await dianYinYong(wrapper)
    expect(wrapper.find('.yinyong-tiao').exists()).toBe(true)
    await shuRuBingFaSong(wrapper, '这句要引用上面')
    expect(faSongXiaoXi).toHaveBeenCalledTimes(1)
    expect(vi.mocked(faSongXiaoXi).mock.calls[0][0]).toMatchObject({
      huiHuaId: 'h1',
      neiRong: '这句要引用上面',
      yinYong: { beiYongXiaoXiId: 被引用ID },
    })
  })

  it('发送成功后引用态清零：第二条消息不再继承上一条的引用', async () => {
    const { wrapper } = await mountChat()
    await dianYinYong(wrapper)
    await shuRuBingFaSong(wrapper, '第一条带引用')
    expect(wrapper.find('.yinyong-tiao').exists()).toBe(false)
    await shuRuBingFaSong(wrapper, '第二条不带引用')
    expect(faSongXiaoXi).toHaveBeenCalledTimes(2)
    expect(vi.mocked(faSongXiaoXi).mock.calls[1][0].yinYong).toBeUndefined()
    expect(vi.mocked(faSongXiaoXi).mock.calls[1][0].neiRong).toBe('第二条不带引用')
  })

  it('发送失败不清引用态：引用条留在原地，用户不必重选', async () => {
    vi.mocked(faSongXiaoXi).mockRejectedValue(new Error('网络异常'))
    const { wrapper } = await mountChat()
    await dianYinYong(wrapper)
    await shuRuBingFaSong(wrapper, '这条发不出去')
    expect(wrapper.find('.yinyong-tiao').exists()).toBe(true)
  })

  it('未选引用直接发送：入参对象的 yinYong 缺席（undefined 即不进 body）', async () => {
    const { wrapper } = await mountChat()
    await shuRuBingFaSong(wrapper, '没人引用')
    const 实参 = vi.mocked(faSongXiaoXi).mock.calls[0][0]
    expect(实参.yinYong).toBeUndefined()
    expect(实参.neiRong).toBe('没人引用')
  })
})
