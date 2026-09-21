import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Server } from 'socket.io'
import { AI回复调度器 } from '../AI回复调度器'
import { baoCunJiaoSeXiaoXi } from '../AI输入准备'
import { baoCunJiaoSeMeiTiXiaoXi } from '../消息'
import { 尝试合成语音 } from '../TTS服务'
import { 计算TTS概率 } from '../TTS概率计算'
import { huoQuFanYi } from '../../config/translations'
import { XIAO_XI_PEI_ZHI } from '../../config/消息配置'

const 假 = vi.hoisted(() => {
  type 落库项 = { 内容: string; 解决: (值: unknown) => void }
  return {
    落库: [] as 落库项[],
    推送: [] as { 事件: string; 数据: unknown }[],
    /** 语音合成的手动闸门：测试自己决定何时「合成完成」 */
    合成解决: null as ((值: unknown) => void) | null,
    AI结果: {
      xiao_xi_lie_biao: ['第一条回复'],
      shi_fou_hui_fu: true,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
    } as unknown,
  }
})

vi.mock('../AI输入准备', () => ({
  baoCunJiaoSeXiaoXi: vi.fn(
    (参数: { nei_rong: string }) =>
      new Promise((解决) => {
        假.落库.push({ 内容: 参数.nei_rong, 解决: 解决 as (值: unknown) => void })
      }),
  ),
  huoQuAIJiaoSeXinXi: vi.fn(async () => ({
    id: 'jiao-se-1',
    ming_zi: '测试角色',
    wei_xin_ming: '小甜心',
    voice_id: '',
  })),
  huoQuZuiJinDuiHuaLiShi: vi.fn(async () => [
    { fa_song_zhe_lei_xing: 'yonghu', nei_rong: '插话内容' },
  ]),
}))

vi.mock('../消息', () => ({
  cheHuiJiaoSeXiaoXi: vi.fn(async () => ({ cheng_gong: true })),
  baoCunJiaoSeMeiTiXiaoXi: vi.fn(async (参数: { nei_rong: string }) => ({
    id: 'yu-yin-1',
    hui_hua_id: 'jiao-se-1',
    fa_song_zhe_id: 'jiao-se-1',
    fa_song_zhe_lei_xing: 'jiaose',
    ai_biao_shi: true,
    nei_rong: 参数.nei_rong,
    lei_xing: 'yuYin',
    shi_jian_chuo: 1700000000000,
    yi_du: true,
  })),
}))

vi.mock('../AI引擎', () => ({ yunXingAIYinQing: vi.fn(async () => 假.AI结果) }))

vi.mock('../好感度', () => ({
  huoQuWanZhengHaoGanDu: vi.fn(async () => ({
    xin_ren_du: 1,
    qin_mi_du: 1,
    qu_wei_du: 1,
    guan_huai_du: 1,
    zong_fen: 4,
    guan_xi_jie_duan: 'reQing',
  })),
  gengXinHaoGanDu: vi.fn(async () => undefined),
}))

vi.mock('../好感度评判', () => ({
  pingPanHaoGanDuPiLiangNei: vi.fn(async () => ({
    jieGuo: {
      xin_ren_du_bian_hua: 0,
      qin_mi_du_bian_hua: 0,
      qu_wei_du_bian_hua: 0,
      guan_huai_du_bian_hua: 0,
      li_you: 'ce-shi',
    },
    xiShu: 1,
    muBiaoQuXian: 'reQing',
    lianXuWeiDaBiao: false,
  })),
}))

vi.mock('../认证', () => ({ anIdChaYongHu: vi.fn(async () => null) }))
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
vi.mock('../TTS服务', () => ({
  尝试合成语音: vi.fn(
    () =>
      new Promise((解决) => {
        假.合成解决 = 解决 as (值: unknown) => void
      }),
  ),
}))
vi.mock('../TTS文本预处理', () => ({ 转换TTS文本: vi.fn((文本: string) => 文本) }))
vi.mock('../TTS概率计算', () => ({ 计算TTS概率: vi.fn(() => ({ 是否触发: true })) }))
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

