import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { use语音转文字, type YuYinShiBieQi } from '@/composables/use语音转文字'
import { huoQuFanYi } from '@/config/translations'
import 聊天页面 from '@/views/聊天页面.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import type { 消息 } from '@/types'

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
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}))

function zaoXiaoXi(gengDuo: Partial<消息> = {}): 消息 {
  return {
    id: 'y9',
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: '',
    lei_xing: 'yuYin',
    shi_jian_chuo: Date.now(),
    yi_du: true,
    mei_ti_shi_chang_hao_miao: 3000,
    mei_ti_url: 'blob:fp09-yu-yin',
    ...gengDuo,
  }
}

function zaoShiBieQi(xuanXiang: { wenBen?: string; shiBai?: boolean } = {}) {
  const shiLi = {
    lang: '',
    interimResults: false,
    maxAlternatives: 0,
    onresult: null as YuYinShiBieQi['onresult'],
    onerror: null as YuYinShiBieQi['onerror'],
    onend: null as YuYinShiBieQi['onend'],
    qiDongCiShu: 0,
    start() {
      shiLi.qiDongCiShu += 1
      queueMicrotask(() => {
        if (xuanXiang.shiBai) {
          shiLi.onerror?.()
          return
        }
        const wenBen = xuanXiang.wenBen ?? '哎呀，回来了，回来了。'
        shiLi.onresult?.({
          results: [{ isFinal: true, 0: { transcript: wenBen } }],
        })
        shiLi.onend?.()
      })
    },
    stop() {},
  }
  return shiLi
}

class JiaYinPin {
  src = ''
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  play() {
    return Promise.resolve()
  }
  pause() {}
}

describe('FP-09 语音转文字四态', () => {
  const yuanAudio = globalThis.Audio
  beforeEach(() => {
    vi.stubGlobal('Audio', JiaYinPin)
  })
  afterEach(() => {
    vi.stubGlobal('Audio', yuanAudio)
  })

  function zaoYiLai(shiLi: YuYinShiBieQi, gengDuo: Record<string, unknown> = {}) {
    return {
      huoQuYuYinDiZhi: () => 'blob:fp09-yu-yin',
      sheZhiCuoWu: vi.fn(),
      shiBieQiGongChang: () => shiLi,
      ...gengDuo,
    }
  }

  it('初始无失败态', () => {
    const yiLai = zaoYiLai(zaoShiBieQi())
    const { shiZhuanWenZiShiBai } = use语音转文字(yiLai)
    expect(shiZhuanWenZiShiBai(zaoXiaoXi())).toBe(false)
  })

  it('识别失败置失败态且不抛全局输入框错误', async () => {
    const yiLai = zaoYiLai(zaoShiBieQi({ shiBai: true }))
    const { zhuanWenZi, shiZhuanWenZiShiBai } = use语音转文字(yiLai)
    const jieGuo = await zhuanWenZi(zaoXiaoXi())
    expect(jieGuo).toBeNull()
    expect(shiZhuanWenZiShiBai(zaoXiaoXi())).toBe(true)
    expect(yiLai.sheZhiCuoWu).not.toHaveBeenCalled()
  })

  it('失败后重试成功清除失败并展开', async () => {
    let shiBai = true
    const shiLi = zaoShiBieQi()
    const yuanStart = shiLi.start.bind(shiLi)
    shiLi.start = () => {
      shiLi.qiDongCiShu += 1
      queueMicrotask(() => {
        if (shiBai) {
          shiLi.onerror?.()
          return
        }
        shiLi.onresult?.({
          results: [{ isFinal: true, 0: { transcript: '哎呀，回来了，回来了。' } }],
        })
        shiLi.onend?.()
      })
    }
    void yuanStart
    const yiLai = zaoYiLai(shiLi)
    const { qieHuanZhuanWenZiXianShi, shiZhuanWenZiShiBai, shiZhuanWenZiZhanKai, huoQuZhuanWenZi } =
      use语音转文字(yiLai)
    const xiaoXi = zaoXiaoXi()
    await qieHuanZhuanWenZiXianShi(xiaoXi)
    expect(shiZhuanWenZiShiBai(xiaoXi)).toBe(true)
    expect(shiZhuanWenZiZhanKai(xiaoXi)).toBe(false)
    shiBai = false
    await qieHuanZhuanWenZiXianShi(xiaoXi)
    expect(shiZhuanWenZiShiBai(xiaoXi)).toBe(false)
    expect(shiZhuanWenZiZhanKai(xiaoXi)).toBe(true)
    expect(huoQuZhuanWenZi(xiaoXi)).toBe('哎呀，回来了，回来了。')
  })

  it('结果态再次切换收起且不重识别', async () => {
    const shiLi = zaoShiBieQi({ wenBen: '早点回家' })
    const yiLai = zaoYiLai(shiLi)
    const { qieHuanZhuanWenZiXianShi, shiZhuanWenZiZhanKai } = use语音转文字(yiLai)
    const xiaoXi = zaoXiaoXi()
    await qieHuanZhuanWenZiXianShi(xiaoXi)
    expect(shiZhuanWenZiZhanKai(xiaoXi)).toBe(true)
    await qieHuanZhuanWenZiXianShi(xiaoXi)
    expect(shiZhuanWenZiZhanKai(xiaoXi)).toBe(false)
    expect(shiLi.qiDongCiShu).toBe(1)
  })

  it('转写中可查询且无失败态', async () => {
    const shiLi = zaoShiBieQi()
    shiLi.start = () => {
      shiLi.qiDongCiShu += 1
    }
    const yiLai = zaoYiLai(shiLi)
    const { zhuanWenZi, shiYuYinZhuanXieZhong, shiZhuanWenZiShiBai } = use语音转文字(yiLai)
    const xiaoXi = zaoXiaoXi()
    const renWu = zhuanWenZi(xiaoXi)
    expect(shiYuYinZhuanXieZhong(xiaoXi)).toBe(true)
    expect(shiZhuanWenZiShiBai(xiaoXi)).toBe(false)
    shiLi.onend?.()
    await renWu
    expect(shiYuYinZhuanXieZhong(xiaoXi)).toBe(false)
  })
})

