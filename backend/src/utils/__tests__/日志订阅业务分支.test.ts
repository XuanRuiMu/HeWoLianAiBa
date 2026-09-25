import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dingYueRiZhi,
  dingYueZheShuLiang,
  fenFaRiZhi,
  qingKongDingYue,
  tuoMinRiZhiTiaoMu,
} from '../日志订阅'

beforeEach(() => {
  qingKongDingYue()
  vi.clearAllMocks()
})

afterEach(() => {
  qingKongDingYue()
  delete process.env.RI_ZHI_TUI_SONG_DAN_TIAO_ZUI_DA_ZI_FU
})

describe('日志脱敏与订阅分发', () => {
  it('脱敏敏感字段、JWT、超长文本和嵌套上下文', () => {
    process.env.RI_ZHI_TUI_SONG_DAN_TIAO_ZUI_DA_ZI_FU = '20'
    const 结果 = tuoMinRiZhiTiaoMu({
      shi_jian: '时间',
      ji_bie: '系统',
      lei_xing: '类型',
      xiao_xi: 'a'.repeat(50),
      yong_hu_id: '用户',
      jiao_se_id: '角色',
      qing_qiu_id: '请求',
      xiang_qing: {
        password: '秘密',
        正常字段: '值',
        nested: [{ token: '秘密' }, '正常'],
        异常值: BigInt(1),
      },
    })
    expect(结果.xiao_xi).toBe(`${'a'.repeat(20)}…`)
    expect(结果.xiang_qing).toEqual({ yi_jie_duan: true })
    expect(tuoMinRiZhiTiaoMu({
      shi_jian: '时间',
      ji_bie: '系统',
      lei_xing: '类型',
      xiao_xi: `${'a'.repeat(20)}.${'b'.repeat(20)}.${'c'.repeat(20)}`,
    }).xiao_xi).toBe('***')
  })

  it('订阅、取消订阅、清空和异常订阅者不影响主链路', () => {
    const 正常 = vi.fn()
    const 抛错 = vi.fn(() => { throw new Error('订阅者失败') })
    const 取消正常 = dingYueRiZhi(正常)
    dingYueRiZhi(抛错)
    expect(dingYueZheShuLiang()).toBe(2)
    fenFaRiZhi('系统', '类型', '消息', { yong_hu_id: '用户', xiang_qing: { token: '秘密' } })
    expect(正常).toHaveBeenCalledTimes(1)
    expect(抛错).toHaveBeenCalledTimes(1)
    取消正常()
    expect(dingYueZheShuLiang()).toBe(1)
    qingKongDingYue()
    expect(dingYueZheShuLiang()).toBe(0)
  })

  it('分发期间递归调用直接返回且无订阅者时短路', () => {
    const 递归 = vi.fn(() => fenFaRiZhi('系统', '内层', '内层消息', {}))
    dingYueRiZhi(递归)
    fenFaRiZhi('系统', '外层', '外层消息', {})
    expect(递归).toHaveBeenCalledTimes(1)
    qingKongDingYue()
    fenFaRiZhi('系统', '无订阅者', '消息', {})
    expect(递归).toHaveBeenCalledTimes(1)
  })
})
