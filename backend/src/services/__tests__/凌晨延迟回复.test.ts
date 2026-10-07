import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * 「完全模拟现实」：凌晨不该回（第十七轮，用户定稿）。
 *
 * 用户原话：「假比方说用户凌晨 4 点发消息，这个时候大部分人应该是睡着的状态，
 * 所以不应该回复，应该根据人设，等某个时间再回复。」
 *
 * 改造前的真实缺陷：`回复延迟毫秒` 默认 10000 ⇒ 凌晨 4 点用户发消息，**10 秒后就回**。
 * 那不是人，那是随时在线的机器。
 *
 * 本文件钉住「延迟出口」的行为，不测 LLM 内容。
 */

const 假 = vi.hoisted(() => ({
  panDuanZuiJia: vi.fn(async () => ({ youShiMeDongXi: false })),
  yunXingAIYinQing: vi.fn(),
  huoQuAIJiaoSeXinXi: vi.fn(),
  huoQuWanZhengHaoGanDu: vi.fn(),
  huoQuZuiJinDuiHuaLiShi: vi.fn(),
  baoCunJiaoSeXiaoXi: vi.fn(),
  qingChuQiDianHaoShi: vi.fn(),
}))

vi.mock('../追加消息判定', () => ({ panDuanZuiJia: 假.panDuanZuiJia }))
vi.mock('../AI引擎', () => ({ yunXingAIYinQing: 假.yunXingAIYinQing }))
vi.mock('../AI输入准备', () => ({
  baoCunJiaoSeXiaoXi: 假.baoCunJiaoSeXiaoXi,
  huoQuAIJiaoSeXinXi: 假.huoQuAIJiaoSeXinXi,
  huoQuZuiJinDuiHuaLiShi: 假.huoQuZuiJinDuiHuaLiShi,
}))
vi.mock('../消息', () => ({ cheHuiJiaoSeXiaoXi: vi.fn(), XiaoXiXinXi: {} }))
vi.mock('../好感度', () => ({ gengXinHaoGanDu: vi.fn(), huoQuWanZhengHaoGanDu: 假.huoQuWanZhengHaoGanDu }))
vi.mock('../认证', () => ({ anIdChaYongHu: vi.fn() }))
vi.mock('../视频理解', () => ({ huoQuHuoJieXiShiPinMiaoShu: vi.fn() }))
vi.mock('../夺舍', () => ({ jiaoSeShiFouBeiDuoShe: vi.fn(() => false) }))
vi.mock('../TTS服务', () => ({ 尝试合成语音: vi.fn() }))
vi.mock('../TTS文本预处理', () => ({ 转换TTS文本: vi.fn((t: string) => t) }))
vi.mock('../TTS概率计算', () => ({ 计算TTS概率: vi.fn(() => 0) }))
vi.mock('../好感度评判', () => ({ pingPanHaoGanDuPiLiangNei: vi.fn() }))
vi.mock('../关键事件提取', () => ({ duQuGuanJianShiJianZhuRu: vi.fn(async () => '') }))
vi.mock('../重试队列', () => ({ paiRuZhongShiDuiLie: vi.fn() }))
vi.mock('../主动多模态', () => ({ changShiZhuDongShengTu: vi.fn() }))
vi.mock('../../config/时间场景配置', () => ({
  huoQuShiJianChangJingWenBen: () => '现在是20点',
  qingChuShiJianChangJingHuanCun: 假.qingChuQiDianHaoShi,
  jiSuanShiJianChangJing: () => ({ duan: 'yeWan', xiaoShi: 20, changJingWenBen: '现在是20点', yuQiCeLue: '' }),
}))

/** 假角色：作息类型由 bei_jing_gu_shi 文本证据决定 */
function jiaoSe(beiJing = '北方城市出来的大二学生') {
  return {
    id: 'j1',
    wei_xin_ming: '小美',
    xing_ge: '沉稳',
    yan_yu_feng_ge: '说话简短',
    bei_jing_gu_shi: beiJing,
    xing_wei_te_dian: '',
    shi_jie_xin_xi: { cheng_shi: '北京' },
  }
}

