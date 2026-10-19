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
import { gouJianYinYongChaXun, quBenLunJiaoDianXiaoXiXiang, zhanShiXiaoXiZhengWen } from './对话渲染'
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
import { panDuanZuiJia } from './追加消息判定'
import { tuiDuanZuoXi, panDuanZuoXi, zuoXiKaiQi } from '../config/角色作息'
import { shengChengBurstJianGeHaoMiao, burstLianFaZuiChangBiJieShu } from '../config/角色配置'
import { duShiChaXiaShi } from '../config/时区'
import { duJieBaoKaiGuan } from '../config/开场采样配置'
import { huoQuShiJianChangJingWenBen } from '../config/时间场景配置'

const deng = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

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
  private 连发剩余条数 = 0
  // A-2 预警只在每轮AI回复周期内触发一次（预警本身不重置此标志，普通AI回复才重置）
  private 本轮已发送预警 = false
  // FP-09：触发本轮的那条用户消息（焦点消息与 驱动消息ID 的唯一来源）
  private 本轮驱动消息ID: string | null = null
  // FP-09：已送达角色消息文本登记，作废轮次重跑时不再产出同文本第二条
  private 已送达登记 = new Map<string, number>()

  // ═══ 追加消息（第十五轮新增）═══
  // 现实推演结论：真人「对方不回之后又发一条」几乎从不是催，而是**正好有别的事想说**。
  // 详见 services/追加消息判定.ts 头注。故本计时器只负责「到点提醒角色自查」，
  // 催不催、说什么全部交给角色自己判。
  private 追加计时器: NodeJS.Timeout | null = null
  /** 角色最后一条消息的落库时刻，用于算「隔了多久」与「用户有没有在此之后发过消息」 */
  private 上条角色消息时刻 = 0
  /** 自角色最后一条消息以来，用户是否发过新消息 */
  private 上条角色消息后用户来过 = false
  // 第十七轮：本轮是否处于「角色睡着、醒来才回」状态（用于提示层措辞）
  private 本轮睡着中 = false
  private 本轮醒来小时 = 0

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
    // 追加消息门控：用户一来就作废任何「想说的别的事」—— 已经接上话，插话就成抢话
    this.上条角色消息后用户来过 = true

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
    // ⚠️ 追加消息计时器必须**跟着一起清**：用户发了新消息就说明已经接上话，
    //   这时角色再把「想说的别的事」插进来就是抢话。语义完全吻合，故复用同一出口。
    if (this.追加计时器) {
      clearTimeout(this.追加计时器)
      this.追加计时器 = null
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

  /**
 * 启动回复计时器 —— **唯一的回复延迟出口**。
 *
 * ⚠️ 第十七轮改造（用户定稿「完全模拟现实」）：
 *   改造前这里是**固定** `回复延迟毫秒`（默认 10 秒），它模拟的是「打字时间」，
 *   于是**凌晨 4 点用户发消息、AI 10 秒后就回** —— 那不是人，那是随时在线的机器。
 *
 *   现在按**角色作息**决定（`config/角色作息.ts`）：
 *   · 醒着 → 原来的打字延迟（10 秒 ~ 几分钟），不变
 *   · 睡着 → **定时到起床时间才回**，且提示层会告诉模型「你刚醒 / 你睡前才看到」，
 *     让内容对得上「隔了几小时才回」这件事
 *
 *   ⚠️ 这**不是**「已读不回」：睡着时消息根本没被看到，醒来才看到。
 *     两者用户观感完全不同 —— 前者是「TA 不想理我」，后者是「TA 睡了」。
 *
 *   ⚠️ 作息不从 MBTI 推断（「内向=睡得早」是没有依据的刻板印象，夜猫子里外向的比比皆是）。
 *     只看人设文本里是否明写作息，否则走默认早睡早起。
 */
private 启动AI计时器(): void {
  const yanChi = this.计算本轮回复延迟()
  // 上限保护：服务器重启/时钟跳变等极端情况下不能让计时器挂几天
  const anQuShangXian = 14 * 3600_000
  const shiJian = Math.max(0, Math.min(anQuShangXian, yanChi))
  this.本轮睡着中 = yanChi > this.回复延迟毫秒 * 2 && yanChi > 60_000

  this.计时器 = setTimeout(() => {
    this.计时器 = null
    void this.触发AI处理()
  }, shiJian)
  this.发布AI状态('deng_dai_zhong')
}

/** 睡着的角色直到起床前不回复（供追加消息判定复用同一个作息判断） */
private 睡着(): boolean {
  const renShe = this.当前角色
  if (!renShe) return false
  const wenBen = `${renShe.bei_jing_gu_shi || ''}${renShe.xing_wei_te_dian || ''}${(renShe.shi_jie_xin_xi?.zhi_ye as string) || ''}`
  const leiXing = tuiDuanZuoXi(wenBen)
  return panDuanZuoXi(this.当地现在小时(), leiXing).shiFuZhe
}

/**
 * 角色所在地的当前小时。
 *
 * ⚠️ 现实现：国内城市（`chengShiKu` 16 个全是境内）⇒ 用服务器本地时间。
 *   ⚠️ **这是一处已知简化，不是完成态**：角色目前无法被生成在境外，
 *   所以没有时区可换。一旦 `chengShiKu` 加入境外城市，这里必须改。
 *   现在显式读人设里的城市名，查不到境外城市就按国内处理，并把判断收敛在这一处。
 */
private 当地现在小时(): number {
  const chengShi = (this.当前角色?.shi_jie_xin_xi?.cheng_shi as string) || ''
  const shiCha = duShiChaXiaShi(chengShi)
  if (shiCha !== null) {
    const benDi = new Date()
    return ((benDi.getHours() + benDi.getMinutes() / 60 + shiCha) % 24 + 24) % 24
  }
  return new Date().getHours()
}

/** 本轮该等多久才回（毫秒） */
private 计算本轮回复延迟(): number {
  if (!zuoXiKaiQi()) return this.回复延迟毫秒
  const renShe = this.当前角色
  if (!renShe) return this.回复延迟毫秒
  const wenBen = `${renShe.bei_jing_gu_shi || ''}${renShe.xing_wei_te_dian || ''}${(renShe.shi_jie_xin_xi?.zhi_ye as string) || ''}`
  const panDuan = panDuanZuoXi(this.当地现在小时(), tuiDuanZuoXi(wenBen))
  if (!panDuan.shiFuZhe) return this.回复延迟毫秒
  this.本轮醒来小时 = panDuan.qiXingXiaoShi
  return panDuan.dengDaiMiaoShu
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

  /**
   * 时间场景提示 = 现有时段描述 + **「刚醒」说明**。
   *
   * ⚠️ 为什么必须有后者（第十七轮）：
   *   角色睡着时消息没被看到，醒来才回。这段时间隔了几小时，
   *   而 `时间场景配置`只会说「现在是08点」—— 模型不知道上一条是凌晨 4 点发的，
   *   于是会写出**时间线不连贯**的回复（「刚说到…你继续说」这种）。
   *   实测对照：不给这个信息时，模型会假设消息是几分钟前到的。
   *
   * ⚠️ 措辞只交代**事实处境**（我睡了、你那会儿发的、现在我醒了），
   *   不写「该怎么提」「该怎么解释」—— 后者是技巧清单，模型会去表演。
   */
  private 构造时间场景提示(): string {
    const jiBen = huoQuShiJianChangJingWenBen()
    if (!this.本轮睡着中) return jiBen
    const qiXing = Math.floor(this.本轮醒来小时)
    const xianZai = Math.floor(this.当地现在小时())
    const geXiaoShi = ((xianZai - qiXing + 24) % 24) || 24
    return `${jiBen}\n（你之前睡着了，TA 那会儿发的消息你刚醒才看到，中间过了约 ${geXiaoShi} 小时。）`
  }

  private 设置等待表白回复状态(): void {    dengDaiBiaoBaiHuiFuMap.set(shengChengDengDaiBiaoBaiJian(this.用户ID, this.角色ID), {
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

// ⚠️ **空回复必须分两种**（第十二轮实测 P0-②）：
    //   · Director 说「已读不回」→ 正常产品行为，静默不回复
    //   · Director 说「要回」但 Writer 交白卷 → **故障**，用户视角是「发了消息石沉大海」
    //   实测 400 轮里 3 轮是后者（`AI引擎` 已用 `WriterFuShiKongBai` 标记 `cuo_wu_xin_xi`），
    //   但此前的实现把两者一律 `推送角色回复([])` + `发布AI状态('kong_xian')` ——
    //   既不给用户任何提示，也让联调无法区分「角色不想理」与「模型故障」。
    if (!ai结果.shi_fou_hui_fu || ai结果.xiao_xi_lie_biao.length === 0) {
      // 故障态（Writer 交白卷）：必须提示用户，不能伪装成「已读不回」
      if (ai结果.cuo_wu_xin_xi && ai结果.cuo_wu_xin_xi !== '') {
        this.发送系统错误提示(ai结果.cuo_wu_xin_xi)
        debug日志.error('AI回复调度器', 'Director要求回复但模型输出为空，按故障提示用户', {
          xiang_qing: { jiao_se_id: this.角色ID, lun: 轮次, cuo_wu: ai结果.cuo_wu_xin_xi },
        })
      } else {
        // 正常态：角色主动选择已读不回
        this.推送角色回复([], 轮次)
      }
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
      this.安排追加消息()
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

  // ═══════════════ 追加消息（第十五轮新增）═══════════════
  //
  // ⚠️ 为什么不是「用户没回就催」：
  //   `追加消息推演.mts` 跑完 20,000 段真人语料，**找不到「对方长时间不回」的样本**
  //   （LCCC 每段都是一来一往的即时对话）；形态 A 命中的 47 段逐段直读后发现
  //   绝大多数**不是催**（`严不严重`→`算严重`、`晚上好，吃好了么`→`吃好了` 都是对方在回话）。
  //   ⇒ 现实中「催回复」罕见。真人第二次主动的真实情形是：**正好有别的事想说**。
  //
  // ⚠️ 为什么不写死时长：
  //   时长只决定「多久之后角色自查一次心里有没有事」，
  //   **不决定发什么、也不决定发不发** —— 后两者由角色自己判（见 追加消息判定.ts）。
  //   单一全局时长、不按性格/亲密度分档：那属于「规则」，会把 16 型重新压平。
  private 安排追加消息(): void {
    if (!this.当前角色) return
    if (!duJieBaoKaiGuan('ZUI_JIA_QI_YONG')) return
    if (process.env.VITEST === 'true') return
    // 表白之后不再追加 —— 表白是关系结论，插话会把它稀释
    if (this.是否等待表白回复()) return

    // ⚠️ **睡着时不追加**（第十七轮补漏）：
    //   我实现了作息延迟，但**漏了这个入口** —— 角色凌晨睡着，用户发消息后
    //   延迟到早上回复；而排上的追加计时器仍会在**凌晨**触发，
    //   等于「凌晨不该理人」在一个入口上完全失效。
    //   真实情况：人睡着时不会主动发消息，而且醒来那会儿先看到的是待回的消息。
    //   ⇒ 睡着一律不排，等「本轮回复」真正发出后（那时已到起床时间）再排。
    if (this.睡着()) return

    this.上条角色消息时刻 = Date.now()
    this.上条角色消息后用户来过 = false
    const haoMiao = this.计算追加间隔()
    if (haoMiao <= 0) return

    this.追加计时器 = setTimeout(() => {
      this.追加计时器 = null
      void this.执行追加消息()
    }, haoMiao * 60 * 1000)
  }

  /**
   * 追加间隔：**由角色性格决定**。
   *
   * ⚠️ 这是本设计里**唯一**按性格分档的地方，且有实证依据，不是我的偏好：
   *   · 依恋类型研究：焦虑型**高频主动**、回避型**极低**、恐惧回避型**忽冷忽热**
   *     ⇒ 主动频率必须随性格变化，一刀切等于把 16 型压平
   *   · 微信公开课 2025：38% 的人因「对方回复慢」产生焦虑 ⇒ 慢热型间隔长于
   *     用户耐受阈值会引发焦虑，所以上限不能太长
   *
   * ⚠️ 分档**只决定「多久自查一次」**，绝不决定发不发、说什么 —— 后两者全交给角色。
   *   这样分档是「给角色时间」，不是「规定角色行为」。
   */
  private 计算追加间隔(): number {
    const moRen = Number(process.env.ZUI_JIA_DENG_DAI_HAO_MIAO || '')
    if (Number.isFinite(moRen) && moRen > 0) return moRen
    const renShe = this.当前角色 as { ie_lei_xing?: string; re_shen_lei_xing?: string }
    const E = renShe.ie_lei_xing === 'E'
    const kuaiRe = renShe.re_shen_lei_xing === '快热'
    if (E && kuaiRe) return 20        // 外向 + 快热：话憋不住
    if (E) return 35
    if (kuaiRe) return 50
    return 90// 内向 + 慢热：本来就不会主动
  }

  private async 执行追加消息(): Promise<void> {
    // 用户在这期间发过消息 ⇒ 已经接上话，角色插话就成抢话。静默丢弃。
    if (this.上条角色消息后用户来过) return
    const chuShi = this.上条角色消息时刻
    if (!chuShi) return

    // ⚠️ **到点那一刻才是真正的检查点**（第十七轮补漏）：
    //   只在「排计时器时」查作息是不够的 —— 角色 23:00 回的消息，
    //   排 90 分钟后触发点是 00:30，那时人才睡着。
    //   现实里人睡着不会主动发消息，而醒来那会儿先看到的是待回的消息。
    //   ⚠️ 这一条比「排的时候查」更关键，两处都要。
    if (this.睡着()) return

    try {
      const [角色, 好感度, 历史消息] = await Promise.all([
        huoQuAIJiaoSeXinXi(this.角色ID),
        huoQuWanZhengHaoGanDu(this.用户ID, this.角色ID),
        huoQuZuiJinDuiHuaLiShi(this.用户ID, this.角色ID),
      ])
      if (!角色) return
      // await 期间可能又有用户消息进来 —— 抢话检查必须放在 IO 之后
      if (this.上条角色消息后用户来过) return

      const panDuan = await panDuanZuiJia({
        jiao_se: 角色,
        hao_gan_du: 好感度,
        dui_hua_li_shi: 历史消息,
        liangJiaGeHaoMiao: Date.now() - chuShi,
      })
      // 判定为「没有」是最常见且正常的结果，静默即正确行为，不落任何日志噪音
      if (!panDuan.youShiMeDongXi || !panDuan.shuoDeShi) {
        if (panDuan.cuoWu) {
          debug日志.warn('AI追加消息', '判定失败，降级为不追加', { xiang_qing: { cuo_wu: panDuan.cuoWu } })
        }
        return
      }

      // 用户不在场时前端要能看到「正在输入」，否则这条会像凭空出现
      const 控制器 = new AbortController()
      this.取消控制器 = 控制器
      this.io.to(this.用户ID).emit('对方正在输入', this.角色ID)
      await deng(this.计算间隔())

      const 结果 = await yunXingAIYinQing(
        {
          yong_hu_id: this.用户ID,
          jiao_se_id: this.角色ID,
          jiao_se: 角色,
          hao_gan_du: 好感度 || {
            xin_ren_du: 0, qin_mi_du: 0, qu_wei_du: 0, guan_huai_du: 0,
            zong_fen: 0, guan_xi_jie_duan: 'lengDan',
          },
          dui_hua_li_shi: 历史消息,
          // ⚠️ 追加消息**没有新的用户消息**。这里传角色自己刚想说的那件事，
          //    让 Writer 知道「要接的是这个」而不是「要回应对方」——
          //    这是「问存在性、不问内容」在送模侧的对应：判定出内容后 Writer 才展开。
          yong_hu_xin_xiao_xi: panDuan.shuoDeShi,
          zui_jia_shuo_de_shi: panDuan.shuoDeShi,
          shi_fou_di_yi_lun: false,
          tu_pian_shou_quan: this.用户信息缓存?.tu_pian_shou_quan ?? false,
          shi_jian_chang_jing: this.构造时间场景提示(),
        },
        控制器.signal,
      )

      if (this.上条角色消息后用户来过) return
      if (结果.xiao_xi_lie_biao.length === 0) return

      // 推送契约必须带轮次与驱动 ID，否则前端会把这条当孤儿
      const 轮次: LunCiShangXiaWen = { 处理ID: this.当前处理ID, 驱动消息ID: null }
      await this.发送消息列表(结果.xiao_xi_lie_biao.slice(0, 5), 控制器.signal, 轮次, 结果)
      jiLuSocketShiJian('角色回复', this.用户ID, {
        jiao_se_id: this.角色ID,
        xiao_xi_shu: 结果.xiao_xi_lie_biao.length,
        lei_xing: 'zui_jia',
      })
    } catch (cuoWu) {
      // 追加是可选增强，任何失败都必须静默 —— 用户不该看到任何错误提示
      debug日志.warn('AI追加消息', '失败已静默', { xiang_qing: { cuo_wu: String(cuoWu) } })
    } finally {
      this.取消控制器 = null
      this.处理中 = false
      this.发布AI状态('kong_xian')
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
    // FP-08c：焦点那条若带引用槽，原文按同一份历史列表现取（引用只在这一处入口渲染，不再第二份实现）
    const 引用回口 = gouJianYinYongChaXun(历史消息)
    if (焦点消息.meiTiLeiBie === 'wenjian' && !焦点消息.yi_che_hui) {
      const ming = 焦点消息.yuanShiWenJianMing || ''
      const xiaoMIME = (焦点消息.meiTiMIME || '').toLowerCase()
      const shiShiPin = xiaoMIME.startsWith('video/') || ming.toLowerCase().match(/\.(mp4|mov|webm|m4v)$/) !== null
      if (shiShiPin) {
        const jieXi = await huoQuHuoJieXiShiPinMiaoShu(焦点消息.meiTiSha256)
        return zhanShiXiaoXiZhengWen(焦点消息, {
          视频画面描述: jieXi.huaMianMiaoShu,
          视频转写文本: jieXi.zhuanXieWenBen,
        }, 引用回口)
      }
    }
    return zhanShiXiaoXiZhengWen(焦点消息, undefined, 引用回口)
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
    this.连发剩余条数 = 0

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
    let jianGe: number
    if (this.连发剩余条数 > 0) {
      jianGe = shengChengBurstJianGeHaoMiao(this.IE类型, true)
      this.连发剩余条数 -= 1
    } else {
      jianGe = shengChengBurstJianGeHaoMiao(this.IE类型, false)
      this.连发剩余条数 = 1 + Math.floor(Math.random() * burstLianFaZuiChangBiJieShu)
    }
    const 开始时间 = Date.now()
    while (Date.now() - 开始时间 < jianGe) {
      if (信号.aborted) return
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }
}
