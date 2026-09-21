import { XIAO_XI_PEI_ZHI } from '../config/消息配置'
import { LEI_BIE_DAO_XIAO_XI_LEI_XING } from '../config/媒体配置'
import { meiTiZhanShiWenBen, shiTuXiangLeiBie } from './AI视觉辅助'
import { yanZhengUUID } from '../utils/验证'
import { debug日志 } from '../utils/debug日志'

/**
 * FP-10（缺陷9「QQ 式图文混排」后端半边）**唯一**的消息内容块真源模块。
 *
 * 命名撞车声明：本模块的「内容块」是**消息**的有序图文块（用户编辑出来的顺序），
 * 与 `utils/DeepSeek客户端.ts` 的 `DuiHuaKuai`（喂给模型的请求体分片）不是一回事，
 * 两套类型禁互相赋值。
 *
 * 三条不变式（全部由 FP10 测试钉住）：
 *  ①派生：一条有块的消息，其兼容投影 `内容` 恒等于 `shunXuKeDuWenBen(块)`（顺序保真、无第二真源）；
 *  ②兼容：`内容块` 为 NULL 的历史行**不回填**，读取侧按 内容 + 媒体ID + 类型 反构等价块数组，
 *    出参 `nei_rong` 与改造前逐字相同；
 *  ③降级：脏块只丢该块并记 warn（日志不含正文），绝不因单个脏块把整条消息打成 500。
 *
 * 拼写口径（PROGRESS 里那条「tupian / tuPian 并存」的债，真实形态是两个**不同命名空间**）：
 *  - `媒体文件`.`类别` ∈ LEI_BIE_LIE_BIAO = tupian/biaoqingshu/yuyin/wenjian（baseline CHECK 钉死）；
 *  - `消息`.`类型` ∈ YUN_XU_XIAO_XI_LEI_XING = wenben/tuPian/biaoQingBao/yuYin/wenJian
 *    （001_haoyou 与 027 的 CHECK 钉死），二者唯一的对应表是 `LEI_BIE_DAO_XIAO_XI_LEI_XING`；
 *  - 块类型 `lei_xing` ∈ {wenzi, tupian} 是**第三个**命名空间（块自己的值域）。
 *  把三者"收敛成一个值"会同时撞破两条 DB CHECK 并静默改写成库行语义，故本模块不收敛，
 *  改为**边界归一**：块的图片值域一律叫 `tupian`，它能引用的媒体类别白名单唯一取自
 *  `AI视觉辅助.ts::shiTuXiangLeiBie`（tupian/biaoqingshu），派生出的 `消息.类型` 只经
 *  `LEI_BIE_DAO_XIAO_XI_LEI_XING[媒体类别]` 取得（正向）与其反查（反向）——本模块不写任何
 *  'tuPian'/'biaoQingBao' 形态的消息类型字面量，也不建第二份对应表。
 */

export const XIAO_XI_KUAI_LEI_XING = { wenZi: 'wenzi', tuPian: 'tupian' } as const

export type XiaoXiKuaiLeiXing = (typeof XIAO_XI_KUAI_LEI_XING)[keyof typeof XIAO_XI_KUAI_LEI_XING]

/** 落库与出参共用的块形态；JSON 键沿用出参的拼音下划线风格（nei_rong / mei_ti_id 同源） */
export interface XiaoXiKuai {
  lei_xing: XiaoXiKuaiLeiXing
  /** 文字块正文；图片块不带 */
  nei_rong?: string
  /** 图片块引用的 媒体文件.ID；文字块不带 */
  mei_ti_id?: string
}

/** 被丢弃块的明确原因（只用于日志与「全丢光时该报哪个 400」的判定，不外泄正文） */
export type KuaiDiuQiYuanYin =
  | 'kuai_fei_dui_xiang'
  | 'lei_xing_wu_ren'
  | 'wen_zi_chao_chang'
  | 'mei_ti_id_bu_he_fa'
  | 'kuaishu_chao_xian'
  | 'tupianshu_chao_xian'
  | 'mei_ti_bu_cun_zai'
  | 'mei_ti_wu_quan_xian'
  | 'mei_ti_lei_bie_bu_fu'

