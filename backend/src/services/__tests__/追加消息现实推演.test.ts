import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * 追加消息（第十五轮）：现实推演驱动的行为契约。
 *
 * 现实依据（`追加消息推演.mts` 跑完 20,000 段真人语料）：
 *   语料里找不到「对方长时间不回」的样本；形态 A 命中的 47 段直读后确认
 *   **绝大多数不是催**（`严不严重`→`算严重` 等都是对方正常回话）。
 *   ⇒ 触发条件不是「用户没回就催」，而是「角色此刻正好有别的事想说」。
 *
 * 本文件钉住三条不变量：
 *   ① 用户发过新消息 ⇒ 追加消息**必须作废**（否则是抢话）
 *   ② 判定为「没有别的事」⇒ **完全不产生任何输出**（静默即正确行为）
 *   ③ 任何失败 ⇒ **不得产生任何用户可见文本**（追加是可选增强）
 */

const 假 = vi.hoisted(() => ({
  panDuanZuiJia: vi.fn(),
  yunXingAIYinQing: vi.fn(),
  huoQuAIJiaoSeXinXi: vi.fn(),
  huoQuWanZhengHaoGanDu: vi.fn(),
  huoQuZuiJinDuiHuaLiShi: vi.fn(),
  baoCunJiaoSeXiaoXi: vi.fn(),
  tongJiSocketShiJian: vi.fn(),
  faSongSystem: vi.fn(),
  yingYongHuiDuCanShu: vi.fn((_m, j) => j),
}))

vi.mock('../追加消息判定', () => ({ panDuanZuiJia: 假.panDuanZuiJia }))
vi.mock('../AI引擎', () => ({ yunXingAIYinQing: 假.yunXingAIYinQing }))
vi.mock('../好感度', () => ({
  gengXinHaoGanDu: vi.fn(),
  huoQuWanZhengHaoGanDu: 假.huoQuWanZhengHaoGanDu,
}))
// ⚠️ 三个数据入口 `baoCunJiaoSeXiaoXi` / `huoQuAIJiaoSeXinXi` / `huoQuZuiJinDuiHuaLiShi`
//    **全部来自 `./AI输入准备`**（不是 `./消息`、不是 `./角色档案`）。
//    mock 打错模块 ⇒ 打真库 ⇒ 990ms 网络超时 + 三个 mock 调用数全是 0，
//    表现为「判定根本没发生」。踩过两次才定位。
vi.mock('../AI输入准备', () => ({
  baoCunJiaoSeXiaoXi: 假.baoCunJiaoSeXiaoXi,
  huoQuAIJiaoSeXinXi: 假.huoQuAIJiaoSeXinXi,
  huoQuZuiJinDuiHuaLiShi: 假.huoQuZuiJinDuiHuaLiShi,
}))
vi.mock('../消息', () => ({
  cheHuiJiaoSeXiaoXi: vi.fn(),
  XiaoXiXinXi: {},
}))
vi.mock('../认证', () => ({ anIdChaYongHu: vi.fn() }))
vi.mock('../视频理解', () => ({ huoQuHuoJieXiShiPinMiaoShu: vi.fn() }))
vi.mock('../夺舍', () => ({ jiaoSeShiFouBeiDuoShe: vi.fn(() => false) }))
vi.mock('../TTS服务', () => ({ 尝试合成语音: vi.fn() }))
vi.mock('../TTS文本预处理', () => ({ 转换TTS文本: vi.fn((t) => t) }))
vi.mock('../TTS概率计算', () => ({ 计算TTS概率: vi.fn(() => 0) }))
vi.mock('../情感分析', () => ({}))
vi.mock('../好感度评判', () => ({ pingPanHaoGanDuPiLiangNei: vi.fn() }))
vi.mock('../关键事件提取', () => ({ duQuGuanJianShiJianZhuRu: vi.fn(() => '') }))
vi.mock('../重试队列', () => ({ paiRuZhongShiDuiLie: vi.fn() }))
vi.mock('../主动多模态', () => ({ changShiZhuDongShengTu: vi.fn() }))
vi.mock('../../config/时间场景配置', () => ({ huoQuShiJianChangJingWenBen: () => '晚上' }))

const 角色 = { id: 'j1', wei_xin_ming: '小美', xing_ge: '沉稳', yan_yu_feng_ge: '说话简短' } as never

/**
 * 直接构造调度器并暴露内部方法做单测（不跑真实 socket）。
 *
 * ⚠️ `安排追加消息` 里有 `process.env.VITEST === 'true'` 的早退（生产里测试环境不该排定时器），
 *   所以测试**不经过它**，直接调用 `执行追加消息` —— 被测行为是执行端的契约。
 *   计时器的清理另有 `重置()` 那条用例覆盖。
 */
async function xingJian() {
  const emit = vi.fn()
  const io = { to: vi.fn(() => ({ emit })) } as never
  const { AI回复调度器 } = await import('../AI回复调度器')
  const tiaoDuQi = new AI回复调度器('j1', 'u1', 'I', io, 1)
  const neiBu = tiaoDuQi as unknown as {
    当前角色: unknown
    上条角色消息时刻: number
    上条角色消息后用户来过: boolean
    执行追加消息: () => Promise<void>
  }
  neiBu.当前角色 = 角色
  neiBu.上条角色消息时刻 = Date.now() - 30 * 60 * 1000
  neiBu.上条角色消息后用户来过 = false
  return { tiaoDuQi, neiBu, emit }
}

