import { 剥离控制字符 } from './控制字符'

export interface 业务错误形态 {
  readonly zhuang_tai_ma?: number
  readonly cuo_wu_ma?: string
}

const ZUI_DA_WEN_AN_CHANG_DU = 200

function 取业务错误(cuoWu: unknown): (Error & 业务错误形态) | undefined {
  if (!(cuoWu instanceof Error)) return undefined
  const daiBiao = cuoWu as Error & 业务错误形态
  return typeof daiBiao.zhuang_tai_ma === 'number' && Number.isInteger(daiBiao.zhuang_tai_ma)
    ? daiBiao
    : undefined
}

function 清洗上屏文案(wenBen: string): string {
  return 剥离控制字符(wenBen)
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, ZUI_DA_WEN_AN_CHANG_DU)
}

export function 取业务错误文案(cuoWu: unknown, huiTuiWenAn: string): string {
  const houTui = 清洗上屏文案(huiTuiWenAn)
  const yeWu = 取业务错误(cuoWu)
  if (yeWu === undefined) return houTui
  const wenBen = 清洗上屏文案(yeWu.message)
  return wenBen.length > 0 ? wenBen : houTui
}

export function 取业务错误码(cuoWu: unknown, huiTuiMa: string): string {
  const ma = 取业务错误(cuoWu)?.cuo_wu_ma
  return typeof ma === 'string' && ma.length > 0 ? ma : huiTuiMa
}
