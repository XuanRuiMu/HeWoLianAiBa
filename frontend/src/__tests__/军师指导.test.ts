import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { huoQuFanYi } from '@/config/translations'
import 军师指导 from '@/components/军师指导.vue'
import { qingQiuJunShiZhiDao, huoQuJunShiLieBiao, huoQuJunShiJiLu } from '@/api/聊天'

vi.mock('@/api/聊天')

const tianJinFangYanGuanJianCi = [
  '天津',
  '相声',
  '捧哏',
  '逗哏',
  '方言',
  '味儿',
  '嘛',
  '介',
  '恁么',
]

function chuangJianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      {
        path: '/junshi-jilu/:jiaoSeId/:jiLuId',
        name: 'junShiJiLuXiangQing',
        component: { template: '<div>军师记录详情</div>' },
      },
    ],
  })
}

function chuangJianMoNiJunShiLieBiao() {
  return [
    {
      id: 'xuanRuiMu',
      mingCheng: huoQuFanYi('junShi', 'junShiMing'),
      fuBiaoTi: '来自后端配置的副标题',
      biaoQian: huoQuFanYi('junShi', 'junShiBiaoQian'),
      miaoShu: huoQuFanYi('junShi', 'junShiMiaoShu'),
      touXiang: '/advisors/军师玄锐暮头像.jpg',
    },
  ]
}

function chuangJianMoNiJiLuLieBiao() {
  return [
    {
      jian_yi: '这是指导建议',
      shi_jian: '2026-07-07T10:00:00.000Z',
      jiao_se_id: 'j1',
      jiao_se_ming_zi: '小甜心',
      jun_shi_id: 'xuanRuiMu',
      jun_shi_ming_chen: huoQuFanYi('junShi', 'junShiMing'),
      dui_hua_zhai_yao: '摘要内容',
      liao_tian_ji_lu: [
        {
          jiao_se: '用户',
          nei_rong: '你好',
          shi_jian: '10:00',
          yi_che_hui: false,
          yuan_shi_nei_rong: null,
          che_hui_shi_jian: null,
        },
      ],
      hou_tai_shu_ju: {
        haoGanDu: {
          zongFen: 300,
          xinRenDu: 100,
          qinMiDu: 80,
          quWeiDu: 60,
          guanHuaiDu: 60,
          guanXiJieDuan: 'renShi',
          guanXiJieDuanMingCheng: '认识',
        },
        fuPanShuJu: [
          {
            shi_jian: '10:00',
            shi_jian_miao_shu: '初次互动',
            yong_hu_xiao_xi: '你好',
            ai_hui_fu: '嗨',
            ai_xin_li_huo_dong: 'AI内心活动',
            hao_gan_du_bian_hua: {
              xin_ren_bian_hua: 1,
              qin_mi_bian_hua: 0,
              qu_wei_bian_hua: 0,
              guan_huai_bian_hua: 0,
              zong_fen_bian_hua: 1,
              guan_xi_jie_duan: 'renShi',
            },
          },
        ],
      },
    },
  ]
}

