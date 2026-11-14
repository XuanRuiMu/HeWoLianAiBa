import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TiaoZhanPeiZhi } from '../挑战配置'

const 服务源 = readFileSync(resolve(__dirname, '../../server.ts'), 'utf8').replace(/\r\n/g, '\n')

describe('FP-06 挑战配置下发放弃扣分', () => {
  it('配置接口从挑战配置单一真源下发 fang_qi_kou_fen', () => {
    expect(服务源).toContain('fang_qi_kou_fen: TiaoZhanPeiZhi.fangQiKouFen')
    expect(服务源).toContain('zha_xing_gai_lv: TiaoZhanPeiZhi.zhaXingGaiLv')
  })

  it('放弃扣分为正数，前端提示直接消费该值', () => {
    expect(TiaoZhanPeiZhi.fangQiKouFen).toBeGreaterThan(0)
    expect(TiaoZhanPeiZhi.fangQiKouFen).toBe(15)
  })
})
