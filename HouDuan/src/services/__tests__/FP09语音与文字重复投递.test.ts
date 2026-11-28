import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'socket.io'
import type { 消息信息 } from '../消息'

vi.mock('../AI引擎', () => ({ yunXingAIYinQing: vi.fn() }))
vi.mock('../AI输入准备', () => ({
  保存角色XiaoXi: vi.fn(),
  huoQuAIJiaoSeXinXi: vi.fn(async () => ({ jiao_se_id: 'j-1', wei_xin_ming: '糖糖' })),
  huoQuZuiJinDuiHuaLiShi: vi.fn(async () => []),
}))
vi.mock('../好感度', () => ({
  huoQuWanZhengHaoGanDu: vi.fn(async () => ({ zong_fen: 400 })),
  gengXinHaoGanDu: vi.fn(async () => undefined),
}))
vi.mock('../认证', () => ({ 按ID查用户: vi.fn(async () => null) }))
vi.mock('../夺舍', () => ({ jiaoSeShiFouBeiDuoShe: vi.fn(async () => false) }))
vi.mock('../好感度评判', () => ({ pingPanHaoGanDuPiLiangNei: vi.fn() }))
vi.mock('../胜利失败条件', () => ({
  jianCeYongHuXiaoXiBingChuLi: vi.fn(async () => null),
  chuLiAIHuiFuHouJieShuJianCha: vi.fn(async () => null),
  chuLiYouXiJieShu: vi.fn(),
}))
vi.mock('../表情包选取', () => ({ 发送表情包消息: vi.fn() }))
vi.mock('../对话摘要', () => ({
  duQuTongBuZhaiYao: vi.fn(() => ''),
  duQuDuiHuaZhaiYao: vi.fn(async () => null),
  shengChengBingLuoKuZhaiYao: vi.fn(async () => undefined),
  gouJianZhaiYaoZhuRuWenBen: vi.fn(() => ''),
  huanCunTongBuZhaiYao: vi.fn(() => undefined),
}))
vi.mock('../头像生成', () => ({ 尝试头像演化: vi.fn(async () => undefined) }))
vi.mock('../消息', () => ({
  撤回角色消息: vi.fn(),
  保存角色媒体消息: vi.fn(),
}))
vi.mock('../TTS服务', () => ({ 尝试合成语音: vi.fn(async () => null) }))
vi.mock('../TTS概率计算', () => ({ 计算TTS概率: vi.fn(() => ({ 是否触发: false })) }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuHaoGanDuBianHua: vi.fn(),
}))

import { AI回复调度器 } from '../AI回复调度器'
import { 保存角色XiaoXi } from '../AI输入准备'
import { 保存角色媒体消息 } from '../消息'
import { 尝试合成语音 } from '../TTS服务'
import { 计算TTS概率 } from '../TTS概率计算'

interface 发射记录 {
  shiJian: string
  fuZai: unknown
}

interface 调度器内部 {
  获取最新用户消息: () => Promise<string>
  等待间隔: (xinHao: AbortSignal) => Promise<void>
  等待表情包后短间隔: (xinHao: AbortSignal) => Promise<void>
  已送达登记: Map<string, number>
  当前角色: unknown
  发送消息列表: (
    lieBiao: string[],
    xinHao: AbortSignal,
    lunCi: { 处理ID: number; 驱动消息ID: string | null },
    jieGuo: { ce_lue?: unknown },
  ) => Promise<void>
}

function 造文本消息(id: string, neiRong: string): 消息信息 {
  return {
    id,
    hui_hua_id: 'j-1',
    fa_song_zhe_id: 'j-1',
    fa_song_zhe_lei_xing: 'jiaose',
    ai_biao_shi: true,
    nei_rong: neiRong,
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: false,
  }
}

function 造语音消息(id: string, neiRong: string): 消息信息 {
  return {
    ...造文本消息(id, neiRong),
    lei_xing: 'yuYin',
    mei_ti_id: `media-${id}`,
    nei_rong_kuai: [{ lei_xing: 'tupian', mei_ti_id: `media-${id}`, mei_ti_lei_bie: 'yuyin' }],
  } as 消息信息
}

function 造调度器() {
  const 发射列表: 发射记录[] = []
  const emit = vi.fn((shiJian: string, fuZai: unknown) => {
    发射列表.push({ shiJian, fuZai })
  })
  const io = { to: vi.fn(() => ({ emit })) } as unknown as Server
  const dieDaiQi = new AI回复调度器('j-1', 'u-1', 'E', io, 0)
  const 内部 = dieDaiQi as unknown as 调度器内部
  内部.获取最新用户消息 = async () => ''
  内部.等待间隔 = async () => undefined
  内部.等待表情包后短间隔 = async () => undefined
  内部.当前角色 = { id: 'j-1', voice_id: 'male-qn-chenqing', ie_lei_xing: 'E' }
  const 推送序列 = (): string[] =>
    发射列表
      .filter((tiao) => tiao.shiJian === '角色回复')
      .flatMap((tiao) => (tiao.fuZai as { 消息列表: 消息信息[] }).消息列表)
      .map((xiaoXi) => `${xiaoXi.lei_xing === 'yuYin' ? '语音' : '文'}:${xiaoXi.nei_rong}`)
  const 运行 = (lieBiao: string[]): Promise<void> =>
    内部.发送消息列表(lieBiao, new AbortController().signal, { 处理ID: 0, 驱动消息ID: null }, {})
  return { 内部, 推送序列, 运行 }
}

