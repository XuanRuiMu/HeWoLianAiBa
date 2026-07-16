import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { huoQuFanYi } from '@/config/translations'
import 军师指导 from '@/components/军师指导.vue'
import { qingQiuJunShiZhiDao, huoQuJunShiLieBiao, huoQuJunShiJiLu } from '@/api/聊天'

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

async function xuanZeJunShi(wrapper: ReturnType<typeof mount>['wrapper'], junShiId: string) {
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

describe('FP-08 军师指导菜单简化与扩展', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(huoQuJunShiLieBiao).mockResolvedValue(chuangJianMoNiJunShiLieBiao())
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue(chuangJianMoNiJiLuLieBiao())
    vi.mocked(qingQiuJunShiZhiDao).mockReset()
  })

  describe('军师列表一级菜单', () => {
    it('首屏仅展示军师头像与名字，不含二级内容', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      expect(wrapper.find('.junshi-xuanze-buju').exists()).toBe(true)
      expect(wrapper.find('.zhidao-buju').exists()).toBe(false)
      expect(wrapper.find('.jilu-buju').exists()).toBe(false)

      const lieBiao = wrapper.findAll('.junshi-xuanze-xiang')
      expect(lieBiao.length).toBe(3)
      lieBiao.forEach((xiang) => {
        expect(xiang.find('.junshi-touxiang').exists()).toBe(true)
        expect(xiang.find('.junshi-mingcheng').exists()).toBe(true)
        expect(xiang.find('.junshi-fubiaoti').exists()).toBe(false)
        expect(xiang.find('.junshi-biaoqian').exists()).toBe(false)
      })
    })

    it('列表包含玄锐暮、测试军师1、测试军师2', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const quanBuWenBen = wrapper.text()
      expect(quanBuWenBen).toContain(huoQuFanYi('junShi', 'junShiMing'))
      expect(quanBuWenBen).toContain(huoQuFanYi('junShi', 'ceShiJunShi1Ming'))
      expect(quanBuWenBen).toContain(huoQuFanYi('junShi', 'ceShiJunShi2Ming'))
    })

    it('所有用户可见文本来自翻译文件', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      expect(wrapper.text()).toContain(huoQuFanYi('junShi', 'junShiZhiDao'))
      expect(wrapper.text()).toContain(huoQuFanYi('junShi', 'qingXuanZeNiDeJunShi'))
      expect(wrapper.text()).toContain(huoQuFanYi('junShi', 'guanBi'))
    })

    it('军师头像使用后端配置路径', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      const touXiangLieBiao = wrapper.findAll('.junshi-xuanze-xiang .touxiang-tu')
      expect(touXiangLieBiao.length).toBe(3)
      expect(touXiangLieBiao[0].attributes('src')).toBe('/图片/军师头像/军师玄锐暮头像.png')
      expect(touXiangLieBiao[1].attributes('src')).toBe('/图片/军师头像/军师测试军师1头像.png')
      expect(touXiangLieBiao[2].attributes('src')).toBe('/图片/军师头像/军师测试军师2头像.png')
    })
  })

  describe('军师详情界面', () => {
    it('点击军师后进入该军师的指导界面', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      await xuanZeJunShi(wrapper, 'xuanRuiMu')

      expect(wrapper.find('.junshi-xuanze-buju').exists()).toBe(false)
      expect(wrapper.find('.zhidao-buju').exists()).toBe(true)
      expect(wrapper.find('.xuanzhong-junshi').text()).toContain(huoQuFanYi('junShi', 'junShiMing'))
    })

    it('详情界面包含指导与记录标签', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      await xuanZeJunShi(wrapper, 'xuanRuiMu')

      const biaoQian = wrapper.findAll('.biaoqian-anniu')
      expect(biaoQian.length).toBe(2)
      expect(biaoQian[0].text()).toBe(huoQuFanYi('junShi', 'junShiZhiDao'))
      expect(biaoQian[1].text()).toBe(huoQuFanYi('junShi', 'zhiDaoJiLu'))
    })

    it('点击返回按钮回到军师列表', async () => {
      const { wrapper } = await mountJunShiZhiDao()

      await xuanZeJunShi(wrapper, 'xuanRuiMu')
      await wrapper.find('.fanhui-anniu').trigger('click')
      await flushPromises()

      expect(wrapper.find('.junshi-xuanze-buju').exists()).toBe(true)
      expect(wrapper.find('.zhidao-buju').exists()).toBe(false)
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

  describe('指导记录列表', () => {
    it('切换到指导记录标签加载并展示当前军师记录', async () => {
      const { wrapper } = await mountJunShiZhiDao()
      await xuanZeJunShi(wrapper, 'xuanRuiMu')

      const jiLuBiaoQian = wrapper.findAll('.biaoqian-anniu').at(1)
      expect(jiLuBiaoQian).toBeDefined()
      await jiLuBiaoQian!.trigger('click')
      await flushPromises()

      expect(wrapper.find('.jilu-liebiao').exists()).toBe(true)
      const jiLuXiang = wrapper.findAll('.jilu-xiangmu')
      expect(jiLuXiang.length).toBe(1)
      expect(wrapper.text()).toContain('小甜心')
      expect(wrapper.text()).not.toContain('摘要内容')
    })

    it('测试军师1只展示其对应记录', async () => {
      const { wrapper } = await mountJunShiZhiDao()
      await xuanZeJunShi(wrapper, 'ceShiJunShi1')

      const jiLuBiaoQian = wrapper.findAll('.biaoqian-anniu').at(1)
      await jiLuBiaoQian!.trigger('click')
      await flushPromises()

      const jiLuXiang = wrapper.findAll('.jilu-xiangmu')
      expect(jiLuXiang.length).toBe(1)
      expect(wrapper.text()).toContain(huoQuFanYi('junShi', 'ceShiJunShi1Ming'))
    })

    it('点击记录项跳转到详情页', async () => {
      const { wrapper, luYou } = await mountJunShiZhiDao()
      await xuanZeJunShi(wrapper, 'xuanRuiMu')

      const jiLuBiaoQian = wrapper.findAll('.biaoqian-anniu').at(1)
      await jiLuBiaoQian!.trigger('click')
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

      const jiLuBiaoQian = wrapper.findAll('.biaoqian-anniu').at(1)
      await jiLuBiaoQian!.trigger('click')
      await flushPromises()

      expect(wrapper.find('.kong-zhuangtai').text()).toBe(huoQuFanYi('junShi', 'zanWuZhiDaoJiLu'))
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
