import { beforeEach, describe, expect, it, vi } from 'vitest'

const { 查询, 消息列表, 调用模型, 落库 } = vi.hoisted(() => ({
  查询: vi.fn(),
  消息列表: vi.fn(),
  调用模型: vi.fn(),
  落库: vi.fn(async () => undefined),
}))

vi.mock('../../数据库', () => ({
  数据库: {
    query: 查询,
    connect: vi.fn(async () => ({ release: () => undefined, query: vi.fn() })),
  },
}))
vi.mock('../../redis', () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => 1),
    keys: vi.fn(async () => []),
    hget: vi.fn(async () => null),
    hset: vi.fn(async () => 1),
    sadd: vi.fn(async () => 1),
    smembers: vi.fn(async () => []),
    lrange: vi.fn(async () => []),
  },
}))
vi.mock('../../socket/io', () => ({ huoQuIo: vi.fn(() => null) }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  jiLuAIJiLu: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
}))
vi.mock('../消息', () => ({ 取消息列表: 消息列表 }))
vi.mock('../战绩', () => ({ gengXinFuPanNeiRong: 落库 }))
vi.mock('../关键事件提取', () => ({ tiQuBingLuoKuGuanJianShiJian: vi.fn(async () => []) }))
vi.mock('../文档文本提取', () => ({ buQiWenJianTiQuWenBen: vi.fn(async (lieBiao: unknown) => lieBiao) }))
vi.mock('../../utils/通用模型调用', () => ({ 按配置调用: 调用模型 }))

import { shengChengFuPan } from '../复盘'
import { gouJianJunShiQiuZhuPrompt } from '../Prompt构建器'
import type { DuiHuaLiShiXiang, HaoGanDuXinXi } from '../../types'

const YongHu = '11111111-1111-4111-8111-111111111111'
const JiaoSe = '22222222-2222-4222-8222-222222222222'
const DangAn = '33333333-3333-4333-8333-333333333333'
const JiLvJu = '不得直接引用或逐字分析'

function kuShuJuXiaoXi(neiRong: string, faSongZhe: 'yonghu' | 'jiaose' = 'yonghu') {
  return {
    id: neiRong,
    hui_hua_id: JiaoSe,
    fa_song_zhe_id: YongHu,
    fa_song_zhe_lei_xing: faSongZhe,
    ai_biao_shi: false,
    nei_rong: neiRong,
    lei_xing: 'wenBen',
    shi_jian_chuo: Date.parse('2026-10-28T12:00:00.000Z'),
    yi_du: true,
    yi_che_hui: false,
  }
}

const HaoGanDu: HaoGanDuXinXi = {
  xin_ren_du: 150, qin_mi_du: 110, qu_wei_du: 90, guan_huai_du: 80, zong_fen: 430, guan_xi_jie_duan: 'shuXi',
}

function zaoJunShiZhengJu(lieBiao: DuiHuaLiShiXiang[]): string {
  return lieBiao.map((x) => `E${x.id} ${x.fa_song_zhe_ming}: ${x.nei_rong}`).join('\n')
}

beforeEach(() => {
  查询.mockReset()
  消息列表.mockReset()
  调用模型.mockReset()
  落库.mockClear()
})

describe('撤回输出纪律（W3-G）', () => {
  it('军师提示词保留（已撤回）口径并合并输出纪律：可作背景但不得逐字引用', () => {
    const tiShi = gouJianJunShiQiuZhuPrompt(
      zaoJunShiZhengJu([
        { id: '1', fa_song_zhe_lei_xing: 'yonghu', fa_song_zhe_ming: '用户', nei_rong: '我好难受（已撤回）', shi_jian: '12:00' } as DuiHuaLiShiXiang,
      ]),
      '林知夏',
      HaoGanDu,
    )
    expect(tiShi).toContain('（已撤回）')
    expect(tiShi).toContain('已知晓并当作背景')
    expect(tiShi).toContain(JiLvJu)
    expect(tiShi).toContain('你撤回的那句')
    expect(tiShi).toContain('不能声称对方最终保留了这句话')
  })

  it('复盘提示词带同款输出纪律，撤回原文只作背景', async () => {
    查询
      .mockResolvedValueOnce({ rows: [{ 有效消息数: 3 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
    消息列表.mockResolvedValueOnce({
      lie_biao: [
        kuShuJuXiaoXi('周末去哪玩'),
        kuShuJuXiaoXi('我想想哈', 'jiaose'),
        kuShuJuXiaoXi('到底去不去嘛'),
      ],
      zong_shu: 3,
    })
    const prompt = vi.fn()
    调用模型.mockImplementationOnce(async (_mingCheng: string, xiaoXi: { jiaoSe: string; neiRong: string }[]) => {
      const promptText = xiaoXi.find((x) => x.jiaoSe === 'user')?.neiRong || ''
      prompt(promptText)
      return {
        neiRong: JSON.stringify({
          pi_zhu: [{ xu_hao: 1, pi_zhu_nei_rong: '节奏挺自然', qing_gan: '中性' }],
          zong_jie: { dui_xiang_lei_xing: '正常', yong_hu_biao_xian: '主动直接', gai_jin_jian_yi: '保持就好' },
        }),
      }
    })

    await shengChengFuPan(YongHu, JiaoSe, DangAn)

    const tiShiWen = prompt.mock.calls[0][0] as string
    expect(tiShiWen).toContain('已知晓并当作背景')
    expect(tiShiWen).toContain(JiLvJu)
    expect(tiShiWen).toContain('你撤回的那句')
  })
})
