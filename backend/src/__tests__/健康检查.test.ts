process.env.ADMIN_PHONES = '13800000000'
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://lovewithme:BXYXblupz542284@localhost:5432/lovewithme'
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}

import { describe, it, expect } from 'vitest'
import request from 'supertest'
import yingYong from '../server'

describe('健康检查与metrics端点', () => {
  it('GET /health 返回正确结构', async () => {
    const xiangYing = await request(yingYong).get('/health')

    expect([200, 503]).toContain(xiangYing.status)

    const shenTi = xiangYing.body
    expect(shenTi).toHaveProperty('zhuangTai')
    expect(shenTi).toHaveProperty('shu_ju_ku')
    expect(shenTi).toHaveProperty('huan_cun')
    expect(shenTi).toHaveProperty('shi_jian_chuo')

    expect(['jianKang', 'yiChang']).toContain(shenTi.zhuangTai)
    expect(['zhengChang', 'yiChang']).toContain(shenTi.shu_ju_ku)
    expect(['zhengChang', 'yiChang']).toContain(shenTi.huan_cun)

    expect(typeof shenTi.shi_jian_chuo).toBe('string')
    const jieXiShiJian = new Date(shenTi.shi_jian_chuo)
    expect(jieXiShiJian.toString()).not.toBe('Invalid Date')

    expect(shenTi.zhuangTai === 'jianKang').toBe(
      shenTi.shu_ju_ku === 'zhengChang' && shenTi.huan_cun === 'zhengChang',
    )
  })

  it('GET /health 不需要认证', async () => {
    const xiangYing = await request(yingYong).get('/health')
    expect(xiangYing.status).not.toBe(401)
  })

  it('GET /metrics 返回Prometheus文本格式', async () => {
    const xiangYing = await request(yingYong).get('/metrics').expect(200)

    expect(xiangYing.headers['content-type']).toContain('text/plain')

    const wenBen = xiangYing.text
    expect(wenBen.length).toBeGreaterThan(0)
    expect(wenBen).toMatch(/^(# HELP|# TYPE|[\w_]+)/m)
    expect(wenBen).toMatch(/# HELP /)
    expect(wenBen).toMatch(/# TYPE /)

    expect(wenBen).toMatch(/process_|node_/)

    expect(wenBen).toContain('http_qing_qiu_zong_shu')
    expect(wenBen).toContain('http_qing_qiu_hao_shi_haomi')
  })

  it('GET /metrics 不需要认证', async () => {
    const xiangYing = await request(yingYong).get('/metrics')
    expect(xiangYing.status).not.toBe(401)
  })

  it('连续请求 /health 与 /metrics 不被限流', async () => {
    for (let i = 0; i < 5; i++) {
      const jianKang = await request(yingYong).get('/health')
      expect([200, 503]).toContain(jianKang.status)
      expect(jianKang.status).not.toBe(429)

      const zhiBiao = await request(yingYong).get('/metrics').expect(200)
      expect(zhiBiao.status).not.toBe(429)
    }
  })

  it('请求 /health 后 /metrics 包含该请求的计数', async () => {
    await request(yingYong).get('/health')

    const xiangYing = await request(yingYong).get('/metrics').expect(200)
    expect(xiangYing.text).toContain('http_qing_qiu_zong_shu')
    expect(xiangYing.text).toContain('fang_fa="GET"')
    expect(xiangYing.text).toContain('lu_jing="/health"')
  })
})
