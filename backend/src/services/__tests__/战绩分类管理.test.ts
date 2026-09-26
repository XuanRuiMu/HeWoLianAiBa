import { beforeEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

/**
 * 战绩分类（FP-11）服务层行为测试。
 *
 * 覆盖 `services/战绩.ts` 的分类状态机：名称归一（trim/非字符串/超长）、乐观版本 CAS、
 * 默认分类保护与兜底迁移、移档的归属/来源校验、分类内排序的「完整无重复集合」判定，
 * 以及统一错误类 `ZhanJiFenLeiCuoWu` 的状态码派生。
 *
 * DB 用「按 SQL 片段排队的脚本桩」而不是内存实现：桩只回答「这一步返回什么」，
 * 被断言的是服务层真实发出的语句与最终返回值（版本自增、兜底迁移发生、集合不等即拒），
 * 不在测试里复刻一份 战绩分类/游戏档案 的读写规则。
 */

const 假 = vi.hoisted(() => ({
  队列: new Map<string, Array<{ rows: unknown[]; rowCount?: number }>>(),
  已发: [] as string[],
  抛错: new Map<string, Error>(),
}))

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string) => 执行(文本),
    connect: async () => ({ query: async (文本: string) => 执行(文本), release: () => undefined }),
  },
}))
vi.mock('../军师缓存', () => ({ huoQuJunShiJiLuLieBiao: vi.fn(async () => []) }))

import {
  ZhanJiFenLeiCuoWu,
  chuangJianZhanJiFenLei,
  gengMingZhanJiFenLei,
  huoQuZhanJiFenLeiLieBiao,
  paiXuFenLeiNeiZhanJi,
  shanChuZhanJiFenLei,
  yiDongDangAnDaoFenLei,
} from '../战绩'
import { ZHAN_JI_PEI_ZHI } from '../../config/战绩配置'
import { CUO_WU_DAI_MA } from '../../config/错误码注册表'

function 归一(文本: string): string {
  return 文本.replace(/\s+/g, ' ').trim()
}

async function 执行(文本: string): Promise<{ rows: unknown[]; rowCount: number }> {
  const 键 = 归一(文本)
  假.已发.push(键)
  const 错 = 假.抛错.get(键)
  if (错) {
    假.抛错.delete(键)
    throw 错
  }
  for (const [片段, 回应列] of 假.队列) {
    if (!键.includes(片段)) continue
    const 回应 = 回应列.shift()
    if (回应) return { rows: 回应.rows, rowCount: 回应.rowCount ?? 回应.rows.length }
  }
  return { rows: [], rowCount: 0 }
}

/** 排一次回应；同一片段多次调用按调用顺序出队 */
function 备(片段: string, ...回应: Array<{ rows: unknown[]; rowCount?: number }>): void {
  假.队列.set(片段, [...(假.队列.get(片段) ?? []), ...回应])
}

const 默认分类 = { rows: [{ ID: '默认分类ID' }] }
const 选中 = (ID: string, 额外: Record<string, unknown> = {}) => ({ rows: [{ ID, ...额外 }] })

/** 每个分类函数起手都会「确保默认分类存在」，这两个回应是公共前置 */
function 备默认分类前置(): void {
  备('"是否默认" = TRUE LIMIT 1', 默认分类)
}

const 用户 = randomUUID()
const 甲 = randomUUID()
const 乙 = randomUUID()

beforeEach(() => {
  假.队列.clear()
  假.已发.length = 0
  假.抛错.clear()
})

describe('战绩分类：列表与默认分类兜底', () => {
  it('列表先把默认分类补出来再读全量，空名称回落权威默认分类名', async () => {
    备默认分类前置()
    备('FROM "战绩分类" c', {
      rows: [
        { ID: '默认分类ID', 名称: '', 是否默认: true, 记录数: 2, 版本: 0 },
        { ID: '甲', 名称: '胜利', 是否默认: false, 记录数: 1, 版本: 3 },
      ],
    })
    const 结果 = await huoQuZhanJiFenLeiLieBiao(用户)
    expect(结果.moRenFenLeiId).toBe('默认分类ID')
    expect(结果.fenLeiLieBiao).toEqual([
      { id: '默认分类ID', name: '默认分类', is_default: true, record_count: 2, version: 0 },
      { id: '甲', name: '胜利', is_default: false, record_count: 1, version: 3 },
    ])
    expect(假.已发.some((句) => 句.includes('INSERT INTO "战绩分类" ("用户ID", "名称", "是否默认")'))).toBe(true)
  })
})

