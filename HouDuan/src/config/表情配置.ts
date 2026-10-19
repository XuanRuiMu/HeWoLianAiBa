import { BIAO_QING_SHU_LEI_BIE } from './媒体配置'

function huoQuZhengShu(ming: string, moRen: number): number {
  const yuanZhi = process.env[ming]
  if (yuanZhi === undefined || yuanZhi.trim() === '') return moRen
  const zhi = Number.parseInt(yuanZhi, 10)
  return Number.isFinite(zhi) && zhi > 0 ? zhi : moRen
}

/** 023 迁移里 "用户表情"."短名" 的列宽；配置值不得超过它，否则落库直接 22001 */
const DUAN_MING_LIE_KUAN = 30

export const BIAO_QING_PEI_ZHI = {
  // 与列宽同宽（由 表情真库.test.ts 断言钉住）：环境变量只能收紧，不能突破列宽
  duanMingZuiDaChangDu: Math.min(huoQuZhengShu('BIAO_QING_DUAN_MING_ZUI_CHANG', DUAN_MING_LIE_KUAN), DUAN_MING_LIE_KUAN),
  meiYongHuZuiDaTiaoShu: huoQuZhengShu('BIAO_QING_MEI_YONGHU_SHANG_XIAN', 200),
} as const

/** 用户表情登记时引用的媒体类别；引用常量，禁止在路由里出现字面量 */
export const BIAO_QING_MEI_TI_LEI_BIE = BIAO_QING_SHU_LEI_BIE
