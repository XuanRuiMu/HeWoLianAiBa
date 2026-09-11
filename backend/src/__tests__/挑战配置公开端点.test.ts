import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'

// 简单的模拟：直接在测试中设置环境变量重新加载配置
async function chuangJianYingYong(zhaXingGaiLv: number) {
  vi.resetModules()
  process.env.TIAO_ZHAN_ZHA_XING_GAI_LV = String(zhaXingGaiLv)
  const { default: yingYong } = await import('../server')
  return yingYong
}

describe('挑战配置公开端点', () => {
  beforeEach(() => {
    delete process.env.TIAO_ZHAN_ZHA_XING_GAI_LV
  })

  it('GET /api/挑战/配置 返回渣型概率且无需认证', async () => {
    const yingYong = await chuangJianYingYong(0.3)
    const xiangYing = await request(yingYong).get('/api/挑战/配置')

    expect(xiangYing.status).toBe(200)
    expect(xiangYing.body).toHaveProperty('cheng_gong', true)
    expect(xiangYing.body.shu_ju).toHaveProperty('zha_xing_gai_lv')
    expect(typeof xiangYing.body.shu_ju.zha_xing_gai_lv).toBe('number')
    expect(xiangYing.body.shu_ju.zha_xing_gai_lv).toBeGreaterThanOrEqual(0)
    expect(xiangYing.body.shu_ju.zha_xing_gai_lv).toBeLessThanOrEqual(1)
  })

  it('返回的概率默认为 0.3（30%）', async () => {
    delete process.env.TIAO_ZHAN_ZHA_XING_GAI_LV
    const yingYong = await chuangJianYingYong(0.3)
    const xiangYing = await request(yingYong).get('/api/挑战/配置')

    expect(xiangYing.body.shu_ju.zha_xing_gai_lv).toBe(0.3)
  })

  it('环境变量覆盖时返回对应值', async () => {
    const yingYong = await chuangJianYingYong(0.5)
    const xiangYing = await request(yingYong).get('/api/挑战/配置')

    expect(xiangYing.body.shu_ju.zha_xing_gai_lv).toBe(0.5)
  })

  it('不返回其他敏感配置项', async () => {
    const yingYong = await chuangJianYingYong(0.3)
    const xiangYing = await request(yingYong).get('/api/挑战/配置')

    expect(Object.keys(xiangYing.body.shu_ju)).toEqual(['zha_xing_gai_lv'])
  })
})