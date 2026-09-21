import path from 'path'
import fs from 'fs'
import zlib from 'zlib'
import { promisify } from 'util'
import pino from 'pino'
import { peiZhi } from '../config'
import { huoQuDangQianTraceId, huoQuDangQianSpanId } from './OTel'
import { qingQiuShangXiaWen } from '../middleware/日志追踪'

const gzip = promisify(zlib.gzip)
export type RiZhiJiBie = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'

const riZhiMuLu = path.resolve(process.cwd(), 'logs')
const lengCunMuLu = path.join(riZhiMuLu, 'cold')
const riZhiWenJian = path.join(riZhiMuLu, 'debug.log')

let dangQianJiBie: pino.LevelWithSilent
let logger: pino.Logger
let yiChuShiHua = false
let yiFuJiaLeProcessJianTing = false
let dingShiQi: ReturnType<typeof setInterval> | null = null
let transportStream: pino.DestinationStream | null = null
let stdoutLiu: pino.DestinationStream | null = null
let wenJianLiu: fs.WriteStream | null = null
let yiSheZhiGuoJiBie = false

const youXiaoJiBieLieBiao: pino.LevelWithSilent[] = [
  'fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent',
]

function huoQuYouXiaoRiZhiJiBie(jiBie: string | undefined): pino.LevelWithSilent {
  if (jiBie && (youXiaoJiBieLieBiao as string[]).includes(jiBie)) {
    return jiBie as pino.LevelWithSilent
  }
  return 'debug'
}

export interface RiZhiTargetPeiZhi {
  target: string
  options: Record<string, unknown>
  level: string
}

/**
 * 生产态文件通道的 transport 目标。
 *
 * 必须是 `require.resolve` 出来的**绝对路径**：pino v10 在 worker 线程里按调用方路径解析裸模块名，
 * 裸名 `'pino-roll'` 解析不到时 transport 会**静默失效**——实测 stdout 与文件两路同时 0 输出、
 * 不抛错不留痕，线上任何一次 5xx 都查不到原因（`logs/debug.*.log` 全 0 字节即此故障的现场）。
 */
export function gouJianShengChanTargets(riZhiWenJian: string): RiZhiTargetPeiZhi[] {
  return [
    {
      target: require.resolve('pino-roll'),
      options: {
        file: riZhiWenJian,
        frequency: 'daily',
        size: '500m',
        mkdir: true,
        limit: { count: 30 },
      },
      level: 'trace',
    },
  ]
}

export function chuangJianRiZhiYinQing(): pino.Logger {
  if (yiChuShiHua) return logger
  yiChuShiHua = true

  if (!yiSheZhiGuoJiBie) {
    dangQianJiBie = huoQuYouXiaoRiZhiJiBie(process.env.LOG_LEVEL)
  }

  if (!fs.existsSync(riZhiMuLu)) {
    fs.mkdirSync(riZhiMuLu, { recursive: true })
  }

  const isKaiFa = peiZhi.kaiFaMoShi

  const jiBenPeiZhi: pino.LoggerOptions = {
    level: dangQianJiBie,
    messageKey: 'xiao_xi',
    timestamp: () => `,"shi_jian":"${new Date().toISOString()}"`,
    formatters: {
      level: (label: string) => ({ ji_bie: label }),
    },
    mixin() {
      const shangXiaWen = qingQiuShangXiaWen.getStore()
      return {
        trace_id: huoQuDangQianTraceId(),
        span_id: huoQuDangQianSpanId(),
        ...(shangXiaWen?.qing_qiu_id ? { qing_qiu_id: shangXiaWen.qing_qiu_id } : {}),
      }
    },
    redact: {
      paths: peiZhi.minGanZiDuan.ziDuanMing.reduce<string[]>((a, p) => { a.push(p, `*.${p}`); return a }, [] as string[]),
      censor: '***',
    },
  }

  if (isKaiFa) {
    wenJianLiu = fs.createWriteStream(riZhiWenJian, { flags: 'a' })
    wenJianLiu.on('error', () => {})
    logger = pino(jiBenPeiZhi, wenJianLiu)
  } else {
    // stdout 不再塞进 transport 的 targets：transport 是单条 worker 多路流，任一目标解析/启动失败
    // 会连带打死整条流（本次「stdout 与文件同时 0 输出」的故障形态）。拆成 multistream 后，
    // 文件通道坏了也还有 `docker logs` 可看，可观测性不再单点。
    transportStream = pino.transport({ targets: gouJianShengChanTargets(riZhiWenJian) })
    stdoutLiu = pino.destination({ dest: 1, sync: false })
    logger = pino(jiBenPeiZhi, pino.multistream([stdoutLiu, transportStream]))

    dingShiQi = setInterval(() => {
      chuLiLunZhuanWenJian().catch(() => {})
      qingLiJiuDangAn().catch(() => {})
    }, 5 * 60 * 1000)
    dingShiQi.unref()
  }

  if (!yiFuJiaLeProcessJianTing) {
    process.on('message', (xiaoXi: unknown) => {
      if (
        xiaoXi &&
        typeof xiaoXi === 'object' &&
        'leiJi' in (xiaoXi as Record<string, unknown>)
      ) {
        const mingLing = xiaoXi as Record<string, string>
        if (mingLing.leiJi === 'sheZhiRiZhiJiBie' && mingLing.zhi) {
          sheZhiRiZhiJiBie(mingLing.zhi)
        }
      }
    })
    yiFuJiaLeProcessJianTing = true
  }

  return logger
}

export function sheZhiRiZhiJiBie(jiBie: string): boolean {
  if (!(youXiaoJiBieLieBiao as string[]).includes(jiBie)) return false
  dangQianJiBie = jiBie as pino.LevelWithSilent
  yiSheZhiGuoJiBie = true
  if (logger) logger.level = dangQianJiBie
  return true
}

