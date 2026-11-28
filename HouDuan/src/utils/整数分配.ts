export function 按权重分配整数(目标: number, 权重: readonly number[]): number[] {
  if (权重.length === 0) return []
  if (!Number.isFinite(目标)) return 权重.map(() => 0)
  const 权重和 = 权重.reduce((合计, 值) => 合计 + (Number.isFinite(值) && 值 > 0 ? 值 : 0), 0)
  if (权重和 <= 0) return 权重.map(() => 0)
  const 非负目标 = Math.max(0, 目标)
  const 精确值 = 权重.map((值) => (Number.isFinite(值) && 值 > 0 ? 非负目标 * 值 / 权重和 : 0))
  const 结果 = 精确值.map(Math.floor)
  let 余数 = Math.max(0, Math.round(非负目标) - 结果.reduce((合计, 值) => 合计 + 值, 0))
  const 顺序 = 精确值
    .map((值, 序号) => ({ 序号, 小数: 值 - Math.floor(值) }))
    .sort((甲, 乙) => 乙.小数 - 甲.小数 || 甲.序号 - 乙.序号)
  for (let 序号 = 0; 余数 > 0; 序号 += 1, 余数 -= 1) {
    结果[顺序[序号 % 顺序.length].序号] += 1
  }
  return 结果
}

export interface 四维分数 {
  xin_ren_du: number
  qin_mi_du: number
  qu_wei_du: number
  guan_huai_du: number
}

export interface 四维与总分 extends 四维分数 {
  zong_fen: number
}

function 取整(值: number): number {
  return Number.isFinite(值) ? Math.round(值) : 0
}

export function 四维之和(四维: 四维分数): number {
  return 取整(四维.xin_ren_du) + 取整(四维.qin_mi_du) + 取整(四维.qu_wei_du) + 取整(四维.guan_huai_du)
}

export function 归一四维(四维: 四维分数, 下界: number, 上界: number): 四维与总分 {
  const 下限 = Math.max(0, 取整(下界))
  const 上限 = Math.max(下限, 取整(上界))
  const 非负 = {
    xin_ren_du: Math.max(0, 取整(四维.xin_ren_du)),
    qin_mi_du: Math.max(0, 取整(四维.qin_mi_du)),
    qu_wei_du: Math.max(0, 取整(四维.qu_wei_du)),
    guan_huai_du: Math.max(0, 取整(四维.guan_huai_du)),
  }
  const 权重 = [非负.xin_ren_du, 非负.qin_mi_du, 非负.qu_wei_du, 非负.guan_huai_du]
  const 和 = 权重.reduce((合计, 值) => 合计 + 值, 0)
  if (和 >= 下限 && 和 <= 上限) return { ...非负, zong_fen: 和 }

  const 目标 = 和 > 上限 ? 上限 : 下限
  const 有效权重 = 和 > 0 ? 权重 : [1, 1, 1, 1]
  const 分配 = 按权重分配整数(目标, 有效权重)
  const 结果 = {
    xin_ren_du: 分配[0] ?? 0,
    qin_mi_du: 分配[1] ?? 0,
    qu_wei_du: 分配[2] ?? 0,
    guan_huai_du: 分配[3] ?? 0,
  }
  return { ...结果, zong_fen: 结果.xin_ren_du + 结果.qin_mi_du + 结果.qu_wei_du + 结果.guan_huai_du }
}
