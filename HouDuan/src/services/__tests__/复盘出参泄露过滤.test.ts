import { describe, expect, it, vi } from 'vitest'

vi.mock('../../数据库', () => ({
  数据库: {
    query: vi.fn(async () => ({ rows: [] as unknown[], rowCount: 0 })),
    connect: vi.fn(async () => ({ release: () => undefined, query: vi.fn(async () => ({ rows: [], rowCount: 0 })) })),
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
  },
}))
vi.mock('../../socket/io', () => ({ huoQuIo: vi.fn(() => null) }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  jiLuAIJiLu: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
}))

import { guoLvFuPanChuCan } from '../复盘'
import { guoLvMinGanZiDuanXiangQing } from '../../routes/战绩'
import type { DangAnXiangQing } from '../../services/战绩'

describe('复盘出参确定性过滤（对齐军师侧强度）', () => {
  it('复盘正文里的带分数后台表述被抹掉，正常说法保留', () => {
    const jieGuo = guoLvFuPanChuCan({
      fu_pan_nei_rong: '信任度现在是120分，说明还早。你们俩现在挺亲密的，可以继续约。',
      fu_pan_shi_jian_xian: [],
      fu_pan_pi_zhu: [],
    })
    expect(jieGuo.fu_pan_nei_rong).not.toContain('120')
    expect(jieGuo.fu_pan_nei_rong).toContain('说明还早')
    expect(jieGuo.fu_pan_nei_rong).toContain('挺亲密的')
  })

  it('点评里的分数被抹掉，情感标签不受影响', () => {
    const jieGuo = guoLvFuPanChuCan({
      fu_pan_nei_rong: '整体不错',
      fu_pan_shi_jian_xian: [],
      fu_pan_pi_zhu: [
        { xu_hao: 1, ping_lun: '这条消息让亲密度涨了2分，很自然', qing_gan: '积极' },
      ],
    })
    expect(jieGuo.fu_pan_pi_zhu).toHaveLength(1)
    expect(jieGuo.fu_pan_pi_zhu[0].ping_lun).not.toContain('2分')
    expect(jieGuo.fu_pan_pi_zhu[0].ping_lun).toContain('很自然')
    expect(jieGuo.fu_pan_pi_zhu[0].qing_gan).toBe('积极')
  })

  it('点评被过滤清空时整条丢弃，情感标签全为后台词时字段省略', () => {
    const jieGuo = guoLvFuPanChuCan({
      fu_pan_nei_rong: '整体不错',
      fu_pan_shi_jian_xian: [],
      fu_pan_pi_zhu: [
        { xu_hao: 1, ping_lun: '好感度总分430分', qing_gan: '信任度120分' },
        { xu_hao: 2, ping_lun: '话题推进得很稳', qing_gan: '消极' },
      ],
    })
    expect(jieGuo.fu_pan_pi_zhu).toHaveLength(1)
    expect(jieGuo.fu_pan_pi_zhu[0].xu_hao).toBe(2)
    expect(JSON.stringify(jieGuo)).not.toContain('430')
  })

  it('战绩路由回传前对存量库内容同样生效', () => {
    const dangAn = {
      id: 'd-1',
      jiao_se_id: 'j-1',
      fu_pan_nei_rong: '信任度现在是120分，说明还早',
      fu_pan_pi_zhu: [{ xu_hao: 1, ping_lun: '亲密度涨了2分', qing_gan: '中性' }],
      fu_pan_shu_ju: [],
      jun_shi_ji_lu: [],
    } as unknown as DangAnXiangQing
    const qianDuan = guoLvMinGanZiDuanXiangQing(dangAn) as unknown as Record<string, unknown>
    const neiRong = qianDuan.fu_pan_nei_rong as string
    expect(neiRong).not.toContain('120')
    expect(neiRong).toContain('说明还早')
    const piZhu = qianDuan.fu_pan_pi_zhu as Array<{ ping_lun: string }>
    expect(piZhu[0].ping_lun).not.toContain('2分')
  })

  it('复盘内容为空时不误造字符串', () => {
    const dangAn = {
      id: 'd-2',
      fu_pan_nei_rong: null,
      fu_pan_pi_zhu: null,
      fu_pan_shu_ju: null,
      jun_shi_ji_lu: [],
    } as unknown as DangAnXiangQing
    const qianDuan = guoLvMinGanZiDuanXiangQing(dangAn) as unknown as Record<string, unknown>
    expect(qianDuan.fu_pan_nei_rong).toBeNull()
    expect(qianDuan.fu_pan_pi_zhu).toBeNull()
  })
})