beforeEach(() => {
  vi.clearAllMocks()
  let xuHao = 0
  vi.mocked(保存角色XiaoXi).mockImplementation(async (canShu: { nei_rong: string }) => {
    xuHao += 1
    return 造文本消息(`m-${xuHao}`, canShu.nei_rong)
  })
  vi.mocked(保存角色媒体消息).mockImplementation(async (canShu: { nei_rong: string }) => {
    xuHao += 1
    return 造语音消息(`v-${xuHao}`, canShu.nei_rong)
  })
  vi.mocked(尝试合成语音).mockResolvedValue({ mediaId: 'media-1', durationMs: 11250 })
  vi.mocked(计算TTS概率).mockReturnValue({
    概率: 0.9,
    是否触发: true,
    详情: {
      基础概率: 0.04,
      关系阶段系数: 1.2,
      人设系数: 1.3,
      场景系数: 2,
      随机抖动: 1,
      最终概率: 0.9,
      禁用: false,
    },
  } as unknown as ReturnType<typeof 计算TTS概率>)
})

describe('FP09 语音与文字不得把同一句话各发一遍', () => {
  it('触发语音时同一句内容只出现一条气泡，不再文字一条语音一条', async () => {
    const { 推送序列, 运行 } = 造调度器()

    await 运行(['哈哈我也这么觉得，跟你聊不用端着，怪省劲的[表情:微信呲牙笑]'])

    expect(推送序列()).toEqual(['语音:哈哈我也这么觉得，跟你聊不用端着，怪省劲的[表情:微信呲牙笑]'])
    expect(保存角色XiaoXi).not.toHaveBeenCalled()
  })

  it('语音送达后本轮后续同文本段按已送达丢弃，不会二次出口', async () => {
    const { 内部, 推送序列, 运行 } = 造调度器()

    await 运行(['收到', '收到'])

    expect(推送序列()).toEqual(['语音:收到'])
    expect([...内部.已送达登记.keys()]).toEqual(['收到'])
    expect(保存角色媒体消息).toHaveBeenCalledTimes(1)
  })

  it('多段回复里首段走语音，其余段仍按原顺序以文字发出', async () => {
    const { 推送序列, 运行 } = 造调度器()

    await 运行(['心软哪算坏事啊，挺难得的', '这种性子是不是容易被拿捏'])

    expect(推送序列()).toEqual(['语音:心软哪算坏事啊，挺难得的', '文:这种性子是不是容易被拿捏'])
  })

  it('语音合成失败时该段退回纯文字，本轮不会空手而归', async () => {
    const { 推送序列, 运行 } = 造调度器()
    vi.mocked(尝试合成语音).mockResolvedValue(null)

    await 运行(['心软哪算坏事啊，挺难得的'])

    expect(推送序列()).toEqual(['文:心软哪算坏事啊，挺难得的'])
    expect(保存角色媒体消息).not.toHaveBeenCalled()
  })

  it('语音落库失败时同样退回纯文字', async () => {
    const { 推送序列, 运行 } = 造调度器()
    vi.mocked(保存角色媒体消息).mockRejectedValue(new Error('落库失败'))

    await 运行(['心软哪算坏事啊，挺难得的'])

    expect(推送序列()).toEqual(['文:心软哪算坏事啊，挺难得的'])
  })

  it('不触发语音时与改动前一致，全部按文字发出', async () => {
    const { 推送序列, 运行 } = 造调度器()
    vi.mocked(计算TTS概率).mockReturnValue({ 是否触发: false } as unknown as ReturnType<typeof 计算TTS概率>)

    await 运行(['收到'])

    expect(推送序列()).toEqual(['文:收到'])
    expect(尝试合成语音).not.toHaveBeenCalled()
  })

  it('合成期间轮次已被作废时语音不落库，该段仍按文字发出', async () => {
    const { 内部, 推送序列, 运行 } = 造调度器()
    vi.mocked(尝试合成语音).mockImplementation(async () => {
      ;(内部 as unknown as { 当前处理ID: number }).当前处理ID = 99
      return { mediaId: 'media-1', durationMs: 11250 }
    })

    await 运行(['心软哪算坏事啊，挺难得的'])

    expect(推送序列()).toEqual([])
    expect(保存角色媒体消息).not.toHaveBeenCalled()
  })
})
