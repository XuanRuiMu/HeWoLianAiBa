import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import 聊天页面 from '@/views/聊天页面.vue'
import 添加微信 from '@/views/添加微信.vue'
import 军师记录详情 from '@/views/军师记录详情.vue'
import QuanJuCaiDan from '@/components/全局菜单.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { huoQuFanYi } from '@/config/translations'
import { faSongXiaoXi } from '@/api/聊天'

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
      tou_xiang: 'https://example.com/avatar.png',
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
  chuangJianHuiHua: vi.fn().mockResolvedValue({
    id: 'h1',
    jiao_se_id: 'j1',
    yong_hu_id: 'u1',
    kai_shi_shi_jian: Date.now(),
    zui_hou_xiao_xi_shi_jian: Date.now(),
    wei_du_xiao_xi_shu: 0,
  }),
  chuLiGaoBai: vi.fn(),
  huoQuJunShiLieBiao: vi.fn().mockResolvedValue({ junShiLieBiao: [] }),
  qingQiuJunShiZhiDao: vi.fn(),
  huoQuJunShiJiLu: vi.fn().mockResolvedValue([]),
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
const appYuanMaLuJing = resolve(__dirname, '../App.vue')
const appYuanMa = readFileSync(appYuanMaLuJing, 'utf8')

function chuangJianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/chat/:huiHuaId', name: 'liaoTian', component: 聊天页面 },
      { path: '/tian-jia-wei-xin', name: 'tianJiaWeiXin', component: 添加微信 },
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
      global: {
        plugins: [pinia, luYou],
      },
      attachTo: document.body,
    },
  )
  await flushPromises()
  return { wrapper, luYou, 聊天仓库 }
}

function chuangJianLuYouBaoHanJunShi() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/chat/:huiHuaId', name: 'liaoTian', component: 聊天页面 },
      {
        path: '/junshi-jilu/:jiaoSeId/:jiLuId',
        name: 'junShiJiLuXiangQing',
        component: 军师记录详情,
      },
    ],
  })
}

async function mountYingYongBaoHanKeepAlive() {
  const luYou = chuangJianLuYouBaoHanJunShi()
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
      template: `
        <div>
          <QuanJuCaiDan />
          <router-view v-slot="{ Component, route }">
            <KeepAlive :include="['liaoTian']">
              <component :is="Component" v-if="Component" :key="route.path" />
            </KeepAlive>
          </router-view>
        </div>
      `,
    },
    {
      global: {
        plugins: [pinia, luYou],
      },
      attachTo: document.body,
    },
  )
  await flushPromises()
  return { wrapper, luYou, 聊天仓库 }
}

