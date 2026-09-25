import { AsyncLocalStorage } from 'async_hooks'
import { randomUUID } from 'node:crypto'
import { huoQuDangQianTraceId, huoQuDangQianSpanId } from '../utils/OTel'
import type { Request, RequestHandler, Response } from 'express'

export const qingQiuShangXiaWen = new AsyncLocalStorage<Record<string, string>>()

type ZhuiZongQingQiu = Request & {
  qing_qiu_id: string
  trace_id: string
  span_id: string
}

const QING_QIU_ID_ZUI_DI_CHANG_DU = 16
const QING_QIU_ID_ZUI_DA_CHANG_DU = 128
const QING_QIU_ID_HEFA_ZE = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/

export function jieXiQingQiuZhuanZongId(zhi: unknown): string | null {
  if (typeof zhi !== 'string') return null
  const jieGuo = zhi.trim()
  if (jieGuo.length < QING_QIU_ID_ZUI_DI_CHANG_DU || jieGuo.length > QING_QIU_ID_ZUI_DA_CHANG_DU) return null
  return QING_QIU_ID_HEFA_ZE.test(jieGuo) ? jieGuo : null
}

export function shengChengQingQiuZhuanZongId(): string {
  return randomUUID()
}

export function queDingXiangYingZhuanZongId(xiangYing: Response): string {
  const xianYou = jieXiQingQiuZhuanZongId(xiangYing.locals?.traceId)
  const traceId = xianYou || shengChengQingQiuZhuanZongId()
  if (xiangYing.locals && typeof xiangYing.locals === 'object') {
    xiangYing.locals.traceId = traceId
  }
  if (typeof xiangYing.setHeader === 'function') {
    xiangYing.setHeader('X-Request-Id', traceId)
    xiangYing.setHeader('X-Trace-Id', traceId)
  }
  return traceId
}

export function 日志追踪中间件(): RequestHandler {
  return (req, res, next) => {
    const qingQiuId = jieXiQingQiuZhuanZongId(req.headers['x-request-id']) || shengChengQingQiuZhuanZongId()
    const otelTraceId = huoQuDangQianTraceId()
    const spanId = huoQuDangQianSpanId()
    const shangXiaWen = {
      qing_qiu_id: qingQiuId,
      trace_id: qingQiuId,
      span_id: spanId,
      otel_trace_id: otelTraceId,
    }

    const zhuiZongReq = req as ZhuiZongQingQiu
    zhuiZongReq.qing_qiu_id = qingQiuId
    zhuiZongReq.trace_id = qingQiuId
    zhuiZongReq.span_id = spanId
    res.locals.traceId = qingQiuId
    res.setHeader('X-Request-Id', qingQiuId)
    res.setHeader('X-Trace-Id', qingQiuId)

    qingQiuShangXiaWen.run(shangXiaWen, next)
  }
}
