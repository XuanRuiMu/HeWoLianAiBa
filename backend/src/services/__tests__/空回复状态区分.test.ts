import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Server } from 'socket.io'
import { AI回复调度器 } from '../AI回复调度器'

/**
 * 空回复必须分两种（第十二轮实测 P0-②）。
 *
 * 背景：实测 400 轮里有 3 轮（INTP/L7、INFJ/L18、ESFJ/L8）
 * Director 的 `ceLue.shi_fou_hui_fu === true` 且策略写满，但 Writer 输出 `[]`。
 * 原实现把「模型交白卷」与「角色已读不回」压成同一个信号 ——
 * 都走 `推送角色回复([])`，既不给用户提示，也让联调无法区分二者。
 *
 * 修法（`AI回复调度器.ts` 空回复分支）：
 * · 有 `cuo_wu_xin_xi` ⇒ 故障态 → `发送系统错误提示`，**必须让用户看见**
 * · 无 `cuo_wu_xin_xi` ⇒ 正常态 → 静默不回复（角色主动选择已读不回）
 */

const 假 = vi.hoisted(() => ({
  AI结果: {
    xiao_xi_lie_biao: [] as string[],
    shi_fou_hui_fu: false,
    shi_fou_che_hui: false,
    jiang_ji_mo_shi: false,
    cuo_wu_xin_xi: undefined as string | undefined,
  } as Record<string, unknown>,
  推送: [] as Array<{ 事件: string; 数据: unknown }>,
}))