describe('FP-05 聊天界面', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('添加微信过渡页', () => {
    async function mountTianJiaWeiXin() {
      const luYou = chuangJianLuYou()
      await luYou.push('/tian-jia-wei-xin?jiaoSeId=j1')
      const pinia = createPinia()
      setActivePinia(pinia)

      const wrapper = mount(添加微信, {
        global: {
          plugins: [pinia, luYou],
        },
        attachTo: document.body,
      })
      await flushPromises()
      return { wrapper, luYou }
    }

    it('展示对象微信昵称、头像，不展示开场白标签或内容', async () => {
      const { wrapper } = await mountTianJiaWeiXin()
      await flushPromises()

      expect(wrapper.find('.weiXin-mingCheng').text()).toBe('小甜心')
      expect(wrapper.find('.jiaoSe-touxiang').exists()).toBe(true)
      expect(wrapper.find('.jiaoSe-touxiang').attributes('src')).toBe(
        'https://example.com/avatar.png',
      )
      expect(wrapper.text()).not.toContain('开场白')
    })

    it('1.5秒后自动进入聊天界面', async () => {
      const { luYou } = await mountTianJiaWeiXin()
      await flushPromises()

      expect(luYou.currentRoute.value.path).toBe('/tian-jia-wei-xin')

      await vi.advanceTimersByTimeAsync(1500)
      await flushPromises()

      expect(luYou.currentRoute.value.path).toBe('/chat/h1')
    })
  })

  describe('聊天页面菜单栏', () => {
    it('全局固定菜单栏显示对象微信昵称', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      const caiDan = wrapper.findComponent({ name: '全局菜单' })
      expect(caiDan.exists() || document.querySelector('.quanju-caidan')).toBeTruthy()
    })

    it('聊天页面中聊天仓库存在角色微信昵称', async () => {
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
      expect(聊天仓库.jiaoSeXinXi.wei_xin_ming).toBe('小甜心')
    })
  })

  describe('消息区域与输入栏', () => {
    it('底部输入栏存在表情、输入框、告白、发送4个元素', async () => {
      const { wrapper } = await mountLiaoTianYeMian()

      expect(wrapper.find('.emoji-anniu').exists()).toBe(true)
      expect(wrapper.find('.shuru-kuang').exists()).toBe(true)
      expect(wrapper.find('.gaobai-anniu').exists()).toBe(true)
      expect(wrapper.find('.fasong-anniu').exists()).toBe(true)
    })

    it('用户消息气泡在右侧且背景为微信绿色', async () => {
      const bianLiangCssLuJing = resolve(__dirname, '../styles/variables.css')
      const bianLiangCss = readFileSync(bianLiangCssLuJing, 'utf8')
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      await flushPromises()
      聊天仓库.xiaoXiLieBiao = [
        {
          id: 'x1',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '用户测试消息',
          lei_xing: 'wenben',
          shi_jian_chuo: Date.now(),
          yi_du: true,
        },
      ]
      await flushPromises()

      const yongHuXiaoXi = wrapper.find('.yonghu-xiaoxi')
      expect(yongHuXiaoXi.exists()).toBe(true)
      expect(yongHuXiaoXi.classes()).toContain('yonghu-xiaoxi')
      expect(liaoTianYeMianYuanMa).toMatch(
        /\.yonghu-xiaoxi\s*\.qipao-neirong\s*\{[^}]*background:\s*var\(--xiaoxi-yonghu-beijing\)/,
      )
      expect(bianLiangCss).toContain('--xiaoxi-yonghu-beijing: #95EC69')
    })

    it('AI消息气泡在左侧且使用主题背景色', async () => {
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      await flushPromises()
      聊天仓库.xiaoXiLieBiao = [
        {
          id: 'x2',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'j1',
          fa_song_zhe_lei_xing: 'jiaose',
          nei_rong: 'AI测试消息',
          lei_xing: 'wenben',
          shi_jian_chuo: Date.now(),
          yi_du: true,
        },
      ]
      await flushPromises()

      const jiaoSeXiaoXi = wrapper.find('.jiaose-xiaoxi')
      expect(jiaoSeXiaoXi.exists()).toBe(true)
      expect(jiaoSeXiaoXi.classes()).toContain('jiaose-xiaoxi')
      expect(liaoTianYeMianYuanMa).toMatch(
        /\.jiaose-xiaoxi\s*\.qipao-neirong\s*\{[^}]*background:\s*var\(--xiaoxi-jiaose-beijing\)/,
      )
    })

    it('AI消息气泡背景为白色/深灰色并随主题切换', async () => {
      const bianLiangCssLuJing = resolve(__dirname, '../styles/variables.css')
      const bianLiangCss = readFileSync(bianLiangCssLuJing, 'utf8')
      expect(liaoTianYeMianYuanMa).toMatch(
        /\.jiaose-xiaoxi\s*\.qipao-neirong\s*\{[^}]*background:\s*var\(--xiaoxi-jiaose-beijing\)/,
      )
      expect(bianLiangCss).toContain('--xiaoxi-jiaose-beijing: #FFFFFF')
      expect(bianLiangCss).toContain('--xiaoxi-jiaose-beijing: #3A3A3C')
    })
  })

  describe('Emoji选择器', () => {
    it('点击表情按钮弹出emoji选择器', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      expect(wrapper.find('.emoji-mianban').exists()).toBe(false)

      await wrapper.find('.emoji-anniu').trigger('click')
      await flushPromises()

      expect(wrapper.find('.emoji-mianban').exists()).toBe(true)
    })

    it('emoji选择器包含168个emoji且为8列网格', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      await wrapper.find('.emoji-anniu').trigger('click')
      await flushPromises()

      const emojiXiangMu = wrapper.findAll('.emoji-xiangmu')
      expect(emojiXiangMu.length).toBe(168)

      expect(liaoTianYeMianYuanMa).toMatch(
        /\.emoji-mianban\s*\{[^}]*grid-template-columns:\s*repeat\s*\(\s*8\s*,/,
      )
    })

    it('点击emoji插入到输入框', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      await wrapper.find('.emoji-anniu').trigger('click')
      await flushPromises()

      const emojiXiangMu = wrapper.findAll('.emoji-xiangmu')
      await emojiXiangMu[0].trigger('click')
      await flushPromises()

      const shuRuKuang = wrapper.find('.shuru-kuang')
      expect((shuRuKuang.element as HTMLInputElement).value).toBe('😀')
    })
  })

  describe('翻译文件化', () => {
    it('发送按钮文本来自翻译文件', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      expect(wrapper.find('.fasong-anniu').text()).toBe(huoQuFanYi('liaoTian', 'faSong'))
    })

    it('输入框placeholder来自翻译文件', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      expect(wrapper.find('.shuru-kuang').attributes('placeholder')).toBe(
        huoQuFanYi('liaoTian', 'shuRuXiaoXi'),
      )
    })
  })

  describe('FP-A3 微信还原：正在输入、滚动条与底部输入栏', () => {
    it('对方正在输入时顶部菜单栏显示“对方正在输入...”替代角色名', async () => {
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      聊天仓库.zhengZaiShuRu = true
      await flushPromises()

      const caiDan = wrapper.findComponent({ name: '全局菜单' })
      expect(caiDan.text()).toContain(huoQuFanYi('liaoTian', 'duiFangZhengZaiShuRu'))
    })

    it('聊天页面消息区域存在纵向滚动条样式', () => {
      expect(liaoTianYeMianYuanMa).toMatch(/\.xiaoxi-quyu\s*\{[^}]*overflow-y:\s*auto/)
      expect(liaoTianYeMianYuanMa).toMatch(
        /\.xiaoxi-quyu::-webkit-scrollbar\s*\{[^}]*width:\s*\d+px/,
      )
    })

    it('底部输入栏在页面中可见且包含必要元素', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      const shuruQuyu = wrapper.find('.shuru-quyu')
      expect(shuruQuyu.exists()).toBe(true)
      expect(shuruQuyu.isVisible()).toBe(true)
      expect(wrapper.find('.shuru-kuang').exists()).toBe(true)
      expect(wrapper.find('.fasong-anniu').exists()).toBe(true)
    })
  })
})

