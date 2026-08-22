process.env.ADMIN_PHONES = ''
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://lovewithme:BXYXblupz542284@localhost:5432/lovewithme'
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'ce-shi-zhuan-yong-mi-yao-zhi-shao-32-ge-zi-fu-chang'
}

import http from 'http'
import crypto from 'crypto'
import { Server } from 'socket.io'
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { io as lianJieKeHuDuan, type Socket as KeHuDuanSocket } from 'socket.io-client'
import { 数据库 } from '../数据库'
import { shengChengLingPai } from '../utils/jwt'
import { renZhengSocketZhongJianJian } from '../socket/认证'
import { TONG_HUA_PEI_ZHI } from '../config/通话配置'
import {
  faQi,
  yongHuQuXiao,
  yongHuGuaDuan,
  yingJianChaoShi,
  qingKongQuanBuHuiHua,
  sheZhiTongHuaIo,
} from '../services/通话'
import { chuShiHuaTongHuaSocket } from '../socket/通话'

const MO_REN_PEI_ZHI = { ...TONG_HUA_PEI_ZHI }

let ceShiYongHuId = ''
let ceShiJiaoSeId = ''
let qiTaYongHuJiaoSeId = ''

async function chaRuCeShiYongHuYuJiaoSe(shouJiHao: string): Promise<{ yongHuId: string; jiaoSeId: string }> {
  const yongHuJieGuo = await 数据库.query(
    `INSERT INTO "用户" ("手机号", "用户名") VALUES ($1, $2) RETURNING "ID"`,
    [shouJiHao, `通话测试${Date.now()}${Math.floor(Math.random() * 100000)}`],
  )
  const yongHuId = String(yongHuJieGuo.rows[0].ID)
  const jiaoSeJieGuo = await 数据库.query(
    `INSERT INTO "角色" ("用户ID", "名字", "性别") VALUES ($1, $2, $3) RETURNING "ID"`,
    [yongHuId, '通话测试角色', 'nv'],
  )
  return { yongHuId, jiaoSeId: String(jiaoSeJieGuo.rows[0].ID) }
}

function huoQuZuiXinTongHuaJiLu(yongHuId: string): Promise<Record<string, unknown>[]> {
  return 数据库.query(
    `SELECT * FROM "通话记录" WHERE "用户ID" = $1 ORDER BY "创建时间" DESC`,
    [yongHuId],
  ).then((jieGuo) => jieGuo.rows)
}

function huoQuZuiXinXiTongXiaoXi(yongHuId: string): Promise<string> {
  return 数据库.query(
    `SELECT "内容" FROM "消息" WHERE "用户ID" = $1 AND "发送者" = 'xitong' ORDER BY "创建时间" DESC LIMIT 1`,
    [yongHuId],
  ).then((jieGuo) => String(jieGuo.rows[0]?.内容 ?? ''))
}

async function dengDaiYiBuLian(wanChengPanDuan: () => boolean): Promise<void> {
  for (let ciShu = 0; ciShu < 20000 && !wanChengPanDuan(); ciShu += 1) {
    await new Promise<void>((jieJue) => setImmediate(jieJue))
  }
}

beforeAll(async () => {
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" IN ('13800009999', '13800008888')`)
  const zhuYongHu = await chaRuCeShiYongHuYuJiaoSe('13800009999')
  ceShiYongHuId = zhuYongHu.yongHuId
  ceShiJiaoSeId = zhuYongHu.jiaoSeId
  const qiTaYongHu = await chaRuCeShiYongHuYuJiaoSe('13800008888')
  qiTaYongHuJiaoSeId = qiTaYongHu.jiaoSeId
})

afterAll(async () => {
  Object.assign(TONG_HUA_PEI_ZHI, MO_REN_PEI_ZHI)
  qingKongQuanBuHuiHua()
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" IN ('13800009999', '13800008888')`)
  await 数据库.end()
})

