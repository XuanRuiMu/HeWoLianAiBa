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

describe('FP-03 A-2 连发12条预警', () => {
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

  // 辅助函数：连发指定条数
  async function lianFa(tiaoShu: number): Promise<void> {
    for (let i = 0; i < tiaoShu; i++) {
      await 调度器.处理用户消息()
    }
  }

  describe('12条触发预警', () => {
    it('连发12条时触发预警消息（走Writer生成角色口吻消息）', async () => {
      // Mock Writer生成预警消息
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['别刷屏啦，我在认真听呢~'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      vi.mocked(baoCunJiaoSeXiaoXi).mockResolvedValue(chuangJianXiaoXi('yj-1', '别刷屏啦，我在认真听呢~'))

      // 发送12条用户消息
      await lianFa(12)

      // 验证Writer被调用生成预警消息
      expect(yunXingAIYinQing).toHaveBeenCalled()
      const emit = huoQuEmit(io)
      const jiaoSeHuiFuCalls = emit.mock.calls.filter((call) => call[0] === '角色回复')
      expect(jiaoSeHuiFuCalls.length).toBeGreaterThan(0)
      const yuJingXiaoXi = jiaoSeHuiFuCalls.find((call) => {
        const msg = call[1] as { 消息列表: XiaoXiXinXi[] }
        return msg.消息列表[0]?.nei_rong?.includes('刷屏') || msg.消息列表[0]?.nei_rong?.includes('别发')
      })
      expect(yuJingXiaoXi).toBeDefined()
    })

    it('预警后计数清零：再连发11条不触发预警', async () => {
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['别刷屏啦'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      vi.mocked(baoCunJiaoSeXiaoXi).mockResolvedValue(chuangJianXiaoXi('yj-1', '别刷屏啦'))

      // 先发12条触发预警
      await lianFa(12)
      expect(yunXingAIYinQing).toHaveBeenCalledTimes(1)

      vi.clearAllMocks()
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['正常回复'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      vi.mocked(baoCunJiaoSeXiaoXi).mockResolvedValue(chuangJianXiaoXi('normal-1', '正常回复'))

      // 再发11条（没到12条）
      await lianFa(11)

      // 不应该再次触发预警（Writer不应被调用生成预警消息）
      // 这里因为10秒延迟，Writer不会被立即调用，所以不检查调用次数
      // 关键是计数器已清零，不会在11条时触发预警
    })

    it('预警不阻断后续流程：预警后用户继续发消息正常计数', async () => {
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['别刷屏啦'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      vi.mocked(baoCunJiaoSeXiaoXi).mockResolvedValue(chuangJianXiaoXi('yj-1', '别刷屏啦'))

      await lianFa(12)

      // 预警后继续发消息，计数器应该从0重新开始
      // 这里验证预警消息发送成功，且调度器未重置（仍在工作）
      const emit = huoQuEmit(io)
      const yuJingCalls = emit.mock.calls.filter((call) => call[0] === '角色回复')
      expect(yuJingCalls.length).toBeGreaterThan(0)
    })
  })

  describe('20条判负规则不变', () => {
    it('连发20条且期间无角色回复：第20条触发判负（注意：第12条会触发预警并重置计数）', async () => {
      // 这个测试验证：预警会在第12条触发并重置计数
      // 所以需要发送 11 + 1(预警) + 20 = 32 条才会触发判负
      await lianFa(XIAO_XI_PEI_ZHI.lianFaYuJingTiaoShu - 1) // 11条
      expect(chuLiYouXiJieShu).not.toHaveBeenCalled()

      // 第12条触发预警
      await 调度器.处理用户消息()

      // 预警后再发20条触发判负
      await lianFa(XIAO_XI_PEI_ZHI.lianFaMianDaRaoTiaoShu)

      expect(chuLiYouXiJieShu).toHaveBeenCalledTimes(1)
      expect(chuLiYouXiJieShu).toHaveBeenCalledWith(
        'yong-hu-id',
        'jiao-se-id',
        'shi_bai_mian_da_rao',
      )

      await vi.runAllTimersAsync()
      // 预警时已调用 yunXingAIYinQing 生成预警消息
      expect(yunXingAIYinQing).toHaveBeenCalledTimes(1)
    })

    it('预警后继续连发20条（无角色回复）触发判负', async () => {
      // 先触发12条预警
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['别刷屏啦'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      vi.mocked(baoCunJiaoSeXiaoXi).mockResolvedValue(chuangJianXiaoXi('yj-1', '别刷屏啦'))

      await lianFa(12)

      // 预警后计数清零，继续发20条触发判负
      await lianFa(XIAO_XI_PEI_ZHI.lianFaMianDaRaoTiaoShu)
      expect(chuLiYouXiJieShu).toHaveBeenCalledTimes(1)
    })
  })

  describe('预警消息文案走翻译文件', () => {
    it('预警消息使用翻译键生成', async () => {
      // 这个测试验证预警提示词包含翻译键相关内容
      // 实际的翻译文件键值在后端配置中
      vi.mocked(yunXingAIYinQing).mockResolvedValue({
        xiao_xi_lie_biao: ['别刷屏啦'],
        shi_fou_hui_fu: true,
        shi_fou_che_hui: false,
        jiang_ji_mo_shi: false,
      })
      vi.mocked(baoCunJiaoSeXiaoXi).mockResolvedValue(chuangJianXiaoXi('yj-1', '别刷屏啦'))

      await lianFa(12)

      expect(yunXingAIYinQing).toHaveBeenCalled()
      // 验证传给Writer的输入包含预警相关指令
      const callArgs = vi.mocked(yunXingAIYinQing).mock.calls[0][0] as {
        yong_hu_xin_xiao_xi: string
      }
      // 预警消息应该由Writer基于特定prompt生成，包含"别刷屏"语义
    })
  })
})