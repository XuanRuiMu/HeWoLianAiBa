import { describe, expect, it } from 'vitest'
import {
  shiQuDaoYuYan,
  shiQuYouXiao,
  shiQuXianZaiShiJian,
  shiQuMiaoShu,
  yuYanMingCheng,
  yuYanYouXiao,
} from '../../config/语言与时区'

const 基准 = new Date('2026-11-15T04:30:00.000Z')

describe('时区名归一化', () => {
  it('合法 IANA 时区名原样返回', () => {
    expect(shiQuYouXiao('Asia/Shanghai')).toBe(true)
    expect(shiQuYouXiao('America/New_York')).toBe(true)
    expect(shiQuYouXiao('Europe/London')).toBe(true)
  })

  it('空值与乱写都不认', () => {
    expect(shiQuYouXiao('')).toBe(false)
    expect(shiQuYouXiao('Asia Shanghai')).toBe(false)
    expect(shiQuYouXiao('这不是时区')).toBe(false)
    expect(shiQuYouXiao(null)).toBe(false)
    expect(shiQuYouXiao(123)).toBe(false)
  })
})

describe('时区推语言', () => {
  it('中国时区推中文', () => {
    expect(shiQuDaoYuYan('Asia/Shanghai')).toBe('zh')
    expect(shiQuDaoYuYan('Asia/Chongqing')).toBe('zh')
    expect(shiQuDaoYuYan('Asia/Hong_Kong')).toBe('zh')
  })

  it('美国时区推英文', () => {
    expect(shiQuDaoYuYan('America/New_York')).toBe('en')
    expect(shiQuDaoYuYan('America/Los_Angeles')).toBe('en')
    expect(shiQuDaoYuYan('America/Chicago')).toBe('en')
  })

  it('其它主要时区各有对应', () => {
    expect(shiQuDaoYuYan('Asia/Tokyo')).toBe('ja')
    expect(shiQuDaoYuYan('Asia/Seoul')).toBe('ko')
    expect(shiQuDaoYuYan('Europe/Paris')).toBe('fr')
    expect(shiQuDaoYuYan('Europe/Berlin')).toBe('de')
    expect(shiQuDaoYuYan('Europe/Moscow')).toBe('ru')
  })

  it('表里没有的按大洲兜底', () => {
    expect(shiQuDaoYuYan('Asia/Kolkata')).toBe('zh')
    expect(shiQuDaoYuYan('Europe/Athens')).toBe('en')
    expect(shiQuDaoYuYan('America/Bogota')).toBe('en')
    expect(shiQuDaoYuYan('Australia/Brisbane')).toBe('en')
  })

  it('空值兜底到中国时区从而推中文', () => {
    expect(shiQuDaoYuYan('')).toBe('zh')
    expect(shiQuDaoYuYan(null)).toBe('zh')
    expect(shiQuDaoYuYan('乱写')).toBe('zh')
  })
})

describe('语言名校验', () => {
  it('支持的语言认，不支持的不认', () => {
    expect(yuYanYouXiao('zh')).toBe(true)
    expect(yuYanYouXiao('en')).toBe(true)
    expect(yuYanYouXiao('xx')).toBe(false)
    expect(yuYanYouXiao('')).toBe(false)
  })

  it('语言名有中文说法', () => {
    expect(yuYanMingCheng('zh')).toBe('中文')
    expect(yuYanMingCheng('en')).toBe('英文')
    expect(yuYanMingCheng('ja')).toBe('日文')
    expect(yuYanMingCheng('xx')).toBe('')
    expect(yuYanMingCheng('')).toBe('')
  })
})

describe('当地现在时间', () => {
  it('UTC 04:30 时上海是 12:30', () => {
    const jieGuo = shiQuXianZaiShiJian('Asia/Shanghai', 基准)
    expect(jieGuo.xiaoShi).toBe(12)
    expect(jieGuo.fenZhong).toBe(30)
  })

  it('UTC 04:30 时纽约是前一天 23:30', () => {
    const jieGuo = shiQuXianZaiShiJian('America/New_York', 基准)
    expect(jieGuo.xiaoShi).toBe(23)
    expect(jieGuo.fenZhong).toBe(30)
  })

  it('同一时刻洛杉矶比纽约晚三小时', () => {
    const 纽约 = shiQuXianZaiShiJian('America/New_York', 基准)
    const 洛杉矶 = shiQuXianZaiShiJian('America/Los_Angeles', 基准)
    expect(纽约.xiaoShi - 洛杉矶.xiaoShi).toBe(3)
  })

  it('星期几按当地算（周一为 1，周日为 7）', () => {
    const 上海 = shiQuXianZaiShiJian('Asia/Shanghai', 基准)
    expect(上海.xingQi).toBeGreaterThanOrEqual(1)
    expect(上海.xingQi).toBeLessThanOrEqual(7)
  })

  it('非法时区不抛错，按兜底时区算', () => {
    const jieGuo = shiQuXianZaiShiJian('不是时区', 基准)
    expect(jieGuo.xiaoShi).toBe(12)
    expect(jieGuo.shiQu).toBe('Asia/Shanghai')
  })

  it('时间描述带时区名、星期和时段', () => {
    const wen = shiQuMiaoShu('Asia/Shanghai', 基准)
    expect(wen).toContain('Asia/Shanghai')
    expect(wen).toContain('点')
    expect(wen).toMatch(/周[一二三四五六日]/)
  })

  it('凌晨、上午、下午、深夜四个时段都能分出来', () => {
    const 凌晨 = shiQuMiaoShu('Asia/Shanghai', new Date('2026-11-14T18:00:00.000Z'))
    const 上午 = shiQuMiaoShu('Asia/Shanghai', new Date('2026-11-15T02:00:00.000Z'))
    const 下午 = shiQuMiaoShu('Asia/Shanghai', new Date('2026-11-15T07:00:00.000Z'))
    const 深夜 = shiQuMiaoShu('Asia/Shanghai', new Date('2026-11-15T15:30:00.000Z'))
    expect(凌晨).toContain('凌晨')
    expect(上午).toContain('上午')
    expect(下午).toContain('下午')
    expect(深夜).toContain('深夜')
  })
})
