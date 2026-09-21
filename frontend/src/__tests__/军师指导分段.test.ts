import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { huoQuFanYi } from '@/config/translations'
import type { FanYiZiJian } from '@/config/translations'
import 军师指导分段 from '@/components/军师指导分段.vue'
import type { JunShiZhiDaoFenDuan } from '@/types'

const houDuanJunShiPeiZhiYuanMa = readFileSync(
  resolve(__dirname, '../../../backend/src/config/军师配置.ts'),
  'utf8',
)

const zuJianYuanMa = readFileSync(resolve(__dirname, '../components/军师指导分段.vue'), 'utf8')

const lingPaiYuanMa = readFileSync(resolve(__dirname, '../styles/variables.css'), 'utf8')

const 完整分段: JunShiZhiDaoFenDuan = {
  dangQianJuMian: '她回得慢但没结束，还在观望',
  xiaYiBuZenMeHui: '那我先不打扰你啦，你忙完喊我一声',
  weiShenMeZheMeLiao: '她上一条说在加班，追着发只会掉分',
  guLi: '你这节奏比上周稳多了',
}

const 整段文本 = [
  完整分段.dangQianJuMian,
  完整分段.xiaYiBuZenMeHui,
  完整分段.weiShenMeZheMeLiao,
  完整分段.guLi,
].join('\n')

function mountFenDuan(
  canShu: { fenDuan: JunShiZhiDaoFenDuan | null; zhengDuan?: string } = {
    fenDuan: 完整分段,
    zhengDuan: 整段文本,
  },
) {
  return mount(军师指导分段, { props: canShu })
}

describe('FP-11 军师指导分区渲染', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('分段渲染时不再出现整段兜底节点', () => {
    const wrapper = mountFenDuan()
    expect(wrapper.find('.junshi-fenduan').exists()).toBe(true)
    expect(wrapper.find('.jieguo-neirong').exists()).toBe(false)
  })

  it('分区 DOM 顺序：下一步怎么回在最前，其余三段依次在后', () => {
    const wrapper = mountFenDuan()
    const duan = wrapper.findAll('.junshi-duan').map((jieDian) => jieDian.attributes('data-duan'))
    expect(duan).toEqual(['xiaYiBuZenMeHui', 'dangQianJuMian', 'weiShenMeZheMeLiao', 'guLi'])
    const section = wrapper.findAll('section')
    expect(section[0].classes()).toContain('junshi-duan-zhidian')
    expect(
      section.slice(1).every((jieDian) => jieDian.classes().includes('junshi-duan-canyao')),
    ).toBe(true)
  })

  it('每段文本与标题逐段精确对应，标题全部来自翻译文件', () => {
    const wrapper = mountFenDuan()
    expect(wrapper.find('[data-duan="xiaYiBuZenMeHui"] .zhidian-neirong').text()).toBe(
      完整分段.xiaYiBuZenMeHui,
    )
    expect(wrapper.find('[data-duan="dangQianJuMian"] .duan-neirong').text()).toBe(
      完整分段.dangQianJuMian,
    )
    expect(wrapper.find('[data-duan="weiShenMeZheMeLiao"] .duan-neirong').text()).toBe(
      完整分段.weiShenMeZheMeLiao,
    )
    expect(wrapper.find('[data-duan="guLi"] .duan-neirong').text()).toBe(完整分段.guLi)

    expect(wrapper.find('[data-duan="xiaYiBuZenMeHui"] .duan-biaoti').text()).toBe(
      huoQuFanYi('junShi', 'xiaYiBuZenMeHui'),
    )
    expect(wrapper.find('[data-duan="dangQianJuMian"] .duan-biaoti').text()).toBe(
      huoQuFanYi('junShi', 'dangQianJuMian'),
    )
    expect(wrapper.find('[data-duan="weiShenMeZheMeLiao"] .duan-biaoti').text()).toBe(
      huoQuFanYi('junShi', 'weiShenMeZheMeLiao'),
    )
    expect(wrapper.find('[data-duan="guLi"] .duan-biaoti').text()).toBe(
      huoQuFanYi('junShi', 'guLi'),
    )
  })

  it('可选段为空时该段不渲染，其余段照常', () => {
    const wrapper = mountFenDuan({
      fenDuan: { ...完整分段, guLi: '', weiShenMeZheMeLiao: '  ' },
      zhengDuan: 整段文本,
    })
    const duan = wrapper.findAll('.junshi-duan').map((jieDian) => jieDian.attributes('data-duan'))
    expect(duan).toEqual(['xiaYiBuZenMeHui', 'dangQianJuMian'])
    expect(wrapper.find('.junshi-fenduan').exists()).toBe(true)
  })

  it('旧记录（无分段字段）整段兜底展示且不崩', () => {
    const wrapper = mountFenDuan({ fenDuan: null, zhengDuan: '老版本整段建议' })
    expect(wrapper.find('.junshi-fenduan').exists()).toBe(false)
    expect(wrapper.find('.jieguo-neirong').exists()).toBe(true)
    expect(wrapper.find('.jieguo-neirong').text()).toBe('老版本整段建议')
    expect(wrapper.find('.fuzhi-anniu').exists()).toBe(false)
  })

  it('分段全为空白时退回整段兜底，不渲染空白分区', () => {
    const wrapper = mountFenDuan({
      fenDuan: { dangQianJuMian: '', xiaYiBuZenMeHui: '  ', weiShenMeZheMeLiao: '', guLi: '' },
      zhengDuan: '兜底整段',
    })
    expect(wrapper.find('.junshi-fenduan').exists()).toBe(false)
    expect(wrapper.find('.jieguo-neirong').text()).toBe('兜底整段')
  })

  it('整段缺失但有话术时仍渲染重点段（不出现 undefined）', () => {
    const wrapper = mountFenDuan({
      fenDuan: { ...完整分段, dangQianJuMian: '', weiShenMeZheMeLiao: '', guLi: '' },
      zhengDuan: '',
    })
    expect(wrapper.text()).not.toContain('undefined')
    expect(wrapper.find('.zhidian-neirong').text()).toBe(完整分段.xiaYiBuZenMeHui)
  })
})

