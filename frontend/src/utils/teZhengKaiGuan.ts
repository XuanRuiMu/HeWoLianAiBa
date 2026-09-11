import { ref } from 'vue'

const MO_REN_KAI_GUAN: Record<string, boolean> = { junShi: true }

const kaiGuan = ref<Record<string, boolean>>({ ...MO_REN_KAI_GUAN })

export function huoQuTeZhengKaiGuan(): Record<string, boolean> {
  return kaiGuan.value
}

export function huoQuJunShiKaiGuan(): boolean {
  return kaiGuan.value.junShi !== false
}

function yingYongHeFaKaiGuan(shuJu: unknown): Record<string, boolean> | null {
  if (typeof shuJu !== 'object' || shuJu === null || Array.isArray(shuJu)) return null
  const jieGuo: Record<string, boolean> = {}
  for (const [jian, zhi] of Object.entries(shuJu as Record<string, unknown>)) {
    if (typeof zhi === 'boolean') jieGuo[jian] = zhi
  }
  return jieGuo
}

export function sheZhiTeZhengKaiGuan(xin: Record<string, boolean>): void {
  kaiGuan.value = { ...MO_REN_KAI_GUAN, ...xin }
}

export function chongZhiTeZhengKaiGuan(): void {
  kaiGuan.value = { ...MO_REN_KAI_GUAN }
}

export async function laQuTeZhengKaiGuan(): Promise<void> {
  try {
    const fetchRef = (
      globalThis as { fetch?: (url: string, init?: RequestInit) => Promise<Response> }
    ).fetch
    if (typeof fetchRef !== 'function') return
    const xiangYing = await fetchRef('/api/config/feature-flags', { cache: 'no-store' })
    if (!xiangYing.ok) return
    const jieXi: unknown = await xiangYing.json()
    const heFa = yingYongHeFaKaiGuan(jieXi)
    if (heFa === null) return
    kaiGuan.value = { ...MO_REN_KAI_GUAN, ...heFa }
  } catch {
    // 拉取失败静默，沿用默认值
  }
}
