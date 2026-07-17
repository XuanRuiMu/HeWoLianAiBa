import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import 全局菜单 from '@/components/全局菜单.vue'
import { 使用主题仓库, 主题键 } from '@/stores/主题'
import { 使用用户仓库 } from '@/stores/用户'
import { 使用聊天仓库 } from '@/stores/聊天'
import { huoQuFanYi } from '@/config/translations'

vi.mock('@/api/认证', () => ({
  gengGaiYongHuMing: vi.fn(),
  gengGaiMiMa: vi.fn(),
  faSongMa: vi.fn(),
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

const cssWenJianLuJing = resolve(__dirname, '../styles/variables.css')
const cssNeiRong = readFileSync(cssWenJianLuJing, 'utf8')
const cssBianLiangMing = [...new Set(cssNeiRong.match(/--[a-zA-Z0-9_-]+/g) || [])]
const caiDanWenJianLuJing = resolve(__dirname, '../components/全局菜单.vue')
const caiDanYuanMa = readFileSync(caiDanWenJianLuJing, 'utf8')

function chuangJianLuYou(_dangQianLuJing: string) {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/login', name: 'dengLu', component: { template: '<div>登录</div>' } },
      {
        path: '/profile-setup',
        name: 'ziLiaoSheZhi',
        component: { template: '<div>资料设置</div>' },
      },
      { path: '/tong-zhi', name: 'tongZhi', component: { template: '<div>通知</div>' } },
      {
        path: '/chat/:huiHuaId',
        name: 'liaoTian',
        component: { template: '<div>聊天</div>' },
      },
      {
        path: '/tian-jia-wei-xin',
        name: 'tianJiaWeiXin',
        component: { template: '<div>添加微信</div>' },
      },
      {
        path: '/guo-wang-zhan-ji',
        name: 'guoWangZhanJi',
        component: { template: '<div>过往战绩</div>' },
      },
    ],
  })
}

