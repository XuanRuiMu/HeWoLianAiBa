import {
  AsYouType,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min'
import { fanYi } from '@/config/翻译表'

export const DA_LU_QU_HAO = '86'
export const DA_LU_GUO_JIA: CountryCode = 'CN'

export const QU_HAO_XUAN_XIANG = [
  { quHao: '86', guoJia: 'CN' as CountryCode, wenAnJian: 'quHaoDaLu' },
  { quHao: '852', guoJia: 'HK' as CountryCode, wenAnJian: 'quHaoXiangGang' },
  { quHao: '853', guoJia: 'MO' as CountryCode, wenAnJian: 'quHaoAoMen' },
  { quHao: '886', guoJia: 'TW' as CountryCode, wenAnJian: 'quHaoTaiWan' },
  { quHao: '1', guoJia: 'US' as CountryCode, wenAnJian: 'quHaoMeiGuo' },
  { quHao: '1', guoJia: 'CA' as CountryCode, wenAnJian: 'quHaoJiaNaDa' },
  { quHao: '81', guoJia: 'JP' as CountryCode, wenAnJian: 'quHaoRiBen' },
  { quHao: '82', guoJia: 'KR' as CountryCode, wenAnJian: 'quHaoHanGuo' },
  { quHao: '65', guoJia: 'SG' as CountryCode, wenAnJian: 'quHaoXinJiaPo' },
  { quHao: '60', guoJia: 'MY' as CountryCode, wenAnJian: 'quHaoMaLaixiYa' },
  { quHao: '66', guoJia: 'TH' as CountryCode, wenAnJian: 'quHaoTaiGuo' },
  { quHao: '84', guoJia: 'VN' as CountryCode, wenAnJian: 'quHaoYueNan' },
  { quHao: '62', guoJia: 'ID' as CountryCode, wenAnJian: 'quHaoYinNi' },
  { quHao: '63', guoJia: 'PH' as CountryCode, wenAnJian: 'quHaoFeiLvBin' },
  { quHao: '91', guoJia: 'IN' as CountryCode, wenAnJian: 'quHaoYinDu' },
  { quHao: '44', guoJia: 'GB' as CountryCode, wenAnJian: 'quHaoYingGuo' },
  { quHao: '49', guoJia: 'DE' as CountryCode, wenAnJian: 'quHaoDeGuo' },
  { quHao: '33', guoJia: 'FR' as CountryCode, wenAnJian: 'quHaoFaGuo' },
  { quHao: '39', guoJia: 'IT' as CountryCode, wenAnJian: 'quHaoYiDaLi' },
  { quHao: '34', guoJia: 'ES' as CountryCode, wenAnJian: 'quHaoXiBanYa' },
  { quHao: '7', guoJia: 'RU' as CountryCode, wenAnJian: 'quHaoELuoSi' },
  { quHao: '61', guoJia: 'AU' as CountryCode, wenAnJian: 'quHaoAoDaLiYa' },
  { quHao: '64', guoJia: 'NZ' as CountryCode, wenAnJian: 'quHaoXinXiLan' },
  { quHao: '55', guoJia: 'BR' as CountryCode, wenAnJian: 'quHaoBaXi' },
  { quHao: '52', guoJia: 'MX' as CountryCode, wenAnJian: 'quHaoMoXiGe' },
  { quHao: '27', guoJia: 'ZA' as CountryCode, wenAnJian: 'quHaoNanFei' },
  { quHao: '971', guoJia: 'AE' as CountryCode, wenAnJian: 'quHaoALianQiu' },
] as const

export type QuHaoXuanXiang = (typeof QU_HAO_XUAN_XIANG)[number]

export function quHaoWenAn(项: QuHaoXuanXiang): string {
  return fanYi.ui[项.wenAnJian] || String(项.guoJia)
}

export function guiYiQuHao(zhi: unknown): string {
  const qingLi = String(zhi ?? '').replace(/\D/g, '')
  return qingLi === '' ? DA_LU_QU_HAO : qingLi
}

export function huoQuGuoJia(quHao: string): CountryCode | null {
  const 命中 = QU_HAO_XUAN_XIANG.find((项) => 项.quHao === quHao)
  return 命中 ? 命中.guoJia : null
}

export function zuChengGuoJiHao(quHao: string, benDiHao: string): string {
  const ben = String(benDiHao ?? '').replace(/\D/g, '')
  if (ben === '') return ''
  return '+' + guiYiQuHao(quHao) + ben
}

export interface ShouJiHaoPanDing {
  heFa: boolean
  guoJiHao: string
  guoJia: CountryCode | null
}

const DA_LU_SHOU_JI_HAO_ZHENG_ZE = /^1[3-9]\d{9}$/

export const DA_LU_SHOU_JI_HAO_CHANG = 11

export function panDingGuoJiHao(guoJiHao: string): ShouJiHaoPanDing {
  const 原文 = String(guoJiHao ?? '').trim()
  if (!/^\+\d{4,15}$/.test(原文)) return { heFa: false, guoJiHao: 原文, guoJia: null }
  if (原文.startsWith('+' + DA_LU_QU_HAO)) {
    const 本地 = 原文.slice(DA_LU_QU_HAO.length + 1)
    if (!DA_LU_SHOU_JI_HAO_ZHENG_ZE.test(本地)) {
      return { heFa: false, guoJiHao: 原文, guoJia: 'CN' }
    }
  }
  try {
    const 解析 = parsePhoneNumberFromString(原文)
    if (!解析) return { heFa: false, guoJiHao: 原文, guoJia: null }
    return { heFa: 解析.isValid(), guoJiHao: 解析.number, guoJia: 解析.country ?? null }
  } catch {
    return { heFa: false, guoJiHao: 原文, guoJia: null }
  }
}

export function panDingBenDiHao(quHao: string, benDiHao: string): ShouJiHaoPanDing {
  const 本地 = String(benDiHao ?? '').replace(/\D/g, '')
  if (本地 === '') return { heFa: false, guoJiHao: '', guoJia: null }
  return panDingGuoJiHao(zuChengGuoJiHao(quHao, 本地))
}

export function huoQuBenDiHao(guoJiHao: string, quHao: string): string {
  const 原文 = String(guoJiHao ?? '').trim()
  const 前缀 = '+' + guiYiQuHao(quHao)
  if (!原文.startsWith(前缀)) return ''
  return 原文.slice(前缀.length).replace(/\D/g, '')
}

export function geShiHuaBenDiHao(quHao: string, benDiHao: string): string {
  const 国 = huoQuGuoJia(guiYiQuHao(quHao))
  if (!国) return benDiHao
  const 排版 = new AsYouType(国)
  return 排版.input(String(benDiHao ?? '').replace(/\D/g, ''))
}

export function shiFouDaLuHao(guoJiHao: string): boolean {
  const 原文 = String(guoJiHao ?? '').trim()
  return 原文.startsWith('+' + DA_LU_QU_HAO) && /^\+861[3-9]\d{9}$/.test(原文)
}

export function quanJuQuHaoZuiChang(): number {
  return Math.max(...QU_HAO_XUAN_XIANG.map((项) => 项.quHao.length), 2)
}

export function quanJuGuoJiaLieBiao(): CountryCode[] {
  return [...new Set(QU_HAO_XUAN_XIANG.map((项) => 项.guoJia))]
}

export function quHaoKeYong(quHao: string): boolean {
  const 国 = huoQuGuoJia(guiYiQuHao(quHao))
  if (!国) return false
  try {
    getCountryCallingCode(国)
    return isSupportedCountry(国)
  } catch {
    return false
  }
}

export function shouJiHaoYanMa(guoJiHao: string): string {
  const 解析 = /^\+(\d{1,4})(\d*)$/.exec(String(guoJiHao ?? '').trim())
  if (!解析) return String(guoJiHao ?? '').trim()
  const 号 = 解析[2]
  if (号.length < 4) return '+' + 解析[1] + 号
  return '+' + 解析[1] + '****' + 号.slice(-4)
}
