import path from 'path'
import fs from 'fs'
import zlib from 'zlib'
import { promisify } from 'util'
import pino from 'pino'
import { peiZhi } from '../config'
import { huoQuDangQianTraceId, huoQuDangQianSpanId } from './OTel'
import { qingQiuShangXiaWen } from '../middleware/日志追踪'

const yaSuoHanShu = promisify(zlib.gzip)
export type RiZhiJiBie = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'

const riZhiMuLu = path.resolve(process.cwd(), 'logs')
const lengCunMuLu = path.join(riZhiMuLu, 'cold')
const riZhiWenJian = path.join(riZhiMuLu, 'debug.log')

/**
 * 开发/测试态单文件体积上限（字节）。
 *
 * 开发态与生产态共用同一条 `logs/debug.log` 文件通道（`peiZhi.kaiFaMoShi` 对
 * development 与 test 都为真），但生产态走 pino-roll 的 daily/500m/limit 轮转，
 * 开发态此前是 `createWriteStream(flags:'a')` 无上限追加——而 `npm test` 每次运行
 * 也会往里写，实测单文件涨到 50MB 且永不回收。故开发态自带按体积轮转。
 */
const KAI_FA_WEN_JIAN_ZUI_DA = 20 * 1024 * 1024
/** 开发态轮转后保留的历史份数；本地调试日志不值得进冷存。 */
const KAI_FA_LUN_ZHUAN_BAO_LIU = 3
/** 与轮转文件名同构，供下方按日期归集与筛选用 */
const LUN_ZHUAN_WEN_JIAN_OB = /^debug\.\d{4}-\d{2}-\d{2}\.\d+\.log$/

let dangQianJiBie: pino.LevelWithSilent
let riZhiQi: pino.Logger
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

/**
 * 开发态按体积轮转：把超限的 debug.log 改名归档，并只保留最近若干份。
 *
 * 改名而非复制，是为了让「写流—轮转」之间不存在需要维护的偏移量；
 * 调用方需在返回 true 后重建写流（riZhiQi 持有的是流引用，不会自己跟着换）。
 *
 * @param wenJianLuJing 目标日志文件，默认 logs/debug.log
 * @param zuiDaZiShu 体积上限，字节；默认 20MB
 * @param baoLiuFenShu 额外保留的历史份数（不含本次刚产出的那一份）；默认 3
 * @returns 是否发生了轮转
 */
export function lunZhuanKaiFaWenJian(
  wenJianLuJing: string = riZhiWenJian,
  zuiDaZiShu: number = KAI_FA_WEN_JIAN_ZUI_DA,
  baoLiuFenShu: number = KAI_FA_LUN_ZHUAN_BAO_LIU,
): boolean {
  try {
    if (!fs.existsSync(wenJianLuJing)) return false
    if (fs.statSync(wenJianLuJing).size < zuiDaZiShu) return false

    const riQi = new Date().toISOString().slice(0, 10)
    fs.renameSync(wenJianLuJing, path.join(path.dirname(wenJianLuJing), `debug.${riQi}.${Date.now()}.log`))

    const muLu = path.dirname(wenJianLuJing)
    const liBiao = fs.readdirSync(muLu).filter((w) => LUN_ZHUAN_WEN_JIAN_OB.test(w)).sort()
    // 刚改名出来的那一份必须留下——否则配置成 0 就等于「轮转即销毁」，静默丢日志。
    const baoLiuShangXian = Math.max(0, baoLiuFenShu) + 1
    while (liBiao.length > baoLiuShangXian) {
      const guoQi = liBiao.shift()
      if (guoQi) fs.rmSync(path.join(muLu, guoQi), { force: true })
    }
    return true
  } catch (e) {
    // 轮转是维护性动作，失败不应中断日志主通道；但必须留痕——
    // 静默 return false 会让「日志突然不轮转了」变成查不出根因的幽灵故障。
    process.emitWarning(`开发态日志轮转失败：${e instanceof Error ? e.message : String(e)}`)
    return false
  }
}

