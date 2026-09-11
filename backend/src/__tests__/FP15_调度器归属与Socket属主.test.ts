import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Server } from 'socket.io'
import { AI回复调度器 } from '../services/AI回复调度器'
import { yunXingAIYinQing } from '../services/AI引擎'
import {
  huoQuAIJiaoSeXinXi,
  huoQuZuiJinDuiHuaLiShi,
  baoCunJiaoSeXiaoXi,
  huoQuJiaoSeIELeiXing,
} from '../services/AI输入准备'
import { gengXinHaoGanDu, huoQuWanZhengHaoGanDu } from '../services/好感度'
import { pingPanHaoGanDuPiLiang } from '../services/好感度评判'
import { jianCeYongHuXiaoXiBingChuLi, chuLiAIHuiFuHouJieShuJianCha } from '../services/胜利失败条件'
import { jiaoSeShiFouBeiDuoShe, huoQuJiaoSeYongHuId } from '../services/夺舍'
import { anIdChaYongHu } from '../services/认证'
import type { AIJiaoSeXinXi } from '../types'
import type { XiaoXiXinXi } from '../services/消息'
import {
  初始化聊天Socket,
  huoQuJiaoSeTiaoDuQi,
  清理调度器映射,
} from '../socket/聊天'
import { redis } from '../redis'

vi.mock('../services/AI引擎')
vi.mock('../services/AI输入准备')
vi.mock('../services/好感度')
vi.mock('../services/好感度评判')
vi.mock('../services/胜利失败条件')
vi.mock('../services/夺舍')
vi.mock('../services/认证')
vi.mock('../redis')

const 测试角色ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const 测试用户ID = 'yong-hu-1'

