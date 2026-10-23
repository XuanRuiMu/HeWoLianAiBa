import { debug日志 } from './utils/debug日志'
import { Pool } from 'pg'
import { peiZhi } from './config'

export const 数据库 = new Pool({
  connectionString: peiZhi.shuJuKuLianJie,
  max: peiZhi.shuJuKuLianChi.zuiDa,
  connectionTimeoutMillis: peiZhi.shuJuKuLianChi.lianJieChaoShiHaoMiao,
  idleTimeoutMillis: peiZhi.shuJuKuLianChi.kongXianChaoShiHaoMiao,
  statement_timeout: peiZhi.shuJuKuLianChi.yuJuChaoShiHaoMiao,
})

数据库.on('error', (cuoWu) => {
  debug日志.error('数据库连接池', '数据库连接池错误', { xiang_qing: { cuo_wu: String(cuoWu) } })
})
