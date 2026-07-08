import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import type { Request } from 'express'
import { peiZhi } from '../config'
import { huoQuFanYi, type FanYiFenLei } from '../config/translations'
import { shiBaiXiangYing } from '../utils/xiangying'

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
    keyGenerator: keyGenerator
      ? (req) => keyGenerator(req as Request)
      : (req) => (req.ip ? ipKeyGenerator(req.ip) : 'unknown'),
    handler: (req, res) => {
      shiBaiXiangYing(res, 429, (huoQuFanYi as any)(fanYiFenLei, cuoWuTiShi), 'XIAN_LIU')
    },
  })
}

function huoQuLuJing(req: Request): string {
  return `${req.baseUrl || ''}${req.path || ''}` || '/'
}

export const changGuiXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.changGui.chuangKou,
  peiZhi.xianLiu.changGui.zuiDa,
  'dengLuShiBaiPinFan',
  (req) => {
    const ip = req.ip ? ipKeyGenerator(req.ip) : 'unknown'
    return `${ip}:${huoQuLuJing(req)}`
  },
)

function huoQuShouJiHao(req: Request): string | undefined {
  const body = req.body as { shou_ji_hao?: string; shouJiHao?: string }
  return body?.shou_ji_hao || body?.shouJiHao
}

export const dengLuXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.dengLu.chuangKou,
  peiZhi.xianLiu.dengLu.zuiDa,
  'dengLuShiBaiPinFan',
  (req) => {
    return huoQuShouJiHao(req) || (req.ip ? ipKeyGenerator(req.ip) : 'unknown')
  },
)

export const faSongMaXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.faSongMa.chuangKou,
  peiZhi.xianLiu.faSongMa.zuiDa,
  'faSongYanZhengMaPinFan',
  (req) => {
    return huoQuShouJiHao(req) || (req.ip ? ipKeyGenerator(req.ip) : 'unknown')
  },
)

export const liaoTianXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.liaoTian.chuangKou,
  peiZhi.xianLiu.liaoTian.zuiDa,
  'dengLuShiBaiPinFan',
  (req) => {
    const yongHuId = (req as Request & { yong_hu?: { yongHuId: string } }).yong_hu?.yongHuId
    return yongHuId || (req.ip ? ipKeyGenerator(req.ip) : 'unknown')
  },
)

export const aiQingQiuXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.aiQingQiu.chuangKou,
  peiZhi.xianLiu.aiQingQiu.zuiDa,
  'dengLuShiBaiPinFan',
  (req) => {
    const yongHuId = (req as Request & { yong_hu?: { yongHuId: string } }).yong_hu?.yongHuId
    return yongHuId || (req.ip ? ipKeyGenerator(req.ip) : 'unknown')
  },
)

export const guanLiCaoZuoXianLiu = tongYongXianLiu(
  peiZhi.xianLiu.guanLi.chuangKou,
  peiZhi.xianLiu.guanLi.zuiDa,
  'caoZuoPinFan',
  (req) => {
    const yongHuId = (req as Request & { yong_hu?: { yongHuId: string } }).yong_hu?.yongHuId
    return yongHuId || (req.ip ? ipKeyGenerator(req.ip) : 'unknown')
  },
  'tongYong',
)
