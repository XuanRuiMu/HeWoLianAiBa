import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuNiChengKu } from '../utils/昵称解析'
import { mbtiLieBiao } from '../config/角色配置'
import { sheZhiKaiChangBaiMock } from '../services/开场白生成'

function suiJiShouJiHao(): string {
  return `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

async function qingLiCeShiYongHu(shouJiHao: string): Promise<void> {
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  await redis.del(`yan_zheng_ma:${shouJiHao}`)
  await redis.del(`fa_song_jian_ge:${shouJiHao}`)
}

async function chuangJianCeShiYongHu(): Promise<{ shouJiHao: string; lingPai: string }> {
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

  return { shouJiHao, lingPai: zhuCeXiangYing.body.shu_ju.令牌 }
}

async function qingLiJiaoSeHeYongHu(yongHuId: string): Promise<void> {
  await 数据库.query(`DELETE FROM "好感度" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "角色" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [yongHuId])
}

describe('FP-04 AI角色生成', () => {
  let lingPai = ''
  let ceShiYongHuId = ''

  beforeAll(async () => {
    const jieGuo = await chuangJianCeShiYongHu()
    lingPai = jieGuo.lingPai
    const yongHu = await 数据库.query(`SELECT "ID" FROM "用户" WHERE "手机号" = $1`, [jieGuo.shouJiHao])
    ceShiYongHuId = String(yongHu.rows[0].ID)
  })

  afterEach(() => {
    sheZhiKaiChangBaiMock(null)
  })

  afterAll(async () => {
    if (ceShiYongHuId) {
      await qingLiJiaoSeHeYongHu(ceShiYongHuId)
    }
    await 数据库.end()
    await redis.quit()
  })

  it('指定MBTI=INTJ生成角色 → 返回MBTI为INTJ', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'INTJ' })
      .expect(200)

    expect(xiangYing.body.cheng_gong).toBe(true)
    expect(xiangYing.body.shu_ju.yu_she_lei_xing).toBe('INTJ')
    expect(xiangYing.body.shu_ju.mbti_lei_xing).toBe('INTJ')
  })

  it('不指定MBTI生成角色 → MBTI为16种之一', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nan' })
      .expect(200)

    expect(mbtiLieBiao).toContain(xiangYing.body.shu_ju.mbti_lei_xing)
  })

  it('生成男性角色 → 性别为男且微信昵称在男昵称库中', async () => {
    const niChengKu = huoQuNiChengKu()
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nan', mbti类型: 'ENTJ' })
      .expect(200)

    expect(xiangYing.body.shu_ju.xing_bie).toBe('nan')
    expect(niChengKu.nan).toContain(xiangYing.body.shu_ju.wei_xin_ming)
  })

  it('生成女性角色 → 性别为女且微信昵称在女昵称库中', async () => {
    const niChengKu = huoQuNiChengKu()
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'ESFJ' })
      .expect(200)

    expect(xiangYing.body.shu_ju.xing_bie).toBe('nv')
    expect(niChengKu.nv).toContain(xiangYing.body.shu_ju.wei_xin_ming)
  })

  it('生成角色 → 包含非空头像字段', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nan' })
      .expect(200)

    expect(xiangYing.body.shu_ju.tou_xiang).toBeTruthy()
    expect(typeof xiangYing.body.shu_ju.tou_xiang).toBe('string')
  })

  it('各身份年龄范围符合PRD要求', async () => {
    const shenFenNianLing: Record<string, number[]> = { 大学生: [], 大专生: [], 工作人: [] }

    for (let i = 0; i < 50; i++) {
      const xiangYing = await request(yingYong)
        .post('/api/生成角色/MBTI生成')
        .set('Authorization', `Bearer ${lingPai}`)
        .send({ 性别: 'nv' })
      const shuJu = xiangYing.body.shu_ju
      shenFenNianLing[shuJu.shen_fen].push(shuJu.nian_ling)
    }

    for (const [shenFen, nianLingLieBiao] of Object.entries(shenFenNianLing)) {
      expect(nianLingLieBiao.length).toBeGreaterThan(0)
      for (const nianLing of nianLingLieBiao) {
        if (shenFen === '大学生') {
          expect(nianLing).toBeGreaterThanOrEqual(18)
          expect(nianLing).toBeLessThanOrEqual(22)
        } else if (shenFen === '大专生') {
          expect(nianLing).toBeGreaterThanOrEqual(18)
          expect(nianLing).toBeLessThanOrEqual(21)
        } else if (shenFen === '工作人') {
          expect(nianLing).toBeGreaterThanOrEqual(22)
          expect(nianLing).toBeLessThanOrEqual(28)
        }
      }
    }
  })

  it('角色对象包含喜欢的类型、家庭背景、情感经历且非空', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nan', mbti类型: 'INFJ' })
      .expect(200)

    expect(xiangYing.body.shu_ju.xi_huan_de_lei_xing).toBeTruthy()
    expect(xiangYing.body.shu_ju.jia_ting_bei_jing).toBeTruthy()
    expect(xiangYing.body.shu_ju.qing_gan_jing_li).toBeTruthy()
  })

  it('角色对象包含8大模块字段', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'ENFP' })
      .expect(200)

    const baDaMoKuai = xiangYing.body.shu_ju.ba_da_mo_kuai
    expect(baDaMoKuai).toBeDefined()
    expect(baDaMoKuai.ji_ben_xin_xi).toBeTruthy()
    expect(baDaMoKuai.wai_mao).toBeTruthy()
    expect(baDaMoKuai.xing_ge).toBeTruthy()
    expect(baDaMoKuai.bei_jing).toBeTruthy()
    expect(baDaMoKuai.yan_yu).toBeTruthy()
    expect(baDaMoKuai.xing_wei).toBeTruthy()
    expect(baDaMoKuai.guan_xi).toBeTruthy()
    expect(baDaMoKuai.xi_tong_ti_shi).toBeTruthy()
  })

  it('生成渣男渣女角色 → 包含渣型相关字段', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nan', mbti类型: 'ENTP', 渣男渣女变体: true })
      .expect(200)

    expect(xiangYing.body.shu_ju.shi_fou_zha_xing).toBe(true)
    expect(xiangYing.body.shu_ju.zha_fa_miao_shu).toBeTruthy()
    expect(xiangYing.body.shu_ju.hua_shu).toBeInstanceOf(Array)
    expect(xiangYing.body.shu_ju.hua_shu.length).toBeGreaterThan(0)
    expect(xiangYing.body.shu_ju.bao_lu_fang_shi).toBeTruthy()
    expect(xiangYing.body.shu_ju.shi_po_xian_suo).toBeInstanceOf(Array)
    expect(xiangYing.body.shu_ju.shi_po_xian_suo.length).toBeGreaterThan(0)
  })

  it('MBTI首字母为I → IE类型为I', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'INFP' })
      .expect(200)

    expect(xiangYing.body.shu_ju.ie_lei_xing).toBe('I')
  })

  it('MBTI末字母为J（PRD：T/J） → 热身类型为慢热', async () => {
    const tjXiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'INTJ' })
      .expect(200)
    expect(tjXiangYing.body.shu_ju.re_shen_lei_xing).toBe('慢热')

    const fjXiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'ENFJ' })
      .expect(200)
    expect(fjXiangYing.body.shu_ju.re_shen_lei_xing).toBe('慢热')
  })

  it('MBTI末字母为P（PRD：F/P） → 热身类型为快热', async () => {
    const fpXiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nan', mbti类型: 'INFP' })
      .expect(200)
    expect(fpXiangYing.body.shu_ju.re_shen_lei_xing).toBe('快热')

    const tpXiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nan', mbti类型: 'ENTP' })
      .expect(200)
    expect(tpXiangYing.body.shu_ju.re_shen_lei_xing).toBe('快热')
  })

  it('生成角色接口不再向玩家暴露 kai_chang_bai/开场白 字段', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'ISFP' })
      .expect(200)

    expect(xiangYing.body.shu_ju.kai_chang_bai).toBeUndefined()
    expect(xiangYing.body.shu_ju.开场白).toBeUndefined()
  })

  it('外向+快热角色确认后会保存开场白消息（AI 决定发送）', async () => {
    sheZhiKaiChangBaiMock(() => ({ xiao_xi_lie_biao: ['嗨', '今天天气不错'] }))

    const shengChengXiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'ENFP' })
      .expect(200)

    const jiaoSe = shengChengXiangYing.body.shu_ju
    const queRenXiangYing = await request(yingYong)
      .post('/api/生成角色/确认')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ xuanZhongJiaoSe: jiaoSe })
      .expect(200)

    const jiaoSeId = String(queRenXiangYing.body.shu_ju.id)
    const xiaoXiJieGuo = await 数据库.query(
      `SELECT "内容", "发送者" FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2 ORDER BY "创建时间" ASC`,
      [ceShiYongHuId, jiaoSeId],
    )
    expect(xiaoXiJieGuo.rows.length).toBe(2)
    expect(xiaoXiJieGuo.rows[0].发送者).toBe('jiaose')
    expect(xiaoXiJieGuo.rows[0].内容).toBe('嗨')
    expect(xiaoXiJieGuo.rows[1].发送者).toBe('jiaose')
    expect(xiaoXiJieGuo.rows[1].内容).toBe('今天天气不错')
  })

  it('内向+慢热角色确认后不发送开场白消息', async () => {
    sheZhiKaiChangBaiMock(() => ({ xiao_xi_lie_biao: [] }))

    const shengChengXiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'INFJ' })
      .expect(200)

    const jiaoSe = shengChengXiangYing.body.shu_ju
    const queRenXiangYing = await request(yingYong)
      .post('/api/生成角色/确认')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ xuanZhongJiaoSe: jiaoSe })
      .expect(200)

    const jiaoSeId = String(queRenXiangYing.body.shu_ju.id)
    const xiaoXiJieGuo = await 数据库.query(
      `SELECT COUNT(*) as shu_liang FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
      [ceShiYongHuId, jiaoSeId],
    )
    expect(Number(xiaoXiJieGuo.rows[0].shu_liang)).toBe(0)
  })

  it('开场白内容不超过 5 条且不包含个人信息', async () => {
    sheZhiKaiChangBaiMock(() => ({
      xiao_xi_lie_biao: ['嗨', '哈喽', '在吗', '今天有点无聊', '你的头像挺有意思'],
    }))

    const shengChengXiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'ESFP' })
      .expect(200)

    const jiaoSe = shengChengXiangYing.body.shu_ju
    const queRenXiangYing = await request(yingYong)
      .post('/api/生成角色/确认')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ xuanZhongJiaoSe: jiaoSe })
      .expect(200)

    const jiaoSeId = String(queRenXiangYing.body.shu_ju.id)
    const xiaoXiJieGuo = await 数据库.query(
      `SELECT "内容" FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2 ORDER BY "创建时间" ASC`,
      [ceShiYongHuId, jiaoSeId],
    )
    expect(xiaoXiJieGuo.rows.length).toBeLessThanOrEqual(5)
    for (const xiaoXi of xiaoXiJieGuo.rows) {
      expect(String(xiaoXi.内容)).not.toMatch(/我叫|我是|来自|家乡|学校|大学|学院|专业|年级|班级|学号/)
    }
  })

  it('确认角色后写入角色表和好感度表', async () => {
    sheZhiKaiChangBaiMock(() => ({ xiao_xi_lie_biao: [] }))

    const shengChengXiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'ESFP' })
      .expect(200)

    const jiaoSe = shengChengXiangYing.body.shu_ju
    const queRenXiangYing = await request(yingYong)
      .post('/api/生成角色/确认')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ xuanZhongJiaoSe: jiaoSe })
      .expect(200)

    expect(queRenXiangYing.body.cheng_gong).toBe(true)
    expect(queRenXiangYing.body.shu_ju.id).toBeTruthy()

    const jiaoSeId = queRenXiangYing.body.shu_ju.id
    const jiaoSeChaXun = await 数据库.query(`SELECT * FROM "角色" WHERE "ID" = $1`, [jiaoSeId])
    expect(jiaoSeChaXun.rows.length).toBe(1)
    expect(String(jiaoSeChaXun.rows[0].MBTI)).toBe('ESFP')

    const haoGanDuChaXun = await 数据库.query(`SELECT * FROM "好感度" WHERE "角色ID" = $1`, [jiaoSeId])
    expect(haoGanDuChaXun.rows.length).toBe(1)
    expect(haoGanDuChaXun.rows[0].总分).toBe(jiaoSe.hao_gan_du_zong_fen)

    await qingLiJiaoSeHeYongHu(ceShiYongHuId)
  })

  it('未登录请求生成角色 → 返回401', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .send({ 性别: 'nan' })
      .expect(401)

    expect(xiangYing.body.cheng_gong).toBe(false)
  })
})
