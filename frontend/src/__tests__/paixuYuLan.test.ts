import { describe, it, expect } from 'vitest'
import { jiSuanMuBiaoSuoYin, jiSuanYuLanShunXu } from '@/utils/paixuYuLan'

describe('jiSuanYuLanShunXu', () => {
  it('将源下标元素取出并插入目标下标（向下拖）', () => {
    // 1 2 3，把 1(下标0) 拖到 2 之后 → 2 上移补位，落点在 2、3 之间
    expect(jiSuanYuLanShunXu(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
  })

  it('向上拖到顶部', () => {
    expect(jiSuanYuLanShunXu(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })

  it('向下拖到底部', () => {
    expect(jiSuanYuLanShunXu(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })

  it('源下标等于目标下标时顺序不变', () => {
    expect(jiSuanYuLanShunXu(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c'])
  })

  it('源下标越界时原样返回', () => {
    expect(jiSuanYuLanShunXu(['a', 'b', 'c'], 9, 1)).toEqual(['a', 'b', 'c'])
  })

  it('目标下标越界时夹紧到合法范围', () => {
    expect(jiSuanYuLanShunXu(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a'])
  })

  it('不修改原数组（纯函数）', () => {
    const yuan = ['a', 'b', 'c']
    jiSuanYuLanShunXu(yuan, 0, 1)
    expect(yuan).toEqual(['a', 'b', 'c'])
  })
})

describe('jiSuanMuBiaoSuoYin', () => {
  // 原始顺序卡片中心 Y（视口坐标系，固定）
  const yuanXin = [10, 20, 30]

  it('指针在首卡中心之上 → 落点下标 0', () => {
    expect(jiSuanMuBiaoSuoYin(yuanXin, 5, 0)).toBe(0)
  })

  it('指针越过第 2 张卡中心（向下拖）→ 落点下标 1', () => {
    // 25 ∈ (20,30)：越过 card1 中心，item0 落到 index1
    expect(jiSuanMuBiaoSuoYin(yuanXin, 25, 0)).toBe(1)
  })

  it('指针越过所有卡中心（拖到底）→ 落点下标 2', () => {
    expect(jiSuanMuBiaoSuoYin(yuanXin, 35, 0)).toBe(2)
  })

  it('向上拖：指针越过首卡中心以上 → 落点下标 0', () => {
    // item2 上拖，指针 5 落在 card0 前 → 落点 0
    expect(jiSuanMuBiaoSuoYin(yuanXin, 5, 2)).toBe(0)
  })

  it('向上拖：指针落在 card0 与 card1 中心之间 → 落点下标 1', () => {
    // item2 上拖，指针 15 落在 card0 与 card1 之间 → 落到 index1（a、c、b）
    expect(jiSuanMuBiaoSuoYin(yuanXin, 15, 2)).toBe(1)
  })

  it('空中心数组时回退到源下标（幂等安全）', () => {
    expect(jiSuanMuBiaoSuoYin([], 25, 0)).toBe(0)
  })
})

describe('预览顺序组合（源+目标）', () => {
  const yuanXin = [10, 20, 30]
  it('1 2 3，拖 1 越过 card1 中心 → 预览 2 1 3', () => {
    const muBiao = jiSuanMuBiaoSuoYin(yuanXin, 25, 0)
    expect(jiSuanYuLanShunXu(['a', 'b', 'c'], 0, muBiao)).toEqual(['b', 'a', 'c'])
  })
  it('1 2 3，拖 3 越过 card0 中心 → 预览 3 1 2', () => {
    const muBiao = jiSuanMuBiaoSuoYin(yuanXin, 5, 2)
    expect(jiSuanYuLanShunXu(['a', 'b', 'c'], 2, muBiao)).toEqual(['c', 'a', 'b'])
  })
})
