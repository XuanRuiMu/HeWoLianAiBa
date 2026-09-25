import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 聊天页面 from '@/views/聊天页面.vue'
import QuanJuCaiDan from '@/components/全局菜单.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用通话仓库 } from '@/stores/通话'
import { 使用用户仓库 } from '@/stores/用户'
import { huoQuFanYi, fanYi } from '@/config/translations'
import { yaSuoTuPiang, YA_SUO_CHANG_BIAN_SHANG_XIAN, YA_SUO_ZHI_LIANG } from '@/utils/图片压缩'
import { xuanRanBiaoQingBao, BIAO_QING_BAO_LIE_BIAO, BIAO_QING_BAO_CHICUN } from '@/utils/表情包库'
import { BIAO_QING_TIAN_JIA_PEI_ZHI } from '@/config/表情配置'
import { XIAO_XI_KUAI_PEI_ZHI } from '@/config/消息配置'
import type { 消息 } from '@/types'

const shangChuanMeiTiMock = vi.fn()
const faSongXiaoXiApiMock = vi.fn()

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
    chuangJianHuiHua: vi.fn(),
    huoQuJunShiLieBiao: vi.fn().mockResolvedValue({ junShiLieBiao: [] }),
  }
})

vi.mock('@/api/通知', () => ({
  huoQuTongZhiLieBiao: vi.fn().mockResolvedValue({ lie_biao: [], wei_du_shu: 0 }),
  biaoJiTongZhiYiDu: vi.fn(),
  biaoJiQuanBuTongZhiYiDu: vi.fn(),
}))

const biaoQingHuoQuMock = vi.fn()
const biaoQingTianJiaMock = vi.fn()
const biaoQingShanChuMock = vi.fn()
const biaoQingPaiXuMock = vi.fn()

vi.mock('@/api/表情', () => ({
  huoQuWoDeBiaoQing: (...canShu: unknown[]) => biaoQingHuoQuMock(...canShu),
  tianJiaBiaoQing: (...canShu: unknown[]) => biaoQingTianJiaMock(...canShu),
  shanChuBiaoQing: (...canShu: unknown[]) => biaoQingShanChuMock(...canShu),
  baoCunBiaoQingPaiXu: (...canShu: unknown[]) => biaoQingPaiXuMock(...canShu),
}))

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}))

const createObjectURLMock = vi.fn(() => 'blob:yulan-mo-ni')
const revokeObjectURLMock = vi.fn()

interface JiLuCtx {
  drawImage: ReturnType<typeof vi.fn>
  fillText: ReturnType<typeof vi.fn>
  strokeText: ReturnType<typeof vi.fn>
  clearRect: ReturnType<typeof vi.fn>
}

function anzhuangCanvasZhuangZhi(xuanXiang: { blob?: Blob | null } = {}) {
  const yuanShiChuangJian = document.createElement.bind(document)
  const ziTiJiLu: string[] = []
  let dangQianZiTi = ''
  const ctx = {
    drawImage: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    clearRect: vi.fn(),
    get font(): string {
      return dangQianZiTi
    },
    set font(zhi: string) {
      dangQianZiTi = zhi
      ziTiJiLu.push(zhi)
    },
  }
  const toBlobSpy = vi.fn(
    (huiTiao: (blob: Blob | null) => void, _leiXing?: string, _zhiLiang?: number) => {
      setTimeout(
        () => huiTiao(xuanXiang.blob ?? new Blob(['ya-suo-shu-ju'], { type: 'image/jpeg' })),
        0,
      )
    },
  )
  const canvasStub = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
    toBlob: toBlobSpy,
  } as unknown as HTMLCanvasElement

  const jianShiQi = vi
    .spyOn(document, 'createElement')
    .mockImplementation(((biaoQian: string) =>
      biaoQian === 'canvas'
        ? canvasStub
        : yuanShiChuangJian(biaoQian)) as typeof document.createElement)

  return {
    ctx: ctx as unknown as JiLuCtx & { font: string },
    ziTiJiLu,
    toBlobSpy,
    canvasStub,
    huiFu: () => {
      jianShiQi.mockRestore()
    },
  }
}

function stubBitmap(kuan: number, gao: number) {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn().mockResolvedValue({
      width: kuan,
      height: gao,
      close: vi.fn(),
    }),
  )
}

function chuangJianTuPianWenJian(mime: string): File {
  return new File(['shu-ju'], 'ceshi.jpg', { type: mime })
}

const YUAN_SHI_AUDIO = globalThis.Audio

function huiFuQuanJuZhuang() {
  delete (globalThis as unknown as Record<string, unknown>).createImageBitmap
  ;(globalThis as unknown as Record<string, unknown>).Audio = YUAN_SHI_AUDIO
}

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
    huo_yue_ren_she_id: null,
    hai_wang_fen_shu: 0,
    chuang_jian_shi_jian: new Date().toISOString(),
    geng_xin_shi_jian: new Date().toISOString(),
  }

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
    {
      global: { plugins: [pinia, luYou] },
      attachTo: document.body,
    },
  )
  await flushPromises()
  return { wrapper, luYou, 聊天仓库 }
}

