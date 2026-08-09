import { huoQuFanYi } from '../config/translations'
import { genJuPeiZhiTiaoYong } from '../utils/DeepSeek客户端'
import { gouJianJunShiQiuZhuPrompt, geShiHuaJunShiLiShi } from './Prompt构建器'
import type { JunShiQiuZhuCanShu, JunShiQiuZhuJieGuo } from '../types'
import type { CanShuShangXiaWen } from '../config/AI参数策略'

export async function shengChengJunShiZhiDao(
  canShu: JunShiQiuZhuCanShu,
  shangXiaWen?: CanShuShangXiaWen,
): Promise<JunShiQiuZhuJieGuo> {
  try {
    const duiHuaWenBen = geShiHuaJunShiLiShi(canShu.dui_hua_li_shi, canShu.jiao_se_ming)
    // 未显式传入上下文时，用调用方已持有的好感度构造关系上下文（向后兼容：无则退回基座）
    const shangXiaWenShiJi = shangXiaWen ?? {
      haoGanDu: {
        zong_fen: canShu.hao_gan_du?.zong_fen,
        guan_xi_jie_duan: canShu.hao_gan_du?.guan_xi_jie_duan,
      },
    }
    const xiangYing = await genJuPeiZhiTiaoYong('junShiQiuZhu', [
      { jiaoSe: 'system', neiRong: canShu.jun_shi_pei_zhi.xiTongTiShi },
      {
        jiaoSe: 'user',
        neiRong: gouJianJunShiQiuZhuPrompt(
          duiHuaWenBen,
          canShu.jiao_se_ming,
          canShu.hao_gan_du,
          canShu.fu_pan_tiao_mu,
        ),
      },
    ], shangXiaWenShiJi)

    return { zhi_dao_nei_rong: xiangYing.neiRong.trim() || huoQuJiangJiWenBen() }
  } catch (cuoWu) {
    console.error('军师指导生成失败', cuoWu)
    return { zhi_dao_nei_rong: huoQuJiangJiWenBen() }
  }
}

function huoQuJiangJiWenBen(): string {
  return huoQuFanYi('junShi', 'zanShiMeiXiangHao')
}
