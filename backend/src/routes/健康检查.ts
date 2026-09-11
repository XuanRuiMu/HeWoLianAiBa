import { debug日志 } from '../utils/debug日志'
import { Router } from 'express'
import type { Request, Response } from 'express'
import promClient from 'prom-client'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuZhenShiIP, shiDuanKeXinDaiLi } from '../utils/真实IP'

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

const luYou = Router()

luYou.get('/health', async (_qingQiu: Request, xiangYing: Response) => {
  let shuJuKu: 'zhengChang' | 'yiChang' = 'yiChang'
  let huanCun: 'zhengChang' | 'yiChang' = 'yiChang'

  try {
    await 数据库.query('SELECT 1')
    shuJuKu = 'zhengChang'
  } catch {
    shuJuKu = 'yiChang'
  }

  try {
    const jieGuo = await redis.ping()
    if (jieGuo === 'PONG') {
      huanCun = 'zhengChang'
    }
  } catch {
    huanCun = 'yiChang'
  }

  const zhuangTai = shuJuKu === 'zhengChang' && huanCun === 'zhengChang' ? 'jianKang' : 'yiChang'
  const zhuangTaiMa = zhuangTai === 'jianKang' ? 200 : 503

  xiangYing.status(zhuangTaiMa).json({
    zhuangTai,
    shu_ju_ku: shuJuKu,
    huan_cun: huanCun,
    shi_jian_chuo: new Date().toISOString(),
  })
})

// A11：/metrics 仅限内网/本机监控系统抓取，公网请求一律 403
luYou.get('/metrics', (qingQiu: Request, xiangYing: Response) => {
  const duiXiang = huoQuZhenShiIP(qingQiu)
  if (!shiDuanKeXinDaiLi(duiXiang) && !shiDuanKeXinDaiLi(qingQiu.socket.remoteAddress || '')) {
    xiangYing.status(403).end('Forbidden')
    return
  }
  void (async () => {
    try {
      const zhiBiaoWenBen = await zhuCeBiao.metrics()
      xiangYing.set('Content-Type', zhuCeBiao.contentType)
      xiangYing.end(zhiBiaoWenBen)
    } catch (cuoWu) {
      debug日志.error('监控指标', '生成metrics失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
      xiangYing.status(500).end('# 生成metrics失败\n')
    }
  })()
})

export { luYou, qingQiuJiShu, qingQiuHaoShi }
export default luYou
