import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import type { Request, Response, NextFunction } from 'express'
import { peiZhi } from '../config'
import { huoQuFanYi, type FanYiFenLei } from '../config/translations'
import { shiBaiXiangYing } from '../utils/xiangying'
import { huoQuZhenShiIP } from '../utils/真实IP'
import { redis, dengDaiRedisJiuXu } from '../redis'
import { debug日志 } from '../utils/debug日志'
import { CUO_WU_DAI_MA } from '../config/错误码注册表'

function chuangJianRedisStore(): RedisStore {
  const cunChu = new RedisStore({
    sendCommand: (...canShu: [string, ...string[]]) =>
      (redis as unknown as { call: (...args: [string, ...string[]]) => unknown }).call(...canShu),
  } as never)
  const zuiDaYanChiCiShu = 3
  let yiYanChiCiShu = 0
  const yuanInit = RedisStore.prototype.init
  ;(cunChu as unknown as { init: (canShu: unknown) => Promise<void> }).init = async (canShu: unknown) => {
    if (redis.status !== 'ready' && yiYanChiCiShu < zuiDaYanChiCiShu) {
      yiYanChiCiShu += 1
      await dengDaiRedisJiuXu()
    }
    return yuanInit.call(cunChu, canShu as never)
  }
  return cunChu
}

const xianLiuRiZhiQi = {
  warn: (...canShu: unknown[]) => touFangRiZhi('warn', canShu),
  error: (...canShu: unknown[]) => touFangRiZhi('error', canShu),
}

function touFangRiZhi(jiBie: 'warn' | 'error', canShu: unknown[]): void {
  const [cuoWu, ...qiYu] = canShu
  const yuanYin = cuoWu instanceof Error ? cuoWu.message : String(cuoWu)
  debug日志[jiBie]('限流', String(qiYu[0] ?? '限流器告警'), {
    xiang_qing: { yuan_yin: yuanYin.slice(0, 200) },
  })
}

export function shengChengXianLiuJian(qingQiu: Request): string {
  return ipKeyGenerator(huoQuZhenShiIP(qingQiu))
}

function huoQuQingQiuIP(req: Request): string {
  try {
    return ipKeyGenerator(huoQuZhenShiIP(req))
  } catch {
    return 'unknown'
  }
}

function huoQuYongHuId(req: Request): string | undefined {
  return (req as Request & { yong_hu?: { yongHuId: string } }).yong_hu?.yongHuId
}

function tongYongXianLiu(
  windowsMs: number,
  max: number,
  cuoWuTiShi: string,
  keyGenerator?: (req: Request) => string,
  fanYiFenLei: FanYiFenLei = 'renZheng',
) {
  return rateLimit({
    windowMs: windowsMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: chuangJianRedisStore(),
    passOnStoreError: true,
    logger: xianLiuRiZhiQi,
    keyGenerator: keyGenerator
      ? (req) => keyGenerator(req as Request)
      : (req) => huoQuQingQiuIP(req as Request),
    handler: (req, res) => {
      shiBaiXiangYing(
        res,
        429,
        (huoQuFanYi as (fenLei: FanYiFenLei, jian: string) => string)(fanYiFenLei, cuoWuTiShi),
        CUO_WU_DAI_MA.RATE_LIMITED,
      )
    },
  })
}

function huoQuLuJingFenDang(req: Request): string {
  const luJing = `${req.baseUrl || ''}${req.path || ''}` || '/'
  if (luJing.startsWith('/api/认证') || luJing.startsWith('/api/资料') || luJing.startsWith('/api/用户设置')) return 'ren_zheng_mian'
  return 'ye_wu_mian'
}

export const changGuiXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.changGui.chuangKou,
  peiZhi.xianLiu.changGui.zuiDa,
  'dengLuShiBaiPinFan',
  (req) => `${huoQuQingQiuIP(req)}:${huoQuLuJingFenDang(req)}`,
)

function huoQuShouJiHao(req: Request): string | undefined {
  const qingQiuTi = req.body as { shou_ji_hao?: string; shouJiHao?: string }
  return qingQiuTi?.shou_ji_hao || qingQiuTi?.shouJiHao
}

