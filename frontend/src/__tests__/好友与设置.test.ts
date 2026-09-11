import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 好友列表 from '@/views/好友列表.vue'
import { huoQuFanYi, fanYi } from '@/config/translations'
import { LIAO_TIAN_BEI_JING_XUAN_XIANG } from '@/stores/用户设置'

vi.mock('@/api/社交', () => ({
  souSuoHaoYou: vi.fn().mockResolvedValue([]),
  faSongHaoYouShenQing: vi.fn().mockResolvedValue(undefined),
  huoQuShouDaoShenQing: vi.fn().mockResolvedValue([]),
  huoQuFaChuShenQing: vi.fn().mockResolvedValue([]),
  jieShouHaoYouShenQing: vi.fn().mockResolvedValue(undefined),
  juJueHaoYouShenQing: vi.fn().mockResolvedValue(undefined),
  huoQuHaoYouLieBiao: vi.fn().mockResolvedValue([]),
  shanChuHaoYou: vi.fn().mockResolvedValue(undefined),
}))

async function mountZuJian() {
  setActivePinia(createPinia())
  const router = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: 好友列表 }] })
  router.push('/')
  await router.isReady()
  const wrapper = mount(好友列表, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

describe('好友列表', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染搜索区与申请区与好友区', async () => {
    const wrapper = mountZuJian()
    const wenBen = (await wrapper).text()
    expect(wenBen).toContain(huoQuFanYi('haoYou', 'shouDaoShenQing'))
    expect(wenBen).toContain(huoQuFanYi('haoYou', 'haoYouLieBiao'))
  })

  it('空态展示暂无申请与暂无好友', async () => {
    const wrapper = await mountZuJian()
    const wenBen = wrapper.text()
    expect(wenBen).toContain(huoQuFanYi('haoYou', 'zanWuShenQing'))
    expect(wenBen).toContain(huoQuFanYi('haoYou', 'zanWuHaoYou'))
  })

  it('搜索404时显示中性空态而非红色报错', async () => {
    const sheJiao = await import('@/api/社交')
    vi.mocked(sheJiao.souSuoHaoYou).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404, data: { cheng_gong: false, ti_shi: '没有找到符合条件的用户' } },
    })
    const wrapper = await mountZuJian()
    await wrapper.find('.sousuo-kuang').setValue('buCunZaiDeRen')
    await wrapper.find('.sousuo-anniu').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain(huoQuFanYi('haoYou', 'souSuoWuJieGuo'))
    expect(wrapper.find('.cuowu-tishi').exists()).toBe(false)
    expect(wrapper.find('.kong-tai').exists()).toBe(true)
  })
})

describe('社交翻译键', () => {
  it('haoYou与sheZhi分类键齐全', () => {
    for (const jian of ['yeMianBiaoTi', 'souSuoZhanWei', 'faSongShenQing', 'haoYouLieBiao', 'zanWuHaoYou'] as const) {
      expect((fanYi.haoYou as Record<string, string>)[jian]).toBeTruthy()
    }
    for (const jian of ['uidBiaoTi', 'bangDingBiaoTi', 'zanWeiKaiFang', 'yinSiBiaoTi', 'paiWeiBiaoTi', 'liaoTianBeiJing'] as const) {
      expect((fanYi.sheZhi as Record<string, string>)[jian]).toBeTruthy()
    }
    expect(huoQuFanYi('caidan', 'haoYou')).toBeTruthy()
    expect(huoQuFanYi('yeMianBiaoTi', 'haoYouLieBiao')).toBeTruthy()
  })

  it('聊天背景六选项合法', () => {
    expect(LIAO_TIAN_BEI_JING_XUAN_XIANG).toContain('moRen')
    expect(LIAO_TIAN_BEI_JING_XUAN_XIANG.length).toBe(6)
  })
})
