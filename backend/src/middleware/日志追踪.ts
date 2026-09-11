import { AsyncLocalStorage } from 'async_hooks'
import { v4 as uuidv4 } from 'uuid'
import { huoQuDangQianTraceId, huoQuDangQianSpanId } from '../utils/OTel'
import type { Request, RequestHandler } from 'express'

export const qingQiuShangXiaWen = new AsyncLocalStorage<Record<string, string>>()

type ZhuiZongQingQiu = Request & {
  qing_qiu_id: string
  trace_id: string
  span_id: string
}

export function 日志追踪中间件(): RequestHandler {
  return (req, _res, next) => {
    const qingQiuId = uuidv4()
    const traceId = huoQuDangQianTraceId()
    const spanId = huoQuDangQianSpanId()

    const shangXiaWen = { qing_qiu_id: qingQiuId, trace_id: traceId, span_id: spanId }

    const zhuiZongReq = req as ZhuiZongQingQiu
    zhuiZongReq.qing_qiu_id = qingQiuId
    zhuiZongReq.trace_id = traceId
    zhuiZongReq.span_id = spanId

    _res.setHeader('X-Request-Id', qingQiuId)

    qingQiuShangXiaWen.run(shangXiaWen, next)
  }
}
