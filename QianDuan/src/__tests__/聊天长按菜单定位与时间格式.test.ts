import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { use长按菜单 } from '@/composables/use长按菜单'
import { fenZuXiaoXiAnShiJian, geShiHuaXiaoXiShiJian } from '@/utils/消息时间分组'
import { huoQuFanYi } from '@/config/翻译表'
import { LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI } from '@/config/消息配置'

function 造触屏(x: number, y: number) {
  return { touches: [{ clientX: x, clientY: y }], changedTouches: [] } as unknown as TouchEvent
}

function 挂长按菜单() {
  return use长按菜单({
    dangQianShiJian: ref(Date.now()),
    cheHuiXiaoXi: async () => undefined,
  })
}

describe('触屏长按菜单贴指定位并避让视口', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('长按文本时菜单定位在触点附近，不再停在左上角', () => {
    const quan = 挂长按菜单()
    window.innerWidth = 390
    window.innerHeight = 844
    const xiaoXi = { id: 'a', nei_rong: '在吗', lei_xing: 'wenben', shi_jian_chuo: Date.now(), fa_song_zhe_lei_xing: 'yonghu' }
    quan.chuMoKaiShiWenBen(xiaoXi as never, 造触屏(200, 400))
    vi.advanceTimersByTime(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao + 20)
    expect(quan.wenBenCaiDanZhanKai.value).toBe(true)
    const { top, left } = quan.wenBenCaiDanYangShi.value
    expect(left).not.toBe('0px')
    expect(top).not.toBe('0px')
    expect(parseFloat(left)).toBeLessThanOrEqual(390 - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanYuGuKuan)
  })

  it('触点靠近右下边缘时菜单被夹回视口内', () => {
    const quan = 挂长按菜单()
    window.innerWidth = 320
    window.innerHeight = 480
    const xiaoXi = { id: 'b', nei_rong: '好', lei_xing: 'wenben', shi_jian_chuo: Date.now(), fa_song_zhe_lei_xing: 'yonghu' }
    quan.chuMoKaiShiWenBen(xiaoXi as never, 造触屏(319, 479))
    vi.advanceTimersByTime(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao + 20)
    const { top, left } = quan.wenBenCaiDanYangShi.value
    expect(parseFloat(left)).toBeLessThanOrEqual(320 - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanYuGuKuan)
    expect(parseFloat(left)).toBeGreaterThanOrEqual(0)
    expect(parseFloat(top)).toBeGreaterThanOrEqual(0)
    expect(parseFloat(top)).toBeLessThanOrEqual(480 - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanYuGuGao)
  })
})

describe('聊天时间条按微信十二小时制显示', () => {
  const 造 = (y: number, mo: number, d: number, h: number, mi: number): Date =>
    new Date(y, mo - 1, d, h, mi, 0, 0)

  it.each([
    [0, 0, '凌晨0:00'],
    [5, 59, '凌晨5:59'],
    [6, 0, '早上6:00'],
    [8, 59, '早上8:59'],
    [9, 0, '上午9:00'],
    [11, 5, '上午11:05'],
    [11, 59, '上午11:59'],
    [12, 0, '中午12:00'],
    [12, 30, '中午12:30'],
    [13, 59, '中午1:59'],
    [14, 0, '下午2:00'],
    [17, 30, '下午5:30'],
    [18, 0, '晚上6:00'],
    [20, 24, '晚上8:24'],
    [23, 59, '晚上11:59'],
  ] satisfies Array<[number, number, string]>)(
    '同一天 %02d:%02d 只显示时段与时间，输出 %s',
    (shi, fen, 期望) => {
      expect(geShiHuaXiaoXiShiJian(造(2026, 10, 23, shi, fen), 造(2026, 10, 23, 23, 0))).toBe(期望)
    },
  )

  it('昨天 23:59 在次日 00:00 之后查看显示「昨天 晚上11:59」', () => {
    expect(geShiHuaXiaoXiShiJian(造(2026, 10, 22, 23, 59), 造(2026, 10, 23, 0, 0))).toBe(
      '昨天 晚上11:59',
    )
  })

  it('元旦查看前一年最后一天仍优先显示昨天', () => {
    expect(geShiHuaXiaoXiShiJian(造(2025, 12, 31, 8, 10), 造(2026, 1, 1, 9, 0))).toBe(
      '昨天 早上8:10',
    )
  })

  it('往前数七天内的前天到六天前显示星期', () => {
    const 现在 = 造(2026, 10, 25, 12, 0)
    const 期望表: Array<[number, string]> = [
      [21, '星期三'],
      [20, '星期二'],
      [19, '星期一'],
    ]
    for (const [ri, qianZhui] of 期望表) {
      expect(geShiHuaXiaoXiShiJian(造(2026, 10, ri, 12, 0), 现在)).toBe(`${qianZhui} 中午12:00`)
    }
  })

  it('上周但仍在七天内的消息显示星期而不退化成日期', () => {
    const 现在 = 造(2026, 10, 21, 9, 0)
    const 目标 = 造(2026, 10, 19, 9, 0)
    expect(geShiHuaXiaoXiShiJian(目标, 现在)).toBe('星期一 上午9:00')
  })

  it('第七天起改用月日格式且月日不带前导零', () => {
    expect(geShiHuaXiaoXiShiJian(造(2026, 10, 18, 9, 0), 造(2026, 10, 25, 9, 0))).toBe(
      '10月18日 上午9:00',
    )
    expect(geShiHuaXiaoXiShiJian(造(2026, 1, 5, 9, 0), 造(2026, 10, 23, 9, 0))).toBe(
      '1月5日 上午9:00',
    )
  })

  it('今年内更早的消息显示「M月D日 时段时间」', () => {
    expect(geShiHuaXiaoXiShiJian(造(2026, 10, 10, 9, 5), 造(2026, 10, 23, 20, 0))).toBe(
      '10月10日 上午9:05',
    )
  })

  it('跨年消息显示「YYYY年M月D日 时段时间」', () => {
    expect(geShiHuaXiaoXiShiJian(造(2025, 3, 5, 14, 30), 造(2026, 10, 23, 20, 0))).toBe(
      '2025年3月5日 下午2:30',
    )
    expect(geShiHuaXiaoXiShiJian(造(2025, 10, 23, 20, 0), 造(2026, 10, 23, 20, 0))).toBe(
      '2025年10月23日 晚上8:00',
    )
  })

  it('时间戳晚于现在时只输出时段与时间', () => {
    expect(geShiHuaXiaoXiShiJian(造(2026, 10, 24, 7, 0), 造(2026, 10, 23, 20, 0))).toBe(
      '早上7:00',
    )
  })
})

