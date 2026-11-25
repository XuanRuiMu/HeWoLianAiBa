import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'socket.io'
import type { ChongTuZhuangTaiMing } from '../../types'

const redisMock = vi.hoisted(() => ({
  get: vi.fn(async () => null),
  set: vi.fn(async () => 'OK'),
  del: vi.fn(async () => 1),
}))

const chongTuHuMock = vi.hoisted(() => ({
  biaoJiXiaoXiYiDu: vi.fn(async () => undefined),
  diZengFuYanJiShu: vi.fn(async () => 1),
  huaJieChongTu: vi.fn(async () => true),
  huoQuChongTuXinXi: vi.fn(async (): Promise<{ zhuangTai: ChongTuZhuangTaiMing; shiYou: string; shengJiJiShu: number } | null> => null),
  huoQuChongTuZhuangTai: vi.fn(async (): Promise<ChongTuZhuangTaiMing> => 'wu'),
  renSheHuaJieJiaCheng: vi.fn(() => 4),
  shengJiChongTu: vi.fn(async (): Promise<{ chengGong: boolean; shengJi: boolean; zhuangTai: ChongTuZhuangTaiMing | null }> => ({ chengGong: false, shengJi: false, zhuangTai: null })),
}))

const 日志Mock = vi.hoisted(() => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuHaoGanDuBianHua: vi.fn(),
}))

vi.mock('../../redis', () => ({
  redis: redisMock,
  daiRongDuanZhiXing: vi.fn(async (_mingCheng: string, dongZuo: () => Promise<unknown>) => dongZuo()),
  redisRongDuanShiFouKaiLu: vi.fn(() => false),
  dengDaiRedisJiuXu: vi.fn(async () => undefined),
  tanCeRedisJiuXu: vi.fn(async () => true),
  biaoJiRedisYiTanCeShiBai: vi.fn(),
  gouJianRedisLianJiePeiZhi: vi.fn(() => ({ host: '127.0.0.1', port: 6379 })),
}))
vi.mock('../冲突弧', () => chongTuHuMock)
vi.mock('../好感度评判', () => ({ pingPanHaoGanDuPiLiangNei: vi.fn(), pingPanXiuFu: vi.fn() }))
vi.mock('../AI引擎', () => ({ yunXingAIYinQing: vi.fn() }))
vi.mock('../AI输入准备', () => ({
  保存角色XiaoXi: vi.fn(async () => null),
  huoQuAIJiaoSeXinXi: vi.fn(async () => ({ jiao_se_id: 'j-1', wei_xin_ming: '糖糖' })),
  huoQuZuiJinDuiHuaLiShi: vi.fn(async () => []),
}))
vi.mock('../好感度', () => ({
  huoQuWanZhengHaoGanDu: vi.fn(async () => ({ zong_fen: 400 })),
  gengXinHaoGanDu: vi.fn(async () => ({ cheng_gong: true })),
  huoQuJieDuanXinXi: vi.fn(() => ({ xiaXian: 0 })),
}))
vi.mock('../消息', async (importOriginal) => {
  const shiJi = await importOriginal<typeof import('../消息')>()
  return { ...shiJi, 撤回角色消息: vi.fn(), 保存角色媒体消息: vi.fn() }
})
vi.mock('../认证', () => ({ 按ID查用户: vi.fn(async () => null) }))
vi.mock('../夺舍', () => ({ jiaoSeShiFouBeiDuoShe: vi.fn(async () => false) }))
vi.mock('../亲密度缺席扣减', () => ({ chuLiQueXiKouJian: vi.fn(async () => false) }))
vi.mock('../主动关怀调度器', () => ({ anPaiGuanHuai: vi.fn(async () => undefined) }))
vi.mock('../../数据库', () => ({ 数据库: { query: vi.fn(async () => ({ rows: [] })) } }))
vi.mock('../沉默判定', () => ({
  沉默配置: { 连续沉默最多次数: 1 },
  是问句: vi.fn(() => false),
  是纯应答词: vi.fn(() => false),
  算回应必要性等级: vi.fn(() => 2),
  升级等级: vi.fn(() => 2),
  可不回: vi.fn(() => false),
  算时光秒: vi.fn(() => 2),
  转换时光毫秒: vi.fn(() => 2000),
}))
vi.mock('../当前心情', () => ({
  duQuDangQianXinQing: vi.fn(async () => null),
  jieGuoXinQing: vi.fn(() => ({ ming: null, qiangDu: 0 })),
  xieRuDangQianXinQing: vi.fn(async () => undefined),
}))
vi.mock('../胜利失败条件', () => ({
  jianCeYongHuXiaoXiBingChuLi: vi.fn(async () => null),
  chuLiAIHuiFuHouJieShuJianCha: vi.fn(async () => null),
  chuLiYouXiJieShu: vi.fn(),
}))
vi.mock('../对话摘要', () => ({
  duQuTongBuZhaiYao: vi.fn(() => ''),
  duQuDuiHuaZhaiYao: vi.fn(async () => null),
  gouJianZhaiYaoZhuRuWenBen: vi.fn(() => ''),
  huanCunTongBuZhaiYao: vi.fn(),
  shengChengBingLuoKuZhaiYao: vi.fn(async () => undefined),
}))
vi.mock('../头像生成', () => ({ 尝试头像演化: vi.fn(async () => null) }))
vi.mock('../TTS服务', () => ({ 尝试合成语音: vi.fn(async () => null) }))
vi.mock('../TTS概率计算', () => ({ 计算TTS概率: vi.fn(() => ({ 是否触发: false })) }))
vi.mock('../Prompt构建器', async (importOriginal) => {
  const shiJi = await importOriginal<typeof import('../Prompt构建器')>()
  return { ...shiJi, zhunBeiRiCheng: vi.fn(async () => undefined) }
})
vi.mock('../../utils/debug日志', () => 日志Mock)

