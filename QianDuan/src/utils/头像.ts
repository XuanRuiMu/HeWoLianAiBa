export function shiTuPianDiZhi(touXiang: string | null | undefined): boolean {
  if (!touXiang) return false
  return /^(https?:\/\/|data:|\/)/.test(touXiang.trim())
}

export function shengChengTouXiangURL(touXiang: string | null | undefined): string {
  if (!touXiang) return ''
  const qingLi = touXiang.trim()
  if (/^(https?:\/\/|data:)/.test(qingLi)) return qingLi
  if (qingLi.startsWith('/')) return encodeURI(qingLi)
  return encodeURI(`/${qingLi}`)
}

export function junShiMoRenTouXiang(mingCheng?: string | null): string {
  if (!mingCheng) return '🧙'
  return mingCheng.trim().slice(0, 1) || '🧙'
}
