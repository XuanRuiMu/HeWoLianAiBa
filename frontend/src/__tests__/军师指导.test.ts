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

async function daKaiXuanZeLieBiao(wrapper: ReturnType<typeof mount>['wrapper']) {
  const anNiu = wrapper.find('.xuanze-anniu')
  if (anNiu.exists()) {
    await anNiu.trigger('click')
    await flushPromises()
  }
}

async function xuanZeJunShi(wrapper: ReturnType<typeof mount>['wrapper'], junShiId: string) {
  await daKaiXuanZeLieBiao(wrapper)
  const xiang = wrapper.findAll('.junshi-xuanze-xiang').find((el) => {
    const touXiang = el.find('.touxiang-tu')
    return (
      touXiang.attributes('src')?.includes(junShiId.replace(/([A-Z])/g, '-$1').toLowerCase()) ??
      false
    )
  })
  if (!xiang) {
    const muBiao = wrapper
      .findAll('.junshi-xuanze-xiang')
      .find((el) =>
        el
          .text()
          .includes(
            junShiId === 'xuanRuiMu'
              ? huoQuFanYi('junShi', 'junShiMing')
              : huoQuFanYi('junShi', `${junShiId}Ming` as never),
          ),
      )
    await muBiao?.trigger('click')
  } else {
    await xiang.trigger('click')
  }
  await flushPromises()
}

function huoQuBiaoQian(wrapper: ReturnType<typeof mount>['wrapper'], biaoQianWenBen: string) {
  return wrapper.findAll('.biaoqian-anniu').find((el) => el.text() === biaoQianWenBen)
}

