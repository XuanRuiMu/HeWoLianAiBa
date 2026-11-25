import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import type { 消息 } from '@/types/类型定义'
import type { YuYinShiBieQi } from '@/composables/use语音转文字'
import { YuYinYinLiangPeiZhi } from '@/composables/use语音音量'

const YuanShiAudio = globalThis.Audio
const YuanShiAudioContext = window.AudioContext

class JiaBoFangYinPin {
  static shiLiMen: JiaBoFangYinPin[] = []
  src = ''
  volume = 1
  muted = false
  paused = false
  duration = NaN
  currentTime = 0
  private jianTing = new Map<string, Set<() => void>>()
  constructor(diZhi?: string) {
    if (diZhi) this.src = diZhi
    JiaBoFangYinPin.shiLiMen.push(this)
  }
  addEventListener(leiXing: string, huiDiao: () => void): void {
    if (!this.jianTing.has(leiXing)) this.jianTing.set(leiXing, new Set())
    this.jianTing.get(leiXing)?.add(huiDiao)
  }
  removeEventListener(): void {}
  fa(leiXing: string): void {
    for (const huiDiao of [...(this.jianTing.get(leiXing) ?? [])]) huiDiao()
  }
  play(): Promise<void> {
    this.paused = false
    this.fa('play')
    return Promise.resolve()
  }
  pause(): void {
    this.paused = true
  }
  load(): void {}
  removeAttribute(): void {}
}

class JiaShiBieYinPin {
  static zuiHouShiLi: JiaShiBieYinPin | null = null
  src = ''
  volume = 1
  muted = false
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(diZhi?: string) {
    if (diZhi) this.src = diZhi
    JiaShiBieYinPin.zuiHouShiLi = this
  }
  play(): Promise<void> {
    return Promise.resolve()
  }
  pause(): void {}
}

function zhuangWebAudio(huanChong: 'youSheng' | 'jingYin'): {
  haiYuan: () => void
  lianJieJiLu: string[]
  zengYiZhi: { value: number }
} {
  const lianJieJiLu: string[] = []
  const zengYiZhi = { value: 1 }
  type ShangYou = { ming: string; gain?: { value: number } }
  type MuBiaoJieDian = ShangYou & { shangYou: ShangYou[] }
  function lianJieDao(ben: ShangYou, ming: string, muBiao: MuBiaoJieDian): void {
    lianJieJiLu.push(`${ming}->${muBiao.ming}`)
    muBiao.shangYou.push(ben)
  }
  class JiaFenXiQi {
    ming = 'fenXiQi'
    fftSize = YuYinYinLiangPeiZhi.fftChiCun
    smoothingTimeConstant = YuYinYinLiangPeiZhi.pingHuaXiShu
    shangYou: ShangYou[] = []
    connect(muBiao: MuBiaoJieDian): void {
      lianJieDao(this, this.ming, muBiao)
    }
    private shuChuQiangDu(): number {
      if (huanChong === 'jingYin') return 0
      let beiShu = 1
      for (const shang of this.shangYou) {
        if (shang.ming === 'zengYi' && shang.gain) beiShu *= shang.gain.value
      }
      return 0.3 * beiShu
    }
    getByteTimeDomainData(huan: Uint8Array): void {
      const fengZhi = this.shuChuQiangDu() * Math.SQRT2 * 128
      for (let suoYin = 0; suoYin < huan.length; suoYin += 1) {
        huan[suoYin] = 128 + Math.round(fengZhi * Math.sin(suoYin / 5))
      }
    }
    getFloatTimeDomainData(huan: Float32Array): void {
      const fengZhi = this.shuChuQiangDu() * Math.SQRT2
      for (let suoYin = 0; suoYin < huan.length; suoYin += 1) {
        huan[suoYin] = fengZhi * Math.sin(suoYin / 5)
      }
    }
  }
  class JiaZengYi {
    ming = 'zengYi'
    gain = zengYiZhi
    shangYou: ShangYou[] = []
    connect(muBiao: MuBiaoJieDian): void {
      lianJieDao(this, this.ming, muBiao)
    }
  }
  class JiaYuan {
    ming = 'yuan'
    shangYou: ShangYou[] = []
    connect(muBiao: MuBiaoJieDian): void {
      lianJieDao(this, this.ming, muBiao)
    }
  }
  class JiaShangXiaWen {
    state = 'running'
    destination = {
      ming: 'destination',
      shangYou: [] as ShangYou[],
      connect: (): void => undefined,
    }
    createMediaElementSource = (): JiaYuan => new JiaYuan()
    createGain = (): JiaZengYi => new JiaZengYi()
    createAnalyser = (): JiaFenXiQi => new JiaFenXiQi()
    resume = (): Promise<void> => Promise.resolve()
  }
  Object.defineProperty(window, 'AudioContext', {
    value: JiaShangXiaWen as unknown as typeof AudioContext,
    configurable: true,
    writable: true,
  })
  return {
    haiYuan: () => {
      Object.defineProperty(window, 'AudioContext', {
        value: YuanShiAudioContext,
        configurable: true,
        writable: true,
      })
    },
    lianJieJiLu,
    zengYiZhi,
  }
}

