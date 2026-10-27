import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'
import { peiZhi } from './config'
import { huoQuFanYi } from './config/translations'
import { debug日志, qingLiNeiBuCuoWu } from './utils/debug日志'
import { ziJianMoXingMingKeYong } from './utils/DeepSeek客户端'
import { renZhengZhongJianJian } from './middleware/认证'
import { changGuiXianLiu, riZhiJieShouXianLiu } from './middleware/限流'
import { anQuanZhongJianJian } from './middleware/安全'
import { huoQuZhenShiIP } from './utils/真实IP'
import { IP封禁中间件 } from './middleware/IP封禁'
import { 日志追踪中间件 } from './middleware/日志追踪'
import renZhengLuYou from './routes/认证'
import jiaoSeLuYou from './routes/角色'
import jiaoSeXiangQingLuYou from './routes/角色详情'
import xiaoXiLuYou from './routes/消息'
import meiTiLuYou from './routes/媒体'
import haoGanDuLuYou from './routes/好感度'
import zhanJiLuYou from './routes/战绩'
import tongZhiLuYou from './routes/通知'
import tiaoZhanLuYou from './routes/挑战'
import guanLiYuanLuYou from './routes/管理员'
import haoYouLuYou from './routes/好友'
import yongHuSheZhiLuYou from './routes/用户设置'
import biaoQingLuYou from './routes/表情'
import ziLiaoLuYou from './routes/资料'
import { chengGongXiangYing, shiBaiXiangYing } from './utils/xiangying'
import { 全YuZhanCuoWuChuLi } from './middleware/错误处理'
import { CUO_WU_DAI_MA, YingYongCuoWu } from './config/错误码注册表'
import { qiDongShenJiRiZhiGuiDangDingShiQi, tingZhiShenJiRiZhiGuiDang } from './services/审计日志归档'
import { qiDongShuJuBaoCunQingLiDingShiQi, tingZhiShuJuBaoCunQingLi } from './services/数据保存期限'
import { chuangJianHTTPRiZhiZhongJianJian } from './utils/debug日志'
import jianKangJianChaLuYou, { qingQiuJiShu, qingQiuHaoShi } from './routes/健康检查'
import riZhiJieShouLuYou from './routes/日志接收'
import gongNengKaiGuanLuYou from './routes/功能开关'
import { renZhengSocketZhongJianJian } from './socket/认证'
import { 初始化聊天Socket } from './socket/聊天'
import { chuShiHuaTongZhiSocket } from './socket/通知'
import { chuShiHuaDuoSheSocket } from './socket/夺舍'
import { sheZhiIo } from './socket/io'
import { chuShiHuaOTel } from './utils/OTel'
import { 数据库 } from './数据库'
import { redis, dengDaiRedisJiuXu } from './redis'
import { guanBiRiZhiYinQing, 日志引擎 } from './utils/日志引擎'
chuShiHuaOTel()

const yingYong = express()

yingYong.set('trust proxy', false)
yingYong.use(日志追踪中间件())

yingYong.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'blob:'],
      workerSrc: ["'self'", 'blob:'],
      fontSrc: ["'self'"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: false,
}))

yingYong.use(cors({
  origin: (qiuYuan, huiDiao) => {
    if (!qiuYuan) {
      huiDiao(null, true)
      return
    }
    if (peiZhi.yunXuDeYuan.includes(qiuYuan)) {
      huiDiao(null, true)
      return
    }
    try {
      const biaoJi = new URL(qiuYuan)
      if (
        peiZhi.huanJing !== 'production' &&
        (biaoJi.hostname === 'localhost' || biaoJi.hostname === '127.0.0.1') &&
        (biaoJi.protocol === 'http:' || biaoJi.protocol === 'https:')
      ) {
        huiDiao(null, true)
        return
      }
    } catch {
      // 解析失败则按不允许处理
    }
    huiDiao(new YingYongCuoWu(CUO_WU_DAI_MA.ORIGIN_DENIED))
  },
  credentials: true,
}))

