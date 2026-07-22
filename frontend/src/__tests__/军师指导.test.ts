import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { huoQuFanYi } from '@/config/translations'
import 军师指导 from '@/components/军师指导.vue'
import {
  qingQiuJunShiZhiDao,
  huoQuJunShiLieBiao,
  huoQuJunShiJiLu,
  huoQuJunShiZhiDaoZhuangTai,
} from '@/api/聊天'

vi.mock('@/api/聊天')

const junShiZhiDaoYuanMa = readFileSync(resolve(__dirname, '../components/军师指导.vue'), 'utf8')

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
      fuBiaoTi: huoQuFanYi('junShi', 'junShiFuBiaoTi'),
      biaoQian: huoQuFanYi('junShi', 'junShiBiaoQian'),
      miaoShu: huoQuFanYi('junShi', 'junShiMiaoShu'),
      touXiang: '图片/军师头像/军师玄锐暮头像.png',
    },
    {
      id: 'ceShiJunShi1',
      mingCheng: huoQuFanYi('junShi', 'ceShiJunShi1Ming'),
      fuBiaoTi: huoQuFanYi('junShi', 'ceShiJunShi1FuBiaoTi'),
      biaoQian: huoQuFanYi('junShi', 'ceShiJunShi1BiaoQian'),
      miaoShu: huoQuFanYi('junShi', 'ceShiJunShi1MiaoShu'),
      touXiang: '图片/军师头像/军师测试军师1头像.png',
    },
    {
      id: 'ceShiJunShi2',
      mingCheng: huoQuFanYi('junShi', 'ceShiJunShi2Ming'),
      fuBiaoTi: huoQuFanYi('junShi', 'ceShiJunShi2FuBiaoTi'),
      biaoQian: huoQuFanYi('junShi', 'ceShiJunShi2BiaoQian'),
      miaoShu: huoQuFanYi('junShi', 'ceShiJunShi2MiaoShu'),
      touXiang: '图片/军师头像/军师测试军师2头像.png',
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
    {
      jian_yi: '这是测试军师1的指导建议',
      shi_jian: '2026-07-07T11:00:00.000Z',
      jiao_se_id: 'j1',
      jiao_se_ming_zi: '小甜心',
      jun_shi_id: 'ceShiJunShi1',
      jun_shi_ming_chen: huoQuFanYi('junShi', 'ceShiJunShi1Ming'),
      dui_hua_zhai_yao: '摘要内容2',
      liao_tian_ji_lu: [
        {
          jiao_se: '用户',
          nei_rong: '在吗',
          shi_jian: '11:00',
          yi_che_hui: false,
          yuan_shi_nei_rong: null,
          che_hui_shi_jian: null,
        },
      ],
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

function huoQuJunShiKapianByJunShiId(
  wrapper: ReturnType<typeof mount>['wrapper'],
  junShiId: string,
) {
  const mingCheng =
    junShiId === 'xuanRuiMu'
      ? huoQuFanYi('junShi', 'junShiMing')
      : huoQuFanYi('junShi', `${junShiId}Ming` as never)
  return wrapper.findAll('.junshi-kapian').find((kapian) => kapian.text().includes(mingCheng))
}

describe('FP-03 军师指导面板单级菜单化', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(huoQuJunShiLieBiao).mockResolvedValue(chuangJianMoNiJunShiLieBiao())
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue(chuangJianMoNiJiLuLieBiao())
    vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({ zhuangTai: null, keZaiCiZhiDao: false })
    vi.mocked(qingQiuJunShiZhiDao).mockReset()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('顶部布局', () => {
    it('面板打开后无标签切换，直接显示军师列表', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      expect(wrapper.findAll('.biaoqian-anniu').length).toBe(0)
      expect(wrapper.find('.biaoqian-zu').exists()).toBe(false)
      expect(wrapper.find('.junshi-liebiao').exists()).toBe(true)
      expect(wrapper.findAll('.junshi-kapian').length).toBe(3)
    })

    it('顶部显示军师指导标题和关闭按钮', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      expect(wrapper.find('.biaoti').text()).toBe(huoQuFanYi('junShi', 'junShiZhiDao'))
      const guanBi = wrapper.find('.guanbi-anniu')
      expect(guanBi.exists()).toBe(true)
      expect(guanBi.text()).toBe(huoQuFanYi('junShi', 'guanBi'))
    })

    it('点击关闭按钮触发 guanBi 事件', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      await wrapper.find('.guanbi-anniu').trigger('click')

      expect(wrapper.emitted('guanBi')).toBeTruthy()
    })

    it('不再显示历史战绩标签及其入口', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      expect(wrapper.find('.jilu-buju').exists()).toBe(false)
      expect(wrapper.findAll('.biaoqian-anniu').length).toBe(0)
      expect(wrapper.text()).not.toContain(huoQuFanYi('junShi', 'liShiZhanJi'))
    })
  })

  describe('军师列表展示', () => {
    it('默认每个未指导军师显示请求指导按钮', async () => {
      vi.mocked(huoQuJunShiJiLu).mockResolvedValue([])

      const { wrapper } = await mountJunShiZhiDao()

      const anNiuList = wrapper.findAll('.qingqiu-anniu')
      expect(anNiuList.length).toBe(3)
      for (const anNiu of anNiuList) {
        expect(anNiu.text()).toBe(huoQuFanYi('junShi', 'junShiQingQiuZhiDao'))
        expect(anNiu.attributes('disabled')).toBeUndefined()
      }
    })

    it('军师列表包含玄锐暮、测试军师1、测试军师2', async () => {
      vi.mocked(huoQuJunShiJiLu).mockResolvedValue([])

      const { wrapper } = await mountJunShiZhiDao()

      const quanBuWenBen = wrapper.text()
      expect(quanBuWenBen).toContain(huoQuFanYi('junShi', 'junShiMing'))
      expect(quanBuWenBen).toContain(huoQuFanYi('junShi', 'ceShiJunShi1Ming'))
      expect(quanBuWenBen).toContain(huoQuFanYi('junShi', 'ceShiJunShi2Ming'))
    })

    it('军师头像使用后端配置路径', async () => {
      vi.mocked(huoQuJunShiJiLu).mockResolvedValue([])

      const { wrapper } = await mountJunShiZhiDao()

      const touXiangLieBiao = wrapper.findAll('.junshi-kapian .touxiang-tu')
      expect(touXiangLieBiao.length).toBe(3)
      expect(touXiangLieBiao[0].attributes('src')).toBe('/图片/军师头像/军师玄锐暮头像.png')
      expect(touXiangLieBiao[1].attributes('src')).toBe('/图片/军师头像/军师测试军师1头像.png')
      expect(touXiangLieBiao[2].attributes('src')).toBe('/图片/军师头像/军师测试军师2头像.png')
    })

    it('缺少jiaoSeId时请求按钮禁用', async () => {
      vi.mocked(huoQuJunShiJiLu).mockResolvedValue([])

      const { wrapper } = await mountJunShiZhiDao('')

      const anNiuList = wrapper.findAll('.qingqiu-anniu')
      for (const anNiu of anNiuList) {
        expect(anNiu.attributes('disabled')).toBeDefined()
      }
    })
  })

  describe('请求指导交互', () => {
    beforeEach(() => {
      vi.mocked(huoQuJunShiJiLu).mockResolvedValue([])
    })

    it('点击请求后调用API并展示结果', async () => {
      vi.mocked(qingQiuJunShiZhiDao).mockResolvedValue({
        junShi: chuangJianMoNiJunShiLieBiao()[0],
        zhiDaoNeiRong: '先吐槽你一句，然后给你具体建议。',
        shiJian: '2026-07-07T10:00:00.000Z',
      })

      const { wrapper } = await mountJunShiZhiDao()
      const xuanRuiMuKapian = huoQuJunShiKapianByJunShiId(wrapper, 'xuanRuiMu')
      const anNiu = xuanRuiMuKapian?.find('.qingqiu-anniu')

      await anNiu?.trigger('click')
      await flushPromises()

      expect(qingQiuJunShiZhiDao).toHaveBeenCalledWith('j1', 'xuanRuiMu')
      expect(wrapper.find('.jieguo-neirong').text()).toBe('先吐槽你一句，然后给你具体建议。')
    })

    it('点击测试军师1请求携带对应军师ID', async () => {
      vi.mocked(qingQiuJunShiZhiDao).mockResolvedValue({
        junShi: chuangJianMoNiJunShiLieBiao()[1],
        zhiDaoNeiRong: '测试军师1的建议。',
        shiJian: '2026-07-07T11:00:00.000Z',
      })

      const { wrapper } = await mountJunShiZhiDao()
      const ceShiJunShi1Kapian = huoQuJunShiKapianByJunShiId(wrapper, 'ceShiJunShi1')
      const anNiu = ceShiJunShi1Kapian?.find('.qingqiu-anniu')

      await anNiu?.trigger('click')
      await flushPromises()

      expect(qingQiuJunShiZhiDao).toHaveBeenCalledWith('j1', 'ceShiJunShi1')
      expect(wrapper.find('.jieguo-neirong').text()).toBe('测试军师1的建议。')
    })

    it('军师重复错误显示对应翻译提示', async () => {
      const cuoWu = new Error(huoQuFanYi('junShi', 'junShiChongFu'))
      ;(cuoWu as { cuo_wu_ma?: string }).cuo_wu_ma = 'JUN_SHI_CHONG_FU'
      vi.mocked(qingQiuJunShiZhiDao).mockRejectedValue(cuoWu)

      const { wrapper } = await mountJunShiZhiDao()
      const xuanRuiMuKapian = huoQuJunShiKapianByJunShiId(wrapper, 'xuanRuiMu')
      await xuanRuiMuKapian?.find('.qingqiu-anniu').trigger('click')
      await flushPromises()

      expect(xuanRuiMuKapian?.find('.cuowu-tishi').text()).toBe(huoQuFanYi('junShi', 'junShiChongFu'))
      expect(wrapper.find('.jieguo-neirong').exists()).toBe(false)
    })

    it('无聊天记录错误显示对应翻译提示', async () => {
      const cuoWu = new Error(huoQuFanYi('junShi', 'wuLiaoTianJiLu'))
      ;(cuoWu as { cuo_wu_ma?: string }).cuo_wu_ma = 'WU_LIAO_TIAN_JI_LU'
      vi.mocked(qingQiuJunShiZhiDao).mockRejectedValue(cuoWu)

      const { wrapper } = await mountJunShiZhiDao()
      const xuanRuiMuKapian = huoQuJunShiKapianByJunShiId(wrapper, 'xuanRuiMu')
      await xuanRuiMuKapian?.find('.qingqiu-anniu').trigger('click')
      await flushPromises()

      expect(xuanRuiMuKapian?.find('.cuowu-tishi').text()).toBe(huoQuFanYi('junShi', 'wuLiaoTianJiLu'))
    })

    it('未知错误显示通用失败提示', async () => {
      vi.mocked(qingQiuJunShiZhiDao).mockRejectedValue(new Error('网络错误'))

      const { wrapper } = await mountJunShiZhiDao()
      const xuanRuiMuKapian = huoQuJunShiKapianByJunShiId(wrapper, 'xuanRuiMu')
      await xuanRuiMuKapian?.find('.qingqiu-anniu').trigger('click')
      await flushPromises()

      expect(xuanRuiMuKapian?.find('.cuowu-tishi').text()).toBe(huoQuFanYi('junShi', 'qingQiuShiBai'))
    })
  })

  describe('状态显示', () => {
    it('历史记录中已指导过的军师显示已指导 - 查看结果', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const xuanRuiMuKapian = huoQuJunShiKapianByJunShiId(wrapper, 'xuanRuiMu')
      const anNiu = xuanRuiMuKapian?.find('.qingqiu-anniu')
      expect(anNiu?.classes()).toContain('yi-zhidao')
      expect(anNiu?.text()).toContain(huoQuFanYi('junShi', 'junShiYiZhiDao'))
      expect(anNiu?.text()).toContain(huoQuFanYi('junShi', 'junShiChaKanJieGuo'))
    })

    it('未指导过的军师显示请求指导按钮', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const ceShiJunShi2Kapian = huoQuJunShiKapianByJunShiId(wrapper, 'ceShiJunShi2')
      const anNiu = ceShiJunShi2Kapian?.find('.qingqiu-anniu')
      expect(anNiu?.text()).toBe(huoQuFanYi('junShi', 'junShiQingQiuZhiDao'))
      expect(anNiu?.classes()).not.toContain('yi-zhidao')
      expect(anNiu?.classes()).not.toContain('zhidao-zhong')
    })

    it('当前指导中的军师显示指导中并禁用按钮', async () => {
      vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({
        zhuangTai: {
          zhuang_tai: 'zhi_dao_zhong',
          jun_shi_id: 'xuanRuiMu',
          kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
        },
        keZaiCiZhiDao: false,
      })
      vi.mocked(huoQuJunShiJiLu).mockResolvedValue([])

      const { wrapper } = await mountJunShiZhiDao()

      const xuanRuiMuKapian = huoQuJunShiKapianByJunShiId(wrapper, 'xuanRuiMu')
      const anNiu = xuanRuiMuKapian?.find('.qingqiu-anniu')
      expect(anNiu?.classes()).toContain('zhidao-zhong')
      expect(anNiu?.attributes('disabled')).toBeDefined()
      expect(anNiu?.text()).toBe(huoQuFanYi('junShi', 'junShiZhiDaoZhong'))
    })

    it('当前已完成状态的军师显示已指导 - 查看结果', async () => {
      vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({
        zhuangTai: {
          zhuang_tai: 'yi_wan_cheng',
          jun_shi_id: 'xuanRuiMu',
          kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
          jie_guo: {
            junShi: chuangJianMoNiJunShiLieBiao()[0],
            zhiDaoNeiRong: '已完成状态下的指导内容',
            shiJian: '2026-07-17T10:01:00.000Z',
          },
        },
        keZaiCiZhiDao: false,
      })
      vi.mocked(huoQuJunShiJiLu).mockResolvedValue([])

      const { wrapper } = await mountJunShiZhiDao()

      const xuanRuiMuKapian = huoQuJunShiKapianByJunShiId(wrapper, 'xuanRuiMu')
      const anNiu = xuanRuiMuKapian?.find('.qingqiu-anniu')
      expect(anNiu?.classes()).toContain('yi-zhidao')
      expect(anNiu?.text()).toContain(huoQuFanYi('junShi', 'junShiYiZhiDao'))
      expect(wrapper.find('.jieguo-neirong').exists()).toBe(false)
    })

    it('点击查看结果按钮展开指导结果，再次点击收起', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const xuanRuiMuKapian = huoQuJunShiKapianByJunShiId(wrapper, 'xuanRuiMu')
      expect(wrapper.find('.jieguo-neirong').exists()).toBe(false)

      await xuanRuiMuKapian?.find('.qingqiu-anniu').trigger('click')
      await flushPromises()

      expect(wrapper.find('.jieguo-neirong').text()).toBe('这是玄锐暮的指导建议')

      await xuanRuiMuKapian?.find('.qingqiu-anniu').trigger('click')
      await flushPromises()

      expect(wrapper.find('.jieguo-neirong').exists()).toBe(false)
    })

    it('已完成状态属于其他军师时该军师仍显示请求指导', async () => {
      vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({
        zhuangTai: {
          zhuang_tai: 'yi_wan_cheng',
          jun_shi_id: 'xuanRuiMu',
          kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
          jie_guo: {
            junShi: chuangJianMoNiJunShiLieBiao()[0],
            zhiDaoNeiRong: '军师A的指导结果',
            shiJian: '2026-07-17T10:01:00.000Z',
          },
        },
        keZaiCiZhiDao: false,
      })
      vi.mocked(huoQuJunShiJiLu).mockResolvedValue([])

      const { wrapper } = await mountJunShiZhiDao()

      const ceShiJunShi1Kapian = huoQuJunShiKapianByJunShiId(wrapper, 'ceShiJunShi1')
      const anNiu = ceShiJunShi1Kapian?.find('.qingqiu-anniu')
      expect(anNiu?.text()).toBe(huoQuFanYi('junShi', 'junShiQingQiuZhiDao'))
      expect(anNiu?.classes()).not.toContain('yi-zhidao')
    })

    it('指导完成后有新聊天记录时回到初态可再次请求指导', async () => {
      vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({
        zhuangTai: {
          zhuang_tai: 'yi_wan_cheng',
          jun_shi_id: 'xuanRuiMu',
          kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
          jie_guo: {
            junShi: chuangJianMoNiJunShiLieBiao()[0],
            zhiDaoNeiRong: '之前的指导内容',
            shiJian: '2026-07-17T10:01:00.000Z',
          },
        },
        keZaiCiZhiDao: true,
      })
      vi.mocked(huoQuJunShiJiLu).mockResolvedValue(chuangJianMoNiJiLuLieBiao())

      const { wrapper } = await mountJunShiZhiDao()

      const xuanRuiMuKapian = huoQuJunShiKapianByJunShiId(wrapper, 'xuanRuiMu')
      const anNiu = xuanRuiMuKapian?.find('.qingqiu-anniu')
      expect(anNiu?.text()).toBe(huoQuFanYi('junShi', 'junShiQingQiuZhiDao'))
      expect(anNiu?.classes()).not.toContain('yi-zhidao')
      expect(anNiu?.classes()).not.toContain('zhidao-zhong')
    })

    it('历史记录中有该军师但可再次指导时也回到初态', async () => {
      vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({
        zhuangTai: null,
        keZaiCiZhiDao: true,
      })
      vi.mocked(huoQuJunShiJiLu).mockResolvedValue(chuangJianMoNiJiLuLieBiao())

      const { wrapper } = await mountJunShiZhiDao()

      const xuanRuiMuKapian = huoQuJunShiKapianByJunShiId(wrapper, 'xuanRuiMu')
      const anNiu = xuanRuiMuKapian?.find('.qingqiu-anniu')
      expect(anNiu?.text()).toBe(huoQuFanYi('junShi', 'junShiQingQiuZhiDao'))
      expect(anNiu?.classes()).not.toContain('yi-zhidao')
    })

    it('任何军师指导中时所有其他军师请求按钮全部禁用', async () => {
      vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({
        zhuangTai: {
          zhuang_tai: 'zhi_dao_zhong',
          jun_shi_id: 'xuanRuiMu',
          kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
        },
        keZaiCiZhiDao: false,
      })
      vi.mocked(huoQuJunShiJiLu).mockResolvedValue([])

      const { wrapper } = await mountJunShiZhiDao()

      const ceShiJunShi1Kapian = huoQuJunShiKapianByJunShiId(wrapper, 'ceShiJunShi1')
      const ceShiJunShi1AnNiu = ceShiJunShi1Kapian?.find('.qingqiu-anniu')
      expect(ceShiJunShi1AnNiu?.attributes('disabled')).toBeDefined()

      const ceShiJunShi2Kapian = huoQuJunShiKapianByJunShiId(wrapper, 'ceShiJunShi2')
      const ceShiJunShi2AnNiu = ceShiJunShi2Kapian?.find('.qingqiu-anniu')
      expect(ceShiJunShi2AnNiu?.attributes('disabled')).toBeDefined()
    })
  })

  describe('轮询与状态持久化', () => {
    beforeEach(() => {
      vi.mocked(huoQuJunShiJiLu).mockResolvedValue([])
    })

    it('初始进入指导中状态时启动轮询，轮询完成后显示结果', async () => {
      vi.useFakeTimers()

      vi.mocked(huoQuJunShiZhiDaoZhuangTai)
        .mockResolvedValueOnce({
          zhuangTai: {
            zhuang_tai: 'zhi_dao_zhong',
            jun_shi_id: 'xuanRuiMu',
            kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
          },
          keZaiCiZhiDao: false,
        })
        .mockResolvedValueOnce({
          zhuangTai: {
            zhuang_tai: 'zhi_dao_zhong',
            jun_shi_id: 'xuanRuiMu',
            kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
          },
          keZaiCiZhiDao: false,
        })
        .mockResolvedValueOnce({
          zhuangTai: {
            zhuang_tai: 'yi_wan_cheng',
            jun_shi_id: 'xuanRuiMu',
            kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
            jie_guo: {
              junShi: chuangJianMoNiJunShiLieBiao()[0],
              zhiDaoNeiRong: '轮询完成后的指导内容',
              shiJian: '2026-07-17T10:01:00.000Z',
            },
          },
          keZaiCiZhiDao: false,
        })

      const { wrapper } = await mountJunShiZhiDao()
      await flushPromises()

      const xuanRuiMuKapian = huoQuJunShiKapianByJunShiId(wrapper, 'xuanRuiMu')
      expect(xuanRuiMuKapian?.find('.qingqiu-anniu').text()).toBe(
        huoQuFanYi('junShi', 'junShiZhiDaoZhong'),
      )

      await vi.advanceTimersByTimeAsync(3000)
      expect(xuanRuiMuKapian?.find('.qingqiu-anniu').text()).toBe(
        huoQuFanYi('junShi', 'junShiZhiDaoZhong'),
      )

      await vi.advanceTimersByTimeAsync(3000)
      expect(wrapper.find('.jieguo-neirong').text()).toBe('轮询完成后的指导内容')
      expect(xuanRuiMuKapian?.find('.qingqiu-anniu').text()).toContain(
        huoQuFanYi('junShi', 'junShiYiZhiDao'),
      )
    })

    it('请求返回指导中错误码时启动轮询，轮询检测到完成后显示结果', async () => {
      vi.useFakeTimers()

      const cuoWu = new Error(huoQuFanYi('junShi', 'zhiDaoZhong'))
      ;(cuoWu as { cuo_wu_ma?: string }).cuo_wu_ma = 'JUN_SHI_ZAI_ZHI_DAO_ZHONG'
      vi.mocked(qingQiuJunShiZhiDao).mockRejectedValueOnce(cuoWu)

      vi.mocked(huoQuJunShiZhiDaoZhuangTai)
        .mockResolvedValueOnce({ zhuangTai: null, keZaiCiZhiDao: true })
        .mockResolvedValueOnce({
          zhuangTai: {
            zhuang_tai: 'zhi_dao_zhong',
            jun_shi_id: 'xuanRuiMu',
            kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
          },
          keZaiCiZhiDao: false,
        })
        .mockResolvedValueOnce({
          zhuangTai: {
            zhuang_tai: 'yi_wan_cheng',
            jun_shi_id: 'xuanRuiMu',
            kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
            jie_guo: {
              junShi: chuangJianMoNiJunShiLieBiao()[0],
              zhiDaoNeiRong: '轮询完成后的指导内容',
              shiJian: '2026-07-17T10:01:00.000Z',
            },
          },
          keZaiCiZhiDao: false,
        })

      const { wrapper } = await mountJunShiZhiDao()
      await flushPromises()

      const xuanRuiMuKapian = huoQuJunShiKapianByJunShiId(wrapper, 'xuanRuiMu')
      const anNiu = xuanRuiMuKapian?.find('.qingqiu-anniu')
      expect(anNiu?.text()).toBe(huoQuFanYi('junShi', 'junShiQingQiuZhiDao'))

      await anNiu?.trigger('click')
      await vi.advanceTimersByTimeAsync(0)

      expect(xuanRuiMuKapian?.find('.qingqiu-anniu').text()).toBe(
        huoQuFanYi('junShi', 'junShiZhiDaoZhong'),
      )
      expect(xuanRuiMuKapian?.find('.qingqiu-anniu').attributes('disabled')).toBeDefined()

      await vi.advanceTimersByTimeAsync(3000)
      expect(xuanRuiMuKapian?.find('.qingqiu-anniu').text()).toBe(
        huoQuFanYi('junShi', 'junShiZhiDaoZhong'),
      )

      await vi.advanceTimersByTimeAsync(3000)
      expect(wrapper.find('.jieguo-neirong').text()).toBe('轮询完成后的指导内容')
      expect(xuanRuiMuKapian?.find('.qingqiu-anniu').text()).toContain(
        huoQuFanYi('junShi', 'junShiYiZhiDao'),
      )
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

    it('面板内容不包含天津方言味相关描述', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const quanBuWenBen = wrapper.text()
      for (const guanJianCi of tianJinFangYanGuanJianCi) {
        expect(quanBuWenBen).not.toContain(guanJianCi)
      }
    })
  })
})

