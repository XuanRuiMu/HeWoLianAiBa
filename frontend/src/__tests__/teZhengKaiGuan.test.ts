import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 全局菜单 from '@/components/全局菜单.vue'
import { 使用聊天仓库 } from '@/stores/聊天'
import {
  laQuTeZhengKaiGuan,
  chongZhiTeZhengKaiGuan,
  huoQuJunShiKaiGuan,
  huoQuTeZhengKaiGuan,
} from '@/utils/teZhengKaiGuan'

vi.mock('@/api/认证', () => ({
  gengGaiYongHuMing: vi.fn(),
  gengGaiMiMa: vi.fn(),
  faSongMa: vi.fn(),
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
      { path: '/login', name: 'dengLu', component: { template: '<div>登录</div>' } },
      {
        path: '/chat/:huiHuaId',
        name: 'liaoTian',
        component: { template: '<div>聊天</div>' },
      },
    ],
  })
}

async function mountCaiDan(luJing = '/chat/test123') {
  const luYou = chuangJianLuYou()
  await luYou.push(luJing)
  const pinia = createPinia()
  setActivePinia(pinia)

  const wrapper = mount(全局菜单, {
    global: {
      plugins: [pinia, luYou],
    },
  })
  await flushPromises()
  return wrapper
}

function sheZhiJiaoSeXinXi() {
  const 聊天仓库 = 使用聊天仓库()
  聊天仓库.jiaoSeXinXi = {
    id: 'j1',
    ming_zi: '测试角色',
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
}

describe('P1-8 特征开关 store', () => {
  beforeEach(() => {
    localStorage.clear()
    chongZhiTeZhengKaiGuan()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    chongZhiTeZhengKaiGuan()
  })

  it('默认 junShi 开启', () => {
    expect(huoQuJunShiKaiGuan()).toBe(true)
    expect(huoQuTeZhengKaiGuan().junShi).toBe(true)
  })

  it('拉取成功后覆盖开关值', async () => {
    const fetchMock = vi.fn(
      () =>
        Promise.resolve(
          new Response(JSON.stringify({ junShi: false }), { status: 200 }),
        ) as Promise<Response>,
    )
    vi.stubGlobal('fetch', fetchMock)

    await laQuTeZhengKaiGuan()

    expect(fetchMock).toHaveBeenCalledOnce()
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe('/api/config/feature-flags')
    expect(huoQuJunShiKaiGuan()).toBe(false)
    expect(huoQuTeZhengKaiGuan().junShi).toBe(false)
  })

  it('响应中非布尔值被过滤，布尔值生效', async () => {
    const fetchMock = vi.fn(
      () =>
        Promise.resolve(
          new Response(JSON.stringify({ junShi: false, xinTeZheng: 'yes' }), { status: 200 }),
        ) as Promise<Response>,
    )
    vi.stubGlobal('fetch', fetchMock)

    await laQuTeZhengKaiGuan()

    expect(huoQuJunShiKaiGuan()).toBe(false)
    expect(huoQuTeZhengKaiGuan().xinTeZheng).toBeUndefined()
  })

  it('拉取失败静默保持默认值', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error('wangLuoYiChang')))
    vi.stubGlobal('fetch', fetchMock)

    await expect(laQuTeZhengKaiGuan()).resolves.toBeUndefined()
    expect(huoQuJunShiKaiGuan()).toBe(true)
  })

  it('响应非 200 时保持默认值', async () => {
    const fetchMock = vi.fn(
      () => Promise.resolve(new Response('{}', { status: 500 })) as Promise<Response>,
    )
    vi.stubGlobal('fetch', fetchMock)

    await laQuTeZhengKaiGuan()

    expect(huoQuJunShiKaiGuan()).toBe(true)
  })

  it('响应体非法 JSON 结构时保持默认值', async () => {
    const fetchMock = vi.fn(
      () => Promise.resolve(new Response('[1,2]', { status: 200 })) as Promise<Response>,
    )
    vi.stubGlobal('fetch', fetchMock)

    await laQuTeZhengKaiGuan()

    expect(huoQuJunShiKaiGuan()).toBe(true)
  })
})

describe('P1-8 军师入口 flag 门控', () => {
  beforeEach(() => {
    localStorage.clear()
    chongZhiTeZhengKaiGuan()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    chongZhiTeZhengKaiGuan()
  })

  it('默认开启时聊天页渲染军师入口', async () => {
    const wrapper = await mountCaiDan()
    sheZhiJiaoSeXinXi()
    await flushPromises()

    expect(wrapper.find('.junshi-anniu').exists()).toBe(true)
  })

  it('junShi=false 时聊天页军师入口不渲染', async () => {
    const fetchMock = vi.fn(
      () =>
        Promise.resolve(
          new Response(JSON.stringify({ junShi: false }), { status: 200 }),
        ) as Promise<Response>,
    )
    vi.stubGlobal('fetch', fetchMock)
    await laQuTeZhengKaiGuan()

    const wrapper = await mountCaiDan()
    sheZhiJiaoSeXinXi()
    await flushPromises()

    expect(wrapper.find('.junshi-anniu').exists()).toBe(false)
    // 其余右侧按钮不受影响
    expect(wrapper.find('.zhuti-qiehuan-anniu').exists()).toBe(true)
  })
})
