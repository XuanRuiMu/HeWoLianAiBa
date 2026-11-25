import { beforeEach, describe, expect, it, vi } from 'vitest'

const 测试状态 = vi.hoisted(() => ({
  查询: vi.fn(),
  系数: vi.fn(async () => ({ xiShu: 1.2, muBiaoQuXian: 20, lianXuWeiDaBiao: 0, pingJunShuaiJianHou: 0 })),
  评判: vi.fn(async () => ({
    jieGuo: {
      xin_ren_du_bian_hua: 0,
      qin_mi_du_bian_hua: 0,
      qu_wei_du_bian_hua: 0,
      guan_huai_du_bian_hua: 0,
      li_you: '测试',
    },
  })),
}))

vi.mock('../../数据库', () => ({ 数据库: { query: 测试状态.查询 } }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('../好感度缓存', () => ({
  jiSuanXiShu: 测试状态.系数,
  yingYongHuiHuaBaoDi: vi.fn(),
}))

import { huoQuWanZhengHaoGanDu } from '../好感度'
import { HaoGanDuPeiZhi } from '../../config/好感度配置'

beforeEach(() => {
  vi.restoreAllMocks()
  测试状态.查询.mockReset()
  测试状态.系数.mockClear()
})

describe('关系阶段统一映射', () => {
  it('唯一键与中文档名同源，没有重复的产生不同含义的中文名', async () => {
    const { GuanXiJieDuanMingYingSh } = await import('../../config/好感度配置')
    expect(Object.keys(GuanXiJieDuanMingYingSh).sort()).toEqual(Object.keys(HaoGanDuPeiZhi.jieDuan).sort())
    expect(new Set(Object.values(GuanXiJieDuanMingYingSh)).size).toBe(Object.keys(HaoGanDuPeiZhi.jieDuan).length)
    for (const [jian, ming] of Object.entries(GuanXiJieDuanMingYingSh)) {
      expect(ming).toBe(HaoGanDuPeiZhi.jieDuan[jian].jieDuanMing)
    }
  })

  it('参数与 beta 都优先识别存库中文，旧拼音仍兼容到同一映射', async () => {
    const { jiSuanAIChanShu } = await import('../../config/AI参数策略')
    const { jieDuanDaoBeta } = await import('../Prompt构建器')
    const reLian = jiSuanAIChanShu('XieShou', { haoGanDu: { guan_xi_jie_duan: '热恋' } })
    const shenAi = jiSuanAIChanShu('XieShou', { haoGanDu: { guan_xi_jie_duan: '深爱' } })
    const normal = jiSuanAIChanShu('XieShou', { haoGanDu: { guan_xi_jie_duan: '朋友' } })
    expect(reLian.wenDu).toBeGreaterThanOrEqual(normal.wenDu ?? 0)
    expect(shenAi.wenDu).toBeGreaterThanOrEqual(normal.wenDu ?? 0)
    expect(jiSuanAIChanShu('XieShou', { haoGanDu: { guan_xi_jie_duan: 'reLian' } }).wenDu).toBe(reLian.wenDu)
    expect(jieDuanDaoBeta('热恋')).toBe(0.6)
    expect(jieDuanDaoBeta('深爱')).toBe(0.6)
    expect(jieDuanDaoBeta('reLian')).toBe(0.6)
    expect(jieDuanDaoBeta('冷淡')).toBe(0.3)
  })

  it('生成角色写库与军师缺省都以配置中文为值，不从对象键反查', async () => {
    const { GuiFanGuanXiJieDuanMing } = await import('../../config/好感度配置')
    expect(GuiFanGuanXiJieDuanMing(100)).toBe('冷淡')
    expect(GuiFanGuanXiJieDuanMing('lengDan')).toBe('冷淡')
    expect(GuiFanGuanXiJieDuanMing('朋友')).toBe('朋友')
    expect(GuiFanGuanXiJieDuanMing(undefined)).toBe('冷淡')
  })
})

describe('好感度读取与运行时互动次数', () => {
  it('SELECT 好感度返回数字互动次数、中文阶段与四个维度', async () => {
    测试状态.查询.mockResolvedValueOnce({
      rows: [{ 信任度: 140, 亲密度: 80, 趣味度: 65, 关怀度: 85, 总分: 430, 关系阶段: '朋友', 互动次数: '12' }],
    })
    expect(await huoQuWanZhengHaoGanDu('u-1', 'j-1')).toEqual({
      yong_hu_id: 'u-1',
      jiao_se_id: 'j-1',
      xin_ren_du: 140,
      qin_mi_du: 80,
      qu_wei_du: 65,
      guan_huai_du: 85,
      zong_fen: 430,
      guan_xi_jie_duan: '朋友',
      互动次数: 12,
    })
  })

  it.each([undefined, null, '不可用', 'Infinity', -3])('异常互动数 %s 不参与评判，统一按零兜底', async (huDong) => {
    测试状态.查询.mockResolvedValue({
      rows: [{ 信任度: 140, 亲密度: 80, 趣味度: 65, 关怀度: 85, 总分: 430, 关系阶段: '朋友', 互动次数: huDong }],
    })
    const 结果 = await huoQuWanZhengHaoGanDu('u-1', 'j-1')
    expect(结果?.互动次数).toBe(0)
  })
})
