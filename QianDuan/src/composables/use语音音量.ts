export const YU_YIN_YIN_LIANG_PEI_ZHI = {
  fftChiCun: 512,
  pingHuaXiShu: 0.55,
  zuiDiZhanFenBei: -90,
  canKaoDiXianFenBei: -48,
  canKaoShangXianFenBei: 0,
  keShiFanWeiFenBei: 12,
  fengZhiShengShiChangHaoMiao: 40,
  fengZhiJiangShiChangHaoMiao: 1800,
  xianShiShengShiChangHaoMiao: 130,
  xianShiJiangShiChangHaoMiao: 150,
  zuiDaCaiYangJianGeHaoMiao: 120,
  zuiXiaoRiZhiJianGeHaoMiao: 1500,
  ziJieZhongXian: 128,
  ziJieQuanFu: 128,
  wuFaFenXiYuZhi: 1,
} as const

const FEN_BEI_MI_SHU = 20

export const YU_YIN_ZENG_YI_SHANG_XIAN = 4

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
let dangQianZengYiJieDian: GainNode | null = null
let qingQiuZengYiBeiShu = 1
let shiYuShuJu: Uint8Array<ArrayBuffer> | null = null
let danJingShuJu: Float32Array<ArrayBuffer> | null = null
let canKaoFenBei: number = YU_YIN_YIN_LIANG_PEI_ZHI.canKaoDiXianFenBei
let xianShiZhi = 0
let yiJianCe = false
let zuiJinCaiYangHaoMiao = 0
let zuiJinRiZhiHaoMiao = 0
let canKaoZaiDiXian = false
let canKaoZaiShangXian = false
let duQuTuJing = 0
let tiaoShiKaiGuan = false
let yiBaoGaoYiChang = false
const DU_QU_TU_JING = { wu: 0, danJing: 1, ziJie: 2 } as const

const fenXiQiBiao = new WeakMap<HTMLAudioElement, AnalyserNode>()
const zengYiBiao = new WeakMap<HTMLAudioElement, GainNode>()
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

