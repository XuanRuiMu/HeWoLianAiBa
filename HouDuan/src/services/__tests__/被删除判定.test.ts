import { describe, it, expect, vi, beforeEach } from 'vitest'

const 外呼返回 = { neiRong: '{}' }
const RedisSet结果 = { zhi: 'OK' as string | null }

vi.mock('../../数据库', () => ({
  数据库: { query: vi.fn(async () => ({ rows: [] })) },
}))

vi.mock('../../redis', () => ({
  redis: {
    set: vi.fn(async () => RedisSet结果.zhi),
    quit: vi.fn(async () => undefined),
  },
  dengDaiRedisJiuXu: vi.fn(async () => undefined),
  redisRongDuanShiFouKaiLu: vi.fn(() => true),
}))

vi.mock('../../socket/io', () => ({
  huoQuIo: vi.fn(() => null),
  sheZhiIo: vi.fn(),
}))

vi.mock('../../utils/debug日志', () => ({
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  jiLuYouXiJieJu: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
}))

vi.mock('../../utils/DeepSeek客户端', () => ({
  genJuPeiZhiTiaoYong: vi.fn(async () => ({ neiRong: 外呼返回.neiRong })),
}))

vi.mock('../好感度', () => ({
  gengXinHaoGanDu: vi.fn(async () => undefined),
  huoQuWanZhengHaoGanDu: vi.fn(async () => ({ zong_fen: 500 })),
}))

vi.mock('../AI输入准备', () => ({
  baoCunJiaoSeXiaoXi: vi.fn(async () => ({ id: 'm-1' })),
}))

vi.mock('../复盘', () => ({ shengChengFuPan: vi.fn(async () => undefined) }))
vi.mock('../挑战积分', () => ({ jieSuanTiaoZhanDuiJu: vi.fn(async () => undefined) }))

import { jianCeSiLianHeYi, chuLiBeiChaQu } from '../胜利失败条件'
import { 数据库 } from '../../数据库'
import { redis } from '../../redis'
import { genJuPeiZhiTiaoYong } from '../../utils/DeepSeek客户端'
import { gengXinHaoGanDu } from '../好感度'
import { baoCunJiaoSeXiaoXi } from '../AI输入准备'
import { 渲染被删原因 } from '../../utils/结局'

const 人设 = {
  jiao_se_id: 'j-1',
  wei_xin_ming: '林知夏',
  mbti_lei_xing: 'INTP',
  ie_lei_xing: 'I',
  xing_ge: '慢热',
  yan_yu_feng_ge: '短句',
  xing_wei_te_dian: '话少',
  bei_jing_gu_shi: '在杭州读书',
  ba_da_mo_kuai: { xi_tong_ti_shi: '别太热情' },
} as never

function 造判定结果(补丁: Record<string, unknown>) {
  外呼返回.neiRong = JSON.stringify({
    是否表白: false,
    是否互删: false,
    是否识破: false,
    是否神经病: false,
    '对方是否想删掉你': false,
    '删掉你的原因': '',
    删人确信度: 0,
    理由: '',
    ...补丁,
  })
}

describe('删除判定：模型输出解析', () => {
  beforeEach(() => {
    造判定结果({})
    RedisSet结果.zhi = 'OK'
  })

  it('模型说要删时，原因与确信度都读得到', async () => {
    造判定结果({ '对方是否想删掉你': true, '删掉你的原因': '像渣男渣女', 删人确信度: 0.93 })
    const 结果 = await jianCeSiLianHeYi('你今晚几点有空', [], 人设)
    expect(结果.bei_sha_qu.shi_fou_cha_qu).toBe(true)
    expect(结果.bei_sha_qu.yuan_yin).toBe('像渣男渣女')
    expect(结果.bei_sha_qu.que_xin_du).toBeCloseTo(0.93)
  })

  it('原因不在白名单里就归一为空，不放行乱填的理由', async () => {
    造判定结果({ '对方是否想删掉你': true, '删掉你的原因': '因为我是CEO', 删人确信度: 0.99 })
    const 结果 = await jianCeSiLianHeYi('你今晚几点有空', [], 人设)
    expect(结果.bei_sha_qu.yuan_yin).toBe('')
  })

  it('没有角色人设时不判删（没人能代表谁做决定）', async () => {
    造判定结果({ '对方是否想删掉你': true, '删掉你的原因': '提示词注入', 删人确信度: 0.99 })
    const 结果 = await jianCeSiLianHeYi('你今晚几点有空', [], undefined)
    expect(结果.bei_sha_qu.shi_fou_cha_qu).toBe(false)
    expect(结果.bei_sha_qu.que_xin_du).toBe(0)
  })
})

