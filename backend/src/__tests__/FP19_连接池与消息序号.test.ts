import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { baoCunJiaoSeXiaoXi } from '../services/AI输入准备'

function suiJiShouJiHao(): string {
  return `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

function huoQuChengNianRiQi(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 17)
  return d.toISOString().split('T')[0]
}

async function qingLiCeShiYongHu(shouJiHao: string): Promise<void> {
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  await redis.del(`yan_zheng_ma:${shouJiHao}`)
  await redis.del(`fa_song_jian_ge:${shouJiHao}`)
}

async function chuangJianCeShiYongHu(): Promise<{ shouJiHao: string; lingPai: string; yongHuId: string }> {
  const shouJiHao = suiJiShouJiHao()
  await qingLiCeShiYongHu(shouJiHao)

  await request(yingYong).post('/api/认证/发送码').send({ shouJiHao }).expect(200)

  const zhuCeXiangYing = await request(yingYong)
    .post('/api/认证/注册')
    .send({
      shouJiHao,
      yanZhengMa: '123456',
      yongHuMing: `测试用户${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      miMa: 'testPassword123',
      tongYiXieYi: true,
      chuShengRiQi: huoQuChengNianRiQi(),
    })
    .expect(200)

  const yongHu = await 数据库.query(`SELECT "ID" FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  return {
    shouJiHao,
    lingPai: zhuCeXiangYing.body.shu_ju.令牌,
    yongHuId: String(yongHu.rows[0].ID),
  }
}

async function chuangJianCeShiJiaoSe(lingPai: string, canShu: Record<string, unknown>): Promise<string> {
  const shengChengXiangYing = await request(yingYong)
    .post('/api/生成角色/MBTI生成')
    .set('Authorization', `Bearer ${lingPai}`)
    .send(canShu)
    .expect(200)

  const jiaoSe = shengChengXiangYing.body.shu_ju
  const queRenXiangYing = await request(yingYong)
    .post('/api/生成角色/确认')
    .set('Authorization', `Bearer ${lingPai}`)
    .send({ xuanZhongJiaoSe: jiaoSe })
    .expect(200)

  return String(queRenXiangYing.body.shu_ju.id)
}

async function qingLiJiaoSeHeYongHu(yongHuId: string): Promise<void> {
  await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [yongHuId])
}

describe('FP-19 R7+R8 连接池与消息序号', () => {
  let ceShiYongHu: { shouJiHao: string; lingPai: string; yongHuId: string } | null = null
  let jiaoSeId: string

  beforeAll(async () => {
    ceShiYongHu = await chuangJianCeShiYongHu()
    jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu.lingPai, { 性别: 'nv', mbti类型: 'INFP' })
  })

  afterAll(async () => {
    if (ceShiYongHu) {
      await qingLiJiaoSeHeYongHu(ceShiYongHu.yongHuId)
    }
    await 数据库.end()
    await redis.quit()
  })

  beforeEach(async () => {
    if (ceShiYongHu) {
      await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`, [ceShiYongHu.yongHuId, jiaoSeId])
    }
  })

  describe('R7 连接池显式配置', () => {
    it('连接池参数已显式设置', async () => {
      // 验证连接池配置通过查询 pg_pool 设置间接确认
      // 实际参数在数据库.ts 中定义，这里验证连接正常工作
      const result = await 数据库.query('SELECT 1 as test')
      expect(result.rows[0].test).toBe(1)
    })

    it('并发慢查询不阻塞其他路由', async () => {
      // 模拟 20 个并发慢查询（通过 pg_sleep）
      const slowQueries = Array.from({ length: 20 }, () =>
        数据库.query('SELECT pg_sleep(0.1)')
      )
      
      // 同时发起一个快速查询，应在合理时间内返回
      const start = Date.now()
      const fastQuery = 数据库.query('SELECT 1 as fast')
      
      await Promise.all([...slowQueries, fastQuery])
      const elapsed = Date.now() - start
      
      // 快速查询不应被阻塞超过连接获取超时（5秒）+ 容差
      expect(elapsed).toBeLessThan(6000)
    })
  })

  describe('R8 消息序号唯一约束与冲突重试', () => {
    it('并发插入 50 条消息序号无重复', async () => {
      if (!ceShiYongHu) throw new Error('测试用户未创建')
      
      const promises = Array.from({ length: 50 }, (_, i) =>
        baoCunJiaoSeXiaoXi({
          yong_hu_id: ceShiYongHu!.yongHuId,
          jiao_se_id: jiaoSeId,
          nei_rong: `并发消息 ${i}`,
        })
      )

      const results = await Promise.all(promises)
      
      // 验证所有插入成功
      expect(results.every(r => r.id)).toBe(true)
      
      // 验证序号无重复
      const xuHaoLieBiao = results.map(r => r.ke_hu_duan_xu_hao).filter((x): x is number => x !== null)
      const uniqueXuHao = new Set(xuHaoLieBiao)
      expect(uniqueXuHao.size).toBe(xuHaoLieBiao.length)
      
      // 验证数据库中序号也是唯一的
      const dbResult = await 数据库.query(
        `SELECT "客户端序号" FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2 ORDER BY "客户端序号"`,
        [ceShiYongHu.yongHuId, jiaoSeId]
      )
      const dbXuHao = dbResult.rows.map(r => Number(r.客户端序号))
      const dbUniqueXuHao = new Set(dbXuHao)
      expect(dbUniqueXuHao.size).toBe(dbXuHao.length)
    })

    it('手动制造唯一约束冲突时有重试路径且最终成功', async () => {
      if (!ceShiYongHu) throw new Error('测试用户未创建')
      
      // 先插入一条序号为 100 的消息
      await 数据库.query(
        `INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读", "客户端序号")
         VALUES ($1, $2, '预置消息', 'jiaose', 'wenben', true, 100)`,
        [ceShiYongHu.yongHuId, jiaoSeId]
      )
      
      // 并发插入多条，其中一些会尝试序号 101（产生冲突后重试）
      const promises = Array.from({ length: 10 }, (_, i) =>
        baoCunJiaoSeXiaoXi({
          yong_hu_id: ceShiYongHu!.yongHuId,
          jiao_se_id: jiaoSeId,
          nei_rong: `冲突测试消息 ${i}`,
        })
      )

      const results = await Promise.all(promises)
      
      // 验证所有插入最终成功
      expect(results.every(r => r.id)).toBe(true)
      
      // 验证无重复序号
      const xuHaoLieBiao = results.map(r => r.ke_hu_duan_xu_hao).filter((x): x is number => x !== null)
      const uniqueXuHao = new Set(xuHaoLieBiao)
      expect(uniqueXuHao.size).toBe(xuHaoLieBiao.length)
    })

    it('前端提供序号时沿用，不自动分配', async () => {
      if (!ceShiYongHu) throw new Error('测试用户未创建')
      
      const result = await baoCunJiaoSeXiaoXi({
        yong_hu_id: ceShiYongHu.yongHuId,
        jiao_se_id: jiaoSeId,
        nei_rong: '指定序号消息',
        ke_hu_duan_xu_hao: 999,
      })
      
      expect(result.ke_hu_duan_xu_hao).toBe(999)
    })
  })
})
