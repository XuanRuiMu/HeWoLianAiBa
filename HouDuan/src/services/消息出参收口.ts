import { shiYunYingZiDuanXiaoXiLeiXing } from '../config/消息配置'
import { huoQuFanYi } from '../config/translations'
import { anYongHuIdJuBeiNengLi } from '../middleware/管理员'
import { debug日志 } from '../utils/debug日志'
import type { 消息信息 } from './消息'


async function yunYingZiDuanKeDu(duFangYongHuId: string): Promise<boolean> {
  if (!duFangYongHuId) return false
  try {
    return await anYongHuIdJuBeiNengLi(duFangYongHuId, 'cha_kan')
  } catch (cuoWu) {
    debug日志.error('消息出参收口', '运营字段读取能力判定失败，按无权限处理', {
      xiang_qing: { cuo_wu: String(cuoWu) },
    })
    return false
  }
}

function mianYunYingZiDuan(xiao_xi: 消息信息): 消息信息 {
  const shouXie: 消息信息 = { ...xiao_xi }
  delete shouXie.neiRongYuanWen
  if (xiao_xi.yi_che_hui === true) {
    shouXie.nei_rong = xiao_xi.nei_rong || huoQuFanYi('liaoTian', 'duiFangCheHuiLeYiTiaoXiaoXi')
  }
  return shouXie
}

export async function shouKouXiaoXiYunYingZiDuan(
  xiao_xi: 消息信息 | undefined,
  duFangYongHuId: string,
): Promise<消息信息 | undefined> {
  if (!xiao_xi) return xiao_xi
  if (await yunYingZiDuanKeDu(duFangYongHuId)) return xiao_xi
  return mianYunYingZiDuan(xiao_xi)
}

export async function shouKouXiaoXiLieBiaoYunYingZiDuan(
  xiao_xi_lie_biao: 消息信息[],
  duFangYongHuId: string,
): Promise<消息信息[]> {
  const keDu = await yunYingZiDuanKeDu(duFangYongHuId)
  return xiao_xi_lie_biao
    .filter((xiao_xi) => keDu || !shiYunYingZiDuanXiaoXiLeiXing(xiao_xi.lei_xing))
    .map((xiao_xi) => (keDu ? xiao_xi : mianYunYingZiDuan(xiao_xi)))
}