describe('FP-09 气泡下样式对标微信截图', () => {
  it('结果条样式：圆角6px/边距6px/字号14px/换行', () => {
    const yuanMa = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf8')
    const quJian = yuanMa.slice(yuanMa.indexOf('.yuyin-zhuanwenzi {'), yuanMa.indexOf('.yuyin-zhuanwenzi {') + 600)
    expect(quJian).toContain('margin-top: 6px')
    expect(quJian).toContain('border-radius: 6px')
    expect(quJian).toContain('font-size: 14px')
    expect(quJian).toContain('word-break: break-word')
    expect(quJian).toContain('padding: 8px 12px')
  })

  it('用户侧与角色侧分色：用户绿角色灰', () => {
    const yuanMa = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf8')
    expect(yuanMa).toContain('.yonghu-xiaoxi .yuyin-zhuanwenzi')
    expect(yuanMa).toContain('var(--xiaoxi-yonghu-beijing)')
    expect(yuanMa).toContain('var(--xiaoxi-jiaose-beijing)')
  })

  it('失败态为可选中文本：span红字无点击重试', () => {
    const yuanMa = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf8')
    expect(yuanMa).toContain('shiZhuanWenZiShiBai')
    expect(yuanMa).toContain('yuyin-zhuanwenzi-shibai')
    expect(yuanMa).toContain("huoQuFanYi('liaoTian', 'zheDie')")
    expect(yuanMa).toContain("huoQuFanYi('liaoTian', 'yuYinZhuanWenZiShiBai')")
    expect(yuanMa).toContain("huoQuFanYi('liaoTian', 'yuYinZhuanWenZiZhong')")
    expect(yuanMa).not.toContain("'语音转文字中'")
    expect(yuanMa).not.toContain('"语音转文字中"')
    expect(yuanMa).not.toContain("'收起'")
    expect(yuanMa).not.toContain('"收起"')
  })

  it('转文字链路：随消息转写优先，远端免费转写次之，本地识别兜底', () => {
    const yuanMa = readFileSync(resolve(__dirname, '../composables/use语音转文字.ts'), 'utf8')
    expect(yuanMa).toContain('huoQuYiCunZhuanXie')
    expect(yuanMa).toContain('zhuanXieQingQiu')
    expect(yuanMa).not.toContain('sheZhiCuoWu(')
  })
})

describe('FP-09 聊天页面语音转文字可用', () => {
  const yiGuaZai: Array<{ unmount: () => void }> = []
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    for (const zuJian of yiGuaZai.splice(0)) {
      zuJian.unmount()
    }
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  function chuangJianLuYou() {
    return createRouter({
      history: createWebHistory(),
      routes: [{ path: '/chat/:huiHuaId', name: 'liaoTian', component: 聊天页面 }],
    })
  }

  async function mountDaiYuYin() {
    const luYou = chuangJianLuYou()
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
    yiGuaZai.push(wrapper)
    await flushPromises()
    聊天仓库.xiaoXiLieBiao = [zaoXiaoXi()]
    await flushPromises()
    return { wrapper, 聊天仓库 }
  }

  it('语音气泡存在且转文字区初始为空', async () => {
    const { wrapper } = await mountDaiYuYin()
    expect(wrapper.find('.yuyin-qipao').exists()).toBe(true)
    expect(wrapper.find('.yuyin-zhuanwenzi').exists()).toBe(false)
    expect(wrapper.find('.yuyin-zhuanwenzi-zhuangtai').exists()).toBe(false)
  })
})
