import type { Response } from 'express'
import type { ApiXiangYing } from '../types'

export function chengGongXiangYing<T>(
  xiangYing: Response,
  shuJu: T,
  tiShi?: string,
): void {
  const jieGuo: ApiXiangYing<T> = {
    cheng_gong: true,
    shu_ju: shuJu,
    ti_shi: tiShi,
  }
  xiangYing.json(jieGuo)
}

export function shiBaiXiangYing(
  xiangYing: Response,
  zhuangTaiMa: number,
  tiShi: string,
  cuoWuMa?: string,
): void {
  const jieGuo: ApiXiangYing<null> = {
    cheng_gong: false,
    shu_ju: null,
    ti_shi: tiShi,
    cuo_wu_ma: cuoWuMa,
  }
  xiangYing.status(zhuangTaiMa).json(jieGuo)
}
