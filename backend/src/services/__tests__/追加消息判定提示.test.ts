import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * 「追加消息」判定层的提示契约。
 *
 * ⚠️ 这个文件存在的理由：**上一轮的测试是假绿**。
 *   我在 `AI回复调度器` 侧断言「好感度传给了 `panDuanZuiJia`」，
 *   然后把 `追加消息判定.ts` 里写进 prompt 的亲密度那行删掉 —— 测试**仍然全绿**。
 *   原因：调度器层只管**传参**，真正把亲密度**变成 prompt 文字**的是判定层，
 *   而判定层当时没有任何测试覆盖。**传参 ≠ 生效。**
 *
 *   ⇒ 这一层必须单独钉：关系阶段与「对 TA 的感觉」必须真的出现在 prompt 里。
 */

const 假 = vi.hoisted(() => ({
  genJuPeiZhiTiaoYong: vi.fn(async () => ({ neiRong: '{"you_dong_xi":false}' })),
}))

vi.mock('../../utils/DeepSeek客户端', () => ({ genJuPeiZhiTiaoYong: 假.genJuPeiZhiTiaoYong }))
vi.mock('../../config/开场采样配置', () => ({ duJieBaoKaiGuan: () => true }))

const 角色 = {
  id: 'j1',
  wei_xin_ming: '小美',
  xing_ge: '沉稳',
  yan_yu_feng_ge: '说话简短',
  bei_jing_gu_shi: '大二学生',
  xing_wei_te_dian: '',
  shi_jie_xin_xi: { cheng_shi: '北京' },
} as never

async function panDuan(guan_xi_jie_duan?: string): Promise<string> {
  假.genJuPeiZhiTiaoYong.mockClear()
  const { panDuanZuiJia } = await import('../追加消息判定')
  await panDuanZuiJia({
    jiao_se: 角色,
    hao_gan_du: guan_xi_jie_duan
      ? ({ zong_fen: 850, guan_xi_jie_duan } as never)
      : (null as never),
    dui_hua_li_shi: [] as never,
    liangJiaGeHaoMiao: 60 * 60 * 1000,
  })
  const canshu = 假.genJuPeiZhiTiaoYong.mock.calls[0]?.[1] as { neiRong: string }[]
  return canshu?.find((c) => c.jiaoSe === 'user')?.neiRong || ''
}

describe('追加消息判定 · 提示必须带上亲密度', () => {
  beforeEach(() => {
    process.env.VITEST = 'false'
    vi.resetModules()
  })

  it('热恋期：关系阶段与「对 TA 的感觉」都必须进 prompt', async () => {
    const tiShi = await panDuan('reLian')
    // ⚠️ 两样都要：阶段枚举（reLian）给模型定位处境，
    //   「对 TA 的感觉」（很想对方）才是角色判断要不要说话的内在依据。
    //   只有枚举没有感觉 ⇒ 模型仍会判出冷淡期的行为。
    expect(tiShi, '关系阶段必须进 prompt').toContain('reLian')
    expect(tiShi, '对 TA 的感觉必须进 prompt —— 这是角色自己判断要不要说话的内在依据').toContain(
      '很想对方',
    )
  })

  it('冷淡期与热恋期的 prompt 必须不同（否则亲密度只是摆设）', async () => {
    const leng = await panDuan('lengDan')
    const re = await panDuan('reLian')
    expect(leng, '冷淡期与热恋期拿到同一段提示 ⇒ 亲密度没生效').not.toBe(re)
    expect(leng).toContain('刚认识')
  })

  it('没有好感度时也不能崩，且要给出兜底的关系描述', async () => {
    const tiShi = await panDuan(undefined)
    expect(tiShi).toContain('你叫小美')
    expect(tiShi).toContain('还不太清楚')
  })

  it('不得出现「可以不 / 不必 / 别硬凑」这类倾向指令（三次实测会让命中率归零）', async () => {
    const tiShi = await panDuan('reLian')
    // 实测：①「别硬凑」0/8 ② 去掉后 5/8 ③「没想起也可以不发」0/12
    // ⇒ prompt 里任何这类措辞都是倾向指令，模型会照做
    expect(tiShi).not.toMatch(/可以不|没想起也|不必|别硬凑|可以不回/)
  })

  it('FP-06：不同 MBTI 的角色拿到不同的风格示例段（分化生效）', async () => {
    const panDuanJiaSe = async (mbti: string): Promise<string> => {
      假.genJuPeiZhiTiaoYong.mockClear()
      const { panDuanZuiJia } = await import('../追加消息判定')
      await panDuanZuiJia({
        jiao_se: { ...角色, mbti_lei_xing: mbti } as never,
        hao_gan_du: { zong_fen: 850, guan_xi_jie_duan: 'reLian' } as never,
        dui_hua_li_shi: [] as never,
        liangJiaGeHaoMiao: 60 * 60 * 1000,
      })
      const canshu = 假.genJuPeiZhiTiaoYong.mock.calls[0]?.[1] as { neiRong: string }[]
      return canshu?.find((c) => c.jiaoSe === 'user')?.neiRong || ''
    }
    const enfp = await panDuanJiaSe('ENFP')
    const intj = await panDuanJiaSe('INTJ')
    expect(enfp).not.toBe(intj)
  })

  it('FP-06：同型跨轮字节一致、未知 MBTI 兜底全表', async () => {
    const panDuanJiaSe = async (mbti: string): Promise<string> => {
      假.genJuPeiZhiTiaoYong.mockClear()
      const { panDuanZuiJia } = await import('../追加消息判定')
      await panDuanZuiJia({
        jiao_se: { ...角色, mbti_lei_xing: mbti } as never,
        hao_gan_du: { zong_fen: 850, guan_xi_jie_duan: 'reLian' } as never,
        dui_hua_li_shi: [] as never,
        liangJiaGeHaoMiao: 60 * 60 * 1000,
      })
      const canshu = 假.genJuPeiZhiTiaoYong.mock.calls[0]?.[1] as { neiRong: string }[]
      return canshu?.find((c) => c.jiaoSe === 'user')?.neiRong || ''
    }
    const a = await panDuanJiaSe('INFP')
    const b = await panDuanJiaSe('INFP')
    expect(a).toBe(b)
    const moWeiZhi = await panDuanJiaSe('')
    expect(moWeiZhi).toContain('安庆') // 兜底全表（末组以安庆天气论证游）
  })
})