describe('FP-04 军师指导滚动条样式', () => {
  it('军师指导内容区存在统一纵向滚动条样式', () => {
    expect(junShiZhiDaoYuanMa).toMatch(/\.junshi-neirong\s*\{[^}]*overflow-y:\s*auto/)
    expect(junShiZhiDaoYuanMa).toMatch(
      /\.junshi-neirong::-webkit-scrollbar\s*\{[^}]*width:\s*\d+px/,
    )
    expect(junShiZhiDaoYuanMa).toMatch(
      /\.junshi-neirong::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*var\(--gundong-tiao-beijing\)/,
    )
    expect(junShiZhiDaoYuanMa).toMatch(/\.junshi-neirong::-webkit-scrollbar-thumb:hover/)
  })
})

describe('FP-04 军师指导"指导记录"独立入口', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(huoQuJunShiLieBiao).mockResolvedValue(chuangJianMoNiJunShiLieBiao())
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue(chuangJianMoNiJiLuLieBiao())
    vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({ zhuangTai: null, keZaiCiZhiDao: false })
    vi.mocked(qingQiuJunShiZhiDao).mockReset()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('顶部存在指导记录按钮，文案为"指导记录"', async () => {
    const { wrapper } = await mountJunShiZhiDao()

    const anNiu = wrapper.find('.zhidao-jilu-anniu')
    expect(anNiu.exists()).toBe(true)
    expect(anNiu.text()).toBe(huoQuFanYi('junShi', 'zhiDaoJiLu'))
  })

  it('默认不显示指导记录弹窗', async () => {
    const { wrapper } = await mountJunShiZhiDao()

    expect(wrapper.find('.zhidao-jilu-zhezhao').exists()).toBe(false)
  })

  it('点击指导记录按钮弹出独立弹窗', async () => {
    const { wrapper } = await mountJunShiZhiDao()

    await wrapper.find('.zhidao-jilu-anniu').trigger('click')
    await flushPromises()

    expect(wrapper.find('.zhidao-jilu-zhezhao').exists()).toBe(true)
    expect(wrapper.find('.zhidao-jilu-mianban').exists()).toBe(true)
    expect(wrapper.find('.zhidao-jilu-mianban .biaoti').text()).toBe(
      huoQuFanYi('junShi', 'zhiDaoJiLu'),
    )
  })

  it('弹窗内显示指导记录列表，包含军师名称与指导时间', async () => {
    const { wrapper } = await mountJunShiZhiDao()

    await wrapper.find('.zhidao-jilu-anniu').trigger('click')
    await flushPromises()

    const xiangMuLieBiao = wrapper.findAll('.zhidao-jilu-xiangmu')
    expect(xiangMuLieBiao.length).toBe(2)
    const diYiTiao = xiangMuLieBiao[0]
    expect(diYiTiao.text()).toContain(huoQuFanYi('junShi', 'junShiMing'))
    expect(diYiTiao.text()).toContain(huoQuFanYi('junShi', 'zhiDaoShiJian'))
    expect(diYiTiao.text()).toContain('2026-07-07T10:00:00.000Z')
  })

  it('点击弹窗内记录项跳转 junShiJiLuXiangQing 路由并关闭面板', async () => {
    const { wrapper } = await mountJunShiZhiDao()

    await wrapper.find('.zhidao-jilu-anniu').trigger('click')
    await flushPromises()

    const diYiTiao = wrapper.findAll('.zhidao-jilu-xiangmu')[0]
    await diYiTiao.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('guanBi')).toBeTruthy()
    const luYou = wrapper.vm.$router as unknown as { currentRoute: { value: { name: string; params: Record<string, string> } } }
    expect(luYou.currentRoute.value.name).toBe('junShiJiLuXiangQing')
    expect(luYou.currentRoute.value.params.jiaoSeId).toBe('j1')
    expect(luYou.currentRoute.value.params.jiLuId).toBe('2026-07-07T10:00:00.000Z')
  })

  it('空记录时弹窗显示暂无指导记录', async () => {
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue([])

    const { wrapper } = await mountJunShiZhiDao()

    await wrapper.find('.zhidao-jilu-anniu').trigger('click')
    await flushPromises()

    expect(wrapper.find('.zhidao-jilu-liebiao').exists()).toBe(false)
    expect(wrapper.find('.zhidao-jilu-zhezhao .kong-zhuangtai').text()).toBe(
      huoQuFanYi('junShi', 'zanWuZhiDaoJiLu'),
    )
  })

  it('点击弹窗关闭按钮和遮罩层关闭弹窗', async () => {
    const { wrapper } = await mountJunShiZhiDao()

    await wrapper.find('.zhidao-jilu-anniu').trigger('click')
    await flushPromises()
    expect(wrapper.find('.zhidao-jilu-zhezhao').exists()).toBe(true)

    await wrapper.find('.zhidao-jilu-mianban .guanbi-anniu').trigger('click')
    await flushPromises()
    expect(wrapper.find('.zhidao-jilu-zhezhao').exists()).toBe(false)

    await wrapper.find('.zhidao-jilu-anniu').trigger('click')
    await flushPromises()
    expect(wrapper.find('.zhidao-jilu-zhezhao').exists()).toBe(true)

    await wrapper.find('.zhidao-jilu-zhezhao').trigger('click')
    await flushPromises()
    expect(wrapper.find('.zhidao-jilu-zhezhao').exists()).toBe(false)
  })

  it('指导内容预览超过 50 字时截断显示', async () => {
    const changJianYi = '一二三四五六七八九十'.repeat(8)
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue([
      {
        jian_yi: changJianYi,
        shi_jian: '2026-07-07T10:00:00.000Z',
        jiao_se_id: 'j1',
        jiao_se_ming_zi: '小甜心',
        jun_shi_id: 'xuanRuiMu',
        jun_shi_ming_chen: huoQuFanYi('junShi', 'junShiMing'),
        dui_hua_zhai_yao: '摘要',
        liao_tian_ji_lu: [],
      },
    ])

    const { wrapper } = await mountJunShiZhiDao()

    await wrapper.find('.zhidao-jilu-anniu').trigger('click')
    await flushPromises()

    const yuLan = wrapper.find('.jilu-yulan')
    expect(yuLan.exists()).toBe(true)
    expect(yuLan.text().endsWith('...')).toBe(true)
    expect(yuLan.text().length).toBeLessThan(changJianYi.length)
  })
})