async function mountJunShiZhiDao(jiaoSeId = 'j1') {
  const luYou = chuangJianLuYou()
  await luYou.push('/')
  const pinia = createPinia()
  setActivePinia(pinia)

  const wrapper = mount(军师指导, {
    props: { jiaoSeId },
    global: {
      plugins: [pinia, luYou],
    },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, luYou }
}

describe('FP-12 军师指导系统前端', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(huoQuJunShiLieBiao).mockResolvedValue(chuangJianMoNiJunShiLieBiao())
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue(chuangJianMoNiJiLuLieBiao())
    vi.mocked(qingQiuJunShiZhiDao).mockReset()
  })

  describe('军师面板渲染', () => {
    it('副标题文本来自后端API响应，非前端硬编码', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const fuBiaoTi = wrapper.find('.junshi-fubiaoti')
      expect(fuBiaoTi.exists()).toBe(true)
      expect(fuBiaoTi.text()).toBe('来自后端配置的副标题')
      expect(fuBiaoTi.text()).not.toBe(huoQuFanYi('junShi', 'junShiFuBiaoTi'))
    })

    it('面板内容不包含天津方言味相关描述', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const quanBuWenBen = wrapper.text()
      for (const guanJianCi of tianJinFangYanGuanJianCi) {
        expect(quanBuWenBen).not.toContain(guanJianCi)
      }
    })

    it('所有用户可见文本来自翻译文件', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      expect(wrapper.text()).toContain(huoQuFanYi('junShi', 'junShiZhiDao'))
      expect(wrapper.text()).toContain(huoQuFanYi('junShi', 'zhiDaoJiLu'))
      expect(wrapper.text()).toContain(huoQuFanYi('junShi', 'qingQiuZhiDao'))
      expect(wrapper.text()).toContain(huoQuFanYi('junShi', 'guanBi'))
    })
  })

  describe('前端军师面板数据展示', () => {
    it('不展示好感度四维分数', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const quanBuWenBen = wrapper.text()
      expect(quanBuWenBen).not.toContain('信任度')
      expect(quanBuWenBen).not.toContain('亲密度')
      expect(quanBuWenBen).not.toContain('趣味度')
      expect(quanBuWenBen).not.toContain('关怀度')
      expect(quanBuWenBen).not.toMatch(/\d+分/)
    })

    it('不展示AI内心活动或评分变化', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const quanBuWenBen = wrapper.text()
      expect(quanBuWenBen).not.toContain('AI内心活动')
      expect(quanBuWenBen).not.toContain('评分变化')
      expect(quanBuWenBen).not.toContain('内心')
    })

    it('仅展示军师指导文本区域，不含后台数据区域', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      expect(wrapper.find('.zhidao-buju').exists()).toBe(true)
      expect(wrapper.find('.houtai-shuju-quyu').exists()).toBe(false)
      expect(wrapper.find('.liaotian-jilu').exists()).toBe(false)
    })
  })

  describe('请求指导交互', () => {
    it('请求按钮初始可用且显示请求指导', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const anNiu = wrapper.find('.qingqiu-anniu')
      expect(anNiu.exists()).toBe(true)
      expect(anNiu.attributes('disabled')).toBeUndefined()
      expect(anNiu.text()).toBe(huoQuFanYi('junShi', 'qingQiuZhiDao'))
    })

    it('点击请求后按钮进入请求中状态并展示结果', async () => {
      vi.mocked(qingQiuJunShiZhiDao).mockResolvedValue({
        junShi: chuangJianMoNiJunShiLieBiao()[0],
        zhiDaoNeiRong: '先吐槽你一句，然后给你具体建议。',
        shiJian: '2026-07-07T10:00:00.000Z',
      })

      const { wrapper } = await mountJunShiZhiDao()
      const anNiu = wrapper.find('.qingqiu-anniu')

      await anNiu.trigger('click')
      await flushPromises()

      expect(qingQiuJunShiZhiDao).toHaveBeenCalledWith('j1')
      expect(wrapper.find('.qingqiu-anniu').text()).toBe(huoQuFanYi('junShi', 'qingQiuZhiDao'))
      expect(wrapper.find('.jieguo-neirong').text()).toBe('先吐槽你一句，然后给你具体建议。')
    })

    it('军师重复错误显示对应翻译提示', async () => {
      const cuoWu = new Error(huoQuFanYi('junShi', 'junShiChongFu'))
      ;(cuoWu as { cuo_wu_ma?: string }).cuo_wu_ma = 'JUN_SHI_CHONG_FU'
      vi.mocked(qingQiuJunShiZhiDao).mockRejectedValue(cuoWu)

      const { wrapper } = await mountJunShiZhiDao()
      await wrapper.find('.qingqiu-anniu').trigger('click')
      await flushPromises()

      expect(wrapper.find('.cuowu-tishi').text()).toBe(huoQuFanYi('junShi', 'junShiChongFu'))
      expect(wrapper.find('.jieguo-neirong').exists()).toBe(false)
    })

    it('无聊天记录错误显示对应翻译提示', async () => {
      const cuoWu = new Error(huoQuFanYi('junShi', 'wuLiaoTianJiLu'))
      ;(cuoWu as { cuo_wu_ma?: string }).cuo_wu_ma = 'WU_LIAO_TIAN_JI_LU'
      vi.mocked(qingQiuJunShiZhiDao).mockRejectedValue(cuoWu)

      const { wrapper } = await mountJunShiZhiDao()
      await wrapper.find('.qingqiu-anniu').trigger('click')
      await flushPromises()

      expect(wrapper.find('.cuowu-tishi').text()).toBe(huoQuFanYi('junShi', 'wuLiaoTianJiLu'))
    })

    it('缺少jiaoSeId时请求按钮禁用', async () => {
      const { wrapper } = await mountJunShiZhiDao('')

      const anNiu = wrapper.find('.qingqiu-anniu')
      expect(anNiu.attributes('disabled')).toBeDefined()
    })
  })

  describe('指导记录列表', () => {
    it('切换到指导记录标签加载并展示记录', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const jiLuBiaoQian = wrapper.findAll('.biaoqian-anniu').at(1)
      expect(jiLuBiaoQian).toBeDefined()
      await jiLuBiaoQian!.trigger('click')
      await flushPromises()

      expect(wrapper.find('.jilu-liebiao').exists()).toBe(true)
      expect(wrapper.text()).toContain('小甜心')
      expect(wrapper.text()).toContain('摘要内容')
    })

    it('点击记录项跳转到详情页', async () => {
      const { wrapper, luYou } = await mountJunShiZhiDao()

      const jiLuBiaoQian = wrapper.findAll('.biaoqian-anniu').at(1)
      await jiLuBiaoQian!.trigger('click')
      await flushPromises()

      const jiLuXiang = wrapper.find('.jilu-xiangmu')
      expect(jiLuXiang.exists()).toBe(true)

      await jiLuXiang.trigger('click')
      await flushPromises()

      expect(luYou.currentRoute.value.path).toBe(
        `/junshi-jilu/j1/${encodeURIComponent('2026-07-07T10:00:00.000Z')}`,
      )
    })

    it('无记录时展示空状态翻译文本', async () => {
      const { huoQuJunShiJiLu } = await import('@/api/聊天')
      vi.mocked(huoQuJunShiJiLu).mockResolvedValueOnce([])

      const { wrapper } = await mountJunShiZhiDao()

      const jiLuBiaoQian = wrapper.findAll('.biaoqian-anniu').at(1)
      await jiLuBiaoQian!.trigger('click')
      await flushPromises()

      expect(wrapper.find('.kong-zhuangtai').text()).toBe(huoQuFanYi('junShi', 'zanWuZhiDaoJiLu'))
    })
  })
})
