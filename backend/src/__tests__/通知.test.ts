process.env.ADMIN_PHONES = '13800000000'
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://lovewithme:BXYXblupz542284@localhost:5432/lovewithme'
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createServer } from 'http'
import type { AddressInfo } from 'net'
import { Server as SocketIoServer } from 'socket.io'
import { io as keHuDuanIo } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { renZhengSocketZhongJianJian } from '../socket/认证'
import { chuShiHuaTongZhiSocket } from '../socket/通知'
import { sheZhiIo } from '../socket/io'
import { huoQuFanYi } from '../config/translations'
import { chuangJianTongZhi, guanLiYuanFaSongTongZhi } from '../services/通知'

function suiJiShouJiHao(): string {
  return `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

async function qingChuCeShiYongHu(shouJiHao: string): Promise<void> {
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  await redis.del(`yan_zheng_ma:${shouJiHao}`)
  await redis.del(`fa_song_jian_ge:${shouJiHao}`)
  await redis.del(`deng_lu_shi_bai:${shouJiHao}`)
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
  return { lingPai: jieGuo.lingPai, yongHuId: jieGuo.yongHuId, shouJiHao }
}

async function zhuCeYongHu(
  shouJiHao: string,
  yongHuMing: string,
): Promise<{ lingPai: string; yongHuId: string; shiGuanLiYuan: boolean }> {
  await redis.setex(`yan_zheng_ma:${shouJiHao}`, 300, '123456')
  const xiangYing = await request(yingYong)
    .post('/api/认证/注册')
    .send({
      shouJiHao,
      yanZhengMa: '123456',
      yongHuMing,
      miMa: 'Test123456',
      tongYiXieYi: true,
    })
    .expect(200)

  const yongHuId = xiangYing.body.shu_ju.用户.id
  const guanLiYuanShouJiHaoLieBiao = (process.env.ADMIN_PHONES || '').split(',').map((hao) => hao.trim()).filter(Boolean)
  const shiGuanLiYuan = guanLiYuanShouJiHaoLieBiao.includes(shouJiHao)
  if (shiGuanLiYuan) {
    await 数据库.query(`UPDATE "用户" SET "管理员" = true WHERE "ID" = $1`, [yongHuId])
  }

  return {
    lingPai: xiangYing.body.shu_ju.令牌,
    yongHuId,
    shiGuanLiYuan,
  }
}

function dengDaiLianJie(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.on('connect', () => resolve())
    socket.on('connect_error', (cuoWu) => reject(cuoWu))
    setTimeout(() => reject(new Error('Socket连接超时')), 5000)
  })
}

function dengDaiTongZhi(socket: Socket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    socket.once('通知新', (shuJu: Record<string, unknown>) => resolve(shuJu))
    setTimeout(() => reject(new Error('未收到通知新事件')), 5000)
  })
}

function daDuanSocket(socket: Socket): Promise<void> {
  return new Promise((resolve) => {
    if (!socket.connected) {
      resolve()
      return
    }
    socket.on('disconnect', () => resolve())
    socket.disconnect()
    setTimeout(resolve, 500)
  })
}

const testFuWuQi = createServer()
const testIo = new SocketIoServer(testFuWuQi, {
  cors: { origin: '*' },
  path: '/socket.io',
})
testIo.use(renZhengSocketZhongJianJian)
chuShiHuaTongZhiSocket(testIo)
let testDuanKou = 0

describe.sequential('FP-15 通知系统', () => {
  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      testFuWuQi.listen(0, () => {
        testDuanKou = (testFuWuQi.address() as AddressInfo).port
        resolve()
      })
    })
    sheZhiIo(testIo)
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      testIo.close(() => {
        testFuWuQi.close(() => resolve())
      })
    })
    await 数据库.end()
    await redis.quit()
  })

  it('通知列表API返回最多100条通知并包含未读数字段', async () => {
    const shouJiHao = suiJiShouJiHao()
    const yongHuMing = `测试通知用户${Date.now()}`
    const { lingPai, yongHuId } = await zhuCeYongHu(shouJiHao, yongHuMing)

    try {
      for (let i = 0; i < 105; i++) {
        await 数据库.query(
          `INSERT INTO "通知" ("接收者ID", "标题", "内容") VALUES ($1, $2, $3)`,
          [yongHuId, `标题${i}`, `内容${i}`],
        )
      }

      const xiangYing = await request(yingYong)
        .get('/api/通知')
        .set('Authorization', `Bearer ${lingPai}`)
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju.lie_biao.length).toBeLessThanOrEqual(100)
      expect(xiangYing.body.shu_ju.wei_du_shu).toBe(105)
    } finally {
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('标记单条已读后该通知已读为true', async () => {
    const shouJiHao = suiJiShouJiHao()
    const yongHuMing = `测试通知用户${Date.now()}`
    const { lingPai, yongHuId } = await zhuCeYongHu(shouJiHao, yongHuMing)

    try {
      const chaRuJieGuo = await 数据库.query(
        `INSERT INTO "通知" ("接收者ID", "标题", "内容") VALUES ($1, $2, $3) RETURNING *`,
        [yongHuId, '测试标题', '测试内容'],
      )
      const tongZhiId = chaRuJieGuo.rows[0].ID

      const xiangYing = await request(yingYong)
        .put(`/api/通知/${tongZhiId}/已读`)
        .set('Authorization', `Bearer ${lingPai}`)
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju.yi_du).toBe(true)

      const chaXunJieGuo = await 数据库.query(
        `SELECT "已读" FROM "通知" WHERE "ID" = $1`,
        [tongZhiId],
      )
      expect(chaXunJieGuo.rows[0].已读).toBe(true)
    } finally {
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('标记全部已读后所有未读通知已读为true', async () => {
    const shouJiHao = suiJiShouJiHao()
    const yongHuMing = `测试通知用户${Date.now()}`
    const { lingPai, yongHuId } = await zhuCeYongHu(shouJiHao, yongHuMing)

    try {
      for (let i = 0; i < 3; i++) {
        await 数据库.query(
          `INSERT INTO "通知" ("接收者ID", "标题", "内容") VALUES ($1, $2, $3)`,
          [yongHuId, `标题${i}`, `内容${i}`],
        )
      }

      await request(yingYong)
        .put('/api/通知/全部已读')
        .set('Authorization', `Bearer ${lingPai}`)
        .expect(200)

      const xiangYing = await request(yingYong)
        .get('/api/通知')
        .set('Authorization', `Bearer ${lingPai}`)
        .expect(200)

      expect(xiangYing.body.shu_ju.wei_du_shu).toBe(0)
      expect(xiangYing.body.shu_ju.lie_biao.every((tongZhi: { yi_du: boolean }) => tongZhi.yi_du)).toBe(true)
    } finally {
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('新通知到达时前端收到Socket.IO通知新事件', async () => {
    const shouJiHao = suiJiShouJiHao()
    const yongHuMing = `测试通知用户${Date.now()}`
    const { lingPai, yongHuId } = await zhuCeYongHu(shouJiHao, yongHuMing)
    const socket = keHuDuanIo(`http://localhost:${testDuanKou}`, {
      path: '/socket.io',
      auth: { token: lingPai },
      transports: ['websocket'],
    })

    try {
      await dengDaiLianJie(socket)
      const shiJianYingDa = dengDaiTongZhi(socket)
      await chuangJianTongZhi(
        {
          jie_shou_zhe_id: yongHuId,
          biao_ti: 'Socket测试标题',
          nei_rong: 'Socket测试内容',
        },
        testIo,
      )
      const shuJu = await shiJianYingDa
      expect(shuJu).toHaveProperty('id')
      expect(shuJu).toHaveProperty('biao_ti', 'Socket测试标题')
      expect(shuJu).toHaveProperty('nei_rong', 'Socket测试内容')
      expect(shuJu).toHaveProperty('yi_du', false)
    } finally {
      await daDuanSocket(socket)
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('管理员发送全员通知时所有用户收到Socket.IO通知新事件', async () => {
    const { yongHuId: guanLiYuanYongHuId, shouJiHao: guanLiYuanShouJiHao } =
      await zhuCeGuanLiYuan(`测试管理员${Date.now()}`)
    const yongHu1ShouJiHao = suiJiShouJiHao()
    const yongHu2ShouJiHao = suiJiShouJiHao()
    const yongHu1Ming = `测试用户A${Date.now()}`
    const yongHu2Ming = `测试用户B${Date.now()}`

    const { lingPai: yongHu1LingPai } = await zhuCeYongHu(yongHu1ShouJiHao, yongHu1Ming)
    const { lingPai: yongHu2LingPai } = await zhuCeYongHu(yongHu2ShouJiHao, yongHu2Ming)

    const socket1 = keHuDuanIo(`http://localhost:${testDuanKou}`, {
      path: '/socket.io',
      auth: { token: yongHu1LingPai },
      transports: ['websocket'],
    })
    const socket2 = keHuDuanIo(`http://localhost:${testDuanKou}`, {
      path: '/socket.io',
      auth: { token: yongHu2LingPai },
      transports: ['websocket'],
    })

    try {
      await Promise.all([dengDaiLianJie(socket1), dengDaiLianJie(socket2)])
      const shiJian1 = dengDaiTongZhi(socket1)
      const shiJian2 = dengDaiTongZhi(socket2)

      const jieGuo = await guanLiYuanFaSongTongZhi({
        guan_li_yuan_id: guanLiYuanYongHuId,
        mu_biao: '全员',
        biao_ti: '全员测试通知',
        nei_rong: '这是全员通知内容',
        ip: '127.0.0.1',
        io: testIo,
      })

      expect(jieGuo.cheng_gong).toBe(true)
      expect(jieGuo.fa_song_shu).toBeGreaterThanOrEqual(2)

      const shuJu1 = await shiJian1
      const shuJu2 = await shiJian2
      expect(shuJu1.biao_ti).toBe('全员测试通知')
      expect(shuJu2.biao_ti).toBe('全员测试通知')
    } finally {
      await daDuanSocket(socket1)
      await daDuanSocket(socket2)
      await qingChuCeShiYongHu(guanLiYuanShouJiHao)
      await qingChuCeShiYongHu(yongHu1ShouJiHao)
      await qingChuCeShiYongHu(yongHu2ShouJiHao)
    }
  })

  it('管理员发送指定用户通知时仅指定用户收到Socket.IO通知新事件', async () => {
    const { yongHuId: guanLiYuanYongHuId, shouJiHao: guanLiYuanShouJiHao } =
      await zhuCeGuanLiYuan(`测试管理员${Date.now()}`)
    const yongHu1ShouJiHao = suiJiShouJiHao()
    const yongHu2ShouJiHao = suiJiShouJiHao()
    const { lingPai: yongHu1LingPai, yongHuId: yongHu1Id } = await zhuCeYongHu(
      yongHu1ShouJiHao,
      `测试用户A${Date.now()}`,
    )
    const { lingPai: yongHu2LingPai } = await zhuCeYongHu(yongHu2ShouJiHao, `测试用户B${Date.now()}`)

    const socket1 = keHuDuanIo(`http://localhost:${testDuanKou}`, {
      path: '/socket.io',
      auth: { token: yongHu1LingPai },
      transports: ['websocket'],
    })
    const socket2 = keHuDuanIo(`http://localhost:${testDuanKou}`, {
      path: '/socket.io',
      auth: { token: yongHu2LingPai },
      transports: ['websocket'],
    })

    try {
      await Promise.all([dengDaiLianJie(socket1), dengDaiLianJie(socket2)])
      const shiJian1 = dengDaiTongZhi(socket1)
      let shouDao2 = false
      socket2.once('通知新', () => {
        shouDao2 = true
      })

      await guanLiYuanFaSongTongZhi({
        guan_li_yuan_id: guanLiYuanYongHuId,
        mu_biao: '指定',
        jie_shou_zhe_ids: [yongHu1Id],
        biao_ti: '指定测试通知',
        nei_rong: '这是指定通知内容',
        ip: '127.0.0.1',
        io: testIo,
      })

      const shuJu1 = await shiJian1
      expect(shuJu1.biao_ti).toBe('指定测试通知')
      await new Promise((resolve) => setTimeout(resolve, 500))
      expect(shouDao2).toBe(false)
    } finally {
      await daDuanSocket(socket1)
      await daDuanSocket(socket2)
      await qingChuCeShiYongHu(guanLiYuanShouJiHao)
      await qingChuCeShiYongHu(yongHu1ShouJiHao)
      await qingChuCeShiYongHu(yongHu2ShouJiHao)
    }
  })

  it('通知标题超过100字时返回400', async () => {
    const { lingPai, shouJiHao } = await zhuCeGuanLiYuan(`测试管理员${Date.now()}`)

    try {
      const xiangYing = await request(yingYong)
        .post('/api/通知/发送')
        .set('Authorization', `Bearer ${lingPai}`)
        .send({
          目标: '指定',
          接收者ID列表: [],
          标题: '测'.repeat(101),
          内容: '正常内容',
        })
        .expect(400)

      expect(xiangYing.body.cheng_gong).toBe(false)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('tongZhi', 'biaoTiGuoChang'))
    } finally {
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('通知正文超过2000字时返回400', async () => {
    const { lingPai, shouJiHao } = await zhuCeGuanLiYuan(`测试管理员${Date.now()}`)

    try {
      const xiangYing = await request(yingYong)
        .post('/api/通知/发送')
        .set('Authorization', `Bearer ${lingPai}`)
        .send({
          目标: '指定',
          接收者ID列表: [],
          标题: '正常标题',
          内容: '内'.repeat(2001),
        })
        .expect(400)

      expect(xiangYing.body.cheng_gong).toBe(false)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('tongZhi', 'zhengWenGuoChang'))
    } finally {
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('管理员发送通知后审计日志表新增记录', async () => {
    const { lingPai, yongHuId, shouJiHao } = await zhuCeGuanLiYuan(`测试管理员${Date.now()}`)

    try {
      await request(yingYong)
        .post('/api/通知/发送')
        .set('Authorization', `Bearer ${lingPai}`)
        .send({
          目标: '指定',
          接收者ID列表: [yongHuId],
          标题: '审计测试通知',
          内容: '审计测试内容',
        })
        .expect(200)

      const shenJiJieGuo = await 数据库.query(
        `SELECT * FROM "审计日志" WHERE "事件类型" = $1 AND "用户ID" = $2 ORDER BY "创建时间" DESC`,
        [huoQuFanYi('shenJi', 'faSongTongZhi'), yongHuId],
      )
      expect(shenJiJieGuo.rows.length).toBeGreaterThanOrEqual(1)
      expect(shenJiJieGuo.rows[0].IP).toBeDefined()
      expect(shenJiJieGuo.rows[0].详情).toHaveProperty('mu_biao')
      expect(shenJiJieGuo.rows[0].详情).toHaveProperty('jie_shou_ren_shu')
    } finally {
      await qingChuCeShiYongHu(shouJiHao)
    }
  })
})
