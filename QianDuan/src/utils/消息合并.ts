export interface HeBingXiaoXiXiang {
  id: string
  shi_jian_chuo: number
}

export function heBingXiaoXi<X extends HeBingXiaoXiXiang>(
  fuWuQi: X[],
  laiYuan: X[],
  keBaoLiu: (xiaoXi: X) => boolean = () => false,
): X[] {
  const yiCunId = new Set(fuWuQi.map((xiaoXi) => xiaoXi.id))
  const baoLiu = laiYuan.filter((xiaoXi) => !yiCunId.has(xiaoXi.id) && keBaoLiu(xiaoXi))
  return [...fuWuQi, ...baoLiu].sort(
    (a, b) => a.shi_jian_chuo - b.shi_jian_chuo || (a.id < b.id ? -1 : 1),
  )
}

export function tongJiDuiFangXinXiaoXi<X extends { id: string; fa_song_zhe_id: string }>(
  lieBiao: X[],
  yiCunId: Set<string>,
  woDeId: string,
): number {
  return lieBiao.filter(
    (xiaoXi) => !yiCunId.has(xiaoXi.id) && xiaoXi.fa_song_zhe_id !== woDeId,
  ).length
}
