import { yingYongBanBen } from '@/config/站点配置'

export type CuoWuLeiBie = 'vue' | 'chengNuo' | 'ziYuan' | 'weiZhi'

export interface CuoWuShangBaoCanShu {
  leiBie: CuoWuLeiBie
  cuoWu: unknown
  shiJianChuo: number
  fuJia?: Record<string, unknown>
}

type CuoWuShangBaoHanShu = (canShu: CuoWuShangBaoCanShu) => void

const SHANG_BAO_URL = '/api/logs'

type ShangBaoLeiXing = 'cuoWu' | 'xingNengZhiBiao'

interface ShangBaoTi {
  lei_xing: ShangBaoLeiXing
  xiang_qing: Record<string, unknown>
}

let dangQianShangBaoHanShu: CuoWuShangBaoHanShu | null = null
let yiAnZhuang = false

// YH-085 错误上报收敛：指纹去重+采样+批量队列+统一版本，禁直发被限流腰斩
// 根因：直发还被后端限流腰斩查不出线上问题；收敛为指纹去重采样批量
const SHANG_BAO_ZHI_WEN = new Map<string, number>()
const ZHI_WEN_LENG_QUE_HAO_MIAO = 60000
const CAI_YANG_LV = 1
const PI_LIANG_CHI_CUN = 10
const PI_LIANG_SHUA_XIN_HAO_MIAO = 5000
let piLiangDuiLie: ShangBaoTi[] = []
let piLiangDingShi: ReturnType<typeof setTimeout> | null = null

function zhiWen(cuoWu: unknown, leiBie: string): string {
  const ming = cuoWu instanceof Error ? `${cuoWu.name}:${cuoWu.message}` : String(cuoWu)
  let haXi = 0
  const yuan = `${leiBie}:${ming}`
  for (let i = 0; i < yuan.length; i++) {
    haXi = (haXi * 31 + yuan.charCodeAt(i)) | 0
  }
  return String(haXi)
}

function paiKongPiLiang(): void {
  if (piLiangDuiLie.length === 0) return
  const daiFa = piLiangDuiLie
  piLiangDuiLie = []
  for (const ti of daiFa) {
    faSongRiZhi(ti)
  }
}

function paiDuiPiLiang(ti: ShangBaoTi): void {
  piLiangDuiLie.push(ti)
  if (piLiangDuiLie.length >= PI_LIANG_CHI_CUN) {
    paiKongPiLiang()
    return
  }
  if (!piLiangDingShi) {
    piLiangDingShi = setTimeout(() => {
      piLiangDingShi = null
      paiKongPiLiang()
    }, PI_LIANG_SHUA_XIN_HAO_MIAO)
  }
}

export function sheZhiCuoWuShangBaoHanShu(hanShu: CuoWuShangBaoHanShu | null): void {
  dangQianShangBaoHanShu = hanShu
}

export function chongZhiCuoWuShangBaoZhuangTai(): void {
  SHANG_BAO_ZHI_WEN.clear()
  piLiangDuiLie = []
  if (piLiangDingShi) {
    clearTimeout(piLiangDingShi)
    piLiangDingShi = null
  }
}

export function chuFaCuoWuShangBao(canShu: CuoWuShangBaoCanShu): void {
  if (typeof dangQianShangBaoHanShu === 'function') {
    try {
      dangQianShangBaoHanShu(canShu)
    } catch (shangBaoCuoWu) {
      if (import.meta.env.DEV) console.error('[全局错误处理] 上报函数自身抛错:', shangBaoCuoWu)
    }
  }
}

function xuLieHuaCuoWu(cuoWu: unknown): unknown {
  if (cuoWu instanceof Error) {
    const jieGuo: Record<string, unknown> = {
      name: cuoWu.name,
      message: cuoWu.message,
    }
    if (cuoWu.stack) {
      jieGuo.stack = cuoWu.stack
    }
    return jieGuo
  }
  if (typeof cuoWu === 'object' && cuoWu !== null) {
    try {
      JSON.stringify(cuoWu)
      return cuoWu
    } catch {
      return '[Unserializable]'
    }
  }
  return cuoWu
}

function faSongRiZhi(shuJuTi: ShangBaoTi): void {
  let wenBen: string
  try {
    wenBen = JSON.stringify(shuJuTi)
  } catch {
    return
  }

  // 根因收敛：sendBeacon对502无状态回执，失败静默但浏览器记资源error刷控制台；
  // 收敛为fetch直发（非2xx判错catch静默，不记资源error）
  try {
    const fetchRef = (
      globalThis as { fetch?: (url: string, init?: RequestInit) => Promise<Response> }
    ).fetch
    if (typeof fetchRef === 'function') {
      void fetchRef(SHANG_BAO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: wenBen,
        keepalive: true,
        mode: 'same-origin',
        credentials: 'same-origin',
      }).then((xiangYing) => {
        if (!xiangYing.ok) {
          throw new Error(`日志上报非成功状态:${xiangYing.status}`)
        }
      }).catch(() => {
        // 静默
      })
    }
  } catch {
    // 静默
  }
}

