import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianJiYiZhaiYaoPrompt } from './Prompt构建器'
import type { JiYiZhaiYaoJieGuo } from '../types'

export async function shengChengJiYiZhaiYao(
  duiHuaWenBen: string,
  jiaoSeMing: string,
): Promise<JiYiZhaiYaoJieGuo> {
  try {
    const xiangYing = await genJuPeiZhiTiaoYong('jiYiZhaiYao', [
      { jiaoSe: 'system', neiRong: '你是记忆摘要专家，输出简洁中文摘要。' },
      { jiaoSe: 'user', neiRong: gouJianJiYiZhaiYaoPrompt(duiHuaWenBen, jiaoSeMing) },
    ])

    return {
      zhai_yao: xiangYing.neiRong.trim() || '暂无摘要',
      guan_jian_ci: [],
    }
  } catch (cuoWu) {
    console.error('记忆摘要失败', cuoWu)
    return { zhai_yao: '暂无摘要', guan_jian_ci: [] }
  }
}
