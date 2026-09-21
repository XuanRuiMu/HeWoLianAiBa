import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import express from 'express'
import rateLimit, { type Options } from 'express-rate-limit'
import request from 'supertest'
import type { Store } from 'express-rate-limit'

/**
 * 备用端口复现到的第二个 500 源：Redis 连接尚未 ready 时 ioredis 的 commandTimeout(3s)
 * 会把限流 store 的 init 打成永久 rejection，express-rate-limit 默认在之后的每个请求上重抛
 * → 含聊天发送在内的全站接口恒 500（响应只有通用文案，且消息根本没走到落库）。
 * 限流是保护层，不得成为故障源：store 出错一律放行并保留 429 语义给真正的超限。
 */

class ShiBaiCunChu implements Store {
  async init(): Promise<void> {
    await Promise.reject(new Error('Command timed out'))
  }

  async increment(): Promise<never> {
    throw new Error('Command timed out')
  }

  async decrement(): Promise<void> {
    return undefined
  }

  async resetKey(): Promise<void> {
    return undefined
  }
}

function 建应用(选项: Partial<Options>): express.Express {
  const 应用 = express()
  // 与 server.ts 的中文路径解码中间件一致（限流器在路由之前执行，路径形态不影响被验证的行为）
  应用.use((qingQiu, _xiangYing, xiaYiBu) => {
    qingQiu.url = decodeURI(qingQiu.url)
    xiaYiBu()
  })
  应用.use(rateLimit({ windowMs: 60000, limit: 5, ...选项 } as Options))
  应用.get('/api/聊天/会话/1/消息', (_qingQiu, xiangYing) => {
    xiangYing.json({ cheng_gong: true })
  })
  return 应用
}

describe('限流存储故障不得把请求打成 500', () => {
  it('库默认口径会 500（本用例证明该风险真实存在，不是臆测）', async () => {
    const 响应 = await request(建应用({ store: new ShiBaiCunChu() })).get(encodeURI('/api/聊天/会话/1/消息'))
    expect(响应.status).toBe(500)
  })

  it('passOnStoreError 为 true 时同一故障只降级放行，响应仍由业务路由给出', async () => {
    const 响应 = await request(
      建应用({ store: new ShiBaiCunChu(), passOnStoreError: true }),
    ).get(encodeURI('/api/聊天/会话/1/消息'))
    expect(响应.status).toBe(200)
    expect(响应.body).toEqual({ cheng_gong: true })
  })

  it('生产的 限流.ts 必须带上该口径（否则上面的降级只存在于测试里）', () => {
    const yuanMa = readFileSync(resolve(__dirname, '..', '限流.ts'), 'utf-8')
    expect(yuanMa).toContain('store: chuangJianRedisStore(), passOnStoreError: true')
  })
})
