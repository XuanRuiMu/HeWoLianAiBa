import { beforeEach, describe, expect, it, vi } from 'vitest'

const XiaoXiZhuangTai = new Map<string, boolean>()
let ZhiXingJiLu: string[] = []

const { 数据库桩 } = vi.hoisted(() => ({ 数据库桩: { query: vi.fn(), connect: vi.fn() } }))

function xiaoXiZhuangTaiRows(lieBiao: string[]): Array<Record<string, unknown>> {
  return lieBiao
    .filter((id) => XiaoXiZhuangTai.has(id))
    .map((id) => ({ ID: id, 已撤回: XiaoXiZhuangTai.get(id) === true }))
}

vi.mock('../../数据库', () => ({ 数据库: 数据库桩 }))

vi.mock('../../redis', () => ({
  redis: {
    set: vi.fn(async () => 'OK'),
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
  debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  jiLuYouXiJieJu: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
}))

vi.mock('../../utils/通用模型调用', () => ({
  按配置调用: vi.fn(async () => ({ neiRong: '{}' })),
}))

vi.mock('../好感度', () => ({
  gengXinHaoGanDu: vi.fn(async () => undefined),
  huoQuWanZhengHaoGanDu: vi.fn(async () => ({ zong_fen: 900 })),
}))

vi.mock('../AI输入准备', () => ({
  保存角色XiaoXi: vi.fn(async () => ({ id: 'm-1' })),
}))

vi.mock('../复盘', () => ({ shengChengFuPan: vi.fn(async () => undefined) }))
vi.mock('../挑战积分', () => ({ jieSuanTiaoZhanDuiJu: vi.fn(async () => undefined) }))

import { 触发消息已全部撤回, chuLiYouXiJieShu } from '../胜利失败条件'

function sheZhiCheHui(ids: string[], yiCheHui: boolean): void {
  for (const id of ids) XiaoXiZhuangTai.set(id, yiCheHui)
}

beforeEach(() => {
  XiaoXiZhuangTai.clear()
  ZhiXingJiLu = []
  vi.clearAllMocks()
  数据库桩.query.mockImplementation(async (wenBen: string, canShu?: unknown[]) => {
    if (wenBen.includes('FROM "消息" WHERE "ID" = ANY')) {
      const lieBiao = (canShu?.[0] as string[]) ?? []
      return { rows: xiaoXiZhuangTaiRows(lieBiao) }
    }
    if (wenBen.includes('FROM "角色" WHERE "ID" = $1')) {
      return { rows: [{ 用户ID: 'u-1', 是否渣型: false }] }
    }
    if (wenBen.includes('FROM "好感度" WHERE')) {
      return { rows: [{ 总分: 900, 关系阶段: '热恋' }] }
    }
    if (wenBen.includes('SELECT COUNT(*)')) {
      return { rows: [{ shu: 3 }] }
    }
    return { rows: [], rowCount: 1 }
  })
  数据库桩.connect.mockImplementation(async () => {
    ZhiXingJiLu = []
    return {
      query: async (wenBen: string, canShu?: unknown[]) => {
        ZhiXingJiLu.push(wenBen)
        if (wenBen.includes('FROM "消息" WHERE "ID" = ANY')) {
          const lieBiao = (canShu?.[0] as string[]) ?? []
          return { rows: xiaoXiZhuangTaiRows(lieBiao), rowCount: lieBiao.length }
        }
        if (wenBen.includes('FROM "角色" WHERE "ID" = $1')) {
          return { rows: [{ 名字: '林知夏', 是否渣型: false }] }
        }
        if (wenBen.includes('FROM "好感度" WHERE')) {
          return { rows: [{ 总分: 900, 关系阶段: '热恋' }] }
        }
        if (wenBen.includes('SELECT COUNT(*)')) {
          return { rows: [{ shu: 3 }] }
        }
        return { rows: [], rowCount: 1 }
      },
      release: vi.fn(),
    }
  })
})

describe('触发消息已全部撤回', () => {
  it('列表为空时按未撤回处理，直接放行', async () => {
    await expect(触发消息已全部撤回(undefined)).resolves.toBe(false)
    await expect(触发消息已全部撤回([])).resolves.toBe(false)
    await expect(触发消息已全部撤回(['', '   '])).resolves.toBe(false)
  })

  it('所有触发消息都已撤回时返回 true', async () => {
    sheZhiCheHui(['m-1', 'm-2'], true)
    await expect(触发消息已全部撤回(['m-1', 'm-2'])).resolves.toBe(true)
  })

  it('只有部分撤回或都未撤回时返回 false', async () => {
    sheZhiCheHui(['m-1'], true)
    sheZhiCheHui(['m-2'], false)
    await expect(触发消息已全部撤回(['m-1', 'm-2'])).resolves.toBe(false)
    await expect(触发消息已全部撤回(['m-2'])).resolves.toBe(false)
  })

  it('消息查不到时不当作已撤回，避免误作废', async () => {
    await expect(触发消息已全部撤回(['bu-cun-zai'])).resolves.toBe(false)
  })
})

describe('结局结算的撤回作废兜底', () => {
  it('事务路径里触发消息在写入后变更为撤回时回滚，不提交', async () => {
    sheZhiCheHui(['m-1'], false)
    const jiChuConnect = 数据库桩.connect.getMockImplementation() as () => Promise<{
      query: (wenBen: string, canShu?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number }>
      release: () => void
    }>
    let shiWuZhongKai = false
    数据库桩.connect.mockImplementation(async () => {
      const keHuDuan = await jiChuConnect()
      const jiChuShiWuQuery = keHuDuan.query
      return {
        ...keHuDuan,
        query: async (wenBen: string, canShu?: unknown[]) => {
          if (wenBen.startsWith('UPDATE "角色" SET "封存"') && !shiWuZhongKai) {
            shiWuZhongKai = true
            XiaoXiZhuangTai.set('m-1', true)
          }
          return jiChuShiWuQuery(wenBen, canShu)
        },
      }
    })
    const jieGuo = await chuLiYouXiJieShu('u-1', 'j-1', 'sheng_li_ai_qing', { lei_xing: '测试' }, ['m-1'])
    expect(jieGuo).toBeNull()
    expect(ZhiXingJiLu).toContain('BEGIN')
    expect(ZhiXingJiLu).toContain('ROLLBACK')
    expect(ZhiXingJiLu).not.toContain('COMMIT')
  })

  it('触发消息未撤回时正常提交结局', async () => {
    sheZhiCheHui(['m-1'], false)
    const jieGuo = await chuLiYouXiJieShu('u-1', 'j-1', 'sheng_li_ai_qing', { lei_xing: '测试' }, ['m-1'])
    expect(jieGuo?.jie_guo_lei_xing).toBe('sheng_li_ai_qing')
    expect(jieGuo?.ke_ji_xu_liao_tian).toBe(true)
    expect(ZhiXingJiLu).toContain('COMMIT')
    expect(ZhiXingJiLu).not.toContain('ROLLBACK')
  })

  it('未提供触发消息ID时保持原行为，正常结算', async () => {
    const jieGuo = await chuLiYouXiJieShu('u-1', 'j-1', 'shi_bai_guo_zao_biao_bai', { lei_xing: '过早表白' })
    expect(jieGuo?.jie_guo_lei_xing).toBe('shi_bai_guo_zao_biao_bai')
    expect(jieGuo?.ke_ji_xu_liao_tian).toBe(false)
    expect(ZhiXingJiLu).toContain('COMMIT')
  })
})
