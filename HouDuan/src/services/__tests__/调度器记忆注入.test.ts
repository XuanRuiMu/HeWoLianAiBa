import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'socket.io'
import type { AIYinQingShuChu } from '../../types'

vi.mock('../AI引擎', () => ({ yunXingAIYinQing: vi.fn() }))
vi.mock('../AI输入准备', () => ({
  保存角色XiaoXi: vi.fn(),
  huoQuAIJiaoSeXinXi: vi.fn(async () => ({
    jiao_se_id: 'j-1',
    wei_xin_ming: '糖糖',
    ming_zi: '糖糖',
  })),
  huoQuZuiJinDuiHuaLiShi: vi.fn(async () => []),
}))
vi.mock('../好感度', () => ({
  huoQuWanZhengHaoGanDu: vi.fn(async () => ({ zong_fen: 400 })),
  gengXinHaoGanDu: vi.fn(async () => undefined),
}))
vi.mock('../消息', async (importOriginal) => {
  const shiJi = await importOriginal<typeof import('../消息')>()
  return { ...shiJi, 保存角色XiaoXi: vi.fn(async () => ({ id: 'x' })) }
})
vi.mock('../认证', () => ({ 按ID查用户: vi.fn(async () => null) }))
vi.mock('../夺舍', () => ({ jiaoSeShiFouBeiDuoShe: vi.fn(async () => false) }))
vi.mock('../好感度评判', () => ({ pingPanHaoGanDuPiLiangNei: vi.fn() }))
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
vi.mock('../承诺兑现', () => ({
  提取承诺: vi.fn(async () => undefined),
  获取未兑现承诺: vi.fn(async () => []),
  获取到期未兑现承诺: vi.fn(async () => []),
  构建承诺注入: vi.fn(() => ''),
}))
vi.mock('../角色日程', () => ({
  zhengZeRiQi: vi.fn(() => ({ riQi: '2026-01-01', xingQi: 4 })),
  duQuRiCheng: vi.fn(async () => null),
  quDangQianHuoDong: vi.fn(() => null),
  renDingKeNengXing: vi.fn(() => 'xian'),
  riChengMiaoShu: vi.fn(() => ''),
}))
vi.mock('../Prompt构建器', async (importOriginal) => {
  const shiJi = await importOriginal<typeof import('../Prompt构建器')>()
  return {
    ...shiJi,
    zhunBeiRiCheng: vi.fn(async () => undefined),
  }
})
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
vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuHaoGanDuBianHua: vi.fn(),
}))
vi.mock('../对话摘要', () => ({
  duQuTongBuZhaiYao: vi.fn(() => ''),
  duQuDuiHuaZhaiYao: vi.fn(async () => null),
  gouJianZhaiYaoZhuRuWenBen: vi.fn((zhaiYao: { zhaiYaoNeiRong: string } | null) =>
    zhaiYao ? `【此前记住的】\n${zhaiYao.zhaiYaoNeiRong}` : ''),
  huanCunTongBuZhaiYao: vi.fn(),
  shengChengBingLuoKuZhaiYao: vi.fn(async () => true),
}))

import { AI回复调度器, sheZhiCeShiTiaoGuo } from '../AI回复调度器'
import { yunXingAIYinQing } from '../AI引擎'
import {
  duQuDuiHuaZhaiYao,
  duQuTongBuZhaiYao,
  gouJianZhaiYaoZhuRuWenBen,
  shengChengBingLuoKuZhaiYao,
} from '../对话摘要'
import type { LunCiShangXiaWen } from '../AI回复调度器'

function 造调度器() {
  const emit = vi.fn()
  const io = { to: vi.fn(() => ({ emit })) } as unknown as Server
  const 调度器 = new AI回复调度器('j-1', 'u-1', 'E', io, 0)
  const 内部 = 调度器 as unknown as Record<string, unknown>
  内部.回复延迟毫秒 = 0
  内部.沉默计时器 = null
  return { 调度器, 内部 }
}

