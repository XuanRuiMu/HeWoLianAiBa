import { 按配置调用 } from '../utils/DeepSeek客户端'
import { gouJianWriterPrompt } from './Prompt构建器'
import { zhuRuBenLunTuXiangKuai } from './对话渲染'
import { gouJianTouXiangKuai } from './AI视觉辅助'
import * as XiTongBiaoQing from './系统表情'
import { panDuanBiaoQingZaiTi } from './表情载体'
import { daiShuKaiChangYuanYu, fuJiaKaiChangYuanYu, qingLiXiaoXi } from './开场候选约束'
import { 检索通用知识, type 通用知识检索结果 } from './通用知识检索'
import { debug日志 } from '../utils/debug日志'
import type { 对话块 } from '../utils/DeepSeek客户端'
import type { AIYinQingShuRu, DirectorCeLue, WriterJieGuo } from '../types'
import type { 参数上下文 } from '../config/AI参数策略'

export async function shengChengWriterHuiFu(
  shuRu: AIYinQingShuRu,
  ceLue?: DirectorCeLue,
  淽数上下文?: 参数上下文,
  外部信号?: AbortSignal,
  zhiShi: 通用知识检索结果 = 检索通用知识(shuRu.yong_hu_xin_xiao_xi, !shuRu.zui_jia_shuo_de_shi),
  zuiJinDuanMing?: string[],
): Promise<WriterJieGuo> {
  const tiShiCi = gouJianWriterPrompt(shuRu, ceLue, zhiShi)
  const 载体决策 = panDuanBiaoQingZaiTi(shuRu, ceLue)
  const biaoQingHouXuan = await XiTongBiaoQing.生成表情候选文本(ceLue?.biao_qing_yi_tu ?? null, 载体决策, zuiJinDuanMing)
  const tiShiCiWanZheng = biaoQingHouXuan ? `${tiShiCi}\n\n${biaoQingHouXuan}` : tiShiCi

  const tuXiangKuai = await zhuRuBenLunTuXiangKuai(shuRu.dui_hua_li_shi)
  const touXiangKuai = await gouJianTouXiangKuai(shuRu.yong_hu_xin_xiao_xi, shuRu.jiao_se.tou_xiang)
  const quanBuKuai = [...tuXiangKuai, ...touXiangKuai]
  const yongHuNeiRong: string | 对话块[] =
    quanBuKuai.length > 0 ? [{ type: 'input_text', text: tiShiCiWanZheng }, ...quanBuKuai] : tiShiCiWanZheng

  const kaiChang = daiShuKaiChangYuanYu()
  const shiFouQueLi = ['热恋', '深爱'].includes(
    typeof shuRu.hao_gan_du?.guan_xi_jie_duan === 'string' ? shuRu.hao_gan_du.guan_xi_jie_duan : '',
  )
  const chenJinZhiLing = kaiChang.wenBen
    ? `\n${'【从现在起，你就是TA】'}：用第一人称在心里嘀咕，完全变成对方眼中的${shiFouQueLi ? '恋人' : '聊天对象'}，别跳出来分析。`
    : ''
  const daiZhiLingNeiRong: string | 对话块[] =
    typeof yongHuNeiRong === 'string'
      ? `${yongHuNeiRong}${chenJinZhiLing}`
      : chenJinZhiLing
        ? [{ type: 'input_text', text: chenJinZhiLing }, ...yongHuNeiRong]
        : yongHuNeiRong

  const jiaoSeMing = (shuRu.jiao_se.wei_xin_ming || '').trim()
  const jiaoSeSystem = jiaoSeMing
    ? `完全代入下面这个角色（${jiaoSeMing}），只输出你要发的消息。像平时微信里真实的两个人在聊天，自然口语化，允许短句、留白和真实停顿。`
    : '完全代入下面这个角色，只输出你要发的消息。像平时微信里真实的两个人在聊天，自然口语化，允许短句、留白和真实停顿。'
  const daiJiaoSeZhiLing = (neiRongCanShu: string | 对话块[]): string | 对话块[] =>
    typeof neiRongCanShu === 'string' ? `${neiRongCanShu}\n\n${jiaoSeSystem}` : [...neiRongCanShu, { type: 'input_text', text: jiaoSeSystem }]

  const xiaoXi = [{ jiaoSe: 'user' as const, neiRong: daiJiaoSeZhiLing(daiZhiLingNeiRong) }]

  const xiaoXiDaiYu = kaiChang.wenBen
    ? [{ jiaoSe: 'user' as const, neiRong: daiJiaoSeZhiLing(fuJiaKaiChangYuanYu(daiZhiLingNeiRong, kaiChang.wenBen)) }]
    : xiaoXi

  const xiangYing = await 按配置调用('XieShou', xiaoXiDaiYu, 淽数上下文, 外部信号)

  debug日志.debug('AI写手', 'Writer原始输出', { xiang_qing: { yuan_wen: xiangYing.neiRong, si_kao: xiangYing.siKaoNeiRong || null } })

  return {
    xiao_xi_lie_biao: qingLiXiaoXi(xiangYing.neiRong),
    yuan_wen: xiangYing.neiRong,
    si_kao: xiangYing.siKaoNeiRong || undefined,
    kai_chang_hou_xuan: kaiChang.houXuan.length > 0 ? kaiChang.houXuan : undefined,
  }
}
