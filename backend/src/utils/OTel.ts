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

  const duanDian = process.env.OTEL_EXPORTER_OTLP_ENDPOINT

  // 是否启用导出完全由配置显式决定：
  // 1) 用户/部署明确提供 collector 地址 → 使用 OTLP 导出
  // 2) 开发环境 → 用 Console 导出便于本地观察 trace
  // 3) 生产环境且未配置 endpoint（本部署无 collector）→ 直接跳过，
  //    不初始化 SDK、不构造导出器、不开启 diag，从根本上消除 ECONNREFUSED 噪音
  const shiYongOTLP = Boolean(duanDian)
  const shiYongConsole = !shiYongOTLP && peiZhi.huanJing === 'development'

  if (!shiYongOTLP && !shiYongConsole) {
    yiChuShiHua = true
    return
  }

  // diag 仅在 OTLP 分支显式开启，避免生产无 collector 时刷诊断日志
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
    // 若核心模块已在本模块之前被加载，require-in-the-middle 的 hook
    // 不会自动应用 patch，需主动触发一次 require 使其生效
    require('http')
    require('https')
  } catch {
    // 忽略加载失败
  }
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
