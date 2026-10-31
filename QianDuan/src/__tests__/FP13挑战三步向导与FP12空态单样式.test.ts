import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
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

  it('白色空态样式已删除，唯一灰样式走永久灰令牌', () => {
    expect(挑战主页源).not.toContain('.zhaiyao-kong')
    expect(挑战积分榜源).not.toContain('.kong-biaoti')
    expect(挑战空态源).toContain('color: var(--tz-kong-wen)')
    expect(挑战空态源).not.toContain('--tz-wen-ci')
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

  it('空榜时挑战主页速览区只渲染一份灰色空态', async () => {
    const 包 = mount(挑战主页, { attachTo: document.body })
    await flushPromises()
    await flushPromises()
    const kong = 包.findAll('.tiaozhan-kong-wen')
    expect(kong).toHaveLength(1)
    expect(kong[0]?.text()).toBe(huoQuFanYi('tiaoZhan', 'zanWuPaiHang'))
    expect(kong[0]?.isVisible()).toBe(true)
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

const 灰令牌 = '--tz-kong-wen: color-mix(in srgb, var(--tz-wen-ci) 50%, var(--tz-mian));'

const 榜单甲: PaiHangXiangMu[] = [
  {
    pai_ming: 1,
    yong_hu_ming: '江晚吟',
    ji_fen: 3120,
    duan_wei: '最强王者',
    sheng_chang: 40,
    fu_chang: 2,
    qi_quan_chang: 0,
    zui_gao_lian_sheng: 12,
  },
]

const 榜单乙: PaiHangXiangMu[] = [
  {
    pai_ming: 1,
    yong_hu_ming: '后来的赢家',
    ji_fen: 4000,
    duan_wei: '荣耀王者',
    sheng_chang: 12,
    fu_chang: 1,
    qi_quan_chang: 0,
    zui_gao_lian_sheng: 6,
  },
]

function 延迟榜单() {
  let 兑现!: (榜单: PaiHangXiangMu[]) => void
  const 承诺 = new Promise<PaiHangXiangMu[]>((jieJue) => {
    兑现 = jieJue
  })
  return { 承诺, 兑现 }
}

describe('FP-13 空态永久灰与榜单四态单一源', () => {
  it('两页根节点各定义一次永久灰令牌，共享空态只引用该令牌', () => {
    expect(挑战主页源.match(/--tz-kong-wen:/g)).toHaveLength(1)
    expect(挑战积分榜源.match(/--tz-kong-wen:/g)).toHaveLength(1)
    expect(挑战主页源).toContain(灰令牌)
    expect(挑战积分榜源).toContain(灰令牌)
    expect(挑战空态源).not.toContain('var(--tz-wen-ci)')
  })

  it('切组变暗的假象状态与残留类已清零', () => {
    for (const 源 of [挑战主页源, 挑战积分榜源]) {
      expect(源).not.toContain('data-qie-huan')
      expect(源).not.toContain('bangDanQieHuanZhong')
      expect(源).not.toContain('qieHuanZhong')
      expect(源).not.toContain('bangDanYiJiaZai')
      expect(源).not.toContain('bangDanZaiZai')
      expect(源).not.toContain('nei--die')
      expect(源).not.toContain('v-show=')
    }
  })

  it('四态合并为单一枚举，模板只留一条 v-if 链', () => {
    for (const 源 of [挑战主页源, 挑战积分榜源]) {
      expect(源).toContain("type 榜单状态 = 'jiaZai' | 'cuoWu' | 'kong' | 'bangDan'")
      expect(源).toContain('const bangDanZhuangTai = ref<榜单状态>')
      expect(源).toContain(`v-if="bangDanZhuangTai === 'jiaZai'"`)
      expect(源).toContain(`v-else-if="bangDanZhuangTai === 'cuoWu'"`)
      expect(源).toContain(`v-else-if="bangDanZhuangTai === 'kong'"`)
    }
    expect(挑战主页源).toContain('<ol v-else class="zhaiyao-liebiao">')
    expect(挑战积分榜源).toContain('<ol v-else class="bangdan-liebiao">')
  })

  it('主页切组立即清空旧榜单并显示骨架，返回后进入空态', async () => {
    vi.mocked(huoQuPaiHangBang).mockResolvedValueOnce(榜单甲)
    const 包 = mount(挑战主页, { attachTo: document.body })
    await flushPromises()
    await flushPromises()
    expect(包.findAll('.zhaiyao-hang')).toHaveLength(1)
    const 延迟 = 延迟榜单()
    vi.mocked(huoQuPaiHangBang).mockReturnValueOnce(延迟.承诺)
    await 包.findAll('.zu-anniu')[1]?.trigger('click')
    await nextTick()
    expect(包.findAll('.zhaiyao-hang')).toHaveLength(0)
    expect(包.findAll('.zhaiyao-zhanwei').length).toBeGreaterThan(0)
    expect(包.find('.zhaiyao-wo').exists()).toBe(false)
    expect(包.find('.tiaozhan-kong-wen').exists()).toBe(false)
    expect(包.find('.zhaiyao-chongshi').exists()).toBe(false)
    延迟.兑现([])
    await flushPromises()
    expect(包.findAll('.zhaiyao-zhanwei')).toHaveLength(0)
    expect(包.find('.zhaiyao-nei .tiaozhan-kong-wen').text()).toBe(
      huoQuFanYi('tiaoZhan', 'zanWuPaiHang'),
    )
    包.unmount()
  })

  it('主页快速连续切组只接受最后一次响应', async () => {
    vi.mocked(huoQuPaiHangBang).mockResolvedValueOnce(榜单甲)
    const 包 = mount(挑战主页, { attachTo: document.body })
    await flushPromises()
    await flushPromises()
    const 慢 = 延迟榜单()
    const 快 = 延迟榜单()
    vi.mocked(huoQuPaiHangBang).mockReturnValueOnce(慢.承诺).mockReturnValueOnce(快.承诺)
    await 包.findAll('.zu-anniu')[1]?.trigger('click')
    await 包.findAll('.zu-anniu')[2]?.trigger('click')
    await nextTick()
    快.兑现(榜单乙)
    await flushPromises()
    expect(包.find('.zhaiyao-hang').text()).toContain('后来的赢家')
    慢.兑现(榜单甲)
    await flushPromises()
    expect(包.find('.zhaiyao-hang').text()).toContain('后来的赢家')
    expect(包.text()).not.toContain('江晚吟')
    包.unmount()
  })

  it('主页错误态只显示错误空态，不与骨架或残留列表叠加', async () => {
    vi.mocked(huoQuPaiHangBang).mockRejectedValueOnce(new Error('接口异常'))
    const 包 = mount(挑战主页, { attachTo: document.body })
    await flushPromises()
    await flushPromises()
    expect(包.findAll('.zhaiyao-zhanwei')).toHaveLength(0)
    expect(包.findAll('.zhaiyao-hang')).toHaveLength(0)
    const 文 = 包.find('.zhaiyao-nei .tiaozhan-kong-wen')
    expect(文.exists()).toBe(true)
    expect(文.text()).not.toBe('')
    expect(文.text()).not.toBe(huoQuFanYi('tiaoZhan', 'zanWuPaiHang'))
    包.unmount()
  })

  it('积分榜切组清空旧榜单、显示骨架并丢弃过期响应', async () => {
    vi.mocked(huoQuPaiHangBang).mockResolvedValueOnce(榜单甲)
    const 包 = mount(挑战积分榜)
    await flushPromises()
    expect(包.findAll('.bangdan-hang')).toHaveLength(1)
    const 慢 = 延迟榜单()
    const 快 = 延迟榜单()
    vi.mocked(huoQuPaiHangBang).mockReturnValueOnce(慢.承诺).mockReturnValueOnce(快.承诺)
    await 包.findAll('.zubie-anNiu')[1]?.trigger('click')
    await nextTick()
    expect(包.findAll('.bangdan-hang')).toHaveLength(0)
    expect(包.findAll('.bangdan-zhanwei').length).toBeGreaterThan(0)
    expect(包.find('.bangdan-tou').exists()).toBe(false)
    await 包.findAll('.zubie-anNiu')[2]?.trigger('click')
    快.兑现(榜单乙)
    await flushPromises()
    expect(包.find('.bangdan-hang').text()).toContain('后来的赢家')
    慢.兑现(榜单甲)
    await flushPromises()
    expect(包.find('.bangdan-hang').text()).toContain('后来的赢家')
    expect(包.findAll('.bangdan-hang')).toHaveLength(1)
    包.unmount()
  })

  it('积分榜错误态只显示请求错误块，不叠加骨架或列表', async () => {
    vi.mocked(huoQuPaiHangBang).mockRejectedValueOnce(new Error('接口异常'))
    const 包 = mount(挑战积分榜)
    await flushPromises()
    expect(包.find('.qian-tai-cuo-wu').exists()).toBe(true)
    expect(包.findAll('.bangdan-zhanwei')).toHaveLength(0)
    expect(包.findAll('.bangdan-hang')).toHaveLength(0)
    expect(包.find('.bangdan-kong').exists()).toBe(false)
    包.unmount()
  })
})
