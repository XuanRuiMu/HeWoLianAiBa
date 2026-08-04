process.env.ADMIN_PHONES = '13800000000'
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://lovewithme:BXYXblupz542284@localhost:5432/lovewithme'
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379'
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'ce-shi-zhuan-yong-mi-yao-zhi-shao-32-ge-zi-fu-chang'
}
process.env.RI_ZHI_TUI_SONG_HE_BING_JIAN_GE = '30'

import http from 'http'
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
import { Server } from 'socket.io'
import { io as lianJieKeHuDuan, type Socket as KeHuDuanSocket } from 'socket.io-client'
import {
  debug日志,
  guanBiRiZhiLiu,
  sheZhiZuiDiRiZhiJiBie,
  type RiZhiTiaoMu,
} from '../utils/debug日志'
import {
  dingYueRiZhi,
  dingYueZheShuLiang,
  qingKongDingYue,
  tuoMinRiZhiTiaoMu,
} from '../utils/日志订阅'
import { renZhengSocketZhongJianJian } from '../socket/认证'
import {
  chuShiHuaRiZhiTuiSongSocket,
  tingZhiRiZhiTuiSong,
  SHI_JIAN_DING_YUE_RI_ZHI,
  SHI_JIAN_QU_XIAO_RI_ZHI,
  SHI_JIAN_RI_ZHI_PI_LIANG,
  type RiZhiPiLiangZaiHe,
} from '../socket/日志推送'
import { shengChengLingPai } from '../utils/jwt'

const GUAN_LI_YUAN_SHOU_JI_HAO = '13800000000'
const PU_TONG_SHOU_JI_HAO = '13900000001'
const DENG_DAI_TUI_SONG_HAO_MIAO = 400

function dengDai(haoMiao: number): Promise<void> {
  return new Promise((jieJue) => {
    setTimeout(jieJue, haoMiao)
  })
}

describe('FP-R1 日志订阅总线', () => {
  beforeEach(() => {
    qingKongDingYue()
    sheZhiZuiDiRiZhiJiBie('debug')
  })

  afterEach(async () => {
    qingKongDingYue()
    await guanBiRiZhiLiu()
  })

  it('订阅后 debug日志 写入会分发到订阅者', () => {
    const shouDao: RiZhiTiaoMu[] = []
    dingYueRiZhi((tiaoMu) => shouDao.push(tiaoMu))

    debug日志.info('测试类型', '测试消息', { yong_hu_id: 'user-1', xiang_qing: { a: 1 } })

    expect(shouDao.length).toBe(1)
    expect(shouDao[0].ji_bie).toBe('info')
    expect(shouDao[0].lei_xing).toBe('测试类型')
    expect(shouDao[0].xiao_xi).toBe('测试消息')
    expect(shouDao[0].yong_hu_id).toBe('user-1')
    expect(shouDao[0].xiang_qing?.a).toBe(1)
    expect(typeof shouDao[0].shi_jian).toBe('string')
  })

  it('取消订阅后不再收到日志', () => {
    const shouDao: RiZhiTiaoMu[] = []
    const quXiao = dingYueRiZhi((tiaoMu) => shouDao.push(tiaoMu))
    debug日志.info('测试类型', '第一条')
    quXiao()
    debug日志.info('测试类型', '第二条')

    expect(dingYueZheShuLiang()).toBe(0)
    expect(shouDao.length).toBe(1)
    expect(shouDao[0].xiao_xi).toBe('第一条')
  })

  it('日志级别过滤对推送同样生效', () => {
    const shouDao: RiZhiTiaoMu[] = []
    dingYueRiZhi((tiaoMu) => shouDao.push(tiaoMu))
    sheZhiZuiDiRiZhiJiBie('warn')

    debug日志.debug('测试类型', 'debug消息')
    debug日志.info('测试类型', 'info消息')
    debug日志.warn('测试类型', 'warn消息')
    debug日志.error('测试类型', 'error消息')

    const jiBieLieBiao = shouDao.map((tiaoMu) => tiaoMu.ji_bie)
    expect(jiBieLieBiao).toEqual(['warn', 'error'])
  })

  it('订阅者抛异常不影响主日志链路', () => {
    dingYueRiZhi(() => {
      throw new Error('订阅者故障')
    })
    expect(() => debug日志.info('测试类型', '容错验证')).not.toThrow()
  })
})

