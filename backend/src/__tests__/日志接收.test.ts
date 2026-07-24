process.env.ADMIN_PHONES = '13800000000'
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://lovewithme:BXYXblupz542284@localhost:5432/lovewithme'
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import yingYong from '../server'
import { guanBiRiZhiLiu, sheZhiZuiDiRiZhiJiBie } from '../utils/debug日志'

const LOG_WEN_JIAN = path.resolve(process.cwd(), 'logs', 'debug.log')

function duQuRiZhiHang(): string[] {
  if (!fs.existsSync(LOG_WEN_JIAN)) return []
  return fs
    .readFileSync(LOG_WEN_JIAN, 'utf-8')
    .split('\n')
    .filter((hang) => hang.trim().length > 0)
}

async function qingLiRiZhi(): Promise<void> {
  await guanBiRiZhiLiu()
  if (fs.existsSync(LOG_WEN_JIAN)) {
    fs.unlinkSync(LOG_WEN_JIAN)
  }
}

describe('FP-04 日志接收端点', () => {
  beforeEach(async () => {
    await qingLiRiZhi()
    sheZhiZuiDiRiZhiJiBie('debug')
  })

  afterEach(async () => {
    await qingLiRiZhi()
  })

  it('POST /api/logs 接收错误上报并返回成功', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/logs')
      .send({
        lei_xing: 'cuoWu',
        xiang_qing: { leiBie: 'vue', cuoWu: { message: '测试错误' } },
      })
      .expect(200)

    expect(xiangYing.body.cheng_gong).toBe(true)
    expect(xiangYing.body.shu_ju.jie_shou).toBe(true)
  })

  it('POST /api/logs 接收性能指标并返回成功', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/logs')
      .send({
        lei_xing: 'xingNengZhiBiao',
        xiang_qing: { zhiBiaoMing: 'LCP', zhi: 1500 },
      })
      .expect(200)

    expect(xiangYing.body.cheng_gong).toBe(true)
    expect(xiangYing.body.shu_ju.jie_shou).toBe(true)
  })

  it('错误上报以 error 级别写入日志文件', async () => {
    await request(yingYong)
      .post('/api/logs')
      .send({
        lei_xing: 'cuoWu',
        xiang_qing: { leiBie: 'vue', cuoWu: { message: 'boom' } },
      })
      .expect(200)

    await guanBiRiZhiLiu()
    const hang = duQuRiZhiHang()
    const cuoWuHang = hang.find((h) => h.includes('"前端错误上报"'))
    expect(cuoWuHang).toBeDefined()
    const tiaoMu = JSON.parse(cuoWuHang as string)
    expect(tiaoMu.ji_bie).toBe('error')
    expect(tiaoMu.lei_xing).toBe('前端错误上报')
    expect(tiaoMu.xiao_xi).toBe('前端上报')
    expect(tiaoMu.xiang_qing.leiBie).toBe('vue')
    expect(tiaoMu.xiang_qing.cuoWu.message).toBe('boom')
  })

  it('性能指标以 info 级别写入日志文件', async () => {
    await request(yingYong)
      .post('/api/logs')
      .send({
        lei_xing: 'xingNengZhiBiao',
        xiang_qing: { zhiBiaoMing: 'LCP', zhi: 1500, pingFen: 'good' },
      })
      .expect(200)

    await guanBiRiZhiLiu()
    const hang = duQuRiZhiHang()
    const xingNengHang = hang.find((h) => h.includes('"前端性能指标"'))
    expect(xingNengHang).toBeDefined()
    const tiaoMu = JSON.parse(xingNengHang as string)
    expect(tiaoMu.ji_bie).toBe('info')
    expect(tiaoMu.lei_xing).toBe('前端性能指标')
    expect(tiaoMu.xiao_xi).toBe('前端上报')
    expect(tiaoMu.xiang_qing.zhiBiaoMing).toBe('LCP')
    expect(tiaoMu.xiang_qing.zhi).toBe(1500)
  })

  it('lei_xing 非法时返回 400', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/logs')
      .send({
        lei_xing: 'feiFa',
        xiang_qing: { x: 1 },
      })
      .expect(400)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.cuo_wu_ma).toBeUndefined()
  })

  it('缺少 lei_xing 时返回 400', async () => {
    await request(yingYong)
      .post('/api/logs')
      .send({
        xiang_qing: { x: 1 },
      })
      .expect(400)
  })

  it('缺少 xiang_qing 时返回 400', async () => {
    await request(yingYong)
      .post('/api/logs')
      .send({
        lei_xing: 'cuoWu',
      })
      .expect(400)
  })

  it('xiang_qing 不是对象时返回 400', async () => {
    await request(yingYong)
      .post('/api/logs')
      .send({
        lei_xing: 'cuoWu',
        xiang_qing: 'not-an-object',
      })
      .expect(400)
  })

  it('xiang_qing 为空对象时返回 400', async () => {
    await request(yingYong)
      .post('/api/logs')
      .send({
        lei_xing: 'cuoWu',
        xiang_qing: {},
      })
      .expect(400)
  })

  it('不需要认证（无 Authorization 头也可访问）', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/logs')
      .set('Content-Type', 'application/json')
      .send({
        lei_xing: 'cuoWu',
        xiang_qing: { leiBie: 'vue' },
      })
    expect(xiangYing.status).not.toBe(401)
    expect(xiangYing.status).toBe(200)
  })

  it('GET /api/logs 不会被 /logs 路由处理（路由仅注册 POST）', async () => {
    const xiangYing = await request(yingYong).get('/api/logs')
    expect(xiangYing.status).not.toBe(200)
  })
})
