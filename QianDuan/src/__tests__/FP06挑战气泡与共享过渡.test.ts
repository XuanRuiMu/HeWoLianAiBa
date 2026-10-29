import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { huoQuFanYi } from '@/config/翻译表'
import type { TiaoZhanDuiJu } from '@/api/挑战'

const { 路由推 } = vi.hoisted(() => ({ 路由推: vi.fn() }))
const 对局 = vi.hoisted(() => ({ dangQian: null as TiaoZhanDuiJu | null }))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: 路由推 }) }))
vi.mock('@/stores/用户', () => ({ 使用用户仓库: () => ({ dangQianYongHu: null }) }))
vi.mock('@/api/挑战', () => ({
  huoQuDangQianDuiJu: vi.fn(async () => 对局.dangQian),
  huoQuWoDeGaiKuang: vi.fn(async () => []),
  huoQuPaiHangBang: vi.fn(async () => []),
  huoQuTiaoZhanPeiZhi: vi.fn(async () => ({ zha_xing_gai_lv: 0.3, fang_qi_kou_fen: 15 })),
  fangQiDuiJu: vi.fn(),
}))

import 挑战主页 from '@/views/挑战主页.vue'

const 本目录 = dirname(fileURLToPath(import.meta.url))
const 根 = resolve(本目录, '..')
const 读源 = (...路径段: string[]) =>
  readFileSync(resolve(根, ...路径段), 'utf8').replace(/\r\n/g, '\n')
const 挑战源 = 读源('views', '挑战主页.vue')
const 向导源 = 读源('views', '资料设置向导.vue')
const 过渡源 = 读源('styles', '步骤过渡.css')
const 入口源 = 读源('入口.ts')
const 后端源 = readFileSync(resolve(根, '..', '..', 'HouDuan', 'src', 'server.ts'), 'utf8').replace(
  /\r\n/g,
  '\n',
)

const 当前对局: TiaoZhanDuiJu = {
  id: 'd-1',
  jiao_se_id: 'j-1',
  wan_jia_xing_bie: '男',
  dui_xiang_xing_bie: '女',
  wei_xin_ming: '林小满',
  tou_xiang: '',
  chuang_jian_shi_jian: '',
}

async function 挂主页(): Promise<VueWrapper> {
  const 包 = mount(挑战主页, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return 包
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  对局.dangQian = null
})

describe('FP-06 挑战气泡与共享步骤过渡', () => {
  it('已有对局时开始按钮点不动，悬停或点击只弹“请先完成已有的挑战”，不打开性别弹层', async () => {
    对局.dangQian = 当前对局
    const 包 = await 挂主页()
    const 开始 = 包.get('.anniu-kaiShi')
    expect(开始.attributes('disabled')).toBeDefined()
    await 包.get('.kai-shi-wei').trigger('click')
    expect(包.find('.xingbie-tanchuang').exists()).toBe(false)
    expect(包.find('.tishi-qipao--zhong').text()).toBe('请先完成已有的挑战')
    await 包.get('.kai-shi-wei').trigger('mouseenter')
    expect(包.find('.tishi-qipao--zhong').exists()).toBe(true)
    包.unmount()
  })

  it('无对局时点击开始按钮仍打开三步向导', async () => {
    const 包 = await 挂主页()
    await 包.get('.anniu-kaiShi').trigger('click')
    await flushPromises()
    expect(包.find('.xingbie-tanchuang').exists()).toBe(true)
    包.unmount()
  })

  it('放弃对局点击后立即气泡提示扣分数值，取消后消失', async () => {
    对局.dangQian = 当前对局
    const 包 = await 挂主页()
    await 包.find('.duiju-cao .anniu--wei').trigger('click')
    await flushPromises()
    const 确认钮 = 包.get('.fangqi-que-ren-wei > .anniu--wei')
    expect(确认钮.text()).toBe(huoQuFanYi('tiaoZhan', 'queRenFangQi'))
    const 气泡 = 包.get('.fangqi-que-ren-wei .tishi-qipao')
    expect(气泡.text()).toBe(
      huoQuFanYi('tiaoZhan', 'fangQiKouFenTiShi').replace('{fenshu}', '15'),
    )
    expect(气泡.element.parentElement).toBe(确认钮.element.parentElement)
    expect(包.find('.duiju-cao > .tishi-qipao').exists()).toBe(false)
    await 包.find('.duiju-cao .anniu--mo').trigger('click')
    expect(包.find('.fangqi-que-ren-wei .tishi-qipao').exists()).toBe(false)
    包.unmount()
  })

  it('确认态气泡跟随确认按钮锚点，桌面与窄屏共用同一 DOM 结构', async () => {
    对局.dangQian = 当前对局
    const 桌面 = await 挂主页()
    await 桌面.find('.duiju-cao .anniu--wei').trigger('click')
    await flushPromises()
    const 桌面结构 = 桌面.get('.duiju-cao').html()
    expect(桌面.get('.fangqi-que-ren-wei .tishi-qipao').exists()).toBe(true)
    桌面.unmount()

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390,
    })
    const 窄屏 = await 挂主页()
    await 窄屏.find('.duiju-cao .anniu--wei').trigger('click')
    await flushPromises()
    expect(窄屏.get('.duiju-cao').html()).toBe(桌面结构)
    expect(窄屏.get('.fangqi-que-ren-wei .tishi-qipao').exists()).toBe(true)
    窄屏.unmount()
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280,
    })
  })

  it('放弃气泡锚点容器相对定位，旧整行右缘定位已删除', () => {
    expect(挑战源).toMatch(/\.fangqi-que-ren-wei\s*\{[^}]*position:\s*relative/)
    expect(挑战源).not.toMatch(/\.duiju-cao\s*\{[^}]*position:\s*relative/)
    expect(挑战源).not.toContain('tishi-qipao--you')
    expect(挑战源).toContain("huoQuFanYi('tiaoZhan', 'fangQiKouFenTiShi')")
  })

  it('普通与排位共用同一套步骤过渡，挑战页不再保留 28px 私有动画', () => {
    expect(挑战源).toContain("ref('buZhou-qianJin')")
    expect(挑战源).toContain("'buZhou-houTui'")
    expect(挑战源).not.toContain('buzhou-qian-jin')
    expect(挑战源).not.toContain('buzhou-hou-tui')
    expect(向导源).not.toContain('.buZhou-qianJin-enter-active,')
    expect(过渡源).toContain('.buZhou-qianJin-enter-active,')
    expect(过渡源).toContain('.buZhou-houTui-enter-active,')
    expect(过渡源).toContain('transform 0.35s var(--quxian-biao-zhun)')
    expect(过渡源).not.toContain('translateX(28px)')
    expect(入口源).toContain("import './styles/步骤过渡.css'")
  })

  it('放弃扣分由后端配置单一真源下发，前端不硬编码分值', () => {
    expect(后端源).toContain('fang_qi_kou_fen: TIAO_ZHAN_PEI_ZHI.fangQiKouFen')
    expect(挑战源).not.toContain('15分')
    expect(挑战源).not.toContain('减少15')
    expect(挑战源).toContain("huoQuFanYi('tiaoZhan', 'fangQiKouFenTiShi')")
  })

  it('排位赛开局进入与普通模式相同的添加微信加载页', () => {
    expect(挑战源).toContain("router.push('/tian-jia-wei-xin')")
    const 添加微信源 = 读源('views', '添加微信.vue')
    expect(添加微信源).toContain("import ZaiRuYe from '@/components/载入页.vue'")
    expect(添加微信源).toContain('使用角色生成仓库')
  })
})
