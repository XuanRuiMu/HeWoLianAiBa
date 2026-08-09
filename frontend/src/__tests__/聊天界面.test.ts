import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import 聊天页面 from '@/views/聊天页面.vue'
import 添加微信 from '@/views/添加微信.vue'
import 资料设置向导 from '@/views/资料设置向导.vue'
import 军师记录详情 from '@/views/军师记录详情.vue'
import QuanJuCaiDan from '@/components/全局菜单.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用认证表单仓库 } from '@/stores/认证表单'
import { huoQuFanYi } from '@/config/translations'
import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { faSongXiaoXi, huoQuXiaoXi, huoQuFuPan, shengChengJiaoSe, queRenJiaoSe } from '@/api/聊天'
import router from '@/router'

vi.mock('@/router', () => ({
  default: { push: vi.fn().mockResolvedValue(true) },
}))

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
  huoQuFuPan: vi.fn().mockResolvedValue({
    fu_pan_nei_rong: null,
    fu_pan_shi_jian_xian: [],
    fu_pan_pi_zhu: null,
    jun_shi_zhi_dao_ji_lu: [],
    guan_jian_shi_jian: [],
    jia_zai_zhong: false,
  }),
  shengChengJiaoSe: vi.fn().mockResolvedValue({
    id: '',
    wei_xin_ming: '小甜心',
    ming_zi: '测试角色',
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
  }),
  queRenJiaoSe: vi.fn().mockResolvedValue({
    id: 'j1',
    wei_xin_ming: '小甜心',
    ming_zi: '测试角色',
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
      { path: '/profile-setup', name: 'ziLiaoSheZhi', component: { template: '<div>资料</div>' } },
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
    async function mountTianJiaWeiXin(options: { shiBai?: boolean; kongZhi?: boolean } = {}) {
      // 资料由资料设置向导通过 sessionStorage 透传（尚未生成角色）
      sessionStorage.setItem(
        'ziLiaoSheZhiLinShi',
        JSON.stringify({
          xingBie: 'male',
          muBiaoXingBie: 'female',
          xingGeXuanZe: 'INFP',
          yunXuZhaNanZhaNv: false,
          随机性格标记: false,
        }),
      )
      const luYou = chuangJianLuYou()
      await luYou.push('/tian-jia-wei-xin?jiaoSeId=j1')
      const pinia = createPinia()
      setActivePinia(pinia)

      let resolveJiaoSe: (zhi: unknown) => void = () => {}
      let resolveQueRen: (zhi: unknown) => void = () => {}

      if (!options.kongZhi) {
        if (options.shiBai) {
          vi.mocked(shengChengJiaoSe).mockRejectedValue(new Error('网络错误'))
        } else {
          vi.mocked(shengChengJiaoSe).mockResolvedValue({
            id: '',
            wei_xin_ming: '小甜心',
            ming_zi: '测试角色',
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
          })
          vi.mocked(queRenJiaoSe).mockResolvedValue({
            id: 'j1',
            wei_xin_ming: '小甜心',
            ming_zi: '测试角色',
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
          })
        }
      } else {
        // 受控模式：先挂起生成接口，便于观察阶段文案推进
        vi.mocked(shengChengJiaoSe).mockReturnValue(
          new Promise((resolve) => {
            resolveJiaoSe = resolve
          }),
        )
        vi.mocked(queRenJiaoSe).mockReturnValue(
          new Promise((resolve) => {
            resolveQueRen = resolve
          }),
        )
      }

      const wrapper = mount(添加微信, {
        global: {
          plugins: [pinia, luYou],
        },
        attachTo: document.body,
      })
      if (!options.kongZhi) await flushPromises()
      return { wrapper, luYou, resolveJiaoSe, resolveQueRen }
    }

    it('展示对象微信昵称、头像，并显示生成进度（不提前泄露开场白内容）', async () => {
      const { wrapper } = await mountTianJiaWeiXin()
      await flushPromises()

      expect(wrapper.find('.weiXin-mingCheng').text()).toBe('小甜心')
      expect(wrapper.find('.jiaoSe-touxiang').exists()).toBe(true)
      expect(wrapper.find('.jiaoSe-touxiang').attributes('src')).toBe(
        'https://example.com/avatar.png',
      )
      // 过渡页只展示进度文案，不展示真实开场白内容元素
      expect(wrapper.find('.tianjia-tiShi').exists()).toBe(true)
    })

    it('生成完成后停留在加载页则直接跳转聊天页（照旧跳转聊天页面）', async () => {
      const { luYou } = await mountTianJiaWeiXin()
      await flushPromises()

      // 真实生成流程（含创建会话）在后台跑完，且用户仍停留在加载页 → 跳转聊天页
      expect(luYou.currentRoute.value.path).toBe('/chat/h1')
      // store 不再自行跳转「过往战绩」，导航由加载页组件裁决，避免离开时打扰
      expect(vi.mocked(router.push)).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: 'guoWangZhanJi' }),
      )
    })

    it('点击开始聊天后立即跳转加载页且透传资料（不等待网络）', async () => {
      const luYou = chuangJianLuYou()
      await luYou.push('/tian-jia-wei-xin')
      const pinia = createPinia()
      setActivePinia(pinia)
      const 认证仓库 = 使用认证表单仓库()
      认证仓库.ziLiaoShuJu.xingGeXuanZe = 'INFP'
      认证仓库.ziLiaoShuJu.muBiaoXingBie = 'female'
      认证仓库.ziLiaoDangQianBuZhou = 3

      const wrapper = mount(资料设置向导, {
        global: {
          plugins: [pinia, luYou],
        },
        attachTo: document.body,
      })
      await flushPromises()

      expect(wrapper.find('.kaiShiLiaoTian').exists()).toBe(true)
      await wrapper.find('.kaiShiLiaoTian').trigger('click')
      await flushPromises()

      // 立即跳转加载界面
      expect(luYou.currentRoute.value.path).toBe('/tian-jia-wei-xin')
      // 资料已透传，加载页据此发起生成
      expect(sessionStorage.getItem('ziLiaoSheZhiLinShi')).not.toBeNull()
    })

    it('生成过程中进度文案随真实节点实时推进', async () => {
      const { wrapper, luYou, resolveJiaoSe, resolveQueRen } = await mountTianJiaWeiXin({
        kongZhi: true,
      })
      await flushPromises()

      // 初始：正在打开手机…
      expect(wrapper.find('.tianjia-tiShi').text()).toBe(
        huoQuFanYi('tianJiaWeiXin', 'zhengZaiDaKaiShouJi'),
      )

      // 前置趣味文案随真实等待推进
      await vi.advanceTimersByTimeAsync(800)
      await flushPromises()
      expect(wrapper.find('.tianjia-tiShi').text()).toBe(
        huoQuFanYi('tianJiaWeiXin', 'zhengZaiTaoLunShuiSaoShui'),
      )

      await vi.advanceTimersByTimeAsync(800)
      await flushPromises()
      expect(wrapper.find('.tianjia-tiShi').text()).toBe(
        huoQuFanYi('tianJiaWeiXin', 'zhengZaiKuoQuan'),
      )

      // 真实第1阶段：拿到人设 → 正在生成人设…
      resolveJiaoSe({
        id: '',
        wei_xin_ming: '小甜心',
        ming_zi: '测试角色',
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
      })
      await flushPromises()
      expect(wrapper.find('.tianjia-tiShi').text()).toBe(
        huoQuFanYi('tianJiaWeiXin', 'zhengZaiShengChengRenShe'),
      )

      // 真实末阶段：保存人设 + 开场白完成 → 立即进入完成态并跳转
      resolveQueRen({ id: 'j1' })
      await flushPromises()
      expect(wrapper.find('.tianjia-tiShi').text()).toBe(
        huoQuFanYi('tianJiaWeiXin', 'zhengZaiShengChengKaiChangBai'),
      )
      await flushPromises()
      // 流程在后台跑完且仍停留在加载页 → 跳转聊天页
      expect(luYou.currentRoute.value.path).toBe('/chat/h1')
      expect(vi.mocked(router.push)).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: 'guoWangZhanJi' }),
      )
    })

    it('生成失败时显示错误信息并提供返回入口', async () => {
      const { wrapper, luYou } = await mountTianJiaWeiXin({ shiBai: true })
      await flushPromises()

      expect(wrapper.find('.tianjia-cuowu').exists()).toBe(true)
      expect(wrapper.find('.tianjia-cuowu').text()).toBe(
        huoQuFanYi('tianJiaWeiXin', 'shengChengShiBai'),
      )
      expect(wrapper.find('.tianjia-fan-hui').exists()).toBe(true)

      await wrapper.find('.tianjia-fan-hui').trigger('click')
      await flushPromises()
      expect(luYou.currentRoute.value.path).toBe('/profile-setup')
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
      expect((shuRuKuang.element as HTMLTextAreaElement).value).toBe('😀')
    })
  })

  describe('管理员调试指令（greedisgood）', () => {
    it('源码触发指令已由 --console 改为 greedisgood（零硬编码，使用命名常量）', () => {
      // 不再出现旧指令 --console
      expect(liaoTianYeMianYuanMa).not.toContain("'--console'")
      // 提取为命名常量，单一来源、零硬编码
      expect(liaoTianYeMianYuanMa).toMatch(/const\s+管理员调试指令\s*=\s*['"]greedisgood['"]/)
      // 触发逻辑引用该常量而非裸字符串
      expect(liaoTianYeMianYuanMa).toMatch(/neiRong\s*===\s*管理员调试指令/)
    })

    it('输入 greedisgood 时清空输入框且不发送消息', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue('greedisgood')
      await flushPromises()

      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      expect((shuRuKuang.element as HTMLTextAreaElement).value).toBe('')
      expect(faSongXiaoXi).not.toHaveBeenCalled()
    })
  })

  describe('表情面板外部点击收起（捕获阶段）', () => {
    it('文档级 click 监听以捕获阶段注册，确保点击顶栏(@click.stop)等也能收起面板', () => {
      expect(liaoTianYeMianYuanMa).toMatch(
        /document\.addEventListener\('click',\s*chuLiWenDangDianJi,\s*true\)/,
      )
      expect(liaoTianYeMianYuanMa).toMatch(
        /document\.removeEventListener\('click',\s*chuLiWenDangDianJi,\s*true\)/,
      )
    })

    it('展开表情面板后，点击消息区等外部区域会收起面板', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      await wrapper.find('.emoji-anniu').trigger('click')
      await flushPromises()
      expect(wrapper.find('.emoji-mianban').exists()).toBe(true)

      // 模拟点击页面其它区域（消息区），应触发文档捕获监听收起面板
      const xiaoxiQuyu = wrapper.find('.xiaoxi-quyu').element
      xiaoxiQuyu.dispatchEvent(new Event('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.find('.emoji-mianban').exists()).toBe(false)
    })
  })

  describe('发送状态转圈尺寸', () => {
    it('发送中转圈直径约等于一行气泡高度，使用 em 而非硬编码 px', () => {
      expect(liaoTianYeMianYuanMa).toMatch(/\.fasong-zhuangtai-zhuanquan\s*\{[^}]*width:\s*1\.4em/)
      expect(liaoTianYeMianYuanMa).toMatch(/\.fasong-zhuangtai-zhuanquan\s*\{[^}]*height:\s*1\.4em/)
      // 边框也用 em，整体不使用固定 px
      expect(liaoTianYeMianYuanMa).toMatch(
        /\.fasong-zhuangtai-zhuanquan\s*\{[^}]*border:\s*0\.16em/,
      )
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
      聊天仓库.aiZhuangTai = 'zheng_zai_shu_ru'
      await flushPromises()

      const caiDan = wrapper.findComponent({ name: '全局菜单' })
      expect(caiDan.text()).toContain(huoQuFanYi('liaoTian', 'duiFangZhengZaiShuRu'))
    })

    it('聊天页面消息区域存在清晰可见的纵向滚动条样式', () => {
      expect(liaoTianYeMianYuanMa).toMatch(/\.xiaoxi-quyu\s*\{[^}]*overflow-y:\s*auto/)
      // 不声明标准 scrollbar-width / scrollbar-color，否则会覆盖下方 WebKit 自定义样式
      expect(liaoTianYeMianYuanMa).not.toMatch(/\.xiaoxi-quyu\s*\{[^}]*scrollbar-width:/)
      expect(liaoTianYeMianYuanMa).not.toMatch(/\.xiaoxi-quyu\s*\{[^}]*scrollbar-color:/)
      expect(liaoTianYeMianYuanMa).toMatch(
        /\.xiaoxi-quyu::-webkit-scrollbar\s*\{[^}]*width:\s*\d+px/,
      )
      // 使用独立可见色变量，避免沿用近乎不可见的 --gundong-tiao-beijing
      expect(liaoTianYeMianYuanMa).toMatch(
        /\.xiaoxi-quyu::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*var\(--liaotian-gundong-tiao\)/,
      )
      expect(liaoTianYeMianYuanMa).toMatch(/\.xiaoxi-quyu::-webkit-scrollbar-thumb:hover/)
    })

    it('emoji面板存在统一且清晰的滚动条样式（仅 WebKit 伪类，可见色变量）', () => {
      expect(liaoTianYeMianYuanMa).toMatch(/\.emoji-mianban\s*\{[^}]*overflow-y:\s*auto/)
      // 不声明标准 scrollbar-width / scrollbar-color，否则会覆盖下方 ::-webkit-scrollbar 自定义样式
      expect(liaoTianYeMianYuanMa).not.toMatch(/\.emoji-mianban\s*\{[^}]*scrollbar-width:/)
      expect(liaoTianYeMianYuanMa).not.toMatch(/\.emoji-mianban\s*\{[^}]*scrollbar-color:/)
      expect(liaoTianYeMianYuanMa).toMatch(
        /\.emoji-mianban::-webkit-scrollbar\s*\{[^}]*width:\s*\d+px/,
      )
      // 使用独立可见色变量，避免沿用近乎不可见的 --gundong-tiao-beijing
      expect(liaoTianYeMianYuanMa).toMatch(
        /\.emoji-mianban::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*var\(--emoji-mianban-gundong-tiao\)/,
      )
      expect(liaoTianYeMianYuanMa).toMatch(/\.emoji-mianban::-webkit-scrollbar-thumb:hover/)
    })

    it('底部输入栏在页面中可见且包含必要元素', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      const shuruQuyu = wrapper.find('.shuru-quyu')
      expect(shuruQuyu.exists()).toBe(true)
      expect(shuruQuyu.isVisible()).toBe(true)
      expect(wrapper.find('.shuru-kuang').exists()).toBe(true)
      expect(wrapper.find('.fasong-anniu').exists()).toBe(true)
    })

    it('消息区域底部保留滚动内边距，最后一条消息不被输入栏遮挡', () => {
      expect(liaoTianYeMianYuanMa).toMatch(/\.xiaoxi-quyu\s*\{[^}]*padding-bottom:\s*\d+px/)
      expect(liaoTianYeMianYuanMa).toMatch(/\.xiaoxi-quyu\s*\{[^}]*scroll-padding-bottom:\s*\d+px/)
    })
    it('底部边界空隙与消息间空隙保持一致（单一起源：滚动容器不得叠加额外底部内边距）', () => {
      // 根因回归：纵向节奏只允许一个来源。若滚动容器再声明非零 padding-bottom，
      // 会与最后一条消息的 margin-bottom 叠加成 36px 失真间距，底部空隙将远超消息间 16px 空隙。
      // 因此容器底部内边距必须归零，让最后一条消息的 margin-bottom 充当与底部边界的唯一间距。
      expect(liaoTianYeMianYuanMa).toContain('padding-bottom: 0')
      // 消息自身仍保留标准 16px 纵向节奏，作为消息间与到底部边界的统一间距来源
      expect(liaoTianYeMianYuanMa).toContain('margin-bottom: 16px')
    })

    it('底部输入栏适配安全区域，padding-bottom包含安全区域变量', () => {
      expect(liaoTianYeMianYuanMa).toMatch(
        /\.weixin-shuru\s*\{[^}]*padding-bottom:\s*calc\([^)]*var\(--anquan-quyu-xia\)/,
      )
    })

    it('输入框聚焦时滚动消息区到底部避免新消息被键盘遮挡', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      const xiaoxiQuyu = wrapper.find('.xiaoxi-quyu').element as HTMLElement
      Object.defineProperty(xiaoxiQuyu, 'scrollHeight', { value: 1000, configurable: true })

      await wrapper.find('.shuru-kuang').trigger('focus')
      await flushPromises()
      await vi.advanceTimersByTimeAsync(100)
      await flushPromises()

      expect(xiaoxiQuyu.scrollTop).toBe(1000)
    })

    it('emoji面板展开时不为消息区域额外增加底部内边距（由 grid 布局处理间距，消除空白）', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      const xiaoXiQuYu = wrapper.find('.xiaoxi-quyu')

      // 已彻底移除：类绑定、补偿变量、补偿样式
      expect(liaoTianYeMianYuanMa).not.toMatch(/emoji-mianban-zhankai/)
      expect(liaoTianYeMianYuanMa).not.toMatch(/--emoji-mianban-bu-ju-gao-du/)
      expect(liaoTianYeMianYuanMa).not.toMatch(
        /\.xiaoxi-quyu\.emoji-mianban-zhankai\s*\{[^}]*padding-bottom/,
      )
      // 消息区仍保留基础底部内边距（最后一条消息不被输入栏遮挡）
      expect(liaoTianYeMianYuanMa).toMatch(/\.xiaoxi-quyu\s*\{[^}]*padding-bottom:\s*\d+px/)

      // 点击表情按钮后，面板正常展开（由 emojiMianBanZhanKai 驱动，而非 xiaoxi-quyu 类）
      await wrapper.find('.emoji-anniu').trigger('click')
      await flushPromises()
      expect(wrapper.find('.emoji-mianban').exists()).toBe(true)
    })

    it('注册visualViewport的resize与scroll事件监听软键盘变化', () => {
      expect(appYuanMa).toMatch(
        /visualViewport\.addEventListener\('resize',\s*gengXinShiJiaoKouGaoDu\)/,
      )
      expect(appYuanMa).toMatch(
        /visualViewport\.addEventListener\('scroll',\s*gengXinShiJiaoKouGaoDu\)/,
      )
      expect(appYuanMa).toMatch(
        /visualViewport\.removeEventListener\('resize',\s*gengXinShiJiaoKouGaoDu\)/,
      )
      expect(appYuanMa).toMatch(
        /visualViewport\.removeEventListener\('scroll',\s*gengXinShiJiaoKouGaoDu\)/,
      )
    })

    it('App.vue 使用 dvh 高度并为主内容区预留安全区域与顶部栏空间', () => {
      expect(appYuanMa).toMatch(/\.app-rongqi\s*\{[^}]*height:\s*100dvh/)
      expect(appYuanMa).toMatch(/\.app-rongqi\s*\{[^}]*overflow:\s*hidden/)
      expect(appYuanMa).toMatch(/\.app-rongqi\s*\{[^}]*display:\s*flex/)
      expect(appYuanMa).toMatch(/\.app-rongqi\s*\{[^}]*flex-direction:\s*column/)
      expect(appYuanMa).toMatch(/\.app-zhuti\s*\{[^}]*flex:\s*1/)
      expect(appYuanMa).not.toMatch(/\.app-zhuti\s*\{[^}]*margin-top:/)
    })

    it('App.vue 容器高度采用三层 fallback 兼容旧版 iOS Safari 与 Android Chrome', () => {
      expect(appYuanMa).toMatch(/\.app-rongqi\s*\{[^}]*height:\s*100vh/)
      expect(appYuanMa).toMatch(/\.app-rongqi\s*\{[^}]*height:\s*100dvh/)
      expect(appYuanMa).toMatch(
        /\.app-rongqi\s*\{[^}]*height:\s*var\(--shi-jiao-kou-gao-du,\s*100dvh\)/,
      )
      expect(appYuanMa).not.toMatch(/\.app-rongqi\s*\{[^}]*min-height:\s*100dvh/)
    })

    it('App.vue 动态更新 --shi-jiao-kou-gao-du CSS 变量驱动视口高度', () => {
      expect(appYuanMa).toMatch(
        /document\.documentElement\.style\.setProperty\('--shi-jiao-kou-gao-du',\s*`\$\{gaoDu\}px`\)/,
      )
      expect(appYuanMa).toMatch(/window\.visualViewport\.height/)
    })

    it('全局菜单栏高度计算包含顶部安全区域，避免刘海屏压缩菜单内容', () => {
      const quanJuCaiDanLuJing = resolve(__dirname, '../components/全局菜单.vue')
      const quanJuCaiDanYuanMa = readFileSync(quanJuCaiDanLuJing, 'utf8')
      expect(quanJuCaiDanYuanMa).toMatch(
        /height:\s*calc\(\s*52px\s*\+\s*var\(--anquan-quyu-shang\)\s*\)/,
      )
      expect(quanJuCaiDanYuanMa).toMatch(/padding-top:\s*var\(--anquan-quyu-shang\)/)
    })

    it('聊天页面容器占满父级高度并禁止页面级滚动', () => {
      expect(liaoTianYeMianYuanMa).toMatch(/\.liaotian-yemian\s*\{[^}]*height:\s*100%/)
      expect(liaoTianYeMianYuanMa).toMatch(/\.liaotian-yemian\s*\{[^}]*overflow:\s*hidden/)
    })

    it('打开 emoji 面板时不再为消息区域增加底部内边距（消除空白，最后一条消息仍可见可达）', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      const xiaoxiQuyu = wrapper.find('.xiaoxi-quyu')
      expect(xiaoxiQuyu.classes()).not.toContain('emoji-mianban-zhankai')

      await wrapper.find('.emoji-anniu').trigger('click')
      await flushPromises()

      // 类绑定已移除，不再为 .xiaoxi-quyu 添加额外内边距类
      expect(wrapper.find('.xiaoxi-quyu').classes()).not.toContain('emoji-mianban-zhankai')
      // 旧补偿样式已彻底删除
      expect(liaoTianYeMianYuanMa).not.toMatch(/--emoji-mianban-bu-ju-gao-du/)
      expect(liaoTianYeMianYuanMa).not.toMatch(
        /\.xiaoxi-quyu\.emoji-mianban-zhankai\s*\{[^}]*padding-bottom/,
      )
      // 面板仍正常展开
      expect(wrapper.find('.emoji-mianban').exists()).toBe(true)
    })

    it('监听 visualViewport scroll 与 resize 事件以响应软键盘变化', () => {
      const resizeCount = (appYuanMa.match(/visualViewport\.addEventListener\('resize'/g) || [])
        .length
      const scrollCount = (appYuanMa.match(/visualViewport\.addEventListener\('scroll'/g) || [])
        .length
      expect(resizeCount).toBeGreaterThanOrEqual(1)
      expect(scrollCount).toBeGreaterThanOrEqual(1)
    })
  })
})