describe('战绩分类：新建的名称归一与重名', () => {
  it('非字符串、空串与纯空白都归到「名称无效」400', async () => {
    for (const 非法 of [123, null, undefined, '', '   ']) {
      await expect(chuangJianZhanJiFenLei(用户, 非法)).rejects.toMatchObject({
        daiMa: CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_MING_CHENG_WU_XIAO,
      })
    }
  })

  it('超长名称归到「名称过长」400，边界长度放行', async () => {
    const 上限 = ZHAN_JI_PEI_ZHI.fenLeiMingChengZuiDaChangDu
    await expect(chuangJianZhanJiFenLei(用户, '字'.repeat(上限 + 1))).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_MING_CHENG_CHANG,
    })
    备默认分类前置()
    备('lower(btrim("名称"))', { rows: [] })
    备('INSERT INTO "战绩分类" ("用户ID", "名称") VALUES', 选中('新分类', { 名称: '刚好上限', 是否默认: false, 版本: 0, 记录数: 0 }))
    await expect(chuangJianZhanJiFenLei(用户, `  ${'字'.repeat(上限)}  `)).resolves.toMatchObject({
      id: '新分类',
      name: '刚好上限',
    })
  })

  it('重名：预检查命中与数据库 23505 两条路径都收敛成同一个 409', async () => {
    备默认分类前置()
    备('lower(btrim("名称"))', { rows: [{ '?column?': 1 }] })
    await expect(chuangJianZhanJiFenLei(用户, '胜利')).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU,
    })

    备默认分类前置()
    备('lower(btrim("名称"))', { rows: [] })
    假.抛错.set(
      归一('INSERT INTO "战绩分类" ("用户ID", "名称") VALUES ($1, $2) RETURNING "ID", "名称", "是否默认", "版本", 0::int AS "记录数"'),
      Object.assign(new Error('duplicate'), { code: '23505' }),
    )
    await expect(chuangJianZhanJiFenLei(用户, '胜利')).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU,
    })
  })
})

describe('战绩分类：改名的版本 CAS 与归属', () => {
  it('版本参数非安全整数或为负一律按参数不合法拒（不进事务）', async () => {
    for (const 非法 of ['0', -1, 1.5, null]) {
      await expect(gengMingZhanJiFenLei(用户, 甲, '胜利', 非法)).rejects.toThrow(
        CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BAN_BEN_BU_HE_FA,
      )
    }
  })

  it('分类不存在 404、他人分类查不到同样 404、版本不符 409', async () => {
    备('"是否默认", "版本" FROM "战绩分类"', { rows: [] })
    await expect(gengMingZhanJiFenLei(用户, 甲, '胜利', 0)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BU_CUN_ZAI,
    })

    备('"是否默认", "版本" FROM "战绩分类"', 选中(甲, { 是否默认: false, 版本: 5 }))
    await expect(gengMingZhanJiFenLei(用户, 甲, '胜利', 0)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BIAN_GENG,
    })
  })

  it('撞名 409；正常改名返回新版本并落一次名称更新', async () => {
    备('"是否默认", "版本" FROM "战绩分类"', 选中(甲, { 是否默认: false, 版本: 2 }))
    备('lower(btrim("名称"))', { rows: [{ '?column?': 1 }] })
    await expect(gengMingZhanJiFenLei(用户, 甲, '乙类', 2)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU,
    })

    备('"是否默认", "版本" FROM "战绩分类"', 选中(甲, { 是否默认: false, 版本: 2 }))
    备('lower(btrim("名称"))', { rows: [] })
    备('SET "名称" = $3', 选中(甲, { 名称: '新名', 是否默认: false, 版本: 3, 记录数: 4 }))
    await expect(gengMingZhanJiFenLei(用户, 甲, '  新名  ', 2)).resolves.toEqual({
      id: 甲,
      name: '新名',
      is_default: false,
      record_count: 4,
      version: 3,
    })
  })
})

