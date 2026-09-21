import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianWriterPrompt } from './Prompt构建器'
import { zhuRuBenLunTuXiangKuai } from './对话渲染'
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
  waiBuXinHao?: AbortSignal,
): Promise<WriterJieGuo> {
  const prompt = gouJianWriterPrompt(shuRu, ceLue)

  // FP-08 图片注入改增量：只投本轮尚未被模型看过的用户图片（历史图片每轮全量重投会让
  // 同一张表情包在单轮里被看到多次，是「对方又发了狗头」臆造的来源之一）
  const tuXiangKuai = await zhuRuBenLunTuXiangKuai(shuRu.dui_hua_li_shi)
  const yongHuNeiRong: string | DuiHuaKuai[] =
    tuXiangKuai.length > 0 ? [{ type: 'input_text', text: prompt }, ...tuXiangKuai] : prompt

  // YH-050 人设卡写法：沉浸指令放首轮user最稳，谈情与判分互不干扰；director走纯分析不动三字段
  const chenJinZhiLing = shuRu.shi_fou_di_yi_lun
    ? `\n${'【从现在起，你就是TA】'}：用第一人称在心里嘀咕，完全变成对方眼中的恋人，别跳出来分析。`
    : ''
  const yongHuNeiRongFuJia: string | DuiHuaKuai[] =
    typeof yongHuNeiRong === 'string'
      ? `${yongHuNeiRong}${chenJinZhiLing}`
      : chenJinZhiLing
        ? [{ type: 'input_text', text: chenJinZhiLing }, ...yongHuNeiRong]
        : yongHuNeiRong

  const xiangYing = await genJuPeiZhiTiaoYong('writer', [
    { jiaoSe: 'system', neiRong: '完全代入下面这个角色，只输出你要发的消息。像真实大学生/青年恋人聊微信，自然口语化，允许短句、留白、省略号和真实停顿。' },
    { jiaoSe: 'user', neiRong: yongHuNeiRongFuJia },
  ], shangXiaWen, waiBuXinHao)

  const xiaoXiLieBiao = qingLiXiaoXi(xiangYing.neiRong)

  return {
    xiao_xi_lie_biao: xiaoXiLieBiao,
    yuan_wen: xiangYing.neiRong,
    si_kao: xiangYing.siKaoNeiRong || undefined,
  }
}
