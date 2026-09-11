import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Server } from 'socket.io'
import { AI回复调度器 } from '../services/AI回复调度器'
import { yunXingAIYinQing } from '../services/AI引擎'
import {
  huoQuAIJiaoSeXinXi,
  huoQuZuiJinDuiHuaLiShi,
  baoCunJiaoSeXiaoXi,
} from '../services/AI输入准备'
import { huoQuIo } from '../socket/io'
import { 数据库 } from '../数据库'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import type { AIJiaoSeXinXi, AIYinQingShuChu } from '../types'
import type { XiaoXiXinXi } from '../services/消息'

vi.mock('../数据库')
vi.mock('../socket/io')
vi.mock('../redis')
vi.mock('../services/夺舍')
vi.mock('../services/复盘', () => ({ shengChengFuPan: vi.fn() }))
vi.mock('../services/挑战积分', () => ({ jieSuanTiaoZhanDuiJu: vi.fn() }))
vi.mock('../services/AI引擎')
vi.mock('../services/AI输入准备')
vi.mock('../services/认证', () => ({
  anIdChaYongHu: vi.fn().mockResolvedValue(null),
}))
vi.mock('../utils/DeepSeek客户端', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/DeepSeek客户端')>()),
  genJuPeiZhiTiaoYong: vi.fn(),
}))

const SI_LIAN_MO_REN_JIE_GUO = {
  是否表白: false,
  表白类型: '非表白',
  表白确信度: 0.1,
  是否互删: false,
  是否识破: false,
  是否神经病: false,
  神经病确信度: 0.1,
  人设能接受: true,
  理由: '',
}

function chuangJianCeShiJiaoSe(): AIJiaoSeXinXi {
  return {
    id: 'jiao-se-id',
    ming_zi: '小雨',
    wei_xin_ming: '雨夜的猫',
    xing_bie: 'nv',
    mbti_lei_xing: 'INFP',
    ie_lei_xing: 'I',
    re_shen_lei_xing: '快热',
    nian_ling: 20,
    shen_fen: '大学生',
    wai_mao: '清秀，长发',
    xing_ge: '温柔敏感',
    bei_jing_gu_shi: '来自江南小城',
    xi_hao: ['画画'],
    yan_yu_feng_ge: '轻柔含蓄',
    xing_wei_te_dian: '害羞但真诚',
    tou_xiang: 'artist',
    xi_huan_de_lei_xing: '温柔体贴',
    jia_ting_bei_jing: '普通家庭',
    qing_gan_jing_li: '有过一段青涩暗恋',
    shi_fou_zha_xing: false,
    shi_jie_xin_xi: {},
    ba_da_mo_kuai: {
      ji_ben_xin_xi: '小雨，女，20岁',
      wai_mao: '清秀，长发',
      xing_ge: '温柔敏感',
      bei_jing: '江南小城',
      yan_yu: '轻柔含蓄',
      xing_wei: '害羞但真诚',
      guan_xi: '喜欢温柔体贴的人',
      xi_tong_ti_shi: 'INFP性格',
    },
  }
}

function chuangJianXiaoXi(id: string, neiRong: string): XiaoXiXinXi {
  return {
    id,
    hui_hua_id: 'jiao-se-id',
    fa_song_zhe_id: 'jiao-se-id',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: neiRong,
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: true,
  }
}

function biaoBaiAIShuChu(biaoBaiNeiRong: string): AIYinQingShuChu {
  return {
    xiao_xi_lie_biao: [biaoBaiNeiRong],
    shi_fou_hui_fu: true,
    shi_fou_che_hui: false,
    jiang_ji_mo_shi: false,
    ce_lue: {
      yong_hu_yi_tu: 'biao_bai_xin_hao',
      qing_gan_fen_xi: '好感度达标',
      hui_fu_ce_lue: 'zhu_dong_biao_bai',
      shi_fou_hui_fu: true,
      hui_fu_tiao_shu: 1,
      shi_jian_qing_xu: 'lang_man',
      shi_fou_che_hui: false,
      shi_fou_zhu_dong_biao_bai: true,
    },
  }
}

function puTongAIShuChu(huiFu: string): AIYinQingShuChu {
  return {
    xiao_xi_lie_biao: [huiFu],
    shi_fou_hui_fu: true,
    shi_fou_che_hui: false,
    jiang_ji_mo_shi: false,
  }
}

