import { debug日志 } from './utils/debug日志'
import Redis from 'ioredis'
import { peiZhi } from './config'

function jieXiRedisLianJie(lianJie: string): { shiFouTLS: boolean; zhuJi: string; duanKou: number; miMa?: string; shuJuKu?: number } {
  const qingLi = lianJie.trim()
  const shiFouTLS = /^rediss:\/\//i.test(qingLi)
  const jieGuo = /^rediss?:\/\/(?:[^@]*@)?([^:/]+)(?::(\d+))?(?:\/(\d+))?/.exec(qingLi)
  const zhuJi = jieGuo?.[1] || '127.0.0.1'
  const duanKou = jieGuo?.[2] ? Number(jieGuo[2]) : 6379
  const shuJuKu = jieGuo?.[3] ? Number(jieGuo[3]) : undefined
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
  return { shiFouTLS, zhuJi, duanKou, miMa, shuJuKu }
}

const redisPeiZhi = jieXiRedisLianJie(peiZhi.redisLianJie)

// YH-023 rediss透传tls：加密连接串必须走TLS，禁明文降级；启动校验告警见server.ts启动前强校验
if (redisPeiZhi.shiFouTLS) {
  // eslint-disable-next-line no-console -- 配置加载期告警:本模块被日志引擎反向依赖,引入logger有循环初始化风险
  console.info('[Redis] 检测到rediss加密连接串，已启用TLS传输')
}

export const redis = new Redis({
  host: redisPeiZhi.zhuJi,
  port: redisPeiZhi.duanKou,
  password: redisPeiZhi.miMa,
  db: redisPeiZhi.shuJuKu,
  ...(redisPeiZhi.shiFouTLS ? { tls: {} } : {}),
  maxRetriesPerRequest: null,
  // YH-063 Redis熔断：命令超时+熔断，断线无限排队等于全站雪崩
  // 根因：无超时无熔断，断线全站hang；收敛为命令超时3s+失败计数熔断+认证链明确语义
  commandTimeout: 3000,
  retryStrategy: (ciShu) => {
    if (ciShu > 3) return null
    return Math.min(ciShu * 500, 2000)
  },
  enableReadyCheck: true,
})

type RongDuanZhuangTai = 'biHe' | 'kaiLu' | 'banKai'
let rongDuanZhuangTai: RongDuanZhuangTai = 'biHe'
let rongDuanLianXuShiBai = 0
let rongDuanKaiLuShiJian = 0
const RONG_DUAN_YU_ZHI = 5
const RONG_DUAN_HUI_FU_HAO_MIAO = 30000

redis.on('error', (cuoWu) => {
  rongDuanLianXuShiBai += 1
  if (rongDuanLianXuShiBai >= RONG_DUAN_YU_ZHI && rongDuanZhuangTai === 'biHe') {
    rongDuanZhuangTai = 'kaiLu'
    rongDuanKaiLuShiJian = Date.now()
  }
  debug日志.error('Redis连接', 'Redis连接错误', { xiang_qing: { cuo_wu: String(cuoWu), rong_duan: rongDuanZhuangTai } })
})

redis.on('ready', () => {
  rongDuanLianXuShiBai = 0
  rongDuanZhuangTai = 'biHe'
})

// YH-063 认证链明确失败语义：熔断开路时直接抛错降级，禁无限等待
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
