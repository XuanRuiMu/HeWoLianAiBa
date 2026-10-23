import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { peiZhi } from '../config'
import { redis } from '../redis'

export { randomUUID } from 'crypto'

export interface LingPaiZaiHe {
  yongHuId: string
  shouJiHao?: string
  jti?: string
  iat?: number
  exp?: number
  qianFaHaoMiao?: number
  tokenType?: 'access' | 'refresh'
  refreshTokenId?: string
}

const REFRESH_TOKEN_PREFIX = 'refresh_token:'
const REFRESH_TOKEN_USER_PREFIX = 'refresh_token_user:'
const REFRESH_TOKEN_XIAO_HAO_PREFIX = 'xiao_hao_refresh_token:'
const REFRESH_TOKEN_TTL = peiZhi.shuaXinLingPaiYouXiaoMiao
const XIAO_HAO_BIAO_JI_TTL = 24 * 60 * 60

export async function cunChuRefreshToken(
  yongHuId: string,
  tokenId: string,
): Promise<void> {
  const jianMing = `${REFRESH_TOKEN_PREFIX}${yongHuId}:${tokenId}`
  await redis.set(jianMing, yongHuId, 'EX', REFRESH_TOKEN_TTL)
  await redis.sadd(`${REFRESH_TOKEN_USER_PREFIX}${yongHuId}`, tokenId)
  await redis.expire(`${REFRESH_TOKEN_USER_PREFIX}${yongHuId}`, REFRESH_TOKEN_TTL)
}

function duQuRefreshTokenYongHuId(cunChuZhi: string): string | null {
  if (!cunChuZhi.includes('{')) return cunChuZhi
  try {
    const jieXi = JSON.parse(cunChuZhi) as { yongHuId?: unknown }
    return typeof jieXi.yongHuId === 'string' ? jieXi.yongHuId : null
  } catch {
    return null
  }
}

void duQuRefreshTokenYongHuId


const XIAO_HAO_LUA = `
local huo = redis.call('GET', KEYS[1])
if not huo then return 0 end
local yongHu = huo
if string.find(huo, '{', 1, true) then
  local ok, jie = pcall(cjson.decode, huo)
  if ok and jie and jie.yongHuId then yongHu = jie.yongHuId end
end
if yongHu ~= ARGV[1] then return -1 end
redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[2], ARGV[2])
redis.call('SET', KEYS[3], '1', 'EX', ARGV[3])
return 1
`

export async function xiaoHaoRefreshToken(
  tokenId: string,
  yongHuId: string,
): Promise<{ chengGong: boolean; cuoWu?: string }> {
  const jianMing = `${REFRESH_TOKEN_PREFIX}${yongHuId}:${tokenId}`
  const yongHuJian = `${REFRESH_TOKEN_USER_PREFIX}${yongHuId}`
  const tombKey = `${REFRESH_TOKEN_XIAO_HAO_PREFIX}${yongHuId}:${tokenId}`
  const jieGuo = (await (redis as unknown as {
    eval: (jiaoBen: string, jianShu: number, ...canShu: string[]) => Promise<unknown>
  }).eval(XIAO_HAO_LUA, 3, jianMing, yongHuJian, tombKey, yongHuId, tokenId, String(XIAO_HAO_BIAO_JI_TTL))) as number
  if (jieGuo === 1) return { chengGong: true }
  if (jieGuo === -1) return { chengGong: false, cuoWu: 'refresh token用户不匹配' }
  return { chengGong: false, cuoWu: 'refresh token不存在或已过期' }
}

export async function jianCeRefreshTokenChongFu(
  tokenId: string,
  yongHuId: string,
): Promise<boolean> {
  const xiaoHaoJian = `${REFRESH_TOKEN_XIAO_HAO_PREFIX}${yongHuId}:${tokenId}`
  const beiXiaoHao = await redis.exists(xiaoHaoJian)
  if (beiXiaoHao === 0) return false
  const huoJian = `${REFRESH_TOKEN_PREFIX}${yongHuId}:${tokenId}`
  return (await redis.exists(huoJian)) === 0
}

export async function cheXiaoYongHuSuoYouRefreshToken(yongHuId: string): Promise<void> {
  const yongHuJian = `${REFRESH_TOKEN_USER_PREFIX}${yongHuId}`
  const tokenIds = await redis.smembers(yongHuJian)
  if (tokenIds.length > 0) {
    const jianMingLieBiao = tokenIds.map((tid) => `${REFRESH_TOKEN_PREFIX}${yongHuId}:${tid}`)
    await redis.del(...jianMingLieBiao)
  }
  await redis.del(yongHuJian)
}

export async function shanChuRefreshToken(tokenId: string, yongHuId: string): Promise<void> {
  const jianMing = `${REFRESH_TOKEN_PREFIX}${yongHuId}:${tokenId}`
  await redis.del(jianMing)
  await redis.srem(`${REFRESH_TOKEN_USER_PREFIX}${yongHuId}`, tokenId)
}

export function huoQuLingPaiZuiDaYouXiaoQiMiao(): number {
  const piPei = /^(\d+)([smhd])$/.exec(peiZhi.jwtGuoQi.trim())
  const danWeiHaoMiao: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }
  if (!piPei) return 25 * danWeiHaoMiao.m
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
      algorithm: 'HS256',
      jwtid: randomUUID(),
    } as jwt.SignOptions,
  )
}

export function yanZhengLingPai(lingPai: string): LingPaiZaiHe {
  return jwt.verify(lingPai, peiZhi.jwtMiYao as jwt.Secret, { algorithms: ['HS256'] }) as LingPaiZaiHe
}