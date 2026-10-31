import 开场采样表 from './开场采样表.json'

interface KaiChangBiao {
  kaiChang: string[]
  quanZhong: number[]
  _shouYong: number
  _fuHanLv: number
  _jiShu?: { faYanShu: number; kuaiShu: number }
}

const BIAO = 开场采样表 as unknown as KaiChangBiao

function duZhengShu(ming: string, moRen: number, zuiXiao: number, zuiDa: number): number {
  const yuan = (process.env[ming] || '').trim()
  if (yuan === '') return moRen
  const shu = Number(yuan)
  if (!Number.isFinite(shu)) return moRen
  return Math.max(zuiXiao, Math.min(zuiDa, shu))
}

export function duJieBaoKaiGuan(ming: string): boolean {
  return (process.env[ming] || '').trim().toLowerCase() === 'true'
}

export const KAI_CHANG_KAI_GUAN_MING = 'KAI_CHANG_QIAN_ZHI_QI_YONG'

export const KAI_CHANG_PEI_ZHI = {
  kaiGuan: duJieBaoKaiGuan(KAI_CHANG_KAI_GUAN_MING),
  houXuanGeShu: duZhengShu('KAI_CHANG_HOU_XUAN_GE_SHU', 5, 2, 12),
  biaoTiaoShuXian: duZhengShu('KAI_CHANG_BIAO_TIAO_SHU', BIAO._shouYong, 1, BIAO._shouYong),
  kaiFaMoShi: (process.env['KAI_CHANG_KAI_FA_MO_SHI'] || '').trim().toLowerCase() === 'true',
} as const

export function huoQuKaiChangBiao(): { kaiChang: string[]; quanZhong: number[] } {
  const shu = Math.min(BIAO.kaiChang.length, KAI_CHANG_PEI_ZHI.biaoTiaoShuXian)
  return { kaiChang: BIAO.kaiChang.slice(0, shu), quanZhong: BIAO.quanZhong.slice(0, shu) }
}

export const KAI_CHANG_BIAO_YUAN_XIN = {
  shouYongShu: BIAO._shouYong,
  fuHanLv: BIAO._fuHanLv,
  kuaiShu: BIAO._jiShu?.kuaiShu ?? 0,
  faYanShu: BIAO._jiShu?.faYanShu ?? 0,
} as const
