import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import 聊天页面 from '@/views/聊天页面.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { huoQuFanYi } from '@/config/translations'
import {
  shiShiPinXiaoXi,
  yanZhengShengChengTiShiCi,
  gouJianYuYinFaSongNeiRong,
} from '@/utils/多模态'
import { use语音转文字 } from '@/composables/use语音转文字'
import type { 消息 } from '@/types'

const shangChuanMeiTiMock = vi.fn()
const faSongXiaoXiApiMock = vi.fn()
const shengTuApiMock = vi.fn()
const shengShiPinApiMock = vi.fn()
const duoMoTaiPeiZhiMock = vi.fn()

vi.mock('@/api/聊天', async () => {
  const shiJi = await vi.importActual<typeof import('@/api/聊天')>('@/api/聊天')
  return {
    ...shiJi,
    huoQuXiaoXi: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
    faSongXiaoXi: (...canShu: unknown[]) => faSongXiaoXiApiMock(...canShu),
    shangChuanMeiTi: (...canShu: unknown[]) => shangChuanMeiTiMock(...canShu),
    cheHuiXiaoXi: vi.fn(),
    biaoJiYiDu: vi.fn(),
    huoQuDuoMoTaiPeiZhi: (...canShu: unknown[]) => duoMoTaiPeiZhiMock(...canShu),
    qingQiuShengTu: (...canShu: unknown[]) => shengTuApiMock(...canShu),
    qingQiuShengChengShiPin: (...canShu: unknown[]) => shengShiPinApiMock(...canShu),
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

vi.stubGlobal('ResizeObserver', JiaResizeObserver)

function jiXiaoXi(buFen: Partial<消息>): 消息 {
  return {
    id: 'x-fp10',
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

describe('FP-10 多模态工具函数', () => {
  it('视频消息按扩展名识别且文本文件不受影响', () => {
    expect(shiShiPinXiaoXi(jiXiaoXi({ lei_xing: 'wenJian', mei_ti_yuan_shi_wen_jian_ming: 'lvxing.mp4' }))).toBe(true)
    expect(shiShiPinXiaoXi(jiXiaoXi({ lei_xing: 'wenJian', mei_ti_yuan_shi_wen_jian_ming: 'SHIPIN.MOV' }))).toBe(true)
    expect(shiShiPinXiaoXi(jiXiaoXi({ lei_xing: 'wenJian', mei_ti_yuan_shi_wen_jian_ming: 'wenjian.pdf' }))).toBe(false)
    expect(shiShiPinXiaoXi(jiXiaoXi({ lei_xing: 'tuPian' }))).toBe(false)
  })

  it('生成提示词校验截断且空值拒绝', () => {
    expect(yanZhengShengChengTiShiCi('夕阳海边').heFa).toBe(true)
    expect(yanZhengShengChengTiShiCi('  ').heFa).toBe(false)
    expect(yanZhengShengChengTiShiCi('a'.repeat(500)).qingXiHou.length).toBe(200)
  })

  it('语音发送内容截断500且非字符串归空', () => {
    expect(gouJianYuYinFaSongNeiRong('混合文字歌声汪汪')).toBe('混合文字歌声汪汪')
    expect(gouJianYuYinFaSongNeiRong('a'.repeat(600)).length).toBe(500)
    expect(gouJianYuYinFaSongNeiRong(null)).toBe('')
  })

  it('FP-05 YH-036 用户手动斜杠指令已删除：恒返否定', async () => {
    const { shiShengTuMingLing, shiShengShiPinMingLing, jieXiShengTuMingLing } = await import('@/utils/多模态')
    expect(shiShengTuMingLing('/生图 夕阳海边')).toBe(false)
    expect(shiShengShiPinMingLing('/视频 海边散步')).toBe(false)
    expect(jieXiShengTuMingLing('/生图 夕阳海边')).toBeNull()
    expect(jieXiShengTuMingLing('普通聊天')).toBeNull()
  })
})

describe('FP-10 语音转文字按钮免费优先独立', () => {
  it('composable 随消息转写优先且失败不抛全局错误', () => {
    const yuanMa = readFileSync(resolve(__dirname, '../composables/use语音转文字.ts'), 'utf8')
    expect(yuanMa).toContain('huoQuYiCunZhuanXie')
    expect(yuanMa).toContain('zhuanXieQingQiu')
    expect(yuanMa).not.toContain('sheZhiCuoWu(')
  })

  it('识别失败仅标记内联失败态', async () => {
    const shiLi = {
      lang: '',
      interimResults: false,
      maxAlternatives: 0,
      onresult: null as never,
      onerror: null as never,
      onend: null as never,
      start() {
        queueMicrotask(() => (this.onerror as unknown as (() => void) | null)?.())
      },
      stop() {},
    }
    const sheZhiCuoWu = vi.fn()
    const { zhuanWenZi, shiZhuanWenZiShiBai } = use语音转文字({
      huoQuYuYinDiZhi: () => 'blob:fp10',
      sheZhiCuoWu,
      shiBieQiGongChang: () => shiLi as never,
    })
    const xiaoXi = jiXiaoXi({ lei_xing: 'yuYin', mei_ti_url: 'blob:fp10' })
    vi.stubGlobal('Audio', JiaAudio as unknown as typeof Audio)
    try {
      expect(await zhuanWenZi(xiaoXi)).toBeNull()
      expect(shiZhuanWenZiShiBai(xiaoXi)).toBe(true)
      expect(sheZhiCuoWu).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('FP-10 聊天页面视频与生成一致', () => {
  const yuanAudio = globalThis.Audio
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('Audio', JiaAudio as unknown as typeof Audio)
    vi.stubGlobal('ResizeObserver', JiaResizeObserver as unknown as typeof ResizeObserver)
    shangChuanMeiTiMock.mockReset()
    faSongXiaoXiApiMock.mockReset()
    shengTuApiMock.mockReset()
    shengShiPinApiMock.mockReset()
    duoMoTaiPeiZhiMock.mockReset()
    duoMoTaiPeiZhiMock.mockResolvedValue({
      yuYinLiJieQiYong: true,
      shiPinLiJieQiYong: true,
      tuXiangShengChengQiYong: true,
      shiPinShengChengQiYong: true,
      meiRiShengChengShangXian: 10,
    })
  })

  afterEach(() => {
    vi.stubGlobal('Audio', yuanAudio)
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  async function mountDaiShiPin() {
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
    const wrapper = mount(聊天页面, {
      global: { plugins: [pinia, luYou] },
      attachTo: document.body,
    })
    await flushPromises()
    return { wrapper, 聊天仓库 }
  }

  it('视频文件渲染video标签可播放且普通文件仍为下载卡片', async () => {
    const { wrapper, 聊天仓库 } = await mountDaiShiPin()
    try {
      聊天仓库.xiaoXiLieBiao = [
        jiXiaoXi({ id: 'v1', lei_xing: 'wenJian', mei_ti_url: '/api/shipin', mei_ti_yuan_shi_wen_jian_ming: 'lvxing.mp4' }),
        jiXiaoXi({ id: 'w1', lei_xing: 'wenJian', mei_ti_url: '/api/wenjian', mei_ti_yuan_shi_wen_jian_ming: 'wenjian.pdf' }),
      ]
      await flushPromises()
      const shipin = wrapper.find('video.shipin-xianshi')
      expect(shipin.exists()).toBe(true)
      expect(shipin.attributes('src')).toBe('/api/shipin')
      expect(wrapper.find('.wenjian-xiazai').exists()).toBe(true)
    } finally {
      wrapper.unmount()
    }
  })

  it('FP-05 YH-036/YH-037 更多面板仅两项且无用户手动生成入口（AI主动发起）', async () => {
    const { wrapper } = await mountDaiShiPin()
    try {
      await flushPromises()
      await new Promise((r) => setTimeout(r, 0))
      await flushPromises()
      await wrapper.find('.gengduo-plus-anniu').trigger('click')
      await flushPromises()
      expect(wrapper.findAll('.gengduo-rukou').length).toBe(2)
      expect(wrapper.findAll('.duomotai-rukou').length).toBe(0)
    } finally {
      wrapper.unmount()
    }
  })

  it('语音发送携带本地转写文本不再丢弃', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.dangQianHuiHuaId = 'h1'
    shangChuanMeiTiMock.mockResolvedValue({
      mediaId: 'm-yu-yin',
      sha256: 'abc123',
      mime: 'audio/webm',
      daXiao: 100,
      leiBie: 'yuyin',
      yuanShiWenJianMing: 'yuyin.webm',
      mei_ti_url: '/api/yuyin',
    })
    faSongXiaoXiApiMock.mockResolvedValue({
      xiaoXi: {
        id: 'srv-yu-yin',
        hui_hua_id: 'h1',
        fa_song_zhe_id: 'u1',
        fa_song_zhe_lei_xing: 'yonghu',
        nei_rong: '混合文字歌声汪汪',
        lei_xing: 'yuYin',
        shi_jian_chuo: Date.now(),
        yi_du: true,
        ke_hu_duan_xu_hao: 1,
        mei_ti_id: 'm-yu-yin',
        mei_ti_url: '/api/yuyin',
      },
      shiMiJi: false,
    })
    const jieGuo = await 聊天仓库.faSongMeiTiXiaoXi('yuYin', new Blob(['yin'], { type: 'audio/webm' }), {
      shiChangHaoMiao: 8000,
      zhuanXieWenBen: '混合文字歌声汪汪',
    })
    expect(jieGuo?.id).toBe('srv-yu-yin')
    // FP-09b：第三位是投递幂等键（稳定 UUID），不再是前端自增的客户端序号
    expect(faSongXiaoXiApiMock).toHaveBeenCalledWith({
      huiHuaId: 'h1',
      neiRong: '混合文字歌声汪汪',
      miDengJian: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
      leiXing: 'yuYin',
      meiTiId: 'm-yu-yin',
    })
  })

  it('生成动作成功追加角色消息且失败走翻译提示', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const 聊天仓库 = 使用聊天仓库()
    聊天仓库.dangQianHuiHuaId = 'h1'
    const shengTuXiaoXi = jiXiaoXi({ id: 'sheng-tu-1', lei_xing: 'tuPian', fa_song_zhe_lei_xing: 'jiaose' })
    shengTuApiMock.mockResolvedValue(shengTuXiaoXi)
    expect(await 聊天仓库.qingQiuShengTu('夕阳海边')).toEqual(shengTuXiaoXi)
    expect(聊天仓库.xiaoXiLieBiao.at(-1)?.id).toBe('sheng-tu-1')
    shengShiPinApiMock.mockRejectedValue(new Error(huoQuFanYi('duoMeiTi', 'shiPinShengChengShiBai')))
    expect(await 聊天仓库.qingQiuShengChengShiPin('海边')).toBeNull()
    expect(聊天仓库.cuoWuXinXi).toBe(huoQuFanYi('tongYong', 'tongYongWenTiYingXiang'))
      expect(聊天仓库.cuoWuXinXi).not.toBe(huoQuFanYi('duoMeiTi', 'shiPinShengChengShiBai'))
  })

  it('FP-05 YH-036/YH-037 用户手动按钮删除：无生成翻译键残留引用', () => {
    const yuanMa = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf8')
    expect(yuanMa).not.toContain("huoQuFanYi('duoMeiTi', 'shengTu')")
    expect(yuanMa).not.toContain("huoQuFanYi('duoMeiTi', 'shengChengShiPin')")
    expect(yuanMa).not.toContain('duomotai-rukou')
    expect(yuanMa).toContain('shipin-xianshi')
  })
})
