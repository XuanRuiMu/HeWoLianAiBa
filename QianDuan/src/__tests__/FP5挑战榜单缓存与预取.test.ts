import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PaiHangXiangMu, ZuBie } from '@/api/挑战'
import { use挑战榜单 } from '@/composables/use挑战榜单'

const { huoQuPaiHangBang } = vi.hoisted(() => ({ huoQuPaiHangBang: vi.fn() }))
vi.mock('@/api/挑战', () => ({ huoQuPaiHangBang }))

const zuBieLieBiao: ZuBie[] = ['nan_nv', 'nv_nan', 'nan_nan', 'nv_nv']

function zaoHang(ming: string): PaiHangXiangMu {
  return {
    pai_ming: 1,
    yong_hu_ming: ming,
    ji_fen: 100,
    duan_wei: 'zuiQiangWangZhe',
    sheng_chang: 1,
    fu_chang: 0,
    qi_quan_chang: 0,
    zui_gao_lian_sheng: 1,
  }
}

function guaQiChengNuo() {
  let duiXian!: (bangDan: PaiHangXiangMu[]) => void
  const chengNuo = new Promise<PaiHangXiangMu[]>((jieJue) => {
    duiXian = jieJue
  })
  return { chengNuo, duiXian }
}

beforeEach(() => {
  vi.clearAllMocks()
  use挑战榜单().qingChu()
})

describe('use挑战榜单模块级缓存', () => {
  it('四组别并发预取各一次，读缓存与再次预取都不再请求', async () => {
    const { yuQuQuanBu, huoQuZuBangDan, bangDanHuanCun } = use挑战榜单()
    vi.mocked(huoQuPaiHangBang).mockImplementation(async (zuBie: ZuBie) => [
      zaoHang(`hang-${zuBie}`),
    ])
    await yuQuQuanBu(zuBieLieBiao)
    expect(huoQuPaiHangBang).toHaveBeenCalledTimes(4)
    zuBieLieBiao.forEach((zuBie, suoYin) => {
      expect(huoQuPaiHangBang).toHaveBeenNthCalledWith(suoYin + 1, zuBie)
    })
    expect(bangDanHuanCun.value.size).toBe(4)
    const jieGuo = await huoQuZuBangDan('nv_nan')
    expect(jieGuo[0]?.yong_hu_ming).toBe('hang-nv_nan')
    expect(huoQuPaiHangBang).toHaveBeenCalledTimes(4)
    await yuQuQuanBu(zuBieLieBiao)
    expect(huoQuPaiHangBang).toHaveBeenCalledTimes(4)
  })

  it('预取进行中读取同一组别共享在途请求，不重复发', async () => {
    const guaQi = new Map<ZuBie, ReturnType<typeof guaQiChengNuo>>()
    vi.mocked(huoQuPaiHangBang).mockImplementation((zuBie: ZuBie) => {
      const xiang = guaQiChengNuo()
      guaQi.set(zuBie, xiang)
      return xiang.chengNuo
    })
    const { yuQuQuanBu, huoQuZuBangDan, yuQuZhong } = use挑战榜单()
    const yuQu = yuQuQuanBu(zuBieLieBiao)
    expect(yuQuZhong.value).toBe(true)
    const zhiJie = huoQuZuBangDan('nan_nv')
    const bingXing = huoQuZuBangDan('nan_nv')
    expect(huoQuPaiHangBang).toHaveBeenCalledTimes(4)
    guaQi.get('nan_nv')?.duiXian([zaoHang('gongXiang')])
    const jieGuo = await zhiJie
    expect(await bingXing).toBe(jieGuo)
    expect(jieGuo[0]?.yong_hu_ming).toBe('gongXiang')
    zuBieLieBiao.forEach((zuBie) => {
      guaQi.get(zuBie)?.duiXian([zaoHang(`hang-${zuBie}`)])
    })
    await yuQu
    expect(yuQuZhong.value).toBe(false)
    expect(huoQuPaiHangBang).toHaveBeenCalledTimes(4)
  })

  it('qingChu 后缓存清空并重新预取四组', async () => {
    const { yuQuQuanBu, bangDanHuanCun, qingChu } = use挑战榜单()
    vi.mocked(huoQuPaiHangBang).mockResolvedValue([zaoHang('xin')])
    await yuQuQuanBu(zuBieLieBiao)
    expect(bangDanHuanCun.value.size).toBe(4)
    qingChu()
    expect(bangDanHuanCun.value.size).toBe(0)
    await yuQuQuanBu(zuBieLieBiao)
    expect(huoQuPaiHangBang).toHaveBeenCalledTimes(8)
    expect(bangDanHuanCun.value.size).toBe(4)
  })

  it('预取失败走单榜兜底并写入缓存，兜底仍失败则上抛', async () => {
    const { yuQuQuanBu, huoQuZuBangDan, bangDanHuanCun, qingChu } = use挑战榜单()
    let nanNvCiShu = 0
    vi.mocked(huoQuPaiHangBang).mockImplementation(async (zuBie: ZuBie) => {
      if (zuBie === 'nan_nv') {
        nanNvCiShu += 1
        if (nanNvCiShu === 1) throw new Error('yuQuShiBai')
      }
      return [zaoHang(`hang-${zuBie}`)]
    })
    await yuQuQuanBu(zuBieLieBiao)
    expect(huoQuPaiHangBang).toHaveBeenCalledTimes(4)
    expect(bangDanHuanCun.value.has('nan_nv')).toBe(false)
    const jieGuo = await huoQuZuBangDan('nan_nv')
    expect(nanNvCiShu).toBe(2)
    expect(huoQuPaiHangBang).toHaveBeenCalledTimes(5)
    expect(huoQuPaiHangBang).toHaveBeenLastCalledWith('nan_nv')
    expect(bangDanHuanCun.value.get('nan_nv')).toEqual(jieGuo)
    expect(jieGuo[0]?.yong_hu_ming).toBe('hang-nan_nv')
    qingChu()
    const jiaDiaoYongShu = vi.mocked(huoQuPaiHangBang).mock.calls.length
    vi.mocked(huoQuPaiHangBang).mockRejectedValue(new Error('chiXuShiBai'))
    const yuQu = yuQuQuanBu(zuBieLieBiao)
    await expect(huoQuZuBangDan('nan_nv')).rejects.toThrow('chiXuShiBai')
    await yuQu
    const xinDiaoYong = vi.mocked(huoQuPaiHangBang).mock.calls.slice(jiaDiaoYongShu)
    expect(xinDiaoYong.filter((canShu) => canShu[0] === 'nan_nv')).toHaveLength(2)
  })

  it('模块级缓存跨实例共享，清空对全部实例生效', async () => {
    const jia = use挑战榜单()
    const yi = use挑战榜单()
    vi.mocked(huoQuPaiHangBang).mockImplementation(async (zuBie: ZuBie) => [
      zaoHang(`hang-${zuBie}`),
    ])
    await jia.yuQuQuanBu(zuBieLieBiao)
    const jieGuo = await yi.huoQuZuBangDan('nan_nan')
    expect(huoQuPaiHangBang).toHaveBeenCalledTimes(4)
    expect(jieGuo[0]?.yong_hu_ming).toBe('hang-nan_nan')
    expect(yi.bangDanHuanCun.value.size).toBe(4)
    yi.qingChu()
    expect(jia.bangDanHuanCun.value.size).toBe(0)
  })
})