vi.mock('../AI引擎', () => ({ yunXingAIYinQing: vi.fn(async () => 假.AI结果) }))
vi.mock('../AI输入准备', () => ({
  baoCunJiaoSeXiaoXi: vi.fn(async () => undefined),
  huoQuAIJiaoSeXinXi: vi.fn(async () => ({
    id: 'jiao-se-1', ming_zi: '测试角色', wei_xin_ming: '小甜心', voice_id: '',
  })),
  huoQuZuiJinDuiHuaLiShi: vi.fn(async () => []),
}))
vi.mock('../好感度', () => ({
  huoQuWanZhengHaoGanDu: vi.fn(async () => ({
    xin_ren_du: 1, qin_mi_du: 1, qu_wei_du: 1, guan_huai_du: 1, zong_fen: 4, guan_xi_jie_duan: 'reQing',
  })),
  gengXinHaoGanDu: vi.fn(async () => undefined),
}))
vi.mock('../好感度评判', () => ({
  pingPanHaoGanDuPiLiangNei: vi.fn(async () => ({
    jieGuo: { xin_ren_du_bian_hua: 0, qin_mi_du_bian_hua: 0, qu_wei_du_bian_hua: 0, guan_huai_du_bian_hua: 0, li_you: 'ce-shi' },
    xiShu: 1, muBiaoWanZhengLunShu: 1, lianXuWeiDaBiao: false,
  })),
}))
vi.mock('../认证', () => ({ anIdChaYongHu: vi.fn(async () => null) }))
vi.mock('../消息', () => ({
  cheHuiJiaoSeXiaoXi: vi.fn(async () => ({ cheng_gong: true })),
  baoCunJiaoSeMeiTiXiaoXi: vi.fn(async () => ({ id: 'yu-yin' })),
}))
vi.mock('../胜利失败条件', () => ({
  jianCeYongHuXiaoXiBingChuLi: vi.fn(async () => false),
  chuLiAIHuiFuHouJieShuJianCha: vi.fn(async () => false),
  chuLiYouXiJieShu: vi.fn(async () => undefined),
}))
vi.mock('../夺舍', () => ({ jiaoSeShiFouBeiDuoShe: vi.fn(async () => false) }))
vi.mock('../../utils/debug日志', () => ({
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('../../config/AI参数策略', () => ({ gouJianJiaoSeShangXiaWen: vi.fn(() => ({})) }))
vi.mock('../TTS服务', () => ({ 尝试合成语音: vi.fn(async () => null) }))
vi.mock('../TTS文本预处理', () => ({ 转换TTS文本: vi.fn((t: string) => t) }))
vi.mock('../TTS概率计算', () => ({ 计算TTS概率: vi.fn(() => ({ 是否触发: false })) }))
vi.mock('../主动多模态', () => ({ changShiZhuDongShengTu: vi.fn(async () => undefined) }))
vi.mock('../对话摘要', () => ({
  duQuDuiHuaZhaiYao: vi.fn(async () => ''),
  gouJianZhaiYaoZhuRuWenBen: vi.fn(() => ''),
  huanCunTongBuZhaiYao: vi.fn(),
  duQuTongBuZhaiYao: vi.fn(() => ''),
  shengChengBingLuoKuZhaiYao: vi.fn(async () => undefined),
}))
vi.mock('../AI视觉辅助', () => ({ meiTiZhanShiWenBen: vi.fn(() => '') }))
vi.mock('../语音理解', () => ({
  gouJianYuYinKeDuWenBen: vi.fn(() => ''),
  tiQuYinPinShiJian: vi.fn(() => null),
}))
vi.mock('../视频理解', () => ({ huoQuHuoJieXiShiPinMiaoShu: vi.fn(async () => ({})) }))
vi.mock('../视频多模态', () => ({ gouJianShiPinKeDuWenBen: vi.fn(() => '') }))

const 用户ID = '22222222-2222-4222-8222-222222222222'
const 角色ID = '11111111-1111-4111-8111-111111111111'

function 假Io(): Server {
  return { to: () => ({ emit: (事件: string, 数据: unknown) => { 假.推送.push({ 事件, 数据 }) } }) } as unknown as Server
}

/** 发出用户消息并等调度器跑完一轮 */
async function paoYiLun() {
  假.推送 = []
  const diaoDu = new AI回复调度器(角色ID, 用户ID, 'nv', 假Io(), true)
  diaoDu.处理用户消息()
  // 等异步链跑完（构造消息→落库→AI→推送）
  for (let i = 0; i < 30 && 假.推送.length === 0; i++) await new Promise((r) => setTimeout(r, 10))
  await new Promise((r) => setTimeout(r, 40))
  return 假.推送
}

describe('空回复必须区分「模型交白卷」与「角色已读不回」', () => {
  beforeEach(() => {
    假.推送 = []
    假.AI结果 = {
      xiao_xi_lie_biao: [], shi_fou_hui_fu: false, shi_fou_che_hui: false,
      jiang_ji_mo_shi: false, cuo_wu_xin_xi: undefined,
    }
  })

  it('模型交白卷（带 cuo_wu_xin_xi）→ 必须给用户发系统提示', async () => {
    假.AI结果.cuo_wu_xin_xi = '角色这轮没接上话，再发一次试试'
    const 记 = await paoYiLun()
    const tongZhi = 记.find((x) => x.事件 === '角色回复') as
      | { 数据: { 消息列表?: Array<{ lei_xing?: string; nei_rong?: string }> } }
      | undefined
    expect(tongZhi, '应推送角色回复事件').toBeTruthy()
    const lie = tongZhi!.数据.消息列表 || []
    expect(lie.length, '故障态应产生 1 条系统提示').toBe(1)
    expect(lie[0].lei_xing, '必须是系统提示类型，不能伪装成角色消息').toBe('xitong_ti_shi')
    expect(lie[0].nei_rong).toBe('角色这轮没接上话，再发一次试试')
  })

  it('角色主动已读不回（无 cuo_wu_xin_xi）→ 静默，不发任何提示', async () => {
    const 记 = await paoYiLun()
    const tongZhi = 记.find((x) => x.事件 === '角色回复') as
      | { 数据: { 消息列表?: unknown[] } }
      | undefined
    expect(tongZhi, '仍会推送空列表占位').toBeTruthy()
    expect(tongZhi!.数据.消息列表?.length || 0, '已读不回不应产生任何消息条').toBe(0)
  })

  it('空字符串 cuo_wu_xin_xi 视为正常态（不得发空白提示）', async () => {
    假.AI结果.cuo_wu_xin_xi = ''
    const 记 = await paoYiLun()
    const tongZhi = 记.find((x) => x.事件 === '角色回复') as
      | { 数据: { 消息列表?: unknown[] } }
      | undefined
    expect(tongZhi!.数据.消息列表?.length || 0, '空串不得被当成故障').toBe(0)
  })

  it('正常有回复时不受影响', async () => {
    假.AI结果 = {
      xiao_xi_lie_biao: ['在干嘛'], shi_fou_hui_fu: true, shi_fou_che_hui: false,
      jiang_ji_mo_shi: false, cuo_wu_xin_xi: undefined,
    }
    const 记 = await paoYiLun()
    const tongZhi = 记.find((x) => x.事件 === '角色回复') as
      | { 数据: { 消息列表?: unknown[] } }
      | undefined
    expect((tongZhi?.数据.消息列表?.length || 0), '正常回复应被推送').toBeGreaterThan(0)
  })
})