function zaoXiaoXi(id: string, faSongZhe: string = 'yonghu'): 消息 {
  return {
    id,
    lei_xing: 'yuYin',
    nei_rong: '',
    fa_song_zhe_lei_xing: faSongZhe,
  } as unknown as 消息
}

async function dengDaiWeiRenWu(): Promise<void> {
  await new Promise((jieJue) => setTimeout(jieJue, 0))
}

afterEach(() => {
  vi.stubGlobal('Audio', YuanShiAudio)
  Object.defineProperty(window, 'AudioContext', {
    value: YuanShiAudioContext,
    configurable: true,
    writable: true,
  })
  JiaBoFangYinPin.shiLiMen = []
  JiaShiBieYinPin.zuiHouShiLi = null
})

describe('语音播放音量链路', () => {
  it('未接 WebAudio 时按 element.volume 回落且播放中拖动即时生效', async () => {
    vi.resetModules()
    vi.stubGlobal('Audio', JiaBoFangYinPin as unknown as typeof Audio)
    const { use语音播放 } = await import('@/composables/use语音播放')
    const { sheZhiYuYinYinLiang } = await import('@/utils/语音音量存储')
    let shouDaoXiaoXi: 消息 | null = null
    const boFang = use语音播放({
      huoQuDiZhi: () => '/api/媒体/签名URL?hui-luo=1',
      huoQuYinLiang: (xiaoXi) => {
        shouDaoXiaoXi = xiaoXi
        return 0.5
      },
    })
    const xiaoXi = zaoXiaoXi('fp3-hui-luo')
    boFang.qieHuanYuYinBoFang(xiaoXi)
    expect(shouDaoXiaoXi).toBe(xiaoXi)
    const yinPin = JiaBoFangYinPin.shiLiMen.at(-1) as JiaBoFangYinPin
    expect(yinPin.volume).toBe(0.5)
    expect(yinPin.muted).toBe(false)
    sheZhiYuYinYinLiang({ id: 'fp3-hui-luo' }, 0.25)
    await nextTick()
    expect(yinPin.volume).toBe(0.25)
    sheZhiYuYinYinLiang({ id: 'fp3-hui-luo' }, 1)
    await nextTick()
    expect(yinPin.volume).toBe(1)
    sheZhiYuYinYinLiang({ id: 'fp3-hui-luo' }, 0)
    await nextTick()
    expect(yinPin.muted).toBe(true)
    boFang.tingZhiYinPinBoFang()
  })

  it('接入 WebAudio 后媒体链路为 源→分析器→增益→输出，增益可超过 1 且 element.volume 恒为 1', async () => {
    vi.resetModules()
    vi.stubGlobal('Audio', JiaBoFangYinPin as unknown as typeof Audio)
    const { lianJieJiLu, zengYiZhi, haiYuan } = zhuangWebAudio('youSheng')
    const { use语音播放 } = await import('@/composables/use语音播放')
    const { sheZhiYuYinYinLiang } = await import('@/utils/语音音量存储')
    const boFang = use语音播放({
      huoQuDiZhi: () => '/api/媒体/签名URL?zeng-yi=1',
      huoQuYinLiang: () => 1,
    })
    const xiaoXi = zaoXiaoXi('fp3-zeng-yi')
    boFang.qieHuanYuYinBoFang(xiaoXi)
    const yinPin = JiaBoFangYinPin.shiLiMen.at(-1) as JiaBoFangYinPin
    await dengDaiWeiRenWu()
    expect(lianJieJiLu).toEqual(['yuan->fenXiQi', 'fenXiQi->zengYi', 'zengYi->destination'])
    expect(yinPin.volume).toBe(1)
    expect(yinPin.muted).toBe(false)
    expect(zengYiZhi.value).toBe(1)
    sheZhiYuYinYinLiang({ id: 'fp3-zeng-yi' }, 1)
    await nextTick()
    expect(zengYiZhi.value).toBe(2)
    expect(yinPin.volume).toBe(1)
    sheZhiYuYinYinLiang({ id: 'fp3-zeng-yi' }, 0)
    await nextTick()
    expect(zengYiZhi.value).toBe(0)
    expect(yinPin.muted).toBe(true)
    sheZhiYuYinYinLiang({ id: 'fp3-zeng-yi' }, 0.75)
    await nextTick()
    expect(zengYiZhi.value).toBe(1.5)
    expect(yinPin.muted).toBe(false)
    boFang.tingZhiYinPinBoFang()
    haiYuan()
  })

  it('声波弧测量增益之前的信号：本条音量拉低时档位不会整体塌陷', async () => {
    vi.resetModules()
    vi.stubGlobal('Audio', JiaBoFangYinPin as unknown as typeof Audio)
    const { zengYiZhi, lianJieJiLu, haiYuan } = zhuangWebAudio('youSheng')
    const { use语音播放 } = await import('@/composables/use语音播放')
    const yinLiang = await import('@/composables/use语音音量')
    let haoMiao = 0
    const shiZhong = vi.spyOn(performance, 'now').mockImplementation(() => haoMiao)
    const boFang = use语音播放({
      huoQuDiZhi: () => '/api/媒体/签名URL?zeng-yi-qian=1',
      huoQuYinLiang: () => 1,
    })
    boFang.qieHuanYuYinBoFang(zaoXiaoXi('fp02-zeng-yi-qian'))
    await dengDaiWeiRenWu()
    expect(lianJieJiLu).toEqual(['yuan->fenXiQi', 'fenXiQi->zengYi', 'zengYi->destination'])
    expect(yinLiang.shiYuYinYinLiangKeYong()).toBe(true)
    const ceLiang = (): number[] => {
      const ce: number[] = []
      for (let zhen = 0; zhen < 20; zhen += 1) {
        haoMiao += 1000 / 60
        ce.push(yinLiang.duQuYuYinYinLiang())
      }
      return ce
    }
    const menKan = yinLiang.YuYinKeJianDuanShuPeiZhi.shengRuGaoYin
    const zaiShengYiQian = ceLiang()
    yinLiang.sheZhiYuYinZengYi(0.05)
    expect(zengYiZhi.value).toBe(0.05)
    const zaiShengYiHou = ceLiang()
    expect(Math.min(...zaiShengYiQian), '正常音量下稳定语音应维持高档').toBeGreaterThanOrEqual(menKan)
    expect(Math.min(...zaiShengYiHou), '音量滑到 5% 不得改变声波弧档位').toBeGreaterThanOrEqual(menKan)
    boFang.tingZhiYinPinBoFang()
    shiZhong.mockRestore()
    haiYuan()
  })

  it('通道音量按消息发送者分流：自己走 yongHuYuYin，对方走 duiXiangYuYin', async () => {
    vi.resetModules()
    vi.stubGlobal('Audio', JiaBoFangYinPin as unknown as typeof Audio)
    const { lianJieJiLu, zengYiZhi, haiYuan } = zhuangWebAudio('youSheng')
    const { use语音播放 } = await import('@/composables/use语音播放')
    const { xuanZeYuYinTongDao } = await import('@/config/消息配置')
    const boFang = use语音播放({
      huoQuDiZhi: () => '/api/媒体/签名URL?tong-dao=1',
      huoQuYinLiang: (xiaoXi) => {
        const shengYinTongDao = xuanZeYuYinTongDao(xiaoXi.fa_song_zhe_lei_xing)
        return shengYinTongDao === 'yongHuYuYin' ? 0.5 : 0.25
      },
    })
    boFang.qieHuanYuYinBoFang(zaoXiaoXi('fp3-tong-dao-zi-ji', 'yonghu'))
    const ziJiYinPin = JiaBoFangYinPin.shiLiMen.at(-1) as JiaBoFangYinPin
    await dengDaiWeiRenWu()
    expect(ziJiYinPin.volume).toBe(1)
    expect(zengYiZhi.value).toBe(0.5)
    boFang.tingZhiYinPinBoFang()
    boFang.qieHuanYuYinBoFang(zaoXiaoXi('fp3-tong-dao-dui-fang', 'duifang'))
    const duiFangYinPin = JiaBoFangYinPin.shiLiMen.at(-1) as JiaBoFangYinPin
    await dengDaiWeiRenWu()
    expect(duiFangYinPin.volume).toBe(1)
    expect(zengYiZhi.value).toBe(0.25)
    expect(lianJieJiLu.filter((ji) => ji === 'yuan->fenXiQi')).toHaveLength(2)
    boFang.tingZhiYinPinBoFang()
    haiYuan()
  })
})

