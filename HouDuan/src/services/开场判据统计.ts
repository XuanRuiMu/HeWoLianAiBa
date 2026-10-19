/**
 * 机制 D 的验收判据统计（纯函数，可脱离 API 单测）。
 *
 * ⚠️ 为什么要抽出来：`联调_全链路语域实测.test.ts` 直接外呼真实 API。
 *    若把 M2/M7/M8 的计算内联在那份脚本里，就**无法在不烧额度的情况下验证算法本身**——
 *    算法算错会让整轮 120 轮实测全部作废。**度量代码必须先被度量。**
 *
 * 判据定义见 PROGRESS-模拟真人聊天.md §9。
 */
import { jianChaFuCong } from './开场候选约束'

const KOU_JING = 20

/** 取开场 token：去空白后前 2 字，不足 2 字返回空串 */
export function kaiChangToken(wenBen: string): string {
  return wenBen.replace(/[\s　]+/g, '').slice(0, 2)
}

/** 收集最近 `kouJing` 轮的开场 token（liShi 必须按时间升序） */
export function shouJiJiuJinKaiChangToken(
  liShi: Array<{ fa_song_zhe_lei_xing: string; nei_rong: string }>,
  kouJing: number = KOU_JING,
): Set<string> {
  const kaiShiWei: number[] = []
  let kaiShi = -1
  for (let i = 0; i < liShi.length; i++) {
    const leiXing = liShi[i].fa_song_zhe_lei_xing
    if (leiXing === 'yonghu') {
      if (kaiShi >= 0) kaiShiWei.push(kaiShi)
      kaiShi = -1
      continue
    }
    if (leiXing !== 'jiaose') continue
    if (kaiShi >= 0) continue
    if (kaiChangToken(String(liShi[i].nei_rong || '')).length === 2) kaiShi = i
  }
  if (kaiShi >= 0) kaiShiWei.push(kaiShi)

  const jieGuo = new Set<string>()
  for (const wei of kaiShiWei.slice(-kouJing)) {
    const t = kaiChangToken(String(liShi[wei].nei_rong || ''))
    if (t.length === 2) jieGuo.add(t)
  }
  return jieGuo
}

/** 一轮的判据原始计数 */
export interface LunPanDuan {
  /** 本轮首 2 字是否撞最近 20 轮 → M2 */
  M2_zhuangChe: 0 | 1
  /**
   * 本轮是否为**有效轮**（AI 有实际回复）。
   * ⚠️ 空回轮必须置 false，否则 M2 分母被稀释 → 撞车率假低 → 假达标（第二轮审查 P4）。
   */
  M2_keCeRen: boolean
  /** 是否从候选中选开头 → M7（null 记入待判定） */
  M7_yuFuCong: 0 | 1
  /** 首条是否可判定 → M7 分母 */
  M7_daiPanDing: 0 | 1
  /** AI 消息全文恰等于某个候选的条数 → M8 */
  M8_zhengZhiFuZhi: number
  /** 本轮开场 token（便于复算） */
  kaiChang: string
}

/**
 * 统计单轮。
 * @param liShi 本轮**之前**的完整历史（升序），不含本轮 AI 回复
 * @param yuanWen AI 原始输出全文（用于 M7）
 * @param xiaoXi 切分后的消息条（用于 M8）
 * @param houXuan 本轮注入的候选（必须与生产采样同源）
 */
export function tongJiLun(
  liShi: Array<{ fa_song_zhe_lei_xing: string; nei_rong: string }>,
  yuanWen: string,
  xiaoXi: string[],
  houXuan: string[],
): LunPanDuan {
  const shouTiao = (xiaoXi[0] || '').trim()
  const benLun = kaiChangToken(shouTiao)

  const jinKou = shouJiJiuJinKaiChangToken(liShi)
  // 有效轮＝AI 确实产出了消息。空回轮既不计分子也不计分母。
  const youXiao = xiaoXi.length > 0 && benLun.length === 2
  const M2 = youXiao && jinKou.has(benLun) ? 1 : 0

  const fuCong = jianChaFuCong(yuanWen, houXuan)
  // ⚠️ 待判定（首条不可判定，如单字「嗯」）必须计入分母排除，否则会虚高遵守率
  const M7_yu = fuCong === true ? 1 : 0
  const M7_dai = fuCong === null ? 0 : 1

  // M8：候选仅 2 字，模型可能把它单独发成一条消息
  const M8 = xiaoXi.filter((x) => houXuan.includes(x.trim())).length

  return {
    M2_zhuangChe: M2 as 0 | 1,
    M2_keCeRen: youXiao,
    M7_yuFuCong: M7_yu as 0 | 1,
    M7_daiPanDing: M7_dai as 0 | 1,
    M8_zhengZhiFuZhi: M8,
    kaiChang: benLun,
  }
}

