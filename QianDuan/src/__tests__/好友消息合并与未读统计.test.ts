import { describe, expect, it } from 'vitest'
import { heBingXiaoXi, tongJiDuiFangXinXiaoXi } from '@/utils/消息合并'

interface QiaoXi {
  id: string
  shi_jian_chuo: number
  fa_song_zhe_id: string
}

function xiaoXi(id: string, shiJianChuo: number, faSongZhe = 'ta'): QiaoXi {
  return { id, shi_jian_chuo: shiJianChuo, fa_song_zhe_id: faSongZhe }
}

const SHI = 1_700_000_000_000

describe('好友消息合并', () => {
  it('服务端新消息追加在末尾而不是插到最前', () => {
    const faWuQi = [xiaoXi('a', SHI), xiaoXi('b', SHI + 1000)]
    const yiCun = [xiaoXi('a', SHI)]
    const heBing = heBingXiaoXi(faWuQi, yiCun)
    expect(heBing.map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('乐观气泡在服务端尚未落库时保留在末尾', () => {
    const leGuan = xiaoXi('le-guan-1', SHI + 5000, 'wo')
    const faWuQi = [xiaoXi('a', SHI)]
    const yiCun = [xiaoXi('a', SHI), leGuan]
    const heBing = heBingXiaoXi(faWuQi, yiCun, (x) => x.id.startsWith('le-guan-'))
    expect(heBing.map((x) => x.id)).toEqual(['a', 'le-guan-1'])
  })

  it('发送完成后不再保留乐观气泡，只留服务端那一条', () => {
    const faWuQi = [xiaoXi('a', SHI), xiaoXi('fuwu-1', SHI + 5000, 'wo')]
    const yiCun = [xiaoXi('a', SHI), xiaoXi('le-guan-1', SHI + 5000, 'wo')]
    const rengRanShiBai = new Set<string>()
    const heBing = heBingXiaoXi(faWuQi, yiCun, (x) => rengRanShiBai.has(x.id))
    expect(heBing.map((x) => x.id)).toEqual(['a', 'fuwu-1'])
  })

  it('发送失败时乐观气泡留在列表里供重发', () => {
    const faWuQi = [xiaoXi('a', SHI)]
    const yiCun = [xiaoXi('a', SHI), xiaoXi('le-guan-1', SHI + 5000, 'wo')]
    const rengRanShiBai = new Set(['le-guan-1'])
    const heBing = heBingXiaoXi(faWuQi, yiCun, (x) => rengRanShiBai.has(x.id))
    expect(heBing.map((x) => x.id)).toEqual(['a', 'le-guan-1'])
  })

  it('未标记保留的乐观气泡被丢弃', () => {
    const faWuQi = [xiaoXi('a', SHI)]
    const yiCun = [xiaoXi('a', SHI), xiaoXi('le-guan-x', SHI + 100)]
    expect(heBingXiaoXi(faWuQi, yiCun).map((x) => x.id)).toEqual(['a'])
  })

  it('撤回更新走同一条 id 时以服务端内容为准', () => {
    const faWuQi = [xiaoXi('a', SHI)]
    const yiCun = [xiaoXi('a', SHI)]
    const heBing = heBingXiaoXi(faWuQi, yiCun, () => true)
    expect(heBing).toHaveLength(1)
    expect(heBing[0]).toBe(faWuQi[0])
  })

  it('时间戳相同按 id 稳定排序', () => {
    const faWuQi = [xiaoXi('b', SHI), xiaoXi('a', SHI)]
    expect(heBingXiaoXi(faWuQi, []).map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('统计对方新消息时排除自己发的与已存在的', () => {
    const heBing = [
      xiaoXi('a', SHI),
      xiaoXi('b', SHI + 1, 'wo'),
      xiaoXi('c', SHI + 2),
      xiaoXi('d', SHI + 3),
    ]
    const yiCun = new Set(['a', 'b'])
    expect(tongJiDuiFangXinXiaoXi(heBing, yiCun, 'wo')).toBe(2)
  })
})
