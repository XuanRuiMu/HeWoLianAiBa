import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'
import { peiZhi } from './config'
import { huoQuFanYi } from './config/translations'
import { debug日志 } from './utils/debug日志'
import { ziJianMoXingMingKeYong } from './utils/DeepSeek客户端'
import { renZhengZhongJianJian } from './middleware/认证'
import { changGuiXianLiu, riZhiJieShouXianLiu } from './middleware/限流'
import { anQuanZhongJianJian, shuChuBianMaZhongJianJian } from './middleware/安全'
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
import { qiDongShenJiRiZhiGuiDangDingShiQi, tingZhiShenJiRiZhiGuiDang } from './services/审计日志归档'
import { qiDongShuJuBaoCunQingLiDingShiQi, tingZhiShuJuBaoCunQingLi } from './services/数据保存期限'
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

yingYong.use((qingQiu, xiangYing, xiaYiBu) => {
  // YH-029 畸形编码转400加计数：decode失败不再抛500，畸形计数触发封禁阶梯
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
    shiBaiXiangYing(xiangYing, 400, huoQuFanYi('tongYong', 'canShuBuHeFa'), 'CAN_SHU_CUO_WU')
    return
  }
  xiaYiBu()
})

yingYong.use(express.json({ limit: '1mb' }))

// YH-127 上传对齐：nginx 60m分级，应用上限对齐禁413
// 根因：nginx 1MB对应用50MB，上传必413；收敛为应用侧文种分级上限
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
// YH-024 服务端输出编码中间件：响应发送前统一转义兜底
yingYong.use(shuChuBianMaZhongJianJian)

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
  // YH-026 404单独计数触发封禁阶梯：未知路径探测计入违规，轮换路径扫描触发IP封禁
  try {
    const ip = _qingQiu ? huoQuZhenShiIP(_qingQiu as never) : ''
    if (ip) {
      void import('./services/IP封禁').then(({ 记录违规 }) => 记录违规(`si_ling_ling_si:${ip}`, '404探测', '轻微').catch(() => undefined))
    }
  } catch {
    // 计数失败不阻断404响应
  }
  shiBaiXiangYing(xiangYing, 404, huoQuFanYi('tongYong', 'ziYuanBuCunZai'), 'WEI_ZHAO_DAO')
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

  // YH-073 崩溃exit语义：异常停机exit 1，OTel flush，崩溃计数告警
  // 根因：崩了还报正常，尾部链路全丢；收敛为正常停机0异常1+flush+告警
  const { guanBiOTel } = await import('./utils/OTel').catch(() => ({ guanBiOTel: async () => {} }))

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
    日志引擎.error('tingJi', '未处理的Promise拒绝', {
      ming_cheng: cuoWu.name,
      zhan: String(cuoWu.stack || cuoWu.message),
    })
    // YH-073 崩溃计数告警+exit 1：禁崩了还报正常
    void import('./utils/邮件告警').then(({ faSongGaoJing }) => faSongGaoJing('jin_cheng_beng_kui', '进程未处理拒绝告警', String(cuoWu.stack || cuoWu.message).slice(0, 500)).catch(() => undefined))
    void tingJi().finally(() => process.exit(1))
  })
  process.on('uncaughtException', (cuoWu) => {
    日志引擎.error('tingJi', '未捕获异常', {
      ming_cheng: cuoWu.name,
      zhan: String(cuoWu.stack || cuoWu.message),
    })
    // YH-073 崩溃计数告警+exit 1
    void import('./utils/邮件告警').then(({ faSongGaoJing }) => faSongGaoJing('jin_cheng_beng_kui', '进程未捕获异常告警', String(cuoWu.stack || cuoWu.message).slice(0, 500)).catch(() => undefined))
    void tingJi().finally(() => process.exit(1))
  })
}

async function 启动前强校验(): Promise<void> {
  const { debug日志 } = await import('./utils/debug日志')
  const { 数据库 } = await import('./数据库')
  const { redis } = await import('./redis')

  // YH-023 rediss启动校验告警：加密连接串必须走TLS，传输层异常启动期即告警
  try {
    const lianJie = String(peiZhi.redisLianJie || '')
    const yaoQiuTLS = /^rediss:\/\//i.test(lianJie.trim())
    const shiJiTLS = Boolean((redis.options as unknown as Record<string, unknown>)?.['tls'])
    if (yaoQiuTLS && !shiJiTLS) {
      debug日志.error('启动校验', 'rediss连接未启用TLS，拒绝明文降级启动', { xiang_qing: { lian_jie_qian_zhui: 'rediss://***' } })
      process.exit(1)
    }
    if (yaoQiuTLS && shiJiTLS) {
      debug日志.info('启动校验', 'rediss加密传输已启用')
    }
  } catch (cuoWu) {
    debug日志.error('启动校验', 'rediss传输校验失败', { xiang_qing: { cuo_wu: String(cuoWu) } })
    process.exit(1)
  }

  // 1. Redis 连通性（重试 5 次，每次超时 3s；容器编排下依赖服务可能晚就绪）
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
    debug日志.error('启动校验', 'Redis 不可用，拒绝启动', { xiang_qing: { cuo_wu: String(redisZuiHouCuoWu) } })
    try {
      await redis.quit()
    } catch {
      // 忽略关闭错误
    }
    await new Promise((jieJue) => setTimeout(jieJue, 500))
    process.exit(1)
  }
  debug日志.info('启动校验', 'Redis 连接正常')

  // 2. PostgreSQL 连通性（重试 5 次，每次超时 3s）
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
    debug日志.error('启动校验', 'PostgreSQL 不可用，拒绝启动', { xiang_qing: { cuo_wu: String(pgZuiHouCuoWu) } })
    process.exit(1)
  }
  debug日志.info('启动校验', 'PostgreSQL 连接正常')

  // 3. 审核词库可加载性：词库缺失会让每一条文本消息在落库前抛 ENOENT → 全站聊天 500，
  //    而 /api/健康 照常 200（表现为「容器 healthy 但玩法全废」）。宁可在启动期中止，也不带病上线。
  try {
    const { jiaZaiZuiXinCiKu, huoQuCiKuMuLu } = await import('./services/审核词库')
    const ciKu = await jiaZaiZuiXinCiKu(true)
    debug日志.info('启动校验', '审核词库已加载', { xiang_qing: { ban_ben: ciKu.banBen, lu_jing: huoQuCiKuMuLu() } })
  } catch (cuoWu) {
    debug日志.error('启动校验', '审核词库不可加载，拒绝启动（构建产物缺非 TS 资源时会出现）', {
      xiang_qing: { cuo_wu: String(cuoWu), zhan: cuoWu instanceof Error ? cuoWu.stack : undefined },
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

    // C6：审计日志定期归档删除（保留期配置化，磁盘占用有上限）
    qiDongShenJiRiZhiGuiDangDingShiQi()
    // 模型名在册自检：临时/下线模型名会让每次 AI 调用直接 400，启动时就告警而不是等用户卡住
    void ziJianMoXingMingKeYong()
    // YH-071 保存期限执行器：聊天30天通知90天每日清理
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
