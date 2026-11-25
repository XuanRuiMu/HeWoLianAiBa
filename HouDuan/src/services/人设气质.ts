import { 表情人设气质词库 } from '../config/表情包配置'
import type { AIJiaoSeXinXi } from '../types'

export function tuiDaoRenSheQiZhi(jiaoSe?: Partial<AIJiaoSeXinXi>): string[] {
  if (!jiaoSe) return ['通用']
  const wenBen = [
    jiaoSe.xing_ge,
    jiaoSe.yan_yu_feng_ge,
    jiaoSe.xing_wei_te_dian,
    jiaoSe.bei_jing_gu_shi,
    jiaoSe.mbti_lei_xing,
    Array.isArray(jiaoSe.hua_shu) ? jiaoSe.hua_shu.join('') : '',
  ].filter((x): x is string => typeof x === 'string').join(' ').toLowerCase()
  const qiZhi = new Set<string>()
  for (const [ming, ciLie] of Object.entries(表情人设气质词库)) {
    if (ciLie.some((ci) => wenBen.includes(ci.toLowerCase()))) qiZhi.add(ming)
  }
  if (qiZhi.size === 0) qiZhi.add('通用')
  return [...qiZhi]
}
