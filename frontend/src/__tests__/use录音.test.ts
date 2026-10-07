import { describe, it, expect, vi } from 'vitest'
import { use录音 } from '@/composables/use录音'
import { huoQuFanYi } from '@/config/translations'

function zaoYiLai() {
  return {
    sheZhiCuoWu: vi.fn(),
    faSongYuYin: vi.fn().mockResolvedValue(null),
    gunDongDaoDiBu: vi.fn(),
  }
}

describe('use录音 模式切换', () => {
  it('录音模式可开可关，关闭即复位', () => {
    const yiLai = zaoYiLai()
    const { luYinMoShi, qieHuanLuYinMoShi, guanBiLuYinMoShi } = use录音(yiLai)
    expect(luYinMoShi.value).toBe(false)
    qieHuanLuYinMoShi()
    expect(luYinMoShi.value).toBe(true)
    qieHuanLuYinMoShi()
    expect(luYinMoShi.value).toBe(false)
    qieHuanLuYinMoShi()
    guanBiLuYinMoShi()
    expect(luYinMoShi.value).toBe(false)
  })
})

describe('use录音 无麦克风能力时的降级', () => {
  it('环境不支持 MediaRecorder 时提示错误且不进入录音态', async () => {
    const yiLai = zaoYiLai()
    const { luYinZhong, kaiShiLuYin } = use录音(yiLai)
    await kaiShiLuYin()
    expect(yiLai.sheZhiCuoWu).toHaveBeenCalledWith(huoQuFanYi('duoMeiTi', 'luYinShiBai'))
    expect(luYinZhong.value).toBe(false)
  })

  it('无活动录音时完成录音仅清理资源不发送', async () => {
    const yiLai = zaoYiLai()
    const { luYinZhong, luYinShangHuaQuXiao, wanChengLuYin } = use录音(yiLai)
    luYinZhong.value = true
    luYinShangHuaQuXiao.value = true
    await wanChengLuYin(true)
    expect(luYinZhong.value).toBe(false)
    expect(luYinShangHuaQuXiao.value).toBe(false)
    expect(yiLai.faSongYuYin).not.toHaveBeenCalled()
    expect(yiLai.gunDongDaoDiBu).not.toHaveBeenCalled()
  })

  it('未在录音中时移动指针不改上滑取消标记', () => {
    const yiLai = zaoYiLai()
    const { luYinShangHuaQuXiao, chuLiLuYinYiDong } = use录音(yiLai)
    chuLiLuYinYiDong({ clientY: 0 } as PointerEvent)
    chuLiLuYinYiDong({ clientY: -200 } as PointerEvent)
    expect(luYinShangHuaQuXiao.value).toBe(false)
  })
})

describe('use录音 结算去重（FP-17）', () => {
  class JiaMeiTiLuYinQi extends EventTarget {
    static isTypeSupported(): boolean {
      return true
    }
    state = 'inactive'
    mimeType = 'audio/webm'
    ondataavailable: ((shiJian: { data: Blob }) => void) | null = null
    onerror: (() => void) | null = null
    start(): void {
      this.state = 'recording'
    }
    stop(): void {
      if (this.state === 'inactive') return
      this.state = 'inactive'
      this.ondataavailable?.({ data: new Blob(['yin-pin'], { type: 'audio/webm' }) })
      setTimeout(() => this.dispatchEvent(new Event('stop')), 0)
    }
  }

  function zhuangLuYinHuanJing(): () => void {
    vi.stubGlobal('MediaRecorder', JiaMeiTiLuYinQi)
    const yuanSheBei = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) },
    })
    return () => {
      if (yuanSheBei) Object.defineProperty(navigator, 'mediaDevices', yuanSheBei)
      else delete (navigator as { mediaDevices?: unknown }).mediaDevices
      vi.unstubAllGlobals()
    }
  }

  it('pointerup 与 touchend 先后触发同一次结算只发一条语音', async () => {
    vi.useFakeTimers()
    const huanYuan = zhuangLuYinHuanJing()
    try {
      const yiLai = zaoYiLai()
      const { kaiShiLuYin, songKaiLuYin } = use录音(yiLai)
      await kaiShiLuYin()
      vi.advanceTimersByTime(1500)
      songKaiLuYin()
      songKaiLuYin()
      await vi.runAllTimersAsync()
      expect(yiLai.faSongYuYin).toHaveBeenCalledTimes(1)
      expect(yiLai.gunDongDaoDiBu).toHaveBeenCalledTimes(1)
    } finally {
      huanYuan()
      vi.useRealTimers()
    }
  })

  it('结算完成后新一段录音可正常结算发送', async () => {
    vi.useFakeTimers()
    const huanYuan = zhuangLuYinHuanJing()
    try {
      const yiLai = zaoYiLai()
      const { kaiShiLuYin, songKaiLuYin } = use录音(yiLai)
      await kaiShiLuYin()
      vi.advanceTimersByTime(1500)
      songKaiLuYin()
      await vi.runAllTimersAsync()
      await kaiShiLuYin()
      vi.advanceTimersByTime(1500)
      songKaiLuYin()
      await vi.runAllTimersAsync()
      expect(yiLai.faSongYuYin).toHaveBeenCalledTimes(2)
    } finally {
      huanYuan()
      vi.useRealTimers()
    }
  })

  it('stop() 抛错时按已停止收敛：清理资源、不发送、可立即重新录音', async () => {
    vi.useFakeTimers()
    const huanYuan = zhuangLuYinHuanJing()
    try {
      class JiaLuYinQiStopBaoCuo extends JiaMeiTiLuYinQi {
        stop(): void {
          throw new Error('InvalidStateError')
        }
      }
      vi.stubGlobal('MediaRecorder', JiaLuYinQiStopBaoCuo)
      const yiLai = zaoYiLai()
      const { luYinZhong, kaiShiLuYin, wanChengLuYin } = use录音(yiLai)
      await kaiShiLuYin()
      vi.advanceTimersByTime(1500)
      await wanChengLuYin(true)
      expect(yiLai.faSongYuYin).not.toHaveBeenCalled()
      expect(luYinZhong.value).toBe(false)
      await kaiShiLuYin()
      expect(luYinZhong.value).toBe(true)
    } finally {
      huanYuan()
      vi.useRealTimers()
    }
  })

  it('stop 事件缺失时兜底超时收敛，不把录音能力永久锁死', async () => {
    vi.useFakeTimers()
    const huanYuan = zhuangLuYinHuanJing()
    try {
      class JiaLuYinQiBuPaiFa extends JiaMeiTiLuYinQi {
        stop(): void {
          if (this.state === 'inactive') return
          this.state = 'inactive'
          // 模拟真机缺陷：数据已齐但不派发 stop 事件
          this.ondataavailable?.({ data: new Blob(['yin-pin'], { type: 'audio/webm' }) })
        }
      }
      vi.stubGlobal('MediaRecorder', JiaLuYinQiBuPaiFa)
      const yiLai = zaoYiLai()
      const { luYinZhong, kaiShiLuYin, wanChengLuYin } = use录音(yiLai)
      await kaiShiLuYin()
      vi.advanceTimersByTime(1500)
      const jieSuan = wanChengLuYin(true)
      await vi.advanceTimersByTimeAsync(2000)
      await jieSuan
      expect(yiLai.faSongYuYin).toHaveBeenCalledTimes(1)
      expect(luYinZhong.value).toBe(false)
      await kaiShiLuYin()
      expect(luYinZhong.value).toBe(true)
    } finally {
      huanYuan()
      vi.useRealTimers()
    }
  })
})
