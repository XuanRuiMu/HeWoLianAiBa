import { peiZhi } from './config'

export function shiFouYunXuZhenShiWaiHu(): boolean {
  return process.env.XU_KE_ZHEN_SHI_WAI_HU === 'true'
}

if (process.env.VITEST === 'true' && !shiFouYunXuZhenShiWaiHu()) {
  const 测试数据库 = (process.env.TEST_DATABASE_URL ?? '').trim()
  peiZhi.shuJuKuLianJie = 测试数据库 || 'postgresql://test@127.0.0.1:1/test'
  peiZhi.deepSeek.jiChuUrl = 'http://127.0.0.1:9'
  // 真库集成：体验内测名额上限按环境变量放大，避免真库用户数超1000导致注册429；
  // 生产默认值1000不变，仅测试进程内生效
  const 测试名额 = Number(process.env.TI_YAN_BAN_CE_SHI_MING_E || '1000000')
  const 取整名额 = Number.isFinite(测试名额) ? Math.floor(测试名额) : 1000000
  if (取整名额 > peiZhi.tiYanBan.zuiDaYongHuShu) {
    peiZhi.tiYanBan.zuiDaYongHuShu = 取整名额
  }
}
