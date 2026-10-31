import type { QiPaoYuShe } from './气泡主题'
import { huoQuFanYi } from './翻译表'

export const QI_PAO_WEN_AN = {
  biaoTi: huoQuFanYi('qiPao', 'biaoTi'),
  ziJiBiaoTi: huoQuFanYi('qiPao', 'ziJiBiaoTi'),
  aiBiaoTi: huoQuFanYi('qiPao', 'aiBiaoTi'),
  yuLanLai: huoQuFanYi('sheZhi', 'yuLanQiPaoLai'),
  yuLanQu: huoQuFanYi('sheZhi', 'yuLanQiPaoQu'),
  dangQian: huoQuFanYi('qiPao', 'dangQian'),
} as const

export const QI_PAO_MING_CHENG_WEN_AN: Record<QiPaoYuShe, string> = {
  weiXinLv: huoQuFanYi('qiPao', 'weiXinLv'),
  tianKongLan: huoQuFanYi('qiPao', 'tianKongLan'),
  yingFen: huoQuFanYi('qiPao', 'yingFen'),
  anYe: huoQuFanYi('qiPao', 'anYe'),
  ningMengHuang: huoQuFanYi('qiPao', 'ningMengHuang'),
  yunBai: huoQuFanYi('qiPao', 'yunBai'),
  douShaLv: huoQuFanYi('qiPao', 'douShaLv'),
  wuQingLan: huoQuFanYi('qiPao', 'wuQingLan'),
}

export function huoQuQiPaoMingCheng(yuShe: QiPaoYuShe): string {
  return huoQuFanYi('qiPao', yuShe)
}
