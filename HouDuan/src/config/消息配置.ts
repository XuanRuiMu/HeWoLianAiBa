export const XiaoXiPeiZhi = {
  cheHuiShiXian: 2 * 60 * 1000,
  zuiDaXiaoXiChangDu: 500,
  heBingShiJianYuZhi: 60 * 1000,
  lianFaMianDaRaoTiaoShu: 20,
  lianFaYuJingTiaoShu: 12,
  neiRongKuaiZuiDaKuaiShu: 20,
  neiRongKuaiZuiDaTuPianShu: 9,
}

export const YunYingZiDuanXiaoXiLeiXing: readonly string[] = ['neiXinHuoDong']

export function shiYunYingZiDuanXiaoXiLeiXing(zhi: unknown): boolean {
  return typeof zhi === 'string' && YunYingZiDuanXiaoXiLeiXing.includes(zhi)
}
