import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'
import { peiZhi } from './config'
import { huoQuFanYi } from './config/translations'
import { renZhengZhongJianJian } from './middleware/认证'
import { changGuiXianLiu } from './middleware/限流'
import { anQuanZhongJianJian } from './middleware/安全'
import { IP封禁中间件 } from './middleware/IP封禁'
import { 日志追踪中间件 } from './middleware/日志追踪'
import renZhengLuYou from './routes/认证'
import jiaoSeLuYou from './routes/角色'
import jiaoSeXiangQingLuYou from './routes/角色详情'
import xiaoXiLuYou from './routes/消息'
import haoGanDuLuYou from './routes/好感度'
import zhanJiLuYou from './routes/战绩'
import tongZhiLuYou from './routes/通知'
import guanLiYuanLuYou from './routes/管理员'
import { chengGongXiangYing, shiBaiXiangYing } from './utils/xiangying'
import { chuangJianHTTPRiZhiZhongJianJian } from './utils/debug日志'
import jianKangJianChaLuYou, { qingQiuJiShu, qingQiuHaoShi } from './routes/健康检查'
import riZhiJieShouLuYou from './routes/日志接收'
import { renZhengSocketZhongJianJian } from './socket/认证'
import { 初始化聊天Socket } from './socket/聊天'
import { chuShiHuaTongZhiSocket } from './socket/通知'
import { chuShiHuaDuoSheSocket } from './socket/夺舍'
import { sheZhiIo } from './socket/io'
import { chuShiHuaOTel } from './utils/OTel'
chuShiHuaOTel()

const yingYong = express()

yingYong.set('trust proxy', 1)

yingYong.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
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
    try {
      const biaoJi = new URL(qiuYuan)
      if (
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
yingYong.use('/api/logs', riZhiJieShouLuYou)
yingYong.use(renZhengZhongJianJian)
yingYong.use(anQuanZhongJianJian)

yingYong.get('/api/健康', (_qingQiu, xiangYing) => {
  chengGongXiangYing(xiangYing, { zhuang_tai: 'ok' })
})

yingYong.use('/api/认证', renZhengLuYou)
yingYong.use('/api/生成角色', jiaoSeLuYou)
yingYong.use('/api/角色', jiaoSeXiangQingLuYou)
yingYong.use('/api/聊天', xiaoXiLuYou)
yingYong.use('/api/好感度', haoGanDuLuYou)
yingYong.use('/api/战绩', zhanJiLuYou)
yingYong.use('/api/通知', tongZhiLuYou)
yingYong.use('/api/管理', guanLiYuanLuYou)

yingYong.use((_qingQiu, xiangYing) => {
  shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'))
})

yingYong.use((
  cuoWu: unknown,
  _qingQiu: express.Request,
  xiangYing: express.Response,
  _xiaYiBu: express.NextFunction,
) => {
  console.error('未捕获错误', cuoWu)
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
chuShiHuaTongZhiSocket(io)
chuShiHuaDuoSheSocket(io)

if (require.main === module) {
  fuWuQi.listen(peiZhi.duanKou, () => {
    console.log(`服务器运行在端口 ${peiZhi.duanKou}`)
  })

  process.on('SIGTERM', () => {
    fuWuQi.close(() => {
      console.log('服务器已关闭')
      process.exit(0)
    })
  })
}

export default yingYong
