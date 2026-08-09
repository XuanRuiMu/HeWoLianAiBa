import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianJiYiZhaiYaoPrompt } from './Prompt构建器'
import type { JiYiZhaiYaoJieGuo } from '../types'
import type { CanShuShangXiaWen } from '../config/AI参数策略'

export async function shengChengJiYiZhaiYao(
  duiHuaWenBen: string,
  jiaoSeMing: string,
  shangXiaWen?: CanShuShangXiaWen,
): Promise<JiYiZhaiYaoJieGuo> {
  try {
    const xiangYing = await genJuPeiZhiTiaoYong('jiYiZhaiYao', [
      { jiaoSe: 'system', neiRong: '用几句话把聊天记录里值得记住的内容串起来。' },
      { jiaoSe: 'user', neiRong: gouJianJiYiZhaiYaoPrompt(duiHuaWenBen, jiaoSeMing) },
    ], shangXiaWen)

    return {
      zhai_yao: xiangYing.neiRong.trim() || '暂无摘要',
      guan_jian_ci: [],
    }
  } catch (cuoWu) {
    console.error('记忆摘要失败', cuoWu)
    return { zhai_yao: '暂无摘要', guan_jian_ci: [] }
  }
}
