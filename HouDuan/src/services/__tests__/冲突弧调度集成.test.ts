import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'socket.io'
import type { AIYinQingShuChu, ChongTuZhuangTaiMing } from '../../types'
import type { 消息信息 } from '../消息'

const redisMock = vi.hoisted(() => ({
  get: vi.fn(async () => null),
  set: vi.fn(async () => 'OK'),
  del: vi.fn(async () => 1),
}))

const chongTuHuMock = vi.hoisted(() => ({
  biaoJiXiaoXiYiDu: vi.fn(async () => undefined),
  diZengFuYanJiShu: vi.fn(async () => 1),
  huaJieChongTu: vi.fn(async () => true),
  huoQuChongTuXinXi: vi.fn(async (): Promise<{ zhuangTai: ChongTuZhuangTaiMing; shiYou: string; shengJiJiShu: number } | null> => null),
  huoQuChongTuZhuangTai: vi.fn(async (): Promise<ChongTuZhuangTaiMing> => 'wu'),
  renSheHuaJieJiaCheng: vi.fn((reShenLeiXing?: string) => (reShenLeiXing === '快热' ? 6 : reShenLeiXing === '慢热' ? 3 : 4)),
  shengJiChongTu: vi.fn(async (): Promise<{ chengGong: boolean; shengJi: boolean; zhuangTai: ChongTuZhuangTaiMing | null }> => ({ chengGong: false, shengJi: false, zhuangTai: null })),
}))

const pingPanMock = vi.hoisted(() => ({
  pingPanHaoGanDuPiLiangNei: vi.fn(),
  pingPanXiuFu: vi.fn(),
}))

vi.mock('../../redis', () => ({
  redis: redisMock,
  daiRongDuanZhiXing: vi.fn(async (_mingCheng: string, dongZuo: () => Promise<unknown>) => dongZuo()),
  redisRongDuanShiFouKaiLu: vi.fn(() => false),
  dengDaiRedisJiuXu: vi.fn(async () => undefined),
  tanCeRedisJiuXu: vi.fn(async () => true),
  biaoJiRedisYiTanCeShiBai: vi.fn(),
  gouJianRedisLianJiePeiZhi: vi.fn(() => ({ host: '127.0.0.1', port: 6379 })),
}))
vi.mock('../冲突弧', async (importOriginal) => ({ ...(await importOriginal<typeof import('../冲突弧')>()), ...chongTuHuMock }))
vi.mock('../好感度评判', () => pingPanMock)
vi.mock('../AI引擎', () => ({ yunXingAIYinQing: vi.fn() }))
vi.mock('../AI输入准备', () => ({
  保存角色XiaoXi: vi.fn(),
  huoQuAIJiaoSeXinXi: vi.fn(async () => ({
    jiao_se_id: 'j-1',
    wei_xin_ming: '糖糖',
    ming_zi: '糖糖',
    re_shen_lei_xing: '快热',
    ie_lei_xing: 'E',
    mbti_lei_xing: 'ESFP',
  })),
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
  const shiJi = await importOriginal<typeof import('../Prompt构建器')>()
  return {
    ...shiJi,
    zhunBeiRiCheng: vi.fn(async () => undefined),
  }
})
vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuHaoGanDuBianHua: vi.fn(),
}))

import { AI回复调度器 } from '../AI回复调度器'
import { yunXingAIYinQing } from '../AI引擎'
import { 保存角色XiaoXi, huoQuZuiJinDuiHuaLiShi } from '../AI输入准备'
import { gengXinHaoGanDu } from '../好感度'
import { xieRuDangQianXinQing } from '../当前心情'
import { debug日志 } from '../../utils/debug日志'

