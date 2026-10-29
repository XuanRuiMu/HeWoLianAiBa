import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import 语音气泡 from '@/components/聊天/语音气泡.vue'
import {
  YU_YIN_KE_JIAN_DUAN_SHU_PEI_ZHI,
  jiSuanYuYinKeJianDuanShu,
} from '@/composables/use语音音量'

const 根 = resolve(__dirname, '..')
const du = (xiangDui: string): string => readFileSync(resolve(根, xiangDui), 'utf8')

const 语音源 = du('components/聊天/语音气泡.vue')
const 容器源 = du('components/聊天/气泡容器.vue')
const 聊天页源 = du('views/聊天页面.vue')
const 好友页源 = du('views/好友聊天.vue')
const 令牌源 = du('styles/设计令牌.css')

describe('气泡容器合并：全站只剩一份皮肤', () => {
  it('两页文字气泡与语音气泡都改用气泡容器，页面不再保留第二份皮肤', () => {
    for (const 页 of [聊天页源, 好友页源]) {
      expect(页).toContain("import QiPaoRongQi from '@/components/聊天/气泡容器.vue'")
      expect(页).toContain('<QiPaoRongQi :shi-ben-ren=')
      expect(页).not.toContain('.qipao-neirong {')
      expect(页).not.toContain('.yonghu-xiaoxi .qipao-neirong')
      expect(页).not.toContain('.jiaose-xiaoxi .qipao-neirong')
    }
    expect(语音源).toContain("import QiPaoRongQi from '@/components/聊天/气泡容器.vue'")
    expect(语音源).toContain('<QiPaoRongQi')
    const 语音气泡自身规则 = (语音源.match(/\.yuyin-qipao\s*\{[^}]*\}/g) ?? []).join('')
    expect(语音气泡自身规则, '语音气泡自身不得再自带气泡皮肤').not.toMatch(
      /background|color|border-radius|padding/,
    )
    expect(语音源).not.toContain('.qipao-neirong')
    expect((语音源.match(/--qipao-duiFang-beiJing/g) ?? []).length, '转写块气泡色只能一处').toBe(1)
    expect((语音源.match(/--qipao-duiFang-wenBen/g) ?? []).length).toBe(1)
    expect((语音源.match(/--qipao-ziJi-beiJing/g) ?? []).length).toBe(1)
    expect((语音源.match(/--qipao-ziJi-wenBen/g) ?? []).length).toBe(1)
  })

  it('容器承接内边距/圆角/尾巴/字号，全部吃令牌', () => {
    expect(容器源).toContain('padding: var(--jiange-9) var(--jiange-13)')
    expect(容器源).toContain('border-radius: var(--qipao-yuanjiao)')
    expect(容器源).toContain('--qipao-nei-rong-bei-jing: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing))')
    expect(容器源).toContain('background: var(--qipao-nei-rong-bei-jing)')
    expect(容器源).toContain('import QiPaoWeiBa')
    expect(容器源).toContain('<QiPaoWeiBa')
    expect(容器源).toContain('font-size: var(--qipao-zihao)')
    expect(容器源).toContain('line-height: var(--qipao-hangao)')
    expect(令牌源).toContain('--qipao-yuanjiao: var(--qipao-yuanjiao-ju-li);')
    expect(令牌源).toContain('--qipao-yuanjiao-ju-li: 6px;')
    expect(令牌源).toContain('--qipao-weiba-shang: var(--qipao-weiba-ju-li);')
    expect(令牌源).toContain('--qipao-weiba-ju-li: 13px;')
    expect(令牌源).toContain('--qipao-hangao: 1.45;')
  })
})

