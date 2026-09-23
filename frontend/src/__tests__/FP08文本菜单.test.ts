import { ref } from 'vue'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { use长按菜单 } from '@/composables/use长按菜单'
import { LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI, XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/translations'
import 聊天页面 from '@/views/聊天页面.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { fanYiWenBen } from '@/api/聊天'
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
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}))

function zaoXiaoXi(gengDuo: Partial<消息> = {}): 消息 {
  return {
    id: 'w1',
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'u1',
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '你好世界',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: true,
    ...gengDuo,
  }
}

function zaoYiLai(gengDuo: Record<string, unknown> = {}) {
  return {
    dangQianShiJian: ref(Date.now()),
    cheHuiXiaoXi: vi.fn().mockResolvedValue(undefined),
    sheZhiCuoWu: vi.fn(),
    ...gengDuo,
  }
}

describe('FP-08 文本条右键菜单单源四项', () => {
  it('文本菜单配置仅含复制翻译引用撤回四项且顺序固定', () => {
    expect([...LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.wenBenCaiDanXiang]).toEqual([
      'fuZhi',
      'fanYi',
      'yinYong',
      'cheHui',
    ])
  })

  it('菜单项全部来自翻译文件且无微信外多余项', () => {
    const xiangMu = [...LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.wenBenCaiDanXiang]
    expect(xiangMu).toHaveLength(4)
    for (const xiang of xiangMu) {
      expect(typeof huoQuFanYi('liaoTian', xiang)).toBe('string')
    }
    expect(huoQuFanYi('liaoTian', 'fuZhi')).toBeTruthy()
    expect(huoQuFanYi('liaoTian', 'fanYi')).toBeTruthy()
    expect(huoQuFanYi('liaoTian', 'yinYong')).toBeTruthy()
    expect(huoQuFanYi('liaoTian', 'cheHui')).toBeTruthy()
    const shiTuYuanMa = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf8')
    const zuHeYuanMa = readFileSync(resolve(__dirname, '../composables/use长按菜单.ts'), 'utf8')
    const peiZhiYuanMa = readFileSync(resolve(__dirname, '../config/消息配置.ts'), 'utf8')
    for (const yuanMa of [shiTuYuanMa, zuHeYuanMa, peiZhiYuanMa]) {
      expect(yuanMa).not.toContain('放大')
      expect(yuanMa).not.toContain('搜一搜')
      expect(yuanMa).not.toContain('转发')
      expect(yuanMa).not.toContain('收藏')
      expect(yuanMa).not.toContain('多选')
      expect(yuanMa).not.toContain('提醒')
    }
    expect(shiTuYuanMa).not.toContain("'复制'")
    expect(shiTuYuanMa).not.toContain('"复制"')
    expect(shiTuYuanMa).not.toContain("'翻译'")
    expect(shiTuYuanMa).not.toContain('"翻译"')
    expect(zuHeYuanMa).not.toContain("'复制'")
    expect(zuHeYuanMa).not.toContain("'翻译'")
  })

  it('聊天页面文本菜单经单源渲染四项', () => {
    const yuanMa = readFileSync(resolve(__dirname, '../views/聊天页面.vue'), 'utf8')
    expect(yuanMa).toContain('huoQuWenBenCaiDanXiang')
    expect(yuanMa).toContain('zhiXingWenBenCaiDanXiang')
    expect(yuanMa).toContain('daKaiWenBenCaiDan')
  })

  it('翻译失败与复制失败文案走翻译文件', () => {
    expect(huoQuFanYi('liaoTian', 'fanYiShiBai')).toBeTruthy()
    expect(huoQuFanYi('liaoTian', 'fuZhiShiBai')).toBeTruthy()
    expect(huoQuFanYi('liaoTian', 'fanYiZhong')).toBeTruthy()
  })
})

