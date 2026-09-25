import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ZHAN_JI_PEI_ZHI } from '../../config/战绩配置'

const 后端根 = resolve(__dirname, '..', '..', '..')
const 仓库根 = resolve(后端根, '..')
const 迁移目录 = resolve(后端根, 'database', 'migrations')
const 迁移路径 = resolve(迁移目录, '039_FP11战绩分类排序.sql')
const 基线路径 = resolve(仓库根, 'database', '000_baseline.sql')
const 全量夹具路径 = resolve(仓库根, 'database', '001_haoyou_yu_shezhi.sql')
const 管理连接串 = String(process.env.TEST_DATABASE_URL ?? '').replace(/\/[^/?#]*(\?.*)?$/, '/postgres$1')
const 后缀 = randomUUID().replace(/-/g, '').slice(0, 12)
const 已建库: string[] = []
let 管理库: Pool

function 取连接串(库名: string): string {
  return 管理连接串.replace(/\/[^/?#]*(\?.*)?$/, `/${库名}$1`)
}

async function 建隔离库(用途: string): Promise<Pool> {
  const 库名 = `fp11_${用途}_${后缀}`.slice(0, 60)
  await 管理库.query(`CREATE DATABASE "${库名}"`)
  已建库.push(库名)
  return new Pool({ connectionString: 取连接串(库名), max: 8 })
}

async function 重放(池: Pool, 路径: string): Promise<void> {
  await 池.query(readFileSync(路径, 'utf8'))
}

async function 重放迁移(池: Pool, 排除: Set<string>): Promise<void> {
  const 文件 = readdirSync(迁移目录)
    .filter((名) => 名.endsWith('.sql') && !排除.has(名.split('_')[0]))
    .sort()
  for (const 名 of 文件) await 重放(池, resolve(迁移目录, 名))
}

beforeAll(async () => {
  if (!管理连接串 || !process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL 未配置')
  管理库 = new Pool({ connectionString: 管理连接串, max: 2 })
  await 管理库.query('SELECT 1')
}, 420000)

afterAll(async () => {
  if (管理库) {
    for (const 库名 of 已建库) {
      await 管理库.query(`DROP DATABASE IF EXISTS "${库名}" WITH (FORCE)`).catch(() => undefined)
    }
    await 管理库.end().catch(() => undefined)
  }
}, 420000)

describe('FP-11 战绩分类迁移契约', () => {
  it('提供独立的 039 迁移并声明分类、归属外键、分类内完整排序与默认分类回填', () => {
    expect(existsSync(迁移路径)).toBe(true)
    const sql = readFileSync(迁移路径, 'utf8')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "战绩分类"')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "分类ID" UUID')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "排序" INTEGER')
    expect(sql).toContain('FOREIGN KEY ("分类ID", "用户ID")')
    expect(sql).toContain('游戏档案_分类内排序唯一')
    expect(sql).toContain('"是否默认" = TRUE')
    expect(sql).toContain('row_number() OVER')
    expect(sql).toContain(`"名称" VARCHAR(${ZHAN_JI_PEI_ZHI.fenLeiMingChengZuiDaChangDu})`)
  })

  it('升级既有用户时安全回填默认分类与原列表顺序，重复执行不改变终态', async () => {
    const 池 = await 建隔离库('upgrade')
    try {
      await 重放(池, 基线路径)
      await 重放(池, 全量夹具路径)
      await 重放迁移(池, new Set(['034', '039']))
      const 用户ID = randomUUID()
      const 角色一 = randomUUID()
      const 角色二 = randomUUID()
      await 池.query(`INSERT INTO "用户" ("ID", "手机号", "用户名", "昵称") VALUES ($1, '13900000011', 'fp11-upgrade', '迁移用户')`, [用户ID])
      await 池.query(`INSERT INTO "角色" ("ID", "用户ID", "名字", "性别", "封存") VALUES ($1, $2, '角色一', 'female', TRUE), ($3, $2, '角色二', 'male', FALSE)`, [角色一, 用户ID, 角色二])
      await 池.query(
        `INSERT INTO "游戏档案" ("ID", "用户ID", "角色ID", "创建时间") VALUES
          ($1, $3, $4, '2026-01-01T00:00:00Z'),
          ($2, $3, $5, '2026-01-02T00:00:00Z')`,
        [randomUUID(), randomUUID(), 用户ID, 角色一, 角色二],
      )
      await 重放(池, 迁移路径)
      const 前 = await 池.query(
        `SELECT d."ID", c."ID" AS "分类ID", d."排序"
         FROM "游戏档案" d JOIN "战绩分类" c ON c."用户ID" = d."用户ID" AND c."是否默认" = TRUE
         WHERE d."用户ID" = $1 ORDER BY d."创建时间" DESC, d."ID" DESC`,
        [用户ID],
      )
      expect(前.rows).toHaveLength(2)
      expect(前.rows[0].排序).toBe(0)
      expect(前.rows[1].排序).toBe(1)
      expect(new Set(前.rows.map((行) => 行.分类ID)).size).toBe(1)
      await 重放(池, 迁移路径)
      const 后 = await 池.query(
        `SELECT d."ID", d."分类ID", d."排序" FROM "游戏档案" d WHERE d."用户ID" = $1 ORDER BY d."ID"`,
        [用户ID],
      )
      expect(后.rows).toEqual(前.rows.map((行) => ({ ID: 行.ID, 分类ID: 行.分类ID, 排序: 行.排序 })).sort((甲, 乙) => String(甲.ID).localeCompare(String(乙.ID))))
    } finally {
      await 池.end()
    }
  }, 420000)

  it('新装完整迁移链后由真实约束保护归属、名称与排序，并由触发器给旧写口分配默认分类', async () => {
    const 池 = await 建隔离库('fresh')
    try {
      await 重放(池, 基线路径)
      await 重放(池, 全量夹具路径)
      await 重放迁移(池, new Set(['034']))
      const 用户甲 = randomUUID()
      const 用户乙 = randomUUID()
      await 池.query(
        `INSERT INTO "用户" ("ID", "手机号", "用户名", "昵称") VALUES
          ($1, '13900000021', 'fp11-fresh-a', '甲'),
          ($2, '13900000022', 'fp11-fresh-b', '乙')`,
        [用户甲, 用户乙],
      )
      const 角色一 = randomUUID()
      const 角色二 = randomUUID()
      await 池.query(
        `INSERT INTO "角色" ("ID", "用户ID", "名字", "性别", "封存") VALUES
          ($1, $3, '角色一', 'female', TRUE),
          ($2, $3, '角色二', 'male', TRUE)`,
        [角色一, 角色二, 用户甲],
      )
      const 档案一 = randomUUID()
      const 档案二 = randomUUID()
      await 池.query(
        `INSERT INTO "游戏档案" ("ID", "用户ID", "角色ID") VALUES ($1, $3, $4), ($2, $3, $5)`,
        [档案一, 档案二, 用户甲, 角色一, 角色二],
      )
      const 分类行 = await 池.query(`SELECT "ID", "版本" FROM "战绩分类" WHERE "用户ID" = $1 AND "是否默认" = TRUE`, [用户甲])
      expect(分类行.rows).toHaveLength(1)
      const 档案行 = await 池.query(`SELECT "ID", "分类ID", "排序" FROM "游戏档案" WHERE "用户ID" = $1 ORDER BY "排序"`, [用户甲])
      expect(档案行.rows.map((行) => 行.排序)).toEqual([0, 1])
      expect(new Set(档案行.rows.map((行) => 行.分类ID))).toEqual(new Set([分类行.rows[0].ID]))
      const 保留分类 = await 池.query(
        `INSERT INTO "战绩分类" ("用户ID", "名称") VALUES ($1, '保留') RETURNING "ID"`,
        [用户甲],
      )
      await 池.query(`UPDATE "游戏档案" SET "分类ID" = $1, "排序" = 0 WHERE "ID" = $2`, [保留分类.rows[0].ID, 档案一])
      await 池.query(
        `INSERT INTO "游戏档案" ("ID", "用户ID", "角色ID", "结果类型")
         VALUES ($1, $2, $3, 'sheng_li_ai_qing')
         ON CONFLICT ("用户ID", "角色ID") DO UPDATE SET "结果类型" = EXCLUDED."结果类型"`,
        [randomUUID(), 用户甲, 角色一],
      )
      const 旧写口结果 = await 池.query(`SELECT "分类ID" FROM "游戏档案" WHERE "ID" = $1`, [档案一])
      expect(旧写口结果.rows[0].分类ID).toBe(保留分类.rows[0].ID)
      const 列 = await 池.query(
        `SELECT column_name, is_nullable FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = '游戏档案' AND column_name IN ('分类ID', '排序') ORDER BY column_name`,
      )
      expect(列.rows).toEqual([
        { column_name: '分类ID', is_nullable: 'NO' },
        { column_name: '排序', is_nullable: 'NO' },
      ])
      const 约束 = await 池.query(
        `SELECT conname FROM pg_constraint WHERE conrelid = '"游戏档案"'::regclass AND conname IN ('游戏档案_分类内排序非负', '游戏档案_分类内排序唯一', '游戏档案_分类用户归属') ORDER BY conname`,
      )
      const 分类约束 = await 池.query(
        `SELECT conname FROM pg_constraint
          WHERE conrelid = '"战绩分类"'::regclass AND contype IN ('p', 'u', 'c', 'f')
          ORDER BY conname`,
      )
      expect(分类约束.rows.map((行) => 行.conname)).toEqual([
        '战绩分类_ID用户唯一',
        '战绩分类_pkey',
        '战绩分类_名称合法',
        '战绩分类_版本非负',
        '战绩分类_用户ID_fkey',
      ])
      const 分类索引 = await 池.query(
        `SELECT indexname FROM pg_indexes WHERE tablename = '战绩分类' ORDER BY indexname`,
      )
      expect(分类索引.rows.map((行) => 行.indexname)).toEqual([
        '战绩分类_ID用户唯一',
        '战绩分类_pkey',
        '战绩分类_每用户默认唯一',
        '战绩分类_用户名称唯一',
      ])
      expect(约束.rows.map((行) => 行.conname)).toEqual([
        '游戏档案_分类内排序唯一',
        '游戏档案_分类内排序非负',
        '游戏档案_分类用户归属',
      ])
      await 池.query(`INSERT INTO "战绩分类" ("用户ID", "名称") VALUES ($1, '重复'), ($1, '重复')`, [用户甲])
        .then(() => expect.fail('分类重名未被数据库拒绝'))
        .catch((错误: { code?: string }) => expect(错误.code).toBe('23505'))
      await 池.query(`INSERT INTO "战绩分类" ("用户ID", "名称") VALUES ($1, ' 重复 ')`, [用户甲])
        .then(() => expect.fail('分类名称未 trim 未被数据库拒绝'))
        .catch((错误: { code?: string }) => expect(错误.code).toBe('23514'))
      await 池.query(`INSERT INTO "战绩分类" ("用户ID", "名称", "是否默认") VALUES ($1, '', TRUE)`, [用户乙])
      const 角色乙 = randomUUID()
      await 池.query(`INSERT INTO "角色" ("ID", "用户ID", "名字", "性别", "封存") VALUES ($1, $2, '角色乙', 'male', TRUE)`, [角色乙, 用户甲])
      await 池.query(`INSERT INTO "游戏档案" ("ID", "用户ID", "角色ID", "分类ID", "排序") VALUES ($1, $2, $3, (SELECT "ID" FROM "战绩分类" WHERE "用户ID" = $4 AND "是否默认" = TRUE), 9)`, [randomUUID(), 用户甲, 角色乙, 用户乙])
        .then(() => expect.fail('跨用户分类未被数据库拒绝'))
        .catch((错误: { code?: string }) => expect(错误.code).toBe('23503'))
    } finally {
      await 池.end()
    }
  }, 420000)
})