import { AI回复调度器 } from '../AI回复调度器'
import { yunXingAIYinQing } from '../AI引擎'
import { 保存角色XiaoXi } from '../AI输入准备'

function 造调度器() {
  const emit = vi.fn()
  const io = { to: vi.fn(() => ({ emit })) } as unknown as Server
  return new AI回复调度器('j-1', 'u-1', 'E', io, 0)
}

describe('冲突闸门链异常时的降级', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chongTuHuMock.huoQuChongTuZhuangTai.mockResolvedValue('wu')
  })

  it('读冲突档抛错时降级为放行主流程，回复照常产出', async () => {
    chongTuHuMock.huoQuChongTuZhuangTai.mockRejectedValue(new Error('数据库连接失败'))
    vi.mocked(yunXingAIYinQing).mockResolvedValue({
      xiao_xi_lie_biao: ['在的，怎么了'],
      shi_fou_hui_fu: true,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
    })
    const 调度器 = 造调度器()

    await expect(调度器.处理用户消息('m-1')).resolves.toBeUndefined()

    expect(vi.mocked(yunXingAIYinQing)).toHaveBeenCalledTimes(1)
    expect(日志Mock.debug日志.warn).toHaveBeenCalled()
  })

  it('已读不回修复判定抛错时按不化解处理，静默但不崩且状态不改', async () => {
    const 评判 = await import('../好感度评判')
    chongTuHuMock.huoQuChongTuZhuangTai.mockResolvedValue('yiDuBuHui')
    vi.mocked(评判.pingPanXiuFu).mockRejectedValue(new Error('模型超时'))
    const 调度器 = 造调度器()

    await expect(调度器.处理用户消息('m-2')).resolves.toBeUndefined()

    expect(chongTuHuMock.huaJieChongTu).not.toHaveBeenCalled()
    expect(chongTuHuMock.biaoJiXiaoXiYiDu).toHaveBeenCalledWith('u-1', 'j-1', [])
    expect(调度器.是否处理中()).toBe(false)
  })

  it('闸门链整体异常不会向外抛，主流程异常被吞掉并留错误日志', async () => {
    const 评判 = await import('../好感度评判')
    chongTuHuMock.huoQuChongTuZhuangTai.mockRejectedValue(new Error('闸门炸了'))
    vi.mocked(评判.pingPanHaoGanDuPiLiangNei).mockRejectedValue(new Error('评判炸了'))
    vi.mocked(保存角色XiaoXi).mockRejectedValue(new Error('落库炸了'))
    vi.mocked(yunXingAIYinQing).mockResolvedValue({
      xiao_xi_lie_biao: ['嗯'],
      shi_fou_hui_fu: true,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
    })
    const 调度器 = 造调度器()

    await expect(调度器.处理用户消息('m-3')).resolves.toBeUndefined()
    expect(调度器.是否处理中()).toBe(false)
  })
})
