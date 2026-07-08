import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuFanYi } from '../config/translations'

function suiJiShouJiHao(): string {
  return `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

async function qingLiCeShiYongHu(shouJiHao: string): Promise<void> {
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  await redis.del(`yan_zheng_ma:${shouJiHao}`)
  await redis.del(`fa_song_jian_ge:${shouJiHao}`)
  await redis.del(`deng_lu_shi_bai:${shouJiHao}`)
}

describe('FP-01 用户认证模块', () => {
  const ceShiShouJiHao = suiJiShouJiHao()
  const ceShiYongHuMing = `测试用户${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const ceShiMiMa = 'testPassword123'
  let lingPai = ''

  beforeAll(async () => {
    await qingLiCeShiYongHu(ceShiShouJiHao)
  })

  afterAll(async () => {
    await qingLiCeShiYongHu(ceShiShouJiHao)
    await 数据库.end()
    await redis.quit()
  })

  it('检查手机号：格式错误返回400并匹配翻译文件', async () => {
    const xiangYing = await request(yingYong)
      .get('/api/认证/检查手机?shouJiHao=12345')
      .expect(400)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu'))
  })

  it('发送验证码：首次成功，60秒内重复返回429', async () => {
    const shouJiHao = suiJiShouJiHao()
    await qingLiCeShiYongHu(shouJiHao)

    try {
      const xiangYing1 = await request(yingYong)
        .post('/api/认证/发送码')
        .send({ shouJiHao })
        .expect(200)
      expect(xiangYing1.body.cheng_gong).toBe(true)

      const xiangYing2 = await request(yingYong)
        .post('/api/认证/发送码')
        .send({ shouJiHao })
        .expect(429)
      expect(xiangYing2.body.cheng_gong).toBe(false)
      expect(xiangYing2.body.ti_shi).toBe(huoQuFanYi('renZheng', 'faSongYanZhengMaPinFan'))
    } finally {
      await qingLiCeShiYongHu(shouJiHao)
    }
  })

  it('注册：未勾选用户协议返回400', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/认证/注册')
      .send({
        shouJiHao: ceShiShouJiHao,
        yanZhengMa: '123456',
        yongHuMing: ceShiYongHuMing,
        miMa: ceShiMiMa,
        tongYiXieYi: false,
      })
      .expect(400)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'weiTongYiXieYi'))
  })

  it('注册：成功返回200并含令牌与用户字段', async () => {
    await request(yingYong)
      .post('/api/认证/发送码')
      .send({ shouJiHao: ceShiShouJiHao })
      .expect(200)

    const xiangYing = await request(yingYong)
      .post('/api/认证/注册')
      .send({
        shouJiHao: ceShiShouJiHao,
        yanZhengMa: '123456',
        yongHuMing: ceShiYongHuMing,
        miMa: ceShiMiMa,
        tongYiXieYi: true,
      })
      .expect(200)

    expect(xiangYing.body.cheng_gong).toBe(true)
    expect(xiangYing.body.shu_ju).toHaveProperty('令牌')
    expect(typeof xiangYing.body.shu_ju.令牌).toBe('string')
    expect(xiangYing.body.shu_ju).toHaveProperty('用户')
    expect(xiangYing.body.shu_ju.用户.shou_ji_hao).toBe(ceShiShouJiHao)
    expect(xiangYing.body.shu_ju).toHaveProperty('新用户')
    expect(xiangYing.body.shu_ju).toHaveProperty('是否管理员')
    lingPai = xiangYing.body.shu_ju.令牌
  })

  it('注册：已注册手机号返回409', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/认证/注册')
      .send({
        shouJiHao: ceShiShouJiHao,
        yanZhengMa: '123456',
        yongHuMing: `${ceShiYongHuMing}2`,
        miMa: ceShiMiMa,
        tongYiXieYi: true,
      })
      .expect(409)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'shouJiHaoYiZhuCe'))
  })

  it('登录：密码错误返回401', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/认证/登录')
      .send({ shouJiHao: ceShiShouJiHao, miMa: 'wrongPassword' })
      .expect(401)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'miMaCuoWu'))
  })

  it('登录：手机号未注册返回404', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/认证/登录')
      .send({ shouJiHao: '13900000000', miMa: 'anyPassword' })
      .expect(404)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'shouJiHaoWeiZhuCe'))
  })

  it('登录：60秒内失败超5次第6次返回429并记录审计日志', async () => {
    const shouJiHao = suiJiShouJiHao()
    await qingLiCeShiYongHu(shouJiHao)

    try {
      for (let i = 0; i < 5; i++) {
        await request(yingYong)
          .post('/api/认证/登录')
          .send({ shouJiHao, miMa: 'wrongPassword' })
      }

      const xiangYing = await request(yingYong)
        .post('/api/认证/登录')
        .send({ shouJiHao, miMa: 'wrongPassword' })
        .expect(429)
      expect(xiangYing.body.cheng_gong).toBe(false)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'dengLuShiBaiPinFan'))

      const shenJiJieGuo = await 数据库.query(
        `SELECT * FROM "审计日志" WHERE "事件类型" = $1 AND "详情"->>'shou_ji_hao' = $2 ORDER BY "创建时间" DESC`,
        [huoQuFanYi('shenJi', 'dengLuShiBai'), shouJiHao],
      )
      expect(shenJiJieGuo.rows.length).toBeGreaterThanOrEqual(5)
      const jiLu = shenJiJieGuo.rows[0]
      expect(jiLu.IP).toBeDefined()
      expect(jiLu.详情.shou_ji_hao).toBe(shouJiHao)
      expect(jiLu.创建时间).toBeDefined()
    } finally {
      await qingLiCeShiYongHu(shouJiHao)
    }
  })

  it('登录：成功后可用令牌获取用户信息', async () => {
    const xiangYing = await request(yingYong)
      .get('/api/认证/信息')
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)

    expect(xiangYing.body.cheng_gong).toBe(true)
    expect(xiangYing.body.shu_ju.shou_ji_hao).toBe(ceShiShouJiHao)
  })

  it('更改用户名：重复用户名失败', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/认证/更改用户名')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ yongHuMing: ceShiYongHuMing })
      .expect(400)

    expect(xiangYing.body.cheng_gong).toBe(false)
  })

  it('更改密码：旧密码/新密码/确认密码/验证码不匹配返回错误', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/认证/更改密码')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({
        jiuMiMa: ceShiMiMa,
        xinMiMa: 'newPassword123',
        queRenXinMiMa: 'differentPassword',
        yanZhengMa: '123456',
      })
      .expect(400)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'miMaBuYiZhi'))
  })
})
