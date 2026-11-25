import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Pool, type PoolClient, type QueryResult } from 'pg'

const 原始连接串 = (process.env.TEST_DATABASE_URL ?? '').trim()
const 有真库 = 原始连接串 !== ''
const 架构名 = `fp07_${randomUUID().replaceAll('-', '')}`
const 迁移目录 = resolve(__dirname, '..', '..', 'QianYi', 'migrations')
const 管理池 = 有真库 ? new Pool({ connectionString: 原始连接串, connectionTimeoutMillis: 3000 }) : null

let 池: Pool
let 服务: typeof import('../../src/services/战绩')
let 用户ID = ''
let 存量用户ID = ''
let 存量可见甲 = ''
let 存量可见乙 = ''
let 存量隐藏 = ''

async function 执行(语句: string, 参数: unknown[] = []): Promise<QueryResult> {
  return 池.query(语句, 参数)
}

async function 准备用户(): Promise<void> {
  用户ID = randomUUID()
  await 执行('INSERT INTO "用户" ("ID") VALUES ($1)', [用户ID])
  await 执行('INSERT INTO "战绩分类" ("用户ID", "名称", "是否默认") VALUES ($1, \'\', TRUE)', [用户ID])
}

async function 插入档案(
  可见 = true,
  分类ID?: string,
  指定排序?: number,
  指定用户ID = 用户ID,
): Promise<string> {
  const 角色ID = randomUUID()
  await 执行('INSERT INTO "角色" ("ID", "用户ID", "微信昵称") VALUES ($1, $2, $3)', [角色ID, 指定用户ID, 角色ID])
  const 结果 = await 执行(
    `INSERT INTO "游戏档案" ("用户ID", "角色ID", "角色名字", "模式", "结果类型", "分类ID", "排序")
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING "ID"`,
    [指定用户ID, 角色ID, 角色ID, 可见 ? 'putong' : 'tiaozhan', 可见 ? 'sheng_li_ai_qing' : '', 分类ID ?? null, 指定排序 ?? null],
  )
  return String(结果.rows[0].ID)
}

async function 读取全部(client?: PoolClient): Promise<Array<Record<string, unknown>>> {
  const 结果 = await (client ?? 池).query(
    `SELECT "ID", "分类ID", "排序", "模式", "结果类型"
       FROM "游戏档案" WHERE "用户ID" = $1 ORDER BY "排序", "ID"`,
    [用户ID],
  )
  return 结果.rows
}

async function 可见ID及序号(): Promise<Array<[string, number]>> {
  const 结果 = await 服务.huoQuDangAnLieBiao(用户ID)
  return 结果.map((项) => [项.id, 项.sort_order])
}

async function 创建分类(名称: string): Promise<string> {
  const 结果 = await 执行(
    `INSERT INTO "战绩分类" ("用户ID", "名称", "排序")
     VALUES ($1, $2, (SELECT COALESCE(MAX("排序"), -1) + 1 FROM "战绩分类" WHERE "用户ID" = $1))
     RETURNING "ID"`,
    [用户ID, 名称],
  )
  return String(结果.rows[0].ID)
}

