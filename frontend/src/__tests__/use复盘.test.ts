import { describe, it, expect, beforeEach, vi } from 'vitest'
import { use复盘 } from '@/composables/use复盘'
import type { 消息 } from '@/types'

vi.mock('@/api/聊天', () => ({
  huoQuFuPan: vi.fn(),
}))

import { huoQuFuPan } from '@/api/聊天'

function zaoXiaoXi(id: string, faSongZhe: 消息['fa_song_zhe_lei_xing']): 消息 {
  return {
    id,
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'u1',
    fa_song_zhe_lei_xing: faSongZhe,
    nei_rong: `内容${id}`,
    lei_xing: 'wenben',
    shi_jian_chuo: Date.now(),
    yi_du: true,
  }
}

function zaoYiLai(gengDuo = {}) {
  return {
    luYou: { push: vi.fn().mockResolvedValue(true) },
    huoQuXiaoXiLieBiao: () => [] as 消息[],
    qingKongZhuangTai: vi.fn(),
    ...gengDuo,
  }
}

describe('use复盘 总结分块解析', () => {
  let canShu: ReturnType<typeof zaoYiLai>
  beforeEach(() => {
    vi.clearAllMocks()
    canShu = zaoYiLai()
  })

  it('带字段名的总结解析为分块，对象类型含渣型时标记警告', () => {
    const { fuPanZongJie, fuPanZongJieFenKuai } = use复盘(canShu)
    fuPanZongJie.value =
      '对象类型：渣型\n用户表现：主动热情\n关键转折点：识破谎言\n改进建议：保持警惕'
    const fenKuai = fuPanZongJieFenKuai.value
    expect(fenKuai).not.toBeNull()
    expect(fenKuai!.length).toBe(4)
    expect(fenKuai![0].biaoTi).toBe('对象类型')
    expect(fenKuai![0].neiRong).toBe('渣型')
    expect(fenKuai![0].jingGao).toBe(true)
    expect(fenKuai![1].jingGao).toBe(false)
    expect(fenKuai![3].biaoTi).toBe('改进建议')
    expect(fenKuai![3].neiRong).toBe('保持警惕')
  })

  it('无字段名或空文本不产生分块', () => {
    const { fuPanZongJie, fuPanZongJieFenKuai } = use复盘(canShu)
    fuPanZongJie.value = '一段没有任何字段前缀的自由文本'
    expect(fuPanZongJieFenKuai.value).toBeNull()
    fuPanZongJie.value = null
    expect(fuPanZongJieFenKuai.value).toBeNull()
    fuPanZongJie.value = '   '
    expect(fuPanZongJieFenKuai.value).toBeNull()
  })
})

describe('use复盘 批注映射', () => {
  it('按消息序号把批注映射到对应消息', () => {
    const lieBiao = [
      zaoXiaoXi('x1', 'yonghu'),
      zaoXiaoXi('x2', 'yonghu'),
      zaoXiaoXi('s1', 'xitong'),
    ]
    const canShu = zaoYiLai({ huoQuXiaoXiLieBiao: () => lieBiao })
    const { fuPanMoShi, fuPanPiZhu, huoQuPiZhuByXiaoXiId, huoQuQingGanLeiXing } = use复盘(canShu)
    fuPanMoShi.value = true
    fuPanPiZhu.value = [
      { xu_hao: 2, ping_lun: '这句说得很好', qing_gan: '积极' },
      { xu_hao: 1, ping_lun: '开场平淡', qing_gan: undefined },
    ]
    const diErTiao = huoQuPiZhuByXiaoXiId('x2')
    expect(diErTiao?.nei_rong).toBe('这句说得很好')
    expect(huoQuQingGanLeiXing(diErTiao?.qing_gan)).toBe('positive')
    expect(huoQuPiZhuByXiaoXiId('x1')?.nei_rong).toBe('开场平淡')
    expect(huoQuQingGanLeiXing(huoQuPiZhuByXiaoXiId('x1')?.qing_gan)).toBe('neutral')
    expect(huoQuPiZhuByXiaoXiId('buCunZai')).toBeNull()
  })

  it('非复盘模式下不建立序号映射', () => {
    const lieBiao = [zaoXiaoXi('x1', 'yonghu')]
    const canShu = zaoYiLai({ huoQuXiaoXiLieBiao: () => lieBiao })
    const { fuPanMoShi, fuPanPiZhu, huoQuPiZhuByXiaoXiId } = use复盘(canShu)
    fuPanMoShi.value = false
    fuPanPiZhu.value = [{ xu_hao: 1, ping_lun: '批注', qing_gan: undefined }]
    expect(huoQuPiZhuByXiaoXiId('x1')).toBeNull()
  })
})

describe('use复盘 轮询加载与退出', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('生成中时轮询直到拿到内容并关闭加载态', async () => {
    vi.mocked(huoQuFuPan)
      .mockResolvedValueOnce({
        fu_pan_nei_rong: null,
        fu_pan_shi_jian_xian: [],
        fu_pan_pi_zhu: null,
        jun_shi_zhi_dao_ji_lu: [],
        guan_jian_shi_jian: [],
        jia_zai_zhong: true,
      })
      .mockResolvedValue({
        fu_pan_nei_rong: '最终总结',
        fu_pan_shi_jian_xian: [],
        fu_pan_pi_zhu: [{ xu_hao: 1, ping_lun: '批注一', qing_gan: '积极' }],
        jun_shi_zhi_dao_ji_lu: [],
        guan_jian_shi_jian: [],
        jia_zai_zhong: false,
      })
    const { fuPanJiaZaiZhong, fuPanZongJie, jiaZaiFuPanShuJu } = use复盘(zaoYiLai())
    const renWu = jiaZaiFuPanShuJu('dangAn-1')
    expect(fuPanJiaZaiZhong.value).toBe(true)
    await vi.advanceTimersByTimeAsync(3100)
    await renWu
    expect(vi.mocked(huoQuFuPan).mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(fuPanZongJie.value).toBe('最终总结')
    expect(fuPanJiaZaiZhong.value).toBe(false)
  })

  it('退出复盘重置全部状态并跳转战绩页', async () => {
    const canShu = zaoYiLai()
    const { fuPanMoShi, fuPanDangAnId, tuiChuFuPan } = use复盘(canShu)
    fuPanMoShi.value = true
    fuPanDangAnId.value = 'a1'
    tuiChuFuPan()
    expect(fuPanMoShi.value).toBe(false)
    expect(fuPanDangAnId.value).toBeNull()
    expect(canShu.qingKongZhuangTai).toHaveBeenCalledTimes(1)
    expect(canShu.luYou.push).toHaveBeenCalledWith('/guo-wang-zhan-ji')
  })
})
