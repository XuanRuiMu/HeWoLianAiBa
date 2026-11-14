import { shallowRef } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import { fanYi, huoQuFanYi } from '@/config/翻译表'
import { chuFaCuoWuShangBao } from '@/utils/错误上报'

export const JingSuHaoMiao = 60
export const GuoDuZuiDuanZhanShiHaoMiao = 400
export const GuoDuChaoShiHaoMiao = 8000

export type YuQuRenWu = (to: RouteLocationNormalized) => unknown

export interface YuJiaZaiPeiZhi {
  wenAn?: string
  renWu: YuQuRenWu[]
  zuJian?: () => Promise<unknown>
}

export interface GuoDuZhuangTai {
  jinXingZhong: boolean
  wenAn: string
}

const GuoDuWenAnFenLei = 'guoDuZaiRu' as const

export const guoDuZhuangTai = shallowRef<GuoDuZhuangTai>({ jinXingZhong: false, wenAn: '' })

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
  if (yiJiuXu || benCiPiCi !== luYouPiCi) return
  guoDuZhuangTai.value = { jinXingZhong: true, wenAn: jieXiGuoDuWenAn(peiZhi.wenAn) }
  const zhanShiKaiShi = Date.now()
  try {
    await Promise.race([
      quanBu,
      dengDaiHaoMiao(Math.max(0, jieZhi - Date.now())),
    ])
  } finally {
    if (benCiPiCi === luYouPiCi) {
      const shengYu = Math.max(0, GuoDuZuiDuanZhanShiHaoMiao - (Date.now() - zhanShiKaiShi))
      if (shengYu > 0) await dengDaiHaoMiao(shengYu)
      if (benCiPiCi === luYouPiCi) guoDuZhuangTai.value = { jinXingZhong: false, wenAn: '' }
    }
  }
}

export function zhongZhiYuQu(): void {
  luYouPiCi += 1
  jiaoJieCun.clear()
  guoDuZhuangTai.value = { jinXingZhong: false, wenAn: '' }
}
