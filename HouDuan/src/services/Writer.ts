import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianWriterPrompt } from './Prompt构建器'
import { zhuRuBenLunTuXiangKuai } from './对话渲染'
import { daiShuKaiChangYuanYu, fuJiaKaiChangYuanYu, qingLiXiaoXi } from './开场候选约束'
import type { DuiHuaKuai } from '../utils/DeepSeek客户端'
import type { AIYinQingShuRu, DirectorCeLue, WriterJieGuo } from '../types'
import type { CanShuShangXiaWen } from '../config/AI参数策略'

export async function shengChengWriterHuiFu(
  shuRu: AIYinQingShuRu,
  ceLue?: DirectorCeLue,
  shangXiaWen?: CanShuShangXiaWen,
  waiBuXinHao?: AbortSignal,
): Promise<WriterJieGuo> {
  const tiShiCi = gouJianWriterPrompt(shuRu, ceLue)

  const tuXiangKuai = await zhuRuBenLunTuXiangKuai(shuRu.dui_hua_li_shi)
  const yongHuNeiRong: string | DuiHuaKuai[] =
    tuXiangKuai.length > 0 ? [{ type: 'input_text', text: tiShiCi }, ...tuXiangKuai] : tiShiCi

  const chenJinZhiLing = shuRu.shi_fou_di_yi_lun
    ? `\n${'【从现在起，你就是TA】'}：用第一人称在心里嘀咕，完全变成对方眼中的恋人，别跳出来分析。`
    : ''
  const yongHuNeiRongFuJia: string | DuiHuaKuai[] =
    typeof yongHuNeiRong === 'string'
      ? `${yongHuNeiRong}${chenJinZhiLing}`
      : chenJinZhiLing
        ? [{ type: 'input_text', text: chenJinZhiLing }, ...yongHuNeiRong]
        : yongHuNeiRong

  const jiaoSeMing = (shuRu.jiao_se.wei_xin_ming || '').trim()
  const jiaoSeSystem = jiaoSeMing
    ? `完全代入下面这个角色（${jiaoSeMing}），只输出你要发的消息。像平时微信里真实的两个人在聊天，自然口语化，允许短句、留白和真实停顿。`
    : '完全代入下面这个角色，只输出你要发的消息。像平时微信里真实的两个人在聊天，自然口语化，允许短句、留白和真实停顿。'
  const 带角色指令 = (内容: string | DuiHuaKuai[]): string | DuiHuaKuai[] =>
    typeof 内容 === 'string' ? `${内容}\n\n${jiaoSeSystem}` : [...内容, { type: 'input_text', text: jiaoSeSystem }]

  const xiaoXi = [{ jiaoSe: 'user' as const, neiRong: 带角色指令(yongHuNeiRongFuJia) }]

  const kaiChang = daiShuKaiChangYuanYu()
  const xiaoXiDaiYu = kaiChang.wenBen
    ? [{ jiaoSe: 'user' as const, neiRong: 带角色指令(fuJiaKaiChangYuanYu(yongHuNeiRongFuJia, kaiChang.wenBen)) }]
    : xiaoXi

  const xiangYing = await genJuPeiZhiTiaoYong('writer', xiaoXiDaiYu, shangXiaWen, waiBuXinHao)

  return {
    xiao_xi_lie_biao: qingLiXiaoXi(xiangYing.neiRong),
    yuan_wen: xiangYing.neiRong,
    si_kao: xiangYing.siKaoNeiRong || undefined,
    kai_chang_hou_xuan: kaiChang.houXuan.length > 0 ? kaiChang.houXuan : undefined,
  }
}