export function chuangJianRiZhiYinQing(): pino.Logger {
  if (yiChuShiHua) return riZhiQi
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
        trace_id: shangXiaWen?.trace_id || huoQuDangQianTraceId(),
        span_id: huoQuDangQianSpanId(),
        ...(shangXiaWen?.otel_trace_id ? { otel_trace_id: shangXiaWen.otel_trace_id } : {}),
        ...(shangXiaWen?.qing_qiu_id ? { qing_qiu_id: shangXiaWen.qing_qiu_id } : {}),
      }
    },
    redact: {
      paths: peiZhi.minGanZiDuan.ziDuanMing.reduce<string[]>((a, p) => { a.push(p, `*.${p}`); return a }, [] as string[]),
      censor: '***',
    },
  }

  if (isKaiFa) {
    // 上一进程留下的超限文件不该被继续追加，启动即先轮转一次
    lunZhuanKaiFaWenJian()
    const kaiQiLiu = (): void => {
      wenJianLiu = fs.createWriteStream(riZhiWenJian, { flags: 'a' })
      wenJianLiu.on('error', () => {})
      riZhiQi = pino(jiBenPeiZhi, wenJianLiu)
    }
    kaiQiLiu()

    // 轮转后 riZhiQi 仍握着旧流引用，必须重建；end() 是异步的，
    // 极窄的窗口内几条日志会丢在旧流里——本地调试日志可接受，不换取并发复杂度。
    dingShiQi = setInterval(() => {
      if (!lunZhuanKaiFaWenJian()) return
      try {
        wenJianLiu?.end()
        kaiQiLiu()
      } catch {
        /* 重建失败保持旧 riZhiQi，不抛出 */
      }
    }, 5 * 60 * 1000)
    dingShiQi.unref()
  } else {
    // stdout 不再塞进 transport 的 targets：transport 是单条 worker 多路流，任一目标解析/启动失败
    // 会连带打死整条流（本次「stdout 与文件同时 0 输出」的故障形态）。拆成 multistream 后，
    // 文件通道坏了也还有 `docker logs` 可看，可观测性不再单点。
    transportStream = pino.transport({ targets: gouJianShengChanTargets(riZhiWenJian) })
    stdoutLiu = pino.destination({ dest: 1, sync: false })
    riZhiQi = pino(jiBenPeiZhi, pino.multistream([stdoutLiu, transportStream]))

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

  return riZhiQi
}

export function sheZhiRiZhiJiBie(jiBie: string): boolean {
  if (!(youXiaoJiBieLieBiao as string[]).includes(jiBie)) return false
  dangQianJiBie = jiBie as pino.LevelWithSilent
  yiSheZhiGuoJiBie = true
  if (riZhiQi) riZhiQi.level = dangQianJiBie
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
      const yaSuoShuJu = await yaSuoHanShu(neiRong)
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
    if (!riZhiQi) chuangJianRiZhiYinQing()
    riZhiQi.debug({ lei_xing: leiXing, ...(xiangQing ? { xiang_qing: xiangQing } : {}) }, xiaoXi)
  },
  info: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>): void => {
    if (!riZhiQi) chuangJianRiZhiYinQing()
    riZhiQi.info({ lei_xing: leiXing, ...(xiangQing ? { xiang_qing: xiangQing } : {}) }, xiaoXi)
  },
  warn: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>): void => {
    if (!riZhiQi) chuangJianRiZhiYinQing()
    riZhiQi.warn({ lei_xing: leiXing, ...(xiangQing ? { xiang_qing: xiangQing } : {}) }, xiaoXi)
  },
  error: (leiXing: string, xiaoXi: string, xiangQing?: Record<string, unknown>): void => {
    if (!riZhiQi) chuangJianRiZhiYinQing()
    riZhiQi.error({ lei_xing: leiXing, ...(xiangQing ? { xiang_qing: xiangQing } : {}) }, xiaoXi)
  },
}
