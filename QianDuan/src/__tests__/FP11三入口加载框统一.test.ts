import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h, nextTick, onMounted, ref } from 'vue'
import 载入页 from '@/components/载入页.vue'
import 添加微信 from '@/views/添加微信.vue'
import 载入聊天 from '@/views/载入聊天.vue'
import { fanYi } from '@/config/翻译表'
import {
  使用进入聊天加载,
  type 进入聊天加载配置,
  type 进入聊天执行上下文,
} from '@/composables/use进入聊天加载'

const { 预加载聊天页 } = vi.hoisted(() => ({ 预加载聊天页: vi.fn() }))
vi.mock('@/composables/use聊天预加载', () => ({ 预加载聊天页 }))

const { kaiShiTiaoZhan } = vi.hoisted(() => ({ kaiShiTiaoZhan: vi.fn() }))
vi.mock('@/api/挑战', () => ({ kaiShiTiaoZhan }))

const { shengChengJiaoSe, queRenJiaoSe, chuangJianHuiHua } = vi.hoisted(() => ({
  shengChengJiaoSe: vi.fn(),
  queRenJiaoSe: vi.fn(),
  chuangJianHuiHua: vi.fn(),
}))
vi.mock('@/api/聊天', () => ({ shengChengJiaoSe, queRenJiaoSe, chuangJianHuiHua }))

const 根 = resolve(__dirname, '..')
const 读源 = (相对: string): string =>
  readFileSync(resolve(根, 相对), 'utf8').replace(/\r\n/g, '\n')
const 载入页源 = 读源('components/载入页.vue')
const 控制器源 = 读源('composables/use进入聊天加载.ts')
const 添加微信源 = 读源('views/添加微信.vue')
const 载入聊天源 = 读源('views/载入聊天.vue')
const 挑战源 = 读源('views/挑战主页.vue')
const 生成仓库源 = 读源('stores/角色生成.ts')

