import { XIAO_XI_PEI_ZHI } from '@/config/消息配置'
import { huoQuFanYi } from '@/config/translations'
import type { 消息 } from '@/types'

/** 分组只用到时间戳这一个字段：聊天页的 消息 与好友页的 HaoYouXiaoXi 都满足 ⇒ 两页共用一份分档实现 */
export interface ShiJianZaiTi {
  shi_jian_chuo: number
}

export interface XiaoXiFenZuXiang<X extends ShiJianZaiTi = 消息> {
  /** 分档后的可读时间文本（时间条唯一的可见值） */
  shiJian: string
  /** 该组首条消息的时间戳，时间条按它出 <time datetime> 的机器可读值 */
  shiJianChuo: number
  xiaoXiLieBiao: X[]
}

/* 会话时间轴按东八区呈现（改前实测口径，FP-11 原样保留，不做本地化裁决） */
function zhuanBeiJing(shiJianChuo: number): Date {
  const riQi = new Date(shiJianChuo)
  const utc = riQi.getTime() + riQi.getTimezoneOffset() * 60000
  return new Date(utc + 8 * 3600000)
}

/**
 * 时间条分档：同日→`时:分`、跨日→`昨天 时:分` / `星期X 时:分`、跨月→`MM-DD 时:分`、
 * 跨年→`YYYY-MM-DD 时:分`。两页共用的唯一口径（FP-11 验收点 B），
 * 由 __tests__/FP11语音气泡.test.ts 逐档断言，改动任一档都要同步那条用例。
 */
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

/**
 * 按「与上一条相隔超过合并阈值」切组并给每组一个可读时间标签
 * （阈值 = XIAO_XI_PEI_ZHI.heBingShiJianYuZhi，契约见 __tests__/消息发送与显示.test.ts）。
 */
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
