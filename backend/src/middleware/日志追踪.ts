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

    // YH-140 trace断链收敛：前端透传trace，后端日志透传
    // 根因：前后两截查问题对不上；收敛为读前端trace头，无则自生成
    const qianDuanTrace = String((req.headers['x-trace-id'] || req.headers['traceparent'] || '')).slice(0, 128)
    const youXiaoTrace = traceId || (qianDuanTrace.includes('-') ? qianDuanTrace.split('-')[1]?.slice(0, 32) || qianDuanTrace : qianDuanTrace) || ''

    const shangXiaWen = { qing_qiu_id: qingQiuId, trace_id: youXiaoTrace, span_id: spanId }

    const zhuiZongReq = req as ZhuiZongQingQiu
    zhuiZongReq.qing_qiu_id = qingQiuId
    zhuiZongReq.trace_id = youXiaoTrace
    zhuiZongReq.span_id = spanId

    _res.setHeader('X-Request-Id', qingQiuId)
    if (youXiaoTrace) {
      _res.setHeader('X-Trace-Id', youXiaoTrace)
    }

    qingQiuShangXiaWen.run(shangXiaWen, next)
  }
}
