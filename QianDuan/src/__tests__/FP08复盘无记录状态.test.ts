import { afterEach, describe, expect, it, vi } from 'vitest'

const { 拉取复盘 } = vi.hoisted(() => ({ 拉取复盘: vi.fn() }))

vi.mock('@/api/聊天', async () => {
  const yuan = await vi.importActual<typeof import('@/api/聊天')>('@/api/聊天')
  return { ...yuan, huoQuFuPan: 拉取复盘 }
})

import { 复盘状态, type 复盘响应 } from '@/api/聊天'
import { use复盘 } from '@/composables/use复盘'

function zaoXiangYing(fuGai: Partial<复盘响应> = {}): 复盘响应 {
  return {
    fu_pan_nei_rong: null,
    fu_pan_shi_jian_xian: [],
    fu_pan_pi_zhu: null,
    jun_shi_zhi_dao_ji_lu: [],
    guan_jian_shi_jian: [],
    jia_zai_zhong: false,
    fu_pan_zhuang_tai: 复盘状态.已完成,
    ...fuGai,
  }
}

function chuangJian() {
  const tuiSong = vi.fn()
  const qingKong = vi.fn()
  const fuPan = use复盘({
    luYou: { push: tuiSong },
    huoQuXiaoXiLieBiao: () => [],
    qingKongZhuangTai: qingKong,
  })
  return { fuPan, tuiSong, qingKong }
}

afterEach(() => {
  vi.useRealTimers()
  拉取复盘.mockReset()
})

describe('use复盘 无聊天记录状态', () => {
  it('收到无记录状态立即停止，清空加载、总结与批注', async () => {
    拉取复盘.mockResolvedValueOnce(
      zaoXiangYing({
        fu_pan_zhuang_tai: 复盘状态.无聊天记录,
        fu_pan_pi_zhu: [{ xu_hao: 1, ping_lun: '旧批注', qing_gan: '消极' }],
        fu_pan_nei_rong: '旧总结',
      }),
    )
    const { fuPan } = chuangJian()

    await fuPan.jiaZaiFuPanShuJu('d-1')

    expect(fuPan.fuPanWuLiaoTianJiLu.value).toBe(true)
    expect(fuPan.fuPanJiaZaiZhong.value).toBe(false)
    expect(fuPan.fuPanZongJie.value).toBeNull()
    expect(fuPan.fuPanPiZhu.value).toBeNull()
    expect(拉取复盘).toHaveBeenCalledTimes(1)
  })

  it('轮询中遇到无记录状态也立即停止并清空输出', async () => {
    vi.useFakeTimers()
    拉取复盘
      .mockResolvedValueOnce(zaoXiangYing({ jia_zai_zhong: true, fu_pan_zhuang_tai: 复盘状态.生成中 }))
      .mockResolvedValueOnce(zaoXiangYing({ fu_pan_zhuang_tai: 复盘状态.无聊天记录 }))
    const { fuPan } = chuangJian()

    const renWu = fuPan.jiaZaiFuPanShuJu('d-1')
    await vi.advanceTimersByTimeAsync(3000)
    await renWu

    expect(拉取复盘).toHaveBeenCalledTimes(2)
    expect(fuPan.fuPanWuLiaoTianJiLu.value).toBe(true)
    expect(fuPan.fuPanJiaZaiZhong.value).toBe(false)
    expect(fuPan.fuPanZongJie.value).toBeNull()
    expect(fuPan.fuPanPiZhu.value).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('正常复盘保持原有行为，不进入无记录状态', async () => {
    拉取复盘.mockResolvedValueOnce(
      zaoXiangYing({
        fu_pan_nei_rong: '用户表现：节奏稳',
        fu_pan_pi_zhu: [{ xu_hao: 1, ping_lun: '开场自然', qing_gan: '积极' }],
        fu_pan_zhuang_tai: 复盘状态.已完成,
      }),
    )
    const { fuPan } = chuangJian()

    await fuPan.jiaZaiFuPanShuJu('d-1')

    expect(fuPan.fuPanWuLiaoTianJiLu.value).toBe(false)
    expect(fuPan.fuPanJiaZaiZhong.value).toBe(false)
    expect(fuPan.fuPanZongJie.value).toBe('用户表现：节奏稳')
    expect(fuPan.fuPanPiZhu.value).toHaveLength(1)
  })

  it('退出复盘时清除无记录状态并返回战绩页', async () => {
    拉取复盘.mockResolvedValueOnce(zaoXiangYing({ fu_pan_zhuang_tai: 复盘状态.无聊天记录 }))
    const { fuPan, tuiSong, qingKong } = chuangJian()

    await fuPan.jiaZaiFuPanShuJu('d-1')
    expect(fuPan.fuPanWuLiaoTianJiLu.value).toBe(true)

    fuPan.tuiChuFuPan()

    expect(fuPan.fuPanWuLiaoTianJiLu.value).toBe(false)
    expect(fuPan.fuPanMoShi.value).toBe(false)
    expect(qingKong).toHaveBeenCalledTimes(1)
    expect(tuiSong).toHaveBeenCalledWith('/guo-wang-zhan-ji')
  })
})
