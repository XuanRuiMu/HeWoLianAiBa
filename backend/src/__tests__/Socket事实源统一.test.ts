process.env.ADMIN_PHONES = '13833330001,13833330003'
process.env.RI_ZHI_TUI_SONG_HE_BING_JIAN_GE = '30'
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://lovewithme:test-password@localhost:5432/lovewithme'
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createServer } from 'http'
import type { AddressInfo } from 'net'
import { Server as SocketIoServer } from 'socket.io'
import { io as keHuDuanIo, type Socket as KeHuDuanSocket } from 'socket.io-client'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { renZhengSocketZhongJianJian } from '../socket/认证'
import { chuShiHuaDuoSheSocket } from '../socket/夺舍'
import {
  chuShiHuaRiZhiTuiSongSocket,
  tingZhiRiZhiTuiSong,
  SHI_JIAN_DING_YUE_RI_ZHI,
  SHI_JIAN_RI_ZHI_PI_LIANG,
  type RiZhiPiLiangZaiHe,
} from '../socket/日志推送'
import { dingYueZheShuLiang } from '../utils/日志订阅'
import { debug日志 } from '../utils/debug日志'

const BAI_MING_DAN_SHOU_JI_HAO_A = '13833330001'
const PU_TONG_SHOU_JI_HAO_B = '13833330002'
const BAI_MING_DAN_SHOU_JI_HAO_C = '13833330003'
const DENG_DAI_HAO_MIAO = 400

interface CeShiYongHu {
  lingPai: string
  yongHuId: string
  shouJiHao: string
}

async function qingLiCeShiYongHu(shouJiHao: string): Promise<void> {
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  await redis.del(`yan_zheng_ma:${shouJiHao}`)
  await redis.del(`fa_song_jian_ge:${shouJiHao}`)
  await redis.del(`deng_lu_shi_bai:${shouJiHao}`)
}

async function zhuCeYongHu(shouJiHao: string, yongHuMing: string): Promise<CeShiYongHu> {
  await redis.setex(`yan_zheng_ma:${shouJiHao}`, 300, '123456')
  const xiangYing = await request(yingYong)
    .post('/api/认证/注册')
    .send({
      shouJiHao,
      yanZhengMa: '123456',
      yongHuMing,
      miMa: 'testPassword123',
      tongYiXieYi: true,
      chuShengRiQi: '2000-01-01',
    })
    .expect(200)
  return {
    lingPai: xiangYing.body.shu_ju.令牌,
    yongHuId: xiangYing.body.shu_ju.用户.id,
    shouJiHao,
  }
}

async function biaoJiGuanLiYuan(yongHuId: string, zhi: boolean): Promise<void> {
  await 数据库.query(`UPDATE "用户" SET "管理员" = $2 WHERE "ID" = $1`, [yongHuId, zhi])
}

async function chaKuGuanLiYuanLie(yongHuId: string): Promise<boolean> {
  const jieGuo = await 数据库.query(`SELECT "管理员" FROM "用户" WHERE "ID" = $1 LIMIT 1`, [yongHuId])
  return Boolean(jieGuo.rows[0]?.管理员)
}

async function qingLiDuoSheJian(jiaoSeId: string): Promise<void> {
  await redis.del(`夺舍:${jiaoSeId}`)
}

function dengDai(haoMiao: number): Promise<void> {
  return new Promise((jieJue) => setTimeout(jieJue, haoMiao))
}

