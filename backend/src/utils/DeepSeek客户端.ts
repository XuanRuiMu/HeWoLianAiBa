import OpenAI from 'openai'
import { AI_PEI_ZHI } from '../config/AI配置'
import { peiZhi } from '../config'
import { jiLuAIJiLu } from './debug日志'

export interface DuiHuaXiaoXi {
  jiaoSe: 'system' | 'user' | 'assistant'
  neiRong: string
}

export interface TiaoYongCanShu {
  moXing?: string
  wenDu?: number
  zuiDaTokens?: number
  xiangYingGeShi?: { type: 'json_object' | 'text' }
  enableThinking?: boolean
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

  const tiShiCanShu: Record<string, unknown> = {}
  if (canShu.enableThinking) {
    tiShiCanShu.enable_thinking = true
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
): Promise<TiaoYongJieGuo> {
  const moXingCanShu = AI_PEI_ZHI.moXing[moXingLeiXing]
  return tiaoYongDeepSeek(
    {
      moXing: moXingCanShu.moXing,
      wenDu: moXingCanShu.wenDu,
      zuiDaTokens: moXingCanShu.zuiDaTokens,
      xiangYingGeShi: moXingCanShu.xiangYingGeShi,
      enableThinking: moXingCanShu.enableThinking,
      reasoningEffort: moXingCanShu.reasoningEffort,
      xiaoXi,
    },
    moXingLeiXing,
  )
}
