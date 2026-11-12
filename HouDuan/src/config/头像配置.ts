function duQuHuanJing(ming: string, moRen: string): string {
  return process.env[ming] || moRen
}

function duQuZhengShu(ming: string, moRen: number): number {
  const yuan = parseInt(process.env[ming] || '', 10)
  return Number.isFinite(yuan) && yuan > 0 ? yuan : moRen
}

function duQuXiaoShu(ming: string, moRen: number, zuiXiao: number, zuiDa: number): number {
  const yuan = parseFloat(process.env[ming] || '')
  if (!Number.isFinite(yuan)) return moRen
  return Math.max(zuiXiao, Math.min(zuiDa, yuan))
}

export const TOU_XIANG_PEI_ZHI = {
  paiDuiJianGeHaoMiao: duQuZhengShu('TOU_XIANG_PAI_DUI_JIAN_GE_HAO_MIAO', 10000),
  caiDiBuBiLi: duQuXiaoShu('TOU_XIANG_CAI_DI_BU_BI_LI', 0.06, 0, 0.2),
  tuXiangChiCun: duQuHuanJing('TOU_XIANG_TU_XIANG_CHI_CUN', '1024x1024'),
  zhengPianZuiDaChangShiCiShu: duQuZhengShu('TOU_XIANG_ZHENG_PIAN_CHANG_SHI_CI_SHU', 2),
  yanHuaZhengJuMenDian: duQuZhengShu('TOU_XIANG_YAN_HUA_ZHENG_JU_MEN_DIAN', 2),
  yanHuaChuFaGaiLv: duQuXiaoShu('TOU_XIANG_YAN_HUA_CHU_FA_GAI_LV', 0.08, 0, 1),
  yanHuaZhengJuTtlMiao: duQuZhengShu('TOU_XIANG_YAN_HUA_ZHENG_JU_TTL_MIAO', 30 * 24 * 60 * 60),
  houBeiDuiLieZuiDaTiaoShu: duQuZhengShu('TOU_XIANG_HOU_BEI_DUI_LIE_ZUI_DA_TIAO_SHU', 200),
} as const

export const TOU_XIANG_YAN_JING_SHU_XIAN = '目光望向画面侧边，不与观看者对视'

export const QI_ZHI_QI_DIAO = {
  冷感: '阴郁',
  沉稳: '平静',
  文艺: '平静',
  温柔: '明朗',
  活泼: '明朗',
} as const

export type TouXiangQiZhi = keyof typeof QI_ZHI_QI_DIAO

export type QingXuJiDiao = '阴郁' | '平静' | '明朗'

export const JI_DIAO_YAN_JIN_SHUN_XU: readonly QingXuJiDiao[] = ['阴郁', '平静', '明朗']

export const JI_DIAO_QI_ZHI: Record<QingXuJiDiao, TouXiangQiZhi> = {
  阴郁: '冷感',
  平静: '沉稳',
  明朗: '活泼',
}

export const MBTI_QI_ZHI: Record<string, TouXiangQiZhi> = {
  INTJ: '沉稳',
  INTP: '冷感',
  ENTJ: '沉稳',
  ENTP: '活泼',
  INFJ: '文艺',
  INFP: '文艺',
  ENFJ: '温柔',
  ENFP: '活泼',
  ISTJ: '沉稳',
  ISFJ: '温柔',
  ESTJ: '沉稳',
  ESFJ: '温柔',
  ISTP: '冷感',
  ISFP: '文艺',
  ESTP: '活泼',
  ESFP: '活泼',
}

export function tuiDaoQingXuJiDiao(xingGeWenBen: string): QingXuJiDiao {
  const yinYuCi = ['抑郁', '阴郁', '低落', '丧', '消沉', '悲观', '孤独', '冷漠']
  const mingLangCi = ['开朗', '阳光', '活泼', '热情', '元气', '乐观', '爱笑']
  if (yinYuCi.some((ci) => xingGeWenBen.includes(ci))) return '阴郁'
  if (mingLangCi.some((ci) => xingGeWenBen.includes(ci))) return '明朗'
  return '平静'
}

export function qianJinJiDiao(dangQian: QingXuJiDiao): QingXuJiDiao {
  const suoYin = JI_DIAO_YAN_JIN_SHUN_XU.indexOf(dangQian)
  return JI_DIAO_YAN_JIN_SHUN_XU[Math.min(suoYin + 1, JI_DIAO_YAN_JIN_SHUN_XU.length - 1)]
}