beforeAll(async () => {
  if (!管理池) return
  await 管理池.query(`CREATE SCHEMA "${架构名}"`)
  const 地址 = new URL(原始连接串)
  地址.searchParams.set('options', `--search_path=${架构名}`)
  process.env.TEST_DATABASE_URL = 地址.toString()
  池 = new Pool({ connectionString: process.env.TEST_DATABASE_URL, connectionTimeoutMillis: 3000, max: 20 })
  await 执行(`CREATE TABLE "用户" ("ID" UUID PRIMARY KEY)`)
  await 执行(`CREATE TABLE "角色" (
    "ID" UUID PRIMARY KEY,
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "微信昵称" VARCHAR(100),
    "MBTI" VARCHAR(10),
    "性别" VARCHAR(20),
    "结局文案" TEXT,
    "随机性格" BOOLEAN DEFAULT FALSE
  )`)
  await 执行(`CREATE TABLE "游戏档案" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL REFERENCES "用户"("ID") ON DELETE CASCADE,
    "角色ID" UUID NOT NULL REFERENCES "角色"("ID") ON DELETE CASCADE,
    "角色名字" VARCHAR(100),
    "是否渣型" BOOLEAN DEFAULT FALSE,
    "结果类型" VARCHAR(50) DEFAULT '',
    "是否封存" BOOLEAN DEFAULT FALSE,
    "好感度总分" INTEGER DEFAULT 0,
    "关系阶段" VARCHAR(20) DEFAULT 'lengDan',
    "聊天天数" INTEGER DEFAULT 0,
    "消息总数" INTEGER DEFAULT 0,
    "复盘数据" JSONB DEFAULT '[]'::jsonb,
    "复盘内容" TEXT,
    "创建时间" TIMESTAMPTZ DEFAULT NOW(),
    "最后消息时间" TIMESTAMPTZ,
    "模式" VARCHAR(10) NOT NULL DEFAULT 'putong',
    UNIQUE ("用户ID", "角色ID")
  )`)
  await 执行(`CREATE TABLE "消息" (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "用户ID" UUID NOT NULL,
    "角色ID" UUID NOT NULL,
    "发送者" VARCHAR(20) NOT NULL,
    "内容" TEXT,
    "类型" VARCHAR(20),
    "已撤回" BOOLEAN DEFAULT FALSE,
    "创建时间" TIMESTAMPTZ DEFAULT NOW()
  )`)
  for (const 文件名 of ['039_FP11战绩分类排序.sql', '042_FP11战绩分类默认分组与排序.sql']) {
    await 执行(readFileSync(resolve(迁移目录, 文件名), 'utf8'))
  }
  存量用户ID = randomUUID()
  await 执行('INSERT INTO "用户" ("ID") VALUES ($1)', [存量用户ID])
  const 存量分类结果 = await 执行(
    'INSERT INTO "战绩分类" ("用户ID", "名称", "是否默认") VALUES ($1, \'\', TRUE) RETURNING "ID"',
    [存量用户ID],
  )
  const 存量分类 = String(存量分类结果.rows[0].ID)
  存量可见甲 = await 插入档案(true, 存量分类, 5, 存量用户ID)
  存量隐藏 = await 插入档案(false, 存量分类, 1, 存量用户ID)
  存量可见乙 = await 插入档案(true, 存量分类, 9, 存量用户ID)
  await 执行(readFileSync(resolve(迁移目录, '046_战绩可见新增置顶.sql'), 'utf8'))
  const { peiZhi } = await import('../../src/config')
  peiZhi.shuJuKuLianJie = process.env.TEST_DATABASE_URL
  服务 = await import('../../src/services/战绩')
})

beforeEach(async () => {
  if (!有真库) return
  if (用户ID) await 执行('DELETE FROM "用户" WHERE "ID" = $1', [用户ID])
  await 准备用户()
})

afterAll(async () => {
  if (!有真库) return
  const { 数据库 } = await import('../../src/数据库')
  await 数据库.end().catch(() => undefined)
  await 池.end().catch(() => undefined)
  await 管理池?.query(`DROP SCHEMA "${架构名}" CASCADE`)
  await 管理池?.end().catch(() => undefined)
})

