import { BiaoQingShuLeiBie } from './媒体配置'

function huoQuZhengShu(ming: string, moRen: number): number {
  const yuanZhi = process.env[ming]
  if (yuanZhi === undefined || yuanZhi.trim() === '') return moRen
  const zhi = Number.parseInt(yuanZhi, 10)
  return Number.isFinite(zhi) && zhi > 0 ? zhi : moRen
}

const DuanMingLieKuan = 30

export const BiaoQingPeiZhi = {
  duanMingZuiDaChangDu: Math.min(huoQuZhengShu('BIAO_QING_DUAN_MING_ZUI_CHANG', DuanMingLieKuan), DuanMingLieKuan),
  meiYongHuZuiDaTiaoShu: huoQuZhengShu('BIAO_QING_MEI_YONGHU_SHANG_XIAN', 200),
} as const

export const BiaoQingMeiTiLeiBie = BiaoQingShuLeiBie