function 取样式(源: string): string {
  return [...源.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((匹) => 匹[1])
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

function 取规则(样式: string, 选择器: string): string {
  return (
    new RegExp(`${选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`).exec(样式)?.[1] ??
    ''
  )
}

const 载入样式 = 取样式(载入页源)

const 三套趣味语 = () => {
  const 分类 = (fanYi as Record<string, unknown>).zaiRuLiaoTian as Record<string, unknown>
  const 分组 = 分类.quWeiYu as Record<string, string[]>
  return {
    puTong: 分组.puTong,
    paiWei: 分组.paiWei,
    huiYi: 分组.huiYi,
  }
}

function 建壳(): HTMLDivElement {
  const 壳 = document.createElement('div')
  壳.className = 'app-rongqi'
  document.body.appendChild(壳)
  return 壳
}

function 挂载页(覆盖: Record<string, unknown> = {}) {
  return mount(载入页, {
    props: {
      changJing: 'puTong',
      touXiang: null,
      moRenZi: '👩',
      duiXiangId: 'abcdef1234567890',
      biaoTi: '微信昵称',
      quWeiYu: '正在打开手机...',
      jinDu: 40,
      ...覆盖,
    },
  })
}

const 等待 = (毫秒: number) => new Promise<void>((结束) => setTimeout(结束, 毫秒))

async function 等待直到(条件: () => boolean, 超时毫秒 = 2000): Promise<boolean> {
  const 起点 = Date.now()
  while (!条件()) {
    if (Date.now() - 起点 > 超时毫秒) return false
    await 等待(10)
  }
  return true
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('FP-11 三入口加载框：单一展示组件与单一控制器', () => {
  it('载入页只做展示，接收场景/头像/对象ID/标题/趣味语/进度/错误/重试', () => {
    expect(载入页源).toContain('changJing: 进入聊天场景')
    expect(载入页源).toContain('touXiang?: string | null')
    expect(载入页源).toContain('duiXiangId?: string | null')
    expect(载入页源).toContain('biaoTi?: string')
    expect(载入页源).toContain('quWeiYu?: string')
    expect(载入页源).toContain('jinDu: number')
    expect(载入页源).toContain('cuoWu?: string')
    expect(载入页源).toContain('chongShiKeYong?: boolean')
    expect(载入页源).toContain('defineEmits<{ fanHui: []; zhongShi: [] }>()')
    expect(载入页源).toContain('<Teleport :to="guaZaiMuBiao">')
    expect(载入页源).toContain(':data-chang-jing="changJing"')
    expect(载入页源).not.toContain('setInterval')
    expect(载入页源).not.toContain('setTimeout')
    expect(载入页源).not.toMatch(/transform:/)
  })

  it('普通、排位、回忆三个入口渲染同一组件并消费同一控制器', () => {
    for (const 源 of [添加微信源, 载入聊天源]) {
      expect(源).toContain("import ZaiRuYe from '@/components/载入页.vue'")
      expect(源).toContain('使用进入聊天加载({')
      expect(源).toContain(':qu-wei-yu="当前趣味语"')
      expect(源).toContain(':jin-du="进度"')
      expect(源).toContain(':cuo-wu="错误"')
      expect(源).toContain(':dui-xiang-id=')
      expect(源).toContain('@zhong-shi="重试"')
      expect(源).not.toContain('setInterval')
      expect(源).not.toContain('ZUI_DUAN_ZHAN_SHI_HAO_MIAO')
      expect(源).not.toContain('TI_SHI_ZHOU_QI_HAO_MIAO')
    }
    expect(生成仓库源).not.toContain('setInterval')
    expect(生成仓库源).not.toContain('dengDaiYuLieBiao')
    expect(生成仓库源).not.toContain('dangQianWenAn')
    expect(控制器源).toContain('onBeforeUnmount(取消)')
  })

  it('排位与普通共用添加微信页但场景分离，回忆入口固定回忆场景', () => {
    expect(挑战源).toContain("router.push('/tian-jia-wei-xin')")
    expect(挑战源).toContain("moshi: 'tiaozhan'")
    expect(添加微信源).toMatch(/\.moshi === 'tiaozhan' \? 'paiWei' : 'puTong'/)
    expect(添加微信源).toContain('fanYi.zaiRuLiaoTian.quWeiYu[场景.value]')
    expect(载入聊天源).toContain('chang-jing="huiYi"')
    expect(载入聊天源).toContain('fanYi.zaiRuLiaoTian.quWeiYu.huiYi')
    expect(载入聊天源).toContain('预加载聊天页(benCiJiaoSeId')
  })

  it('添加微信不再把头像地址误当默认字传入', () => {
    expect(添加微信源).toContain(':mo-ren-zi="moRenTouXiang"')
    expect(添加微信源).not.toContain(':mo-ren-zi="仓库.jiaoSeXinXi?.tou_xiang')
    expect(添加微信源).toContain("if (xingBie === 'nv') return '👩'")
    expect(添加微信源).toContain("if (xingBie === 'nan') return '👨'")
    expect(添加微信源).toContain("return '💬'")
  })

  it('头像、标题、对象ID、趣味语、进度槽位定高，三场景结构一致', () => {
    expect(取规则(载入样式, '.zairu-touxiang-wei')).toContain('flex: none')
    expect(取规则(载入样式, '.zairu-mingcheng-wei')).toContain('flex: none')
    expect(取规则(载入样式, '.zairu-biaoti')).toContain('height: 29px')
    expect(取规则(载入样式, '.zairu-duixiang-id')).toContain('height: 18px')
    expect(取规则(载入样式, '.zairu-tishi')).toContain(
      'height: calc(var(--jiange-da) + var(--jiange-12))',
    )
    expect(取规则(载入样式, '.zairu-jindu-tiao')).toContain('height: 4px')
    expect(载入样式).toMatch(
      /@media \(max-height: 420px\) \{[\s\S]*?\.zairu-duixiang-id \{\s*height: 16px;/,
    )
  })

  it('三套趣味语各自非空、互不重复且不共用同一数组', () => {
    const { puTong, paiWei, huiYi } = 三套趣味语()
    for (const [场景, 列表] of Object.entries({ puTong, paiWei, huiYi })) {
      expect(Array.isArray(列表), 场景).toBe(true)
      expect(列表.length, 场景).toBeGreaterThanOrEqual(20)
      for (const 条 of 列表) {
        expect(条.endsWith('...'), `${场景}：${条}`).toBe(true)
        expect(条).not.toContain('……')
      }
    }
    expect(puTong).toHaveLength(50)
    expect(paiWei).not.toEqual(puTong)
    expect(huiYi).not.toEqual(puTong)
    expect(paiWei).not.toEqual(huiYi)
    expect(new Set([...puTong, ...paiWei, ...huiYi]).size).toBe(
      puTong.length + paiWei.length + huiYi.length,
    )
  })
})

describe('FP-11 三场景渲染：对象ID、槽位与错误层', () => {
  it('三场景渲染相同的在流结构与槽位高度，仅场景标记不同', async () => {
    const 结构: string[][] = []
    for (const 场景 of ['puTong', 'paiWei', 'huiYi'] as const) {
      建壳()
      const 包 = 挂载页({ changJing: 场景 })
      await nextTick()
      const 浮层 = document.body.querySelector('.zairu-yemian') as HTMLElement
      const 卡 = 浮层.querySelector('.zairu-kaPian') as HTMLElement
      expect(浮层.dataset.changJing).toBe(场景)
      expect(卡.querySelector('.zairu-duixiang-id')?.textContent).toBe('UID：abcdef12')
      expect(getComputedStyle(卡.querySelector('.zairu-biaoti') as Element).height).toBe('29px')
      expect(getComputedStyle(卡.querySelector('.zairu-duixiang-id') as Element).height).toBe(
        '18px',
      )
      expect(getComputedStyle(卡.querySelector('.zairu-tishi') as Element).height).toBe(
        'calc(var(--jiange-da) + var(--jiange-12))',
      )
      结构.push(Array.from(卡.children).map((子) => (子 as HTMLElement).className))
      包.unmount()
      document.body.innerHTML = ''
    }
    expect(结构[0]).toEqual(['zairu-touxiang-wei', 'zairu-mingcheng-wei', 'zairu-zhuangtai'])
    expect(结构[1]).toEqual(结构[0])
    expect(结构[2]).toEqual(结构[0])
  })

  it('对象ID缺失时占位文案撑住定高槽位，不改变结构', async () => {
    建壳()
    const 包 = 挂载页({ duiXiangId: '' })
    await nextTick()
    const 槽 = document.body.querySelector('.zairu-duixiang-id') as HTMLElement
    expect(槽.textContent).toBe(`UID：${huoQuFanYiText()}`)
    expect(getComputedStyle(槽).height).toBe('18px')
    包.unmount()
  })

  it('错误态覆盖卡片但不改变在流结构，重试与返回按顺序提供', async () => {
    建壳()
    const 包 = 挂载页({
      cuoWu: '这段回忆没能载入，可以重试或返回战绩',
      chongShiKeYong: true,
    })
    await nextTick()
    const 卡 = document.body.querySelector('.zairu-kaPian') as HTMLElement
    expect(Array.from(卡.children).map((子) => (子 as HTMLElement).className)).toEqual([
      'zairu-touxiang-wei',
      'zairu-mingcheng-wei',
      'zairu-zhuangtai',
      'zairu-cuowu-ceng',
    ])
    const 按钮 = Array.from(卡.querySelectorAll<HTMLButtonElement>('.zairu-cuowu-anniu button'))
    expect(按钮.map((项) => 项.className)).toEqual(['zairu-chongshi', 'zairu-fanhui'])
    expect(按钮.map((项) => 项.textContent?.trim())).toEqual(['重试', '返回'])
    按钮[0]!.click()
    按钮[1]!.click()
    expect(包.emitted('zhongShi')).toHaveLength(1)
    expect(包.emitted('fanHui')).toHaveLength(1)
    包.unmount()
  })
})

function huoQuFanYiText(): string {
  const 分类 = (fanYi as Record<string, unknown>).zaiRuLiaoTian as Record<string, unknown>
  return String(分类.idDaiHuoQu)
}

function 建控制器宿主(覆盖: Partial<进入聊天加载配置> = {}) {
  const 完成 = vi.fn()
  const 执行 = vi.fn(async ({ 上报进度 }: 进入聊天执行上下文) => {
    上报进度(40)
  })
  let 控制器!: ReturnType<typeof 使用进入聊天加载>
  const 宿主 = defineComponent({
    setup() {
      const 实例 = 使用进入聊天加载({
        场景: () => 'puTong',
        趣味语列表: () => ['甲...', '乙...', '丙...'],
        错误文案: () => '这次没有成功',
        执行,
        完成,
        最短展示毫秒: 40,
        换词毫秒: 20,
        ...覆盖,
      })
      控制器 = 实例
      onMounted(实例.开始)
      return () => h('div')
    },
  })
  const 包 = mount(宿主)
  return { 包, 控制器, 完成, 执行 }
}

describe('FP-11 控制器：最短 1 秒、每 3 秒换词、错误重试取消', () => {
  it('进度单调推进，最短展示满 1 秒前不完成，完成后进度 100', async () => {
    const 执行 = vi.fn(async ({ 上报进度 }: 进入聊天执行上下文) => {
      上报进度(60)
      上报进度(20)
      上报进度(80)
    })
    const { 包, 控制器, 完成 } = 建控制器宿主({ 执行, 最短展示毫秒: 1000 })
    const 起始时间 = Date.now()
    await 等待(30)
    expect(控制器.进度.value).toBe(80)
    expect(完成).not.toHaveBeenCalled()
    expect(await 等待直到(() => 完成.mock.calls.length > 0)).toBe(true)
    expect(Date.now() - 起始时间).toBeGreaterThanOrEqual(990)
    expect(完成).toHaveBeenCalledTimes(1)
    expect(控制器.进度.value).toBe(100)
    包.unmount()
  })

  it('按配置周期轮换趣味语，默认常量为 3000 毫秒', async () => {
    expect(控制器源).toContain('HUAN_CI_ZHOU_QI_HAO_MIAO = 3000')
    expect(控制器源).toContain('配置.换词毫秒 ?? HUAN_CI_ZHOU_QI_HAO_MIAO')
    const { 包, 控制器 } = 建控制器宿主({ 最短展示毫秒: 3000, 换词毫秒: 40 })
    const 初始 = 控制器.当前趣味语.value
    expect(await 等待直到(() => 控制器.当前趣味语.value !== 初始)).toBe(true)
    const 第二 = 控制器.当前趣味语.value
    expect(await 等待直到(() => 控制器.当前趣味语.value !== 第二)).toBe(true)
    包.unmount()
  })

  it('覆盖趣味语优先于轮换，用于偷人提示', async () => {
    const 覆盖 = ref('对方正在偷人...')
    const { 包, 控制器 } = 建控制器宿主({
      覆盖趣味语: () => 覆盖.value.trim(),
      最短展示毫秒: 1000,
    })
    expect(控制器.当前趣味语.value).toBe('对方正在偷人...')
    覆盖.value = ''
    await nextTick()
    expect(控制器.当前趣味语.value).not.toBe('对方正在偷人...')
    包.unmount()
  })

  it('执行失败显示错误并可重试，重试成功后清除错误并完成', async () => {
    let 次数 = 0
    const 执行 = vi.fn(async ({ 上报进度 }: 进入聊天执行上下文) => {
      次数 += 1
      if (次数 === 1) throw new Error('第一次失败')
      上报进度(100)
    })
    const { 包, 控制器, 完成 } = 建控制器宿主({ 执行, 最短展示毫秒: 0 })
    expect(await 等待直到(() => 控制器.错误.value !== '')).toBe(true)
    expect(控制器.错误.value).toBe('这次没有成功')
    expect(控制器.可重试.value).toBe(true)
    expect(完成).not.toHaveBeenCalled()
    控制器.重试()
    expect(await 等待直到(() => 完成.mock.calls.length > 0)).toBe(true)
    expect(控制器.错误.value).toBe('')
    expect(控制器.进度.value).toBe(100)
    expect(完成).toHaveBeenCalledTimes(1)
    包.unmount()
  })

  it('卸载即取消：最短等待不再触发跳转', async () => {
    const { 包, 完成 } = 建控制器宿主({ 最短展示毫秒: 80 })
    await 等待(10)
    包.unmount()
    await 等待(100)
    expect(完成).not.toHaveBeenCalled()
  })
})

describe('FP-11 三个真实入口的接线', () => {
  const 角色 = {
    id: 'abc12345-6789-4abc-8def-1234567890ab',
    ming_zi: '内部名',
    wei_xin_ming: '苏晚',
    xing_bie: 'nv',
    tou_xiang: 'https://cdn.test/su.png',
    yao_kai_kou: false,
  }

  function 建路由() {
    const 空页 = { template: '<div />' }
    return createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'shouYe', component: 空页 },
        { path: '/tian-jia-wei-xin', name: 'tianJiaWeiXin', component: 空页 },
        { path: '/zai-ru/:jiaoSeId', name: 'zaiRuLiaoTian', component: 空页 },
        { path: '/chat/:huiHuaId', name: 'liaoTian', component: 空页 },
        { path: '/guo-wang-zhan-ji', name: 'guoWangZhanJi', component: 空页 },
        { path: '/profile-setup', name: 'ziLiaoSheZhi', component: 空页 },
      ],
    })
  }

  async function 挂载入口(组件: Parameters<typeof mount>[0], 路径: string) {
    const pinia = createPinia()
    setActivePinia(pinia)
    const 壳 = document.createElement('div')
    壳.className = 'app-rongqi'
    document.body.appendChild(壳)
    const 路由 = 建路由()
    await 路由.push(路径)
    await 路由.isReady()
    const 包 = mount(组件, { global: { plugins: [pinia, 路由] } })
    await flushPromises()
    return { 包, 路由 }
  }

  function 当前趣味语文本(): string {
    return document.body.querySelector('.zairu-tishi-wen')?.textContent?.trim() ?? ''
  }

  function 当前编号文本(): string {
    return document.body.querySelector('.zairu-duixiang-id')?.textContent?.trim() ?? ''
  }

  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    vi.clearAllMocks()
    预加载聊天页.mockResolvedValue(true)
  })

  it('排位入口：挑战临时资料驱动排位场景、真实对象ID与头像', async () => {
    sessionStorage.setItem(
      'ziLiaoSheZhiLinShi',
      JSON.stringify({ moshi: 'tiaozhan', woDeXingBie: '男', muBiaoXingBie: 'female' }),
    )
    kaiShiTiaoZhan.mockResolvedValue(角色)
    chuangJianHuiHua.mockResolvedValue({ id: 'hui-hua-1' })
    const { 包 } = await 挂载入口(添加微信, '/tian-jia-wei-xin')
    await vi.waitFor(() => expect(document.body.textContent).toContain('苏晚'))

    expect(kaiShiTiaoZhan).toHaveBeenCalledWith('男', '女')
    const 浮层 = document.body.querySelector('.zairu-yemian') as HTMLElement
    expect(浮层.dataset.changJing).toBe('paiWei')
    expect(document.body.querySelector('.zairu-biaoti')?.textContent).toBe('苏晚')
    expect(当前编号文本()).toBe('UID：abc12345')
    expect(fanYi.zaiRuLiaoTian.quWeiYu.paiWei).toContain(当前趣味语文本())
    const 头像 = document.body.querySelector('.zairu-touxiang-wei img')
    expect(头像?.getAttribute('src')).toBe('https://cdn.test/su.png')
    expect(document.body.querySelector('.zairu-touxiang-wei .touxiang--zi')).toBeNull()
    包.unmount()
  })

  it('普通入口：无 moshi 时渲染普通场景与普通趣味语', async () => {
    sessionStorage.setItem(
      'ziLiaoSheZhiLinShi',
      JSON.stringify({ muBiaoXingBie: 'female', xingGeXuanZe: 'INFP', xingBie: 'male' }),
    )
    shengChengJiaoSe.mockResolvedValue(角色)
    queRenJiaoSe.mockResolvedValue(角色)
    chuangJianHuiHua.mockResolvedValue({ id: 'hui-hua-1' })
    const { 包 } = await 挂载入口(添加微信, '/tian-jia-wei-xin')
    await vi.waitFor(() => expect(document.body.textContent).toContain('苏晚'))

    expect(shengChengJiaoSe).toHaveBeenCalledWith('female', 'INFP', false, false, 'male', null)
    const 浮层 = document.body.querySelector('.zairu-yemian') as HTMLElement
    expect(浮层.dataset.changJing).toBe('puTong')
    expect(当前编号文本()).toBe('UID：abc12345')
    expect(fanYi.zaiRuLiaoTian.quWeiYu.puTong).toContain(当前趣味语文本())
    包.unmount()
  })

  it('添加微信入口拒绝非法临时资料并回到首页，不启动生成流程', async () => {
    sessionStorage.setItem('ziLiaoSheZhiLinShi', '{非法资料')
    const { 包, 路由 } = await 挂载入口(添加微信, '/tian-jia-wei-xin')
    await vi.waitFor(() => expect(路由.currentRoute.value.path).toBe('/'))
    expect(kaiShiTiaoZhan).not.toHaveBeenCalled()
    expect(shengChengJiaoSe).not.toHaveBeenCalled()
    包.unmount()
  })

  it('过往战绩入口：回忆场景、路由对象ID与回忆趣味语，头像未到达时保留文字占位', async () => {
    预加载聊天页.mockReturnValue(new Promise(() => undefined))
    const { 包 } = await 挂载入口(载入聊天, '/zai-ru/91d2f4a8-0c7e-4b63-9a21-5f8d3c6e0b72')
    await nextTick()

    const 浮层 = document.body.querySelector('.zairu-yemian') as HTMLElement
    expect(浮层.dataset.changJing).toBe('huiYi')
    expect(document.body.querySelector('.zairu-biaoti')?.textContent).toBe('正在找回这个人')
    expect(当前编号文本()).toBe('UID：91d2f4a8')
    expect(fanYi.zaiRuLiaoTian.quWeiYu.huiYi).toContain(当前趣味语文本())
    expect(document.body.querySelector('.zairu-touxiang-wei .touxiang--zi')).not.toBeNull()
    包.unmount()
  })
})
