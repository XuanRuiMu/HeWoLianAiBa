import { anPaiGuanHuai } from './主动关怀调度器'
import type { Server } from 'socket.io'
import { yunXingAIYinQing } from './AI引擎'

import { pingPanHaoGanDuPiLiangNei } from './好感度评判'
import { gengXinHaoGanDu, huoQuWanZhengHaoGanDu } from './好感度'
import { 尝试头像演化 } from './头像生成'
import { 发送表情包消息 } from './系统表情'
import { qieFenTieZhi, qingXiTieZhiCanPian } from './贴纸标记'
import { isYuanShengBiaoQingDuanMing } from './原生表情库'
import { BiaoQingBaoYunXing, BiaoQingFaSongYuanYin } from '../config/表情包配置'
import { chuLiQueXiKouJian } from './亲密度缺席扣减'
import {
  保存角色XiaoXi,
  huoQuAIJiaoSeXinXi,
  huoQuZuiJinDuiHuaLiShi,
} from './AI输入准备'
import { 按ID查用户 } from './认证'
import { 撤回角色消息 } from './消息'
import { huoQuHuoJieXiShiPinMiaoShu } from './视频理解'
import { huoQuYinPinShiJianMiaoShu } from './语音理解'
import { zhanShiXiaoXiZhengWen, quBenLunLianFaJiaoDian, gouJianYinYongChaXun } from './对话渲染'
import {
  jianCeYongHuXiaoXiBingChuLi,
  chuLiAIHuiFuHouJieShuJianCha,
  chuLiYouXiJieShu,
} from './胜利失败条件'
import { jiaoSeShiFouBeiDuoShe } from './夺舍'
import { XiaoXiPeiZhi } from '../config/消息配置'
import { debug日志, jiLuSocketShiJian, jiLuXiaoXiCaoZuo } from '../utils/debug日志'
import { 管理监控房间名 } from '../socket/管理通道'
import { gouJianJiaoSeShangXiaWen, type 参数上下文 } from '../config/AI参数策略'
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
import type { 消息信息 } from './消息'
import { 尝试合成语音 } from './TTS服务'
import { 转换TTS文本 } from './TTS文本预处理'
import { 计算TTS概率 } from './TTS概率计算'
import { TtsPeiZhi } from '../config/TTS触发配置'
import { panDuanZuiJia } from './追加消息判定'
import { tuiDuanZuoXi, panDuanZuoXi, zuoXiKaiQi } from '../config/角色作息'
import { shengChengBurstJianGeHaoMiao, burstLianFaZuiChangBiJieShu } from '../config/角色配置'
import { duShiChaXiaShi } from '../config/时区'
import { duJieBaoKaiGuanMoRenKai } from '../config/开场采样配置'
import { huoQuShiJianChangJingWenBen } from '../config/时间场景配置'
import { duQuDangQianXinQing, jieGuoXinQing as xinQingShuaiJian, xieRuDangQianXinQing } from './当前心情'
import { duQuTongBuZhaiYao, duQuDuiHuaZhaiYao, gouJianZhaiYaoZhuRuWenBen, huanCunTongBuZhaiYao, shengChengBingLuoKuZhaiYao } from './对话摘要'
import * as YuYanGongNeng from '../config/语言与时区'
import { 数据库 } from '../数据库'
import * as 沉默判定模块 from './沉默判定'
import { 用户形态转内部 } from '../utils/性别'
import type { 性别内部形态 } from '../utils/性别'

const deng = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export interface AIHuiFuXiaoXiShiJian {
  角色ID: string
  消息列表: 消息信息[]
  轮次?: number
  驱动消息ID?: string | null
}

export interface LunCiShangXiaWen {
  处理ID: number
  驱动消息ID: string | null
}

const DengDaiBiaoBaiGuoQiShiJian = 30 * 60 * 1000

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
    if (xianZai - zhuangTai.chuang_jian_shi_jian > DengDaiBiaoBaiGuoQiShiJian) {
      dengDaiBiaoBaiHuiFuMap.delete(jian)
    }
  }
}

/**
 * FP-04：轻量判定本轮消息像不像在回溯历史。
 * 只在命中时查库，避免每条消息都触发回想检索（成本）。
 */
export function shiHuiSuLiShiXiaoXi(xiaoXi: string): boolean {
  const s = (xiaoXi || '').trim()
  if (!s) return false
  const recentBareSnippet =
    /(?:周五|周六|周日|周一|周二|周三|周四)+[^\n。！？]{0,18}(?:约|订|去|吃|见)|(?:约好|约过|说好|说好要|答应过|答应我去|没有忘)[^\n。！？]{0,18}|这周六[^\n。！？]{0,18}(?:去|吃|见)/
  if (recentBareSnippet.test(s)) return true
  return /你(?:忘了|不记得|说过|之前说|刚才说|那天说|那次说)|我(?:记得|还记得|说过|那时候说)|记得吗|还记得|记不记得|想起来了?|我们(?:之前|以前|那天|那次|约好|说过)(?:说|聊|约|提|去)|(?:之前|上次|以前|那天|那刻|那次|当时|前几天|早先|曾经|刚刚)[^\n。！？]{0,12}(?:说|提|聊|讲|约|去|吃|做|喜欢|告诉)/.test(s)
}

/**
 * FP-04：回溯类消息检索历史原文并整理成回想提示层文本。
 * 查不到或异常都返回空串——「照实说没印象」的表达交给提示词层，不在此硬编码玩家文案。
 * 任何异常都被吞掉并记分级日志，绝不影响主回复链路。
 */
export async function huoQuHuiXiangTiShi(
  xiaoXi: string,
  yongHuId: string,
  jiaoSeId: string,
): Promise<string> {
  if (!shiHuiSuLiShiXiaoXi(xiaoXi)) return ''
  try {
    const { huiXiangLiShiYuanWen } = await import('./历史回想')
    const jieGuo = await huiXiangLiShiYuanWen(yongHuId, jiaoSeId, xiaoXi)
    if (!jieGuo.zhaoDao || jieGuo.yuanWen.length === 0) {
      debug日志.info('AI回复调度器', '历史回想未命中，本轮不加回想提示', {
        yong_hu_id: yongHuId,
        jiao_se_id: jiaoSeId,
        xiang_qing: { chu_fa: true, zhao_dao: false },
      })
      return ''
    }
    const 片段 = jieGuo.yuanWen.map((wen) => `- ${wen}`).join('\n')
    debug日志.info('AI回复调度器', '历史回想命中，已注入回想提示层', {
      yong_hu_id: yongHuId,
      jiao_se_id: jiaoSeId,
      xiang_qing: { chu_fa: true, tiao_shu: jieGuo.yuanWen.length },
    })
    return `【历史回想】TA在聊你们以前的事。你回想了一下，想起这些旧话：\n${片段}\n对得上的就顺着聊；对不上、或TA说的你其实没印象，就照实说没印象，别编。`
  } catch (cuoWu) {
    debug日志.warn('AI回复调度器', '历史回想失败，不影响本轮回复', {
      yong_hu_id: yongHuId,
      jiao_se_id: jiaoSeId,
      xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) },
    })
    return ''
  }
}

