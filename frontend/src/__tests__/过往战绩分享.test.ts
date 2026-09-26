import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import 过往战绩 from '@/views/过往战绩.vue'
import { huoQuFanYi } from '@/config/translations'
import { QI_PAO_YU_SHE_BIAO } from '@/config/气泡主题'
import { 使用用户设置仓库 } from '@/stores/用户设置'
import { track } from '@/utils/埋点'
import {
  ZHAN_BAO_KUAN,
  ZHAN_BAO_GAO,
  huoQuZhanBaoWenAn,
  huoQuZhanBaoWenJianMing,
  shengChengZhanBaoHaiBao,
  type ZhanBaoShuRu,
} from '@/utils/战报海报'
import type { DangAnXiangQing } from '@/types'

vi.mock('vue-draggable-plus', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  return {
    VueDraggable: vue.defineComponent({
      name: 'VueDraggable',
      props: { modelValue: { type: Array, default: () => [] }, disabled: { type: Boolean } },
      emits: ['update:modelValue', 'end'],
      setup(_props, { slots }) {
        return () =>
          vue.h('div', { class: 'vue-draggable-stub' }, slots.default ? slots.default() : [])
      },
    }),
  }
})

vi.mock('@/api/聊天')
vi.mock('@/utils/埋点', () => ({ track: vi.fn() }))

const haiBaoYuanMa = readFileSync(resolve(__dirname, '../utils/战报海报.ts'), 'utf8')
const zuJianYuanMa = readFileSync(resolve(__dirname, '../views/过往战绩.vue'), 'utf8')
const lingPaiYuanMa = readFileSync(resolve(__dirname, '../styles/variables.css'), 'utf8')

const HAI_BAO_LING_PAI = [
  '--beijing-jianbian-1',
  '--beijing-jianbian-2',
  '--beijing-jianbian-3',
  '--beijing-jianbian-4',
  '--beijing-kaopian',
  '--boli-biankuang',
  '--wenben-zhuse',
  '--wenben-ciuse',
  '--yanse-zhanji',
  '--yanse-zhanji-qian',
  '--biao-qian-chenggong-beijing',
  '--biao-qian-chenggong-wenben',
  '--biao-qian-shibai-beijing',
  '--biao-qian-shibai-wenben',
  '--ziti-jiazu',
] as const

function zhuTiKuaiNeiRong(zhuTi: 'light' | 'dark'): string {
  const zhengZe =
    zhuTi === 'light'
      ? /:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/
      : /:root,\s*:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/
  const piPei = lingPaiYuanMa.match(zhengZe)
  if (!piPei) throw new Error(`variables.css 缺少 ${zhuTi} 主题块`)
  return piPei[1]
}

// 一次只注入一套主题块：jsdom 的级联分不清 data-theme 选择器，逐主题注入等价于浏览器按 data-theme 取块
function zhuRuZhuTi(zhuTi: 'light' | 'dark') {
  const xianYou = document.getElementById('fp10-zhuti-kuai')
  const yangShi = xianYou ?? document.createElement('style')
  yangShi.id = 'fp10-zhuti-kuai'
  yangShi.textContent = `:root{${zhuTiKuaiNeiRong(zhuTi)}}`
  if (!xianYou) document.head.appendChild(yangShi)
}

function lingPaiJiSuanZhi(ming: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(ming).trim()
}

// jsdom 三者默认全不存在（share/canShare/clipboard），逐用例显式装上，用例间必须清干净
function qingChuFenXiangNengLi() {
  const nai = globalThis.navigator as unknown as Record<string, unknown>
  delete nai.share
  delete nai.canShare
  delete nai.clipboard
}

const yuanShiCreate = Object.getOwnPropertyDescriptor(URL, 'createObjectURL')
const yuanShiRevoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL')

function huiFuUrlNengLi() {
  if (yuanShiCreate) Object.defineProperty(URL, 'createObjectURL', yuanShiCreate)
  else delete (URL as unknown as Record<string, unknown>).createObjectURL
  if (yuanShiRevoke) Object.defineProperty(URL, 'revokeObjectURL', yuanShiRevoke)
  else delete (URL as unknown as Record<string, unknown>).revokeObjectURL
}

let diZhiJiShu = 0

function guanBiXiaZaiNengLi() {
  Object.defineProperty(URL, 'createObjectURL', {
    value: undefined,
    configurable: true,
    writable: true,
  })
}

interface LianJieJiLu {
  href: string
  xiaZai: string
}