beforeEach(() => {
  sheZhiCeShiTiaoGuo(true)
  vi.clearAllMocks()
  vi.mocked(duQuTongBuZhaiYao).mockReturnValue('')
  vi.mocked(duQuDuiHuaZhaiYao).mockResolvedValue(null)
  vi.mocked(gouJianZhaiYaoZhuRuWenBen).mockImplementation((zhaiYao) =>
    zhaiYao ? `【此前记住的】\n${zhaiYao.zhaiYaoNeiRong}` : '')
  vi.mocked(yunXingAIYinQing).mockResolvedValue({
    xiao_xi_lie_biao: [],
    shi_fou_hui_fu: false,
    shi_fou_che_hui: false,
    jiang_ji_mo_shi: false,
  } satisfies AIYinQingShuChu)
})

const YunXingXinHao = { chuanSong: 0 } as unknown as LunCiShangXiaWen

function yunXing(内部: Record<string, unknown>): Promise<unknown> {
  return (内部.运行AI as (xinHao: AbortSignal, lunCi: LunCiShangXiaWen) => Promise<unknown>)(
    new AbortController().signal,
    YunXingXinHao,
  )
}

describe('运行AI注入长期记忆摘要', () => {
  it('关闭测试跳过时数据库摘要参与本轮上下文，并转换为注入文本', async () => {
    const { 调度器, 内部 } = 造调度器()
    内部.获取最新消息文本 = async () => '在吗'
    sheZhiCeShiTiaoGuo(false)
    vi.mocked(duQuDuiHuaZhaiYao).mockResolvedValueOnce({
      zhaiYaoNeiRong: '他下周三出差',
      gaiKuoXiaoXiShu: 12,
      gengXinShiJian: null,
      suCaiMaoDian: null,
    })
    vi.mocked(gouJianZhaiYaoZhuRuWenBen).mockReturnValueOnce('【此前记住的】\n他下周三出差')

    try {
      await yunXing(内部)
    } finally {
      sheZhiCeShiTiaoGuo(true)
    }

    expect(duQuTongBuZhaiYao).toHaveBeenCalledWith('u-1', 'j-1')
    expect(duQuDuiHuaZhaiYao).toHaveBeenCalledWith('u-1', 'j-1')
    expect(gouJianZhaiYaoZhuRuWenBen).toHaveBeenCalled()
    const shuRu = vi.mocked(yunXingAIYinQing).mock.calls[0][0]
    expect(shuRu.ji_yi_zhai_yao).toBe('【此前记住的】\n他下周三出差')
    调度器.重置()
  })

  it('压缩任务拿当前角色名，测试跳过开关控制是否触发压缩', async () => {
    const { 调度器, 内部 } = 造调度器()
    内部.当前角色 = { wei_xin_ming: '糖糖', ming_zi: '糖糖' }
    const chuFaJiYiYaSuo = (AI回复调度器.prototype as unknown as Record<string, () => void>).触发记忆压缩.bind(调度器) as () => void

    sheZhiCeShiTiaoGuo(false)
    try {
      chuFaJiYiYaSuo()
      await new Promise((jieShu) => setImmediate(jieShu))
      expect(shengChengBingLuoKuZhaiYao).toHaveBeenCalledWith('u-1', 'j-1', '糖糖')
    } finally {
      sheZhiCeShiTiaoGuo(true)
    }

    vi.mocked(shengChengBingLuoKuZhaiYao).mockClear()
    chuFaJiYiYaSuo()
    await new Promise((jieShu) => setImmediate(jieShu))
    expect(shengChengBingLuoKuZhaiYao).not.toHaveBeenCalled()
  })

  it('同步缓存命中时免查库，摘要为空则注入 undefined', async () => {
    const { 调度器, 内部 } = 造调度器()
    内部.获取最新消息文本 = async () => '在吗'
    vi.mocked(duQuTongBuZhaiYao).mockReturnValueOnce('【此前记住的】\n缓存里的记忆')

    await yunXing(内部)

    expect(duQuDuiHuaZhaiYao).not.toHaveBeenCalled()
    expect(vi.mocked(yunXingAIYinQing).mock.calls[0][0].ji_yi_zhai_yao).toBe('【此前记住的】\n缓存里的记忆')
    调度器.重置()

    const { 调度器: 空调度器, 内部: 空内部 } = 造调度器()
    空内部.获取最新消息文本 = async () => '在吗'
    await yunXing(空内部)
    expect(vi.mocked(yunXingAIYinQing).mock.calls[1][0].ji_yi_zhai_yao).toBeUndefined()
    空调度器.重置()
  })
})
