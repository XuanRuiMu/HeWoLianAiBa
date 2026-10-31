import { yingYongBanBen } from '@/config/站点配置'

const SHANG_BAO_URL = '/api/logs'

function faSongMaiDian(wenBen: string): void {
  try {
    const yuanShiFetch = (
      globalThis as { fetch?: (url: string, init?: RequestInit) => Promise<Response> }
    ).fetch
    if (typeof yuanShiFetch !== 'function') {
      return
    }
    void yuanShiFetch(SHANG_BAO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: wenBen,
      keepalive: true,
      mode: 'same-origin',
      credentials: 'same-origin',
    }).then((xiangYing) => {
      if (!xiangYing.ok) {
        throw new Error(`埋点上报非成功状态:${xiangYing.status}`)
      }
    }).catch(() => {
      // 静默
    })
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
