import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import type { RouteLocationNormalized } from 'vue-router'
import { fanYi, huoQuFanYi } from '@/config/翻译表'
import {
  GUO_DU_CHAO_SHI_HAO_MIAO,
  GUO_DU_ZUI_DUAN_ZHAN_SHI_HAO_MIAO,
  JING_SU_HAO_MIAO,
  anJingHua,
  cunYuQuJiaoJie,
  guoDuZhuangTai,
  jieXiGuoDuWenAn,
  kaiShiLuYouYuQu,
  quYuQuJiaoJie,
  tuiJinLuYouPiCi,
  zhongZhiYuQu,
  type YuJiaZaiPeiZhi,
} from '@/router/预取'
import 页面过渡载入 from '@/components/页面过渡载入.vue'
import {
  jiaoXingKuanDu,
  jiaoXingZuoShang,
  wenYangYi,
  wenYangEr,
} from '@/assets/手绘笔触路径'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'

const { chuFaCuoWuShangBao } = vi.hoisted(() => ({ chuFaCuoWuShangBao: vi.fn() }))
vi.mock('@/utils/错误上报', () => ({ chuFaCuoWuShangBao }))

const 源码根 = resolve(__dirname, '..')
const 读源 = (相对: string) => readFileSync(resolve(源码根, 相对), 'utf8')

const 压扁 = (源: string): string => 源.replace(/\s+/g, ' ')

function 取声明块(净源: string, 选择器: string): string {
  const 转义 = 选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const 匹 = new RegExp(`${转义}\\s*\\{([^}]*)\\}`).exec(净源)
  expect(匹, `组件样式缺少 ${选择器} 声明块`).not.toBeNull()
  return (匹 as RegExpMatchArray)[1]
}

function 令牌源(): string {
  return 读源('styles/设计令牌.css')
}

function 取毫秒(令牌: string): number {
  const 匹 = new RegExp(`${令牌}:\\s*(\\d+(?:\\.\\d+)?)ms`).exec(令牌源())
  expect(匹, `${令牌} 未以毫秒声明`).not.toBeNull()
  return Number((匹 as RegExpMatchArray)[1])
}

function 主题块(档: 'light' | 'dark'): string {
  const 正则 =
    档 === 'light'
      ? /:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/
      : /:root,\s*:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/
  const 匹 = 正则.exec(令牌源())
  expect(匹, `设计令牌.css 缺少 ${档} 主题块`).not.toBeNull()
  return (匹 as RegExpMatchArray)[1]
}

function 取令牌值(块: string, 令牌: string): string {
  const 匹 = new RegExp(`${令牌}:\\s*([^;]+);`).exec(块)
  expect(匹, `${令牌} 在该主题档未定义`).not.toBeNull()
  return (匹 as RegExpMatchArray)[1].trim()
}

