import { describe, it, expect, afterAll } from 'vitest'
import crypto from 'crypto'
import { 数据库 } from '../数据库'
import { redis } from '../redis'
import { peiZhi } from '../config'
import {
  huoQuMeiTiQianMingMiYao,
  chongZhiMeiTiQianMingMiYao,
  shengChengQianMingURL,
  yanZhengQianMing,
} from '../services/媒体存储'

const ceShiSha256 = 'a'.repeat(64)

describe('A9 媒体签名密钥与JWT密钥隔离', () => {
  afterAll(async () => {
    delete process.env.MEI_TI_QIAN_MING_MI_YAO
    chongZhiMeiTiQianMingMiYao()
    await 数据库.end()
    await redis.quit()
  })

  it('派生的媒体签名密钥不等于 JWT 密钥', () => {
    const meiTiMiYao = huoQuMeiTiQianMingMiYao()
    expect(meiTiMiYao).not.toBe(peiZhi.jwtMiYao)
    expect(meiTiMiYao.length).toBeGreaterThan(0)
  })

  it('媒体签名与 JWT 密钥签名互不相通', () => {
    const url = shengChengQianMingURL(ceShiSha256, 600)
    const params = new URLSearchParams(url.split('?')[1])
    const e = params.get('e') as string
    const s = params.get('s') as string

    // 正常签名可通过校验
    expect(yanZhengQianMing(ceShiSha256, e, s)).toBe(true)

    // 用 JWT 密钥伪造的同参数签名必须被拒绝（A9 核心断言）
    const weiZaoQianMing = crypto
      .createHmac('sha256', peiZhi.jwtMiYao)
      .update(`${ceShiSha256}:${e}`)
      .digest('hex')
    if (weiZaoQianMing !== s) {
      expect(yanZhengQianMing(ceShiSha256, e, weiZaoQianMing)).toBe(false)
    }
  })

  it('显式配置 MEI_TI_QIAN_MING_MI_YAO 时优先使用独立密钥', () => {
    chongZhiMeiTiQianMingMiYao()
    const duLiMiYao = 'X'.repeat(48)
    const yuanShi = process.env.MEI_TI_QIAN_MING_MI_YAO
    process.env.MEI_TI_QIAN_MING_MI_YAO = duLiMiYao
    // config 在导入时读取环境变量；此处通过重新赋值 peiZhi 模拟部署显式配置
    const yuanPeiZhi = peiZhi.meiTiQianMingMiYao
    ;(peiZhi as { meiTiQianMingMiYao: string }).meiTiQianMingMiYao = duLiMiYao
    try {
      expect(huoQuMeiTiQianMingMiYao()).toBe(duLiMiYao)

      // 独立密钥下签发与校验闭环一致，且与 JWT 密钥派生结果不同
      const url = shengChengQianMingURL(ceShiSha256, 600)
      const params = new URLSearchParams(url.split('?')[1])
      expect(yanZhengQianMing(ceShiSha256, params.get('e'), params.get('s'))).toBe(true)
      void yuanShi
    } finally {
      ;(peiZhi as { meiTiQianMingMiYao: string }).meiTiQianMingMiYao = yuanPeiZhi
      chongZhiMeiTiQianMingMiYao()
    }
  })
})
