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

/** Refresh token Redis key 前缀 */
const REFRESH_TOKEN_PREFIX = 'refresh_token:'
const REFRESH_TOKEN_USER_PREFIX = 'refresh_token_user:'
const REFRESH_TOKEN_XIAO_HAO_PREFIX = 'xiao_hao_refresh_token:'
const REFRESH_TOKEN_TTL = peiZhi.shuaXinLingPaiYouXiaoMiao
const XIAO_HAO_BIAO_JI_TTL = 24 * 60 * 60

/** 存储 refresh token 到 Redis（仅存用户标识，不存手机号等敏感信息） */
export async function cunChuRefreshToken(
  yongHuId: string,
  tokenId: string,
): Promise<void> {
  const key = `${REFRESH_TOKEN_PREFIX}${yongHuId}:${tokenId}`
  await redis.set(key, yongHuId, 'EX', REFRESH_TOKEN_TTL)
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

/** 单飞行锁串行化：同凭证并发刷新排队，避免双兑现绕开 Lua（内存锁仅防同进程并发） */

/** 验证并消费 refresh token（Lua原子验活删活立碑：并发双刷仅一胜，另一路见墓碑走复用链） */
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
  const key = `${REFRESH_TOKEN_PREFIX}${yongHuId}:${tokenId}`
  const userKey = `${REFRESH_TOKEN_USER_PREFIX}${yongHuId}`
  const tombKey = `${REFRESH_TOKEN_XIAO_HAO_PREFIX}${yongHuId}:${tokenId}`
  const jieGuo = (await (redis as unknown as {
    eval: (jiaoBen: string, jianShu: number, ...canShu: string[]) => Promise<unknown>
  }).eval(XIAO_HAO_LUA, 3, key, userKey, tombKey, yongHuId, tokenId, String(XIAO_HAO_BIAO_JI_TTL))) as number
  if (jieGuo === 1) return { chengGong: true }
  if (jieGuo === -1) return { chengGong: false, cuoWu: 'refresh token用户不匹配' }
  return { chengGong: false, cuoWu: 'refresh token不存在或已过期' }
}

/** 检测 refresh token 是否被复用（仅消费墓碑命中才算复用，有确凿重放证据；
 * 未知键一律按普通无效处理，不触发全家吊销，避免网络重试/多标签并发误伤全部会话） */
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
  // YH-031 JWT算法白名单HS256显式声明，禁none/RS256混淆
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