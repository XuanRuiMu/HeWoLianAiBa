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

export interface AIHuiFuXiaoXiShiJian {
  角色ID: string
  消息列表: XiaoXiXinXi[]
  轮次?: number
  驱动消息ID?: string | null
}

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
  private 当前检测ID = 0
  private 自上一条角色消息以来的用户消息计数 = 0
  private 连发剩余条数 = 0
  private 本轮已发送预警 = false
  private 本轮驱动消息ID: string | null = null
  private 已送达登记 = new Map<string, number>()

  private 追加计时器: NodeJS.Timeout | null = null
  private 上条角色消息时刻 = 0
  private 上条角色消息后用户来过 = false
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
    this.本轮驱动消息ID = 驱动消息ID ?? null

    this.自上一条角色消息以来的用户消息计数 += 1
    this.上条角色消息后用户来过 = true

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
    this.预取回填摘要()
    const benCiJianCeID = ++this.当前检测ID
    return this.检测用户消息并决定后续(benCiJianCeID)
  }

  private 预取回填摘要(): void {
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
    if (this.追加计时器) {
      clearTimeout(this.追加计时器)
      this.追加计时器 = null
    }
    this.当前处理ID += 1
    if (this.取消控制器) {
      this.取消控制器.abort()
      this.取消控制器 = null
    }
    this.处理中 = false
    this.发布AI状态('kong_xian')
  }

  private 推送角色回复(消息列表: XiaoXiXinXi[], 轮次?: LunCiShangXiaWen | null): void {
    const 事件: AIHuiFuXiaoXiShiJian = {
      角色ID: this.角色ID,
      消息列表,
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
  const yanChi = this.计算本轮回复延迟()
  const anQuShangXian = 14 * 3600_000
  const shiJian = Math.max(0, Math.min(anQuShangXian, yanChi))
  this.本轮睡着中 = yanChi > this.回复延迟毫秒 * 2 && yanChi > 60_000

  this.计时器 = setTimeout(() => {
    this.计时器 = null
    void this.触发AI处理()
  }, shiJian)
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
  const chengShi = (this.当前角色?.shi_jie_xin_xi?.cheng_shi as string) || ''
  const shiCha = duShiChaXiaShi(chengShi)
  if (shiCha !== null) {
    const benDi = new Date()
    return ((benDi.getHours() + benDi.getMinutes() / 60 + shiCha) % 24 + 24) % 24
  }
  return new Date().getHours()
}

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

      if (信号.aborted || 处理ID !== this.当前处理ID) return
      const ai结果 = await this.运行AI(信号, 轮次)
      if (ai结果.cuo_wu_ma === 'XIAN_LIU_429' || ai结果.cuo_wu_ma === 'YU_E_BU_ZU_402') {
        this.发送系统错误提示(ai结果.cuo_wu_xin_xi || huoQuFanYi('AI', 'aiDiaoYongShiBai'))
        if (处理ID === this.当前处理ID) this.发布AI状态('kong_xian')
        return
      }
      this.发送深度思考监控(ai结果, 处理ID)

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
      if (ai结果.cuo_wu_xin_xi && ai结果.cuo_wu_xin_xi !== '') {
        this.发送系统错误提示(ai结果.cuo_wu_xin_xi)
        debug日志.error('AI回复调度器', 'Director要求回复但模型输出为空，按故障提示用户', {
          xiang_qing: { jiao_se_id: this.角色ID, lun: 轮次, cuo_wu: ai结果.cuo_wu_xin_xi },
        })
      } else {
        this.推送角色回复([], 轮次)
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
      await this.发送消息列表(消息列表, 信号, 轮次, ai结果)
      if (信号.aborted || 处理ID !== this.当前处理ID) return
      this.安排追加消息()
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

  private 安排追加消息(): void {
    if (!this.当前角色) return
    if (!duJieBaoKaiGuan('ZUI_JIA_QI_YONG')) return
    if (process.env.VITEST === 'true') return
    if (this.是否等待表白回复()) return

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
    if (this.上条角色消息后用户来过) return
    const chuShi = this.上条角色消息时刻
    if (!chuShi) return

    if (this.睡着()) return

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
      await this.发送消息列表(结果.xiao_xi_lie_biao.slice(0, 5), 控制器.signal, 轮次, 结果)
      jiLuSocketShiJian('角色回复', this.用户ID, {
        jiao_se_id: this.角色ID,
        xiao_xi_shu: 结果.xiao_xi_lie_biao.length,
        lei_xing: 'zui_jia',
      })
    } catch (cuoWu) {
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
    const 最新用户消息 = await this.获取最新用户消息(历史消息, 轮次.驱动消息ID)
    const 是第一轮 = !历史消息.some((m) => m.fa_song_zhe_lei_xing === 'jiaose')
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
    const 焦点消息 = quBenLunJiaoDianXiaoXiXiang(历史消息, 驱动消息ID)
    if (!焦点消息) return ''
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

      yiFaSongLieBiao.push(消息列表[i])
      this.登记送达(消息列表[i])
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
        说明: `第 ${i + 1} 条回复已生成并写入对话`,
        内容: 消息列表[i],
        时间: Date.now(),
        轮次: 处理ID,
      })
    }

    if (信号.aborted || 处理ID !== this.当前处理ID) return

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
      const shangXiaWen: CanShuShangXiaWen = {
        jiaoSe: gouJianJiaoSeShangXiaWen(this.当前角色),
      }
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