describe('气泡文字内衬上少下多', () => {
  const 令牌像素 = (ming: string): number => {
    const 命中 = new RegExp(`--${ming}\\s*:\\s*([\\d.]+)px`).exec(令牌源)
    expect(命中, `令牌 --${ming} 未定义`).not.toBeNull()
    return Number((命中 as RegExpMatchArray)[1])
  }

  it('桌面文字气泡上内衬小于下内衬且总和 18px，390 档回到 9/9 不改变总高', () => {
    const 上 = 令牌像素('qipao-nei-ju-shang')
    const 下 = 令牌像素('qipao-nei-ju-xia')
    expect(上, '文字气泡上内衬必须小于下内衬').toBeLessThan(下)
    expect(上 + 下, '文字气泡上下内衬总和必须保持 18px').toBe(18)
    expect(容器源).toContain(
      'padding-block: var(--qipao-nei-ju-shang) var(--qipao-nei-ju-xia)',
    )
    const 窄屏块 = 容器源.match(/@media \(max-width: 480px\) \{[\s\S]*?\n\}/)?.[0] ?? ''
    expect(窄屏块).toContain('.qipao-neirong--wen-zi-nei-ju')
    expect(窄屏块).toContain('padding-block: var(--jiange-9)')
    expect(令牌像素('jiange-9')).toBe(9)
  })

  it('语音气泡退出文字内衬偏差并下移内容校正，图片与文件气泡不套用该偏差', () => {
    expect(容器源).toContain("'qipao-neirong--wen-zi-nei-ju': wenZiNeiJu")
    expect(语音源).toContain(':wen-zi-nei-ju="false"')
    expect(语音源).toContain('top: var(--yuyin-neirong-xia-yi)')
    expect(令牌像素('yuyin-neirong-xia-yi')).toBe(3)
    const 图片源 = du('components/聊天/图片气泡.vue')
    const 文件源 = du('components/聊天/文件气泡.vue')
    expect(图片源).toContain('padding: 0')
    expect(图片源).not.toContain('qipao-nei-ju')
    expect(文件源).toContain('padding: var(--jiange-12)')
    expect(文件源).not.toContain('qipao-nei-ju')
  })
})