describe('FP-03 军师指导面板一级菜单化', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(huoQuJunShiLieBiao).mockResolvedValue(chuangJianMoNiJunShiLieBiao())
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue(chuangJianMoNiJiLuLieBiao())
    vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue(null)
    vi.mocked(qingQiuJunShiZhiDao).mockReset()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('顶部一级选项卡', () => {
    it('面板打开后直接展示军事指导和历史战绩两个选项卡', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const biaoQian = wrapper.findAll('.biaoqian-anniu')
      expect(biaoQian.length).toBe(2)
      expect(biaoQian[0].text()).toBe(huoQuFanYi('junShi', 'junShiZhiDaoYiJi'))
      expect(biaoQian[1].text()).toBe(huoQuFanYi('junShi', 'liShiZhanJi'))
    })

    it('默认选中军事指导选项卡', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const junShiBiaoQian = huoQuBiaoQian(wrapper, huoQuFanYi('junShi', 'junShiZhiDaoYiJi'))
      expect(junShiBiaoQian?.classes()).toContain('huoyue')
      expect(wrapper.find('.zhidao-buju').exists()).toBe(true)
      expect(wrapper.find('.jilu-buju').exists()).toBe(false)
    })

    it('点击历史战绩选项卡切换到记录列表', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const liShiBiaoQian = huoQuBiaoQian(wrapper, huoQuFanYi('junShi', 'liShiZhanJi'))
      await liShiBiaoQian?.trigger('click')
      await flushPromises()

      expect(liShiBiaoQian?.classes()).toContain('huoyue')
      expect(wrapper.find('.zhidao-buju').exists()).toBe(false)
      expect(wrapper.find('.jilu-buju').exists()).toBe(true)
      expect(huoQuJunShiJiLu).toHaveBeenCalledWith('j1')
    })

    it('顶部关闭按钮保持', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const guanBi = wrapper.find('.guanbi-anniu')
      expect(guanBi.exists()).toBe(true)
      expect(guanBi.text()).toBe(huoQuFanYi('junShi', 'guanBi'))
    })

    it('点击关闭按钮触发 guanBi 事件', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      await wrapper.find('.guanbi-anniu').trigger('click')

      expect(wrapper.emitted('guanBi')).toBeTruthy()
    })
  })

  describe('军事指导选项卡', () => {
    it('初始状态显示选择军师入口', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      expect(wrapper.find('.weixuanze-zhuangtai').exists()).toBe(true)
      const xuanZeAnNiu = wrapper.find('.xuanze-anniu')
      expect(xuanZeAnNiu.exists()).toBe(true)
      expect(xuanZeAnNiu.text()).toBe(huoQuFanYi('junShi', 'xuanZeJunShi'))
      expect(wrapper.find('.junshi-xuanze-buju').exists()).toBe(false)
      expect(wrapper.find('.qingqiu-anniu').exists()).toBe(false)
    })

    it('点击选择军师后在选项卡内展示军师列表', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      await daKaiXuanZeLieBiao(wrapper)

      expect(wrapper.find('.weixuanze-zhuangtai').exists()).toBe(false)
      expect(wrapper.find('.junshi-xuanze-buju').exists()).toBe(true)
      const lieBiao = wrapper.findAll('.junshi-xuanze-xiang')
      expect(lieBiao.length).toBe(3)
    })

    it('选择军师列表中的取消按钮可返回初始状态', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      await daKaiXuanZeLieBiao(wrapper)
      expect(wrapper.find('.junshi-xuanze-buju').exists()).toBe(true)

      const quXiaoAnNiu = wrapper.find('.quxiao-xuanze-anniu')
      expect(quXiaoAnNiu.exists()).toBe(true)
      expect(quXiaoAnNiu.text()).toBe(huoQuFanYi('renZheng', 'quXiao'))

      await quXiaoAnNiu.trigger('click')
      await flushPromises()

      expect(wrapper.find('.junshi-xuanze-buju').exists()).toBe(false)
      expect(wrapper.find('.weixuanze-zhuangtai').exists()).toBe(true)
    })

    it('军师列表包含玄锐暮、测试军师1、测试军师2', async () => {
      const { wrapper } = await mountJunShiZhiDao()
      await daKaiXuanZeLieBiao(wrapper)

      const quanBuWenBen = wrapper.text()
      expect(quanBuWenBen).toContain(huoQuFanYi('junShi', 'junShiMing'))
      expect(quanBuWenBen).toContain(huoQuFanYi('junShi', 'ceShiJunShi1Ming'))
      expect(quanBuWenBen).toContain(huoQuFanYi('junShi', 'ceShiJunShi2Ming'))
    })

    it('选择军师后在选项卡内显示已选军师和请求指导按钮', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      await xuanZeJunShi(wrapper, 'xuanRuiMu')

      expect(wrapper.find('.junshi-xuanze-buju').exists()).toBe(false)
      expect(wrapper.find('.xuanzhong-junshi').exists()).toBe(true)
      expect(wrapper.find('.xuanzhong-junshi').text()).toContain(huoQuFanYi('junShi', 'junShiMing'))
      expect(wrapper.find('.qingqiu-anniu').exists()).toBe(true)
      expect(wrapper.find('.qingqiu-anniu').text()).toBe(huoQuFanYi('junShi', 'qingQiuZhiDao'))
    })

    it('已选军师后可点击更换军师重新打开列表', async () => {
      const { wrapper } = await mountJunShiZhiDao()
      await xuanZeJunShi(wrapper, 'xuanRuiMu')

      await wrapper.find('.genghuan-anniu').trigger('click')
      await flushPromises()

      expect(wrapper.find('.junshi-xuanze-buju').exists()).toBe(true)
      expect(wrapper.find('.xuanzhong-junshi').exists()).toBe(false)
    })

    it('军师头像使用后端配置路径', async () => {
      const { wrapper } = await mountJunShiZhiDao()
      await daKaiXuanZeLieBiao(wrapper)

      const touXiangLieBiao = wrapper.findAll('.junshi-xuanze-xiang .touxiang-tu')
      expect(touXiangLieBiao.length).toBe(3)
      expect(touXiangLieBiao[0].attributes('src')).toBe('/图片/军师头像/军师玄锐暮头像.png')
      expect(touXiangLieBiao[1].attributes('src')).toBe('/图片/军师头像/军师测试军师1头像.png')
      expect(touXiangLieBiao[2].attributes('src')).toBe('/图片/军师头像/军师测试军师2头像.png')
    })
  })

  describe('请求指导交互', () => {
    it('请求按钮初始可用且显示请求指导', async () => {
      const { wrapper } = await mountJunShiZhiDao()
      await xuanZeJunShi(wrapper, 'xuanRuiMu')

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
      await xuanZeJunShi(wrapper, 'xuanRuiMu')
      const anNiu = wrapper.find('.qingqiu-anniu')

      await anNiu.trigger('click')
      await flushPromises()

      expect(qingQiuJunShiZhiDao).toHaveBeenCalledWith('j1', 'xuanRuiMu')
      expect(wrapper.find('.qingqiu-anniu').text()).toBe(huoQuFanYi('junShi', 'qingQiuZhiDao'))
      expect(wrapper.find('.jieguo-neirong').text()).toBe('先吐槽你一句，然后给你具体建议。')
    })

    it('选择测试军师1后请求携带对应军师ID', async () => {
      vi.mocked(qingQiuJunShiZhiDao).mockResolvedValue({
        junShi: chuangJianMoNiJunShiLieBiao()[1],
        zhiDaoNeiRong: '测试军师1的建议。',
        shiJian: '2026-07-07T11:00:00.000Z',
      })

      const { wrapper } = await mountJunShiZhiDao()
      await xuanZeJunShi(wrapper, 'ceShiJunShi1')
      await wrapper.find('.qingqiu-anniu').trigger('click')
      await flushPromises()

      expect(qingQiuJunShiZhiDao).toHaveBeenCalledWith('j1', 'ceShiJunShi1')
      expect(wrapper.find('.jieguo-neirong').text()).toBe('测试军师1的建议。')
    })

    it('军师重复错误显示对应翻译提示', async () => {
      const cuoWu = new Error(huoQuFanYi('junShi', 'junShiChongFu'))
      ;(cuoWu as { cuo_wu_ma?: string }).cuo_wu_ma = 'JUN_SHI_CHONG_FU'
      vi.mocked(qingQiuJunShiZhiDao).mockRejectedValue(cuoWu)

      const { wrapper } = await mountJunShiZhiDao()
      await xuanZeJunShi(wrapper, 'xuanRuiMu')
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
      await xuanZeJunShi(wrapper, 'xuanRuiMu')
      await wrapper.find('.qingqiu-anniu').trigger('click')
      await flushPromises()

      expect(wrapper.find('.cuowu-tishi').text()).toBe(huoQuFanYi('junShi', 'wuLiaoTianJiLu'))
    })

    it('缺少jiaoSeId时请求按钮禁用', async () => {
      const { wrapper } = await mountJunShiZhiDao('')
      await xuanZeJunShi(wrapper, 'xuanRuiMu')

      const anNiu = wrapper.find('.qingqiu-anniu')
      expect(anNiu.attributes('disabled')).toBeDefined()
    })
  })

  describe('历史战绩选项卡', () => {
    it('切换到历史战绩标签加载并展示当前军师记录', async () => {
      const { wrapper } = await mountJunShiZhiDao()
      await xuanZeJunShi(wrapper, 'xuanRuiMu')

      const liShiBiaoQian = huoQuBiaoQian(wrapper, huoQuFanYi('junShi', 'liShiZhanJi'))
      await liShiBiaoQian?.trigger('click')
      await flushPromises()

      expect(wrapper.find('.jilu-liebiao').exists()).toBe(true)
      const jiLuXiang = wrapper.findAll('.jilu-xiangmu')
      expect(jiLuXiang.length).toBe(1)
      expect(wrapper.text()).toContain('小甜心')
      expect(wrapper.text()).not.toContain('摘要内容')
    })

    it('未选择军师时历史战绩展示空状态', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const liShiBiaoQian = huoQuBiaoQian(wrapper, huoQuFanYi('junShi', 'liShiZhanJi'))
      await liShiBiaoQian?.trigger('click')
      await flushPromises()

      expect(wrapper.find('.kong-zhuangtai').exists()).toBe(true)
      expect(wrapper.find('.kong-zhuangtai').text()).toBe(huoQuFanYi('junShi', 'zanWuZhiDaoJiLu'))
      expect(wrapper.find('.jilu-xiangmu').exists()).toBe(false)
    })

    it('测试军师1只展示其对应记录', async () => {
      const { wrapper } = await mountJunShiZhiDao()
      await xuanZeJunShi(wrapper, 'ceShiJunShi1')

      const liShiBiaoQian = huoQuBiaoQian(wrapper, huoQuFanYi('junShi', 'liShiZhanJi'))
      await liShiBiaoQian?.trigger('click')
      await flushPromises()

      const jiLuXiang = wrapper.findAll('.jilu-xiangmu')
      expect(jiLuXiang.length).toBe(1)
      expect(wrapper.text()).toContain('2026-07-07T11:00:00.000Z')
      expect(wrapper.text()).not.toContain('2026-07-07T10:00:00.000Z')
    })

    it('点击记录项跳转到详情页', async () => {
      const { wrapper, luYou } = await mountJunShiZhiDao()
      await xuanZeJunShi(wrapper, 'xuanRuiMu')

      const liShiBiaoQian = huoQuBiaoQian(wrapper, huoQuFanYi('junShi', 'liShiZhanJi'))
      await liShiBiaoQian?.trigger('click')
      await flushPromises()

      const jiLuXiang = wrapper.find('.jilu-xiangmu')
      expect(jiLuXiang.exists()).toBe(true)

      await jiLuXiang.trigger('click')
      await flushPromises()

      expect(luYou.currentRoute.value.name).toBe('junShiJiLuXiangQing')
      expect(luYou.currentRoute.value.params.jiaoSeId).toBe('j1')
      expect(luYou.currentRoute.value.params.jiLuId).toBe('2026-07-07T10:00:00.000Z')
    })

    it('无记录时展示空状态翻译文本', async () => {
      vi.mocked(huoQuJunShiJiLu).mockResolvedValueOnce([])

      const { wrapper } = await mountJunShiZhiDao()
      await xuanZeJunShi(wrapper, 'xuanRuiMu')

      const liShiBiaoQian = huoQuBiaoQian(wrapper, huoQuFanYi('junShi', 'liShiZhanJi'))
      await liShiBiaoQian?.trigger('click')
      await flushPromises()

      expect(wrapper.find('.kong-zhuangtai').text()).toBe(huoQuFanYi('junShi', 'zanWuZhiDaoJiLu'))
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
      await daKaiXuanZeLieBiao(wrapper)

      const quanBuWenBen = wrapper.text()
      for (const guanJianCi of tianJinFangYanGuanJianCi) {
        expect(quanBuWenBen).not.toContain(guanJianCi)
      }
    })
  })
})

