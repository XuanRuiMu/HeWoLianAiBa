import OpenAI from 'openai'
import { AI_PEI_ZHI } from '../config/AI配置'
import { peiZhi } from '../config'
import { jiSuanAIChanShu, type CanShuShangXiaWen } from '../config/AI参数策略'
import { jiLuAIJiLu } from './debug日志'

export interface DuiHuaXiaoXi {
  jiaoSe: 'system' | 'user' | 'assistant'
  neiRong: string
}

export interface TiaoYongCanShu {
  moXing?: string
  wenDu?: number
  top_p?: number
  zuiDaTokens?: number
  xiangYingGeShi?: { type: 'json_object' | 'text' }
  siKaoMoShi?: 'enabled' | 'disabled'
  reasoningEffort?: string
  xiaoXi: DuiHuaXiaoXi[]
}

export interface TiaoYongJieGuo {
  neiRong: string
  siKaoNeiRong?: string
  yuanShuJu: unknown
  xinXi: { role: string; content: string }
}

let mockTiaoYong: ((canShu: TiaoYongCanShu) => Promise<TiaoYongJieGuo>) | null = null

export function sheZhiMockTiaoYong(
  mock: ((canShu: TiaoYongCanShu) => Promise<TiaoYongJieGuo>) | null,
): void {
  mockTiaoYong = mock
}

export function huoQuMockTiaoYong(): ((canShu: TiaoYongCanShu) => Promise<TiaoYongJieGuo>) | null {
  return mockTiaoYong
}

let shiLi: OpenAI | null = null

export function huoQuDeepSeekKeHuDuan(): OpenAI {
  if (shiLi) return shiLi
  const apiMiYao = peiZhi.deepSeek.apiMiYao || AI_PEI_ZHI.deepSeek.apiMiYao
  const jiChuUrl = peiZhi.deepSeek.jiChuUrl || AI_PEI_ZHI.deepSeek.jiChuUrl

  shiLi = new OpenAI({
    apiKey: apiMiYao,
    baseURL: jiChuUrl,
    timeout: 120 * 1000,
  })
  return shiLi
}

export function chongZhiDeepSeekKeHuDuan(): void {
  shiLi = null
}

/**
 * 保守 token 估算：中文约 1.5 字/token，英文约 4 字/token。
 * 统一按「字符数/2」高估，落在对齐安全侧，避免低估导致超出上下文窗口。
 */
function guJiToken(shuRu: string): number {
  return Math.ceil(shuRu.length / 2)
}

/**
 * Responses API 不支持服务端截断：输入超过上下文窗口会直接返回 400 错误。
 * 这里在客户端侧做预算保护：超过预算时，从最旧的非 system 消息往前剔除，
 * 保住系统指令与最新上下文——即「尽可能多带历史，但永远不撑爆上下文」。
 */
function yuSuanBaoHu(xiaoXi: DuiHuaXiaoXi[]): DuiHuaXiaoXi[] {
  const yuSuan = AI_PEI_ZHI.prompt.shangXiaWenTokenYuSuan
  if (!yuSuan || yuSuan <= 0) return xiaoXi
  const xiTong = xiaoXi.filter((x) => x.jiaoSe === 'system')
  let qiTa = xiaoXi.filter((x) => x.jiaoSe !== 'system')
  const xiTongJi = xiTong.reduce((s, x) => s + guJiToken(x.neiRong), 0)
  const jiSuan = () => xiTongJi + qiTa.reduce((s, x) => s + guJiToken(x.neiRong), 0)
  while (qiTa.length > 1 && jiSuan() > yuSuan) {
    qiTa = qiTa.slice(1)
  }
  return [...xiTong, ...qiTa]
}

/** 从 Responses API 响应中提取可见文本与思维链文本。 */
function tiQuXiangYing(xiangYing: unknown): { neiRong: string; siKaoNeiRong: string } {
  const resp = xiangYing as { output?: Array<Record<string, unknown>>; status?: string }
  let neiRong = ''
  let siKaoNeiRong = ''
  for (const item of resp.output || []) {
    const type = item.type
    const content = (Array.isArray(item.content) ? item.content : []) as Array<Record<string, unknown>>
    if (type === 'message') {
      for (const part of content) {
        if (part.type === 'output_text') neiRong += (part.text as string) || ''
      }
    } else if (type === 'reasoning') {
      for (const part of content) {
        if (part.type === 'reasoning_text') siKaoNeiRong += (part.text as string) || ''
      }
    }
  }
  return { neiRong: neiRong.trim(), siKaoNeiRong: siKaoNeiRong.trim() }
}