export class AI回复调度器 {
  private 计时器: NodeJS.Timeout | null = null
  private 沉默计时器: NodeJS.Timeout | null = null
  private 当前处理ID = 0
  private 取消控制器: AbortController | null = null
  private 处理中 = false
  private 当前AI状态: 'kong_xian' | 'deng_dai_zhong' | 'zheng_zai_shu_ru' = 'kong_xian'
  private 当前角色?: AIJiaoSeXinXi = undefined
  private xu_hao = 0
  private 当前检测ID = 0
  private 自上一条角色消息以来的用户消息计数 = 0
  private 连发剩余条数 = 0
  private 本轮已发送预警 = false
  private 本轮驱动消息ID: string | null = null
  private 已送达登记 = new Map<string, number>()
  private 本轮贴纸账 = new Map<number, number>()
  private 最近贴纸短名: string[] = []
  private 连发小表情计数 = 0

  private 追加计时器: NodeJS.Timeout | null = null
  private 上条角色消息时刻 = 0
  private 上条角色消息后用户来过 = false
  private 本轮睡着中 = false
  private 用户语言 = 'zh'
  private 用户时区: string | null = null
  private 上次关系阶段序号 = -1
  private 连续沉默轮数 = 0
  private 强制语言: string | null = null
  private 待补发消息ID: string | null | undefined = undefined

  private static readonly 去重登记上限 = 12
  private static readonly 去重窗口毫秒 = 15 * 60 * 1000
  constructor(
    private readonly 角色ID: string,
    private readonly 用户ID: string,
    private readonly IE类型: 'I' | 'E',
    private readonly io: Server,
    回复延迟毫秒: number = 10000,
    对外角色ID?: string,
  ) {
    this.回复延迟毫秒 = 回复延迟毫秒
    this.对外角色ID = typeof 对外角色ID === 'string' && 对外角色ID.length > 0 ? 对外角色ID : 角色ID
  }

  private 回复延迟毫秒: number
  private 对外角色ID: string

  设置回复延迟毫秒(haoMiao: number): void {
    this.回复延迟毫秒 = haoMiao
  }

  处理用户消息(驱动消息ID?: string | null): Promise<void> {
    if (this.处理中) {
      this.待补发消息ID = 驱动消息ID ?? null
      return Promise.resolve()
    }
    this.本轮驱动消息ID = 驱动消息ID ?? null

    this.自上一条角色消息以来的用户消息计数 += 1
    this.上条角色消息后用户来过 = true

    if (this.自上一条角色消息以来的用户消息计数 === XiaoXiPeiZhi.lianFaYuJingTiaoShu && !this.本轮已发送预警) {
      this.重置()
      this.当前检测ID += 1
      return this.触发连发预警()
    }

    if (this.自上一条角色消息以来的用户消息计数 >= XiaoXiPeiZhi.lianFaMianDaRaoTiaoShu) {
      this.触发连发免打扰判负()
      return Promise.resolve()
    }

    this.重置()
    void chuLiQueXiKouJian(this.用户ID, this.角色ID).catch(() => undefined)
    const benCiJianCeID = ++this.当前检测ID
    return this.检测用户消息并决定后续(benCiJianCeID)
  }

