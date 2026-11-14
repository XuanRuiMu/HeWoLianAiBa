const QianZui = 'hewolianba_'

export function baoCunShuJu(jian: string, zhi: unknown): void {
  try {
    localStorage.setItem(QianZui + jian, JSON.stringify(zhi))
  } catch {

    console.error('存储数据失败')
  }
}

export function duQuShuJu<T>(jian: string, moRenZhi: T | null = null): T | null {
  try {
    const cunChuZhi = localStorage.getItem(QianZui + jian)
    if (cunChuZhi === null) return moRenZhi
    return JSON.parse(cunChuZhi) as T
  } catch {
    return moRenZhi
  }
}

export function shanChuShuJu(jian: string): void {
  localStorage.removeItem(QianZui + jian)
}

export function qingKongSuoYouShuJu(): void {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(QianZui))
  keys.forEach((k) => localStorage.removeItem(k))
}
