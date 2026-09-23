import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 聊天页面 from '@/views/聊天页面.vue'
import 图文输入区 from '@/components/聊天/图文输入区.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { use待发图文 } from '@/composables/use待发图文'
import { duQuShuRuQuText, kuaiXuLieShuRuQu, xieRuShuRuQu } from './输入区夹具'
import {
  BIAO_QING_BAO_MEI_TI_LEI_BIE,
  XIAO_XI_KUAI_LEI_XING,
  shiXuYaoKuaiXuanRan,
} from '@/utils/消息内容块'
import { XIAO_XI_KUAI_PEI_ZHI, XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { BIAO_QING_BAO_LIE_BIAO, xuanRanBiaoQingBao } from '@/utils/表情包库'
import { huoQuFanYi } from '@/config/translations'
import type { 消息 } from '@/types'

/**
 * FP-10a（需求 #6 图文同区 · 第一刀）守门：判据反转 + 贴纸进待发。
 *
 * 本文件钉两件事，全部走解析值 / DOM / 行为，不拿源码字符串包含冒充（审计 B10）：
 *  ① `shiXuYaoKuaiXuanRan` 的反转只把「块数恰为 1 的图 / 贴纸行」改派给块渲染；
 *     `views/聊天页面.vue` 的图片 :102 / 表情包 :122 两条媒体分支**不退化成死分支**——
 *     它们仍接住"反构不出图片块"那类脏行（`nei_rong_kuai` 缺失 + `mei_ti_id` 为空）。
 *     （判据本体的形态表在 __tests__/FP10b图文混排.test.ts 的 FP-10a 组。）
 *  ② 表情面板选贴纸 ⇒ 进待发块序列（与图片同一条 `chaRuDaiFaTuPian` 链路、同一插入序语义），
 *     于是 FP-24a 落的 `.dai-fa-kuai-tu--biaoqingbao` 由孤立类变成有真实生产者的形态。
 *     点贴纸这一刻**零上传零发送**（canvas 只在本地渲染，C4 授权门随之后移到发送那一刻），
 *     按下发送才按贴纸类别上传并发出一条带有序块数组的消息。
 *
 * 【FP-10c 落盘后的契约演进（本文件尾段迁移，逐条旧→新）】
 *  1. 「待发块序列」组件 `components/聊天/待发图文块序列.vue` 与它的 `.dai-fa-kuai-lie` 容器、
 *     `.dai-fa-kuai-xu` 序号、`.dai-fa-kuai-wen` 内层文字、`.dai-fa-ku--huodong` 活动态**随真内联退役**
 *     （FP10c真内联输入区.test.ts ① 以「全库命中 0」钉住这条退役）。本文件的待发呈现判定因此
 *     改吃 `components/聊天/图文输入区.vue` 的真内联形态：块是文字流里的 `[data-kuai-id]` 原子块。
 *     旧「序号 1/2/3 == 视觉序」→ 新「DOM 序逐位 == 块数组下标序（连 id 一起比）」：更强的同一条不变式。
 *  2. 旧「点前一块 ⇒ 输入区切回那句」（切段手势）无宿主 ⇒ 改判为「文字与块恒在同一条流里同时可见」，
 *     即插入后 `duQuShuRuQuText` 与页面投影都仍等于用户打过的字。这条覆盖的是原断言的**目的**
 *     （已打的字不丢），且比旧写法更强：旧写法只保证点一下之后看得见，新写法要求一直看得见。
 *  3. `wrapper.find('.shuru-kuang').setValue(x)` 在 contenteditable 的 div 上是静默 no-op
 *     （VTU 的 setValue 只认 input/textarea/select）⇒ 一律改走 __tests__/输入区夹具.ts。
 *
 * 【两页一致的本刀口径（如实登记）】好友页目前**没有表情面板**（`views/好友聊天.vue` 内
 *  贴纸/表情入口命中数为 0，PROGRESS『取证引出的三个新缺口』② 同源），故"贴纸→待发"的生产者
 *  只存在于 AI 页；两页共用的是**链路本身**（同一个 `use待发图文` + 同一个图文输入区组件），
 *  本文件末组用「生产者产出的贴纸块喂给共用组件」的方式钉这条一致性，
 *  给好友页补表情面板入口不在 FP-10a 的验收面内（归 FP-21 的好友侧对等改造）。
 */

const MEI_TI_ID = '11111111-1111-4111-8111-111111111111'
const SHANG_CHUAN_MEI_TI_ID = '33333333-3333-4333-8333-333333333333'
const TU_URL = '/api/媒体/' + 'a'.repeat(64) + '?e=1&u=2&t=3&s=4'

const shangChuanMeiTiMock = vi.fn()
const faSongXiaoXiApiMock = vi.fn()
const xuanRanMock = vi.fn()

vi.mock('@/api/聊天', async () => {
  const shiJi = await vi.importActual<typeof import('@/api/聊天')>('@/api/聊天')
  return {
    ...shiJi,
    huoQuXiaoXi: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
    faSongXiaoXi: (...canShu: unknown[]) => faSongXiaoXiApiMock(...canShu),
    shangChuanMeiTi: (...canShu: unknown[]) => shangChuanMeiTiMock(...canShu),
    cheHuiXiaoXi: vi.fn(),
    biaoJiYiDu: vi.fn(),
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
  }
})

vi.mock('@/api/通知', () => ({
  huoQuTongZhiLieBiao: vi.fn().mockResolvedValue({ lie_biao: [], wei_du_shu: 0 }),
  biaoJiTongZhiYiDu: vi.fn(),
  biaoJiQuanBuTongZhiYiDu: vi.fn(),
}))

vi.mock('@/api/表情', () => ({
  huoQuWoDeBiaoQing: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
  tianJiaBiaoQing: vi.fn(),
  shanChuBiaoQing: vi.fn(),
  baoCunBiaoQingPaiXu: vi.fn(),
}))

// 贴纸的 canvas 渲染本体由 __tests__/多媒体聊天.test.ts 把守；本文件只验"渲染产物进哪条链路"，
// 故把它换成一颗可断言的 Blob 桩（不为此再造一套 canvas 夹具）。
vi.mock('@/utils/表情包库', async () => {
  const shiJi = await vi.importActual<typeof import('@/utils/表情包库')>('@/utils/表情包库')
  return {
    ...shiJi,
    xuanRanBiaoQingBao: (...canShu: unknown[]) => xuanRanMock(...canShu),
  }
})

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}))

