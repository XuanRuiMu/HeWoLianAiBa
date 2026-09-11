import { debug日志 } from './utils/debug日志'
import Redis from 'ioredis'
import { peiZhi } from './config'

export const redis = new Redis(peiZhi.redisLianJie)

redis.on('error', (cuoWu) => {
  debug日志.error('Redis连接', 'Redis连接错误', { xiang_qing: { cuo_wu: String(cuoWu) } })
})