async function mountCaiDan(peiZhi: { luJing?: string; dengLu?: boolean } = {}) {
  const luYou = chuangJianLuYou(peiZhi.luJing || '/')
  await luYou.push(peiZhi.luJing || '/')
  const pinia = createPinia()
  setActivePinia(pinia)

  const 用户仓库 = 使用用户仓库()
  if (peiZhi.dengLu) {
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
  }

  const wrapper = mount(全局菜单, {
    global: {
      plugins: [pinia, luYou],
    },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, luYou, 用户仓库 }
}

describe('FP-18 主题与UI', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.className = ''
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('主题系统', () => {
    it('主题仓库默认值为暗色', () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const 主题仓库 = 使用主题仓库()
      expect(主题仓库.dangQianZhuti).toBe('暗色')
    })

    it('首次访问无 localStorage.主题 时 data-theme 为 dark', () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const 主题仓库 = 使用主题仓库()
      主题仓库.chuShiHua()
      expect(localStorage.getItem(主题键)).toBe('暗色')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('切换主题更新 localStorage.主题 与 data-theme', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const 主题仓库 = 使用主题仓库()
      主题仓库.chuShiHua()

      主题仓库.qieHuanZhuti('浅色')
      expect(localStorage.getItem(主题键)).toBe('浅色')
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')

      主题仓库.qieHuanZhuti('暗色')
      expect(localStorage.getItem(主题键)).toBe('暗色')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('读取已保存的浅色主题', () => {
      localStorage.setItem(主题键, '浅色')
      const pinia = createPinia()
      setActivePinia(pinia)
      const 主题仓库 = 使用主题仓库()
      主题仓库.chuShiHua()
      expect(主题仓库.dangQianZhuti).toBe('浅色')
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })
  })

  describe('CSS 变量与品牌色', () => {
    it('CSS 文件包含 200+ 变量定义', () => {
      expect(cssBianLiangMing.length).toBeGreaterThanOrEqual(200)
    })

    it('深色模式主色为 #34C759', () => {
      expect(cssNeiRong).toMatch(/:root\s*,\s*:root\[data-theme="dark"\][\s\S]*?--zhuse:\s*#34C759/)
    })

    it('浅色模式主色为 #07C160', () => {
      expect(cssNeiRong).toMatch(/:root\[data-theme="light"\][\s\S]*?--zhuse:\s*#07C160/)
    })

    it('品牌色包含暖灰蓝 #6B8CA6 与柔粉紫 #C4A0B0', () => {
      expect(cssNeiRong).toContain('--nuanhui-lan: #6B8CA6')
      expect(cssNeiRong).toContain('--roufen-zi: #C4A0B0')
    })
  })

  describe('全局样式', () => {
    it('背景样式包含 4 色渐变与 12 秒流动动画', () => {
      const globalCssLuJing = resolve(__dirname, '../styles/global.css')
      const globalCss = readFileSync(globalCssLuJing, 'utf8')
      expect(globalCss).toMatch(/linear-gradient\s*\(/)
      expect(globalCss).toMatch(/animation:\s*[^;]*jianbian-liudong[^;]*12s/)
    })

    it('玻璃态样式包含 blur(12px)', () => {
      expect(cssNeiRong).toContain('--boli-mohu: blur(12px)')
    })

    it('CSS 包含安全区域适配', () => {
      expect(cssNeiRong).toMatch(/env\(safe-area-inset/)
    })

    it('CSS 包含 prefers-reduced-motion 媒体查询', () => {
      const globalCssLuJing = resolve(__dirname, '../styles/global.css')
      const globalCss = readFileSync(globalCssLuJing, 'utf8')
      expect(globalCss).toMatch(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/)
    })
  })

  describe('全局固定菜单栏', () => {
    it('所有页面渲染顶部菜单栏', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/login' })
      expect(wrapper.find('.quanju-caidan').exists()).toBe(true)
    })

    it('桌面端菜单栏高度为 52px', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/' })
      expect(wrapper.find('.quanju-caidan').exists()).toBe(true)
      expect(caiDanYuanMa).toMatch(/\.quanju-caidan\s*\{[^}]*height:\s*52px/)
    })

    it('未登录时用户下拉菜单隐藏且位置不塌缩', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/login' })
      expect(wrapper.find('.yonghu-xiala').exists()).toBe(false)
      const yongHuXuanXiang = wrapper.find('.yonghu-xuanxiang')
      expect(yongHuXuanXiang.exists()).toBe(true)
      expect(yongHuXuanXiang.text()).toContain(huoQuFanYi('caidan', 'weiDengLu'))
    })

    it('主页不显示返回按钮', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/' })
      const fanHui = wrapper.find('.fanhui-anniu')
      expect(fanHui.classes()).toContain('yincang')
    })

    it('登录页不显示返回按钮', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/login' })
      const fanHui = wrapper.find('.fanhui-anniu')
      expect(fanHui.classes()).toContain('yincang')
    })

    it('非主页且非登录页显示返回按钮', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/guo-wang-zhan-ji' })
      const fanHui = wrapper.find('.fanhui-anniu')
      expect(fanHui.classes()).not.toContain('yincang')
      expect(fanHui.text()).toContain(huoQuFanYi('caidan', 'fanHui'))
    })

    it('主页不显示主页按钮', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/' })
      const zhuYe = wrapper.find('.zhuye-anniu')
      expect(zhuYe.classes()).toContain('yincang')
    })

    it('登录页不显示主页按钮', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/login' })
      const zhuYe = wrapper.find('.zhuye-anniu')
      expect(zhuYe.classes()).toContain('yincang')
    })

    it('非主页且非登录页显示主页按钮', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/guo-wang-zhan-ji' })
      const zhuYe = wrapper.find('.zhuye-anniu')
      expect(zhuYe.classes()).not.toContain('yincang')
      expect(zhuYe.text()).toContain(huoQuFanYi('caidan', 'zhuYe'))
    })

    it('点击返回按钮调用 router.back()', async () => {
      const { wrapper, luYou } = await mountCaiDan({ luJing: '/guo-wang-zhan-ji' })
      const backSpy = vi.spyOn(luYou, 'back')
      await wrapper.find('.fanhui-anniu').trigger('click')
      await flushPromises()
      expect(backSpy).toHaveBeenCalled()
    })

    it('点击主页按钮跳转主页', async () => {
      const { wrapper, luYou } = await mountCaiDan({ luJing: '/guo-wang-zhan-ji' })
      const pushSpy = vi.spyOn(luYou, 'push')
      await wrapper.find('.zhuye-anniu').trigger('click')
      await flushPromises()
      expect(pushSpy).toHaveBeenCalledWith('/')
    })

    it('非聊天页中间显示页面标题', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/guo-wang-zhan-ji' })
      const biaoTi = wrapper.find('.ye-mian-biao-ti')
      expect(biaoTi.exists()).toBe(true)
      expect(biaoTi.text()).toBe(huoQuFanYi('yeMianBiaoTi', 'guoWangZhanJi'))
    })

    it('聊天页中间显示角色名', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/chat/test123' })
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
      await flushPromises()
      const jiaoSeMing = wrapper.find('.jiaose-mingcheng-caidan')
      expect(jiaoSeMing.exists()).toBe(true)
      expect(jiaoSeMing.text()).toBe('小甜心')
    })

    it('右侧始终显示深色/浅色切换按钮', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/login' })
      expect(wrapper.find('.zhuti-qiehuan-anniu').exists()).toBe(true)
    })

    it('点击主题切换按钮切换主题', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/' })
      const anNiu = wrapper.find('.zhuti-qiehuan-anniu')
      await anNiu.trigger('click')
      await flushPromises()
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
      await anNiu.trigger('click')
      await flushPromises()
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('聊天页显示军师指导按钮', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/chat/test123' })
      const 聊天仓库 = 使用聊天仓库()
      聊天仓库.jiaoSeXinXi = {
        id: 'j1',
        ming_zi: '测试角色',
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
      await flushPromises()
      expect(wrapper.find('.junshi-anniu').exists()).toBe(true)
      expect(wrapper.find('.junshi-anniu').text()).toContain(huoQuFanYi('caidan', 'junShiZhiDao'))
    })

    it('非聊天页不显示军师指导按钮', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/' })
      expect(wrapper.find('.junshi-anniu').exists()).toBe(false)
    })

    it('已登录时显示通知按钮', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/', dengLu: true })
      expect(wrapper.find('.tongzhi-anniu').exists()).toBe(true)
    })

    it('未登录时不显示通知按钮', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/login' })
      expect(wrapper.find('.tongzhi-anniu').exists()).toBe(false)
    })

    it('版本号 1.0.0 直接可见', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/' })
      const banBen = wrapper.find('.banben-wenben')
      expect(banBen.exists()).toBe(true)
      expect(banBen.text()).toBe('1.0.0')
    })

    it('退出登录按钮默认颜色为红色', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/', dengLu: true })
      await wrapper.find('.yonghu-xuanxiang').trigger('click')
      await flushPromises()
      const tuichu = wrapper.find('.tuichu-xiangmu')
      expect(tuichu.exists()).toBe(true)
      expect(caiDanYuanMa).toMatch(
        /\.tuichu-xiangmu\s*\{[^}]*color:\s*var\(--yanse-weixian\)\s*!important/,
      )
    })

    it('更多菜单包含用户协议与隐私政策', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/' })
      await wrapper.find('.qita-xuanxiang').trigger('click')
      await flushPromises()
      const xiala = wrapper.find('.qita-xiala')
      expect(xiala.text()).toContain(huoQuFanYi('caidan', 'yongHuXieYi'))
      expect(xiala.text()).toContain(huoQuFanYi('caidan', 'yinSiZhengCe'))
    })

    it('聊天页「对方正在输入」提示出现在角色名下方且整体居中', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/chat/test123' })
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
      聊天仓库.zhengZaiShuRu = true
      await flushPromises()

      const biaoTiZu = wrapper.find('.liaotian-biaoti-zu')
      expect(biaoTiZu.exists()).toBe(true)
      expect(biaoTiZu.find('.jiaose-mingcheng-caidan').text()).toBe('小甜心')
      const shuruTishi = biaoTiZu.find('.duifang-shuru-tishi')
      expect(shuruTishi.exists()).toBe(true)
      expect(shuruTishi.text()).toBe(huoQuFanYi('liaoTian', 'duiFangZhengZaiShuRu'))
      expect(wrapper.find('.caidan-zhong').classes()).toContain('liaotian-zhongxin')
    })

    it('聊天页使用现代布局：左侧返回/主页、右侧军师/更多，隐藏用户下拉', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/chat/test123', dengLu: true })
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
      await flushPromises()

      expect(wrapper.find('.caidan-neirong').classes()).toContain('liaotian-caidan')
      const fanHui = wrapper.find('.fanhui-anniu')
      expect(fanHui.exists()).toBe(true)
      expect(fanHui.classes()).not.toContain('yincang')
      const zhuYe = wrapper.find('.zhuye-anniu')
      expect(zhuYe.exists()).toBe(true)
      expect(zhuYe.classes()).not.toContain('yincang')
      expect(wrapper.find('.yonghu-xuanxiang').exists()).toBe(false)
      expect(wrapper.find('.junshi-anniu').exists()).toBe(true)
      expect(wrapper.find('.liaotian-gengduo').exists()).toBe(true)
    })

    it('聊天页更多菜单可展开并包含主题切换、协议与版本号', async () => {
      const { wrapper } = await mountCaiDan({ luJing: '/chat/test123', dengLu: true })
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
      await flushPromises()

      await wrapper.find('.liaotian-gengduo').trigger('click')
      await flushPromises()
      const xiala = wrapper.find('.liaotian-gengduo-xiala')
      expect(xiala.exists()).toBe(true)
      expect(xiala.text()).toContain(huoQuFanYi('caidan', 'yongHuXieYi'))
      expect(xiala.text()).toContain(huoQuFanYi('caidan', 'yinSiZhengCe'))
      expect(xiala.text()).toContain('1.0.0')
    })

    it('顶部栏流式布局不覆盖页面，主内容区无 margin-top 偏移', () => {
      expect(caiDanYuanMa).not.toMatch(/\.quanju-caidan\s*\{[^}]*position:\s*fixed/)
      expect(caiDanYuanMa).not.toMatch(/\.quanju-caidan\s*\{[^}]*position:\s*absolute/)
      const appYuanMa = readFileSync(resolve(__dirname, '../App.vue'), 'utf8')
      expect(appYuanMa).not.toMatch(/\.app-zhuti\s*\{[^}]*margin-top:/)
    })

    it('顶部菜单栏左右两列等宽分配，标题真正居中无偏右', () => {
      expect(caiDanYuanMa).toMatch(/\.caidan-zuo\s*\{[^}]*flex:\s*1\s+1\s+0/)
      expect(caiDanYuanMa).toMatch(/\.caidan-you\s*\{[^}]*flex:\s*1\s+1\s+0/)
      expect(caiDanYuanMa).toMatch(/\.caidan-zhong\s*\{[^}]*flex:\s*0\s+0\s+auto/)
      expect(caiDanYuanMa).toMatch(/\.caidan-zhong\s*\{[^}]*justify-content:\s*center/)
    })
  })
})
