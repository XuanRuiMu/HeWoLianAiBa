import { describe, expect, it } from 'vitest'
import type { DuiHuaLiShiXiang } from '../../types'

function zaoXiang(
  id: string,
  fa_song_zhe_lei_xing: 'yonghu' | 'jiaose' | 'xitong',
  nei_rong: string,
  buFen: Partial<DuiHuaLiShiXiang> = {},
): DuiHuaLiShiXiang {
  return {
    id,
    fa_song_zhe_lei_xing,
    fa_song_zhe_ming: fa_song_zhe_lei_xing === 'jiaose' ? '角色' : '用户',
    nei_rong,
    shi_jian: '12:30',
    ...buFen,
  }
}

describe('主聊天本轮焦点与背景一致', () => {
  it('较早驱动消息后还有两条连发时 Writer 看见完整且仅一轮的表达', async () => {
    const { quBenLunLianFaJiaoDian, gouJianBenLunJiaoDianZhanShi, fenGeZuiXinYongHuXiaoXi } = await import('../对话渲染')
    const liShi = [
      zaoXiang('r-old', 'jiaose', '最近怎么样'),
      zaoXiang('u-old', 'yonghu', '上一轮未入选旧串'),
      zaoXiang('r-boundary', 'jiaose', '聊点什么'),
      zaoXiang('u-start', 'yonghu', '我昨天', { beiYongXiaoXiId: 'r-boundary' }),
      zaoXiang('u-mid', 'yonghu', '太累了'),
      zaoXiang('u-last', 'yonghu', '好', { beiYongXiaoXiId: 'u-mid' }),
    ]
    const jieGuo = quBenLunLianFaJiaoDian(liShi, 'u-start')
    expect(jieGuo).not.toBeNull()
    const wenBen = gouJianBenLunJiaoDianZhanShi(liShi, jieGuo!)
    expect(wenBen).toBe('我昨天\n太累了\n好')
    expect((wenBen.match(/好/g) || [])).toHaveLength(1)
    const fenQu = fenGeZuiXinYongHuXiaoXi(liShi)
    expect(fenQu.背景.map((xiang) => xiang.id)).toEqual(['r-old', 'u-old', 'r-boundary'])
    expect(fenQu.焦点?.id).toBe('u-last')
  })

  it('驱动为旧消息时含后续新消息，但不跨越有效角色轮次', async () => {
    const { quBenLunLianFaJiaoDian, gouJianBenLunJiaoDianZhanShi } = await import('../对话渲染')
    const liShi = [
      zaoXiang('u-a', 'yonghu', '我昨天'),
      zaoXiang('u-b', 'yonghu', '好累'),
      zaoXiang('r-x', 'jiaose', '睡吧'),
      zaoXiang('u-c', 'yonghu', '今天刚好'),
      zaoXiang('u-d', 'yonghu', '没睡好'),
      zaoXiang('u-e', 'yonghu', '好'),
    ]
    const jieGuo = quBenLunLianFaJiaoDian(liShi, 'u-b')!
    expect(jieGuo.xiaoXiLieBiao.map((xiang) => xiang.id)).toEqual(['u-c', 'u-d', 'u-e'])
    expect(gouJianBenLunJiaoDianZhanShi(liShi, jieGuo)).toBe('今天刚好\n没睡好\n好')
  })

  it('驱动为最新和省略驱动时都只写本轮', async () => {
    const { quBenLunLianFaJiaoDian, gouJianBenLunJiaoDianZhanShi } = await import('../对话渲染')
    const liShi = [
      zaoXiang('r', 'jiaose', '晚安'),
      zaoXiang('u1', 'yonghu', '前天说了'),
      zaoXiang('r2', 'jiaose', '嗯'),
      zaoXiang('u2', 'yonghu', '现在想休息'),
    ]
    for (const quDong of ['u2', undefined]) {
      const jieGuo = quBenLunLianFaJiaoDian(liShi, quDong)!
      expect(jieGuo.xiaoXiLieBiao.map((xiang) => xiang.id)).toEqual(['u2'])
      expect(gouJianBenLunJiaoDianZhanShi(liShi, jieGuo)).toBe('现在想休息')
    }
  })

  it('多媒体末尾保留原载体、文件名和各自原文', async () => {
    const { quBenLunLianFaJiaoDian, gouJianBenLunJiaoDianZhanShi } = await import('../对话渲染')
    const liShi = [
      zaoXiang('u1', 'yonghu', '看这个文件'),
      zaoXiang('u2', 'yonghu', '文件说明', {
        meiTiLeiBie: 'wenjian',
        yuanShiWenJianMing: '说明.pdf',
        meiTiMIME: 'application/pdf',
        meiTiShiChangHaoMiao: 0,
        beiYongXiaoXiId: 'u1',
      }),
    ]
    const jieGuo = quBenLunLianFaJiaoDian(liShi)!
    expect(gouJianBenLunJiaoDianZhanShi(liShi, jieGuo)).toBe('看这个文件\n[文件:说明.pdf]')
    expect(jieGuo.xiaoXiLieBiao[1]).toBe(liShi[1])
  })

  it('撤回占位不当作有效表达，系统消息也留在背景', async () => {
    const { quBenLunLianFaJiaoDian, gouJianBenLunJiaoDianZhanShi, fenGeZuiXinYongHuXiaoXi } = await import('../对话渲染')
    const liShi = [
      zaoXiang('r', 'jiaose', '上回话'),
      zaoXiang('u0', 'yonghu', '撤回原内容', { yi_che_hui: true }),
      zaoXiang('sys', 'xitong', '这不是用户发言'),
      zaoXiang('u1', 'yonghu', '只留下新意图'),
      zaoXiang('u2', 'yonghu', '好了'),
    ]
    const jieGuo = quBenLunLianFaJiaoDian(liShi)!
    expect(jieGuo.xiaoXiLieBiao.map((xiang) => xiang.id)).toEqual(['u1', 'u2'])
    expect(gouJianBenLunJiaoDianZhanShi(liShi, jieGuo)).toBe('只留下新意图\n好了')
    expect(fenGeZuiXinYongHuXiaoXi(liShi).背景.map((xiang) => xiang.id)).toEqual(['r', 'u0', 'sys'])
    expect(quBenLunLianFaJiaoDian([liShi[2]])).toBeNull()
  })
})
