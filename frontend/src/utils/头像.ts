export function shiTuPianDiZhi(touXiang: string | null | undefined): boolean {
  if (!touXiang) return false
  return /^(https?:\/\/|data:|\/)/.test(touXiang.trim())
}
