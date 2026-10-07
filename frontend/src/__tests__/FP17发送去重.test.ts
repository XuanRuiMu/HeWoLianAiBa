import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 聊天页面 from '@/views/聊天页面.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { faSongXiaoXi, shangChuanMeiTi } from '@/api/聊天'
import { huoQuWoDeBiaoQing } from '@/api/表情'
import { BIAO_QING_BAO_MEI_TI_LEI_BIE } from '@/utils/消息内容块'
import { duQuShuRuQuText, qianRuShuRuQu, xieRuShuRuQu } from './输入区夹具'
import type { DaiFaKuai } from '@/composables/use待发图文'
import type { 消息 } from '@/types'

/**
 * FP-17 发送去重守门（需求：网络慢时重复点发送/回车不得发出多条同样消息；语音条同根因）。
 *
 * 根因与三层防线：
 *  ① 待发图文发送 `faSongDaiFaTuWen` 的闸门（`daiFaTouDiZhong`）必须在第一个 await 之前
 *     同步置位 —— 授权弹窗可无限期挂起，旧实现把标志放在授权等待之后，窗口内重复触发
 *     会各建一条乐观气泡与一把新幂等键，服务端按不同键压不住 ⇒ 重复消息；
 *  ② 发送按钮在该待发投递在途时禁用（`keYiFaSong` 的可见「发送中」态）；
 *  ③ 文本链路保持原语义：发出即清空输入，重复触发本就不成第二条，连续快发按点击顺序派发
 *     （由 __tests__/聊天界面.test.ts 的 FP-01 组把守，本文件不改动它）。
 *
 * 语音条的结算去重在 composables/use录音.ts 内由行为用例把守（__tests__/use录音.test.ts）。
 */

const SHANG_CHUAN_MEI_TI_ID = '33333333-3333-4333-8333-333333333333'