/** 超限信号：调用方按既有的「消息内容过长」400 口径回，不静默截断、不 500 */
export interface QingLiTiJiaoJieGuo {
  /** null = 本次提交不携带可用的块数组，调用方走既有的单段文本/单媒体老口径 */
  kuai: XiaoXiKuai[] | null
  diuQi: KuaiDiuQiYuanYin[]
  /** true = 命中长度策略上限（单块或合计），整条按 400 过长拒收 */
  chaoXian: boolean
  /** 需由调用方去库里判「存在 + 归属 + 类别」的图片块媒体 ID（去重、保序） */
  daiPanDingMeiTiId: string[]
}

export function xiaoXiKuaiPeiZhi() {
  return {
    zuiDaKuaiShu: XIAO_XI_PEI_ZHI.neiRongKuaiZuiDaKuaiShu,
    zuiDaTuPianShu: XIAO_XI_PEI_ZHI.neiRongKuaiZuiDaTuPianShu,
    danKuaiZuiDaZiShu: XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu,
    ziShuZongShangXian: XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu,
  }
}

/** 媒体类别 → 纯图片消息（无文字块）时该写的 消息.类型；只从对应表取，禁字面量 */
function meiTiLeiBieDaoKuaiXiaoXiLeiXing(leiBie: string): string | null {
  return (LEI_BIE_DAO_XIAO_XI_LEI_XING as Record<string, string | undefined>)[leiBie] ?? null
}

/**
 * 提交值的宽容取形：数组直接用；JSON 字符串（老序列化器双重编码的产物）解析后用；
 * 解析不动就当「没带块」，绝不抛错。
 */
function quKuaiShuZu(zhi: unknown, changDing: string): unknown[] | null {
  if (Array.isArray(zhi)) return zhi
  if (typeof zhi === 'string' && zhi.trim() !== '') {
    try {
      const jieXi = JSON.parse(zhi) as unknown
      if (Array.isArray(jieXi)) return jieXi
    } catch {
      debug日志.warn('消息内容块', '提交的内容块不是合法 JSON 数组，按未携带处理', {
        xiang_qing: { chang_ding: changDing, ti_jiao_lei_xing: 'string' },
      })
      return null
    }
    debug日志.warn('消息内容块', '提交的内容块 JSON 不是数组，按未携带处理', {
      xiang_qing: { chang_ding: changDing },
    })
  }
  return null
}

function isKuaiLeiXing(zhi: unknown): zhi is XiaoXiKuaiLeiXing {
  return zhi === XIAO_XI_KUAI_LEI_XING.wenZi || zhi === XIAO_XI_KUAI_LEI_XING.tuPian
}

/**
 * 提交侧结构清洗（不查库）：类型白名单、空文字块丢弃、文字块 trim、UUID 形态校验、
 * 块数与图片数上限。长度超限是**策略违规**（不是脏数据），按 chaoXian 上报由调用方 400；
 * 上限只量**用户自己的文字**（单块 与 合计），不含系统占位符——派生投影 `内容` 里的
 * `[图片]` 是系统标的载体标记，不该占用户的字数预算。
 * 不认识的块类型/形状怪异的块是**版本差异**，逐块丢弃 + warn，保留其余块。
 */
