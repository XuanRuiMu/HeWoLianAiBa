import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 挑战主页 from '@/views/挑战主页.vue'
import { huoQuFanYi } from '@/config/translations'
import {
  huoQuDangQianDuiJu,
  huoQuWoDeGaiKuang,
  fangQiDuiJu,
  type TiaoZhanDuiJu,
  type ZuBieGaiKuang,
} from '@/api/挑战'

vi.mock('@/api/挑战')

const moDangQianDuiJu = vi.mocked(huoQuDangQianDuiJu)
const moWoDeGaiKuang = vi.mocked(huoQuWoDeGaiKuang)
const moFangQiDuiJu = vi.mocked(fangQiDuiJu)

function chuangJianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: { template: '<div>主页</div>' } },
      { path: '/tiao-zhan', name: 'tiaoZhanZhuYe', component: 挑战主页 },
      {
        path: '/tiao-zhan/pai-hang',
        name: 'tiaoZhanPaiHangBang',
        component: { template: '<div>积分榜</div>' },
      },
      {
        path: '/tian-jia-wei-xin',
        name: 'tianJiaWeiXin',
        component: { template: '<div>添加微信</div>' },
      },
      {
        path: '/chat/:huiHuaId',
        name: 'liaoTian',
        component: { template: '<div>聊天</div>' },
      },
    ],
  })
}

function kongGaiKuang(): ZuBieGaiKuang[] {
  return ['nan_nv', 'nv_nan', 'nan_nan', 'nv_nv'].map((zu_bie) => ({
    zu_bie: zu_bie as ZuBieGaiKuang['zu_bie'],
    ji_fen: null,
    duan_wei: null,
    sheng_chang: 0,
    fu_chang: 0,
    qi_quan_chang: 0,
    lian_sheng: 0,
    pai_ming: null,
  }))
}

async function guaZai(luYou: ReturnType<typeof chuangJianLuYou>) {
  const pinia = createPinia()
  setActivePinia(pinia)
  luYou.push('/tiao-zhan')
  await luYou.isReady()
  const wrapper = mount(挑战主页, {
    global: { plugins: [pinia, luYou] },
  })
  await flushPromises()
  return { wrapper, luYou }
}

