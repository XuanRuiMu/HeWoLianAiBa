import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuNiChengKu } from '../utils/昵称解析'
import { mbtiLieBiao, shenFenLieBiao, shenFenPeiZhi } from '../config/角色配置'
import { sheZhiKaiChangBaiMock } from '../services/开场白生成'
import {
  congTongYongTiShiCiTiQuRenShe,
  heBingMingQueYuTiQu,
  congTongYongTiShiCiTuiCeXingGe,
  shengChengJiaoSe,
} from '../services/角色生成'
import { gouJianWriterPrompt } from '../services/Prompt构建器'
import type { AIJiaoSeXinXi } from '../types'

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
      chuShengRiQi: '2000-01-01',
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
    const shenFenNianLing: Record<string, number[]> = Object.fromEntries(
      shenFenLieBiao.map((shenFen) => [shenFen, []]),
    )

    for (let i = 0; i < 50; i++) {
      const xiangYing = await request(yingYong)
        .post('/api/生成角色/MBTI生成')
        .set('Authorization', `Bearer ${lingPai}`)
        .send({ 性别: 'nv' })
      const shuJu = xiangYing.body.shu_ju
      expect(shenFenLieBiao).toContain(shuJu.shen_fen)
      shenFenNianLing[shuJu.shen_fen].push(shuJu.nian_ling)
    }

    for (const [shenFen, nianLingLieBiao] of Object.entries(shenFenNianLing)) {
      expect(nianLingLieBiao.length).toBeGreaterThan(0)
      const peiZhi = shenFenPeiZhi.find((xiang) => xiang.leiXing === shenFen)
      expect(peiZhi).toBeDefined()
      for (const nianLing of nianLingLieBiao) {
        expect(nianLing).toBeGreaterThanOrEqual(peiZhi!.nianLingFanWei[0])
        expect(nianLing).toBeLessThanOrEqual(peiZhi!.nianLingFanWei[1])
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

  it('mock 返回空数组时确认后不保存开场白消息（AI 决策不发，含 I 型）', async () => {
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

  it('I 型角色 mock 返回消息时也会被保存（AI 决策路径被实际调用，不再被 E/I 拦截）', async () => {
    // 新行为：是否发送由 AI/mock 决策，I 型不再被外层硬拦截
    sheZhiKaiChangBaiMock(() => ({ xiao_xi_lie_biao: ['嗨', '你好呀', '在吗'] }))

    const shengChengXiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'INFJ' })
      .expect(200)

    const jiaoSe = shengChengXiangYing.body.shu_ju
    expect(jiaoSe.ie_lei_xing).toBe('I')

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
    expect(Number(xiaoXiJieGuo.rows[0].shu_liang)).toBe(3)
  })

  it('mock 返回 3 条时全部保存（AI 决策路径，不按 E/I 截断）', async () => {
    // ENFJ: E + 慢热；新逻辑下条数完全由 mock/AI 决定，mock 返回 3 条即保存 3 条
    sheZhiKaiChangBaiMock(() => ({ xiao_xi_lie_biao: ['嗨', '在吗', '今天好热'] }))

    const shengChengXiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nan', mbti类型: 'ENFJ' })
      .expect(200)

    const jiaoSe = shengChengXiangYing.body.shu_ju
    expect(jiaoSe.ie_lei_xing).toBe('E')
    expect(jiaoSe.re_shen_lei_xing).toBe('慢热')

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
    expect(xiaoXiJieGuo.rows.length).toBe(3)
  })

  it('mock 返回 5 条时按 5 条上限截断保存', async () => {
    // 开场白统一 5 条上限，不再按 E/I 规则截断为 3 条
    sheZhiKaiChangBaiMock(() => ({
      xiao_xi_lie_biao: ['嗨', '在吗', '今天好热', '吃了吗', '干嘛呢'],
    }))

    const shengChengXiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'ENFJ' })
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
    expect(Number(xiaoXiJieGuo.rows[0].shu_liang)).toBe(5)
  })

  it('渣型变体 mock 返回 6 条时按 5 条上限截断', async () => {
    // 开场白统一 5 条上限；mock 返回 6 条，应被截断为 5 条
    sheZhiKaiChangBaiMock(() => ({
      xiao_xi_lie_biao: ['嗨', '哈喽', '在吗', '今天好热', '吃了吗', '干嘛呢'],
    }))

    const shengChengXiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'ESFP', 渣男渣女变体: true })
      .expect(200)

    const jiaoSe = shengChengXiangYing.body.shu_ju
    expect(jiaoSe.shi_fou_zha_xing).toBe(true)

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
    expect(Number(xiaoXiJieGuo.rows[0].shu_liang)).toBeLessThanOrEqual(5)
  })

  it('开场消息包含角色真实姓名时该条被过滤', async () => {
    // mock 返回的消息中包含角色真实姓名，应被 anQuanGuoLvXiaoXi 过滤
    sheZhiKaiChangBaiMock((canShu) => ({
      xiao_xi_lie_biao: ['嗨', canShu.ming_zi, '你好'],
    }))

    const shengChengXiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'ENFP' })
      .expect(200)

    const jiaoSe = shengChengXiangYing.body.shu_ju
    const mingZi = jiaoSe.ming_zi
    expect(mingZi).toBeTruthy()

    const queRenXiangYing = await request(yingYong)
      .post('/api/生成角色/确认')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ xuanZhongJiaoSe: jiaoSe })
      .expect(200)

    const jiaoSeId = String(queRenXiangYing.body.shu_ju.id)
    const xiaoXiJieGuo = await 数据库.query(
      `SELECT "内容" FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
      [ceShiYongHuId, jiaoSeId],
    )
    for (const xiaoXi of xiaoXiJieGuo.rows) {
      expect(String(xiaoXi.内容)).not.toContain(mingZi)
    }
  })

  it('开场消息包含手机号时该条被过滤', async () => {
    // mock 返回包含 11 位手机号的消息，应被 SHOU_JI_HAO_RE 过滤
    sheZhiKaiChangBaiMock(() => ({
      xiao_xi_lie_biao: ['嗨', '我的电话 13812345678', '你好'],
    }))

    const shengChengXiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nan', mbti类型: 'ENTP' })
      .expect(200)

    const jiaoSe = shengChengXiangYing.body.shu_ju
    const queRenXiangYing = await request(yingYong)
      .post('/api/生成角色/确认')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ xuanZhongJiaoSe: jiaoSe })
      .expect(200)

    const jiaoSeId = String(queRenXiangYing.body.shu_ju.id)
    const xiaoXiJieGuo = await 数据库.query(
      `SELECT "内容" FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
      [ceShiYongHuId, jiaoSeId],
    )
    for (const xiaoXi of xiaoXiJieGuo.rows) {
      expect(String(xiaoXi.内容)).not.toMatch(/1[3-9]\d{9}/)
    }
  })

  it('开场消息包含微信号 token 时该条被过滤', async () => {
    // mock 返回包含微信号格式 token 的消息，应被 WEI_XIN_HAO_RE 过滤
    sheZhiKaiChangBaiMock(() => ({
      xiao_xi_lie_biao: ['嗨', 'abc123456', '你好'],
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
      `SELECT "内容" FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2`,
      [ceShiYongHuId, jiaoSeId],
    )
    for (const xiaoXi of xiaoXiJieGuo.rows) {
      expect(String(xiaoXi.内容)).not.toBe('abc123456')
    }
  })

  it('生成结果包含回复延迟毫秒且在 8000~12000 区间', async () => {
    for (const mbti of ['INTJ', 'ESFP']) {
      const xiangYing = await request(yingYong)
        .post('/api/生成角色/MBTI生成')
        .set('Authorization', `Bearer ${lingPai}`)
        .send({ 性别: 'nv', mbti类型: mbti })
        .expect(200)

      const yanChi = xiangYing.body.shu_ju.hui_fu_yan_chi_hao_miao
      expect(Number.isInteger(yanChi)).toBe(true)
      expect(yanChi).toBeGreaterThanOrEqual(8000)
      expect(yanChi).toBeLessThanOrEqual(12000)
    }
  })

  it('确认角色后回复延迟毫秒按生成值落库且详情可读回', async () => {
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

    const jiaoSeId = String(queRenXiangYing.body.shu_ju.id)
    const luoKuJieGuo = await 数据库.query(
      `SELECT "回复延迟毫秒" FROM "角色" WHERE "ID" = $1`,
      [jiaoSeId],
    )
    expect(luoKuJieGuo.rows.length).toBe(1)
    expect(Number(luoKuJieGuo.rows[0].回复延迟毫秒)).toBe(jiaoSe.hui_fu_yan_chi_hao_miao)
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

  it('心目中的TA：三框加提示词覆盖随机生成', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({
        性别: 'nv',
        mbti类型: 'ENFP',
        xinMuZhongDeTa: {
          wei_xin_ming: '柠檬味的风',
          zhen_shi_ming: '林晚晚',
          nian_ling: 21,
          tong_yong_ti_shi_ci: '杭州的临床医学大学生',
        },
      })
      .expect(200)

    const jiaoSe = xiangYing.body.shu_ju
    expect(jiaoSe.wei_xin_ming).toBe('柠檬味的风')
    expect(jiaoSe.ming_zi).toBe('林晚晚')
    expect(jiaoSe.zhen_shi_ming).toBe('林晚晚')
    expect(jiaoSe.nian_ling).toBe(21)
    expect(jiaoSe.bei_jing_gu_shi).toContain('林晚晚')
    expect(jiaoSe.bei_jing_gu_shi).toContain('杭州')
  })

  it('心目中的TA：输入框与提示词冲突时输入框优先', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({
        性别: 'nv',
        mbti类型: 'ENFP',
        xinMuZhongDeTa: {
          nian_ling: 30,
          tong_yong_ti_shi_ci: '25岁杭州大学生',
        },
      })
      .expect(200)

    expect(xiangYing.body.shu_ju.nian_ling).toBe(30)
    expect(xiangYing.body.shu_ju.bei_jing_gu_shi).toContain('杭州')
  })

  it('心目中的TA：仅提示词无输入框时缺失项随机补充且不报错', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({
        性别: 'nv',
        mbti类型: 'ENFP',
        xinMuZhongDeTa: { tong_yong_ti_shi_ci: '喜欢打篮球的开朗同学' },
      })
      .expect(200)

    const jiaoSe = xiangYing.body.shu_ju
    expect(jiaoSe.wei_xin_ming).toBeTruthy()
    expect(jiaoSe.ming_zi).toBeTruthy()
    expect(jiaoSe.nian_ling).toBeGreaterThanOrEqual(0)
    expect(jiaoSe.nian_ling).toBeLessThanOrEqual(100)
    expect(jiaoSe.bei_jing_gu_shi).toContain('喜欢打篮球的开朗同学')
  })

  it('心目中的TA：提示词提取城市与身份', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({
        性别: 'nan',
        mbti类型: 'ISTJ',
        xinMuZhongDeTa: { tong_yong_ti_shi_ci: '成都的自由职业摄影师' },
      })
      .expect(200)

    const jiaoSe = xiangYing.body.shu_ju
    expect(jiaoSe.shen_fen).toBe('自由职业')
    expect(jiaoSe.ba_da_mo_kuai.ji_ben_xin_xi).toContain('成都')
  })

  it('心目中的TA：年龄17在0-100范围内可通过', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', xinMuZhongDeTa: { nian_ling: 17 } })
      .expect(200)

    expect(xiangYing.body.shu_ju.nian_ling).toBe(17)
  })

  it('心目中的TA：年龄越界（101）→ 归一为100', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', xinMuZhongDeTa: { nian_ling: 101 } })
      .expect(200)

    expect(xiangYing.body.shu_ju.nian_ling).toBe(100)
  })

  it('心目中的TA：年龄越界（负数）→ 归一为0', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', xinMuZhongDeTa: { nian_ling: -1 } })
      .expect(200)

    expect(xiangYing.body.shu_ju.nian_ling).toBe(0)
  })

  it('心目中的TA：年龄非整数（21.5）→ 四舍五入为22', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', xinMuZhongDeTa: { nian_ling: 21.5 } })
      .expect(200)

    expect(xiangYing.body.shu_ju.nian_ling).toBe(22)
  })

  it('心目中的TA：旧身份职业城市家乡字段已删，传入后被忽略不报错', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({
        性别: 'nv',
        mbti类型: 'ENFP',
        xinMuZhongDeTa: {
          wei_xin_ming: '柠檬味的风',
          shen_fen: '宇航员',
          zhi_ye: '临床医学',
          cheng_shi: '杭州',
          jia_xiang: '成都',
        },
      })
      .expect(200)

    expect(xiangYing.body.shu_ju.wei_xin_ming).toBe('柠檬味的风')
    expect(shenFenLieBiao).toContain(xiangYing.body.shu_ju.shen_fen)
  })

  it('心目中的TA：通用提示词超长 → 返回400', async () => {
    await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', xinMuZhongDeTa: { tong_yong_ti_shi_ci: '超'.repeat(501) } })
      .expect(400)
  })

  it('心目中的TA：微信名超长 → 返回400', async () => {
    await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', xinMuZhongDeTa: { wei_xin_ming: '超'.repeat(31) } })
      .expect(400)
  })

  it('心目中的TA：空对象 → 正常生成不受影响', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', mbti类型: 'INFP', xinMuZhongDeTa: {} })
      .expect(200)

    expect(xiangYing.body.cheng_gong).toBe(true)
    expect(xiangYing.body.shu_ju.wei_xin_ming).toBeTruthy()
  })

  it('提示词提取：年龄数字加岁数可提取且越界不提取', () => {
    expect(congTongYongTiShiCiTiQuRenShe('25岁杭州大学生').nian_ling).toBe(25)
    expect(congTongYongTiShiCiTiQuRenShe('128岁').nian_ling).toBeUndefined()
    expect(congTongYongTiShiCiTiQuRenShe('').nian_ling).toBeUndefined()
  })

  it('提示词提取：城市与身份关键词可提取', () => {
    const tiQu = congTongYongTiShiCiTiQuRenShe('成都的自由职业摄影师')
    expect(tiQu.cheng_shi).toBe('成都')
    expect(tiQu.shen_fen).toBe('自由职业')
    expect(tiQu.zhi_ye).toBe('摄影')
  })

  it('合并规则：输入框年龄优先于提示词提取年龄', () => {
    const heBing = heBingMingQueYuTiQu(
      { nian_ling: 30 },
      congTongYongTiShiCiTiQuRenShe('25岁杭州大学生'),
    )
    expect(heBing.nian_ling).toBe(30)
    expect(heBing.cheng_shi).toBe('杭州')
    expect(heBing.shen_fen).toBe('大学生')
  })

  it('性格推测：空串与无关键词返回null走纯随机', () => {
    expect(congTongYongTiShiCiTuiCeXingGe('')).toBeNull()
    expect(congTongYongTiShiCiTuiCeXingGe('今天天气不错')).toBeNull()
  })

  it('性格推测：热情开朗想象温柔随性指向ENFP', () => {
    expect(
      congTongYongTiShiCiTuiCeXingGe('热情开朗喜欢交朋友，脑洞大有想象力，温柔体贴爱笑，随性自由爱冒险'),
    ).toBe('ENFP')
  })

  it('性格推测：内向务实理性计划指向ISTJ', () => {
    expect(
      congTongYongTiShiCiTuiCeXingGe('内向安静喜欢独处，务实踏实靠谱，理性冷静讲逻辑，计划自律守时'),
    ).toBe('ISTJ')
  })

  it('性格推测：单轴平票按默认字母兼顾', () => {
    expect(congTongYongTiShiCiTuiCeXingGe('外向但也内向')).toBe('INFP')
  })

  it('心目中的TA：随机性格按通用提示词选最接近性格', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({
        性别: 'nv',
        随机性格: true,
        xinMuZhongDeTa: {
          tong_yong_ti_shi_ci: '热情开朗喜欢交朋友，脑洞大有想象力，温柔体贴爱笑，随性自由爱冒险',
        },
      })
      .expect(200)

    expect(xiangYing.body.shu_ju.mbti_lei_xing).toBe('ENFP')
  })

  it('心目中的TA：随机性格无通用提示词时仍随机生成', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ 性别: 'nv', 随机性格: true })
      .expect(200)

    expect(mbtiLieBiao).toContain(xiangYing.body.shu_ju.mbti_lei_xing)
  })

  it('心目中的TA：已选性格与通用提示词冲突时保留选择并兼顾描述', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/生成角色/MBTI生成')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({
        性别: 'nv',
        mbti类型: 'INFP',
        xinMuZhongDeTa: { tong_yong_ti_shi_ci: '果断自信目标明确雷厉风行' },
      })
      .expect(200)

    expect(xiangYing.body.shu_ju.mbti_lei_xing).toBe('INFP')
    expect(xiangYing.body.shu_ju.bei_jing_gu_shi).toContain('果断自信目标明确雷厉风行')
  })

  it('Prompt构建器：通用提示词兼顾进角色Prompt', () => {
    const jiaoSe = shengChengJiaoSe({
      yong_hu_id: 'ce_shi_yong_hu',
      xing_bie: 'nan',
      mu_biao_xing_bie: 'nv',
      mbti_lei_xing: 'INFP',
      xin_mu_zhong_de_ta: { tong_yong_ti_shi_ci: '开朗爱笑，喜欢看电影' },
    })
    expect(jiaoSe.mbti_lei_xing).toBe('INFP')
    const tiShi = gouJianWriterPrompt({
      yong_hu_id: 'ce_shi_yong_hu',
      jiao_se_id: 'ce_shi_jiao_se',
      jiao_se: jiaoSe as unknown as AIJiaoSeXinXi,
      hao_gan_du: {
        xin_ren_du: 10,
        qin_mi_du: 10,
        qu_wei_du: 10,
        guan_huai_du: 10,
        zong_fen: 40,
        guan_xi_jie_duan: 'lengDan',
      },
      dui_hua_li_shi: [],
      yong_hu_xin_xiao_xi: '嗨',
      shi_fou_di_yi_lun: true,
      tu_pian_shou_quan: false,
    })
    expect(tiShi).toContain('开朗爱笑，喜欢看电影')
  })
})