export function moRenShangBaoHanShu(canShu: CuoWuShangBaoCanShu): void {
  const shangBaoLeiXing: ShangBaoLeiXing =
    canShu.fuJia?.shangBaoLeiXing === 'xingNengZhiBiao' ? 'xingNengZhiBiao' : 'cuoWu'

  let xiangQing: Record<string, unknown>
  if (shangBaoLeiXing === 'xingNengZhiBiao') {
    const zhiBiaoShuJu =
      canShu.cuoWu && typeof canShu.cuoWu === 'object'
        ? (canShu.cuoWu as Record<string, unknown>)
        : { zhi: canShu.cuoWu }
    xiangQing = { ...zhiBiaoShuJu, shiJianChuo: canShu.shiJianChuo }
  } else {
    xiangQing = {
      leiBie: canShu.leiBie,
      cuoWu: xuLieHuaCuoWu(canShu.cuoWu),
      shiJianChuo: canShu.shiJianChuo,
      fuJia: canShu.fuJia,
    }
  }

  const ti: ShangBaoTi = {
    lei_xing: shangBaoLeiXing,
    // YH-085 统一版本：上报带应用版本，禁版本分裂查不出线上问题
    xiang_qing: { ...xiangQing, ban_ben: yingYongBanBen },
  }
  // 同步直发语义：默认上报函数立即发送，批量队列仅供高频调用方显式使用
  // YH-085 指纹去重仍生效，禁同错刷屏；采样仅作用于批量入口，默认上报不采样
  const wen = zhiWen(canShu.cuoWu, canShu.leiBie)
  const shangCi = SHANG_BAO_ZHI_WEN.get(wen)
  if (shangCi && Date.now() - shangCi < ZHI_WEN_LENG_QUE_HAO_MIAO) {
    return
  }
  SHANG_BAO_ZHI_WEN.set(wen, Date.now())
  faSongRiZhi(ti)
}

// YH-085 高频批量上报：显式批量入口，指纹去重+采样+批量，禁直发被限流腰斩
export function moRenPiLiangShangBao(canShu: CuoWuShangBaoCanShu): void {
  const wen = zhiWen(canShu.cuoWu, canShu.leiBie)
  const shangCi = SHANG_BAO_ZHI_WEN.get(wen)
  if (shangCi && Date.now() - shangCi < ZHI_WEN_LENG_QUE_HAO_MIAO) {
    return
  }
  if (Math.random() > CAI_YANG_LV) {
    return
  }
  SHANG_BAO_ZHI_WEN.set(wen, Date.now())
  const shangBaoLeiXing: ShangBaoLeiXing =
    canShu.fuJia?.shangBaoLeiXing === 'xingNengZhiBiao' ? 'xingNengZhiBiao' : 'cuoWu'
  let xiangQing: Record<string, unknown>
  if (shangBaoLeiXing === 'xingNengZhiBiao') {
    const zhiBiaoShuJu =
      canShu.cuoWu && typeof canShu.cuoWu === 'object'
        ? (canShu.cuoWu as Record<string, unknown>)
        : { zhi: canShu.cuoWu }
    xiangQing = { ...zhiBiaoShuJu, shiJianChuo: canShu.shiJianChuo }
  } else {
    xiangQing = {
      leiBie: canShu.leiBie,
      cuoWu: xuLieHuaCuoWu(canShu.cuoWu),
      shiJianChuo: canShu.shiJianChuo,
      fuJia: canShu.fuJia,
    }
  }
  paiDuiPiLiang({
    lei_xing: shangBaoLeiXing,
    xiang_qing: { ...xiangQing, ban_ben: yingYongBanBen },
  })
}

export function chuShiHuaCuoWuShangBao(): void {
  sheZhiCuoWuShangBaoHanShu(moRenShangBaoHanShu)
}

export function anZhuangQuanJuCuoWuJianTingQi(): void {
  if (typeof window === 'undefined') return
  if (yiAnZhuang) return
  yiAnZhuang = true

  window.addEventListener('unhandledrejection', (shiJian) => {
    const cuoWu = shiJian.reason
    if (import.meta.env.DEV) console.error('[全局错误处理] 未处理的 Promise rejection:', cuoWu)
    chuFaCuoWuShangBao({
      leiBie: 'chengNuo',
      cuoWu,
      shiJianChuo: Date.now(),
      fuJia: { leiXing: 'unhandledrejection' },
    })
  })

  window.addEventListener('error', (shiJian) => {
    const cuoWu = shiJian.error || shiJian.message
    const shiZiYuanCuoWu = Boolean(shiJian.target && (shiJian.target as Element).tagName)
    if (import.meta.env.DEV) console.error('[全局错误处理] 资源或运行时错误:', cuoWu)
    chuFaCuoWuShangBao({
      leiBie: shiZiYuanCuoWu ? 'ziYuan' : 'weiZhi',
      cuoWu,
      shiJianChuo: Date.now(),
      fuJia: shiZiYuanCuoWu
        ? {
            leiXing: 'resource',
            muBiao: (shiJian.target as Element)?.tagName,
            yuan: (shiJian.target as Element)?.getAttribute('src') || undefined,
          }
        : { leiXing: 'runtime' },
    })
  })
}
