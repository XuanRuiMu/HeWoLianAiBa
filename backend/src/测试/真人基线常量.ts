/**
 * 真人基线常量 —— 由 `.语料工作区/算真人基线.ts` 从 LCCC-base-valid 实测产出。
 *
 * 生成命令：
 *   node .语料工作区/算真人基线.ts .语料工作区/LCCC/lccc_base_valid.jsonl.gz
 *
 * 样本：20,000 段微博真实对话 / 56,917 条真人发言
 * 口径实现：`.语料工作区/语域口径.ts`（与 AI 实测共用）
 *
 * 三方独立验证一致（上一轮 PROGRESS 第五节 / 第三方采样 / 本次实测）：
 *   平均 11.85 · 中位 9 · ≤10字 58.6% · 语气词 0.262
 */
export const ZHEN_REN_JI_XIAN = {
  pingJunZiShu: 11.85,
  zhongWeiZiShu: 9,
  p10ZiShu: 4,
  p90ZiShu: 23,
  shiFenWei: 0.586,
  shiFengErShi: 0.872,
  pingJunZiShuChaiBiao: 10.83,
  danFenJuBiLi: 0.664,
  danFenJuWuBiaoBiLi: 0.507,
  weiMoBiaoBiLi: 0.279,
  jvHaoBiLi: 0.071,
  yuQiCiMiDu: 0.262,
  emojiMiDu: 0,
  pingJunTiaoShu: 2.85,
  juShuCV: 0.536,
  /** 口径待对齐：上一轮 PROGRESS 报 0.419，本次实测 1.064，差异来自是否计入单字消息 */
  juChangCV: 1.064,
  /**
   * 省略号三形态基线（第八轮新增）。
   *
   * 生成命令：`node .语料工作区/算真人省略号基线.mts`
   * 样本同上：20,000 段 / 56,917 条；口径为 `语域口径.fenLeiSheHao`（消息级）。
   * 合计 2.7268% 与 `算真人基线.ts` 的「含「…」」2.73% 独立吻合，可交叉验证。
   *
   * ⚠️ 与 AI 臂对照（B 臂，第八轮实测）：
   *   在中部 14.69% vs 1.0067% = **14.59×** ← 最严重的形态
   *   在首/尾 12.79% vs 1.7095% = 7.48×
   * 阶段 B 删字面只压住了「首/尾」（−5.86pp），「中部」纹丝不动（−0.03pp）。
   */
  sheHaoDuJie: 0.000105,
  sheHaoMoWei: 0.017095,
  sheHaoJuZhong: 0.010067,
  /** 中部形态占「含省略号」总量的比例：36.92%。真人口语里省略号并非只在句尾用。 */
  sheHaoZhongBuZhanBi: 0.3692,
} as const
