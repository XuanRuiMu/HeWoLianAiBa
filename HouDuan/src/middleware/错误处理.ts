import type { ErrorRequestHandler } from 'express'
import { debug日志 } from '../utils/debug日志'
import { shiBaiXiangYing } from '../utils/xiangying'
import { huoQuCuoWuXianRong } from '../config/错误码注册表'
import {
  CUO_WU_DAI_MA,
  YingYongCuoWu,
  type CuoWuDaiMa,
} from '../config/错误码注册表'
import { 依赖对应错误码, 推断依赖来源 } from '../utils/依赖错误'

function jieXiDaiMa(cuoWu: unknown): CuoWuDaiMa {
  if (cuoWu instanceof YingYongCuoWu) return cuoWu.code
  const 依赖 = 推断依赖来源(cuoWu)
  if (依赖) return 依赖对应错误码(依赖)
  if (cuoWu && typeof cuoWu === 'object') {
    const xing = cuoWu as { type?: unknown; status?: unknown; statusCode?: unknown }
    if (xing.type === 'entity.too.large') return CUO_WU_DAI_MA.PAYLOAD_TOO_LARGE
    if (xing.type === 'entity.parse.failed') return CUO_WU_DAI_MA.REQUEST_BODY_INVALID
    if (xing.status === 413 || xing.statusCode === 413) return CUO_WU_DAI_MA.PAYLOAD_TOO_LARGE
  }
  return CUO_WU_DAI_MA.INTERNAL_ERROR
}

export const 全YuZhanCuoWuChuLi: ErrorRequestHandler = (cuoWu, _qingQiu, xiangYing, xiaYiBu) => {
  if (xiangYing.headersSent) {
    xiaYiBu(cuoWu)
    return
  }
  const daiMa = jieXiDaiMa(cuoWu)
  const mingCheng = cuoWu instanceof Error ? cuoWu.name : 'UnknownError'
  debug日志.error('全局错误处理', '请求处理失败', {
    xiang_qing: { cuo_wu_ma: daiMa, ming_cheng: mingCheng },
  })
  shiBaiXiangYing(xiangYing, huoQuCuoWuXianRong(daiMa).httpStatus, '', daiMa)
}