class JiaAudio {
  static shiLiLieBiao: JiaAudio[] = []
  src = ''
  play = vi.fn().mockResolvedValue(undefined)
  pause = vi.fn()
  addEventListener = vi.fn()

  constructor(src: string) {
    this.src = src
    JiaAudio.shiLiLieBiao.push(this)
  }
}

function jiXiaoxi(buFen: Partial<消息>): 消息 {
  return {
    id: 'x-mei-ti',
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'u1',
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: true,
    ...buFen,
  }
}

describe('FP-05 图片压缩（canvas 压缩）', () => {
  afterEach(() => {
    huiFuQuanJuZhuang()
    vi.restoreAllMocks()
  })

  it('长边超过1280时等比缩放到1280并以质量0.8导出jpeg', async () => {
    stubBitmap(2000, 1000)
    const { toBlobSpy, canvasStub, huiFu } = anzhuangCanvasZhuangZhi()
    try {
      const jieGuo = await yaSuoTuPiang(chuangJianTuPianWenJian('image/png'))
      expect(jieGuo).toBeInstanceOf(Blob)
      expect(canvasStub.width).toBe(YA_SUO_CHANG_BIAN_SHANG_XIAN)
      expect(canvasStub.height).toBe(640)
      expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', YA_SUO_ZHI_LIANG)
    } finally {
      huiFu()
    }
  })

  it('小图不放大，保持原尺寸导出', async () => {
    stubBitmap(800, 600)
    const { canvasStub, huiFu } = anzhuangCanvasZhuangZhi()
    try {
      await yaSuoTuPiang(chuangJianTuPianWenJian('image/jpeg'))
      expect(canvasStub.width).toBe(800)
      expect(canvasStub.height).toBe(600)
    } finally {
      huiFu()
    }
  })

  it('GIF 不压缩，原样返回且不触碰 canvas', async () => {
    const gif = chuangJianTuPianWenJian('image/gif')
    const { toBlobSpy, huiFu } = anzhuangCanvasZhuangZhi()
    try {
      const jieGuo = await yaSuoTuPiang(gif)
      expect(jieGuo).toBe(gif)
      expect(toBlobSpy).not.toHaveBeenCalled()
    } finally {
      huiFu()
    }
  })
})

describe('FP-05 表情包库渲染', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('内置贴纸不少于12个且字段齐全', () => {
    expect(BIAO_QING_BAO_LIE_BIAO.length).toBeGreaterThanOrEqual(12)
    for (const tieZhi of BIAO_QING_BAO_LIE_BIAO) {
      expect(tieZhi.id).toBeTruthy()
      expect(tieZhi.emoji).toBeTruthy()
      expect(tieZhi.wenZi).toBeTruthy()
    }
  })

  it('512×512透明底绘制超大emoji与底部文字标签并导出PNG', async () => {
    const { ctx, ziTiJiLu, toBlobSpy, canvasStub, huiFu } = anzhuangCanvasZhuangZhi({
      blob: new Blob(['tie-zhi'], { type: 'image/png' }),
    })
    try {
      const jieGuo = await xuanRanBiaoQingBao('😂', '笑哭')
      expect(canvasStub.width).toBe(BIAO_QING_BAO_CHICUN)
      expect(canvasStub.height).toBe(BIAO_QING_BAO_CHICUN)
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, BIAO_QING_BAO_CHICUN, BIAO_QING_BAO_CHICUN)
      expect(ziTiJiLu.some((ziTi) => ziTi.includes('280px'))).toBe(true)
      expect(ziTiJiLu.some((ziTi) => ziTi.includes('48px'))).toBe(true)
      expect(
        (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.some(([wenBen]) => wenBen === '😂'),
      ).toBe(true)
      expect(
        (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.some(([wenBen]) => wenBen === '笑哭'),
      ).toBe(true)
      expect(ctx.strokeText).toHaveBeenCalledWith('笑哭', expect.any(Number), expect.any(Number))
      expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), 'image/png')
      expect(jieGuo.type).toBe('image/png')
    } finally {
      huiFu()
    }
  })
})

