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
