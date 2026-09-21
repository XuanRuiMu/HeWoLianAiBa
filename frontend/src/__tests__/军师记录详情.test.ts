import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { huoQuFanYi } from '@/config/translations'
import 军师记录详情 from '@/views/军师记录详情.vue'
import { huoQuJunShiJiLu } from '@/api/聊天'

const junShiJiLuXiangQingYuanMa = readFileSync(
  resolve(__dirname, '../views/军师记录详情.vue'),
  'utf8',
)

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

function chuangJianMoNiJiLu() {
  return [
    {
      jian_yi: '这是指导建议',
      shi_jian: '2026-07-07T10:00:00.000Z',
      jiao_se_id: 'j1',
      jiao_se_ming_zi: '小甜心',
      jun_shi_id: 'xuanRuiMu',
      jun_shi_ming_chen: huoQuFanYi('junShi', 'junShiMing'),
      jun_shi_tou_xiang: '图片/军师头像/军师玄锐暮头像.png',
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

describe('FP-A10/A12 军师记录详情页', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue(chuangJianMoNiJiLu())
  })

  it('渲染军师头像并使用正确路径', async () => {
    const { wrapper } = await mountJunShiJiLuXiangQing()

    const touXiang = wrapper.find('.jilu-junshi-touxiang')
    expect(touXiang.exists()).toBe(true)
    expect(touXiang.attributes('src')).toBe(encodeURI('/图片/军师头像/军师玄锐暮头像.png'))
    expect(wrapper.text()).toContain(huoQuFanYi('junShi', 'junShiMing'))
  })

  it('页面容器有纵向滚动条样式', async () => {
    const { wrapper } = await mountJunShiJiLuXiangQing()

    const yeMian = wrapper.find('.junshi-jilu-yemian')
    expect(yeMian.exists()).toBe(true)
    expect(yeMian.element.style.overflowY).toBe('auto')
  })

  it('页面容器使用统一滚动条样式变量', () => {
    expect(junShiJiLuXiangQingYuanMa).toMatch(
      /\.junshi-jilu-yemian::-webkit-scrollbar\s*\{[^}]*width:\s*\d+px/,
    )
    expect(junShiJiLuXiangQingYuanMa).toMatch(
      /\.junshi-jilu-yemian::-webkit-scrollbar-thumb\s*\{[^}]*background:\s*var\(--gundong-tiao-beijing\)/,
    )
    expect(junShiJiLuXiangQingYuanMa).toMatch(/\.junshi-jilu-yemian::-webkit-scrollbar-thumb:hover/)
  })

  it('不展示对话摘要区域', async () => {
    const { wrapper } = await mountJunShiJiLuXiangQing()

    expect(wrapper.find('.duihua-zhaiyao').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('对话摘要')
    expect(wrapper.text()).not.toContain('摘要内容')
  })

  it('不展示后台数据区域', async () => {
    const { wrapper } = await mountJunShiJiLuXiangQing()

    expect(wrapper.find('.houtai-shuju-quyu').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('后台数据')
    expect(wrapper.text()).not.toContain('关系阶段')
  })

  it('展示聊天记录与指导建议', async () => {
    const { wrapper } = await mountJunShiJiLuXiangQing()

    expect(wrapper.text()).toContain(huoQuFanYi('junShi', 'liaoTianJiLu'))
    expect(wrapper.text()).toContain('你好')
    expect(wrapper.text()).toContain(huoQuFanYi('junShi', 'zhiDaoJianYi'))
    expect(wrapper.text()).toContain('这是指导建议')
  })

  it('不渲染具体分数或维度名', async () => {
    const { wrapper } = await mountJunShiJiLuXiangQing()

    const quanBuWenBen = wrapper.text()
    expect(quanBuWenBen).not.toContain('信任度')
    expect(quanBuWenBen).not.toContain('亲密度')
    expect(quanBuWenBen).not.toContain('趣味度')
    expect(quanBuWenBen).not.toContain('关怀度')
    expect(quanBuWenBen).not.toContain('好感度')
    expect(quanBuWenBen).not.toMatch(/\d+分/)
  })
})

describe('FP-11 军师记录详情分区渲染', () => {
  const fenDuan = {
    dangQianJuMian: '她回得慢但没结束，还在观望',
    xiaYiBuZenMeHui: '那我先不打扰你啦，你忙完喊我一声',
    weiShenMeZheMeLiao: '她上一条说在加班，追着发只会掉分',
    guLi: '你这节奏比上周稳多了',
  }
  const zhengDuan = [
    fenDuan.dangQianJuMian,
    fenDuan.xiaYiBuZenMeHui,
    fenDuan.weiShenMeZheMeLiao,
    fenDuan.guLi,
  ].join('\n')

  function chuangJianFenDuanJiLu() {
    return [
      {
        jian_yi: zhengDuan,
        jian_yi_fen_duan: fenDuan,
        shi_jian: '2026-07-07T10:00:00.000Z',
        jiao_se_id: 'j1',
        jiao_se_ming_zi: '小甜心',
        jun_shi_id: 'xuanRuiMu',
        jun_shi_ming_chen: huoQuFanYi('junShi', 'junShiMing'),
        jun_shi_tou_xiang: '图片/军师头像/军师玄锐暮头像.png',
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('新记录按四段分区渲染，「下一步怎么回」在最前', async () => {
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue(chuangJianFenDuanJiLu())

    const { wrapper } = await mountJunShiJiLuXiangQing()

    expect(wrapper.find('.jianyi-quyu .junshi-fenduan').exists()).toBe(true)
    expect(wrapper.find('.jianyi-quyu .jieguo-neirong').exists()).toBe(false)
    expect(
      wrapper.findAll('.jianyi-quyu .junshi-duan').map((duan) => duan.attributes('data-duan')),
    ).toEqual(['xiaYiBuZenMeHui', 'dangQianJuMian', 'weiShenMeZheMeLiao', 'guLi'])
    expect(wrapper.find('.jianyi-quyu .zhidian-neirong').text()).toBe(fenDuan.xiaYiBuZenMeHui)
    expect(wrapper.find('[data-duan="weiShenMeZheMeLiao"] .duan-neirong').text()).toBe(
      fenDuan.weiShenMeZheMeLiao,
    )
    expect(wrapper.find('.jianyi-quyu .ai-tishi').text()).toBe(huoQuFanYi('tongYong', 'aiTiShiTiao'))
    expect(wrapper.text()).not.toContain('undefined')
    expect(wrapper.text()).not.toContain('null')
  })

  it('详情页「复制这句回复」复制成品话术而非整段', async () => {
    const xieRu = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: xieRu },
      configurable: true,
    })
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue(chuangJianFenDuanJiLu())

    const { wrapper } = await mountJunShiJiLuXiangQing()

    await wrapper.find('.jianyi-quyu .fuzhi-anniu').trigger('click')
    await vi.waitFor(() => expect(xieRu).toHaveBeenCalledTimes(1))
    expect(xieRu.mock.calls[0][0]).toBe(fenDuan.xiaYiBuZenMeHui)
    expect(xieRu.mock.calls[0][0]).not.toBe(zhengDuan)
  })

  it('旧记录（无 jian_yi_fen_duan）整段兜底展示不崩', async () => {
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue(chuangJianMoNiJiLu())

    const { wrapper } = await mountJunShiJiLuXiangQing()

    expect(wrapper.find('.jianyi-quyu .junshi-fenduan').exists()).toBe(false)
    expect(wrapper.find('.jianyi-quyu .jieguo-neirong').text()).toBe('这是指导建议')
    expect(wrapper.find('.jianyi-quyu .fuzhi-anniu').exists()).toBe(false)
    expect(wrapper.find('.jianyi-quyu .ai-tishi').exists()).toBe(true)
  })

  it('jian_yi_fen_duan 为 null 的半旧记录同样整段兜底', async () => {
    const banJiuJiLu = chuangJianFenDuanJiLu()
    banJiuJiLu[0].jian_yi_fen_duan = null
    banJiuJiLu[0].jian_yi = '只有整段的半旧记录'
    vi.mocked(huoQuJunShiJiLu).mockResolvedValue(banJiuJiLu)

    const { wrapper } = await mountJunShiJiLuXiangQing()

    expect(wrapper.find('.jianyi-quyu .jieguo-neirong').text()).toBe('只有整段的半旧记录')
  })
})
