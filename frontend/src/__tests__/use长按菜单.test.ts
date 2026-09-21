import { ref } from 'vue'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { use长按菜单 } from '@/composables/use长按菜单'
import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import type { 消息 } from '@/types'

function zaoXiaoXi(gengDuo: Partial<消息> = {}): 消息 {
  return {
    id: 'x1',
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'u1',
    fa_song_zhe_lei_xing: 'yonghu',
    nei_rong: '你好',
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: true,
    ...gengDuo,
  }
}

function zaoYiLai() {
  return {
    dangQianShiJian: ref(Date.now()),
    cheHuiXiaoXi: vi.fn().mockResolvedValue(undefined),
  }
}

describe('use长按菜单 右键/长按打开撤回菜单', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('窗口期内的用户消息可打开菜单并记录坐标与选中项', () => {
    const yiLai = zaoYiLai()
    const { cheHuiCaiDanZhanKai, cheHuiCaiDanYangShi, daKaiCaiDan } = use长按菜单(yiLai)
    const shiJian = { clientY: 120, clientX: 88 } as MouseEvent
    daKaiCaiDan(zaoXiaoXi(), shiJian)
    expect(cheHuiCaiDanZhanKai.value).toBe(true)
    expect(cheHuiCaiDanYangShi.value).toEqual({ top: '120px', left: '88px' })
  })

  it('角色消息、已撤回或超时消息不打开菜单', () => {
    const yiLai = zaoYiLai()
    const { cheHuiCaiDanZhanKai, daKaiCaiDan } = use长按菜单(yiLai)
    daKaiCaiDan(zaoXiaoXi({ fa_song_zhe_lei_xing: 'jiaose' }), {} as MouseEvent)
    daKaiCaiDan(zaoXiaoXi({ yi_che_hui: true }), {} as MouseEvent)
    daKaiCaiDan(
      zaoXiaoXi({ shi_jian_chuo: Date.now() - XIAO_XI_PEI_ZHI.cheHuiShiXian - 1000 }),
      {} as MouseEvent,
    )
    expect(cheHuiCaiDanZhanKai.value).toBe(false)
  })

  it('触摸长按 500ms 打开菜单，提前松手取消', async () => {
    const yiLai = zaoYiLai()
    const { cheHuiCaiDanZhanKai, chuMoKaiShi, chuMoJieShu } = use长按菜单(yiLai)
    const xiaoXi = zaoXiaoXi()
    chuMoKaiShi(xiaoXi)
    chuMoJieShu()
    await vi.advanceTimersByTimeAsync(600)
    expect(cheHuiCaiDanZhanKai.value).toBe(false)

    chuMoKaiShi(xiaoXi)
    await vi.advanceTimersByTimeAsync(500)
    expect(cheHuiCaiDanZhanKai.value).toBe(true)
  })

  it('执行撤回调用仓库并关闭菜单', async () => {
    const yiLai = zaoYiLai()
    const {
      cheHuiCaiDanZhanKai,
      daKaiCaiDan,
      zhiXingCheHui,
      xianShiCheHuiAnNiu,
      zhiXingCheHuiXiaoXi,
    } = use长按菜单(yiLai)
    daKaiCaiDan(zaoXiaoXi(), {} as MouseEvent)
    await zhiXingCheHui()
    expect(yiLai.cheHuiXiaoXi).toHaveBeenCalledWith('x1')
    expect(cheHuiCaiDanZhanKai.value).toBe(false)

    cheHuiCaiDanZhanKai.value = true
    await zhiXingCheHui()
    expect(cheHuiCaiDanZhanKai.value).toBe(false)

    const neiZhiXiaoXi = zaoXiaoXi()
    await zhiXingCheHuiXiaoXi(neiZhiXiaoXi)
    expect(yiLai.cheHuiXiaoXi).toHaveBeenLastCalledWith('x1')
    expect(xianShiCheHuiAnNiu(neiZhiXiaoXi)).toBe(true)
    expect(xianShiCheHuiAnNiu(zaoXiaoXi({ fa_song_zhe_lei_xing: 'jiaose' }))).toBe(false)
  })
})
