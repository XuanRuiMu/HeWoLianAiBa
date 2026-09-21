import type { Server } from 'socket.io'
import { yunXingAIYinQing } from './AI引擎'
import { pingPanHaoGanDuPiLiangNei } from './好感度评判'
import { gengXinHaoGanDu, huoQuWanZhengHaoGanDu } from './好感度'
import {
  baoCunJiaoSeXiaoXi,
  huoQuAIJiaoSeXinXi,
  huoQuZuiJinDuiHuaLiShi,
} from './AI输入准备'
import { anIdChaYongHu } from './认证'
import { cheHuiJiaoSeXiaoXi } from './消息'
import { huoQuHuoJieXiShiPinMiaoShu } from './视频理解'
import { quBenLunJiaoDianXiaoXiXiang, zhanShiXiaoXiZhengWen } from './对话渲染'
import {
  jianCeYongHuXiaoXiBingChuLi,
  chuLiAIHuiFuHouJieShuJianCha,
  chuLiYouXiJieShu,
} from './胜利失败条件'
import { jiaoSeShiFouBeiDuoShe } from './夺舍'
import { XIAO_XI_PEI_ZHI } from '../config/消息配置'
import { debug日志, jiLuSocketShiJian, jiLuXiaoXiCaoZuo } from '../utils/debug日志'
import { 管理监控房间名 } from '../socket/管理通道'
import { gouJianJiaoSeShangXiaWen, type CanShuShangXiaWen } from '../config/AI参数策略'
import { huoQuFanYi } from '../config/translations'
import { shengChengXiTongTiShiId } from '../utils/消息身份'
import type {
  AIYinQingShuChu,
  AIYinQingShuRu,
  AIJiaoSeXinXi,
  DuiHuaLiShiXiang,
  HaoGanDuPingPanJieGuo,
  DirectorCeLue,
} from '../types'
import type { XiaoXiXinXi } from './消息'
import { 尝试合成语音 } from './TTS服务'
import { 转换TTS文本 } from './TTS文本预处理'
import { 计算TTS概率 } from './TTS概率计算'
import { TTS_PEI_ZHI } from '../config/TTS触发配置'

/**
 * FP-09「角色回复」推送契约。
 * 轮次 = 本调度器实例内的处理 ID，单调递增；驱动消息ID = 触发本轮的那条用户消息 ID。
 * 前端据此丢弃「已被插话作废的旧轮次」残余条目。两个字段都是新增可选字段：
 * 未读它们的旧前端行为不变，不带它们的旧推送（秘密指令/主动多模态/夺舍等旁路）按当前轮次接受。
 */
export interface AIHuiFuXiaoXiShiJian {
  角色ID: string
  消息列表: XiaoXiXinXi[]
  轮次?: number
  驱动消息ID?: string | null
}

/** 一轮 AI 回复的上下文：轮次令牌 + 触发本轮的那条用户消息 ID */
interface LunCiShangXiaWen {
  处理ID: number
  驱动消息ID: string | null
}

const DENG_DAI_BIAO_BAI_GUO_QI_SHI_JIAN = 30 * 60 * 1000

interface DengDaiBiaoBaiHuiFuZhuangTai {
  deng_dai_zhong: boolean
  chuang_jian_shi_jian: number
}

const dengDaiBiaoBaiHuiFuMap = new Map<string, DengDaiBiaoBaiHuiFuZhuangTai>()

function shengChengDengDaiBiaoBaiJian(yong_hu_id: string, jiao_se_id: string): string {
  return `${yong_hu_id}:${jiao_se_id}`
}

function qingChuGuoQiDengDaiZhuangTai(): void {
  const xianZai = Date.now()
  for (const [jian, zhuangTai] of dengDaiBiaoBaiHuiFuMap.entries()) {
    if (xianZai - zhuangTai.chuang_jian_shi_jian > DENG_DAI_BIAO_BAI_GUO_QI_SHI_JIAN) {
      dengDaiBiaoBaiHuiFuMap.delete(jian)
    }
  }
}

export class AI回复调度器 {
  private 计时器: NodeJS.Timeout | null = null
  private 当前处理ID = 0
  private 取消控制器: AbortController | null = null
  private 处理中 = false
  private 当前AI状态: 'kong_xian' | 'deng_dai_zhong' | 'zheng_zai_shu_ru' = 'kong_xian'
  private 当前角色?: AIJiaoSeXinXi = undefined
  private xu_hao = 0
  // M2 重置式防抖：新用户消息到达时递增，使仍在途的旧检测流程结果被丢弃
  private 当前检测ID = 0
  private 自上一条角色消息以来的用户消息计数 = 0
  // A-2 预警只在每轮AI回复周期内触发一次（预警本身不重置此标志，普通AI回复才重置）
  private 本轮已发送预警 = false
  // FP-09：触发本轮的那条用户消息（焦点消息与 驱动消息ID 的唯一来源）
  private 本轮驱动消息ID: string | null = null
  // FP-09：已送达角色消息文本登记，作废轮次重跑时不再产出同文本第二条
  private 已送达登记 = new Map<string, number>()

