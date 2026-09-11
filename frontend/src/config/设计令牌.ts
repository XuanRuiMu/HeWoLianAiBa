// 设计令牌 - 缓动曲线
export const quXian = {
  biaoZhun: 'cubic-bezier(0.4, 0, 0.2, 1)',
  tanChu: 'cubic-bezier(0.16, 1, 0.3, 1)',
  ruan: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  huanYing: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const

export type QuXianLeiXing = keyof typeof quXian
