import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min'
import { fanYi } from '@/config/翻译表'

export const DA_LU_QU_HAO = '86'
export const DA_LU_GUO_JIA: CountryCode = 'CN'

type FanYiUiJian = keyof typeof fanYi.ui

export interface QuHaoXuanXiang {
  quHao: string
  guoJia: CountryCode
  wenAnJian: FanYiUiJian | null
  mingCheng: string
  yingWenMing: string
}

const SHOU_XIE_MING_CHENG: Partial<Record<CountryCode, FanYiUiJian>> = {
  CN: 'quHaoDaLu',
  HK: 'quHaoXiangGang',
  MO: 'quHaoAoMen',
  TW: 'quHaoTaiWan',
  US: 'quHaoMeiGuo',
  CA: 'quHaoJiaNaDa',
  JP: 'quHaoRiBen',
  KR: 'quHaoHanGuo',
  SG: 'quHaoXinJiaPo',
  MY: 'quHaoMaLaixiYa',
  TH: 'quHaoTaiGuo',
  VN: 'quHaoYueNan',
  ID: 'quHaoYinNi',
  PH: 'quHaoFeiLvBin',
  IN: 'quHaoYinDu',
  GB: 'quHaoYingGuo',
  DE: 'quHaoDeGuo',
  FR: 'quHaoFaGuo',
  IT: 'quHaoYiDaLi',
  ES: 'quHaoXiBanYa',
  RU: 'quHaoELuoSi',
  AU: 'quHaoAoDaLiYa',
  NZ: 'quHaoXinXiLan',
  BR: 'quHaoBaXi',
  MX: 'quHaoMoXiGe',
  ZA: 'quHaoNanFei',
  AE: 'quHaoALianQiu',
}

const QU_HAO_ZHU_GUO: Record<string, CountryCode> = {
  '1': 'US',
  '7': 'RU',
  '39': 'IT',
  '44': 'GB',
  '47': 'NO',
  '61': 'AU',
  '212': 'MA',
  '262': 'RE',
  '290': 'SH',
  '358': 'FI',
  '590': 'GP',
  '599': 'CW',
}

function chuangJianDiQuMingBiao(yuYan: string): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([yuYan], { type: 'region' })
  } catch {
    return null
  }
}

function chuangJianPaiXuQi(): Intl.Collator | null {
  try {
    return new Intl.Collator('zh-Hans-CN', { collation: 'pinyin' })
  } catch {
    return null
  }
}

const ZHONG_WEN_DI_QU_MING = chuangJianDiQuMingBiao('zh-CN')
const YING_WEN_DI_QU_MING = chuangJianDiQuMingBiao('en')
const HAN_ZI_PAI_XU = chuangJianPaiXuQi()

function duDiQuMing(biao: Intl.DisplayNames | null, guoJia: CountryCode): string {
  if (!biao) return String(guoJia)
  try {
    const 名 = biao.of(guoJia)
    return 名 && 名 !== '' ? 名 : String(guoJia)
  } catch {
    return String(guoJia)
  }
}

function biJiaoMingCheng(甲: string, 乙: string): number {
  if (HAN_ZI_PAI_XU) return HAN_ZI_PAI_XU.compare(甲, 乙)
  return 甲.localeCompare(乙, 'zh-Hans-CN')
}

function chuangJianQuHaoXuanXiang(): QuHaoXuanXiang[] {
  const 原始 = getCountries().map((国) => {
    const 键 = SHOU_XIE_MING_CHENG[国] ?? null
    return {
      quHao: String(getCountryCallingCode(国)),
      guoJia: 国,
      wenAnJian: 键,
      mingCheng: 键 ? fanYi.ui[键] : duDiQuMing(ZHONG_WEN_DI_QU_MING, 国),
      yingWenMing: duDiQuMing(YING_WEN_DI_QU_MING, 国),
    }
  })
  const 排序后 = 原始.sort((甲, 乙) => {
    if (甲.guoJia === DA_LU_GUO_JIA) return -1
    if (乙.guoJia === DA_LU_GUO_JIA) return 1
    return (
      biJiaoMingCheng(甲.mingCheng, 乙.mingCheng) ||
      biJiaoMingCheng(甲.yingWenMing, 乙.yingWenMing) ||
      甲.guoJia.localeCompare(乙.guoJia)
    )
  })
  const 分组 = new Map<string, QuHaoXuanXiang[]>()
  for (const 项 of 排序后) {
    const 组 = 分组.get(项.quHao)
    if (组) 组.push(项)
    else 分组.set(项.quHao, [项])
  }
  const 结果: QuHaoXuanXiang[] = []
  const 已收 = new Set<string>()
  for (const 项 of 排序后) {
    if (已收.has(项.quHao)) continue
    已收.add(项.quHao)
    const 组 = 分组.get(项.quHao) ?? [项]
    if (组.length > 1) {
      const 主国 = QU_HAO_ZHU_GUO[项.quHao]
      组.sort((甲, 乙) => {
        const 甲主 = 甲.guoJia === 主国 ? 0 : 1
        const 乙主 = 乙.guoJia === 主国 ? 0 : 1
        return 甲主 - 乙主 || biJiaoMingCheng(甲.mingCheng, 乙.mingCheng)
      })
    }
    结果.push(...组)
  }
  return 结果
}

export const QU_HAO_XUAN_XIANG: QuHaoXuanXiang[] = chuangJianQuHaoXuanXiang()

export function quHaoWenAn(项: QuHaoXuanXiang): string {
  return 项.wenAnJian ? fanYi.ui[项.wenAnJian] || 项.mingCheng : 项.mingCheng
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
