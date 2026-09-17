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

export interface QiPaoYuSheDingYi {
  beiJing: string
  wenBen: string
}

export const QI_PAO_YU_SHE_BIAO: Record<QiPaoYuShe, QiPaoYuSheDingYi> = {
  weiXinLv: { beiJing: '#95EC69', wenBen: '#000000' },
  tianKongLan: { beiJing: '#7FB8F0', wenBen: '#06263F' },
  yingFen: { beiJing: '#F4A9C4', wenBen: '#571C33' },
  anYe: { beiJing: '#3A3A3C', wenBen: '#F5F5F7' },
  ningMengHuang: { beiJing: '#F5DE6B', wenBen: '#4A3B00' },
  yunBai: { beiJing: '#FFFFFF', wenBen: '#000000' },
}

import { QI_PAO_MING_CHENG_WEN_AN } from './气泡主题文案'

export const QI_PAO_MING_CHENG: Record<QiPaoYuShe, string> = QI_PAO_MING_CHENG_WEN_AN

export function shiHeFaQiPao(zhi: unknown): zhi is QiPaoYuShe {
  return typeof zhi === 'string' && (QI_PAO_YU_SHE_XUAN_XIANG as readonly string[]).includes(zhi)
}

export function guiYiHuaQiPao(zhi: unknown, moRen: QiPaoYuShe): QiPaoYuShe {
  return shiHeFaQiPao(zhi) ? zhi : moRen
}

export function huoQuQiPaoDingYi(yuShe: QiPaoYuShe): QiPaoYuSheDingYi {
  return QI_PAO_YU_SHE_BIAO[yuShe]
}

export function huoQuQiPaoCSSBianLiang(ziJi: QiPaoYuShe, duiFang: QiPaoYuShe): Record<string, string> {
  const ziJiDingYi = huoQuQiPaoDingYi(ziJi)
  const duiFangDingYi = huoQuQiPaoDingYi(duiFang)
  return {
    '--qipao-ziJi-beiJing': ziJiDingYi.beiJing,
    '--qipao-ziJi-wenBen': ziJiDingYi.wenBen,
    '--qipao-duiFang-beiJing': duiFangDingYi.beiJing,
    '--qipao-duiFang-wenBen': duiFangDingYi.wenBen,
  }
}
