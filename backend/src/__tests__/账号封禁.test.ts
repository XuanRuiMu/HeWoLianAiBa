import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import {
  jiSuanZhangHaoFengJinShiChang,
  chaXunZhangHaoFengJin,
  jiLuZhangHaoWeiGui,
  cheHuiWeiGuiXiaoXi,
  tiJiaoShenSu,
  shenHeShenSu,
  jieChuZhangHaoFengJin,
} from '../services/账号封禁'
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
      yongHuMing: `封禁测试${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
  await 数据库.query(`DELETE FROM "账号封禁" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "好友消息" WHERE "发送者ID" = $1 OR "接收者ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "好友申请" WHERE "申请者ID" = $1 OR "接收者ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "用户设置" WHERE "用户ID" = $1`, [yongHuId])
  await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [yongHuId])
}

function mockShenHeTongGuo(): void {
  sheZhiMockTiaoYong(async () => ({
    neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 严重程度: '', 理由: '' }),
    xinXi: { role: 'assistant', content: '' },
    yuanShuJu: {} as never,
  }))
}

function mockShenHeWeiGui(): void {
  sheZhiMockTiaoYong(async () => ({
    neiRong: JSON.stringify({ 违规: true, 确信度: 0.95, 类型: '涉政有害', 严重程度: '严重', 理由: '测试违规' }),
    xinXi: { role: 'assistant', content: '' },
    yuanShuJu: {} as never,
  }))
}

describe('账号封禁三级时长', () => {
  it('第1次1分钟、第2次1天、第3次及以上永封', () => {
    expect(jiSuanZhangHaoFengJinShiChang(1)).toBe(60 * 1000)
    expect(jiSuanZhangHaoFengJinShiChang(2)).toBe(24 * 60 * 60 * 1000)
    expect(jiSuanZhangHaoFengJinShiChang(3)).toBe(-1)
    expect(jiSuanZhangHaoFengJinShiChang(9)).toBe(-1)
    expect(jiSuanZhangHaoFengJinShiChang(0)).toBeUndefined()
  })
})

describe('账号封禁全链路', () => {
  const yongHu: Array<{ shouJiHao: string; lingPai: string; yongHuId: string }> = []

  beforeAll(async () => {
    for (const wenJian of ['001_haoyou_yu_shezhi.sql', 'migrations/014_头像签名与可见性.sql', 'migrations/015_账号封禁与申诉.sql']) {
      const sql = fs.readFileSync(path.resolve(__dirname, '../../database', wenJian), 'utf-8')
      await 数据库.query(sql)
    }
    for (let i = 0; i < 4; i++) yongHu.push(await chuangJianCeShiYongHu())
  }, 120000)

  afterAll(async () => {
    for (const u of yongHu) await qingLiCeShiYongHu(u.yongHuId)
  })

  beforeEach(() => {
    chongZhiDeepSeekKeHuDuan()
    mockShenHeTongGuo()
  })

  afterEach(() => {
    sheZhiMockTiaoYong(null)
  })

  it('三级升级：1分钟→1天→永封', async () => {
    const u = yongHu[0]
    const di1 = await jiLuZhangHaoWeiGui({ yongHuId: u.yongHuId, ip: '127.0.0.1', yuanYin: '测试1', leiXing: '测试' })
    expect(di1.ciShu).toBe(1)
    expect(di1.jiBie).toBe('feng_jin_1_fen')
    expect(di1.jieFengShiJian).not.toBeNull()
    expect((await chaXunZhangHaoFengJin(u.yongHuId)).beiFengJin).toBe(true)

    const di2 = await jiLuZhangHaoWeiGui({ yongHuId: u.yongHuId, ip: '127.0.0.1', yuanYin: '测试2', leiXing: '测试' })
    expect(di2.ciShu).toBe(2)
    expect(di2.jiBie).toBe('feng_jin_1_tian')

    const di3 = await jiLuZhangHaoWeiGui({ yongHuId: u.yongHuId, ip: '127.0.0.1', yuanYin: '测试3', leiXing: '测试' })
    expect(di3.ciShu).toBe(3)
    expect(di3.jiBie).toBe('yong_feng')
    expect(di3.jieFengShiJian).toBeNull()
    const zhuangTai = await chaXunZhangHaoFengJin(u.yongHuId)
    expect(zhuangTai.beiFengJin).toBe(true)
    expect(zhuangTai.jiBie).toBe('yong_feng')
  })

  it('好友消息：封禁中403、解封后恢复', async () => {
    const a = yongHu[1]
    const b = yongHu[2]
    await request(yingYong).post('/api/好友/申请').set('Authorization', `Bearer ${a.lingPai}`).send({ jieShouZheId: b.yongHuId }).expect(200)
    const shouDao = await request(yingYong).get('/api/好友/申请/收到的').set('Authorization', `Bearer ${b.lingPai}`).expect(200)
    await request(yingYong).post(`/api/好友/申请/${String(shouDao.body.shu_ju.lie_biao[0].id)}/接受`).set('Authorization', `Bearer ${b.lingPai}`).expect(200)

    await jiLuZhangHaoWeiGui({ yongHuId: a.yongHuId, ip: '127.0.0.1', yuanYin: '测试封禁', leiXing: '测试' })
    await request(yingYong)
      .post('/api/好友/消息')
      .set('Authorization', `Bearer ${a.lingPai}`)
      .send({ jieShouZheId: b.yongHuId, neiRong: '你好', leiXing: 'wenben' })
      .expect(403)

    await jieChuZhangHaoFengJin('guan-li-yuan-ce-shi', a.yongHuId, '127.0.0.1')
    await request(yingYong)
      .post('/api/好友/消息')
      .set('Authorization', `Bearer ${a.lingPai}`)
      .send({ jieShouZheId: b.yongHuId, neiRong: '你好', leiXing: 'wenben' })
      .expect(200)
  })

  it('签名违规被拦截并计数', async () => {
    const u = yongHu[3]
    mockShenHeWeiGui()
    await request(yingYong)
      .put('/api/资料/签名')
      .set('Authorization', `Bearer ${u.lingPai}`)
      .send({ qianMing: '违规签名测试', keJianXing: 'gong_kai' })
      .expect(403)
    const hang = await 数据库.query(`SELECT "违规次数" FROM "账号封禁" WHERE "用户ID" = $1 LIMIT 1`, [u.yongHuId])
    expect(Number(hang.rows[0]?.['违规次数'] || 0)).toBeGreaterThanOrEqual(1)
    expect((await chaXunZhangHaoFengJin(u.yongHuId)).beiFengJin).toBe(true)
  })

  it('违规好友消息可撤回', async () => {
    const a = yongHu[1]
    const b = yongHu[2]
    const faSong = await request(yingYong)
      .post('/api/好友/消息')
      .set('Authorization', `Bearer ${a.lingPai}`)
      .send({ jieShouZheId: b.yongHuId, neiRong: '待撤回', leiXing: 'wenben' })
      .expect(200)
    expect(await cheHuiWeiGuiXiaoXi('haoYou', String(faSong.body.shu_ju.id))).toBe(true)
    expect(await cheHuiWeiGuiXiaoXi('haoYou', String(faSong.body.shu_ju.id))).toBe(false)
  })

  it('申诉：提交→通过→清零恢复', async () => {
    const u = yongHu[0]
    const shenSu = await request(yingYong)
      .post('/api/资料/申诉')
      .set('Authorization', `Bearer ${u.lingPai}`)
      .send({ liYou: '我是被误判的' })
      .expect(200)
    expect(shenSu.body.cheng_gong).toBe(true)
    const zhuangTai = await request(yingYong).get('/api/资料/封禁状态').set('Authorization', `Bearer ${u.lingPai}`).expect(200)
    expect(zhuangTai.body.shu_ju.bei_feng_jin).toBe(true)
    expect(zhuangTai.body.shu_ju.shen_su_zhuang_tai).toBe('shen_su_zhong')

    await shenHeShenSu('guan-li-yuan-ce-shi', u.yongHuId, true, '127.0.0.1')
    const huiFu = await chaXunZhangHaoFengJin(u.yongHuId)
    expect(huiFu.beiFengJin).toBe(false)
    expect(huiFu.weiGuiCiShu).toBe(0)
  })

  it('申诉：未封禁用户提交被拒', async () => {
    const t = await tiJiaoShenSu(yongHu[2].yongHuId, '无辜')
    expect(t.cheng_gong).toBe(false)
  })
})