describe('时间条文本由翻译表下发，工具函数零中文硬编码', () => {
  const 源 = readFileSync(resolve(__dirname, '../utils/消息时间分组.ts'), 'utf8')
    .split('\n')
    .filter((行) => !/^\s*import\b/.test(行))
    .join('\n')

  it('消息时间分组.ts 的字符串字面量里没有中文字符', () => {
    const 中文字面量 = [...源.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`\n]*)`/g)]
      .map((匹配) => 匹配[1] ?? 匹配[2] ?? 匹配[3] ?? '')
      .filter((值) => /[一-鿿]/.test(值))
    expect(中文字面量).toEqual([])
  })

  it('时段前缀全部来自翻译表 shiJian 分组', () => {
    for (const [jian, 文本] of [
      ['lingChen', '凌晨'],
      ['zaoShang', '早上'],
      ['shangWu', '上午'],
      ['zhongWu', '中午'],
      ['xiaWu', '下午'],
      ['wanShang', '晚上'],
    ] as const) {
      expect(huoQuFanYi('shiJian', jian)).toBe(文本)
    }
  })
})

describe('聊天时间条按微信五分钟规则插入', () => {
  const 基准 = Date.UTC(2026, 9, 23, 4, 0, 0)
  const 造 = (pianYiHaoMiao: number) => ({ shi_jian_chuo: 基准 + pianYiHaoMiao })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 9, 23, 12, 0, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('不足五分钟且同一天不重复插入时间条', () => {
    const 组 = fenZuXiaoXiAnShiJian([造(0), 造(4 * 60 * 1000 + 59 * 1000)])
    expect(组).toHaveLength(1)
    expect(组[0].xiaoXiLieBiao).toHaveLength(2)
  })

  it('恰好五分钟仍在同一组，超过五分钟另起一组', () => {
    expect(fenZuXiaoXiAnShiJian([造(0), 造(5 * 60 * 1000)])).toHaveLength(1)
    const 组 = fenZuXiaoXiAnShiJian([造(0), 造(5 * 60 * 1000 + 1000)])
    expect(组).toHaveLength(2)
    expect(组[0].shiJian).toBe('中午12:00')
    expect(组[1].shiJian).toBe('中午12:05')
  })

  it('时间条文本按东八区墙上时间渲染', () => {
    const 组 = fenZuXiaoXiAnShiJian([{ shi_jian_chuo: Date.UTC(2026, 9, 23, 12, 0, 0) }])
    expect(组[0].shiJian).toBe('晚上8:00')
  })

  it('跨天即使不足五分钟也另起一组', () => {
    const 昨夜 = Date.UTC(2026, 9, 22, 15, 58, 0)
    const 今晨 = Date.UTC(2026, 9, 22, 16, 2, 0)
    const 组 = fenZuXiaoXiAnShiJian([
      { shi_jian_chuo: 昨夜 },
      { shi_jian_chuo: 今晨 },
      { shi_jian_chuo: 今晨 + 4 * 60 * 1000 },
    ])
    expect(组).toHaveLength(2)
    expect(组[0].shiJian).toBe('昨天 晚上11:58')
    expect(组[0].xiaoXiLieBiao).toHaveLength(1)
    expect(组[1].shiJian).toBe('凌晨0:02')
    expect(组[1].xiaoXiLieBiao).toHaveLength(2)
  })

  it('时间戳倒序时另起一组，不并入上一组', () => {
    expect(fenZuXiaoXiAnShiJian([造(10 * 60 * 1000), 造(0)])).toHaveLength(2)
  })

  it('同一时间戳的多条消息合并到同一组', () => {
    expect(fenZuXiaoXiAnShiJian([造(0), 造(0)])).toHaveLength(1)
  })
})
