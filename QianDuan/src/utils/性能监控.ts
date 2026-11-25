import { onLCP, onINP, onCLS, onFCP, onTTFB, type Metric } from 'web-vitals'
import { chuFaCuoWuShangBao } from './错误上报'

let yiChuShiHua = false

function shangBaoZhiBiao(zhiBiao: Metric | null | undefined): void {
  try {
    if (!zhiBiao || typeof zhiBiao !== 'object') return
    const ming = typeof zhiBiao.name === 'string' ? zhiBiao.name : null
    const zhi = typeof zhiBiao.value === 'number' && Number.isFinite(zhiBiao.value) ? zhiBiao.value : null
    if (!ming || zhi === null) return
    chuFaCuoWuShangBao({
      leiBie: 'weiZhi',
      cuoWu: {
        zhiBiaoMing: ming,
        zhi,
        pingFen: typeof zhiBiao.rating === 'string' ? zhiBiao.rating : 'unknown',
        id: typeof zhiBiao.id === 'string' ? zhiBiao.id : '',
        daoHangLeiXing:
          typeof zhiBiao.navigationType === 'string' ? zhiBiao.navigationType : 'unknown',
      },
      shiJianChuo: Date.now(),
      fuJia: { shangBaoLeiXing: 'xingNengZhiBiao' },
    })
  } catch {
    return
  }
}

function baoGuoHuiDiao(huiDiao: (zhiBiao: Metric) => void): (zhiBiao: Metric) => void {
  return (zhiBiao: Metric) => {
    try {
      huiDiao(zhiBiao)
    } catch {
      return
    }
  }
}

export function chuShiHuaXingNengJianKong(): void {
  if (typeof window === 'undefined') return
  if (yiChuShiHua) return
  yiChuShiHua = true

  try {
    const anQuan = baoGuoHuiDiao(shangBaoZhiBiao)
    onLCP(anQuan)
    onINP(anQuan)
    onCLS(anQuan)
    onFCP(anQuan)
    onTTFB(anQuan)
  } catch {
    return
  }
}

export function chongZhiXingNengJianKong(): void {
  yiChuShiHua = false
}
