import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { use长按菜单 } from '@/composables/use长按菜单'
import { fenZuXiaoXiAnShiJian, geShiHuaXiaoXiShiJian } from '@/utils/消息时间分组'
import { huoQuFanYi } from '@/config/翻译表'
import { LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI } from '@/config/消息配置'

function 造触屏(x: number, y: number) {
  return { touches: [{ clientX: x, clientY: y }], changedTouches: [] } as unknown as TouchEvent
}

function 造右键(x: number, y: number) {
  return { clientX: x, clientY: y } as MouseEvent
}

function 假菜单盒(kuan: number, gao: number) {
  return {
    getBoundingClientRect: () => ({
      width: kuan,
      height: gao,
      top: 0,
      left: 0,
      right: kuan,
      bottom: gao,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  } as unknown as HTMLElement
}

function 造文本消息(id: string, neiRong: string) {
  return {
    id,
    nei_rong: neiRong,
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    fa_song_zhe_lei_xing: 'yonghu',
  }
}

function 挂长按菜单() {
  return use长按菜单({
    dangQianShiJian: ref(Date.now()),
    cheHuiXiaoXi: async () => undefined,
  })
}

describe('长按菜单两阶段实测定位', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('下方放得下时菜单摆在点击点下方，尾巴朝上且尖对点击点', () => {
    window.innerWidth = 390
    window.innerHeight = 844
    const quan = 挂长按菜单()
    quan.caiDanYuanSu.value = 假菜单盒(148, 159)
    quan.daKaiWenBenCaiDan(造文本消息('a', '在吗') as never, 造右键(200, 100))
    quan.dingGaoCaiDanWeiZhi()
    expect(quan.wenBenCaiDanZhanKai.value).toBe(true)
    expect(quan.caiDanDingWei.value.dingGao).toBe(true)
    expect(quan.caiDanDingWei.value.weiZhi).toBe('xia')
    expect(quan.caiDanDingWei.value.top).toBe(`${100 + LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanWeiBaJianGe}px`)
    expect(quan.caiDanDingWei.value.left).toBe(`${200 - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanWeiBaNeiSuo}px`)
    expect(quan.caiDanDingWei.value.weiBaX).toBe(`${LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanWeiBaNeiSuo}px`)
  })

  it('顶部放不下时翻转到点击点上方，尾巴朝下', () => {
    window.innerWidth = 390
    window.innerHeight = 300
    const quan = 挂长按菜单()
    quan.caiDanYuanSu.value = 假菜单盒(148, 159)
    quan.daKaiWenBenCaiDan(造文本消息('b', '在吗') as never, 造右键(200, 180))
    quan.dingGaoCaiDanWeiZhi()
    expect(quan.caiDanDingWei.value.weiZhi).toBe('shang')
    expect(quan.caiDanDingWei.value.top).toBe(`${180 - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanWeiBaJianGe - 159}px`)
    expect(quan.caiDanDingWei.value.left).toBe(`${200 - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanWeiBaNeiSuo}px`)
  })

  it('两侧都放不下时仍夹回视口内不溢出', () => {
    window.innerWidth = 320
    window.innerHeight = 480
    const quan = 挂长按菜单()
    quan.caiDanYuanSu.value = 假菜单盒(148, 159)
    quan.daKaiWenBenCaiDan(造文本消息('c', '好') as never, 造右键(319, 479))
    quan.dingGaoCaiDanWeiZhi()
    const { top, left, weiBaX } = quan.caiDanDingWei.value
    expect(quan.caiDanDingWei.value.weiZhi).toBe('shang')
    expect(parseFloat(top)).toBeGreaterThanOrEqual(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu)
    expect(parseFloat(top)).toBeLessThanOrEqual(480 - 159 - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu)
    expect(parseFloat(left)).toBeLessThanOrEqual(320 - 148 - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu)
    expect(parseFloat(left)).toBeGreaterThanOrEqual(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu)
    expect(parseFloat(weiBaX)).toBeLessThanOrEqual(148 - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanWeiBaNeiSuo)
  })

  it('右缘夹取时尾巴尖内缩对准点击点水平位置', () => {
    window.innerWidth = 390
    window.innerHeight = 844
    const quan = 挂长按菜单()
    quan.caiDanYuanSu.value = 假菜单盒(148, 159)
    quan.daKaiWenBenCaiDan(造文本消息('d', '长文本') as never, 造右键(380, 400))
    quan.dingGaoCaiDanWeiZhi()
    expect(quan.caiDanDingWei.value.left).toBe(`${390 - 148 - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanBianJu}px`)
    expect(quan.caiDanDingWei.value.weiBaX).toBe(`${148 - LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanWeiBaNeiSuo}px`)
  })

  it('两阶段：打开先隐藏占位，渲染实测后才定稿', async () => {
    window.innerWidth = 390
    window.innerHeight = 844
    const zhenDuiLie: FrameRequestCallback[] = []
    vi.stubGlobal(
      'requestAnimationFrame',
      (huiDiao: FrameRequestCallback) => (zhenDuiLie.push(huiDiao), zhenDuiLie.length),
    )
    vi.stubGlobal('cancelAnimationFrame', () => undefined)
    const quan = 挂长按菜单()
    quan.caiDanYuanSu.value = 假菜单盒(148, 159)
    quan.chuMoKaiShiWenBen(造文本消息('e', '在吗') as never, 造触屏(200, 400))
    expect(quan.wenBenCaiDanZhanKai.value).toBe(false)
    vi.advanceTimersByTime(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao + 20)
    expect(quan.wenBenCaiDanZhanKai.value).toBe(true)
    expect(quan.caiDanDingWei.value.dingGao).toBe(false)
    expect(quan.caiDanDingWei.value.top).toBe(`${400 + LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanWeiBaJianGe}px`)
    await nextTick()
    expect(zhenDuiLie.length).toBeGreaterThan(0)
    zhenDuiLie.splice(0).forEach((huiDiao) => huiDiao(0))
    expect(quan.caiDanDingWei.value.dingGao).toBe(true)
    expect(quan.caiDanDingWei.value.top).toBe(`${400 + LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanWeiBaJianGe}px`)
    expect(quan.caiDanDingWei.value.weiZhi).toBe('xia')
  })

  it('菜单元素缺失时兜底可见，不留在隐藏态', () => {
    window.innerWidth = 390
    window.innerHeight = 844
    const quan = 挂长按菜单()
    quan.daKaiWenBenCaiDan(造文本消息('f', '在吗') as never, 造右键(200, 400))
    quan.dingGaoCaiDanWeiZhi()
    expect(quan.caiDanDingWei.value.dingGao).toBe(true)
  })
})

describe('长按菜单通道去重与取消', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('Android 双通道：长按打开后窗口期内 contextmenu 不再重复打开', () => {
    window.innerWidth = 390
    window.innerHeight = 844
    const quan = 挂长按菜单()
    quan.caiDanYuanSu.value = 假菜单盒(148, 159)
    quan.chuMoKaiShiTuPian(
      { id: 'g', nei_rong: '', lei_xing: 'tuPian', shi_jian_chuo: Date.now(), fa_song_zhe_lei_xing: 'yonghu' } as never,
      造触屏(50, 60),
    )
    vi.advanceTimersByTime(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao + 20)
    expect(quan.tuPianCaiDanZhanKai.value).toBe(true)
    quan.dingGaoCaiDanWeiZhi()
    const yuanDingWei = { ...quan.caiDanDingWei.value }
    quan.daKaiTuPianCaiDan(
      { id: 'g', nei_rong: '', lei_xing: 'tuPian', shi_jian_chuo: Date.now(), fa_song_zhe_lei_xing: 'yonghu' } as never,
      造右键(300, 300),
    )
    expect(quan.caiDanDingWei.value).toEqual(yuanDingWei)
    vi.advanceTimersByTime(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.youJianQuChongHaoMiao + 20)
    quan.daKaiTuPianCaiDan(
      { id: 'g', nei_rong: '', lei_xing: 'tuPian', shi_jian_chuo: Date.now(), fa_song_zhe_lei_xing: 'yonghu' } as never,
      造右键(300, 300),
    )
    expect(quan.caiDanDingWei.value.dingGao).toBe(false)
    expect(quan.caiDanDingWei.value.top).toBe(`${300 + LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.caiDanWeiBaJianGe}px`)
  })

  it('touchmove 位移超过阈值才取消长按计时', () => {
    window.innerWidth = 390
    window.innerHeight = 844
    const quan = 挂长按菜单()
    const xiaoXi = 造文本消息('h', '在吗') as never
    quan.chuMoKaiShiWenBen(xiaoXi, 造触屏(100, 100))
    quan.chuMoYiDongQuXiao(造触屏(105, 105))
    vi.advanceTimersByTime(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao + 20)
    expect(quan.wenBenCaiDanZhanKai.value).toBe(true)
    quan.guanBiCaiDan()
    quan.chuMoKaiShiWenBen(xiaoXi, 造触屏(100, 100))
    quan.chuMoYiDongQuXiao(造触屏(111, 100))
    vi.advanceTimersByTime(LIAO_TIAN_YOU_JIAN_CAI_DAN_PEI_ZHI.changAnChuFaHaoMiao + 20)
    expect(quan.wenBenCaiDanZhanKai.value).toBe(false)
  })

  it('打开期间窗口尺寸变化直接关闭菜单', () => {
    window.innerWidth = 390
    window.innerHeight = 844
    const quan = 挂长按菜单()
    quan.daKaiWenBenCaiDan(造文本消息('i', '在吗') as never, 造右键(200, 400))
    expect(quan.wenBenCaiDanZhanKai.value).toBe(true)
    window.dispatchEvent(new Event('resize'))
    expect(quan.wenBenCaiDanZhanKai.value).toBe(false)
  })
})