describe('语音转写试听音量', () => {
  it('转写试听同样乘本条系数', async () => {
    vi.resetModules()
    vi.stubGlobal('Audio', JiaShiBieYinPin as unknown as typeof Audio)
    const { use语音转文字 } = await import('@/composables/use语音转文字')
    const { sheZhiYuYinYinLiang } = await import('@/utils/语音音量存储')
    sheZhiYuYinYinLiang({ id: 'fp3-shi-bie' }, 0.25)
    const shiBieQi: YuYinShiBieQi = {
      lang: '',
      interimResults: false,
      maxAlternatives: 1,
      onresult: null,
      onerror: null,
      onend: null,
      start(): void {},
      stop(): void {
        shiBieQi.onend?.()
      },
    }
    const { zhuanWenZi } = use语音转文字({
      huoQuYuYinDiZhi: () => '/api/媒体/签名URL?shi-bie=1',
      shiBieQiGongChang: () => shiBieQi,
      huoQuYinLiang: () => 0.5,
    })
    const dengDai = zhuanWenZi(zaoXiaoXi('fp3-shi-bie'))
    await dengDaiWeiRenWu()
    const yinPin = JiaShiBieYinPin.zuiHouShiLi as JiaShiBieYinPin
    expect(yinPin.volume).toBe(0.25)
    expect(yinPin.muted).toBe(false)
    shiBieQi.stop()
    await dengDai
  })

  it('本条音量为 0 时转写试听静音', async () => {
    vi.resetModules()
    vi.stubGlobal('Audio', JiaShiBieYinPin as unknown as typeof Audio)
    const { use语音转文字 } = await import('@/composables/use语音转文字')
    const { sheZhiYuYinYinLiang } = await import('@/utils/语音音量存储')
    sheZhiYuYinYinLiang({ id: 'fp3-jing-yin' }, 0)
    const shiBieQi: YuYinShiBieQi = {
      lang: '',
      interimResults: false,
      maxAlternatives: 1,
      onresult: null,
      onerror: null,
      onend: null,
      start(): void {},
      stop(): void {
        shiBieQi.onend?.()
      },
    }
    const { zhuanWenZi } = use语音转文字({
      huoQuYuYinDiZhi: () => '/api/媒体/签名URL?jing-yin=1',
      shiBieQiGongChang: () => shiBieQi,
      huoQuYinLiang: () => 0.5,
    })
    const dengDai = zhuanWenZi(zaoXiaoXi('fp3-jing-yin'))
    await dengDaiWeiRenWu()
    const yinPin = JiaShiBieYinPin.zuiHouShiLi as JiaShiBieYinPin
    expect(yinPin.muted).toBe(true)
    shiBieQi.stop()
    await dengDai
  })
})
