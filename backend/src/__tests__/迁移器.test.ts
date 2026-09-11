import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { 数据库 } from '../数据库'
import { 迁移器 } from '../../scripts/迁移器'
import * as fs from 'fs'
import * as path from 'path'

const 测试迁移目录 = path.resolve(__dirname, '../../database/test_migrations_temp')
const 测试运行标识 = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

function 创建测试迁移文件(版本: string, 内容: string): string {
  const 文件名 = `${版本}_${测试运行标识}.sql`
  const 文件路径 = path.join(测试迁移目录, 文件名)
  fs.writeFileSync(文件路径, 内容)
  return 文件路径
}

function 清理测试迁移目录(): void {
  if (fs.existsSync(测试迁移目录)) {
    const 文件列表 = fs.readdirSync(测试迁移目录)
    for (const 文件 of 文件列表) {
      if (文件.includes(测试运行标识)) {
        fs.rmSync(path.join(测试迁移目录, 文件), { force: true })
      }
    }
  } else {
    fs.mkdirSync(测试迁移目录, { recursive: true })
  }
}

async function 重置数据库(表前缀: string): Promise<void> {
  await 数据库.query(`DROP TABLE IF EXISTS "schema_migrations" CASCADE`)
  await 数据库.query(`DROP TABLE IF EXISTS "${表前缀}_测试表" CASCADE`)
  await 数据库.query(`DROP TABLE IF EXISTS "${表前缀}_另一个测试表" CASCADE`)
  await 数据库.query(`DROP TABLE IF EXISTS "${表前缀}_表1" CASCADE`)
  await 数据库.query(`DROP TABLE IF EXISTS "${表前缀}_表2" CASCADE`)
  await 数据库.query(`DROP TABLE IF EXISTS "${表前缀}_表3" CASCADE`)
  await 数据库.query(`DROP TABLE IF EXISTS "${表前缀}_不存在的表引用" CASCADE`)
}

describe('R6 数据库迁移器', () => {
  const 表前缀 = 测试运行标识.replace(/[^a-zA-Z0-9_]/g, '_')

  beforeAll(async () => {
    清理测试迁移目录()
    await 重置数据库(表前缀)
  })

  afterAll(async () => {
    await 重置数据库(表前缀)
    清理测试迁移目录()
  })

  beforeEach(async () => {
    await 重置数据库(表前缀)
    清理测试迁移目录()
  })

  it('首次运行创建 schema_migrations 表并执行所有迁移', async () => {
    创建测试迁移文件('001', `CREATE TABLE "${表前缀}_测试表" ("id" SERIAL PRIMARY KEY, "name" VARCHAR(50))`)
    创建测试迁移文件('002', `CREATE TABLE "${表前缀}_另一个测试表" ("id" SERIAL PRIMARY KEY, "value" INTEGER)`)

    const 迁移器实例 = new 迁移器(测试迁移目录)
    const 结果 = await 迁移器实例.执行()

    expect(结果.已执行).toBe(2)
    expect(结果.已跳过).toBe(0)
    expect(结果.错误).toBeUndefined()

    const 版本记录 = await 数据库.query(`SELECT version, checksum FROM "schema_migrations" ORDER BY version`)
    expect(版本记录.rows.length).toBe(2)
    expect(版本记录.rows[0].version).toBe('001')
    expect(版本记录.rows[1].version).toBe('002')
    expect(版本记录.rows[0].checksum).toBeDefined()
    expect(版本记录.rows[1].checksum).toBeDefined()

    const 表存在 = await 数据库.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name IN ('${表前缀}_测试表', '${表前缀}_另一个测试表')
    `)
    expect(表存在.rows.length).toBe(2)
  })

  it('重复执行迁移器幂等无副作用', async () => {
    创建测试迁移文件('001', `CREATE TABLE "${表前缀}_测试表" ("id" SERIAL PRIMARY KEY, "name" VARCHAR(50))`)

    const 迁移器实例1 = new 迁移器(测试迁移目录)
    await 迁移器实例1.执行()

    const 迁移器实例2 = new 迁移器(测试迁移目录)
    const 结果 = await 迁移器实例2.执行()

    expect(结果.已执行).toBe(0)
    expect(结果.已跳过).toBe(1)

    const 版本记录 = await 数据库.query(`SELECT count(*) FROM "schema_migrations"`)
    expect(parseInt(版本记录.rows[0].count)).toBe(1)
  })

  it('已执行版本校验和不匹配时报错', async () => {
    创建测试迁移文件('001', `CREATE TABLE "${表前缀}_测试表" ("id" SERIAL PRIMARY KEY)`)

    const 迁移器实例1 = new 迁移器(测试迁移目录)
    await 迁移器实例1.执行()

    // 修改迁移文件内容（模拟篡改）
    创建测试迁移文件('001', `CREATE TABLE "${表前缀}_测试表" ("id" SERIAL PRIMARY KEY, "extra" VARCHAR(100))`)

    const 迁移器实例2 = new 迁移器(测试迁移目录)
    await expect(迁移器实例2.执行()).rejects.toThrow(/校验和不匹配|checksum mismatch/i)
  })

  it('按版本号顺序执行迁移', async () => {
    创建测试迁移文件('003', `CREATE TABLE "${表前缀}_表3" ("id" SERIAL PRIMARY KEY)`)
    创建测试迁移文件('001', `CREATE TABLE "${表前缀}_表1" ("id" SERIAL PRIMARY KEY)`)
    创建测试迁移文件('002', `CREATE TABLE "${表前缀}_表2" ("id" SERIAL PRIMARY KEY)`)

    const 迁移器实例 = new 迁移器(测试迁移目录)
    await 迁移器实例.执行()

    const 版本记录 = await 数据库.query(`SELECT version FROM "schema_migrations" ORDER BY version`)
    expect(版本记录.rows.map(r => r.version)).toEqual(['001', '002', '003'])
  })

  it('事务中执行迁移：失败时回滚不记录版本', async () => {
    创建测试迁移文件('001', `CREATE TABLE "${表前缀}_测试表" ("id" SERIAL PRIMARY KEY)`)
    创建测试迁移文件('002', `CREATE TABLE "${表前缀}_不存在的表引用" ("id" INTEGER REFERENCES "不存在的表"(id))`)

    const 迁移器实例 = new 迁移器(测试迁移目录)
    await expect(迁移器实例.执行()).rejects.toThrow()

    const 版本记录 = await 数据库.query(`SELECT version FROM "schema_migrations"`)
    // 只有第一个成功的迁移应该被记录
    expect(版本记录.rows.length).toBe(1)
    expect(版本记录.rows[0].version).toBe('001')
  })

  it('校验和计算一致性', async () => {
    const sql = `CREATE TABLE "${表前缀}_测试表" ("id" SERIAL PRIMARY KEY, "name" VARCHAR(50))`
    创建测试迁移文件('001', sql)

    const 迁移器实例 = new 迁移器(测试迁移目录)
    await 迁移器实例.执行()

    const 版本记录 = await 数据库.query(`SELECT checksum FROM "schema_migrations" WHERE version = '001'`)
    const 存储校验和 = 版本记录.rows[0].checksum

    // 重新计算校验和应该一致
    const crypto = await import('crypto')
    const 重新计算 = crypto.createHash('sha256').update(sql.trim()).digest('hex')
    expect(存储校验和).toBe(重新计算)
  })
})