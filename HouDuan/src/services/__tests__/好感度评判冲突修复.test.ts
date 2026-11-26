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

vi.mock('../../utils/通用模型调用', () => ({ 按配置调用: anPeiZhiDiaoYong, 设置Mock调用: vi.fn() }))
vi.mock('../冲突弧', () => chongTuHu)
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

  it('敷衍与无关话术分别解析为 fuYan 与 wuGuan，非法值兜底为 wuGuan', async () => {
    chongTuHu.huoQuChongTuXinXi.mockResolvedValue(弧内冲突)
    anPeiZhiDiaoYong.mockResolvedValue({ neiRong: 评判响应(10, '敷衍') })
    expect((await pingPanHaoGanDuPiLiangNei('哦', ['嗯。'], '对方', 吃软不吃硬人设, undefined, 'u-1', 'j-1')).xiuFuPanDing).toBe('fuYan')

    anPeiZhiDiaoYong.mockResolvedValue({ neiRong: 评判响应(10, '无关') })
    expect((await pingPanHaoGanDuPiLiangNei('今天天气不错', ['嗯。'], '对方', 吃软不吃硬人设, undefined, 'u-1', 'j-1')).xiuFuPanDing).toBe('wuGuan')

    anPeiZhiDiaoYong.mockResolvedValue({ neiRong: 评判响应(10, '随口编的档位') })
    expect((await pingPanHaoGanDuPiLiangNei('随便说说', ['嗯。'], '对方', 吃软不吃硬人设, undefined, 'u-1', 'j-1')).xiuFuPanDing).toBe('wuGuan')
  })

  it('无冲突时不注入修复维度，也不解析修复字段', async () => {
    const jieGuo = await pingPanHaoGanDuPiLiangNei('在干嘛', ['没干嘛。'], '对方', 吃软不吃硬人设, undefined, 'u-1', 'j-1')
    expect(jieGuo.xiuFuPanDing).toBeUndefined()
    const tiShiCi = quTiShiCi()
    expect(tiShiCi).not.toContain('冲突修复判定')
    expect(tiShiCi).not.toContain('"冲突修复"')
  })

  it('修复维度注入冲突事由、档位与人设特征，判定标准按人设走', async () => {
    chongTuHu.huoQuChongTuXinXi.mockResolvedValue(弧内冲突)
    anPeiZhiDiaoYong.mockResolvedValue({ neiRong: 评判响应(10, '修复成立') })
    await pingPanHaoGanDuPiLiangNei('对不起我赔你一个', ['哼。'], '对方', 吃软不吃硬人设, undefined, 'u-1', 'j-1')
    const tiShiCi = quTiShiCi()
    expect(tiShiCi).toContain('冲突修复判定')
    expect(tiShiCi).toContain('摔了TA的手办')
    expect(tiShiCi).toContain('冷战')
    expect(tiShiCi).toContain('吃软不吃硬')
    expect(tiShiCi).toContain('"冲突修复"')
    expect(tiShiCi).toContain('修复成立')
    expect(tiShiCi).toContain('敷衍')
  })
})

describe('敷衍计数从严', () => {
  it('冲突升级计数大于零时，提示词声明第 N 次敷衍并要求从严', async () => {
    chongTuHu.huoQuChongTuXinXi.mockResolvedValue({ zhuangTai: 'huiBi', shiYou: '又放鸽子', shengJiJiShu: 2 })
    anPeiZhiDiaoYong.mockResolvedValue({ neiRong: 评判响应(10, '敷衍') })
    await pingPanHaoGanDuPiLiangNei('这次真有事', ['嗯。'], '对方', 吃软不吃硬人设, undefined, 'u-1', 'j-1')
    const tiShiCi = quTiShiCi()
    expect(tiShiCi).toContain('2 次')
    expect(tiShiCi).toContain('从严')
    expect(tiShiCi).toContain('回避')
  })

  it('计数为零时不带从严声明', async () => {
    chongTuHu.huoQuChongTuXinXi.mockResolvedValue(弧内冲突)
    await pingPanHaoGanDuPiLiangNei('对不起', ['哼。'], '对方', 吃软不吃硬人设, undefined, 'u-1', 'j-1')
    expect(quTiShiCi()).not.toContain('从严')
  })
})

