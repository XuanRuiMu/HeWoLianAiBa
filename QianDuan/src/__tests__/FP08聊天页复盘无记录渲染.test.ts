import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { huoQuFanYi } from '@/config/翻译表'
import { 复盘状态 } from '@/api/聊天'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import 聊天页面 from '@/views/聊天页面.vue'

const { 拉取复盘, 拉取消息, 拉取角色详情, 标记已读 } = vi.hoisted(() => ({
  拉取复盘: vi.fn(),
  拉取消息: vi.fn(),
  拉取角色详情: vi.fn(),
  标记已读: vi.fn(async () => undefined),
}))

vi.mock('@/api/聊天', async () => {
  const yuan = await vi.importActual<typeof import('@/api/聊天')>('@/api/聊天')
  return {
    ...yuan,
    huoQuFuPan: 拉取复盘,
    huoQuXiaoXi: 拉取消息,
    huoQuJiaoSeXiangQing: 拉取角色详情,
    biaoJiYiDu: 标记已读,
  }
})

const HUI_HUA_ID = '22222222-2222-4222-8222-222222222222'
const DANG_AN_ID = '33333333-3333-4333-8333-333333333333'

function zaoFuPanXiangYing(fuGai: Record<string, unknown> = {}) {
  return {
    fu_pan_nei_rong: null,
    fu_pan_shi_jian_xian: [],
    fu_pan_pi_zhu: null,
    jun_shi_zhi_dao_ji_lu: [],
    guan_jian_shi_jian: [],
    jia_zai_zhong: false,
    fu_pan_zhuang_tai: 复盘状态.已完成,
    ...fuGai,
  }
}

async function daiDengJieShu() {
  for (let ci = 0; ci < 12; ci++) {
    await flushPromises()
  }
}

async function guaZai() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const sheZhi = 使用用户设置仓库()
  vi.spyOn(sheZhi, 'jiaZai').mockResolvedValue(undefined)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chat/:huiHuaId', component: { template: '<div />' } },
      { path: '/guo-wang-zhan-ji', component: { template: '<div />' } },
    ],
  })
  await router.push({ path: `/chat/${HUI_HUA_ID}`, query: { fuPan: '1', dangAnId: DANG_AN_ID } })
  await router.isReady()

  const wrapper = shallowMount(聊天页面, {
    global: {
      plugins: [pinia, router],
      renderStubDefaultSlot: true,
    },
  })
  await daiDengJieShu()
  return wrapper
}

beforeEach(() => {
  拉取复盘.mockReset()
  拉取消息.mockReset()
  拉取角色详情.mockReset()
  标记已读.mockClear()
  拉取消息.mockResolvedValue({ lie_biao: [], zong_shu: 0, hai_you_geng_duo: false })
  拉取角色详情.mockResolvedValue({ jiao_se: null, dang_an_zhuang_tai: null })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('聊天页空记录复盘渲染', () => {
  it('只显示无聊天记录文案，隐藏加载、总结、批注等其他复盘输出', async () => {
    拉取复盘.mockResolvedValue(
      zaoFuPanXiangYing({
        fu_pan_zhuang_tai: 复盘状态.无聊天记录,
        fu_pan_nei_rong: '旧编造总结',
        fu_pan_pi_zhu: [{ xu_hao: 1, ping_lun: '旧批注', qing_gan: '消极' }],
        jia_zai_zhong: false,
      }),
    )

    const wrapper = await guaZai()
    const kongTiShi = wrapper.find('[data-testid="fu-pan-wu-liao-tian-ji-lu"]')

    expect(kongTiShi.exists()).toBe(true)
    expect(kongTiShi.text()).toBe(huoQuFanYi('zhanJi', 'fuPanWuLiaoTianJiLu'))
    expect(wrapper.find('[data-testid="fu-pan-jia-zai-zhong"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="fu-pan-zong-jie"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="fu-pan-pi-zhu"]')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('旧编造总结')
    expect(wrapper.text()).not.toContain('旧批注')
    expect(wrapper.text()).not.toContain(huoQuFanYi('zhanJi', 'fuPanShengChengZhong'))
    expect(wrapper.text()).not.toContain(huoQuFanYi('zhanJi', 'fuPanZongJie'))
    expect(wrapper.text()).not.toContain(huoQuFanYi('junShi', 'wuLiaoTianJiLu'))
    expect(wrapper.find('.fupan-tuichu-anniu').exists()).toBe(true)

    wrapper.unmount()
  })

  it('空记录时即使聊天加载失败也不露出错误重试块', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    拉取消息.mockRejectedValue(new Error('消息加载失败'))
    拉取复盘.mockResolvedValue(zaoFuPanXiangYing({ fu_pan_zhuang_tai: 复盘状态.无聊天记录 }))

    const wrapper = await guaZai()

    expect(wrapper.find('[data-testid="fu-pan-wu-liao-tian-ji-lu"]').exists()).toBe(true)
    expect(wrapper.find('.jiazai-shibai-qu').exists()).toBe(false)

    wrapper.unmount()
  })

  it('空记录时角色详情失败也不露出错误重试块', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    拉取角色详情.mockRejectedValue(new Error('角色加载失败'))
    拉取复盘.mockResolvedValue(zaoFuPanXiangYing({ fu_pan_zhuang_tai: 复盘状态.无聊天记录 }))

    const wrapper = await guaZai()

    expect(wrapper.find('[data-testid="fu-pan-wu-liao-tian-ji-lu"]').exists()).toBe(true)
    expect(wrapper.html()).not.toContain('request-error-stub')

    wrapper.unmount()
  })

  it('正常复盘仍渲染总结，不出现无记录文案', async () => {
    拉取复盘.mockResolvedValue(
      zaoFuPanXiangYing({
        fu_pan_nei_rong: '用户表现：节奏稳',
        fu_pan_pi_zhu: [{ xu_hao: 1, ping_lun: '开场自然', qing_gan: '积极' }],
      }),
    )

    const wrapper = await guaZai()

    expect(wrapper.find('[data-testid="fu-pan-wu-liao-tian-ji-lu"]').exists()).toBe(false)
    const zongJie = wrapper.find('[data-testid="fu-pan-zong-jie"]')
    expect(zongJie.exists()).toBe(true)
    expect(zongJie.text()).toContain('用户表现')
    expect(zongJie.text()).toContain('节奏稳')
    expect(wrapper.text()).not.toContain(huoQuFanYi('zhanJi', 'fuPanWuLiaoTianJiLu'))

    wrapper.unmount()
  })
})