yingYong.use((qingQiu, xiangYing, xiaYiBu) => {
  try {
    qingQiu.url = decodeURI(qingQiu.url)
  } catch {
    try {
      const ip = huoQuZhenShiIP(qingQiu as never)
      if (ip) {
        void import('./services/IP封禁').then(({ 记录违规 }) => 记录违规(`ji_xing_bian_ma:${ip}`, '畸形编码', '轻微').catch(() => undefined))
      }
    } catch {
      // 计数失败不阻断400响应
    }
    shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'), CUO_WU_DAI_MA.REQUEST_PARAMETER_INVALID)
    return
  }
  xiaYiBu()
})

yingYong.use(express.json({ limit: '1mb' }))

yingYong.use('/api/聊天/会话', express.json({ limit: '60mb' }))

yingYong.use((qingQiu, _xiangYing, xiaYiBu) => {
  ;(qingQiu as unknown as Record<string, number>).kai_shi_shi_jian = Date.now()
  xiaYiBu()
})

yingYong.use(chuangJianHTTPRiZhiZhongJianJian())

yingYong.use((qingQiu, xiangYing, xiaYiBu) => {
  const kaiShi = (qingQiu as unknown as Record<string, number>).kai_shi_shi_jian || Date.now()
  xiangYing.on('finish', () => {
    const haoShi = Date.now() - kaiShi
    const biaoQian = {
      fang_fa: qingQiu.method,
      lu_jing: qingQiu.path,
      zhuang_tai_ma: String(xiangYing.statusCode),
    }
    qingQiuJiShu.inc(biaoQian)
    qingQiuHaoShi.observe(biaoQian, haoShi)
  })
  xiaYiBu()
})

yingYong.use(jianKangJianChaLuYou)

