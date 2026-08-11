import { AI_PEI_ZHI } from '../config/AI配置'
import { peiZhi } from '../config'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import type { KaiChangBaiShengChengCanShu } from './开场白生成'

// 兜底概率（无 AI key / 概率计算失败时退回），与 config 中 kaiChangBaiFaSongGaiLv 对齐。
const DOU_BEI_GAI_LV = AI_PEI_ZHI.prompt.kaiChangBaiFaSongGaiLv
// 概率钳制区间：10%~90%，避免极端值（全发/全不发）破坏整体分布。
const ZUI_XIAO = 0.1
const ZUI_DA = 0.9

function gouJianGaiLvTiShi(canShu: KaiChangBaiShengChengCanShu): string {
  const xingBieMiaoShu = canShu.xing_bie === 'nv' ? '女生' : '男生'
  return [
    '下面这个角色刚在微信上加了一个刚认识的人，对方还没说话。',
    '请你评估：基于 TA 的完整人物画像，TA 主动发起开场白（主动发第一条消息）的可能性有多高？',
    '只输出一个 10 到 90 之间的整数（代表百分比概率），不要输出任何其他内容。例如：73 或 45。',
    '评估参考：热情、开朗、快热、主动、带渣型倾向的角色概率偏高；害羞、慢热、高冷、被动的角色概率偏低。',
    '但请综合完整画像判断，不要机械套用任何单一维度（例如不要仅因 I/E 就决定高低）。',
    '',
    `MBTI：${canShu.mbti_lei_xing}（首字母 ${canShu.ie_lei_xing} 仅供参考），热身类型：${canShu.re_shen_lei_xing}，性别：${xingBieMiaoShu}。`,
    `性格：${canShu.xing_ge}`,
    `说话风格：${canShu.yan_yu_feng_ge}`,
    `喜欢的类型：${canShu.xi_huan_de_lei_xing}`,
    `背景故事：${canShu.bei_jing_gu_shi}`,
    `情感经历：${canShu.qing_gan_jing_li}`,
    `家庭背景：${canShu.jia_ting_bei_jing}`,
    `标签：${canShu.biao_qian.join('、')}`,
    canShu.shi_fou_zha_xing ? '这人设带点渣，往往会更主动地撩。' : '',
  ]
    .filter(Boolean)
    .join('\n')
}

// 从模型文本输出中容错解析概率，并钳制到 [0.1, 0.9]。解析失败返回 null。
function jieXiGaiLv(shuRu: string): number | null {
  const piPei = shuRu.match(/\d+(\.\d+)?/)
  if (!piPei) return null
  const zhi = Number(piPei[0])
  if (!Number.isFinite(zhi) || zhi <= 0 || zhi > 100) return null
  // 归一为 0~1（兼容"73"与"0.73"两种写法），再钳制到 [0.1, 0.9]。
  const biLi = zhi > 1 ? zhi / 100 : zhi
  return Math.min(ZUI_DA, Math.max(ZUI_XIAO, biLi))
}

/**
 * 计算开场白发送概率（0.1~0.9）。
 * 主流程：AI 根据完整人物画像评估主动发开场白的可能性，输出 10~90 的概率数字。
 * 退化路径：无 AI key / 测试环境 / 解析失败 → 退回固定兜底概率（kaiChangBaiFaSongGaiLv）。
 * 与内容生成（shengChengKaiChangBai）解耦：本函数只决定"发不发的概率"，不决定内容。
 */
export async function jiSuanKaiChangBaiGaiLv(
  canShu: KaiChangBaiShengChengCanShu,
): Promise<number> {
  const apiMiYao = peiZhi.deepSeek.apiMiYao || AI_PEI_ZHI.deepSeek.apiMiYao
  if (!apiMiYao || process.env.VITEST === 'true') {
    return DOU_BEI_GAI_LV
  }
  try {
    const xiangYing = await genJuPeiZhiTiaoYong(
      'kaiChangBaiGaiLv' as keyof typeof AI_PEI_ZHI.moXing,
      [{ jiaoSe: 'user', neiRong: gouJianGaiLvTiShi(canShu) }],
    )
    return jieXiGaiLv(xiangYing.neiRong) ?? DOU_BEI_GAI_LV
  } catch {
    return DOU_BEI_GAI_LV
  }
}
