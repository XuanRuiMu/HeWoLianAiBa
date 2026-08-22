import type { Request, Response, NextFunction } from 'express'
import { yanZhengLingPai, shengChengLingPai, type LingPaiZaiHe } from '../utils/jwt'
import { huoQuFanYi } from '../config/translations'
import { shiBaiXiangYing } from '../utils/xiangying'

export interface RenZhengQingQiu extends Request {
  yong_hu?: LingPaiZaiHe
}

export interface GongKaiLuJing {
  fang_fa: string | string[]
  lu_jing: string
}

export const gongKaiLuJingBaiMingDan: GongKaiLuJing[] = [
  { fang_fa: 'GET', lu_jing: '/api/认证/检查手机' },
  { fang_fa: 'POST', lu_jing: '/api/认证/发送码' },
  { fang_fa: 'POST', lu_jing: '/api/认证/注册' },
  { fang_fa: 'POST', lu_jing: '/api/认证/登录' },
  { fang_fa: 'GET', lu_jing: '/api/健康' },
  // 媒体下载走签名 URL 自鉴权（img/audio 标签无法携带 Authorization 头）
  { fang_fa: 'GET', lu_jing: '/api/媒体/' },
]

function luJingPiPei(qingQiuLuJing: string, muBiaoLuJing: string): boolean {
  if (muBiaoLuJing.includes('?')) {
    return qingQiuLuJing.startsWith(muBiaoLuJing.split('?')[0])
  }
  // 以 / 结尾的白名单条目按前缀匹配
  if (muBiaoLuJing.endsWith('/')) {
    return qingQiuLuJing.startsWith(muBiaoLuJing)
  }
  return qingQiuLuJing === muBiaoLuJing
}

export function renZhengZhongJianJian(
  qingQiu: RenZhengQingQiu,
  xiangYing: Response,
  xiaYiBu: NextFunction,
): void {
  const fangFa = qingQiu.method
  const luJing = decodeURIComponent(qingQiu.path)

  const zaiBaiMingDan = gongKaiLuJingBaiMingDan.some((xiang) => {
    const fangFaPiPei = Array.isArray(xiang.fang_fa)
      ? xiang.fang_fa.includes(fangFa)
      : xiang.fang_fa === fangFa
    return fangFaPiPei && luJingPiPei(luJing, xiang.lu_jing)
  })

  if (zaiBaiMingDan) {
    xiaYiBu()
    return
  }

  const authorization = qingQiu.headers.authorization
  if (!authorization || !authorization.startsWith('Bearer ')) {
    shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), 'WEI_SHOU_QUAN')
    return
  }

  const lingPai = authorization.slice(7)
  try {
    const zaiHe = yanZhengLingPai(lingPai)
    qingQiu.yong_hu = zaiHe
    xiaYiBu()
  } catch {
    shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), 'LING_PAI_WU_XIAO')
  }
}

export function chongXinShengChengLingPai(
  qingQiu: RenZhengQingQiu,
  xiangYing: Response,
  xiaYiBu: NextFunction,
): void {
  if (qingQiu.yong_hu) {
    const xinLingPai = shengChengLingPai({
      yongHuId: qingQiu.yong_hu.yongHuId,
      shouJiHao: qingQiu.yong_hu.shouJiHao,
    })
    xiangYing.setHeader('X-Renew-Token', xinLingPai)
  }
  xiaYiBu()
}
