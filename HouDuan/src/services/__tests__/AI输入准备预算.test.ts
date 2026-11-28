import { beforeEach, describe, expect, it, vi } from 'vitest'

const chaXunMock = vi.hoisted(() => vi.fn())
vi.mock('../../数据库', () => ({
  数据库: { query: (...c: unknown[]) => chaXunMock(...c), connect: vi.fn() },
}))
vi.mock('../../redis', () => ({
  redis: { set: vi.fn(async () => 'OK'), del: vi.fn(async () => 1), get: vi.fn(async () => null), incr: vi.fn(), expire: vi.fn() },
}))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
  jiLuHTTPQingQiu: vi.fn(),
}))
vi.mock('../文档文本提取', () => ({
  buQiWenJianTiQuWenBen: vi.fn(async (lieBiao: unknown) => lieBiao),
}))

import { AI配置 } from '../../config/AI配置'
import { anZiFuYuSuanJieQu, huoQuZuiJinDuiHuaLiShi } from '../AI输入准备'
import { debug日志 } from '../../utils/debug日志'
import type { DuiHuaLiShiXiang } from '../../types'

function zaoXiaoXi(xuHao: number, ziShu: number): DuiHuaLiShiXiang {
  return {
    id: `m-${xuHao}`,
    fa_song_zhe_lei_xing: xuHao % 2 === 0 ? 'yonghu' : 'jiaose',
    fa_song_zhe_ming: '对方',
    nei_rong: '字'.repeat(ziShu),
    shi_jian: '10:00',
  }
}

beforeEach(() => {
  chaXunMock.mockReset()
  vi.mocked(debug日志.debug).mockClear()
})

describe('字符预算注入（W3-A）', () => {
  it('短历史未超预算时全量注入，原数组内容不丢', () => {
    const liShi = Array.from({ length: 8 }, (_, i) => zaoXiaoXi(i + 1, 100))
    const jieGuo = anZiFuYuSuanJieQu(liShi)
    expect(jieGuo).toHaveLength(8)
    expect(jieGuo[0].id).toBe('m-1')
    expect(jieGuo[7].id).toBe('m-8')
  })

  it('长历史超预算时最老消息滑出，最近内容保留', () => {
    const liShi = Array.from({ length: 30 }, (_, i) => zaoXiaoXi(i + 1, 200))
    const jieGuo = anZiFuYuSuanJieQu(liShi, 5000)
    expect(jieGuo).toHaveLength(25)
    expect(jieGuo[0].id).toBe('m-6')
    expect(jieGuo[24].id).toBe('m-30')
    expect(jieGuo.some((x) => x.id === 'm-5')).toBe(false)
  })

  it('极端长消息不会把窗口挤空，至少保底最近 20 条', () => {
    const liShi = Array.from({ length: 30 }, (_, i) => zaoXiaoXi(i + 1, 500))
    const jieGuo = anZiFuYuSuanJieQu(liShi, 1000)
    expect(jieGuo).toHaveLength(20)
    expect(jieGuo[0].id).toBe('m-11')
    expect(jieGuo[19].id).toBe('m-30')
  })

  it('历史查询有参数化条数上限，内存侧再按字符预算截断并记 debug 日志', async () => {
    const 每条字数 = Math.max(24001, Math.ceil((AI配置.prompt.zhuRuYuSuanZiFu * 1.2) / 20))
    const hangLieBiao = Array.from({ length: 25 }, (_, i) => ({
      ID: `m-${25 - i}`,
      内容: '字'.repeat(每条字数),
      发送者: i % 2 === 0 ? 'yonghu' : 'jiaose',
      创建时间: new Date(Date.UTC(2026, 10, 1, 0, 0, 24 - i)).toISOString(),
    }))
    chaXunMock.mockImplementation(async () => ({ rows: hangLieBiao }))

    const jieGuo = await huoQuZuiJinDuiHuaLiShi('u-y', 'j-y')

    const [yuJu, can] = chaXunMock.mock.calls[0]
    expect(can).toHaveLength(3)
    expect(Number(can[2])).toBe(200)
    expect(String(yuJu)).toMatch(/LIMIT \$3/i)
    expect(String(yuJu)).not.toMatch(/LIMIT 50000/i)
    expect(jieGuo.length).toBeLessThan(25)
    expect(jieGuo.length).toBeGreaterThanOrEqual(20)
    expect(jieGuo[jieGuo.length - 1].id).toBe('m-25')
    expect(vi.mocked(debug日志.debug)).toHaveBeenCalledTimes(1)
    const riZhi = JSON.stringify(vi.mocked(debug日志.debug).mock.calls)
    expect(riZhi).toContain('字符预算')
    expect(riZhi).toContain('"quan_bu_tiao_shu":25')
    expect(riZhi).toContain('"yu_suan_zi_fu":' + AI配置.prompt.zhuRuYuSuanZiFu)
  })

  it('默认预算下短历史不截断也不记截断日志', async () => {
    const hangLieBiao = Array.from({ length: 3 }, (_, i) => ({
      ID: `m-${i + 1}`,
      内容: '短消息',
      发送者: 'yonghu',
      创建时间: new Date(Date.UTC(2026, 10, 1, 0, 0, i)).toISOString(),
    }))
    chaXunMock.mockImplementation(async () => ({ rows: hangLieBiao }))

    const jieGuo = await huoQuZuiJinDuiHuaLiShi('u-y', 'j-y')

    expect(jieGuo).toHaveLength(3)
    expect(vi.mocked(debug日志.debug)).not.toHaveBeenCalled()
  })
})
