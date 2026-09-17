import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { sheZhiMockTiaoYong } from '../utils/DeepSeek客户端'

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
      yongHuMing: `气泡测试${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      miMa: 'testPassword123',
      tongYiXieYi: true,
      chuShengRiQi: '2000-01-01',
    })
    .expect(200)
  const chaXun = await 数据库.query(`SELECT "ID" FROM "用户" WHERE "手机号" = $1 LIMIT 1`, [shouJiHao])
  return { shouJiHao, lingPai: zhuCe.body.shu_ju.令牌, yongHuId: String(chaXun.rows[0]['ID']) }
}

describe('气泡主题偏好', () => {
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
    sheZhiMockTiaoYong(null)
  })

  it('默认偏好：自己微信绿、AI云白', async () => {
    const sheZhi = await request(yingYong).get('/api/用户设置').set('Authorization', `Bearer ${a.lingPai}`).expect(200)
    expect(sheZhi.body.shu_ju.qi_pao_zi_ji).toBe('weiXinLv')
    expect(sheZhi.body.shu_ju.qi_pao_ai).toBe('yunBai')
  })

  it('非法预设与空体一律400', async () => {
    await request(yingYong).put('/api/用户设置/气泡').set('Authorization', `Bearer ${a.lingPai}`).send({ ziJi: 'buCunZai' }).expect(400)
    await request(yingYong).put('/api/用户设置/气泡').set('Authorization', `Bearer ${a.lingPai}`).send({ ai: '#95EC69' }).expect(400)
    await request(yingYong).put('/api/用户设置/气泡').set('Authorization', `Bearer ${a.lingPai}`).send({}).expect(400)
  })

  it('自己与AI可分别保存并经设置接口读回', async () => {
    await request(yingYong)
      .put('/api/用户设置/气泡')
      .set('Authorization', `Bearer ${a.lingPai}`)
      .send({ ziJi: 'tianKongLan', ai: 'anYe' })
      .expect(200)
    const sheZhi = await request(yingYong).get('/api/用户设置').set('Authorization', `Bearer ${a.lingPai}`).expect(200)
    expect(sheZhi.body.shu_ju.qi_pao_zi_ji).toBe('tianKongLan')
    expect(sheZhi.body.shu_ju.qi_pao_ai).toBe('anYe')
    await request(yingYong).put('/api/用户设置/气泡').set('Authorization', `Bearer ${a.lingPai}`).send({ ziJi: 'yingFen' }).expect(200)
    const danBuWei = await request(yingYong).get('/api/用户设置').set('Authorization', `Bearer ${a.lingPai}`).expect(200)
    expect(danBuWei.body.shu_ju.qi_pao_zi_ji).toBe('yingFen')
    expect(danBuWei.body.shu_ju.qi_pao_ai).toBe('anYe')
  })

  it('名片返回对方气泡偏好：好友双方各用自身', async () => {
    await request(yingYong).put('/api/用户设置/气泡').set('Authorization', `Bearer ${b.lingPai}`).send({ ziJi: 'ningMengHuang' }).expect(200)
    const mingPian = await request(yingYong).get(`/api/资料/名片/${b.yongHuId}`).set('Authorization', `Bearer ${a.lingPai}`).expect(200)
    expect(mingPian.body.shu_ju.qi_pao_zi_ji).toBe('ningMengHuang')
    expect(mingPian.body.shu_ju.qi_pao_ai).toBe('yunBai')
  })
})
