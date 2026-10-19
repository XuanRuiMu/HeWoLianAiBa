/**
 * 角色作息（第十七轮新增）。
 *
 * ## 为什么要这个模块
 *
 * 用户定稿：「完全模拟现实」+「凌晨4 点发消息，大部分人应该是睡着的状态，
 * 所以不应该回复，应该根据人设，等某个时间再回复」。
 *
 * 改造前的两个真实缺陷：
 * 1. `AI回复调度器.回复延迟毫秒` 默认 **10000（10 秒）** —— 它模拟的是「打字时间」，
 *    不是「作息」。于是凌晨 4 点用户发消息，AI **10 秒后就回**。
 * 2. `时间场景配置.ts` 把 0–5 点归为 `shenYe / lingChen`，注入 prompt 的还是
 *    「凌晨夜深人静，语气放缓，多一点陪伴感，**别吵**」
 *    ⇒ 这是在**教模型凌晨两点陪聊**，与「完全模拟现实」直接矛盾。
 *
 * ## 现实依据
 *
 * · 《2025中国社交平台行为观察报告》：**22 点后聊天量断崖下跌**，暧昧人群高峰持续到凌晨 1 点
 *   ⇒ 中国大学生的活跃窗口大致是 8–22 点，凌晨属于「基本都在睡」
 * · 依恋类型研究：不同人的作息与主动频率差异很大（焦虑型高频、回避型极低）
 *   ⇒ 醒着的时间必须**因人而异**，不能一刀切
 * · 夜猫子是真实存在的一类人（写论文、做设计的、程序员）
 *   ⇒ 「I 型/内向」**不等于**「睡得早」，不能拿 MBTI 当作息
 *
 * ## 设计约束（守第十五轮定的协议铁律）
 *
 * ⚠️ 这里只回答**行为层面的两个是非问题**：现在是睡着的还是醒着的？
 *   醒着的话**什么时候能回**（= 起床时间）。
 *   **绝不回答「怎么说话」** —— 那是角色的事。
 *   一旦在这里写「该说什么语气」，就又回到了技巧清单的老路。
 */
import { duJieBaoKaiGuan } from './开场采样配置'

/**
 * 作息类型。取值只影响**清醒时段**，不影响语气与内容。
 *
 * `zaoShui`早睡早起（学生/上班族主流）／`wanShui` 熬夜型（夜猫子）／`buZeGui` 不定（自由职业/失眠）
 */
export type ZuoXiLeiXing = 'zaoShui' | 'wanShui' | 'buZeGui'

/** 各类型的**清醒时段**（当地时间，小时区间 [起, 止)），闭区间边界写在这里 |
 sole是为了让「上午 8 点前算睡着」这种边界只有一处真源 */
export const XING_QING_SHI_JIAN_LEI_XING: Record<ZuoXiLeiXing, { qi: number; zhong: number }> = {
  // 早睡早起：23:30 睡、7:30 醒
  zaoShui: { qi: 7.5, zhong: 23.5 },
  // 熬夜型：凌晨 2 点还在冲浪、上午 11 点才起
  wanShui: { qi: 11, zhong: 26 },// 26 > 24 ⇒ 跨午夜
  // 不定：几乎全天都可能醒着（自由职业、失眠）
  buZeGui: { qi: 9, zhong: 24 },
}

/**
 * 从人设推断作息类型。
 *
 * ⚠️ **不用 MBTI 推断作息** —— 「内向 = 睡得早」是没有依据的刻板印象，
 *   夜猫子里外向的比比皆是。宁可全部走默认值（早睡早起），
 *   也不要用错误的相关性去推断现实行为。
 *
 * 只看两处**文本证据**：`身份/职业` 与 `行为习惯`里是否明写作息。
 *
 * ⚠️ 判断顺序**不能反**：初版把 `自由职业` 和 `熬夜` 放在同一组里比，
 *   结果 `自由职业/程序员` 全被判成 `wanShui`。但自由职业的作息是
 *   **不定**（可能早可能晚），不是「熬夜」。两类必须分开。
 */
