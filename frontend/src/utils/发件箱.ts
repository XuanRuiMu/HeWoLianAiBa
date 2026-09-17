// YH-098 离线发件箱：断网写操作进outbox，恢复后重发+冲突提示，禁静默分叉
// 根因：断网写的东西静默分叉；收敛为localStorage持久化outbox+恢复重发
import { baoCunShuJu, duQuShuJu } from './storage'

export interface DaiFaXiang {
  jian: string
  lei_xing: string
  zai_he: Record<string, unknown>
  shi_jian_chuo: number
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

export function jiaRuFaJianXiang(lei_xing: string, zai_he: Record<string, unknown>): string {
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
