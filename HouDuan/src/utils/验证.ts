export function yanZhengUUID(zhi: unknown): zhi is string {
  if (typeof zhi !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(zhi)
}

// 按 Unicode 码点计数（emoji / 代理对计 1），用于按「字数」判长的文本字段，
// 避免 String.length 把 emoji 劈成 2 个码元而错估长度
export function maDianChangDu(zhi: string): number {
  return Array.from(zhi).length
}