describe('FP-21 通话状态机（服务层）', () => {
  let emitSpy: ReturnType<typeof vi.fn>

  function quShiJianMingLieBiao(): string[] {
    return emitSpy.mock.calls.map((canShu: unknown[]) => String(canShu[0]))
  }

  beforeEach(async () => {
    await 数据库.query('SELECT 1')
    emitSpy = vi.fn()
    sheZhiTongHuaIo({
      to: () => ({ emit: emitSpy }),
    } as unknown as Server)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    Object.assign(TONG_HUA_PEI_ZHI, MO_REN_PEI_ZHI)
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'clearImmediate', 'Date'] })
  })

  afterEach(async () => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    qingKongQuanBuHuiHua()
    await 数据库.query(`DELETE FROM "通话记录" WHERE "用户ID" = $1`, [ceShiYongHuId])
    await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [ceShiYongHuId])
  })

  it('邀请→AI自动接听→挂断：完整状态机流转并落库 yiJieTong 与时长系统消息', async () => {
    const yanChi = TONG_HUA_PEI_ZHI.zhenLingZuiXiaoHaoMiao
    const faQiJieGuo = await faQi(ceShiYongHuId, ceShiJiaoSeId, 'yuYin')
    expect(faQiJieGuo.chengGong).toBe(true)
    expect(typeof faQiJieGuo.tongHuaId).toBe('string')

    await vi.advanceTimersByTimeAsync(yanChi + 100)

    const jieShouDiaoYong = emitSpy.mock.calls.find((canShu: unknown[]) => canShu[0] === '通话接受')
    expect(jieShouDiaoYong).toBeDefined()
    const jieShouZaiHe = jieShouDiaoYong![1] as Record<string, unknown>
    expect(jieShouZaiHe.tongHuaId).toBe(faQiJieGuo.tongHuaId)
    expect(jieShouZaiHe.leiXing).toBe('yuYin')
    expect(typeof jieShouZaiHe.jieTongShiJian).toBe('number')

    vi.advanceTimersByTime(61 * 1000)

    const guaDuanJieGuo = await yongHuGuaDuan(ceShiYongHuId, faQiJieGuo.tongHuaId!)
    expect(guaDuanJieGuo.chengGong).toBe(true)
    expect(guaDuanJieGuo.shiChangMiao).toBe(61)

    const jiLu = await huoQuZuiXinTongHuaJiLu(ceShiYongHuId)
    expect(jiLu.length).toBe(1)
    expect(String(jiLu[0].状态)).toBe('yiJieTong')
    expect(Number(jiLu[0].时长秒)).toBe(61)
    expect(jiLu[0].接通时间).not.toBeNull()
    expect(jiLu[0].结束时间).not.toBeNull()

    const neiRong = await huoQuZuiXinXiTongXiaoXi(ceShiYongHuId)
    expect(neiRong).toMatch(/^\[语音通话\] 时长 \d{2,}:\d{2}$/)
    expect(neiRong).toBe('[语音通话] 时长 01:01')

    const huiFuDiaoYong = emitSpy.mock.calls.find((canShu: unknown[]) => canShu[0] === '角色回复')
    expect(huiFuDiaoYong).toBeDefined()
    const huiFuZaiHe = huiFuDiaoYong![1] as { 角色ID: string; 消息列表: Array<Record<string, unknown>> }
    expect(huiFuZaiHe.角色ID).toBe(ceShiJiaoSeId)
    expect(huiFuZaiHe.消息列表[0].fa_song_zhe_lei_xing).toBe('xitong')

    const jieShuDiaoYong = emitSpy.mock.calls.find((canShu: unknown[]) => canShu[0] === '通话结束')
    const jieShuZaiHe = jieShuDiaoYong![1] as Record<string, unknown>
    expect(jieShuZaiHe.zhuangTai).toBe('yiJieTong')
    expect(jieShuZaiHe.shiChangMiao).toBe(61)
  })

  it('振铃期取消：落库 yiQuXiao 并发送已取消系统消息', async () => {
    const faQiJieGuo = await faQi(ceShiYongHuId, ceShiJiaoSeId, 'yuYin')

    const quXiaoJieGuo = await yongHuQuXiao(ceShiYongHuId, faQiJieGuo.tongHuaId!)
    expect(quXiaoJieGuo.chengGong).toBe(true)

    const jiLu = await huoQuZuiXinTongHuaJiLu(ceShiYongHuId)
    expect(String(jiLu[0].状态)).toBe('yiQuXiao')
    expect(Number(jiLu[0].时长秒)).toBe(0)
    expect(jiLu[0].接通时间).toBeNull()

    const neiRong = await huoQuZuiXinXiTongXiaoXi(ceShiYongHuId)
    expect(neiRong).toBe('[语音通话] 已取消')

    const jieShuDiaoYong = emitSpy.mock.calls.find((canShu: unknown[]) => canShu[0] === '通话结束')
    const jieShuZaiHe = jieShuDiaoYong![1] as Record<string, unknown>
    expect(jieShuZaiHe.zhuangTai).toBe('yiQuXiao')
    expect(jieShuZaiHe.shiChangMiao).toBe(0)
  })

  it('视频通话振铃期取消：使用视频已取消文案', async () => {
    const faQiJieGuo = await faQi(ceShiYongHuId, ceShiJiaoSeId, 'shiPin')
    await yongHuQuXiao(ceShiYongHuId, faQiJieGuo.tongHuaId!)

    const neiRong = await huoQuZuiXinXiTongXiaoXi(ceShiYongHuId)
    expect(neiRong).toBe('[视频通话] 已取消')

    const jiLu = await huoQuZuiXinTongHuaJiLu(ceShiYongHuId)
    expect(String(jiLu[0].类型)).toBe('shiPin')
  })

  it('非法跃迁均返回错误不抛异常：无会话挂断/取消、振铃中挂断、接通后取消、已结束后重复操作', async () => {
    await expect(yongHuGuaDuan(ceShiYongHuId, crypto.randomUUID())).resolves.toMatchObject({
      chengGong: false,
      tiShi: expect.any(String),
    })
    await expect(yongHuQuXiao(ceShiYongHuId, crypto.randomUUID())).resolves.toMatchObject({
      chengGong: false,
      tiShi: expect.any(String),
    })

    const faQiJieGuo = await faQi(ceShiYongHuId, ceShiJiaoSeId, 'yuYin')
    const tongHuaId = faQiJieGuo.tongHuaId!

    await expect(yongHuGuaDuan(ceShiYongHuId, tongHuaId)).resolves.toMatchObject({ chengGong: false })
    await expect(yongHuQuXiao('fei-ben-ren-yong-hu', tongHuaId)).resolves.toMatchObject({
      chengGong: false,
      tiShi: expect.any(String),
    })

    await vi.advanceTimersByTimeAsync(TONG_HUA_PEI_ZHI.zhenLingZuiXiaoHaoMiao + 100)

    await expect(yongHuQuXiao(ceShiYongHuId, tongHuaId)).resolves.toMatchObject({ chengGong: false })

    const guaDuanJieGuo = await yongHuGuaDuan(ceShiYongHuId, tongHuaId)
    expect(guaDuanJieGuo.chengGong).toBe(true)

    await expect(yongHuQuXiao(ceShiYongHuId, tongHuaId)).resolves.toMatchObject({
      chengGong: false,
      tiShi: expect.any(String),
    })
    await expect(yongHuGuaDuan(ceShiYongHuId, tongHuaId)).resolves.toMatchObject({
      chengGong: false,
      tiShi: expect.any(String),
    })

    const jiLu = await huoQuZuiXinTongHuaJiLu(ceShiYongHuId)
    expect(jiLu.length).toBe(1)
    expect(String(jiLu[0].状态)).toBe('yiJieTong')
  })

  it('600秒硬上限：自动发出 通话超时+通话结束(yiChaoShi) 并落库', async () => {
    const yanChi = TONG_HUA_PEI_ZHI.zhenLingZuiXiaoHaoMiao
    const shangXianHaoMiao = TONG_HUA_PEI_ZHI.yingJianShangXianMiao * 1000
    const faQiJieGuo = await faQi(ceShiYongHuId, ceShiJiaoSeId, 'yuYin')

    await vi.advanceTimersByTimeAsync(yanChi + 100)
    await vi.advanceTimersByTimeAsync(shangXianHaoMiao + 100)

    await dengDaiYiBuLian(() => quShiJianMingLieBiao().includes('通话结束'))

    expect(quShiJianMingLieBiao()).toContain('通话超时')
    const chaoShiDiaoYong = emitSpy.mock.calls.find((canShu: unknown[]) => canShu[0] === '通话超时')
    expect(chaoShiDiaoYong).toBeDefined()
    expect((chaoShiDiaoYong![1] as Record<string, unknown>).tongHuaId).toBe(faQiJieGuo.tongHuaId)

    const jieShuDiaoYongLieBiao = emitSpy.mock.calls.filter((canShu: unknown[]) => canShu[0] === '通话结束')
    expect(jieShuDiaoYongLieBiao.length).toBe(1)
    const jieShuZaiHe = jieShuDiaoYongLieBiao[0][1] as Record<string, unknown>
    expect(jieShuZaiHe.zhuangTai).toBe('yiChaoShi')
    expect(jieShuZaiHe.shiChangMiao).toBe(TONG_HUA_PEI_ZHI.yingJianShangXianMiao)

    const jiLu = await huoQuZuiXinTongHuaJiLu(ceShiYongHuId)
    expect(String(jiLu[0].状态)).toBe('yiChaoShi')
    expect(Number(jiLu[0].时长秒)).toBe(TONG_HUA_PEI_ZHI.yingJianShangXianMiao)

    const fenZhong = Math.floor(TONG_HUA_PEI_ZHI.yingJianShangXianMiao / 60)
    const neiRong = await huoQuZuiXinXiTongXiaoXi(ceShiYongHuId)
    expect(neiRong).toBe(`[语音通话] 时长 ${String(fenZhong).padStart(2, '0')}:00`)
  })

  it('会话终结后定时器全部清理，推进时间不再触发任何事件', async () => {
    const yanChi = TONG_HUA_PEI_ZHI.zhenLingZuiXiaoHaoMiao
    const shangXianHaoMiao = TONG_HUA_PEI_ZHI.yingJianShangXianMiao * 1000

    await faQi(ceShiYongHuId, ceShiJiaoSeId, 'yuYin')
    await vi.advanceTimersByTimeAsync(yanChi + 100)
    await vi.advanceTimersByTimeAsync(shangXianHaoMiao + 5000)
    await dengDaiYiBuLian(() => quShiJianMingLieBiao().includes('通话结束'))

    const zhongJiShuLiang = emitSpy.mock.calls.length
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000)
    await dengDaiYiBuLian(() => false)

    expect(emitSpy.mock.calls.length).toBe(zhongJiShuLiang)
  })

  it('互踢策略：同用户新邀请自动取消旧会话并通知', async () => {
    const diYiCi = await faQi(ceShiYongHuId, ceShiJiaoSeId, 'yuYin')
    const diErCi = await faQi(ceShiYongHuId, ceShiJiaoSeId, 'shiPin')

    expect(diErCi.chengGong).toBe(true)
    expect(diErCi.tongHuaId).not.toBe(diYiCi.tongHuaId)

    await dengDaiYiBuLian(() =>
      emitSpy.mock.calls.some((canShu: unknown[]) => {
        if (canShu[0] !== '通话结束') return false
        return (canShu[1] as Record<string, unknown>).tongHuaId === diYiCi.tongHuaId
      }),
    )

    const jiuJieShuDiaoYong = emitSpy.mock.calls.find((canShu: unknown[]) => {
      if (canShu[0] !== '通话结束') return false
      return (canShu[1] as Record<string, unknown>).tongHuaId === diYiCi.tongHuaId
    })
    expect(jiuJieShuDiaoYong).toBeDefined()
    expect((jiuJieShuDiaoYong![1] as Record<string, unknown>).zhuangTai).toBe('yiQuXiao')

    await expect(yongHuQuXiao(ceShiYongHuId, diYiCi.tongHuaId!)).resolves.toMatchObject({ chengGong: false })
    await expect(yongHuQuXiao(ceShiYongHuId, diErCi.tongHuaId!)).resolves.toMatchObject({ chengGong: true })
  })

  it('yingJianChaoShi 对不存在或非接通会话为安全空操作', async () => {
    await expect(yingJianChaoShi(crypto.randomUUID())).resolves.toBeUndefined()

    const faQiJieGuo = await faQi(ceShiYongHuId, ceShiJiaoSeId, 'yuYin')
    await yingJianChaoShi(faQiJieGuo.tongHuaId!)
    expect(quShiJianMingLieBiao()).not.toContain('通话超时')
    expect(quShiJianMingLieBiao()).not.toContain('通话结束')
  })
})

