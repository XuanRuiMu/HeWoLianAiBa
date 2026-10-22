import { CUO_WU_DAI_MA, type CuoWuDaiMa } from '../config/错误码注册表'

export type 依赖名称 = 'postgres' | 'redis'

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
    ? CUO_WU_DAI_MA.DEPENDENCY_POSTGRES_UNAVAILABLE
    : CUO_WU_DAI_MA.DEPENDENCY_REDIS_UNAVAILABLE
}

const POSTGRES_DAI_MA = new Set([
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

const REDIS_DAI_MA = new Set(['NOAUTH', 'WRONGPASS', 'NR_CLOSED', 'CONNECTION_BROKEN'])

export function 推断依赖来源(值: unknown): 依赖名称 | null {
  if (是依赖不可用错误(值)) return 值.依赖
  if (typeof 值 !== 'object' || 值 === null) return null
  const 对象 = 值 as { code?: unknown; severity?: unknown; message?: unknown }
  const 代码 = typeof 对象.code === 'string' ? 对象.code : ''
  const 文案 = typeof 对象.message === 'string' ? 对象.message : ''
  if (POSTGRES_DAI_MA.has(代码) || typeof 对象.severity === 'string') return 'postgres'
  if (REDIS_DAI_MA.has(代码)) return 'redis'
  if (代码 === 'ECONNREFUSED' || 代码 === 'ENOTFOUND' || 代码 === 'ETIMEDOUT') {
    if (/:5432|postgres/i.test(文案)) return 'postgres'
    if (/:6379|rediss?:\/\//i.test(文案)) return 'redis'
    return null
  }
  if (/redis|NOAUTH|WRONGPASS/i.test(文案)) return 'redis'
  if (/postgres|pg_|42P01|relation .* does not exist/i.test(文案)) return 'postgres'
  return null
}