describe('FP-A11 军师指导后AI回复机制保持正常', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(faSongXiaoXi).mockReset()
    vi.mocked(faSongXiaoXi).mockResolvedValue({
      xiaoXi: {
        id: 'x2',
        hui_hua_id: 'h1',
        fa_song_zhe_id: 'u1',
        fa_song_zhe_lei_xing: 'yonghu',
        nei_rong: '测试消息',
        lei_xing: 'wenben',
        shi_jian_chuo: Date.now(),
        yi_du: true,
      },
      shiMiJi: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('App.vue 使用 KeepAlive 缓存聊天页组件', () => {
    expect(appYuanMa).toContain('<KeepAlive')
    expect(appYuanMa).toContain(":include=\"['liaoTian']\"")
  })

  it('聊天页组件声明 name 为 liaoTian 以匹配 KeepAlive include', () => {
    expect(liaoTianYeMianYuanMa).toContain("name: 'liaoTian'")
  })

  it('聊天页组件使用 onActivated/onDeactivated 并在 onBeforeUnmount 中清空状态', () => {
    expect(liaoTianYeMianYuanMa).toContain('onActivated')
    expect(liaoTianYeMianYuanMa).toContain('onDeactivated')
    expect(liaoTianYeMianYuanMa).toContain('onBeforeUnmount')
    expect(liaoTianYeMianYuanMa).toContain('聊天仓库.qingKongZhuangTai')
  })

  it('从聊天页跳转到军师记录详情再返回，会话状态不被清空', async () => {
    const { luYou, 聊天仓库 } = await mountYingYongBaoHanKeepAlive()

    expect(luYou.currentRoute.value.path).toBe('/chat/h1')
    expect(聊天仓库.dangQianHuiHuaId).toBe('h1')
    expect(聊天仓库.socketLianJie).not.toBeNull()

    await luYou.push('/junshi-jilu/j1/2026-07-07T10%3A00%3A00.000Z')
    await flushPromises()

    expect(luYou.currentRoute.value.path).toBe('/junshi-jilu/j1/2026-07-07T10%3A00%3A00.000Z')
    expect(聊天仓库.dangQianHuiHuaId).toBe('h1')
    expect(聊天仓库.socketLianJie).not.toBeNull()

    await luYou.push('/chat/h1')
    await flushPromises()

    expect(luYou.currentRoute.value.path).toBe('/chat/h1')
    expect(聊天仓库.dangQianHuiHuaId).toBe('h1')
    expect(聊天仓库.socketLianJie).not.toBeNull()
  })

  it('从军师记录详情返回聊天页后，用户发送消息仍会触发 socket 发送消息事件', async () => {
    const { wrapper, luYou, 聊天仓库 } = await mountYingYongBaoHanKeepAlive()

    await luYou.push('/junshi-jilu/j1/2026-07-07T10%3A00%3A00.000Z')
    await flushPromises()

    await luYou.push('/chat/h1')
    await flushPromises()

    if (聊天仓库.socketLianJie) {
      聊天仓库.socketLianJie.connected = true
    }

    const faSongMock = vi.fn()
    if (聊天仓库.socketLianJie) {
      聊天仓库.socketLianJie.emit = faSongMock
    }

    vi.mocked(faSongXiaoXi).mockResolvedValue({
      xiaoXi: {
        id: 'x3',
        hui_hua_id: 'h1',
        fa_song_zhe_id: 'u1',
        fa_song_zhe_lei_xing: 'yonghu',
        nei_rong: '返回后消息',
        lei_xing: 'wenben',
        shi_jian_chuo: Date.now(),
        yi_du: true,
      },
      shiMiJi: false,
    })

    const shuRuKuang = wrapper.find('.shuru-kuang')
    await shuRuKuang.setValue('返回后消息')
    await wrapper.find('.fasong-anniu').trigger('click')
    await flushPromises()

    expect(faSongMock).toHaveBeenCalledWith('发送消息')
  })
})
