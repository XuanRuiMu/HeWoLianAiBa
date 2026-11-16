import { shallowRef } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import { fanYi, huoQuFanYi } from '@/config/翻译表'
import { chuFaCuoWuShangBao } from '@/utils/错误上报'

export const JingSuHaoMiao = 60
export const GuoDuChaoShiHaoMiao = 8000
export const GuoDuRuChangHaoMiao = 2000

export type YuQuRenWu = (to: RouteLocationNormalized) => unknown

export interface YuJiaZaiPeiZhi {
  wenAn?: string
  renWu: YuQuRenWu[]
  zuJian?: () => Promise<unknown>
}

export type GuoDuJieDuan = 'guanBi' | 'ruChang' | 'tuiChang'

export interface GuoDuZhuangTai {
  jieDuan: GuoDuJieDuan
  wenAn: string
  banBen: number
  ruChangQiDian: number
  tuiChangQiDian: number
  tuiChangShiChang: number
  dongJieJinDu: number
}

const GuoDuWenAnFenLei = 'guoDuZaiRu' as const

let guoDuBanBen = 0

function guanBiZhuangTai(): GuoDuZhuangTai {
  return {
    jieDuan: 'guanBi',
    wenAn: '',
    banBen: guoDuBanBen,
    ruChangQiDian: 0,
    tuiChangQiDian: 0,
    tuiChangShiChang: 0,
    dongJieJinDu: 0,
  }
}

export const guoDuZhuangTai = shallowRef<GuoDuZhuangTai>(guanBiZhuangTai())

let luYouPiCi = 0

interface YuQuJiaoJieJiLu {
  piCi: number
  zhi: unknown
}

const jiaoJieCun = new Map<string, YuQuJiaoJieJiLu>()

export function tuiJinLuYouPiCi(): number {
  luYouPiCi += 1
  return luYouPiCi
}

export function jieXiGuoDuWenAn(wenAn: unknown): string {
  const ziDian = fanYi[GuoDuWenAnFenLei] as Record<string, string>
  if (typeof wenAn === 'string' && wenAn in ziDian) return ziDian[wenAn]
  return huoQuFanYi(GuoDuWenAnFenLei, 'moRen')
}

export function anJingHua<T>(chengNuo: Promise<T>): Promise<T> {
  void chengNuo.catch(() => undefined)
  return chengNuo
}

export function cunYuQuJiaoJie(luYouMing: unknown, zhi: unknown): void {
  if (typeof luYouMing !== 'string' || !luYouMing) return
  jiaoJieCun.set(luYouMing, { piCi: luYouPiCi, zhi })
}

export function quYuQuJiaoJie<T>(luYouMing: unknown): T | null {
  if (typeof luYouMing !== 'string' || !luYouMing) return null
  const jiLu = jiaoJieCun.get(luYouMing)
  if (!jiLu) return null
  jiaoJieCun.delete(luYouMing)
  if (jiLu.piCi !== luYouPiCi) return null
  return jiLu.zhi as T
}

function dengDaiHaoMiao(haoMiao: number): Promise<void> {
  return new Promise((jieJue) => {
    setTimeout(jieJue, haoMiao)
  })
}

function faQiRenWu(renWu: YuQuRenWu, to: RouteLocationNormalized): Promise<unknown> {
  return Promise.resolve()
    .then(() => renWu(to))
    .catch((cuoWu: unknown) => {
      chuFaCuoWuShangBao({
        leiBie: 'chengNuo',
        cuoWu,
        shiJianChuo: Date.now(),
        fuJia: { laiYuan: 'luYouYuQu' },
      })
      return null
    })
}

export function jieShuGuoDu(banBen: number): void {
  if (guoDuZhuangTai.value.banBen !== banBen) return
  guoDuZhuangTai.value = guanBiZhuangTai()
}

export async function kaiShiLuYouYuQu(
  peiZhi: YuJiaZaiPeiZhi,
  to: RouteLocationNormalized,
): Promise<void> {
  const jieZhi = Date.now() + GuoDuChaoShiHaoMiao
  const renWuChengNuo = peiZhi.renWu.map((renWu) => faQiRenWu(renWu, to))
  if (peiZhi.zuJian) renWuChengNuo.push(faQiRenWu(peiZhi.zuJian, to))
  const quanBu = Promise.all(renWuChengNuo)
  const yiJiuXu = await Promise.race([
    quanBu.then(() => true),
    dengDaiHaoMiao(JingSuHaoMiao).then(() => false),
  ])
  const benCiPiCi = luYouPiCi
  if (yiJiuXu || benCiPiCi !== luYouPiCi) {
    if (guoDuZhuangTai.value.jieDuan !== 'guanBi') guoDuZhuangTai.value = guanBiZhuangTai()
    return
  }

  const banBen = ++guoDuBanBen
  const ruChangQiDian = Date.now()
  guoDuZhuangTai.value = {
    jieDuan: 'ruChang',
    wenAn: jieXiGuoDuWenAn(peiZhi.wenAn),
    banBen,
    ruChangQiDian,
    tuiChangQiDian: 0,
    tuiChangShiChang: 0,
    dongJieJinDu: 0,
  }

  try {
    await Promise.race([
      quanBu,
      dengDaiHaoMiao(Math.max(0, jieZhi - Date.now())),
    ])
  } finally {
    if (benCiPiCi === luYouPiCi && guoDuZhuangTai.value.banBen === banBen) {
      const yiBoFang = Math.min(Math.max(0, Date.now() - ruChangQiDian), GuoDuRuChangHaoMiao)
      guoDuZhuangTai.value = {
        jieDuan: 'tuiChang',
        wenAn: guoDuZhuangTai.value.wenAn,
        banBen,
        ruChangQiDian,
        tuiChangQiDian: Date.now(),
        tuiChangShiChang: yiBoFang,
        dongJieJinDu: yiBoFang / GuoDuRuChangHaoMiao,
      }
      void dengDaiHaoMiao(yiBoFang + 240).then(() => jieShuGuoDu(banBen))
    }
  }
}

export function zhongZhiYuQu(): void {
  luYouPiCi += 1
  jiaoJieCun.clear()
  guoDuZhuangTai.value = guanBiZhuangTai()
}
