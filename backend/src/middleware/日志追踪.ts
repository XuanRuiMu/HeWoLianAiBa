import { AsyncLocalStorage } from 'async_hooks'
import { v4 as uuidv4 } from 'uuid'
import { huoQuDangQianTraceId, huoQuDangQianSpanId } from '../utils/OTel'
import type { RequestHandler } from 'express'

export const qingQiuShangXiaWen = new AsyncLocalStorage<Record<string, string>>()

export function 日志追踪中间件(): RequestHandler {
  return (req, _res, next) => {
    const qingQiuId = uuidv4()
    const traceId = huoQuDangQianTraceId()
    const spanId = huoQuDangQianSpanId()

    const shangXiaWen = { qing_qiu_id: qingQiuId, trace_id: traceId, span_id: spanId }

    ;(req as any).qing_qiu_id = qingQiuId
    ;(req as any).trace_id = traceId
    ;(req as any).span_id = spanId

    _res.setHeader('X-Request-Id', qingQiuId)

    qingQiuShangXiaWen.run(shangXiaWen, next)
  }
}