function chuangJian假Io(): Server {
  return {
    to: () => ({
      emit: (事件: string, 数据: unknown) => {
        假.推送.push({ 事件, 数据 })
      },
    }),
  } as unknown as Server
}

function 角色回复记录(): Array<{ 轮次?: number; 驱动消息ID?: string | null; 消息列表: unknown[] }> {
  return 假.推送
    .filter((记) => 记.事件 === '角色回复')
    .map((记) => 记.数据 as { 轮次?: number; 驱动消息ID?: string | null; 消息列表: unknown[] })
    .filter((记) => Array.isArray(记.消息列表) && 记.消息列表.length > 0)
}

function 含文本的记录(文本: string) {
  return 角色回复记录().filter((记) =>
    记.消息列表.some((项) => (项 as { nei_rong?: string }).nei_rong === 文本),
  )
}

function 落库回显(内容: string, 类型 = 'wenben') {
  return {
    id: `xx-${假.落库.length}`,
    hui_hua_id: 角色ID,
    fa_song_zhe_id: 角色ID,
    fa_song_zhe_lei_xing: 'jiaose' as const,
    ai_biao_shi: true,
    nei_rong: 内容,
    lei_xing: 类型,
    shi_jian_chuo: 1700000000000,
    yi_du: true,
  }
}

let 调度器: AI回复调度器

beforeEach(() => {
  vi.clearAllMocks()
  假.落库.length = 0
  假.推送.length = 0
  假.合成解决 = null
  假.AI结果 = {
    xiao_xi_lie_biao: ['第一条回复'],
    shi_fou_hui_fu: true,
    shi_fou_che_hui: false,
    jiang_ji_mo_shi: false,
  }
  vi.useFakeTimers()
  调度器 = new AI回复调度器(角色ID, 用户ID, 'E', chuangJian假Io(), 1)
})

afterEach(() => {
  调度器.重置()
  vi.useRealTimers()
})

describe('FP-09 连发预警必须先作废在跑轮次（F17①② + 病灶4）', () => {
  it('第 N 条连发的预警挂在新轮次令牌下，旧轮次不得再多投一条', async () => {
    void 调度器.处理用户消息('msg-1')
    await vi.advanceTimersByTimeAsync(5)
    // 第一轮已取到 AI 结果，正等在第一条角色消息落库上
    expect(假.落库).toHaveLength(1)
    假.落库[0]!.解决(落库回显('第一条回复'))
    await vi.advanceTimersByTimeAsync(5)
    const 第一轮 = 角色回复记录()[0]
    expect(第一轮, '第一轮首条未送达').toBeDefined()
    expect(第一轮!.轮次, '角色回复缺 轮次 令牌').toBeTypeOf('number')

    // 继续连发到预警阈值：后续每一轮都卡在落库闸门里（不产出任何推送）
    // 计数在上一条角色消息送达时清零，故按「出现预警落库」收敛而非硬算次数
    const 预警文案 = huoQuFanYi('liaoTian', 'lianFaYuJing')
    let 预警落库 = 假.落库.filter((项) => 项.内容 === 预警文案)
    for (let i = 2; i <= XIAO_XI_PEI_ZHI.lianFaYuJingTiaoShu + 2 && 预警落库.length === 0; i++) {
      void 调度器.处理用户消息(`msg-${i}`)
      await vi.advanceTimersByTimeAsync(5)
      预警落库 = 假.落库.filter((项) => 项.内容 === 预警文案)
    }

    expect(预警落库.length, '连发预警未走轻量通道落库').toBe(1)
    // 管理通道的「策略规划」帧带本轮令牌：由此读出预警之前那一条仍在跑的轮次是第几轮
    const 在跑轮次令牌 = Math.max(
      ...假.推送.filter((记) => 记.事件 === '管理员_构建过程').map((记) => Number((记.数据 as { 轮次?: number }).轮次 ?? 0)),
    )
    expect(在跑轮次令牌, '未在管理通道观测到在跑轮次').toBeGreaterThan(0)
    预警落库[0]!.解决(落库回显(预警文案))
    await vi.advanceTimersByTimeAsync(5)

    const 预警推送 = 含文本的记录(预警文案)
    expect(预警推送).toHaveLength(1)
    // 预警必须挂在一个「谁都还没用过」的轮次令牌下：靠的是 重置() 先作废在跑轮次并递增
    // 当前处理ID。少了任一步，预警都会顶着在跑轮次的令牌下发，前端无法区分两者，
    // 观感即 AI 连发两条（缺陷8 症状）。
    expect(预警推送[0]!.轮次!, '预警轮次令牌未新于被作废的在跑轮次').toBeGreaterThan(在跑轮次令牌)

    // 旧轮次只送达过那一条，插话之后不得再多投
    expect(
      角色回复记录()
        .filter((记) => 记.轮次 === 第一轮!.轮次)
        .reduce((总, 记) => 总 + 记.消息列表.length, 0),
      '被作废轮次仍在投递条目',
    ).toBe(1)
    expect(vi.mocked(baoCunJiaoSeXiaoXi).mock.calls.length).toBeGreaterThan(1)
  })

  it('预警的驱动消息 ID 就是触发这轮连发的那条消息', async () => {
    for (let i = 1; i < XIAO_XI_PEI_ZHI.lianFaYuJingTiaoShu; i++) {
      void 调度器.处理用户消息(`msg-${i}`)
      await vi.advanceTimersByTimeAsync(5)
    }
    void 调度器.处理用户消息('msg-驱动')
    await vi.advanceTimersByTimeAsync(5)

    const 预警文案 = huoQuFanYi('liaoTian', 'lianFaYuJing')
    const 预警落库 = 假.落库.filter((项) => 项.内容 === 预警文案)
    expect(预警落库.length).toBe(1)
    预警落库[0]!.解决(落库回显(预警文案))
    await vi.advanceTimersByTimeAsync(5)

    expect(含文本的记录(预警文案)[0]!.驱动消息ID).toBe('msg-驱动')
  })
})

