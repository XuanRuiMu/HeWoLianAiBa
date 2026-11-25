import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'socket.io'
import { debug日志 } from '../../utils/debug日志'
import type { AIYinQingShuChu } from '../../types'
import type { 消息信息 } from '../消息'

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}))

const panDuanZuiJiaMock = vi.hoisted(() => vi.fn())

vi.mock('../../redis', () => ({
  redis: redisMock,
  daiRongDuanZhiXing: vi.fn(async (_mingCheng: string, dongZuo: () => Promise<unknown>) => dongZuo()),
  redisRongDuanShiFouKaiLu: vi.fn(() => false),
  dengDaiRedisJiuXu: vi.fn(async () => undefined),
  tanCeRedisJiuXu: vi.fn(async () => true),
  biaoJiRedisYiTanCeShiBai: vi.fn(),
  gouJianRedisLianJiePeiZhi: vi.fn(() => ({ host: '127.0.0.1', port: 6379 })),
}))
vi.mock('../追加消息判定', () => ({ panDuanZuiJia: panDuanZuiJiaMock }))
vi.mock('../AI引擎', () => ({ yunXingAIYinQing: vi.fn() }))
vi.mock('../AI输入准备', () => ({
  保存角色XiaoXi: vi.fn(),
  huoQuAIJiaoSeXinXi: vi.fn(async () => ({ jiao_se_id: 'j-1', wei_xin_ming: '糖糖' })),
  huoQuZuiJinDuiHuaLiShi: vi.fn(async () => []),
}))
vi.mock('../好感度', () => ({
  huoQuWanZhengHaoGanDu: vi.fn(async () => ({ zong_fen: 400 })),
  gengXinHaoGanDu: vi.fn(async () => undefined),
  huoQuJieDuanXinXi: vi.fn(() => ({ xiaXian: 0 })),
}))
vi.mock('../消息', async (importOriginal) => {
  const shiJi = await importOriginal<typeof import('../消息')>()
  return { ...shiJi, 撤回角色消息: vi.fn(), 保存角色媒体消息: vi.fn() }
})
vi.mock('../认证', () => ({ 按ID查用户: vi.fn(async () => null) }))
vi.mock('../夺舍', () => ({ jiaoSeShiFouBeiDuoShe: vi.fn(async () => false) }))
vi.mock('../好感度评判', () => ({ pingPanHaoGanDuPiLiangNei: vi.fn() }))
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
vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuHaoGanDuBianHua: vi.fn(),
}))

import { AI回复调度器 } from '../AI回复调度器'
import { yunXingAIYinQing } from '../AI引擎'
import { 保存角色XiaoXi, huoQuZuiJinDuiHuaLiShi } from '../AI输入准备'

const ZhaMenJian = 'zhui_jia_yi_fa:u-1:j-1'

function 造调度器() {
  const io = { to: vi.fn(() => ({ emit: vi.fn() })) } as unknown as Server
  const 调度器 = new AI回复调度器('j-1', 'u-1', 'E', io, 0)
  const 内部 = 调度器 as unknown as Record<string, unknown>
  内部.回复延迟毫秒 = 0
  内部.计算间隔 = () => 0
  return { 调度器, 内部 }
}