export async function tiaoYongDeepSeek(
  canShu: TiaoYongCanShu,
  moXingLeiXing: string = 'DeepSeek',
): Promise<TiaoYongJieGuo> {
  if (mockTiaoYong) {
    return mockTiaoYong(canShu)
  }

  const kaiShiShiJian = Date.now()
  const keHuDuan = huoQuDeepSeekKeHuDuan()
  const moXing = canShu.moXing || AI_PEI_ZHI.deepSeek.moXing
  const xiangYingGeShi = canShu.xiangYingGeShi || { type: 'text' as const }

  if (peiZhi.kaiFaMoShi) {
    console.debug('[AI参数] 最终生效参数', {
      moXingLeiXing,
      moXing,
      wenDu: canShu.wenDu,
      top_p: canShu.top_p,
      zuiDaTokens: canShu.zuiDaTokens,
      siKaoMoShi: canShu.siKaoMoShi,
      reasoningEffort: canShu.reasoningEffort,
    })
  }

  // 客户端侧 token 预算保护（Responses API 无服务端截断，超窗口直接 400）
  const shiJiXiaoXi = yuSuanBaoHu(canShu.xiaoXi)

  const shuRuXiang = shiJiXiaoXi.map((x) => ({ role: x.jiaoSe, content: x.neiRong }))

  const body: Record<string, unknown> = {
    model: moXing,
    input: shuRuXiang,
  }
  if (xiangYingGeShi.type === 'json_object') {
    body.text = { format: { type: 'json_object' } }
  }
  // 官方规范（Responses API）：思考模式用 reasoning.effort 控制，不再使用 thinking/reasoning_effort。
  // effort 取值 none/minimal/low/medium/high/xhigh/max；max = 最高思考强度。
  if (canShu.siKaoMoShi === 'enabled') {
    body.reasoning = { effort: canShu.reasoningEffort || 'max' }
  }
  if (canShu.zuiDaTokens) body.max_output_tokens = canShu.zuiDaTokens
  if (typeof canShu.wenDu === 'number') body.temperature = canShu.wenDu
  if (typeof canShu.top_p === 'number') body.top_p = canShu.top_p

  try {
    const xiangYing = await keHuDuan.responses.create(
      body as unknown as OpenAI.Responses.ResponseCreateParamsNonStreaming,
    )

    const { neiRong, siKaoNeiRong } = tiQuXiangYing(xiangYing)

    if (peiZhi.kaiFaMoShi && siKaoNeiRong) {
      console.debug('[AI思考过程]', siKaoNeiRong.slice(0, 500))
    }
    if ((xiangYing as { status?: string }).status === 'incomplete') {
      console.warn('[AI调用] 响应被截断（达到 max_output_tokens），思考强度可能过高或上限偏低')
    }

    const haoShi = Date.now() - kaiShiShiJian
    jiLuAIJiLu(moXingLeiXing, moXing, haoShi, true)

    return {
      neiRong,
      siKaoNeiRong,
      yuanShuJu: xiangYing,
      xinXi: { role: 'assistant', content: neiRong },
    }
  } catch (cuoWu) {
    const haoShi = Date.now() - kaiShiShiJian
    const cuoWuXinXi = cuoWu instanceof Error ? cuoWu.message : String(cuoWu)
    jiLuAIJiLu(moXingLeiXing, moXing, haoShi, false, cuoWuXinXi)
    throw cuoWu
  }
}

export function genJuPeiZhiTiaoYong(
  moXingLeiXing: keyof typeof AI_PEI_ZHI.moXing,
  xiaoXi: DuiHuaXiaoXi[],
  shangXiaWen?: CanShuShangXiaWen,
): Promise<TiaoYongJieGuo> {
  const moXingCanShu = jiSuanAIChanShu(moXingLeiXing, shangXiaWen)
  return tiaoYongDeepSeek(
    {
      moXing: moXingCanShu.moXing,
      wenDu: moXingCanShu.wenDu,
      top_p: moXingCanShu.top_p,
      zuiDaTokens: moXingCanShu.zuiDaTokens,
      xiangYingGeShi: moXingCanShu.xiangYingGeShi,
      siKaoMoShi: moXingCanShu.siKaoMoShi,
      reasoningEffort: moXingCanShu.reasoningEffort,
      xiaoXi,
    },
    moXingLeiXing,
  )
}
