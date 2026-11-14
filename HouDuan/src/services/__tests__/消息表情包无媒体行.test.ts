import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const chaXunMock = vi.hoisted(() => vi.fn())

const lianJieMock = vi.hoisted(() => vi.fn())

const shiFangMock = vi.hoisted(() => vi.fn())

const chaAnDuanMingMock = vi.hoisted(() => vi.fn())

vi.mock('../../数据库', () => ({
  数据库: {
    query: (...canShu: unknown[]) => chaXunMock(...canShu),
    connect: () => lianJieMock(),
  },
}))

vi.mock('../../redis', () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    setex: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
  },
}))

vi.mock('../表情包库', async () => {
  const shiJi = await vi.importActual<typeof import('../表情包库')>('../表情包库')
  return { ...shiJi, chaAnDuanMing: (...canShu: unknown[]) => chaAnDuanMingMock(...canShu) }
})

import { duanMingDaoUUID } from '../表情包库'
import { gouKuaiShangXiaWen, huoQuXiaoXiLieBiao, baoCunJiaoSeMeiTiXiaoXi, yingSheKuaiChuCan } from '../消息'
import { yanZhengQianMing } from '../媒体存储'

const YongHu = '6ef2a94a-67be-4e9b-9c93-f0a2c9df6f21'
const JiaoSe = '9b0b1a2c-1d3e-4f50-8a9b-0c1d2e3f4a5b'
const SHA = 'a'.repeat(64)
const DuanMing = '笑哭'
const UuidGeShi = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function tieZhiHang(zhi: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    ID: 'xiao-xi-tie-zhi-1',
    用户ID: YongHu,
    角色ID: JiaoSe,
    发送者: 'jiaose',
    内容: `[贴纸:${DuanMing}]`,
    类型: 'biaoQingBao',
    已读: true,
    已撤回: false,
    撤回时间: null,
    原始内容: null,
    媒体ID: null,
    媒体SHA256: null,
    媒体类别: null,
    客户端序号: 7,
    创建时间: '2026-11-12T00:00:00.000Z',
    被引用消息ID: null,
    内容块: [{ lei_xing: 'tupian', mei_ti_lei_bie: 'biaoqingshu', duan_ming: DuanMing }],
    ...zhi,
  }
}

function jieXiQianMingCanShu(url: string): Record<string, string> {
  const canShu = new URL(url, 'http://localhost').searchParams
  return {
    e: canShu.get('e') ?? '',
    u: canShu.get('u') ?? '',
    t: canShu.get('t') ?? '',
    s: canShu.get('s') ?? '',
  }
}

