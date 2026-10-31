import { 令牌键, 刷新令牌键, 刷新令牌ID键 } from '@/constants/认证键'

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

function chiJiuCunChu(): Storage | null {
  if (!keYongCunChu()) return null
  try {
    return localStorage
  } catch {
    return null
  }
}

export function duQuLingPai(): string | null {
  const huiHua = huiHuaCunChu()
  const huiHuaZhi = huiHua ? anQuanDuQu(huiHua, 令牌键) : null
  if (huiHuaZhi !== null) return huiHuaZhi
  const chiJiu = chiJiuCunChu()
  return chiJiu ? anQuanDuQu(chiJiu, 令牌键) : null
}

export function baoCunLingPai(lingPai: string, chiJiu: boolean): void {
  const huiHua = huiHuaCunChu()
  const chiJiuCun = chiJiuCunChu()
  if (chiJiu) {
    if (chiJiuCun) anQuanXieRu(chiJiuCun, 令牌键, lingPai)
    if (huiHua) anQuanShanChu(huiHua, 令牌键)
    return
  }
  if (huiHua) anQuanXieRu(huiHua, 令牌键, lingPai)
  if (chiJiuCun) anQuanShanChu(chiJiuCun, 令牌键)
}

export function qingChuLingPai(): void {
  const huiHua = huiHuaCunChu()
  if (huiHua) anQuanShanChu(huiHua, 令牌键)
  const chiJiu = chiJiuCunChu()
  if (chiJiu) anQuanShanChu(chiJiu, 令牌键)
}

export function duQuShuaXinLingPai(): { shuaXinLingPai: string | null; shuaXinLingPaiID: string | null } {
  const huiHua = huiHuaCunChu()
  if (huiHua) {
    const shuaXinLingPai = anQuanDuQu(huiHua, 刷新令牌键)
    if (shuaXinLingPai !== null) {
      return { shuaXinLingPai, shuaXinLingPaiID: anQuanDuQu(huiHua, 刷新令牌ID键) }
    }
  }
  const chiJiu = chiJiuCunChu()
  if (!chiJiu) return { shuaXinLingPai: null, shuaXinLingPaiID: null }
  return { shuaXinLingPai: anQuanDuQu(chiJiu, 刷新令牌键), shuaXinLingPaiID: anQuanDuQu(chiJiu, 刷新令牌ID键) }
}

export function shiChiJiuHuiHua(): boolean {
  const chiJiu = chiJiuCunChu()
  return !!chiJiu && anQuanDuQu(chiJiu, 刷新令牌键) !== null
}

export function baoCunShuaXinLingPai(
  shuaXinLingPai: string | undefined,
  shuaXinLingPaiID: string | undefined,
  chiJiu: boolean,
): void {
  if (shuaXinLingPai === undefined && shuaXinLingPaiID === undefined) return
  const muBiao = chiJiu ? chiJiuCunChu() : huiHuaCunChu()
  const lingYi = chiJiu ? huiHuaCunChu() : chiJiuCunChu()
  if (!muBiao) return
  if (shuaXinLingPai !== undefined) {
    anQuanXieRu(muBiao, 刷新令牌键, shuaXinLingPai)
    if (lingYi) anQuanShanChu(lingYi, 刷新令牌键)
  }
  if (shuaXinLingPaiID !== undefined) {
    anQuanXieRu(muBiao, 刷新令牌ID键, shuaXinLingPaiID)
    if (lingYi) anQuanShanChu(lingYi, 刷新令牌ID键)
  }
}

export function qingChuShuaXinLingPai(): void {
  const huiHua = huiHuaCunChu()
  if (huiHua) {
    anQuanShanChu(huiHua, 刷新令牌键)
    anQuanShanChu(huiHua, 刷新令牌ID键)
  }
  const chiJiu = chiJiuCunChu()
  if (chiJiu) {
    anQuanShanChu(chiJiu, 刷新令牌键)
    anQuanShanChu(chiJiu, 刷新令牌ID键)
  }
}
