import {CuoWuDaiMa} from '../config/错误码注册表'
import type { 依赖名称 } from './依赖就绪'

export type { 依赖名称 }

export class 依赖不可用错误 extends Error {
  readonly 依赖: 依赖名称
  readonly 原始错误: unknown

  constructor(依赖: 依赖名称, 原始错误: unknown) {
    super(`依赖不可用：${依赖}`)
    this.name = '依赖不可用错误'
    this.依赖 = 依赖
    this.原始错误 = 原始错误
    this.cause = 原始错误
  }
}

export function 是依赖不可用错误(值: unknown): 值 is 依赖不可用错误 {
  return 值 instanceof 依赖不可用错误
}

export async function 包装依赖调用<T>(
  依赖: 依赖名称,
  操作: () => Promise<T>,
): Promise<T> {
  try {
    return await 操作()
  } catch (错误) {
    if (是依赖不可用错误(错误)) throw 错误
    throw new 依赖不可用错误(依赖, 错误)
  }
}

export function 依赖对应错误码(依赖: 依赖名称): CuoWuDaiMa {
  return 依赖 === 'postgres'
    ? CuoWuDaiMa.DEPENDENCY_POSTGRES_UNAVAILABLE
    : CuoWuDaiMa.DEPENDENCY_REDIS_UNAVAILABLE
}

const PostgresDaiMa = new Set([
  '28P01',
  '3D000',
  '42P01',
  '57P03',
  '53300',
  '08000',
  '08003',
  '08006',
  '08001',
  '08004',
])

const RedisDaiMa = new Set([
  'NOAUTH',
  'WRONGPASS',
  'NR_CLOSED',
  'NOPERM',
  'CONNECTION_BROKEN',
])

const LianJieCuoWuDaiMa = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ECONNRESET',
  'EHOSTDOWN',
  'EAI_AGAIN',
])

export function 推断依赖来源(值: unknown): 依赖名称 | null {
  if (是依赖不可用错误(值)) return 值.依赖
  if (typeof 值 !== 'object' || 值 === null) return null
  const 对象 = 值 as { code?: unknown; severity?: unknown; message?: unknown; syscall?: unknown }
  const 代码 = typeof 对象.code === 'string' ? 对象.code : ''
  const 文案 = typeof 对象.message === 'string' ? 对象.message : ''
  if (PostgresDaiMa.has(代码) || typeof 对象.severity === 'string') return 'postgres'
  if (RedisDaiMa.has(代码)) return 'redis'
  if (LianJieCuoWuDaiMa.has(代码)) {
    if (/:5432|postgres/i.test(文案)) return 'postgres'
    if (/:6379|rediss?:\/\//i.test(文案)) return 'redis'
    return null
  }
  if (/redis|NOAUTH|WRONGPASS/i.test(文案)) return 'redis'
  if (/postgres|pg_|42P01|relation .* does not exist/i.test(文案)) return 'postgres'
  return null
}
