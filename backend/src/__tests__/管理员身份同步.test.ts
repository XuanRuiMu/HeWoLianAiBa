process.env.ADMIN_PHONES = '13811110001'

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'

const guanLiYuanShouJiHao = '13811110001'
const puTongShouJiHao = '13811110002'
const ceShiMiMa = 'testPassword123'

async function qingLiCeShiYongHu(shouJiHao: string): Promise<void> {
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  await redis.del(`yan_zheng_ma:${shouJiHao}`)
  await redis.del(`fa_song_jian_ge:${shouJiHao}`)
  await redis.del(`deng_lu_shi_bai:${shouJiHao}`)
}

async function zhuCeYongHu(shouJiHao: string, yongHuMing: string): Promise<void> {
  await request(yingYong)
    .post('/api/认证/注册')
    .send({
      shouJiHao,
      yanZhengMa: '123456',
      yongHuMing,
      miMa: ceShiMiMa,
      tongYiXieYi: true,
    })
    .expect(200)
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
  beforeAll(async () => {
    await qingLiCeShiYongHu(guanLiYuanShouJiHao)
    await qingLiCeShiYongHu(puTongShouJiHao)
    await zhuCeYongHu(guanLiYuanShouJiHao, `同步测试A${Date.now()}`)
    await zhuCeYongHu(puTongShouJiHao, `同步测试B${Date.now()}`)
  })

  afterAll(async () => {
    await qingLiCeShiYongHu(guanLiYuanShouJiHao)
    await qingLiCeShiYongHu(puTongShouJiHao)
    await 数据库.end()
    await redis.quit()
  })

  it('注册时不在允许列表、后加入：登录按环境配置提升并回写数据库', async () => {
    await 数据库.query(
      `UPDATE "用户" SET "管理员" = FALSE WHERE "手机号" = $1`,
      [guanLiYuanShouJiHao],
    )
    expect(await chaKuGuanLiYuanLie(guanLiYuanShouJiHao)).toBe(false)

    expect(await dengLuQuGuanLiYuanBiaoJi(guanLiYuanShouJiHao)).toBe(true)
    expect(await chaKuGuanLiYuanLie(guanLiYuanShouJiHao)).toBe(true)
  })

  it('数据库残留管理员标记但不在允许列表：登录按环境配置降级并回写', async () => {
    await 数据库.query(
      `UPDATE "用户" SET "管理员" = TRUE WHERE "手机号" = $1`,
      [puTongShouJiHao],
    )
    expect(await chaKuGuanLiYuanLie(puTongShouJiHao)).toBe(true)

    expect(await dengLuQuGuanLiYuanBiaoJi(puTongShouJiHao)).toBe(false)
    expect(await chaKuGuanLiYuanLie(puTongShouJiHao)).toBe(false)
  })

  it('身份与配置一致时登录不产生额外变更', async () => {
    expect(await dengLuQuGuanLiYuanBiaoJi(guanLiYuanShouJiHao)).toBe(true)
    expect(await chaKuGuanLiYuanLie(guanLiYuanShouJiHao)).toBe(true)
  })
})