describe('FP-08 use长按菜单文本分支', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('用户与角色文本均可打开文本菜单并记录坐标', () => {
    const yiLai = zaoYiLai()
    const { wenBenCaiDanZhanKai, wenBenCaiDanYangShi, daKaiWenBenCaiDan } = use长按菜单(yiLai)
    daKaiWenBenCaiDan(zaoXiaoXi(), { clientY: 120, clientX: 88 } as MouseEvent)
    expect(wenBenCaiDanZhanKai.value).toBe(true)
    expect(wenBenCaiDanYangShi.value).toEqual({ top: '120px', left: '88px' })
    const jiaoSeYiLai = zaoYiLai()
    const jiaoSeFenZhi = use长按菜单(jiaoSeYiLai)
    jiaoSeFenZhi.daKaiWenBenCaiDan(zaoXiaoXi({ fa_song_zhe_lei_xing: 'jiaose' }), {} as MouseEvent)
    expect(jiaoSeFenZhi.wenBenCaiDanZhanKai.value).toBe(true)
  })

  it('已撤回系统与非文本消息不打开文本菜单', () => {
    const yiLai = zaoYiLai()
    const { wenBenCaiDanZhanKai, daKaiWenBenCaiDan } = use长按菜单(yiLai)
    daKaiWenBenCaiDan(zaoXiaoXi({ yi_che_hui: true }), {} as MouseEvent)
    daKaiWenBenCaiDan(zaoXiaoXi({ fa_song_zhe_lei_xing: 'xitong' }), {} as MouseEvent)
    daKaiWenBenCaiDan(zaoXiaoXi({ lei_xing: 'yuYin' }), {} as MouseEvent)
    daKaiWenBenCaiDan(zaoXiaoXi({ lei_xing: 'tuPian' }), {} as MouseEvent)
    expect(wenBenCaiDanZhanKai.value).toBe(false)
  })

  it('文本长按500ms打开菜单提前松手取消', async () => {
    const yiLai = zaoYiLai()
    const { wenBenCaiDanZhanKai, chuMoKaiShiWenBen, chuMoJieShuWenBen } = use长按菜单(yiLai)
    chuMoKaiShiWenBen(zaoXiaoXi())
    chuMoJieShuWenBen()
    await vi.advanceTimersByTimeAsync(600)
    expect(wenBenCaiDanZhanKai.value).toBe(false)
    chuMoKaiShiWenBen(zaoXiaoXi())
    await vi.advanceTimersByTimeAsync(500)
    expect(wenBenCaiDanZhanKai.value).toBe(true)
  })

  it('用户2分钟内四项超时与角色三项无撤回', () => {
    const yiLai = zaoYiLai()
    const { huoQuWenBenCaiDanXiang } = use长按菜单(yiLai)
    expect(huoQuWenBenCaiDanXiang(zaoXiaoXi())).toEqual(['fuZhi', 'fanYi', 'yinYong', 'cheHui'])
    expect(huoQuWenBenCaiDanXiang(zaoXiaoXi({ fa_song_zhe_lei_xing: 'jiaose' }))).toEqual([
      'fuZhi',
      'fanYi',
      'yinYong',
    ])
    expect(
      huoQuWenBenCaiDanXiang(
        zaoXiaoXi({ shi_jian_chuo: Date.now() - XIAO_XI_PEI_ZHI.cheHuiShiXian - 1000 }),
      ),
    ).toEqual(['fuZhi', 'fanYi', 'yinYong'])
  })

  it('复制成功无报错失败报翻译文件信息', async () => {
    const chengGongYiLai = zaoYiLai({ fuZhiWenBen: vi.fn().mockResolvedValue(true) })
    const chengGong = use长按菜单(chengGongYiLai)
    chengGong.daKaiWenBenCaiDan(zaoXiaoXi({ nei_rong: '复制我' }), {} as MouseEvent)
    await chengGong.zhiXingWenBenCaiDanXiang('fuZhi')
    expect(chengGongYiLai.fuZhiWenBen).toHaveBeenCalledWith('复制我')
    expect(chengGongYiLai.sheZhiCuoWu).not.toHaveBeenCalled()
    expect(chengGong.wenBenCaiDanZhanKai.value).toBe(false)
    const shiBaiYiLai = zaoYiLai({ fuZhiWenBen: vi.fn().mockResolvedValue(false) })
    const shiBai = use长按菜单(shiBaiYiLai)
    shiBai.daKaiWenBenCaiDan(zaoXiaoXi(), {} as MouseEvent)
    await shiBai.zhiXingWenBenCaiDanXiang('fuZhi')
    expect(shiBaiYiLai.sheZhiCuoWu).toHaveBeenCalledWith(huoQuFanYi('liaoTian', 'fuZhiShiBai'))
  })

  it('翻译成功缓存展开二次点击收起三次再展开', async () => {
    const yiLai = zaoYiLai({ fanYiQingQiu: vi.fn().mockResolvedValue('hello world') })
    const { daKaiWenBenCaiDan, zhiXingWenBenCaiDanXiang, huoQuFanYiJieGuo, shiFanYiZhanKai } =
      use长按菜单(yiLai)
    const xiaoXi = zaoXiaoXi({ nei_rong: '你好' })
    daKaiWenBenCaiDan(xiaoXi, {} as MouseEvent)
    await zhiXingWenBenCaiDanXiang('fanYi')
    expect(yiLai.fanYiQingQiu).toHaveBeenCalledWith('你好', 'auto', 'zh')
    expect(huoQuFanYiJieGuo(xiaoXi)).toBe('hello world')
    expect(shiFanYiZhanKai(xiaoXi)).toBe(true)
    daKaiWenBenCaiDan(xiaoXi, {} as MouseEvent)
    await zhiXingWenBenCaiDanXiang('fanYi')
    expect(shiFanYiZhanKai(xiaoXi)).toBe(false)
    expect(huoQuFanYiJieGuo(xiaoXi)).toBe('hello world')
    daKaiWenBenCaiDan(xiaoXi, {} as MouseEvent)
    await zhiXingWenBenCaiDanXiang('fanYi')
    expect(shiFanYiZhanKai(xiaoXi)).toBe(true)
    expect(yiLai.fanYiQingQiu).toHaveBeenCalledTimes(1)
  })

  it('翻译空文本缺通道空结果异常均报翻译失败', async () => {
    const kongYiLai = zaoYiLai({ fanYiQingQiu: vi.fn() })
    const kong = use长按菜单(kongYiLai)
    expect(await kong.qingQiuWenBenFanYi(zaoXiaoXi({ nei_rong: '   ' }))).toBeNull()
    expect(kongYiLai.sheZhiCuoWu).toHaveBeenCalledWith(huoQuFanYi('liaoTian', 'fanYiShiBai'))
    const queYiLai = zaoYiLai({})
    const que = use长按菜单(queYiLai)
    expect(await que.qingQiuWenBenFanYi(zaoXiaoXi())).toBeNull()
    expect(queYiLai.sheZhiCuoWu).toHaveBeenCalledWith(huoQuFanYi('liaoTian', 'fanYiShiBai'))
    const kongJieYiLai = zaoYiLai({ fanYiQingQiu: vi.fn().mockResolvedValue('   ') })
    const kongJie = use长按菜单(kongJieYiLai)
    expect(await kongJie.qingQiuWenBenFanYi(zaoXiaoXi())).toBeNull()
    expect(kongJieYiLai.sheZhiCuoWu).toHaveBeenCalledWith(huoQuFanYi('liaoTian', 'fanYiShiBai'))
    const yiChangYiLai = zaoYiLai({
      fanYiQingQiu: vi.fn().mockRejectedValue(new Error('断网')),
    })
    const yiChang = use长按菜单(yiChangYiLai)
    expect(await yiChang.qingQiuWenBenFanYi(zaoXiaoXi())).toBeNull()
    expect(yiChangYiLai.sheZhiCuoWu).toHaveBeenCalledWith(huoQuFanYi('liaoTian', 'fanYiShiBai'))
  })

  it('引用写入引用链路并关闭菜单且摘要截断可取消', async () => {
    const yiLai = zaoYiLai()
    const { wenBenCaiDanZhanKai, daKaiWenBenCaiDan, zhiXingWenBenCaiDanXiang, yinYongXiaoXi, sheZhiYinYong, quXiaoYinYong, huoQuYinYongZhaiYao } =
      use长按菜单(yiLai)
    const muBiao = zaoXiaoXi({ nei_rong: '引用我' })
    daKaiWenBenCaiDan(muBiao, {} as MouseEvent)
    await zhiXingWenBenCaiDanXiang('yinYong')
    expect(wenBenCaiDanZhanKai.value).toBe(false)
    expect(yinYongXiaoXi.value?.id).toBe('w1')
    const changWen = zaoXiaoXi({ nei_rong: '一'.repeat(60) })
    sheZhiYinYong(changWen)
    expect(huoQuYinYongZhaiYao(changWen).length).toBeLessThanOrEqual(
      LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.yinYongZhaiYaoZuiDaZiFu + 3,
    )
    quXiaoYinYong()
    expect(yinYongXiaoXi.value).toBeNull()
  })

  it('撤回调用仓库并关闭菜单', async () => {
    const yiLai = zaoYiLai()
    const { wenBenCaiDanZhanKai, daKaiWenBenCaiDan, zhiXingWenBenCaiDanXiang } =
      use长按菜单(yiLai)
    daKaiWenBenCaiDan(zaoXiaoXi(), {} as MouseEvent)
    await zhiXingWenBenCaiDanXiang('cheHui')
    expect(yiLai.cheHuiXiaoXi).toHaveBeenCalledWith('w1')
    expect(wenBenCaiDanZhanKai.value).toBe(false)
  })

  it('语音消息不走文本菜单文本消息不走语音菜单', () => {
    const yiLai = zaoYiLai()
    const { wenBenCaiDanZhanKai, daKaiWenBenCaiDan } = use长按菜单(yiLai)
    daKaiWenBenCaiDan(zaoXiaoXi({ lei_xing: 'yuYin' }), {} as MouseEvent)
    expect(wenBenCaiDanZhanKai.value).toBe(false)
    const lingYiLai = zaoYiLai()
    const lingYi = use长按菜单(lingYiLai)
    lingYi.daKaiYuYinCaiDan(zaoXiaoXi({ lei_xing: 'wenben', nei_rong: '你好' }), {} as MouseEvent)
    expect(lingYi.yuYinCaiDanZhanKai.value).toBe(false)
  })
})

