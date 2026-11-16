import { describe, expect, it } from 'vitest'
import {
  XinQingLieBiao,
  shiFouHeFaXinQing,
  shiFuMianXinQing,
  suanBanZhiHaoMiao,
  XinQingPeiZhi,
} from '../当前心情'
import { jieGuoXinQing } from '../当前心情'

const DIAN_JI = new Date('2026-11-15T12:00:00+08:00').getTime()
const XIAO_SHI = 60 * 60 * 1000
const TIAN = 24 * XIAO_SHI

describe('当前心情取值白名单', () => {
  it('白名单外的值一律不认', () => {
    expect(shiFouHeFaXinQing('开心')).toBe(true)
    expect(shiFouHeFaXinQing('平静')).toBe(true)
    expect(shiFouHeFaXinQing('平淡')).toBe(false)
    expect(shiFouHeFaXinQing('')).toBe(false)
    expect(shiFouHeFaXinQing(null)).toBe(false)
    expect(shiFouHeFaXinQing(123)).toBe(false)
  })

  it('白名单里没有重复项', () => {
    expect(new Set(XinQingLieBiao).size).toBe(XinQingLieBiao.length)
  })

  it('负面心情只认五个', () => {
    expect(shiFuMianXinQing('生气')).toBe(true)
    expect(shiFuMianXinQing('烦躁')).toBe(true)
    expect(shiFuMianXinQing('开心')).toBe(false)
    expect(shiFuMianXinQing('乱写的')).toBe(false)
  })
})

describe('强度决定衰减速度', () => {
  it('强度越高，半衰期越长', () => {
    expect(suanBanZhiHaoMiao(90, false)).toBeGreaterThan(suanBanZhiHaoMiao(20, false))
  })

  it('负面心情比正面心情衰减更快', () => {
    expect(suanBanZhiHaoMiao(60, true)).toBeLessThan(suanBanZhiHaoMiao(60, false))
  })

  it('半衰期始终落在配置区间内', () => {
    for (const qiangDu of [0, 1, 25, 50, 75, 99, 100]) {
      for (const fuMian of [true, false]) {
        const h = suanBanZhiHaoMiao(qiangDu, fuMian)
        expect(h).toBeGreaterThanOrEqual(XinQingPeiZhi.zuiDiBanZhi)
        expect(h).toBeLessThanOrEqual(XinQingPeiZhi.zuiGaoBanZhi)
      }
    }
  })
})

describe('随时间自然衰减', () => {
  it('刚判定时不衰减', () => {
    const jieGuo = jieGuoXinQing({ ming: '开心', qiangDu: 80, gengXinShiJian: DIAN_JI }, DIAN_JI)
    expect(jieGuo.ming).toBe('开心')
    expect(jieGuo.qiangDu).toBe(80)
  })

  it('过 12 小时后强度下降但不消失', () => {
    const jieGuo = jieGuoXinQing({ ming: '甜蜜', qiangDu: 90, gengXinShiJian: DIAN_JI }, DIAN_JI + 12 * XIAO_SHI)
    expect(jieGuo.ming).toBe('甜蜜')
    expect(jieGuo.qiangDu).toBeLessThan(90)
    expect(jieGuo.qiangDu).toBeGreaterThan(0)
  })

  it('几天后强度归零、心情清空', () => {
    const jieGuo = jieGuoXinQing({ ming: '烦躁', qiangDu: 60, gengXinShiJian: DIAN_JI }, DIAN_JI + 7 * TIAN)
    expect(jieGuo.ming).toBeNull()
    expect(jieGuo.qiangDu).toBe(0)
  })

  it('同一时间点，负面心情比正面心情剩得少', () => {
    const shiJian = DIAN_JI + 12 * XIAO_SHI
    const 正面 = jieGuoXinQing({ ming: '甜蜜', qiangDu: 60, gengXinShiJian: DIAN_JI }, shiJian)
    const 负面 = jieGuoXinQing({ ming: '委屈', qiangDu: 60, gengXinShiJian: DIAN_JI }, shiJian)
    expect(负面.qiangDu).toBeLessThan(正面.qiangDu)
  })

  it('强度越高，同一时间点剩得越多', () => {
    const shiJian = DIAN_JI + 12 * XIAO_SHI
    const 弱 = jieGuoXinQing({ ming: '平静', qiangDu: 15, gengXinShiJian: DIAN_JI }, shiJian)
    const 强 = jieGuoXinQing({ ming: '平静', qiangDu: 85, gengXinShiJian: DIAN_JI }, shiJian)
    expect(强.qiangDu).toBeGreaterThan(弱.qiangDu)
  })

  it('空状态或脏心情名不抛错', () => {
    expect(jieGuoXinQing(null, DIAN_JI)).toEqual({ ming: null, qiangDu: 0 })
    expect(jieGuoXinQing(undefined, DIAN_JI)).toEqual({ ming: null, qiangDu: 0 })
    expect(
      jieGuoXinQing({ ming: '乱写的' as never, qiangDu: 50, gengXinShiJian: DIAN_JI }, DIAN_JI),
    ).toEqual({ ming: null, qiangDu: 0 })
  })

  it('脏时间戳按刚判定处理，不按过期处理', () => {
    const jieGuo = jieGuoXinQing({ ming: '开心', qiangDu: 40, gengXinShiJian: Number.NaN }, DIAN_JI)
    expect(jieGuo.ming).toBe('开心')
    expect(jieGuo.qiangDu).toBe(40)
  })
})