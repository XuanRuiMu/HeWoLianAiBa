export interface 重排输入 {
  当前用户短句: string
  关系阶段序号: number
  人设气质: readonly string[]
  最近发送: readonly string[]
  语义分?: number
  随机数: () => number
  候选: Array<{
    duanMing: string
    qingXuBiaoQian?: string
    miaoShu?: string
    shiYongChangJing?: string
    renSheQiZhi?: string[]
    fengGe?: string
    guanXiJieDuanXiaXian?: number
  }>
}

export interface 带权候选 {
  duanMing: string
  加权分: number
  语义相似度: number
  关系奖励: number
  新鲜度奖励: number
  重复惩罚: number
}

const 人设奖励 = {
  沙雕搞怪: 0.025,
  可爱萌系: 0.018,
  温柔治愈: 0.016,
  高冷毒舌: 0.012,
  正经严肃: 0.010,
  文艺清新: 0.014,
  热血燃系: 0.012,
} as const

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function 计算语义奖励(列表: number[]): number {
  if (列表.length === 0) return 0.06
  const avg = 列表.reduce((a, b) => a + b, 0) / 列表.length
  return Math.max(0.06, 0.12 * clamp01(avg))
}

export function 语义加权候选(params: 重排输入): Array<带权候选> {
  const wenBen = params.当前用户短句.trim().toLowerCase()
  return params.候选.map((候选) => {
    const qingXu = Array.isArray(候选.renSheQiZhi) && 候选.renSheQiZhi.length > 0 ? 候选.renSheQiZhi : ['通用']
    const pei = qingXu.some((x) => params.人设气质.includes(x))
    const wenBenBonus = wenBen !== '' && (
      候选.duanMing.toLowerCase().includes(wenBen) ||
      (候选.miaoShu ?? '').toLowerCase().includes(wenBen) ||
      (候选.shiYongChangJing ?? '').toLowerCase().includes(wenBen)
    ) ? 0.14 : 0
    const wenBen提示 = pei ? 0.05 : 0.01
    const guanXiScore = Math.max(0, Math.min(1, (候选.guanXiJieDuanXiaXian ?? 0) / Math.max(1, params.关系阶段序号))) * 0.04
    const xinXian = params.最近发送.includes(候选.duanMing) ? -0.035 : 0.05
    const yiJingCount = params.最近发送.filter((x) => x === 候选.duanMing).length
    const 重复 = yiJingCount > 1 ? Math.min(0.10, yiJingCount * 0.018) : 0
    const 人设加成 = qingXu.reduce((total, x) => total + (人设奖励[x as keyof typeof 人设奖励] ?? 0), 0)
    const randomJitter = params.随机数() * 0.01
    return {
      duanMing: 候选.duanMing,
      加权分: 0.62 * 计算语义奖励([params.语义分 ?? 0.6]) + 人设加成 + wenBenBonus + wenBen提示 + guanXiScore + xinXian + 重复 * -1 + randomJitter,
      语义相似度: params.语义分 ?? 0.6,
      关系奖励: guanXiScore,
      新鲜度奖励: xinXian,
      重复惩罚: 重复,
    }
  }).sort((a, b) => b.加权分 - a.加权分)
}
