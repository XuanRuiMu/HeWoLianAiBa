import { peiZhi } from './config'
import { redis } from './redis'

export function shiFouYunXuZhenShiWaiHu(): boolean {
  return process.env.XU_KE_ZHEN_SHI_WAI_HU === 'true'
}

if (process.env.VITEST === 'true' && !shiFouYunXuZhenShiWaiHu()) {
  peiZhi.deepSeek.jiChuUrl = 'http://127.0.0.1:9'
  // 真库集成：体验内测名额上限按环境变量放大，避免真库用户数超1000导致注册429；
  // 生产默认值1000不变，仅测试进程内生效
  const 测试名额 = Number(process.env.TI_YAN_BAN_CE_SHI_MING_E || '1000000')
  const 取整名额 = Number.isFinite(测试名额) ? Math.floor(测试名额) : 1000000
  if (取整名额 > peiZhi.tiYanBan.zuiDaYongHuShu) {
    peiZhi.tiYanBan.zuiDaYongHuShu = 取整名额
  }
  const 今日 = new Date().toISOString().slice(0, 10)
  Promise.all([
    redis.del(`duan_xin_ip_ri:127.0.0.1:${今日}`),
    redis.del(`duan_xin_ip_ri:::1:${今日}`),
  ]).catch(() => {})
}
