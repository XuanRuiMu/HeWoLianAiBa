import type { MBTI类型 } from '@/types'

const MBTI_LIE_BIAO: MBTI类型[] = [
  'ISTJ',
  'ISFJ',
  'INFJ',
  'INTJ',
  'ISTP',
  'ISFP',
  'INFP',
  'INTP',
  'ESTP',
  'ESFP',
  'ENFP',
  'ENFJ',
  'ENTJ',
  'ESTJ',
  'ESFJ',
  'ENTP',
]

const GUAN_JIAN_CI: Array<{ zheng: string; ci: string[] }> = [
  { zheng: 'E', ci: ['外向', '社牛', '热情', '爱笑', '话痨', '自来熟', '表演', '领导', '开朗', '活泼', '社交', '交朋友'] },
  { zheng: 'I', ci: ['内向', '社恐', '安静', '慢热', '独处', '神秘', '治愈', '文静', '宅', '敏感'] },
  { zheng: 'S', ci: ['务实', '踏实', '可靠', '靠谱', '细节', '组织', '照顾', '实干', '稳重'] },
  { zheng: 'N', ci: ['直觉', '理想', '创新', '灵感', '战略', '好奇', '浪漫', '想象', '脑洞'] },
  { zheng: 'T', ci: ['逻辑', '理性', '分析', '果断', '指挥', '辩论', '冷静', '独立思考'] },
  { zheng: 'F', ci: ['温柔', '体贴', '共情', '温暖', '热心', '艺术', '善良', '感性', '照顾他人'] },
  { zheng: 'J', ci: ['计划', '高效', '自律', '果断', '组织者', '领导者', '条理', '守时'] },
  { zheng: 'P', ci: ['灵活', '随性', '自发', '享受当下', '自由', '随和', '乐观', '冒险'] },
]

export function congTongYongTiShiCiTuiCeXingGe(tiShiCi: string): MBTI类型 | null {
  if (typeof tiShiCi !== 'string' || tiShiCi.trim().length === 0) return null
  const deFen: Record<string, number> = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
  let mingZhong = 0
  for (const xiang of GUAN_JIAN_CI) {
    for (const guanJian of xiang.ci) {
      if (guanJian.length > 0 && tiShiCi.includes(guanJian)) {
        deFen[xiang.zheng] += guanJian.length
        mingZhong += 1
      }
    }
  }
  if (mingZhong === 0) return null
  const xuan = (a: string, b: string): string =>
    deFen[a] === deFen[b] ? b : deFen[a] > deFen[b] ? a : b
  const jieGuo = `${xuan('E', 'I')}${xuan('S', 'N')}${xuan('T', 'F')}${xuan('J', 'P')}`
  return (MBTI_LIE_BIAO as string[]).includes(jieGuo) ? (jieGuo as MBTI类型) : null
}