describe('FP-08 聊天页面文本菜单四项可用', () => {
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

  async function mountDaiWenBen(xiaoXiLieBiao: 消息[]) {
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
    聊天仓库.xiaoXiLieBiao = xiaoXiLieBiao
    await flushPromises()
    return { wrapper, 聊天仓库 }
  }

  function chaXunWenBenCaiDanAnNiu(): HTMLElement[] {
    return Array.from(document.body.querySelectorAll('.chehui-caidan .chehui-xiangmu'))
  }

  it('用户文本右键菜单四项顺序与翻译一致', async () => {
    const { wrapper } = await mountDaiWenBen([zaoXiaoXi()])
    await wrapper.find('.xiaoxi-xiangmu').trigger('contextmenu', { clientX: 88, clientY: 120 })
    await flushPromises()
    const anNiu = chaXunWenBenCaiDanAnNiu()
    expect(anNiu).toHaveLength(4)
    expect(anNiu.map((b) => b.textContent)).toEqual([
      huoQuFanYi('liaoTian', 'fuZhi'),
      huoQuFanYi('liaoTian', 'fanYi'),
      huoQuFanYi('liaoTian', 'yinYong'),
      huoQuFanYi('liaoTian', 'cheHui'),
    ])
  })

  it('角色文本右键菜单三项无撤回', async () => {
    const { wrapper } = await mountDaiWenBen([zaoXiaoXi({ fa_song_zhe_lei_xing: 'jiaose' })])
    await wrapper.find('.xiaoxi-xiangmu').trigger('contextmenu', { clientX: 88, clientY: 120 })
    await flushPromises()
    expect(chaXunWenBenCaiDanAnNiu().map((b) => b.textContent)).toEqual([
      huoQuFanYi('liaoTian', 'fuZhi'),
      huoQuFanYi('liaoTian', 'fanYi'),
      huoQuFanYi('liaoTian', 'yinYong'),
    ])
  })

  it('超时用户文本同样三项无撤回', async () => {
    const { wrapper } = await mountDaiWenBen([
      zaoXiaoXi({ id: 'w2', shi_jian_chuo: Date.now() - XIAO_XI_PEI_ZHI.cheHuiShiXian - 1000 }),
    ])
    await wrapper.find('.xiaoxi-xiangmu').trigger('contextmenu', { clientX: 10, clientY: 10 })
    await flushPromises()
    const wenBen = chaXunWenBenCaiDanAnNiu().map((b) => b.textContent)
    expect(wenBen).not.toContain(huoQuFanYi('liaoTian', 'cheHui'))
    expect(wenBen).toHaveLength(3)
  })

  it('引用可用点击后输入区出现预览且可取消', async () => {
    const { wrapper } = await mountDaiWenBen([zaoXiaoXi({ nei_rong: '引用这句' })])
    await wrapper.find('.xiaoxi-xiangmu').trigger('contextmenu', { clientX: 88, clientY: 120 })
    await flushPromises()
    chaXunWenBenCaiDanAnNiu()[2].click()
    await flushPromises()
    // FP-09：预览条形态作废，重做为 components/聊天/引用条.vue（类名 yinyong-tiao*）
    const yuLan = wrapper.find('.yinyong-tiao')
    expect(yuLan.exists()).toBe(true)
    expect(yuLan.text()).toContain(huoQuFanYi('liaoTian', 'yinYong'))
    expect(yuLan.text()).toContain('引用这句')
    const guanBi = yuLan.find('button.yinyong-tiao-guanbi')
    expect(guanBi.attributes('type'), '关闭钮必须是真 button').toBe('button')
    expect(guanBi.attributes('aria-label')).toBe(huoQuFanYi('liaoTian', 'quXiaoYinYong'))
    await guanBi.trigger('click')
    await flushPromises()
    expect(wrapper.find('.yinyong-tiao').exists()).toBe(false)
  })

  it('翻译可用成功后气泡下展示译文失败报翻译文件信息', async () => {
    vi.mocked(fanYiWenBen).mockResolvedValue('hello')
    const { wrapper, 聊天仓库 } = await mountDaiWenBen([zaoXiaoXi({ nei_rong: '你好' })])
    await wrapper.find('.xiaoxi-xiangmu').trigger('contextmenu', { clientX: 88, clientY: 120 })
    await flushPromises()
    chaXunWenBenCaiDanAnNiu()[1].click()
    await flushPromises()
    expect(vi.mocked(fanYiWenBen)).toHaveBeenCalledWith('你好', 'auto', 'zh')
    expect(wrapper.text()).toContain('hello')
    vi.mocked(fanYiWenBen).mockRejectedValue(new Error('断网'))
    const shiBaiXiaoXi = zaoXiaoXi({ id: 'w3', nei_rong: '再译一句' })
    聊天仓库.xiaoXiLieBiao = [...聊天仓库.xiaoXiLieBiao, shiBaiXiaoXi]
    await flushPromises()
    const xiangMu = wrapper.findAll('.xiaoxi-xiangmu')
    await xiangMu[xiangMu.length - 1].trigger('contextmenu', { clientX: 10, clientY: 10 })
    await flushPromises()
    chaXunWenBenCaiDanAnNiu()[1].click()
    await flushPromises()
    expect(聊天仓库.cuoWuXinXi).toBe(huoQuFanYi('liaoTian', 'fanYiShiBai'))
  })

  it('复制点击后关闭菜单剪贴板失败报翻译文件信息', async () => {
    const { wrapper, 聊天仓库 } = await mountDaiWenBen([zaoXiaoXi({ nei_rong: '复制这句' })])
    await wrapper.find('.xiaoxi-xiangmu').trigger('contextmenu', { clientX: 88, clientY: 120 })
    await flushPromises()
    chaXunWenBenCaiDanAnNiu()[0].click()
    await flushPromises()
    expect(chaXunWenBenCaiDanAnNiu()).toHaveLength(0)
    expect(
      聊天仓库.cuoWuXinXi === null || 聊天仓库.cuoWuXinXi === huoQuFanYi('liaoTian', 'fuZhiShiBai'),
    ).toBe(true)
  })
})
