import { jieXiMengCengZhi, type WaiGuanYanSeZu } from '@/config/外观自定义'

export interface BianYuanCaiYangXuanXiang {
  kuaiKuan: number
  caiYangGao: number
}

const MO_REN_CAI_YANG: BianYuanCaiYangXuanXiang = { kuaiKuan: 0.1, caiYangGao: 64 }

export function jiSuanQuYuPingJun(shuZu: ArrayLike<number>): WaiGuanYanSeZu | null {
  const zongShu = shuZu.length
  if (zongShu < 4 || zongShu % 4 !== 0) return null
  let r = 0
  let g = 0
  let b = 0
  let jiShu = 0
  for (let i = 0; i + 3 < zongShu; i += 4) {
    r += shuZu[i]
    g += shuZu[i + 1]
    b += shuZu[i + 2]
    jiShu += 1
  }
  if (!jiShu) return null
  return { r: Math.round(r / jiShu), g: Math.round(g / jiShu), b: Math.round(b / jiShu) }
}

export function heChengWeiBaYanSe(pingJun: WaiGuanYanSeZu, mengCengZhi: string): string | null {
  const mengCeng = jieXiMengCengZhi(mengCengZhi)
  if (!mengCeng) return null
  const rongHe = (tuCeng: number, mengCengTongDao: number): number =>
    Math.round(mengCengTongDao * mengCeng.a + tuCeng * (1 - mengCeng.a))
  const zhuanHex = (zhi: number): string => zhi.toString(16).padStart(2, '0')
  return '#' + zhuanHex(rongHe(pingJun.r, mengCeng.r)) + zhuanHex(rongHe(pingJun.g, mengCeng.g)) + zhuanHex(rongHe(pingJun.b, mengCeng.b))
}

export function huoQuCaiYangXuanXiang(): BianYuanCaiYangXuanXiang {
  return { ...MO_REN_CAI_YANG }
}

export async function caiJiBianYuanYanSe(
  diZhi: string,
  ceBie: 'zuo' | 'you',
  mengCengZhi: string,
): Promise<string | null> {
  try {
    const xiangYing = await fetch(diZhi)
    if (!xiangYing.ok) return null
    const meiJie = await xiangYing.blob()
    const tu = await createImageBitmap(meiJie)
    try {
      const xuanXiang = huoQuCaiYangXuanXiang()
      const huaBu = document.createElement('canvas')
      huaBu.width = 1
      huaBu.height = xuanXiang.caiYangGao
      const shangXiaWen = huaBu.getContext('2d')
      if (!shangXiaWen) return null
      const kuaiKuan = Math.max(1, Math.floor(tu.width * xuanXiang.kuaiKuan))
      const yuanX = ceBie === 'you' ? tu.width - kuaiKuan : 0
      shangXiaWen.drawImage(tu, yuanX, 0, kuaiKuan, tu.height, 0, 0, 1, xuanXiang.caiYangGao)
      const shuJu = shangXiaWen.getImageData(0, 0, 1, xuanXiang.caiYangGao).data
      const pingJun = jiSuanQuYuPingJun(shuJu)
      if (!pingJun) return null
      return heChengWeiBaYanSe(pingJun, mengCengZhi)
    } finally {
      tu.close()
    }
  } catch {
    return null
  }
}