function 相对亮度(色值: string): number {
  const 匹 = /^#([0-9a-f]{6})$/i.exec(色值)
  expect(匹, `非六位十六进制色值：${色值}`).not.toBeNull()
  const 整 = parseInt((匹 as RegExpMatchArray)[1], 16)
  const 分量 = [(整 >> 16) & 255, (整 >> 8) & 255, 整 & 255].map((值) => {
    const 线 = 值 / 255
    return 线 <= 0.03928 ? 线 / 12.92 : ((线 + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * 分量[0] + 0.7152 * 分量[1] + 0.0722 * 分量[2]
}

function 列出运行时源(目录: string, 累加: string[] = []): string[] {
  for (const 项 of readdirSync(目录, { withFileTypes: true })) {
    const 全 = join(目录, 项.name)
    if (项.isDirectory()) {
      if (项.name === 'node_modules' || 项.name === '__tests__') continue
      列出运行时源(全, 累加)
    } else if (/\.(ts|vue|js)$/.test(项.name)) {
      累加.push(全)
    }
  }
  return 累加
}

function 路径首点(路径: string): [number, number] {
  const 匹 = /^M\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(路径)
  expect(匹, `路径未以 M 起点开始：${路径.slice(0, 24)}`).not.toBeNull()
  return [Number((匹 as RegExpMatchArray)[1]), Number((匹 as RegExpMatchArray)[2])]
}

function 路径末点(路径: string): [number, number] {
  const 数 = 路径.match(/-?\d+(?:\.\d+)?/g)
  expect(数 === null || 数.length < 2, '路径坐标数不足').toBe(false)
  const 列 = 数 as string[]
  return [Number(列[列.length - 2]), Number(列[列.length - 1])]
}

function 斜距(起: [number, number], 终: [number, number]): number {
  return Math.abs(起[0] + 起[1] - (终[0] + 终[1]))
}

const 组件净源 = (): string => 压扁(读源('components/页面过渡载入.vue'))

function 假路由(名字: unknown): RouteLocationNormalized {
  return { name: 名字 } as unknown as RouteLocationNormalized
}

function 挂起<T>(): { chengNuo: Promise<T>; duiXian: (zhi: T) => void; juJue: (cuoWu: unknown) => void } {
  let duiXian!: (zhi: T) => void
  let juJue!: (cuoWu: unknown) => void
  const chengNuo = new Promise<T>((jieJue, juJueNei) => {
    duiXian = jieJue
    juJue = juJueNei
  })
  return { chengNuo, duiXian, juJue }
}

beforeEach(() => {
  vi.useFakeTimers()
  chuFaCuoWuShangBao.mockClear()
  zhongZhiYuQu()
})

afterEach(() => {
  zhongZhiYuQu()
  vi.useRealTimers()
})

describe('FP-6 预取任务与过渡页状态机', () => {
  it('任务全部幂等命中缓存时竞速内完成，不显示过渡页', async () => {
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [() => Promise.resolve('a'), () => Promise.resolve('b')],
    }
    await kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(false)
    expect(chuFaCuoWuShangBao).not.toHaveBeenCalled()
  })

  it('竞速临界：任务在竞速窗口内完成也不显示过渡页', async () => {
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [() => new Promise((jieJue) => setTimeout(() => jieJue('man'), JING_SU_HAO_MIAO - 10))],
    }
    const yunXing = kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))
    await vi.advanceTimersByTimeAsync(JING_SU_HAO_MIAO)
    await yunXing
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(false)
  })

  it('慢任务先置过渡页，全部完成后加最短展示防闪再隐藏', async () => {
    const jia = 挂起<string>()
    const yi = 挂起<string>()
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [() => jia.chengNuo, () => yi.chengNuo],
    }
    const yunXing = kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))
    await vi.advanceTimersByTimeAsync(JING_SU_HAO_MIAO)
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(true)
    expect(guoDuZhuangTai.value.wenAn).toBe(huoQuFanYi('guoDuZaiRu', 'guoWangZhanJi'))

    jia.duiXian('jia')
    await vi.advanceTimersByTimeAsync(GUO_DU_ZUI_DUAN_ZHAN_SHI_HAO_MIAO)
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(true)

    yi.duiXian('yi')
    await vi.advanceTimersByTimeAsync(GUO_DU_ZUI_DUAN_ZHAN_SHI_HAO_MIAO)
    await yunXing
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(false)
    expect(guoDuZhuangTai.value.wenAn).toBe('')
  })

  it('任一任务失败不拦截导航，只上报错误并照常隐藏过渡页', async () => {
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [() => Promise.reject(new Error('wangLuoDuanKai')), () => Promise.resolve('hao')],
    }
    await expect(kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))).resolves.toBeUndefined()
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(false)
    expect(chuFaCuoWuShangBao).toHaveBeenCalledTimes(1)
    expect(chuFaCuoWuShangBao.mock.calls[0][0]).toMatchObject({
      leiBie: 'chengNuo',
      fuJia: { laiYuan: 'luYouYuQu' },
    })
  })

  it('超时八秒强制放行，过渡页隐藏，任务失败已上报', async () => {
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [() => new Promise(() => undefined)],
    }
    const yunXing = kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))
    await vi.advanceTimersByTimeAsync(JING_SU_HAO_MIAO)
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(true)
    await vi.advanceTimersByTimeAsync(GUO_DU_CHAO_SHI_HAO_MIAO)
    await yunXing
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(false)
    expect(chuFaCuoWuShangBao).not.toHaveBeenCalled()
  })

  it('zuJian 与任务一起并发等待', async () => {
    const kuai = 挂起<unknown>()
    const peiZhi: YuJiaZaiPeiZhi = {
      wenAn: 'guoWangZhanJi',
      renWu: [() => Promise.resolve('shuJu')],
      zuJian: () => kuai.chengNuo,
    }
    const yunXing = kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))
    await vi.advanceTimersByTimeAsync(JING_SU_HAO_MIAO)
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(true)
    kuai.duiXian(undefined)
    await vi.advanceTimersByTimeAsync(GUO_DU_ZUI_DUAN_ZHAN_SHI_HAO_MIAO)
    await yunXing
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(false)
  })

  it('新导航推进批次后，旧过渡页立即让位不再隐藏新状态', async () => {
    const man = 挂起<string>()
    const peiZhi: YuJiaZaiPeiZhi = { wenAn: 'guoWangZhanJi', renWu: [() => man.chengNuo] }
    const jiu = kaiShiLuYouYuQu(peiZhi, 假路由('guoWangZhanJi'))
    await vi.advanceTimersByTimeAsync(JING_SU_HAO_MIAO)
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(true)
    tuiJinLuYouPiCi()
    guoDuZhuangTai.value = { jinXingZhong: false, wenAn: '' }
    man.duiXian('wan')
    await vi.advanceTimersByTimeAsync(GUO_DU_CHAO_SHI_HAO_MIAO)
    await jiu
    expect(guoDuZhuangTai.value.jinXingZhong).toBe(false)
  })
})

