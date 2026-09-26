import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import 挑战积分榜 from '@/views/挑战积分榜.vue'
import { huoQuFanYi } from '@/config/translations'
import { huoQuPaiHangBang, type PaiHangXiangMu } from '@/api/挑战'

vi.mock('@/api/挑战')

const moPaiHang = vi.mocked(huoQuPaiHangBang)

function chuangJianLuYou() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/tiao-zhan', component: { template: '<div>挑战主页</div>' } },
      {
        path: '/tiao-zhan/pai-hang',
        name: 'tiaoZhanPaiHangBang',
        component: 挑战积分榜,
      },
    ],
  })
}

function zhiPaiHang(): PaiHangXiangMu[] {
  return [
    {
      pai_ming: 1,
      yong_hu_ming: '玩家一',
      ji_fen: 1810,
      duan_wei: '大师',
      sheng_chang: 30,
      fu_chang: 10,
      qi_quan_chang: 2,
      zui_gao_lian_sheng: 8,
    },
    {
      pai_ming: 2,
      yong_hu_ming: '玩家二',
      ji_fen: 1020,
      duan_wei: '青铜',
      sheng_chang: 3,
      fu_chang: 5,
      qi_quan_chang: 0,
      zui_gao_lian_sheng: 2,
    },
  ]
}

async function guaZai() {
  const luYou = chuangJianLuYou()
  const pinia = createPinia()
  setActivePinia(pinia)
  luYou.push('/tiao-zhan/pai-hang')
  await luYou.isReady()
  const wrapper = mount(挑战积分榜, {
    global: { plugins: [pinia, luYou] },
  })
  await flushPromises()
  return { wrapper, luYou }
}

describe('挑战积分榜组件', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('默认加载男女组别并渲染排行榜', async () => {
    moPaiHang.mockResolvedValue(zhiPaiHang())
    const { wrapper } = await guaZai()

    expect(moPaiHang).toHaveBeenCalledWith('nan_nv')
    expect(wrapper.text()).toContain('玩家一')
    expect(wrapper.text()).toContain('大师')
    expect(wrapper.text()).toContain(huoQuFanYi('tiaoZhan', 'biaoTi'))
  })

  it('切换组别标签重新拉取对应榜单', async () => {
    moPaiHang.mockResolvedValue(zhiPaiHang())
    const { wrapper } = await guaZai()

    const anNiuLieBiao = wrapper.findAll('.zubie-anNiu')
    expect(anNiuLieBiao.length).toBe(4)
    await anNiuLieBiao[2].trigger('click')
    await flushPromises()

    expect(moPaiHang).toHaveBeenLastCalledWith('nan_nan')
  })

  it('空榜单时显示占位提示', async () => {
    moPaiHang.mockResolvedValue([])
    const { wrapper } = await guaZai()

    expect(wrapper.text()).toContain(huoQuFanYi('tiaoZhan', 'zanWuPaiHang'))
  })

  it('返回按钮跳回挑战主页', async () => {
    moPaiHang.mockResolvedValue(zhiPaiHang())
    const { wrapper, luYou } = await guaZai()

    await wrapper.find('.anniu-fanhui').trigger('click')
    await flushPromises()

    expect(luYou.currentRoute.value.path).toBe('/tiao-zhan')
  })

  it('浅色档全文本吃主题令牌：无白字残留、无深色容器字面量', async () => {
    moPaiHang.mockResolvedValue(zhiPaiHang())
    const { wrapper } = await guaZai()
    await flushPromises()
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const 源 = readFileSync(resolve(__dirname, '../views/挑战积分榜.vue'), 'utf8')
    const 样式 = (/<style[^>]*>([\s\S]*?)<\/style>/.exec(源)?.[1] ?? '').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    expect(样式).not.toMatch(/color:\s*#ffffff/)
    expect(样式).not.toMatch(/color:\s*rgba\(255,\s*255,\s*255/)
    expect(样式).not.toMatch(/background:\s*rgba\(20,\s*24,\s*40/)
    expect(样式).toMatch(/\.paihang-biaoti\s*\{[^}]*color:\s*var\(--wenben-zhuse\)/)
    expect(样式).toMatch(/\.yonghu-ming\s*\{[^}]*color:\s*var\(--wenben-zhuse\)/)
    expect(样式).toMatch(/\.jifen-zhi\s*\{[^}]*color:\s*var\(--pinpai-fen-shen\)/)
    expect(wrapper.text()).toContain('玩家一')
  })
})