/**
 * 汇总多轮为判据值。
 *
 * ⚠️ 分母口径（第二轮审查 P4）：
 *  - M2 分母 = **有效轮数**（`M2_keCeRen` 为真的轮），空回轮不计入。
 *    若把空回算进分母，撞车率会被系统性稀释 → 方向对 AI 有利 → 假达标。
 *  - M7 分母 = **可判定轮数**（`M7_daiPanDing`），首条不可判定者（如单字「嗯」）不计入。
 *  - M8 是绝对计数，判据要求 = 0。
 */
export function huiZongPanDuan(panDuan: (LunPanDuan & { kaiGuanKaiQi?: boolean })[]) {
  const M2_keCeRen = panDuan.filter((x) => x.M2_keCeRen).length
  // ⚠️ 纠错 #26（第四轮审查 Sp-1）：M7 分母**必须同时排除「开关关闭的轮」**。
  //    那类轮没有任何候选，模型无从「服从」——把它们算进分母等于把每轮都判为不服从，
  //    造成系统性向下偏倚（实测 7 轮服从 + 3 轮关闭 → 遵守率被拉成 0.7 而非 1.0）。
  //    曾用哨兵候选 `['__kaiGuanWeiQ__']` 冒充「跳过」，实际是把跳过变成了不服从。
  const M7_kePanDing = panDuan.filter((x) => x.M7_daiPanDing === 1 && x.kaiGuanKaiQi !== false).length
  const M8_youXiao = panDuan.filter((x) => x.kaiGuanKaiQi !== false)
  const M7_luShu = M8_youXiao.reduce((a, x) => a + x.M7_yuFuCong, 0)
  return {
    /** M2 撞车率。⚠️ 分母为有效轮数，空回轮不计入（否则假达标）；无可计入轮时返回 `null`（纠错 #28）——
     *  返回 0 会与「真的零撞车」不可区分，与 M7 同理 */
    M2_zhuangCheLv: M2_keCeRen === 0 ? null : Number((panDuan.reduce((a, x) => a + x.M2_zhuangChe, 0) / M2_keCeRen).toFixed(4)),
    M2_keCeRenLunShu: M2_keCeRen,
    /** M7 遵守率。⚠️ 分母 = 可判定轮 ∩ 开关打开的轮；无可判定轮时返回 null 而非 0（0 会被误读成「模型不服从」） */
    M7_fuCongLv: M7_kePanDing === 0 ? null : Number((M7_luShu / M7_kePanDing).toFixed(4)),
    M7_kePanDingLunShu: M7_kePanDing,
    /** ⚠️ 开关关闭轮数。>0 时 M7/M8 无意义，报告必须显式提示而不是给一个数 */
    kaiGuanWeiLunShu: panDuan.length - M8_youXiao.length,
    /** M8 逐字复制条数。⚠️ 只统计开关打开的轮 */
    M8_zhengZhiFuZhi: M8_youXiao.reduce((a, x) => a + x.M8_zhengZhiFuZhi, 0),
    /** ⚠️ 必须一并报告：M2 与真人基线依赖会话规模，缺它则不同轮次不可比 */
    lunShu: panDuan.length,
    M2_keCeRenLv: panDuan.length === 0 ? 0 : Number((M2_keCeRen / panDuan.length).toFixed(4)),
    kaiChangGeShu: new Set(panDuan.map((x) => x.kaiChang).filter((x) => x.length === 2)).size,
  }
}