import { ref } from 'vue'
import { describe, it, expect, beforeAll } from 'vitest'
import { use虚拟窗口 } from '@/composables/use虚拟窗口'
import type { 消息 } from '@/types'

function zaoXiaoXi(xuHao: number, shiJianChuo: number): 消息 {
  return {
    id: `x-${xuHao}`,
    hui_hua_id: 'h1',
    fa_song_zhe_id: 'j1',
    fa_song_zhe_lei_xing: 'jiaose',
    nei_rong: `消息${xuHao}`,
    lei_xing: 'wenben',
    shi_jian_chuo: shiJianChuo,
    yi_du: true,
  }
}

describe('use虚拟窗口 渲染窗口计算', () => {
  let lieBiao: 消息[]
  beforeAll(() => {
    const xianZai = Date.now()
    lieBiao = Array.from({ length: 400 }, (_, i) => zaoXiaoXi(i + 1, xianZai - (400 - i) * 1000))
  })

  it('低于全量阈值时全量渲染，超过阈值时只渲染尾部窗口', () => {
    const yiLai = { huoQuXiaoXiLieBiao: () => lieBiao.slice(0, 50), xiaoxiQuYuRef: ref(null) }
    const diLiang = use虚拟窗口(yiLai)
    expect(diLiang.xuanRanXiaoXiLieBiao.value.length).toBe(50)
    expect(diLiang.xuNiYinCangQianDiaoShu.value).toBe(0)

    const chaoChang = { huoQuXiaoXiLieBiao: () => lieBiao, xiaoxiQuYuRef: ref(null) }
    const daLiang = use虚拟窗口(chaoChang)
    expect(daLiang.xuanRanXiaoXiLieBiao.value.length).toBe(120)
    expect(daLiang.xuanRanXiaoXiLieBiao.value.at(-1)?.id).toBe('x-400')
    expect(daLiang.xuNiYinCangQianDiaoShu.value).toBe(280)
  })

  it('显式起始索引切片渲染，重置后回到自动尾部窗口', () => {
    const yiLai = { huoQuXiaoXiLieBiao: () => lieBiao, xiaoxiQuYuRef: ref(null) }
    const { xuNiQiSuoYin, xuanRanXiaoXiLieBiao, xuNiYinCangQianDiaoShu, chongZhiXuNiChuangKou } =
      use虚拟窗口(yiLai)
    xuNiQiSuoYin.value = 300
    expect(xuanRanXiaoXiLieBiao.value.length).toBe(100)
    expect(xuanRanXiaoXiLieBiao.value[0]?.id).toBe('x-301')
    expect(xuNiYinCangQianDiaoShu.value).toBe(300)
    chongZhiXuNiChuangKou()
    expect(xuNiQiSuoYin.value).toBeNull()
    expect(xuanRanXiaoXiLieBiao.value.length).toBe(120)
    expect(xuNiYinCangQianDiaoShu.value).toBe(280)
  })

  it('向上扩展一次揭示一个补长步长的更早消息（无容器时直接执行）', async () => {
    const yiLai = { huoQuXiaoXiLieBiao: () => lieBiao, xiaoxiQuYuRef: ref(null) }
    const { xuNiQiSuoYin, kuaiSuKuoZhanXiangShang } = use虚拟窗口(yiLai)
    xuNiQiSuoYin.value = 200
    kuaiSuKuoZhanXiangShang()
    await Promise.resolve()
    await Promise.resolve()
    expect(xuNiQiSuoYin.value).toBe(120)
  })
})

describe('use虚拟窗口 时间分组', () => {
  it('相邻消息合并同组，超过合并阈值另起一组并生成时间标签', () => {
    const xianZai = Date.now()
    const jin = [zaoXiaoXi(1, xianZai - 1000), zaoXiaoXi(2, xianZai - 2000)]
    const yiLai = { huoQuXiaoXiLieBiao: () => jin, xiaoxiQuYuRef: ref(null) }
    const { xiaoXiFenZu } = use虚拟窗口(yiLai)
    expect(xiaoXiFenZu.value.length).toBe(1)
    expect(xiaoXiFenZu.value[0].xiaoXiLieBiao.length).toBe(2)
    expect(xiaoXiFenZu.value[0].shiJian).toMatch(/^\d{2}:\d{2}$/)

    const za = [zaoXiaoXi(1, xianZai - 2 * 60 * 1000 - 1000), zaoXiaoXi(2, xianZai - 1000)]
    const kuaZu = use虚拟窗口({ huoQuXiaoXiLieBiao: () => za, xiaoxiQuYuRef: ref(null) })
    expect(kuaZu.xiaoXiFenZu.value.length).toBe(2)
  })
})
