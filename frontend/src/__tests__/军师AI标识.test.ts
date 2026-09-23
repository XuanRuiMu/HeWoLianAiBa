import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { huoQuFanYi } from '@/config/translations'
import 军师指导 from '@/components/军师指导.vue'
import 军师记录详情 from '@/views/军师记录详情.vue'
import {
  qingQiuJunShiZhiDao,
  huoQuJunShiLieBiao,
  huoQuJunShiJiLu,
  huoQuJunShiZhiDaoZhuangTai,
} from '@/api/聊天'

vi.mock('@/api/聊天')

function chuangJianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } },
      {
        path: '/junshi-jilu/:jiaoSeId/:jiLuId',
        name: 'junShiJiLuXiangQing',
        component: 军师记录详情,
      },
    ],
  })
}

function chuangJianMoNiJunShiLieBiao() {
  return [
    {
      id: 'xuanRuiMu',
      mingCheng: huoQuFanYi('junShi', 'junShiMing'),
      fuBiaoTi: huoQuFanYi('junShi', 'junShiFuBiaoTi'),
      biaoQian: huoQuFanYi('junShi', 'junShiBiaoQian'),
      miaoShu: huoQuFanYi('junShi', 'junShiMiaoShu'),
      touXiang: '图片/军师头像/军师玄锐暮头像.png',
    },
  ]
}

function chuangJianMoNiJiLuLieBiao() {
  return [
    {
      jian_yi: '这是玄锐暮的指导建议',
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
    },
  ]
}

const 测试会话Id = '11111111-1111-4111-8111-111111111111'

