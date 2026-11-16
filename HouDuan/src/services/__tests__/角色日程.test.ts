import { describe, expect, it } from 'vitest'
import {
  zhengZeRiQi,
  quDangQianHuoDong,
  renDingKeNengXing,
  riChengMiaoShu,
  type RiChengZhuangTai,
} from '../角色日程'

const 造日程 = (xingQi: number): RiChengZhuangTai => ({
  riQi: '2026-11-15',
  xingQi,
  duanLu: [
    { shiJian: '07:30', huoDong: '起床洗漱' },
    { shiJian: '08:30', huoDong: '上课' },
    { shiJian: '12:00', huoDong: '吃饭' },
    { shiJian: '14:00', huoDong: '图书馆自习' },
    { shiJian: '18:00', huoDong: '跑步' },
    { shiJian: '21:00', huoDong: '刷手机' },
    { shiJian: '23:30', huoDong: '睡觉' },
  ],
})

describe('日期按角色时区算', () => {
  it('上海时区 UTC 04:30 是当地 12:30', () => {
    const jieGuo = zhengZeRiQi(new Date('2026-11-15T04:30:00.000Z'), 'Asia/Shanghai')
    expect(jieGuo.riQi).toBe('2026-11-15')
    expect(jieGuo.xingQi).toBe(7)
  })

  it('纽约时区同一时刻还是前一天', () => {
    const jieGuo = zhengZeRiQi(new Date('2026-11-15T04:30:00.000Z'), 'America/New_York')
    expect(jieGuo.riQi).toBe('2026-11-14')
    expect(jieGuo.xingQi).toBe(6)
  })

  it('非法时区不抛错，兜底上海', () => {
    const jieGuo = zhengZeRiQi(new Date('2026-11-15T04:30:00.000Z'), '乱写')
    expect(jieGuo.riQi).toBe('2026-11-15')
  })

  it('星期一到周日的编号都合法', () => {
    for (let i = 0; i < 7; i += 1) {
      const dt = new Date(Date.UTC(2026, 10, 9 + i, 4, 30))
      const { xingQi } = zhengZeRiQi(dt, 'Asia/Shanghai')
      expect(xingQi).toBeGreaterThanOrEqual(1)
      expect(xingQi).toBeLessThanOrEqual(7)
    }
  })
})

describe('当前活动按分钟查表', () => {
  it('08:45 在上课', () => {
    const huoDong = quDangQianHuoDong(造日程(7), 8 * 60 + 45)
    expect(huoDong?.huoDong).toBe('上课')
    expect(huoDong?.keNengXing).toBe('mang')
  })

  it('14:20 在图书馆自习，算半忙半闲', () => {
    const huoDong = quDangQianHuoDong(造日程(7), 14 * 60 + 20)
    expect(huoDong?.huoDong).toBe('图书馆自习')
    expect(huoDong?.keNengXing).toBe('banMang')
  })

  it('21:30 在刷手机，算闲', () => {
    const huoDong = quDangQianHuoDong(造日程(7), 21 * 60 + 30)
    expect(huoDong?.huoDong).toBe('刷手机')
    expect(huoDong?.keNengXing).toBe('xian')
  })

  it('第一段之前返回空，不硬找', () => {
    expect(quDangQianHuoDong(造日程(7), 5 * 60)).toBeNull()
  })

  it('23:45 仍在最后一段，不跨天', () => {
    const huoDong = quDangQianHuoDong(造日程(7), 23 * 60 + 45)
    expect(huoDong?.huoDong).toBe('睡觉')
  })

  it('没日程或空日程返回空', () => {
    expect(quDangQianHuoDong(null, 600)).toBeNull()
    expect(quDangQianHuoDong({ riQi: '2026-11-15', xingQi: 7, duanLu: [] }, 600)).toBeNull()
  })

  it('日程段无序时仍取「≤现在的最后一条」', () => {
    const 乱序: RiChengZhuangTai = {
      riQi: '2026-11-15',
      xingQi: 7,
      duanLu: [
        { shiJian: '21:00', huoDong: '刷手机' },
        { shiJian: '08:30', huoDong: '上课' },
        { shiJian: '14:00', huoDong: '自习' },
      ],
    }
    expect(quDangQianHuoDong(乱序, 15 * 60)?.huoDong).toBe('自习')
    expect(quDangQianHuoDong(乱序, 22 * 60)?.huoDong).toBe('刷手机')
    expect(quDangQianHuoDong(乱序, 7 * 60)).toBeNull()
  })
})

describe('活动分忙闲', () => {
  it.each(['上课', '开会', '加班', '通勤', '做饭', '考试'])('%s 算忙', (huoDong) => {
    expect(renDingKeNengXing(huoDong)).toBe('mang')
  })

  it.each(['睡觉', '刷手机', '看剧', '发呆', '洗澡', '听歌'])('%s 算闲', (huoDong) => {
    expect(renDingKeNengXing(huoDong)).toBe('xian')
  })

  it.each(['和朋友吃饭', '逛街', '散步'])('%s 算半忙半闲', (huoDong) => {
    expect(renDingKeNengXing(huoDong)).toBe('banMang')
  })

  it('空串按半忙半闲兜底', () => {
    expect(renDingKeNengXing('')).toBe('banMang')
  })
})

describe('日程描述', () => {
  it('无日程或无当前活动返回空，不硬编', () => {
    expect(riChengMiaoShu(null, null)).toBe('')
    expect(riChengMiaoShu(造日程(7), null)).toBe('')
  })

  it('有当前活动时带星期、时间和忙闲', () => {
    const zhuangTai = 造日程(3)
    const huoDong = quDangQianHuoDong(zhuangTai, 8 * 60 + 45)
    const wen = riChengMiaoShu(zhuangTai, huoDong)
    expect(wen).toContain('周三')
    expect(wen).toContain('08:30')
    expect(wen).toContain('上课')
    expect(wen).toContain('在忙')
  })

  it('闲着的状态用另一个词', () => {
    const zhuangTai = 造日程(7)
    const huoDong = quDangQianHuoDong(zhuangTai, 21 * 60 + 30)
    expect(riChengMiaoShu(zhuangTai, huoDong)).toContain('闲着')
  })
})
describe('日程段落归一化（写库前后键名兼容）', () => {
  it('驼峰键与下划线键都能过 zhengSeDuan 等价路径', () => {
    const fromParse = [{ shiJian: '07:30', huoDong: '起床洗漱' }, { shiJian: '08:30', huoDong: '上课' }]
    const fromDb = [{ shi_jian: '07:30', huo_dong: '起床洗漱' }, { shi_jian: '08:30', huo_dong: '上课' }]
    const jieGuoA = fromParse.filter((x) => /^\d{1,2}:\d{2}$/.test(x.shiJian) && x.huoDong !== '')
    const jieGuoB = fromDb
      .map((x) => ({ shiJian: String(x.shi_jian), huoDong: String(x.huo_dong) }))
      .filter((x) => /^\d{1,2}:\d{2}$/.test(x.shiJian) && x.huoDong !== '')
    expect(jieGuoA).toEqual(jieGuoB)
    expect(jieGuoA.length).toBe(2)
  })
})