function chuangJianCanvasZhuangZhi(xuanXiang: { wuCtx?: boolean; wuBlob?: boolean } = {}) {
  const yuanShiChuangJian = document.createElement.bind(document)
  const jiLu = {
    fillText: [] as { wenBen: string; x: number; y: number }[],
    fillStyle: [] as unknown[],
    strokeStyle: [] as unknown[],
    font: [] as string[],
    colorStop: [] as { offset: number; color: string }[],
    fillRect: [] as { x: number; y: number; kuan: number; gao: number }[],
  }
  const jianBian = {
    addColorStop: vi.fn((offset: number, color: string) => {
      jiLu.colorStop.push({ offset, color })
    }),
  }
  const ctx: Record<string, unknown> = {
    fillText: vi.fn((wenBen: string, x: number, y: number) => {
      jiLu.fillText.push({ wenBen, x, y })
    }),
    strokeText: vi.fn(),
    fillRect: vi.fn((x: number, y: number, kuan: number, gao: number) => {
      jiLu.fillRect.push({ x, y, kuan, gao })
    }),
    measureText: vi.fn((zhi: string) => ({ width: Array.from(zhi).length * 26 })),
    createLinearGradient: vi.fn(() => jianBian),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    lineWidth: 0,
    textAlign: 'start',
    textBaseline: 'alphabetic',
  }
  Object.defineProperties(ctx, {
    fillStyle: {
      configurable: true,
      get: () => '',
      set: (zhi: unknown) => jiLu.fillStyle.push(zhi),
    },
    strokeStyle: {
      configurable: true,
      get: () => '',
      set: (zhi: unknown) => jiLu.strokeStyle.push(zhi),
    },
    font: {
      configurable: true,
      get: () => '',
      set: (zhi: string) => jiLu.font.push(zhi),
    },
  })

  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() =>
      xuanXiang.wuCtx ? null : (ctx as unknown as CanvasRenderingContext2D),
    ),
    toBlob: vi.fn((huiTiao: (blob: Blob | null) => void) => {
      huiTiao(xuanXiang.wuBlob ? null : new Blob(['zhan-bao'], { type: 'image/png' }))
    }),
  }

  // 每个桩实例一个唯一 blob 地址：URL.revokeObjectURL 是全局装的 mock，
  // 别的实例里未跑完的待发回收定时器也会在推进时钟时打到本实例的 lianJieHuiFu 上，
  // 地址唯一才能把「本实例被回收几次」与「别人的回收定时器」分开计（否则该用例对用例顺序敏感）
  const benShiLiDiZhi = `blob:fp10-hai-bao-${++diZhiJiShu}`
  const lianJieQingQiu = vi.fn(() => benShiLiDiZhi)
  const lianJieHuiFu = vi.fn()
  const chuangJianDeLianJie: LianJieJiLu[] = []
  const jianShiQi = vi
    .spyOn(document, 'createElement')
    .mockImplementation(((biaoQian: string) => {
      if (biaoQian === 'canvas') return canvas as unknown as HTMLCanvasElement
      return yuanShiChuangJian(biaoQian)
    }) as typeof document.createElement)
  // 拦截真实点击下载：记录 href/download 并让 jsdom 不去导航
  const dianJi = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function (this: HTMLAnchorElement) {
      chuangJianDeLianJie.push({
        href: this.href,
        xiaZai: this.getAttribute('download') ?? '',
      })
    })

  return {
    jiLu,
    canvas,
    benShiLiDiZhi,
    chuangJianDeLianJie,
    lianJieQingQiu,
    lianJieHuiFu,
    dianJi,
    daKaiXiaZaiNengLi() {
      Object.defineProperty(URL, 'createObjectURL', {
        value: lianJieQingQiu,
        configurable: true,
      })
      Object.defineProperty(URL, 'revokeObjectURL', {
        value: lianJieHuiFu,
        configurable: true,
      })
    },
    huiFu() {
      jianShiQi.mockRestore()
      dianJi.mockRestore()
      delete (URL as unknown as Record<string, unknown>).createObjectURL
      delete (URL as unknown as Record<string, unknown>).revokeObjectURL
    },
  }
}

function chuangJianDangAn(cha: Partial<DangAnXiangQing> = {}): DangAnXiangQing {
  return {
    id: 'dang-an-1',
    jiao_se_id: 'jiao-se-1',
    jiao_se_ming_zi: '小甜心',
    shi_fou_zha_xing: true,
    jie_guo_lei_xing: '被渣男骗了',
    jie_guo_lei_xing_yuan: 'shi_bai_bei_zha_xing_qi_pian',
    shi_fou_feng_cun: true,
    liao_tian_tian_shu: 5,
    xiao_xi_zong_shu: 20,
    fu_pan_shu_ju: null,
    fu_pan_nei_rong: null,
    chuang_jian_shi_jian: '2026-07-07T10:00:00.000Z',
    zui_hou_xiao_xi_shi_jian: '2026-07-07T10:30:00.000Z',
    you_xi_jie_shu_shi_jian: JIE_SHU_SHI_JIAN,
    mbti_lei_xing: 'INFP',
    jun_shi_ji_lu: [],
    category_id: '00000000-0000-4000-8000-000000000001',
    sort_order: 0,
    ...cha,
  }
}

/* 结局时间戳（UTC）。展示文本由 过往战绩.vue 的 geShiHuaRiQiShiJian 用
   toLocaleString('zh-CN', {month,day,hour,minute}) 折算，随运行环境时区变化，
   故期望值必须用同一规则现场算出，禁止写死字面量。 */
