import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { peiZhi } from '../config'
import { redis } from '../redis'

export { randomUUID } from 'crypto'

export interface LingPaiZaiHe {
  用户ID: string
  shouJiHao?: string
  jti?: string
  iat?: number
  exp?: number
  qianFaHaoMiao?: number
  tokenType?: 'access' | 'refresh'
  refreshTokenId?: string
}

const RefreshTokenPrefix = 'refresh_token:'
const RefreshTokenUserPrefix = 'refresh_token_user:'
const RefreshTokenXiaoHaoPrefix = 'xiao_hao_refresh_token:'
const RefreshTokenTtl = peiZhi.刷新令牌YouXiaoMiao
const XiaoHaoBiaoJiTtl = 24 * 60 * 60

export async function cunChuRefreshToken(
  用户ID: string,
  tokenId: string,
): Promise<void> {
  const jianMing = `${RefreshTokenPrefix}${用户ID}:${tokenId}`
  await redis.set(jianMing, 用户ID, 'EX', RefreshTokenTtl)
  await redis.sadd(`${RefreshTokenUserPrefix}${用户ID}`, tokenId)
  await redis.expire(`${RefreshTokenUserPrefix}${用户ID}`, RefreshTokenTtl)
}

function duQuRefreshTokenYongHuId(cunChuZhi: string): string | null {
  if (!cunChuZhi.includes('{')) return cunChuZhi
  try {
    const jieXi = JSON.parse(cunChuZhi) as { 用户ID?: unknown }
    return typeof jieXi.用户ID === 'string' ? jieXi.用户ID : null
  } catch {
    return null
  }
}

void duQuRefreshTokenYongHuId


const XiaoHaoLua = `
local huo = redis.call('GET', KEYS[1])
if not huo then return 0 end
local yongHu = huo
if string.find(huo, '{', 1, true) then
  local ok, jie = pcall(cjson.decode, huo)
  if ok and jie and jie.用户ID then yongHu = jie.用户ID end
end
if yongHu ~= ARGV[1] then return -1 end
redis.call('DEL', KEYS[1])
redis.call('SREM', KEYS[2], ARGV[2])
redis.call('SET', KEYS[3], '1', 'EX', ARGV[3])
return 1
`

export async function xiaoHaoRefreshToken(
  tokenId: string,
  用户ID: string,
): Promise<{ chengGong: boolean; cuoWu?: string }> {
  const jianMing = `${RefreshTokenPrefix}${用户ID}:${tokenId}`
  const yongHuJian = `${RefreshTokenUserPrefix}${用户ID}`
  const tombKey = `${RefreshTokenXiaoHaoPrefix}${用户ID}:${tokenId}`
  const jieGuo = (await (redis as unknown as {
    eval: (jiaoBen: string, jianShu: number, ...canShu: string[]) => Promise<unknown>
  }).eval(XiaoHaoLua, 3, jianMing, yongHuJian, tombKey, 用户ID, tokenId, String(XiaoHaoBiaoJiTtl))) as number
  if (jieGuo === 1) return { chengGong: true }
  if (jieGuo === -1) return { chengGong: false, cuoWu: 'refresh token用户不匹配' }
  return { chengGong: false, cuoWu: 'refresh token不存在或已过期' }
}

export async function jianCeRefreshTokenChongFu(
  tokenId: string,
  用户ID: string,
): Promise<boolean> {
  const xiaoHaoJian = `${RefreshTokenXiaoHaoPrefix}${用户ID}:${tokenId}`
  const beiXiaoHao = await redis.exists(xiaoHaoJian)
  if (beiXiaoHao === 0) return false
  const huoJian = `${RefreshTokenPrefix}${用户ID}:${tokenId}`
  return (await redis.exists(huoJian)) === 0
}

export async function cheXiaoYongHuSuoYouRefreshToken(用户ID: string): Promise<void> {
  const yongHuJian = `${RefreshTokenUserPrefix}${用户ID}`
  const tokenIds = await redis.smembers(yongHuJian)
  if (tokenIds.length > 0) {
    const jianMingLieBiao = tokenIds.map((tid) => `${RefreshTokenPrefix}${用户ID}:${tid}`)
    await redis.del(...jianMingLieBiao)
  }
  await redis.del(yongHuJian)
}

export async function shanChuRefreshToken(tokenId: string, 用户ID: string): Promise<void> {
  const jianMing = `${RefreshTokenPrefix}${用户ID}:${tokenId}`
  await redis.del(jianMing)
  await redis.srem(`${RefreshTokenUserPrefix}${用户ID}`, tokenId)
}

export function huoQuLingPaiZuiDaYouXiaoQiMiao(): number {
  const piPei = /^(\d+)([smhd])$/.exec(peiZhi.jwtGuoQi.trim())
  const danWeiHaoMiao: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }
  if (!piPei) return 25 * danWeiHaoMiao.m
  return Number(piPei[1]) * danWeiHaoMiao[piPei[2]]
}

export function huoQuCheXiaoJian(用户ID: string): string {
  return `jwt_yong_hu_cheXiao:${用户ID}`
}

export async function xieRuCheXiaoShiJianCuo(用户ID: string): Promise<void> {
  await redis.set(
    huoQuCheXiaoJian(用户ID),
    String(Date.now()),
    'EX',
    huoQuLingPaiZuiDaYouXiaoQiMiao(),
  )
}

export async function lingPaiShiFouYiCheXiao(
  用户ID: string,
  iat?: number,
  qianFaHaoMiao?: number,
): Promise<boolean> {
  if (!用户ID) return false
  const zhi = await redis.get(huoQuCheXiaoJian(用户ID))
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