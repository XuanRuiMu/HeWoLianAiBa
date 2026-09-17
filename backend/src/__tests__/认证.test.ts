import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import { createServer } from 'http'
import type { AddressInfo } from 'net'
import { Server as SocketIoServer } from 'socket.io'
import { io as keHuDuanIo } from 'socket.io-client'
import type { Socket as KeHuDuanSocket } from 'socket.io-client'
import bcrypt from 'bcryptjs'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { peiZhi } from '../config'
import { huoQuFanYi } from '../config/translations'
import { xieRuCheXiaoShiJianCuo, lingPaiShiFouYiCheXiao, huoQuCheXiaoJian } from '../utils/jwt'
import {
  renZhengSocketZhongJianJian,
  guaZaiCheXiaoShouWei,
  qingLiCheXiaoHuanCun,
  type RenZhengSocket,
} from '../socket/认证'

function suiJiShouJiHao(): string {
  return `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

async function zhuCeCeShiYongHu(shouJiHao: string, yongHuMing: string, miMa: string): Promise<string> {
  await redis.setex(`yan_zheng_ma:${shouJiHao}`, 300, '123456')
  const xiangYing = await request(yingYong)
    .post('/api/认证/注册')
    .set('X-Real-IP', huoQuDuTeIP())
    .send({
      shouJiHao,
      yanZhengMa: '123456',
      yongHuMing,
      miMa,
      tongYiXieYi: true,
      chuShengRiQi: '2000-01-01',
    })
    .expect(200)
  return xiangYing.body.shu_ju.令牌
}

async function gengGaiMiMaChengGong(
  lingPai: string,
  jiuMiMa: string,
  xinMiMa: string,
): Promise<void> {
  await request(yingYong)
    .post('/api/认证/更改密码')
    .set('Authorization', `Bearer ${lingPai}`)
    .send({
      jiuMiMa,
      xinMiMa,
      queRenXinMiMa: xinMiMa,
      yanZhengMa: '123456',
    })
    .expect(200)
}

async function qingLiCeShiYongHu(shouJiHao: string): Promise<void> {
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  await redis.del(`yan_zheng_ma:${shouJiHao}`)
  await redis.del(`fa_song_jian_ge:${shouJiHao}`)
  await redis.del(`deng_lu_shi_bai:${shouJiHao}`)
}

let duTeIPXuHao = 0
function huoQuDuTeIP(): string {
  duTeIPXuHao += 1
  return `198.51.100.${duTeIPXuHao % 250 + 1}`
}
describe('FP-01 用户认证模块', () => {
  const ceShiShouJiHao = suiJiShouJiHao()
  const ceShiYongHuMing = `测试用户${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const ceShiMiMa = 'testPassword123'
  let lingPai = ''

  beforeAll(async () => {
    await qingLiCeShiYongHu(ceShiShouJiHao)
  })

  afterAll(async () => {
    await qingLiCeShiYongHu(ceShiShouJiHao)
    await 数据库.end()
    await redis.quit()
  })

  it('检查手机号：格式错误返回400并匹配翻译文件', async () => {
    const xiangYing = await request(yingYong)
      .get('/api/认证/检查手机?shouJiHao=12345')
      .expect(400)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'shouJiHaoGeShiCuoWu'))
  })

  it('检查手机模糊响应：已注册与未注册返回同一成功形态（YH-028防枚举）', async () => {
    const yiZhuCe = await request(yingYong)
      .get(`/api/认证/检查手机?shouJiHao=${ceShiShouJiHao}`)
      .expect(200)
    const weiZhuCe = await request(yingYong)
      .get('/api/认证/检查手机?shouJiHao=13900000000')
      .expect(200)
    expect(yiZhuCe.body.cheng_gong).toBe(weiZhuCe.body.cheng_gong)
    expect(JSON.stringify(yiZhuCe.body)).toBe(JSON.stringify(weiZhuCe.body))
  })

  it('发送验证码：首次成功，60秒内重复返回429', async () => {
    const shouJiHao = suiJiShouJiHao()
    await qingLiCeShiYongHu(shouJiHao)

    try {
      const xiangYing1 = await request(yingYong)
        .post('/api/认证/发送码')
        .send({ shouJiHao })
        .expect(200)
      expect(xiangYing1.body.cheng_gong).toBe(true)

      const xiangYing2 = await request(yingYong)
        .post('/api/认证/发送码')
        .send({ shouJiHao })
        .expect(429)
      expect(xiangYing2.body.cheng_gong).toBe(false)
      expect(xiangYing2.body.ti_shi).toBe(huoQuFanYi('renZheng', 'faSongYanZhengMaPinFan'))
    } finally {
      await qingLiCeShiYongHu(shouJiHao)
    }
  })

  it('注册：未勾选用户协议返回400', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/认证/注册')
      .send({
        shouJiHao: ceShiShouJiHao,
        yanZhengMa: '123456',
        yongHuMing: ceShiYongHuMing,
        miMa: ceShiMiMa,
        tongYiXieYi: false,
        chuShengRiQi: '2000-01-01',
      })
      .expect(400)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'weiTongYiXieYi'))
  })

  it('注册：成功返回200并含令牌与用户字段', async () => {
    await request(yingYong)
      .post('/api/认证/发送码')
      .set('X-Real-IP', huoQuDuTeIP())
      .send({ shouJiHao: ceShiShouJiHao })
      .expect(200)

    const xiangYing = await request(yingYong)
      .post('/api/认证/注册')
      .set('X-Real-IP', huoQuDuTeIP())
      .send({
        shouJiHao: ceShiShouJiHao,
        yanZhengMa: '123456',
        yongHuMing: ceShiYongHuMing,
        miMa: ceShiMiMa,
        tongYiXieYi: true,
        chuShengRiQi: '2000-01-01',
      })
      .expect(200)

    expect(xiangYing.body.cheng_gong).toBe(true)
    expect(xiangYing.body.shu_ju).toHaveProperty('令牌')
    expect(typeof xiangYing.body.shu_ju.令牌).toBe('string')
    expect(xiangYing.body.shu_ju).toHaveProperty('用户')
    expect(xiangYing.body.shu_ju.用户.shou_ji_hao).toBe(ceShiShouJiHao.slice(0, 3) + '****' + ceShiShouJiHao.slice(-4))
    expect(xiangYing.body.shu_ju).toHaveProperty('新用户')
    expect(xiangYing.body.shu_ju).toHaveProperty('是否管理员')
    lingPai = xiangYing.body.shu_ju.令牌
  })

  it('注册：已注册手机号返回409', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/认证/注册')
      .set('X-Real-IP', huoQuDuTeIP())
      .send({
        shouJiHao: ceShiShouJiHao,
        yanZhengMa: '123456',
        yongHuMing: `${ceShiYongHuMing}2`,
        miMa: ceShiMiMa,
        tongYiXieYi: true,
        chuShengRiQi: '2000-01-01',
      })
      .expect(409)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'shouJiHaoYiZhuCe'))
  })

  it('登录：密码错误返回401且文案为统一的账号或密码错误', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/认证/登录')
      .send({ shouJiHao: ceShiShouJiHao, miMa: 'wrongPassword' })
      .expect(401)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'zhangHaoHuoMiMaCuoWu'))
    await redis.del(`deng_lu_shi_bai:${ceShiShouJiHao}`)
  })

  it('登录：未注册手机号与密码错误返回完全一致的响应（防枚举）', async () => {
    const weiZhuCeXiangYing = await request(yingYong)
      .post('/api/认证/登录')
      .send({ shouJiHao: '13900000000', miMa: 'anyPassword' })
      .expect(401)

    const cuoMiMaXiangYing = await request(yingYong)
      .post('/api/认证/登录')
      .send({ shouJiHao: ceShiShouJiHao, miMa: 'wrongPassword' })
      .expect(401)

    expect(weiZhuCeXiangYing.status).toBe(cuoMiMaXiangYing.status)
    expect(weiZhuCeXiangYing.body.ti_shi).toBe(cuoMiMaXiangYing.body.ti_shi)
    expect(weiZhuCeXiangYing.body.cheng_gong).toBe(cuoMiMaXiangYing.body.cheng_gong)
    expect(weiZhuCeXiangYing.body.shu_ju).toBe(cuoMiMaXiangYing.body.shu_ju)
    expect(weiZhuCeXiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'zhangHaoHuoMiMaCuoWu'))
  })

  it('检查手机：超过独立限流阈值后返回429', async () => {
    duTeIPXuHao += 1
    const benCiIP = `198.51.100.${100 + duTeIPXuHao}`
    let zuiHouXiangYing: request.Response | undefined
    for (let i = 0; i < 12; i++) {
      zuiHouXiangYing = await request(yingYong)
        .get('/api/认证/检查手机?shouJiHao=13800001234')
        .set('X-Real-IP', benCiIP)
    }
    expect(zuiHouXiangYing!.status).toBe(429)
    expect(zuiHouXiangYing!.body.cheng_gong).toBe(false)
    expect(zuiHouXiangYing!.body.ti_shi).toBe(huoQuFanYi('tongYong', 'caoZuoPinFan'))
  })

  it('登录：60秒内失败超5次第6次返回429并记录审计日志', async () => {
    const shouJiHao = suiJiShouJiHao()
    await qingLiCeShiYongHu(shouJiHao)
    // 阈值生产/非生产环境不同（5/100），测试内显式固定为5，用例结束恢复
    const yuanZuiDa = peiZhi.xianLiu.dengLu.zuiDa
    peiZhi.xianLiu.dengLu.zuiDa = 5
    // 独立 X-Real-IP 隔离 IP 维度限流计数（双层限流下 IP 桶由同文件其他测试共享）
    duTeIPXuHao += 1
    const benCiIP = `198.51.100.${duTeIPXuHao}`

    try {
      for (let i = 0; i < 5; i++) {
        await request(yingYong)
          .post('/api/认证/登录')
          .set('X-Real-IP', benCiIP)
          .send({ shouJiHao, miMa: 'wrongPassword' })
      }

      const xiangYing = await request(yingYong)
        .post('/api/认证/登录')
        .set('X-Real-IP', benCiIP)
        .send({ shouJiHao, miMa: 'wrongPassword' })
        .expect(429)
      expect(xiangYing.body.cheng_gong).toBe(false)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'dengLuShiBaiPinFan'))

      // C8：审计日志中手机号必须为掩码形态（前3后4），不落明文
      const yanMa = `${shouJiHao.slice(0, 3)}****${shouJiHao.slice(-4)}`
      const shenJiJieGuo = await 数据库.query(
        `SELECT * FROM "审计日志" WHERE "事件类型" = $1 AND "详情"->>'shou_ji_hao' = $2 ORDER BY "创建时间" DESC`,
        [huoQuFanYi('shenJi', 'dengLuShiBai'), yanMa],
      )
      expect(shenJiJieGuo.rows.length).toBeGreaterThanOrEqual(5)
      const jiLu = shenJiJieGuo.rows[0]
      expect(jiLu.IP).toBeDefined()
      expect(jiLu.详情.shou_ji_hao).toBe(yanMa)
      expect(jiLu.创建时间).toBeDefined()
    } finally {
      peiZhi.xianLiu.dengLu.zuiDa = yuanZuiDa
      await qingLiCeShiYongHu(shouJiHao)
    }
  })

  it('登录：成功后可用令牌获取用户信息', async () => {
    const xiangYing = await request(yingYong)
      .get('/api/认证/信息')
      .set('Authorization', `Bearer ${lingPai}`)
      .expect(200)

    expect(xiangYing.body.cheng_gong).toBe(true)
    expect(xiangYing.body.shu_ju.shou_ji_hao).toBe(ceShiShouJiHao.slice(0, 3) + '****' + ceShiShouJiHao.slice(-4))
  })

  it('更改用户名：重复用户名失败', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/认证/更改用户名')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({ yongHuMing: ceShiYongHuMing })
      .expect(400)

    expect(xiangYing.body.cheng_gong).toBe(false)
  })

  it('更改密码：旧密码/新密码/确认密码/验证码不匹配返回错误', async () => {
    const xiangYing = await request(yingYong)
      .post('/api/认证/更改密码')
      .set('Authorization', `Bearer ${lingPai}`)
      .send({
        jiuMiMa: ceShiMiMa,
        xinMiMa: 'newPassword123',
        queRenXinMiMa: 'differentPassword',
        yanZhengMa: '123456',
      })
      .expect(400)

    expect(xiangYing.body.cheng_gong).toBe(false)
    expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('renZheng', 'miMaBuYiZhi'))
  })

  describe('P1-2 令牌吊销链路（用户级吊销时间戳）', () => {
  const ceShiMiMaJiu = 'OldPassword123'
  const ceShiMiMaXin = 'NewPassword456'
  const diaoXiaoFuWuQi = createServer()
  const diaoXiaoIo = new SocketIoServer(diaoXiaoFuWuQi, {
    cors: { origin: '*' },
    path: '/socket.io',
  })
  diaoXiaoIo.use(renZhengSocketZhongJianJian)
  let diaoXiaoDuanKou = 0

  function dengDaiLianJieChengGong(socket: KeHuDuanSocket): Promise<void> {
    return new Promise((resolve, reject) => {
      socket.once('connect', () => resolve())
      socket.once('connect_error', (cuoWu) => reject(cuoWu))
      setTimeout(() => reject(new Error('Socket连接超时')), 15000)
    })
  }

  function dengDaiLianJieShiBai(socket: KeHuDuanSocket): Promise<Error> {
    return new Promise((resolve, reject) => {
      socket.once('connect_error', (cuoWu) => resolve(cuoWu))
      socket.once('connect', () => reject(new Error('预期握手失败但连接成功了')))
      setTimeout(() => reject(new Error('等待握手失败超时')), 15000)
    })
  }

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      diaoXiaoFuWuQi.listen(0, () => {
        diaoXiaoDuanKou = (diaoXiaoFuWuQi.address() as AddressInfo).port
        resolve()
      })
    })
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      diaoXiaoIo.close(() => {
        diaoXiaoFuWuQi.close(() => resolve())
      })
    })
  })

  it('更改密码后：旧令牌HTTP接口401，重新登录的新令牌正常（回归）', async () => {
    const shouJiHao = suiJiShouJiHao()
    await qingLiCeShiYongHu(shouJiHao)
    try {
      const jiuLingPai = await zhuCeCeShiYongHu(shouJiHao, `吊销测试${Date.now()}`, ceShiMiMaJiu)

      const gaiQianXiangYing = await request(yingYong)
        .get('/api/认证/信息')
        .set('Authorization', `Bearer ${jiuLingPai}`)
        .expect(200)
      expect(gaiQianXiangYing.body.cheng_gong).toBe(true)

      await gengGaiMiMaChengGong(jiuLingPai, ceShiMiMaJiu, ceShiMiMaXin)

      const gaiHouXiangYing = await request(yingYong)
        .get('/api/认证/信息')
        .set('Authorization', `Bearer ${jiuLingPai}`)
        .expect(401)
      expect(gaiHouXiangYing.body.cheng_gong).toBe(false)

      const dengLuXiangYing = await request(yingYong)
        .post('/api/认证/登录')
        .set('X-Real-IP', huoQuDuTeIP())
        .send({ shouJiHao, miMa: ceShiMiMaXin })
        .expect(200)
      const xinLingPai = dengLuXiangYing.body.shu_ju.令牌

      const xinLingPaiXiangYing = await request(yingYong)
        .get('/api/认证/信息')
        .set('Authorization', `Bearer ${xinLingPai}`)
        .expect(200)
      expect(xinLingPaiXiangYing.body.cheng_gong).toBe(true)
    } finally {
      await qingLiCeShiYongHu(shouJiHao)
    }
  })

  it('更改密码后：旧令牌Socket握手被拒，新令牌握手通过', async () => {
    const shouJiHao = suiJiShouJiHao()
    await qingLiCeShiYongHu(shouJiHao)
    try {
      const jiuLingPai = await zhuCeCeShiYongHu(shouJiHao, `Socket吊销测试${Date.now()}`, ceShiMiMaJiu)
      await gengGaiMiMaChengGong(jiuLingPai, ceShiMiMaJiu, ceShiMiMaXin)

      const jiuKeHuDuan = keHuDuanIo(`http://localhost:${diaoXiaoDuanKou}`, {
        auth: { token: jiuLingPai },
        forceNew: true,
        path: '/socket.io',
      })
      const woQuCuoWu = await dengDaiLianJieShiBai(jiuKeHuDuan)
      expect(woQuCuoWu.message).toBe('令牌无效')
      jiuKeHuDuan.close()

      const dengLuXiangYing = await request(yingYong)
        .post('/api/认证/登录')
        .set('X-Real-IP', huoQuDuTeIP())
        .send({ shouJiHao, miMa: ceShiMiMaXin })
        .expect(200)
      const xinLingPai = dengLuXiangYing.body.shu_ju.令牌

      const xinKeHuDuan = keHuDuanIo(`http://localhost:${diaoXiaoDuanKou}`, {
        auth: { token: xinLingPai },
        forceNew: true,
        path: '/socket.io',
      })
      await dengDaiLianJieChengGong(xinKeHuDuan)
      xinKeHuDuan.disconnect()
    } finally {
      await qingLiCeShiYongHu(shouJiHao)
    }
  })

  it('未吊销用户：新旧令牌HTTP与Socket行为不变（回归）', async () => {
    const shouJiHao = suiJiShouJiHao()
    await qingLiCeShiYongHu(shouJiHao)
    try {
      const lingPai1 = await zhuCeCeShiYongHu(shouJiHao, `无吊销测试${Date.now()}`, ceShiMiMaJiu)

      const xiangYing = await request(yingYong)
        .get('/api/认证/信息')
        .set('Authorization', `Bearer ${lingPai1}`)
        .expect(200)
      expect(xiangYing.body.cheng_gong).toBe(true)

      const keHuDuan = keHuDuanIo(`http://localhost:${diaoXiaoDuanKou}`, {
        auth: { token: lingPai1 },
        forceNew: true,
        path: '/socket.io',
      })
      await dengDaiLianJieChengGong(keHuDuan)
      keHuDuan.disconnect()
    } finally {
      await qingLiCeShiYongHu(shouJiHao)
    }
  })

  it('边界：iat毫秒与吊销时间戳相等视为已吊销，晚于则通过，无键通过', async () => {
    const yongHuIdA = `ceshi-a-${Date.now()}`
    const yongHuIdB = `ceshi-b-${Date.now()}`
    const iat = Math.floor(Date.now() / 1000)
    try {
      await redis.set(huoQuCheXiaoJian(yongHuIdA), String(iat * 1000), 'EX', 120)
      expect(await lingPaiShiFouYiCheXiao(yongHuIdA, iat)).toBe(true)
      expect(await lingPaiShiFouYiCheXiao(yongHuIdA, iat + 1)).toBe(false)
      expect(await lingPaiShiFouYiCheXiao(yongHuIdA, undefined, iat * 1000 - 1)).toBe(true)
      expect(await lingPaiShiFouYiCheXiao(yongHuIdA, iat, iat * 1000 + 1)).toBe(false)
      expect(await lingPaiShiFouYiCheXiao(yongHuIdB, iat)).toBe(false)
      expect(await lingPaiShiFouYiCheXiao('', iat)).toBe(false)
      expect(await lingPaiShiFouYiCheXiao(yongHuIdA, undefined)).toBe(false)
    } finally {
      await redis.del(huoQuCheXiaoJian(yongHuIdA))
      await redis.del(huoQuCheXiaoJian(yongHuIdB))
    }
  })

  it('存量连接守卫：吊销前放行事件，写入吊销时间戳后断开连接', async () => {
    const yongHuId = `ceshi-guard-${Date.now()}`
    const iat = Math.floor(Date.now() / 1000)
    let shouWei: ((bao: unknown, xiaYiBu: (err?: Error) => void) => void) | null = null
    const mockSocket = {
      id: 'mock-socket-1',
      use: (fn: typeof shouWei) => {
        shouWei = fn
      },
      disconnect: vi.fn(),
      yong_hu: { yongHuId, shouJiHao: '', iat },
    } as unknown as RenZhengSocket

    try {
      guaZaiCheXiaoShouWei(mockSocket)
      expect(shouWei).not.toBeNull()

      const xiaYiBu1 = vi.fn()
      shouWei!({}, xiaYiBu1)
      await vi.waitFor(() => expect(xiaYiBu1).toHaveBeenCalledTimes(1))
      expect(mockSocket.disconnect).not.toHaveBeenCalled()

      await xieRuCheXiaoShiJianCuo(yongHuId)
      qingLiCheXiaoHuanCun()

      const xiaYiBu2 = vi.fn()
      shouWei!({}, xiaYiBu2)
      await vi.waitFor(() => expect(mockSocket.disconnect).toHaveBeenCalledWith(true))
      expect(xiaYiBu2).not.toHaveBeenCalled()
    } finally {
      await redis.del(huoQuCheXiaoJian(yongHuId))
      qingLiCheXiaoHuanCun()
}
  })
})

