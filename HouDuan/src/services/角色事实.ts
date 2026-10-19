import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import type { DuiHuaLiShiXiang } from '../types'
import type { CanShuShangXiaWen } from '../config/AI参数策略'

const ZUI_JIN_TIAO_SHU = 8
const ZUI_DUO_SHI_SHI_TIAO_SHU = 6
const CHAO_SHI_HAO_MIAO = 15000

export async function chouQuZiWoShiShi(
  duiHuaLiShi: DuiHuaLiShiXiang[],
  shangXiaWen?: CanShuShangXiaWen,
): Promise<string[]> {
  const zuiJin = duiHuaLiShi
    .filter((xiang) => xiang.fa_song_zhe_lei_xing === 'yonghu' || xiang.fa_song_zhe_lei_xing === 'jiaose')
    .slice(-ZUI_JIN_TIAO_SHU)
  if (zuiJin.length === 0) return []

  const wenBen = zuiJin
    .map((xiang) => `${xiang.fa_song_zhe_lei_xing === 'jiaose' ? '我' : '对方'}: ${xiang.nei_rong}`)
    .join('\n')

  const caiJi = genJuPeiZhiTiaoYong('writer', [
    { jiaoSe: 'system', neiRong: '你负责从聊天记录里提取「我」自己说过的事实，列成清单。' },
    {
      jiaoSe: 'user',
      neiRong: [
        '最近的聊天：',
        wenBen,
        '',
        '把「我」自己说过的、关于我自己的客观事实列成清单：在哪儿、在干嘛、什么身份、做过什么、有什么、认识谁。',
        '每事一条短句。只列原文明确说过的；对方说的、你推断的、心情和感受都不列。',
        '没有就回复：无',
      ].join('\n'),
    },
  ], shangXiaWen).catch(() => null)

  const chaoShi = new Promise<null>((jieJue) => setTimeout(() => jieJue(null), CHAO_SHI_HAO_MIAO))
  const xiangYing = await Promise.race([caiJi, chaoShi])
  if (!xiangYing) return []

  const neiRong = xiangYing.neiRong.trim()
  if (!neiRong || neiRong === '无') return []

  return neiRong
    .split('\n')
    .map((hang) => hang.replace(/^[·•\-\*\d]+[\.、\)]?\s*/, '').trim())
    .filter((hang) => hang.length > 0 && hang !== '无')
    .slice(0, ZUI_DUO_SHI_SHI_TIAO_SHU)
}
