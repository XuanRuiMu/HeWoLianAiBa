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

const KAI_FA_WEN_JIAN_ZUI_DA = 20 * 1024 * 1024
const KAI_FA_LUN_ZHUAN_BAO_LIU = 3
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
    const baoLiuShangXian = Math.max(0, baoLiuFenShu) + 1
    while (liBiao.length > baoLiuShangXian) {
      const guoQi = liBiao.shift()
      if (guoQi) fs.rmSync(path.join(muLu, guoQi), { force: true })
    }
    return true
  } catch (e) {
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
    lunZhuanKaiFaWenJian()
    const kaiQiLiu = (): void => {
      wenJianLiu = fs.createWriteStream(riZhiWenJian, { flags: 'a' })
      wenJianLiu.on('error', () => {})
      riZhiQi = pino(jiBenPeiZhi, wenJianLiu)
    }
    kaiQiLiu()

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
