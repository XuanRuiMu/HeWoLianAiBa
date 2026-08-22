import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianWriterPrompt } from './Prompt构建器'
import { gouJianYongHuTuXiangKuai } from './AI视觉辅助'
import type { DuiHuaKuai } from '../utils/DeepSeek客户端'
import type { AIYinQingShuRu, DirectorCeLue, WriterJieGuo } from '../types'
import type { CanShuShangXiaWen } from '../config/AI参数策略'

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
  shangXiaWen?: CanShuShangXiaWen,
): Promise<WriterJieGuo> {
  const prompt = gouJianWriterPrompt(shuRu, ceLue)

  // 历史中用户发的图片/表情包以 input_image 块注入 user 消息（仅 user 可带图，官方限制）
  const tuXiangKuai = await gouJianYongHuTuXiangKuai(shuRu.dui_hua_li_shi)
  const yongHuNeiRong: string | DuiHuaKuai[] =
    tuXiangKuai.length > 0 ? [{ type: 'input_text', text: prompt }, ...tuXiangKuai] : prompt

  const xiangYing = await genJuPeiZhiTiaoYong('writer', [
    { jiaoSe: 'system', neiRong: '完全代入下面这个角色，只输出你要发的消息。像真实大学生/青年恋人聊微信，自然口语化，允许短句、留白、省略号和真实停顿。' },
    { jiaoSe: 'user', neiRong: yongHuNeiRong },
  ], shangXiaWen)

  const xiaoXiLieBiao = qingLiXiaoXi(xiangYing.neiRong)

  return {
    xiao_xi_lie_biao: xiaoXiLieBiao,
    yuan_wen: xiangYing.neiRong,
  }
}
