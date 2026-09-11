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

export function duQuLingPai(): string | null {
  if (!keYongCunChu()) return null
  return anQuanDuQu(localStorage, 令牌键) ?? anQuanDuQu(sessionStorage, 令牌键)
}

export function baoCunLingPai(lingPai: string, chiJiu: boolean): void {
  if (!keYongCunChu()) return
  if (chiJiu) {
    anQuanXieRu(localStorage, 令牌键, lingPai)
    anQuanShanChu(sessionStorage, 令牌键)
  } else {
    anQuanXieRu(sessionStorage, 令牌键, lingPai)
    anQuanShanChu(localStorage, 令牌键)
  }
}

export function qingChuLingPai(): void {
  if (!keYongCunChu()) return
  anQuanShanChu(localStorage, 令牌键)
  anQuanShanChu(sessionStorage, 令牌键)
}

export function duQuShuaXinLingPai(): { shuaXinLingPai: string | null; shuaXinLingPaiID: string | null } {
  if (!keYongCunChu()) return { shuaXinLingPai: null, shuaXinLingPaiID: null }
  const shuaXinLingPai =
    anQuanDuQu(localStorage, 刷新令牌键) ?? anQuanDuQu(sessionStorage, 刷新令牌键)
  const shuaXinLingPaiID =
    anQuanDuQu(localStorage, 刷新令牌ID键) ?? anQuanDuQu(sessionStorage, 刷新令牌ID键)
  return { shuaXinLingPai, shuaXinLingPaiID }
}

export function baoCunShuaXinLingPai(
  shuaXinLingPai: string | undefined,
  shuaXinLingPaiID: string | undefined,
  chiJiu: boolean,
): void {
  if (!keYongCunChu()) return
  if (shuaXinLingPai === undefined && shuaXinLingPaiID === undefined) return
  const xieRu = chiJiu ? localStorage : sessionStorage
  const lingYiGe = chiJiu ? sessionStorage : localStorage
  if (shuaXinLingPai !== undefined) {
    anQuanXieRu(xieRu, 刷新令牌键, shuaXinLingPai)
    anQuanShanChu(lingYiGe, 刷新令牌键)
  }
  if (shuaXinLingPaiID !== undefined) {
    anQuanXieRu(xieRu, 刷新令牌ID键, shuaXinLingPaiID)
    anQuanShanChu(lingYiGe, 刷新令牌ID键)
  }
}

export function qingChuShuaXinLingPai(): void {
  if (!keYongCunChu()) return
  anQuanShanChu(localStorage, 刷新令牌键)
  anQuanShanChu(sessionStorage, 刷新令牌键)
  anQuanShanChu(localStorage, 刷新令牌ID键)
  anQuanShanChu(sessionStorage, 刷新令牌ID键)
}