describe('FP-09 TTS 尾巴挂在轮次令牌下（病灶3）', () => {
  it('合成在途时轮次作废：语音消息既不落库也不推送', async () => {
    void 调度器.处理用户消息('msg-1')
    await vi.advanceTimersByTimeAsync(5)
    假.落库[0]!.解决(落库回显('第一条回复'))
    await vi.advanceTimersByTimeAsync(20)

    expect(尝试合成语音).toHaveBeenCalledTimes(1)
    expect(假.合成解决, '语音合成闸门未建立').toBeTypeOf('function')

    调度器.重置()
    假.合成解决!({ mediaId: 'mei-ti-1', durationMs: 1200 })
    await vi.advanceTimersByTimeAsync(20)

    expect(baoCunJiaoSeMeiTiXiaoXi, '作废轮次仍落了语音消息').not.toHaveBeenCalled()
    expect(
      角色回复记录().filter((记) =>
        记.消息列表.some((项) => (项 as { lei_xing?: string }).lei_xing === 'yuYin'),
      ),
      '作废轮次仍推送了语音消息',
    ).toHaveLength(0)
  })

  it('轮次未被作废时语音照常落库并带轮次令牌推送', async () => {
    void 调度器.处理用户消息('msg-1')
    await vi.advanceTimersByTimeAsync(5)
    假.落库[0]!.解决(落库回显('第一条回复'))
    await vi.advanceTimersByTimeAsync(20)
    假.合成解决!({ mediaId: 'mei-ti-1', durationMs: 1200 })
    await vi.advanceTimersByTimeAsync(20)

    expect(baoCunJiaoSeMeiTiXiaoXi).toHaveBeenCalledTimes(1)
    const 语音推送 = 角色回复记录().filter((记) =>
      记.消息列表.some((项) => (项 as { lei_xing?: string }).lei_xing === 'yuYin'),
    )
    expect(语音推送).toHaveLength(1)
    expect(语音推送[0]!.轮次, '语音推送缺轮次令牌').toBeTypeOf('number')
  })
})
