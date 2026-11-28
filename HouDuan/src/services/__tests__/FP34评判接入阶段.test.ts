import { beforeEach, describe, expect, it, vi } from 'vitest'

const 调用记录: Array<{ 模型: string; 消息: Array<{ jiaoSe: string; neiRong: string }> }> = []

vi.mock('../../utils/通用模型调用', () => ({
  按配置调用: vi.fn(async (模型: string, 消息: Array<{ jiaoSe: string; neiRong: string }>) => {
    调用记录.push({ 模型, 消息 })
    return { neiRong: JSON.stringify({ 行为: '有效交流', 信任度变化: 5, 亲密度变化: 3, 趣味度变化: 2, 关怀度变化: 2, 理由: '认真回应' }) }
  }),
}))

vi.mock('../冲突弧', () => ({
  huoQuChongTuXinXi: vi.fn(async () => null),
  ChongTuZhuangTaiZhongWen: { wu: '无冲突', lengZhan: '冷战', huiBi: '回避', yiDuBuHui: '已读不回' },
  ChongTuWanFaPeiZhi: {},
}))

const 好感度Mock = {
  zong_fen: 420,
  互动次数: 6,
}

vi.mock('../好感度', () => ({
  huoQuWanZhengHaoGanDu: vi.fn(async () => 好感度Mock),
}))

vi.mock('../好感度缓存', () => ({
  jiSuanXiShu: vi.fn(async () => ({ xiShu: 1, muBiaoQuXian: 0, lianXuWeiDaBiao: 0, pingJunShuaiJianHou: 0 })),
  yingYongHuiHuaBaoDi: vi.fn(async (_jian: string, jieGuo: unknown) => jieGuo),
}))

vi.mock('../重试队列', () => ({ paiRuZhongShiDuiLie: vi.fn(async () => undefined) }))

vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuHaoGanDuBianHua: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
  jiLuXiXiCaoZuo: vi.fn(),
}))

vi.mock('../AI输入准备', () => ({
  huoQuZuiJinDuiHuaLiShi: vi.fn(async () => [
    { fa_song_zhe_lei_xing: 'yonghu', nei_rong: '今天加班到十点' },
    { fa_song_zhe_lei_xing: 'jiaose', nei_rong: '这么晚啊' },
    { fa_song_zhe_lei_xing: 'yonghu', nei_rong: '嗯，刚到家' },
  ]),
}))

import { pingPanHaoGanDuBianHuaNei, pingPanHaoGanDuPiLiangNei } from '../好感度评判'
import { 查基础分 } from '../../config/阶段感知评分'

function 取提词(): string {
  const 最后 = 调用记录[调用记录.length - 1]
  return 最后.消息.find((条) => 条.jiaoSe === 'user')?.neiRong ?? ''
}

describe('阶段感知评分接入评判', () => {
  beforeEach(() => {
    调用记录.length = 0
  })

  it('行为+阶段决定分数：朋友档有效交流单轮 +25', async () => {
    const 结果 = await pingPanHaoGanDuBianHuaNei('我今天把那个项目交了', '厉害啊', '阿烁', undefined, undefined, 'u-1', 'j-1')
    const 四维和 = 结果.jieGuo.xin_ren_du_bian_hua + 结果.jieGuo.qin_mi_du_bian_hua
      + 结果.jieGuo.qu_wei_du_bian_hua + 结果.jieGuo.guan_huai_du_bian_hua
    expect(结果.jieGuo.行为).toBe('有效交流')
    expect(四维和).toBe(查基础分('有效交流', '朋友'))
  })

  it('四维倾向比例被保留，和仍等于表值', async () => {
    const 结果 = await pingPanHaoGanDuBianHuaNei('我今天把那个项目交了', '厉害啊', '阿烁', undefined, undefined, 'u-1', 'j-1')
    expect(结果.jieGuo.xin_ren_du_bian_hua).toBeGreaterThan(结果.jieGuo.qu_wei_du_bian_hua)
    const 四维和 = 结果.jieGuo.xin_ren_du_bian_hua + 结果.jieGuo.qin_mi_du_bian_hua
      + 结果.jieGuo.qu_wei_du_bian_hua + 结果.jieGuo.guan_huai_du_bian_hua
    expect(四维和).toBe(查基础分('有效交流', '朋友'))
  })

  it('评判提示词带上了行为判定标准和当前阶段', async () => {
    await pingPanHaoGanDuBianHuaNei('我今天把那个项目交了', '厉害啊', '阿烁', undefined, undefined, 'u-1', 'j-1')
    const 提词 = 取提词()
    expect(提词).toContain('【怎么判断这条消息】')
    expect(提词).toContain('朋友')
    expect(提词).toContain('"行为"')
  })

  it('批量路径也注入近期对话（P0-6）', async () => {
    await pingPanHaoGanDuPiLiangNei('我今天把那个项目交了', ['厉害啊', '那挺累的'], '阿烁', undefined, undefined, 'u-1', 'j-1')
    const 提词 = 取提词()
    expect(提词).toContain('【本轮之前的聊天')
    expect(提词).toContain('今天加班到十点')
  })

  it('批量路径不再误报「这是本次会话的第一条用户消息」', async () => {
    await pingPanHaoGanDuPiLiangNei('我今天把那个项目交了', ['厉害啊', '那挺累的'], '阿烁', undefined, undefined, 'u-1', 'j-1')
    expect(取提词()).not.toContain('这是本次会话的第一条用户消息')
  })

  it('单条路径同样注入近期对话', async () => {
    await pingPanHaoGanDuBianHuaNei('我今天把那个项目交了', '厉害啊', '阿烁', undefined, undefined, 'u-1', 'j-1')
    expect(取提词()).toContain('今天加班到十点')
  })
})