describe('三段圆弧按音量只改显隐，形状与未播放完全一致', () => {
  it('喇叭重画为点 + 两弧三段，clip-path 阶梯假动画与非等比缩放都已删', () => {
    expect((语音源.match(/class="laba-duan laba-duan--/g) ?? []).length).toBe(3)
    expect(语音源).not.toContain('@keyframes')
    expect(语音源).not.toContain('clip-path')
    expect(语音源).not.toContain('jiSuanYuYinDuanYangShi')
    expect(语音源).not.toContain('--laba-duan-')
    expect(语音源).not.toContain('scale(')
    expect(语音源).not.toContain('scaleY(')
    expect(语音源).toContain('stroke="currentColor"')
  })

  it('三段弧的样式只剩透明度过渡，不允许高度/透明度收缩', () => {
    const duanGuiZe = 语音源.match(/\.laba-duan \{[^}]*\}/)?.[0] ?? ''
    expect(duanGuiZe).toContain(
      'transition: opacity var(--yuyin-duan-yin-cang-shi-chang) var(--quxian-biao-zhun)',
    )
    expect(duanGuiZe).not.toContain('transform')
    expect(duanGuiZe).not.toContain('opacity:')
    expect(令牌源).toContain('--yuyin-duan-yin-cang-shi-chang: 100ms;')
  })

  it('多余段直接隐藏：1 段藏后两段，2 段只藏第三段', () => {
    expect(语音源).toContain('.laba-zu--1-duan .laba-duan--2,')
    expect(语音源).toContain('.laba-zu--1-duan .laba-duan--3,')
    expect(语音源).toContain('.laba-zu--2-duan .laba-duan--3')
    expect(语音源).toContain('opacity: 0')
    expect(语音源).not.toContain('.laba-zu--3-duan')
  })

  it('气泡只由 rAF 更新一个 class，段数不变不触发渲染', () => {
    expect(语音源).toContain('jiSuanYuYinKeJianDuanShu')
    expect(语音源).toContain('duQuYuYinYinLiang()')
    expect(语音源).toContain('requestAnimationFrame')
    expect(语音源).toContain(':class="keJianDuanShuLei"')
    expect(语音源).toContain('laba-zu--${keJianDuanShu.value}-duan')
    expect(语音源).toContain(
      'if (keJianDuanShu.value !== xinDuanShu) keJianDuanShu.value = xinDuanShu',
    )
    expect(语音源).toContain('(prefers-reduced-motion: reduce)')
  })

  it('音量低中高映射 1/2/3 段，非法值按无法分析处理显示三段', () => {
    expect(jiSuanYuYinKeJianDuanShu(0)).toBe(1)
    expect(jiSuanYuYinKeJianDuanShu(0.2, 1)).toBe(1)
    expect(jiSuanYuYinKeJianDuanShu(0.4, 1)).toBe(2)
    expect(jiSuanYuYinKeJianDuanShu(0.7, 2)).toBe(3)
    expect(jiSuanYuYinKeJianDuanShu(0.7, 3)).toBe(3)
    expect(jiSuanYuYinKeJianDuanShu(-1)).toBe(1)
    expect(jiSuanYuYinKeJianDuanShu(2)).toBe(3)
    expect(jiSuanYuYinKeJianDuanShu(Number.NaN)).toBe(3)
    expect(jiSuanYuYinKeJianDuanShu(Number.POSITIVE_INFINITY)).toBe(3)
  })

  it('升降门限分离形成迟滞，边界音量不会来回闪段', () => {
    const { shengRuZhongYin, shengRuGaoYin, jiangHuiDiYin, jiangHuiZhongYin } =
      YU_YIN_KE_JIAN_DUAN_SHU_PEI_ZHI
    expect(shengRuZhongYin).toBeGreaterThan(jiangHuiDiYin)
    expect(shengRuGaoYin).toBeGreaterThan(jiangHuiZhongYin)
    expect(jiSuanYuYinKeJianDuanShu(shengRuZhongYin - 0.01, 1)).toBe(1)
    expect(jiSuanYuYinKeJianDuanShu(shengRuZhongYin, 1)).toBe(2)
    expect(jiSuanYuYinKeJianDuanShu(jiangHuiDiYin, 2)).toBe(2)
    expect(jiSuanYuYinKeJianDuanShu(jiangHuiDiYin - 0.01, 2)).toBe(1)
    expect(jiSuanYuYinKeJianDuanShu(shengRuGaoYin - 0.01, 2)).toBe(2)
    expect(jiSuanYuYinKeJianDuanShu(shengRuGaoYin, 2)).toBe(3)
    expect(jiSuanYuYinKeJianDuanShu(jiangHuiZhongYin, 3)).toBe(3)
    expect(jiSuanYuYinKeJianDuanShu(jiangHuiZhongYin - 0.01, 3)).toBe(2)
  })

  it('同一音量落在迟滞带内时保持上一档', () => {
    expect(jiSuanYuYinKeJianDuanShu(0.3, 1)).toBe(1)
    expect(jiSuanYuYinKeJianDuanShu(0.3, 2)).toBe(2)
    expect(jiSuanYuYinKeJianDuanShu(0.6, 2)).toBe(2)
    expect(jiSuanYuYinKeJianDuanShu(0.6, 3)).toBe(3)
  })

  it('未播放/暂停/停止时恢复三段满显示', () => {
    const wrapper = mount(语音气泡, {
      props: {
        xiaoXi: { mei_ti_shi_chang_hao_miao: 10000 },
        boFangZhong: false,
        xuanZhong: true,
        jinDuMiao: 0,
        zongMiao: 10,
      },
    })
    const suYuan = wrapper.find('.laba-zu')
    expect(suYuan.classes()).toContain('laba-zu--3-duan')
    expect(wrapper.findAll('.laba-duan')).toHaveLength(3)
    expect((suYuan.element as HTMLElement).style.getPropertyValue('--laba-duan-1-gao')).toBe('')
    wrapper.unmount()
  })
})

function zaoJiaYinPin(diZhi = `${window.location.origin}/api/媒体/yu-yin`): {
  yinPin: HTMLAudioElement
  chuFaPlay: () => void
} {
  const jianTing = new Map<string, () => void>()
  const jia = {
    src: diZhi,
    currentSrc: '',
    paused: false,
    addEventListener: (leiXing: string, huiDiao: () => void): void => {
      jianTing.set(leiXing, huiDiao)
    },
  }
  return {
    yinPin: jia as unknown as HTMLAudioElement,
    chuFaPlay: () => jianTing.get('play')?.(),
  }
}

function zhuangAudioContext(boXing: 'youSheng' | 'jingYin'): () => void {
  class JiaFenXiQi {
    fftSize = 512
    smoothingTimeConstant = 0.5
    connect(): void {}
    getByteTimeDomainData = (huan: Uint8Array): void => {
      for (let suoYin = 0; suoYin < huan.length; suoYin += 1) {
        huan[suoYin] = boXing === 'jingYin' ? 128 : 128 + Math.round(60 * Math.sin(suoYin / 5))
      }
    }
  }
  class JiaShangXiaWen {
    state = 'running'
    destination = { connect: (): void => undefined }
    createMediaElementSource = (): { connect: () => void } => ({ connect: () => undefined })
    createAnalyser = (): JiaFenXiQi => new JiaFenXiQi()
    resume = (): Promise<void> => Promise.resolve()
  }
  const yuan = window.AudioContext
  Object.defineProperty(window, 'AudioContext', {
    value: JiaShangXiaWen as unknown as typeof AudioContext,
    configurable: true,
    writable: true,
  })
  return () => {
    Object.defineProperty(window, 'AudioContext', {
      value: yuan,
      configurable: true,
      writable: true,
    })
  }
}

describe('音量采集：真实 RMS，不造假动画', () => {
  it('播放中把 RMS 映射到 0..1，暂停或释放立即归位到 1', async () => {
    vi.resetModules()
    const haiYuan = zhuangAudioContext('youSheng')
    const { guanLianYuYinYinPin, jieChuYuYinYinPin, duQuYuYinYinLiang, shiYuYinYinLiangKeYong } =
      await import('@/composables/use语音音量')
    const { yinPin, chuFaPlay } = zaoJiaYinPin()
    guanLianYuYinYinPin(yinPin)
    expect(shiYuYinYinLiangKeYong()).toBe(false)
    chuFaPlay()
    await Promise.resolve()
    await Promise.resolve()
    expect(shiYuYinYinLiangKeYong()).toBe(true)
    const youSheng = duQuYuYinYinLiang()
    expect(youSheng).toBeGreaterThan(0.05)
    expect(youSheng).toBeLessThanOrEqual(1)
    yinPin.paused = true
    expect(duQuYuYinYinLiang()).toBe(1)
    jieChuYuYinYinPin(yinPin)
    expect(shiYuYinYinLiangKeYong()).toBe(false)
    expect(duQuYuYinYinLiang()).toBe(1)
    haiYuan()
  })

  it('静音段如实落到 0，而不是持续假装有波形', async () => {
    vi.resetModules()
    const haiYuan = zhuangAudioContext('jingYin')
    const { guanLianYuYinYinPin, duQuYuYinYinLiang } = await import('@/composables/use语音音量')
    const { yinPin, chuFaPlay } = zaoJiaYinPin()
    guanLianYuYinYinPin(yinPin)
    chuFaPlay()
    await Promise.resolve()
    await Promise.resolve()
    expect(duQuYuYinYinLiang()).toBe(0)
    haiYuan()
  })

  it('跨域音频或没有 AudioContext 时不接管播放通路，图标保持全亮', async () => {
    vi.resetModules()
    const { guanLianYuYinYinPin, duQuYuYinYinLiang, shiYuYinYinLiangKeYong } =
      await import('@/composables/use语音音量')
    const kuaYu = zaoJiaYinPin('https://other.example.com/yu-yin.mp3')
    guanLianYuYinYinPin(kuaYu.yinPin)
    kuaYu.chuFaPlay()
    await Promise.resolve()
    expect(shiYuYinYinLiangKeYong()).toBe(false)
    expect(duQuYuYinYinLiang()).toBe(1)

    const tongYuan = zaoJiaYinPin()
    guanLianYuYinYinPin(tongYuan.yinPin)
    tongYuan.chuFaPlay()
    await Promise.resolve()
    expect(shiYuYinYinLiangKeYong()).toBe(false)
    expect(duQuYuYinYinLiang()).toBe(1)
  })
})

describe('喇叭三段同色，播放蓝点只属于进度滑块', () => {
  it('喇叭圆点与两段波浪全部 currentColor，没有任何播放变色规则', () => {
    const 圆点规则 = 语音源.match(/\.laba-duan--1\s*\{[^}]*\}/)?.[0] ?? ''
    expect(圆点规则).toContain('fill: currentColor')
    expect(圆点规则).not.toContain('--yuyin-yuandian')
    expect(语音源).not.toContain('--yuyin-yuandian-hui')
    expect(语音源).not.toContain('--yuyin-yuandian-lan')
    expect(语音源).not.toMatch(/\.yuyin-qipao\.bofangzhong\s+\.laba-duan--1/)
    expect(语音源).toContain('fill="currentColor"')
    expect(语音源).toContain('stroke="currentColor"')
  })

  it('播放器圆点默认灰、播放蓝，WebKit 与 Firefox 同源', () => {
    const qiu = (xuanZeQi: string): string => {
      const zhuanYi = xuanZeQi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return 语音源.match(new RegExp(`${zhuanYi}\\s*\\{[^}]*\\}`))?.[0] ?? ''
    }
    const webkit = qiu('.yuyin-jindu-tiao::-webkit-slider-thumb')
    const firefox = qiu('.yuyin-jindu-tiao::-moz-range-thumb')
    expect(webkit).toContain('background: var(--yuyin-jindu-yuandian-jingtai)')
    expect(firefox).toContain('background: var(--yuyin-jindu-yuandian-jingtai)')
    expect(qiu('.yuyin-jindu-tiao--bofang::-webkit-slider-thumb')).toContain(
      'background: var(--yuyin-jindu-yuandian-bofang)',
    )
    expect(qiu('.yuyin-jindu-tiao--bofang::-moz-range-thumb')).toContain(
      'background: var(--yuyin-jindu-yuandian-bofang)',
    )
    expect(语音源).toContain(':class="{ \'yuyin-jindu-tiao--bofang\': boFangZhong }"')
  })
})

describe('语音进度圆点跨浏览器几何', () => {
  it('WebKit 与 Firefox 共用 36px 轨道盒和居中细线，thumb 中心严格落在轨道中心', () => {
    const 取规则 = (选择器: string): string => {
      const 转义 = 选择器.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return 语音源.match(new RegExp(`${转义}\\s*\\{[^}]*\\}`))?.[0] ?? ''
    }
    const 输入规则 = 取规则('.yuyin-jindu-tiao')
    const webkit轨道 = 取规则('.yuyin-jindu-tiao::-webkit-slider-runnable-track')
    const firefox轨道 = 取规则('.yuyin-jindu-tiao::-moz-range-track')
    const webkit圆点 = 取规则('.yuyin-jindu-tiao::-webkit-slider-thumb')
    expect(输入规则).toContain('height: var(--yuyin-kongzhi-re-ku)')
    expect(输入规则).toContain('padding: 0')
    expect(输入规则).toContain('border: 0')
    for (const 轨道 of [webkit轨道, firefox轨道]) {
      expect(轨道).toContain('height: var(--yuyin-kongzhi-re-ku)')
      expect(轨道).toContain(
        'background: linear-gradient(currentColor, currentColor) center / 100% var(--yuyin-jindu-gao) no-repeat',
      )
    }
    expect(webkit圆点).toContain(
      'margin-top: calc((var(--yuyin-kongzhi-re-ku) - var(--yuyin-huakuai-chicun)) / 2)',
    )
    expect(webkit圆点).toContain('-webkit-appearance: none')
    expect(firefox轨道).not.toContain('align-self')
  })

  it.each([false, true])('本人态为 %s 时共用同一滑块且拖动事件保持不变', async shiBenRen => {
    const wrapper = mount(语音气泡, {
      props: {
        xiaoXi: { mei_ti_shi_chang_hao_miao: 10000 },
        boFangZhong: false,
        xuanZhong: true,
        jinDuMiao: 2,
        zongMiao: 10,
        shiBenRen,
      },
    })
    const 滑块 = wrapper.get<HTMLInputElement>('input[type="range"]')
    expect(滑块.element.value).toBe('2')
    expect(wrapper.get('.yuyin-jindu-qu').classes().includes('yuyin-jindu-qu--benren')).toBe(shiBenRen)
    await 滑块.setValue('4')
    expect(wrapper.emitted('tiaoZhuan')).toEqual([[4]])
    wrapper.unmount()
  })
})

describe('暂停/停止收进紧凑按钮组', () => {
  it('视觉 28px、图标 13px、组内 3px、组与进度条 8px，36px 热区由 ::before 外扩', () => {
    expect(令牌源).toContain('--yuyin-kongzhi-chicun: 28px;')
    expect(令牌源).toContain('--yuyin-kongzhi-re-ku: 36px;')
    expect(令牌源).toContain('--yuyin-kongzhi-tubiao: 13px;')
    expect(令牌源).toContain('--yuyin-kongzhi-jian-ju: 3px;')
    expect(令牌源).toContain('--jiange-xiao: 8px;')
    expect(语音源).toContain('width: var(--yuyin-kongzhi-chicun)')
    expect(语音源).toContain('height: var(--yuyin-kongzhi-chicun)')
    expect(语音源).toContain(
      'inset: calc((var(--yuyin-kongzhi-chicun) - var(--yuyin-kongzhi-re-ku)) / 2)',
    )
    expect(语音源).toContain('width: var(--yuyin-kongzhi-tubiao)')
    expect(语音源).toContain('height: var(--yuyin-kongzhi-tubiao)')
    expect(语音源).toContain('padding-inline: var(--jiange-13)')
    expect(语音源).toContain('margin-top: var(--jiange-xiao)')
    expect(令牌源).not.toContain('--yuyin-re-ku:')
  })

  it('两个按钮包进同一组内，组内间距 3px 且整组与进度条间距 8px', () => {
    expect(语音源).toContain('class="yuyin-kongzhi-zu"')
    expect(语音源).toContain('.yuyin-kongzhi-zu {')
    expect(语音源).toContain('gap: var(--yuyin-kongzhi-jian-ju)')
    expect(语音源).toContain('gap: var(--jiange-xiao)')
    expect(语音源).not.toContain('gap: var(--jiange-12)')
  })

  it('时长不再被固定宽度裁切：气泡按内容撑开且标签不收缩', () => {
    expect(语音源).toContain('min-width: max-content')
    expect(语音源).toContain('flex: 0 0 auto')
    expect(语音源).not.toContain('overflow: hidden')
  })

  it('本人态整行反转，暂停/停止贴齐气泡右侧内衬而不是飘在滑块另一头', () => {
    expect(语音源).toContain('class="yuyin-jindu-qu"')
    expect(语音源).toContain("'yuyin-jindu-qu--benren': shiBenRen")
    expect(语音源).toContain('.yuyin-jindu-qu--benren')
    expect(语音源).toContain('flex-direction: row-reverse')
  })
})
