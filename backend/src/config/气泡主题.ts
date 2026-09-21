export const QI_PAO_YU_SHE_XUAN_XIANG = [
  'weiXinLv',
  'tianKongLan',
  'yingFen',
  'anYe',
  'ningMengHuang',
  'yunBai',
] as const

export type QiPaoYuShe = (typeof QI_PAO_YU_SHE_XUAN_XIANG)[number]

export const QI_PAO_ZI_JI_MO_REN: QiPaoYuShe = 'weiXinLv'
export const QI_PAO_AI_MO_REN: QiPaoYuShe = 'yunBai'

const QI_PAO_YU_SHE_JI_HE = new Set<string>(QI_PAO_YU_SHE_XUAN_XIANG)

export function shiHeFaQiPao(zhi: unknown): zhi is QiPaoYuShe {
  return typeof zhi === 'string' && QI_PAO_YU_SHE_JI_HE.has(zhi)
}

export function guiYiHuaQiPao(zhi: unknown, moRen: QiPaoYuShe): QiPaoYuShe {
  return shiHeFaQiPao(zhi) ? zhi : moRen
}