describe('FP-11 复制这句回复', () => {
  let xieRu: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    xieRu = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: xieRu },
      configurable: true,
    })
  })

  it('复制的是成品话术本身，不是整段文本', async () => {
    const wrapper = mountFenDuan()
    await wrapper.find('.fuzhi-anniu').trigger('click')
    await vi.waitFor(() => expect(xieRu).toHaveBeenCalledTimes(1))
    expect(xieRu).toHaveBeenCalledWith(完整分段.xiaYiBuZenMeHui)
    expect(xieRu.mock.calls[0][0]).not.toBe(整段文本)
    expect(xieRu.mock.calls[0][0]).not.toContain(完整分段.dangQianJuMian)
  })

  it('按钮文案与成功提示走翻译文件', async () => {
    const wrapper = mountFenDuan()
    const anNiu = wrapper.find('.fuzhi-anniu')
    expect(anNiu.text()).toBe(huoQuFanYi('junShi', 'fuZhiZheJuHua'))
    await anNiu.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('.fuzhi-tishi').exists()).toBe(true))
    expect(wrapper.find('.fuzhi-tishi').text()).toBe(huoQuFanYi('junShi', 'yiFuZhi'))
    expect(wrapper.find('.fuzhi-tishi').attributes('role')).toBe('status')
  })

  it('成功提示会自行消失', async () => {
    vi.useFakeTimers()
    const wrapper = mountFenDuan()
    await wrapper.find('.fuzhi-anniu').trigger('click')
    await vi.advanceTimersByTimeAsync(0)
    expect(wrapper.find('.fuzhi-tishi').exists()).toBe(true)
    await vi.advanceTimersByTimeAsync(2000)
    expect(wrapper.find('.fuzhi-tishi').exists()).toBe(false)
  })

  it('剪贴板抛错时提示复制失败且不抛异常', async () => {
    xieRu.mockRejectedValueOnce(new Error('denied'))
    const wrapper = mountFenDuan()
    await wrapper.find('.fuzhi-anniu').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('.fuzhi-tishi').exists()).toBe(true))
    expect(wrapper.find('.fuzhi-tishi').text()).toBe(huoQuFanYi('junShi', 'fuZhiShiBai'))
  })

  it('无剪贴板能力时降级为复制失败提示', async () => {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    })
    const wenDang = globalThis.document as Document & { execCommand?: (ming: string) => boolean }
    const yuanShi = wenDang.execCommand
    delete wenDang.execCommand
    const wrapper = mountFenDuan()
    await wrapper.find('.fuzhi-anniu').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('.fuzhi-tishi').exists()).toBe(true))
    expect(wrapper.find('.fuzhi-tishi').text()).toBe(huoQuFanYi('junShi', 'fuZhiShiBai'))
    if (yuanShi) {
      Object.defineProperty(wenDang, 'execCommand', { value: yuanShi, configurable: true })
    }
  })

  it('成品话术为空时不给复制入口', () => {
    const wrapper = mountFenDuan({
      fenDuan: { ...完整分段, xiaYiBuZenMeHui: '' },
      zhengDuan: 整段文本,
    })
    expect(wrapper.find('.fuzhi-anniu').exists()).toBe(false)
  })
})

describe('FP-11 前后端分区口径同源', () => {
  const duanDingYi = [
    ...houDuanJunShiPeiZhiYuanMa.matchAll(/ziDuan:\s*'(\w+)',[\s\S]*?moXingJian:\s*'([^']+)'/g),
  ].map((piPei) => ({ ziDuan: piPei[1], moXingJian: piPei[2] }))

  it('后端分区定义为四段', () => {
    expect(duanDingYi.map((duan) => duan.ziDuan)).toEqual([
      'dangQianJuMian',
      'xiaYiBuZenMeHui',
      'weiShenMeZheMeLiao',
      'guLi',
    ])
  })

  it('前端翻译段名与后端模型输出键逐字一致', () => {
    for (const duan of duanDingYi) {
      expect(huoQuFanYi('junShi', duan.ziDuan as FanYiZiJian<'junShi'>)).toBe(duan.moXingJian)
    }
  })
})

