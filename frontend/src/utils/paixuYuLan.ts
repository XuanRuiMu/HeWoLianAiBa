// 拖拽实时预览核心算法（纯函数，便于单测）
//
// 设计要点：落点推算始终基于「拖拽开始时捕获的固定原始顺序与卡片中心坐标」，
// 而非实时 DOM 位置。这样即使预览过程中卡片因错位动画而移动，落点计算也不会
// 产生反馈抖动，且每次 pointermove 都是幂等的（从固定原始顺序重算，而非在
// 已变化的预览顺序上叠加）。

/**
 * 由指针 Y 坐标推算目标下标。
 * @param yuanXin 拖拽开始时按原始顺序捕获的各卡片垂直中心 Y（视口坐标系，固定不变）
 * @param zhiBiaoY 指针当前 Y 坐标
 * @param yuanSuoYin 被拖卡片在原始顺序中的下标
 * @returns 将「被拖卡片」从原位置移除后，应插入的下标（0..n-1）
 */
export function jiSuanMuBiaoSuoYin(
  yuanXin: number[],
  zhiBiaoY: number,
  yuanSuoYin: number,
): number {
  if (!Array.isArray(yuanXin) || yuanXin.length === 0) return yuanSuoYin
  // target = 在原始顺序中，指针位于其「中心之上」的第一张卡片的下标（插入点）
  let target = yuanXin.findIndex((center) => zhiBiaoY < center)
  if (target === -1) target = yuanXin.length
  // 换算为「移除被拖元素之后」的插入下标
  return yuanSuoYin < target ? target - 1 : target
}

/**
 * 由原始 id 顺序、源下标、目标下标，计算预览（最终）顺序。
 * 语义：把 yuanSuoYin 处的 id 取出，插入到 muBiaoSuoYin 处。
 */
export function jiSuanYuLanShunXu(
  yuanShiIds: string[],
  yuanSuoYin: number,
  muBiaoSuoYin: number,
): string[] {
  const ids = [...yuanShiIds]
  if (yuanSuoYin < 0 || yuanSuoYin >= ids.length) return ids
  const [yiDongId] = ids.splice(yuanSuoYin, 1)
  const muBiao = Math.max(0, Math.min(muBiaoSuoYin, ids.length))
  ids.splice(muBiao, 0, yiDongId)
  return ids
}
