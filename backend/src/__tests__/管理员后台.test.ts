process.env.ADMIN_PHONES = '13800000000'
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://lovewithme:BXYXblupz542284@localhost:5432/lovewithme'
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
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
import { 初始化聊天Socket } from '../socket/聊天'
import { chuShiHuaTongZhiSocket } from '../socket/通知'
import { chuShiHuaDuoSheSocket } from '../socket/夺舍'
import { sheZhiIo } from '../socket/io'
import { huoQuFanYi } from '../config/translations'
import { chuShiHuaHaoGanDu } from '../services/好感度'
import { xieRuJiYi } from '../services/记忆'
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

async function chuangJianJiaoSe(
  yongHuId: string,
  mingZi: string = '测试角色',
): Promise<string> {
  const jieGuo = await 数据库.query(
    `INSERT INTO "角色" (
      "用户ID", "名字", "性别", "年龄", "MBTI", "IE类型", "热身类型",
      "微信昵称", "开场白", "喜欢的类型", "家庭背景", "情感经历"
    ) VALUES ($1, $2, '女', 20, 'INTJ', 'I', '慢热', '测试昵称', '["你好"]'::jsonb, '温柔的', '普通家庭', '有过一段')
    RETURNING *`,
    [yongHuId, mingZi],
  )
  const jiaoSeId = String(jieGuo.rows[0].ID)
  await chuShiHuaHaoGanDu(yongHuId, jiaoSeId, 450)
  return jiaoSeId
}

async function chuangJianXiaoXi(
  yongHuId: string,
  jiaoSeId: string,
  neiRong: string,
  faSongZhe: 'yonghu' | 'jiaose' = 'yonghu',
): Promise<string> {
  const jieGuo = await 数据库.query(
    `INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读")
     VALUES ($1, $2, $3, $4, 'wenben', true) RETURNING *`,
    [yongHuId, jiaoSeId, neiRong, faSongZhe],
  )
  return String(jieGuo.rows[0].ID)
}

async function chuangJianJiYi(
  yongHuId: string,
  jiaoSeId: string,
  zhaiYao: string,
  zhongYaoDu: number,
): Promise<void> {
  await xieRuJiYi({
    yong_hu_id: yongHuId,
    jiao_se_id: jiaoSeId,
    zhai_yao: zhaiYao,
    zhong_yao_du: zhongYaoDu,
    guan_jian_ci: ['测试'],
    shi_jian_lei_xing: '测试事件',
  })
}

function dengDaiLianJie(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve())
    socket.once('connect_error', (cuoWu) => reject(cuoWu))
    setTimeout(() => reject(new Error('Socket连接超时')), 15000)
  })
}