describe('FP-05 store 多媒体发送动作 faSongMeiTiXiaoXi', () => {
  beforeEach(() => {
    localStorage.clear()
    URL.createObjectURL = createObjectURLMock as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectURLMock as typeof URL.revokeObjectURL
    shangChuanMeiTiMock.mockReset()
    faSongXiaoXiApiMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('乐观临时消息立即出现→上传成功替换为服务器消息并触发socket', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.dangQianHuiHuaId = 'h1'

    shangChuanMeiTiMock.mockResolvedValue({
      mediaId: 'm1',
      sha256: 'abc123',
      mime: 'image/jpeg',
      daXiao: 100,
      leiBie: 'tupian',
      yuanShiWenJianMing: 'tupian.jpg',
      mei_ti_url: '/api/media/qianming-url',
    })
    faSongXiaoXiApiMock.mockResolvedValue({
      xiaoXi: {
        id: 'srv-1',
        hui_hua_id: 'h1',
        fa_song_zhe_id: 'u1',
        fa_song_zhe_lei_xing: 'yonghu',
        nei_rong: '',
        lei_xing: 'tuPian',
        shi_jian_chuo: Date.now(),
        yi_du: true,
        ke_hu_duan_xu_hao: 1,
        mei_ti_id: 'm1',
        mei_ti_url: '/api/media/qianming-url',
      },
      shiMiJi: false,
    })

    const fakeBlob = new Blob(['tu'], { type: 'image/jpeg' })
    const weiWanCheng = 聊天仓库.faSongMeiTiXiaoXi('tuPian', fakeBlob)

    expect(聊天仓库.xiaoXiLieBiao.length).toBe(1)
    const linShi = 聊天仓库.xiaoXiLieBiao[0]
    expect(linShi.fa_song_zhong).toBe(true)
    expect(linShi.lei_xing).toBe('tuPian')
    expect(linShi.ben_di_yu_lan_url).toBe('blob:yulan-mo-ni')
    expect(linShi.ke_hu_duan_id).toBeTruthy()

    const jieGuo = await weiWanCheng
    await flushPromises()

    expect(shangChuanMeiTiMock).toHaveBeenCalledWith('h1', fakeBlob, 'tupian')
    // FP-09b：第三位是这条气泡自带的投递幂等键（稳定 UUID），序号已归服务端权威不再上报
    expect(linShi.mi_deng_jian).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    expect(faSongXiaoXiApiMock).toHaveBeenCalledWith({
      huiHuaId: 'h1',
      neiRong: '',
      miDengJian: linShi.mi_deng_jian,
      leiXing: 'tuPian',
      meiTiId: 'm1',
    })
    expect(jieGuo?.id).toBe('srv-1')
    expect(聊天仓库.xiaoXiLieBiao[0].id).toBe('srv-1')
    expect(聊天仓库.xiaoXiLieBiao[0].ke_hu_duan_id).toBe(linShi.ke_hu_duan_id)
    expect(聊天仓库.xiaoXiLieBiao[0].fa_song_zhong).toBeFalsy()
    expect(revokeObjectURLMock).toHaveBeenCalled()
  })

  it('上传失败时移除临时消息并设置错误提示', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.dangQianHuiHuaId = 'h1'

    shangChuanMeiTiMock.mockRejectedValue(new Error(huoQuFanYi('duoMeiTi', 'faSongShiBai')))

    const jieGuo = await 聊天仓库.faSongMeiTiXiaoXi(
      'yuYin',
      new Blob(['yin'], { type: 'audio/webm' }),
      {
        shiChangHaoMiao: 3000,
      },
    )

    expect(jieGuo).toBeNull()
    expect(聊天仓库.xiaoXiLieBiao.length).toBe(0)
    expect(聊天仓库.cuoWuXinXi).toBe(huoQuFanYi('tongYong', 'tongYongWenTiYingXiang'))
    expect(faSongXiaoXiApiMock).not.toHaveBeenCalled()
  })
})

