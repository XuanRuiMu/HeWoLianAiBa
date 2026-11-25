import { describe, expect, it } from 'vitest'
import { 语义加权候选 } from '../候选加权'

describe('候选差异化加权', () => {
  const base = {
    当前用户短句: '这瓜保熟吗',
    关系阶段序号: 6,
    人设气质: ['沙雕搞怪'],
    最近发送: ['大笑'],
    语义分: 0.78,
    随机数: () => 0.2,
  }

  it('命中当前聊天关键词的候选应高于同语义但无关候选', () => {
    const r = 语义加权候选({
      ...base,
      候选: [
        { duanMing: '瓜保熟', miaoShu: '这瓜保熟吗', renSheQiZhi: ['沙雕搞怪'], guanXiJieDuanXiaXian: 2 },
        { duanMing: '大笑', renSheQiZhi: ['可爱萌系'], guanXiJieDuanXiaXian: 2 },
      ],
    })
    expect(r[0].duanMing).toBe('瓜保熟')
  })

  it('最近刚发过的候选应被降权', () => {
    const r = 语义加权候选({
      ...base,
      候选: [
        { duanMing: '甲', renSheQiZhi: ['沙雕搞怪'] },
        { duanMing: '大笑', renSheQiZhi: ['沙雕搞怪'] },
      ],
    })
    expect(r.find((x) => x.duanMing === '甲')?.加权分).toBeGreaterThan(r.find((x) => x.duanMing === '大笑')?.加权分 ?? -1)
  })

  it('关系阶段贴合更高者应有奖励', () => {
    const r = 语义加权候选({
      ...base,
      候选: [
        { duanMing: '浅', renSheQiZhi: ['沙雕搞怪'], guanXiJieDuanXiaXian: 2 },
        { duanMing: '深', renSheQiZhi: ['沙雕搞怪'], guanXiJieDuanXiaXian: 6 },
      ],
    })
    expect(r.find((x) => x.duanMing === '深')?.关系奖励).toBeGreaterThan(r.find((x) => x.duanMing === '浅')?.关系奖励 ?? -1)
  })

  it('加权结果按分数降序', () => {
    const r = 语义加权候选({
      ...base,
      候选: [
        { duanMing: '低', renSheQiZhi: ['正经严肃'] },
        { duanMing: '高', miaoShu: '这瓜保熟吗', renSheQiZhi: ['沙雕搞怪'] },
      ],
    })
    expect(r.map((x) => x.duanMing)).toEqual(['高', '低'])
  })
})
