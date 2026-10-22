// 设计令牌 - 缓动曲线
export const quXian = {
  biaoZhun: 'cubic-bezier(0.4, 0, 0.2, 1)',
  tanChu: 'cubic-bezier(0.16, 1, 0.3, 1)',
  ruan: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  huanYing: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const

export type QuXianLeiXing = keyof typeof quXian

export const ZHAN_JI_LUO_WEI = {
  shiChangHaoMiao: 320,
  tuoZhuaiHaoMiao: 320,
} as const


export const 主页入场 = {
  首元素延迟: 900,
  元素间隔: 300,
  文字延迟: 200,
  元素总数: 4,
} as const
