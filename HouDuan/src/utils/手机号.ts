import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min'

export const DA_LU_QU_HAO = '86'

export interface ShouJiHaoJieXi {
  heFa: boolean
  guoJiHao: string
  guoJia: CountryCode | null
}

export function guiYiWeiGuoJiHao(yuanShi: string): string {
  const qingLi = String(yuanShi ?? '').trim().replace(/[\s\-()]/g, '')
  if (qingLi === '') return ''
  if (qingLi.startsWith('+')) return qingLi
  if (/^\d{11}$/.test(qingLi) && /^1[3-9]/.test(qingLi)) return '+' + DA_LU_QU_HAO + qingLi
  if (/^86\d{11}$/.test(qingLi)) return '+' + qingLi
  return '+' + qingLi
}

export function jieXiShouJiHao(yuanShi: string): ShouJiHaoJieXi {
  const guoJiHao = guiYiWeiGuoJiHao(yuanShi)
  if (!/^\+\d{4,16}$/.test(guoJiHao)) return { heFa: false, guoJiHao, guoJia: null }
  try {
    const jieXi = parsePhoneNumberFromString(guoJiHao)
    if (!jieXi) return { heFa: false, guoJiHao, guoJia: null }
    return { heFa: jieXi.isValid(), guoJiHao: jieXi.number, guoJia: jieXi.country ?? null }
  } catch {
    return { heFa: false, guoJiHao, guoJia: null }
  }
}

export function shiFouDaLuHao(yuanShi: string): boolean {
  const jieXi = jieXiShouJiHao(yuanShi)
  return jieXi.heFa && jieXi.guoJia === 'CN' && /^\+861[3-9]\d{9}$/.test(jieXi.guoJiHao)
}

export function yinMaGuoJiHao(yuanShi: string): string {
  const guoJiHao = guiYiWeiGuoJiHao(yuanShi)
  const piPei = /^\+(\d{1,4})(\d*)$/.exec(guoJiHao)
  if (!piPei) return ''
  const quHao = piPei[1]
  const benDi = piPei[2]
  if (benDi.length === 0) return '+' + quHao
  if (benDi.length <= 4) return '+' + quHao + '*'.repeat(benDi.length)
  return '+' + quHao + '****' + benDi.slice(-4)
}