  private async 触发连发预警(): Promise<void> {
    const 轮次: LunCiShangXiaWen = {
      处理ID: this.当前处理ID,
      驱动消息ID: this.本轮驱动消息ID,
    }
    try {
      const 预警文案 = huoQuFanYi('liaoTian', 'lianFaYuJing')
      const 保存结果 = await 保存角色XiaoXi({
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
    if (this.追加计时器) {
      clearTimeout(this.追加计时器)
      this.追加计时器 = null
    }
    if (this.沉默计时器) {
      clearTimeout(this.沉默计时器)
      this.沉默计时器 = null
    }
    this.当前处理ID += 1
    this.本轮贴纸账.clear()
    if (this.取消控制器) {
      this.取消控制器.abort()
      this.取消控制器 = null
    }
    this.处理中 = false
    this.发布AI状态('kong_xian')
  }

  private 取本轮已发贴纸数(处理ID: number): number {
    const yiFa = this.本轮贴纸账.get(处理ID)
    return typeof yiFa === 'number' && Number.isFinite(yiFa) ? yiFa : 0
  }

  private 记本轮已发贴纸(处理ID: number, zhangShu: number): void {
    this.本轮贴纸账.set(处理ID, zhangShu)
  }

  private 清理过期贴纸账(dangQianChuLiID: number): void {
    for (const jiLuChuLiID of [...this.本轮贴纸账.keys()]) {
      if (jiLuChuLiID === dangQianChuLiID) continue
      if (jiLuChuLiID < dangQianChuLiID) {
        this.本轮贴纸账.delete(jiLuChuLiID)
      }
    }
  }

  private 转对外消息(消息列表: 消息信息[]): 消息信息[] {
    return 消息列表.map((xiaoXi) => {
      const duiWai: 消息信息 = {
        ...xiaoXi,
        hui_hua_id: this.对外角色ID,
        fa_song_zhe_id: xiaoXi.fa_song_zhe_id === this.角色ID ? this.对外角色ID : xiaoXi.fa_song_zhe_id,
      }
      delete duiWai.neiRongYuanWen
      delete (duiWai as unknown as { yuan_shi_nei_rong?: unknown }).yuan_shi_nei_rong
      if (xiaoXi.yi_che_hui === true) {
        duiWai.nei_rong = xiaoXi.nei_rong || huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
      }
      return duiWai
    })
  }

  private 推送角色回复(消息列表: 消息信息[], 轮次?: LunCiShangXiaWen | null): void {
    const 事件: AIHuiFuXiaoXiShiJian = {
      角色ID: this.对外角色ID,
      消息列表: this.转对外消息(消息列表),
      轮次: 轮次?.处理ID,
      驱动消息ID: 轮次?.驱动消息ID ?? null,
    }
    this.io.to(this.用户ID).emit('角色回复', 事件)
  }

  private 已送达过(内容: string): boolean {
    const 现在 = Date.now()
    for (const [文本, 时刻] of this.已送达登记) {
      if (现在 - 时刻 > AI回复调度器.去重窗口毫秒) this.已送达登记.delete(文本)
    }
    if (this.已送达登记.has(内容)) return true
    const qian = 内容.slice(0, 12)
    for (const yiYou of this.已送达登记.keys()) {
      if (yiYou === 内容) continue
      if (yiYou.startsWith(qian) && Math.abs(yiYou.length - 内容.length) <= 6) return true
    }
    return false
  }

  private 登记送达(内容: string): void {
    this.已送达登记.set(内容, Date.now())
    while (this.已送达登记.size > AI回复调度器.去重登记上限) {
      const 最旧 = this.已送达登记.keys().next().value
      if (最旧 === undefined) break
      this.已送达登记.delete(最旧)
    }
  }

  private 用户信息缓存?: { tu_pian_shou_quan: boolean; yong_hu_xing_bie?: 性别内部形态 | null }

  private 发布AI状态(zhuang_tai: 'kong_xian' | 'deng_dai_zhong' | 'zheng_zai_shu_ru'): void {
    this.当前AI状态 = zhuang_tai
    this.xu_hao += 1
    this.io.to(this.用户ID).emit('AI状态', {
      jiao_se_id: this.对外角色ID,
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
      角色ID: this.对外角色ID,
      消息列表: [{
        id: shengChengXiTongTiShiId(),
        hui_hua_id: this.对外角色ID,
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
    if (process.env.VITEST !== 'true') {
      try {
        const 认证结果 = await 按ID查用户(this.用户ID).catch(() => null)
        if (jianCeID !== this.当前检测ID) return
        if (认证结果) {
          tuPianShouQuan = 认证结果.tu_pian_shou_quan === true
          this.用户信息缓存 = {
            tu_pian_shou_quan: tuPianShouQuan,
            yong_hu_xing_bie: 用户形态转内部(认证结果.mo_ren_xing_bie),
          }
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

      const 最新用户消息 = await this.获取最新消息文本(历史消息, this.本轮驱动消息ID)
      if (!最新用户消息) {
        this.启动AI计时器()
        return
      }
      const 触发消息ID列表 = quBenLunLianFaJiaoDian(历史消息, this.本轮驱动消息ID)
        ?.xiaoXiLieBiao.map((xiaoXi) => xiaoXi.id)
        .filter((xiaoXiId): xiaoXiId is string => typeof xiaoXiId === 'string' && xiaoXiId.trim() !== '')

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
        触发消息ID列表,
      )
      if (jianCeID !== this.当前检测ID) return

      if (jieShuJieGuo) {
        this.清除等待表白回复状态()
        if (jieShuJieGuo.ke_ji_xu_liao_tian) this.启动AI计时器()
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
    this.本轮睡着中 = zuoXiKaiQi() && this.睡着()
    void this.触发AI处理()
  }, Math.max(0, this.回复延迟毫秒))
  this.发布AI状态('deng_dai_zhong')
}

private 睡着(): boolean {
  const renShe = this.当前角色
  if (!renShe) return false
  const wenBen = `${renShe.bei_jing_gu_shi || ''}${renShe.xing_wei_te_dian || ''}${(renShe.shi_jie_xin_xi?.zhi_ye as string) || ''}`
  const leiXing = tuiDuanZuoXi(wenBen)
  return panDuanZuoXi(this.当地现在小时(), leiXing).shiFuZhe
}

private 当地现在小时(): number {
  const shiQu = this.用户时区
  if (shiQu) {
    const xianZai = YuYanGongNeng.shiQuXianZaiShiJian(shiQu)
    return xianZai.xiaoShi
  }
  const chengShi = (this.当前角色?.shi_jie_xin_xi?.cheng_shi as string) || ''
  const shiCha = duShiChaXiaShi(chengShi)
  if (shiCha !== null) {
    const benDi = new Date()
    return ((benDi.getHours() + benDi.getMinutes() / 60 + shiCha) % 24 + 24) % 24
  }
  return new Date().getHours()
}

  private 是否等待表白回复(): boolean {
    qingChuGuoQiDengDaiZhuangTai()
    const jian = shengChengDengDaiBiaoBaiJian(this.用户ID, this.角色ID)
    const zhuangTai = dengDaiBiaoBaiHuiFuMap.get(jian)
    if (!zhuangTai) return false
    if (Date.now() - zhuangTai.chuang_jian_shi_jian > DengDaiBiaoBaiGuoQiShiJian) {
      dengDaiBiaoBaiHuiFuMap.delete(jian)
      return false
    }
    return zhuangTai.deng_dai_zhong
  }

  private 构造时间场景提示(): string {
    const jiBen = huoQuShiJianChangJingWenBen()
    if (!this.本轮睡着中) return jiBen
    return `${jiBen}\n（你刚刚睡了，但这条新消息把你叫醒了。先按醒来接话的真实状态回对方，照顾 TA 的来意；别拿已经睡了当不回复的理由，也别展开一大段睡觉找补。）`
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
    const 轮次: LunCiShangXiaWen = {
      处理ID,
      驱动消息ID: this.本轮驱动消息ID,
    }
    this.清理过期贴纸账(处理ID)
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
      this.io.to(管理监控房间名(this.用户ID)).emit('管理员_构建过程', {
        阶段: '思考启动',
        说明: 'AI 已收到新消息，开始分析上下文与最新用户消息',
        时间: Date.now(),
        轮次: 处理ID,
      })

      if (信号.aborted || 处理ID !== this.当前处理ID) return
      const ai结果 = await this.运行AI(信号, 轮次)
      await this.同步当前心情(ai结果.ce_lue, 处理ID, 信号)
      if (ai结果.cuo_wu_ma === 'XIAN_LIU_429' || ai结果.cuo_wu_ma === 'YU_E_BU_ZU_402') {
        this.发送系统错误提示(ai结果.cuo_wu_xin_xi || huoQuFanYi('AI', 'aiDiaoYongShiBai'))
        if (处理ID === this.当前处理ID) this.发布AI状态('kong_xian')
        return
      }
      this.发送深度思考监控(ai结果, 处理ID)

      if (信号.aborted || 处理ID !== this.当前处理ID) return

      if (ai结果.shi_fou_che_hui) {
        await 撤回角色消息({ yong_hu_id: this.用户ID, jiao_se_id: this.角色ID })
        jiLuXiaoXiCaoZuo('角色消息撤回', this.用户ID, this.角色ID, 'jiaose')
        this.io.to(管理监控房间名(this.用户ID)).emit('管理员_隐藏信息', {
          类型: 'AI撤回',
          内容: 'AI 判定上一条自身回复需撤回（隐藏的内心修正）',
          时间: Date.now(),
          轮次: 处理ID,
        })
      }

    if (!ai结果.shi_fou_hui_fu || ai结果.xiao_xi_lie_biao.length === 0) {
      if (ai结果.cuo_wu_xin_xi && ai结果.cuo_wu_xin_xi !== '') {
        this.发送系统错误提示(ai结果.cuo_wu_xin_xi)
        debug日志.error('AI回复调度器', 'Director要求回复但模型输出为空，按故障提示用户', {
          xiang_qing: { jiao_se_id: this.角色ID, lun: 轮次, cuo_wu: ai结果.cuo_wu_xin_xi },
        })
      } else {
        this.连续沉默轮数 += 1
        this.执行沉默表现(轮次)
      }
      jiLuSocketShiJian('角色回复', this.用户ID, { jiao_se_id: this.角色ID, xiao_xi_shu: 0 })
      if (处理ID === this.当前处理ID) this.发布AI状态('kong_xian')
      return
    }

      if (ai结果.ce_lue?.shi_fou_zhu_dong_biao_bai) {
        const 表白消息 = ai结果.xiao_xi_lie_biao[0]
        if (表白消息) {
          if (信号.aborted || 处理ID !== this.当前处理ID) return
          await this.处理AI主动表白(表白消息, 轮次)
          if (处理ID === this.当前处理ID) this.发布AI状态('kong_xian')
          return
        }
      }

      const 消息列表 = ai结果.xiao_xi_lie_biao.slice(0, 5)
      this.连续沉默轮数 = 0
      await this.发送消息列表(消息列表, 信号, 轮次, ai结果)
      if (信号.aborted || 处理ID !== this.当前处理ID) return
      this.安排追加消息()
      try {
        const { changShiZhuDongShengTu } = await import('./主动多模态')
        const 首条文本 = ai结果.xiao_xi_lie_biao[0] || ''
        await changShiZhuDongShengTu({ 用户ID: this.用户ID, jiaoSeId: this.角色ID, huiFuWenBen: 首条文本 })
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
        const daiBu = this.待补发消息ID
        this.待补发消息ID = undefined
        this.触发记忆压缩()
        if (daiBu !== undefined) {
          debug日志.info('AI调度器', '处理期间有新消息到达，完成后补一轮', { xiang_qing: { qu_dong_xiao_xi_id: daiBu } })
          void this.处理用户消息(daiBu)
        } else {
          void anPaiGuanHuai(this.用户ID, this.角色ID, async (neiRong) => {
            const 保存结果 = await 保存角色XiaoXi({ yong_hu_id: this.用户ID, jiao_se_id: this.角色ID, nei_rong: neiRong })
            this.推送角色回复([保存结果])
          })
        }
      }
    }
  }

  private 安排追加消息(): void {
    if (!this.当前角色) return
    if (!duJieBaoKaiGuanMoRenKai('ZUI_JIA_QI_YONG')) return
    if (process.env.VITEST === 'true') return
    if (this.是否等待表白回复()) return


    this.上条角色消息时刻 = Date.now()
    this.上条角色消息后用户来过 = false
    const haoMiao = this.计算追加间隔()
    if (haoMiao <= 0) return

    this.追加计时器 = setTimeout(() => {
      this.追加计时器 = null
      void this.执行追加消息()
    }, haoMiao * 60 * 1000)
  }

  private 计算追加间隔(): number {
    const moRen = Number(process.env.ZUI_JIA_DENG_DAI_HAO_MIAO || '')
    if (Number.isFinite(moRen) && moRen > 0) return moRen
    const renShe = this.当前角色 as { ie_lei_xing?: string; re_shen_lei_xing?: string }
    const E = renShe.ie_lei_xing === 'E'
    const kuaiRe = renShe.re_shen_lei_xing === '快热'
    if (E && kuaiRe) return 20        
    if (E) return 35
    if (kuaiRe) return 50
    return 90
  }

  private async 执行追加消息(): Promise<void> {
    const 本轮追加处理ID = this.当前处理ID
    if (this.上条角色消息后用户来过) return
    const chuShi = this.上条角色消息时刻
    if (!chuShi) return


    try {
      const [角色, 好感度, 历史消息] = await Promise.all([
        huoQuAIJiaoSeXinXi(this.角色ID),
        huoQuWanZhengHaoGanDu(this.用户ID, this.角色ID),
        huoQuZuiJinDuiHuaLiShi(this.用户ID, this.角色ID),
      ])
      if (!角色) return
      if (this.上条角色消息后用户来过) return

      const panDuan = await panDuanZuiJia({
        jiao_se: 角色,
        hao_gan_du: 好感度,
        dui_hua_li_shi: 历史消息,
        liangJiaGeHaoMiao: Date.now() - chuShi,
      })
      if (!panDuan.youShiMeDongXi || !panDuan.shuoDeShi) {
        if (panDuan.cuoWu) {
          debug日志.warn('AI追加消息', '判定失败，降级为不追加', { xiang_qing: { cuo_wu: panDuan.cuoWu } })
        }
        return
      }

      const 控制器 = new AbortController()
      this.取消控制器 = 控制器
      this.当前角色 = 角色
      this.本轮睡着中 = zuoXiKaiQi() && this.睡着()
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

      const 轮次: LunCiShangXiaWen = { 处理ID: this.当前处理ID, 驱动消息ID: null }
      this.连续沉默轮数 = 0
      await this.发送消息列表(结果.xiao_xi_lie_biao.slice(0, 5), 控制器.signal, 轮次, 结果)
      jiLuSocketShiJian('角色回复', this.用户ID, {
        jiao_se_id: this.角色ID,
        xiao_xi_shu: 结果.xiao_xi_lie_biao.length,
        lei_xing: 'zui_jia',
      })
    } catch (cuoWu) {
      debug日志.warn('AI追加消息', '失败已静默', { xiang_qing: { cuo_wu: String(cuoWu) } })
    } finally {
      if (本轮追加处理ID === this.当前处理ID) {
        this.取消控制器 = null
        this.处理中 = false
        this.发布AI状态('kong_xian')
      }
    }
  }

  private async 处理AI主动表白(表白消息: string, 轮次: LunCiShangXiaWen): Promise<void> {
    const 保存结果 = await 保存角色XiaoXi({
      yong_hu_id: this.用户ID,
      jiao_se_id: this.角色ID,
      nei_rong: 表白消息,
    })

    this.自上一条角色消息以来的用户消息计数 = 0
    this.本轮已发送预警 = false

    this.设置等待表白回复状态()

    this.推送角色回复([保存结果], 轮次)
    this.登记送达(表白消息)
    this.连续沉默轮数 = 0
    jiLuSocketShiJian('角色回复', this.用户ID, { jiao_se_id: this.角色ID, xiao_xi_shu: 1, zhu_dong_biao_bai: true })
  }

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

  private async 读取用户性别(): Promise<性别内部形态 | null> {
    const 已缓存 = this.用户信息缓存?.yong_hu_xing_bie
    if (已缓存 !== undefined) return 已缓存
    if (process.env.VITEST === 'true') return null
    try {
      const 认证结果 = await 按ID查用户(this.用户ID).catch(() => null)
      return 用户形态转内部(认证结果?.mo_ren_xing_bie ?? null)
    } catch {
      return null
    }
  }

  private async 读取本轮记忆摘要(): Promise<string> {
    const huanCun = duQuTongBuZhaiYao(this.用户ID, this.角色ID)
    if (huanCun.trim() !== '') return huanCun
    if (process.env.VITEST === 'true') return ''
    try {
      const zhaiYao = await duQuDuiHuaZhaiYao(this.用户ID, this.角色ID)
      const zhuRuWenBen = gouJianZhaiYaoZhuRuWenBen(zhaiYao)
      if (zhaiYao) huanCunTongBuZhaiYao(this.用户ID, this.角色ID, zhuRuWenBen)
      return zhuRuWenBen
    } catch (cuoWu) {
      debug日志.warn('AI调度器', '读取对话摘要失败，本轮按无记忆处理', {
        xiang_qing: { yong_hu_id: this.用户ID, jiao_se_id: this.角色ID, cuo_wu: String(cuoWu) },
      })
      return ''
    }
  }

  private 触发记忆压缩(): void {
    if (process.env.VITEST === 'true') return
    const jiaoSeMing = this.当前角色?.ming_zi || ''
    setImmediate(() => {
      void shengChengBingLuoKuZhaiYao(this.用户ID, this.角色ID, jiaoSeMing).catch((cuoWu) => {
        debug日志.warn('AI调度器', '对话摘要压缩任务失败，等待下一轮再试', {
          xiang_qing: { yong_hu_id: this.用户ID, jiao_se_id: this.角色ID, cuo_wu: String(cuoWu) },
        })
      })
    })
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
    this.本轮睡着中 = zuoXiKaiQi() && this.睡着()
    await this.同步用户语言()
    const 用户性别 = await this.读取用户性别()
    if (process.env.VITEST !== 'true' && 角色) {
      try {
        const { zhunBeiRiCheng } = await import('./Prompt构建器')
        await zhunBeiRiCheng(
          this.角色ID,
          {
            ming_zi: 角色.ming_zi,
            shen_fen: 角色.shen_fen,
            zhi_ye: String((角色.shi_jie_xin_xi?.zhi_ye as string) || ''),
            nian_ling: 角色.nian_ling,
            xi_hao: 角色.xi_hao,
            cheng_shi: String((角色.shi_jie_xin_xi?.cheng_shi as string) || ''),
          },
          this.用户时区 || 'Asia/Shanghai',
        )
      } catch (e) {
        debug日志.warn('AI调度器', '日程准备失败，不影响本轮回复', { xiang_qing: { cuo_wu: String(e) } })
      }
    }
    const xinQingNow = await xinQingShuaiJian(
      await duQuDangQianXinQing(this.角色ID),
    )
    if (xinQingNow.ming) {
      角色.dang_qian_xin_qing = xinQingNow.ming
      角色.xin_qing_qiang_du = xinQingNow.qiangDu
    }
    const 最新消息文本 = await this.获取最新消息文本(历史消息, 轮次.驱动消息ID)
    const 是第一轮 = !历史消息.some((m) => m.fa_song_zhe_lei_xing === 'jiaose')
    const 最新消息内容 = String(最新消息文本 || '')
    const 本轮连发数 = this.自上一条角色消息以来的用户消息计数
    const 当前睡前 = (() => { const h = this.当地现在小时(); return h >= 22 || h < 6 })()
    const silenceLevel = this.算沉默等级(历史消息, 最新消息内容, 本轮连发数, false, 当前睡前)
    const yuQuZhaiYao = await this.读取本轮记忆摘要()
    const guanJianZhuRu = ''
    let lianWangZhuRu = ""
    try {
      const { huoQuLianWangSouSuoZhuRu } = await import("./联网搜索")
      lianWangZhuRu = await huoQuLianWangSouSuoZhuRu(最新消息文本, 是第一轮)
    } catch (e) {
      debug日志.warn("AI调度器", "联网搜索失败，不影响本轮回复", { xiang_qing: { cuo_wu: String(e) } })
    }

    this.io.to(管理监控房间名(this.用户ID)).emit('管理员_构建过程', {
      阶段: '策略规划',
      说明: 'Director 已完成意图判定，Writer 进入回复生成',
      时间: Date.now(),
      轮次: 轮次.处理ID,
    })

    // FP-04：回溯类消息才查库回想，结果进回想提示层；未命中/异常留空，不影响主链路
    const huiXiangTiShi = await huoQuHuiXiangTiShi(最新消息内容, this.用户ID, this.角色ID)

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
        guan_xi_jie_duan: '冷淡',
      },
      dui_hua_li_shi: 历史消息,
      benLunJiaoDianId: 轮次.驱动消息ID ?? null,
      yong_hu_xin_xiao_xi: 最新消息文本,
      yong_hu_xing_bie: 用户性别 ?? undefined,
      shi_fou_di_yi_lun: 是第一轮,
      shi_jian_chang_jing: this.构造时间场景提示(),
      tu_pian_shou_quan: tuPianShouQuan,
      ji_yi_zhai_yao: yuQuZhaiYao || undefined,
      guan_jian_shi_jian: guanJianZhuRu || undefined,
      lianWangSouSuo: lianWangZhuRu || undefined,
      dang_qian_xin_qing: xinQingNow.ming || undefined,
      xin_qing_qiang_du: xinQingNow.ming ? xinQingNow.qiangDu : undefined,
      yong_hu_yu_yan: this.用户语言,
      qiang_zhi_yu_yan: this.强制语言 || undefined,
      huiYingDengJi: silenceLevel,
      weiDuiXianChengNuo: await this.getPendingPromises(this.用户ID, this.角色ID),
      zuiJinDuanMing: [...this.最近贴纸短名],
      huiXiangTiShi: huiXiangTiShi || undefined,
    }

    return yunXingAIYinQing(输入, 信号)
  }

  private async 获取最新消息文本(
    历史消息: DuiHuaLiShiXiang[],
    驱动消息ID?: string | null,
  ): Promise<string> {
    const 焦点 = quBenLunLianFaJiaoDian(历史消息, 驱动消息ID)
    if (!焦点) return ''
    const 引用回口 = gouJianYinYongChaXun(历史消息)
    const wenBenLieBiao: string[] = []
    for (const 焦点消息 of 焦点.xiaoXiLieBiao) {
      let 增补: { 视频画面描述?: string | null; 视频转写文本?: string | null; 音频事件描述?: string } | undefined
      if (焦点消息.meiTiLeiBie === 'wenjian' && !焦点消息.yi_che_hui) {
        const ming = 焦点消息.yuanShiWenJianMing || ''
        const xiaoMIME = (焦点消息.meiTiMIME || '').toLowerCase()
        if (xiaoMIME.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(ming)) {
          const jieXi = await huoQuHuoJieXiShiPinMiaoShu(焦点消息.meiTiSha256)
          增补 = { 视频画面描述: jieXi.huaMianMiaoShu, 视频转写文本: jieXi.zhuanXieWenBen }
        }
      }
      if (焦点消息.meiTiLeiBie === 'yuyin' && !焦点消息.yi_che_hui) {
        const sha256 = (焦点消息.meiTiSha256 || '').toLowerCase()
        const mime = (焦点消息.meiTiMIME || '').toLowerCase()
        if (/^[0-9a-f]{64}$/.test(sha256) && mime.startsWith('audio/')) {
          const miaoShu = await huoQuYinPinShiJianMiaoShu({ sha256, mime })
          if (miaoShu) 增补 = { 音频事件描述: miaoShu }
        }
      }
      const wenBen = zhanShiXiaoXiZhengWen(焦点消息, 增补, 引用回口)
      if (wenBen.trim()) wenBenLieBiao.push(wenBen)
    }
    return wenBenLieBiao.join('\n')
  }

  private async 发送消息列表(
    消息列表: string[],
    信号: AbortSignal,
    轮次: LunCiShangXiaWen,
    ai结果: { ce_lue?: DirectorCeLue },
  ): Promise<void> {
    const 处理ID = 轮次.处理ID
    this.本轮已发送预警 = false
    const 最新消息文本 = await this.获取最新消息文本(
      await huoQuZuiJinDuiHuaLiShi(this.用户ID, this.角色ID),
      轮次.驱动消息ID,
    )
    const yiFaSongLieBiao: string[] = []
    const yiFaWenZiDuanLieBiao: string[] = []
    this.连发剩余条数 = 0

    let yiFaTieZhiShu = this.取本轮已发贴纸数(处理ID)
    const jinRuShiTieZhiShu = yiFaTieZhiShu
    let chuLiDuanShu = 0
    let benLunYiFaChuNeiRong = false
    let shangYiDuanShiTieZhi = false
    this.连发小表情计数 = 0

    for (const yuanShiXiaoXi of 消息列表) {
      for (const duan of qieFenTieZhi(yuanShiXiaoXi)) {
        if (信号.aborted || 处理ID !== this.当前处理ID) return
        if (chuLiDuanShu > 0) {
          if (shangYiDuanShiTieZhi) {
            await this.等待贴纸后短间隔(信号)
          } else {
            await this.等待间隔(信号)
          }
          if (信号.aborted || 处理ID !== this.当前处理ID) return
        }
        chuLiDuanShu += 1

        if (duan.leiXing === 'tupian') {
          if (!BiaoQingBaoYunXing.daKai) {
            debug日志.debug('AI调度器', '表情包总开关关着，这一段按文字处理，不发出标记', {
              xiang_qing: {
                jiao_se_id: this.角色ID,
                lun_ci: 处理ID,
                duan_ming: duan.neiRong,
                yuan_yin: BiaoQingFaSongYuanYin.daKaiGuanBi,
              },
            })
            shangYiDuanShiTieZhi = false
            continue
          }
          const shiYuanSheng = isYuanShengBiaoQingDuanMing(duan.neiRong)
          if (shiYuanSheng && this.连发小表情计数 >= 6) {
            debug日志.warn('AI调度器', '本轮微信小表情已达6连发，后续不再发', {
              xiang_qing: { jiao_se_id: this.角色ID, lun_ci: 处理ID, duan_ming: duan.neiRong },
            })
            shangYiDuanShiTieZhi = false
            continue
          }
          if (!shiYuanSheng && yiFaTieZhiShu >= BiaoQingBaoYunXing.zuiDaMeiLunZhangShu) {
            debug日志.warn('AI调度器', '本轮表情包张数已到上限，这一段丢弃', {
              xiang_qing: {
                jiao_se_id: this.角色ID,
                lun_ci: 处理ID,
                duan_ming: duan.neiRong,
                yi_fa_zhang_shu: yiFaTieZhiShu,
                shang_xian: BiaoQingBaoYunXing.zuiDaMeiLunZhangShu,
              },
            })
            shangYiDuanShiTieZhi = false
            continue
          }
          const biaoQingXiaoXi = await 发送表情包消息(this.用户ID, this.角色ID, duan.neiRong).catch(
            (cuoWu: unknown) => {
              debug日志.warn('AI调度器', '表情包消息发送抛错，这一段丢弃', {
                xiang_qing: {
                  jiao_se_id: this.角色ID,
                  lun_ci: 处理ID,
                  duan_ming: duan.neiRong,
                  cuo_wu: String(cuoWu).slice(0, 200),
                },
              })
              return null
            },
          )
          if (!biaoQingXiaoXi) {
            debug日志.warn('AI调度器', '贴纸短名没发出去，只丢这一段，后面的文字照发', {
              xiang_qing: { jiao_se_id: this.角色ID, lun_ci: 处理ID, duan_ming: duan.neiRong },
            })
            shangYiDuanShiTieZhi = false
            continue
          }
          if (shiYuanSheng) {
            shangYiDuanShiTieZhi = false
            this.连发小表情计数 = this.连发小表情计数 + 1
            benLunYiFaChuNeiRong = true
            try {
              this.推送角色回复([biaoQingXiaoXi], 轮次)
            } catch (cuoWu) {
              debug日志.error('AI调度器', '微信小表情回复推送异常', {
                xiang_qing: { jiao_se_id: this.角色ID, xiao_xi_id: biaoQingXiaoXi.id, cuo_wu: String(cuoWu) },
              })
            }
            continue
          }
          this.连发小表情计数 = 0
          yiFaTieZhiShu += 1
          this.记本轮已发贴纸(处理ID, yiFaTieZhiShu)
          this.最近贴纸短名.push(duan.neiRong)
          if (this.最近贴纸短名.length > 6) this.最近贴纸短名.shift()
          benLunYiFaChuNeiRong = true
          shangYiDuanShiTieZhi = true
          this.自上一条角色消息以来的用户消息计数 = 0
          try {
            this.推送角色回复([biaoQingXiaoXi], 轮次)
          } catch (cuoWu) {
            debug日志.error('AI调度器', '表情包回复推送异常', {
              xiang_qing: { jiao_se_id: this.角色ID, xiao_xi_id: biaoQingXiaoXi.id, cuo_wu: String(cuoWu) },
            })
          }
          jiLuSocketShiJian('角色回复', this.用户ID, {
            jiao_se_id: this.角色ID,
            xiao_xi_shu: 1,
            xiao_xi_id: biaoQingXiaoXi.id,
            duan_ming: duan.neiRong,
          })
          continue
        }

        shangYiDuanShiTieZhi = false
        const qingXiHouWenBen = qingXiTieZhiCanPian(duan.neiRong)
        if (qingXiHouWenBen === '') continue

        if (this.已送达过(qingXiHouWenBen)) {
          debug日志.warn('AI调度器', '本轮回复与刚送达的一条同文本，已丢弃', {
            xiang_qing: { jiao_se_id: this.角色ID, lun_ci: 处理ID, duan_shu: chuLiDuanShu },
          })
          continue
        }

        const 保存结果 = await 保存角色XiaoXi({
          yong_hu_id: this.用户ID,
          jiao_se_id: this.角色ID,
          nei_rong: qingXiHouWenBen,
        })

        this.自上一条角色消息以来的用户消息计数 = 0
        benLunYiFaChuNeiRong = true

        yiFaSongLieBiao.push(qingXiHouWenBen)
        yiFaWenZiDuanLieBiao.push(qingXiHouWenBen)
        this.登记送达(qingXiHouWenBen)
        try {
          this.推送角色回复([保存结果], 轮次)
        } catch (cuoWu) {
          debug日志.error('AI调度器', '角色回复推送异常', {
            xiang_qing: { jiao_se_id: this.角色ID, xiao_xi_id: 保存结果?.id, cuo_wu: String(cuoWu) },
          })
        }
        jiLuSocketShiJian('角色回复', this.用户ID, { jiao_se_id: this.角色ID, xiao_xi_shu: 1, xiao_xi_id: 保存结果?.id })
        this.io.to(管理监控房间名(this.用户ID)).emit('管理员_构建过程', {
          阶段: '输出回复',
          说明: `第 ${yiFaWenZiDuanLieBiao.length} 段文字已生成并写入对话`,
          内容: qingXiHouWenBen,
          时间: Date.now(),
          轮次: 处理ID,
        })
      }
    }

    if (信号.aborted || 处理ID !== this.当前处理ID) return

    const benLunYiFaChuTiaoShu = yiFaSongLieBiao.length + (yiFaTieZhiShu - jinRuShiTieZhiShu)
    if (benLunYiFaChuTiaoShu === 0 && 消息列表.length > 0) {
      const yuanShiWenBen = 消息列表.join('\n')
      const douDiWenBen = qingXiTieZhiCanPian(yuanShiWenBen)
      if (douDiWenBen !== '' && !this.已送达过(douDiWenBen)) {
        const 保存结果 = await 保存角色XiaoXi({
          yong_hu_id: this.用户ID,
          jiao_se_id: this.角色ID,
          nei_rong: douDiWenBen,
        })
        this.自上一条角色消息以来的用户消息计数 = 0
        benLunYiFaChuNeiRong = true
        yiFaSongLieBiao.push(douDiWenBen)
        yiFaWenZiDuanLieBiao.push(douDiWenBen)
        this.登记送达(douDiWenBen)
        try {
          this.推送角色回复([保存结果], 轮次)
        } catch (cuoWu) {
          debug日志.error('AI调度器', '兜底文字推送异常', {
            xiang_qing: { jiao_se_id: this.角色ID, xiao_xi_id: 保存结果?.id, cuo_wu: String(cuoWu) },
          })
        }
        jiLuSocketShiJian('角色回复', this.用户ID, {
          jiao_se_id: this.角色ID,
          xiao_xi_shu: 1,
          xiao_xi_id: 保存结果?.id,
          lai_yuan: BiaoQingFaSongYuanYin.douDiBuFa,
        })
        debug日志.warn('AI调度器', '整轮一条都没发出去，已用清洗后的原文补一条兜底文字', {
          xiang_qing: {
            jiao_se_id: this.角色ID,
            lun_ci: 处理ID,
            yuan_yin: BiaoQingFaSongYuanYin.zhengLunKong,
            duan_shu: chuLiDuanShu,
          },
        })
      } else {
        debug日志.warn('AI调度器', '整轮只有贴纸且贴纸没发出去，清洗后也没有文字可补，本轮玩家收不到内容', {
          xiang_qing: {
            jiao_se_id: this.角色ID,
            lun_ci: 处理ID,
            yuan_yin: BiaoQingFaSongYuanYin.qingXiHouKong,
            duan_shu: chuLiDuanShu,
          },
        })
      }
    }

    if (最新消息文本 && benLunYiFaChuNeiRong) {
      if (yiFaSongLieBiao.length > 0) {
        const 好感度变化 = await this.更新好感度(最新消息文本, yiFaSongLieBiao)
      void import('./承诺兑现').then((m) => (m as unknown as Record<string, (a: string, b: string, c: string) => Promise<void>>)['提取承诺'](this.用户ID, this.角色ID, yiFaSongLieBiao.join(' '))).catch(() => undefined)
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
      }
        const { huoQuJieDuanXinXi } = await import('./好感度')
        const hd = await huoQuWanZhengHaoGanDu(this.用户ID, this.角色ID)
        const xinJieDuan = huoQuJieDuanXinXi(hd ? hd.zong_fen : 0)
        const yueQian = this.上次关系阶段序号 >= 0 && xinJieDuan.xiaXian > this.上次关系阶段序号
      void 尝试头像演化({
        用户ID: this.用户ID,
        jiaoSeId: this.角色ID,
        laiYuan: '回复完成类',
        guanXiYueQian: yueQian,
      }).catch(() => undefined)
      const jieShuJieGuo = await chuLiAIHuiFuHouJieShuJianCha(this.用户ID, this.角色ID)
      if (jieShuJieGuo) {
        this.清除等待表白回复状态()
        if (处理ID === this.当前处理ID) this.发布AI状态('kong_xian')
        return
      }
    }

    if (this.当前角色 && yiFaWenZiDuanLieBiao.length > 0 && 处理ID === this.当前处理ID) {
      const 首条回复 = yiFaWenZiDuanLieBiao[0]
      const tts文本 = 转换TTS文本(首条回复).slice(0, TtsPeiZhi.tuiSongZuiDaZiFu)
      const 概率结果 = 计算TTS概率({
        角色: this.当前角色,
        好感度: await (async () => {
          const { huoQuWanZhengHaoGanDu } = await import('./好感度')
          return huoQuWanZhengHaoGanDu(this.用户ID, this.角色ID)
        })(),
        策略: ai结果.ce_lue,
      })

      if (概率结果.是否触发 && tts文本) {
        const yinSeId = this.当前角色.voice_id || 'female-shaonv'
        setImmediate(() => {
          尝试合成语音({ text: tts文本, yinSeId, roleId: this.角色ID, 用户ID: this.用户ID })
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
                const { 保存角色媒体消息 } = await import('./消息')
                const 语音消息 = await 保存角色媒体消息({
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
            .catch((cuoWu) => {
              debug日志.warn('AI调度器', 'TTS 语音合成链路失败，已降级为纯文本', { xiang_qing: { cuo_wu: String(cuoWu).slice(0, 200) } })
            })
        })
      }
    }

    if (处理ID === this.当前处理ID) this.发布AI状态('kong_xian')

    void 尝试头像演化({
      用户ID: this.用户ID,
      jiaoSeId: this.角色ID,
      laiYuan: 'zhaiYaoShengCheng',
    }).catch(() => undefined)
  }

  private async 同步用户语言(): Promise<void> {
    try {
      const jieGuo = await 数据库.query(`SELECT "时区" FROM "用户" WHERE "ID" = $1 LIMIT 1`, [
        this.用户ID,
      ])
      const shiQu = jieGuo.rows[0]?.时区
      this.用户时区 = YuYanGongNeng.huoQuShiQu(shiQu)
      this.用户语言 = YuYanGongNeng.shiQuDaoYuYan(shiQu)
    } catch (错误) {
      debug日志.warn('AI调度器', '读取用户时区失败，按中文兜底', {
        xiang_qing: { yong_hu_id: this.用户ID, cuo_wu: String(错误) },
      })
      this.用户语言 = 'zh'
    }
  }



  private async getPendingPromises(用户ID: string, jiaoSeId: string): Promise<string[]> {
    if (process.env.VITEST === 'true') return []
    const m = await import('./承诺兑现')
    const fn = m as unknown as Record<string, (a: string, b: string) => Promise<string[]>>
    const 未兑现 = await fn['获取未兑现承诺'](用户ID, jiaoSeId)
    const 到期 = await fn['获取到期未兑现承诺'](用户ID, jiaoSeId)
    const 合并 = [...到期, ...未兑现.filter((x) => !到期.includes(x))]
    return 合并.slice(0, 5)
  }


private 算沉默等级(历史: DuiHuaLiShiXiang[], 最新消息: string, 连发条数: number, 必答: boolean, 睡前: boolean): number {
    const 消息文本 = String(最新消息 || '')
    const 判定 = 沉默判定模块 as unknown as Record<string, (can: Record<string, unknown>) => number>
    const 升级 = 沉默判定模块 as unknown as Record<string, (...args: unknown[]) => number>
    const 参数: Record<string, unknown> = {}
    参数['用户消息'] = 消息文本
    let 上条角色下标 = -1
    for (let i = 历史.length - 1; i >= 0; i -= 1) {
      const 项 = 历史[i]
      if (项 && 项.fa_song_zhe_lei_xing === 'jiaose') { 上条角色下标 = i; break }
    }
    let 上条用户消息 = ''
    let 上条用户等级: number | null = null
    if (上条角色下标 > 0) {
      const 上条 = 历史[上条角色下标 - 1]
      if (上条 && 上条.fa_song_zhe_lei_xing === 'yonghu') {
        上条用户消息 = String(上条.nei_rong || '')
        上条用户等级 = 2
      }
    }
    const 上轮已不回 = 上条角色下标 > 0 && this.上条角色消息后用户来过 === false && this.上条角色消息时刻 > 0
    参数['上条角色消息存在'] = 上条角色下标 >= 0
    参数['上条用户消息'] = 上条用户消息
    参数['上条用户等级'] = 上条用户等级
    参数['本轮连发条数'] = 连发条数
    参数['必答事实中继'] = 必答
    const 基础等级 = 判定['算回应必要性等级'](参数)
    const 有追问 = 消息文本.includes('?') || 消息文本.includes('？') || 沉默判定模块['是问句'](消息文本)
    return 升级['升级等级'](基础等级, 上轮已不回, 有追问, 睡前, this.连续沉默轮数)
  }


  private 执行沉默表现(轮次: LunCiShangXiaWen): void {
    const lunCiId = 轮次.处理ID
    const yanChiHaoMiao = 沉默判定模块['转换时光毫秒'](沉默判定模块['算时光秒'](2, false, false))
    this.发布AI状态('zheng_zai_shu_ru')
    this.沉默计时器 = setTimeout(() => {
      if (lunCiId !== this.当前处理ID) return
      this.发布AI状态('kong_xian')
      this.沉默计时器 = null
    }, yanChiHaoMiao)
    jiLuSocketShiJian('角色回复', this.用户ID, {
      jiao_se_id: this.角色ID,
      xiao_xi_shu: 0,
      lei_xing: 'chen_mo_biao_xian',
    })
  }



  private async 同步当前心情(
    ceLue: DirectorCeLue | undefined,
    处理ID: number,
    信号: AbortSignal,
  ): Promise<void> {
    if (!ceLue || 信号.aborted) return

    const huanYuYan = ceLue.yao_qiu_huan_yu_yan
    if (typeof huanYuYan === 'string' && huanYuYan !== '') {
      this.强制语言 = huanYuYan
    } else if (huanYuYan === null) {
      this.强制语言 = null
    }
    const ming = ceLue.xin_qing
    if (ming === undefined) return
    if (ming === null) {
      await xieRuDangQianXinQing(this.角色ID, null, 0, '').catch((错误) => {
        debug日志.error('AI调度器', '心情清空失败', { xiang_qing: { jiao_se_id: this.角色ID, cuo_wu: String(错误) } })
      })
      return
    }
    const qiangDu = typeof ceLue.xin_qing_qiang_du === 'number' ? ceLue.xin_qing_qiang_du : 40
    const laiYuan = (ceLue.xin_qing_li_you || '').trim()
    await xieRuDangQianXinQing(this.角色ID, ming, qiangDu, laiYuan).catch((错误) => {
      debug日志.error('AI调度器', '心情写入失败', { xiang_qing: { jiao_se_id: this.角色ID, cuo_wu: String(错误) } })
    })
    this.io.to(管理监控房间名(this.用户ID)).emit('管理员_隐藏信息', {
      类型: '当前心情',
      内容: `${ming}（强度 ${qiangDu}）${laiYuan ? '：' + laiYuan : ''}`,
      时间: Date.now(),
      轮次: 处理ID,
    })
  }

  private async 更新好感度(
    用户消息: string,
    角色回复LieBiao: string[],
  ): Promise<HaoGanDuPingPanJieGuo | null> {
    try {
      const shangXiaWen: 参数上下文 = {
        jiaoSe: gouJianJiaoSeShangXiaWen(this.当前角色),
      }
      const 评判结果 = await pingPanHaoGanDuPiLiangNei(用户消息, 角色回复LieBiao, '对方', shangXiaWen, undefined, this.用户ID, this.角色ID)
      if (评判结果.jieGuo.li_you === 'unknown') return null
      try {
        const gengXinJieGuo = await gengXinHaoGanDu(this.用户ID, this.角色ID, 评判结果.jieGuo, 评判结果.xiShu, 评判结果.muBiaoQuXian, 评判结果.lianXuWeiDaBiao)
        if (gengXinJieGuo.cheng_gong && gengXinJieGuo.zeng_liang_shi_jian) {
          this.io.to(this.用户ID).emit('好感度增量', {
            ...gengXinJieGuo.zeng_liang_shi_jian,
            jiao_se_id: this.对外角色ID,
          })
        }
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

  private async 等待贴纸后短间隔(信号: AbortSignal): Promise<void> {
    const { jiZhun, douDong } = BiaoQingBaoYunXing.tieZhiHouDuanJianGe
    const jianGe = Math.floor(jiZhun + Math.random() * douDong)
    const 开始时间 = Date.now()
    while (Date.now() - 开始时间 < jianGe) {
      if (信号.aborted) return
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
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

