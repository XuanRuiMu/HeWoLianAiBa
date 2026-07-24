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

export function sheZhiCuoWuShangBaoHanShu(hanShu: CuoWuShangBaoHanShu | null): void {
  dangQianShangBaoHanShu = hanShu
}

export function chuFaCuoWuShangBao(canShu: CuoWuShangBaoCanShu): void {
  if (typeof dangQianShangBaoHanShu === 'function') {
    try {
      dangQianShangBaoHanShu(canShu)
    } catch (shangBaoCuoWu) {
      console.error('[全局错误处理] 上报函数自身抛错:', shangBaoCuoWu)
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
    const navigatorRef = (
      globalThis as { navigator?: { sendBeacon?: (url: string, body: Blob) => boolean } }
    ).navigator
    if (navigatorRef && typeof navigatorRef.sendBeacon === 'function') {
      const blob = new Blob([wenBen], { type: 'application/json' })
      const ok = navigatorRef.sendBeacon(SHANG_BAO_URL, blob)
      if (ok) return
    }
  } catch {
    // 静默
  }

  try {
    const fetchRef = (
      globalThis as { fetch?: (url: string, init?: RequestInit) => Promise<unknown> }
    ).fetch
    if (typeof fetchRef === 'function') {
      void fetchRef(SHANG_BAO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: wenBen,
        keepalive: true,
        mode: 'same-origin',
        credentials: 'same-origin',
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
    xiang_qing: xiangQing,
  }
  faSongRiZhi(ti)
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
    console.error('[全局错误处理] 未处理的 Promise rejection:', cuoWu)
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
    console.error('[全局错误处理] 资源或运行时错误:', cuoWu)
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
