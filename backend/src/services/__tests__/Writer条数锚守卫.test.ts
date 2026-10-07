import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Writer 提示**不得出现条数锚**（第十九轮实测）。
 *
 * 实测：原文案「最多 5 条，每条单独一段。想到几条就发几条。」使 AI 输出
 * **3.67 条/轮**（真人 2.8、中位 2），24 轮真实外呼 × 3 型。
 * 同一轮里把风格示例表的轮长分布改成与真人一致后，输出**纹丝不动**（3.7 → 3.67）
 * —— 证明主因是提示里的**数字锚**，不是示例分布。
 *
 * ⚠️ 本文件只钉「不得出现数字锚」，**不钉具体条数**：
 *   LCCC 是通用微博对话而非恋爱对话，把 2.8 当恋爱基线属外推；
 *   写死条数会杀掉人格分化（ESFP 话多、INTJ 话少），且违反用户
 *   「不要任何预设规则限制 AI 发挥」的要求。
 */

const 角色 = {
  id: 'j1', wei_xin_ming: '小美', xing_ge: '沉稳', yan_yu_feng_ge: '说话简短',
  bei_jing_gu_shi: '大二学生', xing_wei_te_dian: '', shi_jie_xin_xi: { cheng_shi: '北京' },
} as never

async function writerDiShi(): Promise<string> {
  const { gouJianWriterPrompt } = await import('../Prompt构建器')
  return gouJianWriterPrompt({
    yong_hu_id: 'u1',
    jiao_se_id: 'j1',
    jiao_se: 角色,
    hao_gan_du: {
      xin_ren_du: 120, qin_mi_du: 90, qu_wei_du: 80, guan_huai_du: 70,
      zong_fen: 360, guan_xi_jie_duan: 'renShi',
    } as never,
    dui_hua_li_shi: [] as never,
    yong_hu_xin_xiao_xi: '今天差点迟到 笑死 闹钟没响',
    shi_fou_di_yi_lun: false,
    shi_jian_chang_jing: '晚上八点半',
    tu_pian_shou_quan: false,
  })
}

describe('Writer 提示 · 不得用条数锚', () => {
  beforeEach(() => {
    process.env.VITEST = 'false'
    vi.resetModules()
  })

  it('不得出现「最多 N 条」这类数字上限', async () => {
    const wenBen = await writerDiShi()
    expect(
      wenBen,
      '给了数字上限，模型会贴着上限凑（实测 3.67 条/轮 vs 真人 2.8）。真人中位是 2，5 无依据。',
    ).not.toMatch(/最多\s*\d+\s*条/)
  })

  it('不得出现带数字的条数指令（任何位置）', async () => {
    const wenBen = await writerDiShi()
    const daiShuZiDe = wenBen.split('\n').filter((l) => /\d+\s*条/.test(l))
    expect(daiShuZiDe, `以下行含带数字的条数指令：\n${daiShuZiDe.join('\n')}`).toEqual([])
  })

  it('Director 小纸条不得带条数（此前由 Director 数字硬截断，已废）', async () => {
    const wenBen = await writerDiShi()
    expect(wenBen, 'Writer 不得被告知「这轮回几条」').not.toMatch(/这轮.{0,6}几条|回几条/)
  })

  it('必须保留「每条单独一段」这个格式约束（否则多条会被挤成一段）', async () => {
    const wenBen = await writerDiShi()
    expect(wenBen).toContain('每条单独一段')
  })

  it('必须保留「只输出消息文字、不要 JSON」——这是格式不是技巧', async () => {
    const wenBen = await writerDiShi()
    expect(wenBen).toContain('只输出你要发的消息文字')
    expect(wenBen).toContain('不要 JSON')
  })

  it('状态层仍在（这是第十六轮的核心改造，删掉就退回「每句都必须有用」的 AI 味）', async () => {
    const wenBen = await writerDiShi()
    expect(wenBen).toContain('你现在的状态')
  })
})