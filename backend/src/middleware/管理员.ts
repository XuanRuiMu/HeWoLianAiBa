import type { Response, NextFunction } from 'express'
import { peiZhi } from '../config'
import { huoQuFanYi } from '../config/translations'
import { shiBaiXiangYing } from '../utils/xiangying'
import type { RenZhengQingQiu } from './认证'

export function yanZhengGuanLiYuan(
  qingQiu: RenZhengQingQiu,
  xiangYing: Response,
  xiaYiBu: NextFunction,
): void {
  const yongHu = qingQiu.yong_hu
  if (!yongHu) {
    shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'))
    return
  }

  if (!peiZhi.shenYongYuan.yunXuLieBiao.includes(yongHu.shouJiHao)) {
    shiBaiXiangYing(xiangYing, 403, huoQuFanYi('tongYong', 'weiShouQuan'))
    return
  }

  xiaYiBu()
}
