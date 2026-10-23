import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/翻译表'
import type { 消息 } from '@/types/类型定义'

export interface ShiJianZaiTi {
  shi_jian_chuo: number
}

export interface XiaoXiFenZuXiang<X extends ShiJianZaiTi = 消息> {
  shiJian: string
  shiJianChuo: number
  xiaoXiLieBiao: X[]
}

function zhuanBeiJing(shiJianChuo: number): Date {
  const riQi = new Date(shiJianChuo)
  const utc = riQi.getTime() + riQi.getTimezoneOffset() * 60000
  return new Date(utc + 8 * 3600000)
}

export function geShiHuaXiaoXiShiJian(beiJing: Date, xianZai: Date): string {
  const shi = String(beiJing.getHours()).padStart(2, '0')
  const fen = String(beiJing.getMinutes()).padStart(2, '0')
  const shiJianBuFen = `${shi}:${fen}`

  if (tongYiRi(beiJing, xianZai)) {
    return shiJianBuFen
  }

  const zuoTian = new Date(xianZai.getTime() - 24 * 3600000)
  if (tongYiRi(beiJing, zuoTian)) {
    return `${huoQuFanYi('shiJian', 'zuoTian')} ${shiJianBuFen}`
  }

  const benZhouKaiShi = new Date(xianZai.getTime())
  benZhouKaiShi.setDate(xianZai.getDate() - xianZai.getDay() + 1)
  benZhouKaiShi.setHours(0, 0, 0, 0)
  if (beiJing.getTime() >= benZhouKaiShi.getTime()) {
    const xingQiLieBiao = [
      huoQuFanYi('shiJian', 'xingQiRi'),
      huoQuFanYi('shiJian', 'xingQiYi'),
      huoQuFanYi('shiJian', 'xingQiEr'),
      huoQuFanYi('shiJian', 'xingQiSan'),
      huoQuFanYi('shiJian', 'xingQiSi'),
      huoQuFanYi('shiJian', 'xingQiWu'),
      huoQuFanYi('shiJian', 'xingQiLiu'),
    ]
    return `${xingQiLieBiao[beiJing.getDay()]} ${shiJianBuFen}`
  }

  const yue = String(beiJing.getMonth() + 1).padStart(2, '0')
  const ri = String(beiJing.getDate()).padStart(2, '0')
  if (beiJing.getFullYear() === xianZai.getFullYear()) {
    return `${yue}-${ri} ${shiJianBuFen}`
  }

  return `${beiJing.getFullYear()}-${yue}-${ri} ${shiJianBuFen}`
}

function tongYiRi(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function fenZuXiaoXiAnShiJian<X extends ShiJianZaiTi>(
  lieBiao: X[],
): XiaoXiFenZuXiang<X>[] {
  if (!Array.isArray(lieBiao)) return []
  const jieGuo: XiaoXiFenZuXiang<X>[] = []
  let shangYiGeShiJianChuo: number | null = null

  for (const xiaoXi of lieBiao) {
    const xuYaoXinBiaoQian =
      shangYiGeShiJianChuo === null ||
      xiaoXi.shi_jian_chuo - shangYiGeShiJianChuo > XIAO_XI_PEI_ZHI.heBingShiJianYuZhi

    if (xuYaoXinBiaoQian) {
      jieGuo.push({
        shiJian: geShiHuaXiaoXiShiJian(zhuanBeiJing(xiaoXi.shi_jian_chuo), zhuanBeiJing(Date.now())),
        shiJianChuo: xiaoXi.shi_jian_chuo,
        xiaoXiLieBiao: [xiaoXi],
      })
      shangYiGeShiJianChuo = xiaoXi.shi_jian_chuo
    } else {
      jieGuo[jieGuo.length - 1].xiaoXiLieBiao.push(xiaoXi)
    }
  }

  return jieGuo
}
