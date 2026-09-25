import { describe, it, expect, afterAll } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { Pool } from 'pg'
import { 计算迁移校验和, 比对台账校验和, 迁移器, 台账比对条目 } from '../迁移器'

/**
 * FP-15 迁移台账校验和口径 + re-baseline 能力测试。
 *
 * A 组无库依赖：校验和口径必须与平台检出无关，且 run_migration.js（镜像内实现）
 *   与 迁移器.ts（ts-node/CI 实现）两份实现必须逐条同解。
 * B 组内存假库：re-baseline 的 dry-run/写入边界（只 UPDATE 已登记版本，绝不 INSERT）、
 *   幂等、篡改防护、行尾漂移分类、CRLF 检出防护。
 * C 组真连库（连不上整组跳过，不伪造通过）：001..024 台账与磁盘逐条零漂移。
 */

const js侧 = createRequire(__filename)('../run_migration.js') as {
  计算校验和(sql: string): string
  字节校验和(sql: string): string
  比对台账(文件清单: Array<{ 版本: string; 文件名: string; sql: string }>, 已执行: Map<string, string>): 台账比对条目[]
}

const 真实迁移目录 = resolve(__dirname, '..', '..', 'database', 'migrations')
const 临时根 = mkdtempSync(join(tmpdir(), 'fp15-qianyi-'))

afterAll(() => {
  rmSync(临时根, { recursive: true, force: true })
})

function 建临时迁移目录(名: string, 文件: Record<string, string>): string {
  const 目录 = join(临时根, 名)
  mkdirSync(目录, { recursive: true })
  for (const [文件名, 内容] of Object.entries(文件)) writeFileSync(join(目录, 文件名), 内容, 'utf-8')
  return 目录
}

