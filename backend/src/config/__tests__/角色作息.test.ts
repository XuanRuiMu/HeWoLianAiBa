import { describe, it, expect } from 'vitest'
import { tuiDuanZuoXi, panDuanZuoXi, XING_QING_SHI_JIAN_LEI_XING } from '../../config/角色作息'
import { duShiChaXiaShi } from '../../config/时区'

/**
 * 角色作息（第十七轮）。
 *
 * 用户定稿：「完全模拟现实」+「凌晨 4 点发消息，大部分人应该是睡着的状态，
 * 所以不应该回复，应该根据人设，等某个时间再回复」。
 *
 * 改造前的真实缺陷：`AI回复调度器.回复延迟毫秒` 默认 10 秒 ⇒ 凌晨 4 点用户发消息，
 * AI **10 秒后就回** —— 那不是人，那是随时在线的机器。
 */

describe('作息 · 现实依据', () => {
  it('《2025中国社交平台行为观察报告》：22 点后聊天量断崖下跌 ⇒ 早睡型凌晨在睡', () => {
    for (const xiaoShi of [0, 1, 2, 3, 4, 4.9]) {
      expect(panDuanZuoXi(xiaoShi, 'zaoShui').shiFuZhe, `${xiaoShi} 点早睡型应当睡着`).toBe(true)
    }
    // 22 点后基本也睡了
    expect(panDuanZuoXi(23.8, 'zaoShui').shiFuZhe).toBe(true)
  })

  it('白天正常时段是醒着的（不能把「作息」做成「大半时间都在睡」）', () => {
    for (const xiaoShi of [8, 12, 14, 18, 20, 22.9]) {
      expect(panDuanZuoXi(xiaoShi, 'zaoShui').shiFuZhe, `${xiaoShi} 点早睡型应当醒着`).toBe(false)
    }
  })

  it('熬夜型是真实存在的一类人（写论文/做设计的/程序员）', () => {
    // 熬夜型清醒窗口 11:00 – 次日 2:00
    expect(panDuanZuoXi(13, 'wanShui').shiFuZhe).toBe(false)
    expect(panDuanZuoXi(1, 'wanShui').shiFuZhe, '熬夜型凌晨 1 点仍在冲浪').toBe(false)
    expect(panDuanZuoXi(4, 'wanShui').shiFuZhe, '熬夜型凌晨 4 点该睡了').toBe(true)
    expect(panDuanZuoXi(9, 'wanShui').shiFuZhe).toBe(true)
  })

  it('不定型（自由职业/失眠）：几乎全天可能醒着', () => {
    expect(panDuanZuoXi(10.5, 'buZeGui').shiFuZhe).toBe(false)
    expect(panDuanZuoXi(20, 'buZeGui').shiFuZhe).toBe(false)
    expect(panDuanZuoXi(23.5, 'buZeGui').shiFuZhe).toBe(false)
  })

  it('睡着的等待时长 = 到起床时间，且为正数', () => {
    const p4 = panDuanZuoXi(4, 'zaoShui')
    expect(p4.shiFuZhe).toBe(true)
    expect(p4.qiXingXiaoShi).toBe(XING_QING_SHI_JIAN_LEI_XING.zaoShui.qi)
    // 4 点到 7:30 ≈ 3.5 小时
    expect(p4.dengDaiMiaoShu / 3600_000).toBeCloseTo(3.5, 1)
    expect(p4.dengDaiMiaoShu).toBeGreaterThan(0)
    // 睡过头（已经过了起床点）也要给出正数等待，不能是负的
    expect(panDuanZuoXi(23.9, 'zaoShui').dengDaiMiaoShu).toBeGreaterThan(0)
    expect(panDuanZuoXi(2, 'zaoShui').dengDaiMiaoShu).toBeGreaterThan(0)
  })

  it('醒着时等待时长为 0（不额外延后）', () => {
    expect(panDuanZuoXi(14, 'zaoShui').dengDaiMiaoShu).toBe(0)
  })

  it('跨午夜与跨天边界的整数/小数小时都判对', () => {
    expect(panDuanZuoXi(0, 'zaoShui').shiFuZhe).toBe(true)
    expect(panDuanZuoXi(24, 'zaoShui').shiFuZhe, '24 点等同 0 点').toBe(true)
    expect(panDuanZuoXi(25, 'zaoShui').shiFuZhe, '25 点等同 1 点').toBe(true)
    // 负数小时按环回：−1 ⇒ 23 点，早睡型 23 点确实还醒着（睡点在 23:30）
    expect(panDuanZuoXi(-1, 'zaoShui').shiFuZhe, '−1 点环回成 23 点，早睡型此时还醒着').toBe(false)
    // 环回到睡着区间时，等待仍必须是正数（否则调度器会立刻触发）
    expect(panDuanZuoXi(-6.2, 'zaoShui').shiFuZhe, '−6.2 环回成 17:50，醒着').toBe(false)
    expect(panDuanZuoXi(-20, 'zaoShui').shiFuZhe, '−20 环回成 4 点，睡着').toBe(true)
    expect(panDuanZuoXi(-20, 'zaoShui').dengDaiMiaoShu).toBeGreaterThan(0)
  })
})

describe('作息 · 从人设推断，不从 MBTI 推断', () => {
  it('文本里明写熬夜 ⇒ 熬夜型', () => {
    expect(tuiDuanZuoXi('经常熬夜写论文到凌晨三点')).toBe('wanShui')
    expect(tuiDuanZuoXi('作息不规律，失眠是常事')).toBe('buZeGui')
    expect(tuiDuanZuoXi('自由职业，作息随意')).toBe('buZeGui')
  })

  it('普通学生 ⇒ 默认早睡早起', () => {
    expect(tuiDuanZuoXi('北方城市出来的大二学生，宿舍四个人天天开黑')).toBe('zaoShui')
  })

  it('⚠️ 绝不因为「内向」就判定睡得早（那是没有依据的刻板印象）', () => {
    // 一个 I 型、但明写熬夜的人，必须判成熬夜型。
    // 「内向=睡得早」在现实里不成立，夜猫子里外向的比比皆是。
    expect(tuiDuanZuoXi('内向，不爱说话，但熬夜是常态，常弄到四五点')).toBe('wanShui')
  })
})

describe('时区 · 当地时间而非服务器时间', () => {
  it('境内 16 城偏移为 0', () => {
    for (const c of ['北京', '上海', '广州', '深圳', '杭州', '成都', '厦门']) {
      expect(duShiChaXiaShi(c), `${c} 属境内`).toBe(0)
    }
  })

  it('境外按固定偏移（中国 UTC+8 ⇒ 纽约 −5）', () => {
    expect(duShiChaXiaShi('纽约')).toBe(-5)
    expect(duShiChaXiaShi('洛杉矶')).toBe(-8)
    expect(duShiChaXiaShi('伦敦')).toBe(0)
    expect(duShiChaXiaShi('东京')).toBe(9)
  })

  it('⚠️ 未知城市不猜（返回 0，按境内处理），绝不用错误相关性推断', () => {
    expect(duShiChaXiaShi('火星')).toBe(0)
    expect(duShiChaXiaShi('')).toBe(0)
    expect(duShiChaXiaShi('纽约(New York)')).toBe(-5)
  })
})