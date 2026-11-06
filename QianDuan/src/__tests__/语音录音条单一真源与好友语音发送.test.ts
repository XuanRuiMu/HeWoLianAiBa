import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import 语音录音条 from '@/components/聊天/语音录音条.vue'
import { huoQuFanYi } from '@/config/翻译表'
import { DUO_MEI_TI_PEI_ZHI, LU_YIN_PEI_ZHI } from '@/config/消息配置'

const 根 = resolve(__dirname, '..')
const 读 = (xiangDui: string): string => readFileSync(resolve(根, xiangDui), 'utf8')

const 聊天页源 = 读('views/聊天页面.vue')
const 好友页源 = 读('views/好友聊天.vue')
const 社交源 = 读('api/社交.ts')
const 聊天API源 = 读('api/聊天.ts')
const 聊天仓库源 = 读('stores/聊天.ts')

const luYinChuanShu = {
  luYinMoShi: true,
  luYinZhong: false,
  luYinShangHuaQuXiao: false,
  luYinBoXing: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  luYinMiao: 0,
}

function guaZaiLuYinTiao(chuanShu: Partial<typeof luYinChuanShu> = {}) {
  return mount(语音录音条, {
    props: { ...luYinChuanShu, ...chuanShu },
    global: { stubs: { teleport: true } },
  })
}

describe('语音录音条单一真源组件', () => {
  it('未进入语音模式时不渲染遮罩', () => {
    const 包 = guaZaiLuYinTiao({ luYinMoShi: false })
    expect(包.find('.luyin-zhezhao').exists()).toBe(false)
    包.unmount()
  })

  it('空闲态显示按住说话并派发开始与取消事件', async () => {
    const 包 = guaZaiLuYinTiao()
    const 安钮 = 包.find('.luyin-anzhu-an')
    expect(安钮.text()).toContain(huoQuFanYi('duoMeiTi', 'anZhuShuoHua'))
    expect(包.find('.luyin-guanbi-anniu').text()).toContain(huoQuFanYi('caidan', 'guanBi'))
    await 安钮.trigger('pointerdown')
    await 安钮.trigger('touchstart')
    await 包.find('.luyin-guanbi-anniu').trigger('click')
    expect(包.emitted('kaiShi')).toHaveLength(2)
    expect(包.emitted('guanBi')).toHaveLength(1)
    包.unmount()
  })

  it('录音中显示波形条计时与松开发送并派发手势事件', async () => {
    const 包 = guaZaiLuYinTiao({
      luYinZhong: true,
      luYinMiao: 7,
      luYinBoXing: Array.from({ length: LU_YIN_PEI_ZHI.dianPingTiaoShu }, (_, xuhao) => xuhao / 100),
    })
    expect(包.findAll('.luyin-dianping-tiao')).toHaveLength(LU_YIN_PEI_ZHI.dianPingTiaoShu)
    expect(包.find('.luyin-jishi').text()).toBe('7s')
    expect(包.find('.luyin-anzhu-an').text()).toContain(huoQuFanYi('duoMeiTi', 'songKaiFaSong'))
    expect(包.find('.luyin-guanbi-anniu').exists()).toBe(false)
    const 安钮 = 包.find('.luyin-anzhu-an')
    await 安钮.trigger('pointermove')
    await 安钮.trigger('pointerup')
    await 安钮.trigger('pointercancel')
    expect(包.emitted('yiDong')).toHaveLength(1)
    expect(包.emitted('songKai')).toHaveLength(1)
    expect(包.emitted('quXiao')).toHaveLength(1)
    包.unmount()
  })

  it('上滑取消态切换文案', () => {
    const 包 = guaZaiLuYinTiao({ luYinZhong: true, luYinShangHuaQuXiao: true })
    expect(包.find('.luyin-anzhu-an').classes()).toContain('yao-quxiao')
    expect(包.find('.luyin-anzhu-an').text()).toContain(huoQuFanYi('duoMeiTi', 'shangHuaQuXiao'))
    包.unmount()
  })

  it('波形条高度按强度百分比钳制', () => {
    const 包 = guaZaiLuYinTiao({
      luYinZhong: true,
      luYinBoXing: Array.from({ length: LU_YIN_PEI_ZHI.dianPingTiaoShu }, () => 0.5),
    })
    const 首条 = 包.find('.luyin-dianping-tiao')
    expect(首条.attributes('style')).toContain('height: 50%')
    包.unmount()
  })
})

