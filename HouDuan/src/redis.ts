import { debug日志 } from './utils/debug日志'
import Redis from 'ioredis'
import { peiZhi } from './config'
import { biaoJiWeiJiuXu, biaoJiYiJiuXu } from './utils/依赖就绪'

function jieXiRedisLianJie(lianJie: string): { shiFouTLS: boolean; zhuJi: string; duanKou: number; miMa?: string; ShuJuKu?: number } {
  const qingLi = lianJie.trim()
  const shiFouTLS = /^rediss:\/\//i.test(qingLi)
  const jieGuo = /^rediss?:\/\/(?:[^@]*@)?([^:/]+)(?::(\d+))?(?:\/(\d+))?/.exec(qingLi)
  const zhuJi = jieGuo?.[1] || '127.0.0.1'
  const duanKou = jieGuo?.[2] ? Number(jieGuo[2]) : 6379
  const ShuJuKu = jieGuo?.[3] ? Number(jieGuo[3]) : undefined
  const atWeiZhi = qingLi.lastIndexOf('@')
  const xieGangGang = qingLi.indexOf('://')
  let miMa: string | undefined
  if (atWeiZhi > xieGangGang) {
    const pingZheng = qingLi.slice(xieGangGang + 3, atWeiZhi)
    const maoHao = pingZheng.indexOf(':')
    if (maoHao >= 0) miMa = pingZheng.slice(maoHao + 1)
  }
  if (miMa) {
    try {
      miMa = decodeURIComponent(miMa)
    } catch {
      // 非编码密码原样使用
    }
  }
  if (!miMa && process.env.REDIS_PASSWORD) miMa = process.env.REDIS_PASSWORD
  return { shiFouTLS, zhuJi, duanKou, miMa, ShuJuKu }
}

const redisPeiZhi = jieXiRedisLianJie(peiZhi.redisLianJie)

if (redisPeiZhi.shiFouTLS) {
  console.info('[Redis] 检测到rediss加密连接串，已启用TLS传输')
}

export interface RedisLianJiePeiZhi {
  host: string
  port: number
  password?: string
  db?: number
  tls?: Record<string, never>
}

export function gouJianRedisLianJiePeiZhi(lianJie: string, huanJingMiMa?: string): RedisLianJiePeiZhi {
  const jieXi = jieXiRedisLianJie(lianJie)
  const jiBen: RedisLianJiePeiZhi = {
    host: jieXi.zhuJi,
    port: jieXi.duanKou,
    ...(jieXi.miMa ?? huanJingMiMa ? { password: jieXi.miMa ?? huanJingMiMa } : {}),
    ...(jieXi.ShuJuKu === undefined ? {} : { db: jieXi.ShuJuKu }),
  }
  if (jieXi.shiFouTLS) jiBen.tls = {}
  return jiBen
}

export const redis = new Redis({
  ...gouJianRedisLianJiePeiZhi(peiZhi.redisLianJie, process.env.REDIS_PASSWORD),
  maxRetriesPerRequest: null,
  commandTimeout: 3000,
  retryStrategy: (ciShu) => Math.min(ciShu * 500, 5000),
  enableReadyCheck: true,
})

const YU_RE_READY_CHAO_SHI_HAO_MIAO = 15000

let jiuXuChengNuo: Promise<void> | null = null
let yiTanCeShiBai = false

export function biaoJiRedisYiTanCeShiBai(): void {
  yiTanCeShiBai = true
}

export function dengDaiRedisJiuXu(zuiDaHaoMiao: number = YU_RE_READY_CHAO_SHI_HAO_MIAO): Promise<void> {
  if (redis.status === 'ready') return Promise.resolve()
  if (yiTanCeShiBai) return Promise.resolve()
  if (!jiuXuChengNuo) {
    jiuXuChengNuo = new Promise<void>((jieShu) => {
      const jieShuZhi = () => {
        clearTimeout(jiShiQi)
        redis.off('ready', jieShuZhi)
        jiuXuChengNuo = null
        jieShu()
      }
      const jiShiQi = setTimeout(jieShuZhi, zuiDaHaoMiao)
      redis.once('ready', jieShuZhi)
    })
  }
  return jiuXuChengNuo
}