describe('FP-05 四类媒体气泡渲染', () => {
  let qingLiQi: (() => void) | null = null

  beforeEach(() => {
    localStorage.clear()
    URL.createObjectURL = createObjectURLMock as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectURLMock as typeof URL.revokeObjectURL
    vi.stubGlobal('Audio', JiaAudio as unknown as typeof Audio)
    JiaAudio.shiLiLieBiao = []
  })

  afterEach(async () => {
    if (qingLiQi) {
      qingLiQi()
      qingLiQi = null
      await flushPromises()
    }
    huiFuQuanJuZhuang()
    vi.clearAllMocks()
  })

  it('tuPian 渲染 img 且 src 使用签名URL，加载前显示骨架', async () => {
    const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
    qingLiQi = () => wrapper.unmount()
    聊天仓库.xiaoXiLieBiao = [
      jiXiaoxi({ id: 't1', lei_xing: 'tuPian', mei_ti_url: '/api/media/tu-qianming' }),
    ]
    await flushPromises()

    const tu = wrapper.find('.tupian-xianshi')
    expect(tu.exists()).toBe(true)
    expect(tu.attributes('src')).toBe('/api/media/tu-qianming')
    expect(wrapper.find('.tupian-gujia').exists()).toBe(true)
  })

  it('biaoQingBao 无灰色文本气泡结构，直接显示大图', async () => {
    const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
    qingLiQi = () => wrapper.unmount()
    聊天仓库.xiaoXiLieBiao = [
      jiXiaoxi({ id: 'b1', lei_xing: 'biaoQingBao', mei_ti_url: '/api/media/bq-qianming' }),
    ]
    await flushPromises()

    const waiKe = wrapper.find('.qipao-waike.biaoqingbao-waike')
    expect(waiKe.exists()).toBe(true)
    expect(waiKe.find('.qipao-neirong').exists()).toBe(false)
    const tu = waiKe.find('.biaoqingbao-tu')
    expect(tu.exists()).toBe(true)
    expect(tu.attributes('src')).toBe('/api/media/bq-qianming')
  })

  it('yuYin 含 3 格喇叭与时长文本，点击经 Audio 播放且同时只有一个在播', async () => {
    const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
    qingLiQi = () => wrapper.unmount()
    聊天仓库.xiaoXiLieBiao = [
      jiXiaoxi({
        id: 'y1',
        lei_xing: 'yuYin',
        mei_ti_url: '/api/media/yuyin-a',
        mei_ti_shi_chang_hao_miao: 12000,
      }),
      jiXiaoxi({
        id: 'y2',
        lei_xing: 'yuYin',
        mei_ti_url: '/api/media/yuyin-b',
        mei_ti_shi_chang_hao_miao: 5000,
      }),
    ]
    await flushPromises()

    // FP-11 契约演进：未播放态从「12 条波形」改为用户裁定的 3 格喇叭（12 无成熟出处，取证 §8-2）
    const yuYinAnNiu = wrapper.findAll('.yuyin-qipao')
    expect(yuYinAnNiu.length).toBe(2)
    expect(wrapper.findAll('.laba-ge').length).toBe(6)
    expect(wrapper.find('.bo-xing-tiao').exists()).toBe(false)
    const shiChangWenBen = wrapper.findAll('.yuyin-shichang').map((j) => j.text())
    expect(shiChangWenBen).toContain('12″')
    expect(shiChangWenBen).toContain('5″')

    await yuYinAnNiu[0].trigger('click')
    await flushPromises()
    expect(JiaAudio.shiLiLieBiao.length).toBe(1)
    expect(JiaAudio.shiLiLieBiao[0].src).toBe('/api/media/yuyin-a')
    expect(JiaAudio.shiLiLieBiao[0].play).toHaveBeenCalledTimes(1)
    expect(yuYinAnNiu[0].classes()).toContain('bofangzhong')
    // 播放中：波形采样出现、喇叭退场（进度指示另由 .yuyin-jindu-tiao 承担）
    expect(wrapper.findAll('.bo-xing-tiao').length).toBeGreaterThan(0)

    // 点击第二条：第一条停止、只保留一个播放实例
    await yuYinAnNiu[1].trigger('click')
    await flushPromises()
    expect(JiaAudio.shiLiLieBiao.length).toBe(2)
    expect(JiaAudio.shiLiLieBiao[0].pause).toHaveBeenCalledTimes(1)
    expect(yuYinAnNiu[1].classes()).toContain('bofangzhong')

    // 再次点击第二条：暂停
    await yuYinAnNiu[1].trigger('click')
    await flushPromises()
    expect(JiaAudio.shiLiLieBiao[1].pause).toHaveBeenCalled()
  })

  it('wenJian 卡片含文件名、大小与下载链接', async () => {
    const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
    qingLiQi = () => wrapper.unmount()
    聊天仓库.xiaoXiLieBiao = [
      jiXiaoxi({
        id: 'w1',
        lei_xing: 'wenJian',
        mei_ti_url: '/api/media/wenjian-qianming',
        mei_ti_yuan_shi_wen_jian_ming: 'xinxi.pdf',
        ben_di_da_xiao_zi_jie: 2048 * 1024,
      }),
    ]
    await flushPromises()

    expect(wrapper.find('.wenjian-ming').text()).toBe('xinxi.pdf')
    expect(wrapper.find('.wenjian-daxiao').text()).toBe('2.0MB')
    const xiaZai = wrapper.find('.wenjian-xiazai')
    expect(xiaZai.exists()).toBe(true)
    expect(xiaZai.attributes('href')).toBe('/api/media/wenjian-qianming')
    expect(xiaZai.attributes('download')).toBe('xinxi.pdf')
  })
})

