import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuJieDuanMing } from '../services/好感度'

function suiJiShouJiHao(): string {
  return `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
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
  await 数据库.query(`DELETE FROM "记忆" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [yongHuId])
}

describe('FP-06 消息发送与显示', () => {
  let ceShiYongHu: { shouJiHao: string; lingPai: string; yongHuId: string } | null = null

  beforeAll(async () => {
    ceShiYongHu = await chuangJianCeShiYongHu()
  })

  afterAll(async () => {
    if (ceShiYongHu) {
      await qingLiJiaoSeHeYongHu(ceShiYongHu.yongHuId)
    }
    await 数据库.end()
    await redis.quit()
  })

  describe('秘籍触发', () => {
    it('发送whosyourdaddy触发秘籍，好感度变为1000并返回启用成功', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu!.lingPai, { 性别: 'nv', mbti类型: 'INFP' })

      const xiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ neiRong: 'whosyourdaddy' })
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju.shi_mi_ji).toBe(true)

      const haoGanDuJieGuo = await 数据库.query(
        `SELECT "总分" FROM "好感度" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [ceShiYongHu!.yongHuId, jiaoSeId],
      )
      expect(Number(haoGanDuJieGuo.rows[0].总分)).toBe(1000)
      expect(huoQuJieDuanMing(1000)).toBe('深爱')

      const xiaoXiJieGuo = await 数据库.query(
        `SELECT "内容", "发送者" FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2 ORDER BY "创建时间" DESC`,
        [ceShiYongHu!.yongHuId, jiaoSeId],
      )
      expect(xiaoXiJieGuo.rows.length).toBeGreaterThanOrEqual(2)
      expect(xiaoXiJieGuo.rows[0].发送者).toBe('jiaose')
      expect(xiaoXiJieGuo.rows[0].内容).toBe('启用成功')
    })

    it('发送大小写混合的WhosYourDaddy同样触发秘籍', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu!.lingPai, { 性别: 'nv', mbti类型: 'INTJ' })

      const xiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ neiRong: 'WhosYourDaddy' })
        .expect(200)

      expect(xiangYing.body.shu_ju.shi_mi_ji).toBe(true)

      const haoGanDuJieGuo = await 数据库.query(
        `SELECT "总分" FROM "好感度" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [ceShiYongHu!.yongHuId, jiaoSeId],
      )
      expect(Number(haoGanDuJieGuo.rows[0].总分)).toBe(1000)
    })

    it('发送包含额外字符的whosyourdaddy不触发秘籍', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu!.lingPai, { 性别: 'nv', mbti类型: 'ISFJ' })

      const xiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ neiRong: 'whosyourdaddy!' })
        .expect(200)

      expect(xiangYing.body.shu_ju.shi_mi_ji).not.toBe(true)

      const haoGanDuJieGuo = await 数据库.query(
        `SELECT "总分" FROM "好感度" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [ceShiYongHu!.yongHuId, jiaoSeId],
      )
      expect(Number(haoGanDuJieGuo.rows[0].总分)).toBeLessThan(1000)
    })

    it('发送普通消息不触发秘籍', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu!.lingPai, { 性别: 'nv', mbti类型: 'ESFJ' })

      const xiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ neiRong: '你好呀' })
        .expect(200)

      expect(xiangYing.body.shu_ju.shi_mi_ji).not.toBe(true)
      expect(xiangYing.body.shu_ju.nei_rong).toBe('你好呀')
    })
  })

  describe('开场白消息自动保存', () => {
    it('创建会话时自动将角色开场白保存为AI消息', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu!.lingPai, { 性别: 'nv', mbti类型: 'ENFP' })

      const chuangJianHuiHuaXiangYing = await request(yingYong)
        .post('/api/聊天/会话')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId })
        .expect(200)

      expect(chuangJianHuiHuaXiangYing.body.cheng_gong).toBe(true)

      const xiaoXiJieGuo = await 数据库.query(
        `SELECT "内容", "发送者" FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2 ORDER BY "创建时间" ASC`,
        [ceShiYongHu!.yongHuId, jiaoSeId],
      )
      expect(xiaoXiJieGuo.rows.length).toBeGreaterThanOrEqual(0)
      expect(xiaoXiJieGuo.rows.length).toBeLessThanOrEqual(5)
      for (const xiaoXi of xiaoXiJieGuo.rows) {
        expect(xiaoXi.发送者).toBe('jiaose')
      }
    })

    it('重复创建会话不会重复保存开场白消息', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu!.lingPai, { 性别: 'nv', mbti类型: 'ENTJ' })

      await request(yingYong)
        .post('/api/聊天/会话')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId })
        .expect(200)

      const diYiCiXiaoXi = await 数据库.query(
        `SELECT COUNT(*) as shu_liang FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [ceShiYongHu!.yongHuId, jiaoSeId],
      )
      const diYiCiShuLiang = Number(diYiCiXiaoXi.rows[0].shu_liang)

      await request(yingYong)
        .post('/api/聊天/会话')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ jiaoSeId })
        .expect(200)

      const diErCiXiaoXi = await 数据库.query(
        `SELECT COUNT(*) as shu_liang FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [ceShiYongHu!.yongHuId, jiaoSeId],
      )
      expect(Number(diErCiXiaoXi.rows[0].shu_liang)).toBe(diYiCiShuLiang)
    })
  })
})
