export const DanFaZhaMenQianZhui = 'zhui_jia_yi_fa:'

export const DanFaZhaMenYouXiaoMiao = 7 * 24 * 60 * 60

export function shengChengDanFaZhaMenJian(yongHuId: string, jiaoSeId: string): string {
  return `${DanFaZhaMenQianZhui}${yongHuId}:${jiaoSeId}`
}