export function qingLiTiJiaoKuai(zhi: unknown, changDing = '消息发送'): QingLiTiJiaoJieGuo {
  const peiZhi = xiaoXiKuaiPeiZhi()
  const diuQi: KuaiDiuQiYuanYin[] = []
  const kuai: XiaoXiKuai[] = []
  const daiPanDingMeiTiId: string[] = []

  const shuZu = quKuaiShuZu(zhi, changDing)
  if (shuZu === null) {
    return { kuai: null, diuQi, chaoXian: false, daiPanDingMeiTiId }
  }
  if (shuZu.length === 0) {
    return { kuai: null, diuQi, chaoXian: false, daiPanDingMeiTiId }
  }
  if (shuZu.length > peiZhi.zuiDaKuaiShu) {
    diuQi.push('kuaishu_chao_xian')
    return { kuai: [], diuQi, chaoXian: true, daiPanDingMeiTiId }
  }

  let ziShu = 0
  let tuPianShu = 0
  for (const yuan of shuZu) {
    if (typeof yuan !== 'object' || yuan === null || Array.isArray(yuan)) {
      diuQi.push('kuai_fei_dui_xiang')
      continue
    }
    const xiang = yuan as Record<string, unknown>
    if (!isKuaiLeiXing(xiang.lei_xing)) {
      diuQi.push('lei_xing_wu_ren')
      continue
    }
    if (xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian) {
      const meiTiId = typeof xiang.mei_ti_id === 'string' ? xiang.mei_ti_id.trim() : ''
      if (!meiTiId || !yanZhengUUID(meiTiId)) {
        diuQi.push('mei_ti_id_bu_he_fa')
        continue
      }
      if (tuPianShu >= peiZhi.zuiDaTuPianShu) {
        diuQi.push('tupianshu_chao_xian')
        continue
      }
      tuPianShu += 1
      if (!daiPanDingMeiTiId.includes(meiTiId)) daiPanDingMeiTiId.push(meiTiId)
      kuai.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian, mei_ti_id: meiTiId })
      continue
    }
    const yuanWen = typeof xiang.nei_rong === 'string' ? xiang.nei_rong : ''
    const wenZi = yuanWen.trim()
    if (wenZi === '') {
      continue
    }
    if (wenZi.length > peiZhi.danKuaiZuiDaZiShu || ziShu + wenZi.length > peiZhi.ziShuZongShangXian) {
      diuQi.push('wen_zi_chao_chang')
      return { kuai: [], diuQi, chaoXian: true, daiPanDingMeiTiId }
    }
    ziShu += wenZi.length
    kuai.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: wenZi })
  }

  return { kuai, diuQi, chaoXian: false, daiPanDingMeiTiId }
}

/**
 * 库侧判定后的最终清洗：把「不存在 / 不属于本人 / 类别不是图片」的图片块逐块丢弃。
 * 归属判定必须在服务端做——块里只允许引用媒体 ID，前端直传 URL 一律不接受（防越权读他人媒体）。
 */
export function yingYongMeiTiPanDing(
  kuai: XiaoXiKuai[],
  meiTiXinXi: Map<string, { lei_bie: string; suo_shu: boolean }>,
): { baoLiu: XiaoXiKuai[]; diuQi: KuaiDiuQiYuanYin[] } {
  const baoLiu: XiaoXiKuai[] = []
  const diuQi: KuaiDiuQiYuanYin[] = []
  for (const xiang of kuai) {
    if (xiang.lei_xing !== XIAO_XI_KUAI_LEI_XING.tuPian) {
      baoLiu.push(xiang)
      continue
    }
    const xinXi = meiTiXinXi.get(xiang.mei_ti_id ?? '')
    if (!xinXi) {
      diuQi.push('mei_ti_bu_cun_zai')
      continue
    }
    if (!xinXi.suo_shu) {
      diuQi.push('mei_ti_wu_quan_xian')
      continue
    }
    // 图片块只能引用「图像类」媒体（tupian/biaoqingshu），类别判定唯一走 AI视觉辅助 同源入口
    if (!shiTuXiangLeiBie(xinXi.lei_bie)) {
      diuQi.push('mei_ti_lei_bie_bu_fu')
      continue
    }
    baoLiu.push(xiang)
  }
  return { baoLiu, diuQi }
}

/** 顺序化可读文本：文字块原文，图片块用既有载体占位符内联（顺序保真，无第二套占位符） */
export function shunXuKeDuWenBen(
  kuai: XiaoXiKuai[],
  xuanXiang?: { leiBieLeiXing?: (meiTiId: string | undefined) => string | undefined; yiCheHui?: boolean },
): string {
  let jieGuo = ''
  for (const xiang of kuai) {
    if (xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi) {
      jieGuo += xiang.nei_rong ?? ''
      continue
    }
    const leiBie = xuanXiang?.leiBieLeiXing?.(xiang.mei_ti_id) ?? 'tupian'
    jieGuo +=
      meiTiZhanShiWenBen(leiBie, { yiCheHui: Boolean(xuanXiang?.yiCheHui) }) ??
      meiTiZhanShiWenBen('tupian', { yiCheHui: Boolean(xuanXiang?.yiCheHui) })
  }
  return jieGuo
}

export interface JianRongJianYing {
  nei_rong: string
  lei_xing: string
  mei_ti_id: string | null
}