export const dengLuXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.dengLu.chuangKou * 12,
  peiZhi.xianLiu.dengLu.zuiDa * 4,
  'dengLuShiBaiPinFan',
  (req) => {
    const zhangHao = huoQuShouJiHao(req)
    return zhangHao ? `zhanghao:${zhangHao}` : huoQuQingQiuIP(req)
  },
)

export const dengLuIPLianLiu = tongYongXianLiu(
  peiZhi.xianLiu.dengLu.chuangKou,
  peiZhi.xianLiu.dengLu.zuiDa,
  'dengLuShiBaiPinFan',
  (req) => huoQuQingQiuIP(req),
)

export const faSongMaXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.faSongMa.chuangKou,
  peiZhi.xianLiu.faSongMa.zuiDa,
  'faSongYanZhengMaPinFan',
  (req) => {
    const zhangHao = huoQuShouJiHao(req)
    return zhangHao ? `zhanghao:${zhangHao}` : huoQuQingQiuIP(req)
  },
)

export const liaoTianXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.liaoTian.chuangKou,
  peiZhi.xianLiu.liaoTian.zuiDa,
  'dengLuShiBaiPinFan',
  (req) => huoQuYongHuId(req) || huoQuQingQiuIP(req),
)

export const aiQingQiuXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.aiQingQiu.chuangKou,
  peiZhi.xianLiu.aiQingQiu.zuiDa,
  'dengLuShiBaiPinFan',
  (req) => huoQuYongHuId(req) || huoQuQingQiuIP(req),
)

export const guanLiCaoZuoXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.guanLi.chuangKou,
  peiZhi.xianLiu.guanLi.zuiDa,
  'caoZuoPinFan',
  (req) => huoQuYongHuId(req) || huoQuQingQiuIP(req),
  'tongYong',
)

export const riZhiJieShouXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.riZhiJieShou.chuangKou,
  peiZhi.xianLiu.riZhiJieShou.zuiDa,
  'caoZuoPinFan',
  (req) => huoQuQingQiuIP(req),
  'tongYong',
)

export const jianChaShouJiXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.jianChaShouJi.chuangKou,
  peiZhi.xianLiu.jianChaShouJi.zuiDa,
  'caoZuoPinFan',
  (req) => huoQuQingQiuIP(req),
  'tongYong',
)

export const chongZhiMiMaXianLiu = tongYongXianLiu(
  10 * 60 * 1000,
  peiZhi.xianLiu.chongZhiMiMa.zuiDa,
  'chongZhiMiMaPinFan',
  (req) => {
    const zhangHao = huoQuShouJiHao(req)
    return zhangHao ? `zhanghao:${zhangHao}` : huoQuQingQiuIP(req)
  },
)

export const zhuCeXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.zhuCe.chuangKou,
  peiZhi.xianLiu.zhuCe.zuiDa,
  'zhuCePinFan',
  (req) => huoQuQingQiuIP(req),
  'renZheng',
)

export async function duanXinRiPeiEZhuJi(
  qingQiu: Request,
  xiangYing: Response,
  xiaYiBu: NextFunction,
): Promise<void> {
  try {
    const { duanXinRiPeiEYunXu } = await import('../services/短信')
    const shouJiHao = (qingQiu.body as { shou_ji_hao?: string; shouJiHao?: string })
      ?.shou_ji_hao || (qingQiu.body as { shouJiHao?: string })?.shouJiHao
    if (!shouJiHao) {
      xiaYiBu()
      return
    }
    const jieGuo = await duanXinRiPeiEYunXu(shouJiHao, huoQuZhenShiIP(qingQiu))
    if (!jieGuo.yun_xu) {
      shiBaiXiangYing(xiangYing, 429, jieGuo.ti_shi || huoQuFanYi('renZheng', 'duanXinRiPeiEYongJin'), CUO_WU_DAI_MA.AUTH_SMS_RATE_LIMITED)
      return
    }
    xiaYiBu()
  } catch (cuoWu) {
    try {
      const { faSongGaoJing } = await import('../utils/邮件告警')
      await faSongGaoJing('xian_liu_zhong_jian_jian_jiang_ji', '限流中间件降级放行', `短信配额中间件异常已兜底放行：${String(cuoWu).slice(0, 300)}`)
    } catch {
      return xiaYiBu()
    }
    xiaYiBu()
  }
}