describe('追加消息 · 现实推演契约', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ZUI_JIA_QI_YONG = 'true'
    process.env.VITEST = 'false'
    假.huoQuAIJiaoSeXinXi.mockResolvedValue(角色)
    假.huoQuWanZhengHaoGanDu.mockResolvedValue({ zong_fen: 500, guan_xi_jie_duan: 'shuXi' })
    假.huoQuZuiJinDuiHuaLiShi.mockResolvedValue([])
    假.baoCunJiaoSeXiaoXi.mockResolvedValue({ id: 'm1' })
  })

  it('判定为「没有别的事」⇒ 静默，一次 Writer 都不该调', async () => {
    假.panDuanZuiJia.mockResolvedValue({ youShiMeDongXi: false })
    const { neiBu } = await xingJian()
    await neiBu.执行追加消息()
    expect(假.panDuanZuiJia, '判定必须发生').toHaveBeenCalledTimes(1)
    expect(假.yunXingAIYinQing, '判定为没有 ⇒ 不得调 Writer').not.toHaveBeenCalled()
    expect(假.baoCunJiaoSeXiaoXi, '不得落库').not.toHaveBeenCalled()
  })

  it('判定为「有事」⇒ 送模文本是那件事，且走 Writer 后落库推送', async () => {
    假.panDuanZuiJia.mockResolvedValue({ youShiMeDongXi: true, shuoDeShi: '刚看到一只猫摔进纸箱' })
    假.yunXingAIYinQing.mockResolvedValue({ xiao_xi_lie_biao: ['笑死'], shi_fou_hui_fu: true })
    const { neiBu } = await xingJian()
    await neiBu.执行追加消息()
    const shuRu = 假.yunXingAIYinQing.mock.calls[0][0] as { yong_hu_xin_xiao_xi: string }
    expect(shuRu.yong_hu_xin_xiao_xi, '追加消息要接的是「那件事」，不是回应用户').toBe('刚看到一只猫摔进纸箱')
    expect(假.baoCunJiaoSeXiaoXi).toHaveBeenCalledTimes(1)
  })

  it('用户在此期间发过消息 ⇒ 直接作废，连判定都不该发生（防抢话）', async () => {
    const { neiBu } = await xingJian()
    neiBu.上条角色消息后用户来过 = true
    await neiBu.执行追加消息()
    expect(假.panDuanZuiJia, '用户已接上话 ⇒ 连判定都不该烧 token').not.toHaveBeenCalled()
    expect(假.yunXingAIYinQing).not.toHaveBeenCalled()
  })

  it('判定「有事」但内容为空 ⇒ 当作没有（不硬编）', async () => {
    假.panDuanZuiJia.mockResolvedValue({ youShiMeDongXi: true, shuoDeShi: '' })
    const { neiBu } = await xingJian()
    await neiBu.执行追加消息()
    expect(假.yunXingAIYinQing).not.toHaveBeenCalled()
  })

  it('判定抛错 ⇒ 静默降级，绝不打扰用户', async () => {
    假.panDuanZuiJia.mockRejectedValue(new Error('boom'))
    const { neiBu } = await xingJian()
    await expect(neiBu.执行追加消息()).resolves.toBeUndefined()
    expect(假.baoCunJiaoSeXiaoXi).not.toHaveBeenCalled()
  })

  it('Writer 输出空 ⇒ 不推送任何东西', async () => {
    假.panDuanZuiJia.mockResolvedValue({ youShiMeDongXi: true, shuoDeShi: '有件事想说' })
    假.yunXingAIYinQing.mockResolvedValue({ xiao_xi_lie_biao: [], shi_fou_hui_fu: false })
    const { neiBu } = await xingJian()
    await neiBu.执行追加消息()
    expect(假.baoCunJiaoSeXiaoXi).not.toHaveBeenCalled()
  })

it('追加间隔按性格分档（依恋类型实证），且不决定发不发', async () => {
    const { tiaoDuQi } = await xingJian()
    const ji = (tiaoDuQi as unknown as { 计算追加间隔: () => number }).计算追加间隔.bind(tiaoDuQi)
    const she = (ie: 'I' | 'E', re: string) => {
      ;(tiaoDuQi as unknown as { 当前角色: unknown }).当前角色 = {
        ...角色,
        ie_lei_xing: ie,
        re_shen_lei_xing: re,
      }
      return ji()
    }
    // 依恋类型研究：主动频率随性格变化 ⇒ 一刀切会把 16 型压平
    expect(she('E', '快热'), '外向+快热应当最短').toBeLessThan(she('E', '慢热')!)
    expect(she('E', '快热')).toBeLessThan(she('I', '快热')!)
    expect(she('I', '慢热'), '内向+慢热应当最长').toBeGreaterThan(she('I', '快热')!)
    // 环境变量可覆盖（灰度与测试需要）
    process.env.ZUI_JIA_DENG_DAI_HAO_MIAO = '7'
    expect(ji(), '环境变量必须能覆盖分档').toBe(7)
    delete process.env.ZUI_JIA_DENG_DAI_HAO_MIAO
  })

it('重置() ⇒ 追加计时器必须被清掉（用户新消息让追加作废）', async () => {
    const { tiaoDuQi } = await xingJian()
    const neiBu = tiaoDuQi as unknown as { 追加计时器: NodeJS.Timeout | null }
    // 手动排一个追加计时器，验证重置会清掉它
    neiBu.追加计时器 = setTimeout(() => undefined, 60_000)
    expect(neiBu.追加计时器, '前置：计时器已排上').not.toBeNull()
    tiaoDuQi.重置()
    expect(neiBu.追加计时器, '重置必须清掉追加计时器，否则会抢话').toBeNull()
  })
})