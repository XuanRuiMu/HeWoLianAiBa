import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'
import { peiZhi } from './config'
import { huoQuFanYi } from './config/translations'
import { debug日志 } from './utils/debug日志'
import { renZhengZhongJianJian } from './middleware/认证'
import { changGuiXianLiu, riZhiJieShouXianLiu } from './middleware/限流'
import { anQuanZhongJianJian } from './middleware/安全'
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
import ziLiaoLuYou from './routes/资料'
import { chengGongXiangYing, shiBaiXiangYing } from './utils/xiangying'
import { qiDongShenJiRiZhiGuiDangDingShiQi, tingZhiShenJiRiZhiGuiDang } from './services/审计日志归档'
import { chuangJianHTTPRiZhiZhongJianJian } from './utils/debug日志'
import jianKangJianChaLuYou, { qingQiuJiShu, qingQiuHaoShi } from './routes/健康检查'
import riZhiJieShouLuYou from './routes/日志接收'
import gongNengKaiGuanLuYou from './routes/功能开关'
import { renZhengSocketZhongJianJian } from './socket/认证'
import { 初始化聊天Socket } from './socket/聊天'
import { chuShiHuaTongHuaSocket } from './socket/通话'
import { chuShiHuaTongZhiSocket } from './socket/通知'
import { chuShiHuaDuoSheSocket } from './socket/夺舍'
import { sheZhiIo } from './socket/io'
import { chuShiHuaOTel } from './utils/OTel'
import { 数据库 } from './数据库'
import { redis } from './redis'
import { guanBiRiZhiYinQing, 日志引擎 } from './utils/日志引擎'
chuShiHuaOTel()

const yingYong = express()

// P2-2：可信代理链路由 utils/真实IP.shiDuanKeXinDaiLi 统一管理（KE_XIN_DAI_LI_WANG_DUAN 可配）；
// Express 层一律不信代理头，req.ip 恒等于 TCP 对端地址，防止旁路代码误读客户端可控 XFF
yingYong.set('trust proxy', false)

yingYong.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // M8：移除 script unsafe-inline（Vite 构建产物为外链 module script）；
      // wasm-unsafe-eval 为 Draco 解码 WASM 所必需
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
    // 本地开发/测试场景：放行 localhost 与 127.0.0.1 的任意端口。
    // 否则每新开一个测试端口（如 :8090、:8080）都会因白名单缺失而 500，
    // 而 curl 不带 Origin 头反而能过，造成「浏览器登录失败、命令行却正常」的诡异现象。
    // 低危顺手项：该放行仅在非生产环境生效，生产模式一律走 ALLOWED_ORIGINS 白名单。
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
    huiDiao(new Error('不允许的来源'))
  },
  credentials: true,
}))

yingYong.use((qingQiu, _xiangYing, xiaYiBu) => {
  qingQiu.url = decodeURI(qingQiu.url)
  xiaYiBu()
})

yingYong.use(express.json({ limit: '1mb' }))

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
yingYong.use(日志追踪中间件())
yingYong.use(changGuiXianLiu)
// A8：前端日志上报走独立路由（内部已做字段截断），独立严限流防匿名刷量
yingYong.use('/api/logs', riZhiJieShouXianLiu, riZhiJieShouLuYou)
// P1-8：feature-flags 公开只读端点（灰度发布开关），无需鉴权，短缓存
yingYong.use('/api/config/feature-flags', gongNengKaiGuanLuYou)
// B-7：挑战配置公开端点（渣型概率），无需鉴权
yingYong.use('/api/挑战/配置', (async (_qingQiu, xiangYing) => {
  const { TIAO_ZHAN_PEI_ZHI } = await import('./config/挑战配置')
  const { chengGongXiangYing, shiBaiXiangYing } = await import('./utils/xiangying')
  const { debug日志 } = await import('./utils/debug日志')
  const { huoQuFanYi } = await import('./config/translations')
  try {
    return chengGongXiangYing(xiangYing, { zha_xing_gai_lv: TIAO_ZHAN_PEI_ZHI.zhaXingGaiLv })
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
yingYong.use('/api/资料', ziLiaoLuYou)

yingYong.use((_qingQiu, xiangYing) => {
  shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
})

yingYong.use((
  cuoWu: unknown,
  _qingQiu: express.Request,
  xiangYing: express.Response,
  _xiaYiBu: express.NextFunction,
) => {
  debug日志.error('服务器生命周期', '未捕获错误', { xiang_qing: { cuo_wu: String(cuoWu) } })
  shiBaiXiangYing(xiangYing, 500, huoQuFanYi('tongYong', 'fuWuQiNeiBuCuoWu'))
})

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
chuShiHuaTongHuaSocket(io)
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

  const buLuoQiangTui = (buZhou: string, dongZuo: () => Promise<unknown>) =>
    dongZuo().catch((cuoWu) => {
      // eslint-disable-next-line no-console -- 优雅停机.test 将日志引擎mock为空实现,logger调用会在停机容错路径抛错
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

  await buLuoQiangTui('shuJuKu', () => ziYuan.数据库连接池.end())
  await buLuoQiangTui('redis', async () => {
    await ziYuan.Redis客户端.quit()
  })
  await buLuoQiangTui('riZhi', guanBiRiZhiYinQing)

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
    日志引擎.error('tingJi', '未处理的Promise拒绝', {
      ming_cheng: cuoWu.name,
      zhan: String(cuoWu.stack || cuoWu.message),
    })
    void tingJi()
  })
  process.on('uncaughtException', (cuoWu) => {
    日志引擎.error('tingJi', '未捕获异常', {
      ming_cheng: cuoWu.name,
      zhan: String(cuoWu.stack || cuoWu.message),
    })
    void tingJi()
  })
}

async function 启动前强校验(): Promise<void> {
  const { debug日志 } = await import('./utils/debug日志')
  const { 数据库 } = await import('./数据库')
  const { redis } = await import('./redis')

  // 1. Redis 连通性（单次尝试，超时 3s）
  try {
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis连接超时')), 3000))
    ])
    debug日志.info('启动校验', 'Redis 连接正常')
  } catch (e) {
    debug日志.error('启动校验', 'Redis 不可用，拒绝启动', { xiang_qing: { cuo_wu: String(e) } })
    process.exit(1)
  }

  // 2. PostgreSQL 连通性（单次查询，超时 3s）
  try {
    await Promise.race([
      数据库.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('PostgreSQL连接超时')), 3000))
    ])
    debug日志.info('启动校验', 'PostgreSQL 连接正常')
  } catch (e) {
    debug日志.error('启动校验', 'PostgreSQL 不可用，拒绝启动', { xiang_qing: { cuo_wu: String(e) } })
    process.exit(1)
  }
}

if (require.main === module) {
  ;(async () => {
    await 启动前强校验()

    fuWuQi.listen(peiZhi.duanKou, () => {
      debug日志.info('服务器生命周期', `服务器运行在端口 ${peiZhi.duanKou}`)
    })

    // C6：审计日志定期归档删除（保留期配置化，磁盘占用有上限）
    qiDongShenJiRiZhiGuiDangDingShiQi()

    const tingJi = async (): Promise<void> => {
      tingZhiShenJiRiZhiGuiDang()
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