describe('聊天页与好友页共用录音条', () => {
  it('聊天页只留组件引用，不再有内联录音遮罩', () => {
    expect(聊天页源).toContain("import YuYinLuYinTiao from '@/components/聊天/语音录音条.vue'")
    expect(聊天页源).toContain('<YuYinLuYinTiao')
    expect(聊天页源).not.toContain('luyin-zhezhao')
    expect(聊天页源).not.toContain('luyin-anzhu-an')
    expect(聊天页源).not.toContain('yinBoGaoDu')
  })

  it('好友页接入录音条并保持语音键盘表情加号互斥', () => {
    expect(好友页源).toContain("import YuYinLuYinTiao from '@/components/聊天/语音录音条.vue'")
    expect(好友页源).toContain("import { use录音 } from '@/composables/use录音'")
    expect(好友页源).toContain('<YuYinLuYinTiao')
    expect(好友页源).toContain('dianJiLuYinQiehuan')
    expect(好友页源).toContain("huoQuFanYi('liaoTian', 'yuYin')")
    const 表情切换 = 好友页源.slice(
      好友页源.indexOf('function qieHuanBiaoQingMianBan'),
      好友页源.indexOf('async function faSongBiaoQingBao'),
    )
    expect(表情切换).toContain('guanBiLuYinMoShi()')
    const 更多切换 = 好友页源.slice(
      好友页源.indexOf('function qieHuanGengDuoMianBan'),
      好友页源.indexOf('async function faSongBiaoQingBao'),
    )
    expect(更多切换).toContain('guanBiLuYinMoShi()')
    const 切换起点 = 好友页源.indexOf('function dianJiLuYinQiehuan')
    const 切换 = 好友页源.slice(切换起点, 好友页源.indexOf('\n}', 切换起点))
    expect(切换).toContain('biaoQingMianBanZhanKai.value = false')
    expect(切换).toContain('gengDuoMianBanZhanKai.value = false')
    expect(切换).toContain('qieHuanLuYinMoShi()')
    expect(好友页源).toContain('qingLiLuYinZiYuan()')
  })

  it('好友页语音发送走上传加乐观气泡执行器的唯一链路', () => {
    const 起点 = 好友页源.indexOf('async function faSongLuYinYuYin')
    const 发送 = 好友页源.slice(起点, 好友页源.indexOf('const {', 起点))
    expect(起点).toBeGreaterThan(-1)
    expect(发送).toContain("lei_xing: 'yuYin'")
    expect(发送).toContain('chuangJianLeGuanXiaoXi')
    expect(发送).toContain('zhiXingFaSong(leGuanXiaoXi')
    expect(发送).toContain("shangChuanHaoYouMeiTi(haoYouId, erJinZhiDuiXiang, 'yuyin'")
    expect(发送).toContain('shiChangHaoMiao: fuJia.shiChangHaoMiao')
    expect(发送).toContain('mei_ti_shi_chang_hao_miao: fuJia.shiChangHaoMiao')
    expect(发送).toContain("{ leiXing: 'yuYin', meiTiId: shangChuan.mediaId }")
  })

  it('语音时长随上传参数下发且好友与AI上传同源', () => {
    expect(社交源).toContain("Extract<ShangChuanLeiBie, 'tupian' | 'biaoqingshu' | 'yuyin' | 'wenjian'>")
    expect(社交源).toContain('zhuiJia?.shiChangHaoMiao != null')
    expect(聊天API源).toContain('zhuiJia?.shiChangHaoMiao != null')
    expect(聊天仓库源).toMatch(
      /\? \{ shiChangHaoMiao: shangXiaWen\.fuJia\.shiChangHaoMiao \}/,
    )
    expect(社交源).toContain('mei_ti_shi_chang_hao_miao?: number | null')
  })
})

