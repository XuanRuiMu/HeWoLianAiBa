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
