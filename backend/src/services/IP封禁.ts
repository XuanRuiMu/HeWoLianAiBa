import type { Request } from 'express'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuZhenShiIP } from '../utils/真实IP'
import { huoQuFanYi } from '../config/translations'
import { debug日志 } from '../utils/debug日志'

export interface 封禁结果 {
  已封禁: boolean
  解封时间?: Date | null
  原因?: string
}

export interface 违规记录结果 {
  次数: number
  已封禁: boolean
  封禁时长?: number
  解封时间?: Date | null
}

const 违规前缀 = '违规:'
const 封禁前缀 = '封禁:'
// YH-027 永封改最长30天：IP封禁封顶30天，到期自动解封，禁无期限永封
const ZUI_CHANG_FENG_JIN_HAO_MIAO = 30 * 24 * 60 * 60 * 1000
const NAT_YU_JING_YU_ZHI = 50

function 标准化IP(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7)
  }
  return ip
}

export function 获取IP(请求: Request): string {
  // A2：一律取可信链路推导的真实来源 IP（socket 对端 + 可信代理 X-Real-IP），
  // 客户端可控的 X-Forwarded-For 不参与解析，防止伪造绕过限流/封禁或嫁祸他人
  return 标准化IP(huoQuZhenShiIP(请求))
}

function 获取违规键(ip: string): string {
  return `${违规前缀}${ip}`
}

function 获取封禁键(ip: string): string {
  return `${封禁前缀}${ip}`
}

export async function IP是否被封禁(ip: string): Promise<封禁结果> {
  const 键 = 获取封禁键(ip)
  const 数据 = await redis.get(键)
  if (!数据) {
    return { 已封禁: false }
  }

  const 解析 = JSON.parse(数据) as { 解封时间?: string | null; 原因?: string }
  // YH-027 复核语义：解封时间已过视为未封禁，防过期残留误杀
  if (解析.解封时间) {
    const jieFeng = new Date(解析.解封时间).getTime()
    if (!Number.isNaN(jieFeng) && jieFeng <= Date.now()) {
      await redis.del(键).catch(() => undefined)
      return { 已封禁: false }
    }
  }
  return {
    已封禁: true,
    解封时间: 解析.解封时间 ? new Date(解析.解封时间) : null,
    原因: 解析.原因,
  }
}

export async function 记录违规(
  ip: string,
  原因?: string,
  严重程度?: string,
): Promise<违规记录结果> {
  const 违规键 = 获取违规键(ip)
  const 当前次数 = await redis.incr(违规键)
  if (当前次数 === 1) {
    await redis.pexpire(违规键, 30 * 24 * 60 * 60 * 1000)
  }

  const 结果: 违规记录结果 = { 次数: 当前次数, 已封禁: false }

  if (当前次数 === 1) {
    return 结果
  }

  const 封禁时长 = 计算封禁时长(当前次数)
  if (封禁时长 !== undefined) {
    const 解封时间 = new Date(Date.now() + 封禁时长)
    await 设置封禁(ip, 封禁时长, 原因)
    await 持久化封禁记录(ip, 原因, 严重程度, 解封时间)
    // YH-027 NAT预警：同段高频封禁提示校园网/NAT共享出口风险
    if (当前次数 >= NAT_YU_JING_YU_ZHI) {
      debug日志.warn('IP封禁', 'NAT共享出口预警：同IP高频违规疑似NAT', { xiang_qing: { ci_shu: 当前次数 } })
      try {
        const { faSongGaoJing } = await import('../utils/邮件告警')
        await faSongGaoJing('ip_nat_yu_jing', 'IP封禁NAT预警', `IP高频违规${当前次数}次疑似NAT共享出口，请复核封禁范围`).catch(() => undefined)
      } catch {
        // 告警失败不阻断封禁
      }
    }
    结果.已封禁 = true
    结果.封禁时长 = 封禁时长
    结果.解封时间 = 解封时间
  }

  return 结果
}

/** YH-027 封禁阶梯：1小时→24小时→7天→30天封顶，需复核+申诉入口纠偏 */
function 计算封禁时长(次数: number): number | undefined {
  if (次数 === 2) return 60 * 60 * 1000
  if (次数 === 3) return 24 * 60 * 60 * 1000
  if (次数 === 4) return 7 * 24 * 60 * 60 * 1000
  if (次数 >= 5) return ZUI_CHANG_FENG_JIN_HAO_MIAO
  return undefined
}

async function 设置封禁(
  ip: string,
  时长: number,
  原因?: string,
): Promise<void> {
  const 键 = 获取封禁键(ip)
  const 数据 = JSON.stringify({
    解封时间: new Date(Date.now() + 时长).toISOString(),
    原因: 原因,
  })

  await redis.set(键, 数据, 'PX', 时长)
}

async function 持久化封禁记录(
  ip: string,
  原因?: string,
  严重程度?: string,
  解封时间?: Date | null,
): Promise<void> {
  await 数据库.query(
    `INSERT INTO "封禁记录" ("IP", "原因", "严重程度", "解封时间") VALUES ($1, $2, $3, $4)`,
    [ip, 原因 || '', 严重程度 || '', 解封时间 || null],
  )
}

export async function 清除违规和封禁(ip: string): Promise<void> {
  await redis.del(获取违规键(ip))
  await redis.del(获取封禁键(ip))
}

/** YH-027 IP申诉入口：封禁中提交申诉理由，未封禁或空理由拒绝 */
export async function tiJiaoIPShengSu(ip: string, liYou: string): Promise<{ cheng_gong: boolean; ti_shi?: string }> {
  const qingLi = liYou.trim().slice(0, 500)
  if (!qingLi) return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'queShaoCanShu') }
  const zhuangTai = await IP是否被封禁(ip)
  if (!zhuangTai.已封禁) return { cheng_gong: false, ti_shi: huoQuFanYi('tongYong', 'canShuBuHeFa') }
  await 数据库.query(
    `INSERT INTO "封禁记录" ("IP", "原因", "严重程度", "解封时间") VALUES ($1, $2, $3, $4)`,
    [ip, `IP申诉：${qingLi}`.slice(0, 500), '轻微', zhuangTai.解封时间 || null],
  )
  return { cheng_gong: true, ti_shi: huoQuFanYi('ziLiao', 'shenSuYiTiJiao') }
}

export async function 清除所有封禁记录(ip: string): Promise<void> {
  await 数据库.query(`DELETE FROM "封禁记录" WHERE "IP" = $1`, [ip])
}
