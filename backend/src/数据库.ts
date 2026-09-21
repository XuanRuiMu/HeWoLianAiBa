import { debug日志 } from './utils/debug日志'
import { Pool } from 'pg'
import { peiZhi } from './config'

// R7 连接池参数显式化：max/连接超时/空闲回收/语句超时全部走环境变量，
// 防止单次慢查询（如 AI 相关长事务外的慢语句）无限占用连接导致全站假死。
// 约定：AI LLM 调用不持有数据库连接（先查后调再写，调度器链路无长事务包裹 LLM await）。
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
