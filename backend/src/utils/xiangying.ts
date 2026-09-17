import type { Response } from 'express'
import type { ApiXiangYing } from '../types'
import { taoYiShuChu } from '../middleware/安全'

export function chengGongXiangYing<T>(
  xiangYing: Response,
  shuJu: T,
  tiShi?: string,
): void {
  // YH-021 输出转义为主：成功体字符串字段服务端统一编码
  const jieGuo: ApiXiangYing<T> = {
    cheng_gong: true,
    shu_ju: taoYiShuChu(shuJu) as T,
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
