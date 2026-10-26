import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { huoQuFanYi } from '@/config/翻译表'
import type { PaiHangXiangMu, ZuBieGaiKuang } from '@/api/挑战'

const { 路由推 } = vi.hoisted(() => ({ 路由推: vi.fn() }))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: 路由推 }) }))
vi.mock('@/stores/用户', () => ({ 使用用户仓库: () => ({ dangQianYongHu: null }) }))
vi.mock('@/api/挑战', () => ({
  huoQuDangQianDuiJu: vi.fn(),
  huoQuWoDeGaiKuang: vi.fn(),
  huoQuPaiHangBang: vi.fn(),
  huoQuTiaoZhanPeiZhi: vi.fn(),
  fangQiDuiJu: vi.fn(),
}))

import 挑战主页 from '@/views/挑战主页.vue'
import 挑战积分榜 from '@/views/挑战积分榜.vue'
import { huoQuDangQianDuiJu, huoQuPaiHangBang, huoQuWoDeGaiKuang } from '@/api/挑战'

const 本目录 = dirname(fileURLToPath(import.meta.url))
const 根 = resolve(本目录, '..')
const 读源 = (...路径段: string[]) => readFileSync(resolve(根, ...路径段), 'utf8')

const 挑战主页源 = 读源('views', '挑战主页.vue')
const 挑战积分榜源 = 读源('views', '挑战积分榜.vue')
const 资料设置向导源 = 读源('views', '资料设置向导.vue')
const 性别步骤源 = 读源('components', '资料设置', '性别选择步骤.vue')
const 挑战空态源 = 读源('components', '挑战空态.vue')
const 翻译表源 = 读源('config', '翻译表.ts')

const 概况: ZuBieGaiKuang[] = []

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  vi.mocked(huoQuDangQianDuiJu).mockResolvedValue(null)
  vi.mocked(huoQuWoDeGaiKuang).mockResolvedValue(概况)
  vi.mocked(huoQuPaiHangBang).mockResolvedValue([])
})

