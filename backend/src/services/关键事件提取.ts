import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianGuanJianShiJianPrompt } from './Prompt构建器'
import type { GongJianShiJianJieGuo } from '../types'

export async function tiQuGuanJianShiJian(
  duiHuaWenBen: string,
  jiaoSeMing: string,
): Promise<GongJianShiJianJieGuo[]> {
  try {
    const xiangYing = await genJuPeiZhiTiaoYong('guanJianShiJian', [
      { jiaoSe: 'system', neiRong: '从聊天记录里挑出关键事件，只输出 JSON 数组。' },
      { jiaoSe: 'user', neiRong: gouJianGuanJianShiJianPrompt(duiHuaWenBen, jiaoSeMing) },
    ])

    return jieXiShiJianShuZu(xiangYing.neiRong)
  } catch (cuoWu) {
    console.error('关键事件提取失败', cuoWu)
    return []
  }
}

function jieXiShiJianShuZu(neiRong: string): GongJianShiJianJieGuo[] {
  const qingLi = neiRong.trim()
  if (!qingLi) return []

  let shuJu: unknown[] = []
  try {
    shuJu = JSON.parse(qingLi) as unknown[]
  } catch {
    const piPei = qingLi.match(/\[[\s\S]*\]/)
    if (piPei) {
      try {
        shuJu = JSON.parse(piPei[0]) as unknown[]
      } catch {
        return []
      }
    } else {
      return []
    }
  }

  if (!Array.isArray(shuJu)) return []

  return shuJu
    .filter((xiang) => typeof xiang === 'object' && xiang !== null)
    .map((xiang) => {
      const shiJian = xiang as Record<string, unknown>
      const queXinDu = Number(shiJian['确信度'] ?? shiJian['que_xin_du'] ?? 0)
      return {
        shi_jian_lei_xing: String(shiJian['事件类型'] ?? shiJian['shi_jian_lei_xing'] ?? '其他'),
        miao_shu: String(shiJian['描述'] ?? shiJian['miao_shu'] ?? ''),
        que_xin_du: Number.isNaN(queXinDu) ? 0 : Math.max(0, Math.min(1, queXinDu)),
      }
    })
}
