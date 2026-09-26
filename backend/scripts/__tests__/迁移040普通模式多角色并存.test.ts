import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { peiZhi } from '../../src/config'
import { 计算迁移校验和 } from '../迁移器'

/**
 * 迁移 040（普通模式多角色并存）测试。
 *
 * 需求：普通模式允许同一用户同时生成并保留多个角色、多个角色会话可并行聊天，
 *       删除「同模式只能一个活跃角色」的设定；挑战模式的「同一用户仅一局挑战进行中」不变。
 *
 * A 组（无库依赖）：040 只做索引 DDL 的形状自证 —— 两条排他唯一索引都要被删掉、
 *       幸存索引必须非唯一且谓词与 004 逐字同源、幂等结构齐全、号位是当前最大顶层号。
 * B 组（真库）分两处落点，互不串味：
 *   ① public 模式：真跑 040 本身，证明角色表上两个唯一索引确实都不存在、
 *      幸存的非唯一索引在位且谓词与 004 同源、挑战侧的 uk_挑战对局_用户_进行中 未被触碰
 *      且并发第二条进行中对局仍被 23505 拒、连续创建两个同模式普通角色都成功。
 *   ② 一次性沙箱模式：按 004/010 抽出的索引名建出**旧形态**，先证明旧形态确实排他
 *      （并发两条同模式插入必有一条 23505），再在同一沙箱里跑 040，证明
 *      「真并发两条同模式插入都成功」且 040 幂等。沙箱与夹具在 afterAll 无条件清理。
 *      之所以另起沙箱而不是直接改 public：040 一旦落过 public 就再也回不到旧形态，
 *      本组必须可重复执行。
 *
 * 索引名不另抄一份字面量：004/010/040 里的名字由正则从迁移文件抽出，
 * 再按 Postgres 的标识符折叠规则（未加双引号 ⇒ 折为小写）转成库内实际名去比对。
 * 连不上真库时 B 组整组跳过，不伪造通过。
 */

const 后端根目录 = resolve(__dirname, '..', '..')
const 迁移目录 = resolve(后端根目录, 'database', 'migrations')
const 待审目录 = resolve(迁移目录, 'pending')
const 建库脚本 = resolve(后端根目录, '..', 'database', '000_baseline.sql')
const 迁移004 = readFileSync(resolve(迁移目录, '004_R2事务幂等约束.sql'), 'utf-8')
const 迁移010 = readFileSync(resolve(迁移目录, '010_挑战模式.sql'), 'utf-8')
const SQL = readFileSync(resolve(迁移目录, '040_普通模式多角色并存.sql'), 'utf-8')
const 正文 = 剥注释(SQL)

/** Postgres 标识符折叠：未加双引号的标识符一律折为小写 */
function 折叠(名: string): string {
  return 名.toLowerCase()
}

/** 剥掉整行 `--` 注释：040 的表头注释逐字提到了挑战两表，语句级断言不能被注释命中 */
function 剥注释(源: string): string {
  return 源
    .split('\n')
    .map((行) => (/^\s*--/.test(行) ? '' : 行))
    .join('\n')
}

/** 抽某表上所有 CREATE [UNIQUE] INDEX 的名字（表名省略则全抽）；只看本条语句，不跨语句误配 */
function 抽索引名(源: string, 表名?: string): string[] {
  return [...源.matchAll(/CREATE\s+(UNIQUE\s+)?INDEX\s+(IF\s+NOT\s+EXISTS\s+)?(\S+)([^;]*);/g)]
    .filter((项) => (表名 === undefined ? true : new RegExp(`ON\\s+"${表名}"`).test(项[4])))
    .map((项) => 项[3])
}