describe.skipIf(!有真库)('FP-07 战绩可见排序真库回归', () => {
  it('存量迁移保持可见记录相对顺序并连续化，隐藏记录移到可见序列之后', async () => {
    const 可见 = await 服务.huoQuDangAnLieBiao(存量用户ID)
    expect(可见.map((项) => [项.id, 项.sort_order])).toEqual([[存量可见甲, 0], [存量可见乙, 1]])
    const 全部 = await 执行(
      'SELECT "ID", "排序" FROM "游戏档案" WHERE "用户ID" = $1 ORDER BY "排序", "ID"',
      [存量用户ID],
    )
    expect(全部.rows.map((行) => [String(行.ID), Number(行.排序)])).toEqual([
      [存量可见甲, 0],
      [存量可见乙, 1],
      [存量隐藏, 2],
    ])
  })

  it('真实可见新增置顶且隐藏不占可见序号，服务重新查询结果持久一致', async () => {
    const 甲 = await 插入档案()
    const 乙 = await 插入档案()
    const 隐藏 = await 插入档案(false)
    const 丙 = await 插入档案()

    expect(await 可见ID及序号()).toEqual([[丙, 0], [乙, 1], [甲, 2]])
    const 全部 = await 读取全部()
    expect(全部.map((行) => Number(行.排序))).toEqual([0, 1, 2, 3])
    expect(String(全部[3].ID)).toBe(隐藏)
    const 约束 = await 执行(
      `SELECT condeferrable, condeferred FROM pg_constraint
       WHERE conrelid = '"游戏档案"'::regclass AND conname = '游戏档案_分类内排序唯一'`,
    )
    expect(约束.rows).toEqual([{ condeferrable: true, condeferred: true }])
  })

  it('UPSERT冲突更新与普通更新不重排，隐藏转可见置顶，可见转隐藏让出序号', async () => {
    const 甲 = await 插入档案()
    const 乙 = await 插入档案()
    const 隐藏 = await 插入档案(false)
    const 原顺序 = (await 读取全部()).map((行) => String(行.ID))

    await 执行(
      `INSERT INTO "游戏档案" ("用户ID", "角色ID", "角色名字")
       SELECT "用户ID", "角色ID", '更新' FROM "游戏档案" WHERE "ID" = $1
       ON CONFLICT ("用户ID", "角色ID") DO UPDATE SET "角色名字" = EXCLUDED."角色名字"`,
      [甲],
    )
    await 执行('UPDATE "游戏档案" SET "消息总数" = "消息总数" + 1 WHERE "ID" = $1', [乙])
    expect((await 读取全部()).map((行) => String(行.ID))).toEqual(原顺序)

    await 执行(
      `INSERT INTO "游戏档案" ("用户ID", "角色ID", "模式", "结果类型")
       SELECT "用户ID", "角色ID", 'tiaozhan', 'sheng_li_ai_qing' FROM "游戏档案" WHERE "ID" = $1
       ON CONFLICT ("用户ID", "角色ID") DO UPDATE SET "结果类型" = EXCLUDED."结果类型"`,
      [隐藏],
    )
    expect(await 可见ID及序号()).toEqual([[隐藏, 0], [乙, 1], [甲, 2]])

    await 执行(
      `UPDATE "游戏档案" SET "模式" = 'tiaozhan', "结果类型" = '' WHERE "ID" = $1`,
      [乙],
    )
    expect(await 可见ID及序号()).toEqual([[隐藏, 0], [甲, 1]])
    expect((await 读取全部()).map((行) => Number(行.排序))).toEqual([0, 1, 2])
  })

  it('批量删除多个分类的非相邻记录后各分类序号连续且隐藏置后', async () => {
    const 默认分类结果 = await 执行('SELECT "ID" FROM "战绩分类" WHERE "用户ID" = $1 AND "是否默认" = TRUE', [用户ID])
    const 默认分类 = String(默认分类结果.rows[0].ID)
    const 第二分类 = await 创建分类('第二分类')
    const 甲 = await 插入档案(true, 默认分类)
    const 乙 = await 插入档案(true, 默认分类)
    const 丙 = await 插入档案(true, 默认分类)
    const 默认隐藏 = await 插入档案(false, 默认分类)
    const 丁 = await 插入档案(true, 第二分类)
    const 戊 = await 插入档案(true, 第二分类)
    await 插入档案(false, 第二分类)

    await 执行('DELETE FROM "游戏档案" WHERE "ID" = ANY($1::uuid[])', [[丙, 乙, 丁, 戊]])
    const 全部 = await 读取全部()
    expect(全部.filter((行) => String(行.分类ID) === 默认分类).map((行) => [String(行.ID), Number(行.排序)])).toEqual([[甲, 0], [默认隐藏, 1]])
    expect(全部.filter((行) => String(行.分类ID) === 第二分类).map((行) => Number(行.排序))).toEqual([0])
  })

  it('批量隐藏转可见置顶且跨分类移动与原可见记录连续重排', async () => {
    const 默认分类结果 = await 执行('SELECT "ID" FROM "战绩分类" WHERE "用户ID" = $1 AND "是否默认" = TRUE', [用户ID])
    const 默认分类 = String(默认分类结果.rows[0].ID)
    const 第二分类 = await 创建分类('第二分类')
    const 甲 = await 插入档案(true, 默认分类)
    const 乙 = await 插入档案(true, 默认分类)
    const 默认隐藏 = await 插入档案(false, 默认分类)
    const 丁 = await 插入档案(true, 第二分类)
    const 戊 = await 插入档案(true, 第二分类)
    const 第二隐藏 = await 插入档案(false, 第二分类)

    await 执行(
      `UPDATE "游戏档案"
       SET "分类ID" = CASE WHEN "ID" = $2 THEN $3 ELSE "分类ID" END,
           "结果类型" = CASE WHEN "ID" = $4 THEN 'sheng_li_ai_qing' WHEN "ID" = $5 THEN '' ELSE "结果类型" END,
           "模式" = CASE WHEN "ID" = $5 THEN 'tiaozhan' ELSE "模式" END
       WHERE "ID" = ANY($1::uuid[])`,
      [[默认隐藏, 乙, 戊], 戊, 默认分类, 默认隐藏, 乙],
    )

    expect((await 读取全部()).filter((行) => String(行.分类ID) === 默认分类).map((行) => [String(行.ID), Number(行.排序)])).toEqual([
      [默认隐藏, 0],
      [甲, 1],
      [戊, 2],
      [乙, 3],
    ])
    expect((await 读取全部()).filter((行) => String(行.分类ID) === 第二分类).map((行) => [String(行.ID), Number(行.排序)])).toEqual([
      [丁, 0],
      [第二隐藏, 1],
    ])
  })

  it('拖拽仅更新排序时不触发新增逻辑，事务回滚不留下平移残留', async () => {
    const 甲 = await 插入档案()
    const 乙 = await 插入档案()
    const 隐藏 = await 插入档案(false)
    const client = await 池.connect()
    try {
      await client.query('BEGIN')
      await client.query('SET CONSTRAINTS "游戏档案_分类内排序唯一" DEFERRED')
      await client.query(
        `UPDATE "游戏档案" SET "排序" = CASE "ID" WHEN $2 THEN 0 WHEN $3 THEN 1 ELSE 2 END
         WHERE "用户ID" = $1`,
        [用户ID, 甲, 乙],
      )
      await client.query('COMMIT')
    } finally {
      client.release()
    }
    expect(await 可见ID及序号()).toEqual([[甲, 0], [乙, 1]])
    expect((await 读取全部()).map((行) => Number(行.排序))).toEqual([0, 1, 2])

    const 回滚前 = await 读取全部()
    const 回滚客户端 = await 池.connect()
    try {
      await 回滚客户端.query('BEGIN')
      const 角色 = await 回滚客户端.query(
        `INSERT INTO "角色" ("ID", "用户ID") VALUES ($1, $2) RETURNING "ID"`,
        [randomUUID(), 用户ID],
      )
      await 回滚客户端.query(
        `INSERT INTO "游戏档案" ("用户ID", "角色ID", "结果类型") VALUES ($1, $2, 'sheng_li_ai_qing')`,
        [用户ID, 角色.rows[0].ID],
      )
      await 回滚客户端.query('ROLLBACK')
    } catch (错误) {
      await 回滚客户端.query('ROLLBACK').catch(() => undefined)
      throw 错误
    } finally {
      回滚客户端.release()
    }
    expect(await 读取全部()).toEqual(回滚前)
    expect(回滚前.some((行) => String(行.ID) === 隐藏)).toBe(true)
  })

  it('并发可见与隐藏新增不丢行不重号，序号始终连续', async () => {
    const 结果 = await Promise.all(Array.from({ length: 16 }, (_, 序号) => 插入档案(序号 % 5 !== 0)))
    expect(new Set(结果).size).toBe(16)
    const 全部 = await 读取全部()
    const 可见 = await 服务.huoQuDangAnLieBiao(用户ID)
    expect(全部).toHaveLength(16)
    expect(可见).toHaveLength(12)
    expect(全部.map((行) => Number(行.排序))).toEqual(Array.from({ length: 16 }, (_, 序号) => 序号))
    expect(可见.map((项) => 项.sort_order)).toEqual(Array.from({ length: 12 }, (_, 序号) => 序号))
  })

  it('跨分类移动与分类删除合流后仍保持可见序号连续', async () => {
    const 默认分类结果 = await 执行('SELECT "ID" FROM "战绩分类" WHERE "用户ID" = $1 AND "是否默认" = TRUE', [用户ID])
    const 默认分类 = String(默认分类结果.rows[0].ID)
    const 第二分类 = await 创建分类('第二分类')
    const 甲 = await 插入档案(true, 默认分类)
    const 默认隐藏 = await 插入档案(false, 默认分类)
    const 乙 = await 插入档案(true, 第二分类)
    const 第二隐藏 = await 插入档案(false, 第二分类)

    const 移动结果 = await 服务.yiDongDangAnDaoFenLei(用户ID, 第二分类, 乙, 默认分类, 0)
    expect(移动结果.sort_order).toBe(1)
    expect(await 可见ID及序号()).toEqual([[甲, 0], [乙, 1]])
    let 全部 = await 读取全部()
    expect(Number(全部.find((行) => String(行.ID) === 默认隐藏)?.排序)).toBe(2)
    expect(Number(全部.find((行) => String(行.ID) === 第二隐藏)?.排序)).toBe(0)

    await 服务.shanChuZhanJiFenLei(用户ID, 第二分类, 1)
    expect(await 可见ID及序号()).toEqual([[甲, 0], [乙, 1]])
    全部 = await 读取全部()
    expect(全部.map((行) => Number(行.排序))).toEqual([0, 1, 2, 3])
    expect(全部.slice(2).every((行) => 行.模式 === 'tiaozhan' && 行.结果类型 === '')).toBe(true)
  })

  it('并发可见性变更后终态连续唯一', async () => {
    const 默认分类结果 = await 执行('SELECT "ID" FROM "战绩分类" WHERE "用户ID" = $1 AND "是否默认" = TRUE', [用户ID])
    const 默认分类 = String(默认分类结果.rows[0].ID)
    const 甲 = await 插入档案(true, 默认分类)
    const 乙 = await 插入档案(true, 默认分类)
    const 丙 = await 插入档案(true, 默认分类)
    const 隐藏 = await 插入档案(false, 默认分类)
    const 客户端甲 = await 池.connect()
    const 客户端乙 = await 池.connect()
    try {
      await Promise.all([
        客户端甲.query('UPDATE "游戏档案" SET "模式" = \'tiaozhan\', "结果类型" = \'\' WHERE "ID" = ANY($1::uuid[])', [[甲, 乙]]),
        客户端乙.query('UPDATE "游戏档案" SET "结果类型" = \'sheng_li_ai_qing\' WHERE "ID" = $1', [隐藏]),
      ])
    } finally {
      客户端甲.release()
      客户端乙.release()
    }
    const 全部 = await 读取全部()
    expect(全部.map((行) => Number(行.排序))).toEqual([0, 1, 2, 3])
    expect(await 可见ID及序号()).toEqual([[隐藏, 0], [丙, 1]])
  })

  it('重复执行迁移后仍保持批量重排与延迟唯一约束', async () => {
    const 甲 = await 插入档案(true)
    await 插入档案(true)
    await 插入档案(false)
    await 执行(readFileSync(resolve(迁移目录, '046_战绩可见新增置顶.sql'), 'utf8'))
    await 执行('DELETE FROM "游戏档案" WHERE "ID" = $1', [甲])
    expect((await 读取全部()).map((行) => Number(行.排序))).toEqual([0, 1])
    const 约束 = await 执行(
      `SELECT condeferrable, condeferred FROM pg_constraint
       WHERE conrelid = '"游戏档案"'::regclass AND conname = '游戏档案_分类内排序唯一'`,
    )
    expect(约束.rows).toEqual([{ condeferrable: true, condeferred: true }])
  })
})
