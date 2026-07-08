import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianAnQuanShenHePrompt } from './Prompt构建器'
import type { AnQuanShenHeJieGuo } from '../types'

export async function shenHeNeiRongAnQuan(xiaoXi: string): Promise<AnQuanShenHeJieGuo> {
  try {
    const xiangYing = await genJuPeiZhiTiaoYong('anQuanShenHe', [
      { jiaoSe: 'system', neiRong: '你是内容安全审核员，只输出JSON。' },
      { jiaoSe: 'user', neiRong: gouJianAnQuanShenHePrompt(xiaoXi) },
    ])

    const shuJu = jieXiJSON(xiangYing.neiRong)
    const queXinDu = Number(shuJu['确信度'] ?? shuJu['que_xin_du'] ?? 0)
    const weiGui = Boolean(shuJu['违规'] ?? shuJu['wei_gui'] ?? false)
    const yanZhongChengDu = shuJu['严重程度'] ?? shuJu['yan_zhong_cheng_du']

    return {
      wei_gui: weiGui && queXinDu > 0.8,
      yan_zhong_cheng_du: xiuZhengYanZhongChengDu(yanZhongChengDu),
      lei_xing: String(shuJu['类型'] ?? shuJu['lei_xing'] ?? ''),
      li_you: String(shuJu['理由'] ?? shuJu['li_you'] ?? ''),
    }
  } catch (cuoWu) {
    console.error('安全审核失败', cuoWu)
    return { wei_gui: false }
  }
}

function xiuZhengYanZhongChengDu(
  zhi: unknown,
): 'qing_wei' | 'zhong_deng' | 'yan_zhong' | undefined {
  if (zhi === '轻微' || zhi === 'qing_wei') return 'qing_wei'
  if (zhi === '中等' || zhi === 'zhong_deng') return 'zhong_deng'
  if (zhi === '严重' || zhi === 'yan_zhong') return 'yan_zhong'
  return undefined
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