describe('P1-13 AI主动表白链路（调度器 → 四连检/表白判定 → 结局推送 全链路）', () => {
  let io: Server
  let emitFn: ReturnType<typeof vi.fn>
  let 调度器: AI回复调度器
  let yongHuId: string
  let yongHuXuHao = 0

  function sheZhiShuJuKuLuYou(): void {
    vi.mocked(数据库.query).mockImplementation(async (sql: unknown) => {
      const wenBen = String(sql)
      if (wenBen.includes('SELECT "用户ID", "是否渣型" FROM "角色"')) {
        const rows = [{ 用户ID: yongHuId, 是否渣型: false }]
        return { rows, command: 'SELECT', rowCount: rows.length } as never
      }
      if (wenBen.includes('INSERT INTO "游戏结局"')) {
        return { rows: [], command: 'INSERT', rowCount: 1 } as never
      }
      return { rows: [], command: 'SELECT', rowCount: 0 } as never
    })
  }

  function sheZhiLLM(biaoBaiPanDing?: Record<string, unknown>): void {
    vi.mocked(genJuPeiZhiTiaoYong).mockImplementation(async (moXingLeiXing) => {
      const shuJu =
        moXingLeiXing === 'jieShouBiaoBaiJianCe' && biaoBaiPanDing
          ? biaoBaiPanDing
          : SI_LIAN_MO_REN_JIE_GUO
      const neiRong = JSON.stringify(shuJu)
      return {
        neiRong,
        xinXi: { role: 'assistant', content: neiRong },
        yuanShuJu: {},
      }
    })
  }

  async function chuFaBiaoBai(biaoBaiNeiRong: string): Promise<void> {
    vi.mocked(yunXingAIYinQing).mockResolvedValueOnce(biaoBaiAIShuChu(biaoBaiNeiRong))
    await 调度器.处理用户消息()
    await vi.advanceTimersByTimeAsync(10000)
    await vi.runAllTimersAsync()
    expect(baoCunJiaoSeXiaoXi).toHaveBeenCalledWith({
      yong_hu_id: yongHuId,
      jiao_se_id: 'jiao-se-id',
      nei_rong: biaoBaiNeiRong,
    })
  }

  function huoQuYouXiShiJian(): Array<Record<string, unknown>> {
    return emitFn.mock.calls
      .filter((call) => call[0] === '游戏事件')
      .map((call) => call[1] as Record<string, unknown>)
  }

  beforeEach(() => {
    vi.useFakeTimers()
    yongHuXuHao += 1
    yongHuId = `yong-hu-${yongHuXuHao}`
    emitFn = vi.fn()
    io = { to: vi.fn().mockReturnValue({ emit: emitFn }) } as unknown as Server
    vi.mocked(huoQuIo).mockReturnValue(io)

    调度器 = new AI回复调度器('jiao-se-id', yongHuId, 'I', io)

    vi.mocked(huoQuAIJiaoSeXinXi).mockResolvedValue(chuangJianCeShiJiaoSe())
    vi.mocked(huoQuZuiJinDuiHuaLiShi).mockResolvedValue([
      {
        fa_song_zhe_lei_xing: 'yonghu',
        fa_song_zhe_ming: '对方',
        nei_rong: '在吗',
        shi_jian: '12:00',
      },
    ])
    vi.mocked(baoCunJiaoSeXiaoXi).mockImplementation(async ({ nei_rong }) =>
      chuangJianXiaoXi(`x-${Math.random()}`, nei_rong),
    )
    vi.mocked(yunXingAIYinQing).mockResolvedValue(puTongAIShuChu('嗯嗯，我在听'))

    sheZhiShuJuKuLuYou()
    sheZhiLLM()
  })

  afterEach(() => {
    调度器.重置()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('AI策略标记主动表白 → 表白消息入库并以角色回复事件推送，路径不触发好感度评判', async () => {
    await chuFaBiaoBai('小雨喜欢你很久了，做我男朋友好不好？')

    const jiaoSeHuiFuCalls = emitFn.mock.calls.filter((call) => call[0] === '角色回复')
    expect(jiaoSeHuiFuCalls.length).toBe(1)
    const shiJian = jiaoSeHuiFuCalls[0][1] as { 消息列表: XiaoXiXinXi[] }
    expect(shiJian.消息列表.length).toBe(1)
    expect(shiJian.消息列表[0].nei_rong).toBe('小雨喜欢你很久了，做我男朋友好不好？')
    expect(shiJian.消息列表[0].fa_song_zhe_lei_xing).toBe('jiaose')

    const leiXingLieBiao = vi.mocked(genJuPeiZhiTiaoYong).mock.calls.map((call) => call[0])
    expect(leiXingLieBiao).toEqual(['siLianJian'])
  })

  it('表白后等待态建立：用户下一条消息触发「接受表白判定」调用而非普通四连检分支', async () => {
    await chuFaBiaoBai('做我男朋友好不好？')

    const ciShuQian = vi.mocked(genJuPeiZhiTiaoYong).mock.calls.length
    await 调度器.处理用户消息()

    const xinZengLeiXing = vi.mocked(genJuPeiZhiTiaoYong)
      .mock.calls.slice(ciShuQian)
      .map((call) => call[0])
    expect(xinZengLeiXing).toEqual(['siLianJian', 'jieShouBiaoBaiJianCe'])
  })

  it('表白后用户高确信接受 → 推送 sheng_li_ai_qing 游戏事件且可继续聊天，不再生成普通回复', async () => {
    await chuFaBiaoBai('做我男朋友好不好？')
    sheZhiLLM({ 是否接受: true, 确信度: 0.95, 是否模糊回复: false, 理由: '明确接受' })

    await 调度器.处理用户消息()
    await vi.runAllTimersAsync()

    const youXiShiJian = huoQuYouXiShiJian()
    expect(youXiShiJian.length).toBeGreaterThan(0)
    expect(youXiShiJian[0]).toMatchObject({
      角色ID: 'jiao-se-id',
      lei_xing: 'sheng_li_ai_qing',
      ke_ji_xu_liao_tian: true,
    })

    const biaoBaiHouDiaoYong = vi.mocked(yunXingAIYinQing).mock.calls.length
    expect(biaoBaiHouDiaoYong).toBe(1)
  })

  it('表白后用户高确信拒绝 → 正常角色推送 shi_bai_ju_jue_biao_bai 游戏事件', async () => {
    await chuFaBiaoBai('做我男朋友好不好？')
    sheZhiLLM({ 是否接受: false, 确信度: 0.9, 是否模糊回复: false, 理由: '明确拒绝' })

    await 调度器.处理用户消息()

    const youXiShiJian = huoQuYouXiShiJian()
    expect(youXiShiJian.length).toBeGreaterThan(0)
    expect(youXiShiJian[0]).toMatchObject({
      角色ID: 'jiao-se-id',
      lei_xing: 'shi_bai_ju_jue_biao_bai',
      ke_ji_xu_liao_tian: false,
    })
  })

  it('表白后用户模糊回复（让我想想）→ 无结局、游戏继续生成普通回复、等待态清除', async () => {
    await chuFaBiaoBai('做我男朋友好不好？')
    sheZhiLLM({ 是否接受: false, 确信度: 0.9, 是否模糊回复: true, 理由: '犹豫未定' })

    await 调度器.处理用户消息()

    expect(huoQuYouXiShiJian()).toEqual([])

    await vi.advanceTimersByTimeAsync(10000)
    await vi.runAllTimersAsync()

    expect(baoCunJiaoSeXiaoXi).toHaveBeenCalledTimes(2)

    const ciShuQian = vi.mocked(genJuPeiZhiTiaoYong).mock.calls.length
    await 调度器.处理用户消息()
    const xinZengLeiXing = vi.mocked(genJuPeiZhiTiaoYong)
      .mock.calls.slice(ciShuQian)
      .map((call) => call[0])
    expect(xinZengLeiXing).toEqual(['siLianJian'])
    expect(huoQuYouXiShiJian()).toEqual([])
  })

  it('表白等待超过30分钟（DENG_DAI_BIAO_BAI_GUO_QI_SHI_JIAN）→ 等待态过期，回到普通四连检流程', async () => {
    await chuFaBiaoBai('做我男朋友好不好？')

    await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 60 * 1000)

    const ciShuQian = vi.mocked(genJuPeiZhiTiaoYong).mock.calls.length
    await 调度器.处理用户消息()

    const xinZengLeiXing = vi.mocked(genJuPeiZhiTiaoYong)
      .mock.calls.slice(ciShuQian)
      .map((call) => call[0])
    expect(xinZengLeiXing).toEqual(['siLianJian'])

    await vi.advanceTimersByTimeAsync(10000)
    await vi.runAllTimersAsync()
    expect(vi.mocked(yunXingAIYinQing).mock.calls.length).toBe(2)
    expect(huoQuYouXiShiJian()).toEqual([])
  })
})
