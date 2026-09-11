import { yingYongBanBen } from '@/config/站点配置'

const SHANG_BAO_URL = '/api/logs'

function faSongMaiDian(wenBen: string): void {
  try {
    const navigatorRef = (
      globalThis as { navigator?: { sendBeacon?: (url: string, body: Blob) => boolean } }
    ).navigator
    if (navigatorRef && typeof navigatorRef.sendBeacon === 'function') {
      const blob = new Blob([wenBen], { type: 'application/json' })
      if (navigatorRef.sendBeacon(SHANG_BAO_URL, blob)) return
    }
  } catch {
    // 静默，走降级
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

export function track(shiJianMing: string, canShu?: Record<string, unknown>): void {
  try {
    const fuZai = JSON.stringify({
      lei_xing: 'mai_dian',
      shi_jian: shiJianMing,
      can_shu: canShu ?? {},
      ban_ben: yingYongBanBen,
      shi_jian_chuo: Date.now(),
    })
    faSongMaiDian(fuZai)
  } catch {
    // 埋点失败不影响业务
  }
}