function huoQuShiJianHaoMiao(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

export function sheZhiYuYinYinLiangTiaoShi(kaiQi: boolean): void {
  tiaoShiKaiGuan = Boolean(kaiQi)
}

export function shiYuYinYinLiangTiaoShiKaiQi(): boolean {
  return tiaoShiKaiGuan
}

function daYinYuYinTiaoShi(mingCheng: string, xiang: Record<string, number>): void {
  if (!tiaoShiKaiGuan) return
  if (typeof console === 'undefined' || typeof console.debug !== 'function') return
  const shiJian = huoQuShiJianHaoMiao()
  if (shiJian - zuiJinRiZhiHaoMiao < YU_YIN_YIN_LIANG_PEI_ZHI.zuiXiaoRiZhiJianGeHaoMiao) return
  zuiJinRiZhiHaoMiao = shiJian
  console.debug('[语音音量] ' + mingCheng, xiang)
}

function baoGaoYuYinYiChang(mingCheng: string, xiang: Record<string, number>): void {
  if (yiBaoGaoYiChang) return
  yiBaoGaoYiChang = true
  if (typeof console === 'undefined' || typeof console.warn !== 'function') return
  console.warn('[语音音量] ' + mingCheng, xiang)
}

function quRiZhiShu(zhi: number): number {
  return Math.round(zhi * 1000) / 1000
}

function chongZhiYinLiangZhuangTai(): void {
  canKaoFenBei = YU_YIN_YIN_LIANG_PEI_ZHI.canKaoDiXianFenBei
  xianShiZhi = 0
  yiJianCe = false
  zuiJinCaiYangHaoMiao = huoQuShiJianHaoMiao()
  zuiJinRiZhiHaoMiao = Number.NEGATIVE_INFINITY
  canKaoZaiDiXian = false
  canKaoZaiShangXian = false
  duQuTuJing = DU_QU_TU_JING.wu
  yiBaoGaoYiChang = false
}

function jiSuanXianShu(jianGeHaoMiao: number, shiChangHaoMiao: number): number {
  if (shiChangHaoMiao <= 0) return 1
  return 1 - Math.exp(-jianGeHaoMiao / shiChangHaoMiao)
}

function jiaZaiCanKaoFenBei(fenBei: number): number {
  return Math.min(
    YU_YIN_YIN_LIANG_PEI_ZHI.canKaoShangXianFenBei,
    Math.max(YU_YIN_YIN_LIANG_PEI_ZHI.canKaoDiXianFenBei, fenBei),
  )
}

function jiSuanZhanShiBiLi(fenBei: number, canKao: number): number {
  const biLi = 1 + (fenBei - canKao) / YU_YIN_YIN_LIANG_PEI_ZHI.keShiFanWeiFenBei
  return Math.min(1, Math.max(0, biLi))
}

function jiSuanDanJingJunFang(shuJu: Float32Array): number {
  let fangHe = 0
  for (let suoYin = 0; suoYin < shuJu.length; suoYin += 1) {
    const zhi = shuJu[suoYin]
    fangHe += zhi * zhi
  }
  return Math.sqrt(fangHe / shuJu.length)
}

function jiSuanZiJieJunFang(shuJu: Uint8Array): number {
  let fangHe = 0
  for (let suoYin = 0; suoYin < shuJu.length; suoYin += 1) {
    const pianYi =
      (shuJu[suoYin] - YU_YIN_YIN_LIANG_PEI_ZHI.ziJieZhongXian) /
      YU_YIN_YIN_LIANG_PEI_ZHI.ziJieQuanFu
    fangHe += pianYi * pianYi
  }
  return Math.sqrt(fangHe / shuJu.length)
}

function huoQuShiYuJunFang(fenXiQi: AnalyserNode): number | null {
  const danJing = danJingShuJu
  if (danJing && typeof fenXiQi.getFloatTimeDomainData === 'function') {
    try {
      fenXiQi.getFloatTimeDomainData(danJing)
      duQuTuJing = DU_QU_TU_JING.danJing
      return jiSuanDanJingJunFang(danJing)
    } catch {
      duQuTuJing = DU_QU_TU_JING.wu
      baoGaoYuYinYiChang('单精度时域读取失败', { tuJing: duQuTuJing })
      return null
    }
  }
  const ziJie = shiYuShuJu
  if (!ziJie) {
    duQuTuJing = DU_QU_TU_JING.wu
    baoGaoYuYinYiChang('没有可用的时域缓冲区', { tuJing: duQuTuJing })
    return null
  }
  if (typeof fenXiQi.getByteTimeDomainData !== 'function') {
    duQuTuJing = DU_QU_TU_JING.wu
    baoGaoYuYinYiChang('分析器不支持时域读取', { tuJing: duQuTuJing })
    return null
  }
  try {
    fenXiQi.getByteTimeDomainData(ziJie)
    duQuTuJing = DU_QU_TU_JING.ziJie
    return jiSuanZiJieJunFang(ziJie)
  } catch {
    duQuTuJing = DU_QU_TU_JING.wu
    baoGaoYuYinYiChang('字节时域读取失败', { tuJing: duQuTuJing })
    return null
  }
}

function lianJieFenXiQi(yinPin: HTMLAudioElement): void {
  if (dangQianFenXiQi || dangQianYinPin !== yinPin) return
  const yiYou = fenXiQiBiao.get(yinPin)
  if (yiYou) {
    dangQianFenXiQi = yiYou
    shiYuShuJu = new Uint8Array(yiYou.fftSize)
    danJingShuJu = new Float32Array(yiYou.fftSize)
    chongZhiYinLiangZhuangTai()
    const yiYouZengYi = zengYiBiao.get(yinPin)
    if (yiYouZengYi) {
      try {
        yiYouZengYi.gain.value = qingQiuZengYiBeiShu
      } catch {
        return
      }
      dangQianZengYiJieDian = yiYouZengYi
    }
    try {
      yinPin.volume = 1
    } catch {
      return
    }
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
        const zengYi = shangXiaWen.createGain()
        const fenXiQi = shangXiaWen.createAnalyser()
        fenXiQi.fftSize = YU_YIN_YIN_LIANG_PEI_ZHI.fftChiCun
        fenXiQi.smoothingTimeConstant = YU_YIN_YIN_LIANG_PEI_ZHI.pingHuaXiShu
        yuan.connect(fenXiQi)
        fenXiQi.connect(zengYi)
        zengYi.connect(shangXiaWen.destination)
        zengYi.gain.value = qingQiuZengYiBeiShu
        yinPin.volume = 1
        zengYiBiao.set(yinPin, zengYi)
        fenXiQiBiao.set(yinPin, fenXiQi)
        dangQianZengYiJieDian = zengYi
        dangQianFenXiQi = fenXiQi
        shiYuShuJu = new Uint8Array(fenXiQi.fftSize)
        danJingShuJu = new Float32Array(fenXiQi.fftSize)
        chongZhiYinLiangZhuangTai()
      } catch {
        dangQianZengYiJieDian = null
        dangQianFenXiQi = null
      }
    })
    .catch(() => {
      dangQianZengYiJieDian = null
      dangQianFenXiQi = null
    })
}

export function guanLianYuYinYinPin(yinPin: HTMLAudioElement): void {
  if (!yinPin) return
  if (dangQianYinPin === yinPin) return
  dangQianYinPin = yinPin
  dangQianFenXiQi = null
  dangQianZengYiJieDian = null
  shiYuShuJu = null
  danJingShuJu = null
  chongZhiYinLiangZhuangTai()
  if (jianTingBiao.has(yinPin)) return
  jianTingBiao.add(yinPin)
  yinPin.addEventListener('play', () => lianJieFenXiQi(yinPin))
}