yingYong.use(IP封禁中间件)
yingYong.use(changGuiXianLiu)
yingYong.use('/api/logs', riZhiJieShouXianLiu, riZhiJieShouLuYou)
yingYong.use('/api/config/feature-flags', gongNengKaiGuanLuYou)
yingYong.use('/api/挑战/配置', (async (_qingQiu, xiangYing) => {
  const { TIAO_ZHAN_PEI_ZHI } = await import('./config/挑战配置')
  const { chengGongXiangYing, shiBaiXiangYing } = await import('./utils/xiangying')
  const { debug日志 } = await import('./utils/debug日志')
  const { huoQuFanYi } = await import('./config/translations')
  try {
    return chengGongXiangYing(xiangYing, {
      zha_xing_gai_lv: TIAO_ZHAN_PEI_ZHI.zhaXingGaiLv,
      fang_qi_kou_fen: TIAO_ZHAN_PEI_ZHI.fangQiKouFen,
    })
  } catch (cuoWu) {
    debug日志.error('挑战接口', '查询挑战配置失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    return shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
  }
}) as import('express').RequestHandler)
yingYong.use(renZhengZhongJianJian)
yingYong.use(anQuanZhongJianJian)

yingYong.get('/api/健康', (_qingQiu, xiangYing) => {
  chengGongXiangYing(xiangYing, { zhuang_tai: 'ok' })
})

yingYong.use('/api/认证', renZhengLuYou)
yingYong.use('/api/生成角色', jiaoSeLuYou)
yingYong.use('/api/角色', jiaoSeXiangQingLuYou)
yingYong.use('/api/聊天', xiaoXiLuYou)
yingYong.use('/api/媒体', meiTiLuYou)
yingYong.use('/api/好感度', haoGanDuLuYou)
yingYong.use('/api/战绩', zhanJiLuYou)
yingYong.use('/api/通知', tongZhiLuYou)
yingYong.use('/api/挑战', tiaoZhanLuYou)
yingYong.use('/api/管理', guanLiYuanLuYou)
yingYong.use('/api/好友', haoYouLuYou)
yingYong.use('/api/用户设置', yongHuSheZhiLuYou)
yingYong.use('/api/表情', biaoQingLuYou)
yingYong.use('/api/资料', ziLiaoLuYou)

yingYong.use((_qingQiu, xiangYing) => {
  try {
    const ip = _qingQiu ? huoQuZhenShiIP(_qingQiu as never) : ''
    if (ip) {
      void import('./services/IP封禁').then(({ 记录违规 }) => 记录违规(`si_ling_ling_si:${ip}`, '404探测', '轻微').catch(() => undefined))
    }
  } catch {
    // 计数失败不阻断404响应
  }
  shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'), CUO_WU_DAI_MA.RESOURCE_NOT_FOUND)
})

yingYong.use(全YuZhanCuoWuChuLi)

const fuWuQi = http.createServer(yingYong)
const io = new Server(fuWuQi, {
  cors: {
    origin: peiZhi.yunXuDeYuan,
    credentials: true,
  },
  path: '/socket.io',
})

io.use(renZhengSocketZhongJianJian)
sheZhiIo(io)
初始化聊天Socket(io)
chuShiHuaTongZhiSocket(io)
chuShiHuaDuoSheSocket(io)

export interface 停机资源 {
  SocketIO: { disconnectSockets: (yuanYin?: boolean) => void }
  HTTP服务器: {
    close: (huiDiao?: (cuoWu?: Error | null) => void) => void
    closeAllConnections?: () => void
  }
  数据库连接池: { end: () => Promise<void> }
  Redis客户端: { quit: () => Promise<unknown> }
  退出进程: (tuiChuMa: number) => void
}

const 停机宽限期毫秒 = 5000
const yiZhiXingTingJiZiYuan = new WeakSet<object>()

export async function 优雅停机(ziYuan: 停机资源): Promise<void> {
  if (yiZhiXingTingJiZiYuan.has(ziYuan)) return
  yiZhiXingTingJiZiYuan.add(ziYuan)

  const { guanBiOTel } = await import('./utils/OTel').catch(() => ({ guanBiOTel: async () => {} }))

  const buLuoQiangTui = (buZhou: string, dongZuo: () => Promise<unknown>) =>
    dongZuo().catch((cuoWu) => {
      console.error(`停机步骤失败:${buZhou}`, cuoWu)
    })

  ziYuan.SocketIO.disconnectSockets(true)

  await new Promise<void>((jieJue) => {
    const dingShiQi = setTimeout(() => {
      ziYuan.HTTP服务器.closeAllConnections?.()
      jieJue()
    }, 停机宽限期毫秒)
    ziYuan.HTTP服务器.close(() => {
      clearTimeout(dingShiQi)
      jieJue()
    })
  })

  await buLuoQiangTui('ShuJuKu', () => ziYuan.数据库连接池.end())
  await buLuoQiangTui('redis', async () => {
    await ziYuan.Redis客户端.quit()
  })
  await buLuoQiangTui('riZhi', guanBiRiZhiYinQing)
  await buLuoQiangTui('otel', guanBiOTel)

  ziYuan.退出进程(0)
}

export function 注册停机处理器(tingJi: () => Promise<void>): void {
  process.on('SIGTERM', () => {
    void tingJi()
  })
  process.on('SIGINT', () => {
    void tingJi()
  })
  process.on('unhandledRejection', (yuanYin) => {
    const cuoWu = yuanYin instanceof Error ? yuanYin : new Error(String(yuanYin))
    const neiBu = qingLiNeiBuCuoWu(cuoWu)
    日志引擎.error('tingJi', '未处理的Promise拒绝', neiBu)
    void import('./utils/邮件告警').then(({ faSongGaoJing }) => faSongGaoJing('jin_cheng_beng_kui', '进程未处理拒绝告警', neiBu.cuo_wu).catch(() => undefined))
    void tingJi().finally(() => process.exit(1))
  })
  process.on('uncaughtException', (cuoWu) => {
    const neiBu = qingLiNeiBuCuoWu(cuoWu)
    日志引擎.error('tingJi', '未捕获异常', neiBu)
    void import('./utils/邮件告警').then(({ faSongGaoJing }) => faSongGaoJing('jin_cheng_beng_kui', '进程未捕获异常告警', neiBu.cuo_wu).catch(() => undefined))
    void tingJi().finally(() => process.exit(1))
  })
}

async function 启动前强校验(): Promise<void> {
  const { debug日志 } = await import('./utils/debug日志')
  const { 数据库 } = await import('./数据库')
  const { redis } = await import('./redis')

  try {
    const lianJie = String(peiZhi.redisLianJie || '')
    const yaoQiuTLS = /^rediss:\/\//i.test(lianJie.trim())
    const shiJiTLS = Boolean((redis.options as unknown as Record<string, unknown>)?.['tls'])
    if (yaoQiuTLS && !shiJiTLS) {
      debug日志.error('启动校验', 'rediss连接未启用TLS，拒绝明文降级启动', { xiang_qing: { cuo_wu_ma: CUO_WU_DAI_MA.DOCKER_STARTUP_REDIS_TLS_INVALID, lian_jie_qian_zhui: 'rediss://***' } })
      process.exit(1)
    }
    if (yaoQiuTLS && shiJiTLS) {
      debug日志.info('启动校验', 'rediss加密传输已启用')
    }
  } catch (cuoWu) {
    debug日志.error('启动校验', 'rediss传输校验失败', { xiang_qing: { cuo_wu_ma: CUO_WU_DAI_MA.DOCKER_STARTUP_REDIS_TLS_INVALID, cuo_wu: String(cuoWu) } })
    process.exit(1)
  }

  let redisLianTong = false
  let redisZuiHouCuoWu: unknown = null
  for (let ci = 0; ci < 5 && !redisLianTong; ci++) {
    try {
      await Promise.race([
        redis.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis连接超时')), 3000))
      ])
      redisLianTong = true
    } catch (e) {
      redisZuiHouCuoWu = e
      await new Promise((jieJue) => setTimeout(jieJue, 2000))
    }
  }
  if (!redisLianTong) {
    debug日志.error('启动校验', 'Redis 不可用，拒绝启动', { xiang_qing: { cuo_wu_ma: CUO_WU_DAI_MA.DOCKER_STARTUP_REDIS_UNAVAILABLE, cuo_wu: String(redisZuiHouCuoWu) } })
    try {
      await redis.quit()
    } catch {
      // 忽略关闭错误
    }
    await new Promise((jieJue) => setTimeout(jieJue, 500))
    process.exit(1)
  }
  debug日志.info('启动校验', 'Redis 连接正常')

  let pgLianTong = false
  let pgZuiHouCuoWu: unknown = null
  for (let ci = 0; ci < 5 && !pgLianTong; ci++) {
    try {
      await Promise.race([
        数据库.query('SELECT 1'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('PostgreSQL连接超时')), 3000))
      ])
      pgLianTong = true
    } catch (e) {
      pgZuiHouCuoWu = e
      await new Promise((jieJue) => setTimeout(jieJue, 2000))
    }
  }
  if (!pgLianTong) {
    debug日志.error('启动校验', 'PostgreSQL 不可用，拒绝启动', { xiang_qing: { cuo_wu_ma: CUO_WU_DAI_MA.DOCKER_STARTUP_POSTGRES_UNAVAILABLE, cuo_wu: String(pgZuiHouCuoWu) } })
    process.exit(1)
  }
  debug日志.info('启动校验', 'PostgreSQL 连接正常')

  await dengDaiRedisJiuXu()

  try {
    const { jiaZaiZuiXinCiKu, huoQuCiKuMuLu } = await import('./services/审核词库')
    const ciKu = await jiaZaiZuiXinCiKu(true)
    debug日志.info('启动校验', '审核词库已加载', { xiang_qing: { ban_ben: ciKu.banBen, lu_jing: huoQuCiKuMuLu() } })
  } catch (cuoWu) {
    debug日志.error('启动校验', '审核词库不可加载，拒绝启动（构建产物缺非 TS 资源时会出现）', {
      xiang_qing: { cuo_wu_ma: CUO_WU_DAI_MA.DOCKER_STARTUP_MODERATION_RESOURCE_UNAVAILABLE, cuo_wu: String(cuoWu), zhan: cuoWu instanceof Error ? cuoWu.stack : undefined },
    })
    process.exit(1)
  }
}

if (require.main === module) {
  ;(async () => {
    await 启动前强校验()

    fuWuQi.listen(peiZhi.duanKou, () => {
      debug日志.info('服务器生命周期', `服务器运行在端口 ${peiZhi.duanKou}`)
    })

    qiDongShenJiRiZhiGuiDangDingShiQi()
    void ziJianMoXingMingKeYong()
    qiDongShuJuBaoCunQingLiDingShiQi()

    const tingJi = async (): Promise<void> => {
      tingZhiShenJiRiZhiGuiDang()
      tingZhiShuJuBaoCunQingLi()
      await 优雅停机({
        SocketIO: io,
        HTTP服务器: fuWuQi,
        数据库连接池: 数据库,
        Redis客户端: redis,
        退出进程: (ma: number) => process.exit(ma),
      })
    }

    注册停机处理器(tingJi)
  })()
}

export { fuWuQi }
export default yingYong
