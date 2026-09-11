import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { sheZhiKaiChangBaiMock } from '../services/开场白生成'
import { sheZhiMockTiaoYong, chongZhiDeepSeekKeHuDuan } from '../utils/DeepSeek客户端'

function suiJiShouJiHao(): string {
  return `135${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

describe('C1 隐式AI生成元数据标识', () => {
  let lingPai = ''
  let yongHuId = ''
  let jiaoSeId = ''
  const shouJiHao = suiJiShouJiHao()

  beforeAll(async () => {
    sheZhiKaiChangBaiMock(() => ({ xiao_xi_lie_biao: ['AI开场白'] }))
    chongZhiDeepSeekKeHuDuan()
    sheZhiMockTiaoYong(async () => ({
      neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {} as never,
    }))
    await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
    await redis.del(`yan_zheng_ma:${shouJiHao}`)
    await request(yingYong).post('/api/认证/发送码').send({ shouJiHao }).expect(200)
    const zhuCeXiangYing = await request(yingYong)
      .post('/api/认证/注册')
      .send({
        shouJiHao,
        yanZhengMa: '123456',
        yongHuMing: `标识测试${Date.now()}`,
        miMa: 'testPassword123',
        tongYiXieYi: true,
        chuShengRiQi: '2000-01-01',
      })
      .expect(200)
    lingPai = zhuCeXiangYing.body.shu_ju.令牌

    const shengChengXiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'ENFJ' })
      .expect(200)
    const queRenXiangYing = await request(yingYong)
      .post('/api/生成角色/确认')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ xuanZhongJiaoSe: shengChengXiangYing.body.shu_ju })
      .expect(200)
    jiaoSeId = String(queRenXiangYing.body.shu_ju.id)

    const yongHu = await 数据库.query(`SELECT "ID" FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
    yongHuId = String(yongHu.rows[0].ID)

    // 用户消息
    await request(yingYong)
      .post(`/api/聊天/会话/${jiaoSeId}/消息`)
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ neiRong: '用户普通消息', leiXing: 'wenben' })
      .expect(200)
  })

  beforeEach(() => {
    sheZhiKaiChangBaiMock(() => ({ xiao_xi_lie_biao: [] }))
    chongZhiDeepSeekKeHuDuan()
    sheZhiMockTiaoYong(async () => ({
      neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {} as never,
    }))
  })

  it('jiaose 消息携带 ai_biao_shi=true，yonghu 消息为 false', async () => {
    const xiangYing = await request(yingYong)
      .get(`/api/聊天/会话/${jiaoSeId}/消息?ye_ma=1&mei_ye_tiao_shu=50`)
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)

    const lieBiao = xiangYing.body.shu_ju.lie_biao as Array<{
      fa_song_zhe_lei_xing: string
      ai_biao_shi?: boolean
    }>
    expect(lieBiao.length).toBeGreaterThanOrEqual(2)

    for (const xiaoXi of lieBiao) {
      if (xiaoXi.fa_song_zhe_lei_xing === 'jiaose') {
        expect(xiaoXi.ai_biao_shi).toBe(true)
      } else {
        expect(xiaoXi.ai_biao_shi).toBe(false)
      }
    }
  })

  afterAll(async () => {
    sheZhiKaiChangBaiMock(null)
    await 数据库.query(`DELETE FROM "记忆" WHERE "用户ID" = $1`, [yongHuId])
    await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [yongHuId])
    await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [yongHuId])
    await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [yongHuId])
    await 数据库.query(`DELETE FROM "游戏档案" WHERE "用户ID" = $1`, [yongHuId])
    await 数据库.query(`DELETE FROM "协议留痕" WHERE "用户ID" = $1`, [yongHuId]).catch(() => {})
    await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
    await redis.del(`yan_zheng_ma:${shouJiHao}`)
    await 数据库.end()
    await redis.quit()
  })
})
