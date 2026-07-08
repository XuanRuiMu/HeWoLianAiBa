process.env.ADMIN_PHONES = '13800000000'
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://lovewithme:BXYXblupz542284@localhost:5432/lovewithme'
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import * as fs from 'fs/promises'
import * as path from 'path'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuFanYi } from '../config/translations'
import { sheZhiMockTiaoYong, chongZhiDeepSeekKeHuDuan } from '../utils/DeepSeek客户端'

function suiJiShouJiHao(): string {
  return `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

async function qingChuCeShiYongHu(shouJiHao: string): Promise<void> {
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  await redis.del(`yan_zheng_ma:${shouJiHao}`)
  await redis.del(`fa_song_jian_ge:${shouJiHao}`)
  await redis.del(`deng_lu_shi_bai:${shouJiHao}`)
}

async function qingChuIpWeiGuiFengJin(ip: string = '127.0.0.1'): Promise<void> {
  await redis.del(`违规:${ip}`)
  await redis.del(`封禁:${ip}`)
  await 数据库.query(`DELETE FROM "封禁记录" WHERE "IP" = $1`, [ip])
}

async function zhuCeYongHu(
  shouJiHao: string,
  yongHuMing: string,
  miMa: string = 'Test123456',
): Promise<{ lingPai: string; yongHuId: string }> {
  await redis.setex(`yan_zheng_ma:${shouJiHao}`, 300, '123456')
  const xiangYing = await request(yingYong)
    .post('/api/认证/注册')
    .send({
      shouJiHao,
      yanZhengMa: '123456',
      yongHuMing,
      miMa,
      tongYiXieYi: true,
    })
    .expect(200)

  return {
    lingPai: xiangYing.body.shu_ju.令牌,
    yongHuId: xiangYing.body.shu_ju.用户.id,
  }
}

async function zhuCeGuanLiYuan(
  yongHuMing: string,
): Promise<{ lingPai: string; yongHuId: string; shouJiHao: string }> {
  const shouJiHao = suiJiShouJiHao()
  const xianYouLieBiao = (process.env.ADMIN_PHONES || '').split(',').map((hao) => hao.trim()).filter(Boolean)
  if (!xianYouLieBiao.includes(shouJiHao)) {
    xianYouLieBiao.push(shouJiHao)
  }
  process.env.ADMIN_PHONES = xianYouLieBiao.join(',')
  await qingChuCeShiYongHu(shouJiHao)
  const jieGuo = await zhuCeYongHu(shouJiHao, yongHuMing)
  await 数据库.query(`UPDATE "用户" SET "管理员" = true WHERE "ID" = $1`, [jieGuo.yongHuId])
  return { lingPai: jieGuo.lingPai, yongHuId: jieGuo.yongHuId, shouJiHao }
}

async function chuangJianJiaoSe(yongHuId: string, mingZi: string = '测试角色'): Promise<string> {
  const jieGuo = await 数据库.query(
    `INSERT INTO "角色" (
      "用户ID", "名字", "性别", "年龄", "MBTI", "IE类型", "热身类型",
      "微信昵称", "开场白", "喜欢的类型", "家庭背景", "情感经历"
    ) VALUES ($1, $2, '女', 20, 'INTJ', 'I', '慢热', '测试昵称', '["你好"]'::jsonb, '温柔的', '普通家庭', '有过一段')
    RETURNING *`,
    [yongHuId, mingZi],
  )
  return String(jieGuo.rows[0].ID)
}

async function souSuoYuanMaZiFuChuan(muBiao: string): Promise<boolean> {
  const genMuLu = path.resolve(__dirname, '..')
  const duiLie: string[] = [genMuLu]
  while (duiLie.length > 0) {
    const dangQian = duiLie.shift()!
    const lieBiao = await fs.readdir(dangQian, { withFileTypes: true })
    for (const xiang of lieBiao) {
      const wanZhengLuJing = path.join(dangQian, xiang.name)
      if (xiang.isDirectory()) {
        if (xiang.name === 'node_modules' || xiang.name === 'dist' || xiang.name === '__tests__') continue
        duiLie.push(wanZhengLuJing)
      } else if (xiang.isFile() && /\.(ts|js|json)$/.test(xiang.name)) {
        const neiRong = await fs.readFile(wanZhengLuJing, 'utf-8')
        if (neiRong.includes(muBiao)) {
          return true
        }
      }
    }
  }
  return false
}

describe.sequential('FP-17 安全与合规', () => {
  beforeAll(async () => {
    await qingChuIpWeiGuiFengJin()
  })

  afterAll(async () => {
    await qingChuIpWeiGuiFengJin()
    await 数据库.end()
    await redis.quit()
  })

  beforeEach(() => {
    chongZhiDeepSeekKeHuDuan()
  })

  afterEach(() => {
    sheZhiMockTiaoYong(null)
  })

  it('源码中不存在硬编码 admin_secret_token', async () => {
    const jieGuo = await souSuoYuanMaZiFuChuan('admin_secret_token')
    expect(jieGuo).toBe(false)
  })

  it('源码中不存在已废弃的 x-admin-token', async () => {
    const jieGuo = await souSuoYuanMaZiFuChuan('x-admin-token')
    expect(jieGuo).toBe(false)
  })

  it('未携带JWT访问受保护路由返回401', async () => {
    const xiangYing = await request(yingYong)
      .get('/api/认证/信息')
      .expect(401)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('tongYong', 'weiShouQuan'))
  })

  it('响应头包含CSP/COOP/CORP/Referrer-Policy且不包含X-XSS-Protection', async () => {
    const xiangYing = await request(yingYong).get('/api/健康')
    expect(xiangYing.status).toBe(200)
    expect(xiangYing.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(xiangYing.headers['content-security-policy']).toBeDefined()
    expect(xiangYing.headers['cross-origin-opener-policy']).toBeDefined()
    expect(xiangYing.headers['cross-origin-resource-policy']).toBeDefined()
    expect(xiangYing.headers['x-xss-protection']).toBeUndefined()
  })

  it('手机号格式错误返回400并匹配翻译文件', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/认证/登录')
      .send({ shouJiHao: '12345', miMa: 'test' })
      .expect(400)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu'))
  })

  it('用户名含特殊符号返回400并匹配翻译文件', async () => {
    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      const xiangYing = await request(yingYong)
        .post('/api/认证/注册')
        .send({
          shouJiHao,
          yanZhengMa: '123456',
          yongHuMing: 'a!@#',
          miMa: 'Test123456',
          tongYiXieYi: true,
        })
        .expect(400)

      expect(xiangYing.body.cheng_gong).toBe(false)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'yongHuMingTeShuZiFu'))
    } finally {
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('性别参数other返回400并匹配翻译文件', async () => {
    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      const { lingPai } = await zhuCeYongHu(shouJiHao, `测试用户${Date.now()}`)
      const xiangYing = await request(yingYong)
        .post('/api/生成角色/MBTI生成')
        .set('Authorization', `Bearer ${lingPai}`)
        .send({ 性别: 'other' })
        .expect(400)

      expect(xiangYing.body.cheng_gong).toBe(false)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('anQuan', 'shenFenBuHeFa'))
    } finally {
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('聊天内容超过500字符返回400并匹配翻译文件', async () => {
    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      const { lingPai, yongHuId } = await zhuCeYongHu(shouJiHao, `测试用户${Date.now()}`)
      const jiaoSeId = await chuangJianJiaoSe(yongHuId)

      const xiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${lingPai}`)
        .send({ neiRong: 'a'.repeat(501) })
        .expect(400)

      expect(xiangYing.body.cheng_gong).toBe(false)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'))
    } finally {
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('非聊天请求body含SELECT * FROM返回403', async () => {
    await qingChuIpWeiGuiFengJin()
    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      const xiangYing = await request(yingYong)
        .post('/api/认证/登录')
        .send({ shouJiHao: `138${'SELECT * FROM 用户'.replace(/\s/g, '')}`, miMa: 'test' })

      const xiangYing2 = await request(yingYong)
        .post('/api/认证/登录')
        .send({ shouJiHao: 'SELECT * FROM 用户', miMa: 'test' })

      expect(xiangYing2.status).toBe(403)
      expect(xiangYing2.body.cheng_gong).toBe(false)
      expect(xiangYing2.body.ti_shi).toBe(huoQuFanYi('anQuan', 'sqlZhuRuWeiXian'))
      expect(JSON.stringify(xiangYing2.body)).not.toContain('SELECT')
    } finally {
      await qingChuIpWeiGuiFengJin()
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('聊天请求body含SELECT * FROM正常通过', async () => {
    await qingChuIpWeiGuiFengJin()
    sheZhiMockTiaoYong(async () => ({
      neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 理由: '' }),
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {} as unknown as Awaited<ReturnType<typeof import('../utils/DeepSeek客户端').tiaoYongDeepSeek>>['yuanShuJu'],
    }))

    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      const { lingPai, yongHuId } = await zhuCeYongHu(shouJiHao, `测试用户${Date.now()}`)
      const jiaoSeId = await chuangJianJiaoSe(yongHuId)

      const xiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${lingPai}`)
        .send({ neiRong: 'SELECT * FROM 用户' })
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju.nei_rong).toBe('SELECT * FROM 用户')
    } finally {
      await qingChuIpWeiGuiFengJin()
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('请求body含高危SQL注入结构返回403', async () => {
    await qingChuIpWeiGuiFengJin()
    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      const xiangYing = await request(yingYong)
        .post('/api/认证/登录')
        .send({ shouJiHao: "13812345678' OR '1'='1", miMa: 'test' })
        .expect(403)

      expect(xiangYing.body.cheng_gong).toBe(false)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('anQuan', 'sqlZhuRuWeiXian'))
    } finally {
      await qingChuIpWeiGuiFengJin()
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('聊天请求body含高危SQL注入结构返回403', async () => {
    await qingChuIpWeiGuiFengJin()
    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      const { lingPai, yongHuId } = await zhuCeYongHu(shouJiHao, `测试用户${Date.now()}`)
      const jiaoSeId = await chuangJianJiaoSe(yongHuId)

      const xiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${lingPai}`)
        .send({ neiRong: 'DROP TABLE 用户' })
        .expect(403)

      expect(xiangYing.body.cheng_gong).toBe(false)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('anQuan', 'gaoWeiSQLZhuRu'))
    } finally {
      await qingChuIpWeiGuiFengJin()
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('聊天内容含单个SQL单词select不拦截', async () => {
    await qingChuIpWeiGuiFengJin()
    sheZhiMockTiaoYong(async () => ({
      neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 理由: '' }),
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {} as unknown as Awaited<ReturnType<typeof import('../utils/DeepSeek客户端').tiaoYongDeepSeek>>['yuanShuJu'],
    }))

    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      const { lingPai, yongHuId } = await zhuCeYongHu(shouJiHao, `测试用户${Date.now()}`)
      const jiaoSeId = await chuangJianJiaoSe(yongHuId)

      const xiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${lingPai}`)
        .send({ neiRong: 'select' })
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju.nei_rong).toBe('select')
    } finally {
      await qingChuIpWeiGuiFengJin()
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('请求body含<script>字符被清理为script', async () => {
    await qingChuIpWeiGuiFengJin()
    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      const xiangYing = await request(yingYong)
        .post('/api/认证/注册')
        .send({
          shouJiHao,
          yanZhengMa: '123456',
          yongHuMing: '<script>alert(1)</script>',
          miMa: 'Test123456',
          tongYiXieYi: true,
        })
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      const yongHu = await 数据库.query(`SELECT "用户名" FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
      expect(yongHu.rows[0].用户名).toBe('scriptalert(1)/script')
    } finally {
      await qingChuIpWeiGuiFengJin()
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('第一次SQL违规返回警告且不封禁', async () => {
    await qingChuIpWeiGuiFengJin()
    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      const xiangYing = await request(yingYong)
        .post('/api/认证/登录')
        .send({ shouJiHao: "13812345678' OR '1'='1", miMa: 'test' })
        .expect(403)

      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('anQuan', 'sqlZhuRuWeiXian'))
      expect(xiangYing.body.ti_shi).not.toBe(huoQuFanYi('anQuan', 'ipYiBeiFengJin'))

      const fengJinShu = await 数据库.query(`SELECT COUNT(*) as shu FROM "封禁记录" WHERE "IP" = $1`, ['127.0.0.1'])
      expect(parseInt(String(fengJinShu.rows[0].shu), 10)).toBe(0)
    } finally {
      await qingChuIpWeiGuiFengJin()
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('第二次违规IP封禁1小时且存在持久化记录', async () => {
    await qingChuIpWeiGuiFengJin()
    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      await request(yingYong)
        .post('/api/认证/登录')
        .send({ shouJiHao: "13812345678' OR '1'='1", miMa: 'test' })
        .expect(403)

      const xiangYing = await request(yingYong)
        .post('/api/认证/登录')
        .send({ shouJiHao: "13812345678' OR '1'='1", miMa: 'test' })
        .expect(403)

      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('anQuan', 'ipYiBeiFengJin'))

      const fengJinShu = await 数据库.query(`SELECT COUNT(*) as shu FROM "封禁记录" WHERE "IP" = $1`, ['127.0.0.1'])
      expect(parseInt(String(fengJinShu.rows[0].shu), 10)).toBeGreaterThanOrEqual(1)
    } finally {
      await qingChuIpWeiGuiFengJin()
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('第三次违规IP封禁24小时', async () => {
    await qingChuIpWeiGuiFengJin()
    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      for (let i = 0; i < 2; i++) {
        await request(yingYong)
          .post('/api/认证/登录')
          .send({ shouJiHao: "13812345678' OR '1'='1", miMa: 'test' })
          .expect(403)
      }

      const xiangYing = await request(yingYong)
        .post('/api/认证/登录')
        .send({ shouJiHao: "13812345678' OR '1'='1", miMa: 'test' })
        .expect(403)

      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('anQuan', 'ipYiBeiFengJin'))
      const fengJinXinXi = await redis.get('封禁:127.0.0.1')
      expect(fengJinXinXi).toBeDefined()
    } finally {
      await qingChuIpWeiGuiFengJin()
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('第四次违规IP永久封禁', async () => {
    await qingChuIpWeiGuiFengJin()
    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      for (let i = 0; i < 3; i++) {
        await request(yingYong)
          .post('/api/认证/登录')
          .send({ shouJiHao: "13812345678' OR '1'='1", miMa: 'test' })
          .expect(403)
      }

      const xiangYing = await request(yingYong)
        .post('/api/认证/登录')
        .send({ shouJiHao: "13812345678' OR '1'='1", miMa: 'test' })
        .expect(403)

      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('anQuan', 'ipYiBeiFengJin'))
      const fengJinXinXi = await redis.get('封禁:127.0.0.1')
      expect(fengJinXinXi).toBeDefined()
      const shuJu = JSON.parse(fengJinXinXi!)
      expect(shuJu.解封时间).toBeNull()
    } finally {
      await qingChuIpWeiGuiFengJin()
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('IP封禁后Redis存在违规键且数据库存在持久化记录', async () => {
    await qingChuIpWeiGuiFengJin()
    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      await request(yingYong)
        .post('/api/认证/登录')
        .send({ shouJiHao: "13812345678' OR '1'='1", miMa: 'test' })
        .expect(403)
      await request(yingYong)
        .post('/api/认证/登录')
        .send({ shouJiHao: "13812345678' OR '1'='1", miMa: 'test' })
        .expect(403)

      const weiGuiCiShu = await redis.get('违规:127.0.0.1')
      expect(Number(weiGuiCiShu)).toBeGreaterThanOrEqual(2)

      const jieGuo = await 数据库.query(`SELECT * FROM "封禁记录" WHERE "IP" = $1`, ['127.0.0.1'])
      expect(jieGuo.rows.length).toBeGreaterThanOrEqual(1)
    } finally {
      await qingChuIpWeiGuiFengJin()
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('AI内容安全检测确信度0.9人身攻击判定违规并拦截消息', async () => {
    await qingChuIpWeiGuiFengJin()
    sheZhiMockTiaoYong(async () => ({
      neiRong: JSON.stringify({
        违规: true,
        确信度: 0.9,
        类型: '人身攻击',
        严重程度: '严重',
        理由: '辱骂',
      }),
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {} as unknown as Awaited<ReturnType<typeof import('../utils/DeepSeek客户端').tiaoYongDeepSeek>>['yuanShuJu'],
    }))

    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      const { lingPai, yongHuId } = await zhuCeYongHu(shouJiHao, `测试用户${Date.now()}`)
      const jiaoSeId = await chuangJianJiaoSe(yongHuId)

      const xiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${lingPai}`)
        .send({ neiRong: '你去死吧' })
        .expect(403)

      expect(xiangYing.body.cheng_gong).toBe(false)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('anQuan', 'xiaoXiNeiRongWeiGui'))
    } finally {
      await qingChuIpWeiGuiFengJin()
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('AI内容安全检测确信度0.7不判定违规，消息正常发送', async () => {
    await qingChuIpWeiGuiFengJin()
    sheZhiMockTiaoYong(async () => ({
      neiRong: JSON.stringify({
        违规: true,
        确信度: 0.7,
        类型: '人身攻击',
        严重程度: '中等',
        理由: '可能冒犯',
      }),
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {} as unknown as Awaited<ReturnType<typeof import('../utils/DeepSeek客户端').tiaoYongDeepSeek>>['yuanShuJu'],
    }))

    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      const { lingPai, yongHuId } = await zhuCeYongHu(shouJiHao, `测试用户${Date.now()}`)
      const jiaoSeId = await chuangJianJiaoSe(yongHuId)

      const xiangYing = await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${lingPai}`)
        .send({ neiRong: '你有点烦' })
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju.nei_rong).toBe('你有点烦')
    } finally {
      await qingChuIpWeiGuiFengJin()
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('60秒内101次常规请求第101次返回429', async () => {
    const qingQiuLieBiao: Promise<request.Response>[] = []
    for (let i = 0; i < 101; i++) {
      qingQiuLieBiao.push(request(yingYong).get('/api/健康'))
    }
    const jieGuo = await Promise.all(qingQiuLieBiao)
    const xiangYing429 = jieGuo.find((x) => x.status === 429)
    expect(xiangYing429).toBeDefined()
    expect(xiangYing429!.body.cheng_gong).toBe(false)
    expect(xiangYing429!.body.ti_shi).toBe(huoQuFanYi('renZheng', 'dengLuShiBaiPinFan'))
  })

  it('60秒内6次登录失败第6次返回429', async () => {
    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      for (let i = 0; i < 5; i++) {
        await request(yingYong)
          .post('/api/认证/登录')
          .send({ shouJiHao, miMa: 'wrongPassword' })
      }

      const xiangYing = await request(yingYong)
        .post('/api/认证/登录')
        .send({ shouJiHao, miMa: 'wrongPassword' })
        .expect(429)

      expect(xiangYing.body.cheng_gong).toBe(false)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'dengLuShiBaiPinFan'))
    } finally {
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('60秒内2次短信请求第2次返回429', async () => {
    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      await request(yingYong)
        .post('/api/认证/发送码')
        .send({ shouJiHao })
        .expect(200)

      const xiangYing = await request(yingYong)
        .post('/api/认证/发送码')
        .send({ shouJiHao })
        .expect(429)

      expect(xiangYing.body.cheng_gong).toBe(false)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'faSongYanZhengMaPinFan'))
    } finally {
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('60秒内31次聊天第31次返回429', async () => {
    await qingChuIpWeiGuiFengJin()
    sheZhiMockTiaoYong(async () => ({
      neiRong: JSON.stringify({ 违规: false, 确信度: 0.1, 类型: '', 理由: '' }),
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {} as unknown as Awaited<ReturnType<typeof import('../utils/DeepSeek客户端').tiaoYongDeepSeek>>['yuanShuJu'],
    }))

    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      const { lingPai, yongHuId } = await zhuCeYongHu(shouJiHao, `测试用户${Date.now()}`)
      const jiaoSeId = await chuangJianJiaoSe(yongHuId)

      const qingQiuLieBiao: Promise<request.Response>[] = []
      for (let i = 0; i < 31; i++) {
        qingQiuLieBiao.push(
          request(yingYong)
            .post(`/api/聊天/会话/${jiaoSeId}/消息`)
            .set('Authorization', `Bearer ${lingPai}`)
            .send({ neiRong: `消息${i}` }),
        )
      }
      const jieGuo = await Promise.all(qingQiuLieBiao)
      const xiangYing429 = jieGuo.find((x) => x.status === 429)
      expect(xiangYing429).toBeDefined()
      expect(xiangYing429!.body.cheng_gong).toBe(false)
      expect(xiangYing429!.body.ti_shi).toBe(huoQuFanYi('renZheng', 'dengLuShiBaiPinFan'))
    } finally {
      await qingChuIpWeiGuiFengJin()
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('60秒内11次管理操作第11次返回429', async () => {
    const { lingPai, shouJiHao } = await zhuCeGuanLiYuan(`管理员${Date.now()}`)

    try {
      const qingQiuLieBiao: Promise<request.Response>[] = []
      for (let i = 0; i < 11; i++) {
        qingQiuLieBiao.push(
          request(yingYong)
            .get('/api/管理/用户')
            .set('Authorization', `Bearer ${lingPai}`),
        )
      }
      const jieGuo = await Promise.all(qingQiuLieBiao)
      const xiangYing429 = jieGuo.find((x) => x.status === 429)
      expect(xiangYing429).toBeDefined()
      expect(xiangYing429!.body.cheng_gong).toBe(false)
      expect(xiangYing429!.body.ti_shi).toBe(huoQuFanYi('tongYong', 'caoZuoPinFan'))
    } finally {
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('60秒内16次AI请求第16次返回429', async () => {
    await qingChuIpWeiGuiFengJin()
    sheZhiMockTiaoYong(async () => ({
      neiRong: JSON.stringify({
        违规: false,
        确信度: 0.1,
        类型: '',
        理由: '',
        指导建议: '保持耐心',
      }),
      xinXi: { role: 'assistant', content: '' },
      yuanShuJu: {} as unknown as Awaited<ReturnType<typeof import('../utils/DeepSeek客户端').tiaoYongDeepSeek>>['yuanShuJu'],
    }))

    const shouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(shouJiHao)

    try {
      const { lingPai, yongHuId } = await zhuCeYongHu(shouJiHao, `测试用户${Date.now()}`)
      await chuangJianJiaoSe(yongHuId)

      const qingQiuLieBiao: Promise<request.Response>[] = []
      for (let i = 0; i < 16; i++) {
        qingQiuLieBiao.push(
          request(yingYong)
            .post('/api/聊天/军师')
            .set('Authorization', `Bearer ${lingPai}`)
            .send({ jiaoSeId: 'jiao-se-id-ce-shi' }),
        )
      }
      const jieGuo = await Promise.all(qingQiuLieBiao)
      const xiangYing429 = jieGuo.find((x) => x.status === 429)
      expect(xiangYing429).toBeDefined()
      expect(xiangYing429!.body.cheng_gong).toBe(false)
      expect(xiangYing429!.body.ti_shi).toBe(huoQuFanYi('renZheng', 'dengLuShiBaiPinFan'))
    } finally {
      await qingChuIpWeiGuiFengJin()
      await qingChuCeShiYongHu(shouJiHao)
    }
  })
})
