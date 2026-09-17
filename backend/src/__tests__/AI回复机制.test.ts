import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Server } from 'socket.io'
import { AI回复调度器 } from '../services/AI回复调度器'
import { yunXingAIYinQing } from '../services/AI引擎'
import {
  huoQuAIJiaoSeXinXi,
  huoQuZuiJinDuiHuaLiShi,
  baoCunJiaoSeXiaoXi,
} from '../services/AI输入准备'
import { gengXinHaoGanDu, huoQuWanZhengHaoGanDu } from '../services/好感度'
import { pingPanHaoGanDuBianHua } from '../services/好感度评判'
import {
  jianCeYongHuXiaoXiBingChuLi,
  chuLiAIHuiFuHouJieShuJianCha,
  chuLiYouXiJieShu,
} from '../services/胜利失败条件'
import { jiaoSeShiFouBeiDuoShe } from '../services/夺舍'
import { XIAO_XI_PEI_ZHI } from '../config/消息配置'
import type { AIJiaoSeXinXi, AIYinQingShuChu } from '../types'
import type { XiaoXiXinXi } from '../services/消息'

vi.mock('../services/AI引擎')
vi.mock('../services/AI输入准备')
vi.mock('../services/好感度')
vi.mock('../services/好感度评判')
vi.mock('../services/胜利失败条件')
vi.mock('../services/夺舍')
vi.mock('../services/认证', () => ({
  anIdChaYongHu: vi.fn().mockResolvedValue(null),
}))

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

function chuangJianMockIo(): Server {
  const emit = vi.fn()
  return {
    to: vi.fn().mockReturnValue({ emit }),
  } as unknown as Server
}