const JIE_SHU_SHI_JIAN = '2026-07-07T10:35:00.000Z'
function guoQiWenBen(utcWenBen: string): string {
  return new Date(utcWenBen).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function jiHeZhanBaoShuRu(cha: Partial<ZhanBaoShuRu> = {}): ZhanBaoShuRu {
  return {
    jiaoSeMing: '小甜心',
    jieGuoWenBen: '被渣男骗了',
    jieGuoFenLei: 'shibai',
    biaoQing: '😈',
    liaoTianTianShu: 5,
    xiaoXiZongShu: 20,
    mbtiLeiXing: 'INFP',
    jieShuShiJianWenBen: guoQiWenBen(JIE_SHU_SHI_JIAN),
    qiPaoAI: 'yunBai',
    ...cha,
  }
}

async function mountZuJian(dangAn: DangAnXiangQing[] = [chuangJianDangAn()]) {
  const { huoQuDangAnLieBiao, huoQuZhanJiFenLeiLieBiao } = await import('@/api/聊天')
  vi.mocked(huoQuDangAnLieBiao).mockResolvedValue(dangAn)
  vi.mocked(huoQuZhanJiFenLeiLieBiao).mockResolvedValue({
    moRenFenLeiId: '00000000-0000-4000-8000-000000000001',
    fenLeiLieBiao: [
      {
        id: '00000000-0000-4000-8000-000000000001',
        name: '默认分类',
        is_default: true,
        record_count: dangAn.length,
        version: 0,
      },
    ],
  })
  const luYou = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/', name: 'zhuJieMian', component: { template: '<div>主页</div>' } }],
  })
  await luYou.push('/')
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(过往战绩, { global: { plugins: [pinia, luYou] }, attachTo: document.body })
  await flushPromises()
  return { wrapper }
}

function jieTaWenBen(jiLu: { fillText: { wenBen: string }[] }): string[] {
  return jiLu.fillText.map((tiao) => tiao.wenBen)
}

function yongSeJi(jiLu: { fillStyle: unknown[] }): Set<string> {
  return new Set(jiLu.fillStyle.filter((zhi): zhi is string => typeof zhi === 'string'))
}

async function dianJiFenXiang(wrapper: Awaited<ReturnType<typeof mountZuJian>>['wrapper']) {
  await wrapper.find('.caozuo-anniu.fenxiang').trigger('click')
  await flushPromises()
}

