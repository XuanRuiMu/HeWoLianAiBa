import { AI_PEI_ZHI } from './AI配置'
import type { MoXingCanShu } from './AI配置'
import type { AIJiaoSeXinXi } from '../types'

/**
 * 从 AI对象人设就地构造参数上下文的 jiaoSe 部分。
 * 全项目唯一的“人设 → 参数上下文”换算点（避免 FA_SAN_GUAN_JIAN_CI 与发散思维判定重复散落）。
 */
export function gouJianJiaoSeShangXiaWen(
  jiaoSe?: AIJiaoSeXinXi,
): CanShuShangXiaWen['jiaoSe'] {
  if (!jiaoSe) return undefined
  const wenBen = [jiaoSe.xing_ge, jiaoSe.yan_yu_feng_ge].filter(Boolean).join('')
  const faSan = FA_SAN_GUAN_JIAN_CI.some((ci) => wenBen.includes(ci))
  return {
    ie_lei_xing: jiaoSe.ie_lei_xing,
    re_shen_lei_xing: jiaoSe.re_shen_lei_xing,
    shi_fou_zha_xing: jiaoSe.shi_fou_zha_xing,
    xing_ge: jiaoSe.xing_ge,
    yan_yu_feng_ge: jiaoSe.yan_yu_feng_ge,
    shi_fou_fa_san_si_wei: faSan,
  }
}

/**
 * 动态参数上下文：由上游（FP-03 上下文贯通）传入 AI对象人设、关系阶段、当前场景。
 * 本文件仅消费该上下文，不做任何 AI 业务逻辑。
 */
export interface CanShuShangXiaWen {
  jiaoSe?: {
    ie_lei_xing?: 'I' | 'E'
    re_shen_lei_xing?: '慢热' | '快热'
    shi_fou_zha_xing?: boolean
    xing_ge?: string
    yan_yu_feng_ge?: string
    shi_fou_fa_san_si_wei?: boolean
  }
  haoGanDu?: { zong_fen?: number; guan_xi_jie_duan?: string }
  changJing?: 'riChang' | 'chaoJia' | 'biaoBai' | 'langMan' | 'anWei' | 'shenJingBing' | string
}

/** 慢热型好感度评判加成系数（方案A：抵消前期冷淡惩罚） */
export const MAN_RE_HAO_GAN_DU_JIA_CHENG = 1.15

/** 判断是否为慢热型 */
export function shiFouManRe(shangXiaWen?: CanShuShangXiaWen): boolean {
  return shangXiaWen?.jiaoSe?.re_shen_lei_xing === '慢热'
}

const WEN_DU_XIA_XIAN = 0
const WEN_DU_SHANG_XIAN = 2

const NUAN_XING = ['温柔', '浪漫', '热情', '活泼', '撒娇', '黏人', '黏']
const LI_XING = ['理性', '冷静', '严谨', '克制', '高冷', '毒舌', '冷漠']
const FA_SAN_GUAN_JIAN_CI = ['发散', '无厘头', '脑洞', '恶搞', '沙雕']

/** 创作类场景（top_p 兜底值偏高） */
const CHUANG_ZUO_LEI = new Set<string>([
  'writer',
  'junShiQiuZhu',
  'kaiChangBai',
  'fuPanShengCheng',
  'jiYiZhaiYao',
])

function hanHanPeiZhi(top_p: number | undefined, moXingLeiXing: keyof typeof AI_PEI_ZHI.moXing): number {
  if (typeof top_p === 'number') return top_p
  // 基座未配时按场景类别兜底：创作类 0.9、其余（评判/检测类）0.2
  return CHUANG_ZUO_LEI.has(moXingLeiXing) ? 0.9 : 0.2
}

function qianZhiWenDu(wenDu: number): number {
  const qianZhi = Math.min(WEN_DU_SHANG_XIAN, Math.max(WEN_DU_XIA_XIAN, wenDu))
  return Number(qianZhi.toFixed(2))
}

/**
 * 依据场景基座 + 人设修正 + 关系修正 + 场景修正，动态计算全部 AI 调用参数。
 * 不传 shangXiaWen 时仅用基座值（向后兼容，行为与旧固定值一致）。
 */
export function jiSuanAIChanShu(
  moXingLeiXing: keyof typeof AI_PEI_ZHI.moXing,
  shangXiaWen?: CanShuShangXiaWen,
): MoXingCanShu {
  const ji = AI_PEI_ZHI.moXing[moXingLeiXing]
  let wenDu = ji.wenDu

  const j = shangXiaWen?.jiaoSe
  if (j) {
    if (j.ie_lei_xing === 'E') wenDu += 0.1
    else if (j.ie_lei_xing === 'I') wenDu -= 0.05

    if (j.re_shen_lei_xing === '快热') wenDu += 0.05
    else if (j.re_shen_lei_xing === '慢热') wenDu -= 0.05

    if (j.shi_fou_zha_xing === true) wenDu += 0.05

    const wenBen = [j.xing_ge, j.yan_yu_feng_ge].filter(Boolean).join('')
    const faSan =
      j.shi_fou_fa_san_si_wei === true ||
      FA_SAN_GUAN_JIAN_CI.some((ci) => wenBen.includes(ci))
    if (faSan) wenDu += 0.05

    if (NUAN_XING.some((ci) => wenBen.includes(ci))) wenDu += 0.1
    if (LI_XING.some((ci) => wenBen.includes(ci))) wenDu -= 0.1
  }

  const guanXiJieDuan = shangXiaWen?.haoGanDu?.guan_xi_jie_duan
  if (guanXiJieDuan === 'reLian' || guanXiJieDuan === 'shenAi') wenDu += 0.05
  else if (guanXiJieDuan === 'lengDan' || guanXiJieDuan === 'shuYuan') wenDu -= 0.05

  const changJing = shangXiaWen?.changJing
  if (changJing === 'chaoJia') wenDu -= 0.15
  else if (changJing === 'biaoBai' || changJing === 'langMan') wenDu += 0.1
  else if (changJing === 'anWei') wenDu += 0.05

  wenDu = qianZhiWenDu(wenDu)

  return {
    moXing: ji.moXing,
    wenDu,
    top_p: hanHanPeiZhi(ji.top_p, moXingLeiXing),
    zuiDaTokens: ji.zuiDaTokens,
    siKaoMoShi: ji.siKaoMoShi,
    reasoningEffort: ji.reasoningEffort,
    xiangYingGeShi: ji.xiangYingGeShi,
  }
}