function huoQuEmit(io: Server): ReturnType<typeof vi.fn> {
  const to = io.to as ReturnType<typeof vi.fn>
  return to().emit as ReturnType<typeof vi.fn>
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

describe('FP-07 AI回复机制', () => {
  let io: Server
  let 调度器: AI回复调度器

  beforeEach(() => {
    vi.useFakeTimers()
    io = chuangJianMockIo()
    调度器 = new AI回复调度器('jiao-se-id', 'yong-hu-id', 'I', io)

    vi.mocked(huoQuAIJiaoSeXinXi).mockResolvedValue(chuangJianCeShiJiaoSe())
    vi.mocked(huoQuWanZhengHaoGanDu).mockResolvedValue({
      yong_hu_id: 'yong-hu-id',
      jiao_se_id: 'jiao-se-id',
      xin_ren_du: 100,
      qin_mi_du: 100,
      qu_wei_du: 100,
      guan_huai_du: 100,
      zong_fen: 400,
      guan_xi_jie_duan: 'shuXi',
    })
    vi.mocked(huoQuZuiJinDuiHuaLiShi).mockResolvedValue([
      {
        fa_song_zhe_lei_xing: 'yonghu',
        fa_song_zhe_ming: '对方',
        nei_rong: '你好',
        shi_jian: '14:30',
      },
    ])
    vi.mocked(pingPanHaoGanDuBianHua).mockResolvedValue({
      xin_ren_du_bian_hua: 0,
      qin_mi_du_bian_hua: 0,
      qu_wei_du_bian_hua: 0,
      guan_huai_du_bian_hua: 0,
    })
    vi.mocked(gengXinHaoGanDu as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      cheng_gong: true,
    })
    vi.mocked(jianCeYongHuXiaoXiBingChuLi).mockResolvedValue(null)
    vi.mocked(chuLiAIHuiFuHouJieShuJianCha).mockResolvedValue(null)
    vi.mocked(chuLiYouXiJieShu).mockResolvedValue({
      jie_guo_lei_xing: 'shi_bai_mian_da_rao',
      zhuang_tai_wen_ben: 'TA将你设为了免打扰',
      ke_ji_xu_liao_tian: false,
    })
    vi.mocked(jiaoSeShiFouBeiDuoShe).mockResolvedValue(false)
    vi.mocked(baoCunJiaoSeXiaoXi).mockImplementation(async ({ nei_rong }) =>
      chuangJianXiaoXi(`msg-${Date.now()}-${nei_rong}`, nei_rong),
    )
  })

  afterEach(() => {
    调度器.重置()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('10秒延迟', () => {
    it('用户发送消息后10秒内不触发AI处理', async () => {
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['回复'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })

      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(9999)

      expect(yunXingAIYinQing).not.toHaveBeenCalled()
    })

    it('用户发送消息后5秒再发一条，计时器从第二条开始重新计时', async () => {
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['回复'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })

      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(5000)
      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(5000)

      expect(yunXingAIYinQing).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(5000)

      expect(yunXingAIYinQing).toHaveBeenCalled()
    })
  })

  describe('对方正在输入', () => {
    it('AI开始处理时发送对方正在输入事件', async () => {
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['回复'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      vi.mocked(baoCunJiaoSeXiaoXi).mockResolvedValue(chuangJianXiaoXi('x1', '回复'))

      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()

      const emit = huoQuEmit(io)
      expect(emit).toHaveBeenCalledWith('对方正在输入', 'jiao-se-id')
    })
  })

  describe('角色回复事件', () => {
    it('AI发送消息成功时发送角色回复事件且消息数组非空', async () => {
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['回复内容'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      vi.mocked(baoCunJiaoSeXiaoXi).mockResolvedValue(chuangJianXiaoXi('x1', '回复内容'))

      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()

      const emit = huoQuEmit(io)
      const jiaoSeHuiFuCalls = emit.mock.calls.filter(
        (call) => call[0] === '角色回复',
      )
      expect(jiaoSeHuiFuCalls.length).toBeGreaterThan(0)
      const shiJian = jiaoSeHuiFuCalls[0][1] as { 消息列表: XiaoXiXinXi[] }
      expect(shiJian.消息列表.length).toBe(1)
      expect(shiJian.消息列表[0].nei_rong).toBe('回复内容')
    })

    it('AI决定不回复时发送角色回复事件且消息数组为空', async () => {
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: [],
        shi_fou_hui_fu: false,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })

      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()

      const emit = huoQuEmit(io)
      const jiaoSeHuiFuCalls = emit.mock.calls.filter(
        (call) => call[0] === '角色回复',
      )
      expect(jiaoSeHuiFuCalls.length).toBe(1)
      const shiJian = jiaoSeHuiFuCalls[0][1] as { 消息列表: XiaoXiXinXi[] }
      expect(shiJian.消息列表).toEqual([])
    })

    it('Director输出回复条数为3时发送3条AI消息', async () => {
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['第一条', '第二条', '第三条'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      vi.mocked(baoCunJiaoSeXiaoXi)
        .mockResolvedValueOnce(chuangJianXiaoXi('x1', '第一条'))
        .mockResolvedValueOnce(chuangJianXiaoXi('x2', '第二条'))
        .mockResolvedValueOnce(chuangJianXiaoXi('x3', '第三条'))

      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()

      const emit = huoQuEmit(io)
      const jiaoSeHuiFuCalls = emit.mock.calls.filter(
        (call) => call[0] === '角色回复',
      )
      const xiaoXiZongShu = jiaoSeHuiFuCalls.reduce(
        (sum, call) => sum + (call[1] as { 消息列表: XiaoXiXinXi[] }).消息列表.length,
        0,
      )
      expect(xiaoXiZongShu).toBe(3)
    })

    it('Director输出回复条数为0时发送空数组', async () => {
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: [],
        shi_fou_hui_fu: false,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })

      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()

      const emit = huoQuEmit(io)
      const jiaoSeHuiFuCalls = emit.mock.calls.filter(
        (call) => call[0] === '角色回复',
      )
      expect(jiaoSeHuiFuCalls.length).toBe(1)
      const shiJian = jiaoSeHuiFuCalls[0][1] as { 消息列表: XiaoXiXinXi[] }
      expect(shiJian.消息列表).toEqual([])
    })

    it('Director输出超过5条时截断为5条', async () => {
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['1', '2', '3', '4', '5', '6', '7'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      for (let i = 1; i <= 7; i++) {
        vi.mocked(baoCunJiaoSeXiaoXi).mockResolvedValueOnce(
          chuangJianXiaoXi(`x${i}`, `${i}`),
        )
      }

      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()

      const emit = huoQuEmit(io)
      const jiaoSeHuiFuCalls = emit.mock.calls.filter(
        (call) => call[0] === '角色回复',
      )
      const xiaoXiZongShu = jiaoSeHuiFuCalls.reduce(
        (sum, call) => sum + (call[1] as { 消息列表: XiaoXiXinXi[] }).消息列表.length,
        0,
      )
      expect(xiaoXiZongShu).toBe(5)
    })
  })

  describe('I/E型消息间隔', () => {
    it('I型角色多条消息间隔在1500-4500ms范围内', async () => {
      const 调度器I = new AI回复调度器('jiao-se-id', 'yong-hu-id', 'I', io)
      const jianGeJiLu: number[] = []
      const yuanBanBen = 调度器I['计算间隔'].bind(调度器I)

      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['第一条', '第二条'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      vi.mocked(baoCunJiaoSeXiaoXi)
        .mockResolvedValueOnce(chuangJianXiaoXi('x1', '第一条'))
        .mockResolvedValueOnce(chuangJianXiaoXi('x2', '第二条'))

      await 调度器I.处理用户消息()
      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()

      const jianGe = 调度器I['计算间隔']()
      expect(jianGe).toBeGreaterThanOrEqual(1500)
      expect(jianGe).toBeLessThanOrEqual(4500)
      jianGeJiLu.push(jianGe)
      void jianGeJiLu
      void yuanBanBen
      调度器I.重置()
    })

    it('E型角色多条消息间隔在400-1600ms范围内', async () => {
      const 调度器E = new AI回复调度器('jiao-se-id', 'yong-hu-id', 'E', io)

      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['第一条', '第二条'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      vi.mocked(baoCunJiaoSeXiaoXi)
        .mockResolvedValueOnce(chuangJianXiaoXi('x1', '第一条'))
        .mockResolvedValueOnce(chuangJianXiaoXi('x2', '第二条'))

      await 调度器E.处理用户消息()
      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()

      const jianGe = 调度器E['计算间隔']()
      expect(jianGe).toBeGreaterThanOrEqual(400)
      expect(jianGe).toBeLessThanOrEqual(1600)
      调度器E.重置()
    })
  })

  describe('AI状态 广播（状态机唯一事实源）', () => {
    function huoQuAiZhuangTaiJiLu() {
      return huoQuEmit(io)
        .mock.calls.filter((call) => call[0] === 'AI状态')
        .map((call) => call[1] as { jiao_se_id: string; zhuang_tai: string; xu_hao: number; shi_jian: number })
    }

    it('重置广播 kong_xian 且 xu_hao 单调递增', () => {
      调度器.重置()
      let jiLu = huoQuAiZhuangTaiJiLu()
      expect(jiLu.length).toBe(1)
      expect(jiLu[0].jiao_se_id).toBe('jiao-se-id')
      expect(jiLu[0].zhuang_tai).toBe('kong_xian')
      const xu1 = jiLu[0].xu_hao

      调度器.重置()
      jiLu = huoQuAiZhuangTaiJiLu()
      const xu2 = jiLu[jiLu.length - 1].xu_hao
      expect(xu2).toBeGreaterThan(xu1)
    })

    it('用户发消息后进入 deng_dai_zhong（10秒计时中）', async () => {
      await 调度器.处理用户消息()
      const zhuangTaiLieBiao = huoQuAiZhuangTaiJiLu().map((c) => c.zhuang_tai)
      expect(zhuangTaiLieBiao[0]).toBe('kong_xian')
      expect(zhuangTaiLieBiao).toContain('deng_dai_zhong')
    })

    it('AI 开始处理广播 zheng_zai_shu_ru，完成后收敛回 kong_xian', async () => {
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['回复'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      vi.mocked(baoCunJiaoSeXiaoXi).mockResolvedValue(chuangJianXiaoXi('x1', '回复'))

      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()

      const zhuangTaiLieBiao = huoQuAiZhuangTaiJiLu().map((c) => c.zhuang_tai)
      expect(zhuangTaiLieBiao).toContain('zheng_zai_shu_ru')
      expect(zhuangTaiLieBiao[zhuangTaiLieBiao.length - 1]).toBe('kong_xian')
    })

    it('AI 决定不回复（空数组）仍收敛回 kong_xian', async () => {
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: [],
        shi_fou_hui_fu: false,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })

      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()

      const jiLu = huoQuAiZhuangTaiJiLu()
      expect(jiLu[jiLu.length - 1].zhuang_tai).toBe('kong_xian')
    })

    it('AI 处理异常（catch）仍收敛回 kong_xian', async () => {
      vi.mocked(yunXingAIYinQing).mockRejectedValue(new Error('模型故障'))

      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()

      const jiLu = huoQuAiZhuangTaiJiLu()
      expect(jiLu[jiLu.length - 1].zhuang_tai).toBe('kong_xian')
    })

    it('全程 xu_hao 严格单调递增', async () => {
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['回复'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      vi.mocked(baoCunJiaoSeXiaoXi).mockResolvedValue(chuangJianXiaoXi('x1', '回复'))

      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()

      const xuHaoLieBiao = huoQuAiZhuangTaiJiLu().map((c) => c.xu_hao)
      for (let i = 1; i < xuHaoLieBiao.length; i++) {
        expect(xuHaoLieBiao[i]).toBeGreaterThan(xuHaoLieBiao[i - 1])
      }
    })
  })

  describe('FP-17 AI故障可见化 - 错误提示下发', () => {
    it('用户消息检测失败（四连检异常）时下发错误提示', async () => {
      vi.mocked(jianCeYongHuXiaoXiBingChuLi).mockRejectedValue(new Error('检测服务不可用'))

      await 调度器.处理用户消息()

      const emit = huoQuEmit(io)
      const jiaoSeHuiFuCalls = emit.mock.calls.filter(
        (call) => call[0] === '角色回复',
      )
      expect(jiaoSeHuiFuCalls.length).toBeGreaterThan(0)
      const shiJian = jiaoSeHuiFuCalls[0][1] as { 消息列表: XiaoXiXinXi[] }
      expect(shiJian.消息列表.length).toBe(1)
      expect(shiJian.消息列表[0].fa_song_zhe_lei_xing).toBe('xitong')
      expect(shiJian.消息列表[0].nei_rong).toBe('AI暂时无法回复，请稍后再试')
    })
  })

  describe('P0-7 连发免打扰判负', () => {
    function lianFa(tiaoShu: number): Promise<void> {
      let lian = Promise.resolve()
      for (let i = 0; i < tiaoShu; i++) {
        lian = lian.then(() => 调度器.处理用户消息())
      }
      return lian
    }

    it('连发32条（含第12条预警后20条）触发判负并终止AI流程', async () => {
      // 前11条：无预警
      await lianFa(XIAO_XI_PEI_ZHI.lianFaYuJingTiaoShu - 1)
      expect(chuLiYouXiJieShu).not.toHaveBeenCalled()

      // 第12条：触发预警（YH-053轻量通道：本地模板零LLM调用）
      await 调度器.处理用户消息()

      // 预警后计数清零，再发20条触发判负
      await lianFa(XIAO_XI_PEI_ZHI.lianFaMianDaRaoTiaoShu)

      expect(chuLiYouXiJieShu).toHaveBeenCalledTimes(1)
      expect(chuLiYouXiJieShu).toHaveBeenCalledWith(
        'yong-hu-id',
        'jiao-se-id',
        'shi_bai_mian_da_rao',
      )

      await vi.runAllTimersAsync()
      // YH-053轻量通道：预警不再调用全量引擎，正常AI流程未启动
      expect(yunXingAIYinQing).not.toHaveBeenCalled()
    })

    it('AI发出角色回复后计数清零：再连发19条不触发判负', async () => {
      await lianFa(XIAO_XI_PEI_ZHI.lianFaMianDaRaoTiaoShu - 1)
      expect(chuLiYouXiJieShu).not.toHaveBeenCalled()

      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['回复'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      vi.mocked(baoCunJiaoSeXiaoXi).mockResolvedValue(chuangJianXiaoXi('x1', '回复'))

      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()

      expect(baoCunJiaoSeXiaoXi).toHaveBeenCalled()
      expect(chuLiYouXiJieShu).not.toHaveBeenCalled()

      await lianFa(XIAO_XI_PEI_ZHI.lianFaMianDaRaoTiaoShu - 1)

      expect(chuLiYouXiJieShu).not.toHaveBeenCalled()
    })

    it('达阈值时在途检测流程被作废：恢复后不启动AI计时器', async () => {
      let shiFangZaiTuJianCe: (() => void) | null = null
      vi.mocked(jianCeYongHuXiaoXiBingChuLi)
        .mockImplementationOnce(
          () =>
            new Promise<null>((resolve) => {
              shiFangZaiTuJianCe = () => resolve(null)
            }),
        )

      const zaiTu = 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(0)
      expect(shiFangZaiTuJianCe).not.toBeNull()

      // 发送10条（累计11条，未达预警阈值）
      for (let i = 0; i < XIAO_XI_PEI_ZHI.lianFaYuJingTiaoShu - 2; i++) {
        await 调度器.处理用户消息()
      }

      // 第12条触发预警（累计12条）
      await 调度器.处理用户消息()

      // 预警后再发20条触发判负（预警后计数从0开始，20条触发判负）
      for (let i = 0; i < XIAO_XI_PEI_ZHI.lianFaMianDaRaoTiaoShu; i++) {
        await 调度器.处理用户消息()
      }

      // 判负已触发（预警后20条），在途检测虽完成但不应再次触发判负
      expect(chuLiYouXiJieShu).toHaveBeenCalledTimes(1)
      expect(chuLiYouXiJieShu).toHaveBeenCalledWith(
        'yong-hu-id',
        'jiao-se-id',
        'shi_bai_mian_da_rao',
      )

      shiFangZaiTuJianCe!()
      await zaiTu
      await vi.runAllTimersAsync()

      // YH-053轻量通道：预警不再调用全量引擎，正常AI流程未启动
      expect(yunXingAIYinQing).not.toHaveBeenCalled()
    })
  })

  describe('AI主动表白链路（P1-13 补盲区）', () => {
    function chuangJianBiaoBaiShuChu(xiaoXiLieBiao: string[]): AIYinQingShuChu {
      return {
        xiao_xi_lie_biao: xiaoXiLieBiao,
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
        ce_lue: {
          yong_hu_yi_tu: 'biao_bai_xin_hao',
          qing_gan_fen_xi: '好感度达标，关系进入暧昧期',
          hui_fu_ce_lue: 'zhu_dong_biao_bai',
          shi_fou_hui_fu: true,
          hui_fu_tiao_shu: 1,
          shi_jian_qing_xu: 'lang_man',
          shi_fou_che_hui: false,
          shi_fou_zhu_dong_biao_bai: true,
        },
      }
    }

    async function chuFaBiaoBai(biaoBaiNeiRong: string, houXuXiaoXi: string[] = []): Promise<void> {
      vi.mocked(yunXingAIYinQing).mockResolvedValue(
        chuangJianBiaoBaiShuChu([biaoBaiNeiRong, ...houXuXiaoXi]),
      )
      vi.mocked(baoCunJiaoSeXiaoXi).mockImplementation(async ({ nei_rong }) =>
        chuangJianXiaoXi(`bb-${nei_rong}`, nei_rong),
      )

      await 调度器.处理用户消息()
      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()
    }

    function huoQuZuiJinDengDaiZhi(): boolean | undefined {
      const calls = vi.mocked(jianCeYongHuXiaoXiBingChuLi).mock.calls
      if (calls.length === 0) return undefined
      const zuiJin = calls[calls.length - 1] as unknown as [
        string,
        string,
        string,
        number,
        boolean,
      ]
      return zuiJin[4]
    }

    afterEach(async () => {
      // dengDaiBiaoBaiHuiFuMap 为模块级状态：消费一次普通检测确保等待态被清除，防止用例间污染
      vi.mocked(jianCeYongHuXiaoXiBingChuLi).mockResolvedValue(null)
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: [],
        shi_fou_hui_fu: false,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      await 调度器.处理用户消息()
    })

    it('ce_lue.shi_fou_zhu_dong_biao_bai=true → 表白首条入库推送，后续消息不再发送', async () => {
      await chuFaBiaoBai('我喜欢你，做我女朋友吧', '这条不该被发送')

      expect(baoCunJiaoSeXiaoXi).toHaveBeenCalledTimes(1)
      expect(baoCunJiaoSeXiaoXi).toHaveBeenCalledWith({
        yong_hu_id: 'yong-hu-id',
        jiao_se_id: 'jiao-se-id',
        nei_rong: '我喜欢你，做我女朋友吧',
      })

      const emit = huoQuEmit(io)
      const jiaoSeHuiFuCalls = emit.mock.calls.filter((call) => call[0] === '角色回复')
      expect(jiaoSeHuiFuCalls.length).toBe(1)
      const shiJian = jiaoSeHuiFuCalls[0][1] as { 消息列表: XiaoXiXinXi[] }
      expect(shiJian.消息列表.length).toBe(1)
      expect(shiJian.消息列表[0].nei_rong).toBe('我喜欢你，做我女朋友吧')
      expect(shiJian.消息列表[0].fa_song_zhe_lei_xing).toBe('jiaose')
    })

    it('表白路径跳过普通回复的好感度评判与结束检查（提前收敛）', async () => {
      await chuFaBiaoBai('我喜欢你')

      expect(pingPanHaoGanDuBianHua).not.toHaveBeenCalled()
      expect(gengXinHaoGanDu).not.toHaveBeenCalled()
      expect(chuLiAIHuiFuHouJieShuJianCha).not.toHaveBeenCalled()
    })

    it('表白后建立等待态 → 下一条用户消息以 deng_dai_biao_bai_hui_fu=true 进入检测', async () => {
      await chuFaBiaoBai('我喜欢你')
      expect(huoQuZuiJinDengDaiZhi()).toBe(false)

      await 调度器.处理用户消息()

      expect(huoQuZuiJinDengDaiZhi()).toBe(true)
    })

    it('等待态下用户回接受（模拟底层高确信接受结局）→ 流程终止不生成普通回复，等待态清除', async () => {
      await chuFaBiaoBai('我喜欢你，做我女朋友吧')

      vi.mocked(jianCeYongHuXiaoXiBingChuLi).mockImplementation(
        async (_y, _j, _x, _h, dengDaiBiaoBaiHuiFu) => {
          if (!dengDaiBiaoBaiHuiFu) return null
          return {
            jie_guo_lei_xing: 'sheng_li_ai_qing',
            zhuang_tai_wen_ben: '在一起了 💕',
            ke_ji_xu_liao_tian: true,
          }
        },
      )

      await 调度器.处理用户消息()
      await vi.runAllTimersAsync()

      expect(yunXingAIYinQing).toHaveBeenCalledTimes(1)

      await 调度器.处理用户消息()
      expect(huoQuZuiJinDengDaiZhi()).toBe(false)
    })

    it('等待态下用户拒绝（模拟底层高确信拒绝结局）→ 同样终止流程并清除等待态', async () => {
      await chuFaBiaoBai('我喜欢你，做我女朋友吧')

      vi.mocked(jianCeYongHuXiaoXiBingChuLi).mockImplementation(
        async (_y, _j, _x, _h, dengDaiBiaoBaiHuiFu) => {
          if (!dengDaiBiaoBaiHuiFu) return null
          return {
            jie_guo_lei_xing: 'shi_bai_ju_jue_biao_bai',
            zhuang_tai_wen_ben: '你拒绝了TA的表白',
            ke_ji_xu_liao_tian: false,
          }
        },
      )

      await 调度器.处理用户消息()
      await vi.runAllTimersAsync()

      expect(yunXingAIYinQing).toHaveBeenCalledTimes(1)

      await 调度器.处理用户消息()
      expect(huoQuZuiJinDengDaiZhi()).toBe(false)
    })

    it('表白等待超过30分钟 → 等待态过期，下一条消息回到普通流程', async () => {
      await chuFaBiaoBai('我喜欢你')
      expect(huoQuZuiJinDengDaiZhi()).toBe(false)

      await vi.advanceTimersByTimeAsync(30 * 60 * 1000 + 60 * 1000)

      await 调度器.处理用户消息()
      expect(huoQuZuiJinDengDaiZhi()).toBe(false)
    })

    it('模糊回复（检测返回null不结束游戏）→ 游戏继续生成普通回复且等待态清除', async () => {
      await chuFaBiaoBai('我喜欢你')

      vi.mocked(jianCeYongHuXiaoXiBingChuLi).mockResolvedValue(null)
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['让我想想也是'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      vi.mocked(baoCunJiaoSeXiaoXi).mockResolvedValue(chuangJianXiaoXi('pt1', '让我想想也是'))

      await 调度器.处理用户消息()
      expect(huoQuZuiJinDengDaiZhi()).toBe(true)

      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()

      expect(baoCunJiaoSeXiaoXi).toHaveBeenCalledWith({
        yong_hu_id: 'yong-hu-id',
        jiao_se_id: 'jiao-se-id',
        nei_rong: '让我想想也是',
      })

      await 调度器.处理用户消息()
      expect(huoQuZuiJinDengDaiZhi()).toBe(false)
    })
  })
})