export function jieChuYuYinYinPin(yinPin?: HTMLAudioElement): void {
  if (yinPin && dangQianYinPin && dangQianYinPin !== yinPin) return
  dangQianYinPin = null
  dangQianFenXiQi = null
  dangQianZengYiJieDian = null
  shiYuShuJu = null
  danJingShuJu = null
  chongZhiYinLiangZhuangTai()
}

export function shiYuYinYinLiangKeYong(): boolean {
  return dangQianFenXiQi !== null
}

export function shiYuYinZengYiKeYong(): boolean {
  return dangQianZengYiJieDian !== null
}

export function duQuYuYinZengYiQingQiu(): number {
  return qingQiuZengYiBeiShu
}

export function sheZhiYuYinZengYi(beiShu: number): void {
  const shu = Number(beiShu)
  const anQuan = Number.isFinite(shu)
    ? Math.min(YU_YIN_ZENG_YI_SHANG_XIAN, Math.max(0, shu))
    : 1
  qingQiuZengYiBeiShu = anQuan
  const jieDian = dangQianZengYiJieDian
  if (!jieDian) return
  try {
    jieDian.gain.value = anQuan
  } catch {
    return
  }
}

export function duQuYuYinYinLiang(): number {
  const buKeYong = YU_YIN_YIN_LIANG_PEI_ZHI.wuFaFenXiYuZhi
  const fenXiQi = dangQianFenXiQi
  const yinPin = dangQianYinPin
  if (!fenXiQi || !yinPin) return buKeYong
  if (yinPin.paused) return buKeYong
  const junFang = huoQuShiYuJunFang(fenXiQi)
  if (junFang === null) return buKeYong
  const xianZaiHaoMiao = huoQuShiJianHaoMiao()
  const jianGeHaoMiao = Math.min(
    YU_YIN_YIN_LIANG_PEI_ZHI.zuiDaCaiYangJianGeHaoMiao,
    Math.max(0, xianZaiHaoMiao - zuiJinCaiYangHaoMiao),
  )
  zuiJinCaiYangHaoMiao = xianZaiHaoMiao
  const fenBei = Math.max(
    YU_YIN_YIN_LIANG_PEI_ZHI.zuiDiZhanFenBei,
    FEN_BEI_MI_SHU * Math.log10(junFang),
  )
  if (!yiJianCe) {
    yiJianCe = true
    canKaoFenBei = jiaZaiCanKaoFenBei(fenBei)
    xianShiZhi = jiSuanZhanShiBiLi(fenBei, canKaoFenBei)
    daYinYuYinTiaoShi('首帧标定', {
      tuJing: duQuTuJing,
      zhanShiFenBei: quRiZhiShu(fenBei),
      canKaoFenBei: quRiZhiShu(canKaoFenBei),
      zhanShiBiLi: quRiZhiShu(xianShiZhi),
    })
    return xianShiZhi
  }
  const canKaoXiShu = jiSuanXianShu(
    jianGeHaoMiao,
    fenBei > canKaoFenBei
      ? YU_YIN_YIN_LIANG_PEI_ZHI.fengZhiShengShiChangHaoMiao
      : YU_YIN_YIN_LIANG_PEI_ZHI.fengZhiJiangShiChangHaoMiao,
  )
  canKaoFenBei = jiaZaiCanKaoFenBei(canKaoFenBei + (fenBei - canKaoFenBei) * canKaoXiShu)
  const zaiDiXian = canKaoFenBei <= YU_YIN_YIN_LIANG_PEI_ZHI.canKaoDiXianFenBei
  const zaiShangXian = canKaoFenBei >= YU_YIN_YIN_LIANG_PEI_ZHI.canKaoShangXianFenBei
  if ((zaiDiXian && !canKaoZaiDiXian) || (zaiShangXian && !canKaoZaiShangXian)) {
    daYinYuYinTiaoShi('参考线贴钳位', {
      zaiDiXian: zaiDiXian ? 1 : 0,
      zaiShangXian: zaiShangXian ? 1 : 0,
      zhanShiFenBei: quRiZhiShu(fenBei),
      canKaoFenBei: quRiZhiShu(canKaoFenBei),
    })
  }
  canKaoZaiDiXian = zaiDiXian
  canKaoZaiShangXian = zaiShangXian
  const muBiaoZhi = jiSuanZhanShiBiLi(fenBei, canKaoFenBei)
  const xianShiXiShu = jiSuanXianShu(
    jianGeHaoMiao,
    muBiaoZhi > xianShiZhi
      ? YU_YIN_YIN_LIANG_PEI_ZHI.xianShiShengShiChangHaoMiao
      : YU_YIN_YIN_LIANG_PEI_ZHI.xianShiJiangShiChangHaoMiao,
  )
  xianShiZhi = Math.min(1, Math.max(0, xianShiZhi + (muBiaoZhi - xianShiZhi) * xianShiXiShu))
  return xianShiZhi
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