describe('FP-10 战报海报绘制', () => {
  let zhuangZhi: ReturnType<typeof chuangJianCanvasZhuangZhi> | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    qingChuFenXiangNengLi()
    zhuangZhi?.huiFu()
    zhuangZhi = null
  })
  afterEach(() => {
    zhuangZhi?.huiFu()
    zhuangZhi = null
    huiFuUrlNengLi()
    document.getElementById('fp10-zhuti-kuai')?.remove()
  })

  function zhunBei(zhuTi: 'light' | 'dark') {
    zhuangZhi?.huiFu()
    zhuRuZhuTi(zhuTi)
    zhuangZhi = chuangJianCanvasZhuangZhi()
    // 本 describe 只取证海报绘制，出口统一给成「可下载」，避免降级链噪声
    zhuangZhi.daKaiXiaZaiNengLi()
    return zhuangZhi
  }

  it('点分享会手绘一张 3:4 竖版 PNG 海报（画布尺寸与导出参数合法）', async () => {
    const zhuang = zhunBei('dark')
    const { wrapper } = await mountZuJian()
    await dianJiFenXiang(wrapper)

    expect(zhuang.canvas.getContext).toHaveBeenCalledWith('2d')
    expect(zhuang.canvas.width).toBe(ZHAN_BAO_KUAN)
    expect(zhuang.canvas.height).toBe(ZHAN_BAO_GAO)
    expect(ZHAN_BAO_KUAN / ZHAN_BAO_GAO).toBeCloseTo(0.75, 5)
    expect(zhuang.canvas.toBlob).toHaveBeenCalledTimes(1)
    expect(zhuang.canvas.toBlob.mock.calls[0][1]).toBe('image/png')

    const huaZhi = jieTaWenBen(zhuang.jiLu)
    expect(huaZhi).toContain('小甜心')
    expect(huaZhi).toContain('被渣男骗了')
    expect(huaZhi).toContain('INFP')
    expect(huaZhi).toContain('😈')
    expect(huaZhi).toContain(huoQuFanYi('zhanJi', 'haiBaoTianShuBiaoQian'))
    expect(huaZhi).toContain(huoQuFanYi('zhanJi', 'haiBaoXiaoXiBiaoQian'))
    expect(huaZhi).toContain(huoQuFanYi('zhanJi', 'haiBaoXingGeBiaoQian'))
    expect(huaZhi).toContain(huoQuFanYi('zhanJi', 'haiBaoJieShuBiaoQian'))
    expect(huaZhi).toContain('5')
    expect(huaZhi).toContain('20')
    /* 结局时间走 geShiHuaRiQiShiJian 的 toLocaleString('zh-CN')，输出随运行环境时区变化
       （本地 UTC+8 得 18:35，CI 的 UTC 得 10:35）。此处按同一规则现场折算，
       断言不再与运行机器的时区绑定。 */
    expect(huaZhi).toContain(guoQiWenBen('2026-07-07T10:35:00.000Z'))
  })

  it('海报文案全部来自翻译文件：不出现「分享」当前缀的错句，也不含任何链接', async () => {
    const zhuang = zhunBei('light')
    const { wrapper } = await mountZuJian()
    await dianJiFenXiang(wrapper)

    const qianZhui = huoQuFanYi('zhanJi', 'fenXiang')
    const huaZhi = jieTaWenBen(zhuang.jiLu)
    expect(huaZhi.some((zi) => zi.startsWith(qianZhui))).toBe(false)
    expect(huaZhi).toContain(huoQuFanYi('zhanJi', 'fenXiangHaiBaoBiaoTi'))
    expect(huaZhi).toContain(huoQuFanYi('renZheng', 'yingYongMing'))
    expect(huaZhi).toContain(huoQuFanYi('renZheng', 'yingYongFuBiaoTi'))
    expect(huaZhi).toContain(huoQuFanYi('tongYong', 'aiTiShiTiao'))
    expect(huaZhi.some((zi) => /https?:\/\/|www\./.test(zi))).toBe(false)

    const wenAn = huoQuZhanBaoWenAn(jiHeZhanBaoShuRu())
    expect(wenAn.startsWith(qianZhui)).toBe(false)
    expect(wenAn).not.toMatch(/https?:\/\/|www\./)
    expect(wenAn).toContain('小甜心')
    expect(wenAn).toContain('被渣男骗了')
    expect(wenAn).toContain('和我恋爱吧')
  })

  it('配色逐色取自当前主题令牌：暗色块注入得暗色值，且与明色块取值不同', async () => {
    const an = zhunBei('dark')
    const { wrapper: anWrapper } = await mountZuJian()
    await dianJiFenXiang(anWrapper)
    const anSeYongSe = yongSeJi(an.jiLu)
    const anSeZhi = Object.fromEntries(
      HAI_BAO_LING_PAI.map((ming) => [ming, lingPaiJiSuanZhi(ming)]),
    ) as Record<string, string>

    const ming = zhunBei('light')
    const { wrapper: mingWrapper } = await mountZuJian()
    await dianJiFenXiang(mingWrapper)
    const mingSeYongSe = yongSeJi(ming.jiLu)

    for (const ming2 of HAI_BAO_LING_PAI) {
      expect(anSeZhi[ming2], `暗色主题缺令牌 ${ming2}`).not.toBe('')
    }
    expect(anSeYongSe.has(anSeZhi['--wenben-zhuse'])).toBe(true)
    expect(anSeYongSe.has(anSeZhi['--beijing-kaopian'])).toBe(true)
    expect(anSeYongSe.has(anSeZhi['--wenben-ciuse'])).toBe(true)
    expect(anSeYongSe.has(anSeZhi['--yanse-zhanji'])).toBe(true)
    expect(anSeYongSe.has(anSeZhi['--biao-qian-shibai-beijing'])).toBe(true)
    expect(anSeYongSe.has(anSeZhi['--biao-qian-chenggong-beijing'])).toBe(false)
    // 明暗两套取值不同 → 证伪「写死一套色值」
    expect(mingSeYongSe.has(anSeZhi['--wenben-zhuse'])).toBe(false)
    // 背景渐变的四个停靠点即 --beijing-jianbian-1..4（第 5、6 个是尾注分隔条的强调色）
    const beiJingTingDian = an.jiLu.colorStop.slice(0, 4)
    expect(beiJingTingDian.map((tiao) => tiao.offset)).toEqual([0, 1 / 3, 2 / 3, 1])
    expect(beiJingTingDian.map((tiao) => tiao.color)).toEqual([
      anSeZhi['--beijing-jianbian-1'],
      anSeZhi['--beijing-jianbian-2'],
      anSeZhi['--beijing-jianbian-3'],
      anSeZhi['--beijing-jianbian-4'],
    ])
  })

  it('胜利结局用成功色令牌 + 💕，失败结局用失败色令牌 + 😈（状态与档案同源）', async () => {
    const an = zhunBei('dark')
    const { wrapper } = await mountZuJian([
      chuangJianDangAn({
        shi_fou_zha_xing: false,
        jie_guo_lei_xing: '修成正果',
        jie_guo_lei_xing_yuan: 'sheng_li_ai_qing',
      }),
    ])
    await dianJiFenXiang(wrapper)
    const yongSe = yongSeJi(an.jiLu)
    expect(yongSe.has(lingPaiJiSuanZhi('--biao-qian-chenggong-beijing'))).toBe(true)
    expect(yongSe.has(lingPaiJiSuanZhi('--biao-qian-shibai-beijing'))).toBe(false)
    expect(jieTaWenBen(an.jiLu)).toContain(huoQuFanYi('zhanJi', 'zhuangTaiShengLi'))
    expect(jieTaWenBen(an.jiLu)).toContain('💕')
    expect(jieTaWenBen(an.jiLu)).toContain('修成正果')
  })

  it('字体族取 --ziti-jiazu 令牌（明暗两套均有定义），emoji 走既有 emoji 字体族', async () => {
    const zhuang = zhunBei('light')
    const jiaZu = lingPaiJiSuanZhi('--ziti-jiazu')
    expect(jiaZu).not.toBe('')
    expect((lingPaiYuanMa.match(/--ziti-jiazu:/g) ?? []).length).toBe(2)
    const { wrapper } = await mountZuJian()
    await dianJiFenXiang(wrapper)

    expect(zhuang.jiLu.font.length).toBeGreaterThan(0)
    expect(
      zhuang.jiLu.font.every((zi) => zi.endsWith(jiaZu) || zi.includes('Apple Color Emoji')),
    ).toBe(true)
    expect(zhuang.jiLu.font.some((zi) => zi.endsWith(jiaZu))).toBe(true)
    expect(zhuang.jiLu.font.some((zi) => zi.includes('Apple Color Emoji'))).toBe(true)
  })

  it('结局气泡取 config/气泡主题.ts 的对象气泡主题（随用户气泡设置变化）', async () => {
    const zhuang = zhunBei('dark')
    const { wrapper } = await mountZuJian()
    使用用户设置仓库().qiPaoAI = 'anYe'
    await dianJiFenXiang(wrapper)

    const yongSe = yongSeJi(zhuang.jiLu)
    expect(yongSe.has(QI_PAO_YU_SHE_BIAO.anYe.beiJing)).toBe(true)
    expect(
      zhuang.jiLu.fillStyle.filter((zhi) => zhi === QI_PAO_YU_SHE_BIAO.anYe.wenBen).length,
    ).toBeGreaterThanOrEqual(2)
    expect(jieTaWenBen(zhuang.jiLu)).toContain('被渣男骗了')
  })

  it('画布上不引入任何图片解码路径：不画头像，杜绝 tainted canvas 导出抛错', () => {
    expect(haiBaoYuanMa).not.toMatch(/drawImage|new Image|crossOrigin|createImageBitmap|\.decode\(/)
    expect(zuJianYuanMa).not.toMatch(/crossOrigin/)
  })

  it('所有绘制点落在画布内：超长角色名被裁成一格带省略号而不撑破海报', async () => {
    const zhuang = zhunBei('dark')
    const { wrapper } = await mountZuJian([
      chuangJianDangAn({ jiao_se_ming_zi: '一个'.repeat(40) }),
    ])
    await dianJiFenXiang(wrapper)

    for (const tiao of zhuang.jiLu.fillText) {
      expect(tiao.x).toBeGreaterThanOrEqual(0)
      expect(tiao.x).toBeLessThanOrEqual(ZHAN_BAO_KUAN)
      expect(tiao.y).toBeGreaterThanOrEqual(0)
      expect(tiao.y).toBeLessThanOrEqual(ZHAN_BAO_GAO)
    }
    for (const kuai of zhuang.jiLu.fillRect) {
      expect(kuai.x + kuai.kuan).toBeLessThanOrEqual(ZHAN_BAO_KUAN)
      expect(kuai.y + kuai.gao).toBeLessThanOrEqual(ZHAN_BAO_GAO)
    }
    const mingHang = jieTaWenBen(zhuang.jiLu).find((zi) => zi.startsWith('一个'))
    expect(mingHang?.endsWith('…')).toBe(true)
  })

  it('getContext 不可用（jsdom 无 canvas 后端）：抛出生成失败而非产出空图', async () => {
    zhuRuZhuTi('dark')
    const wuCtx = chuangJianCanvasZhuangZhi({ wuCtx: true })
    await expect(shengChengZhanBaoHaiBao(jiHeZhanBaoShuRu())).rejects.toThrow(
      huoQuFanYi('zhanJi', 'haiBaoShengChengShiBai'),
    )
    expect(wuCtx.canvas.toBlob).not.toHaveBeenCalled()
    wuCtx.huiFu()
  })

  it('toBlob 回调 null 时同样抛出生成失败，不返回空 blob', async () => {
    zhuRuZhuTi('dark')
    const wuBlob = chuangJianCanvasZhuangZhi({ wuBlob: true })
    await expect(shengChengZhanBaoHaiBao(jiHeZhanBaoShuRu())).rejects.toThrow(
      huoQuFanYi('zhanJi', 'haiBaoShengChengShiBai'),
    )
    wuBlob.huiFu()
  })

  it('设计令牌缺档时直接抛错，不静默画出无色的海报', async () => {
    zhuangZhi = chuangJianCanvasZhuangZhi()
    document.getElementById('fp10-zhuti-kuai')?.remove()
    const style = document.createElement('style')
    style.textContent = ':root{--beijing-jianbian-1:#000000}'
    document.head.appendChild(style)
    await expect(shengChengZhanBaoHaiBao(jiHeZhanBaoShuRu())).rejects.toThrow(
      huoQuFanYi('zhanJi', 'haiBaoShengChengShiBai'),
    )
    expect(zhuangZhi.canvas.getContext).toHaveBeenCalledWith('2d')
    expect(zhuangZhi.canvas.toBlob).not.toHaveBeenCalled()
    style.remove()
    zhuangZhi.huiFu()
    zhuangZhi = null
  })

  it('文件名与文案同源：战报标题 + 角色名（PNG 后缀），空名走「未命名」', () => {
    expect(huoQuZhanBaoWenJianMing(jiHeZhanBaoShuRu())).toBe(
      `${huoQuFanYi('zhanJi', 'fenXiangHaiBaoBiaoTi')}-小甜心.png`,
    )
    expect(huoQuZhanBaoWenJianMing(jiHeZhanBaoShuRu({ jiaoSeMing: '   ' }))).toContain(
      huoQuFanYi('haoYou', 'weiMingMing'),
    )
  })
})