describe('挑战主页组件', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.resetAllMocks()
    moDangQianDuiJu.mockResolvedValue(null)
    moWoDeGaiKuang.mockResolvedValue(kongGaiKuang())
  })

  it('渲染标题、开始挑战与积分榜入口，以及四组别概况卡片', async () => {
    const { wrapper } = await guaZai(chuangJianLuYou())

    expect(wrapper.text()).toContain(huoQuFanYi('tiaoZhan', 'yeMianBiaoTi'))
    expect(wrapper.text()).toContain(huoQuFanYi('tiaoZhan', 'kaiShiTiaoZhan'))
    expect(wrapper.text()).toContain(huoQuFanYi('tiaoZhan', 'paiHangBang'))
    const kaPianShu = wrapper.findAll('.gaikuang-kapian').length
    expect(kaPianShu).toBe(4)
  })

  it('点击积分榜入口跳转积分榜页面', async () => {
    const { wrapper, luYou } = await guaZai(chuangJianLuYou())

    await wrapper.find('.anniu-paihang').trigger('click')
    await flushPromises()

    expect(luYou.currentRoute.value.path).toBe('/tiao-zhan/pai-hang')
  })

  it('无进行中对局时开始挑战打开性别选择弹层', async () => {
    const { wrapper } = await guaZai(chuangJianLuYou())

    await wrapper.find('.anniu-kaiShi').trigger('click')
    await flushPromises()

    expect(wrapper.find('.xingbie-zhezhao').exists()).toBe(true)
    expect(wrapper.text()).toContain(huoQuFanYi('tiaoZhan', 'woDeXingBieBiaoTi'))
  })

  it('已有进行中对局时开始挑战被拦截并显示提示', async () => {
    const duiJu: TiaoZhanDuiJu = {
      id: 'd1',
      jiao_se_id: 'r1',
      wan_jia_xing_bie: '男',
      dui_xiang_xing_bie: '女',
      wei_xin_ming: '测试昵称',
      tou_xiang: '',
      chuang_jian_shi_jian: '',
    }
    moDangQianDuiJu.mockResolvedValue(duiJu)
    const { wrapper } = await guaZai(chuangJianLuYou())

    await wrapper.find('.anniu-kaiShi').trigger('click')
    await flushPromises()

    expect(wrapper.find('.xingbie-zhezhao').exists()).toBe(false)
    expect(wrapper.text()).toContain(huoQuFanYi('tiaoZhan', 'yiYouDuiJuTishi'))
  })

  it('进行中对局横幅提供继续对局入口', async () => {
    const duiJu: TiaoZhanDuiJu = {
      id: 'd1',
      jiao_se_id: 'r1',
      wan_jia_xing_bie: '男',
      dui_xiang_xing_bie: '女',
      wei_xin_ming: '测试昵称',
      tou_xiang: '',
      chuang_jian_shi_jian: '',
    }
    moDangQianDuiJu.mockResolvedValue(duiJu)
    const { wrapper, luYou } = await guaZai(chuangJianLuYou())

    expect(wrapper.text()).toContain(huoQuFanYi('tiaoZhan', 'jinXingZhong'))
    await wrapper.find('.anniu-jiXu').trigger('click')
    await flushPromises()

    expect(luYou.currentRoute.value.path).toBe('/chat/r1')
  })

  it('选择自身性别与对象性别后透传挑战资料并进入加载页', async () => {
    const { wrapper, luYou } = await guaZai(chuangJianLuYou())

    await wrapper.find('.anniu-kaiShi').trigger('click')
    await flushPromises()

    const kaPian = wrapper.findAll('.xingbie-tanchuang .xingbie-kaPian')
    // 第一步：自身性别
    await kaPian[0].trigger('click')
    await flushPromises()

    const diBuKaPian = wrapper.findAll('.xingbie-tanchuang .xingbie-kaPian')
    // 第二步：对象性别（男）→ 直接开赛
    await diBuKaPian[0].trigger('click')
    await flushPromises()

    expect(luYou.currentRoute.value.path).toBe('/tian-jia-wei-xin')
    const linShi = sessionStorage.getItem('ziLiaoSheZhiLinShi')
    expect(linShi).toBeTruthy()
    const ziLiao = JSON.parse(linShi!)
    expect(ziLiao.moshi).toBe('tiaozhan')
    expect(ziLiao.woDeXingBie).toBe('男')
    expect(ziLiao.muBiaoXingBie).toBe('male')
  })

  it('放弃：确认后调用放弃接口并刷新概况', async () => {
    const duiJu: TiaoZhanDuiJu = {
      id: 'd1',
      jiao_se_id: 'r1',
      wan_jia_xing_bie: '男',
      dui_xiang_xing_bie: '女',
      wei_xin_ming: '测试昵称',
      tou_xiang: '',
      chuang_jian_shi_jian: '',
    }
    moDangQianDuiJu.mockResolvedValueOnce(duiJu).mockResolvedValue(null)
    moFangQiDuiJu.mockResolvedValue({
      jie_guo: {
        jie_guo_lei_xing: 'shi_bai_fang_qi_tiao_zhan',
        zhuang_tai_wen_ben: '',
        ke_ji_xu_liao_tian: false,
      },
    })
    const { wrapper } = await guaZai(chuangJianLuYou())

    await wrapper.find('.anniu-fangqi').trigger('click')
    await flushPromises()

    const queRen = wrapper.find('.anniu-fangqi.queRen')
    expect(queRen.exists()).toBe(true)
    await queRen.trigger('click')
    await flushPromises()

    expect(moFangQiDuiJu).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.jinxing-zhong-hengfu').exists()).toBe(false)
  })
})