describe('Socket管理员判定与数据库事实源统一', () => {
  let fuWuQi: ReturnType<typeof createServer>
  let io: SocketIoServer
  let duanKou = 0
  let guanLiYuanA: CeShiYongHu
  let puTongB: CeShiYongHu
  let baiMingDanC: CeShiYongHu
  let jiaoSeId = ''
  const keHuDuanLieBiao: KeHuDuanSocket[] = []

  function lianJie(lingPai: string): KeHuDuanSocket {
    const keHuDuan = keHuDuanIo(`http://127.0.0.1:${duanKou}`, {
      path: '/socket.io',
      auth: { token: lingPai },
      transports: ['websocket'],
      forceNew: true,
    })
    keHuDuanLieBiao.push(keHuDuan)
    return keHuDuan
  }

  function dengDaiLianJie(keHuDuan: KeHuDuanSocket): Promise<void> {
    return new Promise((jieJue, juJue) => {
      keHuDuan.once('connect', () => jieJue())
      keHuDuan.once('connect_error', (cuoWu) => juJue(cuoWu))
    })
  }

  beforeAll(async () => {
    await qingLiCeShiYongHu(BAI_MING_DAN_SHOU_JI_HAO_A)
    await qingLiCeShiYongHu(PU_TONG_SHOU_JI_HAO_B)
    await qingLiCeShiYongHu(BAI_MING_DAN_SHOU_JI_HAO_C)

    guanLiYuanA = await zhuCeYongHu(BAI_MING_DAN_SHOU_JI_HAO_A, `事实源A${Date.now()}`)
    puTongB = await zhuCeYongHu(PU_TONG_SHOU_JI_HAO_B, `事实源B${Date.now()}`)
    baiMingDanC = await zhuCeYongHu(BAI_MING_DAN_SHOU_JI_HAO_C, `事实源C${Date.now()}`)
    await biaoJiGuanLiYuan(guanLiYuanA.yongHuId, true)

    const jiaoSeJieGuo = await 数据库.query(
      `INSERT INTO "角色" (
        "用户ID", "名字", "性别", "年龄", "MBTI", "IE类型", "热身类型",
        "微信昵称", "开场白", "喜欢的类型", "家庭背景", "情感经历"
      ) VALUES ($1, $2, '女', 20, 'INTJ', 'I', '慢热', '测试昵称', '["你好"]'::jsonb, '温柔的', '普通家庭', '有过一段')
      RETURNING "ID"`,
      [puTongB.yongHuId, '事实源测试角色'],
    )
    jiaoSeId = String(jiaoSeJieGuo.rows[0].ID)

    fuWuQi = createServer()
    io = new SocketIoServer(fuWuQi, { path: '/socket.io' })
    io.use(renZhengSocketZhongJianJian)
    chuShiHuaDuoSheSocket(io)
    chuShiHuaRiZhiTuiSongSocket(io)
    await new Promise<void>((jieJue) => {
      fuWuQi.listen(0, '127.0.0.1', () => jieJue())
    })
    duanKou = (fuWuQi.address() as AddressInfo).port
  })

  afterAll(async () => {
    for (const keHuDuan of keHuDuanLieBiao) keHuDuan.disconnect()
    tingZhiRiZhiTuiSong()
    await new Promise<void>((jieJue) => {
      io.close(() => jieJue())
    })
    await new Promise<void>((jieJue) => {
      fuWuQi.close(() => jieJue())
    })

    const duoSheJian = await redis.keys('夺舍:*')
    for (const jian of duoSheJian) await redis.del(jian)

    await qingLiCeShiYongHu(BAI_MING_DAN_SHOU_JI_HAO_A)
    await qingLiCeShiYongHu(PU_TONG_SHOU_JI_HAO_B)
    await qingLiCeShiYongHu(BAI_MING_DAN_SHOU_JI_HAO_C)
    await 数据库.end()
    await redis.quit()
  })

  it('注册基线：白名单手机号未标记时数据库管理员列为false', async () => {
    expect(await chaKuGuanLiYuanLie(baiMingDanC.yongHuId)).toBe(false)
    expect(await chaKuGuanLiYuanLie(puTongB.yongHuId)).toBe(false)
    expect(await chaKuGuanLiYuanLie(guanLiYuanA.yongHuId)).toBe(true)
  })

  it('白名单手机号但数据库未标记：不可订阅日志推送', async () => {
    const keHuDuan = lianJie(baiMingDanC.lingPai)
    await dengDaiLianJie(keHuDuan)

    const huiDiaoJieGuo: unknown[] = []
    keHuDuan.emit(SHI_JIAN_DING_YUE_RI_ZHI, (jieGuo: unknown) => huiDiaoJieGuo.push(jieGuo))
    await dengDai(200)

    expect(huiDiaoJieGuo).toHaveLength(0)
    expect(dingYueZheShuLiang()).toBe(0)
  })

  it('白名单手机号但数据库未标记：夺舍权限不被认可', async () => {
    await qingLiDuoSheJian(jiaoSeId)

    const keHuDuan = lianJie(baiMingDanC.lingPai)
    await dengDaiLianJie(keHuDuan)

    const jieGuo = await new Promise<{ cheng_gong: boolean; ti_shi?: string }>((jieJue) => {
      keHuDuan.emit('夺舍', jiaoSeId, (huiDiao: { cheng_gong: boolean; ti_shi?: string }) => jieJue(huiDiao))
    })
    expect(jieGuo.cheng_gong).toBe(false)
    expect(jieGuo.ti_shi).toBe('无权操作')
    expect(await redis.get(`夺舍:${jiaoSeId}`)).toBeNull()
  })

  it('数据库标记的管理员（非白名单手机号）经管理接口授权后可订阅日志推送并收到批量日志', async () => {
    await request(yingYong)
      .post('/api/管理/授权')
      .set('Authorization', `Bearer ${guanLiYuanA.lingPai}`)
      .send({ yong_hu_id: puTongB.yongHuId })
      .expect(200)
    expect(await chaKuGuanLiYuanLie(puTongB.yongHuId)).toBe(true)

    const keHuDuan = lianJie(puTongB.lingPai)
    await dengDaiLianJie(keHuDuan)

    const shouDao: RiZhiPiLiangZaiHe[] = []
    keHuDuan.on(SHI_JIAN_RI_ZHI_PI_LIANG, (zaiHe: RiZhiPiLiangZaiHe) => shouDao.push(zaiHe))

    await new Promise<void>((jieJue) => {
      keHuDuan.emit(SHI_JIAN_DING_YUE_RI_ZHI, () => jieJue())
    })
    expect(dingYueZheShuLiang()).toBe(1)

    debug日志.info('事实源测试', 'DB标记管理员可见日志')
    await dengDai(DENG_DAI_HAO_MIAO)

    const xiaoXiLieBiao = shouDao.flatMap((zaiHe) => zaiHe.tiao_mu_lie_biao.map((tiaoMu) => tiaoMu.xiao_xi))
    expect(xiaoXiLieBiao).toContain('DB标记管理员可见日志')
  })

  it('数据库标记的管理员（非白名单手机号）夺舍权限被认可', async () => {
    await qingLiDuoSheJian(jiaoSeId)

    const keHuDuan = lianJie(puTongB.lingPai)
    await dengDaiLianJie(keHuDuan)

    const jieGuo = await new Promise<{ cheng_gong: boolean }>((jieJue) => {
      keHuDuan.emit('夺舍', jiaoSeId, (huiDiao: { cheng_gong: boolean }) => jieJue(huiDiao))
    })
    expect(jieGuo.cheng_gong).toBe(true)
    expect(await redis.get(`夺舍:${jiaoSeId}`)).toBe(puTongB.yongHuId)
  })

  it('管理接口回收后清缓存联动：Socket权限在TTL内立即失效', async () => {
    await request(yingYong)
      .post('/api/管理/回收')
      .set('Authorization', `Bearer ${guanLiYuanA.lingPai}`)
      .send({ yong_hu_id: puTongB.yongHuId })
      .expect(200)
    expect(await chaKuGuanLiYuanLie(puTongB.yongHuId)).toBe(false)

    await qingLiDuoSheJian(jiaoSeId)

    const keHuDuan = lianJie(puTongB.lingPai)
    await dengDaiLianJie(keHuDuan)

    const jieGuo = await new Promise<{ cheng_gong: boolean; ti_shi?: string }>((jieJue) => {
      keHuDuan.emit('夺舍', jiaoSeId, (huiDiao: { cheng_gong: boolean; ti_shi?: string }) => jieJue(huiDiao))
    })
    expect(jieGuo.cheng_gong).toBe(false)
    expect(jieGuo.ti_shi).toBe('无权操作')

    const huiDiaoJieGuo: unknown[] = []
    keHuDuan.emit(SHI_JIAN_DING_YUE_RI_ZHI, (jieGuo2: unknown) => huiDiaoJieGuo.push(jieGuo2))
    await dengDai(200)
    expect(huiDiaoJieGuo).toHaveLength(0)
  })
})
