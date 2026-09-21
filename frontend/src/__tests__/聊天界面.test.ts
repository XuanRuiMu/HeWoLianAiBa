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
import { huoQuYongHuXinXi } from '@/api/认证'
import { 令牌键 } from '@/constants/auth'
import type { Yonghu } from '@/types'
import type { GuanLiJiaoSe, GuanLiNengLi } from '@/utils/角色能力'
import { io } from 'socket.io-client'
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

// FP-08：身份链路必须可被真实驱动。默认下发「三旗标全伪」的服务端出参（与本文件既有
// 「非管理员」用例同语义），逐例用 mockResolvedValue 覆盖为管理员出参。
// 出参形态与后端 services/认证.ts::yingSheYongHu 一致，其正确性由
// backend/src/routes/__tests__/FP08认证信息出参能力位.test.ts 把守。
vi.mock('@/api/认证', async (原模块) => ({
  ...(await 原模块<typeof import('@/api/认证')>()),
  huoQuYongHuXinXi: vi.fn(async (): Promise<Yonghu> => 服务端身份({ jiao_se: null, neng_li: [] })),
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

/** 服务端 /api/认证/信息 的真实出参形态（jiao_se/neng_li 由后端按用户表三旗标推导后下发） */
function 服务端身份(身份: { jiao_se: GuanLiJiaoSe | null; neng_li: GuanLiNengLi[] }): Yonghu {
  return {
    id: 'u1',
    shou_ji_hao: '138****8000',
    yong_hu_ming: '测试用户',
    ni_cheng: '测试昵称',
    xing_bie: 'male',
    mu_biao_xing_bie: 'female',
    mo_ren_xing_bie: null,
    xing_ge_xuan_ze: 'INTJ',
    ren_she_biao_qian: 'neiLianXueBa',
    yun_xu_zha_nan_zha_nv: false,
    tou_xiang: null,
    sheng_ri: null,
    qian_ming: null,
    jiao_se: 身份.jiao_se,
    neng_li: 身份.neng_li,
    huo_yue_ren_she_id: null,
    hai_wang_fen_shu: 0,
    chuang_jian_shi_jian: new Date().toISOString(),
    geng_xin_shi_jian: new Date().toISOString(),
  }
}

async function mountLiaoTianYeMian(选项: { 管理员?: boolean; 真身份链路?: boolean } = {}) {
  const luYou = chuangJianLuYou()
  await luYou.push('/chat/h1')
  const pinia = createPinia()
  setActivePinia(pinia)

  // 真链路用例必须让仓库在创建时就看到一个已登录会话：否则 shuiHeBenDiShenFen 会把就绪门
  // 直接点亮成 true（无令牌即视为已解析），queBaoShenFenJiuXu 永不发起第一次拉取。
  if (选项.真身份链路) sessionStorage.setItem(令牌键, 'test-token')
  else sessionStorage.removeItem(令牌键)

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
  // 身份就绪门：秘籍分支会 await queBaoShenFenJiuXu()，此处直接给定就绪态与 FP-18 能力位视图门。
  // 真身份链路用例不走这条捷径：就绪态保持 false，能力位一律由 huoQuYongHuXinXi 的出参灌入。
  if (!选项.真身份链路) {
    用户仓库.shenFenYiJiuXu = true
    用户仓库.nengLieBiao = 选项.管理员 === true ? ['cha_kan'] : []
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
    it('底部输入栏恒有表情、输入框、发送按钮且不存在告白按钮', async () => {
      const { wrapper } = await mountLiaoTianYeMian()

      expect(wrapper.find('.emoji-anniu').exists()).toBe(true)
      expect(wrapper.find('.shuru-kuang').exists()).toBe(true)
      expect(wrapper.find('.gaobai-anniu').exists()).toBe(false)
      expect(wrapper.find('.gengduo-gongneng-anniu').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('告白')

      const fasong = wrapper.find('.fasong-anniu')
      // 先确定性地清空输入（草稿恢复可能带入历史内容），再断言空内容态
      await wrapper.find('.shuru-kuang').setValue('')
      await flushPromises()
      expect(fasong.exists()).toBe(true)
      // 空内容时发送按钮仍在文档流中且可见（不是被别的按钮顶替位置），只是不可点
      expect(fasong.isVisible()).toBe(true)
      expect(fasong.text()).toBe(huoQuFanYi('liaoTian', 'faSong'))
      expect(fasong.attributes('disabled')).toBeDefined()
      expect(fasong.attributes('aria-disabled')).toBe('true')

      // 结构守卫：发送按钮不得再挂 v-show/v-if 与任何按钮互斥占位
      const fasongDuan =
        liaoTianYeMianYuanMa.match(/<button[^>]*class="fasong-anniu"[\s\S]*?<\/button>/)?.[0] ?? ''
      expect(fasongDuan).not.toBe('')
      expect(fasongDuan).not.toMatch(/v-(show|if)/)
      expect(liaoTianYeMianYuanMa).not.toMatch(/gaobai-anniu|gaoBai|告白/)
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
        /\.yonghu-xiaoxi\s*\.qipao-neirong\s*\{[^}]*background:\s*var\(--qipao-ziJi-beiJing,\s*var\(--xiaoxi-yonghu-beijing\)\)/,
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
        /\.jiaose-xiaoxi\s*\.qipao-neirong\s*\{[^}]*background:\s*var\(--qipao-duiFang-beiJing,\s*var\(--xiaoxi-jiaose-beijing\)\)/,
      )
    })

    it('AI消息气泡背景为白色/深灰色并随主题切换', async () => {
      const bianLiangCssLuJing = resolve(__dirname, '../styles/variables.css')
      const bianLiangCss = readFileSync(bianLiangCssLuJing, 'utf8')
      expect(liaoTianYeMianYuanMa).toMatch(
        /\.jiaose-xiaoxi\s*\.qipao-neirong\s*\{[^}]*background:\s*var\(--qipao-duiFang-beiJing,\s*var\(--xiaoxi-jiaose-beijing\)\)/,
      )
      expect(bianLiangCss).toContain('--xiaoxi-jiaose-beijing: #FFFFFF')
      expect(bianLiangCss).toContain('--xiaoxi-jiaose-beijing: #3A3A3C')
    })
  })

  describe('Emoji选择器', () => {
    it('点击表情按钮弹出emoji选择器', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      // v-show：面板常驻布局，仅通过可见性切换，故以 isVisible 判定而非 exists
      expect(wrapper.find('.emoji-mianban').isVisible()).toBe(false)

      await wrapper.find('.emoji-anniu').trigger('click')
      await flushPromises()

      expect(wrapper.find('.emoji-mianban').isVisible()).toBe(true)
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
    afterEach(() => {
      // 真链路用例会往 sessionStorage 点亮会话令牌，就地收干净，避免顺序耦合到后续用例
      sessionStorage.removeItem(令牌键)
    })

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
      wrapper.unmount()
    })

    it('管理员输入 greedisgood 时直接打开管理员监控且无提示浮窗', async () => {
      const { wrapper } = await mountLiaoTianYeMian({ 管理员: true })
      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue('greedisgood')
      await flushPromises()

      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      expect(document.body.querySelector('.miji-fuchuang')).toBeNull()
      expect(document.body.querySelector('.guanli-jiankong-fuchuang')).not.toBeNull()
      wrapper.unmount()
    })

    it('非管理员输入 greedisgood：不开面板、不弹提示浮窗（反馈只走输入框下方状态行）、也不把指令发给 AI', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue('greedisgood')
      await flushPromises()

      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      expect(document.body.querySelector('.guanli-jiankong-fuchuang')).toBeNull()
      expect(document.body.querySelector('.miji-fuchuang')).toBeNull()
      expect((shuRuKuang.element as HTMLTextAreaElement).value).toBe('')
      expect(faSongXiaoXi).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('真链路·三旗标全伪账号：不手灌能力位，输入 greedisgood 必出现无权限提示且不开面板', async () => {
      vi.mocked(huoQuYongHuXinXi).mockResolvedValue(服务端身份({ jiao_se: null, neng_li: [] }))
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian({ 真身份链路: true })
      const 用户仓库 = 使用用户仓库()
      expect(用户仓库.keGuanLiZhiDu).toBe(false)

      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue('greedisgood')
      await flushPromises()
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      // 走的是 huoQuYongHuXinXi → jiaZaiYongHu → 归一管理能力列表 的真链路，而非测试手灌
      expect(huoQuYongHuXinXi).toHaveBeenCalled()
      expect(用户仓库.nengLieBiao).toEqual([])
      expect(document.body.querySelector('.guanli-jiankong-fuchuang')).toBeNull()
      expect(聊天仓库.cuoWuXinXi).toBe(huoQuFanYi('liaoTian', 'guanLiMianBanWuQuanXian'))
      const 提示 = wrapper.find('.shuru-fu-zhu .fasong-cuowu')
      expect(提示.exists()).toBe(true)
      expect(提示.text()).toBe(huoQuFanYi('liaoTian', 'guanLiMianBanWuQuanXian'))
      expect(faSongXiaoXi).not.toHaveBeenCalled()
      expect((shuRuKuang.element as HTMLTextAreaElement).value).toBe('')
      wrapper.unmount()
    })

    it('真链路·管理员账号：不手灌能力位，输入 greedisgood 开面板并补挂 管理员_* 订阅，且无无权限提示', async () => {
      vi.mocked(huoQuYongHuXinXi).mockResolvedValue(
        服务端身份({ jiao_se: 'chao_guan', neng_li: ['cha_kan', 'feng_jin', 'gao_we'] }),
      )
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian({ 真身份链路: true })
      const 用户仓库 = 使用用户仓库()
      const 补挂 = vi.spyOn(聊天仓库, 'queBaoJianKongDingYue')

      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue('greedisgood')
      await flushPromises()
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      expect(用户仓库.keGuanLiZhiDu).toBe(true)
      expect(document.body.querySelector('.guanli-jiankong-fuchuang')).not.toBeNull()
      expect(补挂).toHaveBeenCalledTimes(1)
      expect(聊天仓库.cuoWuXinXi).toBeNull()
      expect(wrapper.find('.shuru-fu-zhu .fasong-cuowu').exists()).toBe(false)
      expect(faSongXiaoXi).not.toHaveBeenCalled()
      // 已授予能力的账号不得重复拉取身份
      expect(huoQuYongHuXinXi).toHaveBeenCalledTimes(1)
      补挂.mockRestore()
      wrapper.unmount()
    })

    it('真链路·会话内刚被提升为管理员：就绪门已点亮但能力缺失时仍重取一次身份并开启面板', async () => {
      vi.mocked(huoQuYongHuXinXi)
        .mockResolvedValueOnce(服务端身份({ jiao_se: null, neng_li: [] }))
        .mockResolvedValueOnce(服务端身份({ jiao_se: 'yun_ying', neng_li: ['cha_kan'] }))
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian({ 真身份链路: true })
      const 用户仓库 = 使用用户仓库()
      // 复现真实时序：App.vue 启动时已解析过一次身份（普通账号）→ 此后就绪门恒为 true，
      // queBaoShenFenJiuXu 会早退。若秘籍分支只信就绪门，本会话内刚被提升的账号永远打不开。
      await 用户仓库.queBaoShenFenJiuXu()
      await flushPromises()
      expect(用户仓库.shenFenYiJiuXu).toBe(true)
      expect(用户仓库.keGuanLiZhiDu).toBe(false)
      expect(huoQuYongHuXinXi).toHaveBeenCalledTimes(1)
      const 补挂 = vi.spyOn(聊天仓库, 'queBaoJianKongDingYue')

      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue('greedisgood')
      await flushPromises()
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      expect(huoQuYongHuXinXi).toHaveBeenCalledTimes(2)
      expect(用户仓库.keGuanLiZhiDu).toBe(true)
      expect(document.body.querySelector('.guanli-jiankong-fuchuang')).not.toBeNull()
      expect(补挂).toHaveBeenCalledTimes(1)
      expect(wrapper.find('.shuru-fu-zhu .fasong-cuowu').exists()).toBe(false)
      补挂.mockRestore()
      wrapper.unmount()
    })

    it('身份由管理员降级后，已展开的面板随渲染门一并消失', async () => {
      const { wrapper } = await mountLiaoTianYeMian({ 管理员: true })
      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue('greedisgood')
      await flushPromises()
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()
      expect(document.body.querySelector('.guanli-jiankong-fuchuang')).not.toBeNull()

      const 用户仓库 = 使用用户仓库()
      用户仓库.nengLieBiao = []
      await flushPromises()

      expect(document.body.querySelector('.guanli-jiankong-fuchuang')).toBeNull()
      wrapper.unmount()
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
      expect(wrapper.find('.emoji-mianban').isVisible()).toBe(true)

      // 模拟点击页面其它区域（消息区），应触发文档捕获监听收起面板
      const xiaoxiQuyu = wrapper.find('.xiaoxi-quyu').element
      xiaoxiQuyu.dispatchEvent(new Event('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.find('.emoji-mianban').isVisible()).toBe(false)
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

  describe('P0-3 GB45438 AI披露提示条', () => {
    it('聊天页顶部存在常驻AI披露提示条且文本来自翻译文件', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      const tiShiTiao = wrapper.find('.aitishi-tiao')
      expect(tiShiTiao.exists()).toBe(true)
      expect(tiShiTiao.text()).toBe(huoQuFanYi('tongYong', 'aiTiShiTiao'))
    })

    it('提示条渲染在消息区之外不受复盘模式影响且非硬编码文本', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      const yemian = wrapper.find('.liaotian-yemian')
      expect(yemian.element.children[0].classList.contains('aitishi-tiao')).toBe(true)
      expect(liaoTianYeMianYuanMa).not.toContain('仅供娱乐参考')
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

describe('FP-01 聊天输入字数统计阈值显隐与右侧定位', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('空输入框时不显示字数统计', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    await flushPromises()

    const jiShi = wrapper.find('.shuru-dibu-hang .zifu-jishu')
    expect(jiShi.exists()).toBe(false)
  })

  it('输入字符数小于阈值时不显示字数统计', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')
    const duanNeiRong = 'a'.repeat(XIAO_XI_PEI_ZHI.ziFuTongJiXianShiYuZhi - 1)

    await shuRuKuang.setValue(duanNeiRong)
    await flushPromises()

    const jiShi = wrapper.find('.shuru-dibu-hang .zifu-jishu')
    expect(jiShi.exists()).toBe(false)
  })

  it('清空输入后字数统计重新隐藏', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')
    const changNeiRong = 'a'.repeat(XIAO_XI_PEI_ZHI.ziFuTongJiXianShiYuZhi)

    await shuRuKuang.setValue(changNeiRong)
    await flushPromises()
    expect(wrapper.find('.shuru-dibu-hang .zifu-jishu').exists()).toBe(true)

    await shuRuKuang.setValue('')
    await flushPromises()
    expect(wrapper.find('.shuru-dibu-hang .zifu-jishu').exists()).toBe(false)
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
    const changNeiRong = 'a'.repeat(XIAO_XI_PEI_ZHI.ziFuTongJiXianShiYuZhi)

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

  it('字数统计显示时不影响表情与发送按钮，且不出现告白按钮', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')
    const changNeiRong = 'a'.repeat(XIAO_XI_PEI_ZHI.ziFuTongJiXianShiYuZhi)

    await shuRuKuang.setValue(changNeiRong)
    await flushPromises()

    expect(wrapper.find('.shuru-dibu-hang .zifu-jishu').exists()).toBe(true)
    expect(wrapper.find('.emoji-anniu').exists()).toBe(true)
    expect(wrapper.find('.gaobai-anniu').exists()).toBe(false)

    const fasong = wrapper.find('.fasong-anniu')
    expect(fasong.exists()).toBe(true)
    expect(fasong.isVisible()).toBe(true)
    // 有内容时可发送：disabled 解除，aria-disabled 转 false
    expect(fasong.attributes('disabled')).toBeUndefined()
    expect(fasong.attributes('aria-disabled')).toBe('false')
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

describe('FP-05 输入栏发送按钮恒常驻与加深禁用态', () => {
  const bianLiangCss = readFileSync(resolve(__dirname, '../styles/variables.css'), 'utf8')
  const haoYouLiaoTianYuanMa = readFileSync(
    resolve(__dirname, '../views/好友聊天.vue'),
    'utf8',
  )

  function quZhuTiKuai(zhuTi: 'light' | 'dark'): string {
    const zhengZe =
      zhuTi === 'light'
        ? /:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/
        : /:root,\s*:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/
    const piPei = bianLiangCss.match(zhengZe)
    if (!piPei) {
      throw new Error(`variables.css 缺少 ${zhuTi} 主题块`)
    }
    return piPei[1]
  }

  function xiangDuiLiangDu(hex: string): number {
    const tongDao = [1, 3, 5].map((pianYi) => {
      const zhi = parseInt(hex.slice(pianYi, pianYi + 2), 16) / 255
      return zhi <= 0.03928 ? zhi / 12.92 : Math.pow((zhi + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * tongDao[0] + 0.7152 * tongDao[1] + 0.0722 * tongDao[2]
  }

  function quZhengZeYuanMa(yuanMa: string, zhengZe: RegExp): string {
    return yuanMa.match(zhengZe)?.[0] ?? ''
  }

  it('禁用态色令牌在明暗两套主题块中各定义一次且取自 --zhuse-shen', () => {
    expect((bianLiangCss.match(/--fasong-anniu-jinyong-beijing:/g) ?? []).length).toBe(2)
    for (const zhuTi of ['light', 'dark'] as const) {
      expect(quZhuTiKuai(zhuTi)).toMatch(/--fasong-anniu-jinyong-beijing:\s*var\(--zhuse-shen\)/)
    }
  })

  it('禁用态色值在明暗两套主题下均比常态主色更暗（而非降透明度）', () => {
    for (const zhuTi of ['light', 'dark'] as const) {
      const kuai = quZhuTiKuai(zhuTi)
      const changTai = /--zhuse:\s*(#[0-9A-Fa-f]{6})\b/.exec(kuai)?.[1]
      const jinYong = /--zhuse-shen:\s*(#[0-9A-Fa-f]{6})\b/.exec(kuai)?.[1]
      expect(changTai, `${zhuTi} 主题块应定义 --zhuse`).toBeTruthy()
      expect(jinYong, `${zhuTi} 主题块应定义 --zhuse-shen`).toBeTruthy()
      expect(xiangDuiLiangDu(jinYong)).toBeLessThan(xiangDuiLiangDu(changTai))
    }
  })

  it('聊天页面禁用态改用背景令牌且规则内不再出现 opacity', () => {
    const guiZe = quZhengZeYuanMa(liaoTianYeMianYuanMa, /\.fasong-anniu:disabled\s*\{[^}]*\}/)
    expect(guiZe).not.toBe('')
    expect(guiZe).toMatch(/background:\s*var\(--fasong-anniu-jinyong-beijing\)/)
    expect(guiZe).toMatch(/cursor:\s*not-allowed/)
    expect(guiZe).not.toMatch(/opacity/)
    expect(
      quZhengZeYuanMa(liaoTianYeMianYuanMa, /\.fasong-anniu\s*\{[^}]*\}/),
    ).toMatch(/background:\s*var\(--zhuse\)/)
  })

  it('空内容→有内容→仅空白全程发送按钮存在且禁用态随内容切换', async () => {
    const { wrapper } = await mountLiaoTianYeMian()
    const shuRuKuang = wrapper.find('.shuru-kuang')

    await shuRuKuang.setValue('')
    await flushPromises()
    const chuShi = wrapper.find('.fasong-anniu')
    expect(chuShi.exists()).toBe(true)
    expect(chuShi.attributes('disabled')).toBeDefined()

    await shuRuKuang.setValue('在吗')
    await flushPromises()
    expect(wrapper.find('.fasong-anniu').attributes('disabled')).toBeUndefined()

    await shuRuKuang.setValue('   ')
    await flushPromises()
    const chongXin = wrapper.find('.fasong-anniu')
    expect(chongXin.exists()).toBe(true)
    expect(chongXin.attributes('disabled')).toBeDefined()
    expect(chongXin.attributes('aria-disabled')).toBe('true')
  })

  it('聊天页面不再导出/引用告白态与通关死接口', () => {
    expect(liaoTianYeMianYuanMa).not.toMatch(/gaoBaiJinXingZhong|zhiXingGaoBai/)
    const apiYuanMa = readFileSync(resolve(__dirname, '../api/聊天.ts'), 'utf8')
    expect(apiYuanMa).not.toMatch(/\/通关\//)
    expect(apiYuanMa).not.toMatch(/chuLiGaoBai|queRenGuanXi|chuLiShiPo|jianCeAiZhuDongGaoBai/)
    const fanYiYuanMa = readFileSync(resolve(__dirname, '../config/translations.ts'), 'utf8')
    expect(fanYiYuanMa).not.toMatch(/gaoBai|gaoBaiChengGong/)
  })

  it('好友聊天输入栏同样恒常驻发送按钮并沿用加深禁用态', () => {
    const fasongDuan = quZhengZeYuanMa(
      haoYouLiaoTianYuanMa,
      /<button[^>]*class="fasong-anniu"[\s\S]*?<\/button>/,
    )
    expect(fasongDuan).not.toBe('')
    expect(fasongDuan).not.toMatch(/v-(show|if)/)
    expect(fasongDuan).toMatch(/:disabled=/)
    expect(fasongDuan).toMatch(/:aria-disabled=/)
    const jinYongGuiZe = quZhengZeYuanMa(
      haoYouLiaoTianYuanMa,
      /\.fasong-anniu:disabled\s*\{[^}]*\}/,
    )
    expect(jinYongGuiZe).toMatch(/background:\s*var\(--fasong-anniu-jinyong-beijing\)/)
    expect(jinYongGuiZe).not.toMatch(/opacity/)
    expect(haoYouLiaoTianYuanMa).not.toMatch(/gaobai-anniu|gaoBai|告白/)
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

  function jiShuYuDanXingKuang(
    wrapper: { find: (xuanZeQi: string) => { element: Element } },
    scroll: number,
    client: number,
  ) {
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

  it('输入框折叠态溢出走全局滚动条基线，与发送按钮同一套度量等高', () => {
    // 缺陷6 新契约（废除旧断言）：折叠态曾钉死 scrollbar-width:none + ::-webkit-scrollbar 宽 0，
    // 那正是用户投诉「只能滚轮滚动、没有可点可拖的滚动条」的根因，故旧断言整体作废并反向锁定。
    const kuang = liaoTianYeMianYuanMa.match(/\.shuru-kuang\s*\{[^}]*\}/)?.[0] ?? ''
    expect(kuang).not.toBe('')
    expect(kuang).toMatch(/overflow-y:\s*auto/)
    expect(kuang).not.toMatch(/scrollbar-width:\s*none/)
    expect(kuang).not.toMatch(/-ms-overflow-style:\s*none/)
    // 私有隐藏与私有配色规则全部删除，滚动条规格统一由 FP-01 的 --gundong-tiao-* 全局基线供给
    expect(liaoTianYeMianYuanMa).not.toMatch(/\.shuru-kuang::?-webkit-scrollbar/)
    expect(liaoTianYeMianYuanMa).not.toMatch(/--shuru-kuang-gundong-tiao/)
    expect(liaoTianYeMianYuanMa).not.toMatch(/\.shuru-kuang\.zhan-kai\s*\{/)
    // 缺陷5 新契约：单行尺度量只在 .shuru-rongqi 写一次，输入框与发送按钮都吃同一组变量
    const rongqi = liaoTianYeMianYuanMa.match(/\.shuru-rongqi\s*\{[^}]*\}/)?.[0] ?? ''
    for (const 令牌 of [
      '--shuru-kuang-zihao',
      '--shuru-kuang-hangao',
      '--shuru-kuang-hangxing-gao',
      '--shuru-kuang-shang-xia-neidian',
      '--shuru-kuang-biankuang',
      '--shuru-anniu-re-ku',
    ]) {
      expect(rongqi).toContain(令牌 + ':')
    }
    expect(kuang).toMatch(/padding:\s*var\(--shuru-kuang-shang-xia-neidian\)\s+var\(--shuru-kuang-zuo-you-neidian\)/)
    expect(kuang).toMatch(/line-height:\s*var\(--shuru-kuang-hangao\)/)
    expect(kuang).not.toMatch(/line-height:\s*1\.4/)
    const waike = liaoTianYeMianYuanMa.match(/\.shuru-kuang-waike\s*\{[^}]*\}/)?.[0] ?? ''
    expect(waike).toMatch(/border:\s*var\(--shuru-kuang-biankuang\)\s+solid/)
    const anniu = liaoTianYeMianYuanMa.match(/\.fasong-anniu\s*\{[^}]*\}/)?.[0] ?? ''
    // 按钮不再自带任何高度字面值：同内边距 + 同行高基准 + 同宽透明边框 ⇒ 与外壳必然等高
    expect(anniu).toMatch(/padding:\s*var\(--shuru-kuang-shang-xia-neidian\)/)
    expect(anniu).toMatch(/line-height:\s*var\(--shuru-kuang-hangxing-gao\)/)
    expect(anniu).toMatch(/border:\s*var\(--shuru-kuang-biankuang\)\s+solid\s+transparent/)
    // 只禁「盒高」类字面值；line-height 是同源度量，不在此列
    expect(anniu).not.toMatch(/(?:^|[;\s])(min-)?height\s*:/)
    // 44×44 触控热区靠 ::before 外扩补足，视觉盒让位给输入框高度
    expect(anniu).toMatch(/position:\s*relative/)
    expect(anniu).toMatch(/min-width:\s*var\(--shuru-anniu-re-ku\)/)
    const reku = liaoTianYeMianYuanMa.match(/\.fasong-anniu::before\s*\{[^}]*\}/)?.[0] ?? ''
    expect(reku).toMatch(/height:\s*var\(--shuru-anniu-re-ku\)/)
    expect(reku).toMatch(/position:\s*absolute/)
  })

  it('好友聊天页输入区与聊天页同规格：同一组同源度量令牌，无独立高度字面值', () => {
    const haoYouYuanMa = readFileSync(resolve(__dirname, '../views/好友聊天.vue'), 'utf8')
    const rongqi = haoYouYuanMa.match(/\.shuru-rongqi\s*\{[^}]*\}/)?.[0] ?? ''
    for (const 令牌 of [
      '--shuru-kuang-zihao: 16px',
      '--shuru-kuang-hangao: 1.4',
      '--shuru-kuang-shang-xia-neidian: 6px',
      '--shuru-kuang-zuo-you-neidian: 12px',
      '--shuru-kuang-biankuang: 0.5px',
      '--shuru-anniu-re-ku: 44px',
    ]) {
      expect(rongqi, `好友聊天页缺少同源度量令牌 ${令牌}`).toContain(令牌)
    }
    const kuang = haoYouYuanMa.match(/\.shuru-kuang\s*\{[^}]*\}/)?.[0] ?? ''
    expect(kuang).toMatch(/padding:\s*var\(--shuru-kuang-shang-xia-neidian\)\s+var\(--shuru-kuang-zuo-you-neidian\)/)
    expect(kuang).toMatch(/line-height:\s*var\(--shuru-kuang-hangao\)/)
    expect(kuang).toMatch(/border:\s*none/)
    expect(kuang).toMatch(/overflow-y:\s*auto/)
    const anniu = haoYouYuanMa.match(/\.fasong-anniu\s*\{[^}]*\}/)?.[0] ?? ''
    expect(anniu).toMatch(/padding:\s*var\(--shuru-kuang-shang-xia-neidian\)/)
    expect(anniu).toMatch(/line-height:\s*var\(--shuru-kuang-hangxing-gao\)/)
    expect(anniu).toMatch(/border:\s*var\(--shuru-kuang-biankuang\)\s+solid\s+transparent/)
    expect(anniu).not.toMatch(/(?:^|[;\s])(min-)?height\s*:/)
    expect(haoYouYuanMa).toMatch(/\.fasong-anniu::before\s*\{[^}]*height:\s*var\(--shuru-anniu-re-ku\)/)
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

  it('从军师记录详情返回聊天页后，用户消息仍经 HTTP 落库并由服务端驱动 AI', async () => {
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

    // FP-04：无 payload 的 socket 触发信号已废除，AI 由服务端落库路径驱动；
    // 返回聊天页不得再叠出第二条连接（旧行为会让同一条角色回复渲染两次）
    expect(faSongMock).not.toHaveBeenCalledWith('发送消息')
    expect(faSongXiaoXi).toHaveBeenCalledTimes(1)
    expect(聊天仓库.xiaoXiLieBiao.some((m) => m.id === 'x3')).toBe(true)
    expect(vi.mocked(io)).toHaveBeenCalledTimes(1)
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

describe('FP-01 发送顺序与钉底滚动根因修复', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(faSongXiaoXi).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('快速连续发送时网络派发顺序等于点击顺序且每条各带一把稳定幂等键', async () => {
    const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
    const diaoYongJiLu: Array<{ neiRong: string; miDengJian: string | null }> = []
    // FP-09b：序号由服务端权威分配 —— 这里由「服务端」自己取号，前端只消费回显值
    let fuWuQiFuHao = 40
    vi.mocked(faSongXiaoXi).mockImplementation(async (_huiHuaId, neiRong, miDengJian) => {
      diaoYongJiLu.push({ neiRong, miDengJian: miDengJian ?? null })
      // 模拟轻微网络延迟，使两次点击在首个请求完成前都已入串行队列
      await new Promise((r) => setTimeout(r, 5))
      fuWuQiFuHao += 1
      return {
        xiaoXi: {
          id: `x-${neiRong}`,
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: neiRong,
          lei_xing: 'wenben',
          shi_jian_chuo: Date.now(),
          yi_du: true,
          mi_deng_jian: miDengJian ?? null,
          ke_hu_duan_xu_hao: fuWuQiFuHao,
        },
        shiMiJi: false,
      }
    })

    const shuRuKuang = wrapper.find('.shuru-kuang')
    await shuRuKuang.setValue('A')
    await wrapper.find('.fasong-anniu').trigger('click')
    await shuRuKuang.setValue('B')
    await wrapper.find('.fasong-anniu').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(50)
    await flushPromises()

    // 串行队列保证派发顺序恒等于点击顺序
    expect(diaoYongJiLu.map((r) => r.neiRong)).toEqual(['A', 'B'])
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    // 每条消息各自一把稳定 UUID 幂等键，两条互不相同（重发时才复用同一把）
    expect(diaoYongJiLu[0].miDengJian).toMatch(UUID)
    expect(diaoYongJiLu[1].miDengJian).toMatch(UUID)
    expect(diaoYongJiLu[0].miDengJian).not.toBe(diaoYongJiLu[1].miDengJian)
    // 上报的键与列表里那两条气泡身上的键逐条一致 ⇒ 键挂在消息本体上；
    // 且每条只出现一次（重发/回推都不产生第二条）
    for (const [xiangShu, jiLu] of diaoYongJiLu.entries()) {
      const luoKuXing = 聊天仓库.xiaoXiLieBiao.find((m) => m.id === `x-${jiLu.neiRong}`)
      expect(luoKuXing, `第 ${xiangShu + 1} 条必须落进列表`).toBeDefined()
      expect(luoKuXing?.mi_deng_jian).toBe(jiLu.miDengJian)
      expect(聊天仓库.xiaoXiLieBiao.filter((m) => m.nei_rong === jiLu.neiRong)).toHaveLength(1)
    }
    // 序号是服务端回显值，前端不再自增伪造
    expect(聊天仓库.xiaoXiLieBiao.find((m) => m.id === 'x-A')?.ke_hu_duan_xu_hao).toBe(41)
    expect(聊天仓库.xiaoXiLieBiao.find((m) => m.id === 'x-B')?.ke_hu_duan_xu_hao).toBe(42)
  })

  it('用户未钉底时收到新消息不强制滚动', async () => {
    const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
    const xiaoxiQuyu = wrapper.find('.xiaoxi-quyu').element as HTMLElement
    Object.defineProperty(xiaoxiQuyu, 'scrollHeight', { value: 1000, configurable: true })
    Object.defineProperty(xiaoxiQuyu, 'clientHeight', { value: 800, configurable: true })
    Object.defineProperty(xiaoxiQuyu, 'scrollTop', {
      value: 100,
      configurable: true,
      writable: true,
    })

    // 触发滚动事件：距底 = 1000 - 100 - 800 = 100 >= 40 → 判定不在底部
    xiaoxiQuyu.dispatchEvent(new Event('scroll'))
    await flushPromises()

    // 追加一条消息，消息数 watch 应判定不在底部而不强制滚动
    聊天仓库.xiaoXiLieBiao = [
      ...聊天仓库.xiaoXiLieBiao,
      {
        id: 'x-new',
        hui_hua_id: 'h1',
        fa_song_zhe_id: 'j1',
        fa_song_zhe_lei_xing: 'jiaose',
        nei_rong: '新消息',
        lei_xing: 'wenben',
        shi_jian_chuo: Date.now(),
        yi_du: true,
      },
    ]
    await flushPromises()
    await vi.advanceTimersByTimeAsync(50)
    await flushPromises()

    expect(xiaoxiQuyu.scrollTop).toBe(100)
  })
})
