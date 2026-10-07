import { describe, expect, it } from 'vitest'
import { ZHEN_REN_JI_XIAN } from './真人基线常量'
import { fenLeiSheHao, tongJi } from './语域口径'

describe('真人基线常量', () => {
  it('省略号三形态之和不等于含省略号总数时会被发现', () => {
    const { sheHaoDuJie, sheHaoMoWei, sheHaoJuZhong } = ZHEN_REN_JI_XIAN
    expect(sheHaoDuJie + sheHaoMoWei + sheHaoJuZhong).toBeCloseTo(0.027267, 5)
  })

  it('中部形态占比与三形态自洽', () => {
    const he = ZHEN_REN_JI_XIAN.sheHaoDuJie + ZHEN_REN_JI_XIAN.sheHaoMoWei + ZHEN_REN_JI_XIAN.sheHaoJuZhong
    expect(ZHEN_REN_JI_XIAN.sheHaoZhongBuZhanBi).toBeCloseTo(ZHEN_REN_JI_XIAN.sheHaoJuZhong / he, 3)
  })

  it('三形态基线量级合理：独条极罕见，中部与首尾同量级', () => {
    // 独条在 56,917 条里只有 6 条 —— 锁住「独条不可测」这个前提
    expect(ZHEN_REN_JI_XIAN.sheHaoDuJie).toBeLessThan(0.001)
    expect(ZHEN_REN_JI_XIAN.sheHaoMoWei).toBeGreaterThan(ZHEN_REN_JI_XIAN.sheHaoJuZhong)
    expect(ZHEN_REN_JI_XIAN.sheHaoJuZhong).toBeGreaterThan(0.005)
  })

  it('tongJi 的三形态口径与真人常量同源（同一函数）', () => {
    const xiaoXi = ['知道啦……', '芋泥波波…杨枝甘露也行', '没有省略号']
    const b = tongJi(xiaoXi)
    // 3 条中 1 条首尾、1 条中部、1 条无
    expect(b.sheHaoMoWei).toBeCloseTo(1 / 3, 4)
    expect(b.sheHaoJuZhong).toBeCloseTo(1 / 3, 4)
    expect(b.sheHaoDuJie).toBe(0)
    expect(fenLeiSheHao('知道啦……')).toBe('moWei')
  })
})