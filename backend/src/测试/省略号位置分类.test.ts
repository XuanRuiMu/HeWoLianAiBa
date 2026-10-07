import { describe, expect, it } from 'vitest'
import { fenLeiSheHao, tongJi, yuQiCiYuSheHaoGongXian } from './语域口径'

describe('语气词与省略号共现', () => {
  it('不关心省略号位置，因此不会像三形态那样漏掉首尾式', () => {
    // 第十轮的真实漏判：ISTJ 输出了「嗯…」，被 fenLeiSheHao 判为 moWei，
    // 于是 sheHaoJuZhong=0 被误读成「语气词假说被证伪」。
    expect(yuQiCiYuSheHaoGongXian('嗯…')).toBe(true)
    expect(fenLeiSheHao('嗯…')).toBe('moWei') // 三形态确实漏掉它
  })

  it('三形态全为 0 时，共现仍能捕获', () => {
    // `…嗯…` 独占首尾且中段有实义 → fenLeiSheHao 判 juZhong？不对：
    // 它以 `…` 开头也以 `…` 结尾 → 判 moWei。要让三形态都不计入，
    // 只能构造「省略号独占整条」：判 duJie，而 duJie 不进 juZhong。
    // 但纯省略号条不含语气词 → 共现为 false。这正是共现指标的边界：
    // 它抓的是「同一条消息既有语气词又有省略号」，对「纯省略号条」不适用。
    const b = tongJi(['…', '嗯…'])
    expect(b.sheHaoDuJie).toBe(0.5)
    expect(b.sheHaoMoWei).toBe(0.5)
    expect(b.yuQiCiSheHaoGongXian).toBe(0.5) // 只有「嗯…」那条共现
  })

  it('两者缺一不算共现', () => {
    expect(yuQiCiYuSheHaoGongXian('知道了')).toBe(false) // 只有语气词
    expect(yuQiCiYuSheHaoGongXian('好')).toBe(false) // 只有内容
  })

  it('空轮次返回 0 而不是 NaN', () => {
    expect(tongJi([]).yuQiCiSheHaoGongXian).toBe(0)
  })
})

describe('省略号位置分类', () => {
  it('按消息级首/中/尾位置分类', () => {
    expect(fenLeiSheHao('芋泥波波…杨枝甘露也行')).toBe('juZhong')
    expect(fenLeiSheHao('哈哈哈我懂……我隔壁床那位在追剧')).toBe('juZhong')
    // ⚠️ 消息级口径：语义上是「停顿后继续说」，但按整条判断落在中部 → juZhong
    expect(fenLeiSheHao('我舍友那只也是……一到晚上就往我腿上趴')).toBe('juZhong')
    expect(fenLeiSheHao('知道啦……')).toBe('moWei')
    expect(fenLeiSheHao('……突然问这个')).toBe('moWei')
    expect(fenLeiSheHao('这话你刚才是不是说过了…')).toBe('moWei')
    expect(fenLeiSheHao('……')).toBe('duJie')
    expect(fenLeiSheHao(' … … ')).toBe('duJie')
    expect(fenLeiSheHao('没有省略号')).toBe('wu')
    expect(fenLeiSheHao('')).toBe('wu')
  })

  it('口径盲区：纯中文句号与半角省略号都不计入本分类', () => {
    // 只认全角 …；`。。。` 属 B阶段AB.mts 的 chunBiaoBiLi 口径，不进本分类
    expect(fenLeiSheHao('。。。')).toBe('wu')
    expect(fenLeiSheHao('嗯...算了')).toBe('wu')
  })

  it('三类互斥，且都从属于「含省略号」总数', () => {
    const xiaoXi = [
      '芋泥波波…杨枝甘露也行',
      '知道啦……',
      '没有省略号',
      '……',
      '突然问这个……',
    ]
    const b = tongJi(xiaoXi)
    expect(b.tiaoShu).toBe(5)
    expect(b.sheHaoJuZhong).toBeCloseTo(0.2, 4)
    expect(b.sheHaoMoWei).toBeCloseTo(0.4, 4)
    expect(b.sheHaoDuJie).toBeCloseTo(0.2, 4)
    expect(b.sheHaoJuZhong + b.sheHaoMoWei + b.sheHaoDuJie).toBeCloseTo(0.8, 4)
  })

  it('空轮次返回全零而不是 NaN', () => {
    const b = tongJi([])
    expect(b.tiaoShu).toBe(0)
    expect(b.sheHaoJuZhong).toBe(0)
    expect(b.sheHaoMoWei).toBe(0)
    expect(b.sheHaoDuJie).toBe(0)
  })
})