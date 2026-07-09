export function shiTuPianDiZhi(touXiang: string | null | undefined): boolean {
  if (!touXiang) return false
  return /^(https?:\/\/|data:|\/)/.test(touXiang.trim())
}

export function shengChengTouXiangURL(touXiang: string | null | undefined): string {
  if (!touXiang) return ''
  const qingLi = touXiang.trim()
  if (/^(https?:\/\/|data:|\/)/.test(qingLi)) return qingLi
  return `/${qingLi}`
}
