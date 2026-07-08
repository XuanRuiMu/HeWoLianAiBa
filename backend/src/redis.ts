import Redis from 'ioredis'
import { peiZhi } from './config'

export const redis = new Redis(peiZhi.redisLianJie)

redis.on('error', (cuoWu) => {
  console.error('Redis连接错误', cuoWu)
})
