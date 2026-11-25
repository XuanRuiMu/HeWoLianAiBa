export const QiPaoYuSheXuanXiang = [
  'weiXinLv',
  'tianKongLan',
  'yingFen',
  'anYe',
  'ningMengHuang',
  'yunBai',
  'douShaLv',
  'wuQingLan',
] as const

export type QiPaoYuShe = (typeof QiPaoYuSheXuanXiang)[number]

export const QiPaoZiJiMoRen: QiPaoYuShe = 'weiXinLv'
export const QiPaoAiMoRen: QiPaoYuShe = 'yunBai'

const QiPaoYuSheJiHe = new Set<string>(QiPaoYuSheXuanXiang)

export function shiHeFaQiPao(zhi: unknown): zhi is QiPaoYuShe {
  return typeof zhi === 'string' && QiPaoYuSheJiHe.has(zhi)
}

export function guiYiHuaQiPao(zhi: unknown, moRen: QiPaoYuShe): QiPaoYuShe {
  return shiHeFaQiPao(zhi) ? zhi : moRen
}
