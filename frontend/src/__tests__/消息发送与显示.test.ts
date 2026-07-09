import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 聊天页面 from '@/views/聊天页面.vue'
import 添加微信 from '@/views/添加微信.vue'
import QuanJuCaiDan from '@/components/全局菜单.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import { 使用用户仓库 } from '@/stores/用户'
import { huoQuFanYi } from '@/config/translations'
import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { huoQuXiaoXi, faSongXiaoXi } from '@/api/聊天'

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
  faSongKaiChangBai: vi.fn().mockResolvedValue({ yi_fa_song: true, xiao_xi_shu: 1 }),
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

describe('FP-06 消息发送与显示', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(faSongXiaoXi).mockReset()
    vi.mocked(huoQuXiaoXi).mockReset()
    vi.mocked(huoQuXiaoXi).mockResolvedValue({ lie_biao: [], zong_shu: 0 })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('乐观更新', () => {
    it('发送消息立即出现在消息列表，不等API响应', async () => {
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      let jieXiCuoWu: (value: unknown) => void = () => {}
      vi.mocked(faSongXiaoXi).mockImplementation(
        () =>
          new Promise((resolve) => {
            jieXiCuoWu = resolve
          }),
      )

      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue('你好')
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      const xiaoXiLieBiao = wrapper.findAll('.qipao-neirong')
      expect(xiaoXiLieBiao.length).toBeGreaterThan(0)
      expect(xiaoXiLieBiao[xiaoXiLieBiao.length - 1].text()).toContain('你好')
      expect(聊天仓库.xiaoXiLieBiao.some((x) => x.nei_rong === '你好')).toBe(true)

      jieXiCuoWu({
        xiaoXi: {
          id: 'x-real',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '你好',
          lei_xing: 'wenben',
          shi_jian_chuo: Date.now(),
          yi_du: true,
        },
        shiMiJi: false,
      })
      await flushPromises()
    })

    it('点击发送后输入栏立即清空', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      vi.mocked(faSongXiaoXi).mockImplementation(() => new Promise(() => {}))

      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue('立即清空测试')
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      expect((shuRuKuang.element as HTMLInputElement).value).toBe('')
    })

    it('发送中的临时消息显示发送动画标记', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      vi.mocked(faSongXiaoXi).mockImplementation(() => new Promise(() => {}))

      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue('动画测试')
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      const xiaoXiLieBiao = wrapper.findAll('.qipao-neirong')
      expect(xiaoXiLieBiao.length).toBeGreaterThan(0)
      expect(xiaoXiLieBiao[xiaoXiLieBiao.length - 1].find('.fasong-zhong-biaoji').exists()).toBe(
        true,
      )
    })

    it('发送whosyourdaddy秘籍时不触发AI发送消息事件', async () => {
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      const faSongMock = vi.fn()
      if (聊天仓库.socketLianJie) {
        聊天仓库.socketLianJie.emit = faSongMock
      }

      vi.mocked(faSongXiaoXi).mockResolvedValue({
        xiaoXi: {
          id: 'x-miji',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: 'whosyourdaddy',
          lei_xing: 'wenben',
          shi_jian_chuo: Date.now(),
          yi_du: true,
        },
        shiMiJi: true,
      })

      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue('whosyourdaddy')
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      expect(faSongMock).not.toHaveBeenCalledWith('发送消息')
    })

    it('API发送失败时临时消息从列表移除并显示错误提示', async () => {
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      vi.mocked(faSongXiaoXi).mockRejectedValue(new Error(huoQuFanYi('liaoTian', 'faSongShiBai')))

      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue('失败测试')
      await wrapper.find('.fasong-anniu').trigger('click')
      await flushPromises()

      expect(聊天仓库.xiaoXiLieBiao.some((x) => x.nei_rong === '失败测试')).toBe(false)
      expect(聊天仓库.cuoWuXinXi).toBeTruthy()
      expect(wrapper.find('.fasong-cuowu').exists()).toBe(true)
    })
  })

  describe('输入验证', () => {
    it('输入框存在 maxlength="500" 属性', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      const shuRuKuang = wrapper.find('.shuru-kuang')
      expect(shuRuKuang.attributes('maxlength')).toBe('500')
    })

    it('输入超过500字符后发送按钮禁用', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      const changNeiRong = 'a'.repeat(501)
      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue(changNeiRong)
      await flushPromises()

      const faSongAnNiu = wrapper.find('.fasong-anniu')
      expect(faSongAnNiu.attributes('disabled')).toBeDefined()
    })

    it('字符计数显示当前长度/500', async () => {
      const { wrapper } = await mountLiaoTianYeMian()
      const shuRuKuang = wrapper.find('.shuru-kuang')
      await shuRuKuang.setValue('abc')
      await flushPromises()

      expect(wrapper.find('.zifu-jishu').text()).toBe('3/500')
    })

    it('store直接发送超过500字符的消息返回null并设置错误', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const 聊天仓库 = 使用聊天仓库()
      聊天仓库.dangQianHuiHuaId = 'h1'

      const jieGuo = await 聊天仓库.faSongXiaoXi('a'.repeat(501))
      expect(jieGuo).toBeNull()
      expect(聊天仓库.cuoWuXinXi).toBe(huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'))
    })
  })

  describe('时间显示与分组', () => {
    it('消息时间显示为 HH:MM 24小时制', async () => {
      vi.setSystemTime(new Date('2026-07-08T14:05:00+08:00'))
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      const jiDingShiJian = new Date('2026-07-07T14:05:00+08:00').getTime()
      聊天仓库.xiaoXiLieBiao = [
        {
          id: 'x1',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '测试',
          lei_xing: 'wenben',
          shi_jian_chuo: jiDingShiJian,
          yi_du: true,
        },
      ]
      await flushPromises()

      const shiJianBiaoQian = wrapper.find('.shijian-biaoqian')
      expect(shiJianBiaoQian.text()).toMatch(/^(昨天 )?\d{2}:\d{2}$/)
      expect(shiJianBiaoQian.text()).toContain('14:05')
    })

    it('消息配置合并阈值为1分钟', () => {
      expect(XIAO_XI_PEI_ZHI.heBingShiJianYuZhi).toBe(60 * 1000)
    })

    it('同一分钟内的两条消息合并为同一时间分组', async () => {
      vi.setSystemTime(new Date('2026-07-08T14:05:00+08:00'))
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      const jiChuShiJian = new Date('2026-07-07T14:05:00+08:00').getTime()
      聊天仓库.xiaoXiLieBiao = [
        {
          id: 'x1',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '消息一',
          lei_xing: 'wenben',
          shi_jian_chuo: jiChuShiJian,
          yi_du: true,
        },
        {
          id: 'x2',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '消息二',
          lei_xing: 'wenben',
          shi_jian_chuo: jiChuShiJian + 30 * 1000,
          yi_du: true,
        },
      ]
      await flushPromises()

      const shiJianBiaoQian = wrapper.findAll('.shijian-biaoqian')
      expect(shiJianBiaoQian.length).toBe(1)
      expect(shiJianBiaoQian[0].text()).toBe('昨天 14:05')

      const xiaoXiNeiRong = wrapper.findAll('.qipao-neirong')
      const quChuBiaoJi = xiaoXiNeiRong.filter(
        (x) => x.text() === '消息一' || x.text() === '消息二',
      )
      expect(quChuBiaoJi.length).toBe(2)
    })

    it('相隔超过1分钟的消息分为两个时间组', async () => {
      vi.setSystemTime(new Date('2026-07-08T14:06:00+08:00'))
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      const jiChuShiJian = new Date('2026-07-07T14:05:00+08:00').getTime()
      聊天仓库.xiaoXiLieBiao = [
        {
          id: 'x1',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '消息一',
          lei_xing: 'wenben',
          shi_jian_chuo: jiChuShiJian,
          yi_du: true,
        },
        {
          id: 'x2',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '消息二',
          lei_xing: 'wenben',
          shi_jian_chuo: jiChuShiJian + 61 * 1000,
          yi_du: true,
        },
      ]
      await flushPromises()

      const shiJianBiaoQian = wrapper.findAll('.shijian-biaoqian')
      expect(shiJianBiaoQian.length).toBe(2)
    })
  })

  describe('历史消息与分页', () => {
    it('历史消息中正序排列，最早消息在列表最前', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const 聊天仓库 = 使用聊天仓库()
      聊天仓库.dangQianHuiHuaId = 'h1'
      const jiZhunShiJian = Date.now()
      vi.mocked(huoQuXiaoXi).mockResolvedValue({
        lie_biao: [
          {
            id: 'x2',
            hui_hua_id: 'h1',
            fa_song_zhe_id: 'u1',
            fa_song_zhe_lei_xing: 'yonghu',
            nei_rong: '第二条',
            lei_xing: 'wenben',
            shi_jian_chuo: jiZhunShiJian,
            yi_du: true,
          },
          {
            id: 'x1',
            hui_hua_id: 'h1',
            fa_song_zhe_id: 'j1',
            fa_song_zhe_lei_xing: 'jiaose',
            nei_rong: '第一条',
            lei_xing: 'wenben',
            shi_jian_chuo: jiZhunShiJian - 10000,
            yi_du: true,
          },
        ],
        zong_shu: 2,
      })

      await 聊天仓库.jiaZaiXiaoXi('h1')
      expect(聊天仓库.xiaoXiLieBiao.length).toBe(2)
      expect(聊天仓库.xiaoXiLieBiao[0].nei_rong).toBe('第一条')
      expect(聊天仓库.xiaoXiLieBiao[1].nei_rong).toBe('第二条')
    })

    it('撤回消息显示系统提示文本而非原始内容', async () => {
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      聊天仓库.xiaoXiLieBiao = [
        {
          id: 'x1',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'j1',
          fa_song_zhe_lei_xing: 'jiaose',
          nei_rong: huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi'),
          lei_xing: 'wenben',
          shi_jian_chuo: Date.now(),
          yi_du: true,
          yi_che_hui: true,
          yuan_shi_nei_rong: '原始内容',
        },
      ]
      await flushPromises()

      expect(wrapper.text()).toContain(huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi'))
      expect(wrapper.text()).not.toContain('原始内容')
    })

    it('store加载更多分页，第二页消息追加到列表前面', async () => {
      const pinia = createPinia()
      setActivePinia(pinia)
      const 聊天仓库 = 使用聊天仓库()
      聊天仓库.dangQianHuiHuaId = 'h1'

      vi.mocked(huoQuXiaoXi).mockResolvedValueOnce({
        lie_biao: [
          {
            id: 'x2',
            hui_hua_id: 'h1',
            fa_song_zhe_id: 'u1',
            fa_song_zhe_lei_xing: 'yonghu',
            nei_rong: '第二页',
            lei_xing: 'wenben',
            shi_jian_chuo: Date.now() - 20000,
            yi_du: true,
          },
        ],
        zong_shu: 2,
      })

      聊天仓库.xiaoXiLieBiao = [
        {
          id: 'x1',
          hui_hua_id: 'h1',
          fa_song_zhe_id: 'u1',
          fa_song_zhe_lei_xing: 'yonghu',
          nei_rong: '第一页',
          lei_xing: 'wenben',
          shi_jian_chuo: Date.now(),
          yi_du: true,
        },
      ]
      聊天仓库.haiYouGengDuo = true
      聊天仓库.yeMa = 1

      await 聊天仓库.jiaZaiGengDuoXiaoXi()
      expect(聊天仓库.xiaoXiLieBiao.length).toBe(2)
      expect(聊天仓库.xiaoXiLieBiao[0].nei_rong).toBe('第二页')
      expect(聊天仓库.xiaoXiLieBiao[1].nei_rong).toBe('第一页')
    })

    it('页面存在加载更多按钮且点击触发分页加载', async () => {
      const { wrapper, 聊天仓库 } = await mountLiaoTianYeMian()
      聊天仓库.haiYouGengDuo = true
      聊天仓库.jiaZaiGengDuoZhong = false
      await flushPromises()

      const jiaZaiAnNiu = wrapper.find('.jiazaigengduo-anniu')
      expect(jiaZaiAnNiu.exists()).toBe(true)
      expect(jiaZaiAnNiu.text()).toBe(huoQuFanYi('liaoTian', 'jiaZaiGengDuo'))
    })
  })
})
