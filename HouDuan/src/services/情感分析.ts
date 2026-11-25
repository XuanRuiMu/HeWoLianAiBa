import { debug日志 } from '../utils/debug日志'
import { 按配置调用 } from '../utils/通用模型调用'
import { gouJianQingGanFenXiPrompt } from './Prompt构建器'
import type { QingGanFenXiJieGuo } from '../types'
import type { 参数上下文 } from '../config/AI参数策略'

export async function fenXiQingGan(
  xiaoXi: string,
  jiaoSeMing: string,
  shangXiaWen?: 参数上下文,
  waiBuXinHao?: AbortSignal,
): Promise<QingGanFenXiJieGuo> {
  try {
    if (waiBuXinHao?.aborted) {
      return { fen_shu: 0, fen_xi: '' }
    }
    const xiangYing = await 按配置调用('QingGanFenXi', [
      { jiaoSe: 'system', neiRong: '任务：分析给定用户消息的情绪倾向与强度。只输出 JSON，不附加任何说明文字。' },
      { jiaoSe: 'user', neiRong: gouJianQingGanFenXiPrompt(xiaoXi, jiaoSeMing) },
    ], shangXiaWen, waiBuXinHao)

    const shuJu = jieXiJSON(xiangYing.neiRong)
    const fenShu = Number(shuJu['分数'] ?? shuJu['fen_shu'] ?? 0)

    return {
      fen_shu: Number.isNaN(fenShu) ? 0 : Math.max(-10, Math.min(10, fenShu)),
      fen_xi: String(shuJu['分析'] ?? shuJu['fen_xi'] ?? ''),
    }
  } catch (cuoWu) {
    debug日志.error('情感分析', '情感分析失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return { fen_shu: 0, fen_xi: '' }
  }
}

function jieXiJSON(neiRong: string): Record<string, unknown> {
  const qingLi = neiRong.trim()
  try {
    return JSON.parse(qingLi)
  } catch {
    const piPei = qingLi.match(/\{[\s\S]*\}/)
    if (piPei) {
      try {
        return JSON.parse(piPei[0])
      } catch {
        return {}
      }
    }
    return {}
  }
}
