import { ref } from 'vue'
import { QIAN_TAI_DAI_MA, daiMaHuoQuTongYongDaiMa } from '@/config/前台错误码'
import { chuangJianQianTaiCuoWu, 归一前台错误, type QianTaiCuoWu } from '@/utils/前台错误'

const MO_REN_KAI_GUAN: Record<string, boolean> = { junShi: true }

const kaiGuan = ref<Record<string, boolean>>({ ...MO_REN_KAI_GUAN })

/**
 * 开关读取失败时登记的统一错误模型（FP-16）。
 * 军师入口等界面据此呈现「未确认」并可重试，不把降级默认值当作读取成功。
 */
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
  // 根因收敛：后端未启动时vite代理穿透502刷控制台error；收敛为登记统一错误模型，
  // 由军师入口等界面显式提示「开关未确认」并提供重试，绝不把默认值当成读取成功。
  try {
    const fetchRef = (
      globalThis as { fetch?: (url: string, init?: RequestInit) => Promise<Response> }
    ).fetch
    if (typeof fetchRef !== 'function') return
    const kongZhi = new AbortController()
    const dingShi = setTimeout(() => kongZhi.abort(), 5000)
    let xiangYing: Response
    try {
      xiangYing = await fetchRef('/api/config/feature-flags', { cache: 'no-store', signal: kongZhi.signal })
    } catch {
      // fetch 传输层失败（含 5s 超时中断）即网络侧问题，登记为可重试的网络错误
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