interface 假库句柄 {
  语句: Array<{ 文本: string; 参数?: unknown[] }>
  台账: Map<string, string>
  query(文本: string, 参数?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>
  connect(): Promise<{ query(文本: string, 参数?: unknown[]): Promise<unknown>; release(): void }>
}

/** 内存假库：台账写入先进"未提交草稿"，COMMIT 才落账、ROLLBACK 丢弃——足以验事务边界 */
function 造假库(初始台账: Array<[string, string]> = [], 抛错于?: (文本: string) => boolean): 假库句柄 {
  const 语句: Array<{ 文本: string; 参数?: unknown[] }> = []
  const 台账 = new Map(初始台账)
  const 草稿 = new Map<string, string>()
  const 跑 = async (文本: string, 参数?: unknown[]) => {
    语句.push({ 文本, 参数 })
    if (抛错于?.(文本)) throw new Error('假库故意失败: ' + 文本.trim().slice(0, 24))
    if (文本 === 'COMMIT') for (const [k, v] of 草稿) 台账.set(k, v)
    if (文本 === 'ROLLBACK') 草稿.clear()
    if (文本.includes('SELECT version, checksum')) {
      return { rows: [...台账.entries()].map(([version, checksum]) => ({ version, checksum })) }
    }
    if (文本.includes('UPDATE "schema_migrations" SET checksum')) 草稿.set(String(参数?.[1]), String(参数?.[0]))
    if (文本.includes('INSERT INTO "schema_migrations"')) 草稿.set(String(参数?.[0]), String(参数?.[1]))
    return { rows: [] }
  }
  return {
    语句,
    台账,
    async query(文本, 参数) {
      return 跑(文本, 参数)
    },
    async connect() {
      return {
        async query(文本, 参数) {
          await 跑(文本, 参数)
        },
        release() {},
      }
    },
  }
}

describe('FP-15 A 组：校验和口径与两份实现同源（无库依赖）', () => {
  const 样本 = `CREATE TABLE "探针" (\n  "ID" INT PRIMARY KEY\n);\n`
  const 期望哈希 = 计算迁移校验和(样本)

  it('行尾变体（LF/CRLF/CR/前后空白）同哈希：台账哈希与平台检出无关', () => {
    expect(计算迁移校验和(样本.replace(/\n/g, '\r\n'))).toBe(期望哈希)
    expect(计算迁移校验和(样本.replace(/\n/g, '\r'))).toBe(期望哈希)
    expect(计算迁移校验和('\r\n' + 样本 + '\r\n\r\n')).toBe(期望哈希)
  })

  it('内容级改动必改哈希：re-baseline 之后误改已应用迁移仍能被算出来', () => {
    expect(计算迁移校验和(样本.replace('INT PRIMARY KEY', 'BIGINT'))).not.toBe(期望哈希)
    expect(计算迁移校验和(样本 + `ALTER TABLE "探针" ADD COLUMN "多一列" TEXT;\n`)).not.toBe(期望哈希)
  })

  it('run_migration.js 与 迁移器.ts 对全部真实迁移文件同解', () => {
    const 文件 = readdirSync(真实迁移目录).filter((f) => f.endsWith('.sql')).sort()
    expect(文件.length).toBeGreaterThanOrEqual(23)
    for (const 文件名 of 文件) {
      const 内容 = readFileSync(join(真实迁移目录, 文件名), 'utf-8')
      expect(js侧.计算校验和(内容)).toBe(计算迁移校验和(内容))
    }
  })

  it('run_migration.js 与 迁移器.ts 的台账比对逐条同解', () => {
    const 内容表: Array<[string, string]> = readdirSync(真实迁移目录)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .slice(0, 6)
      .map((文件名) => [文件名, readFileSync(join(真实迁移目录, 文件名), 'utf-8')])
    const 清单 = 内容表.map(([文件名, 内容], i) => ({
      版本: 文件名.split('_')[0],
      文件名,
      // 偶数项保持 LF、奇数项转成 CRLF：两份实现必须对同一批字节给出同一判定
      内容: i % 2 === 0 ? 内容 : 内容.replace(/\n/g, '\r\n'),
    }))
    const 台账 = new Map<string, string>([
      [清单[0].版本, 计算迁移校验和(清单[0].内容)],
      [清单[2].版本, js侧.字节校验和(清单[2].内容.replace(/\r/g, '').replace(/\n/g, '\r\n'))],
      [清单[4].版本, 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'],
    ])
    const ts结果 = 比对台账校验和(清单, 台账)
    const js结果 = js侧.比对台账(清单.map((项) => ({ 版本: 项.版本, 文件名: 项.文件名, sql: 项.内容 })), 台账)
    expect(js结果).toEqual(ts结果)
    expect(ts结果.map((项) => 项.差异)).toEqual([
      '一致',
      '未登记',
      '仅行尾',
      '未登记',
      '内容变更',
      '未登记',
    ])
  })
})

describe('FP-15 B 组：re-baseline 能力（内存假库）', () => {
  // 样本必须含行内换行：只有行内换行的 CRLF/LF 差异才会被 trim() 保留下来并被算进哈希，
  // 真实迁移文件（多行）正是这种形态。
  const 甲内容 = `CREATE TABLE "甲" (\n  "ID" INT\n);\n`
  const 乙内容 = `CREATE TABLE "乙" (\n  "ID" INT\n);\n`
  const 甲哈希 = 计算迁移校验和(甲内容)
  const 旧乙哈希 = 'deadbeef'

  it('dry-run 只出 diff，一条 UPDATE 都不发', async () => {
    const 目录 = 建临时迁移目录('dryrun', { '001_甲.sql': 甲内容, '002_乙.sql': 乙内容 })
    const 库 = 造假库([['001', 甲哈希], ['002', 旧乙哈希]])
    const { 条目, 已更新 } = await new 迁移器(目录, 库).重新登记校验和(false)
    expect(已更新).toBe(0)
    expect(库.语句.some((s) => s.文本.includes('UPDATE'))).toBe(false)
    expect(库.台账.get('002')).toBe(旧乙哈希)
    expect(条目.map((项) => 项.差异)).toEqual(['一致', '内容变更'])
  })

  it('apply 只 UPDATE 已登记且不一致的版本，绝不 INSERT 未登记版本', async () => {
    const 目录 = 建临时迁移目录('apply', {
      '001_甲.sql': 甲内容,
      '002_乙.sql': 乙内容,
      '003_丙.sql': `CREATE TABLE "丙" ("ID" INT);\n`,
    })
    const 库 = 造假库([
      ['001', 甲哈希],
      ['002', 旧乙哈希],
    ])
    const { 条目, 已更新 } = await new 迁移器(目录, 库).重新登记校验和(true)
    expect(已更新).toBe(1)
    const 更新语句 = 库.语句.filter((s) => s.文本.includes('UPDATE "schema_migrations"'))
    expect(更新语句).toHaveLength(1)
    expect(更新语句[0].参数).toEqual([计算迁移校验和(乙内容), '002'])
    expect(库.语句.some((s) => s.文本.includes('INSERT INTO "schema_migrations"'))).toBe(false)
    expect(库.台账.has('003')).toBe(false)
    expect(条目.find((项) => 项.版本 === '003')!.差异).toBe('未登记')
    expect(库.台账.get('002')).toBe(计算迁移校验和(乙内容))
  })

  it('幂等：apply 之后台账与文件逐条一致，再连跑第二次零更新', async () => {
    const 目录 = 建临时迁移目录('idempotent', { '001_甲.sql': 甲内容, '002_乙.sql': 乙内容 })
    const 库 = 造假库([['001', 旧乙哈希], ['002', 旧乙哈希]])
    const 第一次 = await new 迁移器(目录, 库).重新登记校验和(true)
    expect(第一次.已更新).toBe(2)
    const 第二次 = await new 迁移器(目录, 库).重新登记校验和(true)
    expect(第二次.已更新).toBe(0)
    expect(第二次.条目.every((项) => 项.差异 === '一致')).toBe(true)
  })

  it('行尾漂移被判为「仅行尾」：re-baseline 前后可分类（本次 001..021 实况）', async () => {
    const 目录 = 建临时迁移目录('crlf', { '001_甲.sql': 甲内容 })
    const 库 = 造假库([['001', js侧.字节校验和(甲内容.replace(/\n/g, '\r\n'))]])
    expect((await new 迁移器(目录, 库).比对台账())[0].差异).toBe('仅行尾')
    await new 迁移器(目录, 库).重新登记校验和(true)
    expect((await new 迁移器(目录, 库).比对台账())[0].差异).toBe('一致')
  })

  it('事务边界：re-baseline 写入包在 BEGIN/COMMIT + advisory 锁里；中途失败则 ROLLBACK 且台账零变更', async () => {
    const 目录 = 建临时迁移目录('tx', { '001_甲.sql': 甲内容, '002_乙.sql': 乙内容 })
    const 成库 = 造假库([['001', 旧乙哈希], ['002', 旧乙哈希]])
    await new 迁移器(目录, 成库).重新登记校验和(true)
    const 文本序列 = 成库.语句.map((s) => s.文本.trim())
    expect(文本序列.indexOf('BEGIN')).toBeGreaterThanOrEqual(0)
    expect(文本序列.some((t) => t.includes('pg_advisory_xact_lock'))).toBe(true)
    expect(文本序列.lastIndexOf('COMMIT')).toBeGreaterThan(文本序列.indexOf('BEGIN'))
    expect(成库.台账.get('001')).toBe(甲哈希)

    const 败库 = 造假库([['001', 旧乙哈希], ['002', 旧乙哈希]], (文本) => 文本.includes('UPDATE "schema_migrations" SET checksum'))
    await expect(new 迁移器(目录, 败库).重新登记校验和(true)).rejects.toThrow(/re-baseline 写入失败（台账未变更）/)
    expect(败库.语句.map((s) => s.文本.trim())).toContain('ROLLBACK')
    expect(败库.台账.get('001')).toBe(旧乙哈希)
    expect(败库.台账.get('002')).toBe(旧乙哈希)
  })

  it('防护：re-baseline 后人为篡改已应用迁移内容，执行() 必须报校验和不匹配', async () => {
    const 目录 = 建临时迁移目录('tamper', { '001_甲.sql': 甲内容, '002_乙.sql': 乙内容 })
    const 库 = 造假库([['001', 旧乙哈希], ['002', 旧乙哈希]])
    await new 迁移器(目录, 库).重新登记校验和(true)
    writeFileSync(join(目录, '001_甲.sql'), 甲内容 + `DROP TABLE "甲";\n`, 'utf-8')
    await expect(new 迁移器(目录, 库).执行()).rejects.toThrow(/迁移 001 校验和不匹配/)
    expect(库.台账.get('001')).toBe(甲哈希)
  })

  it('防护：CRLF 检出不再触发误报（回归 014/015 根因）', async () => {
    const 目录 = 建临时迁移目录('crlf-checkout', { '001_甲.sql': 甲内容.replace(/\n/g, '\r\n') })
    const 库 = 造假库([['001', 甲哈希]])
    expect(await new 迁移器(目录, 库).执行()).toEqual({ 已执行: 0, 已跳过: 1 })
    expect((await new 迁移器(目录, 库).比对台账())[0].差异).toBe('一致')
  })

  it('执行() 正常路径：未登记版本按 advisory 锁事务执行并登记归一哈希', async () => {
    const 目录 = 建临时迁移目录('run', { '001_甲.sql': 甲内容 })
    const 库 = 造假库()
    expect(await new 迁移器(目录, 库).执行()).toEqual({ 已执行: 1, 已跳过: 0 })
    expect(库.台账.get('001')).toBe(甲哈希)
    expect(库.语句.some((s) => s.文本.includes('pg_advisory_xact_lock'))).toBe(true)
    expect(库.语句.some((s) => s.文本.includes('CREATE TABLE "甲"'))).toBe(true)
  })
})

const 测试连接串 = (process.env.TEST_DATABASE_URL ?? '').trim()
const 连接串 = (
  测试连接串 || (process.env.XU_KE_ZHEN_SHI_WAI_HU === 'true' ? process.env.DATABASE_URL ?? '' : '')
)
  .trim()
  .replace('@postgres:', '@127.0.0.1:')
const 真库池 = 连接串 === '' ? null : new Pool({ connectionString: 连接串, connectionTimeoutMillis: 3000 })

async function 真库可达(): Promise<boolean> {
  if (!真库池) return false
  try {
    await 真库池.query('SELECT 1')
    return true
  } catch {
    return false
  }
}

const 有真库 = await 真库可达()

afterAll(async () => {
  if (真库池) await 真库池.end().catch(() => undefined)
})

describe.skipIf(!有真库)('FP-15 C 组：真实台账零漂移（真库）', () => {
  it('已登记版本的 checksum 与磁盘文件逐条一致（不允许 仅行尾/内容变更 漂移）', async () => {
    const 条目 = await new 迁移器(真实迁移目录, 真库池 as unknown as ConstructorParameters<typeof 迁移器>[1]).比对台账()
    expect(条目.length).toBeGreaterThanOrEqual(23)
    // 只判"漂移"：未登记（新加的 023 还没跑）是合法中间态，由 执行() 负责登记，
    // 不在本断言的失败范围内，否则会给并行工人报假警。
    const 漂移 = 条目.filter((项) => 项.差异 === '仅行尾' || 项.差异 === '内容变更')
    expect(漂移.map((项) => [项.版本, 项.差异])).toEqual([])
  })
})
