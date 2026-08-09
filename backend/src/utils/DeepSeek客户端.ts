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
  xinXi: OpenAI.Chat.Completions.ChatCompletion.Choice['message']
  yuanShuJu: OpenAI.Chat.Completions.ChatCompletion
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
    })
  }

  const tiShiCanShu: Record<string, unknown> = {}
  // 官方规范：思考模式开关使用顶层参数 thinking:{type:'enabled'|'disabled'}，
  // 旧字段 enable_thinking 会被服务端静默忽略（思考模式下 temperature 等采样参数不生效）
  if (canShu.siKaoMoShi) {
    tiShiCanShu.thinking = { type: canShu.siKaoMoShi }
  }
  if (canShu.reasoningEffort) {
    tiShiCanShu.reasoning_effort = canShu.reasoningEffort
  }

  try {
    const xiangYing = await keHuDuan.chat.completions.create({
      model: moXing,
      messages: canShu.xiaoXi.map((xiaoXi) => ({
        role: xiaoXi.jiaoSe,
        content: xiaoXi.neiRong,
      })),
      temperature: canShu.wenDu,
      top_p: canShu.top_p,
      max_tokens: canShu.zuiDaTokens,
      response_format: xiangYingGeShi,
      ...tiShiCanShu,
    })

    const xuanZe = xiangYing.choices[0]
    const neiRong = xuanZe?.message?.content || ''
    const haoShi = Date.now() - kaiShiShiJian
    jiLuAIJiLu(moXingLeiXing, moXing, haoShi, true)

    return {
      neiRong,
      xinXi: xuanZe?.message || { role: 'assistant', content: '' },
      yuanShuJu: xiangYing,
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
      xiaoXi,
    },
    moXingLeiXing,
  )
}