describe('FP-10 分享出口三级降级', () => {
  let zhuangZhi: ReturnType<typeof chuangJianCanvasZhuangZhi>

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    qingChuFenXiangNengLi()
    zhuRuZhuTi('dark')
    zhuangZhi = chuangJianCanvasZhuangZhi()
  })
  afterEach(() => {
    zhuangZhi?.huiFu()
    qingChuFenXiangNengLi()
    huiFuUrlNengLi()
    vi.useRealTimers()
  })

  function jiaShare(shareSpy: ReturnType<typeof vi.fn>) {
    Object.defineProperty(globalThis.navigator, 'share', { value: shareSpy, configurable: true })
  }

  function jiaCanShare(zhiChi: boolean) {
    Object.defineProperty(globalThis.navigator, 'canShare', {
      value: vi.fn(() => zhiChi),
      configurable: true,
    })
  }

  function jiaJianTieBan() {
    const xieRu = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: xieRu },
      configurable: true,
    })
    return xieRu
  }

  it('navigator.share 可用且支持文件：走系统分享面板并带上 PNG，不降级下载', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined)
    jiaShare(shareSpy)
    jiaCanShare(true)
    const xieRu = jiaJianTieBan()
    const { wrapper } = await mountZuJian()
    await dianJiFenXiang(wrapper)

    expect(shareSpy).toHaveBeenCalledTimes(1)
    const payload = shareSpy.mock.calls[0][0] as {
      title: string
      text: string
      files?: File[]
    }
    expect(payload.title).toBe(huoQuFanYi('zhanJi', 'fenXiangHaiBaoBiaoTi'))
    expect(payload.text).toBe(huoQuZhanBaoWenAn(jiHeZhanBaoShuRu()))
    expect(payload.files).toHaveLength(1)
    expect(payload.files?.[0].type).toBe('image/png')
    expect(payload.files?.[0].name).toBe(
      `${huoQuFanYi('zhanJi', 'fenXiangHaiBaoBiaoTi')}-小甜心.png`,
    )
    expect(xieRu).not.toHaveBeenCalled()
    expect(zhuangZhi.chuangJianDeLianJie).toHaveLength(0)
    expect(wrapper.find('.zhanji-tishi').text()).toBe(huoQuFanYi('zhanJi', 'fenXiangYiWanCheng'))
    expect(track).toHaveBeenCalledWith(
      'jie_ju_fen_xiang',
      expect.objectContaining({ chu_kou: 'fenxiang' }),
    )
  })

  it('canShare 判定不支持带文件：不猜着调 share，直接降级下载图片', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined)
    jiaShare(shareSpy)
    jiaCanShare(false)
    const xieRu = jiaJianTieBan()
    zhuangZhi.daKaiXiaZaiNengLi()
    const { wrapper } = await mountZuJian()
    await dianJiFenXiang(wrapper)

    expect(shareSpy).not.toHaveBeenCalled()
    expect(xieRu).not.toHaveBeenCalled()
    expect(zhuangZhi.lianJieQingQiu).toHaveBeenCalledTimes(1)
    expect(zhuangZhi.lianJieQingQiu.mock.calls[0][0]).toBeInstanceOf(Blob)
    expect(zhuangZhi.dianJi).toHaveBeenCalledTimes(1)
    expect(zhuangZhi.chuangJianDeLianJie[0].href).toContain('fp10-hai-bao')
    expect(zhuangZhi.chuangJianDeLianJie[0].xiaZai).toBe(
      `${huoQuFanYi('zhanJi', 'fenXiangHaiBaoBiaoTi')}-小甜心.png`,
    )
    expect(wrapper.find('.zhanji-tishi').text()).toBe(huoQuFanYi('zhanJi', 'haiBaoYiXiaZai'))
  })

  it('有 share 但环境无 canShare：同样不猜，走下载（canShare 与 files 同规范引入）', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined)
    jiaShare(shareSpy)
    zhuangZhi.daKaiXiaZaiNengLi()
    const { wrapper } = await mountZuJian()
    await dianJiFenXiang(wrapper)

    expect(shareSpy).not.toHaveBeenCalled()
    expect(zhuangZhi.dianJi).toHaveBeenCalledTimes(1)
  })

  it('无 share 也无下载能力：降级复制战报文案并明确提示', async () => {
    guanBiXiaZaiNengLi()
    const xieRu = jiaJianTieBan()
    const { wrapper } = await mountZuJian()
    await dianJiFenXiang(wrapper)

    expect(xieRu).toHaveBeenCalledTimes(1)
    expect(xieRu.mock.calls[0][0]).toBe(huoQuZhanBaoWenAn(jiHeZhanBaoShuRu()))
    expect(wrapper.find('.zhanji-tishi').text()).toBe(
      huoQuFanYi('zhanJi', 'buZhiChiZhiNengFuZhi'),
    )
    expect(track).toHaveBeenCalledWith(
      'jie_ju_fen_xiang',
      expect.objectContaining({ chu_kou: 'fuZhi' }),
    )
  })

  it('连剪贴板都没有：提示复制失败，且不留未捕获异常', async () => {
    guanBiXiaZaiNengLi()
    const weiChuli = vi.fn()
    window.addEventListener('unhandledrejection', weiChuli)
    const { wrapper } = await mountZuJian()
    await dianJiFenXiang(wrapper)

    expect(wrapper.find('.zhanji-tishi').text()).toBe(huoQuFanYi('liaoTian', 'fuZhiShiBai'))
    expect(zhuangZhi.canvas.toBlob).toHaveBeenCalledTimes(1)
    expect(weiChuli).not.toHaveBeenCalled()
    window.removeEventListener('unhandledrejection', weiChuli)
  })

  it('用户在系统面板取消（AbortError）：提示已取消分享，不再降级下载', async () => {
    const quXiao = Object.assign(new Error('cancel'), { name: 'AbortError' })
    const shareSpy = vi.fn().mockRejectedValue(quXiao)
    jiaShare(shareSpy)
    jiaCanShare(true)
    zhuangZhi.daKaiXiaZaiNengLi()
    const { wrapper } = await mountZuJian()
    await dianJiFenXiang(wrapper)

    expect(shareSpy).toHaveBeenCalledTimes(1)
    expect(zhuangZhi.dianJi).not.toHaveBeenCalled()
    expect(wrapper.find('.zhanji-tishi').text()).toBe(huoQuFanYi('zhanJi', 'fenXiangYiQuXiao'))
  })

  it('系统面板报错（非取消）：继续降级为下载并提示已保存', async () => {
    const shareSpy = vi.fn().mockRejectedValue(new Error('面板异常'))
    jiaShare(shareSpy)
    jiaCanShare(true)
    zhuangZhi.daKaiXiaZaiNengLi()
    const { wrapper } = await mountZuJian()
    await dianJiFenXiang(wrapper)

    expect(shareSpy).toHaveBeenCalledTimes(1)
    expect(zhuangZhi.dianJi).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.zhanji-tishi').text()).toBe(huoQuFanYi('zhanJi', 'haiBaoYiXiaZai'))
    expect(track).toHaveBeenCalledWith(
      'jie_ju_fen_xiang',
      expect.objectContaining({ chu_kou: 'xiaZai' }),
    )
  })

  it('海报画不出来：提示生成失败，且三个出口一个都不碰', async () => {
    zhuangZhi.huiFu()
    zhuangZhi = chuangJianCanvasZhuangZhi({ wuCtx: true })
    const shareSpy = vi.fn().mockResolvedValue(undefined)
    jiaShare(shareSpy)
    jiaCanShare(true)
    const xieRu = jiaJianTieBan()
    zhuangZhi.daKaiXiaZaiNengLi()
    const { wrapper } = await mountZuJian()
    await dianJiFenXiang(wrapper)

    expect(wrapper.find('.qian-tai-cuo-wu-ying-xiang').text()).toBe(
      huoQuFanYi('zhanJi', 'haiBaoShengChengShiBai'),
    )
    expect(wrapper.find('.qian-tai-cuo-wu-dai-ma').text()).toBe('FRONTEND_UNKNOWN_ERROR')
    expect(shareSpy).not.toHaveBeenCalled()
    expect(xieRu).not.toHaveBeenCalled()
    expect(zhuangZhi.dianJi).not.toHaveBeenCalled()
    expect(track).not.toHaveBeenCalled()
  })

  it('点击瞬间即有「生成中」反馈；生成中重复点击不再二次出图', async () => {
    let jieSuo!: (blob: Blob) => void
    const dengDai = new Promise<Blob>((jieJue) => {
      jieSuo = jieJue
    })
    zhuangZhi.canvas.toBlob = vi.fn((huiTiao: (blob: Blob | null) => void) => {
      void dengDai.then((blob) => huiTiao(blob))
    }) as unknown as typeof zhuangZhi.canvas.toBlob

    const { wrapper } = await mountZuJian()
    const anNiu = wrapper.find('.caozuo-anniu.fenxiang')
    expect(anNiu.attributes('aria-busy')).toBe('false')
    await anNiu.trigger('click')
    expect(wrapper.find('.zhanji-tishi').text()).toBe(
      huoQuFanYi('zhanJi', 'fenXiangZhengZaiShengCheng'),
    )
    expect(anNiu.attributes('aria-busy')).toBe('true')
    await anNiu.trigger('click')
    expect(zhuangZhi.canvas.getContext).toHaveBeenCalledTimes(1)

    jieSuo(new Blob(['hai-bao'], { type: 'image/png' }))
    await flushPromises()
    expect(anNiu.attributes('aria-busy')).toBe('false')
    expect(zhuangZhi.canvas.getContext).toHaveBeenCalledTimes(1)
  })

  it('提示会自动消失；下载完成后 blob 地址被释放', async () => {
    vi.useFakeTimers()
    zhuangZhi.daKaiXiaZaiNengLi()
    const { wrapper } = await mountZuJian()
    await wrapper.find('.caozuo-anniu.fenxiang').trigger('click')
    await vi.advanceTimersByTimeAsync(1000)
    expect(zhuangZhi.lianJieHuiFu).toHaveBeenCalledWith(zhuangZhi.benShiLiDiZhi)
    await vi.advanceTimersByTimeAsync(2600)
    expect(wrapper.find('.zhanji-tishi').exists()).toBe(false)
    wrapper.unmount()
  })

  it('卸载时释放未及回收的 blob 地址并停掉提示定时器', async () => {
    vi.useFakeTimers()
    zhuangZhi.daKaiXiaZaiNengLi()
    const { wrapper } = await mountZuJian()
    await wrapper.find('.caozuo-anniu.fenxiang').trigger('click')
    wrapper.unmount()
    expect(zhuangZhi.lianJieHuiFu).toHaveBeenCalledWith(zhuangZhi.benShiLiDiZhi)
    vi.advanceTimersByTime(5000)
    // 只断言本实例那条地址被回收恰好一次（卸载即回收 + 待发回收定时器已取消，不重复回收）
    expect(
      zhuangZhi.lianJieHuiFu.mock.calls.filter((参数) => 参数[0] === zhuangZhi.benShiLiDiZhi).length,
    ).toBe(1)
  })
})

