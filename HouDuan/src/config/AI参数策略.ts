import { AI配置, yingYongHuiDuCanShu } from './AI配置'
import { GuiFanGuanXiJieDuanMing } from './好感度配置'
import type { MoXingCanShu } from './AI配置'
import type { AIJiaoSeXinXi } from '../types'

export function gouJianJiaoSeShangXiaWen(
  jiaoSe?: AIJiaoSeXinXi,
): 参数上下文['jiaoSe'] {
  if (!jiaoSe) return undefined
  const wenBen = [jiaoSe.xing_ge, jiaoSe.yan_yu_feng_ge].filter(Boolean).join('')
  const faSan = FaSanGuanJianCi.some((ci) => wenBen.includes(ci))
  return {
    ie_lei_xing: jiaoSe.ie_lei_xing,
    re_shen_lei_xing: jiaoSe.re_shen_lei_xing,
    shi_fou_zha_xing: jiaoSe.shi_fou_zha_xing,
    xing_ge: jiaoSe.xing_ge,
    yan_yu_feng_ge: jiaoSe.yan_yu_feng_ge,
    shi_fou_fa_san_si_wei: faSan,
  }
}

export interface 参数上下文 {
  jiaoSe?: {
    ie_lei_xing?: 'I' | 'E'
    re_shen_lei_xing?: '慢热' | '快热'
    shi_fou_zha_xing?: boolean
    xing_ge?: string
    yan_yu_feng_ge?: string
    shi_fou_fa_san_si_wei?: boolean
  }
  haoGanDu?: { zong_fen?: number; guan_xi_jie_duan?: string }
  haoGanDu阶段?: string
  changJing?: 'riChang' | 'chaoJia' | 'biaoBai' | 'langMan' | 'anWei' | 'shenJingBing' | string
}

export const ManReHaoGanDuJiaCheng = 1.15

export function shiFouManRe(shangXiaWen?: 参数上下文): boolean {
  return shangXiaWen?.jiaoSe?.re_shen_lei_xing === '慢热'
}

const WenDuXiaXian = 0
const WenDuShangXian = 2

export const 写手温度ShangXian = Math.min(
  WenDuShangXian,
  Math.max(0, parseFloat(process.env['WRITER_WENDU_SHANG_XIAN'] || '1.15') || 1.15),
)

const NuanXing = ['温柔', '浪漫', '热情', '活泼', '撒娇', '黏人', '黏']
const LiXing = ['理性', '冷静', '严谨', '克制', '高冷', '毒舌', '冷漠']
const FaSanGuanJianCi = ['发散', '无厘头', '脑洞', '恶搞', '沙雕']

const TopPSiKaoXiaXian = 0.95

function qianZhiWenDu(wenDu: number): number {
  const qianZhi = Math.min(WenDuShangXian, Math.max(WenDuXiaXian, wenDu))
  return Number(qianZhi.toFixed(2))
}

export function jiSuanAIChanShu(
  模型类型: keyof typeof AI配置.模型,
  shangXiaWen?: 参数上下文,
): MoXingCanShu {
  const ji = AI配置.模型[模型类型]

  if (ji.思考模式 === 'enabled' || 模型类型 === 'JunShiQiuZhu') {
    return yingYongHuiDuCanShu(模型类型, {
      模型: ji.模型,
      top_p: Math.max(TopPSiKaoXiaXian, ji.top_p ?? TopPSiKaoXiaXian),
      最大Tokens: ji.最大Tokens,
      思考模式: ji.思考模式,
      思考强度: ji.思考强度,
      响应格式: ji.响应格式,
      上下文预算: ji.上下文预算,
    })
  }

  let wenDu = ji.wenDu ?? 0

  const j = shangXiaWen?.jiaoSe
  if (j) {
    if (j.ie_lei_xing === 'E') wenDu += 0
    else if (j.ie_lei_xing === 'I') wenDu -= 0

    if (j.re_shen_lei_xing === '快热') wenDu += 0
    else if (j.re_shen_lei_xing === '慢热') wenDu -= 0

    if (j.shi_fou_zha_xing === true) wenDu += 0

    const wenBen = [j.xing_ge, j.yan_yu_feng_ge].filter(Boolean).join('')
    const faSan =
      j.shi_fou_fa_san_si_wei === true ||
      FaSanGuanJianCi.some((ci) => wenBen.includes(ci))
    if (faSan) wenDu += 0

    if (NuanXing.some((ci) => wenBen.includes(ci))) wenDu += 0
    if (LiXing.some((ci) => wenBen.includes(ci))) wenDu -= 0
  }

  const guanXiJieDuan = shangXiaWen?.haoGanDu?.guan_xi_jie_duan ?? ''
  const jieDuanMing = GuiFanGuanXiJieDuanMing(guanXiJieDuan)
  if (jieDuanMing === '热恋' || jieDuanMing === '深爱') wenDu += 0
  else if (jieDuanMing === '冷淡' || jieDuanMing === '疏远') wenDu += 0

  const changJing = shangXiaWen?.changJing
  if (changJing === 'chaoJia') wenDu += 0
  else if (changJing === 'biaoBai' || changJing === 'langMan') wenDu += 0
  else if (changJing === 'anWei') wenDu += 0

  wenDu = qianZhiWenDu(wenDu)
  if (模型类型 === 'XieShou') wenDu = Math.min(wenDu, 写手温度ShangXian)

  const jiChu: MoXingCanShu = {
    模型: ji.模型,
    wenDu,
    最大Tokens: ji.最大Tokens,
    思考模式: ji.思考模式,
    思考强度: ji.思考强度,
    响应格式: ji.响应格式,
    上下文预算: ji.上下文预算,
  }
  return yingYongHuiDuCanShu(模型类型, jiChu)
}
