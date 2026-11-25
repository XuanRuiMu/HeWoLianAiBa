export function guJiZiFuShu(ziFuChuan: string): number {
  return typeof ziFuChuan === 'string' ? ziFuChuan.length : 0
}

export function ziFuShuZhuanTokenShu(ziFuShu: number): number {
  if (!Number.isFinite(ziFuShu) || ziFuShu <= 0) return 0
  return Math.ceil(ziFuShu * 0.6)
}

export function guJiTokenShu(ziFuChuan: string): number {
  return ziFuShuZhuanTokenShu(guJiZiFuShu(ziFuChuan))
}