describe('FP-13 三步向导同一实现', () => {
  it('普通模式向导与挑战开始向导都直接引用同一性别步骤组件', () => {
    expect(资料设置向导源).toContain("from '@/components/资料设置/性别选择步骤.vue'")
    expect(挑战主页源).toContain("from '@/components/资料设置/性别选择步骤.vue'")
    expect(资料设置向导源.match(/<XingBieXuanZeBuZhou/g)?.length).toBe(2)
    expect(挑战主页源.match(/<XingBieXuanZeBuZhou/g)?.length).toBe(2)
    expect(挑战主页源).not.toContain('class="xingBie-kaPian')
    expect(挑战主页源).not.toContain('xingBie-wangGe')
  })

  it('组件本身只渲染标题、描述与两张性别卡', () => {
    expect(性别步骤源.match(/class="xingBie-kaPian/g)?.length).toBe(4)
    expect(性别步骤源).toContain(`huoQuFanYi('ziLiaoSheZhi', 'xingBieNan')`)
    expect(性别步骤源).toContain(`huoQuFanYi('ziLiaoSheZhi', 'xingBieNv')`)
    expect(性别步骤源).not.toContain('mbti')
  })

  it('挑战第三步只有确认开始按钮，不含性格与心目中的TA内容', () => {
    const 起 = 挑战主页源.indexOf('v-else key="tzb3"')
    const 末 = 挑战主页源.indexOf('</Transition>', 起)
    expect(起).toBeGreaterThan(-1)
    const 第三步 = 挑战主页源.slice(起, 末)
    expect(第三步).toContain(`huoQuFanYi('tiaoZhan', 'queRenKaiShi')`)
    expect(第三步.match(/<button/g)?.length).toBe(1)
    expect(第三步).not.toContain('mbti')
    expect(第三步).not.toContain('xinMuZhongDeTa')
  })

  it('挑战向导进度点只有三枚且只能回跳', () => {
    expect(挑战主页源).toContain('const tiaoZhanBuZhouLieBiao = [1, 2, 3]')
    expect(挑战主页源).toContain('if (buZhou >= xingBieBuZhou.value || kaiShiQingQiuZhong.value) return')
  })

  it('确认开始复用原开局数据流并落入临时资料', async () => {
    const 包 = mount(挑战主页, { attachTo: document.body })
    await flushPromises()
    await 包.find('.anniu-kaiShi').trigger('click')
    await flushPromises()
    await 包.findAll('.xingBie-kaPian')[0]?.trigger('click')
    await 包.findAll('.tanchuang-caozuo .anniu')[0]?.trigger('click')
    await 包.findAll('.xingBie-kaPian')[1]?.trigger('click')
    await 包.findAll('.tanchuang-caozuo .anniu')[1]?.trigger('click')
    await flushPromises()
    await 包.find('.queren-kai-shi').trigger('click')
    await flushPromises()
    expect(路由推).toHaveBeenCalledWith('/tian-jia-wei-xin')
    const 临时 = JSON.parse(sessionStorage.getItem('ziLiaoSheZhiLinShi') ?? '{}')
    expect(临时).toMatchObject({
      moshi: 'tiaozhan',
      xingBie: 'male',
      woDeXingBie: '男',
      muBiaoXingBie: 'female',
    })
    包.unmount()
  })
})

describe('FP-12 空态单一灰样式', () => {
  it('两个挑战页的空态都指向同一挑战空态组件', () => {
    expect(挑战主页源).toContain("from '@/components/挑战空态.vue'")
    expect(挑战积分榜源).toContain("from '@/components/挑战空态.vue'")
    expect(挑战主页源.match(/<TiaoZhanKongTai>/g)?.length).toBe(2)
    expect(挑战积分榜源.match(/<TiaoZhanKongTai>/g)?.length).toBe(1)
  })

  it('白色空态样式已删除，唯一灰样式落在共享组件', () => {
    expect(挑战主页源).not.toContain('.zhaiyao-kong')
    expect(挑战积分榜源).not.toContain('.kong-biaoti')
    expect(挑战空态源).toContain('color: var(--tz-wen-ci)')
    expect(挑战空态源).toContain('font-size: var(--tz-zi-zheng)')
    expect(挑战空态源.match(/color:/g)?.length).toBe(1)
  })

  it('榜首空态文案只剩两个页面两处渲染，共用一个组件类', () => {
    const 引用 =
      (挑战主页源.match(/zanWuPaiHang/g)?.length ?? 0) +
      (挑战积分榜源.match(/zanWuPaiHang/g)?.length ?? 0)
    expect(引用).toBe(2)
  })

  it('前五名文本与键位已删除', () => {
    expect(挑战主页源).not.toContain('qianWuMing')
    expect(翻译表源).not.toContain('qianWuMing')
    expect(翻译表源).not.toContain('前五名')
  })

  it('积分榜按钮已删除，查看完整积分榜入口保留', () => {
    expect(挑战主页源).not.toContain('anniu-paihang')
    expect(挑战主页源).not.toContain(`huoQuFanYi('tiaoZhan', 'paiHangBang')`)
    expect(翻译表源).not.toContain("paiHangBang: '积分榜'")
    expect(挑战主页源).toContain('zhaiyao-quanbu')
    expect(挑战主页源).toContain(`huoQuFanYi('tiaoZhan', 'chaKanWanZhengBang')`)
  })

  it('空榜时挑战主页速览区渲染唯一可见的灰色空态', async () => {
    const 包 = mount(挑战主页, { attachTo: document.body })
    await flushPromises()
    await flushPromises()
    const kong = 包.findAll('.tiaozhan-kong-wen')
    expect(kong).toHaveLength(2)
    expect(kong[0]?.text()).toBe('')
    expect(kong[1]?.text()).toBe(huoQuFanYi('tiaoZhan', 'zanWuPaiHang'))
    expect(kong[1]?.isVisible()).toBe(true)
    expect(kong[0]?.isVisible()).toBe(false)
    包.unmount()
  })

  it('空榜时积分榜页复用同一组件类', async () => {
    const 包 = mount(挑战积分榜)
    await flushPromises()
    const kong = 包.find('.bangdan-kong .tiaozhan-kong-wen')
    expect(kong.exists()).toBe(true)
    expect(kong.text()).toBe(huoQuFanYi('tiaoZhan', 'zanWuPaiHang'))
    expect(包.find('.kong-anniu').exists()).toBe(true)
    包.unmount()
  })
})
