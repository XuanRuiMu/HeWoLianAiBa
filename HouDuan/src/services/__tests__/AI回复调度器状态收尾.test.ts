import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'socket.io'
import type { AIYinQingShuChu } from '../../types'
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

import { AI回复调度器 } from '../AI回复调度器'
import { yunXingAIYinQing } from '../AI引擎'
import { 保存角色XiaoXi } from '../AI输入准备'

type AI状态名 = 'kong_xian' | 'deng_dai_zhong' | 'zheng_zai_shu_ru'

interface AI状态事件 {
  jiao_se_id: string
  zhuang_tai: AI状态名
  xu_hao: number
  shi_jian: number
}

interface 发射记录 {
  shiJian: string
  fuZai: unknown
}

function 造调度器() {
  const 发射列表: 发射记录[] = []
  const emit = vi.fn((shiJian: string, fuZai: unknown) => {
    发射列表.push({ shiJian, fuZai })
  })
  const io = { to: vi.fn(() => ({ emit })) } as unknown as Server
  const 调度器 = new AI回复调度器('j-1', 'u-1', 'E', io, 0)
  const 内部 = 调度器 as unknown as Record<string, unknown>
  内部.回复延迟毫秒 = 0
  内部.沉默计时器 = null
  const AI状态序列 = () =>
    发射列表
      .filter((tiao) => tiao.shiJian === 'AI状态')
      .map((tiao) => (tiao.fuZai as AI状态事件).zhuang_tai)
  return { 调度器, 内部, AI状态序列 }
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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AI调度器状态收尾', () => {
  it('连发中途被新一轮取代：发送消息列表提前 return 后 AI状态 仍收敛到 kong_xian', async () => {
    const { 调度器, 内部, AI状态序列 } = 造调度器()
    内部.获取最新用户消息 = async () => '在吗'
    let 放行首条保存!: (jieGuo: 消息信息) => void
    let 首条保存已被调用!: () => void
    const 首条保存挂起 = new Promise<消息信息>((jie) => {
      放行首条保存 = jie
    })
    const 保存已挂起信号 = new Promise<void>((jie) => {
      首条保存已被调用 = jie
    })
    vi.mocked(保存角色XiaoXi).mockImplementationOnce(async () => {
      首条保存已被调用()
      return await 首条保存挂起
    })
    vi.mocked(yunXingAIYinQing).mockResolvedValueOnce({
      xiao_xi_lie_biao: ['第一条', '第二条'],
      shi_fou_hui_fu: true,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
    } satisfies AIYinQingShuChu)

    const benLun = (内部.触发AI处理 as () => Promise<void>)()
    await 保存已挂起信号
    调度器.重置()
    放行首条保存(造消息('m-1', '第一条'))
    await benLun

    expect(AI状态序列()).toEqual(['zheng_zai_shu_ru', 'kong_xian'])
  })

  it('追加流程被新一轮取代后：收尾不覆盖新轮 AI状态 也不清空新轮取消控制器', async () => {
    const { 调度器, 内部, AI状态序列 } = 造调度器()
    内部.上条角色消息时刻 = Date.now()
    const zhuiJia = (内部.执行追加消息 as () => Promise<void>)()
    内部.上条角色消息后用户来过 = true
    调度器.重置()
    ;(内部.发布AI状态 as (zhuangTai: AI状态名) => void)('deng_dai_zhong')
    const xinLunKongZhiQi = new AbortController()
    内部.取消控制器 = xinLunKongZhiQi

    await zhuiJia

    expect(AI状态序列()).toEqual(['kong_xian', 'deng_dai_zhong'])
    expect(内部.取消控制器).toBe(xinLunKongZhiQi)
  })

  it('整轮文字都因重复被去重时，兜底不再补发同一段重复文本', async () => {
    const { 调度器, 内部, AI状态序列 } = 造调度器()
    vi.mocked(yunXingAIYinQing).mockResolvedValueOnce({
      xiao_xi_lie_biao: ['被你看穿了，我刚躺下。'],
      shi_fou_hui_fu: true,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
    } satisfies AIYinQingShuChu)
    内部.获取最新消息文本 = async () => '哈哈'
    内部.更新好感度 = async () => null
    const 原本推送 = 调度器['推送角色回复'].bind(调度器) as (xiaoXiLieBiao: 消息信息[], lunCi?: unknown) => void
    内部.推送角色回复 = 原本推送
    const 首轮 = (内部.触发AI处理 as () => Promise<void>)()
    await 首轮
    expect(vi.mocked(保存角色XiaoXi)).toHaveBeenCalledTimes(1)
    调度器.重置()
    vi.mocked(yunXingAIYinQing).mockResolvedValueOnce({
      xiao_xi_lie_biao: ['被你看穿了，我刚躺下。'],
      shi_fou_hui_fu: true,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
    } satisfies AIYinQingShuChu)
    const 次轮 = (内部.触发AI处理 as () => Promise<void>)()
    await 次轮

    expect(vi.mocked(保存角色XiaoXi)).toHaveBeenCalledTimes(1)
    expect(AI状态序列().at(-1)).toBe('kong_xian')
  })
})
