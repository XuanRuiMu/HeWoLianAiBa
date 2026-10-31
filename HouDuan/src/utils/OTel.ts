import { context, trace, diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { peiZhi } from '../config'

let yiChuShiHua = false
let sdkShiLi: NodeSDK | null = null

export function chuShiHuaOTel(): void {
  if (yiChuShiHua) return

  const duanDian = process.env.OTEL_EXPORTER_OTLP_ENDPOINT

  const shiYongOTLP = Boolean(duanDian)
  const shiYongConsole = !shiYongOTLP && peiZhi.huanJing === 'development' && process.env.OTEL_CONSOLE_EXPORTER === 'true'

  if (!shiYongOTLP && !shiYongConsole) {
    yiChuShiHua = true
    return
  }

  if (shiYongOTLP) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)
  }

  const ziYuan = resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: '和我恋爱吧',
  })

  const baoLuQi = shiYongOTLP
    ? new OTLPTraceExporter({ url: duanDian as string })
    : new ConsoleSpanExporter()

  sdkShiLi = new NodeSDK({
    resource: ziYuan,
    traceExporter: baoLuQi,
    instrumentations: [getNodeAutoInstrumentations()],
  })

  sdkShiLi.start()
  yiChuShiHua = true

  try {
    require('http')
    require('https')
  } catch {
    // 忽略加载失败
  }
}

export function huoQuDangQianTraceId(): string {
  try {
    const kuaDuan = trace.getSpan(context.active())
    return kuaDuan?.spanContext().traceId || ''
  } catch {
    return ''
  }
}

export function huoQuDangQianSpanId(): string {
  try {
    const kuaDuan = trace.getSpan(context.active())
    return kuaDuan?.spanContext().spanId || ''
  } catch {
    return ''
  }
}

export function guanBiOTel(): Promise<void> {
  if (!sdkShiLi) return Promise.resolve()
  return sdkShiLi.shutdown().catch(() => {})
}
