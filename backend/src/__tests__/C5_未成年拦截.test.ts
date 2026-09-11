import { describe, it, expect, afterAll } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { huoQuFanYi } from '../config/translations'
import { jiSuanZhouSuiNianLing } from '../services/认证'

function suiJiShouJiHao(): string {
  return `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

/** 本地时区 YYYY-MM-DD */
function geShiHuaRiQi(d: Date): string {
  const nian = d.getFullYear()
  const yue = String(d.getMonth() + 1).padStart(2, '0')
  const ri = String(d.getDate()).padStart(2, '0')
  return `${nian}-${yue}-${ri}`
}

/** 恰好满 zhouSui 周岁的生日（当天） */
function chengNianShengRiDangTian(zhouSui: number): string {
  const jinTian = new Date()
  return geShiHuaRiQi(new Date(jinTian.getFullYear() - zhouSui, jinTian.getMonth(), jinTian.getDate()))
}

/** 距满 zhouSui 周岁还差一天（生日在明天） */
function chaYiTianManZhouSui(zhouSui: number): string {
  const jinTian = new Date()
  const shengRi = new Date(jinTian.getFullYear() - zhouSui, jinTian.getMonth(), jinTian.getDate())
  shengRi.setDate(shengRi.getDate() + 1)
  return geShiHuaRiQi(shengRi)
}

async function qingLiCeShiYongHu(shouJiHao: string): Promise<void> {
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  await redis.del(`yan_zheng_ma:${shouJiHao}`)
  await redis.del(`fa_song_jian_ge:${shouJiHao}`)
  await redis.del(`deng_lu_shi_bai:${shouJiHao}`)
}

async function faSongMaBingZhuCe(
  canShu: Record<string, unknown>,
): Promise<{ zhuangTaiMa: number; tiShi: string | undefined; chengGong: boolean }> {
  const shouJiHao = String(canShu.shouJiHao)
  await request(yingYong).post('/api/认证/发送码').send({ shouJiHao })
  const xiangYing = await request(yingYong).post('/api/认证/注册').send(canShu)
  return {
    zhuangTaiMa: xiangYing.status,
    tiShi: xiangYing.body.ti_shi as string | undefined,
    chengGong: xiangYing.body.cheng_gong as boolean,
  }
}

describe('C5 未成年人拦截', () => {
  const zhuCeYongHuMingJiShu = Date.now()

  afterAll(async () => {
    await 数据库.end()
    await redis.quit()
  })

  it('16周岁生日当天可以注册', async () => {
    const shouJiHao = suiJiShouJiHao()
    await qingLiCeShiYongHu(shouJiHao)
    try {
      const jieGuo = await faSongMaBingZhuCe({
        shouJiHao,
        yanZhengMa: '123456',
        yongHuMing: `成年边界${zhuCeYongHuMingJiShu}_a`,
        miMa: 'Test123456',
        tongYiXieYi: true,
        chuShengRiQi: chengNianShengRiDangTian(16),
      })
      expect(jieGuo.zhuangTaiMa).toBe(200)
      expect(jieGuo.chengGong).toBe(true)
      const xingCun = await 数据库.query(`SELECT "生日" FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
      expect(String(xingCun.rows[0].生日)).toBe(chengNianShengRiDangTian(16))
    } finally {
      await qingLiCeShiYongHu(shouJiHao)
    }
  })

  it('差一天满16周岁注册被拒并返回翻译文案', async () => {
    const shouJiHao = suiJiShouJiHao()
    await qingLiCeShiYongHu(shouJiHao)
    try {
      const jieGuo = await faSongMaBingZhuCe({
        shouJiHao,
        yanZhengMa: '123456',
        yongHuMing: `未成年边界${zhuCeYongHuMingJiShu}_b`,
        miMa: 'Test123456',
        tongYiXieYi: true,
        chuShengRiQi: chaYiTianManZhouSui(16),
      })
      expect(jieGuo.zhuangTaiMa).toBe(400)
      expect(jieGuo.chengGong).toBe(false)
      expect(jieGuo.tiShi).toBe(huoQuFanYi('renZheng', 'weiChengNianRenJinZhi'))
      const cunZai = await 数据库.query(`SELECT 1 FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
      expect(cunZai.rows.length).toBe(0)
    } finally {
      await qingLiCeShiYongHu(shouJiHao)
    }
  })

  it('缺少出生日期返回400缺少参数', async () => {
    const shouJiHao = suiJiShouJiHao()
    await qingLiCeShiYongHu(shouJiHao)
    try {
      const xiangYing = await request(yingYong)
        .post('/api/认证/注册')
        .send({
          shouJiHao,
          yanZhengMa: '123456',
          yongHuMing: `缺生日${zhuCeYongHuMingJiShu}_c`,
          miMa: 'Test123456',
          tongYiXieYi: true,
        })
      expect(xiangYing.status).toBe(400)
      expect(xiangYing.body.ti_shi).toBe(huoQuFanYi('tongYong', 'queShaoCanShu'))
    } finally {
      await qingLiCeShiYongHu(shouJiHao)
    }
  })

  it('出生日期格式非法返回400并匹配翻译文案', async () => {
    const shouJiHao = suiJiShouJiHao()
    await qingLiCeShiYongHu(shouJiHao)
    try {
      for (const feiFa of ['2010/01/01', 'not-a-date', '2023-13-01', '2010-02-30']) {
        const jieGuo = await faSongMaBingZhuCe({
          shouJiHao,
          yanZhengMa: '123456',
          yongHuMing: `格式非法${zhuCeYongHuMingJiShu}_d`,
          miMa: 'Test123456',
          tongYiXieYi: true,
          chuShengRiQi: feiFa,
        })
        expect(jieGuo.zhuangTaiMa).toBe(400)
        expect(jieGuo.tiShi).toBe(huoQuFanYi('renZheng', 'chuShengRiQiGeShiCuoWu'))
      }
    } finally {
      await qingLiCeShiYongHu(shouJiHao)
    }
  })

  it('最小年龄阈值走配置（默认16）', () => {
    expect(jiSuanZhouSuiNianLing(chengNianShengRiDangTian(16))).toBe(16)
    expect(jiSuanZhouSuiNianLing(chaYiTianManZhouSui(16))).toBe(15)
    expect(jiSuanZhouSuiNianLing('2000-02-29')).toBeGreaterThan(20)
    expect(jiSuanZhouSuiNianLing('2100-01-01')).toBeLessThanOrEqual(0)
  })

  it('周岁计算：生日当天+1、未到生日-1（固定参照日期）', () => {
    const canZhao = new Date(2026, 7, 25)
    expect(jiSuanZhouSuiNianLing('2010-08-25', canZhao)).toBe(16)
    expect(jiSuanZhouSuiNianLing('2010-08-26', canZhao)).toBe(15)
    expect(jiSuanZhouSuiNianLing('2010-08-24', canZhao)).toBe(16)
    expect(jiSuanZhouSuiNianLing('2010-12-31', canZhao)).toBe(15)
    expect(jiSuanZhouSuiNianLing('2010-01-01', canZhao)).toBe(16)
  })
})