export function tuiDuanZuoXi(wenBen: string): ZuoXiLeiXing {
  // ① 不定：作息本身不稳定（含自由职业、失眠、作息不规律）
  if (/作息不规律|失眠|自由职业|设计师/.test(wenBen)) return 'buZeGui'
  // ② 熬夜型：明确晚睡
  if (/夜猫子|熬夜|通宵|凌晨还|睡得很晚/.test(wenBen)) return 'wanShui'
  return 'zaoShui'
}

export interface ZuoXiPanDuan {
  xiaoShi: number
  /** 此刻是醒着还是睡着 */
  shiFuZhe: boolean
  /** 睡着时：距离「能回话」还有多少毫秒（= 到起床时间） */
  dengDaiMiaoShu: number
  /** 睡着时：起床时间是当地第几（供提示层表述） */
  qiXingXiaoShi: number
  leiXing: ZuoXiLeiXing
}

/**
 * 算某地当前小时数下的作息状态。
 *
 * @param xiaoShi 当地当前小时（可含小数，由调用方按时区换算）
 * @param leiXing 作息类型
 */
export function panDuanZuoXi(xiaoShi: number, leiXing: ZuoXiLeiXing = 'zaoShui'): ZuoXiPanDuan {
  // 环境变量整段覆盖（自测/灰度用）：`XING_QUO_FEN_ZHENG=8-23.5`
  const fuZuo = duZheFuZuoXi()
  const fanWei = fuZuo || XING_QING_SHI_JIAN_LEI_XING[leiXing]
  const xiaoShiZheng = ((xiaoShi % 24) + 24) % 24

  // 跨午夜的清醒段（熬夜型 11:00–次日 2:00）单独判
  if (fanWei.zhong > 24) {
    const shiFuZhe = xiaoShiZheng < fanWei.qi && xiaoShiZheng >= fanWei.zhong - 24
    if (shiFuZhe) {
      return { xiaoShi: xiaoShiZheng, shiFuZhe, dengDaiMiaoShu: (fanWei.qi - xiaoShiZheng) * 3600_000, qiXingXiaoShi: fanWei.qi, leiXing }
    }
    return { xiaoShi: xiaoShiZheng, shiFuZhe: false, dengDaiMiaoShu: 0, qiXingXiaoShi: fanWei.qi, leiXing }
  }

  if (xiaoShiZheng >= fanWei.qi && xiaoShiZheng < fanWei.zhong) {
    return { xiaoShi: xiaoShiZheng, shiFuZhe: false, dengDaiMiaoShu: 0, qiXingXiaoShi: fanWei.qi, leiXing }
  }
  // 睡着：算到下一个清醒起点
  const houLiang = xiaoShiZheng < fanWei.qi ? fanWei.qi - xiaoShiZheng : 24 - xiaoShiZheng + fanWei.qi
  return {
    xiaoShi: xiaoShiZheng,
    shiFuZhe: true,
    dengDaiMiaoShu: Math.max(1, houLiang * 3600_000 - 1),
    qiXingXiaoShi: fanWei.qi,
    leiXing,
  }
}

export const ZUO_XI_KAI_GUAN_MING = 'XING_ZUO_QI_YONG'
export function zuoXiKaiQi(): boolean {
  return duJieBaoKaiGuan(ZUO_XI_KAI_GUAN_MING)
}

/** 运营可配的**兜底清醒时段**（环境变量整段覆盖，便于灰度） */
export function duZheFuZuoXi(): { qi: number; zhong: number } | null {
  const wen = (process.env.XING_QUO_FEN_ZHENG || '').trim()
  const miao = wen.match(/^(\d{1,2})(?:\.(\d))?\s*[-~到]\s*(\d{1,2})(?:\.(\d))?$/)
  if (!miao) return null
  const qi = Number(miao[1]) + Number(miao[2] || 0) / 10
  const zhong = Number(miao[3]) + Number(miao[4] || 0) / 10
  if (!Number.isFinite(qi) || !Number.isFinite(zhong)) return null
  return { qi, zhong }
}
