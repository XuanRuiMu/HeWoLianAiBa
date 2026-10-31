export function yanZhengUUID(zhi: unknown): zhi is string {
  if (typeof zhi !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(zhi)
}

export function maDianChangDu(zhi: string): number {
  return Array.from(zhi).length
}