describe('FP-01 聊天输入字数统计常驻显示与右侧定位', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('空输入框时常驻显示字数统计 0/500', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    await flushPromises()

    const jiShi = wrapper.find('.shuru-dibu-hang .zifu-jishu')
    expect(jiShi.exists()).toBe(true)
    expect(jiShi.text()).toBe(`0/${XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu}`)
  })

  it('输入字符数小于阈值时常驻显示字数统计', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')
    const duanNeiRong = 'a'.repeat(XIAO_XI_PEI_ZHI.ziFuTongJiXianShiYuZhi - 1)

    await shuRuKuang.setValue(duanNeiRong)
    await flushPromises()

    const jiShi = wrapper.find('.shuru-dibu-hang .zifu-jishu')
    expect(jiShi.exists()).toBe(true)
    expect(jiShi.text()).toBe(
      `${XIAO_XI_PEI_ZHI.ziFuTongJiXianShiYuZhi - 1}/${XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu}`,
    )
  })

  it('输入字符数达到阈值时显示字数统计', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')
    const changNeiRong = 'a'.repeat(XIAO_XI_PEI_ZHI.ziFuTongJiXianShiYuZhi)

    await shuRuKuang.setValue(changNeiRong)
    await flushPromises()

    const jiShi = wrapper.find('.shuru-dibu-hang .zifu-jishu')
    expect(jiShi.exists()).toBe(true)
    expect(jiShi.text()).toBe(
      `${XIAO_XI_PEI_ZHI.ziFuTongJiXianShiYuZhi}/${XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu}`,
    )
  })

  it('字数统计位于输入框之外、表情按钮之前', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')
    const changNeiRong = 'a'.repeat(XIAO_XI_PEI_ZHI.ziFuTongJiXianZhiYuZhi)

    await shuRuKuang.setValue(changNeiRong)
    await flushPromises()

    const rongQi = wrapper.find('.shuru-rongqi')
    const waiKe = rongQi.find('.shuru-kuang-waike')
    const dibuHang = rongQi.find('.shuru-dibu-hang')
    const biaoQing = rongQi.find('.biaoqing-anniu')

    // 字数统计位于输入框之外（在底部行内），不在输入框容器内
    expect(dibuHang.find('.zifu-jishu').exists()).toBe(true)
    expect(waiKe.find('.zifu-jishu').exists()).toBe(false)

    // 底部行位于输入框之后、表情按钮之前，保证整行只有一行
    const rongQiHaiZi = Array.from(rongQi.element.children)
    const waiKeIndex = rongQiHaiZi.indexOf(waiKe.element)
    const dibuHangIndex = rongQiHaiZi.indexOf(dibuHang.element)
    const biaoQingIndex = rongQiHaiZi.indexOf(biaoQing.element)
    expect(waiKeIndex).toBeGreaterThanOrEqual(0)
    expect(dibuHangIndex).toBeGreaterThan(waiKeIndex)
    expect(biaoQingIndex).toBeGreaterThan(dibuHangIndex)
  })

  it('超出最大长度时计数器应用错误样式', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')
    const chaoChuNeiRong = 'a'.repeat(XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu + 1)

    await shuRuKuang.setValue(chaoChuNeiRong)
    await flushPromises()

    const jiShi = wrapper.find('.shuru-dibu-hang .zifu-jishu')
    expect(jiShi.exists()).toBe(true)
    expect(jiShi.classes()).toContain('zifu-chaochu')
  })

  it('字数统计显示时不影响表情、告白、发送按钮', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')
    const changNeiRong = 'a'.repeat(XIAO_XI_PEI_ZHI.ziFuTongJiXianShiYuZhi)

    await shuRuKuang.setValue(changNeiRong)
    await flushPromises()

    expect(wrapper.find('.shuru-dibu-hang .zifu-jishu').exists()).toBe(true)
    expect(wrapper.find('.emoji-anniu').exists()).toBe(true)
    expect(wrapper.find('.gaobai-anniu').exists()).toBe(true)
    expect(wrapper.find('.fasong-anniu').exists()).toBe(true)
  })

  it('原输入框下方辅助区域不再显示字数统计', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')
    const changNeiRong = 'a'.repeat(XIAO_XI_PEI_ZHI.ziFuTongJiXianShiYuZhi)

    await shuRuKuang.setValue(changNeiRong)
    await flushPromises()

    const fuZhuQuYu = wrapper.find('.shuru-fu-zhu')
    expect(fuZhuQuYu.exists()).toBe(false)
  })
})

