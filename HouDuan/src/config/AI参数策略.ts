import { AiPeiZhi, yingYongHuiDuCanShu } from './AI配置'
import type { MoXingCanShu } from './AI配置'
import type { AIJiaoSeXinXi } from '../types'

export function gouJianJiaoSeShangXiaWen(
  jiaoSe?: AIJiaoSeXinXi,
): CanShuShangXiaWen['jiaoSe'] {
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

export const ManReHaoGanDuJiaCheng = 1.15

export function shiFouManRe(shangXiaWen?: CanShuShangXiaWen): boolean {
  return shangXiaWen?.jiaoSe?.re_shen_lei_xing === '慢热'
}

const WenDuXiaXian = 0
const WenDuShangXian = 2

export const XieShouWenDuShangXian = Math.min(
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
  moXingLeiXing: keyof typeof AiPeiZhi.moXing,
  shangXiaWen?: CanShuShangXiaWen,
): MoXingCanShu {
  const ji = AiPeiZhi.moXing[moXingLeiXing]

  if (ji.siKaoMoShi === 'enabled') {
    return yingYongHuiDuCanShu(moXingLeiXing, {
      moXing: ji.moXing,
      top_p: Math.max(TopPSiKaoXiaXian, ji.top_p ?? TopPSiKaoXiaXian),
      zuiDaTokens: ji.zuiDaTokens,
      siKaoMoShi: ji.siKaoMoShi,
      reasoningEffort: ji.reasoningEffort,
      xiangYingGeShi: ji.xiangYingGeShi,
    })
  }

  let wenDu = ji.wenDu ?? 0

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
      FaSanGuanJianCi.some((ci) => wenBen.includes(ci))
    if (faSan) wenDu += 0.05

    if (NuanXing.some((ci) => wenBen.includes(ci))) wenDu += 0.1
    if (LiXing.some((ci) => wenBen.includes(ci))) wenDu -= 0.1
  }

  const guanXiJieDuan = shangXiaWen?.haoGanDu?.guan_xi_jie_duan
  if (guanXiJieDuan === 'reLian' || guanXiJieDuan === 'shenAi') wenDu += 0.05
  else if (guanXiJieDuan === 'lengDan' || guanXiJieDuan === 'shuYuan') wenDu -= 0.05

  const changJing = shangXiaWen?.changJing
  if (changJing === 'chaoJia') wenDu -= 0.15
  else if (changJing === 'biaoBai' || changJing === 'langMan') wenDu += 0.1
  else if (changJing === 'anWei') wenDu += 0.05

  wenDu = qianZhiWenDu(wenDu)
  if (moXingLeiXing === 'XieShou') wenDu = Math.min(wenDu, XieShouWenDuShangXian)

  const jiChu: MoXingCanShu = {
    moXing: ji.moXing,
    wenDu,
    zuiDaTokens: ji.zuiDaTokens,
    siKaoMoShi: ji.siKaoMoShi,
    reasoningEffort: ji.reasoningEffort,
    xiangYingGeShi: ji.xiangYingGeShi,
  }
  return yingYongHuiDuCanShu(moXingLeiXing, jiChu)
}
