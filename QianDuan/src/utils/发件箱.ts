import { baoCunShuJu, duQuShuJu } from './本地存储'

export interface DaiFaXiang {
  jian: string
  lei_xing: string
  zai_he: Record<string, unknown> & MiDengJianZaiTi
  shi_jian_chuo: number
}

export interface MiDengJianZaiTi {
  mi_deng_jian?: string | null
}

const UUID_GE_SHI = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function shengChengWenDingUUID(): string {
  const suiJiZiJie = new Uint8Array(16)
  const dianNa = globalThis.crypto
  if (dianNa && typeof dianNa.getRandomValues === 'function') {
    dianNa.getRandomValues(suiJiZiJie)
  } else {
    for (let yi = 0; yi < 16; yi++) suiJiZiJie[yi] = Math.floor(Math.random() * 256)
  }
  suiJiZiJie[6] = (suiJiZiJie[6] & 0x0f) | 0x40
  suiJiZiJie[8] = (suiJiZiJie[8] & 0x3f) | 0x80
  const shiLiu = Array.from(suiJiZiJie, (zi) => zi.toString(16).padStart(2, '0')).join('')
  return `${shiLiu.slice(0, 8)}-${shiLiu.slice(8, 12)}-${shiLiu.slice(12, 16)}-${shiLiu.slice(16, 20)}-${shiLiu.slice(20)}`
}

export function queDingMiDengJian<T extends MiDengJianZaiTi>(zaiTi: T): string {
  const xianYou = zaiTi.mi_deng_jian
  if (typeof xianYou === 'string' && UUID_GE_SHI.test(xianYou)) return xianYou
  const xin = shengChengWenDingUUID()
  zaiTi.mi_deng_jian = xin
  return xin
}

const FA_JIAN_XIANG_JIAN = 'fa-jian-xiang'
const JIAN_TING_ZHE = new Set<(shu: number) => void>()

function duQuLieBiao(): DaiFaXiang[] {
  return duQuShuJu<DaiFaXiang[]>(FA_JIAN_XIANG_JIAN, []) ?? []
}

function tongZhiBianGeng(): void {
  const shu = duQuLieBiao().length
  for (const ting of JIAN_TING_ZHE) {
    try {
      ting(shu)
    } catch {
      // 忽略监听失败
    }
  }
}

export function jiaRuFaJianXiang(
  lei_xing: string,
  zai_he: Record<string, unknown> & MiDengJianZaiTi,
): string {
  const jian = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  const lieBiao = duQuLieBiao()
  lieBiao.push({ jian, lei_xing, zai_he, shi_jian_chuo: Date.now() })
  baoCunShuJu(FA_JIAN_XIANG_JIAN, lieBiao.slice(-100))
  tongZhiBianGeng()
  return jian
}

export function yiChuFaJianXiang(jian: string): void {
  baoCunShuJu(
    FA_JIAN_XIANG_JIAN,
    duQuLieBiao().filter((x) => x.jian !== jian),
  )
  tongZhiBianGeng()
}

export function duQuDaiFaSongShu(): number {
  return duQuLieBiao().length
}

export function tiaoMuMiDengJian(jian: string): string | null {
  const lieBiao = duQuLieBiao()
  const xiang = lieBiao.find((x) => x.jian === jian)
  if (!xiang) return null
  const yiYou = xiang.zai_he.mi_deng_jian
  if (typeof yiYou === 'string' && UUID_GE_SHI.test(yiYou)) return yiYou
  const xin = shengChengWenDingUUID()
  xiang.zai_he.mi_deng_jian = xin
  baoCunShuJu(FA_JIAN_XIANG_JIAN, lieBiao)
  return xin
}

export function jianTingDaiFaSong(ting: (shu: number) => void): () => void {
  JIAN_TING_ZHE.add(ting)
  return () => {
    JIAN_TING_ZHE.delete(ting)
  }
}

export async function chongFaFaJianXiang(faSong: (xiang: DaiFaXiang) => Promise<unknown>): Promise<{ cheng_gong: number; shi_bai: number }> {
  const lieBiao = duQuLieBiao()
  let cheng_gong = 0
  let shi_bai = 0
  for (const xiang of lieBiao) {
    const miDengJian = tiaoMuMiDengJian(xiang.jian)
    if (miDengJian) xiang.zai_he.mi_deng_jian = miDengJian
    try {
      await faSong(xiang)
      yiChuFaJianXiang(xiang.jian)
      cheng_gong += 1
    } catch {
      shi_bai += 1
    }
  }
  return { cheng_gong, shi_bai }
}
