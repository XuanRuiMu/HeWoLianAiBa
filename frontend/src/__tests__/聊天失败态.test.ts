import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 聊天页面 from '@/views/聊天页面.vue'
import QuanJuCaiDan from '@/components/全局菜单.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { huoQuFanYi } from '@/config/translations'
import { faSongXiaoXi, huoQuXiaoXi } from '@/api/聊天'

vi.mock('@/api/聊天', () => ({
  huoQuXiaoXi: vi.fn().mockResolvedValue({ lie_biao: [], zong_shu: 0 }),
  faSongXiaoXi: vi.fn(),
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

function chuangJianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      { path: '/chat/:huiHuaId', name: 'liaoTian', component: 聊天页面 },
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
  const 聊天仓库 = 使用聊天仓库()
  return { wrapper, luYou, 聊天仓库 }
}

describe('P1-7 聊天链路失败态治理', () => {
  let cuoWuRiZhi: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    cuoWuRiZhi = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cuoWuRiZhi.mockRestore()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('首屏加载失败态与空态分离', () => {
    it('首屏接口reject时渲染错误插画与重试按钮且console.error上报', async () => {
      vi.mocked(huoQuXiaoXi).mockRejectedValue(new Error('网络异常'))
      const { wrapper } = await mountLiaoTianYeMian()

      const shiBaiQu = wrapper.find('.jiazai-shibai-qu')
      expect(shiBaiQu.exists()).toBe(true)
      expect(wrapper.find('.shibai-chahua').exists()).toBe(true)
      expect(wrapper.find('.shibai-biaoti').text()).toBe(huoQuFanYi('liaoTian', 'jiaZaiShiBai'))
      expect(wrapper.find('.chongshi-anniu').exists()).toBe(true)
      expect(cuoWuRiZhi).toHaveBeenCalled()
    })

    it('点击重试按钮重新拉取首屏接口并在成功后退出错误态', async () => {
      vi.mocked(huoQuXiaoXi)
        .mockRejectedValueOnce(new Error('网络异常'))
        .mockResolvedValue({
          lie_biao: [
            {
              id: 'x1',
              hui_hua_id: 'h1',
              fa_song_zhe_id: 'j1',
              fa_song_zhe_lei_xing: 'jiaose',
              nei_rong: '重试后的消息',
              lei_xing: 'wenben',
              shi_jian_chuo: Date.now(),
              yi_du: true,
            },
          ],
          zong_shu: 1,
        })
      const { wrapper } = await mountLiaoTianYeMian()
      expect(wrapper.find('.jiazai-shibai-qu').exists()).toBe(true)

      await wrapper.find('.chongshi-anniu').trigger('click')
      await flushPromises()

      expect(vi.mocked(huoQuXiaoXi)).toHaveBeenCalledTimes(2)
      expect(wrapper.find('.jiazai-shibai-qu').exists()).toBe(false)
      expect(wrapper.text()).toContain('重试后的消息')
    })

    it('空数据时维持空态而不显示错误插画', async () => {
      vi.mocked(huoQuXiaoXi).mockResolvedValue({ lie_biao: [], zong_shu: 0 })
      const { wrapper } = await mountLiaoTianYeMian()

      expect(wrapper.find('.jiazai-shibai-qu').exists()).toBe(false)
      expect(wrapper.find('.chongshi-anniu').exists()).toBe(false)
      expect(wrapper.find('.gujia-liebiao').exists()).toBe(false)
    })

    it('角色详情失败仅上报日志并置空，不误入错误态', async () => {
      vi.mocked(huoQuXiaoXi).mockResolvedValue({
        lie_biao: [
          {
            id: 'x1',
            hui_hua_id: 'h1',
            fa_song_zhe_id: 'j1',
            fa_song_zhe_lei_xing: 'jiaose',
            nei_rong: '正常消息',
            lei_xing: 'wenben',
            shi_jian_chuo: Date.now(),
            yi_du: true,
          },
        ],
        zong_shu: 1,
      })
      const { huoQuJiaoSeXiangQing } = await import('@/api/聊天')
      vi.mocked(huoQuJiaoSeXiangQing).mockRejectedValue(new Error('角色接口异常'))
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()

      expect(聊天仓库.jiaoSeXinXi).toBeNull()
      expect(cuoWuRiZhi).toHaveBeenCalled()
      expect(wrapper.find('.jiazai-shibai-qu').exists()).toBe(false)
      expect(wrapper.text()).toContain('正常消息')
    })
  })

  describe('首屏气泡形骨架屏', () => {
    it('加载中渲染左右交替的灰色骨架气泡，加载完成后消失', async () => {
      let jieJue: (zhi: unknown) => void = () => {}
      vi.mocked(huoQuXiaoXi).mockReturnValue(
        new Promise((resolve) => {
          jieJue = resolve
        }),
      )
      const { wrapper } = await mountLiaoTianYeMian()

      const guJiaQiPao = wrapper.findAll('.gujia-qipao')
      expect(guJiaQiPao.length).toBeGreaterThan(0)
      expect(wrapper.find('.gujia-xiangmu.gujia-zuoce').exists()).toBe(true)
      expect(wrapper.find('.gujia-xiangmu.gujia-youce').exists()).toBe(true)

      jieJue({ lie_biao: [], zong_shu: 0 })
      await flushPromises()

      expect(wrapper.find('.gujia-liebiao').exists()).toBe(false)
    })

    it('加载失败后骨架屏消失并被错误态替代', async () => {
      vi.mocked(huoQuXiaoXi).mockRejectedValue(new Error('网络异常'))
      const { wrapper } = await mountLiaoTianYeMian()

      expect(wrapper.find('.gujia-liebiao').exists()).toBe(false)
      expect(wrapper.find('.jiazai-shibai-qu').exists()).toBe(true)
    })
  })

  describe('发送失败微信式感叹号与重发', () => {
    it('发送失败时气泡保留原位并显示红色感叹号角标', async () => {
      vi.mocked(faSongXiaoXi).mockRejectedValue(new Error(huoQuFanYi('liaoTian', 'faSongShiBai')))
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()

      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue('会失败的消息')
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      expect(聊天仓库.xiaoXiLieBiao.some((x) => x.nei_rong === '会失败的消息')).toBe(true)
      const yongHuQiPao = wrapper.findAll('.xiaoxi-xiangmu.yonghu-xiaoxi')
      expect(yongHuQiPao.length).toBeGreaterThan(0)
      const jiaoBiao = yongHuQiPao[yongHuQiPao.length - 1].find('.fasong-shibai-jiaobiao')
      expect(jiaoBiao.exists()).toBe(true)
      expect(jiaoBiao.attributes('aria-label')).toBe(huoQuFanYi('liaoTian', 'chongXinFaSong'))
      expect(cuoWuRiZhi).toHaveBeenCalled()
    })

    it('点击感叹号触发重发同一内容API，成功后角标消失', async () => {
      vi.mocked(faSongXiaoXi)
        .mockRejectedValueOnce(new Error('网络异常'))
        .mockResolvedValue({
          xiaoXi: {
            id: 'x-chongshi',
            hui_hua_id: 'h1',
            fa_song_zhe_id: 'u1',
            fa_song_zhe_lei_xing: 'yonghu',
            nei_rong: '会失败的消息',
            lei_xing: 'wenben',
            shi_jian_chuo: Date.now(),
            yi_du: true,
          },
          shiMiJi: false,
        })
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()

      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue('会失败的消息')
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()
      expect(vi.mocked(faSongXiaoXi)).toHaveBeenCalledTimes(1)

      const yongHuQiPao = wrapper.findAll('.xiaoxi-xiangmu.yonghu-xiaoxi')
      await yongHuQiPao[yongHuQiPao.length - 1].find('.fasong-shibai-jiaobiao').trigger('click')
      await flushPromises()

      expect(vi.mocked(faSongXiaoXi)).toHaveBeenCalledTimes(2)
      expect(wrapper.findAll('.fasong-shibai-jiaobiao').length).toBe(0)
      expect(聊天仓库.faSongShiBaiJiHe.size).toBe(0)
      expect(聊天仓库.xiaoXiLieBiao.some((x) => x.id === 'x-chongshi')).toBe(true)
    })

    it('重发再次失败时角标重新出现', async () => {
      vi.mocked(faSongXiaoXi).mockRejectedValue(new Error('网络异常'))
      const { wrapper } = await mountLiaoTianYeMian()

      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue('连续失败')
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      await wrapper.find('.fasong-shibai-jiaobiao').trigger('click')
      await flushPromises()

      expect(vi.mocked(faSongXiaoXi)).toHaveBeenCalledTimes(2)
      expect(wrapper.find('.fasong-shibai-jiaobiao').exists()).toBe(true)
    })
  })
})
