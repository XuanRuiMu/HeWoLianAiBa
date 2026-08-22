import { AI_PEI_ZHI } from '../config/AI配置'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianHaoGanDuPingPanPrompt } from './Prompt构建器'
import type { HaoGanDuPingPanJieGuo } from '../types'
import type { CanShuShangXiaWen } from '../config/AI参数策略'
import { shiFouManRe, MAN_RE_HAO_GAN_DU_JIA_CHENG } from '../config/AI参数策略'

export async function pingPanHaoGanDuBianHua(
  yongHuXiaoXi: string,
  jiaoSeHuiFu: string,
  jiaoSeMing: string,
  shangXiaWen?: CanShuShangXiaWen,
): Promise<HaoGanDuPingPanJieGuo> {
  try {
    const xiangYing = await genJuPeiZhiTiaoYong('haoGanDuPingPan', [
      { jiaoSe: 'system', neiRong: '根据一轮对话判断好感变化，只输出 JSON。' },
      {
        jiaoSe: 'user',
        neiRong: gouJianHaoGanDuPingPanPrompt(yongHuXiaoXi, jiaoSeHuiFu, jiaoSeMing, shangXiaWen),
      },
    ], shangXiaWen)

    const shuJu = jieXiJSON(xiangYing.neiRong)

    const manReJiaCheng = shiFouManRe(shangXiaWen) ? MAN_RE_HAO_GAN_DU_JIA_CHENG : 1

    return {
      xin_ren_du_bian_hua: xiuZhengFanWei(
        Math.round(Number(shuJu['信任度变化'] ?? shuJu['xin_ren_du_bian_hua'] ?? 0) * manReJiaCheng),
      ),
      qin_mi_du_bian_hua: xiuZhengFanWei(
        Math.round(Number(shuJu['亲密度变化'] ?? shuJu['qin_mi_du_bian_hua'] ?? 0) * manReJiaCheng),
      ),
      qu_wei_du_bian_hua: xiuZhengFanWei(
        Math.round(Number(shuJu['趣味度变化'] ?? shuJu['qu_wei_du_bian_hua'] ?? 0) * manReJiaCheng),
      ),
      guan_huai_du_bian_hua: xiuZhengFanWei(
        Math.round(Number(shuJu['关怀度变化'] ?? shuJu['guan_huai_du_bian_hua'] ?? 0) * manReJiaCheng),
      ),
      li_you: String(shuJu['理由'] ?? shuJu['li_you'] ?? ''),
    }
  } catch (cuoWu) {
    console.error('好感度评判失败', cuoWu)
    return {
      xin_ren_du_bian_hua: 0,
      qin_mi_du_bian_hua: 0,
      qu_wei_du_bian_hua: 0,
      guan_huai_du_bian_hua: 0,
      li_you: '',
    }
  }
}

function xiuZhengFanWei(zhi: number): number {
  if (Number.isNaN(zhi)) return 0
  return Math.max(
    AI_PEI_ZHI.haoGanDu.zuiXiaoBianHua,
    Math.min(AI_PEI_ZHI.haoGanDu.zuiDaBianHua, zhi),
  )
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
