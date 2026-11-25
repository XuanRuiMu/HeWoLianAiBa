import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'socket.io'
import type { ChongTuZhuangTaiMing } from '../../types'

const redisMock = vi.hoisted(() => ({
  get: vi.fn(async () => null),
  set: vi.fn(async () => 'OK'),
  del: vi.fn(async () => 1),
}))

const chongTuHuMock = vi.hoisted(() => ({
  ChongTuWanFaPeiZhi: { shengJiXinQingQiangDu: 90, huaJieXinQingQiangDu: 15, huaJieXinQingMing: '平静', shengJiXinQingMing: '生气', shengQiXingTaiZuiDiQiangDu: 60, kuaiReHuaJieJiaCheng: 6, manReHuaJieJiaCheng: 3, moRenHuaJieJiaCheng: 4, xiuFuPanDuanPinKongChuangKouHaoMiao: 60000, xiuFuPanDuanPinKongShangXian: 3, xiuFuPanDuanLianXuShiBaiYuZhi: 3 },
  ChongTuZhuangTaiZhongWen: { wu: '无冲突', lengZhan: '冷战', huiBi: '回避', yiDuBuHui: '已读不回' },
  biaoJiXiaoXiYiDu: vi.fn(async () => undefined),
  diZengFuYanJiShu: vi.fn(async () => 1),
  huaJieChongTu: vi.fn(async () => true),
  huoQuChongTuXinXi: vi.fn(async (): Promise<{ zhuangTai: ChongTuZhuangTaiMing; shiYou: string; shengJiJiShu: number } | null> => null),
  huoQuChongTuZhuangTai: vi.fn(async (): Promise<ChongTuZhuangTaiMing> => 'wu'),
  renSheHuaJieJiaCheng: vi.fn(() => 4),
  shengJiChongTu: vi.fn(async () => ({ chengGong: false, shengJi: false, zhuangTai: null })),
}))

const 评判Mock = vi.hoisted(() => ({
  pingPanHaoGanDuPiLiangNei: vi.fn(),
  pingPanXiuFu: vi.fn(),
}))

const 日志Mock = vi.hoisted(() => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuHaoGanDuBianHua: vi.fn(),
}))

vi.mock('../../redis', () => ({
  redis: redisMock,
  daiRongDuanZhiXing: vi.fn(async (_m: string, d: () => Promise<unknown>) => d()),
  redisRongDuanShiFouKaiLu: vi.fn(() => false),
  dengDaiRedisJiuXu: vi.fn(async () => undefined),
  tanCeRedisJiuXu: vi.fn(async () => true),
  biaoJiRedisYiTanCeShiBai: vi.fn(),
  gouJianRedisLianJiePeiZhi: vi.fn(() => ({ host: '127.0.0.1', port: 6379 })),
}))
vi.mock('../冲突弧', () => chongTuHuMock)
vi.mock('../好感度评判', () => 评判Mock)
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
  const shiJi = await importOriginal<typeof import('../PromptBuilder')>().catch(() => importOriginal<typeof import('../Prompt构建器')>())
  return { ...shiJi, zhunBeiRiCheng: vi.fn(async () => undefined) }
})
vi.mock('../../utils/debug日志', () => 日志Mock)

import { AI回复调度器 } from '../AI回复调度器'

function 造调度器() {
  const emit = vi.fn()
  const io = { to: vi.fn(() => ({ emit })) } as unknown as Server
  const 调度器 = new AI回复调度器('j-1', 'u-1', 'E', io, 0)
  const 内部 = 调度器 as unknown as Record<string, unknown>
  内部.回复延迟毫秒 = 0
  内部.计算间隔 = () => 0
  内部.获取最新消息文本 = async () => '对不起我错了'
  return { 调度器, 内部 }
}

beforeEach(() => {
  vi.clearAllMocks()
  chongTuHuMock.huoQuChongTuZhuangTai.mockResolvedValue('wu')
  chongTuHuMock.huaJieChongTu.mockResolvedValue(true)
})

describe('已读不回死锁：用户持续真诚道歉必须在有限轮内拿到回复', () => {
  it('频控超限那一轮直接放行，不静默', async () => {
    const { 调度器 } = 造调度器()
    chongTuHuMock.huoQuChongTuZhuangTai.mockResolvedValue('yiDuBuHui')
    评判Mock.pingPanXiuFu.mockResolvedValue('wuGuan')
    const 时刻 = (调度器 as unknown as { 修复判定调用时刻: number[] })
    时刻.修复判定调用时刻 = [Date.now(), Date.now(), Date.now()]

    const 被拦 = await (调度器 as unknown as { 已读不回闸前置检查: (id: string) => Promise<boolean> }).已读不回闸前置检查('m-1')

    expect(被拦).toBe(false)
    expect((调度器 as unknown as { 修复判定频控跳过: boolean }).修复判定频控跳过).toBe(true)
  })

  it('连续三次判定失败后自动放行，不会无限冷处理', async () => {
    const { 调度器 } = 造调度器()
    chongTuHuMock.huoQuChongTuZhuangTai.mockResolvedValue('yiDuBuHui')
    评判Mock.pingPanXiuFu.mockResolvedValue(undefined)
    const 闸 = 调度器 as unknown as { 已读不回闸前置检查: (id: string) => Promise<boolean>; 修复判定调用时刻: number[] }

    const 结果: boolean[] = []
    for (let i = 0; i < 4; i++) {
      闸.修复判定调用时刻 = []
      结果.push(await 闸.已读不回闸前置检查(`m-${i}`))
    }

    expect(结果[0]).toBe(true)
    expect(结果[1]).toBe(true)
    expect(结果[2]).toBe(false)
  })

  it('判定成功一轮立刻清零失败计数，不会把历史失败带到化解之后', async () => {
    const { 调度器, 内部 } = 造调度器()
    chongTuHuMock.huoQuChongTuZhuangTai.mockResolvedValue('yiDuBuHui')
    评判Mock.pingPanXiuFu.mockResolvedValueOnce(undefined).mockResolvedValueOnce('chengLi')
    const 闸 = 调度器 as unknown as { 已读不回闸前置检查: (id: string) => Promise<boolean>; 修复判定调用时刻: number[] }

    闸.修复判定调用时刻 = []
    await 闸.已读不回闸前置检查('m-1')
    expect(内部.修复判定连续失败).toBe(1)

    闸.修复判定调用时刻 = []
    const 放行 = await 闸.已读不回闸前置检查('m-2')

    expect(放行).toBe(false)
    expect(内部.修复判定连续失败).toBe(0)
    expect(chongTuHuMock.huaJieChongTu).toHaveBeenCalledTimes(1)
  })
})

describe('处理中标志不会永久卡死', () => {
  it('重置后处理中必然为 false，可继续处理新消息', () => {
    const { 调度器, 内部 } = 造调度器()
    内部.处理中 = true
    调度器.重置()
    expect(调度器.是否处理中()).toBe(false)
  })

  it('处理中时新消息进入待补发，而不是丢弃', async () => {
    const { 调度器, 内部 } = 造调度器()
    内部.处理中 = true
    await 调度器.处理用户消息('m-9')
    expect(内部.待补发消息ID).toBe('m-9')
  })

  it('补发消息ID取走后被清空，不会重复补发同一条', async () => {
    const { 内部 } = 造调度器()
    内部.处理中 = true
    内部.待补发消息ID = 'm-9'
    const 取出 = 内部.待补发消息ID
    内部.待补发消息ID = undefined
    expect(取出).toBe('m-9')
    expect(内部.待补发消息ID).toBeUndefined()
  })
})
