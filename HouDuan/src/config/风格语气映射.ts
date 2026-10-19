/**
 * FP-06：MBTI → 主语气池/次语气池 静态映射（16 型全部覆盖）。
 *
 * 枚举口径见 FP05 §2（8 类语气）；组号覆盖见 FP05 §3。
 * 设计约束（FP04 §2.3）：
 *   1. 任意两型主语气池不全重叠（本表 16 个主池两两互不相同）。
 *   2. 每型主池至少含 1 个语气类，且 8 类全部至少被一个型选为主池。
 *   3. 同一 mbti 恒得同一池 ⇒ 同角色跨轮前缀字节恒定（KV 缓存不破坏）。
 */
export interface YuQiChiShe {
  zhu: string[]
  ci: string[]
}

const A = '直球陈述与提问'
const B = '调侃互怼'
const C = '简短应和'
const D = '暖心关切'
const E = '吐槽抱怨'
const F = '自嘲自黑'
const G = '撒娇求关注'
const H = '捧场起哄'

export const MBTI_YU_QI_CHI: Record<string, YuQiChiShe> = {
  INTJ: { zhu: [A, E], ci: [B] },
  ISTJ: { zhu: [A, C], ci: [F] },
  INFJ: { zhu: [D, A], ci: [F] },
  INTP: { zhu: [A, F], ci: [C] },
  ISTP: { zhu: [C, E], ci: [A] },
  ISFJ: { zhu: [D, C], ci: [G] },
  ISFP: { zhu: [D, F], ci: [C] },
  INFP: { zhu: [F, E], ci: [D, C] },
  ESTP: { zhu: [B, F], ci: [H] },
  ESFP: { zhu: [G, H, B], ci: [C] },
  ENFP: { zhu: [B, G], ci: [H] },
  ENTP: { zhu: [B, E], ci: [A] },
  ENTJ: { zhu: [A, B], ci: [E] },
  ENFJ: { zhu: [D, G], ci: [C] },
  ESTJ: { zhu: [A, C, E], ci: [F] },
  ESFJ: { zhu: [D, H], ci: [C] },
}
