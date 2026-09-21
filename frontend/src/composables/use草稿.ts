import { onBeforeUnmount, watch, type Ref } from 'vue'

const CAO_GAO_QIAN_ZHUI = 'caoGao:'
const CAO_GAO_ZUI_DA_ZI_FU = 2000

export type CaoGaoJianYuan = string | Ref<string>

function quJianWenBen(yuan: CaoGaoJianYuan): string {
  const wenBen = typeof yuan === 'string' ? yuan : yuan.value
  if (typeof wenBen !== 'string') return ''
  return wenBen.trim()
}

function shiHeFaCaoGaoJian(jian: unknown): jian is string {
  if (typeof jian !== 'string') return false
  const qingLi = jian.trim()
  if (!qingLi || qingLi.length > 120) return false
  return /^[A-Za-z0-9_\-:]+$/.test(qingLi)
}

function duQuCaoGao(jian: string): string {
  try {
    if (typeof sessionStorage === 'undefined') return ''
    return sessionStorage.getItem(CAO_GAO_QIAN_ZHUI + jian) || ''
  } catch {
    return ''
  }
}

function xieRuCaoGao(jian: string, zhi: string): void {
  try {
    if (typeof sessionStorage === 'undefined') return
    const qingLi = typeof zhi === 'string' ? zhi.slice(0, CAO_GAO_ZUI_DA_ZI_FU) : ''
    if (!qingLi) sessionStorage.removeItem(CAO_GAO_QIAN_ZHUI + jian)
    else sessionStorage.setItem(CAO_GAO_QIAN_ZHUI + jian, qingLi)
  } catch {
    // 会话存储不可用时静默跳过，不影响输入
  }
}

function shanChuCaoGao(jian: string): void {
  try {
    if (typeof sessionStorage === 'undefined') return
    sessionStorage.removeItem(CAO_GAO_QIAN_ZHUI + jian)
  } catch {
    // 静默跳过
  }
}

export function useCaoGao(caoGaoJianYuan: CaoGaoJianYuan, neiRong: Ref<string>): {
  huiFuCaoGao: () => boolean
  qingChuCaoGao: () => void
} {
  function quDangQianJian(): string {
    const wenBen = quJianWenBen(caoGaoJianYuan)
    return shiHeFaCaoGaoJian(wenBen) ? wenBen : ''
  }

  function huiFuCaoGao(): boolean {
    const jian = quDangQianJian()
    if (!jian || neiRong.value) return false
    const cunGao = duQuCaoGao(jian)
    if (!cunGao) return false
    neiRong.value = cunGao.slice(0, CAO_GAO_ZUI_DA_ZI_FU)
    return true
  }

  function qingChuCaoGao(): void {
    const jian = quDangQianJian()
    if (jian) shanChuCaoGao(jian)
  }

  huiFuCaoGao()

  const tingZhiNeiRong = watch(
    () => neiRong.value,
    (xinZhi, jiuZhi) => {
      const jian = quDangQianJian()
      if (!jian) return
      if (xinZhi === jiuZhi) return
      xieRuCaoGao(jian, xinZhi)
    },
    { flush: 'sync' },
  )

  const tingZhiJian =
    typeof caoGaoJianYuan === 'string'
      ? null
      : watch(
          () => quJianWenBen(caoGaoJianYuan),
          () => {
            huiFuCaoGao()
          },
        )

  onBeforeUnmount(() => {
    tingZhiNeiRong()
    tingZhiJian?.()
  })

  return { huiFuCaoGao, qingChuCaoGao }
}

export const CAO_GAO_JIAN = {
  aiLiaoTian: (huiHuaId: string) => `ai:${huiHuaId}`,
  haoYouLiaoTian: (haoYouId: string) => `haoYou:${haoYouId}`,
  shenSu: 'shenSu',
  qianMing: 'qianMing',
} as const
