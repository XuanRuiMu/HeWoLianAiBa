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

  try {
    const yuanShiFetch = (
      globalThis as { fetch?: (url: string, init?: RequestInit) => Promise<Response> }
    ).fetch
    if (typeof yuanShiFetch === 'function') {
      void yuanShiFetch(SHANG_BAO_URL, {
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
    xiang_qing: { ...xiangQing, ban_ben: yingYongBanBen },
  }
  const wen = zhiWen(canShu.cuoWu, canShu.leiBie)
  const shangCi = SHANG_BAO_ZHI_WEN.get(wen)
  if (shangCi && Date.now() - shangCi < ZHI_WEN_LENG_QUE_HAO_MIAO) {
    return
  }
  SHANG_BAO_ZHI_WEN.set(wen, Date.now())
  faSongRiZhi(ti)
}

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

function shiQuXiaoYiChang(cuoWu: unknown): boolean {
  if (!cuoWu || typeof cuoWu !== 'object') return false
  const caiZhi = cuoWu as { name?: unknown; code?: unknown }
  return caiZhi.name === 'AbortError' || caiZhi.code === 'ERR_CANCELED' || caiZhi.code === 'ABORT_ERR'
}

export function anZhuangQuanJuCuoWuJianTingQi(): void {
  if (typeof window === 'undefined') return
  if (yiAnZhuang) return
  yiAnZhuang = true

  window.addEventListener('unhandledrejection', (shiJian) => {
    const cuoWu = shiJian.reason
    if (shiQuXiaoYiChang(cuoWu)) {
      shiJian.preventDefault()
      return
    }
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
