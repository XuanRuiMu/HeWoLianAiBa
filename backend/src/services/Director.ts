import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianDirectorPrompt } from './Prompt构建器'
import type { AIYinQingShuRu, DirectorCeLue } from '../types'

export interface DirectorJieGuo {
  cheng_gong: boolean
  ce_lue: DirectorCeLue
  cuo_wu?: string
}

function moRenCeLue(): DirectorCeLue {
  return {
    yong_hu_yi_tu: '继续聊天',
    qing_gan_fen_xi: '中性',
    hui_fu_ce_lue: '根据人设自然回复',
    shi_fou_hui_fu: true,
    hui_fu_tiao_shu: 1,
    shi_jian_qing_xu: '正常',
    shi_fou_che_hui: false,
  }
}

function jieXiDirectorXiangYing(neiRong: string): DirectorCeLue {
  const qingLiNeiRong = neiRong.trim()
  let shuJu: Record<string, unknown> = {}

  try {
    shuJu = JSON.parse(qingLiNeiRong)
  } catch {
    const piPei = qingLiNeiRong.match(/\{[\s\S]*\}/)
    if (piPei) {
      try {
        shuJu = JSON.parse(piPei[0])
      } catch {
        return moRenCeLue()
      }
    } else {
      return moRenCeLue()
    }
  }

  const huiFuTiaoShu = Number(shuJu['回复条数'] || shuJu['hui_fu_tiao_shu'] || 1)
  const xiuZhengTiaoShu = Number.isNaN(huiFuTiaoShu) ? 1 : Math.max(0, Math.min(5, huiFuTiaoShu))

  return {
    yong_hu_yi_tu: String(shuJu['用户意图'] || shuJu['yong_hu_yi_tu'] || '继续聊天'),
    qing_gan_fen_xi: String(shuJu['情感分析'] || shuJu['qing_gan_fen_xi'] || '中性'),
    hui_fu_ce_lue: String(shuJu['回复策略'] || shuJu['hui_fu_ce_lue'] || '根据人设自然回复'),
    shi_fou_hui_fu: Boolean(shuJu['是否回复'] ?? shuJu['shi_fou_hui_fu'] ?? true),
    hui_fu_tiao_shu: xiuZhengTiaoShu,
    shi_jian_qing_xu: String(shuJu['时间情绪'] || shuJu['shi_jian_qing_xu'] || '正常'),
    shi_fou_che_hui: Boolean(shuJu['是否撤回'] ?? shuJu['shi_fou_che_hui'] ?? false),
    shi_fou_zhu_dong_biao_bai: Boolean(shuJu['是否主动表白'] ?? shuJu['shi_fou_zhu_dong_biao_bai'] ?? false),
  }
}

export async function shengChengDirectorCeLue(shuRu: AIYinQingShuRu): Promise<DirectorJieGuo> {
  try {
    const xiangYing = await genJuPeiZhiTiaoYong('director', [
      { jiaoSe: 'system', neiRong: '你是恋爱模拟导演AI，只输出JSON策略。你的目标是让AI演员的回复像真实大学生/青年恋人微信聊天，允许留白、犹豫、推拉和暧昧试探。' },
      { jiaoSe: 'user', neiRong: gouJianDirectorPrompt(shuRu) },
    ])

    const ceLue = jieXiDirectorXiangYing(xiangYing.neiRong)
    return { cheng_gong: true, ce_lue: ceLue }
  } catch (cuoWu) {
    const cuoWuXinXi = cuoWu instanceof Error ? cuoWu.message : String(cuoWu)
    console.error('Director调用失败', cuoWuXinXi)
    return {
      cheng_gong: false,
      ce_lue: moRenCeLue(),
      cuo_wu: cuoWuXinXi,
    }
  }
}


