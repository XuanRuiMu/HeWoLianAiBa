export const XIAO_XI_PEI_ZHI = {
  cheHuiShiXian: 2 * 60 * 1000,
  zuiDaXiaoXiChangDu: 500,
  heBingShiJianYuZhi: 60 * 1000,
  lianFaMianDaRaoTiaoShu: 20,
  lianFaYuJingTiaoShu: 12,
  neiRongKuaiZuiDaKuaiShu: 20,
  neiRongKuaiZuiDaTuPianShu: 9,
}

export const YUN_YING_ZI_DUAN_XIAO_XI_LEI_XING: readonly string[] = ['neiXinHuoDong']

export function shiYunYingZiDuanXiaoXiLeiXing(zhi: unknown): boolean {
  return typeof zhi === 'string' && YUN_YING_ZI_DUAN_XIAO_XI_LEI_XING.includes(zhi)
}