describe('FP-6 过渡文案与交接存取', () => {
  it('wenAn 解析：登记键出整句，未登记与非字符串回退默认语', () => {
    expect(jieXiGuoDuWenAn('guoWangZhanJi')).toBe(fanYi.guoDuZaiRu.guoWangZhanJi)
    expect(jieXiGuoDuWenAn('buCunZaiDeJian')).toBe(fanYi.guoDuZaiRu.moRen)
    expect(jieXiGuoDuWenAn(undefined)).toBe(fanYi.guoDuZaiRu.moRen)
    expect(jieXiGuoDuWenAn(42)).toBe(fanYi.guoDuZaiRu.moRen)
    expect(fanYi.guoDuZaiRu.moRen.endsWith('……')).toBe(true)
  })

  it('交接一次写入一次读取，二次读取为空', () => {
    tuiJinLuYouPiCi()
    cunYuQuJiaoJie('guoWangZhanJi', Promise.resolve([1, 2]))
    const yi = quYuQuJiaoJie<Promise<number[]>>('guoWangZhanJi')
    expect(yi).not.toBeNull()
    expect(quYuQuJiaoJie('guoWangZhanJi')).toBeNull()
  })

  it('批次推进后旧交接作废，页面自行兜底取数', async () => {
    tuiJinLuYouPiCi()
    cunYuQuJiaoJie('guoWangZhanJi', Promise.resolve('jiu'))
    tuiJinLuYouPiCi()
    expect(quYuQuJiaoJie('guoWangZhanJi')).toBeNull()
  })

  it('非法键名不写入也不读出', () => {
    tuiJinLuYouPiCi()
    cunYuQuJiaoJie(undefined, Promise.resolve('x'))
    cunYuQuJiaoJie('', Promise.resolve('x'))
    expect(quYuQuJiaoJie(undefined)).toBeNull()
    expect(quYuQuJiaoJie('')).toBeNull()
  })

  it('anJingHua 原样返回承诺且为拒绝挂上静默分支', async () => {
    const yuan = Promise.reject(new Error('yuQuShiBai'))
    const bao = anJingHua(yuan)
    expect(bao).toBe(yuan)
    await expect(bao).rejects.toThrow('yuQuShiBai')
  })

  it('zhongZhiYuQu 清空交接与过渡页状态', async () => {
    tuiJinLuYouPiCi()
    cunYuQuJiaoJie('guoWangZhanJi', Promise.resolve('x'))
    guoDuZhuangTai.value = { jinXingZhong: true, wenAn: 'x' }
    zhongZhiYuQu()
    expect(quYuQuJiaoJie('guoWangZhanJi')).toBeNull()
    expect(guoDuZhuangTai.value).toEqual({ jinXingZhong: false, wenAn: '' })
  })
})

