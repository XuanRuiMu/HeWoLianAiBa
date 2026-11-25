import { XiaoXiPeiZhi } from '../config/消息配置'

export function huoQuCheHuiChongBianShiXian(leiXing: string): number {
  if (leiXing === 'wenJian') return XiaoXiPeiZhi.wenJianCheHuiShiXian
  return XiaoXiPeiZhi.cheHuiShiXian
}

export function shiKeChongBianLeiXing(leiXing: string): boolean {
  return leiXing === 'wenben' || leiXing === 'tuPian'
}

export function shiKeChongBian(
  leiXing: string,
  faSongShiJianChuo: number | null | undefined,
  xiaoZhunShiKe: number | null | undefined,
  shiBenRen: boolean = true,
): boolean {
  if (!shiBenRen) return false
  if (!shiKeChongBianLeiXing(leiXing)) return false
  if (
    typeof faSongShiJianChuo !== 'number' ||
    !Number.isFinite(faSongShiJianChuo) ||
    faSongShiJianChuo <= 0
  ) {
    return false
  }
  if (
    typeof xiaoZhunShiKe !== 'number' ||
    !Number.isFinite(xiaoZhunShiKe) ||
    xiaoZhunShiKe < 0
  ) {
    return false
  }
  return xiaoZhunShiKe - faSongShiJianChuo <= huoQuCheHuiChongBianShiXian(leiXing)
}

export interface ShiJianXiaoZhunQi {
  duQu: () => number
  shouDao: (fuWuQiHaoMiao: number | null | undefined) => void
  tuiJin: (haoMiao: number) => void
}

export function chuangJianShiJianXiaoZhunQi(
  fuWuQiShiKeHaoMiao: number | null | undefined,
  benDiXingNengHaoMiao: number = typeof performance !== 'undefined' ? performance.now() : 0,
): ShiJianXiaoZhunQi {
  const youXiaoFuWuQi =
    typeof fuWuQiShiKeHaoMiao === 'number' && Number.isFinite(fuWuQiShiKeHaoMiao)
      ? fuWuQiShiKeHaoMiao
      : null
  let jiZhunXingNeng =
    typeof benDiXingNengHaoMiao === 'number' && Number.isFinite(benDiXingNengHaoMiao)
      ? Math.max(0, benDiXingNengHaoMiao)
      : 0
  let jiZhunFuWuQi = youXiaoFuWuQi ?? 0
  let yiJingTuiJin = 0
  let youXiao = youXiaoFuWuQi !== null
  let zuiDaYiDu = youXiaoFuWuQi ?? 0

  function duQu(): number {
    if (!youXiao) return Number.NaN
    const xingNeng = typeof performance !== 'undefined' ? performance.now() : 0
    const zengLiang = Math.max(0, xingNeng - jiZhunXingNeng)
    const zhi = jiZhunFuWuQi + yiJingTuiJin + zengLiang
    if (zhi > zuiDaYiDu) zuiDaYiDu = zhi
    return zuiDaYiDu
  }

  function shouDao(fuWuQiHaoMiao: number | null | undefined): void {
    if (typeof fuWuQiHaoMiao !== 'number' || !Number.isFinite(fuWuQiHaoMiao)) return
    jiZhunXingNeng = typeof performance !== 'undefined' ? performance.now() : 0
    jiZhunFuWuQi = fuWuQiHaoMiao
    yiJingTuiJin = 0
    youXiao = true
    if (fuWuQiHaoMiao > zuiDaYiDu) zuiDaYiDu = fuWuQiHaoMiao
  }

  function tuiJin(haoMiao: number): void {
    if (!youXiao) return
    if (typeof haoMiao !== 'number' || !Number.isFinite(haoMiao) || haoMiao < 0) return
    yiJingTuiJin += haoMiao
  }

  return { duQu, shouDao, tuiJin }
}
