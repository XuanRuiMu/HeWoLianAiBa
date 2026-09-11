import { describe, it, expect } from 'vitest'
import {
  jiSuanJiChuSuoFang,
  yueShuPianYi,
  jiSuanYuanQu,
  jueDingShuChuGeShi,
  TOU_XIANG_SHU_CHU_CHI_CUN,
} from '@/utils/头像裁剪'

describe('头像裁剪纯函数', () => {
  it('输出尺寸恒为1024', () => {
    expect(TOU_XIANG_SHU_CHU_CHI_CUN).toBe(1024)
  })

  it('基础缩放为cover：短边覆盖选区', () => {
    expect(jiSuanJiChuSuoFang(800, 600, 260)).toBeCloseTo(260 / 600, 6)
    expect(jiSuanJiChuSuoFang(600, 800, 260)).toBeCloseTo(260 / 600, 6)
    expect(jiSuanJiChuSuoFang(260, 260, 260)).toBe(1)
  })

  it('偏移钳制：图片恒覆盖选区', () => {
    const jieGuo = yueShuPianYi(50, 30, 400, 400, 260)
    expect(jieGuo).toEqual({ x: 0, y: 0 })
    const jieGuo2 = yueShuPianYi(-500, -500, 400, 400, 260)
    expect(jieGuo2).toEqual({ x: -140, y: -140 })
    const jieGuo3 = yueShuPianYi(-50, -60, 400, 500, 260)
    expect(jieGuo3).toEqual({ x: -50, y: -60 })
  })

  it('源裁剪区为正方形且不出界', () => {
    const qu = jiSuanYuanQu({
      yuanKuan: 800,
      yuanGao: 600,
      suoFang: 0.5,
      pianYiX: -35,
      pianYiY: -20,
      quYuBianChang: 260,
    })
    expect(qu.bianChang).toBe(520)
    expect(qu.x).toBeGreaterThanOrEqual(0)
    expect(qu.y).toBeGreaterThanOrEqual(0)
    expect(qu.x + qu.bianChang).toBeLessThanOrEqual(800)
    expect(qu.y + qu.bianChang).toBeLessThanOrEqual(600)
  })

  it('零缩放回退基础缩放不崩溃', () => {
    const qu = jiSuanYuanQu({
      yuanKuan: 800,
      yuanGao: 600,
      suoFang: 0,
      pianYiX: 0,
      pianYiY: 0,
      quYuBianChang: 260,
    })
    expect(qu.bianChang).toBeGreaterThan(0)
  })

  it('输出格式：PNG保持其余转JPEG', () => {
    expect(jueDingShuChuGeShi('image/png')).toEqual({ mime: 'image/png', houZhui: 'png' })
    expect(jueDingShuChuGeShi('image/jpeg')).toEqual({ mime: 'image/jpeg', houZhui: 'jpg' })
    expect(jueDingShuChuGeShi('image/webp')).toEqual({ mime: 'image/jpeg', houZhui: 'jpg' })
    expect(jueDingShuChuGeShi('image/gif')).toEqual({ mime: 'image/jpeg', houZhui: 'jpg' })
  })
})
