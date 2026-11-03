import { beforeEach, describe, expect, it, vi } from 'vitest'
import { YU_YIN_ZENG_YI_SHANG_XIAN } from '@/composables/use语音音量'
import {
  heChengDanTongDaoYinLiang,
  xuanZeYuYinTongDao,
} from '@/config/消息配置'
import {
  YU_YIN_YIN_LIANG_MO_REN,
  duQuYuYinYinLiang,
  sheZhiYuYinYinLiang,
  yuYinYinLiangSeXiang,
  yuYinYinLiangZengYi,
  语音音量键,
  语音音量表,
} from '@/utils/语音音量存储'

const 存储键 = 'yuYinYinLiang'

describe('每条语音独立音量', () => {
  beforeEach(() => {
    localStorage.clear()
    语音音量表.clear()
  })

  it('消息键优先用稳定的服务器 id，缺省回落客户端序号与媒体地址', () => {
    expect(语音音量键({ id: 'a1' })).toBe('x:a1')
    expect(语音音量键({ id: 'a1', ke_hu_duan_id: 'k9' })).toBe('x:a1')
    expect(语音音量键({ ke_hu_duan_id: 'k9' })).toBe('x:kd:k9')
    expect(语音音量键({ mei_ti_url: 'https://x/y.webm' })).toBe('u:https://x/y.webm')
    expect(语音音量键({})).toBe('')
  })

  it('双键写入：同一条语音同时落稳定键与会话键', () => {
    vi.useFakeTimers()
    sheZhiYuYinYinLiang({ id: 'a1', ke_hu_duan_id: 'k9' }, 0.8)
    vi.advanceTimersByTime(400)
    const 原文 = localStorage.getItem(存储键)
    expect(原文).not.toBeNull()
    const 对象 = JSON.parse(原文 as string) as Record<string, number>
    expect(对象['x:a1']).toBe(0.8)
    expect(对象['x:kd:k9']).toBe(0.8)
    vi.useRealTimers()
  })

  it('读取时稳定键优先于会话键', () => {
    localStorage.setItem(存储键, JSON.stringify({ 'x:p1': 0.2, 'x:kd:p9': 0.9 }))
    语音音量表.set('x:p1', 0.2)
    语音音量表.set('x:kd:p9', 0.9)
    expect(duQuYuYinYinLiang({ id: 'p1', ke_hu_duan_id: 'p9' })).toBe(0.2)
  })

  it('刷新后仅剩服务器 id 的消息仍能读到原值', async () => {
    vi.useFakeTimers()
    sheZhiYuYinYinLiang({ id: 'fp3-shua-xin', ke_hu_duan_id: 'fp3-kd' }, 0.7)
    vi.advanceTimersByTime(400)
    vi.useRealTimers()
    vi.resetModules()
    const chongXin = await import('@/utils/语音音量存储')
    expect(chongXin.duQuYuYinYinLiang({ id: 'fp3-shua-xin' })).toBe(0.7)
    expect(chongXin.duQuYuYinYinLiang({ id: 'fp3-shua-xin', ke_hu_duan_id: 'fp3-kd' })).toBe(0.7)
  })

  it('兼容旧版存储：历史 x:id 键刷新后仍可读', async () => {
    localStorage.setItem(存储键, JSON.stringify({ 'x:jiu-id': 0.6 }))
    vi.resetModules()
    const chongXin = await import('@/utils/语音音量存储')
    expect(chongXin.duQuYuYinYinLiang({ id: 'jiu-id' })).toBe(0.6)
  })

  it('仅有客户端序号时读会话键兜底', async () => {
    localStorage.setItem(存储键, JSON.stringify({ 'x:kd:kd1': 0.3 }))
    vi.resetModules()
    const chongXin = await import('@/utils/语音音量存储')
    expect(chongXin.duQuYuYinYinLiang({ ke_hu_duan_id: 'kd1' })).toBe(0.3)
  })

  it('默认落在最中间，取值夹在 0 到 1 之间', () => {
    expect(YU_YIN_YIN_LIANG_MO_REN).toBe(0.5)
    expect(duQuYuYinYinLiang({ id: 'm1' })).toBe(0.5)
    expect(sheZhiYuYinYinLiang({ id: 'm1' }, 2)).toBe(1)
    expect(sheZhiYuYinYinLiang({ id: 'm2' }, -3)).toBe(0)
    expect(sheZhiYuYinYinLiang({ id: 'm3' }, Number.NaN)).toBe(0.5)
    expect(duQuYuYinYinLiang({ id: 'm1' })).toBe(1)
  })

  it('中位即 100%：滑杆中点倍率为 1，底端 0、顶端 2', () => {
    expect(YU_YIN_YIN_LIANG_MO_REN).toBe(0.5)
    expect(yuYinYinLiangZengYi(0.5)).toBe(1)
    expect(yuYinYinLiangZengYi(0)).toBe(0)
    expect(yuYinYinLiangZengYi(1)).toBe(2)
    expect(yuYinYinLiangZengYi(0.25)).toBeCloseTo(0.5, 6)
  })

  it('增益全程单调递增，滑杆每一档都对应不同倍率', () => {
    const 取样点 = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]
    const 倍率们 = 取样点.map((值) => yuYinYinLiangZengYi(值))
    expect(new Set(倍率们).size).toBe(取样点.length)
    for (let 序 = 1; 序 < 倍率们.length; 序 += 1) {
      expect(倍率们[序]).toBeGreaterThan(倍率们[序 - 1])
    }
  })

  it('与全局通道音量相乘：回落路径封顶 1，WebAudio 路径封顶 4 且滑杆顶端可达 2', () => {
    const huiLuo = (全局: number, 值: number) =>
      Math.max(0, Math.min(1, 全局 * yuYinYinLiangZengYi(值)))
    expect(huiLuo(1, 0.5)).toBe(1)
    expect(huiLuo(0.5, 0.5)).toBe(0.5)
    expect(huiLuo(0.5, 1)).toBe(1)
    expect(huiLuo(0.5, 0)).toBe(0)
    expect(huiLuo(0.5, 0.25)).toBe(0.25)
    const zengYi = (全局: number, 值: number) =>
      Math.max(0, Math.min(YU_YIN_ZENG_YI_SHANG_XIAN, 全局 * yuYinYinLiangZengYi(值)))
    expect(YU_YIN_ZENG_YI_SHANG_XIAN).toBe(4)
    expect(zengYi(1, 0.5)).toBe(1)
    expect(zengYi(1, 1)).toBe(2)
    expect(zengYi(0.5, 1)).toBe(1)
    expect(zengYi(0.5, 0)).toBe(0)
    expect(zengYi(4, 1)).toBe(4)
    expect(zengYi(2, 1)).toBe(4)
  })

  it('圆点颜色从黄到红，中点橙色', () => {
    expect(yuYinYinLiangSeXiang(0)).toContain('hsl(55.0')
    expect(yuYinYinLiangSeXiang(0.5)).toContain('hsl(27.5')
    expect(yuYinYinLiangSeXiang(1)).toContain('hsl(0.0')
  })

  it('逐条写入本地存储且互不影响', async () => {
    vi.useFakeTimers()
    sheZhiYuYinYinLiang({ id: 'a' }, 0.2)
    sheZhiYuYinYinLiang({ id: 'b' }, 0.9)
    vi.advanceTimersByTime(400)
    const 原文 = localStorage.getItem(存储键)
    expect(原文).not.toBeNull()
    const 对象 = JSON.parse(原文 as string) as Record<string, number>
    expect(对象['x:a']).toBe(0.2)
    expect(对象['x:b']).toBe(0.9)
    vi.useRealTimers()
  })

  it('同一条重复写入同值只落盘一次', () => {
    vi.useFakeTimers()
    const 落盘 = vi.spyOn(localStorage, 'setItem')
    sheZhiYuYinYinLiang({ id: 'c' }, 0.4)
    sheZhiYuYinYinLiang({ id: 'c' }, 0.4)
    vi.advanceTimersByTime(400)
    expect(落盘).toHaveBeenCalledTimes(1)
    落盘.mockRestore()
    vi.useRealTimers()
  })
})

