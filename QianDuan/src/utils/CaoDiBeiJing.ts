import { caoDiPeiZhi, yingYongBanBen } from '@/config/站点配置'

export interface CaoDiDiZhiCanShu {
  banBen?: string
  fenXiQiYong?: boolean
  xiangSuBiFengDing?: number
  caiYangJianGeMiao?: number
  zhenJianGeHaoMiao?: number
  chongShiShangXian?: number
  fuZhenSanWeiLunXunJianGeHaoMiao?: number
  fuZhenSanWeiChaoShiHaoMiao?: number
}

export function gouJianCaoDiDiZhi(canShu?: CaoDiDiZhiCanShu): string {
  const banBen = canShu?.banBen ?? yingYongBanBen
  const fenXi = (canShu?.fenXiQiYong ?? caoDiPeiZhi.fenXiQiYong) ? '1' : '0'
  const xiangSuBi = String(canShu?.xiangSuBiFengDing ?? caoDiPeiZhi.xiangSuBiFengDing)
  const caiYang = String(canShu?.caiYangJianGeMiao ?? caoDiPeiZhi.fenXiCaiYangZuiXiaoJianGeMiao)
  const zhenJianGe = String(canShu?.zhenJianGeHaoMiao ?? caoDiPeiZhi.zuiXiaoZhenJianGeHaoMiao)
  const chongShi = String(canShu?.chongShiShangXian ?? caoDiPeiZhi.tieTuZuiDaChongShiCiShu)
  const lunXun = String(
    canShu?.fuZhenSanWeiLunXunJianGeHaoMiao ?? caoDiPeiZhi.fuZhenSanWeiLunXunJianGeHaoMiao,
  )
  const fuZhenChaoShi = String(
    canShu?.fuZhenSanWeiChaoShiHaoMiao ?? caoDiPeiZhi.fuZhenSanWeiChaoShiHaoMiao,
  )
  const suoFang = encodeURIComponent(banBen)
  const biLi = encodeURIComponent(xiangSuBi)
  return `/grass-bg/grass-bg.html?v=${suoFang}&fenXi=${fenXi}&xiangSuBi=${biLi}&caiYangMiao=${encodeURIComponent(caiYang)}&zhenJianGe=${encodeURIComponent(zhenJianGe)}&chongShi=${encodeURIComponent(chongShi)}&fuZhenLunXun=${encodeURIComponent(lunXun)}&fuZhenChaoShi=${encodeURIComponent(fuZhenChaoShi)}`
}

export function yingPingBiFenXiQingQiu(
  qingQiuDiZhi: unknown,
  pingBiLieBiao?: readonly string[],
  qiYong?: boolean,
): boolean {
  if (qiYong ?? caoDiPeiZhi.fenXiQiYong) return false
  const lieBiao = pingBiLieBiao ?? caoDiPeiZhi.pingBiYuMing
  let wenBen: string
  try {
    if (typeof qingQiuDiZhi === 'string') wenBen = qingQiuDiZhi
    else if (qingQiuDiZhi instanceof Request) wenBen = qingQiuDiZhi.url
    else if (qingQiuDiZhi && typeof qingQiuDiZhi === 'object' && 'url' in qingQiuDiZhi)
      wenBen = String((qingQiuDiZhi as { url: unknown }).url)
    else wenBen = String(qingQiuDiZhi)
  } catch {
    return false
  }
  for (const yuMing of lieBiao) {
    if (yuMing && wenBen.includes(yuMing)) return true
  }
  return false
}

export function caiYangTongGuo(
  shangCiChengGongShiJianChuo: number,
  dangQianShiJianChuo: number,
  zuiXiaoJianGeMiao?: number,
): boolean {
  const jianGe = zuiXiaoJianGeMiao ?? caoDiPeiZhi.fenXiCaiYangZuiXiaoJianGeMiao
  if (!Number.isFinite(shangCiChengGongShiJianChuo) || shangCiChengGongShiJianChuo <= 0) return true
  if (!Number.isFinite(dangQianShiJianChuo)) return false
  return dangQianShiJianChuo - shangCiChengGongShiJianChuo >= jianGe * 1000
}

export function yingTiaoZhenXuanRan(
  shangCiZhenShiJianChuo: number,
  dangQianShiJianChuo: number,
  zuiXiaoJianGeHaoMiao?: number,
): boolean {
  const jianGe = zuiXiaoJianGeHaoMiao ?? caoDiPeiZhi.zuiXiaoZhenJianGeHaoMiao
  if (!Number.isFinite(shangCiZhenShiJianChuo) || shangCiZhenShiJianChuo <= 0) return true
  if (!Number.isFinite(dangQianShiJianChuo)) return false
  return dangQianShiJianChuo - shangCiZhenShiJianChuo >= jianGe
}
