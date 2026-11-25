import { describe, expect, it, vi } from 'vitest'
import type { BiaoQingZaiTiJueCe } from '../表情载体'

describe('发送层人格约束', () => {
  it('I 型即使模型给出梗图短名也不会发送', async () => {
    vi.resetModules()
    const { 发送表情包消息 } = await import('../系统表情')
    const { 查找表情按短名 } = await import('../系统表情')
    const 结果 = await 发送表情包消息('u-1', 'j-1', '任意梗图', {
      geiHouXuan: true,
      yuanYin: '放行',
      yunXuFengGe: ['日常', '黄脸', '祝福'],
      guanXiJieDuanXuHao: 6,
      nianLingDang: '青年',
      qiWangJianGeLunShu: 3,
      shangCiFaTuLunShu: null,
      quXiang: '正常',
      renSheQiZhi: ['温柔治愈'],
      yong_hu_xin_xiao_xi: '哈哈',
    } as BiaoQingZaiTiJueCe)
    expect(结果).toBeNull()
  })
})
