import { peiZhi } from './config'
import { redis } from './redis'

export function shiFouYunXuZhenShiWaiHu(): boolean {
  return process.env.XU_KE_ZHEN_SHI_WAI_HU === 'true'
}

if (process.env.VITEST === 'true' && !shiFouYunXuZhenShiWaiHu()) {
  peiZhi.deepSeek.jiChuUrl = 'http://127.0.0.1:9'
  Promise.all([
    redis.del('duan_xin_ip_ri:127.0.0.1:2026-08-26'),
    redis.del('duan_xin_ip_ri:::1:2026-08-26'),
  ]).catch(() => {})
}