describe('好友语音上传契约', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('shangChuanHaoYouMeiTi 以 yuyin 类别与时长参数请求好友媒体接口', async () => {
    const post = vi.fn().mockResolvedValue({ data: { shu_ju: { mediaId: 'mei-ti-1' } } })
    vi.doMock('@/api/请求', () => ({
      default: { post, get: vi.fn(), put: vi.fn(), delete: vi.fn() },
    }))
    const 社交 = await import('@/api/社交')
    const wenJian = new Blob(['abc'], { type: 'audio/webm' })
    const jieGuo = await 社交.shangChuanHaoYouMeiTi('hao-you-1', wenJian, 'yuyin', {
      shiChangHaoMiao: 5000,
    })
    expect(jieGuo.mediaId).toBe('mei-ti-1')
    expect(post).toHaveBeenCalledTimes(1)
    const [diZhi, biaoDan, canShu] = post.mock.calls[0] as [string, FormData, Record<string, unknown>]
    expect(diZhi).toBe('/好友/媒体')
    expect(biaoDan).toBeInstanceOf(FormData)
    expect(canShu.params).toMatchObject({ jieShouZheId: 'hao-you-1', leiBie: 'yuyin', shiChangHaoMiao: 5000 })
  })

  it('未提供时长时不携带时长参数', async () => {
    const post = vi.fn().mockResolvedValue({ data: { shu_ju: { mediaId: 'mei-ti-2' } } })
    vi.doMock('@/api/请求', () => ({
      default: { post, get: vi.fn(), put: vi.fn(), delete: vi.fn() },
    }))
    const 社交 = await import('@/api/社交')
    const wenJian = new Blob(['abc'], { type: 'image/png' })
    await 社交.shangChuanHaoYouMeiTi('hao-you-1', wenJian, 'tupian')
    const canShu = post.mock.calls[0][2] as Record<string, unknown>
    expect(canShu.params).toMatchObject({ jieShouZheId: 'hao-you-1', leiBie: 'tupian' })
    expect('shiChangHaoMiao' in (canShu.params as Record<string, unknown>)).toBe(false)
  })
})

function zaoJiaMediaRecorder() {
  class Jia {
    static isTypeSupported = vi.fn().mockReturnValue(true)
    state = 'inactive'
    mimeType = 'audio/webm;codecs=opus'
    ondataavailable: ((e: { data: Blob }) => void) | null = null
    onerror: ((e: Event) => void) | null = null
    private _listeners = new Map<string, Set<() => void>>()
    addEventListener(type: string, fn: () => void) {
      if (!this._listeners.has(type)) this._listeners.set(type, new Set())
      this._listeners.get(type)!.add(fn)
    }
    start() {
      this.state = 'recording'
      const chunk = new Blob(['x'], { type: 'audio/webm' })
      queueMicrotask(() => this.ondataavailable?.({ data: chunk }))
    }
    stop() {
      this.state = 'inactive'
      queueMicrotask(() => {
        for (const fn of [...(this._listeners.get('stop') ?? [])]) fn()
      })
    }
  }
  return Jia
}

async function moNiWanChengLuYin(ceLiangJieGuo: number | null) {
  const ceLiangMock = vi.fn().mockResolvedValue(ceLiangJieGuo)
  vi.doMock('@/composables/use语音播放', () => ({ ceLiangYinPinShiChang: ceLiangMock }))

  const Jia = zaoJiaMediaRecorder()
  vi.stubGlobal('MediaRecorder', Jia)

  const jiaGuiDao = { stop: vi.fn() }
  const jiaLiuPian = { getTracks: () => [jiaGuiDao] }
  const yuanDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue(jiaLiuPian) },
    configurable: true,
  })

  const faSongYuYinMock = vi.fn().mockResolvedValue(undefined)
  try {
    const { use录音 } = await import('@/composables/use录音')
    const { kaiShiLuYin, wanChengLuYin } = use录音({
      sheZhiCuoWu: vi.fn(),
      faSongYuYin: faSongYuYinMock,
      gunDongDaoDiBu: vi.fn(),
    })
    await kaiShiLuYin()
    vi.advanceTimersByTime(4200)
    await wanChengLuYin(true)
  } finally {
    if (yuanDescriptor) Object.defineProperty(navigator, 'mediaDevices', yuanDescriptor)
    else delete (navigator as unknown as Record<string, unknown>).mediaDevices
  }

  return { faSongYuYinMock, ceLiangMock }
}

