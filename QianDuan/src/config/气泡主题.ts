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

export interface QiPaoYuSheDingYi {
  beiJing: string
  wenBen: string
}

export const QiPaoYuSheBiao: Record<QiPaoYuShe, QiPaoYuSheDingYi> = {
  weiXinLv: { beiJing: '#95EC69', wenBen: '#000000' },
  tianKongLan: { beiJing: '#7FB8F0', wenBen: '#06263F' },
  yingFen: { beiJing: '#F4A9C4', wenBen: '#571C33' },
  anYe: { beiJing: '#3A3A3C', wenBen: '#F5F5F7' },
  ningMengHuang: { beiJing: '#F5DE6B', wenBen: '#4A3B00' },
  yunBai: { beiJing: '#FFFFFF', wenBen: '#000000' },
  douShaLv: { beiJing: '#7BA889', wenBen: '#0E2A1B' },
  wuQingLan: { beiJing: '#A9C7D8', wenBen: '#10222E' },
}

import { QiPaoMingChengWenAn } from './气泡主题文案'

export const QiPaoMingCheng: Record<QiPaoYuShe, string> = QiPaoMingChengWenAn

export function shiHeFaQiPao(zhi: unknown): zhi is QiPaoYuShe {
  return typeof zhi === 'string' && (QiPaoYuSheXuanXiang as readonly string[]).includes(zhi)
}

export function guiYiHuaQiPao(zhi: unknown, moRen: QiPaoYuShe): QiPaoYuShe {
  return shiHeFaQiPao(zhi) ? zhi : moRen
}

export function huoQuQiPaoDingYi(yuShe: QiPaoYuShe): QiPaoYuSheDingYi {
  return QiPaoYuSheBiao[yuShe]
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
