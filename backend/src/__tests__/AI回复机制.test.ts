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
import { jianCeYongHuXiaoXiBingChuLi, chuLiAIHuiFuHouJieShuJianCha } from '../services/胜利失败条件'
import { jiaoSeShiFouBeiDuoShe } from '../services/夺舍'
import type { AIJiaoSeXinXi } from '../types'
import type { XiaoXiXinXi } from '../services/消息'

vi.mock('../services/AI引擎')
vi.mock('../services/AI输入准备')
vi.mock('../services/好感度')
vi.mock('../services/好感度评判')
vi.mock('../services/胜利失败条件')
vi.mock('../services/夺舍')

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
    kai_chang_bai: ['你好呀'],
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
    vi.mocked(jiaoSeShiFouBeiDuoShe).mockResolvedValue(false)
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
})
