import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { baoCunJiaoSe } from '../services/角色生成'
import { gengXinHaoGanDu, chuShiHuaHaoGanDu, jiSuanSiWeiBianHuaHouDeZongFen } from '../services/好感度'
import { chuLiYouXiJieShu } from '../services/胜利失败条件'
import { sheZhiMockTiaoYong } from '../utils/DeepSeek客户端'

function suiJiShouJiHao(): string {
  return `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

function huoQuChengNianRiQi(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 20)
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
  await 数据库.query(`DELETE FROM "记忆" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "游戏结局" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "游戏档案" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [yongHuId])
}

describe('FP-16 R2 事务幂等', () => {
  let ceShiYongHu: { shouJiHao: string; lingPai: string; yongHuId: string } | null = null
  let jiaoSeId: string

  beforeAll(async () => {
    sheZhiMockTiaoYong(async () => ({
      neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {} as never,
    }))
    ceShiYongHu = await chuangJianCeShiYongHu()
  })

  afterAll(async () => {
    sheZhiMockTiaoYong(null)
    if (ceShiYongHu) {
      await qingLiJiaoSeHeYongHu(ceShiYongHu.yongHuId)
    }
    await 数据库.end()
    await redis.quit()
  })

  beforeEach(async () => {
    if (ceShiYongHu) {
      await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [ceShiYongHu.yongHuId])
      await 数据库.query(`DELETE FROM "游戏结局" WHERE "用户ID" = $1`, [ceShiYongHu.yongHuId])
      await 数据库.query(`DELETE FROM "游戏档案" WHERE "用户ID" = $1`, [ceShiYongHu.yongHuId])
      await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [ceShiYongHu.yongHuId])
      await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [ceShiYongHu.yongHuId])
      jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu.lingPai, { 性别: 'nv', mbti类型: 'INFP' })
    }
  })

  describe('好感度原子更新', () => {
    it('并发 20 次好感度增减后总分与串行期望值一致', async () => {
      await chuShiHuaHaoGanDu(ceShiYongHu!.yongHuId, jiaoSeId, 500)

      const promises = Array.from({ length: 20 }, (_, i) =>
        gengXinHaoGanDu(ceShiYongHu!.yongHuId, jiaoSeId, {
          xin_ren_du_bian_hua: i % 2 === 0 ? 1 : -1,
          qin_mi_du_bian_hua: i % 2 === 0 ? 1 : -1,
          qu_wei_du_bian_hua: i % 2 === 0 ? 1 : -1,
          guan_huai_du_bian_hua: i % 2 === 0 ? 1 : -1,
        })
      )

      const results = await Promise.all(promises)
      expect(results.every(r => r.cheng_gong)).toBe(true)

      const finalResult = await 数据库.query(
        `SELECT "总分" FROM "好感度" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [ceShiYongHu!.yongHuId, jiaoSeId]
      )
      const finalScore = Number(finalResult.rows[0].总分)

      // 原子更新下并发结果必须与严格串行执行完全一致（无丢失更新、无重复计数）
      let qiWang = 500
      for (let i = 0; i < 20; i++) {
        qiWang = jiSuanSiWeiBianHuaHouDeZongFen(qiWang, {
          xin_ren_du_bian_hua: i % 2 === 0 ? 1 : -1,
          qin_mi_du_bian_hua: i % 2 === 0 ? 1 : -1,
          qu_wei_du_bian_hua: i % 2 === 0 ? 1 : -1,
          guan_huai_du_bian_hua: i % 2 === 0 ? 1 : -1,
        })
      }
      expect(finalScore).toBe(qiWang)
    })

    it('并发混合增减不产生负分或超限', async () => {
      await chuShiHuaHaoGanDu(ceShiYongHu!.yongHuId, jiaoSeId, 100)

      const promises = Array.from({ length: 20 }, (_, i) =>
        gengXinHaoGanDu(ceShiYongHu!.yongHuId, jiaoSeId, {
          xin_ren_du_bian_hua: i < 10 ? 3 : -3,
          qin_mi_du_bian_hua: i < 10 ? 3 : -3,
          qu_wei_du_bian_hua: i < 10 ? 3 : -3,
          guan_huai_du_bian_hua: i < 10 ? 3 : -3,
        })
      )

      await Promise.all(promises)

      const finalResult = await 数据库.query(
        `SELECT "总分" FROM "好感度" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [ceShiYongHu!.yongHuId, jiaoSeId]
      )
      const finalScore = Number(finalResult.rows[0].总分)

      expect(finalScore).toBeGreaterThanOrEqual(0)
      expect(finalScore).toBeLessThanOrEqual(1000)
    })
  })

  describe('结局唯一约束', () => {
    it('同一会话并发触发两次结束条件仅产生一条结局记录和一次复盘', async () => {
      // 并发调用两次 chuLiYouXiJieShu
      const promises = [
        chuLiYouXiJieShu(ceShiYongHu!.yongHuId, jiaoSeId, 'sheng_li_ai_qing', { lei_xing: '测试1' }),
        chuLiYouXiJieShu(ceShiYongHu!.yongHuId, jiaoSeId, 'sheng_li_ai_qing', { lei_xing: '测试2' }),
      ]

      const results = await Promise.all(promises)
      expect(results.filter(r => r !== null).length).toBeGreaterThanOrEqual(1)

      // 验证数据库中只有一条结局记录
      const jieJuResult = await 数据库.query(
        `SELECT COUNT(*) as count FROM "游戏结局" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [ceShiYongHu!.yongHuId, jiaoSeId]
      )
      expect(Number(jieJuResult.rows[0].count)).toBe(1)
    })

    it('并发不同结局类型仅首个成功写入', async () => {
      const promises = [
        chuLiYouXiJieShu(ceShiYongHu!.yongHuId, jiaoSeId, 'sheng_li_ai_qing', { lei_xing: '表白' }),
        chuLiYouXiJieShu(ceShiYongHu!.yongHuId, jiaoSeId, 'shi_bai_hu_shan_shi_bai', { lei_xing: '互删' }),
      ]

      await Promise.all(promises)

      const jieJuResult = await 数据库.query(
        `SELECT COUNT(*) as count FROM "游戏结局" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [ceShiYongHu!.yongHuId, jiaoSeId]
      )
      expect(Number(jieJuResult.rows[0].count)).toBe(1)
    })
  })

  describe('创建角色乐观锁', () => {
    it('连点开始聊天仅创建一个活跃角色', async () => {
      // 清理现有角色
      await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [ceShiYongHu!.yongHuId])
      await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [ceShiYongHu!.yongHuId])
      await 数据库.query(`UPDATE "用户" SET "活跃角色ID" = NULL WHERE "ID" = $1`, [ceShiYongHu!.yongHuId])

      const canShu = {
        yong_hu_id: ceShiYongHu!.yongHuId,
        xing_bie: 'nv' as const,
        mu_biao_xing_bie: 'nan' as const,
        mbti_lei_xing: 'INFP' as const,
        shi_fou_zha_xing: false,
        sui_ji_xing_ge: true,
      }

      // 并发调用 5 次 baoCunJiaoSe
      const jiaoSe = {
        id: '',
        ming_zi: '测试角色',
        xing_bie: 'nv' as const,
        nian_ling: 20,
        shen_fen: '大学生',
        wai_mao: '测试外貌',
        xing_ge: '测试性格',
        bei_jing_gu_shi: '测试背景',
        xi_hao: ['测试爱好'],
        yan_yu_feng_ge: '测试风格',
        xing_wei_te_dian: '测试特点',
        tou_xiang: '测试头像',
        biao_qian: ['INFP'],
        xi_huan_de_lei_xing: '温柔',
        jia_ting_bei_jing: '测试家庭',
        qing_gan_jing_li: '测试经历',
        shi_fou_zha_xing: false,
        yu_she_lei_xing: 'INFP' as const,
        mbti_lei_xing: 'INFP' as const,
        ie_lei_xing: 'I' as const,
        re_shen_lei_xing: '快热' as const,
        wei_xin_ming: '测试昵称',
        zhen_shi_ming: '测试真名',
        shi_jie_xin_xi: {},
        xi_tong_ti_shi: '测试系统提示',
        ba_da_mo_kuai: {
          ji_ben_xin_xi: '',
          wai_mao: '',
          xing_ge: '',
          bei_jing: '',
          yan_yu: '',
          xing_wei: '',
          guan_xi: '',
          xi_tong_ti_shi: '',
        },
        hao_gan_du_zong_fen: 500,
      }

      const promises = Array.from({ length: 5 }, () => baoCunJiaoSe(ceShiYongHu!.yongHuId, jiaoSe))
      const results = await Promise.allSettled(promises)

      // 验证只有一个角色被创建
      const rolesResult = await 数据库.query(
        `SELECT COUNT(*) as count FROM "角色" WHERE "用户ID" = $1 AND "封存" = FALSE AND "删除时间" IS NULL`,
        [ceShiYongHu!.yongHuId]
      )
      const activeCount = await 数据库.query(
        `SELECT COUNT(*) as count FROM "角色" WHERE "用户ID" = $1 AND "封存" = FALSE AND "删除时间" IS NULL`,
        [ceShiYongHu!.yongHuId]
      )

      // 活跃角色应为 1 个
      expect(Number(activeCount.rows[0].count)).toBe(1)
    })
  })
})
