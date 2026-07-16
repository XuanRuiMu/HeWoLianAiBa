import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianQingGanFenXiPrompt } from './Prompt构建器'
import type { QingGanFenXiJieGuo } from '../types'

export async function fenXiQingGan(
  xiaoXi: string,
  jiaoSeMing: string,
): Promise<QingGanFenXiJieGuo> {
  try {
    const xiangYing = await genJuPeiZhiTiaoYong('qingGanFenXi', [
      { jiaoSe: 'system', neiRong: '判断用户消息的情绪倾向，只输出 JSON。' },
      { jiaoSe: 'user', neiRong: gouJianQingGanFenXiPrompt(xiaoXi, jiaoSeMing) },
    ])

    const shuJu = jieXiJSON(xiangYing.neiRong)
    const fenShu = Number(shuJu['分数'] ?? shuJu['fen_shu'] ?? 0)

    return {
      fen_shu: Number.isNaN(fenShu) ? 0 : Math.max(-10, Math.min(10, fenShu)),
      fen_xi: String(shuJu['分析'] ?? shuJu['fen_xi'] ?? ''),
    }
  } catch (cuoWu) {
    console.error('情感分析失败', cuoWu)
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
