import type { 消息 } from '@/types/类型定义'

const SHI_PIN_HOU_ZHUI = ['.mp4', '.mov', '.webm', '.m4v']

export function shiShiPinXiaoXi(xiaoXi: Pick<消息, 'lei_xing' | 'mei_ti_yuan_shi_wen_jian_ming'>): boolean {
  if (xiaoXi.lei_xing !== 'wenJian') return false
  const ming = (xiaoXi.mei_ti_yuan_shi_wen_jian_ming || '').toLowerCase()
  return SHI_PIN_HOU_ZHUI.some((hou) => ming.endsWith(hou))
}

export function yanZhengShengChengTiShiCi(tiShiCi: unknown, zuiDaZiFu = 200): { heFa: boolean; qingXiHou: string } {
  if (typeof tiShiCi !== 'string') return { heFa: false, qingXiHou: '' }
  const qingXiHou = tiShiCi.trim().slice(0, zuiDaZiFu)
  return { heFa: qingXiHou.length > 0, qingXiHou }
}

export function gouJianYuYinFaSongNeiRong(zhuanXieWenBen: unknown): string {
  if (typeof zhuanXieWenBen !== 'string') return ''
  return zhuanXieWenBen.trim().slice(0, 500)
}

export function jieXiShengTuMingLing(_neiRong: unknown): string | null {
  return null
}

export function shiShengTuMingLing(_neiRong: unknown): boolean {
  return false
}

export function shiShengShiPinMingLing(_neiRong: unknown): boolean {
  return false
}

export interface MeiTiXiaZaiXinXi {
  mei_ti_url?: string | null
  mei_ti_yuan_shi_wen_jian_ming?: string | null
}

export function baoCunMeiTiXiaoXi(xiaoXi: MeiTiXiaZaiXinXi, moRenHouZhui = '.png'): boolean {
  const diZhi = xiaoXi.mei_ti_url
  if (!diZhi) return false
  const ming = xiaoXi.mei_ti_yuan_shi_wen_jian_ming?.trim()
  const wenJianMing = ming && /\.[A-Za-z0-9]{1,8}$/.test(ming) ? ming : `mei_ti${moRenHouZhui}`
  return xiaZaiMeiTi(diZhi, wenJianMing)
}

export function xiaZaiMeiTi(diZhi: string, wenJianMing: string): boolean {  if (typeof document === 'undefined' || !document.body || !diZhi) return false
  const mao = document.createElement('a')
  mao.href = diZhi
  mao.download = wenJianMing
  mao.rel = 'noopener'
  document.body.appendChild(mao)
  try {
    mao.click()
    return true
  } catch {
    return false
  } finally {
    mao.remove()
  }
}
