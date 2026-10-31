
function duQuFuDian(ming: string, moRen: number, zuiXiao: number, zuiDa: number): number {
  const yuan = Number(process.env[ming])
  if (!Number.isFinite(yuan)) return moRen
  return Math.max(zuiXiao, Math.min(zuiDa, yuan))
}

function duQuCiBiao(ming: string, moRen: string[]): string[] {
  const yuan = process.env[ming]
  if (yuan === undefined || yuan.trim() === '') return moRen
  try {
    const jieXi = JSON.parse(yuan) as unknown
    if (Array.isArray(jieXi)) {
      const guoLv = jieXi.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
      if (guoLv.length > 0) return guoLv
    }
  } catch {
  }
  return yuan.split(',').map((x) => x.trim()).filter((x) => x !== '')
}

const MO_REN_CI_BIAO = [
  '作为 AI',
  '作为AI',
  '作为人工智能',
  '请注意',
  '注意：',
  '总结',
  '根据以上',
  '根据设定',
  '元话语',
]

const MO_REN_GUO_LV_CI_BIAO = [
  '作为 AI',
  '作为AI',
  '作为人工智能',
  '我很乐意帮助',
  '我很乐意为您',
  '我理解你的感受',
  '我理解您的感受',
  '很抱歉为您带来',
  '非常抱歉给您带来',
  '请问有什么可以帮',
  '有什么可以帮助您',
  '希望这能帮到您',
  '作为一个AI',
]

export const AI_WEI_GUO_LV_PEI_ZHI = {
  ciBiao: duQuCiBiao('QU_AI_WEI_GUO_LV_CI_BIAO', MO_REN_GUO_LV_CI_BIAO),
} as const

export interface AiWeiGuoLvJieGuo {
  baoLiu: string[]
  beiFengSha: string[]
}

export function guoLvAiWeiXiaoXi(xiaoXiLieBiao: readonly string[], ciBiao: readonly string[] = AI_WEI_GUO_LV_PEI_ZHI.ciBiao): AiWeiGuoLvJieGuo {
  const baoLiu: string[] = []
  const beiFengSha: string[] = []
  for (const tiao of xiaoXiLieBiao) {
    if (typeof tiao === 'string' && ciBiao.some((ci) => ci && tiao.includes(ci))) {
      beiFengSha.push(tiao)
    } else {
      baoLiu.push(tiao)
    }
  }
  return { baoLiu, beiFengSha }
}

export const QU_AI_WEI_PEI_ZHI = {
  ciBiao: duQuCiBiao('QU_AI_WEI_CI_BIAO', MO_REN_CI_BIAO),
  caiYangBiLi: duQuFuDian('QU_AI_WEI_CAI_YANG_BI_LI', 0.1, 0, 1),
  moXingChouJianBiLi: duQuFuDian('QU_AI_WEI_MO_XING_CHOU_JIAN_BI_LI', 0.05, 0, 1),
  huiDuKaiGuan: (process.env['QU_AI_WEI_HUI_DU_QI_YONG'] || '').trim().toLowerCase() !== 'false',
} as const

export interface QuAiWeiJianChaJieGuo {
  mingZhong: string[]
  tongGuo: boolean
}

export function jianChaAiWei(wenBen: string, ciBiao: readonly string[] = QU_AI_WEI_PEI_ZHI.ciBiao): QuAiWeiJianChaJieGuo {
  const mingZhong: string[] = []
  if (typeof wenBen !== 'string' || !wenBen) return { mingZhong, tongGuo: true }
  for (const ci of ciBiao) {
    if (ci && wenBen.includes(ci) && !mingZhong.includes(ci)) mingZhong.push(ci)
  }
  return { mingZhong, tongGuo: mingZhong.length === 0 }
}

export function panDuanShiFouCaiYang(suiJiShu: number = Math.random()): boolean {
  return suiJiShu < QU_AI_WEI_PEI_ZHI.caiYangBiLi
}

export function panDuanShiFouMoXingChouJian(suiJiShu: number = Math.random()): boolean {
  return suiJiShu < QU_AI_WEI_PEI_ZHI.moXingChouJianBiLi
}

export const QU_AI_WEI_HUI_DU_GUAN_JIAN = 'QU_AI_WEI_HUI_DU'
