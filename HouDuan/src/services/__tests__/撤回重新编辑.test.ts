import { describe, expect, it, vi, beforeEach } from 'vitest'

const { 数据库桩 } = vi.hoisted(() => ({ 数据库桩: { query: vi.fn() } }))

vi.mock('../../数据库', () => ({ 数据库: 数据库桩 }))

vi.mock('../../socket/io', () => ({
  huoQuIo: vi.fn(() => null),
  sheZhiIo: vi.fn(),
}))

vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuYouXiJieJu: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
}))

const debugMock = await import('../../utils/debug日志')
const 调试日志 = debugMock.debug日志 as unknown as { warn: ReturnType<typeof vi.fn> }

vi.mock('../../utils/通用模型调用', () => ({
  按配置调用: vi.fn(async () => ({ neiRong: '{}' })),
}))

import { huoQuCheHuiShiXianHaoMiao, XiaoXiPeiZhi } from '../../config/消息配置'
import { huoQuCheHuiYuanWen, 撤回用户消息 } from '../消息'

function 用例行(buFen: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ID: 'm-1',
    用户ID: 'u-1',
    角色ID: 'j-1',
    发送者: 'yonghu',
    类型: 'wenben',
    内容: '撤回前的话',
    原始内容: '撤回前的话',
    创建时间: new Date(Date.now() - 10_000).toISOString(),
    已撤回: true,
    ...buFen,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('huoQuCheHuiShiXianHaoMiao 分类型时限', () => {
  it('文件类消息走 3 小时时限', () => {
    expect(huoQuCheHuiShiXianHaoMiao('wenJian')).toBe(3 * 60 * 60 * 1000)
    expect(huoQuCheHuiShiXianHaoMiao('wenJian')).toBe(XiaoXiPeiZhi.wenJianCheHuiShiXian)
  })

  it('文本、图片、语音与未知类型都回落 2 分钟时限', () => {
    for (const leiXing of ['wenben', 'tuPian', 'yuYin', 'biaoQingBao', '未知类型', '', null, undefined]) {
      expect(huoQuCheHuiShiXianHaoMiao(leiXing)).toBe(XiaoXiPeiZhi.cheHuiShiXian)
    }
  })
})

describe('huoQuCheHuiYuanWen', () => {
  it('本人已撤回消息在时限内返回原文', async () => {
    数据库桩.query.mockResolvedValue({ rows: [用例行()] })
    const jieGuo = await huoQuCheHuiYuanWen({
      yong_hu_id: 'u-1',
      jiao_se_id: 'j-1',
      xiao_xi_id: 'm-1',
    })
    expect(jieGuo.cheng_gong).toBe(true)
    expect(jieGuo.yuanWen).toBe('撤回前的话')
    expect(数据库桩.query).toHaveBeenCalledTimes(1)
  })

  it('原始内容为空时回落内容字段', async () => {
    数据库桩.query.mockResolvedValue({
      rows: [用例行({ 原始内容: null, 内容: '只看内容列' })],
    })
    const jieGuo = await huoQuCheHuiYuanWen({
      yong_hu_id: 'u-1',
      jiao_se_id: 'j-1',
      xiao_xi_id: 'm-1',
    })
    expect(jieGuo.cheng_gong).toBe(true)
    expect(jieGuo.yuanWen).toBe('只看内容列')
  })

  it('文件类型即使处于 3 小时撤回窗口也不允许重新编辑', async () => {
    数据库桩.query.mockResolvedValue({
      rows: [用例行({ 类型: 'wenJian', 创建时间: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() })],
    })
    const jieGuo = await huoQuCheHuiYuanWen({
      yong_hu_id: 'u-1',
      jiao_se_id: 'j-1',
      xiao_xi_id: 'm-1',
    })
    expect(jieGuo.cheng_gong).toBe(false)
    expect(jieGuo.zhuang_tai_ma).toBe(400)
    expect(jieGuo.ti_shi).toBe('消息撤回失败')
  })

  it('超出对应时限返回 400 与撤回失败提示', async () => {
    数据库桩.query.mockResolvedValue({
      rows: [用例行({ 创建时间: new Date(Date.now() - 10 * 60 * 1000).toISOString() })],
    })
    const jieGuo = await huoQuCheHuiYuanWen({
      yong_hu_id: 'u-1',
      jiao_se_id: 'j-1',
      xiao_xi_id: 'm-1',
    })
    expect(jieGuo.cheng_gong).toBe(false)
    expect(jieGuo.zhuang_tai_ma).toBe(400)
    expect(jieGuo.ti_shi).toBe('消息撤回失败')
  })

  it('未撤回或他人消息按 404 处理', async () => {
    数据库桩.query.mockResolvedValue({ rows: [] })
    const jieGuo = await huoQuCheHuiYuanWen({
      yong_hu_id: 'u-1',
      jiao_se_id: 'j-1',
      xiao_xi_id: 'm-2',
    })
    expect(jieGuo.cheng_gong).toBe(false)
    expect(jieGuo.zhuang_tai_ma).toBe(404)
    expect(jieGuo.ti_shi).toBeUndefined()
  })

  it('语音、表情包与文件类型不允许重新编辑', async () => {
    for (const leiXing of ['yuYin', 'biaoQingBao', 'wenJian']) {
      数据库桩.query.mockResolvedValue({ rows: [用例行({ 类型: leiXing })] })
      const jieGuo = await huoQuCheHuiYuanWen({
        yong_hu_id: 'u-1',
        jiao_se_id: 'j-1',
        xiao_xi_id: 'm-1',
      })
      expect(jieGuo.cheng_gong).toBe(false)
      expect(jieGuo.zhuang_tai_ma).toBe(400)
      expect(jieGuo.ti_shi).toBe('消息撤回失败')
    }
  })

  it('图文混排撤回只回传文字块并按行拼接', async () => {
    数据库桩.query.mockResolvedValue({
      rows: [
        用例行({
          类型: 'tuPian',
          内容: '[图片]看看这张[图片]',
          原始内容: '[图片]看看这张[图片]',
          内容块: [
            { lei_xing: 'tupian', mei_ti_id: 'mt-1' },
            { lei_xing: 'wenzi', nei_rong: '看看这张' },
            { lei_xing: 'tupian', mei_ti_id: 'mt-2' },
          ],
        }),
      ],
    })
    const jieGuo = await huoQuCheHuiYuanWen({
      yong_hu_id: 'u-1',
      jiao_se_id: 'j-1',
      xiao_xi_id: 'm-1',
    })
    expect(jieGuo.cheng_gong).toBe(true)
    expect(jieGuo.yuanWen).toBe('看看这张')
  })

  it('内容块为 JSON 字符串时同样可解析出文字', async () => {
    数据库桩.query.mockResolvedValue({
      rows: [
        用例行({
          类型: 'tuPian',
          内容块: JSON.stringify([{ lei_xing: 'wenzi', nei_rong: '第一行' }, { lei_xing: 'wenzi', nei_rong: '第二行' }]),
        }),
      ],
    })
    const jieGuo = await huoQuCheHuiYuanWen({
      yong_hu_id: 'u-1',
      jiao_se_id: 'j-1',
      xiao_xi_id: 'm-1',
    })
    expect(jieGuo.cheng_gong).toBe(true)
    expect(jieGuo.yuanWen).toBe('第一行\n第二行')
  })

  it('纯图撤回返回空原文但不报错', async () => {
    数据库桩.query.mockResolvedValue({
      rows: [
        用例行({
          类型: 'tuPian',
          内容: '[图片]',
          原始内容: '[图片]',
          内容块: [{ lei_xing: 'tupian', mei_ti_id: 'mt-1' }],
        }),
      ],
    })
    const jieGuo = await huoQuCheHuiYuanWen({
      yong_hu_id: 'u-1',
      jiao_se_id: 'j-1',
      xiao_xi_id: 'm-1',
    })
    expect(jieGuo.cheng_gong).toBe(true)
    expect(jieGuo.yuanWen).toBe('')
  })
})

describe('撤回用户消息按消息类型判定时限', () => {
  const jiaoSeId = '11111111-1111-4111-8111-111111111111'
  const xiaoXiId = '22222222-2222-4222-8222-222222222222'

  function mockCheHuiQuery(rows: Record<string, unknown>[]): void {
    数据库桩.query.mockReset()
    数据库桩.query.mockImplementation(async (wenBen: string) => {
      if (wenBen.includes('FROM "角色" WHERE "ID" = $1')) {
        return { rows: [{ 用户ID: 'u-1' }] }
      }
      if (wenBen.includes('FROM "消息" WHERE "ID" = $1')) {
        return { rows }
      }
      if (wenBen.includes('UPDATE "消息" SET "已撤回"')) {
        return { rows: rows.map((hang) => ({ ...hang, 已撤回: true, 撤回时间: new Date().toISOString() })) }
      }
      if (wenBen.includes('SELECT "公开编号" FROM "角色"')) {
        return { rows: [] }
      }
      return { rows: [] }
    })
  }

  it('文件消息超 2 分钟但在 3 小时内仍可撤回', async () => {
    mockCheHuiQuery([
      用例行({
        已撤回: false,
        类型: 'wenJian',
        ID: xiaoXiId,
        角色ID: jiaoSeId,
        创建时间: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      }),
    ])
    const jieGuo = await 撤回用户消息({
      yong_hu_id: 'u-1',
      jiao_se_id: jiaoSeId,
      xiao_xi_id: xiaoXiId,
    })
    expect(调试日志.warn).not.toHaveBeenCalled()
    expect(jieGuo.cheng_gong).toBe(true)
  })

  it('文本消息超 2 分钟即拒绝撤回', async () => {
    mockCheHuiQuery([
      用例行({
        类型: 'wenben',
        ID: xiaoXiId,
        角色ID: jiaoSeId,
        创建时间: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      }),
    ])
    const jieGuo = await 撤回用户消息({
      yong_hu_id: 'u-1',
      jiao_se_id: jiaoSeId,
      xiao_xi_id: xiaoXiId,
    })
    expect(jieGuo.cheng_gong).toBe(false)
    expect(jieGuo.zhuang_tai_ma).toBe(400)
    expect(jieGuo.ti_shi).toBe('消息撤回失败')
  })
})
