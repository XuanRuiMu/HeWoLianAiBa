import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import crypto from 'crypto'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { peiZhi } from '../config'
import {
  huoQuMeiTiQianMingMiYao,
  chongZhiMeiTiQianMingMiYao,
  shengChengQianMingURL,
  yanZhengQianMing,
  shengChengMeiTiYinYong,
  tiQuMeiTiSha,
  zhongXinQianMingMeiTiURL,
  cheXiaoYongHuMeiTiQianMing,
} from '../services/媒体存储'

const ceShiSha256 = 'a'.repeat(64)
const ceShiYongHuId = '11111111-2222-4333-8444-555555555555'
const ceShiShouJiHao = '13000000001'

describe('A9 媒体签名密钥与JWT密钥隔离', () => {
  beforeAll(async () => {
    await 数据库.query(
      `INSERT INTO "用户" ("ID", "手机号", "用户名") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [ceShiYongHuId, ceShiShouJiHao, 'a9-ce-shi-yong-hu'],
    )
  })

  afterAll(async () => {
    delete process.env.MEI_TI_QIAN_MING_MI_YAO
    chongZhiMeiTiQianMingMiYao()
    await 数据库.query(`DELETE FROM "媒体文件" WHERE "上传者ID" = $1`, [ceShiYongHuId]).catch(() => {})
    await 数据库.query(`DELETE FROM "用户" WHERE "ID" = $1`, [ceShiYongHuId]).catch(() => {})
    await 数据库.end()
    await redis.quit()
  })

  it('派生的媒体签名密钥不等于 JWT 密钥', () => {
    const meiTiMiYao = huoQuMeiTiQianMingMiYao()
    expect(meiTiMiYao).not.toBe(peiZhi.jwtMiYao)
    expect(meiTiMiYao.length).toBeGreaterThan(0)
  })

  it('绑定用户的新签名闭环一致，且与 JWT 密钥签名互不相通', async () => {
    const url = shengChengQianMingURL(ceShiSha256, ceShiYongHuId, 600)
    const params = new URLSearchParams(url.split('?')[1])
    const e = params.get('e') as string
    const u = params.get('u') as string
    const t = params.get('t') as string
    const s = params.get('s') as string
    expect(u).toBe(ceShiYongHuId)

    await 数据库.query(
      `INSERT INTO "媒体文件" ("SHA256", "原始文件名", "MIME", "大小字节", "类别", "上传者ID")
       VALUES ($1, 'a9-test.png', 'image/png', 10, 'tupian', $2)
       ON CONFLICT DO NOTHING`,
      [ceShiSha256, ceShiYongHuId],
    )
    try {
      expect(await yanZhengQianMing(ceShiSha256, e, u, s, t)).toBe(true)

      const weiZaoQianMing = crypto
        .createHmac('sha256', peiZhi.jwtMiYao)
        .update(`${ceShiSha256}:${e}:${u}:${t}`)
        .digest('hex')
      if (weiZaoQianMing !== s) {
        expect(await yanZhengQianMing(ceShiSha256, e, u, weiZaoQianMing, t)).toBe(false)
      }

      const qiTaYongHu = '22222222-3333-4444-8555-666666666666'
      expect(await yanZhengQianMing(ceShiSha256, e, qiTaYongHu, s, t)).toBe(false)
    } finally {
      await 数据库.query(`DELETE FROM "媒体文件" WHERE "SHA256" = $1`, [ceShiSha256]).catch(() => {})
    }
  })

  it('按用户吊销后其签发时刻早于吊销的 URL 失效', async () => {
    const url = shengChengQianMingURL(ceShiSha256, ceShiYongHuId, 600)
    const params = new URLSearchParams(url.split('?')[1])
    await 数据库.query(
      `INSERT INTO "媒体文件" ("SHA256", "原始文件名", "MIME", "大小字节", "类别", "上传者ID")
       VALUES ($1, 'a9-revoke.png', 'image/png', 10, 'tupian', $2)
       ON CONFLICT DO NOTHING`,
      [ceShiSha256, ceShiYongHuId],
    )
    try {
      expect(
        await yanZhengQianMing(ceShiSha256, params.get('e'), params.get('u'), params.get('s'), params.get('t')),
      ).toBe(true)
      await cheXiaoYongHuMeiTiQianMing(ceShiYongHuId)
      expect(
        await yanZhengQianMing(ceShiSha256, params.get('e'), params.get('u'), params.get('s'), params.get('t')),
      ).toBe(false)
    } finally {
      await redis.del(`mei_ti_qian_ming_che_xiao:${ceShiYongHuId}`)
      await 数据库.query(`DELETE FROM "媒体文件" WHERE "SHA256" = $1`, [ceShiSha256]).catch(() => {})
    }
  })

  it('持久化引用与重签闭环：无参引用可提取哈希并按需重签，非媒体值原样返回', () => {
    const yinYong = shengChengMeiTiYinYong(ceShiSha256)
    expect(yinYong).toBe(`/api/媒体/${ceShiSha256}`)
    expect(tiQuMeiTiSha(yinYong)).toBe(ceShiSha256)
    expect(tiQuMeiTiSha(`/api/媒体/${ceShiSha256}?e=1&s=abc`)).toBe(ceShiSha256)
    expect(tiQuMeiTiSha('https://example.com/a.png')).toBeNull()
    expect(tiQuMeiTiSha('moRen')).toBeNull()
    const chongQian = zhongXinQianMingMeiTiURL(yinYong, ceShiYongHuId, 600) as string
    expect(chongQian).toContain(`u=${ceShiYongHuId}`)
    expect(zhongXinQianMingMeiTiURL('moRen', ceShiYongHuId)).toBe('moRen')
    expect(zhongXinQianMingMeiTiURL(null, ceShiYongHuId)).toBeNull()
  })

  it('显式配置 MEI_TI_QIAN_MING_MI_YAO 时优先使用独立密钥', async () => {
    chongZhiMeiTiQianMingMiYao()
    const duLiMiYao = 'X'.repeat(48)
    const yuanShi = process.env.MEI_TI_QIAN_MING_MI_YAO
    process.env.MEI_TI_QIAN_MING_MI_YAO = duLiMiYao
    const yuanPeiZhi = peiZhi.meiTiQianMingMiYao
    ;(peiZhi as { meiTiQianMingMiYao: string }).meiTiQianMingMiYao = duLiMiYao
    try {
      expect(huoQuMeiTiQianMingMiYao()).toBe(duLiMiYao)

      const url = shengChengQianMingURL(ceShiSha256, ceShiYongHuId, 600)
      const params = new URLSearchParams(url.split('?')[1])
      await 数据库.query(
        `INSERT INTO "媒体文件" ("SHA256", "原始文件名", "MIME", "大小字节", "类别", "上传者ID")
         VALUES ($1, 'a9-explicit.png', 'image/png', 10, 'tupian', $2)
         ON CONFLICT DO NOTHING`,
        [ceShiSha256, ceShiYongHuId],
      )
      try {
        expect(
          await yanZhengQianMing(ceShiSha256, params.get('e'), params.get('u'), params.get('s'), params.get('t')),
        ).toBe(true)
      } finally {
        await 数据库.query(`DELETE FROM "媒体文件" WHERE "SHA256" = $1`, [ceShiSha256]).catch(() => {})
      }
      void yuanShi
    } finally {
      ;(peiZhi as { meiTiQianMingMiYao: string }).meiTiQianMingMiYao = yuanPeiZhi
      chongZhiMeiTiQianMingMiYao()
    }
  })
})
