process.env.ADMIN_PHONES = '13800000000'
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://lovewithme:test-password@localhost:5432/lovewithme'
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}

import { describe, it, expect, vi, afterEach } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { jieXiTeZhengKaiGuan } from '../routes/功能开关'

describe('P1-8 feature-flags 公开端点', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('GET /api/config/feature-flags 返回 200 且结构为 cheng_gong + shu_ju', async () => {
    const xiangYing = await request(yingYong).get('/api/config/feature-flags').expect(200)

    expect(xiangYing.body.cheng_gong).toBe(true)
    expect(xiangYing.body.shu_ju).toBeTypeOf('object')
    expect(xiangYing.body.shu_ju.junShi).toBe(true)
  })

  it('无需鉴权（无 Authorization 头也可访问）', async () => {
    const xiangYing = await request(yingYong)
      .get('/api/config/feature-flags')
      .set('Content-Type', 'application/json')

    expect(xiangYing.status).not.toBe(401)
    expect(xiangYing.status).not.toBe(403)
    expect(xiangYing.status).toBe(200)
  })

  it('响应带 Cache-Control 短缓存 max-age=60', async () => {
    const xiangYing = await request(yingYong).get('/api/config/feature-flags').expect(200)

    expect(xiangYing.headers['cache-control']).toContain('max-age=60')
  })

  it('默认未配置 FEATURE_FLAGS 时返回默认全开', () => {
    const kaiGuan = jieXiTeZhengKaiGuan(undefined)
    expect(kaiGuan.junShi).toBe(true)
  })

  it('空字符串 FEATURE_FLAGS 视为默认全开', () => {
    const kaiGuan = jieXiTeZhengKaiGuan('')
    expect(kaiGuan.junShi).toBe(true)
  })

  it('合法 JSON 可关闭指定开关', () => {
    const kaiGuan = jieXiTeZhengKaiGuan('{"junShi":false}')
    expect(kaiGuan.junShi).toBe(false)
  })

  it('合法 JSON 中非布尔值被忽略，布尔值生效', () => {
    const kaiGuan = jieXiTeZhengKaiGuan('{"junShi":true,"xinTeZheng":"yes"}')
    expect(kaiGuan.junShi).toBe(true)
    expect(kaiGuan.xinTeZheng).toBeUndefined()
  })

  it('非法 JSON 回退默认全开并输出告警', () => {
    const warnJianShi = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const kaiGuan = jieXiTeZhengKaiGuan('{bu-shi-json')
    expect(kaiGuan.junShi).toBe(true)
    expect(warnJianShi).toHaveBeenCalled()
  })

  it('JSON 数组回退默认全开并输出告警', () => {
    const warnJianShi = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const kaiGuan = jieXiTeZhengKaiGuan('[1,2,3]')
    expect(kaiGuan.junShi).toBe(true)
    expect(warnJianShi).toHaveBeenCalled()
  })
})
