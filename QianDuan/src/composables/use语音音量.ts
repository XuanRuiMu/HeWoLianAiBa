const YU_YIN_YIN_LIANG_PEI_ZHI = {
  fftChiCun: 512,
  pingHuaXiShu: 0.55,
  pingHuaBuChang: 0.26,
  fangDaBeiShu: 2.4,
} as const

export const YU_YIN_DUAN_YANG_SHI_PEI_ZHI = [
  { gaoZuiDi: 0.84, gaoZuiGao: 1, touZuiDi: 0.72, touZuiGao: 1 },
  { gaoZuiDi: 0.6, gaoZuiGao: 1, touZuiDi: 0.42, touZuiGao: 1 },
  { gaoZuiDi: 0.42, gaoZuiGao: 1, touZuiDi: 0.24, touZuiGao: 1 },
] as const

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

export function jiSuanYuYinDuanYangShi(biLi: number): { gao: number; tou: number }[] {
  const zhi = Math.min(1, Math.max(0, Number.isFinite(biLi) ? biLi : 0))
  return YU_YIN_DUAN_YANG_SHI_PEI_ZHI.map((xiang) => ({
    gao: xiang.gaoZuiDi + (xiang.gaoZuiGao - xiang.gaoZuiDi) * zhi,
    tou: xiang.touZuiDi + (xiang.touZuiGao - xiang.touZuiDi) * zhi,
  }))
}