describe('FP-01 录音上报实测音频时长', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('上报 shiChangHaoMiao 等于 blob 实测时长而非墙钟耗时', async () => {
    const { faSongYuYinMock, ceLiangMock } = await moNiWanChengLuYin(4000)
    expect(ceLiangMock).toHaveBeenCalledWith(
      expect.stringContaining('blob:'),
      DUO_MEI_TI_PEI_ZHI.yuYinFaSongCeLiangChaoShiHaoMiao,
    )
    expect(faSongYuYinMock).toHaveBeenCalledTimes(1)
    const [, fuJia] = faSongYuYinMock.mock.calls[0] as [Blob, { shiChangHaoMiao: number }]
    expect(fuJia.shiChangHaoMiao).toBe(4000)
  })

  it('实测失败时回退墙钟耗时并写日志且仍上报正整数', async () => {
    const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { faSongYuYinMock } = await moNiWanChengLuYin(null)
    expect(faSongYuYinMock).toHaveBeenCalledTimes(1)
    const [, fuJia] = faSongYuYinMock.mock.calls[0] as [Blob, { shiChangHaoMiao: number }]
    expect(fuJia.shiChangHaoMiao).toBe(4200)
    expect(warnMock).toHaveBeenCalledTimes(1)
    expect(warnMock).toHaveBeenCalledWith(
      expect.stringContaining('[录音]'),
      expect.any(Number),
    )
    warnMock.mockRestore()
  })

  it('发送前那一跳的超时是独立短值且远小于挂载自愈超时', () => {
    expect(DUO_MEI_TI_PEI_ZHI.yuYinFaSongCeLiangChaoShiHaoMiao).toBeLessThan(
      DUO_MEI_TI_PEI_ZHI.yuYinShiChangCeLiangChaoShiHaoMiao,
    )
    expect(DUO_MEI_TI_PEI_ZHI.yuYinFaSongCeLiangChaoShiHaoMiao).toBeGreaterThan(0)
    expect(读('composables/use录音.ts')).toContain('yuYinFaSongCeLiangChaoShiHaoMiao')
  })

  it('实测迟迟不回时发送路径只等短超时就回退墙钟', async () => {
    vi.useRealTimers()

    class JiaWuHuiYinPin {
      preload = ''
      src = ''
      duration = Number.NaN
      currentTime = 0
      addEventListener(): void {}
      removeEventListener(): void {}
      pause(): void {}
      load(): void {}
      removeAttribute(): void {}
    }
    vi.stubGlobal('Audio', JiaWuHuiYinPin as unknown as typeof Audio)
    vi.stubGlobal('MediaRecorder', zaoJiaMediaRecorder())
    const jiaGuiDao = { stop: vi.fn() }
    const jiaLiuPian = { getTracks: () => [jiaGuiDao] }
    const yuanDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(jiaLiuPian) },
      configurable: true,
    })
    const warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const faSongYuYinMock = vi.fn().mockResolvedValue(undefined)
    try {
      const { use录音 } = await import('@/composables/use录音')
      const { kaiShiLuYin, wanChengLuYin } = use录音({
        sheZhiCuoWu: vi.fn(),
        faSongYuYin: faSongYuYinMock,
        gunDongDaoDiBu: vi.fn(),
      })
      await kaiShiLuYin()
      await new Promise((deng) => {
        setTimeout(deng, DUO_MEI_TI_PEI_ZHI.yuYinZuiDuanMiao * 1000 + 200)
      })
      const kaiShi = Date.now()
      await wanChengLuYin(true)
      const dengDaiHaoMiao = Date.now() - kaiShi
      expect(faSongYuYinMock).toHaveBeenCalledTimes(1)
      const [, fuJia] = faSongYuYinMock.mock.calls[0] as [Blob, { shiChangHaoMiao: number }]
      expect(fuJia.shiChangHaoMiao).toBeGreaterThan(0)
      expect(warnMock).toHaveBeenCalledTimes(1)
      expect(dengDaiHaoMiao).toBeLessThan(
        DUO_MEI_TI_PEI_ZHI.yuYinShiChangCeLiangChaoShiHaoMiao -
          DUO_MEI_TI_PEI_ZHI.yuYinFaSongCeLiangChaoShiHaoMiao,
      )
      expect(dengDaiHaoMiao).toBeLessThan(DUO_MEI_TI_PEI_ZHI.yuYinFaSongCeLiangChaoShiHaoMiao + 600)
    } finally {
      warnMock.mockRestore()
      if (yuanDescriptor) Object.defineProperty(navigator, 'mediaDevices', yuanDescriptor)
      else delete (navigator as unknown as Record<string, unknown>).mediaDevices
      vi.unstubAllGlobals()
    }
  })
})