function 造消息(id: string, neiRong: string): 消息信息 {
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

function 追加AI结果(xiao_xi_lie_biao: string[]): AIYinQingShuChu {
  return {
    xiao_xi_lie_biao,
    shi_fou_hui_fu: true,
    shi_fou_che_hui: false,
    jiang_ji_mo_shi: false,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('追加消息单发闸门', () => {
  it('闸门键存在时跳过本次追加，不调用小模型判定也不发送', async () => {
    const { 内部 } = 造调度器()
    redisMock.get.mockResolvedValue('1')
    panDuanZuiJiaMock.mockResolvedValue({ youShiMeDongXi: true, shuoDeShi: '想说的话' })
    内部.上条角色消息时刻 = Date.now()

    await (内部.执行追加消息 as () => Promise<void>)()

    expect(redisMock.get).toHaveBeenCalledWith(ZhaMenJian)
    expect(panDuanZuiJiaMock).not.toHaveBeenCalled()
    expect(yunXingAIYinQing).not.toHaveBeenCalled()
    expect(huoQuZuiJinDuiHuaLiShi).not.toHaveBeenCalled()
    expect(redisMock.set).not.toHaveBeenCalled()
    expect(vi.mocked(debug日志.debug).mock.calls.some((can) => String(can[1]).includes('闸门'))).toBe(true)
  })

  it('闸门键不存在时正常进入追加判定，判定不追加则不发送也不写键', async () => {
    const { 内部 } = 造调度器()
    redisMock.get.mockResolvedValue(null)
    panDuanZuiJiaMock.mockResolvedValue({ youShiMeDongXi: false })
    内部.上条角色消息时刻 = Date.now()

    await (内部.执行追加消息 as () => Promise<void>)()

    expect(panDuanZuiJiaMock).toHaveBeenCalledTimes(1)
    expect(yunXingAIYinQing).not.toHaveBeenCalled()
    expect(redisMock.set).not.toHaveBeenCalled()
  })

  it('追加发送前 NX 抢占单发闸门键（7 天 TTL）', async () => {
    const { 内部 } = 造调度器()
    redisMock.get.mockResolvedValue(null)
    panDuanZuiJiaMock.mockResolvedValue({ youShiMeDongXi: true, shuoDeShi: '刚看到一个东西想起你了' })
    vi.mocked(yunXingAIYinQing).mockResolvedValueOnce(追加AI结果(['刚才刷到一个视频，特别像你']))
    vi.mocked(保存角色XiaoXi).mockResolvedValue(造消息('m-1', '刚才刷到一个视频，特别像你'))
    内部.上条角色消息时刻 = Date.now()

    await (内部.执行追加消息 as () => Promise<void>)()

    expect(yunXingAIYinQing).toHaveBeenCalledTimes(1)
    expect(redisMock.set).toHaveBeenCalledWith(ZhaMenJian, '1', 'EX', 7 * 24 * 60 * 60, 'NX')
  })

  it('抢占在发送前完成，被取代时已占闸门由用户发言清理兜底', async () => {
    const { 内部 } = 造调度器()
    redisMock.get.mockResolvedValue(null)
    panDuanZuiJiaMock.mockResolvedValue({ youShiMeDongXi: true, shuoDeShi: '在吗' })
    vi.mocked(yunXingAIYinQing).mockResolvedValueOnce(追加AI结果(['咦，人呢']))
    内部.发送消息列表 = async () => {
      内部.当前处理ID = (内部.当前处理ID as number) + 1
    }
    内部.上条角色消息时刻 = Date.now()

    await (内部.执行追加消息 as () => Promise<void>)()

    expect(yunXingAIYinQing).toHaveBeenCalledTimes(1)
    expect(redisMock.set).toHaveBeenCalledWith(ZhaMenJian, '1', 'EX', 7 * 24 * 60 * 60, 'NX')
  })

  it('单发闸门被主动关怀抢占时追加放弃，不发送', async () => {
    const { 内部 } = 造调度器()
    redisMock.get.mockResolvedValue(null)
    redisMock.set.mockResolvedValue(null)
    panDuanZuiJiaMock.mockResolvedValue({ youShiMeDongXi: true, shuoDeShi: '在吗' })
    vi.mocked(yunXingAIYinQing).mockResolvedValueOnce(追加AI结果(['咦，人呢']))
    内部.上条角色消息时刻 = Date.now()

    await (内部.执行追加消息 as () => Promise<void>)()

    expect(yunXingAIYinQing).toHaveBeenCalledTimes(1)
    expect(vi.mocked(保存角色XiaoXi)).not.toHaveBeenCalled()
    expect(redisMock.del).not.toHaveBeenCalled()
  })

  it('追加发送失败时释放已抢占的闸门', async () => {
    const { 内部 } = 造调度器()
    redisMock.get.mockResolvedValue(null)
    redisMock.set.mockResolvedValue('OK')
    panDuanZuiJiaMock.mockResolvedValue({ youShiMeDongXi: true, shuoDeShi: '在吗' })
    vi.mocked(yunXingAIYinQing).mockResolvedValueOnce(追加AI结果(['咦，人呢']))
    内部.发送消息列表 = async () => {
      throw new Error('落库炸了')
    }
    内部.上条角色消息时刻 = Date.now()

    await (内部.执行追加消息 as () => Promise<void>)()

    expect(redisMock.set).toHaveBeenCalledWith(ZhaMenJian, '1', 'EX', 7 * 24 * 60 * 60, 'NX')
    expect(redisMock.del).toHaveBeenCalledWith(ZhaMenJian)
  })

  it('用户在会话发言时清除单发闸门键', async () => {
    const { 调度器, 内部 } = 造调度器()
    redisMock.del.mockResolvedValue(1)
    内部.检测用户消息并决定后续 = async () => undefined

    await 调度器.处理用户消息('m-9')

    expect(redisMock.del).toHaveBeenCalledWith(ZhaMenJian)
  })

  it('处理中收到新消息同样先清除闸门键', async () => {
    const { 调度器, 内部 } = 造调度器()
    redisMock.del.mockResolvedValue(1)
    内部.处理中 = true

    await 调度器.处理用户消息('m-10')

    expect(redisMock.del).toHaveBeenCalledWith(ZhaMenJian)
  })
})
