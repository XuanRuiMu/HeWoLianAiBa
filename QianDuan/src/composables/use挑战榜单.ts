import { ref, type Ref } from 'vue'
import { huoQuPaiHangBang, type PaiHangXiangMu, type ZuBie } from '@/api/挑战'

export const tiaoZhanZuBieLieBiao: readonly ZuBie[] = ['nan_nv', 'nv_nan', 'nan_nan', 'nv_nv']

export type FanYeGuoDuMing = 'fanYe-qianJin' | 'fanYe-houTui'

export interface Use挑战榜单返回值 {
  bangDanHuanCun: Ref<Map<ZuBie, PaiHangXiangMu[]>>
  yuQuZhong: Ref<boolean>
  yuQuQuanBu: (zuBieLieBiao?: readonly ZuBie[]) => Promise<void>
  huoQuZuBangDan: (zuBie: ZuBie) => Promise<PaiHangXiangMu[]>
  qingChu: () => void
}

export function zuBieSuoYin(zuBie: ZuBie): number {
  const suoYin = tiaoZhanZuBieLieBiao.indexOf(zuBie)
  return suoYin < 0 ? 0 : suoYin
}

export function qieZuFanYeGuoDuMing(旧组别: ZuBie, 新组别: ZuBie): FanYeGuoDuMing {
  return zuBieSuoYin(新组别) >= zuBieSuoYin(旧组别) ? 'fanYe-qianJin' : 'fanYe-houTui'
}

const bangDanHuanCun = ref(new Map<ZuBie, PaiHangXiangMu[]>())
const yuQuZhong = ref(false)
const zaiTuQingQiu = new Map<ZuBie, Promise<PaiHangXiangMu[]>>()
let huanCunDaiCi = 0

function faQiZuQingQiu(zuBie: ZuBie, daiCi: number): Promise<PaiHangXiangMu[]> {
  const qingQiu = huoQuPaiHangBang(zuBie)
    .then((jieGuo) => {
      if (daiCi === huanCunDaiCi) bangDanHuanCun.value.set(zuBie, jieGuo)
      return jieGuo
    })
    .finally(() => {
      if (zaiTuQingQiu.get(zuBie) === qingQiu) zaiTuQingQiu.delete(zuBie)
    })
  zaiTuQingQiu.set(zuBie, qingQiu)
  return qingQiu
}

export function use挑战榜单(): Use挑战榜单返回值 {
  async function yuQuQuanBu(zuBieLieBiao: readonly ZuBie[] = tiaoZhanZuBieLieBiao): Promise<void> {
    const daiBan = zuBieLieBiao.filter(
      (zuBie) => !bangDanHuanCun.value.has(zuBie) && !zaiTuQingQiu.has(zuBie),
    )
    if (daiBan.length === 0) return
    yuQuZhong.value = true
    await Promise.allSettled(daiBan.map((zuBie) => faQiZuQingQiu(zuBie, huanCunDaiCi)))
    yuQuZhong.value = false
  }

  async function huoQuZuBangDan(zuBie: ZuBie): Promise<PaiHangXiangMu[]> {
    const huanCun = bangDanHuanCun.value.get(zuBie)
    if (huanCun !== undefined) return huanCun
    const zaiTu = zaiTuQingQiu.get(zuBie)
    if (zaiTu) {
      try {
        return await zaiTu
      } catch {
        return faQiZuQingQiu(zuBie, huanCunDaiCi)
      }
    }
    return faQiZuQingQiu(zuBie, huanCunDaiCi)
  }

  function qingChu(): void {
    huanCunDaiCi += 1
    bangDanHuanCun.value = new Map()
    zaiTuQingQiu.clear()
    yuQuZhong.value = false
  }

  return {
    bangDanHuanCun,
    yuQuZhong,
    yuQuQuanBu,
    huoQuZuBangDan,
    qingChu,
  }
}
