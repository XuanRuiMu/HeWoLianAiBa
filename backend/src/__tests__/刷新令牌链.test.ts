import { describe, it, expect, afterAll } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import {
  cunChuRefreshToken,
  xiaoHaoRefreshToken,
  jianCeRefreshTokenChongFu,
  cheXiaoYongHuSuoYouRefreshToken,
  randomUUID,
} from '../utils/jwt'
import { shuaXinLingPai } from '../services/认证'

function suiJiShouJiHao(): string {
  return `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

/** 纯字母测试用户标识：Date.now() 时间戳常含 1[3-9]+9位数字，会误命中手机号正则 */
function weiYiCeShiYongHuId(): string {
  const ziMu = Math.random().toString(36).slice(2, 10).replace(/[0-9]/g, 'x')
  return `test-user-${ziMu}`
}

async function qingLiCeShiYongHu(shouJiHao: string): Promise<void> {
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  await redis.del(`yan_zheng_ma:${shouJiHao}`)
}

describe('FP-01 refresh 链根因治理', () => {
  afterAll(async () => {
    await 数据库.end()
    await redis.quit()
  })

  it('Redis 不存手机号，只存用户标识', async () => {
    const yongHuId = weiYiCeShiYongHuId()
    const tokenId = randomUUID()
    await cunChuRefreshToken(yongHuId, tokenId)
    try {
      const zhi = await redis.get(`refresh_token:${yongHuId}:${tokenId}`)
      expect(zhi).toBeTruthy()
      expect(zhi as string).toContain(yongHuId)
      expect(zhi as string).not.toMatch(/1[3-9]\d{9}/)
    } finally {
      await cheXiaoYongHuSuoYouRefreshToken(yongHuId)
    }
  })

  it('单次消费后未知键按普通无效处理，不误判复用', async () => {
    const yongHuId = weiYiCeShiYongHuId()
    const tokenId = randomUUID()
    await cunChuRefreshToken(yongHuId, tokenId)
    const diYiCi = await xiaoHaoRefreshToken(tokenId, yongHuId)
    expect(diYiCi.chengGong).toBe(true)
    const diErCi = await xiaoHaoRefreshToken(tokenId, yongHuId)
    expect(diErCi.chengGong).toBe(false)
    await redis.del(`xiao_hao_refresh_token:${yongHuId}:${tokenId}`)
    expect(await jianCeRefreshTokenChongFu(tokenId, yongHuId)).toBe(false)
    expect(await jianCeRefreshTokenChongFu(randomUUID(), yongHuId)).toBe(false)
    await cheXiaoYongHuSuoYouRefreshToken(yongHuId)
  })

  it('消费墓碑命中才算确凿复用', async () => {
    const yongHuId = weiYiCeShiYongHuId()
    const tokenId = randomUUID()
    await cunChuRefreshToken(yongHuId, tokenId)
    expect(await jianCeRefreshTokenChongFu(tokenId, yongHuId)).toBe(false)
    await xiaoHaoRefreshToken(tokenId, yongHuId)
    expect(await jianCeRefreshTokenChongFu(tokenId, yongHuId)).toBe(true)
    await redis.del(`xiao_hao_refresh_token:${yongHuId}:${tokenId}`)
    await cheXiaoYongHuSuoYouRefreshToken(yongHuId)
  })

  it('注册返回的复合刷新凭证可走通刷新并轮换', async () => {
    const shouJiHao = suiJiShouJiHao()
    await redis.setex(`yan_zheng_ma:${shouJiHao}`, 300, '123456')
    try {
      const zhuCe = await request(yingYong)
        .post('/api/认证/注册')
        .send({
          shouJiHao,
          yanZhengMa: '123456',
          yongHuMing: `刷新测试${Date.now()}`,
          miMa: 'Test123456',
          tongYiXieYi: true,
          chuShengRiQi: '2000-01-01',
        })
        .expect(200)
      const fuHePingZheng = String(zhuCe.body.shu_ju.刷新令牌ID)
      expect(fuHePingZheng).toContain(':')

      const shuaXin = await shuaXinLingPai(fuHePingZheng)
      expect(shuaXin.cheng_gong).toBe(true)
      expect(shuaXin.shu_ju?.令牌).toBeTruthy()
      expect(String(shuaXin.shu_ju?.刷新令牌ID)).toContain(':')

      const chongFang = await shuaXinLingPai(fuHePingZheng)
      expect(chongFang.cheng_gong).toBe(false)
    } finally {
      await qingLiCeShiYongHu(shouJiHao)
    }
  })

  it('复用已消费凭证触发全家吊销并提示异常登录', async () => {
    const shouJiHao = suiJiShouJiHao()
    await redis.setex(`yan_zheng_ma:${shouJiHao}`, 300, '123456')
    try {
      const zhuCe = await request(yingYong)
        .post('/api/认证/注册')
        .send({
          shouJiHao,
          yanZhengMa: '123456',
          yongHuMing: `复用测试${Date.now()}`,
          miMa: 'Test123456',
          tongYiXieYi: true,
          chuShengRiQi: '2000-01-01',
        })
        .expect(200)
      const fuHePingZheng = String(zhuCe.body.shu_ju.刷新令牌ID)
      const diYiCi = await shuaXinLingPai(fuHePingZheng)
      expect(diYiCi.cheng_gong).toBe(true)
      const diErCi = await shuaXinLingPai(fuHePingZheng)
      expect(diErCi.cheng_gong).toBe(false)
      expect(diErCi.ti_shi).toBeTruthy()
    } finally {
      await qingLiCeShiYongHu(shouJiHao)
    }
  })
})