describe('战绩分类：删除的默认分类保护与兜底迁移', () => {
  it('版本参数非法、分类不存在、默认分类、版本不符各走各的稳定码', async () => {
    await expect(shanChuZhanJiFenLei(用户, 甲, -1)).rejects.toThrow(
      CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BAN_BEN_BU_HE_FA,
    )
    备('"是否默认", "版本" FROM "战绩分类"', { rows: [] })
    await expect(shanChuZhanJiFenLei(用户, 甲, 0)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BU_CUN_ZAI,
    })
    备('"是否默认", "版本" FROM "战绩分类"', 选中(甲, { 是否默认: true, 版本: 0 }))
    await expect(shanChuZhanJiFenLei(用户, 甲, 0)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_MO_REN_FEN_LEI_BU_NENG_SHAN_CHU,
    })
    备('"是否默认", "版本" FROM "战绩分类"', 选中(甲, { 是否默认: false, 版本: 9 }))
    await expect(shanChuZhanJiFenLei(用户, 甲, 0)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BIAN_GENG,
    })
  })

  it('删自定义分类：记录整体回落默认分类、默认分类版本自增，并报回落条数', async () => {
    备('"是否默认", "版本" FROM "战绩分类"', 选中(甲, { 是否默认: false, 版本: 1 }))
    备默认分类前置()
    备('WITH yuanDianXu AS', { rows: [], rowCount: 2 })
    备('DELETE FROM "战绩分类"', 选中(甲))
    await expect(shanChuZhanJiFenLei(用户, 甲, 1)).resolves.toEqual({
      deleted_id: 甲,
      fallback_category_id: '默认分类ID',
      moved_record_count: 2,
    })
    expect(假.已发.some((句) => 句.includes('UPDATE "战绩分类" SET "版本" = "版本" + 1 WHERE "ID" = $1'))).toBe(true)
  })

  it('删除语句没命中行时按 404 收口，绝不报成功', async () => {
    备('"是否默认", "版本" FROM "战绩分类"', 选中(甲, { 是否默认: false, 版本: 1 }))
    备默认分类前置()
    备('WITH yuanDianXu AS', { rows: [], rowCount: 0 })
    备('DELETE FROM "战绩分类"', { rows: [] })
    await expect(shanChuZhanJiFenLei(用户, 甲, 1)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BU_CUN_ZAI,
    })
  })
})

describe('战绩分类：移档的归属与来源校验', () => {
  it('同分类 400、版本参数非法、两侧分类不齐 404', async () => {
    await expect(yiDongDangAnDaoFenLei(用户, 甲, randomUUID(), 甲, 0)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_BU_NENG_YIDONG_DAO_DANG_QIAN_FEN_LEI,
    })
    await expect(yiDongDangAnDaoFenLei(用户, 甲, randomUUID(), 乙, 'x')).rejects.toThrow(
      CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BAN_BEN_BU_HE_FA,
    )
    备('"ID", "版本" FROM "战绩分类"', { rows: [{ ID: 甲, 版本: 0 }] })
    await expect(yiDongDangAnDaoFenLei(用户, 甲, randomUUID(), 乙, 0)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BU_CUN_ZAI,
    })
  })

  it('来源版本不符 409、档案不存在 404、档案不在来源分类 409', async () => {
    备('"ID", "版本" FROM "战绩分类"', { rows: [{ ID: 甲, 版本: 3 }, { ID: 乙, 版本: 0 }] })
    await expect(yiDongDangAnDaoFenLei(用户, 甲, randomUUID(), 乙, 0)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BIAN_GENG,
    })
    备('"ID", "版本" FROM "战绩分类"', { rows: [{ ID: 甲, 版本: 0 }, { ID: 乙, 版本: 0 }] })
    备('"分类ID" FROM "游戏档案"', { rows: [] })
    await expect(yiDongDangAnDaoFenLei(用户, 甲, randomUUID(), 乙, 0)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_DANG_AN_BU_CUN_ZAI,
    })
    备('"ID", "版本" FROM "战绩分类"', { rows: [{ ID: 甲, 版本: 0 }, { ID: 乙, 版本: 0 }] })
    备('"分类ID" FROM "游戏档案"', { rows: [{ 分类ID: 乙 }] })
    await expect(yiDongDangAnDaoFenLei(用户, 甲, randomUUID(), 乙, 0)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_DANG_AN_BU_SHU_YU_FEN_LEI,
    })
  })

  it('成功移档：追加到目标分类末尾、来源重排、两端版本各 +1', async () => {
    const 档案 = randomUUID()
    备('"ID", "版本" FROM "战绩分类"', { rows: [{ ID: 甲, 版本: 2 }, { ID: 乙, 版本: 5 }] })
    备('"分类ID" FROM "游戏档案"', { rows: [{ 分类ID: 甲 }] })
    备('AS "下一序" FROM "游戏档案"', { rows: [{ 下一序: 7 }] })
    await expect(yiDongDangAnDaoFenLei(用户, 甲, 档案, 乙, 2)).resolves.toEqual({
      record_id: 档案,
      source_category_id: 甲,
      category_id: 乙,
      sort_order: 7,
      source_version: 3,
      target_version: 6,
    })
    expect(假.已发.some((句) => 句.includes('SET CONSTRAINTS "游戏档案_分类内排序唯一" DEFERRED'))).toBe(true)
    expect(假.已发.some((句) => 句.includes('ANY($2::uuid[])'))).toBe(true)
  })
})