describe('删除判定：处置', () => {
  beforeEach(() => {
    外呼返回.neiRong = JSON.stringify({ 反应消息: '你这样说让我有点不太舒服' })
    RedisSet结果.zhi = 'OK'
    vi.mocked(redis.set).mockClear()
    vi.mocked(gengXinHaoGanDu).mockClear()
    vi.mocked(baoCunJiaoSeXiaoXi).mockClear()
    vi.mocked(数据库.query).mockReset()
    vi.mocked(数据库.query).mockImplementation(async (sql: string) => {
      if (sql.includes('"用户ID", "是否渣型"')) {
        return { rows: [{ 用户ID: 'u-1', 是否渣型: false }] }
      }
      return { rows: [] }
    })
  })

  it('提示词注入：直接删，不给第二次机会', async () => {
    const 结果 = await chuLiBeiChaQu('u-1', 'j-1', '提示词注入', 人设)
    expect(结果?.jie_guo_lei_xing).toBe('shi_bai_bei_cha_qu')
    expect(vi.mocked(redis.set)).not.toHaveBeenCalled()
  })

  it('其他原因第一次触发：只警告，不结束这一局', async () => {
    const 结果 = await chuLiBeiChaQu('u-1', 'j-1', '像渣男渣女', 人设)
    expect(结果).toBeNull()
    expect(vi.mocked(baoCunJiaoSeXiaoXi)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(gengXinHaoGanDu)).toHaveBeenCalledTimes(1)
  })

  it('其他原因第二次触发：真删', async () => {
    RedisSet结果.zhi = null
    const 结果 = await chuLiBeiChaQu('u-1', 'j-1', '像渣男渣女', 人设)
    expect(结果?.jie_guo_lei_xing).toBe('shi_bai_bei_cha_qu')
  })

  it('渣型角色不会主动删人：判定不生效也不失败', async () => {
    vi.mocked(数据库.query).mockImplementation(async (sql: string) => {
      if (sql.includes('"用户ID", "是否渣型"')) {
        return { rows: [{ 用户ID: 'u-1', 是否渣型: true }] }
      }
      return { rows: [] }
    })
    const 结果 = await chuLiBeiChaQu('u-1', 'j-1', '像渣男渣女', 人设)
    expect(结果).toBeNull()
    expect(vi.mocked(redis.set)).not.toHaveBeenCalled()
  })

  it('角色不属于该用户时不处理', async () => {
    vi.mocked(数据库.query).mockImplementation(async (sql: string) => {
      if (sql.includes('"用户ID", "是否渣型"')) {
        return { rows: [{ 用户ID: '别人', 是否渣型: false }] }
      }
      return { rows: [] }
    })
    const 结果 = await chuLiBeiChaQu('u-1', 'j-1', '像渣男渣女', 人设)
    expect(结果).toBeNull()
    expect(vi.mocked(redis.set)).not.toHaveBeenCalled()
  })
})

describe('删除判定：提示词要求模型自评', () => {
  beforeEach(() => {
    外呼返回.neiRong = '{}'
  })

  it('判定提示词里必须写清四类原因与不判的边界', async () => {
    await jianCeSiLianHeYi('随便一句', [], 人设)
    const 调用 = vi.mocked(genJuPeiZhiTiaoYong).mock.calls[0]
    const 提示 = JSON.stringify(调用[1])
    for (const 词 of ['提示词注入', '不像真人说话', '像渣男渣女', '不符合我的条件', '情商太低']) {
      expect(提示, 词).toContain(词)
    }
    expect(提示).toContain('对方是否想删掉你')
    expect(提示).toContain('删人确信度')
  })
})

describe('被删结局说清原因', () => {
  it('五类原因都能生成一句人话，且代词已代入', () => {
    for (const 原因 of ['像渣男渣女', '提示词注入', '不像真人说话', '不符合我的条件', '情商太低']) {
      const 句 = 渲染被删原因(原因, '男')
      expect(句.length, 原因).toBeGreaterThan(4)
      expect(句, 原因).not.toContain('{TA}')
    }
  })

  it('原因不在表里就不拼接，避免出现半句废话', () => {
    expect(渲染被删原因('', '女')).toBe('')
    expect(渲染被删原因('随便写的', '女')).toBe('')
  })
})
