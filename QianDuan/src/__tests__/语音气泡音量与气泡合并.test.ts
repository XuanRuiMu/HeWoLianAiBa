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
    expect(语音源).not.toContain('qipao-duiFang-beiJing')
    expect(语音源).not.toContain('.qipao-neirong')
  })

  it('容器承接内边距/圆角/三角尾/字号，全部吃令牌', () => {
    expect(容器源).toContain('padding: var(--jiange-9) var(--jiange-13)')
    expect(容器源).toContain('border-radius: var(--qipao-yuanjiao)')
    expect(容器源).toContain(
      'background: var(--qipao-duiFang-beiJing, var(--xiaoxi-jiaose-beijing))',
    )
    expect(容器源).toContain('border-left: var(--qipao-weiba-kuan) solid')
    expect(容器源).toContain('font-size: var(--qipao-zihao)')
    expect(容器源).toContain('line-height: var(--qipao-hangao)')
    expect(令牌源).toContain('--qipao-yuanjiao: 6px;')
    expect(令牌源).toContain('--qipao-weiba-shang: 13px;')
    expect(令牌源).toContain('--qipao-hangao: 1.45;')
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