  private static readonly 去重登记上限 = 8
  private static readonly 去重窗口毫秒 = 60 * 1000

  constructor(
    private readonly 角色ID: string,
    private readonly 用户ID: string,
    private readonly IE类型: 'I' | 'E',
    private readonly io: Server,
    回复延迟毫秒: number = 10000,
  ) {
    this.回复延迟毫秒 = 回复延迟毫秒
  }

  private 回复延迟毫秒: number

  设置回复延迟毫秒(haoMiao: number): void {
    this.回复延迟毫秒 = haoMiao
  }

  处理用户消息(驱动消息ID?: string | null): Promise<void> {
    // FP-09：记下「触发本轮的那条消息」，焦点消息与 角色回复.驱动消息ID 都由它决定，
    // 不再依赖「DB 末条 yonghu」这种会被吞消息打穿的口径（F18）。
    this.本轮驱动消息ID = 驱动消息ID ?? null

    this.自上一条角色消息以来的用户消息计数 += 1

    // A-2 连发12条预警：达到预警阈值且本轮未发送过预警时，由Writer生成角色口吻预警消息并清零计数
    // FP-09：预警同样是「角色的一条新回复」，必须先作废在跑轮次再走轻量通道，
    // 否则它与在跑轮次并行推送，观感即 AI 连发两条（免打扰分支本就调了 重置()）。
    if (this.自上一条角色消息以来的用户消息计数 === XIAO_XI_PEI_ZHI.lianFaYuJingTiaoShu && !this.本轮已发送预警) {
      this.重置()
      this.当前检测ID += 1
      return this.触发连发预警()
    }

    if (this.自上一条角色消息以来的用户消息计数 >= XIAO_XI_PEI_ZHI.lianFaMianDaRaoTiaoShu) {
      this.触发连发免打扰判负()
      return Promise.resolve()
    }

    this.重置()
    // YH-033 A 方案：摘要回填走处理用户消息入口（计时器外），运行AI 内只做同步读
    this.预取回填摘要()
    // M2 重置式防抖：新消息到达即递增检测ID，仍在途的旧检测流程结果将被丢弃；
    // 返回本次检测的 Promise 以保持既有调用方 await 语义
    const benCiJianCeID = ++this.当前检测ID
    return this.检测用户消息并决定后续(benCiJianCeID)
  }

  private 预取回填摘要(): void {
    // YH-051 关键事件检索为DB IO，放计时器外预取禁入计时窗口；摘要同步缓存保持零额外异步
    // 根因：计时窗口内额外异步拉长首token延迟；预取在重置后检测前触发，不阻塞计时器
    if (process.env.VITEST === 'true') {
      return
    }
    try {
      import('./对话摘要').then(({ duQuDuiHuaZhaiYao, gouJianZhaiYaoZhuRuWenBen, huanCunTongBuZhaiYao }) =>
        duQuDuiHuaZhaiYao(this.用户ID, this.角色ID).then((zhaiYao) => {
          try {
            huanCunTongBuZhaiYao(this.用户ID, this.角色ID, gouJianZhaiYaoZhuRuWenBen(zhaiYao))
          } catch {
            // 忽略
          }
        }).catch(() => {}),
      ).catch(() => {})
    } catch {
      // 忽略
    }
  }