describe('FP-02 聊天输入多行展开/折叠', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('输入框为 textarea 且保持 maxlength=500', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')
    expect(shuRuKuang.element.tagName).toBe('TEXTAREA')
    expect(shuRuKuang.attributes('maxlength')).toBe(String(XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu))
  })

  it('Enter 键发送消息', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')
    await shuRuKuang.setValue('测试消息')
    await shuRuKuang.trigger('keydown.enter')
    await flushPromises()
    expect((shuRuKuang.element as HTMLTextAreaElement).value).toBe('')
  })

  it('Shift+Enter 不发送消息', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')
    await shuRuKuang.setValue('测试消息')
    await shuRuKuang.trigger('keydown.enter.shift')
    await flushPromises()
    expect((shuRuKuang.element as HTMLTextAreaElement).value).toBe('测试消息')
  })

  it('单行输入时展开按钮常驻显示但 disabled', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')
    await shuRuKuang.setValue('短消息')
    await flushPromises()
    const zhanKaiAnNiu = wrapper.find('.zhan-kai-anniu')
    expect(zhanKaiAnNiu.exists()).toBe(true)
    expect(zhanKaiAnNiu.attributes('disabled')).toBeDefined()
  })

  it('空输入框时展开按钮常驻显示且 disabled', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    await flushPromises()
    const zhanKaiAnNiu = wrapper.find('.zhan-kai-anniu')
    expect(zhanKaiAnNiu.exists()).toBe(true)
    expect(zhanKaiAnNiu.attributes('disabled')).toBeDefined()
  })

  it('多行输入时显示展开按钮且可点击', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')

    vi.spyOn(shuRuKuang.element, 'scrollHeight', 'get').mockReturnValue(60)
    vi.spyOn(shuRuKuang.element, 'clientHeight', 'get').mockReturnValue(38)

    await shuRuKuang.setValue('这是一段比较长的消息内容，应该会折行显示展开按钮')
    await flushPromises()

    const zhanKaiAnNiu = wrapper.find('.zhan-kai-anniu')
    expect(zhanKaiAnNiu.exists()).toBe(true)
    expect(zhanKaiAnNiu.attributes('disabled')).toBeUndefined()
  })

  it('点击展开按钮后输入框添加展开类', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')

    vi.spyOn(shuRuKuang.element, 'scrollHeight', 'get').mockReturnValue(60)
    vi.spyOn(shuRuKuang.element, 'clientHeight', 'get').mockReturnValue(38)

    await shuRuKuang.setValue('这是一段比较长的消息内容')
    await flushPromises()

    await wrapper.find('.zhan-kai-anniu').trigger('click')
    await flushPromises()

    expect(shuRuKuang.classes()).toContain('zhan-kai')
  })

  it('展开按钮位于字数统计之后且在输入栏右侧', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')
    const changNeiRong = 'a'.repeat(XIAO_XI_PEI_ZHI.ziFuTongJiXianShiYuZhi)

    vi.spyOn(shuRuKuang.element, 'scrollHeight', 'get').mockReturnValue(60)
    vi.spyOn(shuRuKuang.element, 'clientHeight', 'get').mockReturnValue(38)

    await shuRuKuang.setValue(changNeiRong)
    await flushPromises()

    const dibuHang = wrapper.find('.shuru-dibu-hang')
    const zhanKaiAnNiu = dibuHang.find('.zhan-kai-anniu')
    const ziFuJiShu = dibuHang.find('.zifu-jishu')
    expect(zhanKaiAnNiu.exists()).toBe(true)
    expect(ziFuJiShu.exists()).toBe(true)

    const zhanKaiIndex = Array.from(dibuHang.element.children).indexOf(zhanKaiAnNiu.element)
    const ziFuJiShuIndex = Array.from(dibuHang.element.children).indexOf(ziFuJiShu.element)
    // 展开按钮在字数统计之后
    expect(zhanKaiIndex).toBeGreaterThan(ziFuJiShuIndex)
  })

  it('发送后输入框清空并折叠', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')

    const scrollSpy = vi.spyOn(shuRuKuang.element, 'scrollHeight', 'get').mockReturnValue(60)
    vi.spyOn(shuRuKuang.element, 'clientHeight', 'get').mockReturnValue(38)

    await shuRuKuang.setValue('测试消息\n第二行')
    await wrapper.find('.zhan-kai-anniu').trigger('click')
    await flushPromises()

    expect(shuRuKuang.classes()).toContain('zhan-kai')

    // 发送前：内容将清空，高度回落单行（mock 反映清空后内容）
    scrollSpy.mockReturnValue(38)
    await wrapper.find('.fasong-anniu').trigger('click')
    await flushPromises()

    expect((shuRuKuang.element as HTMLTextAreaElement).value).toBe('')
    expect(shuRuKuang.classes()).not.toContain('zhan-kai')
    const zhanKaiAnNiu = wrapper.find('.zhan-kai-anniu')
    expect(zhanKaiAnNiu.exists()).toBe(true)
    expect(zhanKaiAnNiu.attributes('disabled')).toBeDefined()
  })
})