describe('FP-10 分享按钮样式与旧错句', () => {
  it('补齐 .caozuo-anniu.fenxiang 规则：尺寸继承同行按钮，霓虹亮黄主社交动作（明暗两套同值荧光色）', () => {
    const guiZe = zuJianYuanMa.match(/\.caozuo-anniu\.fenxiang\s*\{([^}]*)\}/)
    expect(guiZe, '过往战绩.vue 缺少 .caozuo-anniu.fenxiang 规则').not.toBeNull()
    const shengMing = (guiZe as RegExpMatchArray)[1]
    expect(shengMing).toContain('background: #ffd500')
    expect(shengMing).toContain('color: #14141a')
    expect(zuJianYuanMa).toMatch(/\.caozuo-anniu\.fenxiang:focus-visible/)
    // 分享与继续/复盘同尺寸同圆角（粗黑描边+硬阴影由 .caozuo-anniu 公共规则统一下发）
    expect(zuJianYuanMa).toMatch(
      /\.caozuo-anniu\s*\{[^}]*border:\s*2\.5px\s+solid\s+#14141a/,
    )
    expect(zuJianYuanMa).toMatch(/\.caozuo-anniu\s*\{[^}]*box-shadow:\s*3px\s+3px\s+0\s+#14141a/)

    const duanList = [...lingPaiYuanMa.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    const fuGai = duanList.filter((duan) =>
      duan[1]
        .split(',')
        .some((bu) => bu.trim() === ':root' || bu.trim().startsWith(':root[data-theme')),
    )
    for (const ming of new Set(
      [...shengMing.matchAll(/var\(--([a-z0-9-]+)/g)].map((p) => p[1]),
    )) {
      const hanGai = fuGai.filter((duan) => new RegExp(`--${ming}\\s*:`).test(duan[2]))
      const light = hanGai.some((duan) => duan[1].includes('light'))
      const dark = hanGai.some((duan) => duan[1].includes('dark') || duan[1].trim() === ':root')
      expect(`${ming}:${light}:${dark}`, `令牌 --${ming} 缺明暗两套`).toBe(`${ming}:true:true`)
    }
  })

  it('旧实现（把按钮文案当分享正文前缀 + 静默剪贴板 + 空 catch）已删除', () => {
    expect(zuJianYuanMa).not.toMatch(/`\$\{huoQuFanYi\('zhanJi', 'fenXiang'\)\}/)
    expect(zuJianYuanMa).toMatch(/shengChengZhanBaoHaiBao/)
    expect(zuJianYuanMa).toMatch(/navigator\.share/)
    expect(zuJianYuanMa).toMatch(/navigator\.canShare/)
    expect(zuJianYuanMa).not.toMatch(/}\s*catch\s*\{\s*\}/)
  })
})
