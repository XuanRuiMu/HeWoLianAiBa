import { 令牌键, 刷新令牌键, 刷新令牌ID键 } from '@/constants/auth'

function anQuanDuQu(cunChu: Storage, jian: string): string | null {
  try {
    return cunChu.getItem(jian)
  } catch {
    return null
  }
}

function anQuanXieRu(cunChu: Storage, jian: string, zhi: string): void {
  try {
    cunChu.setItem(jian, zhi)
  } catch {
    console.error('存储数据失败')
  }
}

function anQuanShanChu(cunChu: Storage, jian: string): void {
  try {
    cunChu.removeItem(jian)
  } catch {
    console.error('存储数据失败')
  }
}

function keYongCunChu(): boolean {
  return typeof window !== 'undefined'
}

function huiHuaCunChu(): Storage | null {
  if (!keYongCunChu()) return null
  try {
    return sessionStorage
  } catch {
    return null
  }
}

export function duQuLingPai(): string | null {
  const cunChu = huiHuaCunChu()
  if (!cunChu) return null
  return anQuanDuQu(cunChu, 令牌键)
}

export function baoCunLingPai(lingPai: string, _chiJiu: boolean): void {
  void _chiJiu
  const cunChu = huiHuaCunChu()
  if (!cunChu) return
  anQuanXieRu(cunChu, 令牌键, lingPai)
}

export function qingChuLingPai(): void {
  const cunChu = huiHuaCunChu()
  if (!cunChu) return
  anQuanShanChu(cunChu, 令牌键)
}

export function duQuShuaXinLingPai(): { shuaXinLingPai: string | null; shuaXinLingPaiID: string | null } {
  const cunChu = huiHuaCunChu()
  if (!cunChu) return { shuaXinLingPai: null, shuaXinLingPaiID: null }
  const shuaXinLingPai = anQuanDuQu(cunChu, 刷新令牌键)
  const shuaXinLingPaiID = anQuanDuQu(cunChu, 刷新令牌ID键)
  return { shuaXinLingPai, shuaXinLingPaiID }
}

export function baoCunShuaXinLingPai(
  shuaXinLingPai: string | undefined,
  shuaXinLingPaiID: string | undefined,
  _chiJiu: boolean,
): void {
  void _chiJiu
  const cunChu = huiHuaCunChu()
  if (!cunChu) return
  if (shuaXinLingPai === undefined && shuaXinLingPaiID === undefined) return
  if (shuaXinLingPai !== undefined) {
    anQuanXieRu(cunChu, 刷新令牌键, shuaXinLingPai)
  }
  if (shuaXinLingPaiID !== undefined) {
    anQuanXieRu(cunChu, 刷新令牌ID键, shuaXinLingPaiID)
  }
}

export function qingChuShuaXinLingPai(): void {
  const cunChu = huiHuaCunChu()
  if (!cunChu) return
  anQuanShanChu(cunChu, 刷新令牌键)
  anQuanShanChu(cunChu, 刷新令牌ID键)
}
