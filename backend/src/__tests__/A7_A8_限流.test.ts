import { describe, it, expect, afterAll, vi } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { redis } from '../redis'
import { 数据库 } from '../数据库'
import { peiZhi } from '../config'
import { huoQuFanYi } from '../config/translations'
import { duanXinRiPeiEYunXu } from '../services/短信'
import { duanXinRiPeiEZhuJi } from '../middleware/限流'

function suiJiShouJiHao(): string {
  return `137${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

function suiJiIP(): string {
  return `198.51.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
}

const yuanShouJiHaoPeiE = peiZhi.duanXinRiPeiE.meiShouJiHaoMeiRi
const yuanIpPeiE = peiZhi.duanXinRiPeiE.meiIPMeiRi

afterAll(async () => {
  peiZhi.duanXinRiPeiE.meiShouJiHaoMeiRi = yuanShouJiHaoPeiE
  peiZhi.duanXinRiPeiE.meiIPMeiRi = yuanIpPeiE
  vi.restoreAllMocks()
  await 数据库.end()
  await redis.quit()
})

describe('A7 短信日配额', () => {

  it('每手机号达到日上限后拒绝且文案来自翻译文件', async () => {
    const shouJiHao = suiJiShouJiHao()
    const ip = suiJiIP()
    peiZhi.duanXinRiPeiE.meiShouJiHaoMeiRi = 2
    peiZhi.duanXinRiPeiE.meiIPMeiRi = 9999
    try {
      expect((await duanXinRiPeiEYunXu(shouJiHao, ip)).yun_xu).toBe(true)
      expect((await duanXinRiPeiEYunXu(shouJiHao, ip)).yun_xu).toBe(true)
      const jieGuo = await duanXinRiPeiEYunXu(shouJiHao, ip)
      expect(jieGuo.yun_xu).toBe(false)
      expect(jieGuo.ti_shi).toBe(huoQuFanYi('renZheng', 'duanXinRiPeiEYongJin'))
      // 其他手机号不受影响
      expect((await duanXinRiPeiEYunXu(suiJiShouJiHao(), ip)).yun_xu).toBe(true)
    } finally {
      await redis.del(`duan_xin_ri:${shouJiHao}:${new Date().toISOString().slice(0, 10)}`)
    }
  })

  it('每IP达到日上限后拒绝（轮换号码也无法绕过）', async () => {
    const ip = suiJiIP()
    peiZhi.duanXinRiPeiE.meiShouJiHaoMeiRi = 9999
    peiZhi.duanXinRiPeiE.meiIPMeiRi = 2
    const shiYongHao: string[] = []
    try {
      for (let i = 0; i < 3; i++) {
        const hao = suiJiShouJiHao()
        shiYongHao.push(hao)
        const jieGuo = await duanXinRiPeiEYunXu(hao, ip)
        if (i < 2) {
          expect(jieGuo.yun_xu).toBe(true)
        } else {
          expect(jieGuo.yun_xu).toBe(false)
          expect(jieGuo.ti_shi).toBe(huoQuFanYi('renZheng', 'duanXinRiPeiEYongJin'))
        }
      }
    } finally {
      const riQi = new Date().toISOString().slice(0, 10)
      for (const hao of shiYongHao) {
        await redis.del(`duan_xin_ri:${hao}:${riQi}`)
      }
      await redis.del(`duan_xin_ip_ri:${ip}:${riQi}`)
    }
  })

  it('Redis 故障时降级放行不阻断发码链路', async () => {
    const jianKong = vi.spyOn(redis, 'get').mockRejectedValue(new Error('redis down'))
    try {
      const jieGuo = await duanXinRiPeiEYunXu(suiJiShouJiHao(), suiJiIP())
      expect(jieGuo.yun_xu).toBe(true)
    } finally {
      jianKong.mockRestore()
    }
  })

  it('vitest 环境中间件直接放行（防跨测试互扰）', async () => {
    let nextDiaoYong = 0
    await duanXinRiPeiEZhuJi(
      { body: { shouJiHao: suiJiShouJiHao() } } as never,
      {} as never,
      () => {
        nextDiaoYong++
      },
    )
    expect(nextDiaoYong).toBe(1)
  })
})

describe('A8 /api/logs 独立严限流', () => {
  it('超过独立限流阈值后返回429', async () => {
    const zuiDa = peiZhi.xianLiu.riZhiJieShou.zuiDa
    expect(zuiDa).toBeGreaterThan(0)

    let siBaiCiShu = 0
    let zuiHouTiShi = ''
    for (let i = 0; i < zuiDa + 3; i++) {
      const xiangYing = await request(yingYong)
        .post('/api/logs')
        .send({ lei_xing: 'xingNengZhiBiao', xiang_qing: { huiHe: i } })
      if (xiangYing.status === 429) {
        siBaiCiShu++
        zuiHouTiShi = String(xiangYing.body.ti_shi)
      } else {
        expect(xiangYing.status).toBe(200)
      }
    }
    expect(siBaiCiShu).toBeGreaterThanOrEqual(1)
    expect(zuiHouTiShi).toBe(huoQuFanYi('tongYong', 'caoZuoPinFan'))
  }, 30000)
})
