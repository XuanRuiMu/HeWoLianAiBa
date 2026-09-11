process.env.ADMIN_PHONES = '13811110001'

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'crypto'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { zhiXingGuanLiYuanZhongZi } from '../services/管理员'

const guanLiYuanShouJiHao = '13811110001'
const puTongShouJiHao = '13811110002'
const ceShiMiMa = 'testPassword123'

async function qingLiCeShiYongHu(shouJiHao: string): Promise<void> {
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  await redis.del(`yan_zheng_ma:${shouJiHao}`)
  await redis.del(`fa_song_jian_ge:${shouJiHao}`)
  await redis.del(`deng_lu_shi_bai:${shouJiHao}`)
}

async function zhuCeYongHu(
  shouJiHao: string,
  yongHuMing: string,
): Promise<{ lingPai: string; yongHuId: string }> {
  const xiangYing = await request(yingYong)
    .post('/api/认证/注册')
    .send({
      shouJiHao,
      yanZhengMa: '123456',
      yongHuMing,
      miMa: ceShiMiMa,
      tongYiXieYi: true,
      chuShengRiQi: '2000-01-01',
    })
    .expect(200)
  return {
    lingPai: xiangYing.body.shu_ju.令牌,
    yongHuId: xiangYing.body.shu_ju.用户.id,
  }
}

async function dengLuQuGuanLiYuanBiaoJi(shouJiHao: string): Promise<boolean> {
  const xiangYing = await request(yingYong)
    .post('/api/认证/登录')
    .send({ shouJiHao, miMa: ceShiMiMa })
    .expect(200)
  return xiangYing.body.shu_ju.是否管理员
}

async function chaKuGuanLiYuanLie(shouJiHao: string): Promise<boolean> {
  const jieGuo = await 数据库.query(
    `SELECT "管理员" FROM "用户" WHERE "手机号" = $1 LIMIT 1`,
    [shouJiHao],
  )
  return Boolean(jieGuo.rows[0]?.管理员)
}

describe('管理员身份唯一事实源同步', () => {
  let guanLiYuanLingPai = ''
  let guanLiYuanId = ''
  let puTongLingPai = ''
  let puTongId = ''

  beforeAll(async () => {
    await qingLiCeShiYongHu(guanLiYuanShouJiHao)
    await qingLiCeShiYongHu(puTongShouJiHao)
    const a = await zhuCeYongHu(guanLiYuanShouJiHao, `同步测试A${Date.now()}`)
    guanLiYuanLingPai = a.lingPai
    guanLiYuanId = a.yongHuId
    const b = await zhuCeYongHu(puTongShouJiHao, `同步测试B${Date.now()}`)
    puTongLingPai = b.lingPai
    puTongId = b.yongHuId
  })

  afterAll(async () => {
    await qingLiCeShiYongHu(guanLiYuanShouJiHao)
    await qingLiCeShiYongHu(puTongShouJiHao)
    delete process.env.BOOTSTRAP_ADMIN
    await 数据库.end()
    await redis.quit()
  })

  it('白名单手机号新注册仍是普通用户', async () => {
    expect(await chaKuGuanLiYuanLie(guanLiYuanShouJiHao)).toBe(false)
    expect(await dengLuQuGuanLiYuanBiaoJi(guanLiYuanShouJiHao)).toBe(false)
  })

  it('种子引导把白名单用户提升为管理员且重复执行幂等', async () => {
    const diYiCiTiSheng = await zhiXingGuanLiYuanZhongZi()
    expect(diYiCiTiSheng).toBe(1)
    expect(await chaKuGuanLiYuanLie(guanLiYuanShouJiHao)).toBe(true)

    const diErCiTiSheng = await zhiXingGuanLiYuanZhongZi()
    expect(diErCiTiSheng).toBe(0)
    expect(await chaKuGuanLiYuanLie(guanLiYuanShouJiHao)).toBe(true)

    expect(await chaKuGuanLiYuanLie(puTongShouJiHao)).toBe(false)
    expect(await dengLuQuGuanLiYuanBiaoJi(guanLiYuanShouJiHao)).toBe(true)

    await request(yingYong)
      .get('/api/管理/用户')
      .set('Authorization', `Bearer ${guanLiYuanLingPai}`)
      .expect(200)
  })

  it('运行期修改ADMIN_PHONES不再影响已授予权限', async () => {
    const yuanZhi = process.env.ADMIN_PHONES
    process.env.ADMIN_PHONES = ''
    try {
      const xiangYing = await request(yingYong)
        .get('/api/管理/用户')
        .set('Authorization', `Bearer ${guanLiYuanLingPai}`)
        .expect(200)
      expect(xiangYing.body.cheng_gong).toBe(true)
    } finally {
      process.env.ADMIN_PHONES = yuanZhi
    }
  })

  it('授予普通用户后可访问管理接口，回收并清缓存后下次请求即403', async () => {
    await request(yingYong)
      .get('/api/管理/用户')
      .set('Authorization', `Bearer ${puTongLingPai}`)
      .expect(403)

    const shouQuanXiangYing = await request(yingYong)
      .post('/api/管理/授权')
      .set('Authorization', `Bearer ${guanLiYuanLingPai}`)
      .send({ yong_hu_id: puTongId })
      .expect(200)
    expect(shouQuanXiangYing.body.shu_ju.guan_li_yuan).toBe(true)
    expect(await chaKuGuanLiYuanLie(puTongShouJiHao)).toBe(true)

    await request(yingYong)
      .get('/api/管理/用户')
      .set('Authorization', `Bearer ${puTongLingPai}`)
      .expect(200)

    const huiShouXiangYing = await request(yingYong)
      .post('/api/管理/回收')
      .set('Authorization', `Bearer ${guanLiYuanLingPai}`)
      .send({ yong_hu_id: puTongId })
      .expect(200)
    expect(huiShouXiangYing.body.shu_ju.guan_li_yuan).toBe(false)

    await request(yingYong)
      .get('/api/管理/用户')
      .set('Authorization', `Bearer ${puTongLingPai}`)
      .expect(403)
    expect(await chaKuGuanLiYuanLie(puTongShouJiHao)).toBe(false)
  })

  it('授予与回收操作写入审计日志', async () => {
    const jieGuo = await 数据库.query(
      `SELECT "事件类型", COUNT(*) AS ci_shu FROM "审计日志"
       WHERE "用户ID" = $1 AND "事件类型" IN ('授予管理员', '回收管理员')
       GROUP BY "事件类型"`,
      [guanLiYuanId],
    )
    const jiShuAnLeiXing = new Map<string, number>(
      jieGuo.rows.map((hang: Record<string, unknown>) => [String(hang.事件类型), Number(hang.ci_shu)]),
    )
    expect(jiShuAnLeiXing.get('授予管理员')).toBeGreaterThanOrEqual(1)
    expect(jiShuAnLeiXing.get('回收管理员')).toBeGreaterThanOrEqual(1)
  })

  it('非管理员调用授权接口返回403', async () => {
    await request(yingYong)
      .post('/api/管理/授权')
      .set('Authorization', `Bearer ${puTongLingPai}`)
      .send({ yong_hu_id: puTongId })
      .expect(403)
  })

  it('目标用户不存在返回404', async () => {
    await request(yingYong)
      .post('/api/管理/授权')
      .set('Authorization', `Bearer ${guanLiYuanLingPai}`)
      .send({ yong_hu_id: randomUUID() })
      .expect(404)
  })
})