describe('FP-02 军师指导"已指导过相同聊天内容"恒定提示', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(huoQuJunShiLieBiao).mockResolvedValue(chuangJianMoNiJunShiLieBiao())
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue(chuangJianMoNiJiLuLieBiao())
    vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({ zhuangTai: null, keZaiCiZhiDao: false })
    vi.mocked(qingQiuJunShiZhiDao).mockReset()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('keZaiCiZhiDao为false且非指导中时恒定显示提示', async () => {
    const { wrapper } = await mountJunShiZhiDao()

    const tiShi = wrapper.find('.yi-zhidao-tishi')
    expect(tiShi.exists()).toBe(true)
    expect(tiShi.text()).toBe(huoQuFanYi('junShi', 'yiZhiDaoXiangTongNeiRong'))
  })

  it('keZaiCiZhiDao为true时不显示恒定提示', async () => {
    vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({ zhuangTai: null, keZaiCiZhiDao: true })

    const { wrapper } = await mountJunShiZhiDao()

    expect(wrapper.find('.yi-zhidao-tishi').exists()).toBe(false)
  })

  it('指导中状态时不显示恒定提示', async () => {
    vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({
      zhuangTai: {
        zhuang_tai: 'zhi_dao_zhong',
        jun_shi_id: 'xuanRuiMu',
        kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
      },
      keZaiCiZhiDao: false,
    })
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue([])

    const { wrapper } = await mountJunShiZhiDao()

    expect(wrapper.find('.yi-zhidao-tishi').exists()).toBe(false)
  })

  it('已完成状态且keZaiCiZhiDao为false时恒定显示提示', async () => {
    vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({
      zhuangTai: {
        zhuang_tai: 'yi_wan_cheng',
        jun_shi_id: 'xuanRuiMu',
        kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
        jie_guo: {
          junShi: chuangJianMoNiJunShiLieBiao()[0],
          zhiDaoNeiRong: '已完成状态下的指导内容',
          shiJian: '2026-07-17T10:01:00.000Z',
        },
      },
      keZaiCiZhiDao: false,
    })
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue([])

    const { wrapper } = await mountJunShiZhiDao()

    expect(wrapper.find('.yi-zhidao-tishi').exists()).toBe(true)
    expect(wrapper.find('.yi-zhidao-tishi').text()).toBe(
      huoQuFanYi('junShi', 'yiZhiDaoXiangTongNeiRong'),
    )
  })

  it('加载中时不显示恒定提示', async () => {
    vi.mocked(huoQuJunShiLieBiao).mockImplementation(
      () => new Promise(() => []),
    )

    const wrapper = mount(军师指导, {
      props: { jiaoSeId: 'j1' },
      global: {
        plugins: [createPinia(), chuangJianLuYou()],
      },
      attachTo: document.body,
    })
    await flushPromises()

    expect(wrapper.find('.yi-zhidao-tishi').exists()).toBe(false)
  })
})
