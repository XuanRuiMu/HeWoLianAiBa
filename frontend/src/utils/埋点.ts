import { yingYongBanBen } from '@/config/站点配置'

const SHANG_BAO_URL = '/api/logs'

function faSongMaiDian(wenBen: string): void {
  // 根因收敛：sendBeacon对502无状态回执，失败静默但浏览器记资源error；
  // 收敛为fetch直发（非2xx判错catch静默，不记资源error；后端故障时遥测丢弃可接受，埋点本就允许丢）
  try {
    const fetchRef = (
      globalThis as { fetch?: (url: string, init?: RequestInit) => Promise<Response> }
    ).fetch
    if (typeof fetchRef !== 'function') {
      return
    }
    void fetchRef(SHANG_BAO_URL, {
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