describe('FP-05 输入栏"+"面板与表情双Tab', () => {
  let qingLiQi: (() => void) | null = null

  beforeEach(() => {
    localStorage.clear()
    biaoQingHuoQuMock.mockResolvedValue({ lie_biao: [], zong_shu: 0 })
    URL.createObjectURL = createObjectURLMock as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectURLMock as typeof URL.revokeObjectURL
  })

  afterEach(() => {
    if (qingLiQi) {
      qingLiQi()
      qingLiQi = null
    }
    vi.restoreAllMocks()
  })

  it('点击+按钮展开两入口面板并可关闭（通话不做）', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    qingLiQi = () => wrapper.unmount()

    expect(wrapper.find('.gengduo-plus-anniu').exists()).toBe(true)
    expect(wrapper.find('.gengduo-mianban').isVisible()).toBe(false)

    await wrapper.find('.gengduo-plus-anniu').trigger('click')
    await flushPromises()
    expect(wrapper.find('.gengduo-mianban').isVisible()).toBe(true)

    const ruKou = wrapper.findAll('.gengduo-rukou')
    expect(ruKou.length).toBe(2)
    const ruKouWenBen = ruKou.map((r) => r.text())
    expect(ruKouWenBen).toContain(huoQuFanYi('duoMeiTi', 'xiangCe'))
    expect(ruKouWenBen).toContain(huoQuFanYi('duoMeiTi', 'wenJian'))
    expect(ruKouWenBen).not.toContain(huoQuFanYi('duoMeiTi', 'yuYinTongHua'))
    expect(ruKouWenBen).not.toContain(huoQuFanYi('duoMeiTi', 'shiPinTongHua'))
  })

  it('表情面板为双Tab：Emoji默认激活，切到表情包显示分区贴纸网格', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    qingLiQi = () => wrapper.unmount()

    await wrapper.find('.emoji-anniu').trigger('click')
    await flushPromises()

    const tab = wrapper.findAll('.mianban-tab')
    expect(tab.length).toBe(2)
    expect(tab[0].text()).toBe(huoQuFanYi('duoMeiTi', 'emojiBiaoQian'))
    expect(tab[1].text()).toBe(huoQuFanYi('duoMeiTi', 'biaoQingBaoBiaoQian'))
    expect(tab[0].classes()).toContain('huoyue')
    expect(wrapper.find('.emoji-wangge').isVisible()).toBe(true)
    expect(wrapper.find('.biaoqingbao-wangge').isVisible()).toBe(false)
    expect(wrapper.findAll('.emoji-xiangmu').length).toBe(168)

    await tab[1].trigger('click')
    await flushPromises()
    expect(tab[1].classes()).toContain('huoyue')
    expect(wrapper.find('.emoji-wangge').isVisible()).toBe(false)
    expect(wrapper.find('.biaoqingbao-wangge').isVisible()).toBe(true)

    // FP-06b：面板内「我的表情」与「内置表情」是两个可辨分区，内置网格只放内置贴纸，
    // 「从本地添加」入口只属于「我的表情」分区（整板计数 = 内置 + 唯一一个添加入口）
    const fenQu = wrapper.findAll('.biaoqingbao-fenqu')
    expect(fenQu.length).toBe(2)
    expect(fenQu[0].find('.fenqu-biaoti').text()).toBe(huoQuFanYi('duoMeiTi', 'woDeBiaoQing'))
    expect(fenQu[1].find('.fenqu-biaoti').text()).toBe(huoQuFanYi('duoMeiTi', 'neiZhiBiaoQing'))
    expect(fenQu[0].findAll('.biaoqingbao-xiangmu.tian-jia').length).toBe(1)
    expect(fenQu[0].findAll('.biaoqingbao-xiangmu.wo-de').length).toBe(0)
    expect(fenQu[1].findAll('.biaoqingbao-xiangmu.tian-jia').length).toBe(0)
    const tieZhi = fenQu[1].findAll('.biaoqingbao-xiangmu')
    expect(tieZhi.length).toBe(BIAO_QING_BAO_LIE_BIAO.length)
    expect(tieZhi.length).toBeGreaterThanOrEqual(12)
    expect(wrapper.findAll('.biaoqingbao-xiangmu').length).toBe(BIAO_QING_BAO_LIE_BIAO.length + 1)
  })
})

const biaoQingXiangJia = (id: string) => ({
  id,
  mei_ti_id: `mt-${id}`,
  sha256: id.padEnd(64, '0').slice(0, 64),
  mime: 'image/png',
  duan_ming: `短名${id}`,
  pai_xu: 0,
  chuang_jian_shi_jian: '2026-09-20T00:00:00.000Z',
  mei_ti_url: `/api/媒体/${id}?e=1&s=x`,
})