describe('战绩分类：分类内排序只接受完整无重复集合', () => {
  it('非数组、含非字符串、版本非法一律按参数不合法拒', async () => {
    for (const 非法 of [undefined, 'abc', [甲, 1]]) {
      await expect(paiXuFenLeiNeiZhanJi(用户, 甲, 非法, 0)).rejects.toThrow(
        CUO_WU_DAI_MA.ZHAN_JI_PAI_XU_CAN_SHU_BU_HE_FA,
      )
    }
    await expect(paiXuFenLeiNeiZhanJi(用户, 甲, [甲], -1)).rejects.toThrow(
      CUO_WU_DAI_MA.ZHAN_JI_PAI_XU_CAN_SHU_BU_HE_FA,
    )
  })

  it('集合内重复 400；分类不存在 404；版本不符 409', async () => {
    await expect(paiXuFenLeiNeiZhanJi(用户, 甲, [甲, 甲], 0)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_PAI_XU_ID_CHONG_FU,
    })
    备('"版本" FROM "战绩分类"', { rows: [] })
    await expect(paiXuFenLeiNeiZhanJi(用户, 甲, [甲], 0)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BU_CUN_ZAI,
    })
    备('"版本" FROM "战绩分类"', { rows: [{ 版本: 4 }] })
    await expect(paiXuFenLeiNeiZhanJi(用户, 甲, [甲], 0)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BIAN_GENG,
    })
  })

  it('漏记录或多出记录都 409；顺序已一致时零写入且版本不变', async () => {
    备('"版本" FROM "战绩分类"', { rows: [{ 版本: 1 }] })
    备('SELECT "ID" FROM "游戏档案"', { rows: [{ ID: 甲 }, { ID: 乙 }] })
    await expect(paiXuFenLeiNeiZhanJi(用户, 甲, [甲], 1)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_PAI_XU_JI_LU_BU_WU_ZHEN,
    })
    备('"版本" FROM "战绩分类"', { rows: [{ 版本: 1 }] })
    备('SELECT "ID" FROM "游戏档案"', { rows: [{ ID: 甲 }, { ID: 乙 }] })
    await expect(paiXuFenLeiNeiZhanJi(用户, 甲, [甲, 乙, randomUUID()], 1)).rejects.toMatchObject({
      daiMa: CUO_WU_DAI_MA.ZHAN_JI_PAI_XU_JI_LU_BU_WU_ZHEN,
    })

    假.已发.length = 0
    备('"版本" FROM "战绩分类"', { rows: [{ 版本: 1 }] })
    备('SELECT "ID" FROM "游戏档案"', { rows: [{ ID: 甲 }, { ID: 乙 }] })
    await expect(paiXuFenLeiNeiZhanJi(用户, 甲, [甲, 乙], 1)).resolves.toEqual({
      category_id: 甲,
      record_ids: [甲, 乙],
      version: 1,
    })
    expect(假.已发.some((句) => 句.includes('WITH keJian AS'))).toBe(false)
  })

  it('顺序确有变化时落一次重排并把版本 +1', async () => {
    备('"版本" FROM "战绩分类"', { rows: [{ 版本: 1 }] })
    备('SELECT "ID" FROM "游戏档案"', { rows: [{ ID: 甲 }, { ID: 乙 }] })
    await expect(paiXuFenLeiNeiZhanJi(用户, 甲, [乙, 甲], 1)).resolves.toEqual({
      category_id: 甲,
      record_ids: [乙, 甲],
      version: 2,
    })
    expect(假.已发.some((句) => 句.includes('WITH keJian AS'))).toBe(true)
  })
})

describe('战绩分类错误类的状态码派生', () => {
  it('状态码只由错误码注册表决定，不接受调用方乱填', () => {
    expect(new ZhanJiFenLeiCuoWu(CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BU_CUN_ZAI, 400).zhuangTaiMa).toBe(404)
    expect(new ZhanJiFenLeiCuoWu(CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BIAN_GENG, 200).zhuangTaiMa).toBe(409)
    expect(new ZhanJiFenLeiCuoWu(CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_MING_CHENG_WU_XIAO).zhuangTaiMa).toBe(400)
  })
})
