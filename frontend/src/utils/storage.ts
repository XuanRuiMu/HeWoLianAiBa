const QIAN_ZUI = 'hewolianba_'

export function baoCunShuJu(jian: string, zhi: unknown): void {
  try {
    localStorage.setItem(QIAN_ZUI + jian, JSON.stringify(zhi))
  } catch {
    console.error('存储数据失败')
  }
}

export function duQuShuJu<T>(jian: string, moRenZhi: T | null = null): T | null {
  try {
    const cunChuZhi = localStorage.getItem(QIAN_ZUI + jian)
    if (cunChuZhi === null) return moRenZhi
    return JSON.parse(cunChuZhi) as T
  } catch {
    return moRenZhi
  }
}

export function shanChuShuJu(jian: string): void {
  localStorage.removeItem(QIAN_ZUI + jian)
}

export function qingKongSuoYouShuJu(): void {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(QIAN_ZUI))
  keys.forEach((k) => localStorage.removeItem(k))
}