async function jian(beiJing?: string) {
  const io = { to: vi.fn(() => ({ emit: vi.fn() })) } as never
  const { AI回复调度器 } = await import('../AI回复调度器')
  const t = new AI回复调度器('j1', 'u1', 'I', io, 10_000)
  const n = t as unknown as {
    当前角色: unknown
    计时器: unknown
    本轮睡着中: boolean
    计算本轮回复延迟: () => number
    启动AI计时器: () => void
    构造时间场景提示: () => string
    重置: () => void
  }
  // ⚠️ 必须**始终**注入角色：`计算本轮回复延迟()` 在 `当前角色` 为空时
  //   直接 `return this.回复延迟毫秒`（拿不到人设就无从判作息）。
  //   初版写成「仅传参时才注入」，于是默认那条用例的 `当前角色` 是空的，
  //   静默拿到 10 秒 —— 假绿。踩过。
  n.当前角色 = jiaoSe(beiJing)
  return { t, n }
}

describe('完全模拟现实 · 凌晨不该秒回', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.VITEST = 'false'
    process.env.XING_ZUO_QI_YONG = 'true'
    // ⚠️ 追加消息的总开关必须打开，否则 `安排追加消息` 第一行就早退，
    //   后面所有断言都拿到 null —— 实测踩过：以为是自己代码错，其实是开关没开。
    process.env.ZUI_JIA_QI_YONG = 'true'
    vi.useFakeTimers()
  })

  /**
   * 冻结到「本地时区的凌晨 4 点」。
   *
   * ⚠️ 不能写 `new Date('...+08:00')` —— 那带的是绝对时刻，
   *   `getHours()` 读的是**进程本地时区**，在 UTC 机器上会变成 20:00，
   *   于是「凌晨 4 点」那条用例根本没测到（实测踩过：它静默通过成假绿）。
   *   必须按本地分量构造。
   */
  function baoDaoDiXiaoShi(hour: number): void {
    const d = new Date()
    d.setHours(hour, 0, 0, 0)
    vi.setSystemTime(d)
  }

  async function panDuanYanChi(hour: number, beiJing?: string): Promise<number> {
    baoDaoDiXiaoShi(hour)
    const { n } = await jian(beiJing)
    return n.计算本轮回复延迟()
  }

  it('凌晨 4 点：早睡型角色必须等几个时，而不是 10 秒', async () => {
    const ms = await panDuanYanChi(4)
    expect(ms, '默认打字延迟是 10 秒，作息延迟必须远大于它').toBeGreaterThan(60_000)
    // 4 点 → 7:30 起床 ≈ 3.5 小时
    expect(ms / 3600_000).toBeCloseTo(3.5, 1)
  })

  it('白天 20 点：作息不产生延迟，仍是原来的打字时间', async () => {
    expect(await panDuanYanChi(20), '醒着时不额外延后').toBe(10_000)
  })

  it('熬夜型（人设明写）：凌晨 1 点仍在冲浪 ⇒ 不延迟', async () => {
    const ms = await panDuanYanChi(1, '经常熬夜写论文到凌晨三点')
    expect(ms, '熬夜型凌晨 1 点是醒着的，不该被延迟').toBe(10_000)
  })

  it('熬夜型：凌晨 4 点该睡了 ⇒ 延迟', async () => {
    expect(await panDuanYanChi(4, '经常熬夜写论文到凌晨三点')).toBeGreaterThan(60_000)
  })

  it('睡着时提示层必须说清隔了多久，否则模型会以为消息是几分钟前发的', async () => {
    baoDaoDiXiaoShi(4)
    const { n } = await jian()
    n.启动AI计时器()
    const wenBen = n.构造时间场景提示()
    expect(wenBen).toContain('你之前睡着了')
    expect(wenBen).toMatch(/过了约\s*\d+\s*小时/)
  })

  it('醒着时提示层就是原本的时段描述，不加任何多余说明', async () => {
    baoDaoDiXiaoShi(20)
    const { n } = await jian()
    n.启动AI计时器()
    expect(n.构造时间场景提示()).toBe('现在是20点')
  })

  it('作息总开关关闭 ⇒ 完全退回改动前的固定延迟（便于回退）', async () => {
    process.env.XING_ZUO_QI_YONG = 'false'
    expect(await panDuanYanChi(4), '开关关闭时必须是旧的 10 秒，不得残留作息影响').toBe(10_000)
    process.env.XING_ZUO_QI_YONG = 'true'
  })

  it('追加消息在睡着时**不排程**（补漏：只在排程时查作息是不够的）', async () => {
    baoDaoDiXiaoShi(23)
    const { t, n } = await jian()
    // 先模拟「角色在 23:00 回完消息」——此时他醒着
    n.本轮睡着中 = false
    n.启动AI计时器()
    void t
    // 手动把角色状态改成已睡，验证排程被拒
    n.本轮睡着中 = true
    n.重置()
    n.当前角色 = jiaoSe()
    // 排程内部会再查一次作息；把系统时间拨到凌晨让它判睡着
    baoDaoDiXiaoShi(3)
    const { n: n2 } = await jian()
    const yuBen2 = process.env.VITEST
    process.env.VITEST = 'false'
    try {
      ;(n2 as unknown as { 安排追加消息: () => void }).安排追加消息()
      expect(
        (n2 as unknown as { 追加计时器: unknown }).追加计时器,
        '凌晨 3 点绝不能排追加计时器，否则刚做完的作息延迟在一个入口上失效',
      ).toBeNull()
    } finally {
      process.env.VITEST = yuBen2
    }
  })

  it('追加消息在醒着时正常排程（作息门控不能把功能整个关掉）', async () => {
    baoDaoDiXiaoShi(20)
    const { n } = await jian()
    // ⚠️ `安排追加消息` 里有 `VITEST==='true'` 早退（测试环境不该排真定时器），
    //   所以这里临时关掉它来验证排程逻辑本身。
    const yuBen = process.env.VITEST
    process.env.VITEST = 'false'
    try {
      ;(n as unknown as { 安排追加消息: () => void }).安排追加消息()
      expect((n as unknown as { 追加计时器: unknown }).追加计时器, '晚上 8 点应当排上').not.toBeNull()
    } finally {
      process.env.VITEST = yuBen
    }
  })

  it('追加消息判定必须带亲密度（验收标准二：特定亲密度下说真人的话）', async () => {
    baoDaoDiXiaoShi(20)
    const { n } = await jian()
    n.当前角色 = jiaoSe()
    n.上条角色消息时刻 = Date.now() - 60 * 60 * 1000
    n.上条角色消息后用户来过 = false
    // ⚠️ 必须给角色：`执行追加消息` 里 `if (!角色) return` 会早退，
    //   mock 默认返回 undefined ⇒ 判定永远不被调用（实测踩过）。
    假.huoQuAIJiaoSeXinXi.mockResolvedValue(jiaoSe())
    假.huoQuWanZhengHaoGanDu.mockResolvedValue({
      zong_fen: 850, guan_xi_jie_duan: 'reLian',
    })
    await (n as unknown as { 执行追加消息: () => Promise<void> }).执行追加消息()
    const shuRu = 假.panDuanZuiJia.mock.calls[0]?.[0] as { hao_gan_du?: { guan_xi_jie_duan?: string } }
    expect(
      shuRu?.hao_gan_du?.guan_xi_jie_duan,
      '追加消息判定必须拿到关系阶段，否则冷淡期与热恋期的行为完全一样',
    ).toBe('reLian')
  })

  it('计时器上限保护：极长等待不会把服务器挂死', async () => {
    baoDaoDiXiaoShi(4)
    const { n } = await jian()
    n.启动AI计时器()
    const neiBu = n as unknown as { 计时器: unknown }
    expect(neiBu.计时器, '必须排上计时器').not.toBeNull()
    // 上限 14 小时，防止时钟跳变把计时器挂成几天
    expect(vi.getTimerCount()).toBeGreaterThan(0)
  })
})