import type { Request, Response, NextFunction } from 'express'
import { huoQuFanYi } from '../config/translations'
import { CUO_WU_DAI_MA } from '../config/错误码注册表'
import { shiBaiXiangYing } from '../utils/xiangying'
import { huoQuZhenShiIP } from '../utils/真实IP'
import { zhunHuaYanZhengMaYongTu } from '../services/短信'
import { xiaoHaoRenJiTiaoZhan } from '../services/人机验证'

function quZiFu(qingQiuTi: Record<string, unknown>, tuoFengJian: string, sheXianJian: string): string {
  const tuoFeng = qingQiuTi[tuoFengJian]
  if (typeof tuoFeng === 'string') return tuoFeng
  const sheXian = qingQiuTi[sheXianJian]
  return typeof sheXian === 'string' ? sheXian : ''
}

export async function renJiYanZhengZhongJianJian(
  qingQiu: Request,
  xiangYing: Response,
  xiaYiBu: NextFunction,
): Promise<void> {
  const qingQiuTi = (qingQiu.body ?? {}) as Record<string, unknown>
  const piaoJu = quZiFu(qingQiuTi, 'renJiPiaoJu', 'ren_ji_piao_ju')
  const daAn = quZiFu(qingQiuTi, 'renJiDaAn', 'ren_ji_da_an')
  const yongTu = zhunHuaYanZhengMaYongTu(qingQiuTi.yongTu)
  if (!piaoJu || !daAn) {
    shiBaiXiangYing(
      xiangYing,
      400,
      huoQuFanYi('renZheng', 'renJiYanZhengWeiTongGuo'),
      CUO_WU_DAI_MA.AUTH_HUMAN_VERIFICATION_FAILED,
    )
    return
  }
  const jieGuo = await xiaoHaoRenJiTiaoZhan(piaoJu, daAn, huoQuZhenShiIP(qingQiu), yongTu)
  if (jieGuo.cheng_gong) {
    xiaYiBu()
    return
  }
  if (jieGuo.yuanYin === 'neiBuCuoWu') {
    shiBaiXiangYing(
      xiangYing,
      503,
      huoQuFanYi('tongYong', 'huanCunWeiBeiHouXu'),
      CUO_WU_DAI_MA.DEPENDENCY_REDIS_UNAVAILABLE,
    )
    return
  }
  shiBaiXiangYing(
    xiangYing,
    400,
    huoQuFanYi('renZheng', 'renJiYanZhengWeiTongGuo'),
    CUO_WU_DAI_MA.AUTH_HUMAN_VERIFICATION_FAILED,
  )
}
