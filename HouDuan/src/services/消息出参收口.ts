import { shiYunYingZiDuanXiaoXiLeiXing } from '../config/消息配置'
import { anYongHuIdJuBeiNengLi } from '../middleware/管理员'
import { debug日志 } from '../utils/debug日志'
import type { XiaoXiXinXi } from './消息'


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

function mianYunYingZiDuan(xiao_xi: XiaoXiXinXi): XiaoXiXinXi {
  if (xiao_xi.yuan_shi_nei_rong === undefined) return xiao_xi
  const shouXie: XiaoXiXinXi = { ...xiao_xi }
  delete shouXie.yuan_shi_nei_rong
  return shouXie
}

export async function shouKouXiaoXiYunYingZiDuan(
  xiao_xi: XiaoXiXinXi | undefined,
  duFangYongHuId: string,
): Promise<XiaoXiXinXi | undefined> {
  if (!xiao_xi) return xiao_xi
  if (await yunYingZiDuanKeDu(duFangYongHuId)) return xiao_xi
  return mianYunYingZiDuan(xiao_xi)
}

export async function shouKouXiaoXiLieBiaoYunYingZiDuan(
  xiao_xi_lie_biao: XiaoXiXinXi[],
  duFangYongHuId: string,
): Promise<XiaoXiXinXi[]> {
  const keDu = await yunYingZiDuanKeDu(duFangYongHuId)
  return xiao_xi_lie_biao
    .filter((xiao_xi) => keDu || !shiYunYingZiDuanXiaoXiLeiXing(xiao_xi.lei_xing))
    .map((xiao_xi) => (keDu ? xiao_xi : mianYunYingZiDuan(xiao_xi)))
}