type RongDuanZhuangTai = 'biHe' | 'kaiLu' | 'banKai'
let rongDuanZhuangTai: RongDuanZhuangTai = 'biHe'
let rongDuanLianXuShiBai = 0
let rongDuanKaiLuShiJian = 0
const RONG_DUAN_YU_ZHI = 5
const RONG_DUAN_HUI_FU_HAO_MIAO = 30000

redis.on('error', (cuoWu) => {
  biaoJiWeiJiuXu('redis', cuoWu)
  rongDuanLianXuShiBai += 1
  if (rongDuanLianXuShiBai >= RONG_DUAN_YU_ZHI && rongDuanZhuangTai === 'biHe') {
    rongDuanZhuangTai = 'kaiLu'
    rongDuanKaiLuShiJian = Date.now()
  }
  debug日志.error('Redis连接', 'Redis连接错误', { xiang_qing: { cuo_wu: String(cuoWu), rong_duan: rongDuanZhuangTai } })
})

redis.on('ready', () => {
  yiTanCeShiBai = false
  biaoJiYiJiuXu('redis')
  rongDuanLianXuShiBai = 0
  rongDuanZhuangTai = 'biHe'
})

redis.on('end', () => {
  biaoJiWeiJiuXu('redis', new Error('Redis连接已断开'))
})

export async function tanCeRedisJiuXu(): Promise<boolean> {
  try {
    const jieGuo = await redis.ping()
    if (jieGuo !== 'PONG') {
      yiTanCeShiBai = true
      biaoJiWeiJiuXu('redis', new Error(`Redis ping 返回异常：${String(jieGuo)}`))
      debug日志.warn('Redis连接', 'Redis 探测未通过', { xiang_qing: { cuo_wu: `ping 返回 ${String(jieGuo)}` } })
      return false
    }
    biaoJiYiJiuXu('redis')
    return true
  } catch (cuoWu) {
    yiTanCeShiBai = true
    biaoJiWeiJiuXu('redis', cuoWu)
    debug日志.warn('Redis连接', 'Redis 探测未通过', { xiang_qing: { cuo_wu: String(cuoWu).slice(0, 300) } })
    return false
  }
}

export function redisRongDuanShiFouKaiLu(): boolean {
  if (rongDuanZhuangTai === 'kaiLu' && Date.now() - rongDuanKaiLuShiJian > RONG_DUAN_HUI_FU_HAO_MIAO) {
    rongDuanZhuangTai = 'banKai'
  }
  return rongDuanZhuangTai === 'kaiLu'
}

export async function daiRongDuanZhiXing<T>(mingCheng: string, dongZuo: () => Promise<T>, jiangJiZhi?: T): Promise<T> {
  if (redisRongDuanShiFouKaiLu()) {
    throw new Error(`Redis熔断开路中，拒绝执行：${mingCheng}`)
  }
  try {
    const jieGuo = await Promise.race([
      dongZuo(),
      new Promise<never>((_, juJue) => setTimeout(() => juJue(new Error(`Redis命令超时：${mingCheng}`)), 3000)),
    ])
    rongDuanLianXuShiBai = 0
    return jieGuo
  } catch (cuoWu) {
    rongDuanLianXuShiBai += 1
    if (rongDuanLianXuShiBai >= RONG_DUAN_YU_ZHI && rongDuanZhuangTai === 'biHe') {
      rongDuanZhuangTai = 'kaiLu'
      rongDuanKaiLuShiJian = Date.now()
      void import('./utils/邮件告警').then(({ faSongGaoJing }) => faSongGaoJing('redis_rong_duan', 'Redis熔断开路告警', `Redis连续失败${rongDuanLianXuShiBai}次已熔断`).catch(() => undefined))
    }
    if (jiangJiZhi !== undefined) {
      return jiangJiZhi
    }
    throw cuoWu
  }
}