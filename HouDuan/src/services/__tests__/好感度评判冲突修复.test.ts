import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { anPeiZhiDiaoYong, chongTuHu, haoGanDuFuWu, haoGanDuHuanCun, zhongShiDuiLie } = vi.hoisted(() => ({
  anPeiZhiDiaoYong: vi.fn(),
  chongTuHu: {
    huoQuChongTuXinXi: vi.fn(),
    ChongTuZhuangTaiZhongWen: { wu: '无冲突', lengZhan: '冷战', huiBi: '回避', yiDuBuHui: '已读不回' },
    ChongTuWanFaPeiZhi: { shengQiXingTaiZuiDiQiangDu: 60, huaJieXinQingQiangDu: 15, shengJiXinQingQiangDu: 90 },
  },
  haoGanDuFuWu: {
    huoQuWanZhengHaoGanDu: vi.fn(async () => ({ zong_fen: 300, 互动次数: 5 })),
  },
  haoGanDuHuanCun: {
    jiSuanXiShu: vi.fn(async () => ({ xiShu: 1, muBiaoQuXian: 0, lianXuWeiDaBiao: 0, pingJunShuaiJianHou: 0 })),
    yingYongHuiHuaBaoDi: vi.fn(async (jian: string, jieGuo: unknown) => jieGuo),
  },
  zhongShiDuiLie: {
    paiRuZhongShiDuiLie: vi.fn(async () => undefined),
  },
}))

vi.mock('../../utils/通用模型调用', () => ({ 按配置调用: anPeiZhiDiaoYong }))
vi.mock('../冲突弧', async (importOriginal) => ({ ...(await importOriginal<typeof import('../冲突弧')>()), ...chongTuHu }))
vi.mock('../好感度', () => haoGanDuFuWu)
vi.mock('../好感度缓存', () => haoGanDuHuanCun)
vi.mock('../重试队列', () => zhongShiDuiLie)
vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuHaoGanDuBianHua: vi.fn(),
}))

import { pingPanHaoGanDuPiLiangNei, pingPanXiuFu } from '../好感度评判'
import type { 参数上下文 } from '../../config/AI参数策略'

const 吃软不吃硬人设: 参数上下文 = {
  jiaoSe: {
    re_shen_lei_xing: '快热',
    xing_ge: '吃软不吃硬，嘴硬心软',
    yan_yu_feng_ge: '毒舌但心软',
  },
}

const 弧内冲突 = {
  zhuangTai: 'lengZhan' as const,
  shiYou: '摔了TA的手办',
  shengJiJiShu: 0,
}

function 评判响应(bianHua = 10, xiuFu?: string): string {
  return JSON.stringify({
    信任度变化: bianHua,
    亲密度变化: bianHua,
    趣味度变化: bianHua,
    关怀度变化: bianHua,
    ...(xiuFu ? { 冲突修复: xiuFu } : {}),
    理由: '有诚意',
  })
}

function quTiShiCi(): string {
  const diaoYong = anPeiZhiDiaoYong.mock.calls[0]
  const xiaoXiLieBiao = diaoYong[1] as Array<{ jiaoSe: string; neiRong: string }>
  return xiaoXiLieBiao.find((tiao) => tiao.jiaoSe === 'user')?.neiRong ?? ''
}

beforeEach(() => {
  vi.clearAllMocks()
  chongTuHu.huoQuChongTuXinXi.mockResolvedValue(null)
  anPeiZhiDiaoYong.mockResolvedValue({ neiRong: 评判响应() })
})

describe('好感度评判修复维度解析', () => {
  it('弧内评判输出修复成立 → xiuFuPanDing 为 chengLi，四维分数照常解析', async () => {
    chongTuHu.huoQuChongTuXinXi.mockResolvedValue(弧内冲突)
    anPeiZhiDiaoYong.mockResolvedValue({ neiRong: 评判响应(10, '修复成立') })
    const jieGuo = await pingPanHaoGanDuPiLiangNei('对不起我赔你一个', ['哼。'], '对方', 吃软不吃硬人设, undefined, 'u-1', 'j-1')
    expect(jieGuo.xiuFuPanDing).toBe('chengLi')
    expect(jieGuo.jieGuo.xin_ren_du_bian_hua).toBe(10)
    expect(jieGuo.jieGuo.li_you).toBe('有诚意')
  })

  it('敷衍与无关话术分别解析为 fuYan 与 wuGuan，非法值视为未判定以便触发降级', async () => {