vi.mock('@/api/聊天', async () => {
  const shiJi = await vi.importActual<typeof import('@/api/聊天')>('@/api/聊天')
  return {
    ...shiJi,
    huoQuXiaoXi: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
    faSongXiaoXi: vi.fn(),
    shangChuanMeiTi: vi.fn(),
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

// 贴纸的 canvas 渲染本体由 __tests__/多媒体聊天.test.ts 把守；本文件只验「重复触发会发几条」，
// 故渲染产物用固定 Blob 桩，避免引入第二套 canvas 夹具。
const xuanRanMock = vi.fn()
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
    id: 'x-fp17',
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

async function maoZai() {
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
  return { wrapper, 聊天仓库, 用户仓库 }
}

async function daKaiBiaoQingBaoMianBan(wrapper: Awaited<ReturnType<typeof maoZai>>['wrapper']) {
  await wrapper.find('.emoji-anniu').trigger('click')
  await flushPromises()
  await wrapper.findAll('.mianban-tab')[1].trigger('click')
  await flushPromises()
}

function 内置贴纸格(wrapper: Awaited<ReturnType<typeof maoZai>>['wrapper']) {
  return wrapper.findAll('.biaoqingbao-fenqu')[1].findAll('.biaoqingbao-xiangmu')[0]
}

async function chaRuYiZhiTieZhi(
  wrapper: Awaited<ReturnType<typeof maoZai>>['wrapper'],
  用户仓库: ReturnType<typeof 使用用户仓库>,
) {
  用户仓库.sheZhiTuPianShouQuan(true)
  await daKaiBiaoQingBaoMianBan(wrapper)
  await 内置贴纸格(wrapper).trigger('click')
  await flushPromises()
  expect(wrapper.findAll('.dai-fa-kuai-tu')).toHaveLength(1)
}

function yongHuQiPaoShu(聊天仓库: ReturnType<typeof 使用聊天仓库>): number {
  return 聊天仓库.xiaoXiLieBiao.filter((m) => m.fa_song_zhe_lei_xing === 'yonghu').length
}

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('Audio', JiaAudio as unknown as typeof Audio)
  vi.stubGlobal('ResizeObserver', JiaResizeObserver as unknown as typeof ResizeObserver)
  vi.mocked(shangChuanMeiTi).mockReset()
  vi.mocked(shangChuanMeiTi).mockResolvedValue({
    mediaId: SHANG_CHUAN_MEI_TI_ID,
    sha256: 'a'.repeat(64),
    mime: 'image/png',
    daXiao: 12,
    leiBie: BIAO_QING_BAO_MEI_TI_LEI_BIE,
    yuanShiWenJianMing: 'tie-zhi.png',
    mei_ti_url: null,
  })
  vi.mocked(faSongXiaoXi).mockReset()
  vi.mocked(faSongXiaoXi).mockResolvedValue({
    xiaoXi: jiXiaoXi({ id: 'fu-wu-duan', lei_xing: 'biaoQingBao', mei_ti_id: SHANG_CHUAN_MEI_TI_ID }),
    shiMiJi: false,
  })
  vi.mocked(huoQuWoDeBiaoQing).mockReset()
  vi.mocked(huoQuWoDeBiaoQing).mockResolvedValue({ lie_biao: [], zong_shu: 0 } as never)
  xuanRanMock.mockReset()
  xuanRanMock.mockResolvedValue(new Blob(['tie-zhi-bytes'], { type: 'image/png' }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('FP-17 待发图文发送去重', () => {
  it('授权弹窗未答期间重复点发送/回车：只上传一次、只投递一条', async () => {
    const { wrapper, 用户仓库 } = await maoZai()
    try {
      用户仓库.sheZhiTuPianShouQuan(false)
      await daKaiBiaoQingBaoMianBan(wrapper)
      await 内置贴纸格(wrapper).trigger('click')
      await flushPromises()
      expect(wrapper.findAll('.dai-fa-kuai-tu')).toHaveLength(1)

      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()
      expect(document.body.querySelector('.shouquan-zhezhao')).not.toBeNull()
      // 授权未答就是旧的重复窗口：此刻闸门必须已落下（按钮禁用），后续触发一律吞掉
      expect(wrapper.find('.fasong-anniu').attributes('disabled')).toBeDefined()
      await wrapper.find('.fasong-anniu').trigger('click')
      await wrapper.find('.shuru-kuang').trigger('keydown', { key: 'Enter' })
      await flushPromises()
      expect(shangChuanMeiTi).not.toHaveBeenCalled()
      expect(faSongXiaoXi).not.toHaveBeenCalled()

      const queRen = document.body.querySelector('[data-testid="shouquan-queren"]') as HTMLElement
      queRen.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(shangChuanMeiTi).toHaveBeenCalledTimes(1)
      expect(faSongXiaoXi).toHaveBeenCalledTimes(1)
    } finally {
      wrapper.unmount()
    }
  })

  it('投递未返回（网络慢）时重复触发：按钮禁用、只有一条气泡、只投递一条，成功后待发清空', async () => {
    const { wrapper, 聊天仓库, 用户仓库 } = await maoZai()
    try {
      await chaRuYiZhiTieZhi(wrapper, 用户仓库)
      let jieJueTouDi: (zhi: unknown) => void = () => {}
      vi.mocked(faSongXiaoXi).mockReset()
      vi.mocked(faSongXiaoXi).mockReturnValue(
        new Promise((jieJue) => {
          jieJueTouDi = jieJue
        }) as never,
      )

      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()
      expect(yongHuQiPaoShu(聊天仓库)).toBe(1)
      expect(wrapper.find('.fasong-anniu').attributes('disabled')).toBeDefined()

      await wrapper.find('.fasong-anniu').trigger('click')
      await wrapper.find('.shuru-kuang').trigger('keydown', { key: 'Enter' })
      await flushPromises()
      expect(shangChuanMeiTi).toHaveBeenCalledTimes(1)
      expect(faSongXiaoXi).toHaveBeenCalledTimes(1)
      expect(yongHuQiPaoShu(聊天仓库)).toBe(1)

      jieJueTouDi({
        xiaoXi: jiXiaoXi({ id: 'fu-wu-duan-2', lei_xing: 'biaoQingBao', mei_ti_id: SHANG_CHUAN_MEI_TI_ID }),
      })
      await flushPromises()
      expect(yongHuQiPaoShu(聊天仓库)).toBe(1)
      expect(wrapper.findAll('.dai-fa-kuai-tu')).toHaveLength(0)
    } finally {
      wrapper.unmount()
    }
  })

  it('发送闸门在函数入口拦截：绕过按钮状态直接调用也不会重复投递', async () => {
    const { wrapper, 用户仓库 } = await maoZai()
    try {
      await chaRuYiZhiTieZhi(wrapper, 用户仓库)
      let jieJueTouDi: (zhi: unknown) => void = () => {}
      vi.mocked(faSongXiaoXi).mockReset()
      vi.mocked(faSongXiaoXi).mockReturnValue(
        new Promise((jieJue) => {
          jieJueTouDi = jieJue
        }) as never,
      )
      const jieKou = (wrapper.vm.$ as unknown as { setupState: Record<string, () => Promise<void>> })
        .setupState.faSongDaiFaTuWen
      expect(typeof jieKou).toBe('function')
      const diYiCi = jieKou()
      await flushPromises()
      const diErCi = jieKou()
      await flushPromises()
      expect(faSongXiaoXi).toHaveBeenCalledTimes(1)
      void diErCi
      jieJueTouDi({
        xiaoXi: jiXiaoXi({ id: 'fu-wu-duan-4', lei_xing: 'biaoQingBao', mei_ti_id: SHANG_CHUAN_MEI_TI_ID }),
      })
      await diYiCi
      await flushPromises()
    } finally {
      wrapper.unmount()
    }
  })

  it('投递失败后闸门复位：同一条待发可以直接再点发送重试，且重试复用同一把幂等键', async () => {
    const { wrapper, 聊天仓库, 用户仓库 } = await maoZai()
    try {
      await chaRuYiZhiTieZhi(wrapper, 用户仓库)
      vi.mocked(faSongXiaoXi).mockReset()
      vi.mocked(faSongXiaoXi).mockRejectedValueOnce(new Error('网络异常'))

      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()
      expect(faSongXiaoXi).toHaveBeenCalledTimes(1)
      // 失败后待发保留、闸门复位 ⇒ 按钮回到可发状态
      expect(wrapper.findAll('.dai-fa-kuai-tu')).toHaveLength(1)
      expect(wrapper.find('.fasong-anniu').attributes('disabled')).toBeUndefined()

      vi.mocked(faSongXiaoXi).mockResolvedValue({
        xiaoXi: jiXiaoXi({ id: 'fu-wu-duan-3', lei_xing: 'biaoQingBao', mei_ti_id: SHANG_CHUAN_MEI_TI_ID }),
        shiMiJi: false,
      })
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()
      expect(faSongXiaoXi).toHaveBeenCalledTimes(2)
      expect(wrapper.findAll('.dai-fa-kuai-tu')).toHaveLength(0)
      // 构成未变的整条重发必须复用同一把键：服务端唯一约束才能压住「响应超时但其实已落库」的重放
      const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      const jian1 = vi.mocked(faSongXiaoXi).mock.calls[0][0].miDengJian
      const jian2 = vi.mocked(faSongXiaoXi).mock.calls[1][0].miDengJian
      expect(jian1).toMatch(UUID)
      expect(jian2).toBe(jian1)
    } finally {
      wrapper.unmount()
    }
  })

  it('待发构成变化后换新幂等键，不把新消息误判成旧消息的重放', async () => {
    const { wrapper, 用户仓库 } = await maoZai()
    try {
      await xieRuShuRuQu(wrapper, '嗨')
      await flushPromises()
      await chaRuYiZhiTieZhi(wrapper, 用户仓库)
      vi.mocked(faSongXiaoXi).mockReset()
      vi.mocked(faSongXiaoXi).mockRejectedValueOnce(new Error('网络异常'))
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()
      const jian1 = vi.mocked(faSongXiaoXi).mock.calls[0][0].miDengJian

      // 失败后编辑构成：在已有文字后追加（图片块不动）
      await qianRuShuRuQu(wrapper, 1, '追加的字')
      await flushPromises()
      vi.mocked(faSongXiaoXi).mockResolvedValue({
        xiaoXi: jiXiaoXi({ id: 'fu-wu-duan-b', lei_xing: 'biaoQingBao', mei_ti_id: SHANG_CHUAN_MEI_TI_ID }),
        shiMiJi: false,
      })
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()
      expect(faSongXiaoXi).toHaveBeenCalledTimes(2)
      const jian2 = vi.mocked(faSongXiaoXi).mock.calls[1][0].miDengJian
      expect(jian2).not.toBe(jian1)
    } finally {
      wrapper.unmount()
    }
  })

  it('投递期内的新编辑不被成功回调清掉：构成变了就保留待发', async () => {
    const { wrapper, 用户仓库 } = await maoZai()
    try {
      await xieRuShuRuQu(wrapper, '嗨')
      await flushPromises()
      await chaRuYiZhiTieZhi(wrapper, 用户仓库)
      let jieJueTouDi: (zhi: unknown) => void = () => {}
      vi.mocked(faSongXiaoXi).mockReset()
      vi.mocked(faSongXiaoXi).mockReturnValue(
        new Promise((jieJue) => {
          jieJueTouDi = jieJue
        }) as never,
      )
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()
      // 投递在途时继续编辑（图片块仍在，追加文字）
      await qianRuShuRuQu(wrapper, 1, '投递期加的字')
      await flushPromises()
      jieJueTouDi({
        xiaoXi: jiXiaoXi({ id: 'fu-wu-duan-c', lei_xing: 'biaoQingBao', mei_ti_id: SHANG_CHUAN_MEI_TI_ID }),
      })
      await flushPromises()
      // 发出的只是旧构成：当前编辑必须原样保留，绝不能连新内容一起清
      expect(wrapper.findAll('.dai-fa-kuai-tu')).toHaveLength(1)
      expect(duQuShuRuQuText(wrapper)).toContain('投递期加的字')
    } finally {
      wrapper.unmount()
    }
  })

  it('投递期内删光图片块后回车不翻转成第二条纯文本消息', async () => {
    const { wrapper, 用户仓库 } = await maoZai()
    try {
      await xieRuShuRuQu(wrapper, '嗨')
      await flushPromises()
      await chaRuYiZhiTieZhi(wrapper, 用户仓库)
      let jieJueTouDi: (zhi: unknown) => void = () => {}
      vi.mocked(faSongXiaoXi).mockReset()
      vi.mocked(faSongXiaoXi).mockReturnValue(
        new Promise((jieJue) => {
          jieJueTouDi = jieJue
        }) as never,
      )
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()
      // 删除图片块：当前态退化为纯文本，但原图文仍在途
      await wrapper.find('.dai-fa-kuai-shanchu').trigger('click')
      await flushPromises()
      await wrapper.find('.shuru-kuang').trigger('keydown', { key: 'Enter' })
      await flushPromises()
      expect(faSongXiaoXi).toHaveBeenCalledTimes(1)

      jieJueTouDi({
        xiaoXi: jiXiaoXi({ id: 'fu-wu-duan-d', lei_xing: 'wenben', nei_rong: '嗨[图片]' }),
      })
      await flushPromises()
      // 构成已变：文本留在输入区等待下一次显式发送
      expect(duQuShuRuQuText(wrapper)).toBe('嗨')
      vi.mocked(faSongXiaoXi).mockResolvedValue({
        xiaoXi: jiXiaoXi({ id: 'fu-wu-duan-e', lei_xing: 'wenben', nei_rong: '嗨' }),
        shiMiJi: false,
      })
      await wrapper.find('.shuru-kuang').trigger('keydown', { key: 'Enter' })
      await flushPromises()
      expect(faSongXiaoXi).toHaveBeenCalledTimes(2)
    } finally {
      wrapper.unmount()
    }
  })

  it('我的表情双击：同一载荷在途期间的第二次直发被吞掉，不同载荷仍可各自直发', async () => {
    vi.mocked(huoQuWoDeBiaoQing).mockResolvedValue({
      lie_biao: [
        {
          id: 'bq-1',
          mei_ti_id: SHANG_CHUAN_MEI_TI_ID,
          mei_ti_url: 'blob:biaoqing-yulan-1',
          duan_ming: '笑',
          pai_xu: 1,
        },
        {
          id: 'bq-2',
          mei_ti_id: '44444444-4444-4444-8444-444444444444',
          mei_ti_url: 'blob:biaoqing-yulan-2',
          duan_ming: '哭',
          pai_xu: 2,
        },
      ],
      zong_shu: 2,
    } as never)
    const { wrapper, 用户仓库 } = await maoZai()
    try {
      用户仓库.sheZhiTuPianShouQuan(true)
      await daKaiBiaoQingBaoMianBan(wrapper)
      const geLieBiao = wrapper.findAll('.biaoqingbao-xiangmu.wo-de')
      expect(geLieBiao).toHaveLength(2)
      vi.mocked(faSongXiaoXi).mockReset()
      vi.mocked(faSongXiaoXi).mockReturnValue(new Promise(() => {}) as never)
      await geLieBiao[0].trigger('click')
      await flushPromises()
      // 同一表情在途：第二次点击同一格被吞掉
      await wrapper.findAll('.biaoqingbao-xiangmu.wo-de')[0].trigger('click')
      await flushPromises()
      expect(faSongXiaoXi).toHaveBeenCalledTimes(1)
      // 换一个不同载荷的表情：照常直发，不被上一单的在途状态误伤
      await wrapper.findAll('.biaoqingbao-xiangmu.wo-de')[1].trigger('click')
      await flushPromises()
      expect(faSongXiaoXi).toHaveBeenCalledTimes(2)
    } finally {
      wrapper.unmount()
    }
  })
})

describe('FP-17 store 级静默收敛', () => {
  it('同键两颗粒子先后收到同一条服务端行：列表里只留一条', async () => {
    setActivePinia(createPinia())
    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.dangQianHuiHuaId = 'h1'
    const 块 = [
      {
        id: 'kuai-1',
        lei_xing: 'wenzi',
        nei_rong: '同一条',
        wen_jian: null,
        mei_ti_id: null,
        mei_ti_lei_bie: null,
        yu_lan_url: null,
        mi_deng_jian: '',
      },
    ] as unknown as DaiFaKuai[]
    const 固定键 = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
    vi.mocked(faSongXiaoXi).mockReset()
    vi.mocked(faSongXiaoXi).mockRejectedValueOnce(new Error('网络异常'))
    await 聊天仓库.faSongTuWenXiaoXi(块, null, 固定键)
    const 失败气泡 = 聊天仓库.xiaoXiLieBiao.find((m) => m.mi_deng_jian === 固定键)
    expect(失败气泡, '第一次失败气泡未入列').toBeDefined()

    vi.mocked(faSongXiaoXi).mockResolvedValue({
      xiaoXi: jiXiaoXi({
        id: 'srv-same',
        fa_song_zhe_id: 'u1',
        fa_song_zhe_lei_xing: 'yonghu',
        lei_xing: 'wenben',
        nei_rong: '同一条',
        mi_deng_jian: 固定键,
      }),
      shiMiJi: false,
    })
    await 聊天仓库.faSongTuWenXiaoXi(块, null, 固定键)
    expect(聊天仓库.xiaoXiLieBiao.filter((m) => m.id === 'srv-same')).toHaveLength(1)

    // 失败气泡的重试入口与待发重发同键：同一条服务端行不得再被第二颗粒子承载
    await 聊天仓库.chongShiFaSongXiaoXi(失败气泡?.ke_hu_duan_id as string)
    expect(聊天仓库.xiaoXiLieBiao.filter((m) => m.id === 'srv-same')).toHaveLength(1)
    expect(聊天仓库.xiaoXiLieBiao).toHaveLength(1)
  })
})
