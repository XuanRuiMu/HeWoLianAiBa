import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { panDuanKeJian, shiHeFaKeJianXing } from '../services/可见性'
import { sheZhiMockTiaoYong, chongZhiDeepSeekKeHuDuan } from '../utils/DeepSeek客户端'

function suiJiShouJiHao(): string {
  return `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

async function chuangJianCeShiYongHu(): Promise<{ shouJiHao: string; lingPai: string; yongHuId: string }> {
  const shouJiHao = suiJiShouJiHao()
  await request(yingYong).post('/api/认证/发送码').send({ shouJiHao }).expect(200)
  const zhuCe = await request(yingYong)
    .post('/api/认证/注册')
    .send({
      shouJiHao,
      yanZhengMa: '123456',
      yongHuMing: `资料测试${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      miMa: 'testPassword123',
      tongYiXieYi: true,
      chuShengRiQi: '2000-01-01',
    })
    .expect(200)
  const chaXun = await 数据库.query(`SELECT "ID" FROM "用户" WHERE "手机号" = $1 LIMIT 1`, [shouJiHao])
  return { shouJiHao, lingPai: zhuCe.body.shu_ju.令牌, yongHuId: String(chaXun.rows[0]['ID']) }
}

async function qingLiCeShiYongHu(yongHuId: string): Promise<void> {
  if (!yongHuId) return
  await 数据库.query(`DELETE FROM "好友消息" WHERE "发送者ID" = $1 OR "接收者ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "好友申请" WHERE "申请者ID" = $1 OR "接收者ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "用户设置" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [yongHuId])
}

/** 1×1 透明 PNG（头像上传用最小合法图片） */
const YI_XIANG_SU_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

describe('可见性“类”判定', () => {
  it('五值枚举校验', () => {
    for (const zhi of ['gong_kai', 'jin_hao_you', 'jin_bu_fen_ren', 'bu_ke_jian', 'jin_zi_ji']) {
      expect(shiHeFaKeJianXing(zhi)).toBe(true)
    }
    expect(shiHeFaKeJianXing('')).toBe(false)
    expect(shiHeFaKeJianXing('quan_bu')).toBe(false)
    expect(shiHeFaKeJianXing(null)).toBe(false)
  })

  it('本人规则：除不可见外均可见', () => {
    const wen = { chaKanZheId: 'a', yongYouZheId: 'a', shiHaoYou: false, baiMingDan: [] as string[] }
    expect(panDuanKeJian('gong_kai', wen)).toBe(true)
    expect(panDuanKeJian('jin_hao_you', wen)).toBe(true)
    expect(panDuanKeJian('jin_bu_fen_ren', wen)).toBe(true)
    expect(panDuanKeJian('jin_zi_ji', wen)).toBe(true)
    expect(panDuanKeJian('bu_ke_jian', wen)).toBe(false)
  })

  it('他人规则矩阵', () => {
    const jiChu = { chaKanZheId: 'b', yongYouZheId: 'a', baiMingDan: ['b'] }
    expect(panDuanKeJian('gong_kai', { ...jiChu, shiHaoYou: false, baiMingDan: [] })).toBe(true)
    expect(panDuanKeJian('jin_hao_you', { ...jiChu, shiHaoYou: true, baiMingDan: [] })).toBe(true)
    expect(panDuanKeJian('jin_hao_you', { ...jiChu, shiHaoYou: false, baiMingDan: [] })).toBe(false)
    expect(panDuanKeJian('jin_bu_fen_ren', { ...jiChu, shiHaoYou: false })).toBe(true)
    expect(panDuanKeJian('jin_bu_fen_ren', { ...jiChu, shiHaoYou: false, baiMingDan: ['c'] })).toBe(false)
    expect(panDuanKeJian('bu_ke_jian', { ...jiChu, shiHaoYou: true })).toBe(false)
    expect(panDuanKeJian('jin_zi_ji', { ...jiChu, shiHaoYou: true })).toBe(false)
    expect(panDuanKeJian('gong_kai', { chaKanZheId: null, yongYouZheId: 'a', shiHaoYou: false, baiMingDan: [] })).toBe(true)
  })
})

describe('资料接口：签名与名片', () => {
  let a = { shouJiHao: '', lingPai: '', yongHuId: '' }
  let b = { shouJiHao: '', lingPai: '', yongHuId: '' }

  beforeAll(async () => {
    for (const wenJian of ['001_haoyou_yu_shezhi.sql', 'migrations/014_头像签名与可见性.sql']) {
      const sql = fs.readFileSync(path.resolve(__dirname, '../../database', wenJian), 'utf-8')
      await 数据库.query(sql)
    }
    a = await chuangJianCeShiYongHu()
    b = await chuangJianCeShiYongHu()
  }, 90000)

  afterAll(async () => {
    await qingLiCeShiYongHu(a.yongHuId)
    await qingLiCeShiYongHu(b.yongHuId)
  })

  beforeEach(() => {
    chongZhiDeepSeekKeHuDuan()
    sheZhiMockTiaoYong(async () => ({
      neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {} as never,
    }))
  })

  afterEach(() => {
    sheZhiMockTiaoYong(null)
  })

  it('签名保存与长度校验', async () => {
    await request(yingYong).put('/api/资料/签名').set('Authorization', `Bearer ${a.lingPai}`).send({ qianMing: '热爱生活，认真恋爱', keJianXing: 'gong_kai' }).expect(200)
    await request(yingYong).put('/api/资料/签名').set('Authorization', `Bearer ${a.lingPai}`).send({ qianMing: 'x'.repeat(501) }).expect(400)
    await request(yingYong).put('/api/资料/签名').set('Authorization', `Bearer ${a.lingPai}`).send({ qianMing: 'ok', keJianXing: 'buCunZai' }).expect(400)
    await request(yingYong).put('/api/资料/签名').send({ qianMing: 'ok' }).expect(401)
  })

  it('名片可见性：公开→好友→白名单→私密', async () => {
    await request(yingYong).put('/api/资料/签名').set('Authorization', `Bearer ${a.lingPai}`).send({ qianMing: '公开签名', keJianXing: 'gong_kai' }).expect(200)
    const gongKai = await request(yingYong).get(`/api/资料/名片/${a.yongHuId}`).set('Authorization', `Bearer ${b.lingPai}`).expect(200)
    expect(gongKai.body.shu_ju.qian_ming).toBe('公开签名')
    expect(gongKai.body.shu_ju.shou_ji_hao).toBeUndefined()

    await request(yingYong).put('/api/资料/签名').set('Authorization', `Bearer ${a.lingPai}`).send({ qianMing: '好友可见', keJianXing: 'jin_hao_you' }).expect(200)
    const moSheng = await request(yingYong).get(`/api/资料/名片/${a.yongHuId}`).set('Authorization', `Bearer ${b.lingPai}`).expect(200)
    expect(moSheng.body.shu_ju.qian_ming).toBeNull()

    await request(yingYong).post('/api/好友/申请').set('Authorization', `Bearer ${a.lingPai}`).send({ jieShouZheId: b.yongHuId }).expect(200)
    const shouDao = await request(yingYong).get('/api/好友/申请/收到的').set('Authorization', `Bearer ${b.lingPai}`).expect(200)
    await request(yingYong).post(`/api/好友/申请/${String(shouDao.body.shu_ju.lie_biao[0].id)}/接受`).set('Authorization', `Bearer ${b.lingPai}`).expect(200)
    const haoYou = await request(yingYong).get(`/api/资料/名片/${a.yongHuId}`).set('Authorization', `Bearer ${b.lingPai}`).expect(200)
    expect(haoYou.body.shu_ju.qian_ming).toBe('好友可见')
    expect(haoYou.body.shu_ju.shi_hao_you).toBe(true)

    await request(yingYong).put('/api/资料/签名').set('Authorization', `Bearer ${a.lingPai}`).send({ qianMing: '私密签名', keJianXing: 'jin_zi_ji' }).expect(200)
    const siMiTaRen = await request(yingYong).get(`/api/资料/名片/${a.yongHuId}`).set('Authorization', `Bearer ${b.lingPai}`).expect(200)
    expect(siMiTaRen.body.shu_ju.qian_ming).toBeNull()
    const siMiZiJi = await request(yingYong).get(`/api/资料/名片/${a.yongHuId}`).set('Authorization', `Bearer ${a.lingPai}`).expect(200)
    expect(siMiZiJi.body.shu_ju.qian_ming).toBe('私密签名')

    await request(yingYong).put('/api/资料/签名').set('Authorization', `Bearer ${a.lingPai}`).send({ qianMing: '部分可见', keJianXing: 'jin_bu_fen_ren', baiMingDan: [b.yongHuId] }).expect(200)
    const buFen = await request(yingYong).get(`/api/资料/名片/${a.yongHuId}`).set('Authorization', `Bearer ${b.lingPai}`).expect(200)
    expect(buFen.body.shu_ju.qian_ming).toBe('部分可见')
  })

  it('头像上传：格式校验与成功链路', async () => {
    await request(yingYong).post('/api/资料/头像').set('Authorization', `Bearer ${a.lingPai}`).expect(400)
    await request(yingYong)
      .post('/api/资料/头像')
      .set('Authorization', `Bearer ${a.lingPai}`)
      .attach('file', Buffer.from('buShiTuPian'), { filename: 'e.txt', contentType: 'text/plain' })
      .expect(400)
    const shangChuan = await request(yingYong)
      .post('/api/资料/头像')
      .set('Authorization', `Bearer ${a.lingPai}`)
      .attach('file', YI_XIANG_SU_PNG, { filename: 'touxiang.png', contentType: 'image/png' })
      .expect(200)
    expect(String(shangChuan.body.shu_ju.tou_xiang)).toContain('/api/媒体/')
    const mingPian = await request(yingYong).get(`/api/资料/名片/${a.yongHuId}`).set('Authorization', `Bearer ${b.lingPai}`).expect(200)
    expect(mingPian.body.shu_ju.tou_xiang).toBe(String(shangChuan.body.shu_ju.tou_xiang))
  })
})