describe('FP-R2 推送前脱敏', () => {
  beforeEach(() => {
    qingKongDingYue()
    sheZhiZuiDiRiZhiJiBie('debug')
  })

  afterEach(async () => {
    qingKongDingYue()
    await guanBiRiZhiLiu()
  })

  it('顶层与嵌套敏感字段在推送前被替换为 ***', () => {
    const shouDao: RiZhiTiaoMu[] = []
    dingYueRiZhi((tiaoMu) => shouDao.push(tiaoMu))

    debug日志.info('测试类型', '含敏感字段', {
      xiang_qing: {
        miMa: 'secret123',
        yanZhengMa: '123456',
        token: 'abc.def.ghi',
        qianTao: { api_key: 'sk-real-key', zhengChang: 'ok' },
        zhengChangZiDuan: 'ok',
      },
    })

    const xiangQing = shouDao[0].xiang_qing as Record<string, unknown>
    expect(xiangQing.miMa).toBe('***')
    expect(xiangQing.yanZhengMa).toBe('***')
    expect(xiangQing.token).toBe('***')
    expect((xiangQing.qianTao as Record<string, unknown>).api_key).toBe('***')
    expect((xiangQing.qianTao as Record<string, unknown>).zhengChang).toBe('ok')
    expect(xiangQing.zhengChangZiDuan).toBe('ok')
  })

  it('消息中的 JWT 字符串整串脱敏', () => {
    const shouDao: RiZhiTiaoMu[] = []
    dingYueRiZhi((tiaoMu) => shouDao.push(tiaoMu))

    debug日志.info(
      '测试类型',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
    )

    expect(shouDao[0].xiao_xi).toBe('***')
  })

  it('超长详情对象被截断标记而非原样推送', () => {
    const tiaoMu = tuoMinRiZhiTiaoMu({
      shi_jian: new Date().toISOString(),
      ji_bie: 'info',
      lei_xing: '测试类型',
      xiao_xi: '超长详情',
      xiang_qing: { chang: 'x'.repeat(5000) },
    })
    expect(tiaoMu.xiang_qing?.yi_jie_duan).toBe(true)
  })

  it('超长消息被截断到配置上限', () => {
    const tiaoMu = tuoMinRiZhiTiaoMu({
      shi_jian: new Date().toISOString(),
      ji_bie: 'info',
      lei_xing: '测试类型',
      xiao_xi: 'y'.repeat(5000),
    })
    expect(tiaoMu.xiao_xi.length).toBeLessThanOrEqual(2001)
  })
})

