import { ref } from 'vue'
import { QIAN_TAI_DAI_MA, daiMaHuoQuTongYongDaiMa } from '@/config/前台错误码'
import { chuangJianQianTaiCuoWu, 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'

const MO_REN_KAI_GUAN: Record<string, boolean> = { junShi: true }

const kaiGuan = ref<Record<string, boolean>>({ ...MO_REN_KAI_GUAN })

export const teZhengKaiGuanCuoWu = ref<QianTaiCuoWu | null>(null)

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
  teZhengKaiGuanCuoWu.value = null
}

export function chongZhiTeZhengKaiGuan(): void {
  kaiGuan.value = { ...MO_REN_KAI_GUAN }
  teZhengKaiGuanCuoWu.value = null
}

export async function laQuTeZhengKaiGuan(): Promise<void> {
  try {
    const yuanShiFetch = (
      globalThis as { fetch?: (url: string, init?: RequestInit) => Promise<Response> }
    ).fetch
    if (typeof yuanShiFetch !== 'function') return
    const kongZhi = new AbortController()
    const dingShi = setTimeout(() => kongZhi.abort(), 5000)
    let xiangYing: Response
    try {
      xiangYing = await yuanShiFetch('/api/config/feature-flags', { cache: 'no-store', signal: kongZhi.signal })
    } catch {
      teZhengKaiGuanCuoWu.value = chuangJianQianTaiCuoWu({
        code: QIAN_TAI_DAI_MA.WANG_LUO,
        retryable: true,
        yuanLeiXing: 'wangLuo',
      })
      return
    } finally {
      clearTimeout(dingShi)
    }
    if (!xiangYing.ok) {
      const daiMa = daiMaHuoQuTongYongDaiMa(xiangYing.status) || QIAN_TAI_DAI_MA.WEI_ZHI
      teZhengKaiGuanCuoWu.value = chuangJianQianTaiCuoWu({
        code: daiMa,
        httpStatus: xiangYing.status,
      })
      return
    }
    const jieXi: unknown = await xiangYing.json()
    const heFa = yingYongHeFaKaiGuan(jieXi)
    if (heFa === null) {
      teZhengKaiGuanCuoWu.value = chuangJianQianTaiCuoWu({ code: QIAN_TAI_DAI_MA.XIE_YI })
      return
    }
    kaiGuan.value = { ...MO_REN_KAI_GUAN, ...heFa }
    teZhengKaiGuanCuoWu.value = null
  } catch (错误: unknown) {
    teZhengKaiGuanCuoWu.value = 归一前台错误(错误)
  }
}