describe('长按菜单视觉与皮肤接线契约', () => {
  const 读视图 = (文件: string): string => readFileSync(resolve(__dirname, '../views', 文件), 'utf8')

  it('两页菜单都挂共享尾巴组件，不自绘三角不复刻侧向类', () => {
    for (const [文件, 块数] of [
      ['聊天页面.vue', 4],
      ['好友聊天.vue', 3],
    ] as const) {
      const 源 = 读视图(文件)
      expect(源).toContain("import QiPaoWeiBa from '@/components/聊天/气泡尾巴.vue'")
      expect(源.match(/<QiPaoWeiBa /g)).toHaveLength(块数)
      expect(源).not.toContain('clip-path')
      expect(源).not.toContain('qipao-weiba--')
    }
  })

  it('Teleport 断开级联：皮肤变量与尾巴驱动量经菜单根内联下发', () => {
    for (const 文件 of ['聊天页面.vue', '好友聊天.vue']) {
      const 源 = 读视图(文件)
      expect(源).toContain("'--qipao-caidan-weiba-x'")
      expect(源).toContain("'--qipao-weiba-tian-chong'")
      expect(源).toContain("'--qipao-nei-rong-bei-jing'")
    }
  })

  it('菜单样式走气泡同款变量与令牌层级，估算定位常量已删除', () => {
    const 样式源 = readFileSync(resolve(__dirname, '../styles/liao-tian-qi-pao.css'), 'utf8')
    expect(样式源).toContain('z-index: var(--ceng-caidan)')
    expect(样式源).toContain('background: var(--qipao-nei-rong-bei-jing, var(--chehui-caidan-beijing))')
    expect(样式源).toContain('border-radius: var(--qipao-yuanjiao, 12px)')
    expect(样式源).toContain('min-height: 44px')
    expect(样式源).not.toContain('1500')
    const 配置源 = readFileSync(resolve(__dirname, '../config/消息配置.ts'), 'utf8')
    expect(配置源).not.toContain('caiDanYuGuKuan')
    expect(配置源).not.toContain('caiDanYuGuGao')
    expect(配置源).not.toContain('caiDanXiaFangPianYi')
  })

  it('iOS 长按目标禁系统预览：消息行组件内声明 touch-callout 与 user-select', () => {
    const 行源 = readFileSync(resolve(__dirname, '../components/聊天/消息行.vue'), 'utf8')
    expect(行源).toContain('-webkit-touch-callout: none')
    expect(行源).toContain('user-select: none')
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