/** 抽 `WHERE` 谓词（归一空白），用于跨迁移逐字比对 */
function 抽谓词(源: string, 索引名: string): string {
  const 命中 = new RegExp(
    `CREATE\\s+(UNIQUE\\s+)?INDEX\\s+(IF\\s+NOT\\s+EXISTS\\s+)?${索引名}\\s+ON[^;]*?(WHERE[^;]*?);`,
  ).exec(源)
  expect(命中, `抽不到 ${索引名} 的谓词`).toBeTruthy()
  return (命中?.[1] ?? '').replace(/\s+/g, ' ').trim()
}

const 角色唯一004 = 抽索引名(迁移004, '角色').filter((名) => 名.startsWith('uk_'))
const 角色非唯一004 = 抽索引名(迁移004, '角色').filter((名) => !名.startsWith('uk_'))
const 角色唯一010 = 抽索引名(迁移010, '角色').filter((名) => 名.startsWith('uk_'))
const 挑战唯一010 = 抽索引名(迁移010, '挑战对局').filter((名) => 名.startsWith('uk_'))
/** DROP 的原始 token（保留引号，用于区分「折叠名」与「原样名」两种形态） */
const 要删的索引 = [...正文.matchAll(/DROP\s+INDEX\s+IF\s+EXISTS\s+("[^"]+"|[^\s;]+)/g)].map((项) => 项[1])
const 建的索引 = [...正文.matchAll(/CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+(\S+)/g)].map((项) => ({
  名: 项[2],
  唯一: Boolean(项[1]),
}))

// ============================ A 组：无库依赖 ============================

describe('迁移 040 的形状自证（无库依赖）', () => {
  it('040 是当前最大的顶层迁移号且号位不重复；038 仍在 pending 不算已执行', () => {
    const 顶层 = readdirSync(迁移目录)
      .filter((名) => 名.endsWith('.sql'))
      .map((名) => 名.split('_')[0])
    expect(new Set(顶层).size).toBe(顶层.length)
    expect(顶层).toContain('040')
    expect(Math.max(...顶层.map(Number))).toBe(40)
    expect(顶层).not.toContain('038')
    expect(readdirSync(待审目录).some((名) => 名.startsWith('038_'))).toBe(true)
  })

  it('040 要删掉的正是 004/010 建的那两条排他唯一索引，折叠名与原样名各一条都带 IF EXISTS', () => {
    expect(角色唯一004).toHaveLength(1)
    expect(角色唯一010).toHaveLength(1)
    for (const 名 of [...角色唯一004, ...角色唯一010]) {
      expect(要删的索引, `040 缺 ${名} 的折叠名 DROP`).toContain(名)
      expect(要删的索引, `040 缺 ${名} 的原样名 DROP`).toContain(`"${名}"`)
    }
    expect(new Set(要删的索引.map((名) => 折叠(名.replace(/"/g, '')))).size).toBe(2)
    for (const 名 of 要删的索引) {
      expect(正文).toContain(`DROP INDEX IF EXISTS ${名}`)
    }
  })

  it('幸存的只有一条非唯一索引，且谓词与 004 建立的活跃索引逐字同源', () => {
    expect(建的索引).toHaveLength(1)
    expect(建的索引[0].唯一).toBe(false)
    expect(角色非唯一004).toHaveLength(1)
    expect(建的索引[0].名).toBe(角色非唯一004[0])
    expect(抽谓词(SQL, 建的索引[0].名)).toBe(抽谓词(迁移004, 角色非唯一004[0]))
    expect(SQL).not.toMatch(/CREATE\s+UNIQUE\s+INDEX/i)
  })

  it('幂等结构：五条语句全是带守卫的索引 DDL，可重复执行', () => {
    const 语句 = 正文
      .split(';')
      .map((段) => 段.trim())
      .filter((段) => 段.length > 0)
    expect(语句).toHaveLength(5)
    for (const 段 of 语句) {
      expect(段, `不是带守卫的索引 DDL: ${段}`).toMatch(/^(DROP INDEX IF EXISTS|CREATE INDEX IF NOT EXISTS)/)
    }
  })

  it('数据安全：040 只做索引 DDL，不改任何行、不删任何表或列、不 ALTER 表', () => {
    expect(正文).not.toMatch(/\bUPDATE\b/i)
    expect(正文).not.toMatch(/\bDELETE\b/i)
    expect(正文).not.toMatch(/\bTRUNCATE\b/i)
    expect(正文).not.toMatch(/DROP\s+TABLE/i)
    expect(正文).not.toMatch(/DROP\s+COLUMN/i)
    expect(正文).not.toMatch(/ALTER\s+TABLE/i)
  })

  it('边界：040 的语句不触碰挑战侧两表；全新实例（基线→004→010→040）的排他索引都会被它删净', () => {
    expect(正文).not.toContain('挑战对局')
    expect(正文).not.toContain('挑战积分')
    expect(挑战唯一010).toHaveLength(1)
    const 基线 = readFileSync(建库脚本, 'utf-8')
    expect(抽索引名(基线, '角色').filter((名) => 名.startsWith('uk_'))).toEqual(角色唯一004)
  })
})

// ============================ B 组：真库 ============================

function 取连接串(): string {
  const 显式 = (process.env.TEST_DATABASE_URL ?? '').trim()
  const 基 = 显式 !== ''
    ? 显式
    : process.env.XU_KE_ZHEN_SHI_WAI_HU === 'true'
      ? String(peiZhi.shuJuKuLianJie ?? '')
      : ''
  if (基 === '') return ''
  return 基.includes('@postgres:') ? 基.replace('@postgres:', '@127.0.0.1:') : 基
}

async function 取池(连接串: string, 选项?: { search_path?: string }): Promise<Pool | null> {
  if (连接串 === '') return null
  const 池 = new Pool({
    connectionString: 连接串,
    connectionTimeoutMillis: 3000,
    ...(选项?.search_path ? { options: `-c search_path=${选项.search_path}` } : {}),
  })
  try {
    await 池.query('SELECT 1')
    return 池
  } catch {
    await 池.end().catch(() => undefined)
    return null
  }
}

const 连接串 = 取连接串()
const 池 = await 取池(连接串)
const 有真库 = 池 !== null
const 沙箱名 = `fp040_${randomUUID().replace(/-/g, '').slice(0, 12)}`
const 沙箱池 = await 取池(连接串, { search_path: 沙箱名 })
const 夹具手机号 = `14${randomUUID().replace(/\D/g, '').padEnd(9, '0').slice(0, 9)}`
let 夹具用户ID = ''
let 沙箱用户ID = ''

interface 索引行 {
  名: string
  唯一: boolean
  定义: string
}

async function 取表索引(目标池: Pool, 表名: '角色' | '挑战对局'): Promise<索引行[]> {
  const 结果 = await 目标池.query(
    `SELECT c.relname AS 名, i.indisunique AS 唯一, pg_get_indexdef(i.indexrelid) AS 定义
       FROM pg_class t
       JOIN pg_index i ON i.indrelid = t.oid
       JOIN pg_class c ON c.oid = i.indexrelid
      WHERE t.oid = $1::regclass
      ORDER BY c.relname`,
    [表名],
  )
  return 结果.rows.map((行) => ({ 名: String(行.名), 唯一: Boolean(行.唯一), 定义: String(行.定义) }))
}

/** 谓词按 ` AND ` 拆成若干项，逐项到库内定义里找（库内定义被 Postgres 归一为小写并加括号） */
function 谓词各项都在(定义: string, 谓词: string): boolean {
  const 归一定义 = 定义.toLowerCase().replace(/\s+/g, ' ')
  return 谓词
    .replace(/^WHERE\s+/i, '')
    .split(/\s+AND\s+/i)
    .map((项) => 项.trim().toLowerCase().replace(/\s+/g, ' '))
    .every((项) => 归一定义.includes(项))
}

async function 插一个角色(目标池: Pool, 用户ID: string, 模式: string): Promise<string> {
  const 结果 = await 目标池.query(
    `INSERT INTO "角色" ("用户ID", "名字", "性别", "对局模式") VALUES ($1, $2, 'nv', $3) RETURNING "ID"`,
    [用户ID, `fp040-${randomUUID().slice(0, 8)}`, 模式],
  )
  return String(结果.rows[0].ID)
}

/** 到齐才一起放行：保证两条连接的 INSERT 真的并发到达 */
function 建栅栏(人数: number): () => Promise<void> {
  let 到齐 = 0
  let 放行!: () => void
  const 承诺 = new Promise<void>((resolve) => {
    放行 = resolve
  })
  return async () => {
    到齐 += 1
    if (到齐 >= 人数) 放行()
    await 承诺
  }
}

interface 并发结果 {
  码?: string
  值?: string
}

/** 两条独立连接、各自事务、栅栏对齐后同时落库；成功返回新行 ID，失败返回 PG 错误码 */
async function 并发插(目标池: Pool, 语句: string, 参数: unknown[]): Promise<并发结果[]> {
  const 到达 = 建栅栏(2)
  const 跑一个 = async (): Promise<并发结果> => {
    const 客户端 = await 目标池.connect()
    try {
      await 客户端.query('BEGIN')
      await 到达()
      const 结果 = await 客户端.query(语句, 参数)
      await 客户端.query('COMMIT')
      return { 值: String(结果.rows[0].ID) }
    } catch (错误) {
      await 客户端.query('ROLLBACK').catch(() => undefined)
      return { 码: (错误 as { code?: string }).code }
    } finally {
      客户端.release()
    }
  }
  return Promise.all([跑一个(), 跑一个()])
}

function 码分布(结果: 并发结果[]): string[] {
  return 结果.map((项) => 项.码 ?? '成功')
}

/** 沙箱的建库 DDL：用户/角色两表 + 按 004/010 建出的旧形态索引（名字同源，不抄字面量） */
async function 建沙箱旧形态(): Promise<void> {
  await (池 as Pool).query(`DROP SCHEMA IF EXISTS "${沙箱名}" CASCADE`)
  await (池 as Pool).query(`CREATE SCHEMA "${沙箱名}"`)
  await (沙箱池 as Pool).query(
    `CREATE TABLE "用户" ("ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(), "手机号" VARCHAR(20) NOT NULL)`,
  )
  await (沙箱池 as Pool).query(
    `CREATE TABLE "角色" (
       "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       "用户ID" UUID NOT NULL REFERENCES "用户"("ID"),
       "名字" VARCHAR(50) NOT NULL,
       "封存" BOOLEAN DEFAULT FALSE,
       "删除时间" TIMESTAMPTZ,
       "对局模式" VARCHAR(10) NOT NULL DEFAULT 'putong')`,
  )
  await (沙箱池 as Pool).query(
    `CREATE INDEX IF NOT EXISTS ${折叠(角色非唯一004[0])} ON "角色"("用户ID") WHERE "封存" = FALSE AND "删除时间" IS NULL`,
  )
  await (沙箱池 as Pool).query(
    `CREATE UNIQUE INDEX IF NOT EXISTS ${折叠(角色唯一004[0])} ON "角色"("用户ID") WHERE "封存" = FALSE AND "删除时间" IS NULL`,
  )
  await (沙箱池 as Pool).query(
    `CREATE UNIQUE INDEX IF NOT EXISTS ${折叠(角色唯一010[0])} ON "角色"("用户ID", "对局模式") WHERE "封存" = FALSE AND "删除时间" IS NULL`,
  )
  const 用户 = await (沙箱池 as Pool).query(
    `INSERT INTO "用户" ("手机号") VALUES ($1) RETURNING "ID"`,
    [`14${randomUUID().replace(/\D/g, '').padEnd(9, '0').slice(0, 9)}`],
  )
  沙箱用户ID = String(用户.rows[0].ID)
}

const 插角色语句 = `INSERT INTO "角色" ("用户ID", "名字", "对局模式") VALUES ($1, $2, $3) RETURNING "ID"`

let public执行后索引: 索引行[] = []
let 挑战索引: 索引行[] = []
let 沙箱旧形态索引: 索引行[] = []
let 沙箱040后索引: 索引行[] = []
let 沙箱再跑一遍后索引: 索引行[] = []
let 沙箱旧形态并发: 并发结果[] = []
let 沙箱040后并发: 并发结果[] = []
let public并发挑战: 并发结果[] = []
let public连续角色ID: string[] = []

beforeAll(async () => {
  if (!有真库 || !沙箱池) return
  const 用户 = await (池 as Pool).query(
    `INSERT INTO "用户" ("手机号", "用户名", "昵称", "测试") VALUES ($1, $2, $3, TRUE) RETURNING "ID"`,
    [夹具手机号, `fp040-${randomUUID().slice(0, 8)}`, `fp040-${randomUUID().slice(0, 8)}`],
  )
  夹具用户ID = String(用户.rows[0].ID)

  await 建沙箱旧形态()
  沙箱旧形态索引 = await 取表索引(沙箱池 as Pool, '角色')
  沙箱旧形态并发 = await 并发插(沙箱池 as Pool, 插角色语句, [
    沙箱用户ID,
    `fp040-${randomUUID().slice(0, 8)}`,
    'putong',
  ])
  await (沙箱池 as Pool).query(正文)
  沙箱040后索引 = await 取表索引(沙箱池 as Pool, '角色')
  await (沙箱池 as Pool).query(正文)
  沙箱再跑一遍后索引 = await 取表索引(沙箱池 as Pool, '角色')
  沙箱040后并发 = await 并发插(沙箱池 as Pool, 插角色语句, [
    沙箱用户ID,
    `fp040-${randomUUID().slice(0, 8)}`,
    'putong',
  ])

  await (池 as Pool).query(正文)
  public执行后索引 = await 取表索引(池 as Pool, '角色')
  挑战索引 = await 取表索引(池 as Pool, '挑战对局')
  public连续角色ID = [
    await 插一个角色(池 as Pool, 夹具用户ID, 'putong'),
    await 插一个角色(池 as Pool, 夹具用户ID, 'putong'),
  ]
  public并发挑战 = await 并发插(
    池 as Pool,
    `INSERT INTO "挑战对局" ("用户ID", "角色ID", "玩家性别", "对象性别")
     VALUES ($1, $2, 'nan', 'nv') RETURNING "ID"`,
    [夹具用户ID, public连续角色ID[0]],
  )
}, 60000)

afterAll(async () => {
  if (池) {
    // 夹具用户是 public 侧真库用例的唯一写入源，级联带走角色/消息/好感度/档案/挑战两表
    if (夹具用户ID) await 池.query('DELETE FROM "用户" WHERE "ID" = $1', [夹具用户ID]).catch(() => undefined)
    await 池.query(`DROP SCHEMA IF EXISTS "${沙箱名}" CASCADE`).catch(() => undefined)
  }
  if (沙箱池) await 沙箱池.end().catch(() => undefined)
  if (池) await 池.end().catch(() => undefined)
})

describe.skipIf(!有真库)('迁移 040 解除排他：一次性沙箱从旧形态走到新形态（真库，可重复执行）', () => {
  it('旧形态确实排他：并发插两个同模式普通角色必有一条被 23505 拒（证明本组钉的是真实约束）', () => {
    const 唯一名 = 沙箱旧形态索引.filter((行) => 行.唯一).map((行) => 行.名)
    for (const 名 of [...角色唯一004, ...角色唯一010]) {
      expect(唯一名, `沙箱没建出旧形态的 ${名}`).toContain(折叠(名))
    }
    expect(码分布(沙箱旧形态并发)).toEqual(expect.arrayContaining(['成功']))
    expect(码分布(沙箱旧形态并发).filter((码) => 码 === '23505')).toHaveLength(1)
  })

  it('040 落到沙箱后：两个排他唯一索引都不存在，非唯一活跃索引在位、谓词与 004 同源', () => {
    const 名集合 = 沙箱040后索引.map((行) => 行.名)
    for (const 名 of [...角色唯一004, ...角色唯一010]) {
      expect(名集合, `${名} 执行 040 后仍在库里`).not.toContain(折叠(名))
    }
    expect(沙箱040后索引.filter((行) => 行.唯一 && 行.名.startsWith('uk_'))).toEqual([])
    const 幸存 = 沙箱040后索引.find((行) => 行.名 === 折叠(建的索引[0].名))
    expect(幸存, '非唯一活跃索引没建起来').toBeTruthy()
    expect(幸存!.唯一, '幸存的索引仍是唯一索引，多角色并存会被它卡死').toBe(false)
    expect(谓词各项都在(幸存!.定义, 抽谓词(迁移004, 角色非唯一004[0]))).toBe(true)
  })

  it('幂等：040 在同一库上连跑两遍，角色表索引集合逐字不变', () => {
    expect(沙箱再跑一遍后索引).toEqual(沙箱040后索引)
  })

  it('真并发创建两个同模式普通角色：两条独立连接都成功（无等待、无 23505）', () => {
    expect(码分布(沙箱040后并发)).toEqual(['成功', '成功'])
    expect(new Set(沙箱040后并发.map((项) => 项.值)).size).toBe(2)
  })
})

describe.skipIf(!有真库)('迁移 040 在 public 模式的落地证据（真库）', () => {
  it('public 角色表上两个排他唯一索引都不存在，非唯一活跃索引在位且非唯一', () => {
    const 名集合 = public执行后索引.map((行) => 行.名)
    for (const 名 of [...角色唯一004, ...角色唯一010]) {
      expect(名集合, `${名} 执行 040 后仍在 public 库里`).not.toContain(折叠(名))
    }
    const 幸存 = public执行后索引.find((行) => 行.名 === 折叠(建的索引[0].名))
    expect(幸存, 'public 侧非唯一活跃索引没建起来').toBeTruthy()
    expect(幸存!.唯一).toBe(false)
    expect(谓词各项都在(幸存!.定义, 抽谓词(迁移004, 角色非唯一004[0]))).toBe(true)
  })

  it('台账若已登记 040，校验和必须与磁盘文件一致（防已应用迁移被改动）', async () => {
    const 结果 = await (池 as Pool).query('SELECT checksum FROM "schema_migrations" WHERE version = $1', ['040'])
    if (结果.rows.length > 0) {
      expect(结果.rows[0].checksum).toBe(计算迁移校验和(SQL))
    }
  })

  it('连续创建两个同模式普通角色都成功，二者都仍是未封存的活跃角色', async () => {
    expect(public连续角色ID).toHaveLength(2)
    expect(new Set(public连续角色ID).size).toBe(2)
    const 行 = await (池 as Pool).query(
      `SELECT "封存" FROM "角色" WHERE "ID" = ANY($1::uuid[])`,
      [public连续角色ID],
    )
    expect(行.rows).toHaveLength(2)
    for (const 项 of 行.rows) expect(项.封存).toBe(false)
  })

  it('挑战不回归：uk_挑战对局_用户_进行中 未被触碰，并发第二条进行中对局仍被 23505 拒', () => {
    const 进行中 = 挑战索引.find((行) => 行.名 === 折叠(挑战唯一010[0]))
    expect(进行中, '挑战进行中的唯一索引不见了').toBeTruthy()
    expect(进行中!.唯一, '挑战进行中的唯一索引不再唯一').toBe(true)
    expect(码分布(public并发挑战).filter((码) => 码 === '成功')).toHaveLength(1)
    expect(码分布(public并发挑战).filter((码) => 码 === '23505')).toHaveLength(1)
  })
})
