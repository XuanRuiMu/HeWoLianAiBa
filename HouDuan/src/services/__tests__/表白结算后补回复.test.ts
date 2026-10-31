import { describe, it, expect, vi, beforeEach } from 'vitest'

const 结算返回 = { zhi: null as null | Record<string, unknown> }

vi.mock('../../services/胜利失败条件', () => ({
  jianCeYongHuXiaoXiBingChuLi: vi.fn(async () => 结算返回.zhi),
  chuLiAIHuiFuHouJieShuJianCha: vi.fn(async () => null),
  chuLiYouXiJieShu: vi.fn(),
}))

vi.mock('../../services/AI输入准备', () => ({
  huoQuAIJiaoSeXinXi: vi.fn(async () => ({ jiao_se_id: 'j-1' })),
  huoQuZuiJinDuiHuaLiShi: vi.fn(async () => []),
  baoCunJiaoSeXiaoXi: vi.fn(async () => undefined),
}))

vi.mock('../../services/好感度', () => ({
  huoQuWanZhengHaoGanDu: vi.fn(async () => ({ zong_fen: 810, hu_dong_ci_shu: 30 })),
  gengXinHaoGanDu: vi.fn(async () => undefined),
}))

vi.mock('../../services/认证', () => ({
  anIdChaYongHu: vi.fn(async () => null),
}))

vi.mock('../../services/夺舍', () => ({
  jiaoSeShiFouBeiDuoShe: vi.fn(async () => false),
}))

import { AI回复调度器 } from '../AI回复调度器'

function 造调度器() {
  const io = { to: () => ({ emit: () => {} }) } as never
  const 调度器 = new AI回复调度器('j-1', 'u-1', 'E', io, 0)
  const 内部 = 调度器 as unknown as Record<string, unknown>
  内部.获取最新用户消息 = async () => '我喜欢你'
  内部.启动AI计时器 = vi.fn()
  内部.清除等待表白回复状态 = vi.fn()
  内部.是否等待表白回复 = () => false
  return { 调度器, 内部 }
}

async function 跑一轮(内部: Record<string, unknown>) {
  await (内部 as unknown as { 检测用户消息并决定后续: (n: number) => Promise<void> }).检测用户消息并决定后续(0)
}

describe('表白结算后是否补一条角色回复', () => {
  beforeEach(() => {
    结算返回.zhi = null
  })

  it('恋爱胜利且可继续聊天：要补一条回复', async () => {
    const { 内部 } = 造调度器()
    结算返回.zhi = { jie_guo_lei_xing: 'sheng_li_ai_qing', ke_ji_xu_liao_tian: true }
    await 跑一轮(内部)
    expect(内部.启动AI计时器).toHaveBeenCalledTimes(1)
    expect(内部.清除等待表白回复状态).toHaveBeenCalledTimes(1)
  })

  it('失败结局且不可继续聊天：不补回复', async () => {
    const { 内部 } = 造调度器()
    结算返回.zhi = { jie_guo_lei_xing: 'shi_bai_guo_zao_biao_bai', ke_ji_xu_liao_tian: false }
    await 跑一轮(内部)
    expect(内部.启动AI计时器).not.toHaveBeenCalled()
    expect(内部.清除等待表白回复状态).toHaveBeenCalledTimes(1)
  })

  it('没有结局：照常进入正常回复流程', async () => {
    const { 内部 } = 造调度器()
    await 跑一轮(内部)
    expect(内部.启动AI计时器).toHaveBeenCalledTimes(1)
  })
})