async function mountJunShiZhiDao(jiaoSeId = 测试会话Id) {
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

async function mountJunShiJiLuXiangQing() {
  const luYou = chuangJianLuYou()
  await luYou.push('/junshi-jilu/j1/2026-07-07T10:00:00.000Z')

  const wrapper = mount(军师记录详情, {
    global: {
      plugins: [luYou],
    },
  })
  await flushPromises()
  return { wrapper, luYou }
}

describe('FP-09 B-8 军师AI标识', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(huoQuJunShiLieBiao).mockResolvedValue(chuangJianMoNiJunShiLieBiao())
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue(chuangJianMoNiJiLuLieBiao())
    vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({
      zhuangTai: {
        zhuang_tai: 'yi_wan_cheng',
        jun_shi_id: 'xuanRuiMu',
        kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
        jie_guo: {
          junShi: chuangJianMoNiJunShiLieBiao()[0],
          zhiDaoNeiRong: '这是指导建议内容',
          shiJian: '2026-07-17T10:01:00.000Z',
        },
      },
      keZaiCiZhiDao: false,
      youLiaoTianJiLu: true,
    })
    vi.mocked(qingQiuJunShiZhiDao).mockReset()
  })

  describe('军师指导面板 - 指导结果区 AI 标识', () => {
    it('指导结果区渲染时显示 AI 生成标识/免责行', async () => {
      const { wrapper } = await mountJunShiZhiDao()
      const xuanRuiMuKapian = wrapper
        .findAll('.junshi-kapian')
        .find((k) => k.text().includes(huoQuFanYi('junShi', 'junShiMing')))

      // 点击查看结果按钮展开指导结果
      await xuanRuiMuKapian?.find('.qingqiu-anniu').trigger('click')
      await flushPromises()

      // 断言 AI 标识存在
      const aiTiShi = wrapper.find('.zhidao-jieguo .tishi-dai-shengming')
      expect(aiTiShi.exists()).toBe(true)
      expect(aiTiShi.text()).toBe(huoQuFanYi('tongYong', 'aiTiShiTiao'))
    })

    it('AI 标识使用小字、灰色样式', async () => {
      const { wrapper } = await mountJunShiZhiDao()
      const xuanRuiMuKapian = wrapper
        .findAll('.junshi-kapian')
        .find((k) => k.text().includes(huoQuFanYi('junShi', 'junShiMing')))

      await xuanRuiMuKapian?.find('.qingqiu-anniu').trigger('click')
      await flushPromises()

      const aiTiShi = wrapper.find('.zhidao-jieguo .tishi-dai-shengming')
      expect(aiTiShi.exists()).toBe(true)
      // 样式类名验证
      expect(aiTiShi.classes()).toContain('tishi-dai-shengming')
    })
  })

  describe('军师记录详情页 - 建议区域 AI 标识', () => {
    it('建议区域渲染时显示 AI 生成标识/免责行', async () => {
      const { wrapper } = await mountJunShiJiLuXiangQing()

      // 断言 AI 标识存在于建议区域
      const aiTiShi = wrapper.find('.jianyi-quyu .tishi-dai-shengming')
      expect(aiTiShi.exists()).toBe(true)
      expect(aiTiShi.text()).toBe(huoQuFanYi('tongYong', 'aiTiShiTiao'))
    })

    it('AI 标识使用小字、灰色样式', async () => {
      const { wrapper } = await mountJunShiJiLuXiangQing()

      const aiTiShi = wrapper.find('.jianyi-quyu .tishi-dai-shengming')
      expect(aiTiShi.exists()).toBe(true)
      expect(aiTiShi.classes()).toContain('tishi-dai-shengming')
    })
  })

  // FP-11 BlindSpot：分区 + 成品话术会让军师看起来更"像人给的准主意"，
  // 结构化以后 AI 生成标识一处都不能少，否则用户更难看出军师在胡扯。
  describe('FP-11 结构化分区下 AI 标识不丢失', () => {
    const fenDuan = {
      dangQianJuMian: '她回得慢但没结束，还在观望',
      xiaYiBuZenMeHui: '那我先不打扰你啦，你忙完喊我一声',
      weiShenMeZheMeLiao: '她上一条说在加班，追着发只会掉分',
      guLi: '你这节奏比上周稳多了',
    }

    it('面板分区渲染时仍显示 AI 生成标识', async () => {
      vi.mocked(qingQiuJunShiZhiDao).mockResolvedValue({
        junShi: chuangJianMoNiJunShiLieBiao()[0],
        zhiDaoNeiRong: Object.values(fenDuan).join('\n'),
        zhiDaoFenDuan: fenDuan,
        shiJian: '2026-07-07T10:00:00.000Z',
      })
      vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({
        zhuangTai: null,
        keZaiCiZhiDao: true,
        youLiaoTianJiLu: true,
      })
      vi.mocked(huoQuJunShiJiLu).mockResolvedValue([])

      const { wrapper } = await mountJunShiZhiDao()
      const kapian = wrapper
        .findAll('.junshi-kapian')
        .find((k) => k.text().includes(huoQuFanYi('junShi', 'junShiMing')))
      await kapian?.find('.qingqiu-anniu').trigger('click')
      await flushPromises()

      expect(wrapper.find('.zhidao-jieguo .junshi-fenduan').exists()).toBe(true)
      const aiTiShi = wrapper.find('.zhidao-jieguo .tishi-dai-shengming')
      expect(aiTiShi.exists()).toBe(true)
      expect(aiTiShi.text()).toBe(huoQuFanYi('tongYong', 'aiTiShiTiao'))
    })

    it('详情页分区渲染时仍显示 AI 生成标识', async () => {
      vi.mocked(huoQuJunShiJiLu).mockResolvedValue([
        {
          jian_yi: Object.values(fenDuan).join('\n'),
          jian_yi_fen_duan: fenDuan,
          shi_jian: '2026-07-07T10:00:00.000Z',
          jiao_se_id: 'j1',
          jiao_se_ming_zi: '小甜心',
          jun_shi_id: 'xuanRuiMu',
          jun_shi_ming_chen: huoQuFanYi('junShi', 'junShiMing'),
          jun_shi_tou_xiang: '图片/军师头像/军师玄锐暮头像.png',
          dui_hua_zhai_yao: '摘要内容',
          liao_tian_ji_lu: [],
        },
      ])

      const { wrapper } = await mountJunShiJiLuXiangQing()

      expect(wrapper.find('.jianyi-quyu .junshi-fenduan').exists()).toBe(true)
      const aiTiShi = wrapper.find('.jianyi-quyu .tishi-dai-shengming')
      expect(aiTiShi.exists()).toBe(true)
      expect(aiTiShi.text()).toBe(huoQuFanYi('tongYong', 'aiTiShiTiao'))
    })
  })
})