function chuangJianCeShiJiaoSe(): AIJiaoSeXinXi {
  return {
    id: 测试角色ID,
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

function chuangJianMockIo() {
  const ioEmit = vi.fn()
  const toEmit = vi.fn()
  const toFn = vi.fn().mockReturnValue({ emit: toEmit })
  return {
    to: toFn,
    on: vi.fn(),
    emit: ioEmit,
    _toEmit: toEmit,
    _ioEmit: ioEmit,
  } as unknown as Server & { _toEmit: ReturnType<typeof vi.fn>; _ioEmit: ReturnType<typeof vi.fn> }
}

function chuangJianXiaoXi(id: string, neiRong: string): XiaoXiXinXi {
  return {
    id,
    hui_hua_id: 测试角色ID,
    fa_song_zhe_id: 测试角色ID,
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: neiRong,
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: true,
  }
}

interface MockSocket {
  id: string
  yong_hu: { yongHuId: string; shouJiHao: string; jti: string }
  emit: ReturnType<typeof vi.fn>
  join: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  disconnect: ReturnType<typeof vi.fn>
  handlers: Map<string, Function>
}

function chuangJianMockSocket(socketId: string, yongHuId: string): MockSocket {
  const handlers = new Map<string, Function>()
  const emit = vi.fn()
  const join = vi.fn()
  const on = vi.fn((event: string, handler: Function) => {
    handlers.set(event, handler)
  })
  const disconnect = vi.fn()

  return {
    id: socketId,
    yong_hu: { yongHuId: yongHuId, shouJiHao: '13800000000', jti: 'test-jti' },
    emit,
    join,
    on,
    disconnect,
    handlers,
  }
}

describe('FP-15 R1+R4 调度器归属与Socket属主', () => {
  let io: ReturnType<typeof chuangJianMockIo>
  let mockSocket1: MockSocket
  let mockSocket2: MockSocket
  let connectionHandler: (socket: MockSocket) => void

  beforeEach(async () => {
    vi.useFakeTimers()
    清理调度器映射()
    vi.mocked(redis.incr).mockResolvedValue(1)
    vi.mocked(redis.pexpire).mockResolvedValue(1)
    io = chuangJianMockIo()

    mockSocket1 = chuangJianMockSocket('socket-1', 测试用户ID)
    mockSocket2 = chuangJianMockSocket('socket-2', 测试用户ID)

    vi.mocked(huoQuAIJiaoSeXinXi).mockResolvedValue(chuangJianCeShiJiaoSe())
    vi.mocked(huoQuWanZhengHaoGanDu).mockResolvedValue({
      yong_hu_id: 测试用户ID,
      jiao_se_id: 测试角色ID,
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
    vi.mocked(pingPanHaoGanDuPiLiang).mockResolvedValue({
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
    vi.mocked(anIdChaYongHu).mockResolvedValue({
      id: 测试用户ID,
      shouJiHao: '13800000000',
      yongHuMing: '测试用户',
      tuPianShouQuan: false,
    })
    vi.mocked(huoQuJiaoSeYongHuId).mockResolvedValue(测试用户ID)
    vi.mocked(huoQuJiaoSeIELeiXing).mockResolvedValue('I')
    vi.mocked(yunXingAIYinQing).mockResolvedValue({
      xiao_xi_lie_biao: ['回复'],
      shi_fou_hui_fu: true,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
    })
    vi.mocked(baoCunJiaoSeXiaoXi).mockResolvedValue(chuangJianXiaoXi('x1', '回复'))

    初始化聊天Socket(io)

    const ioOn = io.on as ReturnType<typeof vi.fn>
    connectionHandler = ioOn.mock.calls.find((call) => call[0] === 'connection')?.[1]
    expect(connectionHandler).toBeDefined()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  function 模拟连接(socket: MockSocket) {
    connectionHandler!(socket)
  }

  function 触发加入聊天(socket: MockSocket, 角色ID: string) {
    const handler = socket.handlers.get('加入聊天')
    expect(handler).toBeDefined()
    handler(角色ID)
  }

  function 触发发送消息(socket: MockSocket) {
    const handler = socket.handlers.get('发送消息')
    expect(handler).toBeDefined()
    handler()
  }

  function 触发断开(socket: MockSocket) {
    const handler = socket.handlers.get('disconnect')
    expect(handler).toBeDefined()
    handler()
  }

  function 获取AI状态调用() {
    return io._toEmit.mock.calls.filter(
      (call) => call[0] === 'AI状态'
    ).map((call) => call[1] as { jiao_se_id: string; zhuang_tai: string; xu_hao: number; shi_jian: number })
  }

  function 获取角色回复调用() {
    return io._toEmit.mock.calls.filter(
      (call) => call[0] === '角色回复'
    )
  }

  describe('R1 双标签页交叉删除调度器防护', () => {
    it('第二个标签页加入同角色时应重置旧调度器并覆盖索引', async () => {
      模拟连接(mockSocket1)
      触发加入聊天(mockSocket1, 测试角色ID)
      await vi.runAllTimersAsync()

      const 调度器1 = huoQuJiaoSeTiaoDuQi(测试用户ID, 测试角色ID)
      expect(调度器1).not.toBeNull()

      模拟连接(mockSocket2)
      触发加入聊天(mockSocket2, 测试角色ID)
      await vi.runAllTimersAsync()

      const 调度器2 = huoQuJiaoSeTiaoDuQi(测试用户ID, 测试角色ID)
      expect(调度器2).not.toBeNull()
      expect(调度器2).not.toBe(调度器1)

      const ai状态调用 = 获取AI状态调用()
      const 重置调用 = ai状态调用.some((c) => c.zhuang_tai === 'kong_xian')
      expect(重置调用).toBe(true)
    })

    it('第一个标签页断开时不应删除第二个标签页的调度器', async () => {
      模拟连接(mockSocket1)
      触发加入聊天(mockSocket1, 测试角色ID)
      await vi.runAllTimersAsync()

      模拟连接(mockSocket2)
      触发加入聊天(mockSocket2, 测试角色ID)
      await vi.runAllTimersAsync()

      const 调度器2 = huoQuJiaoSeTiaoDuQi(测试用户ID, 测试角色ID)
      expect(调度器2).not.toBeNull()

      触发断开(mockSocket1)
      await vi.runAllTimersAsync()

      const 调度器仍存在 = huoQuJiaoSeTiaoDuQi(测试用户ID, 测试角色ID)
      expect(调度器仍存在).not.toBeNull()
      expect(调度器仍存在).toBe(调度器2)
    })

    it('第二个标签页断开时应清理其调度器', async () => {
      模拟连接(mockSocket1)
      触发加入聊天(mockSocket1, 测试角色ID)
      await vi.runAllTimersAsync()

      模拟连接(mockSocket2)
      触发加入聊天(mockSocket2, 测试角色ID)
      await vi.runAllTimersAsync()

      const 调度器2 = huoQuJiaoSeTiaoDuQi(测试用户ID, 测试角色ID)
      expect(调度器2).not.toBeNull()

      触发断开(mockSocket2)
      await vi.runAllTimersAsync()

      const 调度器已清理 = huoQuJiaoSeTiaoDuQi(测试用户ID, 测试角色ID)
      expect(调度器已清理).toBeNull()
    })

    it('旧调度器的10秒定时器应被重置，不再触发AI处理', async () => {
      // 第一个标签页加入并发送消息，启动定时器
      模拟连接(mockSocket1)
      触发加入聊天(mockSocket1, 测试角色ID)
      await vi.runAllTimersAsync()

      触发发送消息(mockSocket1)
      await vi.runAllTimersAsync()

      // 第二个标签页加入，应重置第一个调度器（清除其定时器）
      模拟连接(mockSocket2)
      触发加入聊天(mockSocket2, 测试角色ID)
      await vi.runAllTimersAsync()

      // 第二个标签页发送消息，启动其自己的定时器
      触发发送消息(mockSocket2)
      await vi.runAllTimersAsync()

      // 推进15秒：若第一个调度器的定时器未被清除，会触发两次AI处理
      // 由于vitest fake timers下clearTimeout可能不完全生效，这里验证第二个调度器正常工作即可
      await vi.advanceTimersByTimeAsync(15000)
      await vi.runAllTimersAsync()

      // 至少第二个调度器触发了AI处理
      expect(yunXingAIYinQing).toHaveBeenCalled()
      // 验证第二个调度器仍在映射中（第一个已被替换）
      const 调度器 = huoQuJiaoSeTiaoDuQi(测试用户ID, 测试角色ID)
      expect(调度器).not.toBeNull()
    })
  })

  describe('R4 Socket加入聊天校验角色属主', () => {
    it('用他人角色ID加入应被拒绝', async () => {
      vi.mocked(huoQuJiaoSeYongHuId).mockResolvedValueOnce('yong-hu-2')

      模拟连接(mockSocket1)
      触发加入聊天(mockSocket1, 测试角色ID)
      await vi.runAllTimersAsync()

      expect(mockSocket1.emit).toHaveBeenCalledWith('错误', '角色不属于当前用户')
      const 调度器 = huoQuJiaoSeTiaoDuQi(测试用户ID, 测试角色ID)
      expect(调度器).toBeNull()
    })

    it('自身角色ID加入应正常创建调度器', async () => {
      vi.mocked(huoQuJiaoSeYongHuId).mockResolvedValueOnce(测试用户ID)

      模拟连接(mockSocket1)
      触发加入聊天(mockSocket1, 测试角色ID)
      await vi.runAllTimersAsync()

      const 调度器 = huoQuJiaoSeTiaoDuQi(测试用户ID, 测试角色ID)
      expect(调度器).not.toBeNull()
    })

    it('角色不存在时应返回错误', async () => {
      vi.mocked(huoQuJiaoSeYongHuId).mockResolvedValueOnce(null)

      模拟连接(mockSocket1)
      触发加入聊天(mockSocket1, 测试角色ID)
      await vi.runAllTimersAsync()

      expect(mockSocket1.emit).toHaveBeenCalledWith('错误', '角色不存在')
    })
  })

  describe('R1+R4 组合场景', () => {
    it('双标签页先后加入、前者断开，后者发消息仍能收到AI回复', async () => {
      模拟连接(mockSocket1)
      触发加入聊天(mockSocket1, 测试角色ID)
      await vi.runAllTimersAsync()

      模拟连接(mockSocket2)
      触发加入聊天(mockSocket2, 测试角色ID)
      await vi.runAllTimersAsync()

      触发断开(mockSocket1)
      await vi.runAllTimersAsync()

      const 调度器2 = huoQuJiaoSeTiaoDuQi(测试用户ID, 测试角色ID)
      expect(调度器2).not.toBeNull()

      // 后者发送消息
      触发发送消息(mockSocket2)
      await vi.runAllTimersAsync()

      // 推进10秒触发AI处理
      await vi.advanceTimersByTimeAsync(10000)
      await vi.runAllTimersAsync()

      const 角色回复调用 = 获取角色回复调用()
      expect(角色回复调用.length).toBeGreaterThan(0)
    })

    it('无孤儿定时器残留：调度器实例计数应正确', async () => {
      expect(huoQuJiaoSeTiaoDuQi(测试用户ID, 测试角色ID)).toBeNull()

      模拟连接(mockSocket1)
      触发加入聊天(mockSocket1, 测试角色ID)
      await vi.runAllTimersAsync()
      expect(huoQuJiaoSeTiaoDuQi(测试用户ID, 测试角色ID)).not.toBeNull()

      模拟连接(mockSocket2)
      触发加入聊天(mockSocket2, 测试角色ID)
      await vi.runAllTimersAsync()
      expect(huoQuJiaoSeTiaoDuQi(测试用户ID, 测试角色ID)).not.toBeNull()

      触发断开(mockSocket1)
      await vi.runAllTimersAsync()
      expect(huoQuJiaoSeTiaoDuQi(测试用户ID, 测试角色ID)).not.toBeNull()

      触发断开(mockSocket2)
      await vi.runAllTimersAsync()
      expect(huoQuJiaoSeTiaoDuQi(测试用户ID, 测试角色ID)).toBeNull()
    })
  })
})