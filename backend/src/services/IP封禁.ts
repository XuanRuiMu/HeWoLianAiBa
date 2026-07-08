import type { Request } from 'express'
import { 数据库 } from '../数据库'
import { redis } from '../redis'

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
const 永久封禁 = -1

function 标准化IP(ip: string): string {
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7)
  }
  return ip
}

export function 获取IP(请求: Request): string {
  const 转发头 = 请求.headers['x-forwarded-for']
  if (typeof 转发头 === 'string') {
    return 标准化IP(转发头.split(',')[0].trim())
  }
  return 标准化IP(请求.ip || '127.0.0.1')
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
    const 解封时间 = 封禁时长 === 永久封禁 ? null : new Date(Date.now() + 封禁时长)
    await 设置封禁(ip, 封禁时长, 原因)
    await 持久化封禁记录(ip, 原因, 严重程度, 解封时间)
    结果.已封禁 = true
    结果.封禁时长 = 封禁时长
    结果.解封时间 = 解封时间
  }

  return 结果
}

function 计算封禁时长(次数: number): number | undefined {
  if (次数 === 2) return 60 * 60 * 1000
  if (次数 === 3) return 24 * 60 * 60 * 1000
  if (次数 >= 4) return 永久封禁
  return undefined
}

async function 设置封禁(
  ip: string,
  时长: number,
  原因?: string,
): Promise<void> {
  const 键 = 获取封禁键(ip)
  const 数据 = JSON.stringify({
    解封时间: 时长 === 永久封禁 ? null : new Date(Date.now() + 时长).toISOString(),
    原因: 原因,
  })

  if (时长 === 永久封禁) {
    await redis.set(键, 数据)
  } else {
    await redis.set(键, 数据, 'PX', 时长)
  }
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

export async function 清除所有封禁记录(ip: string): Promise<void> {
  await 数据库.query(`DELETE FROM "封禁记录" WHERE "IP" = $1`, [ip])
}
