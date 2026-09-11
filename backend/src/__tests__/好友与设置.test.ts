import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'

function suiJiShouJiHao(): string {
  return `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

async function chuangJianCeShiYongHu(): Promise<{ shouJiHao: string; lingPai: string; yongHuId: string }> {
  const shouJiHao = suiJiShouJiHao()
  await request(yingYong).post('/api/认证/发送码').send({ shouJiHao }).expect(200)
  const zhuCe = await request(yingYong)
    .post('/api/认证/注册')
    .send({
      shouJiHao,
      yanZhengMa: '123456',
      yongHuMing: `好友测试${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      miMa: 'testPassword123',
      tongYiXieYi: true,
      chuShengRiQi: '2000-01-01',
    })
    .expect(200)
  const chaXun = await 数据库.query(`SELECT "ID" FROM "用户" WHERE "手机号" = $1 LIMIT 1`, [shouJiHao])
  return { shouJiHao, lingPai: zhuCe.body.shu_ju.令牌, yongHuId: String(chaXun.rows[0]['ID']) }
}

describe('好友与用户设置', () => {
  let a = { shouJiHao: '', lingPai: '', yongHuId: '' }
  let b = { shouJiHao: '', lingPai: '', yongHuId: '' }

  beforeAll(async () => {
    const qianYiLuJing = path.resolve(__dirname, '../../../database/001_haoyou_yu_shezhi.sql')
    const sql = fs.readFileSync(qianYiLuJing, 'utf-8')
    await 数据库.query(sql)
    a = await chuangJianCeShiYongHu()
    b = await chuangJianCeShiYongHu()
  }, 60000)

  afterAll(async () => {
    for (const u of [a, b]) {
      if (!u.yongHuId) continue
      await 数据库.query(`DELETE FROM "好友消息" WHERE "发送者ID" = $1 OR "接收者ID" = $1`, [u.yongHuId])
      await 数据库.query(`DELETE FROM "好友申请" WHERE "申请者ID" = $1 OR "接收者ID" = $1`, [u.yongHuId])
      await 数据库.query(`DELETE FROM "用户设置" WHERE "用户ID" = $1`, [u.yongHuId])
      await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [u.yongHuId])
    }
  })

  it('搜索用户按手机号命中对方', async () => {
    const xiangYing = await request(yingYong)
      .get('/api/好友/搜索')
      .set('Authorization', `Bearer ${a.lingPai}`)
      .query({ q: b.shouJiHao })
      .expect(200)
    expect(xiangYing.body.shu_ju.lie_biao.length).toBeGreaterThan(0)
    expect(String(xiangYing.body.shu_ju.lie_biao[0].shou_ji_hao)).toContain('****')
  })

  it('好友申请全链路：申请→接受→列表→消息→撤回', async () => {
    await request(yingYong).post('/api/好友/申请').set('Authorization', `Bearer ${a.lingPai}`).send({ jieShouZheId: b.yongHuId }).expect(200)
    const shouDao = await request(yingYong).get('/api/好友/申请/收到的').set('Authorization', `Bearer ${b.lingPai}`).expect(200)
    expect(shouDao.body.shu_ju.lie_biao.length).toBeGreaterThan(0)
    const shenQingId = String(shouDao.body.shu_ju.lie_biao[0].id)
    await request(yingYong).post(`/api/好友/申请/${shenQingId}/接受`).set('Authorization', `Bearer ${b.lingPai}`).expect(200)
    const lieBiao = await request(yingYong).get('/api/好友/列表').set('Authorization', `Bearer ${a.lingPai}`).expect(200)
    expect(lieBiao.body.shu_ju.lie_biao.map((x: { id: string }) => x.id)).toContain(b.yongHuId)
    const faSong = await request(yingYong)
      .post('/api/好友/消息')
      .set('Authorization', `Bearer ${a.lingPai}`)
      .send({ jieShouZheId: b.yongHuId, neiRong: '你好', leiXing: 'wenben' })
      .expect(200)
    const liShi = await request(yingYong).get(`/api/好友/消息/${a.yongHuId}`).set('Authorization', `Bearer ${b.lingPai}`).expect(200)
    expect(liShi.body.shu_ju.lie_biao.length).toBeGreaterThan(0)
    await request(yingYong).put(`/api/好友/消息/${String(faSong.body.shu_ju.id)}/撤回`).set('Authorization', `Bearer ${a.lingPai}`).expect(200)
  })

  it('用户设置：UID与聊天背景与隐私与排位清空', async () => {
    const sheZhi = await request(yingYong).get('/api/用户设置').set('Authorization', `Bearer ${a.lingPai}`).expect(200)
    expect(sheZhi.body.shu_ju.uid).toBe(a.yongHuId)
    await request(yingYong).put('/api/用户设置/聊天背景').set('Authorization', `Bearer ${a.lingPai}`).send({ beiJing: 'haiYangZhiLan' }).expect(200)
    await request(yingYong).put('/api/用户设置/聊天背景').set('Authorization', `Bearer ${a.lingPai}`).send({ beiJing: 'buCunZai' }).expect(400)
    await request(yingYong).put('/api/用户设置/隐私').set('Authorization', `Bearer ${a.lingPai}`).send({ gongKaiZhangHao: false }).expect(200)
    const souSuo = await request(yingYong).get('/api/好友/搜索').set('Authorization', `Bearer ${b.lingPai}`).query({ q: a.shouJiHao })
    expect(souSuo.status).toBe(404)
    await request(yingYong).put('/api/用户设置/隐私').set('Authorization', `Bearer ${a.lingPai}`).send({ gongKaiZhangHao: true }).expect(200)
    await request(yingYong).post('/api/用户设置/排位/清空').set('Authorization', `Bearer ${a.lingPai}`).expect(200)
  })
})
