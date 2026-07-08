import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import {
  jiSuanZongFen,
  jiSuanShuaiJianBianHua,
  fenJieSiWei,
  huoQuJieDuanXinXi,
  huoQuJieDuanMing,
  huoQuXinQing,
  huoQuLiuCengJiMingCheng,
  jiSuanSiWeiBianHuaHouDeZongFen,
} from '../services/好感度'

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
  await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [yongHuId])
}

async function sheZhiGuanLiYuan(yongHuId: string): Promise<void> {
  await 数据库.query(`UPDATE "用户" SET "管理员" = true WHERE "ID" = $1`, [yongHuId])
}

async function zhiJieChuShiHuaHaoGanDu(
  yongHuId: string,
  jiaoSeId: string,
  zongFen: number,
): Promise<void> {
  await 数据库.query(
    `UPDATE "好感度" SET
      "信任度" = ROUND($1 * 0.35),
      "亲密度" = ROUND($1 * 0.25),
      "趣味度" = ROUND($1 * 0.2),
      "关怀度" = ROUND($1 * 0.2),
      "总分" = $1,
      "关系阶段" = $2
     WHERE "用户ID" = $3 AND "角色ID" = $4`,
    [zongFen, huoQuJieDuanMing(zongFen), yongHuId, jiaoSeId],
  )
}

