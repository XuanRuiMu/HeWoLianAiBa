import type { QiPaoYuShe } from './气泡主题'

export const QI_PAO_WEN_AN = {
  biaoTi: '气泡主题',
  ziJiBiaoTi: '我的气泡',
  aiBiaoTi: 'AI气泡',
  yuLanLai: '在吗，周末去植物园走走吗',
  yuLanQu: '好啊，带上新长出来的叶子',
  dangQian: '当前',
} as const

export const QI_PAO_MING_CHENG_WEN_AN: Record<QiPaoYuShe, string> = {
  weiXinLv: '微信绿',
  tianKongLan: '天空蓝',
  yingFen: '樱粉',
  anYe: '暗夜',
  ningMengHuang: '柠檬黄',
  yunBai: '云白',
}

export function huoQuQiPaoMingCheng(yuShe: QiPaoYuShe): string {
  return QI_PAO_MING_CHENG_WEN_AN[yuShe]
}
