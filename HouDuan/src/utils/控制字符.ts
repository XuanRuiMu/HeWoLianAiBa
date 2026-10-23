
const KONG_ZHI_ZI_FU_MO_SHI = /[\u0000-\u0008\u000B-\u001F\u007F\uFFFE\uFFFF]/g

export function 剥离控制字符(wenBen: string): string {
  if (typeof wenBen !== 'string') return ''
  return wenBen.replace(KONG_ZHI_ZI_FU_MO_SHI, '')
}

export function 清洗玩家文本(wenBen: string, zuiDaChangDu?: number): string {
  const jieGuo = 剥离控制字符(wenBen).trim()
  if (zuiDaChangDu === undefined) return jieGuo
  return Array.from(jieGuo).slice(0, zuiDaChangDu).join('')
}
