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
    { jiaoSe: 'system', neiRong: '完全代入下面这个角色，只输出你要发的消息。像真实大学生/青年恋人聊微信，自然口语化，允许短句、留白、省略号和真实停顿。' },
    { jiaoSe: 'user', neiRong: prompt },
  ])

  const xiaoXiLieBiao = qingLiXiaoXi(xiangYing.neiRong)

  return {
    xiao_xi_lie_biao: xiaoXiLieBiao,
    yuan_wen: xiangYing.neiRong,
  }
}