describe('FP-21 通话信令（Socket 集成）', () => {
  let fuWuQi: http.Server
  let io: Server
  let duanKou = 0
  let keHuDuan: KeHuDuanSocket | null = null

  function dengDaiShiJian<T = Record<string, unknown>>(shiJianMing: string): Promise<T> {
    return new Promise((jieJue) => {
      keHuDuan!.once(shiJianMing, (zaiHe: T) => jieJue(zaiHe))
    })
  }

  async function lianJie(daiLingPai: boolean): Promise<KeHuDuanSocket> {
    const xuanXiang: Record<string, unknown> = {
      path: '/socket.io',
      transports: ['websocket'],
      forceNew: true,
    }
    if (daiLingPai) {
      xuanXiang.auth = { token: shengChengLingPai({ yongHuId: ceShiYongHuId, shouJiHao: '13800009999' }) }
    }
    const keHuDuanShiLi = lianJieKeHuDuan(`http://127.0.0.1:${duanKou}`, xuanXiang as never)
    if (daiLingPai) {
      await new Promise<void>((jieJue, juJue) => {
        keHuDuanShiLi.once('connect', () => jieJue())
        keHuDuanShiLi.once('connect_error', (cuoWu) => juJue(cuoWu))
      })
    }
    return keHuDuanShiLi
  }

  beforeEach(async () => {
    Object.assign(TONG_HUA_PEI_ZHI, {
      zhenLingZuiXiaoHaoMiao: 30,
      zhenLingZuiDaHaoMiao: 80,
    })
    qingKongQuanBuHuiHua()
    fuWuQi = http.createServer()
    io = new Server(fuWuQi, { path: '/socket.io' })
    io.use(renZhengSocketZhongJianJian)
    chuShiHuaTongHuaSocket(io)
    await new Promise<void>((jieJue) => {
      fuWuQi.listen(0, '127.0.0.1', () => jieJue())
    })
    const dizhi = fuWuQi.address()
    duanKou = typeof dizhi === 'object' && dizhi !== null ? dizhi.port : 0
    keHuDuan = await lianJie(true)
  })

  afterEach(async () => {
    keHuDuan?.disconnect()
    keHuDuan = null
    await new Promise<void>((jieJue) => {
      io.close(() => jieJue())
    })
    await new Promise<void>((jieJue) => {
      fuWuQi.close(() => jieJue())
    })
    Object.assign(TONG_HUA_PEI_ZHI, MO_REN_PEI_ZHI)
    await 数据库.query(`DELETE FROM "通话记录" WHERE "用户ID" = $1`, [ceShiYongHuId])
    await 数据库.query(`DELETE FROM "消息" WHERE "用户ID" = $1`, [ceShiYongHuId])
  })

  it('发起→AI接听→挂断：ack返回时长、事件齐全、落库与系统消息正确', async () => {
    const yaoQingQueRen = (await keHuDuan!.emitWithAck('通话邀请', {
      jiaoSeId: ceShiJiaoSeId,
      leiXing: 'yuYin',
    })) as { chengGong: boolean; tongHuaId?: string; tiShi?: string }
    expect(yaoQingQueRen.chengGong).toBe(true)
    expect(typeof yaoQingQueRen.tongHuaId).toBe('string')

    const jieShouZaiHe = await dengDaiShiJian<{ tongHuaId: string; leiXing: string; jieTongShiJian: number }>('通话接受')
    expect(jieShouZaiHe.tongHuaId).toBe(yaoQingQueRen.tongHuaId)
    expect(jieShouZaiHe.leiXing).toBe('yuYin')
    expect(typeof jieShouZaiHe.jieTongShiJian).toBe('number')

    const jieShuZaiHeWeiLai = dengDaiShiJian<{ tongHuaId: string; zhuangTai: string; shiChangMiao: number }>('通话结束')
    const huiFuZaiHeWeiLai = dengDaiShiJian<{ 角色ID: string; 消息列表: Array<Record<string, unknown>> }>('角色回复')

    const guaDuanQueRen = (await keHuDuan!.emitWithAck('通话挂断', {
      tongHuaId: yaoQingQueRen.tongHuaId,
    })) as { chengGong: boolean; shiChangMiao?: number; tiShi?: string }
    expect(guaDuanQueRen.chengGong).toBe(true)
    expect(typeof guaDuanQueRen.shiChangMiao).toBe('number')
    expect(guaDuanQueRen.shiChangMiao!).toBeGreaterThanOrEqual(0)

    const jieShuZaiHe = await jieShuZaiHeWeiLai
    expect(jieShuZaiHe.tongHuaId).toBe(yaoQingQueRen.tongHuaId)
    expect(jieShuZaiHe.zhuangTai).toBe('yiJieTong')
    expect(jieShuZaiHe.shiChangMiao).toBe(guaDuanQueRen.shiChangMiao)

    const huiFuZaiHe = await huiFuZaiHeWeiLai
    expect(huiFuZaiHe.角色ID).toBe(ceShiJiaoSeId)
    expect(huiFuZaiHe.消息列表[0].fa_song_zhe_lei_xing).toBe('xitong')

    const jiLu = await huoQuZuiXinTongHuaJiLu(ceShiYongHuId)
    expect(jiLu.length).toBe(1)
    expect(String(jiLu[0].类型)).toBe('yuYin')
    expect(String(jiLu[0].状态)).toBe('yiJieTong')
    expect(Number(jiLu[0].时长秒)).toBe(guaDuanQueRen.shiChangMiao)
    expect(jiLu[0].结束时间).not.toBeNull()
    expect(String(jiLu[0].角色ID)).toBe(ceShiJiaoSeId)

    const neiRong = await huoQuZuiXinXiTongXiaoXi(ceShiYongHuId)
    expect(neiRong).toMatch(/^\[语音通话\] 时长 \d{2,}:\d{2}$/)
  }, 15000)

  it('振铃期立即取消：落库 yiQuXiao 且系统消息为已取消', async () => {
    const yaoQingQueRen = (await keHuDuan!.emitWithAck('通话邀请', {
      jiaoSeId: ceShiJiaoSeId,
      leiXing: 'shiPin',
    })) as { chengGong: boolean; tongHuaId?: string }
    expect(yaoQingQueRen.chengGong).toBe(true)

    const jieShuZaiHeWeiLai = dengDaiShiJian<{ zhuangTai: string; shiChangMiao: number }>('通话结束')

    const quXiaoQueRen = (await keHuDuan!.emitWithAck('通话取消', {
      tongHuaId: yaoQingQueRen.tongHuaId,
    })) as { chengGong: boolean; tiShi?: string }
    expect(quXiaoQueRen.chengGong).toBe(true)

    const jieShuZaiHe = await jieShuZaiHeWeiLai
    expect(jieShuZaiHe.zhuangTai).toBe('yiQuXiao')
    expect(jieShuZaiHe.shiChangMiao).toBe(0)

    const jiLu = await huoQuZuiXinTongHuaJiLu(ceShiYongHuId)
    expect(String(jiLu[0].状态)).toBe('yiQuXiao')

    const neiRong = await huoQuZuiXinXiTongXiaoXi(ceShiYongHuId)
    expect(neiRong).toBe('[视频通话] 已取消')
  }, 15000)

  it('非本人jiaoSeId发起邀请被拒绝', async () => {
    const buCunZaiQueRen = (await keHuDuan!.emitWithAck('通话邀请', {
      jiaoSeId: crypto.randomUUID(),
      leiXing: 'yuYin',
    })) as { chengGong: boolean; tiShi?: string }
    expect(buCunZaiQueRen.chengGong).toBe(false)
    expect(typeof buCunZaiQueRen.tiShi).toBe('string')
    expect(buCunZaiQueRen.tiShi!.length).toBeGreaterThan(0)

    const taRenJiaoSeQueRen = (await keHuDuan!.emitWithAck('通话邀请', {
      jiaoSeId: qiTaYongHuJiaoSeId,
      leiXing: 'yuYin',
    })) as { chengGong: boolean; tiShi?: string }
    expect(taRenJiaoSeQueRen.chengGong).toBe(false)
    expect(taRenJiaoSeQueRen.tiShi!.length).toBeGreaterThan(0)
  }, 15000)

  it('未登录socket无法建立连接调用任何信令事件', async () => {
    keHuDuan?.disconnect()
    keHuDuan = null

    const weiShouQuanKeHuDuan = lianJieKeHuDuan(`http://127.0.0.1:${duanKou}`, {
      path: '/socket.io',
      transports: ['websocket'],
      forceNew: true,
    })
    const cuoWu = await new Promise<Error>((jieJue) => {
      weiShouQuanKeHuDuan.once('connect_error', (shouDaoCuoWu: Error) => jieJue(shouDaoCuoWu))
    })
    weiShouQuanKeHuDuan.disconnect()
    expect(cuoWu.message.length).toBeGreaterThan(0)
  }, 15000)
})
