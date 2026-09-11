process.env.ADMIN_PHONES = '13800000000'
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://lovewithme:test-password@localhost:5432/lovewithme'
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}

import { describe, it, expect, afterAll } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'

function suiJiShouJiHao(): string {
  return `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

async function zhuCeYongHu(
  shouJiHao: string,
  yongHuMing: string,
): Promise<{ lingPai: string; yongHuId: string }> {
  await redis.setex(`yan_zheng_ma:${shouJiHao}`, 300, '123456')
  const xiangYing = await request(yingYong)
    .post('/api/认证/注册')
    .send({
      shouJiHao,
      yanZhengMa: '123456',
      yongHuMing,
      miMa: 'Test123456',
      tongYiXieYi: true,
      chuShengRiQi: '2000-01-01',
    })
    .expect(200)
  return {
    lingPai: xiangYing.body.shu_ju.令牌,
    yongHuId: xiangYing.body.shu_ju.用户.id,
  }
}

describe('M3 管理端AI用量看板', () => {
  const riQi = new Date().toISOString().slice(0, 10)
  const guanLiYuanHao = suiJiShouJiHao()
  const puTongHao = suiJiShouJiHao()
  const guanLiQun = `${guanLiYuanHao},13800000000`
  let guanLiLingPai = ''
  let puTongLingPai = ''
  let puTongYongHuId = ''

  it('聚合数据与Redis计数一致且手机号掩码', async () => {
    // 注册管理员与普通用户
    ;(process.env as Record<string, string>).ADMIN_PHONES = guanLiQun
    await redis.setex(`yan_zheng_ma:${guanLiYuanHao}`, 300, '123456')
    const guanLiZhuCe = await request(yingYong)
      .post('/api/认证/注册')
      .send({
        shouJiHao: guanLiYuanHao,
        yanZhengMa: '123456',
        yongHuMing: `看板管理员${Date.now()}`,
        miMa: 'Test123456',
        tongYiXieYi: true,
        chuShengRiQi: '2000-01-01',
      })
      .expect(200)
    guanLiLingPai = guanLiZhuCe.body.shu_ju.令牌
    await 数据库.query(`UPDATE "用户" SET "管理员" = true WHERE "手机号" = $1`, [guanLiYuanHao])

    const puTong = await zhuCeYongHu(puTongHao, `看板用户${Date.now()}`)
    puTongLingPai = puTong.lingPai
    puTongYongHuId = puTong.yongHuId

    // 非管理员访问应 403
    await request(yingYong)
      .get('/api/管理/用量看板')
      .set('Authorization', `Bearer ${puTongLingPai}`)
      .expect(403)

    // 写入 Redis 用量计数：普通用户 7 次
    const jian = `ai_yu_suan:${puTongYongHuId}:${riQi}`
    for (let i = 0; i < 7; i++) {
      await redis.incr(jian)
    }
    await redis.expire(jian, 3600)

    const xiangYing = await request(yingYong)
      .get('/api/管理/用量看板')
      .set('Authorization', `Bearer ${guanLiLingPai}`)
      .expect(200)

    const shuJu = xiangYing.body.shu_ju
    expect(shuJu.ri_qi).toBe(riQi)
    expect(typeof shuJu.mei_ri_yu_suan).toBe('number')

    const muBiao = shuJu.lie_biao.find(
      (x: { yong_hu_id: string }) => x.yong_hu_id === puTongYongHuId,
    )
    expect(muBiao).toBeDefined()
    expect(muBiao.yi_yong).toBe(7)
    expect(muBiao.sheng_yu).toBe(shuJu.mei_ri_yu_suan - 7)
    // 手机号必须为掩码形态（前3后4），不落明文
    expect(muBiao.shou_ji_hao).toMatch(/^\d{3}\*{4}\d{4}$/)

    // 排序按调用量降序
    for (let i = 1; i < shuJu.lie_biao.length; i++) {
      expect(shuJu.lie_biao[i - 1].yi_yong).toBeGreaterThanOrEqual(shuJu.lie_biao[i].yi_yong)
    }

    await redis.del(jian)
  }, 30000)

  afterAll(async () => {
    await 数据库.query(`DELETE FROM "协议留痕" WHERE "用户ID" IN (SELECT "ID" FROM "用户" WHERE "手机号" IN ($1, $2))`, [guanLiYuanHao, puTongHao])
    await 数据库.query(`DELETE FROM "审计日志" WHERE "手机号" IN ($1, $2) OR "手机号" LIKE '%****%'`, [guanLiYuanHao, puTongHao]).catch(() => {})
    await 数据库.query(`DELETE FROM "用户" WHERE "手机号" IN ($1, $2)`, [guanLiYuanHao, puTongHao])
    await redis.del(`yan_zheng_ma:${guanLiYuanHao}`)
    await redis.del(`yan_zheng_ma:${puTongHao}`)
    await 数据库.end()
    await redis.quit()
  })
})