describe('FP-10 好感度系统', () => {
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

  describe('四维计算与对数衰减', () => {
    it('四维加权总分 → 等于信任度*0.35 + 亲密度*0.25 + 趣味度*0.2 + 关怀度*0.2', () => {
      const fenShu = jiSuanZongFen({ xin_ren_du: 350, qin_mi_du: 250, qu_wei_du: 200, guan_huai_du: 200 })
      expect(fenShu).toBe(Math.round(350 * 0.35 + 250 * 0.25 + 200 * 0.2 + 200 * 0.2))
    })

    it('总分范围 → 限制在0-1000之间', () => {
      expect(jiSuanZongFen({ xin_ren_du: 10000, qin_mi_du: 10000, qu_wei_du: 10000, guan_huai_du: 10000 })).toBe(1000)
      expect(jiSuanZongFen({ xin_ren_du: -1000, qin_mi_du: -1000, qu_wei_du: -1000, guan_huai_du: -1000 })).toBe(0)
    })

    it('对数衰减 → 900分增加100后小于1000', () => {
      const xinFen = jiSuanShuaiJianBianHua(900, 100) + 900
      expect(xinFen).toBeLessThan(1000)
    })

    it('对数衰减 → 900分增加100后至少保留0.1倍（>=910）', () => {
      const xinFen = Math.round(jiSuanShuaiJianBianHua(900, 100) + 900)
      expect(xinFen).toBeGreaterThanOrEqual(910)
    })

    it('分解四维 → 总分按权重拆分为整数四维', () => {
      const siWei = fenJieSiWei(500)
      expect(siWei.xin_ren_du).toBe(175)
      expect(siWei.qin_mi_du).toBe(125)
      expect(siWei.qu_wei_du).toBe(100)
      expect(siWei.guan_huai_du).toBe(100)
      expect(siWei.zong_fen).toBe(500)
    })

    it('AI四维变化均为+3 → 好感度增加', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu!.lingPai, { 性别: 'nv', mbti类型: 'INFP' })
      await zhiJieChuShiHuaHaoGanDu(ceShiYongHu!.yongHuId, jiaoSeId, 500)

      const gengXinQian = await 数据库.query(
        `SELECT "总分" FROM "好感度" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [ceShiYongHu!.yongHuId, jiaoSeId],
      )
      const yuanFen = Number(gengXinQian.rows[0].总分)

      await request(yingYong)
        .post(`/api/好感度/${jiaoSeId}/更新`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({
          信任度变化: 3,
          亲密度变化: 3,
          趣味度变化: 3,
          关怀度变化: 3,
        })
        .expect(200)

      const gengXinHou = await 数据库.query(
        `SELECT "总分" FROM "好感度" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [ceShiYongHu!.yongHuId, jiaoSeId],
      )
      expect(Number(gengXinHou.rows[0].总分)).toBeGreaterThan(yuanFen)
    })

    it('AI四维变化均为-3 → 好感度减少', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu!.lingPai, { 性别: 'nv', mbti类型: 'INFP' })
      await zhiJieChuShiHuaHaoGanDu(ceShiYongHu!.yongHuId, jiaoSeId, 500)

      const gengXinQian = await 数据库.query(
        `SELECT "总分" FROM "好感度" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [ceShiYongHu!.yongHuId, jiaoSeId],
      )
      const yuanFen = Number(gengXinQian.rows[0].总分)

      await request(yingYong)
        .post(`/api/好感度/${jiaoSeId}/更新`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({
          信任度变化: -3,
          亲密度变化: -3,
          趣味度变化: -3,
          关怀度变化: -3,
        })
        .expect(200)

      const gengXinHou = await 数据库.query(
        `SELECT "总分" FROM "好感度" WHERE "用户ID" = $1 AND "角色ID" = $2`,
        [ceShiYongHu!.yongHuId, jiaoSeId],
      )
      expect(Number(gengXinHou.rows[0].总分)).toBeLessThan(yuanFen)
    })
  })

  describe('阶段映射', () => {
    const ceShiAnLi: Array<{ zongFen: number; jieDuan: string; xinQing: string }> = [
      { zongFen: 50, jieDuan: '冷淡', xinQing: '平淡' },
      { zongFen: 250, jieDuan: '认识', xinQing: '好奇' },
      { zongFen: 450, jieDuan: '朋友', xinQing: '愉悦' },
      { zongFen: 550, jieDuan: '好友', xinQing: '愉悦' },
      { zongFen: 650, jieDuan: '暧昧', xinQing: '期待' },
      { zongFen: 850, jieDuan: '热恋', xinQing: '心动' },
    ]

    it.each(ceShiAnLi)('总分$zongFen → 阶段为$jieDuan，心情为$xinQing', ({ zongFen, jieDuan, xinQing }) => {
      expect(huoQuJieDuanMing(zongFen)).toBe(jieDuan)
      expect(huoQuXinQing(zongFen)).toBe(xinQing)
      const xinXi = huoQuJieDuanXinXi(zongFen)
      expect(xinXi.jieDuanMing).toBe(jieDuan)
      expect(xinXi.xinQing).toBe(xinQing)
    })

    it('对外10阶段映射 → 包含阶段名和心情', () => {
      const xinXi = huoQuJieDuanXinXi(500)
      expect(xinXi).toHaveProperty('jieDuanMing')
      expect(xinXi).toHaveProperty('xinQing')
      expect(xinXi).toHaveProperty('taiDuMiaoShu')
    })

    it('6层级映射 → 仅内部使用，返回正确层级名', () => {
      expect(huoQuLiuCengJiMingCheng(50)).toBe('陌生人')
      expect(huoQuLiuCengJiMingCheng(250)).toBe('认识的人')
      expect(huoQuLiuCengJiMingCheng(450)).toBe('朋友')
      expect(huoQuLiuCengJiMingCheng(550)).toBe('好朋友')
      expect(huoQuLiuCengJiMingCheng(700)).toBe('暧昧')
      expect(huoQuLiuCengJiMingCheng(900)).toBe('恋人')
    })
  })

  describe('初始好感度', () => {
    it('生成INTJ角色 → 初始好感度在300-370范围内', async () => {
      const xiangYing = await request(yingYong)
        .post('/api/生成角色/MBTI生成')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ 性别: 'nv', mbti类型: 'INTJ' })
        .expect(200)

      const zongFen = xiangYing.body.shu_ju.hao_gan_du_zong_fen
      expect(zongFen).toBeGreaterThanOrEqual(300)
      expect(zongFen).toBeLessThanOrEqual(370)
    })

    it('生成ESFP角色 → 初始好感度在450-500范围内', async () => {
      const xiangYing = await request(yingYong)
        .post('/api/生成角色/MBTI生成')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ 性别: 'nv', mbti类型: 'ESFP' })
        .expect(200)

      const zongFen = xiangYing.body.shu_ju.hao_gan_du_zong_fen
      expect(zongFen).toBeGreaterThanOrEqual(450)
      expect(zongFen).toBeLessThanOrEqual(500)
    })

    it('生成渣男渣女角色 → 初始好感度比基础人格高200-300', async () => {
      const jiChuXiangYing = await request(yingYong)
        .post('/api/生成角色/MBTI生成')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ 性别: 'nv', mbti类型: 'ENFP' })
        .expect(200)
      const jiChuFen = jiChuXiangYing.body.shu_ju.hao_gan_du_zong_fen

      const zhaXingXiangYing = await request(yingYong)
        .post('/api/生成角色/MBTI生成')
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ 性别: 'nv', mbti类型: 'ENFP', 渣男渣女变体: true })
        .expect(200)
      const zhaXingFen = zhaXingXiangYing.body.shu_ju.hao_gan_du_zong_fen

      const chaZhi = zhaXingFen - jiChuFen
      expect(chaZhi).toBeGreaterThanOrEqual(200)
      expect(chaZhi).toBeLessThanOrEqual(300)
    })
  })

  describe('API对外暴露控制', () => {
    it('普通用户获取好感度 → 仅返回阶段和心情', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu!.lingPai, { 性别: 'nv', mbti类型: 'ISFJ' })

      const xiangYing = await request(yingYong)
        .get(`/api/好感度/${jiaoSeId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju).toHaveProperty('jie_duan')
      expect(xiangYing.body.shu_ju).toHaveProperty('xin_qing')
      expect(xiangYing.body.shu_ju).not.toHaveProperty('zong_fen')
      expect(xiangYing.body.shu_ju).not.toHaveProperty('xin_ren_du')
      expect(xiangYing.body.shu_ju).not.toHaveProperty('qin_mi_du')
      expect(xiangYing.body.shu_ju).not.toHaveProperty('qu_wei_du')
      expect(xiangYing.body.shu_ju).not.toHaveProperty('guan_huai_du')
    })

    it('普通用户获取好感度 → 不包含6层级映射名', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu!.lingPai, { 性别: 'nv', mbti类型: 'ISFJ' })

      const xiangYing = await request(yingYong)
        .get(`/api/好感度/${jiaoSeId}`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      const xiangYingWenBen = JSON.stringify(xiangYing.body)
      expect(xiangYingWenBen).not.toContain('陌生人')
      expect(xiangYingWenBen).not.toContain('认识的人')
      expect(xiangYingWenBen).not.toContain('好朋友')
      expect(xiangYingWenBen).not.toContain('暧昧')
      expect(xiangYingWenBen).not.toContain('恋人')
    })

    it('管理员获取好感度详情 → 包含总分和四维', async () => {
      await sheZhiGuanLiYuan(ceShiYongHu!.yongHuId)
      const jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu!.lingPai, { 性别: 'nv', mbti类型: 'ISFJ' })

      const xiangYing = await request(yingYong)
        .get(`/api/好感度/${jiaoSeId}/详情`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju).toHaveProperty('zong_fen')
      expect(xiangYing.body.shu_ju).toHaveProperty('xin_ren_du')
      expect(xiangYing.body.shu_ju).toHaveProperty('qin_mi_du')
      expect(xiangYing.body.shu_ju).toHaveProperty('qu_wei_du')
      expect(xiangYing.body.shu_ju).toHaveProperty('guan_huai_du')
      expect(xiangYing.body.shu_ju).toHaveProperty('guan_xi_jie_duan')
    })

    it('非管理员获取好感度详情 → 返回403', async () => {
      const puTongYongHu = await chuangJianCeShiYongHu()
      const jiaoSeId = await chuangJianCeShiJiaoSe(puTongYongHu.lingPai, { 性别: 'nv', mbti类型: 'ISFJ' })

      await request(yingYong)
        .get(`/api/好感度/${jiaoSeId}/详情`)
        .set('Authorization', `Bearer ${puTongYongHu.lingPai}`)
        .expect(403)

      await qingLiJiaoSeHeYongHu(puTongYongHu.yongHuId)
    })
  })

  describe('阶段变更记忆写入', () => {
    it('从朋友升级到好友 → 记忆表新增记录且重要度为8', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu!.lingPai, { 性别: 'nv', mbti类型: 'INFP' })
      await zhiJieChuShiHuaHaoGanDu(ceShiYongHu!.yongHuId, jiaoSeId, 500)

      await 数据库.query(`DELETE FROM "记忆" WHERE "用户ID" = $1 AND "角色ID" = $2`, [
        ceShiYongHu!.yongHuId,
        jiaoSeId,
      ])

      const bianHua = jiSuanSiWeiBianHuaHouDeZongFen(500, {
        xin_ren_du_bian_hua: 3,
        qin_mi_du_bian_hua: 3,
        qu_wei_du_bian_hua: 3,
        guan_huai_du_bian_hua: 3,
      })
      expect(huoQuJieDuanMing(bianHua)).toBe('好友')

      await request(yingYong)
        .post(`/api/好感度/${jiaoSeId}/更新`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({
          信任度变化: 3,
          亲密度变化: 3,
          趣味度变化: 3,
          关怀度变化: 3,
        })
        .expect(200)

      const jiYiJieGuo = await 数据库.query(
        `SELECT * FROM "记忆" WHERE "用户ID" = $1 AND "角色ID" = $2 AND "事件类型" = '好感度阶段变化'`,
        [ceShiYongHu!.yongHuId, jiaoSeId],
      )
      expect(jiYiJieGuo.rows.length).toBeGreaterThan(0)
      expect(Number(jiYiJieGuo.rows[0].重要度)).toBe(8)
    })

    it('从好友降级到朋友 → 记忆表新增记录且重要度为3', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu!.lingPai, { 性别: 'nv', mbti类型: 'INFP' })
      await zhiJieChuShiHuaHaoGanDu(ceShiYongHu!.yongHuId, jiaoSeId, 501)

      await 数据库.query(`DELETE FROM "记忆" WHERE "用户ID" = $1 AND "角色ID" = $2`, [
        ceShiYongHu!.yongHuId,
        jiaoSeId,
      ])

      const bianHua = jiSuanSiWeiBianHuaHouDeZongFen(501, {
        xin_ren_du_bian_hua: -3,
        qin_mi_du_bian_hua: -3,
        qu_wei_du_bian_hua: -3,
        guan_huai_du_bian_hua: -3,
      })
      expect(huoQuJieDuanMing(bianHua)).toBe('朋友')

      await request(yingYong)
        .post(`/api/好感度/${jiaoSeId}/更新`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({
          信任度变化: -3,
          亲密度变化: -3,
          趣味度变化: -3,
          关怀度变化: -3,
        })
        .expect(200)

      const jiYiJieGuo = await 数据库.query(
        `SELECT * FROM "记忆" WHERE "用户ID" = $1 AND "角色ID" = $2 AND "事件类型" = '好感度阶段变化'`,
        [ceShiYongHu!.yongHuId, jiaoSeId],
      )
      expect(jiYiJieGuo.rows.length).toBeGreaterThan(0)
      expect(Number(jiYiJieGuo.rows[0].重要度)).toBe(3)
    })
  })

  describe('秘籍功能', () => {
    it('输入正确秘籍 → 好感度拉满到1000', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu!.lingPai, { 性别: 'nv', mbti类型: 'INFP' })

      const xiangYing = await request(yingYong)
        .post(`/api/好感度/${jiaoSeId}/秘籍`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ 秘籍: 'whosyourdaddy' })
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju.zong_fen).toBe(1000)
      expect(huoQuJieDuanMing(xiangYing.body.shu_ju.zong_fen)).toBe('深爱')
    })

    it('输入错误秘籍 → 返回401', async () => {
      const jiaoSeId = await chuangJianCeShiJiaoSe(ceShiYongHu!.lingPai, { 性别: 'nv', mbti类型: 'INFP' })

      await request(yingYong)
        .post(`/api/好感度/${jiaoSeId}/秘籍`)
        .set('Authorization', `Bearer ${ceShiYongHu!.lingPai}`)
        .send({ 秘籍: 'cuowu' })
        .expect(401)
    })
  })
})
