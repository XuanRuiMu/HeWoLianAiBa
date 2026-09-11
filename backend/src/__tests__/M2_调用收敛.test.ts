import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  sheZhiMockTiaoYong,
  chongZhiDeepSeekKeHuDuan,
} from '../utils/DeepSeek客户端'
import { pingPanHaoGanDuPiLiang } from '../services/好感度评判'

describe('M2 LLM调用收敛', () => {
  let tiaoYongCiShu = 0

  beforeEach(() => {
    chongZhiDeepSeekKeHuDuan()
    tiaoYongCiShu = 0
    sheZhiMockTiaoYong(async () => {
      tiaoYongCiShu++
      const neiRong = JSON.stringify({
        信任度变化: 2,
        亲密度变化: 1,
        趣味度变化: 3,
        关怀度变化: 1,
        理由: '整体积极',
      })
      return {
        neiRong,
        xinXi: { role: 'assistant', content: neiRong },
        yuanShuJu: {} as never,
      }
    })
  })

  afterEach(() => {
    sheZhiMockTiaoYong(null)
  })

  it('多条回复合并为一次批量好感度评判（N次→1次）', async () => {
    const jieGuo = await pingPanHaoGanDuPiLiang('今天好累', ['抱抱', '辛苦了', '早点休息'], '对方')
    expect(tiaoYongCiShu).toBe(1)
    expect(jieGuo.xin_ren_du_bian_hua).toBe(2)
    expect(jieGuo.qu_wei_du_bian_hua).toBe(3)
  })

  it('单条回复退化为单条评判，仍为一次调用', async () => {
    await pingPanHaoGanDuPiLiang('今天好累', ['抱抱'], '对方')
    expect(tiaoYongCiShu).toBe(1)
  })

  it('空回复列表不发起任何调用', async () => {
    const jieGuo = await pingPanHaoGanDuPiLiang('今天好累', [], '对方')
    expect(tiaoYongCiShu).toBe(0)
    expect(jieGuo.li_you).toBe('')
  })

  it('批量评判的 Prompt 包含本轮全部回复内容', async () => {
    let buoHuoNeiRong = ''
    sheZhiMockTiaoYong(async (canShu) => {
      tiaoYongCiShu++
      const shouTiaoUser = canShu.xiaoXi.find((x) => x.jiaoSe === 'user')
      buoHuoNeiRong = typeof shouTiaoUser?.neiRong === 'string' ? shouTiaoUser.neiRong : ''
      const neiRong = JSON.stringify({ 信任度变化: 0, 亲密度变化: 0, 趣味度变化: 0, 关怀度变化: 0, 理由: '' })
      return { neiRong, xinXi: { role: 'assistant', content: neiRong }, yuanShuJu: {} as never }
    })
    await pingPanHaoGanDuPiLiang('今天好累', ['第一条回复', '第二条回复', '第三条回复'], '对方')
    expect(buoHuoNeiRong).toContain('第二条回复')
    expect(buoHuoNeiRong).toContain('第三条回复')
  })
})
