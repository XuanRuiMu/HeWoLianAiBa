const YU_YIN_YIN_LIANG_PEI_ZHI = {
  fftChiCun: 512,
  pingHuaXiShu: 0.55,
  pingHuaBuChang: 0.26,
  fangDaBeiShu: 2.4,
} as const

export type YuYinKeJianDuanShu = 1 | 2 | 3

export const YU_YIN_KE_JIAN_DUAN_SHU_PEI_ZHI = {
  shengRuZhongYin: 0.34,
  shengRuGaoYin: 0.66,
  jiangHuiDiYin: 0.24,
  jiangHuiZhongYin: 0.54,
} as const

let yinPinShangXiaWen: AudioContext | null = null
let dangQianYinPin: HTMLAudioElement | null = null
let dangQianFenXiQi: AnalyserNode | null = null
let shiYuShuJu: Uint8Array<ArrayBuffer> | null = null
let pingHuaZhi = 0

const fenXiQiBiao = new WeakMap<HTMLAudioElement, AnalyserNode>()
const jianTingBiao = new WeakSet<HTMLAudioElement>()

function quDeShangXiaWen(): AudioContext | null {
  if (yinPinShangXiaWen) return yinPinShangXiaWen
  if (typeof window === 'undefined') return null
  const GouZao = window.AudioContext
  if (typeof GouZao !== 'function') return null
  try {
    yinPinShangXiaWen = new GouZao()
    return yinPinShangXiaWen
  } catch {
    yinPinShangXiaWen = null
    return null
  }
}

function shiTongYuanDiZhi(yinPin: HTMLAudioElement): boolean {
  let diZhi: string
  try {
    diZhi = yinPin.currentSrc || yinPin.src
  } catch {
    return false
  }
  if (!diZhi) return false
  if (typeof window === 'undefined' || typeof URL === 'undefined') return false
  try {
    const jieXi = new URL(diZhi, window.location.href)
    if (jieXi.protocol === 'blob:') return true
    return jieXi.origin === window.location.origin
  } catch {
    return false
  }
}

function lianJieFenXiQi(yinPin: HTMLAudioElement): void {
  if (dangQianFenXiQi || dangQianYinPin !== yinPin) return
  const yiYou = fenXiQiBiao.get(yinPin)
  if (yiYou) {
    dangQianFenXiQi = yiYou
    shiYuShuJu = new Uint8Array(yiYou.fftSize)
    return
  }
  if (!shiTongYuanDiZhi(yinPin)) return
  const shangXiaWen = quDeShangXiaWen()
  if (!shangXiaWen) return
  void shangXiaWen
    .resume()
    .then(() => {
      if (shangXiaWen.state !== 'running') return
      if (dangQianYinPin !== yinPin || dangQianFenXiQi) return
      try {
        const yuan = shangXiaWen.createMediaElementSource(yinPin)
        const fenXiQi = shangXiaWen.createAnalyser()
        fenXiQi.fftSize = YU_YIN_YIN_LIANG_PEI_ZHI.fftChiCun
        fenXiQi.smoothingTimeConstant = YU_YIN_YIN_LIANG_PEI_ZHI.pingHuaXiShu
        yuan.connect(fenXiQi)
        fenXiQi.connect(shangXiaWen.destination)
        fenXiQiBiao.set(yinPin, fenXiQi)
        dangQianFenXiQi = fenXiQi
        shiYuShuJu = new Uint8Array(fenXiQi.fftSize)
        pingHuaZhi = 0
      } catch {
        dangQianFenXiQi = null
      }
    })
    .catch(() => {
      dangQianFenXiQi = null
    })
}

export function guanLianYuYinYinPin(yinPin: HTMLAudioElement): void {
  if (!yinPin) return
  if (dangQianYinPin === yinPin) return
  dangQianYinPin = yinPin
  dangQianFenXiQi = null
  shiYuShuJu = null
  pingHuaZhi = 0
  if (jianTingBiao.has(yinPin)) return
  jianTingBiao.add(yinPin)
  yinPin.addEventListener('play', () => lianJieFenXiQi(yinPin))
}

export function jieChuYuYinYinPin(yinPin?: HTMLAudioElement): void {
  if (yinPin && dangQianYinPin && dangQianYinPin !== yinPin) return
  dangQianYinPin = null
  dangQianFenXiQi = null
  shiYuShuJu = null
  pingHuaZhi = 0
}

export function shiYuYinYinLiangKeYong(): boolean {
  return dangQianFenXiQi !== null
}

export function duQuYuYinYinLiang(): number {
  const fenXiQi = dangQianFenXiQi
  const yinPin = dangQianYinPin
  if (!fenXiQi || !yinPin || !shiYuShuJu) return 1
  try {
    if (yinPin.paused) return 1
    fenXiQi.getByteTimeDomainData(shiYuShuJu)
  } catch {
    return 1
  }
  let fangHe = 0
  for (let suoYin = 0; suoYin < shiYuShuJu.length; suoYin += 1) {
    const pianYi = (shiYuShuJu[suoYin] - 128) / 128
    fangHe += pianYi * pianYi
  }
  const junFangGen = Math.sqrt(fangHe / shiYuShuJu.length)
  pingHuaZhi += (junFangGen - pingHuaZhi) * YU_YIN_YIN_LIANG_PEI_ZHI.pingHuaBuChang
  return Math.min(1, Math.max(0, pingHuaZhi * YU_YIN_YIN_LIANG_PEI_ZHI.fangDaBeiShu))
}

function guiYiKeJianDuanShu(zhi: number): YuYinKeJianDuanShu {
  if (zhi === 1) return 1
  if (zhi === 2) return 2
  return 3
}

export function jiSuanYuYinKeJianDuanShu(
  biLi: number,
  shangCiDuanShu: number = 3,
): YuYinKeJianDuanShu {
  if (!Number.isFinite(biLi)) return 3
  const zhi = Math.min(1, Math.max(0, biLi))
  const shangCi = guiYiKeJianDuanShu(shangCiDuanShu)
  if (shangCi === 1) {
    if (zhi >= YU_YIN_KE_JIAN_DUAN_SHU_PEI_ZHI.shengRuGaoYin) return 3
    if (zhi >= YU_YIN_KE_JIAN_DUAN_SHU_PEI_ZHI.shengRuZhongYin) return 2
    return 1
  }
  if (shangCi === 2) {
    if (zhi >= YU_YIN_KE_JIAN_DUAN_SHU_PEI_ZHI.shengRuGaoYin) return 3
    if (zhi < YU_YIN_KE_JIAN_DUAN_SHU_PEI_ZHI.jiangHuiDiYin) return 1
    return 2
  }
  if (zhi < YU_YIN_KE_JIAN_DUAN_SHU_PEI_ZHI.jiangHuiDiYin) return 1
  if (zhi < YU_YIN_KE_JIAN_DUAN_SHU_PEI_ZHI.jiangHuiZhongYin) return 2
  return 3
}