describe('FP-R3 管理员实时日志 Socket 推送', () => {
  let fuWuQi: http.Server
  let io: Server
  let duanKou = 0
  const keHuDuanLieBiao: KeHuDuanSocket[] = []

  function chuangJianKeHuDuan(shouJiHao: string, yongHuId: string): KeHuDuanSocket {
    const lingPai = shengChengLingPai({ yongHuId, shouJiHao })
    const keHuDuan = lianJieKeHuDuan(`http://127.0.0.1:${duanKou}`, {
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

  beforeEach(async () => {
    qingKongDingYue()
    sheZhiZuiDiRiZhiJiBie('debug')
    fuWuQi = http.createServer()
    io = new Server(fuWuQi, { path: '/socket.io' })
    io.use(renZhengSocketZhongJianJian)
    chuShiHuaRiZhiTuiSongSocket(io)
    await new Promise<void>((jieJue) => {
      fuWuQi.listen(0, '127.0.0.1', () => jieJue())
    })
    const dizhi = fuWuQi.address()
    duanKou = typeof dizhi === 'object' && dizhi !== null ? dizhi.port : 0
  })

  afterEach(async () => {
    for (const keHuDuan of keHuDuanLieBiao) keHuDuan.disconnect()
    keHuDuanLieBiao.length = 0
    tingZhiRiZhiTuiSong()
    qingKongDingYue()
    await io.close()
    await new Promise<void>((jieJue) => {
      fuWuQi.close(() => jieJue())
    })
  })

  afterAll(async () => {
    await guanBiRiZhiLiu()
  })

  it('管理员订阅后能收到批量日志推送', async () => {
    const keHuDuan = chuangJianKeHuDuan(GUAN_LI_YUAN_SHOU_JI_HAO, 'admin-1')
    await dengDaiLianJie(keHuDuan)

    const shouDao: RiZhiPiLiangZaiHe[] = []
    keHuDuan.on(SHI_JIAN_RI_ZHI_PI_LIANG, (zaiHe: RiZhiPiLiangZaiHe) => shouDao.push(zaiHe))

    await new Promise<void>((jieJue) => {
      keHuDuan.emit(SHI_JIAN_DING_YUE_RI_ZHI, () => jieJue())
    })

    debug日志.info('推送测试', '第一条推送')
    debug日志.warn('推送测试', '第二条推送')
    await dengDai(DENG_DAI_TUI_SONG_HAO_MIAO)

    const quanBuTiaoMu = shouDao.flatMap((zaiHe) => zaiHe.tiao_mu_lie_biao)
    const xiaoXiLieBiao = quanBuTiaoMu.map((tiaoMu) => tiaoMu.xiao_xi)
    expect(xiaoXiLieBiao).toContain('第一条推送')
    expect(xiaoXiLieBiao).toContain('第二条推送')
  })

  it('普通用户即使主动发送订阅事件也收不到任何日志', async () => {
    const puTong = chuangJianKeHuDuan(PU_TONG_SHOU_JI_HAO, 'user-1')
    await dengDaiLianJie(puTong)

    const shouDao: RiZhiPiLiangZaiHe[] = []
    puTong.on(SHI_JIAN_RI_ZHI_PI_LIANG, (zaiHe: RiZhiPiLiangZaiHe) => shouDao.push(zaiHe))
    puTong.emit(SHI_JIAN_DING_YUE_RI_ZHI)

    const guanLiYuan = chuangJianKeHuDuan(GUAN_LI_YUAN_SHOU_JI_HAO, 'admin-2')
    await dengDaiLianJie(guanLiYuan)
    await new Promise<void>((jieJue) => {
      guanLiYuan.emit(SHI_JIAN_DING_YUE_RI_ZHI, () => jieJue())
    })

    debug日志.info('推送测试', '仅管理员可见')
    await dengDai(DENG_DAI_TUI_SONG_HAO_MIAO)

    expect(shouDao.length).toBe(0)
  })

  it('无订阅者时不建立日志订阅，取消订阅后自动释放', async () => {
    expect(dingYueZheShuLiang()).toBe(0)

    const keHuDuan = chuangJianKeHuDuan(GUAN_LI_YUAN_SHOU_JI_HAO, 'admin-3')
    await dengDaiLianJie(keHuDuan)
    await new Promise<void>((jieJue) => {
      keHuDuan.emit(SHI_JIAN_DING_YUE_RI_ZHI, () => jieJue())
    })
    expect(dingYueZheShuLiang()).toBe(1)

    await new Promise<void>((jieJue) => {
      keHuDuan.emit(SHI_JIAN_QU_XIAO_RI_ZHI, () => jieJue())
    })
    expect(dingYueZheShuLiang()).toBe(0)
  })

  it('推送的日志已完成脱敏，前端拿不到明文敏感字段', async () => {
    const keHuDuan = chuangJianKeHuDuan(GUAN_LI_YUAN_SHOU_JI_HAO, 'admin-4')
    await dengDaiLianJie(keHuDuan)

    const shouDao: RiZhiPiLiangZaiHe[] = []
    keHuDuan.on(SHI_JIAN_RI_ZHI_PI_LIANG, (zaiHe: RiZhiPiLiangZaiHe) => shouDao.push(zaiHe))
    await new Promise<void>((jieJue) => {
      keHuDuan.emit(SHI_JIAN_DING_YUE_RI_ZHI, () => jieJue())
    })

    debug日志.error('推送测试', '含密码', { xiang_qing: { miMa: 'secret123' } })
    await dengDai(DENG_DAI_TUI_SONG_HAO_MIAO)

    const mingWen = JSON.stringify(shouDao)
    expect(mingWen).not.toContain('secret123')
    expect(mingWen).toContain('***')
  })

  it('每秒推送条数超过上限时丢弃并上报丢弃数', async () => {
    process.env.RI_ZHI_TUI_SONG_MEI_MIAO_ZUI_DA = '5'
    try {
      const keHuDuan = chuangJianKeHuDuan(GUAN_LI_YUAN_SHOU_JI_HAO, 'admin-5')
      await dengDaiLianJie(keHuDuan)

      const shouDao: RiZhiPiLiangZaiHe[] = []
      keHuDuan.on(SHI_JIAN_RI_ZHI_PI_LIANG, (zaiHe: RiZhiPiLiangZaiHe) => shouDao.push(zaiHe))
      await new Promise<void>((jieJue) => {
        keHuDuan.emit(SHI_JIAN_DING_YUE_RI_ZHI, () => jieJue())
      })

      for (let xuHao = 0; xuHao < 20; xuHao += 1) {
        debug日志.info('推送测试', `洪峰${xuHao}`)
      }
      await dengDai(DENG_DAI_TUI_SONG_HAO_MIAO)

      const zongTiaoShu = shouDao.reduce((leiJi, zaiHe) => leiJi + zaiHe.tiao_mu_lie_biao.length, 0)
      const zongDiuQi = shouDao.reduce((leiJi, zaiHe) => leiJi + zaiHe.diu_qi_shu, 0)
      expect(zongTiaoShu).toBeLessThanOrEqual(5)
      expect(zongDiuQi).toBeGreaterThan(0)
    } finally {
      delete process.env.RI_ZHI_TUI_SONG_MEI_MIAO_ZUI_DA
    }
  })
})
