import { debug日志 } from '../utils/debug日志'
import { Router } from 'express'
import type { Request, Response } from 'express'
import promClient from 'prom-client'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuZhenShiIP, shiDuanKeXinDaiLi } from '../utils/真实IP'
import { chuangJianCuoWuXiangYing, shiBaiXiangYing } from '../utils/xiangying'
import { queDingXiangYingZhuanZongId } from '../middleware/日志追踪'
import { CUO_WU_DAI_MA, type CuoWuDaiMa } from '../config/错误码注册表'

const zhuCeBiao = new promClient.Registry()
promClient.collectDefaultMetrics({ register: zhuCeBiao })

const qingQiuJiShu = new promClient.Counter({
  name: 'http_qing_qiu_zong_shu',
  help: 'HTTP请求总数',
  labelNames: ['fang_fa', 'lu_jing', 'zhuang_tai_ma'],
  registers: [zhuCeBiao],
})

const qingQiuHaoShi = new promClient.Histogram({
  name: 'http_qing_qiu_hao_shi_haomi',
  help: 'HTTP请求耗时(毫秒)',
  labelNames: ['fang_fa', 'lu_jing', 'zhuang_tai_ma'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [zhuCeBiao],
})

type JianKangZhuangTai = {
  shuJuKu: 'zhengChang' | 'yiChang'
  huanCun: 'zhengChang' | 'yiChang'
  daiMa: CuoWuDaiMa | null
}

async function jianChaJianKang(): Promise<JianKangZhuangTai> {
  let shuJuKu: JianKangZhuangTai['shuJuKu'] = 'yiChang'
  let huanCun: JianKangZhuangTai['huanCun'] = 'yiChang'
  try {
    await 数据库.query('SELECT 1')
    shuJuKu = 'zhengChang'
  } catch {
    shuJuKu = 'yiChang'
  }
  try {
    const jieGuo = await redis.ping()
    if (jieGuo === 'PONG') huanCun = 'zhengChang'
  } catch {
    huanCun = 'yiChang'
  }
  const daiMa = shuJuKu === 'yiChang' && huanCun === 'yiChang'
    ? CUO_WU_DAI_MA.DEPENDENCIES_UNAVAILABLE
    : shuJuKu === 'yiChang'
      ? CUO_WU_DAI_MA.DEPENDENCY_POSTGRES_UNAVAILABLE
      : huanCun === 'yiChang'
        ? CUO_WU_DAI_MA.DEPENDENCY_REDIS_UNAVAILABLE
        : null
  return { shuJuKu, huanCun, daiMa }
}

async function faSongJianKang(xiangYing: Response): Promise<void> {
  const zhuangTai = await jianChaJianKang()
  const shuJu = {
    zhuangTai: zhuangTai.daiMa ? 'yiChang' : 'jianKang',
    shu_ju_ku: zhuangTai.shuJuKu,
    huan_cun: zhuangTai.huanCun,
    shi_jian_chuo: new Date().toISOString(),
  }
  if (!zhuangTai.daiMa) {
    xiangYing.status(200).json(shuJu)
    return
  }
  const traceId = queDingXiangYingZhuanZongId(xiangYing)
  const cuoWu = chuangJianCuoWuXiangYing(503, '', zhuangTai.daiMa)
  xiangYing.status(503).json({ ...cuoWu, traceId, ...shuJu })
}

const luYou = Router()

luYou.get('/health', async (_qingQiu: Request, xiangYing: Response) => {
  await faSongJianKang(xiangYing)
})

luYou.get('/readyz', async (_qingQiu: Request, xiangYing: Response) => {
  await faSongJianKang(xiangYing)
})

luYou.get('/metrics', (qingQiu: Request, xiangYing: Response) => {
  const duiXiang = huoQuZhenShiIP(qingQiu)
  if (!shiDuanKeXinDaiLi(duiXiang) && !shiDuanKeXinDaiLi(qingQiu.socket.remoteAddress || '')) {
    shiBaiXiangYing(xiangYing, 403, '', CUO_WU_DAI_MA.PERMISSION_DENIED)
    return
  }
  void (async () => {
    try {
      const zhiBiaoWenBen = await zhuCeBiao.metrics()
      xiangYing.set('Content-Type', zhuCeBiao.contentType)
      xiangYing.end(zhiBiaoWenBen)
    } catch (cuoWu) {
      debug日志.error('监控指标', '生成metrics失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      shiBaiXiangYing(xiangYing, 500, '', CUO_WU_DAI_MA.INTERNAL_ERROR)
    }
  })()
})

export { luYou, qingQiuJiShu, qingQiuHaoShi }
export default luYou