describe('FP-07 军师指导状态持久化与重进显示真实状态', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(huoQuJunShiLieBiao).mockResolvedValue(chuangJianMoNiJunShiLieBiao())
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue(chuangJianMoNiJiLuLieBiao())
    vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue(null)
    vi.mocked(qingQiuJunShiZhiDao).mockReset()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('选择军师后状态为空，显示请求指导按钮且可用', async () => {
    const { wrapper } = await mountJunShiZhiDao()
    await xuanZeJunShi(wrapper, 'xuanRuiMu')
    await flushPromises()

    expect(huoQuJunShiZhiDaoZhuangTai).toHaveBeenCalledWith('j1')
    const anNiu = wrapper.find('.qingqiu-anniu')
    expect(anNiu.exists()).toBe(true)
    expect(anNiu.attributes('disabled')).toBeUndefined()
    expect(anNiu.text()).toBe(huoQuFanYi('junShi', 'qingQiuZhiDao'))
    expect(wrapper.find('.jieguo-neirong').exists()).toBe(false)
  })

  it('选择军师后状态为指导中，显示指导中并禁用按钮', async () => {
    vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({
      zhuang_tai: 'zhi_dao_zhong',
      jun_shi_id: 'xuanRuiMu',
      kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
    })

    const { wrapper } = await mountJunShiZhiDao()
    await xuanZeJunShi(wrapper, 'xuanRuiMu')
    await flushPromises()

    const anNiu = wrapper.find('.qingqiu-anniu')
    expect(anNiu.attributes('disabled')).toBeDefined()
    expect(anNiu.text()).toBe(huoQuFanYi('junShi', 'zhiDaoZhong'))
    expect(wrapper.find('.jieguo-neirong').exists()).toBe(false)
    expect(wrapper.find('.cuowu-tishi').exists()).toBe(false)
  })

  it('选择军师后状态为已完成，直接显示指导结果', async () => {
    vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({
      zhuang_tai: 'yi_wan_cheng',
      jun_shi_id: 'xuanRuiMu',
      kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
      jie_guo: {
        junShi: chuangJianMoNiJunShiLieBiao()[0],
        zhiDaoNeiRong: '重进时显示的已完成指导内容',
        shiJian: '2026-07-17T10:01:00.000Z',
      },
    })

    const { wrapper } = await mountJunShiZhiDao()
    await xuanZeJunShi(wrapper, 'xuanRuiMu')
    await flushPromises()

    expect(wrapper.find('.jieguo-neirong').text()).toBe('重进时显示的已完成指导内容')
    const anNiu = wrapper.find('.qingqiu-anniu')
    expect(anNiu.attributes('disabled')).toBeUndefined()
    expect(anNiu.text()).toBe(huoQuFanYi('junShi', 'qingQiuZhiDao'))
  })

  it('已完成状态属于其他军师时不显示其结果', async () => {
    vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({
      zhuang_tai: 'yi_wan_cheng',
      jun_shi_id: 'xuanRuiMu',
      kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
      jie_guo: {
        junShi: chuangJianMoNiJunShiLieBiao()[0],
        zhiDaoNeiRong: '军师A的指导结果',
        shiJian: '2026-07-17T10:01:00.000Z',
      },
    })

    const { wrapper } = await mountJunShiZhiDao()
    await xuanZeJunShi(wrapper, 'ceShiJunShi1')
    await flushPromises()

    expect(wrapper.find('.jieguo-neirong').exists()).toBe(false)
    const anNiu = wrapper.find('.qingqiu-anniu')
    expect(anNiu.text()).toBe(huoQuFanYi('junShi', 'qingQiuZhiDao'))
    expect(anNiu.attributes('disabled')).toBeUndefined()
  })

  it('请求返回指导中错误码时启动轮询，轮询检测到完成后显示结果', async () => {
    vi.useFakeTimers()

    const cuoWu = new Error(huoQuFanYi('junShi', 'zhiDaoZhong'))
    ;(cuoWu as { cuo_wu_ma?: string }).cuo_wu_ma = 'JUN_SHI_ZAI_ZHI_DAO_ZHONG'
    vi.mocked(qingQiuJunShiZhiDao).mockRejectedValueOnce(cuoWu)

    vi.mocked(huoQuJunShiZhiDaoZhuangTai)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        zhuang_tai: 'zhi_dao_zhong',
        jun_shi_id: 'xuanRuiMu',
        kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
      })
      .mockResolvedValueOnce({
        zhuang_tai: 'yi_wan_cheng',
        jun_shi_id: 'xuanRuiMu',
        kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
        jie_guo: {
          junShi: chuangJianMoNiJunShiLieBiao()[0],
          zhiDaoNeiRong: '轮询完成后的指导内容',
          shiJian: '2026-07-17T10:01:00.000Z',
        },
      })

    const { wrapper } = await mountJunShiZhiDao()
    await xuanZeJunShi(wrapper, 'xuanRuiMu')
    await flushPromises()

    const anNiu = wrapper.find('.qingqiu-anniu')
    expect(anNiu.text()).toBe(huoQuFanYi('junShi', 'qingQiuZhiDao'))
    await anNiu.trigger('click')
    await vi.advanceTimersByTimeAsync(0)

    expect(wrapper.find('.qingqiu-anniu').text()).toBe(huoQuFanYi('junShi', 'zhiDaoZhong'))
    expect(wrapper.find('.qingqiu-anniu').attributes('disabled')).toBeDefined()

    await vi.advanceTimersByTimeAsync(3000)
    expect(wrapper.find('.qingqiu-anniu').text()).toBe(huoQuFanYi('junShi', 'zhiDaoZhong'))

    await vi.advanceTimersByTimeAsync(3000)

    expect(wrapper.find('.jieguo-neirong').text()).toBe('轮询完成后的指导内容')
    expect(wrapper.find('.qingqiu-anniu').text()).toBe(huoQuFanYi('junShi', 'qingQiuZhiDao'))
    expect(wrapper.find('.qingqiu-anniu').attributes('disabled')).toBeUndefined()
  })

  it('更换军师后再选择不残留之前的状态', async () => {
    vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue({
      zhuang_tai: 'yi_wan_cheng',
      jun_shi_id: 'xuanRuiMu',
      kai_shi_shi_jian: '2026-07-17T10:00:00.000Z',
      jie_guo: {
        junShi: chuangJianMoNiJunShiLieBiao()[0],
        zhiDaoNeiRong: '第一次进入的结果',
        shiJian: '2026-07-17T10:01:00.000Z',
      },
    })

    const { wrapper } = await mountJunShiZhiDao()
    await xuanZeJunShi(wrapper, 'xuanRuiMu')
    await flushPromises()
    expect(wrapper.find('.jieguo-neirong').text()).toBe('第一次进入的结果')

    await wrapper.find('.genghuan-anniu').trigger('click')
    await flushPromises()
    expect(wrapper.find('.zhidao-buju').exists()).toBe(true)

    vi.mocked(huoQuJunShiZhiDaoZhuangTai).mockResolvedValue(null)
    await xuanZeJunShi(wrapper, 'xuanRuiMu')
    await flushPromises()

    expect(wrapper.find('.jieguo-neirong').exists()).toBe(false)
    const anNiu = wrapper.find('.qingqiu-anniu')
    expect(anNiu.text()).toBe(huoQuFanYi('junShi', 'qingQiuZhiDao'))
    expect(anNiu.attributes('disabled')).toBeUndefined()
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