/**
 * 兼容投影（不变式①的唯一实现处）：
 *  - 纯图片块 ⇒ 与今天的图片/表情包消息逐字同形：`内容` = ''、`类型` = 该媒体类别在
 *    `LEI_BIE_DAO_XIAO_XI_LEI_XING` 里的消息类型（tupian→tuPian、biaoqingshu→biaoQingBao，
 *    全部非字面量）、`媒体ID` = 那一张；
 *  - 有文字块 ⇒ `内容` = 顺序可读文本（图片块按 AI视觉辅助 的既有载体占位符内联）、`类型` = 'wenben'
 *    （老读取方因此读到完整正文而非只剩一个占位符）、`媒体ID` = 首个图片块（老单媒体 UI 仍显示一张）。
 */
export function paiShengJianRong(
  kuai: XiaoXiKuai[],
  meiTiXinXi: Map<string, { lei_bie: string }> = new Map(),
): JianRongJianYing {
  const leiBieOf = (meiTiId: string | undefined) =>
    meiTiId ? meiTiXinXi.get(meiTiId)?.lei_bie : undefined
  const tuPianKuai = kuai.find((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian)
  const youWenZi = kuai.some((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi)
  const shouTuPianLeiBie = tuPianKuai ? leiBieOf(tuPianKuai.mei_ti_id) : undefined
  if (!youWenZi && shouTuPianLeiBie) {
    const leiXing = meiTiLeiBieDaoKuaiXiaoXiLeiXing(shouTuPianLeiBie)
    if (leiXing) {
      return { nei_rong: '', lei_xing: leiXing, mei_ti_id: tuPianKuai?.mei_ti_id ?? null }
    }
  }
  return {
    nei_rong: shunXuKeDuWenBen(kuai, { leiBieLeiXing: leiBieOf }),
    lei_xing: 'wenben',
    mei_ti_id: tuPianKuai?.mei_ti_id ?? null,
  }
}

export interface LiShiHangZiDuan {
  nei_rong: string
  lei_xing: string
  mei_ti_id: string | null
}

/** 消息类型 → 媒体类别（`LEI_BIE_DAO_XIAO_XI_LEI_XING` 的唯一反查口，禁第二份对应表） */
export function leiXingDaoMeiTiLeiBie(leiXing: string): string | null {
  for (const [leiBie, xiaoXiLeiXing] of Object.entries(LEI_BIE_DAO_XIAO_XI_LEI_XING)) {
    if (xiaoXiLeiXing === leiXing) return leiBie
  }
  return null
}

/**
 * 历史行反构（不变式②）：`内容块` 为 NULL 时按 内容 + 媒体ID + 类型 造等价块数组。
 *  - 纯文本行 ⇒ 一个文字块（内容 逐字进块，出参 `nei_rong` 因此与改造前完全相同）；
 *  - 媒体行 ⇒ 载体块在前、随附文字在后（旧模型本就没有顺序信息，此顺序即今天的展示顺序）；
 *    表情包/语音/文件 的历史行同样反构成「一个图片/媒体载体块」由读取侧按类别文本化，
 *    非图片类别（语音/文件）不生成块，只保留文字块——它们的展示形态与图文混排无关，
 *    硬造一个「图片块」会让前端把语音渲染成图。
 */
export function fanGouKuai(xiang: LiShiHangZiDuan): XiaoXiKuai[] {
  const jieGuo: XiaoXiKuai[] = []
  const wuWenBenLeiBie = xiang.lei_xing === 'wenben' ? null : leiXingDaoMeiTiLeiBie(xiang.lei_xing)
  const shiTuPian = wuWenBenLeiBie !== null && shiTuXiangLeiBie(wuWenBenLeiBie)
  if (shiTuPian && xiang.mei_ti_id) {
    jieGuo.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian, mei_ti_id: xiang.mei_ti_id })
  }
  if (xiang.nei_rong !== '') {
    jieGuo.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: xiang.nei_rong })
  }
  if (jieGuo.length === 0) {
    jieGuo.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: '' })
  }
  return jieGuo
}

