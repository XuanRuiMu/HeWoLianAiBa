import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianWriterPrompt } from './Prompt构建器'
import type { AIYinQingShuRu, DirectorCeLue, WriterJieGuo } from '../types'

function qingLiXiaoXi(neiRong: string): string[] {
  if (!neiRong) return []

  return neiRong
    .split('\n')
    .map((hang) => hang.trim())
    .filter((hang) => hang.length > 0)
    .map((hang) => {
      const quHao = hang.replace(/^\d+[\.、]\s*/, '').trim()
      return quHao
    })
    .filter((hang) => hang.length > 0)
}

export async function shengChengWriterHuiFu(
  shuRu: AIYinQingShuRu,
  ceLue?: DirectorCeLue,
): Promise<WriterJieGuo> {
  const prompt = gouJianWriterPrompt(shuRu, ceLue)

  const xiangYing = await genJuPeiZhiTiaoYong('writer', [
    { jiaoSe: 'system', neiRong: '你是角色扮演AI，只输出角色回复文本，不输出解释。' },
    { jiaoSe: 'user', neiRong: prompt },
  ])

  const xiaoXiLieBiao = qingLiXiaoXi(xiangYing.neiRong)

  return {
    xiao_xi_lie_biao: xiaoXiLieBiao,
    yuan_wen: xiangYing.neiRong,
  }
}
