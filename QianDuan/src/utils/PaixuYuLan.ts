
export function jiSuanMuBiaoSuoYin(
  yuanXin: number[],
  zhiBiaoY: number,
  yuanSuoYin: number,
): number {
  if (!Array.isArray(yuanXin) || yuanXin.length === 0) return yuanSuoYin
  let target = yuanXin.findIndex((center) => zhiBiaoY < center)
  if (target === -1) target = yuanXin.length
  return yuanSuoYin < target ? target - 1 : target
}

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