describe('语音通道按发送者选择', () => {
  it('自己发的语音走 yongHuYuYin 通道，其余走 duiXiangYuYin 通道', () => {
    expect(xuanZeYuYinTongDao('yonghu')).toBe('yongHuYuYin')
    expect(xuanZeYuYinTongDao('jiaose')).toBe('duiXiangYuYin')
    expect(xuanZeYuYinTongDao('xitong')).toBe('duiXiangYuYin')
    expect(xuanZeYuYinTongDao('duifang')).toBe('duiXiangYuYin')
    expect(xuanZeYuYinTongDao(undefined)).toBe('duiXiangYuYin')
    expect(xuanZeYuYinTongDao(null)).toBe('duiXiangYuYin')
  })

  it('单通道合成为总音量与对应语音通道取交集，任一为 0 即静音', () => {
    expect(heChengDanTongDaoYinLiang({ zong: 50, yongHuYuYin: 40 }, 'yongHuYuYin')).toBe(0.4)
    expect(heChengDanTongDaoYinLiang({ zong: 80, duiXiangYuYin: null }, 'duiXiangYuYin')).toBe(0.8)
    expect(heChengDanTongDaoYinLiang({ zong: null, yongHuYuYin: 70 }, 'yongHuYuYin')).toBe(0.7)
    expect(heChengDanTongDaoYinLiang({ zong: 80, duiXiangYuYin: 40 }, 'duiXiangYuYin')).toBe(0.4)
    expect(heChengDanTongDaoYinLiang({ zong: 0, yongHuYuYin: 40 }, 'yongHuYuYin')).toBe(0)
    expect(heChengDanTongDaoYinLiang({ zong: 50, yongHuYuYin: 0 }, 'yongHuYuYin')).toBe(0)
  })

  it('音乐与视频通道不再混入语音音量', () => {
    expect(
      heChengDanTongDaoYinLiang({ zong: 80, yongHuYuYin: 60, yinYue: 0, shiPin: 0 }, 'yongHuYuYin'),
    ).toBe(0.6)
  })
})

describe('语音增益请求', () => {
  it('增益请求夹在 0 到 4，非法值回 1', async () => {
    vi.resetModules()
    const moKuai = await import('@/composables/use语音音量')
    moKuai.sheZhiYuYinZengYi(2)
    expect(moKuai.duQuYuYinZengYiQingQiu()).toBe(2)
    moKuai.sheZhiYuYinZengYi(99)
    expect(moKuai.duQuYuYinZengYiQingQiu()).toBe(4)
    moKuai.sheZhiYuYinZengYi(-1)
    expect(moKuai.duQuYuYinZengYiQingQiu()).toBe(0)
    moKuai.sheZhiYuYinZengYi(Number.NaN)
    expect(moKuai.duQuYuYinZengYiQingQiu()).toBe(1)
  })
})