export function huoQuDangQianJiBie(): string {
  return dangQianJiBie
}

async function chuLiLunZhuanWenJian(): Promise<void> {
  try {
    if (!fs.existsSync(riZhiMuLu)) return
    const wenJianLieBiao = fs.readdirSync(riZhiMuLu)
    const lunZhuanZhengZe = /^debug\.(\d{4}-\d{2}-\d{2})\.\d+\.log$/

    for (const wenJian of wenJianLieBiao) {
      const piPei = wenJian.match(lunZhuanZhengZe)
      if (!piPei) continue

      const wanZhengLuJing = path.join(riZhiMuLu, wenJian)
      const riQiBuFen = piPei[1]
      const [nian, yue] = riQiBuFen.split('-')
      const muBiaoMuLu = path.join(lengCunMuLu, `${nian}-${yue}`)

      if (!fs.existsSync(muBiaoMuLu)) {
        fs.mkdirSync(muBiaoMuLu, { recursive: true })
      }

      const yaSuoWenJian = path.join(muBiaoMuLu, `${wenJian}.gz`)
      if (fs.existsSync(yaSuoWenJian)) continue

      const neiRong = fs.readFileSync(wanZhengLuJing)
      const yaSuoShuJu = await gzip(neiRong)
      fs.writeFileSync(yaSuoWenJian, yaSuoShuJu)
      fs.unlinkSync(wanZhengLuJing)
    }
  } catch {
    /* 冷存归档错误非关键 */
  }
}

async function qingLiJiuDangAn(): Promise<void> {
  try {
    if (!fs.existsSync(lengCunMuLu)) return

    const xianZai = Date.now()
    // YH-139 日志保留打架收敛：冷存读配置统一数字，归档加冷存
    // 根因：三处各说各的删了找不回；收敛为LOG_COLD_RETENTION_DAYS唯一出处
    const baoLiuHaoMiao = peiZhi.riZhiLengCunBaoLiuTian * 24 * 60 * 60 * 1000

    const yueMuLuLieBiao = fs.readdirSync(lengCunMuLu)
    for (const yueMuLu of yueMuLuLieBiao) {
      const wanZhengLuJing = path.join(lengCunMuLu, yueMuLu)
      const tongJi = fs.statSync(wanZhengLuJing)
      if (!tongJi.isDirectory()) continue

      const wenJianLieBiao = fs.readdirSync(wanZhengLuJing)
      for (const wenJian of wenJianLieBiao) {
        const wenJianLuJing = path.join(wanZhengLuJing, wenJian)
        const wenJianTongJi = fs.statSync(wenJianLuJing)
        if (xianZai - wenJianTongJi.mtimeMs > baoLiuHaoMiao) {
          fs.unlinkSync(wenJianLuJing)
        }
      }

      if (fs.readdirSync(wanZhengLuJing).length === 0) {
        fs.rmdirSync(wanZhengLuJing)
      }
    }
  } catch {
    /* 清理错误非关键 */
  }
}

export async function guanBiRiZhiYinQing(): Promise<void> {
  if (dingShiQi) {
    clearInterval(dingShiQi)
    dingShiQi = null
  }

  if (wenJianLiu) {
    const liu = wenJianLiu
    wenJianLiu = null
    await new Promise<void>((resolve) => {
      let yiWanCheng = false
      const wanCheng = (): void => {
        if (yiWanCheng) return
        yiWanCheng = true
        resolve()
      }
      liu.end(wanCheng)
      liu.on('error', wanCheng)
      const shiJianQi = setTimeout(wanCheng, 5000)
      shiJianQi.unref()
    })
  }

  if (transportStream) {
    const liu = transportStream as unknown as {
      on: (e: string, cb: () => void) => void
      end: () => void
    }
    transportStream = null
    await new Promise<void>((resolve) => {
      let yiWanCheng = false
      const wanCheng = (): void => {
        if (yiWanCheng) return
        yiWanCheng = true
        resolve()
      }
      liu.on('finish', wanCheng)
      liu.on('error', wanCheng)
      liu.end()
      const shiJianQi = setTimeout(wanCheng, 5000)
      shiJianQi.unref()
    })
  }

  if (stdoutLiu) {
    const liu = stdoutLiu as unknown as { flushSync?: () => void; end?: () => void }
    stdoutLiu = null
    // sync:false 有缓冲，退出前不 flush 就丢最后几条——恰恰是最关键的收尾错误
    try {
      liu.flushSync?.()
      liu.end?.()
    } catch {
      /* 已断开的 stdout 不必再管 */
    }
  }

  yiSheZhiGuoJiBie = false
  await chuLiLunZhuanWenJian()
  yiChuShiHua = false
}

export const 日志引擎 = {
  debug: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>): void => {
    if (!logger) chuangJianRiZhiYinQing()
    logger.debug({ lei_xing: leiXing, ...(xiangQing ? { xiang_qing: xiangQing } : {}) }, xiaoXi)
  },
  info: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>): void => {
    if (!logger) chuangJianRiZhiYinQing()
    logger.info({ lei_xing: leiXing, ...(xiangQing ? { xiang_qing: xiangQing } : {}) }, xiaoXi)
  },
  warn: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>): void => {
    if (!logger) chuangJianRiZhiYinQing()
    logger.warn({ lei_xing: leiXing, ...(xiangQing ? { xiang_qing: xiangQing } : {}) }, xiaoXi)
  },
  error: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>): void => {
    if (!logger) chuangJianRiZhiYinQing()
    logger.error({ lei_xing: leiXing, ...(xiangQing ? { xiang_qing: xiangQing } : {}) }, xiaoXi)
  },
}
