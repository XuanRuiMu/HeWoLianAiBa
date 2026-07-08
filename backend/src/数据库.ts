import { Pool } from 'pg'
import { peiZhi } from './config'

export const 数据库 = new Pool({
  connectionString: peiZhi.shuJuKuLianJie,
})

数据库.on('error', (cuoWu) => {
  console.error('数据库连接池错误', cuoWu)
})
