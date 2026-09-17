import { debug日志 } from '../utils/debug日志'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianDirectorPrompt } from './Prompt构建器'
import { gouJianYongHuTuXiangKuai } from './AI视觉辅助'
import { paiRuZhongShiDuiLie } from './重试队列'
import type { DuiHuaKuai } from '../utils/DeepSeek客户端'
import type { AIYinQingShuRu, DirectorCeLue } from '../types'
import type { CanShuShangXiaWen } from '../config/AI参数策略'

export interface DirectorJieGuo {
  cheng_gong: boolean
  ce_lue: DirectorCeLue
  cuo_wu?: string
  si_kao?: string
}

function moRenCeLue(): DirectorCeLue {
  return {
    yong_hu_yi_tu: 'unknown',
    qing_gan_fen_xi: 'unknown',
    hui_fu_ce_lue: 'unknown',
    shi_fou_hui_fu: true,
    hui_fu_tiao_shu: 1,
    shi_jian_qing_xu: 'unknown',
    shi_fou_che_hui: false,
    shi_fou_zhu_dong_biao_bai: false,
  }
}

function jieXiDirectorXiangYing(neiRong: string): { ceLue: DirectorCeLue; jieXiChengGong: boolean } {
  const qingLiNeiRong = neiRong.trim()
  let shuJu: Record<string, unknown> | null = null

  try {
    shuJu = JSON.parse(qingLiNeiRong)
  } catch {
    const piPei = qingLiNeiRong.match(/\{[\s\S]*\}/)
    if (piPei) {
      try {
        shuJu = JSON.parse(piPei[0])
      } catch {
        return { ceLue: moRenCeLue(), jieXiChengGong: false }
      }
    } else {
      return { ceLue: moRenCeLue(), jieXiChengGong: false }
    }
  }
  if (!shuJu || typeof shuJu !== 'object') {
    return { ceLue: moRenCeLue(), jieXiChengGong: false }
  }

  const huiFuTiaoShu = Number(shuJu['回复条数'] || shuJu['hui_fu_tiao_shu'] || 1)
  const xiuZhengTiaoShu = Number.isNaN(huiFuTiaoShu) ? 1 : Math.max(0, Math.min(5, huiFuTiaoShu))

  return {
    ceLue: {
      yong_hu_yi_tu: String(shuJu['用户意图'] || shuJu['yong_hu_yi_tu'] || 'unknown'),
      qing_gan_fen_xi: String(shuJu['情感分析'] || shuJu['qing_gan_fen_xi'] || 'unknown'),
      hui_fu_ce_lue: String(shuJu['回复策略'] || shuJu['hui_fu_ce_lue'] || 'unknown'),
      shi_fou_hui_fu: Boolean(shuJu['是否回复'] ?? shuJu['shi_fou_hui_fu'] ?? true),
      hui_fu_tiao_shu: xiuZhengTiaoShu,
      shi_jian_qing_xu: String(shuJu['时间情绪'] || shuJu['shi_jian_qing_xu'] || 'unknown'),
      shi_fou_che_hui: Boolean(shuJu['是否撤回'] ?? shuJu['shi_fou_che_hui'] ?? false),
      shi_fou_zhu_dong_biao_bai: Boolean(shuJu['是否主动表白'] ?? shuJu['shi_fou_zhu_dong_biao_bai'] ?? false),
    },
    jieXiChengGong: true,
  }
}

export async function shengChengDirectorCeLue(
  shuRu: AIYinQingShuRu,
  shangXiaWen?: CanShuShangXiaWen,
  waiBuXinHao?: AbortSignal,
): Promise<DirectorJieGuo> {
  try {
    // 历史中用户发的图片/表情包以 input_image 块注入 user 消息（仅 user 可带图，官方限制）
    const tuXiangKuai = await gouJianYongHuTuXiangKuai(shuRu.dui_hua_li_shi)
    const yongHuNeiRong: string | DuiHuaKuai[] =
      tuXiangKuai.length > 0
        ? [{ type: 'input_text', text: gouJianDirectorPrompt(shuRu) }, ...tuXiangKuai]
        : gouJianDirectorPrompt(shuRu)

    const xiangYing = await genJuPeiZhiTiaoYong('director', [
      { jiaoSe: 'system', neiRong: '你负责给角色写回复小纸条，只输出 JSON。让回复像真实大学生/青年恋人聊微信，允许留白、犹豫、推拉和暧昧试探。' },
      { jiaoSe: 'user', neiRong: yongHuNeiRong },
    ], shangXiaWen, waiBuXinHao)

    const { ceLue, jieXiChengGong } = jieXiDirectorXiangYing(xiangYing.neiRong)
    if (!jieXiChengGong) {
      debug日志.error('AI导演', 'Director响应解析失败，已标unknown并入重试队列', {
        xiang_qing: { yuan_wen_chang_du: xiangYing.neiRong.length },
      })
      void paiRuZhongShiDuiLie({ leiXing: 'director', yuanYin: 'jie_xi_shi_bai' })
      return { cheng_gong: false, ce_lue: ceLue, cuo_wu: 'JIE_XI_SHI_BAI' }
    }
    return { cheng_gong: true, ce_lue: ceLue, si_kao: xiangYing.siKaoNeiRong || undefined }
  } catch (cuoWu) {
    const cuoWuXinXi = cuoWu instanceof Error ? cuoWu.message : String(cuoWu)
    const zhuangTaiMa = (cuoWu as { zhuangTaiMa?: unknown }).zhuangTaiMa
    debug日志.error('AI导演', 'Director调用失败', { xiang_qing: { cuo_wu: String(cuoWuXinXi) } })
    if (zhuangTaiMa === 429 || /429/.test(cuoWuXinXi)) {
      return { cheng_gong: false, ce_lue: moRenCeLue(), cuo_wu: 'XIAN_LIU_429' }
    }
    if (zhuangTaiMa === 402 || /402/.test(cuoWuXinXi)) {
      return { cheng_gong: false, ce_lue: moRenCeLue(), cuo_wu: 'YU_E_BU_ZU_402' }
    }
    return {
      cheng_gong: false,
      ce_lue: moRenCeLue(),
      cuo_wu: cuoWuXinXi,
    }
  }
}


