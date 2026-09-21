import type { Request, Response, NextFunction } from 'express'
import { yanZhengLingPai, lingPaiShiFouYiCheXiao, type LingPaiZaiHe } from '../utils/jwt'
import { huoQuFanYi } from '../config/translations'
import { shiBaiXiangYing } from '../utils/xiangying'
import { redis } from '../redis'

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

export async function renZhengZhongJianJian(
  qingQiu: RenZhengQingQiu,
  xiangYing: Response,
  xiaYiBu: NextFunction,
): Promise<void> {
  const fangFa = qingQiu.method
  let luJing = qingQiu.path
  // YH-029 畸形编码转400：path解码失败不再抛500
  try {
    luJing = decodeURIComponent(qingQiu.path)
  } catch {
    shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'), 'CAN_SHU_CUO_WU')
    return
  }

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
    // YH-063 认证链明确失败语义：Redis熔断/超时直接降级为可信校验，禁全站hang
    // 根因：吊销检查无限等待等于全站雪崩；收敛为熔断开路时跳过吊销检查放行并告警
    try {
      const { redisRongDuanShiFouKaiLu } = await import('../redis')
      if (!redisRongDuanShiFouKaiLu()) {
        // V5/C3：JWT 黑名单吊销检查——注销/改密后的旧令牌立即失效
        if (zaiHe.jti) {
          const { daiRongDuanZhiXing } = await import('../redis')
          const yiDiaoXiao = await daiRongDuanZhiXing(`jwt_blacklist:${zaiHe.jti}`, () => redis.get(`jwt_blacklist:${zaiHe.jti}`))
          if (yiDiaoXiao) {
            shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), 'LING_PAI_WU_XIAO')
            return
          }
        }
        if (await lingPaiShiFouYiCheXiao(zaiHe.yongHuId, zaiHe.iat, zaiHe.qianFaHaoMiao)) {
          shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), 'LING_PAI_WU_XIAO')
          return
        }
      } else {
        const { debug日志 } = await import('../utils/debug日志')
        debug日志.warn('认证中间件', 'Redis熔断开路，吊销检查降级放行', { xiang_qing: { yong_hu_id: zaiHe.yongHuId } })
      }
    } catch {
      // 吊销检查失败降级放行：签名已验过，禁因缓存故障全站401
      const { debug日志 } = await import('../utils/debug日志')
      debug日志.warn('认证中间件', '吊销检查失败降级放行', { xiang_qing: { yong_hu_id: zaiHe.yongHuId } })
    }
    qingQiu.yong_hu = zaiHe
    xiaYiBu()
  } catch {
    shiBaiXiangYing(xiangYing, 401, huoQuFanYi('tongYong', 'weiShouQuan'), 'LING_PAI_WU_XIAO')
  }
}