describe('FP-06b 表情面板「我的表情」分区', () => {
  let qingLiQi: (() => void) | null = null

  beforeEach(() => {
    localStorage.clear()
    URL.createObjectURL = createObjectURLMock as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectURLMock as typeof URL.createObjectURL
    biaoQingHuoQuMock.mockReset()
    biaoQingTianJiaMock.mockReset()
    biaoQingShanChuMock.mockReset()
    biaoQingPaiXuMock.mockReset()
    biaoQingHuoQuMock.mockResolvedValue({
      lie_biao: [biaoQingXiangJia('x1'), biaoQingXiangJia('x2')],
      zong_shu: 2,
    })
    // FP-20：api/表情.tianJiaBiaoQing 的返回形态改为 { xiang, yiCunZai }（yi_cun_zai 是后端唯一判定）
    biaoQingTianJiaMock.mockResolvedValue({ xiang: biaoQingXiangJia('x3'), yiCunZai: false })
    biaoQingShanChuMock.mockResolvedValue(undefined)
    biaoQingPaiXuMock.mockResolvedValue({
      lie_biao: [biaoQingXiangJia('x2'), biaoQingXiangJia('x1')],
      zong_shu: 2,
    })
    faSongXiaoXiApiMock.mockResolvedValue({
      xiaoXi: {
        id: 'srv-biaoqing',
        hui_hua_id: 'h1',
        fa_song_zhe_id: 'u1',
        fa_song_zhe_lei_xing: 'yonghu',
        nei_rong: '',
        lei_xing: 'biaoQingBao',
        shi_jian_chuo: Date.now(),
        yi_du: false,
        ke_hu_duan_xu_hao: 9,
        mei_ti_id: 'mt-x1',
        mei_ti_url: '/api/媒体/qianming',
      },
      shiMiJi: false,
    })
    shangChuanMeiTiMock.mockResolvedValue({ mediaId: 'mt-nei-zhi', sha256: 'e'.repeat(64) })
  })

  afterEach(() => {
    qingLiQi?.()
    qingLiQi = null
    vi.restoreAllMocks()
  })

  async function daKaiBiaoQingBaoMianBan() {
    const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
    qingLiQi = () => wrapper.unmount()
    const 用户仓库 = 使用用户仓库()
    用户仓库.sheZhiTuPianShouQuan(true)
    聊天仓库.dangQianHuiHuaId = 'h1'
    await wrapper.find('.emoji-anniu').trigger('click')
    await flushPromises()
    await wrapper.findAll('.mianban-tab')[1].trigger('click')
    await flushPromises()
    return { wrapper, 聊天仓库, 用户仓库 }
  }

  it('打开面板即按当前账号拉取，我的表情与内置表情两个分区并列可辨', async () => {
    const { wrapper } = await daKaiBiaoQingBaoMianBan()
    expect(biaoQingHuoQuMock).toHaveBeenCalled()

    const fenQu = wrapper.findAll('.biaoqingbao-fenqu')
    expect(fenQu.length).toBe(2)
    expect(fenQu[0].findAll('.biaoqingbao-xiangmu.wo-de').length).toBe(2)
    expect(fenQu[0].find('.biaoqingbao-xiangmu.wo-de img').attributes('src')).toBe(
      '/api/媒体/x1?e=1&s=x',
    )
    expect(fenQu[0].findAll('.biaoqingbao-xiangmu.tian-jia').length).toBe(1)
    expect(fenQu[1].findAll('.biaoqingbao-xiangmu').length).toBe(BIAO_QING_BAO_LIE_BIAO.length)
    expect(fenQu[0].find('.fenqu-biaoti').text()).toBe(huoQuFanYi('duoMeiTi', 'woDeBiaoQing'))
    expect(fenQu[1].find('.fenqu-biaoti').text()).toBe(huoQuFanYi('duoMeiTi', 'neiZhiBiaoQing'))
  })

  it('管理模式提供删除与前移/后移，提交的是本人全部表情的完整顺序', async () => {
    const { wrapper } = await daKaiBiaoQingBaoMianBan()
    const woDe = wrapper.findAll('.biaoqingbao-fenqu')[0]
    await woDe.find('.fenqu-guanli').trigger('click')
    await flushPromises()

    expect(woDe.findAll('.ge-caoZuo').length).toBe(6)
    expect(woDe.findAll('.qian-yi')[0].attributes('disabled')).toBeDefined()
    expect(woDe.findAll('.hou-yi')[1].attributes('disabled')).toBeDefined()

    await woDe.findAll('.hou-yi')[0].trigger('click')
    await flushPromises()
    expect(biaoQingPaiXuMock).toHaveBeenCalledWith(['x2', 'x1'])

    await woDe.findAll('.shan-chu')[0].trigger('click')
    await flushPromises()
    expect(biaoQingShanChuMock).toHaveBeenCalledWith('x2')
    expect(woDe.findAll('.biaoqingbao-xiangmu.wo-de').length).toBe(1)
  })

  it('FP-06 管理态角标成组挂在 .ge-caoZuo-zu 里，网格按管理模式换档列宽', async () => {
    const { wrapper } = await daKaiBiaoQingBaoMianBan()
    const woDe = wrapper.findAll('.biaoqingbao-fenqu')[0]
    const wangGe = woDe.find('.biaoqingbao-wangge')
    expect(wangGe.classes()).not.toContain('guanli')
    expect(woDe.findAll('.ge-caoZuo-zu').length).toBe(0)

    await woDe.find('.fenqu-guanli').trigger('click')
    await flushPromises()

    expect(wangGe.classes()).toContain('guanli')
    const zu = woDe.findAll('.ge-caoZuo-zu')
    expect(zu.length).toBe(2)
    for (const 组 of zu) expect(组.findAll('.ge-caoZuo').length).toBe(3)
    // 角标组与表情格是格子（.biaoqingbao-ge）的两个兄弟，格子本身仍是发送入口
    const ge0 = woDe.findAll('.biaoqingbao-ge')[0]
    expect(ge0.findAll('.biaoqingbao-xiangmu.wo-de').length).toBe(1)
    expect(ge0.find('.ge-caoZuo-zu').exists()).toBe(true)

    await woDe.find('.fenqu-guanli').trigger('click')
    await flushPromises()
    expect(wangGe.classes()).not.toContain('guanli')
    expect(woDe.findAll('.ge-caoZuo-zu').length).toBe(0)
  })

  it('排序保存失败：面板恢复服务端真序并向用户显示失败提示', async () => {
    biaoQingPaiXuMock.mockRejectedValueOnce({ response: { data: {} } })
    const { wrapper, 聊天仓库 } = await daKaiBiaoQingBaoMianBan()
    const woDe = wrapper.findAll('.biaoqingbao-fenqu')[0]
    await woDe.find('.fenqu-guanli').trigger('click')
    await flushPromises()
    await woDe.findAll('.hou-yi')[0].trigger('click')
    await flushPromises()

    expect(聊天仓库.cuoWuXinXi).toBe(huoQuFanYi('duoMeiTi', 'biaoQingPaiXuShiBai'))
    expect(woDe.findAll('.biaoqingbao-xiangmu.wo-de img')[0].attributes('src')).toBe(
      '/api/媒体/x1?e=1&s=x',
    )
  })

  it('只有一条表情时不出现管理模式入口', async () => {
    biaoQingHuoQuMock.mockResolvedValue({ lie_biao: [biaoQingXiangJia('x1')], zong_shu: 1 })
    const { wrapper } = await daKaiBiaoQingBaoMianBan()
    const woDe = wrapper.findAll('.biaoqingbao-fenqu')[0]
    expect(woDe.findAll('.biaoqingbao-xiangmu.wo-de').length).toBe(1)
    expect(woDe.find('.fenqu-guanli').exists()).toBe(false)
  })

  it('点我的表情：复用已签名媒体直接发送，零二次上传且零写 用户表情 表', async () => {
    const { wrapper, 聊天仓库 } = await daKaiBiaoQingBaoMianBan()
    await wrapper
      .findAll('.biaoqingbao-fenqu')[0]
      .find('.biaoqingbao-xiangmu.wo-de')
      .trigger('click')
    await flushPromises()

    expect(biaoQingTianJiaMock).not.toHaveBeenCalled()
    expect(shangChuanMeiTiMock).not.toHaveBeenCalled()
    expect(faSongXiaoXiApiMock).toHaveBeenCalledWith({
      huiHuaId: 'h1',
      neiRong: '',
      miDengJian: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
      leiXing: 'biaoQingBao',
      meiTiId: 'mt-x1',
    })
    const 末条 = 聊天仓库.xiaoXiLieBiao[聊天仓库.xiaoXiLieBiao.length - 1]
    expect(末条.lei_xing).toBe('biaoQingBao')
    expect(末条.mei_ti_url).toBe('/api/媒体/qianming')
  })

  /**
   * 【FP-10a 改判】旧用例钉的是"点内置贴纸即上传即发"（贴纸不经待发区、直发一条媒体消息）。
   * 需求 #6 的裁决是贴纸也进待发序列（照 QQ 输入框口径），故点贴纸这一刻只落本地待发块，
   * 上传与发送后移到「发送」那一刻 —— 与粘贴/相册的图片同一条链路。
   * 「不写 用户表情 表」这条旧契约原样保留（贴纸不是收藏动作）。
   */
  it('点内置贴纸：先进待发区（这一刻零上传零发送），按发送才按 biaoqingshu 类别上传，且不写 用户表情 表', async () => {
    const { toBlobSpy, huiFu } = anzhuangCanvasZhuangZhi()
    try {
      const { wrapper } = await daKaiBiaoQingBaoMianBan()
      await wrapper
        .findAll('.biaoqingbao-fenqu')[1]
        .findAll('.biaoqingbao-xiangmu')[0]
        .trigger('click')
      await flushPromises()
      expect(toBlobSpy).toHaveBeenCalled()
      expect(biaoQingTianJiaMock).not.toHaveBeenCalled()
      expect(shangChuanMeiTiMock).not.toHaveBeenCalled()
      expect(faSongXiaoXiApiMock).not.toHaveBeenCalled()
      // 待发区里那一格按贴纸档画（FP-24a 的修饰类自此有了真实生产者）
      expect(wrapper.findAll('.dai-fa-kuai-tu--biaoqingbao')).toHaveLength(1)

      // 待发路径的提交侧按 UUID 校验块级媒体 ID（`keTiJiaoKuai`），故本用例把上传回执换成合法
      // UUID —— describe 默认桩的 'mt-nei-zhi' 是媒体直发那套历史形态，不该被当作块 ID。
      const TIE_ZHI_MEI_TI_ID = '9c9c9c9c-9c9c-4c9c-8c9c-9c9c9c9c9c9c'
      shangChuanMeiTiMock.mockResolvedValueOnce({
        mediaId: TIE_ZHI_MEI_TI_ID,
        sha256: 'f'.repeat(64),
      })
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()
      await flushPromises()
      expect(shangChuanMeiTiMock).toHaveBeenCalledWith('h1', expect.any(Blob), 'biaoqingshu')
      expect(faSongXiaoXiApiMock).toHaveBeenCalledWith({
        huiHuaId: 'h1',
        neiRong: XIAO_XI_KUAI_PEI_ZHI.biaoQingBaoZhanWei,
        miDengJian: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
        leiXing: 'biaoQingBao',
        meiTiId: TIE_ZHI_MEI_TI_ID,
        neiRongKuai: [
          {
            lei_xing: 'tupian',
            mei_ti_id: TIE_ZHI_MEI_TI_ID,
            mei_ti_lei_bie: 'biaoqingshu',
          },
        ],
      })
    } finally {
      huiFu()
    }
  })

  it('从本地添加：白名单文件走添加接口，非白名单只提示且零请求', async () => {
    const { wrapper, 聊天仓库 } = await daKaiBiaoQingBaoMianBan()
    const biaoQingShuRu = wrapper.findAll('.yincang-wenjian-shuru')[2]
    expect(biaoQingShuRu.attributes('accept')).toBe(BIAO_QING_TIAN_JIA_PEI_ZHI.wenJianJieShou)

    Object.defineProperty(biaoQingShuRu.element, 'files', {
      value: [new File(['png-bytes'], '我的狗头.png', { type: 'image/png' })],
      configurable: true,
    })
    await biaoQingShuRu.trigger('change')
    await flushPromises()
    expect(biaoQingTianJiaMock).toHaveBeenCalledTimes(1)
    expect((biaoQingTianJiaMock.mock.calls[0][0] as File).name).toBe('我的狗头.png')
    expect(聊天仓库.cuoWuXinXi).toBeFalsy()

    biaoQingTianJiaMock.mockClear()
    Object.defineProperty(biaoQingShuRu.element, 'files', {
      value: [new File(['bmp'], 'tu.bmp', { type: 'image/bmp' })],
      configurable: true,
    })
    await biaoQingShuRu.trigger('change')
    await flushPromises()
    expect(biaoQingTianJiaMock).not.toHaveBeenCalled()
    expect(聊天仓库.cuoWuXinXi).toBe(huoQuFanYi('duoMeiTi', 'biaoQingMIMEBuZhiChi'))
  })

  it('未开启图片授权时添加表情：一律不外发并弹既有授权窗', async () => {
    const { wrapper, 用户仓库 } = await daKaiBiaoQingBaoMianBan()
    用户仓库.sheZhiTuPianShouQuan(false)
    const biaoQingShuRu = wrapper.findAll('.yincang-wenjian-shuru')[2]
    Object.defineProperty(biaoQingShuRu.element, 'files', {
      value: [new File(['png-bytes'], 'a.png', { type: 'image/png' })],
      configurable: true,
    })
    await biaoQingShuRu.trigger('change')
    await flushPromises()
    expect(biaoQingTianJiaMock).not.toHaveBeenCalled()
    // 授权弹窗 Teleport 到 body，不在 wrapper 内
    expect(document.body.querySelector('.shouquan-zhezhao')).not.toBeNull()
  })
})

describe('FP-05 翻译键存在性', () => {
  it('duoMeiTi 全部新键存在于 translations.ts', () => {
    const qiWangJian = [
      'gengDuo',
      'xiangCe',
      'wenJian',
      'yuYinTongHua',
      'shiPinTongHua',
      'emojiBiaoQian',
      'biaoQingBaoBiaoQian',
      'anZhuShuoHua',
      'songKaiFaSong',
      'shangHuaQuXiao',
      'shuoHuaTaiDuan',
      'luYinShiBai',
      'luYinZhong',
      'shangChuanZhong',
      'faSongShiBai',
      'yaSuoShiBai',
      'biaoQingBaoXuanRanShiBai',
      'tuPianYuLan',
      'guanBiYuLan',
      'xiaZaiWenJian',
      'boFangYuYin',
      'zanTingYuYin',
    ] as const

    for (const jian of qiWangJian) {
      expect((fanYi.duoMeiTi as Record<string, string>)[jian]).toBeTruthy()
    }
  })
})
