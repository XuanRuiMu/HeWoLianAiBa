import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Server } from 'socket.io'
import { AI回复调度器 } from '../AI回复调度器'
import { baoCunJiaoSeXiaoXi, huoQuAIJiaoSeXinXi, huoQuZuiJinDuiHuaLiShi } from '../AI输入准备'
import { yunXingAIYinQing } from '../AI引擎'
import { cheHuiJiaoSeXiaoXi } from '../消息'
import { jiaoSeShiFouBeiDuoShe } from '../夺舍'
import { jianCeYongHuXiaoXiBingChuLi, chuLiYouXiJieShu } from '../胜利失败条件'

const 假 = vi.hoisted(() => {
  type 落库项 = { 内容: string; 解决: (值: unknown) => void }
  return {
    落库: [] as 落库项[],
    推送: [] as { 事件: string; 数据: unknown }[],
    /** 令指定事件的 emit 抛错，模拟推送通道异常 */
    推送抛出: null as ((事件: string) => boolean) | null,
    AI结果: {
      xiao_xi_lie_biao: ['第一条回复', '第二条回复'],
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

vi.mock('../AI引擎', () => ({
  yunXingAIYinQing: vi.fn(async () => 假.AI结果),
}))

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

vi.mock('../消息', () => ({
  cheHuiJiaoSeXiaoXi: vi.fn(async () => ({ cheng_gong: true })),
  baoCunJiaoSeMeiTiXiaoXi: vi.fn(async () => ({ id: 'yu-yin-xiao-xi' })),
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

vi.mock('../../config/AI参数策略', () => ({
  gouJianJiaoSeShangXiaWen: vi.fn(() => ({})),
}))

vi.mock('../TTS服务', () => ({ 尝试合成语音: vi.fn(async () => null) }))
vi.mock('../TTS文本预处理', () => ({ 转换TTS文本: vi.fn((文本: string) => 文本) }))
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

function chuangJian假Io(): Server {
  return {
    to: () => ({
      emit: (事件: string, 数据: unknown) => {
        if (假.推送抛出?.(事件)) throw new Error('推送通道异常')
        假.推送.push({ 事件, 数据 })
      },
    }),
  } as unknown as Server
}

/** 已落库并推送给前端的消息条数（空列表推送不计，避免与「无回复」占位混淆） */
function 已推送条数(): number {
  return 假.推送
    .filter((记) => 记.事件 === '角色回复')
    .reduce((总, 记) => {
      const 列表 = (记.数据 as { 消息列表?: unknown[] }).消息列表
      return 总 + (Array.isArray(列表) ? 列表.length : 0)
    }, 0)
}

let 调度器: AI回复调度器

beforeEach(() => {
  vi.clearAllMocks()
  假.落库.length = 0
  假.推送.length = 0
  假.AI结果 = {
    xiao_xi_lie_biao: ['第一条回复', '第二条回复'],
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

describe('FP-04 取消时序不变式：已落库必已推送', () => {
  it('落库在途时被打断，该条仍必须推送（不留「已落库未推送」孤儿）', async () => {
    void 调度器.处理用户消息()
    await vi.runOnlyPendingTimersAsync()

    expect(假.落库).toHaveLength(1)
    expect(已推送条数()).toBe(0)

    调度器.重置()
    假.落库[0]?.解决({ id: '1' })
    await vi.runAllTimersAsync()

    expect(假.落库).toHaveLength(1)
    expect(已推送条数()).toBe(1)
  })

  it('落库并推送后被打断，不再落库后续消息', async () => {
    void 调度器.处理用户消息()
    await vi.runOnlyPendingTimersAsync()
    假.落库[0]?.解决({ id: '1' })
    await vi.runOnlyPendingTimersAsync()
    expect(已推送条数()).toBe(1)

    调度器.重置()
    await vi.runAllTimersAsync()

    expect(假.落库).toHaveLength(1)
    expect(已推送条数()).toBe(1)
  })

  it('AI 结果在途时被打断：主动表白轮次既不落库也不推送', async () => {
    假.AI结果 = {
      xiao_xi_lie_biao: ['我要和你在一起'],
      shi_fou_hui_fu: true,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
      ce_lue: { shi_fou_zhu_dong_biao_bai: true },
    }
    let 解决AI: (值: unknown) => void = () => {}
    vi.mocked(yunXingAIYinQing).mockImplementationOnce(
      () =>
        new Promise((解决) => {
          解决AI = 解决 as (值: unknown) => void
        }),
    )
    void 调度器.处理用户消息()
    await vi.runOnlyPendingTimersAsync()
    expect(yunXingAIYinQing).toHaveBeenCalledTimes(1)

    调度器.重置()
    解决AI(假.AI结果)
    await vi.runAllTimersAsync()

    expect(baoCunJiaoSeXiaoXi).not.toHaveBeenCalled()
    expect(已推送条数()).toBe(0)
  })

  it('AI 结果在途时被打断：撤回轮次不改动已落库消息', async () => {
    假.AI结果 = {
      xiao_xi_lie_biao: ['回复'],
      shi_fou_hui_fu: true,
      shi_fou_che_hui: true,
      jiang_ji_mo_shi: false,
    }
    let 解决AI: (值: unknown) => void = () => {}
    vi.mocked(yunXingAIYinQing).mockImplementationOnce(
      () =>
        new Promise((解决) => {
          解决AI = 解决 as (值: unknown) => void
        }),
    )
    void 调度器.处理用户消息()
    await vi.runOnlyPendingTimersAsync()
    expect(yunXingAIYinQing).toHaveBeenCalledTimes(1)

    调度器.重置()
    解决AI(假.AI结果)
    await vi.runAllTimersAsync()

    expect(cheHuiJiaoSeXiaoXi).not.toHaveBeenCalled()
    expect(baoCunJiaoSeXiaoXi).not.toHaveBeenCalled()
  })

  it('撤回落库在途时才作废：主动表白不再落库、不再推送', async () => {
    假.AI结果 = {
      xiao_xi_lie_biao: ['我要和你在一起'],
      shi_fou_hui_fu: true,
      shi_fou_che_hui: true,
      jiang_ji_mo_shi: false,
      ce_lue: { shi_fou_zhu_dong_biao_bai: true },
    }
    let 解决撤回: (值: unknown) => void = () => {}
    vi.mocked(cheHuiJiaoSeXiaoXi).mockImplementationOnce(
      () =>
        new Promise((解决) => {
          解决撤回 = 解决 as (值: unknown) => void
        }),
    )
    void 调度器.处理用户消息()
    await vi.runOnlyPendingTimersAsync()
    expect(cheHuiJiaoSeXiaoXi).toHaveBeenCalledTimes(1)

    调度器.重置()
    解决撤回({ cheng_gong: true })
    await vi.runAllTimersAsync()

    expect(baoCunJiaoSeXiaoXi).not.toHaveBeenCalled()
    expect(已推送条数()).toBe(0)
  })

  it('角色回复推送抛错不吞本轮剩余条目，也不退化为空推送', async () => {
    let 抛出过 = 0
    假.推送抛出 = (事件) => 事件 === '角色回复' && ++抛出过 === 1
    try {
      void 调度器.处理用户消息()
      await vi.runOnlyPendingTimersAsync()
      expect(假.落库).toHaveLength(1)
      假.落库[0]?.解决({ id: '1' })
      await vi.runAllTimersAsync()
      expect(假.落库).toHaveLength(2)
      假.落库[1]?.解决({ id: '2' })
      // 只推进已挂起的定时器：避免 Date.now 在 await 间自然推进导致条间等待被跳过
      await vi.runOnlyPendingTimersAsync()
    } finally {
      假.推送抛出 = null
    }

    expect(已推送条数()).toBe(1)
    expect(
      假.推送.some(
        (记) => 记.事件 === '角色回复' && (记.数据 as { 消息列表: unknown[] }).消息列表.length === 0,
      ),
      '推送异常不得走「空回复」兜底',
    ).toBe(false)
    expect(假.推送.filter((记) => 记.事件 === 'AI状态').pop()?.数据).toEqual(
      expect.objectContaining({ zhuang_tai: 'kong_xian' }),
    )
  })

  it('同毫秒两条系统提示各自独立（id 不得只按时间戳生成）', async () => {
    // 冻结到同一毫秒：本用例唯一要证的就是「同毫秒不撞键」，计时器推进不得改变 Date.now
    const 冻结现在 = vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
    try {
      const 额度用尽 = {
        xiao_xi_lie_biao: [],
        shi_fou_hui_fu: false,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
        cuo_wu_ma: 'YU_E_BU_ZU_402',
        cuo_wu_xin_xi: '今日 AI 额度已用尽',
      }
      vi.mocked(yunXingAIYinQing).mockImplementationOnce(async () => 额度用尽 as never)
      vi.mocked(yunXingAIYinQing).mockImplementationOnce(async () => 额度用尽 as never)

      void 调度器.处理用户消息()
      await vi.runAllTimersAsync()
      void 调度器.处理用户消息()
      await vi.runAllTimersAsync()

      const 提示 = 假.推送.filter((记) => 记.事件 === '角色回复')
        .map((记) => (记.数据 as { 消息列表: Array<{ id: string; fa_song_zhe_lei_xing: string }> }).消息列表[0])
        .filter((项) => 项?.fa_song_zhe_lei_xing === 'xitong')
        .map((项) => 项.id)
      expect(提示).toHaveLength(2)
      expect(new Set(提示).size, '同毫秒两条提示不得共用去重键').toBe(2)
    } finally {
      冻结现在.mockRestore()
    }
  })

  it('未被作废的轮次：每条落库都恰好推送一次', async () => {
    假.AI结果 = {
      xiao_xi_lie_biao: ['唯一回复'],
      shi_fou_hui_fu: true,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
    }
    void 调度器.处理用户消息()
    await vi.runOnlyPendingTimersAsync()
    假.落库[0]?.解决({ id: '2' })
    await vi.runAllTimersAsync()

    expect(假.落库).toHaveLength(1)
    expect(已推送条数()).toBe(1)
    expect(baoCunJiaoSeXiaoXi).toHaveBeenCalledTimes(1)
  })

  it('夺舍中的角色不进入 AI 链路', async () => {
    vi.mocked(jiaoSeShiFouBeiDuoShe).mockResolvedValueOnce(true)
    void 调度器.处理用户消息()
    await vi.runAllTimersAsync()

    expect(yunXingAIYinQing).not.toHaveBeenCalled()
    expect(假.落库).toHaveLength(0)
  })

  it('检测阶段命中结算时不启动 AI 计时器', async () => {
    vi.mocked(jianCeYongHuXiaoXiBingChuLi).mockResolvedValueOnce(true)
    await 调度器.处理用户消息()
    await vi.runAllTimersAsync()

    expect(yunXingAIYinQing).not.toHaveBeenCalled()
    expect(chuLiYouXiJieShu).not.toHaveBeenCalled()
  })

  it('角色信息缺失时不落库', async () => {
    vi.mocked(huoQuAIJiaoSeXinXi).mockResolvedValueOnce(null as never)
    void 调度器.处理用户消息()
    await vi.runAllTimersAsync()

    expect(baoCunJiaoSeXiaoXi).not.toHaveBeenCalled()
    expect(huoQuZuiJinDuiHuaLiShi).toHaveBeenCalled()
  })
})