describe('FP-11 分区样式主题令牌', () => {
  const yangShiKuai = (() => {
    const piPei = zuJianYuanMa.match(/<style scoped>([\s\S]*?)<\/style>/)
    expect(piPei, '军师指导分段.vue 缺少 scoped 样式块').not.toBeNull()
    return (piPei as RegExpMatchArray)[1]
  })()

  it('重点段与次要段各有独立样式，保证「下一步怎么回」视觉权重最高', () => {
    expect(yangShiKuai).toMatch(/\.junshi-duan-zhidian\s*\{[^}]*var\(--junshi-zhuse\)/)
    const zhidian = yangShiKuai.match(/\.zhidian-neirong\s*\{([^}]*)\}/)
    const canyao = yangShiKuai.match(/\.duan-neirong\s*\{([^}]*)\}/)
    expect(zhidian, '缺少 .zhidian-neirong 规则').not.toBeNull()
    expect(canyao, '缺少 .duan-neirong 规则').not.toBeNull()
    const quXiao = (guiZe: RegExpMatchArray) => Number(/font-size:\s*(\d+)px/.exec(guiZe[1])?.[1])
    expect(quXiao(zhidian as RegExpMatchArray)).toBeGreaterThan(quXiao(canyao as RegExpMatchArray))
    expect((zhidian as RegExpMatchArray)[1]).toContain('font-weight: 600')
    expect((canyao as RegExpMatchArray)[1]).not.toMatch(/font-weight/)
  })

  it('组件用到的每个令牌都在明暗两套均有定义（沿用 FP-10/FP-12 口径）', () => {
    const duanList = [...lingPaiYuanMa.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    const fuGai = duanList.filter((duan) =>
      duan[1]
        .split(',')
        .some((bu) => bu.trim() === ':root' || bu.trim().startsWith(':root[data-theme')),
    )
    const shiYongLingPai = new Set(
      [...yangShiKuai.matchAll(/var\(--([a-z0-9-]+)/g)].map((p) => p[1]),
    )
    expect(shiYongLingPai.size).toBeGreaterThan(0)
    for (const ming of shiYongLingPai) {
      const hanGai = fuGai.filter((duan) => new RegExp(`--${ming}\\s*:`).test(duan[2]))
      const light = hanGai.some((duan) => duan[1].includes('light'))
      const dark = hanGai.some((duan) => duan[1].includes('dark') || duan[1].trim() === ':root')
      expect(`${ming}:${light}:${dark}`, `令牌 --${ming} 缺明暗两套`).toBe(`${ming}:true:true`)
    }
  })

  it('样式块零硬编码色值（#ffffff 之外的颜色一律走令牌）', () => {
    const yingSe = [...yangShiKuai.matchAll(/:\s*([^;{}]*#[0-9a-fA-F]{3,8}[^;{}]*)/g)]
      .map((p) => p[1].trim())
      .filter((shengMing) => !/#ffffff\b/.test(shengMing))
    expect(yingSe, `硬编码色值：${yingSe.join(' | ')}`).toEqual([])
  })

  it('分区正文一律文本插值，无 v-html（模型输出不得当 HTML 执行）', () => {
    expect(zuJianYuanMa).not.toContain('v-html')
  })

  it('所用令牌在明暗两套取值互异且为字面色值（不写死一套、也不转引缺档令牌）', () => {
    const quZhi = (zhuTi: 'light' | 'dark', ming: string): string => {
      const zhengZe =
        zhuTi === 'light'
          ? /:root\[data-theme="light"\]\s*\{([\s\S]*?)\n\}/
          : /:root,\s*:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/
      const kuai = lingPaiYuanMa.match(zhengZe)
      expect(kuai, `variables.css 缺少 ${zhuTi} 主题块`).not.toBeNull()
      const zhi = new RegExp(`--${ming}\\s*:\\s*([^;]+);`).exec((kuai as RegExpMatchArray)[1])
      expect(zhi, `令牌 --${ming} 在 ${zhuTi} 主题块未定义`).not.toBeNull()
      return (zhi as RegExpMatchArray)[1].trim()
    }
    for (const ming of new Set(
      [...yangShiKuai.matchAll(/var\(--([a-z0-9-]+)/g)].map((p) => p[1]),
    )) {
      const mingZhi = quZhi('light', ming)
      const anZhi = quZhi('dark', ming)
      expect(`${ming}:${mingZhi}`, `令牌 --${ming} 明色取值转引了其它令牌`).not.toContain('var(')
      expect(`${ming}:${anZhi}`, `令牌 --${ming} 暗色取值转引了其它令牌`).not.toContain('var(')
      expect(`${ming}:${mingZhi === anZhi}`, `令牌 --${ming} 明暗两套同值`).toBe(`${ming}:false`)
    }
  })
})