beforeEach(() => {
  chaXunMock.mockReset()
  lianJieMock.mockReset()
  shiFangMock.mockReset()
  chaAnDuanMingMock.mockReset()
  chaAnDuanMingMock.mockImplementation(async () => null)
  chaXunMock.mockImplementation(async () => ({ rows: [], rowCount: 0 }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('短名生成确定性 UUID', () => {
  it('同一短名稳定且是合法 UUID', () => {
    const diYiCi = duanMingDaoUUID(DuanMing)
    expect(diYiCi).toBe(duanMingDaoUUID(DuanMing))
    expect(diYiCi).toBe(duanMingDaoUUID(`  ${DuanMing}  `))
    expect(diYiCi).toMatch(UuidGeShi)
    expect(diYiCi.slice(14, 15)).toBe('4')
  })

  it('不同短名互不相同', () => {
    expect(duanMingDaoUUID(DuanMing)).not.toBe(duanMingDaoUUID('狗头'))
    expect(duanMingDaoUUID('')).toMatch(UuidGeShi)
  })

  it('非字符串输入也不抛错', () => {
    expect(duanMingDaoUUID(undefined as unknown as string)).toMatch(UuidGeShi)
  })
})

describe('保存表情包消息不依赖媒体行', () => {
  it('写入客户端序号与内容块，媒体ID写空', async () => {
    const chaXunKeHuDuan = vi.fn(async (yuJu: string) => {
      const wenBen = String(yuJu)
      if (wenBen.includes('MAX("客户端序号")')) {
        return { rows: [{ zui_da: 7 }], rowCount: 1 }
      }
      if (wenBen.includes('INSERT INTO "消息"')) {
        return { rows: [tieZhiHang({ 客户端序号: 8 })], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })
    lianJieMock.mockResolvedValue({ query: chaXunKeHuDuan, release: shiFangMock })

    const xiaoXi = await baoCunJiaoSeMeiTiXiaoXi({
      yong_hu_id: YongHu,
      jiao_se_id: JiaoSe,
      nei_rong: `[贴纸:${DuanMing}]`,
      lei_xing: 'biaoQingBao',
      mei_ti_id: null,
      duan_ming: `  ${DuanMing}  `,
    })

    expect(chaXunKeHuDuan.mock.calls.map(([yuJu]) => String(yuJu))).toContain(
      'SELECT pg_advisory_xact_lock($1)',
    )
    const chaRu = chaXunKeHuDuan.mock.calls.find(([yuJu]) => String(yuJu).includes('INSERT INTO "消息"'))
    expect(chaRu).toBeDefined()
    const yuJu = String(chaRu?.[0])
    expect(yuJu).toContain('"客户端序号"')
    expect(yuJu).toContain('"内容块"')
    const canShu = ((chaRu as unknown as unknown[] | undefined)?.[1] ?? []) as unknown[]
    expect(canShu[4]).toBe(8)
    expect(canShu[5]).toBeNull()
    expect(JSON.parse(String(canShu[6]))).toEqual([
      { lei_xing: 'tupian', mei_ti_lei_bie: 'biaoqingshu', duan_ming: DuanMing },
    ])
    expect(shiFangMock).toHaveBeenCalled()
    expect(xiaoXi.lei_xing).toBe('biaoQingBao')
    expect(xiaoXi.mei_ti_id).toBeNull()
    expect(xiaoXi.nei_rong_kuai?.[0]).toMatchObject({
      lei_xing: 'tupian',
      duan_ming: DuanMing,
      mei_ti_id: duanMingDaoUUID(DuanMing),
      mei_ti_lei_bie: 'biaoqingshu',
      mei_ti_url: null,
    })
  })

  it('既有媒体ID又给短名时内容块按短名走，不再带媒体ID', async () => {
    const MeiTiId = '11111111-2222-4333-8444-555555555555'
    const chaXunKeHuDuan = vi.fn(async (yuJu: string) => {
      const wenBen = String(yuJu)
      if (wenBen.includes('MAX("客户端序号")')) return { rows: [{ zui_da: 0 }], rowCount: 1 }
      if (wenBen.includes('INSERT INTO "消息"')) {
        return { rows: [tieZhiHang({ 客户端序号: 1, 媒体ID: MeiTiId })], rowCount: 1 }
      }
      return { rows: [], rowCount: 0 }
    })
    lianJieMock.mockResolvedValue({ query: chaXunKeHuDuan, release: shiFangMock })

    await baoCunJiaoSeMeiTiXiaoXi({
      yong_hu_id: YongHu,
      jiao_se_id: JiaoSe,
      nei_rong: `[贴纸:${DuanMing}]`,
      lei_xing: 'biaoQingBao',
      mei_ti_id: MeiTiId,
      duan_ming: DuanMing,
    })

    const chaRu = chaXunKeHuDuan.mock.calls.find(([yuJu]) => String(yuJu).includes('INSERT INTO "消息"'))
    const canShu = ((chaRu as unknown as unknown[] | undefined)?.[1] ?? []) as unknown[]
    expect(JSON.parse(String(canShu[6]))).toEqual([
      { lei_xing: 'tupian', mei_ti_lei_bie: 'biaoqingshu', duan_ming: DuanMing },
    ])
  })

  it('普通媒体消息仍在内容块里写媒体ID与类别', async () => {
    const MeiTiId = '11111111-2222-4333-8444-555555555555'
    const chaXunKeHuDuan = vi.fn(async (yuJu: string) => {
      const wenBen = String(yuJu)
      if (wenBen.includes('MAX("客户端序号")')) return { rows: [{ zui_da: 2 }], rowCount: 1 }
      if (wenBen.includes('INSERT INTO "消息"')) {
        return {
          rows: [tieZhiHang({ 类型: 'tuPian', 内容: '', 媒体ID: MeiTiId, 媒体SHA256: SHA, 媒体类别: 'tupian', 内容块: null })],
          rowCount: 1,
        }
      }
      return { rows: [], rowCount: 0 }
    })
    lianJieMock.mockResolvedValue({ query: chaXunKeHuDuan, release: shiFangMock })

    await baoCunJiaoSeMeiTiXiaoXi({
      yong_hu_id: YongHu,
      jiao_se_id: JiaoSe,
      nei_rong: '给你看个东西',
      lei_xing: 'tuPian',
      mei_ti_id: MeiTiId,
    })

    const chaRu = chaXunKeHuDuan.mock.calls.find(([yuJu]) => String(yuJu).includes('INSERT INTO "消息"'))
    const canShu = ((chaRu as unknown as unknown[] | undefined)?.[1] ?? []) as unknown[]
    expect(canShu[5]).toBe(MeiTiId)
    expect(JSON.parse(String(canShu[6]))).toEqual([
      { lei_xing: 'tupian', mei_ti_id: MeiTiId, mei_ti_lei_bie: 'tupian' },
    ])
  })

  it('既没有媒体ID也没有短名时拒绝落库', async () => {
    lianJieMock.mockResolvedValue({ query: vi.fn(), release: shiFangMock })
    await expect(
      baoCunJiaoSeMeiTiXiaoXi({
        yong_hu_id: YongHu,
        jiao_se_id: JiaoSe,
        nei_rong: `[贴纸:${DuanMing}]`,
        lei_xing: 'biaoQingBao',
        mei_ti_id: null,
      }),
    ).rejects.toThrow()
  })
})

describe('读取无媒体行表情包消息', () => {
  it('带短名的块补出签名URL与确定性媒体ID', async () => {
    chaAnDuanMingMock.mockImplementation(async (duanMing: unknown) =>
      duanMing === DuanMing
        ? {
            duanMing: DuanMing,
            miaoShu: '',
            qingXuBiaoQian: '好笑',
            shiYongChangJing: '',
            qiYong: true,
            sha256: SHA,
            mime: 'image/png',
            ziJieShu: 1024,
            wenJianMing: 'haha.png',
            wenJianLuJing: 'haha.png',
          }
        : null,
    )
    const hang = tieZhiHang()
    const shangXiaWen = await gouKuaiShangXiaWen([hang])
    const chuCan = yingSheKuaiChuCan(hang, shangXiaWen, '')
    expect(chuCan).toHaveLength(1)
    expect(chuCan[0]).toMatchObject({
      lei_xing: 'tupian',
      duan_ming: DuanMing,
      mei_ti_id: duanMingDaoUUID(DuanMing),
      mei_ti_lei_bie: 'biaoqingshu',
    })
    const url = String(chuCan[0].mei_ti_url)
    expect(url).toContain(`/api/媒体/${SHA}`)
    const canShu = jieXiQianMingCanShu(url)
    expect(canShu.u).toBe(YongHu)
    chaXunMock.mockResolvedValueOnce({ rows: [{ yi: 1 }], rowCount: 1 })
    await expect(yanZhengQianMing(SHA, canShu.e, canShu.u, canShu.s, canShu.t)).resolves.toBe(true)
  })

  it('短名在表情包库查不到时url为空且不抛错', async () => {
    const hang = tieZhiHang()
    const shangXiaWen = await gouKuaiShangXiaWen([hang])
    const chuCan = yingSheKuaiChuCan(hang, shangXiaWen, '')
    expect(chuCan[0]).toMatchObject({
      lei_xing: 'tupian',
      duan_ming: DuanMing,
      mei_ti_id: duanMingDaoUUID(DuanMing),
      mei_ti_url: null,
      mei_ti_lei_bie: 'biaoqingshu',
    })
  })

  it('没有表情包上下文的旧路径仍按文本块出参，不抛错', () => {
    const hang = tieZhiHang()
    const chuCan = yingSheKuaiChuCan(
      hang,
      { kuaiOf: () => null, meiTiOf: () => null },
      '',
    )
    expect(chuCan[0]).toMatchObject({ lei_xing: 'tupian', duan_ming: DuanMing, mei_ti_url: null })
  })

  it('消息列表按内容里的贴纸短名补顶层签名URL与类别', async () => {
    chaAnDuanMingMock.mockImplementation(async (duanMing: unknown) =>
      duanMing === DuanMing ? { sha256: SHA } : null,
    )
    chaXunMock.mockImplementation(async (yuJu: string) => {
      const wenBen = String(yuJu)
      if (wenBen.includes('COUNT(*)')) return { rows: [{ zong_shu: 1 }], rowCount: 1 }
      return { rows: [tieZhiHang()], rowCount: 1 }
    })

    const jieGuo = await huoQuXiaoXiLieBiao({
      yong_hu_id: YongHu,
      jiao_se_id: JiaoSe,
      ye_ma: 1,
      mei_ye_tiao_shu: 20,
    })
    expect(jieGuo.lie_biao).toHaveLength(1)
    const xiaoXi = jieGuo.lie_biao[0]
    expect(xiaoXi.mei_ti_lei_bie).toBe('biaoqingshu')
    expect(String(xiaoXi.mei_ti_url)).toContain(`/api/媒体/${SHA}`)
    expect(xiaoXi.nei_rong_kuai?.[0]).toMatchObject({
      duan_ming: DuanMing,
      mei_ti_id: duanMingDaoUUID(DuanMing),
    })
  })

  it('消息列表里贴纸短名未命中时顶层url为空', async () => {
    chaXunMock.mockImplementation(async (yuJu: string) => {
      const wenBen = String(yuJu)
      if (wenBen.includes('COUNT(*)')) return { rows: [{ zong_shu: 1 }], rowCount: 1 }
      return { rows: [tieZhiHang()], rowCount: 1 }
    })

    const jieGuo = await huoQuXiaoXiLieBiao({
      yong_hu_id: YongHu,
      jiao_se_id: JiaoSe,
      ye_ma: 1,
      mei_ye_tiao_shu: 20,
    })
    expect(jieGuo.lie_biao[0].mei_ti_url).toBeNull()
    expect(jieGuo.lie_biao[0].mei_ti_lei_bie).toBe('biaoqingshu')
  })
})
