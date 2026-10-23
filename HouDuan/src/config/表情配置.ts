import { BIAO_QING_SHU_LEI_BIE } from './媒体配置'

function huoQuZhengShu(ming: string, moRen: number): number {
  const yuanZhi = process.env[ming]
  if (yuanZhi === undefined || yuanZhi.trim() === '') return moRen
  const zhi = Number.parseInt(yuanZhi, 10)
  return Number.isFinite(zhi) && zhi > 0 ? zhi : moRen
}

const DUAN_MING_LIE_KUAN = 30

export const BIAO_QING_PEI_ZHI = {
  duanMingZuiDaChangDu: Math.min(huoQuZhengShu('BIAO_QING_DUAN_MING_ZUI_CHANG', DUAN_MING_LIE_KUAN), DUAN_MING_LIE_KUAN),
  meiYongHuZuiDaTiaoShu: huoQuZhengShu('BIAO_QING_MEI_YONGHU_SHANG_XIAN', 200),
} as const

export const BIAO_QING_MEI_TI_LEI_BIE = BIAO_QING_SHU_LEI_BIE