describe('FP-15 bcrypt cost 12 与旧哈希重哈希', () => {
  let ceShiShouJiHaoJiu: string
  let ceShiShouJiHaoXin: string
  const ceShiMiMa = 'testPassword123'
  let duTeIPXuHao = 0

  function huoQuDuTeIP(): string {
    duTeIPXuHao += 1
    return `198.51.100.${200 + (duTeIPXuHao % 50) + 1}`
  }

  beforeAll(async () => {
    ceShiShouJiHaoJiu = suiJiShouJiHao()
    ceShiShouJiHaoXin = suiJiShouJiHao()
    await redis.setex(`yan_zheng_ma:${ceShiShouJiHaoJiu}`, 300, '123456')
    await redis.setex(`yan_zheng_ma:${ceShiShouJiHaoXin}`, 300, '123456')
    await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [ceShiShouJiHaoJiu])
    await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [ceShiShouJiHaoXin])
  })

  afterAll(async () => {
    await qingLiCeShiYongHu(ceShiShouJiHaoJiu)
    await qingLiCeShiYongHu(ceShiShouJiHaoXin)
  })

  it('旧 cost=10 哈希登录触发重哈希为 cost=12，后续登录使用新哈希', async () => {
    const benCiIP = huoQuDuTeIP()
    // 直接插入 cost=10 的哈希模拟旧用户
    const jiuHaXi = await bcrypt.hash(ceShiMiMa, 10)
    await 数据库.query(
      `INSERT INTO "用户" ("手机号", "用户名", "密码哈希", "管理员", "生日")
       VALUES ($1, $2, $3, false, $4)
       ON CONFLICT ("手机号") DO UPDATE SET "密码哈希" = $3`,
      [ceShiShouJiHaoJiu, `旧用户${Date.now()}`, jiuHaXi, '2000-01-01'],
    )

    // 验证初始哈希确实是 cost=10
    const chuShiJieGuo = await 数据库.query(`SELECT "密码哈希" FROM "用户" WHERE "手机号" = $1`, [ceShiShouJiHaoJiu])
    const chuShiHaXi = chuShiJieGuo.rows[0]?.密码哈希
    expect(chuShiHaXi.startsWith('$2b$10$')).toBe(true)

    // 第一次登录：应成功并触发重哈希
    const dengLu1 = await request(yingYong)
      .post('/api/认证/登录')
      .set('X-Real-IP', benCiIP)
      .send({ shouJiHao: ceShiShouJiHaoJiu, miMa: ceShiMiMa })
      .expect(200)
    expect(dengLu1.body.cheng_gong).toBe(true)

    // 验证数据库中哈希已更新为 cost=12
    const gengXinHouJieGuo = await 数据库.query(`SELECT "密码哈希" FROM "用户" WHERE "手机号" = $1`, [ceShiShouJiHaoJiu])
    const gengXinHouHaXi = gengXinHouJieGuo.rows[0]?.密码哈希
    expect(gengXinHouHaXi.startsWith('$2b$12$')).toBe(true)

    // 第二次登录：使用新哈希直接通过
    const dengLu2 = await request(yingYong)
      .post('/api/认证/登录')
      .set('X-Real-IP', benCiIP)
      .send({ shouJiHao: ceShiShouJiHaoJiu, miMa: ceShiMiMa })
      .expect(200)
    expect(dengLu2.body.cheng_gong).toBe(true)
  })

  it('新注册用户直接使用 cost=12 哈希，登录不触发重哈希', async () => {
    const benCiIP = huoQuDuTeIP()
    const yongHuMing = `新用户${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const zhuCeXiangYing = await request(yingYong)
      .post('/api/认证/注册')
      .set('X-Real-IP', benCiIP)
      .send({
        shouJiHao: ceShiShouJiHaoXin,
        yanZhengMa: '123456',
        yongHuMing,
        miMa: ceShiMiMa,
        tongYiXieYi: true,
        chuShengRiQi: '2000-01-01',
      })
      .expect(200)
    expect(zhuCeXiangYing.body.cheng_gong).toBe(true)

    // 验证注册时生成的哈希就是 cost=12
    const zhuCeHouJieGuo = await 数据库.query(`SELECT "密码哈希" FROM "用户" WHERE "手机号" = $1`, [ceShiShouJiHaoXin])
    const zhuCeHouHaXi = zhuCeHouJieGuo.rows[0]?.密码哈希
    expect(zhuCeHouHaXi.startsWith('$2b$12$')).toBe(true)

    // 登录：应成功且哈希保持 cost=12（不再变化）
    const dengLu1 = await request(yingYong)
      .post('/api/认证/登录')
      .set('X-Real-IP', benCiIP)
      .send({ shouJiHao: ceShiShouJiHaoXin, miMa: ceShiMiMa })
      .expect(200)
    expect(dengLu1.body.cheng_gong).toBe(true)

    const dengLuHouJieGuo = await 数据库.query(`SELECT "密码哈希" FROM "用户" WHERE "手机号" = $1`, [ceShiShouJiHaoXin])
    const dengLuHouHaXi = dengLuHouJieGuo.rows[0]?.密码哈希
    expect(dengLuHouHaXi.startsWith('$2b$12$')).toBe(true)
    expect(dengLuHouHaXi).toBe(zhuCeHouHaXi)
  })

  it('错误密码拒绝登录，不触发重哈希', async () => {
    const benCiIP = huoQuDuTeIP()
    const shouJiHao = suiJiShouJiHao()
    await qingLiCeShiYongHu(shouJiHao)
    try {
      await redis.setex(`yan_zheng_ma:${shouJiHao}`, 300, '123456')
      await request(yingYong)
        .post('/api/认证/注册')
        .set('X-Real-IP', benCiIP)
        .send({
          shouJiHao,
          yanZhengMa: '123456',
          yongHuMing: `错误密码测试${Date.now()}`,
          miMa: ceShiMiMa,
          tongYiXieYi: true,
          chuShengRiQi: '2000-01-01',
        })
        .expect(200)

      const chuShiJieGuo = await 数据库.query(`SELECT "密码哈希" FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
      const chuShiHaXi = chuShiJieGuo.rows[0]?.密码哈希

      // 错误密码登录
      const cuoWuXiangYing = await request(yingYong)
        .post('/api/认证/登录')
        .set('X-Real-IP', benCiIP)
        .send({ shouJiHao, miMa: 'wrongPassword' })
        .expect(401)
      expect(cuoWuXiangYing.body.cheng_gong).toBe(false)

      // 验证哈希未变
      const dengLuHouJieGuo = await 数据库.query(`SELECT "密码哈希" FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
      const dengLuHouHaXi = dengLuHouJieGuo.rows[0]?.密码哈希
      expect(dengLuHouHaXi).toBe(chuShiHaXi)
    } finally {
      await qingLiCeShiYongHu(shouJiHao)
    }
  })
})
})