describe('FP-02b 输入框声明式高度与滚动条', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  function jiShuYuDanXingKuang(wrapper: any, scroll: number, client: number) {
    const shuRuKuang = wrapper.find('.shuru-kuang')
    vi.spyOn(shuRuKuang.element, 'scrollHeight', 'get').mockReturnValue(scroll)
    vi.spyOn(shuRuKuang.element, 'clientHeight', 'get').mockReturnValue(client)
    return shuRuKuang
  }

  function yangShiShuXing(yangShi: string): string[] {
    return yangShi
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.split(':')[0].trim())
  }

  it('折叠态单行：仅绑定 max-height 单行高度、展开按钮隐藏、无 height 绑定', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = jiShuYuDanXingKuang(wrapper, 38, 38)
    await shuRuKuang.setValue('短')
    await flushPromises()

    const shuXing = yangShiShuXing(shuRuKuang.attributes('style') || '')
    expect(shuXing).toContain('max-height')
    expect(shuXing).not.toContain('height')
    expect(wrapper.find('.zhan-kai-anniu').attributes('disabled')).toBeDefined()
  })

  it('折叠态多行：展开按钮可点击、max-height 仍为精确单行高度', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = jiShuYuDanXingKuang(wrapper, 60, 38)
    await shuRuKuang.setValue('这是一段比较长的消息内容，应该会折行显示展开按钮')
    await flushPromises()

    expect(wrapper.find('.zhan-kai-anniu').attributes('disabled')).toBeUndefined()
    expect(shuRuKuang.attributes('style')).toContain('max-height: 38px')
  })

  it('展开态：height = min(内容高度, 50vh)，max-height = 50vh', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = jiShuYuDanXingKuang(wrapper, 60, 38)
    await shuRuKuang.setValue('这是一段比较长的消息内容')
    await flushPromises()

    await wrapper.find('.zhan-kai-anniu').trigger('click')
    await flushPromises()

    const qiShiVh = Math.round(window.innerHeight * 0.5)
    const qiWangHeight = Math.min(60, qiShiVh)
    const yangShi = shuRuKuang.attributes('style') || ''
    expect(yangShi).toContain(`height: ${qiWangHeight}px`)
    expect(yangShi).toContain(`max-height: ${qiShiVh}px`)
  })

  it('清空内容后：折叠回单行、展开按钮隐藏、max-height 回到单行', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = jiShuYuDanXingKuang(wrapper, 60, 38)
    await shuRuKuang.setValue('测试消息\n第二行')
    await wrapper.find('.zhan-kai-anniu').trigger('click')
    await flushPromises()
    expect(shuRuKuang.classes()).toContain('zhan-kai')

    const scrollSpy = vi.spyOn(shuRuKuang.element, 'scrollHeight', 'get')
    scrollSpy.mockReturnValue(38)
    await wrapper.find('.fasong-anniu').trigger('click')
    await flushPromises()

    expect((shuRuKuang.element as HTMLTextAreaElement).value).toBe('')
    expect(shuRuKuang.classes()).not.toContain('zhan-kai')
    expect(wrapper.find('.zhan-kai-anniu').attributes('disabled')).toBeDefined()
    expect(shuRuKuang.attributes('style')).toContain('max-height: 38px')
  })

  it('输入框折叠态隐藏滚动条但保留滚轮、展开态出现可见滚动条', () => {
    // 折叠态：overflow-y:auto，隐藏滚动条（scrollbar-width:none + webkit 宽 0、display:none），保留滚轮滚动
    expect(liaoTianYeMianYuanMa).toMatch(/\.shuru-kuang\s*\{[^}]*overflow-y:\s*auto/)
    expect(liaoTianYeMianYuanMa).toMatch(/\.shuru-kuang\s*\{[^}]*scrollbar-width:\s*none/)
    expect(liaoTianYeMianYuanMa).toMatch(/\.shuru-kuang\s*\{[^}]*padding:\s*6px\s*12px/)
    expect(liaoTianYeMianYuanMa).toMatch(/\.shuru-kuang::-webkit-scrollbar\s*\{[^}]*width:\s*0/)
    // 展开态（.zhan-kai）：出现可见滚动条
    expect(liaoTianYeMianYuanMa).toMatch(/\.shuru-kuang\.zhan-kai\s*\{[^}]*scrollbar-width:\s*auto/)
    expect(liaoTianYeMianYuanMa).toMatch(
      /\.shuru-kuang\.zhan-kai::-webkit-scrollbar\s*\{[^}]*width:\s*6px/,
    )
    expect(liaoTianYeMianYuanMa).toMatch(
      /\.shuru-kuang\.zhan-kai::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*var\(--shuru-kuang-gundong-tiao\)/,
    )
    expect(liaoTianYeMianYuanMa).toMatch(
      /\.shuru-kuang\.zhan-kai::-webkit-scrollbar-thumb\s*\{[^}]*border-radius:\s*3px/,
    )
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
    expect(appYuanMa).toContain(':include="[\'liaoTian\']"')
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

describe('FP-06 复盘展示', () => {
  const jiShu = 1700000000000

  const ceShiXiaoXiLieBiao = [
    {
      id: 'x3',
      hui_hua_id: 'h1',
      fa_song_zhe_id: 'j1',
      fa_song_zhe_lei_xing: 'jiaose',
      nei_rong: '今天天气不错',
      lei_xing: 'wenben',
      shi_jian_chuo: jiShu + 60000,
      yi_du: true,
    },
    {
      id: 'x2',
      hui_hua_id: 'h1',
      fa_song_zhe_id: 'u1',
      fa_song_zhe_lei_xing: 'yonghu',
      nei_rong: '你好呀',
      lei_xing: 'wenben',
      shi_jian_chuo: jiShu + 30000,
      yi_du: true,
    },
    {
      id: 'x1',
      hui_hua_id: 'h1',
      fa_song_zhe_id: 'j1',
      fa_song_zhe_lei_xing: 'jiaose',
      nei_rong: '嗨，我是林嵩序',
      lei_xing: 'wenben',
      shi_jian_chuo: jiShu,
      yi_du: true,
    },
  ]

  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(huoQuXiaoXi).mockReset()
    vi.mocked(huoQuFuPan).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  async function mountFuPanYeMian(
    options: {
      xiaoXiLieBiao?: typeof ceShiXiaoXiLieBiao
      fuPanNeiRong?: string | null
      fuPanPiZhu?: Array<{ xu_hao: number; ping_lun: string; qing_gan?: string }> | null
    } = {},
  ) {
    const xiaoXiLieBiao = options.xiaoXiLieBiao ?? ceShiXiaoXiLieBiao
    vi.mocked(huoQuXiaoXi).mockResolvedValue({
      lie_biao: xiaoXiLieBiao,
      zong_shu: xiaoXiLieBiao.length,
    })
    vi.mocked(huoQuFuPan).mockResolvedValue({
      fu_pan_nei_rong: options.fuPanNeiRong ?? null,
      fu_pan_shi_jian_xian: [],
      fu_pan_pi_zhu: options.fuPanPiZhu ?? null,
      jun_shi_zhi_dao_ji_lu: [],
      guan_jian_shi_jian: [],
      jia_zai_zhong: false,
    })

    const luYou = chuangJianLuYou()
    await luYou.push('/chat/h1?fuPan=1&dangAnId=d1')
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
      ming_zi: '林嵩序',
      wei_xin_ming: '嵩序',
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

  it('复盘模式开场白消息可见', async () => {
    const { wrapper } = await mountFuPanYeMian()
    await flushPromises()

    const jiaoSeXiaoXi = wrapper.findAll('.jiaose-xiaoxi')
    expect(jiaoSeXiaoXi.length).toBeGreaterThanOrEqual(1)
    expect(wrapper.text()).toContain('嗨，我是林嵩序')
  })

  it('复盘模式用户第一句话可见', async () => {
    const { wrapper } = await mountFuPanYeMian()
    await flushPromises()

    const yongHuXiaoXi = wrapper.findAll('.yonghu-xiaoxi')
    expect(yongHuXiaoXi.length).toBeGreaterThanOrEqual(1)
    expect(wrapper.text()).toContain('你好呀')
  })

  it('复盘 zong_jie 对象格式分块展示且渣型高亮', async () => {
    const { wrapper } = await mountFuPanYeMian({
      fuPanNeiRong:
        '对象类型：渣型\n用户表现：过于信任对方的话术\n关键转折点：第三次对话时未能识破矛盾\n改进建议：保持警觉，注意细节矛盾',
    })
    await flushPromises()

    const fenKuai = wrapper.findAll('.fupan-zongjie-fenkuai')
    expect(fenKuai.length).toBe(4)

    expect(fenKuai[0].classes()).toContain('jinggao-fenkuai')
    expect(fenKuai[0].text()).toContain(huoQuFanYi('zhanJi', 'duiXiangLeiXing'))
    expect(fenKuai[0].text()).toContain(huoQuFanYi('zhanJi', 'zhaXing'))
    expect(fenKuai[0].find('.jinggao-tubiao').exists()).toBe(true)

    expect(fenKuai[1].text()).toContain(huoQuFanYi('zhanJi', 'yongHuBiaoXian'))
    expect(fenKuai[2].text()).toContain(huoQuFanYi('zhanJi', 'guanJianZhuanZheDian'))
    expect(fenKuai[3].text()).toContain(huoQuFanYi('zhanJi', 'gaiJinJianYi'))

    expect(wrapper.find('.fupan-zongjie-jinggao-tishi').exists()).toBe(true)
    expect(wrapper.find('.fupan-zongjie-jinggao-tishi').text()).toBe(
      huoQuFanYi('zhanJi', 'zhaXingJingGao'),
    )
  })

  it('复盘 zong_jie 字符串格式兼容显示', async () => {
    const { wrapper } = await mountFuPanYeMian({
      fuPanNeiRong: '整体表现不错，建议继续保持自然节奏，像朋友复盘吐槽一样。',
    })
    await flushPromises()

    expect(wrapper.find('.fupan-zongjie-neirong').exists()).toBe(true)
    expect(wrapper.find('.fupan-zongjie-fenkuai').exists()).toBe(false)
    expect(wrapper.find('.fupan-zongjie-neirong').text()).toBe(
      '整体表现不错，建议继续保持自然节奏，像朋友复盘吐槽一样。',
    )
  })

  it('复盘 pi_zhu 三色情感标签正常显示', async () => {
    const { wrapper } = await mountFuPanYeMian({
      fuPanNeiRong: '整体表现需要改进。',
      fuPanPiZhu: [
        { xu_hao: 1, ping_lun: '开场挺自然的', qing_gan: 'positive' },
        { xu_hao: 2, ping_lun: '回应有点急了', qing_gan: 'negative' },
        { xu_hao: 3, ping_lun: '天气话题安全', qing_gan: 'neutral' },
      ],
    })
    await flushPromises()

    const piZhuXiangMu = wrapper.findAll('.fupan-pizhu-xiangmu')
    expect(piZhuXiangMu.length).toBe(3)

    expect(piZhuXiangMu[0].classes()).toContain('pizhu-positive')
    expect(piZhuXiangMu[0].find('.fupan-pizhu-neirong').text()).toBe('开场挺自然的')

    expect(piZhuXiangMu[1].classes()).toContain('pizhu-negative')
    expect(piZhuXiangMu[1].find('.fupan-pizhu-neirong').text()).toBe('回应有点急了')

    expect(piZhuXiangMu[2].classes()).toContain('pizhu-neutral')
    expect(piZhuXiangMu[2].find('.fupan-pizhu-neirong').text()).toBe('天气话题安全')
  })

  it('复盘 pi_zhu 缺失 qing_gan 字段时默认中性灰色', async () => {
    const { wrapper } = await mountFuPanYeMian({
      fuPanNeiRong: '整体表现需要改进。',
      fuPanPiZhu: [{ xu_hao: 1, ping_lun: '无情感字段的批注' }],
    })
    await flushPromises()

    const piZhuXiangMu = wrapper.findAll('.fupan-pizhu-xiangmu')
    expect(piZhuXiangMu.length).toBe(1)
    expect(piZhuXiangMu[0].classes()).toContain('pizhu-neutral')
  })
})
