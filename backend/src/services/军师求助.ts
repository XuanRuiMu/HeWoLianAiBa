import { JUN_SHI_PEI_ZHI_MO_REN } from '../config/军师配置'
import { huoQuFanYi } from '../config/translations'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianJunShiQiuZhuPrompt, geShiHuaJunShiLiShi } from './Prompt构建器'
import type { JunShiQiuZhuCanShu, JunShiQiuZhuJieGuo } from '../types'

export async function shengChengJunShiZhiDao(canShu: JunShiQiuZhuCanShu): Promise<JunShiQiuZhuJieGuo> {
  try {
    const duiHuaWenBen = geShiHuaJunShiLiShi(canShu.dui_hua_li_shi, canShu.jiao_se_ming)
    const xiangYing = await genJuPeiZhiTiaoYong('junShiQiuZhu', [
      { jiaoSe: 'system', neiRong: JUN_SHI_PEI_ZHI_MO_REN.xiTongTiShi },
      {
        jiaoSe: 'user',
        neiRong: gouJianJunShiQiuZhuPrompt(
          duiHuaWenBen,
          canShu.jiao_se_ming,
          canShu.hao_gan_du,
          canShu.fu_pan_tiao_mu,
        ),
      },
    ])

    return { zhi_dao_nei_rong: xiangYing.neiRong.trim() || huoQuJiangJiWenBen() }
  } catch (cuoWu) {
    console.error('军师指导生成失败', cuoWu)
    return { zhi_dao_nei_rong: huoQuJiangJiWenBen() }
  }
}

function huoQuJiangJiWenBen(): string {
  return huoQuFanYi('junShi', 'zanShiMeiXiangHao')
}