function dengDaiShiJian(socket: Socket, shiJian: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    socket.once(shiJian, (shuJu: Record<string, unknown>) => resolve(shuJu))
    setTimeout(() => reject(new Error(`未收到${shiJian}事件`)), 15000)
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
初始化聊天Socket(testIo)
chuShiHuaTongZhiSocket(testIo)
chuShiHuaDuoSheSocket(testIo)
let testDuanKou = 0

describe.sequential('FP-16 管理员后台', () => {
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

  it('非管理员访问管理员路由返回403', async () => {
    const shouJiHao = suiJiShouJiHao()
    const { lingPai } = await zhuCeYongHu(shouJiHao, `普通用户${Date.now()}`)

    try {
      const xiangYing = await request(yingYong)
        .get('/api/管理/用户')
        .set('Authorization', `Bearer ${lingPai}`)
        .expect(403)

      expect(xiangYing.body.cheng_gong).toBe(false)
    } finally {
      await qingChuCeShiYongHu(shouJiHao)
    }
  })

  it('用户列表API每条记录包含角色数和消息数字段', async () => {
    const { lingPai: guanLiYuanLingPai, shouJiHao: guanLiYuanShouJiHao } = await zhuCeGuanLiYuan(`管理员${Date.now()}`)
    const puTongShouJiHao = suiJiShouJiHao()
    const { yongHuId: puTongYongHuId } = await zhuCeYongHu(puTongShouJiHao, `普通用户${Date.now()}`)

    try {
      const jiaoSeId = await chuangJianJiaoSe(puTongYongHuId, '列表测试角色')
      await chuangJianXiaoXi(puTongYongHuId, jiaoSeId, '测试消息1')
      await chuangJianXiaoXi(puTongYongHuId, jiaoSeId, '测试消息2')

      const xiangYing = await request(yingYong)
        .get('/api/管理/用户')
        .set('Authorization', `Bearer ${guanLiYuanLingPai}`)
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(Array.isArray(xiangYing.body.shu_ju.lie_biao)).toBe(true)

      const puTongYongHu = xiangYing.body.shu_ju.lie_biao.find(
        (yongHu: { id: string }) => yongHu.id === puTongYongHuId,
      )
      expect(puTongYongHu).toBeDefined()
      expect(puTongYongHu.jiao_se_shu).toBeGreaterThanOrEqual(1)
      expect(puTongYongHu.xiao_xi_shu).toBeGreaterThanOrEqual(2)
    } finally {
      await qingChuCeShiYongHu(guanLiYuanShouJiHao)
      await qingChuCeShiYongHu(puTongShouJiHao)
    }
  })

  it('对话列表API每条记录包含阶段、总分、夺舍状态字段', async () => {
    const { lingPai: guanLiYuanLingPai, shouJiHao: guanLiYuanShouJiHao } = await zhuCeGuanLiYuan(`管理员${Date.now()}`)
    const puTongShouJiHao = suiJiShouJiHao()
    const { yongHuId: puTongYongHuId } = await zhuCeYongHu(puTongShouJiHao, `普通用户${Date.now()}`)

    try {
      const jiaoSeId = await chuangJianJiaoSe(puTongYongHuId, '对话列表角色')

      const xiangYing = await request(yingYong)
        .get('/api/管理/对话')
        .set('Authorization', `Bearer ${guanLiYuanLingPai}`)
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      const duiHua = xiangYing.body.shu_ju.lie_biao.find(
        (d: { jiao_se_id: string }) => d.jiao_se_id === jiaoSeId,
      )
      expect(duiHua).toBeDefined()
      expect(duiHua.jie_duan).toBeDefined()
      expect(typeof duiHua.zong_fen).toBe('number')
      expect(typeof duiHua.duo_she_zhuang_tai).toBe('boolean')
    } finally {
      await qingChuCeShiYongHu(guanLiYuanShouJiHao)
      await qingChuCeShiYongHu(puTongShouJiHao)
    }
  })

  it('对话详情API返回角色信息+用户信息+最多200条消息+好感度+最多20条记忆', async () => {
    const { lingPai: guanLiYuanLingPai, shouJiHao: guanLiYuanShouJiHao } = await zhuCeGuanLiYuan(`管理员${Date.now()}`)
    const puTongShouJiHao = suiJiShouJiHao()
    const { yongHuId: puTongYongHuId } = await zhuCeYongHu(puTongShouJiHao, `普通用户${Date.now()}`)

    try {
      const jiaoSeId = await chuangJianJiaoSe(puTongYongHuId, '对话详情角色')
      await chuangJianXiaoXi(puTongYongHuId, jiaoSeId, '消息1')
      await chuangJianJiYi(puTongYongHuId, jiaoSeId, '记忆1', 5)
      await chuangJianJiYi(puTongYongHuId, jiaoSeId, '记忆2', 7)

      const xiangYing = await request(yingYong)
        .get(`/api/管理/对话/${jiaoSeId}`)
        .set('Authorization', `Bearer ${guanLiYuanLingPai}`)
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju.jiao_se).toBeDefined()
      expect(xiangYing.body.shu_ju.yong_hu).toBeDefined()
      expect(Array.isArray(xiangYing.body.shu_ju.xiao_xi_lie_biao)).toBe(true)
      expect(xiangYing.body.shu_ju.xiao_xi_lie_biao.length).toBeLessThanOrEqual(200)
      expect(xiangYing.body.shu_ju.hao_gan_du).toBeDefined()
      expect(xiangYing.body.shu_ju.hao_gan_du.zong_fen).toBeDefined()
      expect(Array.isArray(xiangYing.body.shu_ju.ji_yi_lie_biao)).toBe(true)
      expect(xiangYing.body.shu_ju.ji_yi_lie_biao.length).toBeLessThanOrEqual(20)
    } finally {
      await qingChuCeShiYongHu(guanLiYuanShouJiHao)
      await qingChuCeShiYongHu(puTongShouJiHao)
    }
  })

  it('角色信息API返回最多30条记忆且按重要度倒序排列', async () => {
    const { lingPai: guanLiYuanLingPai, shouJiHao: guanLiYuanShouJiHao } = await zhuCeGuanLiYuan(`管理员${Date.now()}`)
    const puTongShouJiHao = suiJiShouJiHao()
    const { yongHuId: puTongYongHuId } = await zhuCeYongHu(puTongShouJiHao, `普通用户${Date.now()}`)

    try {
      const jiaoSeId = await chuangJianJiaoSe(puTongYongHuId, '角色信息角色')
      for (let i = 0; i < 5; i++) {
        await chuangJianJiYi(puTongYongHuId, jiaoSeId, `记忆${i}`, i + 1)
      }

      const xiangYing = await request(yingYong)
        .get(`/api/管理/角色/${jiaoSeId}`)
        .set('Authorization', `Bearer ${guanLiYuanLingPai}`)
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju.jiao_se).toBeDefined()
      expect(Array.isArray(xiangYing.body.shu_ju.ji_yi_lie_biao)).toBe(true)
      expect(xiangYing.body.shu_ju.ji_yi_lie_biao.length).toBeLessThanOrEqual(30)

      const jiYi = xiangYing.body.shu_ju.ji_yi_lie_biao
      for (let i = 0; i < jiYi.length - 1; i++) {
        expect(jiYi[i].zhong_yao_du).toBeGreaterThanOrEqual(jiYi[i + 1].zhong_yao_du)
      }
    } finally {
      await qingChuCeShiYongHu(guanLiYuanShouJiHao)
      await qingChuCeShiYongHu(puTongShouJiHao)
    }
  })

  it('管理员夺舍角色后Redis存在夺舍键', async () => {
    const { lingPai: guanLiYuanLingPai, yongHuId: guanLiYuanYongHuId, shouJiHao: guanLiYuanShouJiHao } = await zhuCeGuanLiYuan(`管理员${Date.now()}`)
    const puTongShouJiHao = suiJiShouJiHao()
    const { yongHuId: puTongYongHuId } = await zhuCeYongHu(puTongShouJiHao, `普通用户${Date.now()}`)

    try {
      const jiaoSeId = await chuangJianJiaoSe(puTongYongHuId, '夺舍测试角色')
      await redis.del(`夺舍:${jiaoSeId}`)

      await request(yingYong)
        .post(`/api/管理/夺舍/${jiaoSeId}`)
        .set('Authorization', `Bearer ${guanLiYuanLingPai}`)
        .expect(200)

      const duoSheZhe = await redis.get(`夺舍:${jiaoSeId}`)
      expect(duoSheZhe).toBe(guanLiYuanYongHuId)
    } finally {
      await qingChuCeShiYongHu(guanLiYuanShouJiHao)
      await qingChuCeShiYongHu(puTongShouJiHao)
    }
  })

  it('夺舍后用户发送消息管理员Socket立即收到消息转发', async () => {
    const { lingPai: guanLiYuanLingPai, shouJiHao: guanLiYuanShouJiHao } = await zhuCeGuanLiYuan(`管理员${Date.now()}`)
    const puTongShouJiHao = suiJiShouJiHao()
    const { lingPai: puTongLingPai, yongHuId: puTongYongHuId } = await zhuCeYongHu(puTongShouJiHao, `普通用户${Date.now()}`)

    const jiaoSeId = await chuangJianJiaoSe(puTongYongHuId, '夺舍转发角色')
    await redis.del(`夺舍:${jiaoSeId}`)

    const guanLiYuanSocket = keHuDuanIo(`http://localhost:${testDuanKou}`, {
      path: '/socket.io',
      auth: { token: guanLiYuanLingPai },
      transports: ['websocket'],
    })
    const puTongSocket = keHuDuanIo(`http://localhost:${testDuanKou}`, {
      path: '/socket.io',
      auth: { token: puTongLingPai },
      transports: ['websocket'],
    })

    try {
      await Promise.all([dengDaiLianJie(guanLiYuanSocket), dengDaiLianJie(puTongSocket)])

      await new Promise<void>((resolve, reject) => {
        guanLiYuanSocket.emit('夺舍', jiaoSeId, (jieGuo: { cheng_gong: boolean }) => {
          if (jieGuo.cheng_gong) resolve()
          else reject(new Error('夺舍失败'))
        })
        setTimeout(() => reject(new Error('夺舍确认超时')), 15000)
      })

      puTongSocket.emit('加入聊天', jiaoSeId)
      await new Promise((resolve) => setTimeout(resolve, 300))

      await request(yingYong)
        .post(`/api/聊天/会话/${jiaoSeId}/消息`)
        .set('Authorization', `Bearer ${puTongLingPai}`)
        .send({ neiRong: '管理员你在吗' })
        .expect(200)

      puTongSocket.emit('发送消息')

      const zhuanFaShuJu = await dengDaiShiJian(guanLiYuanSocket, '夺舍消息')
      expect(zhuanFaShuJu.jiao_se_id).toBe(jiaoSeId)
      expect(zhuanFaShuJu.yong_hu_id).toBe(puTongYongHuId)
      expect(zhuanFaShuJu.xiao_xi).toBeDefined()
    } finally {
      await daDuanSocket(guanLiYuanSocket)
      await daDuanSocket(puTongSocket)
      await qingChuCeShiYongHu(guanLiYuanShouJiHao)
      await qingChuCeShiYongHu(puTongShouJiHao)
    }
  })

  it('管理员开始编写回复时用户收到对方正在输入事件', async () => {
    const { lingPai: guanLiYuanLingPai, shouJiHao: guanLiYuanShouJiHao } = await zhuCeGuanLiYuan(`管理员${Date.now()}`)
    const puTongShouJiHao = suiJiShouJiHao()
    const { lingPai: puTongLingPai, yongHuId: puTongYongHuId } = await zhuCeYongHu(puTongShouJiHao, `普通用户${Date.now()}`)

    const jiaoSeId = await chuangJianJiaoSe(puTongYongHuId, '输入通知角色')
    await redis.del(`夺舍:${jiaoSeId}`)

    const guanLiYuanSocket = keHuDuanIo(`http://localhost:${testDuanKou}`, {
      path: '/socket.io',
      auth: { token: guanLiYuanLingPai },
      transports: ['websocket'],
    })
    const puTongSocket = keHuDuanIo(`http://localhost:${testDuanKou}`, {
      path: '/socket.io',
      auth: { token: puTongLingPai },
      transports: ['websocket'],
    })

    try {
      await Promise.all([dengDaiLianJie(guanLiYuanSocket), dengDaiLianJie(puTongSocket)])
      puTongSocket.emit('加入聊天', jiaoSeId)
      await new Promise((resolve) => setTimeout(resolve, 300))

      await new Promise<void>((resolve, reject) => {
        guanLiYuanSocket.emit('夺舍', jiaoSeId, (jieGuo: { cheng_gong: boolean }) => {
          if (jieGuo.cheng_gong) resolve()
          else reject(new Error('夺舍失败'))
        })
        setTimeout(() => reject(new Error('夺舍确认超时')), 15000)
      })

      const shuRuYingDa = dengDaiShiJian(puTongSocket, '对方正在输入')
      guanLiYuanSocket.emit('开始输入', { jiao_se_id: jiaoSeId })
      const shuRuShuJu = await shuRuYingDa
      expect(shuRuShuJu).toBe(jiaoSeId)
    } finally {
      await daDuanSocket(guanLiYuanSocket)
      await daDuanSocket(puTongSocket)
      await qingChuCeShiYongHu(guanLiYuanShouJiHao)
      await qingChuCeShiYongHu(puTongShouJiHao)
    }
  })

  it('非夺舍管理员尝试归还角色返回403', async () => {
    const { lingPai: lingPaiA, shouJiHao: guanLiYuanAShouJiHao } = await zhuCeGuanLiYuan(`管理员A${Date.now()}`)
    const { lingPai: lingPaiB, shouJiHao: guanLiYuanBShouJiHao } = await zhuCeGuanLiYuan(`管理员B${Date.now()}`)
    const puTongShouJiHao = suiJiShouJiHao()
    const { yongHuId: puTongYongHuId } = await zhuCeYongHu(puTongShouJiHao, `普通用户${Date.now()}`)

    try {
      const jiaoSeId = await chuangJianJiaoSe(puTongYongHuId, '归还403角色')
      await redis.del(`夺舍:${jiaoSeId}`)

      await request(yingYong)
        .post(`/api/管理/夺舍/${jiaoSeId}`)
        .set('Authorization', `Bearer ${lingPaiA}`)
        .expect(200)

      const xiangYing = await request(yingYong)
        .post(`/api/管理/归还/${jiaoSeId}`)
        .set('Authorization', `Bearer ${lingPaiB}`)
        .expect(403)

      expect(xiangYing.body.cheng_gong).toBe(false)
    } finally {
      await qingChuCeShiYongHu(guanLiYuanAShouJiHao)
      await qingChuCeShiYongHu(guanLiYuanBShouJiHao)
      await qingChuCeShiYongHu(puTongShouJiHao)
    }
  })

  it('夺舍操作后夺舍日志表新增记录', async () => {
    const { yongHuId: guanLiYuanYongHuId, shouJiHao: guanLiYuanShouJiHao } = await zhuCeGuanLiYuan(`管理员${Date.now()}`)
    const puTongShouJiHao = suiJiShouJiHao()
    const { yongHuId: puTongYongHuId } = await zhuCeYongHu(puTongShouJiHao, `普通用户${Date.now()}`)

    try {
      const jiaoSeId = await chuangJianJiaoSe(puTongYongHuId, '夺舍日志角色')
      await redis.del(`夺舍:${jiaoSeId}`)

      await jiLuDuoSheImport(guanLiYuanYongHuId, jiaoSeId)

      const jieGuo = await 数据库.query(
        `SELECT * FROM "夺舍日志" WHERE "管理员ID" = $1 AND "角色ID" = $2`,
        [guanLiYuanYongHuId, jiaoSeId],
      )
      expect(jieGuo.rows.length).toBeGreaterThanOrEqual(1)
    } finally {
      await qingChuCeShiYongHu(guanLiYuanShouJiHao)
      await qingChuCeShiYongHu(puTongShouJiHao)
    }
  })

  it('创建测试用户后用户表新增记录且测试为true', async () => {
    const { lingPai: guanLiYuanLingPai, shouJiHao: guanLiYuanShouJiHao } = await zhuCeGuanLiYuan(`管理员${Date.now()}`)
    const ceShiShouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(ceShiShouJiHao)

    try {
      const xiangYing = await request(yingYong)
        .post('/api/管理/测试用户')
        .set('Authorization', `Bearer ${guanLiYuanLingPai}`)
        .send({ shouJiHao: ceShiShouJiHao, yongHuMing: `测试用户${Date.now()}` })
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(xiangYing.body.shu_ju.yong_hu.ce_shi).toBe(true)

      const jieGuo = await 数据库.query(
        `SELECT "测试" FROM "用户" WHERE "手机号" = $1`,
        [ceShiShouJiHao],
      )
      expect(jieGuo.rows[0].测试).toBe(true)
    } finally {
      await qingChuCeShiYongHu(guanLiYuanShouJiHao)
      await qingChuCeShiYongHu(ceShiShouJiHao)
    }
  })

  it('登录测试用户直接返回JWT令牌无需密码', async () => {
    const { lingPai: guanLiYuanLingPai, shouJiHao: guanLiYuanShouJiHao } = await zhuCeGuanLiYuan(`管理员${Date.now()}`)
    const ceShiShouJiHao = suiJiShouJiHao()
    await qingChuCeShiYongHu(ceShiShouJiHao)

    try {
      await request(yingYong)
        .post('/api/管理/测试用户')
        .set('Authorization', `Bearer ${guanLiYuanLingPai}`)
        .send({ shouJiHao: ceShiShouJiHao, yongHuMing: `测试用户${Date.now()}` })
        .expect(200)

      const xiangYing = await request(yingYong)
        .post('/api/管理/测试用户登录')
        .set('Authorization', `Bearer ${guanLiYuanLingPai}`)
        .send({ shouJiHao: ceShiShouJiHao })
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      expect(typeof xiangYing.body.shu_ju.ling_pai).toBe('string')
      expect(xiangYing.body.shu_ju.ling_pai.length).toBeGreaterThan(0)
    } finally {
      await qingChuCeShiYongHu(guanLiYuanShouJiHao)
      await qingChuCeShiYongHu(ceShiShouJiHao)
    }
  })

  it('系统状态API返回所需字段且不含积分相关字段', async () => {
    const { lingPai: guanLiYuanLingPai, shouJiHao: guanLiYuanShouJiHao } = await zhuCeGuanLiYuan(`管理员${Date.now()}`)

    try {
      const xiangYing = await request(yingYong)
        .get('/api/管理/系统状态')
        .set('Authorization', `Bearer ${guanLiYuanLingPai}`)
        .expect(200)

      expect(xiangYing.body.cheng_gong).toBe(true)
      const shuJu = xiangYing.body.shu_ju
      expect(typeof shuJu.yong_hu_shu).toBe('number')
      expect(typeof shuJu.jiao_se_shu).toBe('number')
      expect(typeof shuJu.xiao_xi_shu).toBe('number')
      expect(shuJu.jin_ri_xin_zeng).toBeDefined()
      expect(typeof shuJu.jin_ri_xin_zeng.yong_hu).toBe('number')
      expect(typeof shuJu.jin_ri_xin_zeng.jiao_se).toBe('number')
      expect(typeof shuJu.jin_ri_xin_zeng.xiao_xi).toBe('number')
      expect(typeof shuJu.redis_jian_shu).toBe('number')
      expect(Array.isArray(shuJu.shen_ji_ri_zhi)).toBe(true)
      expect(shuJu.shen_ji_ri_zhi.length).toBeLessThanOrEqual(20)

      const shuJuWenBen = JSON.stringify(shuJu)
      expect(shuJuWenBen).not.toContain('积分')
    } finally {
      await qingChuCeShiYongHu(guanLiYuanShouJiHao)
    }
  })

  it('删除自己返回400', async () => {
    const { lingPai: guanLiYuanLingPai, yongHuId: guanLiYuanYongHuId, shouJiHao: guanLiYuanShouJiHao } = await zhuCeGuanLiYuan(`管理员${Date.now()}`)

    try {
      const xiangYing = await request(yingYong)
        .delete(`/api/管理/用户/${guanLiYuanYongHuId}`)
        .set('Authorization', `Bearer ${guanLiYuanLingPai}`)
        .expect(400)

      expect(xiangYing.body.cheng_gong).toBe(false)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('guanLiYuan', 'buNengShanChuZiJi'))
    } finally {
      await qingChuCeShiYongHu(guanLiYuanShouJiHao)
    }
  })

  it('所有管理员操作后审计日志表新增记录', async () => {
    const { lingPai: guanLiYuanLingPai, yongHuId: guanLiYuanYongHuId, shouJiHao: guanLiYuanShouJiHao } = await zhuCeGuanLiYuan(`管理员${Date.now()}`)

    try {
      await request(yingYong)
        .get('/api/管理/用户')
        .set('Authorization', `Bearer ${guanLiYuanLingPai}`)
        .expect(200)

      const jieGuo = await 数据库.query(
        `SELECT * FROM "审计日志" WHERE "用户ID" = $1 ORDER BY "创建时间" DESC LIMIT 1`,
        [guanLiYuanYongHuId],
      )
      expect(jieGuo.rows.length).toBeGreaterThanOrEqual(1)
      expect(jieGuo.rows[0].IP).toBeDefined()
      expect(jieGuo.rows[0].事件类型).toBeDefined()
      expect(jieGuo.rows[0].详情).toBeDefined()
    } finally {
      await qingChuCeShiYongHu(guanLiYuanShouJiHao)
    }
  })

  it('源码搜索x-admin-token无匹配', async () => {
    const { execSync } = await import('child_process')
    let jieGuo = ''
    try {
      jieGuo = execSync(
        'rg -i "x-admin-token" --type ts --glob "!__tests__" D:\\XiTongWenJianJia\\ZhuoMian\\燃烧之陨我的世界服务端\\和我恋爱吧\\backend\\src',
        { encoding: 'utf-8' },
      )
    } catch (cuoWu: unknown) {
      const execCuoWu = cuoWu as { status?: number; stdout?: string }
      if (execCuoWu.status === 1) {
        jieGuo = execCuoWu.stdout || ''
      } else {
        throw cuoWu
      }
    }
    expect(jieGuo.trim()).toBe('')
  })
})

import { jiLuDuoShe } from '../services/夺舍'

async function jiLuDuoSheImport(guanLiYuanId: string, jiaoSeId: string): Promise<void> {
  await jiLuDuoShe(guanLiYuanId, jiaoSeId)
}
