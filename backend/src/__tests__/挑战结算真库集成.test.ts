import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import yingYong from '../server'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import {
  kaiShiTiaoZhan,
  jieSuanTiaoZhanDuiJu,
  huoQuWoDeGaiKuang,
} from '../services/挑战积分'
import { TIAO_ZHAN_PEI_ZHI } from '../config/挑战配置'

function suiJiShouJiHao(): string {
  return `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
}

function huoQuChengNianRiQi(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 20)
  return d.toISOString().split('T')[0]
}

async function chuangJianCeShiYongHu(): Promise<{ shouJiHao: string; yongHuId: string }> {
  const shouJiHao = suiJiShouJiHao()
  await 数据库.query(`DELETE FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  await redis.del(`yan_zheng_ma:${shouJiHao}`)
  await redis.del(`fa_song_jian_ge:${shouJiHao}`)

  await request(yingYong).post('/api/认证/发送码').send({ shouJiHao }).expect(200)
  await request(yingYong)
    .post('/api/认证/注册')
    .send({
      shouJiHao,
      yanZhengMa: '123456',
      yongHuMing: `挑战集成${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      miMa: 'testPassword123',
      tongYiXieYi: true,
      chuShengRiQi: huoQuChengNianRiQi(),
    })
    .expect(200)

  const yongHu = await 数据库.query(`SELECT "ID" FROM "用户" WHERE "手机号" = $1`, [shouJiHao])
  return { shouJiHao, yongHuId: String(yongHu.rows[0].ID) }
}

/** 经 kaiShiTiaoZhan 真实路径创建一局进行中的挑战对局，返回角色ID */
async function kaiYiJu(yongHuId: string): Promise<string> {
  const jiaoSe = await kaiShiTiaoZhan(yongHuId, '男', '女')
  return jiaoSe.id
}

async function chaXunDuiJu(jiaoSeId: string): Promise<Record<string, unknown>> {
  const jieGuo = await 数据库.query(
    `SELECT "状态", "结果类型", "积分变动" FROM "挑战对局" WHERE "角色ID" = $1`,
    [jiaoSeId],
  )
  return jieGuo.rows[0] || {}
}

describe('P0-2 挑战结算真库集成', () => {
  let ceShi: { shouJiHao: string; yongHuId: string } | null = null

  beforeAll(async () => {
    ceShi = await chuangJianCeShiYongHu()
  })

  afterAll(async () => {
    if (ceShi) {
      await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [ceShi.yongHuId])
      await redis.del(`yan_zheng_ma:${ceShi.shouJiHao}`)
      await redis.del(`fa_song_jian_ge:${ceShi.shouJiHao}`)
    }
  })

  it('胜利路径：真实UPDATE生效、加分与计数正确落库', async () => {
    if (!ceShi) throw new Error('测试用户未创建')
    const jiaoSeId = await kaiYiJu(ceShi.yongHuId)

    await jieSuanTiaoZhanDuiJu(ceShi.yongHuId, jiaoSeId, 'sheng_li_biao_bai_cheng_gong')

    const duiJu = await chaXunDuiJu(jiaoSeId)
    expect(String(duiJu['状态'])).toBe('已结束')
    expect(String(duiJu['结果类型'])).toBe('sheng_li_biao_bai_cheng_gong')
    expect(Number(duiJu['积分变动'])).toBe(TIAO_ZHAN_PEI_ZHI.shengLiJiaFen)

    const gaiKuang = await huoQuWoDeGaiKuang(ceShi.yongHuId)
    const nanNv = gaiKuang.find((g) => g.zu_bie === 'nan_nv')
    expect(nanNv?.ji_fen).toBe(TIAO_ZHAN_PEI_ZHI.chuShiJiFen + TIAO_ZHAN_PEI_ZHI.shengLiJiaFen)
    expect(nanNv?.sheng_chang).toBe(1)
    expect(nanNv?.lian_sheng).toBe(1)
  })

  it('定级保护：前N场失败不扣分但负场计数', async () => {
    if (!ceShi) throw new Error('测试用户未创建')
    const qianJiFen =
      TIAO_ZHAN_PEI_ZHI.chuShiJiFen + TIAO_ZHAN_PEI_ZHI.shengLiJiaFen

    const jiaoSeId = await kaiYiJu(ceShi.yongHuId)
    await jieSuanTiaoZhanDuiJu(ceShi.yongHuId, jiaoSeId, 'shi_bai_ju_jue_biao_bai')

    const duiJu = await chaXunDuiJu(jiaoSeId)
    expect(String(duiJu['结果类型'])).toBe('shi_bai_ju_jue_biao_bai')
    expect(Number(duiJu['积分变动'])).toBe(0)

    const gaiKuang = await huoQuWoDeGaiKuang(ceShi.yongHuId)
    const nanNv = gaiKuang.find((g) => g.zu_bie === 'nan_nv')
    expect(nanNv?.ji_fen).toBe(qianJiFen)
    expect(nanNv?.fu_chang).toBe(1)
  })

  it('放弃路径：按弃权扣分且弃权场计数', async () => {
    if (!ceShi) throw new Error('测试用户未创建')
    const jiaoSeId = await kaiYiJu(ceShi.yongHuId)
    await jieSuanTiaoZhanDuiJu(ceShi.yongHuId, jiaoSeId, 'shi_bai_fang_qi_tiao_zhan')

    const duiJu = await chaXunDuiJu(jiaoSeId)
    expect(Number(duiJu['积分变动'])).toBe(-TIAO_ZHAN_PEI_ZHI.fangQiKouFen)

    const gaiKuang = await huoQuWoDeGaiKuang(ceShi.yongHuId)
    const nanNv = gaiKuang.find((g) => g.zu_bie === 'nan_nv')
    expect(nanNv?.ji_fen).toBe(
      TIAO_ZHAN_PEI_ZHI.chuShiJiFen +
        TIAO_ZHAN_PEI_ZHI.shengLiJiaFen -
        TIAO_ZHAN_PEI_ZHI.fangQiKouFen,
    )
    expect(nanNv?.qi_quan_chang).toBe(1)
  })

  it('重复结算幂等：第二次调用不再改变任何数据', async () => {
    if (!ceShi) throw new Error('测试用户未创建')
    const jiaoSeId = await kaiYiJu(ceShi.yongHuId)
    await jieSuanTiaoZhanDuiJu(ceShi.yongHuId, jiaoSeId, 'shi_bai_fang_qi_tiao_zhan')

    const gaiKuangQian = await huoQuWoDeGaiKuang(ceShi.yongHuId)
    await jieSuanTiaoZhanDuiJu(ceShi.yongHuId, jiaoSeId, 'shi_bai_fang_qi_tiao_zhan')
    const gaiKuangHou = await huoQuWoDeGaiKuang(ceShi.yongHuId)

    const qian = JSON.stringify(gaiKuangQian.find((g) => g.zu_bie === 'nan_nv'))
    const hou = JSON.stringify(gaiKuangHou.find((g) => g.zu_bie === 'nan_nv'))
    expect(hou).toBe(qian)

    const duiJu = await chaXunDuiJu(jiaoSeId)
    expect(String(duiJu['结果类型'])).toBe('shi_bai_fang_qi_tiao_zhan')
  })

  it('免打扰结局：归入失败分支而非弃权（负场+1，积分按定级保护规则）', async () => {
    if (!ceShi) throw new Error('测试用户未创建')
    const gaiKuangJieShuQian = await huoQuWoDeGaiKuang(ceShi.yongHuId)
    const jieShuQian = gaiKuangJieShuQian.find((g) => g.zu_bie === 'nan_nv')
    if (!jieShuQian) throw new Error('组别概况缺失')

    const jiaoSeId = await kaiYiJu(ceShi.yongHuId)
    await jieSuanTiaoZhanDuiJu(ceShi.yongHuId, jiaoSeId, 'shi_bai_mian_da_rao')

    const duiJu = await chaXunDuiJu(jiaoSeId)
    expect(String(duiJu['状态'])).toBe('已结束')
    expect(String(duiJu['结果类型'])).toBe('shi_bai_mian_da_rao')

    const gaiKuangJieShuHou = await huoQuWoDeGaiKuang(ceShi.yongHuId)
    const jieShuHou = gaiKuangJieShuHou.find((g) => g.zu_bie === 'nan_nv')
    if (!jieShuHou) throw new Error('组别概况缺失')

    expect(jieShuHou.fu_chang).toBe(jieShuQian.fu_chang + 1)
    expect(jieShuHou.qi_quan_chang).toBe(jieShuQian.qi_quan_chang)
    expect(jieShuHou.sheng_chang).toBe(jieShuQian.sheng_chang)

    const zongChangCi =
      jieShuQian.sheng_chang + jieShuQian.fu_chang + jieShuQian.qi_quan_chang
    const yuQiBianDong =
      zongChangCi < TIAO_ZHAN_PEI_ZHI.dingJiBaoHuJuShu ? 0 : -TIAO_ZHAN_PEI_ZHI.shiBaiKouFen
    expect(Number(duiJu['积分变动'])).toBe(yuQiBianDong)
  })
})
