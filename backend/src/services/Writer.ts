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

  const xiaoXi = [
    { jiaoSe: 'system' as const, neiRong: '完全代入下面这个角色，只输出你要发的消息。像真实大学生/青年恋人聊微信，自然口语化，允许短句、留白和真实停顿。' },
    { jiaoSe: 'user' as const, neiRong: yongHuNeiRongFuJia },
  ]

  // 开场多样化约束（机制 D）。
  // ⚠️ 必须复用 yongHuNeiRongFuJia（含首轮沉浸指令），不能退回 yongHuNeiRong，否则 YH-050 指令被丢弃。
  // ⚠️ 必须同时支持 string 与 DuiHuaKuai[]（图片轮）：本轮发图时 neiRong 是内容块数组，
  //    直接当字符串拼接会把它 String() 化成 "[object Object]"，摧毁整个 prompt（第二轮审查 P0）。
  const kaiChang = daiShuKaiChangYuanYu()
  const xiaoXiDaiYu = kaiChang.wenBen
    ? [{ ...xiaoXi[0] }, { jiaoSe: 'user' as const, neiRong: fuJiaKaiChangYuanYu(yongHuNeiRongFuJia, kaiChang.wenBen) }]
    : xiaoXi

  const xiangYing = await genJuPeiZhiTiaoYong('writer', xiaoXiDaiYu, shangXiaWen, waiBuXinHao)

  return {
    xiao_xi_lie_biao: qingLiXiaoXi(xiangYing.neiRong),
    yuan_wen: xiangYing.neiRong,
    si_kao: xiangYing.siKaoNeiRong || undefined,
    // ⚠️ 回传本轮实际注入的候选。联调的 M7/M8 必须用这一份，不能另行采样（第三轮审查 P5/Sp-1）。
    kai_chang_hou_xuan: kaiChang.houXuan.length > 0 ? kaiChang.houXuan : undefined,
  }
}