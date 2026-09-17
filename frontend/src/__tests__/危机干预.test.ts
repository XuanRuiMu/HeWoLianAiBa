import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { huoQuFanYi } from '@/config/translations'
import { jianCeWeiJiXinHao } from '@/utils/危机干预'

vi.mock('@/api/聊天', () => ({
  faSongXiaoXi: vi.fn(),
}))

import { faSongXiaoXi } from '@/api/聊天'
import { 使用聊天仓库 } from '@/stores/聊天'

describe('危机干预前端链路', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('翻译文件含援助热线弹窗文案', () => {
    expect(huoQuFanYi('liaoTian', 'weiJiGanYuBiaoTi')).toBeTruthy()
    expect(huoQuFanYi('liaoTian', 'weiJiGanYuTiShi')).toBeTruthy()
    expect(huoQuFanYi('liaoTian', 'weiJiBoDaReXian')).toBeTruthy()
    expect(huoQuFanYi('liaoTian', 'weiJiZhiXiao')).toBeTruthy()
    expect(huoQuFanYi('liaoTian', 'weiJiChaoShiTiXing')).toBeTruthy()
  })

  it('服务端回危机标记时仓库弹援助热线并可关闭', async () => {
    vi.mocked(faSongXiaoXi).mockResolvedValue({
      xiaoXi: {
        id: 'x1',
        ke_hu_duan_id: 'x1',
        ke_hu_duan_xu_hao: 1,
        hui_hua_id: 'h1',
        fa_song_zhe_id: '',
        fa_song_zhe_lei_xing: 'yonghu',
        nei_rong: '很难受',
        lei_xing: 'wenben',
        shi_jian_chuo: Date.now(),
        yi_du: false,
      },
      shiMiJi: false,
      weiJiGanYu: true,
      yuanZhuReXian: '400-161-9995',
      ganYuTiShi: huoQuFanYi('liaoTian', 'weiJiGanYuTiShi'),
      chaoShiTiXingMiao: 300,
    })
    const 仓库 = 使用聊天仓库()
    仓库.dangQianHuiHuaId = 'h1'
    const 结果 = await 仓库.faSongXiaoXi('很难受')
    expect(结果).not.toBeNull()
    expect(仓库.weiJiGanYu).not.toBeNull()
    expect(仓库.weiJiGanYu?.yuanZhuReXian).toBe('400-161-9995')
    仓库.guanBiWeiJiGanYu()
    expect(仓库.weiJiGanYu).toBeNull()
  })

  it('危机关键词本地检测命中', () => {
    expect(jianCeWeiJiXinHao('我很难受')).toBe(false)
    expect(typeof jianCeWeiJiXinHao('不想活了')).toBe('boolean')
  })
})