class JiaAudio {
  src = ''
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  play() {
    return Promise.resolve()
  }
  pause() {}
}

class JiaResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function jiXiaoXi(buFen: Partial<消息>): 消息 {
  return {
    id: 'x-fp10a',
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: '',
    lei_xing: 'wenben',
    shi_jian_chuo: 1700000000000,
    yi_du: true,
    ...buFen,
  } as 消息
}

async function maoZai(...xiaoXi: 消息[]) {
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
  聊天仓库.dangQianHuiHuaId = 'h1'
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
  const wrapper = mount(聊天页面, {
    global: { plugins: [pinia, luYou] },
    attachTo: document.body,
  })
  await flushPromises()
  聊天仓库.xiaoXiLieBiao = xiaoXi
  await flushPromises()
  return { wrapper, 聊天仓库, 用户仓库 }
}

/** 打开表情面板的「表情包」页签（与 __tests__/多媒体聊天.test.ts 的同一手势路径，不抄样式） */
async function daKaiBiaoQingBaoMianBan(wrapper: Awaited<ReturnType<typeof maoZai>>['wrapper']) {
  await wrapper.find('.emoji-anniu').trigger('click')
  await flushPromises()
  await wrapper.findAll('.mianban-tab')[1].trigger('click')
  await flushPromises()
}