describe('已读不回档的修复专项判定', () => {
  it('弧内消息按人设判修复，判定结果只看内容', async () => {
    chongTuHu.huoQuChongTuXinXi.mockResolvedValue({ zhuangTai: 'yiDuBuHui', shiYou: '放了鸽子', shengJiJiShu: 1 })
    anPeiZhiDiaoYong.mockResolvedValue({ neiRong: JSON.stringify({ 冲突修复: '敷衍' }) })
    expect(await pingPanXiuFu('哦', 吃软不吃硬人设, 'u-1', 'j-1')).toBe('fuYan')
    const tiShiCi = quTiShiCi()
    expect(tiShiCi).toContain('放了鸽子')
    expect(tiShiCi).toContain('已读不回')
    expect(tiShiCi).toContain('吃软不吃硬')
    expect(tiShiCi).toContain('1 次')

    anPeiZhiDiaoYong.mockResolvedValue({ neiRong: JSON.stringify({ 冲突修复: '修复成立' }) })
    expect(await pingPanXiuFu('我错了，我把你最爱吃的带过来了', 吃软不吃硬人设, 'u-1', 'j-1')).toBe('chengLi')
  })

  it('无冲突时不调用模型直接返回 undefined', async () => {
    expect(await pingPanXiuFu('在吗', 吃软不吃硬人设, 'u-1', 'j-1')).toBeUndefined()
    expect(anPeiZhiDiaoYong).not.toHaveBeenCalled()
  })

  it('缺用户或角色维度时不判定', async () => {
    expect(await pingPanXiuFu('对不起', 吃软不吃硬人设, undefined, 'j-1')).toBeUndefined()
    expect(await pingPanXiuFu('对不起', 吃软不吃硬人设, 'u-1', undefined)).toBeUndefined()
  })

  it('模型调用失败按未修复处理（wuGuan），不误判成修复也不计敷衍', async () => {
    chongTuHu.huoQuChongTuXinXi.mockResolvedValue(弧内冲突)
    anPeiZhiDiaoYong.mockRejectedValue(new Error('超时'))
    expect(await pingPanXiuFu('对不起', 吃软不吃硬人设, 'u-1', 'j-1')).toBe('wuGuan')
  })
})

describe('修复判定零时间路径', () => {
  it('修复判定提示词不含任何时间化解因素', async () => {
    chongTuHu.huoQuChongTuXinXi.mockResolvedValue({ zhuangTai: 'lengZhan', shiYou: '摔了TA的手办', shengJiJiShu: 3 })
    anPeiZhiDiaoYong.mockResolvedValue({ neiRong: 评判响应(10, '敷衍') })
    await pingPanHaoGanDuPiLiangNei('对不起', ['哼。'], '对方', 吃软不吃硬人设, undefined, 'u-1', 'j-1')
    const tiShiCi = quTiShiCi()
    expect(tiShiCi).not.toMatch(/上次修复|间隔|冷却|过期|衰减|天前|小时前|分钟前|TTL/)
  })

  it('好感度评判源码不读时间、不设定时器，修复结果只由内容判定驱动', () => {
    const yuanMa = readFileSync(resolve(__dirname, '../好感度评判.ts'), 'utf8')
    expect(yuanMa).not.toMatch(/Date\.now|new Date|setTimeout|setInterval|NOW\(\)|INTERVAL|AGE\(|EXTRACT\(/)
    expect(yuanMa).toContain('quXiuFuPanDingShangXiaWen')
    expect(yuanMa).toContain('jieXiXiuFuPanDing')
  })
})
