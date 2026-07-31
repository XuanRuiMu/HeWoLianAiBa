import { context, trace, diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { peiZhi } from '../config'

let yiChuShiHua = false
let sdkShiLi: NodeSDK | null = null

export function chuShiHuaOTel(): void {
  if (yiChuShiHua) return

  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)

  const ziYuan = resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: '和我恋爱吧',
  })

  const baoLuQi = peiZhi.huanJing === 'development'
    ? new ConsoleSpanExporter()
    : new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      })

  sdkShiLi = new NodeSDK({
    resource: ziYuan,
    traceExporter: baoLuQi,
    instrumentations: [getNodeAutoInstrumentations()],
  })

  sdkShiLi.start()
  yiChuShiHua = true
}

export function huoQuDangQianTraceId(): string {
  try {
    const span = trace.getSpan(context.active())
    return span?.spanContext().traceId || ''
  } catch {
    return ''
  }
}

export function huoQuDangQianSpanId(): string {
  try {
    const span = trace.getSpan(context.active())
    return span?.spanContext().spanId || ''
  } catch {
    return ''
  }
}

export function guanBiOTel(): Promise<void> {
  if (!sdkShiLi) return Promise.resolve()
  return sdkShiLi.shutdown().catch(() => {})
}