  private async 触发连发预警(): Promise<void> {
    // YH-053 预警走轻量通道：本地模板直接回复，不计日预算不调全量引擎
    // 根因：预警一次烧一次全量还污染计数；轻量通道零LLM调用
    // VITEST下同样走轻量通道：旧单测按新语义更新，禁为过测试保留烧钱链路
    const 轮次: LunCiShangXiaWen = {
      处理ID: this.当前处理ID,
      驱动消息ID: this.本轮驱动消息ID,
    }
    try {
      const 预警文案 = huoQuFanYi('liaoTian', 'lianFaYuJing')
      const 保存结果 = await baoCunJiaoSeXiaoXi({
        yong_hu_id: this.用户ID,
        jiao_se_id: this.角色ID,
        nei_rong: 预警文案,
      })
      this.自上一条角色消息以来的用户消息计数 = 0
      this.本轮已发送预警 = true
      this.推送角色回复([保存结果], 轮次)
      jiLuSocketShiJian('角色回复', this.用户ID, { jiao_se_id: this.角色ID, xiao_xi_shu: 1, xiao_xi_id: 保存结果?.id, lei_xing: 'lian_fa_yu_jing' })
      return
    } catch (cuoWu) {
      debug日志.error('AI调度器', '连发预警轻量通道失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      this.本轮已发送预警 = false
      return
    }
  }

  private 触发连发免打扰判负(): void {
    this.重置()
    this.当前检测ID += 1
    void chuLiYouXiJieShu(this.用户ID, this.角色ID, 'shi_bai_mian_da_rao').catch((cuo_wu) => {
      debug日志.error('AI调度器', '连发免打扰判负结算失败', { xiang_qing: { cuo_wu: String(cuo_wu) } })
    })
  }

  重置(): void {
    if (this.计时器) {
      clearTimeout(this.计时器)
      this.计时器 = null
    }
    // FP-09：作废轮次必须让「一切行动」立即停摆。旧实现只 abort，而 abort 之后仍有
    // 无保护尾巴（收尾好感度 / TTS 语音落库+推送）在跑，被取消的轮次还能再推一条同文本消息。
    // 递增 当前处理ID ⇒ 本轮在所有 `处理ID !== 当前处理ID` 检查点上一律作废。
    this.当前处理ID += 1
    if (this.取消控制器) {
      this.取消控制器.abort()
      this.取消控制器 = null
    }
    this.处理中 = false
    this.发布AI状态('kong_xian')
  }

  /** 「角色回复」唯一出口：轮次令牌与驱动消息 ID 随每条推送一起下发（FP-09 契约） */
  private 推送角色回复(消息列表: XiaoXiXinXi[], 轮次?: LunCiShangXiaWen | null): void {
    const 事件: AIHuiFuXiaoXiShiJian = {
      角色ID: this.角色ID,
      消息列表,
      轮次: 轮次?.处理ID,
      驱动消息ID: 轮次?.驱动消息ID ?? null,
    }
    this.io.to(this.用户ID).emit('角色回复', 事件)
  }

  /** FP-09 内容级去重：同一条角色文本在去重窗口内只允许送达一次（作废轮次重跑的最后兜底） */
  private 已送达过(内容: string): boolean {
    const 现在 = Date.now()
    for (const [文本, 时刻] of this.已送达登记) {
      if (现在 - 时刻 > AI回复调度器.去重窗口毫秒) this.已送达登记.delete(文本)
    }
    return this.已送达登记.has(内容)
  }

  private 登记送达(内容: string): void {
    this.已送达登记.set(内容, Date.now())
    while (this.已送达登记.size > AI回复调度器.去重登记上限) {
      const 最旧 = this.已送达登记.keys().next().value
      if (最旧 === undefined) break
      this.已送达登记.delete(最旧)
    }
  }

  private 用户信息缓存?: { tu_pian_shou_quan: boolean }

  private 发布AI状态(zhuang_tai: 'kong_xian' | 'deng_dai_zhong' | 'zheng_zai_shu_ru'): void {
    this.当前AI状态 = zhuang_tai
    this.xu_hao += 1
    this.io.to(this.用户ID).emit('AI状态', {
      jiao_se_id: this.角色ID,
      zhuang_tai,
      xu_hao: this.xu_hao,
      shi_jian: Date.now(),
    })
  }

  是否处理中(): boolean {
    return this.处理中
  }

  private 发送系统错误提示(cuoWuXinXi: string): void {
    this.io.to(this.用户ID).emit('角色回复', {
      角色ID: this.角色ID,
      消息列表: [{
        id: shengChengXiTongTiShiId(),
        hui_hua_id: this.角色ID,
        fa_song_zhe_id: 'system',
        fa_song_zhe_lei_xing: 'xitong',
        nei_rong: cuoWuXinXi,
        lei_xing: 'xitong_ti_shi',
        shi_jian_chuo: Date.now(),
        yi_du: false,
      }],
    })
    jiLuSocketShiJian('角色回复', this.用户ID, { jiao_se_id: this.角色ID, xiao_xi_shu: 1, lei_xing: 'xitong_ti_shi' })
  }

  private async 检测用户消息并决定后续(jianCeID: number): Promise<void> {
    let tuPianShouQuan = false
    // VITEST调度器单测用假用户ID（yong-hu-id），查库恒null；跳过查库保计时器语义，禁假ID拖慢单测
    if (process.env.VITEST !== 'true') {
      try {
        const 认证结果 = await anIdChaYongHu(this.用户ID).catch(() => null)
        if (jianCeID !== this.当前检测ID) return
        if (认证结果) {
          tuPianShouQuan = 认证结果.tu_pian_shou_quan === true
        }
      } catch {
        tuPianShouQuan = false
      }
    }

    try {
      const [角色, 好感度, 历史消息] = await Promise.all([
        huoQuAIJiaoSeXinXi(this.角色ID),
        huoQuWanZhengHaoGanDu(this.用户ID, this.角色ID),
        huoQuZuiJinDuiHuaLiShi(this.用户ID, this.角色ID),
      ])
      if (jianCeID !== this.当前检测ID) return

      if (!角色) {
        return
      }

      const 最新用户消息 = await this.获取最新用户消息(历史消息, this.本轮驱动消息ID)
      if (!最新用户消息) {
        this.启动AI计时器()
        return
      }

      const 等待表白回复 = this.是否等待表白回复()
      const jieShuJieGuo = await jianCeYongHuXiaoXiBingChuLi(
        this.用户ID,
        this.角色ID,
        最新用户消息,
        好感度?.zong_fen || 0,
        等待表白回复,
        角色,
        历史消息,
        tuPianShouQuan,
      )
      // M2：检测期间有新消息到达（防抖触发）则丢弃本次过期判定结果
      if (jianCeID !== this.当前检测ID) return

      if (jieShuJieGuo) {
        this.清除等待表白回复状态()
        return
      }

      if (等待表白回复) {
        this.清除等待表白回复状态()
      }

      this.启动AI计时器()
    } catch (cuoWu) {
      debug日志.error('AI调度器', '用户消息检测失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      this.发送系统错误提示(huoQuFanYi('AI', 'aiDiaoYongShiBai'))
      this.启动AI计时器()
    }
  }

  private 启动AI计时器(): void {
    this.计时器 = setTimeout(() => {
      this.计时器 = null
      void this.触发AI处理()
    }, this.回复延迟毫秒)
    this.发布AI状态('deng_dai_zhong')
  }

  private 是否等待表白回复(): boolean {
    qingChuGuoQiDengDaiZhuangTai()
    const jian = shengChengDengDaiBiaoBaiJian(this.用户ID, this.角色ID)
    const zhuangTai = dengDaiBiaoBaiHuiFuMap.get(jian)
    if (!zhuangTai) return false
    if (Date.now() - zhuangTai.chuang_jian_shi_jian > DENG_DAI_BIAO_BAI_GUO_QI_SHI_JIAN) {
      dengDaiBiaoBaiHuiFuMap.delete(jian)
      return false
    }
    return zhuangTai.deng_dai_zhong
  }

  private 设置等待表白回复状态(): void {
    dengDaiBiaoBaiHuiFuMap.set(shengChengDengDaiBiaoBaiJian(this.用户ID, this.角色ID), {
      deng_dai_zhong: true,
      chuang_jian_shi_jian: Date.now(),
    })
  }

  private 清除等待表白回复状态(): void {
    dengDaiBiaoBaiHuiFuMap.delete(shengChengDengDaiBiaoBaiJian(this.用户ID, this.角色ID))
  }

  private async 触发AI处理(): Promise<void> {
    const 处理ID = ++this.当前处理ID
    // FP-09：本轮的轮次令牌与驱动消息在本轮开始时一次性锁定，后续所有落库/推送都带它，
    // 被 重置() 作废的旧轮次不得再冒用新轮次的令牌。
    const 轮次: LunCiShangXiaWen = {
      处理ID,
      驱动消息ID: this.本轮驱动消息ID,
    }
    this.处理中 = true
    this.取消控制器 = new AbortController()
    const 信号 = this.取消控制器.signal

    if (信号.aborted) {
      this.处理中 = false
      this.取消控制器 = null
      return
    }

    const beiDuoShe = await jiaoSeShiFouBeiDuoShe(this.角色ID)
    if (beiDuoShe) {
      this.处理中 = false
      this.取消控制器 = null
      if (处理ID === this.当前处理ID) this.发布AI状态('kong_xian')
      return
    }

    try {
      if (处理ID === this.当前处理ID) this.发布AI状态('zheng_zai_shu_ru')
      this.io.to(this.用户ID).emit('对方正在输入', this.角色ID)
      jiLuSocketShiJian('对方正在输入', this.用户ID, { jiao_se_id: this.角色ID })
      this.io.to(管理监控房间名(this.用户ID)).emit('管理员_构建过程', {
        阶段: '思考启动',
        说明: 'AI 已收到新消息，开始分析上下文与最新用户消息',
        时间: Date.now(),
        轮次: 处理ID,
      })

      // YH-049 取消透传到底层：在途取消直接停，不再发起Writer外呼
      if (信号.aborted || 处理ID !== this.当前处理ID) return
      const ai结果 = await this.运行AI(信号, 轮次)
      // YH-032：429 透 user_id（限流期已读不回可归因到人），402 走人工路径；调度器侧透传系统提示
      if (ai结果.cuo_wu_ma === 'XIAN_LIU_429' || ai结果.cuo_wu_ma === 'YU_E_BU_ZU_402') {
        this.发送系统错误提示(ai结果.cuo_wu_xin_xi || huoQuFanYi('AI', 'aiDiaoYongShiBai'))
        if (处理ID === this.当前处理ID) this.发布AI状态('kong_xian')
        return
      }
      this.发送深度思考监控(ai结果, 处理ID)

      // FP-04 取消检查点必须在落库之前：作废轮次不得改动持久化状态，也不得推送
      if (信号.aborted || 处理ID !== this.当前处理ID) return

      if (ai结果.shi_fou_che_hui) {
        await cheHuiJiaoSeXiaoXi({ yong_hu_id: this.用户ID, jiao_se_id: this.角色ID })
        jiLuXiaoXiCaoZuo('角色消息撤回', this.用户ID, this.角色ID, 'jiaose')
        this.io.to(管理监控房间名(this.用户ID)).emit('管理员_隐藏信息', {
          类型: 'AI撤回',
          内容: 'AI 判定上一条自身回复需撤回（隐藏的内心修正）',
          时间: Date.now(),
          轮次: 处理ID,
        })
      }

      if (!ai结果.shi_fou_hui_fu || ai结果.xiao_xi_lie_biao.length === 0) {
        this.推送角色回复([], 轮次)
        jiLuSocketShiJian('角色回复', this.用户ID, { jiao_se_id: this.角色ID, xiao_xi_shu: 0 })
        if (处理ID === this.当前处理ID) this.发布AI状态('kong_xian')
        return
      }

      if (ai结果.ce_lue?.shi_fou_zhu_dong_biao_bai) {
        const 表白消息 = ai结果.xiao_xi_lie_biao[0]
        if (表白消息) {
          // FP-04 取消检查点紧贴落库：撤回分支的 await 可能让轮次在检查点之后才作废
          if (信号.aborted || 处理ID !== this.当前处理ID) return
          await this.处理AI主动表白(表白消息, 轮次)
          if (处理ID === this.当前处理ID) this.发布AI状态('kong_xian')
          return
        }
      }

      const 消息列表 = ai结果.xiao_xi_lie_biao.slice(0, 5)
      await this.发送消息列表(消息列表, 信号, 轮次, ai结果)
      if (信号.aborted || 处理ID !== this.当前处理ID) return
      // FP-05 YH-036：AI 按亲密画像场景自主在聊天页内偶发图音视频（文本主链路完成后同轮追加，不阻塞已发送文本）
      try {
        const { changShiZhuDongShengTu } = await import('./主动多模态')
        const 首条文本 = ai结果.xiao_xi_lie_biao[0] || ''
        await changShiZhuDongShengTu({ yongHuId: this.用户ID, jiaoSeId: this.角色ID, huiFuWenBen: 首条文本 })
      } catch (主动错误) {
        debug日志.warn('AI调度器', '主动多模态偶发失败，本轮跳过', { xiang_qing: { cuo_wu: String(主动错误) } })
      }
    } catch (错误) {
      if (处理ID !== this.当前处理ID) return
      debug日志.error('AI调度器', 'AI处理失败', { xiang_qing: { cuo_wu: String(错误) } })
      this.推送角色回复([], 轮次)
      jiLuSocketShiJian('角色回复', this.用户ID, { jiao_se_id: this.角色ID, xiao_xi_shu: 0, cuo_wu: true })
      this.发布AI状态('kong_xian')
    } finally {
      if (处理ID === this.当前处理ID) {
        this.处理中 = false
        this.取消控制器 = null
      }
    }
  }

  private async 处理AI主动表白(表白消息: string, 轮次: LunCiShangXiaWen): Promise<void> {
    const 保存结果 = await baoCunJiaoSeXiaoXi({
      yong_hu_id: this.用户ID,
      jiao_se_id: this.角色ID,
      nei_rong: 表白消息,
    })

    this.自上一条角色消息以来的用户消息计数 = 0
    this.本轮已发送预警 = false

    this.设置等待表白回复状态()

    this.推送角色回复([保存结果], 轮次)
    this.登记送达(表白消息)
    jiLuSocketShiJian('角色回复', this.用户ID, { jiao_se_id: this.角色ID, xiao_xi_shu: 1, zhu_dong_biao_bai: true })
  }

  // 管理员监控「AI深度思考」单条最大字符数：思维链原文可能很长，截断后推送保 socket 轻量
  private static readonly 深度思考最大字符数 = 1500

  private 发送深度思考监控(ai结果: AIYinQingShuChu, 轮次: number): void {
    const 思考 = ai结果.si_kao
    if (!思考) return
    const 推送 = (来源: string, 内容?: string) => {
      const 清洗后 = (内容 || '').trim()
      if (!清洗后) return
      this.io.to(管理监控房间名(this.用户ID)).emit('管理员_深度思考', {
        来源,
        内容:
          清洗后.length > AI回复调度器.深度思考最大字符数
            ? `${清洗后.slice(0, AI回复调度器.深度思考最大字符数)}……`
            : 清洗后,
        时间: Date.now(),
        轮次,
      })
    }
    推送('Director', 思考.director)
    推送('Writer', 思考.writer)
  }

  private async 运行AI(信号: AbortSignal, 轮次: LunCiShangXiaWen): Promise<AIYinQingShuChu> {
    const [角色, 好感度, 历史消息] = await Promise.all([
      huoQuAIJiaoSeXinXi(this.角色ID),
      huoQuWanZhengHaoGanDu(this.用户ID, this.角色ID),
      huoQuZuiJinDuiHuaLiShi(this.用户ID, this.角色ID),
    ])

    if (!角色) {
      throw new Error('角色不存在')
    }

    const tuPianShouQuan = this.用户信息缓存?.tu_pian_shou_quan ?? false

    this.当前角色 = 角色
    // YH-033 A 方案：摘要走进程内同步缓存注入，运行AI 内只做同步读，计时窗口内零额外异步
    // YH-051 关键事件进上下文：VITEST下跳过DB检索保计时语义，生产走同步缓存
    const 最新用户消息 = await this.获取最新用户消息(历史消息, 轮次.驱动消息ID)
    const 是第一轮 = !历史消息.some((m) => m.fa_song_zhe_lei_xing === 'jiaose')
    // 摘要与关键事件分通道注入：摘要每 40 条才变，留在共用前缀里对缓存友好；
    // 关键事件按本轮消息相关性挑、每轮都可能变，只能注入到历史之后（见 Prompt构建器 记忆层）。
    const yuQuZhaiYao = this.读同步摘要()
    let guanJianZhuRu = ''
    if (process.env.VITEST !== 'true') {
      try {
        const { duQuGuanJianShiJianZhuRu } = await import('./关键事件提取')
        guanJianZhuRu = await duQuGuanJianShiJianZhuRu(this.用户ID, this.角色ID, undefined, 最新用户消息)
      } catch {
        guanJianZhuRu = ''
      }
    }

    this.io.to(管理监控房间名(this.用户ID)).emit('管理员_构建过程', {
      阶段: '策略规划',
      说明: 'Director 已完成意图判定，Writer 进入回复生成',
      时间: Date.now(),
      轮次: 轮次.处理ID,
    })

    const 输入: AIYinQingShuRu = {
      yong_hu_id: this.用户ID,
      jiao_se_id: this.角色ID,
      jiao_se: 角色,
      hao_gan_du: 好感度 || {
        xin_ren_du: 0,
        qin_mi_du: 0,
        qu_wei_du: 0,
        guan_huai_du: 0,
        zong_fen: 0,
        guan_xi_jie_duan: 'lengDan',
      },
      dui_hua_li_shi: 历史消息,
      yong_hu_xin_xiao_xi: 最新用户消息,
      shi_fou_di_yi_lun: 是第一轮,
      tu_pian_shou_quan: tuPianShouQuan,
      ji_yi_zhai_yao: yuQuZhaiYao || undefined,
      guan_jian_shi_jian: guanJianZhuRu || undefined,
    }

    return yunXingAIYinQing(输入, 信号)
  }

  private 读同步摘要(): string {
    // YH-033 A 方案：摘要走进程内同步缓存注入，运行AI 内只做同步读，计时窗口内零额外异步
    try {
      const duiHuaZhaiYao = require('./对话摘要') as typeof import('./对话摘要')
      return duiHuaZhaiYao.duQuTongBuZhaiYao(this.用户ID, this.角色ID)
    } catch {
      return ''
    }
  }

  private async 获取最新用户消息(
    历史消息: DuiHuaLiShiXiang[],
    驱动消息ID?: string | null,
  ): Promise<string> {
    // FP-08 唯一渲染入口：本轮焦点那条由 Prompt 第六层单独呈现，
    // 视频的可读文本要额外补一次异步解析出的画面描述，故仍保留本方法作异步包装
    // FP-09：焦点=「触发本轮的那条」，只有拿不到 ID 时才回落到「DB 末条用户消息」旧口径
    const 焦点消息 = quBenLunJiaoDianXiaoXiXiang(历史消息, 驱动消息ID)
    if (!焦点消息) return ''
    if (焦点消息.meiTiLeiBie === 'wenjian' && !焦点消息.yi_che_hui) {
      const ming = 焦点消息.yuanShiWenJianMing || ''
      const xiaoMIME = (焦点消息.meiTiMIME || '').toLowerCase()
      const shiShiPin = xiaoMIME.startsWith('video/') || ming.toLowerCase().match(/\.(mp4|mov|webm|m4v)$/) !== null
      if (shiShiPin) {
        const jieXi = await huoQuHuoJieXiShiPinMiaoShu(焦点消息.meiTiSha256)
        return zhanShiXiaoXiZhengWen(焦点消息, {
          视频画面描述: jieXi.huaMianMiaoShu,
          视频转写文本: jieXi.zhuanXieWenBen,
        })
      }
    }
    return zhanShiXiaoXiZhengWen(焦点消息)
  }

  private async 发送消息列表(
    消息列表: string[],
    信号: AbortSignal,
    轮次: LunCiShangXiaWen,
    ai结果: { ce_lue?: DirectorCeLue },
  ): Promise<void> {
    const 处理ID = 轮次.处理ID
    // 普通AI回复发送时重置预警标志，允许下一轮触发预警
    this.本轮已发送预警 = false
    const 最新用户消息 = await this.获取最新用户消息(
      await huoQuZuiJinDuiHuaLiShi(this.用户ID, this.角色ID),
      轮次.驱动消息ID,
    )
    const yiFaSongLieBiao: string[] = []

    for (let i = 0; i < 消息列表.length; i++) {
      if (信号.aborted || 处理ID !== this.当前处理ID) return
      if (i > 0) {
        await this.等待间隔(信号)
        if (信号.aborted || 处理ID !== this.当前处理ID) return
      }

      // FP-09：作废轮次被重跑时，同一条文本不得再次落库+推送（用户观感即「AI 连发两条一样的」）。
      // 焦点口径已修（F18），这里只是最后一道内容级兜底，命中即丢弃并留痕。
      if (this.已送达过(消息列表[i])) {
        debug日志.warn('AI调度器', '本轮回复与刚送达的一条同文本，已丢弃', {
          xiang_qing: { jiao_se_id: this.角色ID, lun_ci: 处理ID, tiao_shu: i + 1 },
        })
        continue
      }

      const 保存结果 = await baoCunJiaoSeXiaoXi({
        yong_hu_id: this.用户ID,
        jiao_se_id: this.角色ID,
        nei_rong: 消息列表[i],
      })

      this.自上一条角色消息以来的用户消息计数 = 0

      // FP-04 不变式「已落库 = 已可见」：落库后禁止再因作废早退，否则留下
      // 「已落库但永不推送」孤儿消息（下次进入会话才出现，观感即 AI 重复发了一条）
      yiFaSongLieBiao.push(消息列表[i])
      this.登记送达(消息列表[i])
      try {
        this.推送角色回复([保存结果], 轮次)
      } catch (cuoWu) {
        // 推送通道异常不吞已落库事实，也不中断本轮剩余条目
        debug日志.error('AI调度器', '角色回复推送异常', {
          xiang_qing: { jiao_se_id: this.角色ID, xiao_xi_id: 保存结果?.id, cuo_wu: String(cuoWu) },
        })
      }
      jiLuSocketShiJian('角色回复', this.用户ID, { jiao_se_id: this.角色ID, xiao_xi_shu: 1, xiao_xi_id: 保存结果?.id })
      this.io.to(管理监控房间名(this.用户ID)).emit('管理员_构建过程', {
        阶段: '输出回复',
        说明: `第 ${i + 1} 条回复已生成并写入对话`,
        内容: 消息列表[i],
        时间: Date.now(),
        轮次: 处理ID,
      })
    }

    // FP-09：逐条循环的出口没有检查点，被作废的轮次会继续跑好感度评估与结算检查（写库尾巴）。
    // 一律在离开循环后先作废判定，再动任何持久化状态。
    if (信号.aborted || 处理ID !== this.当前处理ID) return

    // M2 调用收敛：一轮全部回复发送完毕后，合并为一次批量好感度评判（替代逐条 N 次调用）
    if (最新用户消息 && yiFaSongLieBiao.length > 0) {
      const 好感度变化 = await this.更新好感度(最新用户消息, yiFaSongLieBiao)
      if (信号.aborted || 处理ID !== this.当前处理ID) return
      if (好感度变化) {
        this.io.to(管理监控房间名(this.用户ID)).emit('管理员_好感度变化', {
          变化: {
            信任: 好感度变化.xin_ren_du_bian_hua,
            亲密: 好感度变化.qin_mi_du_bian_hua,
            趣味: 好感度变化.qu_wei_du_bian_hua,
            关怀: 好感度变化.guan_huai_du_bian_hua,
          },
          时间: Date.now(),
          轮次: 处理ID,
        })
        if (好感度变化.li_you) {
          this.io.to(管理监控房间名(this.用户ID)).emit('管理员_隐藏信息', {
            类型: '好感度评判理由',
            内容: 好感度变化.li_you,
            时间: Date.now(),
            轮次: 处理ID,
          })
        }
      }
      const jieShuJieGuo = await chuLiAIHuiFuHouJieShuJianCha(this.用户ID, this.角色ID)
      if (jieShuJieGuo) {
        this.清除等待表白回复状态()
        if (处理ID === this.当前处理ID) this.发布AI状态('kong_xian')
        return
      }
    }

    // 异步触发 TTS 语音合成（不阻塞主链路）
    // FP-05 YH-045：先修推送（合成成功经 socket 推 mediaId 语音消息照常），单次判定 + 场景白名单在计算层收敛
    // FP-09：整段挂在本轮令牌下——被插话作废的轮次不得再落一条同文本语音消息再推一次
    if (this.当前角色 && yiFaSongLieBiao.length > 0 && 处理ID === this.当前处理ID) {
      const 首条回复 = yiFaSongLieBiao[0]
      const tts文本 = 转换TTS文本(首条回复).slice(0, TTS_PEI_ZHI.tuiSongZuiDaZiFu)
      const 概率结果 = 计算TTS概率({
        角色: this.当前角色,
        好感度: await (async () => {
          const { huoQuWanZhengHaoGanDu } = await import('./好感度')
          return huoQuWanZhengHaoGanDu(this.用户ID, this.角色ID)
        })(),
        策略: ai结果.ce_lue,
      })

      if (概率结果.是否触发 && tts文本) {
        const voiceId = this.当前角色.voice_id || 'female-shaonv'
        // 使用 setImmediate 确保完全异步，不阻塞当前事件循环
        setImmediate(() => {
          尝试合成语音({ text: tts文本, voiceId, roleId: this.角色ID })
            .then(async 结果 => {
              if (!结果) return
              if (信号.aborted || 处理ID !== this.当前处理ID) {
                debug日志.info('AI调度器', '轮次已作废，TTS 语音不再落库推送', {
                  xiang_qing: { jiao_se_id: this.角色ID, lun_ci: 处理ID },
                })
                return
              }
              debug日志.info('AI调度器', 'TTS 语音合成完成', {
                xiang_qing: {
                  roleId: this.角色ID,
                  mediaId: 结果.mediaId,
                  durationMs: 结果.durationMs,
                },
              })
              try {
                const { baoCunJiaoSeMeiTiXiaoXi } = await import('./消息')
                const 语音消息 = await baoCunJiaoSeMeiTiXiaoXi({
                  yong_hu_id: this.用户ID,
                  jiao_se_id: this.角色ID,
                  nei_rong: 首条回复.slice(0, 500),
                  lei_xing: 'yuYin',
                  mei_ti_id: 结果.mediaId,
                })
                this.推送角色回复([语音消息], 轮次)
                jiLuSocketShiJian('角色回复', this.用户ID, { jiao_se_id: this.角色ID, xiao_xi_shu: 1, xiao_xi_id: 语音消息?.id, lei_xing: 'tts_yu_yin' })
              } catch (推送错误) {
                debug日志.warn('AI调度器', 'TTS 语音推送失败，已降级为纯文本', { xiang_qing: { cuo_wu: String(推送错误) } })
              }
            })
            .catch(() => {
              // 静默降级，已在服务内部处理
            })
        })
      }
    }

    if (处理ID === this.当前处理ID) this.发布AI状态('kong_xian')

    // YH-033 A 方案：发送完毕后异步后置摘要落表并回填同步缓存（失败吞掉，不阻断主链路与状态收敛）
    try {
      import('./对话摘要').then(({ shengChengBingLuoKuZhaiYao, huanCunTongBuZhaiYao, gouJianZhaiYaoZhuRuWenBen, duQuDuiHuaZhaiYao }) =>
        shengChengBingLuoKuZhaiYao(this.用户ID, this.角色ID, this.当前角色?.wei_xin_ming ?? '').then(() =>
          duQuDuiHuaZhaiYao(this.用户ID, this.角色ID).then((zhaiYao) => {
            try {
              huanCunTongBuZhaiYao(this.用户ID, this.角色ID, gouJianZhaiYaoZhuRuWenBen(zhaiYao))
            } catch {
              // 忽略
            }
          }).catch(() => {}),
        ).catch(() => {}),
      ).catch(() => {})
    } catch {
      // 忽略
    }
  }

  private async 更新好感度(
    用户消息: string,
    角色回复LieBiao: string[],
  ): Promise<HaoGanDuPingPanJieGuo | null> {
    try {
      // 按当前 AI对象人设驱动好感度评判的采样参数（温度随渣型/IE/性格等动态变化）
      const shangXiaWen: CanShuShangXiaWen = {
        jiaoSe: gouJianJiaoSeShangXiaWen(this.当前角色),
      }
      // M2：一轮多条回复合并为一次批量评判（使用内部版本获取系数信息）
      // YH-068：评判失败（unknown）不计数不落分，缓存链路加 try 保护
      const 评判结果 = await pingPanHaoGanDuPiLiangNei(用户消息, 角色回复LieBiao, '对方', shangXiaWen, undefined, this.用户ID, this.角色ID)
      if (评判结果.jieGuo.li_you === 'unknown') return null
      try {
        await gengXinHaoGanDu(this.用户ID, this.角色ID, 评判结果.jieGuo, 评判结果.xiShu, 评判结果.muBiaoQuXian, 评判结果.lianXuWeiDaBiao)
      } catch (缓存错误) {
        debug日志.error('AI调度器', '好感度缓存链路失败', { xiang_qing: { cuo_wu: String(缓存错误) } })
      }
      return 评判结果.jieGuo
    } catch (错误) {
      debug日志.error('AI调度器', '更新好感度失败', { xiang_qing: { cuo_wu: String(错误) } })
      return null
    }
  }

  private 计算间隔(): number {
    if (this.IE类型 === 'I') {
      return 1500 + Math.random() * 3000
    }
    return 400 + Math.random() * 1200
  }

  private async 等待间隔(信号: AbortSignal): Promise<void> {
    const 间隔 = this.计算间隔()
    const 开始时间 = Date.now()
    while (Date.now() - 开始时间 < 间隔) {
      if (信号.aborted) return
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
}