function 造调度器() {
  const emit = vi.fn()
  const io = { to: vi.fn(() => ({ emit })) } as unknown as Server
  const 调度器 = new AI回复调度器('j-1', 'u-1', 'E', io, 0)
  const 内部 = 调度器 as unknown as Record<string, unknown>
  内部.回复延迟毫秒 = 0
  内部.计算间隔 = () => 0
  内部.获取最新消息文本 = async () => '对不起，那天是我不对'
  const 用户房事件 = () =>
    emit.mock.calls.filter(([ming]) => ming !== '管理员_隐藏信息' && ming !== '管理员_构建过程')
  return { 调度器, 内部, emit, 用户房事件 }
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

function 造历史(faSongZheLeiXing: 'yonghu' | 'jiaose', id: string, neiRong: string) {
  return {
    id,
    fa_song_zhe_lei_xing: faSongZheLeiXing,
    fa_song_zhe_ming: faSongZheLeiXing === 'yonghu' ? '对方' : '糖糖',
    nei_rong: neiRong,
    shi_jian: new Date().toISOString(),
  }
}

function 评判返回(liuFuPanDing?: 'chengLi' | 'fuYan' | 'wuGuan') {
  return {
    jieGuo: {
      xin_ren_du_bian_hua: 5,
      qin_mi_du_bian_hua: 5,
      qu_wei_du_bian_hua: 5,
      guan_huai_du_bian_hua: 5,
      li_you: '有诚意',
    },
    xiShu: 1,
    muBiaoQuXian: 0,
    lianXuWeiDaBiao: 0,
    pingJunShuaiJianHou: 0,
    ...(liuFuPanDing ? { xiuFuPanDing: liuFuPanDing } : {}),
  }
}

function 普通回复(ceLue?: Record<string, unknown>): AIYinQingShuChu {
  return {
    xiao_xi_lie_biao: ['我知道了。'],
    shi_fou_hui_fu: true,
    shi_fou_che_hui: false,
    jiang_ji_mo_shi: false,
    ...(ceLue ? { ce_lue: ceLue as unknown as AIYinQingShuChu['ce_lue'] } : {}),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  chongTuHuMock.huoQuChongTuZhuangTai.mockResolvedValue('wu')
  chongTuHuMock.huoQuChongTuXinXi.mockResolvedValue(null)
  chongTuHuMock.huaJieChongTu.mockResolvedValue(true)
  chongTuHuMock.diZengFuYanJiShu.mockResolvedValue(1)
  chongTuHuMock.shengJiChongTu.mockResolvedValue({ chengGong: false, shengJi: false, zhuangTai: null })
  pingPanMock.pingPanXiuFu.mockResolvedValue(undefined)
})

describe('已读不回闸', () => {
  it('最高档时用户消息只标记已读并发已读不回事件，不触发 Director/Writer，不落任何回复', async () => {
    const { 调度器, 用户房事件 } = 造调度器()
    chongTuHuMock.huoQuChongTuZhuangTai.mockResolvedValue('yiDuBuHui')
    pingPanMock.pingPanXiuFu.mockResolvedValue('wuGuan')
    vi.mocked(huoQuZuiJinDuiHuaLiShi).mockResolvedValue([造历史('yonghu', 'm-1', '你到底还理不理我')] as never)

    await 调度器.处理用户消息('m-1')

    expect(yunXingAIYinQing).not.toHaveBeenCalled()
    expect(vi.mocked(保存角色XiaoXi)).not.toHaveBeenCalled()
    expect(chongTuHuMock.biaoJiXiaoXiYiDu).toHaveBeenCalledWith('u-1', 'j-1', ['m-1'])
    expect(用户房事件()).toEqual([
      ['已读不回', { jiao_se_id: 'j-1', yuan_yin: 'chongTuYiDuBuHui' }],
    ])
    expect(chongTuHuMock.huaJieChongTu).not.toHaveBeenCalled()
    expect(chongTuHuMock.diZengFuYanJiShu).not.toHaveBeenCalled()
    expect(调度器.是否处理中()).toBe(false)
  })

  it('已读不回状态里敷衍发言：不化解且敷衍计数加一，依旧静默', async () => {
    const { 调度器 } = 造调度器()
    chongTuHuMock.huoQuChongTuZhuangTai.mockResolvedValue('yiDuBuHui')
    pingPanMock.pingPanXiuFu.mockResolvedValue('fuYan')
    vi.mocked(huoQuZuiJinDuiHuaLiShi).mockResolvedValue([造历史('yonghu', 'm-2', '哦')] as never)

    await 调度器.处理用户消息('m-2')

    expect(chongTuHuMock.diZengFuYanJiShu).toHaveBeenCalledWith('u-1', 'j-1')
    expect(chongTuHuMock.huaJieChongTu).not.toHaveBeenCalled()
    expect(yunXingAIYinQing).not.toHaveBeenCalled()
    expect(chongTuHuMock.biaoJiXiaoXiYiDu).toHaveBeenCalledWith('u-1', 'j-1', ['m-2'])
  })

  it('已读不回状态里真诚道歉当场化解：状态归零、心情好转、人设加成落库，本轮照常回复且单条消息只生成一次', async () => {
    const { 调度器, 内部 } = 造调度器()
    chongTuHuMock.huoQuChongTuZhuangTai
      .mockResolvedValueOnce('yiDuBuHui')
      .mockResolvedValue('wu')
    chongTuHuMock.huoQuChongTuXinXi.mockResolvedValue({ zhuangTai: 'yiDuBuHui', shiYou: '放了鸽子', shengJiJiShu: 0 })
    pingPanMock.pingPanXiuFu.mockResolvedValue('chengLi')
    vi.mocked(yunXingAIYinQing).mockResolvedValueOnce(普通回复())
    let jiShiQiChuFaChuLi: Promise<void> | null = null
    内部.启动AI计时器 = () => {
      jiShiQiChuFaChuLi = (内部.触发AI处理 as () => Promise<void>)()
    }

    await 调度器.处理用户消息('m-3')
    await jiShiQiChuFaChuLi

    expect(chongTuHuMock.huaJieChongTu).toHaveBeenCalledTimes(1)
    expect(chongTuHuMock.huaJieChongTu).toHaveBeenCalledWith('u-1', 'j-1')
    expect(vi.mocked(xieRuDangQianXinQing)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(xieRuDangQianXinQing)).toHaveBeenCalledWith('j-1', '平静', 15, '冲突化解')
    expect(vi.mocked(gengXinHaoGanDu)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(gengXinHaoGanDu)).toHaveBeenCalledWith('u-1', 'j-1', {
      xin_ren_du_bian_hua: 6,
      qin_mi_du_bian_hua: 6,
      qu_wei_du_bian_hua: 6,
      guan_huai_du_bian_hua: 6,
    })
    expect(yunXingAIYinQing).toHaveBeenCalledTimes(1)
    expect(vi.mocked(保存角色XiaoXi)).toHaveBeenCalledTimes(1)
  })

  it('冲突读取失败时闸门放行，不阻断正常聊天', async () => {
    const { 调度器, 内部 } = 造调度器()
    chongTuHuMock.huoQuChongTuZhuangTai.mockRejectedValue(new Error('库挂了'))
    内部.检测用户消息并决定后续 = async () => undefined

    await 调度器.处理用户消息('m-4')

    expect(yunXingAIYinQing).not.toHaveBeenCalled()
    expect(vi.mocked(debug日志.warn)).toHaveBeenCalledWith(
      'AI调度器',
      '冲突状态读取失败，本轮不启用已读不回闸',
      expect.objectContaining({ xiang_qing: expect.objectContaining({ yong_hu_id: 'u-1' }) }),
    )
  })
})

describe('Director 冲突事件升档', () => {
  it('严重冒犯事件：wu 升到 lengZhan，同步写入高强度负面心情', async () => {
    const { 内部 } = 造调度器()
    chongTuHuMock.huoQuChongTuZhuangTai.mockResolvedValue('wu')
    chongTuHuMock.shengJiChongTu.mockResolvedValue({ chengGong: true, shengJi: true, zhuangTai: 'lengZhan' })
    vi.mocked(yunXingAIYinQing).mockResolvedValueOnce(普通回复({
      chongTuShiJian: { dongZuo: 'yanZhong', shiYou: '拿我家人开玩笑' },
    }))
    vi.mocked(保存角色XiaoXi).mockResolvedValue(造消息('m-5', '我知道了。'))
    pingPanMock.pingPanHaoGanDuPiLiangNei.mockResolvedValue(评判返回())

    await (内部.触发AI处理 as () => Promise<void>)()

    expect(chongTuHuMock.shengJiChongTu).toHaveBeenCalledWith('u-1', 'j-1', '拿我家人开玩笑')
    expect(vi.mocked(xieRuDangQianXinQing)).toHaveBeenCalledWith('j-1', '生气', 90, '拿我家人开玩笑')
  })

  it('弧内再次严重冒犯逐级升档；普通生气事件不改档也不覆盖心情', async () => {
    const { 内部 } = 造调度器()
    chongTuHuMock.huoQuChongTuZhuangTai.mockResolvedValue('lengZhan')
    chongTuHuMock.shengJiChongTu.mockResolvedValue({ chengGong: true, shengJi: true, zhuangTai: 'huiBi' })
    vi.mocked(yunXingAIYinQing).mockResolvedValueOnce(普通回复({
      chongTuShiJian: { dongZuo: 'yanZhong', shiYou: '变本加厉' },
    }))
    vi.mocked(保存角色XiaoXi).mockResolvedValue(造消息('m-6', '随便。'))
    pingPanMock.pingPanHaoGanDuPiLiangNei.mockResolvedValue(评判返回())

    await (内部.触发AI处理 as () => Promise<void>)()

    expect(chongTuHuMock.shengJiChongTu).toHaveBeenCalledWith('u-1', 'j-1', '变本加厉')
    expect(vi.mocked(xieRuDangQianXinQing)).toHaveBeenCalledWith('j-1', '生气', 90, '变本加厉')

    vi.clearAllMocks()
    chongTuHuMock.huoQuChongTuZhuangTai.mockResolvedValue('wu')
    vi.mocked(yunXingAIYinQing).mockResolvedValueOnce(普通回复({
      chongTuShiJian: { dongZuo: 'shengQi', shiYou: '甩脸子' },
    }))
    vi.mocked(保存角色XiaoXi).mockResolvedValue(造消息('m-7', '行。'))
    pingPanMock.pingPanHaoGanDuPiLiangNei.mockResolvedValue(评判返回())

    await (内部.触发AI处理 as () => Promise<void>)()

    expect(chongTuHuMock.shengJiChongTu).not.toHaveBeenCalled()
    expect(vi.mocked(xieRuDangQianXinQing)).not.toHaveBeenCalledWith('j-1', '生气', 90, expect.anything())
  })
})

describe('修复判定与敷衍递减（主聊天路径）', () => {
  it('修复成立：化解归零、心情降到低位、好感度按人设小幅加成后落库', async () => {
    const { 内部 } = 造调度器()
    chongTuHuMock.huoQuChongTuZhuangTai.mockResolvedValue('lengZhan')
    vi.mocked(yunXingAIYinQing).mockResolvedValueOnce(普通回复())
    vi.mocked(保存角色XiaoXi).mockResolvedValue(造消息('m-8', '对不起，我错了。'))
    pingPanMock.pingPanHaoGanDuPiLiangNei.mockResolvedValue(评判返回('chengLi'))

    await (内部.触发AI处理 as () => Promise<void>)()

    expect(chongTuHuMock.huaJieChongTu).toHaveBeenCalledWith('u-1', 'j-1')
    expect(vi.mocked(xieRuDangQianXinQing)).toHaveBeenCalledWith('j-1', '平静', 15, '冲突化解')
    expect(vi.mocked(gengXinHaoGanDu)).toHaveBeenCalledWith(
      'u-1',
      'j-1',
      {
        xin_ren_du_bian_hua: 11,
        qin_mi_du_bian_hua: 11,
        qu_wei_du_bian_hua: 11,
        guan_huai_du_bian_hua: 11,
        li_you: '有诚意',
      },
      1,
      0,
      0,
    )
  })

  it('敷衍：不化解、敷衍计数加一、好感度原样落库', async () => {
    const { 内部 } = 造调度器()
    chongTuHuMock.huoQuChongTuZhuangTai.mockResolvedValue('huiBi')
    vi.mocked(yunXingAIYinQing).mockResolvedValueOnce(普通回复())
    vi.mocked(保存角色XiaoXi).mockResolvedValue(造消息('m-9', '嗯。'))
    pingPanMock.pingPanHaoGanDuPiLiangNei.mockResolvedValue(评判返回('fuYan'))

    await (内部.触发AI处理 as () => Promise<void>)()

    expect(chongTuHuMock.huaJieChongTu).not.toHaveBeenCalled()
    expect(chongTuHuMock.diZengFuYanJiShu).toHaveBeenCalledWith('u-1', 'j-1')
    expect(vi.mocked(gengXinHaoGanDu)).toHaveBeenCalledWith(
      'u-1',
      'j-1',
      {
        xin_ren_du_bian_hua: 5,
        qin_mi_du_bian_hua: 5,
        qu_wei_du_bian_hua: 5,
        guan_huai_du_bian_hua: 5,
        li_you: '有诚意',
      },
      1,
      0,
      0,
    )
    expect(vi.mocked(xieRuDangQianXinQing)).not.toHaveBeenCalledWith('j-1', '平静', 15, expect.anything())
  })
})

describe('冲突状态注入与追加消息闸', () => {
  it('运行AI把冲突档位与事由带入引擎输入，Writer 形态层可读', async () => {
    const { 内部 } = 造调度器()
    chongTuHuMock.huoQuChongTuZhuangTai.mockResolvedValue('lengZhan')
    chongTuHuMock.huoQuChongTuXinXi.mockResolvedValue({ zhuangTai: 'lengZhan', shiYou: '放了鸽子', shengJiJiShu: 1 })
    vi.mocked(yunXingAIYinQing).mockResolvedValueOnce(普通回复())
    vi.mocked(保存角色XiaoXi).mockResolvedValue(造消息('m-10', '哦。'))
    pingPanMock.pingPanHaoGanDuPiLiangNei.mockResolvedValue(评判返回())

    await (内部.触发AI处理 as () => Promise<void>)()

    const yinQingRuCan = vi.mocked(yunXingAIYinQing).mock.calls[0][0]
    expect(yinQingRuCan.chongTuZhuangTai).toBe('lengZhan')
    expect(yinQingRuCan.chongTuShiYou).toBe('放了鸽子')
  })

  it('已读不回中追加消息直接跳过，不判定不发送', async () => {
    const { 内部 } = 造调度器()
    chongTuHuMock.huoQuChongTuXinXi.mockResolvedValue({ zhuangTai: 'yiDuBuHui', shiYou: '事由', shengJiJiShu: 0 })
    内部.上条角色消息时刻 = Date.now()

    await (内部.执行追加消息 as () => Promise<void>)()

    expect(yunXingAIYinQing).not.toHaveBeenCalled()
    expect(redisMock.set).not.toHaveBeenCalled()
    expect(vi.mocked(huoQuZuiJinDuiHuaLiShi)).not.toHaveBeenCalled()
  })

  it('已读不回中不安排主动关怀消息', async () => {
    const { 内部 } = 造调度器()
    const guanHuaiMoKuai = await import('../主动关怀调度器')
    chongTuHuMock.huoQuChongTuZhuangTai.mockResolvedValue('yiDuBuHui')
    vi.mocked(yunXingAIYinQing).mockResolvedValueOnce(普通回复())
    vi.mocked(保存角色XiaoXi).mockResolvedValue(造消息('m-11', '嗯。'))
    pingPanMock.pingPanHaoGanDuPiLiangNei.mockResolvedValue(评判返回())

    await (内部.触发AI处理 as () => Promise<void>)()
    await new Promise((jie) => setTimeout(jie, 0))

    expect(vi.mocked(guanHuaiMoKuai.anPaiGuanHuai)).not.toHaveBeenCalled()
  })
})
