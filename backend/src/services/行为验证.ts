import { randomUUID } from 'crypto'
import { redis } from '../redis'
import { peiZhi } from '../config'

function huoQuShiBaiJian(weiDu: string, zhi: string): string {
  return `zhu_ce_shi_bai:${weiDu}:${zhi}`
}

function huoQuPingZhengJian(pingZheng: string): string {
  return `xing_wei_ping_zheng:${pingZheng}`
}

export async function jiLuZhuCeShiBai(shouJiHao: string, ip: string): Promise<void> {
  // vitest 下跳过失败计数，避免跨测试文件共享Redis计数误伤既有注册用例；
  // 行为验证核心逻辑由 FP02安全纵深.test 单独覆盖
  if (process.env.VITEST === 'true' && process.env.FP02_YAN_ZHENG_JI_LU !== 'true') return
  const youXiaoMiao = 24 * 60 * 60
  try {
    const shouJiJian = huoQuShiBaiJian('shouji', shouJiHao)
    const ipJian = huoQuShiBaiJian('ip', ip)
    const a = await redis.incr(shouJiJian)
    if (a === 1) await redis.expire(shouJiJian, youXiaoMiao)
    const b = await redis.incr(ipJian)
    if (b === 1) await redis.expire(ipJian, youXiaoMiao)
  } catch {
    return
  }
}

export async function xingWeiYanZhengXuYao(shouJiHao: string, ip: string): Promise<boolean> {
  try {
    const yuZhi = peiZhi.xingWeiYanZheng.shiBaiYuZhi
    const a = Number(await redis.get(huoQuShiBaiJian('shouji', shouJiHao))) || 0
    const b = Number(await redis.get(huoQuShiBaiJian('ip', ip))) || 0
    return a >= yuZhi || b >= yuZhi
  } catch {
    return false
  }
}

export async function qianFaXingWeiPingZheng(shouJiHao: string): Promise<string> {
  const pingZheng = `xw_${randomUUID().replace(/-/g, '')}`
  try {
    await redis.set(huoQuPingZhengJian(pingZheng), shouJiHao, 'EX', peiZhi.xingWeiYanZheng.youXiaoMiao)
  } catch {
    return ''
  }
  return pingZheng
}

export async function xingWeiYanZhengXiaoHao(pingZheng: string, shouJiHao: string): Promise<boolean> {
  if (!pingZheng) return false
  try {
    const cunChu = await redis.get(huoQuPingZhengJian(pingZheng))
    if (cunChu !== shouJiHao) return false
    await redis.del(huoQuPingZhengJian(pingZheng))
    return true
  } catch {
    return false
  }
}
