process.env.ADMIN_PHONES = '13800000000'
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://lovewithme:test-password@localhost:5432/lovewithme'
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

describe('P1-8 埋点事件落日志', () => {
  beforeEach(async () => {
    await qingLiRiZhi()
    sheZhiZuiDiRiZhiJiBie('debug')
  })

  afterEach(async () => {
    await qingLiRiZhi()
  })

  it('埋点事件以 info 级别透传字段写入日志文件', async () => {
    await request(yingYong)
      .post('/api/logs')
      .send({
        lei_xing: 'mai_dian',
        shi_jian: 'zhuCeChengGong',
        can_shu: { jie_guo: 'sheng_li_ai_qing' },
        ban_ben: '1.0.0',
        shi_jian_chuo: 1720000000000,
      })
      .expect(200)

    await guanBiRiZhiLiu()
    const hang = duQuRiZhiHang()
    const maiDianHang = hang.find((h) => h.includes('"前端埋点"'))
    expect(maiDianHang).toBeDefined()
    const tiaoMu = JSON.parse(maiDianHang as string)
    expect(tiaoMu.ji_bie).toBe('info')
    expect(tiaoMu.lei_xing).toBe('前端埋点')
    expect(tiaoMu.xiao_xi).toBe('前端上报')
    expect(tiaoMu.xiang_qing.shi_jian).toBe('zhuCeChengGong')
    expect(tiaoMu.xiang_qing.can_shu.jie_guo).toBe('sheng_li_ai_qing')
    expect(tiaoMu.xiang_qing.ban_ben).toBe('1.0.0')
    expect(tiaoMu.xiang_qing.shi_jian_chuo).toBe(1720000000000)
  })

  it('埋点缺省 can_shu/ban_ben/shi_jian_chuo 时仍可接收', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/logs')
      .send({ lei_xing: 'mai_dian', shi_jian: 'shouTiaoXiaoXi' })
      .expect(200)

    expect(xiangYing.body.cheng_gong).toBe(true)
    expect(xiangYing.body.shu_ju.jie_shou).toBe(true)
  })

  it('埋点不需要认证（无 Authorization 头也可访问）', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/logs')
      .set('Content-Type', 'application/json')
      .send({ lei_xing: 'mai_dian', shi_jian: 'biaoBaiJieGuo', can_shu: { jie_guo: 'x' } })
    expect(xiangYing.status).toBe(200)
  })

  it('埋点 shi_jian 缺失或非法时返回 400', async () => {
    await request(yingYong).post('/api/logs').send({ lei_xing: 'mai_dian' }).expect(400)

    await request(yingYong)
      .post('/api/logs')
      .send({ lei_xing: 'mai_dian', shi_jian: '' })
      .expect(400)

    await request(yingYong)
      .post('/api/logs')
      .send({ lei_xing: 'mai_dian', shi_jian: 'x'.repeat(101) })
      .expect(400)
  })

  it('埋点 can_shu 非对象、ban_ben 非字符串、shi_jian_chuo 非数字时返回 400', async () => {
    await request(yingYong)
      .post('/api/logs')
      .send({ lei_xing: 'mai_dian', shi_jian: 'a', can_shu: 'not-object' })
      .expect(400)

    await request(yingYong)
      .post('/api/logs')
      .send({ lei_xing: 'mai_dian', shi_jian: 'a', can_shu: [1] })
      .expect(400)

    await request(yingYong)
      .post('/api/logs')
      .send({ lei_xing: 'mai_dian', shi_jian: 'a', ban_ben: 123 })
      .expect(400)

    await request(yingYong)
      .post('/api/logs')
      .send({ lei_xing: 'mai_dian', shi_jian: 'a', shi_jian_chuo: 'not-number' })
      .expect(400)
  })
})