function 内置贴纸格(wrapper: Awaited<ReturnType<typeof maoZai>>['wrapper']) {
  return wrapper.findAll('.biaoqingbao-fenqu')[1].findAll('.biaoqingbao-xiangmu')[0]
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('Audio', JiaAudio as unknown as typeof Audio)
  vi.stubGlobal('ResizeObserver', JiaResizeObserver as unknown as typeof ResizeObserver)
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:fp10a-yulan'),
    revokeObjectURL: vi.fn(),
  } as unknown as typeof URL)
  shangChuanMeiTiMock.mockReset()
  shangChuanMeiTiMock.mockResolvedValue({
    mediaId: SHANG_CHUAN_MEI_TI_ID,
    leiBie: BIAO_QING_BAO_MEI_TI_LEI_BIE,
    yiCunZai: false,
  })
  faSongXiaoXiApiMock.mockReset()
  faSongXiaoXiApiMock.mockResolvedValue({
    xiaoXi: jiXiaoXi({ id: 'fu-wu-duan', lei_xing: 'biaoQingBao', mei_ti_id: SHANG_CHUAN_MEI_TI_ID }),
  })
  xuanRanMock.mockReset()
  xuanRanMock.mockResolvedValue(new Blob(['tie-zhi-bytes'], { type: 'image/png' }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('FP-10a ① 判据反转后的兜底可达性：媒体分支不是死分支', () => {
  it('正常行（服务端回读 1 个图片块）改走块渲染：媒体分支不出现，块出现', async () => {
    const { wrapper } = await maoZai(
      jiXiaoXi({
        id: 'tu-ok',
        lei_xing: 'tuPian',
        nei_rong: XIAO_XI_KUAI_PEI_ZHI.tuPianZhanWei,
        mei_ti_id: MEI_TI_ID,
        mei_ti_url: TU_URL,
        mei_ti_lei_bie: 'tupian',
        nei_rong_kuai: [
          {
            lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian,
            mei_ti_id: MEI_TI_ID,
            mei_ti_url: TU_URL,
            mei_ti_lei_bie: 'tupian',
          },
        ] as never,
      }),
    )
    try {
      expect(wrapper.findAll('.tuwen-kuai-tu')).toHaveLength(1)
      expect(wrapper.find('.tupian-waike').exists()).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })

  it('脏行兜底（旧服务端 + mei_ti_id 为空）：反构不出图片块 ⇒ 图片媒体分支照旧画气泡', async () => {
    const xiaoXi = jiXiaoXi({
      id: 'tuo-dao-tu',
      lei_xing: 'tuPian',
      nei_rong: XIAO_XI_KUAI_PEI_ZHI.tuPianZhanWei,
      mei_ti_id: null,
      mei_ti_url: TU_URL,
    })
    // 前提自证：判据确实判 false（判据为真时这条兜底断言就成了假绿）
    expect(shiXuYaoKuaiXuanRan(xiaoXi)).toBe(false)
    const { wrapper } = await maoZai(xiaoXi)
    try {
      expect(wrapper.find('.tupian-waike').exists()).toBe(true)
      expect(wrapper.find('img.tupian-xianshi').attributes('src')).toBe(TU_URL)
      expect(wrapper.findAll('.tuwen-kuai')).toHaveLength(0)
    } finally {
      wrapper.unmount()
    }
  })

  it('脏行兜底（表情包类型 + 块里的媒体 ID 非法）：表情包媒体分支照旧画，不空气泡', async () => {
    const xiaoXi = jiXiaoXi({
      id: 'tuo-dao-biao',
      lei_xing: 'biaoQingBao',
      nei_rong: XIAO_XI_KUAI_PEI_ZHI.biaoQingBaoZhanWei,
      mei_ti_id: null,
      mei_ti_url: TU_URL,
      nei_rong_kuai: [
        { lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian, mei_ti_id: 'bu-shi-uuid' },
      ] as never,
    })
    expect(shiXuYaoKuaiXuanRan(xiaoXi)).toBe(false)
    const { wrapper } = await maoZai(xiaoXi)
    try {
      expect(wrapper.find('.biaoqingbao-waike').exists()).toBe(true)
      expect(wrapper.find('img.biaoqingbao-tu').attributes('src')).toBe(TU_URL)
    } finally {
      wrapper.unmount()
    }
  })
})

describe('FP-10a ② 贴纸进待发：生产者接上，孤立类有真实生产者', () => {
  it('点表情面板的内置贴纸 ⇒ 贴纸块进待发序列并带贴纸修饰类；这一刻零上传零发送', async () => {
    const { wrapper } = await maoZai()
    try {
      await daKaiBiaoQingBaoMianBan(wrapper)
      expect(内置贴纸格(wrapper).exists()).toBe(true)
      await 内置贴纸格(wrapper).trigger('click')
      await flushPromises()

      // 渲染用的是本地 canvas，产物是贴纸文件：这一刻既没上传也没发消息
      expect(xuanRanMock).toHaveBeenCalledTimes(1)
      expect(shangChuanMeiTiMock).not.toHaveBeenCalled()
      expect(faSongXiaoXiApiMock).not.toHaveBeenCalled()
      expect(wrapper.find('.yinyong-tiao').exists()).toBe(false)

      // 待发呈现（契约演进 1）：块不再住独立的 .dai-fa-kuai-lie 容器，而是内联进输入区文字流
      const tu = wrapper.findAll('.dai-fa-kuai-tu')
      expect(tu, '贴纸没进图文输入区的文字流').toHaveLength(1)
      expect(tu[0].classes()).toContain('dai-fa-kuai-tu--biaoqingbao')
      expect(kuaiXuLieShuRuQu(wrapper).filter((xiang) => xiang.leiXing === 'tupian')).toHaveLength(1)
    } finally {
      wrapper.unmount()
    }
  })

  it('插入序与图片同语义：先打的字排在贴纸前，DOM 序逐位等于块数组序（FP-18 不变式①）', async () => {
    const { wrapper } = await maoZai()
    try {
      await xieRuShuRuQu(wrapper, '先打的一句')
      await flushPromises()
      await daKaiBiaoQingBaoMianBan(wrapper)
      await 内置贴纸格(wrapper).trigger('click')
      await flushPromises()

      const kuai = wrapper.findAll('.dai-fa-kuai')
      // 文字段被劈成「光标前 / 光标后」两段、贴纸排中间：与图片插同一位置的形态完全一致
      expect(kuai).toHaveLength(3)
      expect(kuai[0].classes()).toContain('dai-fa-kuai--wen')
      expect(kuai[0].text()).toBe('先打的一句')
      expect(kuai[1].classes()).toContain('dai-fa-kuai--tu')
      expect(kuai[1].find('img').classes()).toContain('dai-fa-kuai-tu--biaoqingbao')
      expect(kuai[2].classes()).toContain('dai-fa-kuai--wen')
      // 契约演进 1：旧断言读的是序列组件的 .dai-fa-kuai-xu 序号 1/2/3；序号显示随该组件退役，
      // 这里改吃更强的同一条不变式——DOM 节点的 data-kuai-id 逐位等于真源块数组的下标序。
      // 真源那一侧从组件的 prop 读（页面把 use待发图文 的那一份引用原样透传），不是拿 DOM 比 DOM。
      const 真源块序 = (
        wrapper.findComponent(图文输入区).props('kuaiLieBiao') as unknown as Array<{ id: string }>
      ).map((kuai) => kuai.id)
      expect(真源块序).toHaveLength(3)
      expect(kuai.map((ge) => ge.attributes('data-kuai-id'))).toEqual(真源块序)
      // 契约演进 2：旧断言是「点前一段 ⇒ 输入区切回那句」（切段手势）；真内联下没有可切的段，
      // 文字与块恒在同一条流里同时可见 ⇒ 改判为插入后编辑器与页面投影都仍是那七个字（已打的字不丢）。
      expect(duQuShuRuQuText(wrapper)).toBe('先打的一句')
      expect(
        wrapper.findComponent(图文输入区).props('wenBen') as unknown as string,
        '页面投影丢了已打的字').toBe('先打的一句')
    } finally {
      wrapper.unmount()
    }
  })

  it('按发送才上传：上传类别取贴纸真源出口，消息带有序块数组且兼容投影是贴纸占位', async () => {
    const { wrapper, 用户仓库 } = await maoZai()
    try {
      // 上一用例写的草稿会被本页恢复（useCaoGao），先清成空态再测"纯贴纸一条"的形态
      await xieRuShuRuQu(wrapper, '')
      用户仓库.sheZhiTuPianShouQuan(true)
      await daKaiBiaoQingBaoMianBan(wrapper)
      await 内置贴纸格(wrapper).trigger('click')
      await flushPromises()
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()
      await flushPromises()

      expect(shangChuanMeiTiMock).toHaveBeenCalledTimes(1)
      const shangChuanCanShu = shangChuanMeiTiMock.mock.calls[0] as [string, unknown, string]
      expect(shangChuanCanShu[0]).toBe('h1')
      expect(shangChuanCanShu[1]).toBeInstanceOf(Blob)
      expect(shangChuanCanShu[2], '上传没按贴纸类别走').toBe(BIAO_QING_BAO_MEI_TI_LEI_BIE)

      expect(faSongXiaoXiApiMock).toHaveBeenCalledTimes(1)
      const ruCan = faSongXiaoXiApiMock.mock.calls[0][0] as {
        leiXing: string
        neiRong: string
        neiRongKuai: Array<Record<string, unknown>>
      }
      expect(ruCan.neiRongKuai).toHaveLength(1)
      expect(ruCan.neiRongKuai[0]).toMatchObject({
        lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian,
        mei_ti_id: SHANG_CHUAN_MEI_TI_ID,
        mei_ti_lei_bie: BIAO_QING_BAO_MEI_TI_LEI_BIE,
      })
      // 兼容投影与消息类型仍按贴纸口径派生（后端同源投影，需求 #5/#8 的语料侧不受影响）
      expect(ruCan.neiRong).toBe(XIAO_XI_KUAI_PEI_ZHI.biaoQingBaoZhanWei)
      expect(ruCan.leiXing).toBe('biaoQingBao')
      // 发完清待发区（不留残块）：契约演进 1——独立序列容器已退役，改判为「输入区文字流里
      // 一块不剩」，这比旧断言更强（旧断言只看那只容器在不在，容器一旦改名就形同虚设）
      expect(wrapper.findAll('[class*="dai-fa-kuai"]'), '发送后仍残留待发块').toHaveLength(0)
      expect(duQuShuRuQuText(wrapper)).toBe('')
      expect(wrapper.findComponent(图文输入区).props('wenBen') as unknown as string).toBe('')
    } finally {
      wrapper.unmount()
    }
  })

  it('未开启图片授权时点贴纸：照常只落本地待发，不外发也不弹授权门（授权门后移到发送那一刻）', async () => {
    const { wrapper, 用户仓库, 聊天仓库 } = await maoZai()
    try {
      用户仓库.sheZhiTuPianShouQuan(false)
      await daKaiBiaoQingBaoMianBan(wrapper)
      await 内置贴纸格(wrapper).trigger('click')
      await flushPromises()
      expect(wrapper.findAll('.dai-fa-kuai-tu')).toHaveLength(1)
      expect(shangChuanMeiTiMock).not.toHaveBeenCalled()
      expect(document.body.querySelector('.shouquan-zhezhao')).toBeNull()

      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()
      expect(document.body.querySelector('.shouquan-zhezhao')).not.toBeNull()
      expect(shangChuanMeiTiMock).not.toHaveBeenCalled()
      expect(聊天仓库.xiaoXiLieBiao).toHaveLength(0)
    } finally {
      wrapper.unmount()
    }
  })

  it('超上限预检与图片同一条：贴纸块计入块数上限，超限提示走翻译键且块仍留在待发', async () => {
    const { wrapper, 用户仓库, 聊天仓库 } = await maoZai()
    try {
      用户仓库.sheZhiTuPianShouQuan(true)
      await daKaiBiaoQingBaoMianBan(wrapper)
      for (let ci = 0; ci < XIAO_XI_KUAI_PEI_ZHI.zuiDaTuPianShu + 1; ci++) {
        await 内置贴纸格(wrapper).trigger('click')
        await flushPromises()
      }
      expect(wrapper.findAll('.dai-fa-kuai-tu')).toHaveLength(XIAO_XI_KUAI_PEI_ZHI.zuiDaTuPianShu + 1)
      expect(聊天仓库.cuoWuXinXi).toBe(huoQuFanYi('duoMeiTi', 'kuaiChaoXian'))
      expect(shangChuanMeiTiMock).not.toHaveBeenCalled()
    } finally {
      wrapper.unmount()
    }
  })
})

describe('FP-10a ② 链路一致性：贴纸块进的是两页共用的那条待发链路', () => {
  it('use待发图文 的贴纸块 → 两页共用的图文输入区：类别判定与修饰类都来自真源，无页面私有分支', () => {
    const shuRuNeiRong = ref('')
    const bianJiQu = use待发图文({ shuRuNeiRong })
    const jieGuo = bianJiQu.chaRuTuPian(new Blob(['b'], { type: 'image/png' }), BIAO_QING_BAO_MEI_TI_LEI_BIE)
    expect(jieGuo.chengGong).toBe(true)
    expect(bianJiQu.youTuPianKuai.value, '贴纸块没被算成图片块 ⇒ 页面发送口不会走图文混排').toBe(true)

    // 契约演进 1：这里原本 mount 的是 components/聊天/待发图文块序列.vue（FP-10c 已把该文件删除，
    // 见 FP10c真内联输入区.test.ts ①）。"两页共用一份"的不变式不因此消失，而是**反转指向**
    // components/聊天/图文输入区.vue —— 它才是 AI 页与好友页共同 import 的那一份待发呈现实现。
    const zhuJi = defineComponent({
      setup: () => () =>
        h(图文输入区, {
          kuaiLieBiao: bianJiQu.kuaiLieBiao.value,
          wenBen: shuRuNeiRong.value,
          guangBiao: bianJiQu.guangBiao.value,
          zhanWeiFu: huoQuFanYi('liaoTian', 'shuRuXiaoXi'),
          zuiDaChangDu: XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu,
        }),
    })
    const wrapper = mount(zhuJi, { attachTo: document.body })
    const tu = wrapper.findAll('.dai-fa-kuai-tu')
    expect(tu).toHaveLength(1)
    expect(tu[0].classes()).toContain('dai-fa-kuai-tu--biaoqingbao')
    wrapper.unmount()
  })

  it('内置贴纸清单仍是唯一真源且至少一条可点（生产者不是空转）', () => {
    expect(BIAO_QING_BAO_LIE_BIAO.length).toBeGreaterThan(0)
    expect(typeof xuanRanBiaoQingBao).toBe('function')
  })
})
