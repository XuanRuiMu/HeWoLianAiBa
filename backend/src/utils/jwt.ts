import jwt from 'jsonwebtoken'
import { randomUUID, randomBytes } from 'crypto'
import { peiZhi } from '../config'
import { redis } from '../redis'

export { randomUUID } from 'crypto'

export interface LingPaiZaiHe {
  yongHuId: string
  shouJiHao: string
  jti?: string
  iat?: number
  exp?: number
  qianFaHaoMiao?: number
  tokenType?: 'access' | 'refresh'
  refreshTokenId?: string
}

/** 生成 refresh token（opaque 随机串，不含敏感信息） */
export function shengChengRefreshToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Refresh token Redis key 前缀 */
const REFRESH_TOKEN_PREFIX = 'refresh_token:'
const REFRESH_TOKEN_USER_PREFIX = 'refresh_token_user:'
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60

/** 存储 refresh token 到 Redis */
export async function cunChuRefreshToken(
  yongHuId: string,
  tokenId: string,
  shouJiHao: string,
): Promise<void> {
  const key = `${REFRESH_TOKEN_PREFIX}${yongHuId}:${tokenId}`
  const value = JSON.stringify({ yongHuId, shouJiHao, chuangJianShiJian: Date.now() })
  await redis.set(key, value, 'EX', REFRESH_TOKEN_TTL)
  // 用户级索引：记录该用户拥有的所有 tokenId，便于全家吊销
  await redis.sadd(`${REFRESH_TOKEN_USER_PREFIX}${yongHuId}`, tokenId)
  await redis.expire(`${REFRESH_TOKEN_USER_PREFIX}${yongHuId}`, REFRESH_TOKEN_TTL)
}

/** 验证并消费 refresh token（单次使用，消费后删除，防重放） */
export async function xiaoHaoRefreshToken(
  tokenId: string,
  yongHuId: string,
): Promise<{ chengGong: boolean; shouJiHao?: string; cuoWu?: string }> {
  const key = `${REFRESH_TOKEN_PREFIX}${yongHuId}:${tokenId}`
  const value = await redis.get(key)
  if (!value) {
    return { chengGong: false, cuoWu: 'refresh token不存在或已过期' }
  }
  const data = JSON.parse(value)
  if (data.yongHuId !== yongHuId) {
    return { chengGong: false, cuoWu: 'refresh token用户不匹配' }
  }
  // 删除该 token（单次使用）
  await redis.del(key)
  // 从用户索引中移除
  await redis.srem(`${REFRESH_TOKEN_USER_PREFIX}${yongHuId}`, tokenId)
  return { chengGong: true, shouJiHao: data.shouJiHao }
}

/** 检测 refresh token 是否已被使用（复用检测） */
export async function jianCeRefreshTokenChongFu(
  tokenId: string,
  yongHuId: string,
): Promise<boolean> {
  const key = `${REFRESH_TOKEN_PREFIX}${yongHuId}:${tokenId}`
  const exists = await redis.exists(key)
  return exists === 0 // 不存在说明已被消费过（疑似复用）
}

/** 吊销用户所有 refresh token（全家吊销） */
export async function cheXiaoYongHuSuoYouRefreshToken(yongHuId: string): Promise<void> {
  const userKey = `${REFRESH_TOKEN_USER_PREFIX}${yongHuId}`
  const tokenIds = await redis.smembers(userKey)
  if (tokenIds.length > 0) {
    const keys = tokenIds.map((tid) => `${REFRESH_TOKEN_PREFIX}${yongHuId}:${tid}`)
    await redis.del(...keys)
  }
  await redis.del(userKey)
}

/** 删除单个 refresh token */
export async function shanChuRefreshToken(tokenId: string, yongHuId: string): Promise<void> {
  const key = `${REFRESH_TOKEN_PREFIX}${yongHuId}:${tokenId}`
  await redis.del(key)
  await redis.srem(`${REFRESH_TOKEN_USER_PREFIX}${yongHuId}`, tokenId)
}

export function huoQuLingPaiZuiDaYouXiaoQiMiao(): number {
  const piPei = /^(\d+)([smhd])$/.exec(peiZhi.jwtGuoQi.trim())
  const danWeiHaoMiao: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }
  if (!piPei) return 7 * danWeiHaoMiao.d
  return Number(piPei[1]) * danWeiHaoMiao[piPei[2]]
}

export function huoQuCheXiaoJian(yongHuId: string): string {
  return `jwt_yong_hu_cheXiao:${yongHuId}`
}

export async function xieRuCheXiaoShiJianCuo(yongHuId: string): Promise<void> {
  await redis.set(
    huoQuCheXiaoJian(yongHuId),
    String(Date.now()),
    'EX',
    huoQuLingPaiZuiDaYouXiaoQiMiao(),
  )
}

export async function lingPaiShiFouYiCheXiao(
  yongHuId: string,
  iat?: number,
  qianFaHaoMiao?: number,
): Promise<boolean> {
  if (!yongHuId) return false
  const zhi = await redis.get(huoQuCheXiaoJian(yongHuId))
  if (zhi === null) return false
  const panDuanHaoMiao =
    typeof qianFaHaoMiao === 'number'
      ? qianFaHaoMiao
      : typeof iat === 'number'
        ? iat * 1000
        : undefined
  if (typeof panDuanHaoMiao !== 'number') return false
  return panDuanHaoMiao <= Number(zhi)
}

export function shengChengLingPai(zaiHe: LingPaiZaiHe): string {
  return jwt.sign(
    { ...zaiHe, qianFaHaoMiao: Date.now() },
    peiZhi.jwtMiYao as jwt.Secret,
    {
      expiresIn: peiZhi.jwtGuoQi,
      jwtid: randomUUID(),
    } as jwt.SignOptions,
  )
}

export function yanZhengLingPai(lingPai: string): LingPaiZaiHe {
  return jwt.verify(lingPai, peiZhi.jwtMiYao as jwt.Secret) as LingPaiZaiHe
}