/** 落库形态清洗（读取侧）：库里存的坏形状/陌生块一律不采信，交由调用方回退反构 */
export function qingLiLuoKuKuai(zhi: unknown, xiaoXiId: string): XiaoXiKuai[] | null {
  const shuZu = Array.isArray(zhi) ? zhi : null
  if (!shuZu) {
    if (zhi !== undefined && zhi !== null) {
      debug日志.warn('消息内容块', '库内内容块形状非数组，回退为按行反构', {
        xiang_qing: { xiao_xi_id: xiaoXiId },
      })
    }
    return null
  }
  const jieGuo: XiaoXiKuai[] = []
  for (const yuan of shuZu) {
    if (typeof yuan !== 'object' || yuan === null || Array.isArray(yuan)) continue
    const xiang = yuan as Record<string, unknown>
    if (!isKuaiLeiXing(xiang.lei_xing)) continue
    if (xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian) {
      const meiTiId = typeof xiang.mei_ti_id === 'string' ? xiang.mei_ti_id : ''
      if (!meiTiId || !yanZhengUUID(meiTiId)) continue
      jieGuo.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian, mei_ti_id: meiTiId })
      continue
    }
    const wenZi = typeof xiang.nei_rong === 'string' ? xiang.nei_rong : ''
    jieGuo.push({ lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: wenZi })
  }
  if (jieGuo.length === 0) {
    debug日志.warn('消息内容块', '库内内容块无一可解析，回退为按行反构', {
      xiang_qing: { xiao_xi_id: xiaoXiId, yuan_shi_kuai_shu: shuZu.length },
    })
    return null
  }
  return jieGuo
}

/**
 * 丢弃留痕：脏块降级不静默（PROGRESS 反复记过的「静默吞消息」教训）。
 * 只记原因直方图与场景，绝不记块正文（日志安全：日志不含敏感信息）。
 */
export function jiLuKuaiDiuQi(diuQi: KuaiDiuQiYuanYin[], changDing: string, yongHuId?: string): void {
  if (diuQi.length === 0) return
  const zhiFangTu: Record<string, number> = {}
  for (const yin of diuQi) zhiFangTu[yin] = (zhiFangTu[yin] ?? 0) + 1
  debug日志.warn('消息内容块', '内容块脏数据已丢弃', {
    xiang_qing: { chang_ding: changDing, yong_hu_id: yongHuId ?? '', diu_qi: zhiFangTu },
  })
}

/**
 * 审核文本：块里所有文字块按序拼接（不含系统载体占位符）。
 * 图文混排的文字必须逐字进安全审核与危机干预——「带块」绝不是绕过审核的口子。
 */
export function kuaiShenHeWenBen(kuai: XiaoXiKuai[]): string {
  return kuai
    .filter((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi)
    .map((xiang) => xiang.nei_rong ?? '')
    .join('')
}

/**
 * 图文混排块 = 同时含文字块与图片块。这类行的 `内容` 投影已经把载体占位符按顺序内联进去了，
 * 任何「媒体消息就用单个占位符覆盖正文」的旧读取分支（复盘、对话渲染）都必须先让位给它，
 * 否则模型与复盘看到的会是只剩 [图片] 的半条消息。
 */
export function shiTuWenHunPaiKuai(kuai: XiaoXiKuai[] | null | undefined): boolean {
  if (!kuai || kuai.length < 2) return false
  const youWenZi = kuai.some((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.wenZi)
  const youTuPian = kuai.some((xiang) => xiang.lei_xing === XIAO_XI_KUAI_LEI_XING.tuPian)
  return youWenZi && youTuPian
}

/** 丢弃原因 → 一条「什么都没剩下」的消息该回给客户端的既有翻译键（禁新造文案，全部来自 translations） */
export function diuQiDaoCuoWuJian(diuQi: KuaiDiuQiYuanYin[]): 'meiTiBuCunZai' | 'meiTiWuQuanXian' | 'xiaoXiNeiRongWeiKong' {
  if (diuQi.includes('mei_ti_wu_quan_xian')) return 'meiTiWuQuanXian'
  if (
    diuQi.includes('mei_ti_bu_cun_zai') ||
    diuQi.includes('mei_ti_lei_bie_bu_fu') ||
    diuQi.includes('mei_ti_id_bu_he_fa')
  ) {
    return 'meiTiBuCunZai'
  }
  return 'xiaoXiNeiRongWeiKong'
}
