import { ref } from 'vue'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { use长按菜单 } from '@/composables/use长按菜单'
import { use语音转文字, type YuYinShiBieQi } from '@/composables/use语音转文字'
import { LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI } from '@/config/消息配置'
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
    id: 'y1',
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'u1',
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '',
    lei_xing: 'yuYin',
    shi_jian_chuo: Date.now(),
    yi_du: true,
    mei_ti_shi_chang_hao_miao: 7000,
    mei_ti_url: 'blob:ce-shi-yu-yin',
    ...gengDuo,
  }
}

function zaoYiLai(gengDuo: Record<string, unknown> = {}) {
  return {
    dangQianShiJian: ref(Date.now()),
    cheHuiXiaoXi: vi.fn().mockResolvedValue(undefined),
    qieHuanYuYinZhuanWenZi: vi.fn().mockResolvedValue(undefined),
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
        const wenBen = xuanXiang.wenBen ?? '回来吃饭'
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

describe('FP-07 语音条右键菜单单源两项', () => {
  it('语音菜单配置仅含语音转文字与引用两项', () => {
    expect([...LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yuYinCaiDanXiang]).toEqual([
      'yuYinZhuanWenZi',
      'yinYong',
    ])
  })

  it('菜单项全部来自翻译文件且无多选收藏提醒删除', () => {
    const xiangMu = [...LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yuYinCaiDanXiang]
    expect(xiangMu).toHaveLength(2)
    for (const xiang of xiangMu) {
      expect(typeof huoQuFanYi('liaoTian', xiang)).toBe('string')
    }
    expect(huoQuFanYi('liaoTian', 'yuYinZhuanWenZi')).toBeTruthy()
    expect(huoQuFanYi('liaoTian', 'yinYong')).toBeTruthy()
    const yuanMa = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf8')
    expect(yuanMa).not.toContain("'语音转文字'")
    expect(yuanMa).not.toContain('"语音转文字"')
    expect(yuanMa).not.toContain('多选')
    expect(yuanMa).not.toContain('收藏')
  })

  it('转文字链路：随消息转写优先，远端免费转写次之，本地识别兜底', () => {
    const yuanMa = readFileSync(resolve(__dirname, '../composables/use语音转文字.ts'), 'utf8')
    expect(yuanMa).toContain('huoQuYiCunZhuanXie')
    expect(yuanMa).toContain('zhuanXieQingQiu')
    expect(yuanMa).not.toContain('sheZhiCuoWu(')
  })

  it('聊天页面语音菜单经单源渲染两项', () => {
    const yuanMa = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf8')
    expect(yuanMa).toContain('huoQuYuYinCaiDanXiang')
    expect(yuanMa).toContain('zhiXingYuYinCaiDanXiang')
  })
})

describe('FP-07 use长按菜单语音分支', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('语音消息右键打开语音菜单并记录坐标', () => {
    const yiLai = zaoYiLai()
    const { yuYinCaiDanZhanKai, yuYinCaiDanYangShi, daKaiYuYinCaiDan } = use长按菜单(yiLai)
    daKaiYuYinCaiDan(zaoXiaoXi(), { clientY: 120, clientX: 88 } as MouseEvent)
    expect(yuYinCaiDanZhanKai.value).toBe(true)
    expect(yuYinCaiDanYangShi.value).toEqual({ top: '120px', left: '88px' })
  })

  it('角色语音与超时语音同样可打开语音菜单', () => {
    const yiLai = zaoYiLai()
    const { yuYinCaiDanZhanKai, daKaiYuYinCaiDan, guanBiYuYinCaiDan } = use长按菜单(yiLai)
    daKaiYuYinCaiDan(zaoXiaoXi({ fa_song_zhe_lei_xing: 'jiaose' }), {} as MouseEvent)
    expect(yuYinCaiDanZhanKai.value).toBe(true)
    guanBiYuYinCaiDan()
    daKaiYuYinCaiDan(zaoXiaoXi({ shi_jian_chuo: Date.now() - 3600000 }), {} as MouseEvent)
    expect(yuYinCaiDanZhanKai.value).toBe(true)
  })

  it('已撤回语音与文本消息不打开语音菜单', () => {
    const yiLai = zaoYiLai()
    const { yuYinCaiDanZhanKai, daKaiYuYinCaiDan } = use长按菜单(yiLai)
    daKaiYuYinCaiDan(zaoXiaoXi({ yi_che_hui: true }), {} as MouseEvent)
    daKaiYuYinCaiDan(zaoXiaoXi({ lei_xing: 'wenben', nei_rong: '你好' }), {} as MouseEvent)
    expect(yuYinCaiDanZhanKai.value).toBe(false)
  })

  it('语音消息不走撤回菜单：daKaiCaiDan直接忽略', () => {
    const yiLai = zaoYiLai()
    const { cheHuiCaiDanZhanKai, daKaiCaiDan } = use长按菜单(yiLai)
    daKaiCaiDan(zaoXiaoXi(), {} as MouseEvent)
    expect(cheHuiCaiDanZhanKai.value).toBe(false)
  })

  it('文本消息仍走撤回菜单不受影响', () => {
    const yiLai = zaoYiLai()
    const { cheHuiCaiDanZhanKai, daKaiCaiDan } = use长按菜单(yiLai)
    daKaiCaiDan(zaoXiaoXi({ lei_xing: 'wenben', nei_rong: '你好' }), {} as MouseEvent)
    expect(cheHuiCaiDanZhanKai.value).toBe(true)
  })

  it('语音长按500ms打开菜单，提前松手取消', async () => {
    const yiLai = zaoYiLai()
    const { yuYinCaiDanZhanKai, chuMoKaiShiYuYin, chuMoJieShuYuYin } = use长按菜单(yiLai)
    chuMoKaiShiYuYin(zaoXiaoXi())
    chuMoJieShuYuYin()
    await vi.advanceTimersByTimeAsync(600)
    expect(yuYinCaiDanZhanKai.value).toBe(false)
    chuMoKaiShiYuYin(zaoXiaoXi())
    await vi.advanceTimersByTimeAsync(500)
    expect(yuYinCaiDanZhanKai.value).toBe(true)
  })

  it('引用项写入引用链路并关闭菜单', async () => {
    const yiLai = zaoYiLai()
    const {
      yuYinCaiDanZhanKai,
      daKaiYuYinCaiDan,
      zhiXingYuYinCaiDanXiang,
      yinYongXiaoXi,
      huoQuYinYongZhaiYao,
    } = use长按菜单(yiLai)
    daKaiYuYinCaiDan(zaoXiaoXi(), {} as MouseEvent)
    await zhiXingYuYinCaiDanXiang('yinYong')
    expect(yuYinCaiDanZhanKai.value).toBe(false)
    expect(yinYongXiaoXi.value?.id).toBe('y1')
    expect(huoQuYinYongZhaiYao(yinYongXiaoXi.value!)).toBe(
      huoQuFanYi('liaoTian', 'yinYongYuYinZhanWei'),
    )
  })

  it('转文字项走本地链路并关闭菜单', async () => {
    const yiLai = zaoYiLai()
    const { yuYinCaiDanZhanKai, daKaiYuYinCaiDan, zhiXingYuYinCaiDanXiang } =
      use长按菜单(yiLai)
    daKaiYuYinCaiDan(zaoXiaoXi(), {} as MouseEvent)
    await zhiXingYuYinCaiDanXiang('yuYinZhuanWenZi')
    expect(yuYinCaiDanZhanKai.value).toBe(false)
    expect(yiLai.qieHuanYuYinZhuanWenZi).toHaveBeenCalledTimes(1)
  })

  it('引用摘要对文本截断且可取消', () => {
    const yiLai = zaoYiLai()
    const { yinYongXiaoXi, sheZhiYinYong, quXiaoYinYong, huoQuYinYongZhaiYao } =
      use长按菜单(yiLai)
    const changWen = zaoXiaoXi({ lei_xing: 'wenben', nei_rong: '一'.repeat(60) })
    sheZhiYinYong(changWen)
    expect(yinYongXiaoXi.value?.id).toBe('y1')
    const zhaiYao = huoQuYinYongZhaiYao(changWen)
    expect(zhaiYao.length).toBeLessThanOrEqual(
      LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yinYongZhaiYaoZuiDaZiFu + 3,
    )
    quXiaoYinYong()
    expect(yinYongXiaoXi.value).toBeNull()
  })

  it('菜单项与配置单源一致', () => {
    const yiLai = zaoYiLai()
    const { huoQuYuYinCaiDanXiang } = use长按菜单(yiLai)
    expect(huoQuYuYinCaiDanXiang()).toEqual([
      ...LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yuYinCaiDanXiang,
    ])
  })
})

describe('FP-07 use语音转文字免费本地', () => {
  const yuanAudio = globalThis.Audio
  beforeEach(() => {
    vi.stubGlobal('Audio', JiaYinPin)
  })
  afterEach(() => {
    vi.stubGlobal('Audio', yuanAudio)
  })

  function zaoZhuanWenZiYiLai(
    shiLi: YuYinShiBieQi,
    gengDuo: Record<string, unknown> = {},
  ) {
    return {
      huoQuYuYinDiZhi: () => 'blob:ce-shi-yu-yin',
      sheZhiCuoWu: vi.fn(),
      shiBieQiGongChang: () => shiLi,
      ...gengDuo,
    }
  }

  it('转写成功缓存文本且二次调用不再启动识别', async () => {
    const shiLi = zaoShiBieQi({ wenBen: '回来吃饭' })
    const yiLai = zaoZhuanWenZiYiLai(shiLi)
    const { zhuanWenZi, huoQuZhuanWenZi } = use语音转文字(yiLai)
    const diYiCi = await zhuanWenZi(zaoXiaoXi())
    expect(diYiCi).toBe('回来吃饭')
    expect(huoQuZhuanWenZi(zaoXiaoXi())).toBe('回来吃饭')
    const diErCi = await zhuanWenZi(zaoXiaoXi())
    expect(diErCi).toBe('回来吃饭')
    expect(shiLi.qiDongCiShu).toBe(1)
    expect(yiLai.sheZhiCuoWu).not.toHaveBeenCalled()
  })

  it('无识别能力时仅标记内联失败态，不再抛全局输入框错误', async () => {
    const yiLai = {
      huoQuYuYinDiZhi: () => 'blob:ce-shi-yu-yin',
      sheZhiCuoWu: vi.fn(),
      shiBieQiGongChang: () => null,
    }
    const { zhuanWenZi, shiZhuanWenZiShiBai } = use语音转文字(yiLai)
    const xiaoXi = zaoXiaoXi()
    const jieGuo = await zhuanWenZi(xiaoXi)
    expect(jieGuo).toBeNull()
    expect(shiZhuanWenZiShiBai(xiaoXi)).toBe(true)
    expect(yiLai.sheZhiCuoWu).not.toHaveBeenCalled()
  })

  it('识别失败仅标记内联失败态，不再抛全局输入框错误', async () => {
    const shiLi = zaoShiBieQi({ shiBai: true })
    const yiLai = zaoZhuanWenZiYiLai(shiLi)
    const { zhuanWenZi, huoQuZhuanWenZi, shiZhuanWenZiShiBai } = use语音转文字(yiLai)
    const xiaoXi = zaoXiaoXi()
    const jieGuo = await zhuanWenZi(xiaoXi)
    expect(jieGuo).toBeNull()
    expect(huoQuZhuanWenZi(xiaoXi)).toBeUndefined()
    expect(shiZhuanWenZiShiBai(xiaoXi)).toBe(true)
    expect(yiLai.sheZhiCuoWu).not.toHaveBeenCalled()
  })

  it('转写中状态可查询且结束后清除', async () => {
    const shiLi = zaoShiBieQi()
    shiLi.start = () => {
      shiLi.qiDongCiShu += 1
    }
    const yiLai = zaoZhuanWenZiYiLai(shiLi)
    const { zhuanWenZi, shiYuYinZhuanXieZhong } = use语音转文字(yiLai)
    const xiaoXi = zaoXiaoXi()
    const renWu = zhuanWenZi(xiaoXi)
    expect(shiYuYinZhuanXieZhong(xiaoXi)).toBe(true)
    shiLi.onend?.()
    await renWu
    expect(shiYuYinZhuanXieZhong(xiaoXi)).toBe(false)
  })

  it('切换显示：成功后展开，再次点击收起', async () => {
    const shiLi = zaoShiBieQi({ wenBen: '早点回家' })
    const yiLai = zaoZhuanWenZiYiLai(shiLi)
    const { qieHuanZhuanWenZiXianShi, shiZhuanWenZiZhanKai } = use语音转文字(yiLai)
    const xiaoXi = zaoXiaoXi()
    await qieHuanZhuanWenZiXianShi(xiaoXi)
    expect(shiZhuanWenZiZhanKai(xiaoXi)).toBe(true)
    await qieHuanZhuanWenZiXianShi(xiaoXi)
    expect(shiZhuanWenZiZhanKai(xiaoXi)).toBe(false)
    expect(shiLi.qiDongCiShu).toBe(1)
  })
})

describe('FP-07 聊天页面语音菜单两项可用', () => {
  const yiGuaZai: Array<{ unmount: () => void }> = []
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    for (const zuJian of yiGuaZai.splice(0)) {
      zuJian.unmount()
    }
    document.body.innerHTML = ''
    vi.useRealTimers()
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

  function chaXunCaiDanAnNiu(): HTMLElement[] {
    return Array.from(document.body.querySelectorAll('.chehui-caidan .chehui-xiangmu'))
  }

  it('语音条右键菜单仅两项：语音转文字与引用', async () => {
    const { wrapper } = await mountDaiYuYin()
    const xiangMu = wrapper.find('.xiaoxi-xiangmu')
    expect(xiangMu.exists()).toBe(true)
    await xiangMu.trigger('contextmenu', { clientX: 88, clientY: 120 })
    await flushPromises()
    const anNiu = chaXunCaiDanAnNiu()
    expect(anNiu).toHaveLength(2)
    expect(anNiu[0].textContent).toBe(huoQuFanYi('liaoTian', 'yuYinZhuanWenZi'))
    expect(anNiu[1].textContent).toBe(huoQuFanYi('liaoTian', 'yinYong'))
  })

  it('语音条不弹撤回菜单', async () => {
    const { wrapper } = await mountDaiYuYin()
    await wrapper.find('.xiaoxi-xiangmu').trigger('contextmenu', { clientX: 88, clientY: 120 })
    await flushPromises()
    const wenBen = chaXunCaiDanAnNiu().map((b) => b.textContent)
    expect(wenBen).toHaveLength(2)
    expect(wenBen).not.toContain(huoQuFanYi('liaoTian', 'cheHui'))
  })

  it('引用可用：点击后输入区出现引用预览且可取消', async () => {
    const { wrapper } = await mountDaiYuYin()
    await wrapper.find('.xiaoxi-xiangmu').trigger('contextmenu', { clientX: 88, clientY: 120 })
    await flushPromises()
    chaXunCaiDanAnNiu()[1].click()
    await flushPromises()
    const yuLan = wrapper.find('.yinyong-yulan')
    expect(yuLan.exists()).toBe(true)
    expect(yuLan.text()).toContain(huoQuFanYi('liaoTian', 'yinYong'))
    expect(yuLan.text()).toContain(huoQuFanYi('liaoTian', 'yinYongYuYinZhanWei'))
    await wrapper.find('.yinyong-quxiao').trigger('click')
    await flushPromises()
    expect(wrapper.find('.yinyong-yulan').exists()).toBe(false)
  })

  it('语音转文字可用：失败仅内联红字不抛输入框错误并关闭菜单', async () => {
    const { wrapper, 聊天仓库 } = await mountDaiYuYin()
    await wrapper.find('.xiaoxi-xiangmu').trigger('contextmenu', { clientX: 88, clientY: 120 })
    await flushPromises()
    chaXunCaiDanAnNiu()[0].click()
    await flushPromises()
    expect(聊天仓库.cuoWuXinXi || '').toBe('')
    expect(wrapper.find('.yuyin-zhuanwenzi-shibai').exists()).toBe(true)
    expect(chaXunCaiDanAnNiu()).toHaveLength(0)
  })
})
