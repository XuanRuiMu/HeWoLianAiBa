import { zhengLiLiaoTianZhengJu } from '../聊天证据整理'
import { describe, expect, it } from 'vitest'
import type { DuiHuaLiShiXiang } from '../../types'

function xiaoXi(id: string, neiRong: string, shiJian: string): DuiHuaLiShiXiang {
  return { id, fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '用户', nei_rong: neiRong, shi_jian: shiJian }
}

describe('复盘接入统一聊天证据', () => {
  it('原兼容入口由同一纯函数产出，不再依赖HH:MM负数差值', async () => {
    const { fenLeiBingHeBingXiaoXi } = await import('../复盘')
    const [qian, hou] = [
      { ...xiaoXi('qian', '昨天说', '23:59'), shi_jian_chuo: Date.parse('2026-09-01T23:59:00+08:00') },
      { ...xiaoXi('hou', '今天说', '00:01'), shi_jian_chuo: Date.parse('2026-09-02T00:01:00+08:00') },
    ]
    expect(fenLeiBingHeBingXiaoXi([qian, hou]).yuJuLieBiao).toHaveLength(2)
    expect(fenLeiBingHeBingXiaoXi([qian, hou]).yuJuLieBiao[0]).toEqual(zhengLiLiaoTianZhengJu([qian, hou]).yuJuLieBiao[0])
  })

  it('撤回空串、运营内心字段既不分析也不夹入相邻消息', async () => {
    const { fenLeiBingHeBingXiaoXi } = await import('../复盘')
    const jieGuo = fenLeiBingHeBingXiaoXi([
      { ...xiaoXi('a', '第一句', '12:29'), shi_jian_chuo: Date.parse('2026-09-01T04:29:00Z') },
      { ...xiaoXi('b', '', '12:30'), shi_jian_chuo: Date.parse('2026-09-01T04:30:00Z'), yi_che_hui: true, lei_xing: 'wenBen' },
      { ...xiaoXi('c', '内心评估', '12:30'), shi_jian_chuo: Date.parse('2026-09-01T04:30:10Z'), lei_xing: 'neiXinHuoDong' },
      { ...xiaoXi('d', '最后一句', '12:31'), shi_jian_chuo: Date.parse('2026-09-01T04:31:00Z') },
    ])
    expect(jieGuo.beiHuLueXuHao).toEqual([2, 3])
    expect(jieGuo.yuJuLieBiao.map((Duan) => Duan.neiRong)).toEqual(['第一句', '最后一句'])
    expect(jieGuo.yuJuLieBiao.map((Duan) => Duan.yuanXuHaoLieBiao)).toEqual([[1], [4]])
  })

  it('客户端更早的HH:MM参数兼容但不合并，无需新增毫秒参数', () => {
    const jieGuo = zhengLiLiaoTianZhengJu([
      xiaoXi('a', '第一句', '12:00'),
      xiaoXi('b', '第二句', '12:01'),
    ])
    expect(jieGuo.yuJuLieBiao.map((Duan) => Duan.neiRong)).toEqual(['第一句', '第二句'])
  })
})
