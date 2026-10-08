import { describe, it, expect } from 'vitest'
import { tongJi, BO_LANG_HAO_ZHEN_REN_JI_XIAN, JIAN_XIE_ZHEN_REN_JI_XIAN } from '../语域口径'

describe('语域口径 · 波浪号计数', () => {
  it('空输入的 boLangHaoBiLi 为 0，不是 NaN', () => {
    expect(tongJi([]).boLangHaoBiLi).toBe(0)
    expect(tongJi(['   ', '']).boLangHaoBiLi).toBe(0)
  })

  it('半角 ~ 与全角 ～ 都计入', () => {
    expect(tongJi(['今天运气不错~']).boLangHaoBiLi).toBe(1)
    expect(tongJi(['今天运气不错～']).boLangHaoBiLi).toBe(1)
  })

  it('同一条里多个 ~ 只按消息计一次（消息级占比，非出现次数）', () => {
    expect(tongJi(['录取啦~~']).boLangHaoBiLi).toBe(1)
    expect(tongJi(['好幸福~~~']).boLangHaoBiLi).toBe(1)
  })

  it('按消息数求占比：3 条里 1 条带 ~ = 0.3333', () => {
    expect(tongJi(['今天运气不错~', '刚睡醒', '在干嘛']).boLangHaoBiLi).toBe(0.3333)
  })

  it('无 ~ 时为 0', () => {
    expect(tongJi(['刚睡醒', '在干嘛']).boLangHaoBiLi).toBe(0)
  })

  it('空白消息不计入分母', () => {
    expect(tongJi(['带~的一句~', '  ', '']).boLangHaoBiLi).toBe(1)
  })

  it('真人基线常量落在实测量级内（0.041 = 4.10%，1,189/29,008）', () => {
    expect(BO_LANG_HAO_ZHEN_REN_JI_XIAN).toBeCloseTo(0.041, 3)
    expect(BO_LANG_HAO_ZHEN_REN_JI_XIAN).toBeGreaterThan(0)
    expect(BO_LANG_HAO_ZHEN_REN_JI_XIAN).toBeLessThan(0.15)
  })

  it('~ 计数不受 chaiBiaoWenBen 影响（~ 是被统计特征，不能被当标点剥掉）', () => {
    const xiaoXi = ['运气不错~']
    expect(tongJi(xiaoXi).boLangHaoBiLi).toBe(1)
    expect(tongJi(xiaoXi).pingJunZiShuChaiBiao).toBe(4)
  })
})

describe('语域口径 · 微信简写计数', () => {
  it('空输入的 jianXieBiLi 为 0', () => {
    expect(tongJi([]).jianXieBiLi).toBe(0)
  })

  it('词表内的简写都计入', () => {
    for (const s of ['都🉑', 'wok牛逼', 'xs', 'bur你怎么也bur了', 'tql👍', 'u1s1确实', '干劲满满hhhh']) {
      expect(tongJi([s]).jianXieBiLi).toBe(1)
    }
  })

  it('同一条多个简写只按消息计一次', () => {
    expect(tongJi(['bur你怎么也bur了']).jianXieBiLi).toBe(1)
    expect(tongJi(['xs都🉑wok']).jianXieBiLi).toBe(1)
  })

  it('普通句不算简写', () => {
    expect(tongJi(['我明天去找你', '在干嘛呢', '']).jianXieBiLi).toBe(0)
  })

  it('空白消息不计入分母', () => {
    expect(tongJi(['都🉑', '  ', '']).jianXieBiLi).toBe(1)
  })

  it('简写基线常量落在实测值 51/638 附近（≈0.0799）', () => {
    expect(JIAN_XIE_ZHEN_REN_JI_XIAN).toBeCloseTo(0.0799, 4)
    expect(JIAN_XIE_ZHEN_REN_JI_XIAN).toBeGreaterThan(0)
    // 该基线是**下界**（词表有限），故必须高于波浪号基线——实测语料里简写远多于 ~
    expect(JIAN_XIE_ZHEN_REN_JI_XIAN).toBeGreaterThan(BO_LANG_HAO_ZHEN_REN_JI_XIAN)
  })
})
