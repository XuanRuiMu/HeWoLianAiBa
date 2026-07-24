import { onLCP, onINP, onCLS, onFCP, onTTFB, type Metric } from 'web-vitals'
import { chuFaCuoWuShangBao } from './错误上报'

let yiChuShiHua = false

function shangBaoZhiBiao(zhiBiao: Metric): void {
  chuFaCuoWuShangBao({
    leiBie: 'weiZhi',
    cuoWu: {
      zhiBiaoMing: zhiBiao.name,
      zhi: zhiBiao.value,
      pingFen: zhiBiao.rating,
      id: zhiBiao.id,
      daoHangLeiXing: zhiBiao.navigationType,
    },
    shiJianChuo: Date.now(),
    fuJia: { shangBaoLeiXing: 'xingNengZhiBiao' },
  })
}

export function chuShiHuaXingNengJianKong(): void {
  if (typeof window === 'undefined') return
  if (yiChuShiHua) return
  yiChuShiHua = true

  try {
    onLCP(shangBaoZhiBiao)
    onINP(shangBaoZhiBiao)
    onCLS(shangBaoZhiBiao)
    onFCP(shangBaoZhiBiao)
    onTTFB(shangBaoZhiBiao)
  } catch {
    // 静默：浏览器不支持时忽略
  }
}

export function chongZhiXingNengJianKong(): void {
  yiChuShiHua = false
}