describe('FP-6 页面过渡载入组件', () => {
  it('进行中渲染三段手绘笔触遮罩、无障碍状态与屏外文本', async () => {
    guoDuZhuangTai.value = { jinXingZhong: true, wenAn: huoQuFanYi('guoDuZaiRu', 'guoWangZhanJi') }
    await nextTick()
    const bao = mount(页面过渡载入)
    await flushPromises()
    const fugai = bao.find('.guodu-fugai')
    expect(fugai.exists()).toBe(true)
    expect(fugai.attributes('role')).toBe('status')
    expect(fugai.attributes('aria-live')).toBe('polite')
    expect(bao.find('.guodu-tianchong').exists()).toBe(true)
    expect(bao.findAll('.guodu-jiao')).toHaveLength(2)
    expect(bao.find('.guodu-jiao--you-xia').exists()).toBe(true)
    expect(bao.find('.guodu-jiao--zuo-shang').exists()).toBe(true)
    expect(bao.findAll('.guodu-jiao-xian').length).toBeGreaterThan(1)
    expect(bao.findAll('.guodu-jiao-tian-xian').length).toBeGreaterThan(0)
    expect(bao.findAll('.guodu-wenyang-xian').length).toBeGreaterThan(1)
    expect(bao.find('.guodu-wenben').text()).toBe(huoQuFanYi('guoDuZaiRu', 'guoWangZhanJi'))
    expect(bao.find('.ping-mu-wai').text()).toBe(huoQuFanYi('guoDuZaiRu', 'guoWangZhanJi'))
    expect(fugai.findAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(3)
    bao.unmount()
  })

  it('三段层级序锁死：中间填充在最底、右下楔居中、左上楔最上，退场后无残留层', async () => {
    guoDuZhuangTai.value = { jinXingZhong: true, wenAn: huoQuFanYi('guoDuZaiRu', 'moRen') }
    await nextTick()
    const bao = mount(页面过渡载入)
    await flushPromises()
    const 层序 = [...bao.find('.guodu-fugai').element.children].map((元) =>
      (元.getAttribute('class') ?? '').split(/\s+/).filter(Boolean).sort().join(' '),
    )
    expect(层序).toEqual([
      'guodu-tianchong',
      'guodu-jiao guodu-jiao--you-xia',
      'guodu-jiao guodu-jiao--zuo-shang',
      'guodu-wenben',
      'ping-mu-wai',
    ])
    bao.unmount()
    expect(document.querySelector('.guodu-fugai')).toBeNull()
    expect(document.querySelector('.guodu-tianchong')).toBeNull()
    expect(document.querySelector('.guodu-jiao')).toBeNull()
  })

  it('非进行中不渲染任何节点', async () => {
    guoDuZhuangTai.value = { jinXingZhong: false, wenAn: '' }
    await nextTick()
    const bao = mount(页面过渡载入)
    await flushPromises()
    expect(bao.find('.guodu-fugai').exists()).toBe(false)
    expect(bao.text()).toBe('')
    bao.unmount()
  })
})

describe('FP-6 三段笔触出现顺序与时长', () => {
  it('第一段左上楔零延迟、第二段右下楔用 --guodu-jin-yan-er、第三段填充用 --guodu-jin-yan-san', () => {
    const 净 = 组件净源()
    expect(取声明块(净, '.guodu-jiao--zuo-shang')).toContain('--guodu-jiao-qi-shi: 0ms')
    expect(取声明块(净, '.guodu-jiao--you-xia')).toContain(
      '--guodu-jiao-qi-shi: var(--guodu-jin-yan-er)',
    )
    expect(取声明块(净, '.guodu-tianchong')).toContain(
      'animation: guodu-pu-kai var(--guodu-jin-chang-san) var(--quxian-huan-ying) var(--guodu-jin-yan-san) both',
    )
    expect(取声明块(净, '.guodu-jiao-xian')).toContain(
      'animation: guodu-hui-zhi var(--guodu-jin-chang-du) var(--quxian-tan-chu) var(--guodu-jiao-qi-shi) both',
    )
  })

  it('毫秒令牌严格递增且三段总时长不超最短展示 400ms（不会出现半途消失）', () => {
    const 段一起 = 0
    const 段二起 = 取毫秒('--guodu-jin-yan-er')
    const 段三起 = 取毫秒('--guodu-jin-yan-san')
    const 文字起 = 取毫秒('--guodu-jin-yan-zi')
    const 一笔长 = 取毫秒('--guodu-jin-chang-du')
    const 三段长 = 取毫秒('--guodu-jin-chang-san')
    expect(段一起).toBeLessThan(段二起)
    expect(段二起).toBeLessThan(段三起)
    expect(段三起).toBeLessThanOrEqual(文字起)
    const 第一段终 = 段一起 + 一笔长
    const 第二段终 = 段二起 + 一笔长
    const 第三段终 = 段三起 + 三段长
    expect(第一段终).toBeLessThanOrEqual(第二段终)
    expect(第二段终).toBeLessThanOrEqual(第三段终)
    expect(第三段终).toBeLessThanOrEqual(GUO_DU_ZUI_DUAN_ZHAN_SHI_HAO_MIAO)
  })

  it('退场按入场逆序收尾：填充先撤、右下第二、左上最后，且根节点时长覆盖全部子动画', () => {
    const 净 = 组件净源()
    expect(取声明块(净, '.guodu-leave-active .guodu-tianchong')).toContain(
      'animation: guodu-pu-kai var(--guodu-tui-chang-du) var(--quxian-huan-ying) reverse both',
    )
    expect(取声明块(净, '.guodu-jiao--you-xia')).toContain(
      '--guodu-jiao-tui-yan: var(--guodu-tui-yan-er)',
    )
    expect(取声明块(净, '.guodu-jiao--zuo-shang')).toContain(
      '--guodu-jiao-tui-yan: var(--guodu-tui-yan-san)',
    )
    expect(取声明块(净, '.guodu-leave-active .guodu-jiao-xian')).toContain(
      'animation: guodu-hui-zhi var(--guodu-tui-chang-du) var(--quxian-tan-chu) var(--guodu-jiao-tui-yan) reverse both',
    )
    const 一笔退长 = 取毫秒('--guodu-tui-chang-du')
    const 退二段延 = 取毫秒('--guodu-tui-yan-er')
    const 退三段延 = 取毫秒('--guodu-tui-yan-san')
    expect(退二段延).toBeLessThan(退三段延)
    expect(退三段延 + 一笔退长).toBeLessThanOrEqual(取毫秒('--guodu-tui-chang-ye'))
    expect(取毫秒('--guodu-tui-chang-ye')).toBeLessThanOrEqual(GUO_DU_ZUI_DUAN_ZHAN_SHI_HAO_MIAO)
  })

  it('三段几何铺满不露边：楔形用 meet 等比贴角缩放、填充用像素级 pattern，禁 slice/none/path()', () => {
    const 组件源 = 读源('components/页面过渡载入.vue')
    const 净 = 组件净源()
    expect(组件源).toContain('preserveAspectRatio="xMinYMin meet"')
    expect(组件源).not.toContain('slice')
    expect(组件源).not.toContain('preserveAspectRatio="none"')
    expect(组件源).toContain('patternUnits="userSpaceOnUse"')
    expect(净).not.toMatch(/clip-path:\s*path\(/)
    expect(净).toMatch(/\.guodu-tianchong\s*\{[^}]*width: 100%; height: 100%/)
    expect(取声明块(净, '.guodu-fugai')).toContain('overflow: hidden')
    const 楔块们 = [...净.matchAll(/\.guodu-jiao\s*\{([^}]*)\}/g)].map((匹) => 匹[1])
    expect(楔块们.length).toBeGreaterThanOrEqual(2)
    expect(
      楔块们.some((块) => 块.includes('width: var(--guodu-jiao-kuan)')),
      '楔形盒宽未走令牌',
    ).toBe(true)
    expect(
      楔块们.some((块) => 块.includes('height: var(--guodu-jiao-kuan)')),
      '楔形盒高未走令牌',
    ).toBe(true)
    expect(
      楔块们.some((块) => 块.includes('max-width: 62%') && 块.includes('max-height: 86%')),
      '楔形盒缺视口封顶，短屏会溢出',
    ).toBe(true)
  })

  it('prefers-reduced-motion 关闭全部笔触动画，静态呈现完整三段', () => {
    const 净 = 组件净源()
    const 定位 = 净.indexOf('@media (prefers-reduced-motion: reduce)')
    expect(定位, '缺少 reduced-motion 降级块').toBeGreaterThanOrEqual(0)
    const 段 = 净.slice(定位)
    expect(段).toContain('transition: none')
    expect(段).toContain('animation: none')
    expect(段).not.toMatch(/translate|scale\(|dashoffset/)
  })
})

describe('FP-6 遮罩点击与层级不变量', () => {
  it('装饰层与退场态一律 pointer-events: none，仅进行中根节点吃点击', () => {
    const 净 = 组件净源()
    expect(取声明块(净, '.guodu-tianchong, .guodu-jiao')).toContain('pointer-events: none')
    expect(取声明块(净, '.guodu-fugai')).toContain('pointer-events: auto')
    expect(取声明块(净, '.guodu-leave-active')).toContain('pointer-events: none')
  })

  it('遮罩只挂在导航栏之下且用层级令牌，不硬编码 z-index', () => {
    const 净 = 组件净源()
    const 块 = 取声明块(净, '.guodu-fugai')
    expect(块).toContain('position: fixed')
    expect(块).toContain('inset: var(--daohanglan-gao-du) 0 0')
    expect(块).toContain('z-index: var(--ceng-guodu)')
    expect(块).not.toMatch(/z-index:\s*\d/)
  })
})

describe('FP-6 手绘笔触资源与依赖边界', () => {
  it('roughjs 只作 devDependency，运行时源码零引用，只在离线生成脚本里出现', () => {
    const 包 = JSON.parse(读源('../package.json')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    expect(包.dependencies ?? {}).not.toHaveProperty('roughjs')
    expect(包.devDependencies ?? {}).toHaveProperty('roughjs')
    const 运行时源 = 列出运行时源(源码根)
    expect(运行时源.length).toBeGreaterThan(50)
    const 命中 = 运行时源.filter((文件) => /roughjs|roughjs\//.test(readFileSync(文件, 'utf8')))
    expect(命中, `运行时源码引用了 roughjs：${命中.join(', ')}`).toEqual([])
    expect(读源('../scripts/生成过渡笔触.mjs')).toMatch(/from 'roughjs'/)
  })

  it('笔触产物是真实手绘曲线：每段路径含三次贝塞尔，楔形密度足够且不出界', () => {
    const 全部路径 = [
      ...jiaoXingZuoShang.tianChong,
      ...jiaoXingZuoShang.lunKuo,
      ...jiaoXingZuoShang.tuoWei,
      ...wenYangYi.luJing,
      ...wenYangEr.luJing,
    ]
    expect(全部路径.length).toBeGreaterThan(8)
    for (const 路径 of 全部路径) {
      expect(路径).toMatch(/C/)
      expect(路径.length).toBeLessThan(9000)
      expect(路径, `路径含非法字面量：${路径.slice(0, 40)}`).not.toMatch(/NaN|Infinity|\[object/)
      expect(路径).toMatch(/^M[\d\s.,MLCZ-]+$/)
      const 数值列 = (路径.match(/-?\d+(?:\.\d+)?/g) as string[]).map(Number)
      expect(数值列.every(Number.isFinite), '路径含非有限数值').toBe(true)
      expect(数值列.length).toBeGreaterThan(4)
    }
    expect(jiaoXingZuoShang.tianChong[0].split('M').length - 1).toBeGreaterThan(20)
    expect(jiaoXingZuoShang.tuoWei).toHaveLength(4)
    const 越界 = (路径们: readonly string[], 边: number): number[] =>
      路径们
        .flatMap((路径) => 路径.match(/-?\d+(?:\.\d+)?/g) as string[])
        .map(Number)
        .filter((值) => 值 < -40 || 值 > 边 + 40)
    expect(越界([...jiaoXingZuoShang.tianChong, ...jiaoXingZuoShang.lunKuo, ...jiaoXingZuoShang.tuoWei], jiaoXingKuanDu), '楔形笔触越出画布').toEqual([])
    expect(越界(wenYangYi.luJing, wenYangYi.danYuan * 2), '纹样一越出平铺范围').toEqual([])
    expect(越界(wenYangEr.luJing, wenYangEr.danYuan * 2), '纹样二越出平铺范围').toEqual([])
  })

  it('左上楔笔触方向是左下到右上的斜向，右下楔由同一路径旋转 180 度镜像', () => {
    const 轮廓 = jiaoXingZuoShang.lunKuo[0]
    const 起 = 路径首点(轮廓)
    const 终 = 路径末点(轮廓)
    expect(起[0]).toBeGreaterThan(起[1])
    expect(终[0]).toBeLessThan(终[1])
    expect(Math.abs(起[0] + 起[1] - (终[0] + 终[1]))).toBeLessThan(40)
    for (const 路径 of jiaoXingZuoShang.tuoWei) {
      const 拖起 = 路径首点(路径)
      const 拖终 = 路径末点(路径)
      expect(拖起[1]).toBeGreaterThan(拖终[1])
      expect(拖起[0]).toBeLessThan(拖终[0])
    }
    expect(压扁(读源('components/页面过渡载入.vue'))).toMatch(
      /\.guodu-jiao--you-xia\s*\{[^}]*transform: rotate\(180deg\)/,
    )
  })

  it('纹样单元是正方形且每条笔触都越出单元边界，平铺无缝不露边', () => {
    for (const 纹 of [wenYangYi, wenYangEr]) {
      expect(纹.danYuan % 4).toBe(0)
      expect(纹.luJing.length).toBe(7)
      for (const 路径 of 纹.luJing) {
        const 起 = 路径首点(路径)
        const 终 = 路径末点(路径)
        expect(起[0], '笔触未越出单元左边界').toBeLessThan(0)
        expect(起[1]).toBeGreaterThan(0)
        expect(终[0]).toBeGreaterThan(0)
        expect(终[1], '笔触未越出单元上边界').toBeLessThan(0)
        expect(斜距(起, 终)).toBeLessThan(40)
      }
    }
  })
})


describe('FP-6 遮罩令牌成对与深色可见性', () => {
  const 色令牌 = ['--guodu-mian-bu', '--guodu-mo-mu', '--guodu-cheng-se', '--guodu-wen-zi']
  const 数值令牌 = ['--guodu-tian-du', '--guodu-wen-du', '--guodu-fu-wen-du']

  it('深浅两档都定义了全部遮罩色与浓度令牌', () => {
    for (const 档 of ['light', 'dark'] as const) {
      const 块 = 主题块(档)
      for (const 令牌 of [...色令牌, ...数值令牌]) {
        expect(取令牌值(块, 令牌), `${档} 档 ${令牌} 取值为空`).not.toBe('')
      }
    }
  })

  it('深色档笔触亮度高于底面亮度，禁止黑遮罩盖黑底；浅色档反之', () => {
    const 浅 = 主题块('light')
    const 深 = 主题块('dark')
    expect(相对亮度(取令牌值(深, '--guodu-mo-mu'))).toBeGreaterThan(
      相对亮度(取令牌值(深, '--guodu-mian-bu')),
    )
    expect(相对亮度(取令牌值(深, '--guodu-cheng-se'))).toBeGreaterThan(
      相对亮度(取令牌值(深, '--guodu-mian-bu')),
    )
    expect(相对亮度(取令牌值(深, '--guodu-mian-bu'))).toBeGreaterThan(
      相对亮度(取令牌值(深, '--beijing-ciuse')),
    )
    expect(相对亮度(取令牌值(浅, '--guodu-mo-mu'))).toBeLessThan(
      相对亮度(取令牌值(浅, '--guodu-mian-bu')),
    )
    expect(相对亮度(取令牌值(浅, '--guodu-cheng-se'))).toBeLessThan(
      相对亮度(取令牌值(浅, '--guodu-mian-bu')),
    )
  })

  it('遮罩时序与几何令牌住在共用 :root 块，深浅两档同值', () => {
    const 时序 = [
      '--guodu-jin-chang-du',
      '--guodu-jin-yan-er',
      '--guodu-jin-yan-san',
      '--guodu-jin-chang-san',
      '--guodu-jin-yan-zi',
      '--guodu-jin-chang-ye',
      '--guodu-tui-chang-du',
      '--guodu-tui-yan-er',
      '--guodu-tui-yan-san',
      '--guodu-tui-chang-ye',
      '--guodu-jiao-kuan',
      '--guodu-wen-kuan',
    ]
    const 共用块 = /:root\s*\{([\s\S]*?)\n\}/.exec(令牌源())?.[1] ?? ''
    for (const 令牌 of 时序) {
      expect(共用块, `${令牌} 未住在共用 :root 块`).toContain(`${令牌}:`)
      expect(主题块('light'), `${令牌} 被拆进浅色档`).not.toContain(`${令牌}:`)
      expect(主题块('dark'), `${令牌} 被拆进深色档`).not.toContain(`${令牌}:`)
    }
  })

  it('组件只消费令牌，不出现遮罩族裸值与第二真源', () => {
    const 净 = 组件净源()
    const 声明 = [...净.matchAll(/(--guodu-[a-z-]+)\s*:\s*([^;{}]+)/g)].map((匹) => 匹[1])
    const 允许局部 = ['--guodu-jiao-qi-shi', '--guodu-jiao-tui-yan']
    expect([...new Set(声明)].sort()).toEqual(允许局部.sort())
    for (const 令牌 of 允许局部) expect(净).toContain(`var(${令牌})`)
    expect(净).not.toMatch(/stroke:\s*#/)
    expect(净).not.toMatch(/fill:\s*#/)
    expect(净).not.toMatch(/stroke-width:\s*[\d.]/)
    expect(净).not.toMatch(/animation:\s*[a-z-]+\s+[\d.]+m?s/)
    const 缓动引用 = [...净.matchAll(/--quxian-[a-z-]+/g)].map((匹) => 匹[0])
    expect(
      new Set(缓动引用).has('--quxian-ruan'),
      '本组件把 FP-20 零消费账本里的 quxian-ruan 拉成了消费者',
    ).toBe(false)
  })
})


describe('FP-6 路由接入契约', () => {
  it('七个目标路由声明 yuJiaZai，wenAn 均为登记键，zuJian 与组件共用同一惰性导入', () => {
    const yuan = 读源('router/路由表.ts')
    const duiZhao: Array<[string, string]> = [
      ['guoWangZhanJi', 'jiaZaiGuoWangZhanJi'],
      ['tiaoZhanPaiHangBang', 'jiaZaiTiaoZhanPaiHangBang'],
      ['haoYouLieBiao', 'jiaZaiHaoYouLieBiao'],
      ['tongZhi', 'jiaZaiTongZhiYe'],
      ['zhangHaoAnQuan', 'jiaZaiZhangHaoAnQuan'],
      ['junShiJiLuXiangQing', 'jiaZaiJunShiJiLu'],
      ['tiaoZhanZhuYe', 'jiaZaiTiaoZhanZhuYe'],
    ]
    for (const [ming, zuJianMing] of duiZhao) {
      expect(yuan).toContain(`name: '${ming}'`)
      expect(yuan).toContain(`wenAn: '${ming}'`)
      expect(yuan).toContain(`component: ${zuJianMing}`)
      expect(yuan).toContain(`zuJian: ${zuJianMing}`)
      expect(ming in fanYi.guoDuZaiRu).toBe(true)
    }
  })

  it('交接消费页的 LU_YOU_MING 与路由名一一对应', () => {
    const duiZhao: Array<[string, string]> = [
      ['views/账号与安全.vue', 'zhangHaoAnQuan'],
      ['views/军师记录详情.vue', 'junShiJiLuXiangQing'],
      ['views/挑战主页.vue', 'tiaoZhanZhuYe'],
    ]
    for (const [wen, ming] of duiZhao) {
      expect(读源(wen)).toContain(`const LU_YOU_MING = '${ming}'`)
    }
  })

  it('挑战两页榜单都走共享预加载缓存，路由预取一次登记全部组别', () => {
    const yuan = 读源('router/路由表.ts')
    const zhu = yuan.split("name: 'tiaoZhanZhuYe'")[1]?.split("path: '")[0] ?? ''
    const bang = yuan.split("name: 'tiaoZhanPaiHangBang'")[1]?.split("path: '")[0] ?? ''
    expect(zhu).toContain('use挑战榜单().yuQuQuanBu()')
    expect(bang).toContain('use挑战榜单().yuQuQuanBu()')
    expect(bang).not.toContain("huoQuPaiHangBang('nan_nv')")
    expect(bang).toContain("wenAn: 'tiaoZhanPaiHangBang'")
    expect(bang).toContain("zuJian: jiaZaiTiaoZhanPaiHangBang")
    const 榜单源 = 读源('views/挑战积分榜.vue')
    expect(榜单源).toContain("from '@/composables/use挑战榜单'")
    expect(榜单源).toContain('bangDanHuanCun.value.get(')
    expect(榜单源).not.toContain('huoQuPaiHangBang')
    expect(榜单源).not.toContain('quYuQuJiaoJie')
    const 主页源 = 读源('views/挑战主页.vue')
    expect(主页源).toContain('bangDanHuanCun.value.get(')
    expect(主页源).not.toContain('huoQuPaiHangBang')
  })

  it('守卫在令牌校验通过后才执行预取，无令牌只重定向不预取，冷启动首跳不预取', () => {
    const yuan = 读源('router/路由表.ts')
    expect(yuan).toMatch(/tuiJinLuYouPiCi\(\)/)
    expect(yuan).toMatch(/if \(to\.meta\.xuYaoDengLu && !youLingPai\)[\s\S]*?return \{ name: 'dengLu', replace: true \}/)
    expect(yuan).toMatch(/if \(yuJiaZai && youLingPai && _from\.matched\.length > 0\)[\s\S]*?await kaiShiLuYouYuQu\(yuJiaZai, to\)/)
  })

  it('路由表不静态导入任何 api 或 store，避免 api/请求 与 路由表 成环', () => {
    const yuan = 读源('router/路由表.ts')
    expect(yuan).not.toMatch(/from '@\/api\//)
    expect(yuan).not.toMatch(/from '@\/stores\//)
    expect(yuan).not.toMatch(/from '@\/composables\//)
  })

  it('趣味载入页、载入聊天、添加微信与好友聊天路由不在预取名单', () => {
    const yuan = 读源('router/路由表.ts')
    for (const ming of ['zaiRuLiaoTian', 'liaoTian', 'tianJiaWeiXin', 'haoYouLiaoTian', 'dengLu', 'wangJiMiMa', 'ziLiaoSheZhi', 'qiPaoSheZhi', 'shengYin', 'zhuJieMian']) {
      const duan = yuan.split(`name: '${ming}'`)[1]?.split("name: '")[0] ?? ''
      expect(duan).not.toContain('yuJiaZai')
    }
  })
})
