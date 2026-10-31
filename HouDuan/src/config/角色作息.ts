import { duJieBaoKaiGuan } from './开场采样配置'

export type ZuoXiLeiXing = 'zaoShui' | 'wanShui' | 'buZeGui'

export const XING_QING_SHI_JIAN_LEI_XING: Record<ZuoXiLeiXing, { qi: number; zhong: number }> = {
  zaoShui: { qi: 7.5, zhong: 23.5 },
  wanShui: { qi: 11, zhong: 26 },// 26 > 24 ⇒ 跨午夜
  buZeGui: { qi: 9, zhong: 24 },
}

export function tuiDuanZuoXi(wenBen: string): ZuoXiLeiXing {
  if (/作息不规律|失眠|自由职业|设计师/.test(wenBen)) return 'buZeGui'
  if (/夜猫子|熬夜|通宵|凌晨还|睡得很晚/.test(wenBen)) return 'wanShui'
  return 'zaoShui'
}

export interface ZuoXiPanDuan {
  xiaoShi: number
  shiFuZhe: boolean
  dengDaiMiaoShu: number
  qiXingXiaoShi: number
  leiXing: ZuoXiLeiXing
}

export function panDuanZuoXi(xiaoShi: number, leiXing: ZuoXiLeiXing = 'zaoShui'): ZuoXiPanDuan {
  const fuZuo = duZheFuZuoXi()
  const fanWei = fuZuo || XING_QING_SHI_JIAN_LEI_XING[leiXing]
  const xiaoShiZheng = ((xiaoShi % 24) + 24) % 24

  if (fanWei.zhong > 24) {
    const shiFuZhe = xiaoShiZheng < fanWei.qi && xiaoShiZheng >= fanWei.zhong - 24
    if (shiFuZhe) {
      return { xiaoShi: xiaoShiZheng, shiFuZhe, dengDaiMiaoShu: (fanWei.qi - xiaoShiZheng) * 3600_000, qiXingXiaoShi: fanWei.qi, leiXing }
    }
    return { xiaoShi: xiaoShiZheng, shiFuZhe: false, dengDaiMiaoShu: 0, qiXingXiaoShi: fanWei.qi, leiXing }
  }

  if (xiaoShiZheng >= fanWei.qi && xiaoShiZheng < fanWei.zhong) {
    return { xiaoShi: xiaoShiZheng, shiFuZhe: false, dengDaiMiaoShu: 0, qiXingXiaoShi: fanWei.qi, leiXing }
  }
  const houLiang = xiaoShiZheng < fanWei.qi ? fanWei.qi - xiaoShiZheng : 24 - xiaoShiZheng + fanWei.qi
  return {
    xiaoShi: xiaoShiZheng,
    shiFuZhe: true,
    dengDaiMiaoShu: Math.max(1, houLiang * 3600_000 - 1),
    qiXingXiaoShi: fanWei.qi,
    leiXing,
  }
}

export const ZUO_XI_KAI_GUAN_MING = 'XING_ZUO_QI_YONG'
export function zuoXiKaiQi(): boolean {
  return duJieBaoKaiGuan(ZUO_XI_KAI_GUAN_MING)
}

export function duZheFuZuoXi(): { qi: number; zhong: number } | null {
  const wen = (process.env.XING_QUO_FEN_ZHENG || '').trim()
  const miao = wen.match(/^(\d{1,2})(?:\.(\d))?\s*[-~到]\s*(\d{1,2})(?:\.(\d))?$/)
  if (!miao) return null
  const qi = Number(miao[1]) + Number(miao[2] || 0) / 10
  const zhong = Number(miao[3]) + Number(miao[4] || 0) / 10
  if (!Number.isFinite(qi) || !Number.isFinite(zhong)) return null
  return { qi, zhong }
}
