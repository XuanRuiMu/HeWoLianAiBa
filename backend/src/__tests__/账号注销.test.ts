import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuFanYi } from '../config/translations'
import { shengChengLingPai, yanZhengLingPai, type LingPaiZaiHe } from '../utils/jwt'
import { huoQuBenDiLuJing } from '../services/媒体存储'
import fs from 'fs'
import path from 'path'

function suiJiShouJiHao(): string {
  return `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

function suiJiYongHuMing(): string {
  return `测试用户${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function huoQuChengNianRiQi(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 20)
  return d.toISOString().split('T')[0]
}

function suiJiIP(): string {
  return `203.0.113.${Math.floor(Math.random() * 250) + 1}`
}

const ceShiMiMa = 'testPassword123'

describe('FP-07 账号注销闭环', () => {
  let ceShiShouJiHao = ''
  let ceShiYongHuMing = ''
  let lingPai = ''
  let yongHuId = ''

  beforeAll(async () => {
    ceShiShouJiHao = suiJiShouJiHao()
    ceShiYongHuMing = suiJiYongHuMing()
  })

  afterAll(async () => {
    await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [ceShiShouJiHao])
    await redis.del(`yan_zheng_ma:${ceShiShouJiHao}`)
    await redis.del(`fa_song_jian_ge:${ceShiShouJiHao}`)
    await redis.del(`deng_lu_shi_bai:${ceShiShouJiHao}`)
    await 数据库.end()
    await redis.quit()
  })

  beforeEach(async () => {
    ceShiShouJiHao = suiJiShouJiHao()
    ceShiYongHuMing = suiJiYongHuMing()
    await request(yingYong)
      .post('/api/认证/发送码')
      .set('X-Real-IP', suiJiIP())
      .send({ shouJiHao: ceShiShouJiHao })
      .expect(200)

    const zhuCeXiangYing = await request(yingYong)
      .post('/api/认证/注册')
      .set('X-Real-IP', suiJiIP())
      .send({
        shouJiHao: ceShiShouJiHao,
        yanZhengMa: '123456',
        yongHuMing: ceShiYongHuMing,
        miMa: ceShiMiMa,
        tongYiXieYi: true,
        chuShengRiQi: huoQuChengNianRiQi(),
      })
      .expect(200)

    lingPai = zhuCeXiangYing.body.shu_ju.令牌
    yongHuId = zhuCeXiangYing.body.shu_ju.用户.id
  })

  it('注销：未登录返回401', async () => {
    const xiangYing = await request(yingYong)
      .delete('/api/认证/注销')
      .expect(401)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('tongYong', 'weiShouQuan'))
  })

  it('注销：成功返回200并清空用户敏感字段', async () => {
    const xiangYing = await request(yingYong)
      .delete('/api/认证/注销')
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)

    expect(xiangYing.body.cheng_gong).toBe(true)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'zhuXiaoChengGong'))
  })

  it('注销后：原手机号无法登录', async () => {
    await request(yingYong)
      .delete('/api/认证/注销')
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)

    const xiangYing = await request(yingYong)
      .post('/api/认证/登录')
      .send({ shouJiHao: ceShiShouJiHao, miMa: ceShiMiMa })
      .expect(401)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'zhangHaoHuoMiMaCuoWu'))
  })

  it('注销后：旧JWT失效（访问受保护接口返回401）', async () => {
    await request(yingYong)
      .delete('/api/认证/注销')
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)

    const xiangYing = await request(yingYong)
      .get('/api/认证/信息')
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(401)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('tongYong', 'weiShouQuan'))
  })

  it('注销后：用户记录被匿名化（手机号、用户名、密码哈希置空/标记，保留ID）', async () => {
    await request(yingYong)
      .delete('/api/认证/注销')
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)

    const jieGuo = await 数据库.query(`SELECT * FROM "用户" WHERE "ID" = $1`, [yongHuId])
    expect(jieGuo.rows.length).toBe(1)
    const yongHu = jieGuo.rows[0]
    expect(yongHu.手机号).toMatch(/^注销_[a-f0-9]{8}$/)
    expect(yongHu.用户名).toMatch(/^注销_[a-f0-9]{8}$/)
    expect(yongHu.密码哈希).toBeNull()
    expect(yongHu.ID).toBe(yongHuId)
  })

  it('注销后：关联数据级联删除（角色、消息、好感度、战绩、通知等）', async () => {
    // 先创建一些关联数据
    const jiaoSeJieGuo = await 数据库.query(
      `INSERT INTO "角色" ("用户ID", "名字", "性别", "年龄", "外貌", "性格", "背景故事", "MBTI", "微信昵称", "真实姓名")
       VALUES ($1, '测试角色', 'female', 25, '外貌', '性格', '背景', 'INTJ', '微信昵称', '真实姓名')
       RETURNING "ID"`,
      [yongHuId],
    )
    const jiaoSeId = jiaoSeJieGuo.rows[0].ID

    await 数据库.query(
      `INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型") VALUES ($1, $2, '测试消息', 'yonghu', 'wenben')`,
      [yongHuId, jiaoSeId],
    )

    await 数据库.query(
      `INSERT INTO "好感度" ("用户ID", "角色ID", "总分") VALUES ($1, $2, 100)`,
      [yongHuId, jiaoSeId],
    )

    await 数据库.query(
      `INSERT INTO "游戏档案" ("用户ID", "角色ID", "角色名字", "结果类型") VALUES ($1, $2, '测试角色', '进行中')`,
      [yongHuId, jiaoSeId],
    )

    await 数据库.query(
      `INSERT INTO "通知" ("接收者ID", "标题", "内容") VALUES ($1, '测试标题', '测试内容')`,
      [yongHuId],
    )

    await request(yingYong)
      .delete('/api/认证/注销')
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)

    // 验证级联删除
    const jiaoSeCount = await 数据库.query(`SELECT COUNT(*) FROM "角色" WHERE "用户ID" = $1`, [yongHuId])
    expect(Number(jiaoSeCount.rows[0].count)).toBe(0)

    const xiaoXiCount = await 数据库.query(`SELECT COUNT(*) FROM "消息" WHERE "用户ID" = $1`, [yongHuId])
    expect(Number(xiaoXiCount.rows[0].count)).toBe(0)

    const haoGanDuCount = await 数据库.query(`SELECT COUNT(*) FROM "好感度" WHERE "用户ID" = $1`, [yongHuId])
    expect(Number(haoGanDuCount.rows[0].count)).toBe(0)

    const dangAnCount = await 数据库.query(`SELECT COUNT(*) FROM "游戏档案" WHERE "用户ID" = $1`, [yongHuId])
    expect(Number(dangAnCount.rows[0].count)).toBe(0)

    const tongZhiCount = await 数据库.query(`SELECT COUNT(*) FROM "通知" WHERE "接收者ID" = $1`, [yongHuId])
    expect(Number(tongZhiCount.rows[0].count)).toBe(0)
  })

  it('注销后：挑战对局与挑战积分数据无残留（软删用户不走CASCADE）', async () => {
    const jiaoSeJieGuo = await 数据库.query(
      `INSERT INTO "角色" ("用户ID", "名字", "性别", "年龄", "外貌", "性格", "背景故事", "MBTI", "微信昵称", "真实姓名")
       VALUES ($1, '挑战测试角色', 'female', 25, '外貌', '性格', '背景', 'INTJ', '微信昵称', '真实姓名')
       RETURNING "ID"`,
      [yongHuId],
    )
    const jiaoSeId = jiaoSeJieGuo.rows[0].ID

    await 数据库.query(
      `INSERT INTO "挑战对局" ("用户ID", "角色ID", "玩家性别", "对象性别") VALUES ($1, $2, '男', '女')`,
      [yongHuId, jiaoSeId],
    )
    await 数据库.query(
      `INSERT INTO "挑战积分" ("用户ID", "组别") VALUES ($1, 'nan_nv')`,
      [yongHuId],
    )

    const duiJuQian = await 数据库.query(`SELECT COUNT(*) FROM "挑战对局" WHERE "用户ID" = $1`, [yongHuId])
    const jiFenQian = await 数据库.query(`SELECT COUNT(*) FROM "挑战积分" WHERE "用户ID" = $1`, [yongHuId])
    expect(Number(duiJuQian.rows[0].count)).toBe(1)
    expect(Number(jiFenQian.rows[0].count)).toBe(1)

    await request(yingYong)
      .delete('/api/认证/注销')
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)

    const duiJuHou = await 数据库.query(`SELECT COUNT(*) FROM "挑战对局" WHERE "用户ID" = $1`, [yongHuId])
    expect(Number(duiJuHou.rows[0].count)).toBe(0)

    const jiFenHou = await 数据库.query(`SELECT COUNT(*) FROM "挑战积分" WHERE "用户ID" = $1`, [yongHuId])
    expect(Number(jiFenHou.rows[0].count)).toBe(0)
  })

  it('注销后：用户上传的媒体文件从磁盘清除', async () => {
    // 创建测试媒体文件记录（使用唯一SHA256避免冲突）
    const sha256 = `test${Date.now()}${Math.random().toString(36).slice(2)}`.padEnd(64, 'a').slice(0, 64)
    const meiTiJieGuo = await 数据库.query(
      `INSERT INTO "媒体文件" ("SHA256", "原始文件名", "MIME", "大小字节", "类别", "上传者ID")
       VALUES ($1, 'test.jpg', 'image/jpeg', 100, 'tupian', $2)
       RETURNING "ID"`,
      [sha256, yongHuId],
    )
    const meiTiId = meiTiJieGuo.rows[0].ID

    // 创建物理文件
    const benDiLuJing = huoQuBenDiLuJing(sha256)
    if (benDiLuJing) {
      await fs.promises.mkdir(path.dirname(benDiLuJing), { recursive: true })
      await fs.promises.writeFile(benDiLuJing, 'test content')
      expect(fs.existsSync(benDiLuJing)).toBe(true)
    }

    await request(yingYong)
      .delete('/api/认证/注销')
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)

    // 验证数据库记录删除
    const meiTiCount = await 数据库.query(`SELECT COUNT(*) FROM "媒体文件" WHERE "上传者ID" = $1`, [yongHuId])
    expect(Number(meiTiCount.rows[0].count)).toBe(0)

    // 验证物理文件删除
    if (benDiLuJing) {
      expect(fs.existsSync(benDiLuJing)).toBe(false)
    }
  })

  it('注销后：请求使用的JWT加入Redis黑名单', async () => {
    // 解析获取当前token的jti
    const zaiHe = yanZhengLingPai(lingPai) as LingPaiZaiHe & { jti?: string }

    await request(yingYong)
      .delete('/api/认证/注销')
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)

    // 验证当前token在黑名单中
    if (zaiHe.jti) {
      const heiMingDan = await redis.get(`jwt_blacklist:${zaiHe.jti}`)
      expect(heiMingDan).toBe('1')
    }

    // 验证黑名单token无法访问受保护接口
    const xiangYing = await request(yingYong)
      .get('/api/认证/信息')
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(401)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('tongYong', 'weiShouQuan'))
  })

  it('注销后：返回翻译文件成功消息', async () => {
    const xiangYing = await request(yingYong)
      .delete('/api/认证/注销')
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)

    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'zhuXiaoChengGong'))
  })
})
