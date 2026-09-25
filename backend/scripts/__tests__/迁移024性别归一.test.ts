import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { peiZhi } from '../../src/config'
import { 解析性别, 读回性别 } from '../../src/utils/性别'
import { 计算迁移校验和 } from '../../scripts/迁移器'

/**
 * FP-13 迁移 024（性别全域归一 + 存量清洗）测试。
 *
 * A 组无库依赖：SQL 的识别表必须与 TS 唯一解析入口逐写法一致 + 幂等/数据安全结构守卫。
 * B 组真连库（连不上整组跳过，不伪造通过）：台账校验和、库内二值不变量、触发器归一、
 *    CHECK 拦截第三种写法、重复执行零变更、同一角色清洗前后 AI 人设性别对照。
 */

const 迁移目录 = resolve(__dirname, '..', '..', 'database', 'migrations')
const 迁移文件 = resolve(迁移目录, '024_性别全域归一与存量清洗.sql')
const SQL = readFileSync(迁移文件, 'utf-8')

const 六种写法: Array<[string, 'nan' | 'nv']> = [
  ['男', 'nan'],
  ['nan', 'nan'],
  ['male', 'nan'],
  ['女', 'nv'],
  ['nv', 'nv'],
  ['female', 'nv'],
]

/** 从 SQL 的 CASE 里抽出 写法 → 二值 识别表 */
function 抽取SQL识别表(来源: string): Map<string, string> {
  const 表 = new Map<string, string>()
  const 正则 = /WHEN\s+'([^']+)'\s+THEN\s+'(nan|nv)'/g
  let 命中: RegExpExecArray | null
  while ((命中 = 正则.exec(来源)) !== null) {
    表.set(命中[1], 命中[2])
  }
  return 表
}

/** 真库可达连接串：优先 TEST_DATABASE_URL，其次把容器主机名换成宿主机回环地址（不新抄任何凭据） */
function 取可连通连接串(): string {
  const 显式 = (process.env.TEST_DATABASE_URL ?? '').trim()
  if (显式 !== '') return 显式
  if (process.env.XU_KE_ZHEN_SHI_WAI_HU !== 'true') return ''
  const 运行值 = String(peiZhi.shuJuKuLianJie ?? '')
  if (运行值 === '') return ''
  return 运行值.includes('@postgres:') ? 运行值.replace('@postgres:', '@127.0.0.1:') : 运行值
}

async function 取真库池(): Promise<Pool | null> {
  const 连接串 = 取可连通连接串()
  if (连接串 === '') return null
  const 池 = new Pool({ connectionString: 连接串, connectionTimeoutMillis: 3000 })
  try {
    await 池.query('SELECT 1')
    return 池
  } catch {
    await 池.end().catch(() => undefined)
    return null
  }
}

const 真库池 = await 取真库池()
const 有真库 = 真库池 !== null
const 夹具后缀 = randomUUID().replace(/-/g, '').slice(0, 12)
const 夹具手机号 = `19${randomUUID().replace(/\D/g, '').padEnd(9, '0').slice(0, 9)}`
let 夹具用户ID = ''
let 夹具角色ID = ''
let 夹具男性角色ID = ''
let 夹具挑战ID = ''

beforeAll(async () => {
  if (!真库池) return
  const 用户 = await 真库池.query(
    `INSERT INTO "用户" ("手机号", "用户名", "昵称", "测试")
     VALUES ($1, $2, $3, TRUE) RETURNING "ID"`,
    [夹具手机号, `fp13-${夹具后缀}`, `fp13-${夹具后缀}`],
  )
  夹具用户ID = String(用户.rows[0].ID)
  const 角色 = await 真库池.query(
    `INSERT INTO "角色" ("用户ID", "名字", "性别", "封存")
     VALUES ($1, $2, 'nv', TRUE) RETURNING "ID"`,
    [夹具用户ID, `fp13-${夹具后缀}`],
  )
  夹具角色ID = String(角色.rows[0].ID)
  const 男性角色 = await 真库池.query(
    `INSERT INTO "角色" ("用户ID", "名字", "性别", "封存")
     VALUES ($1, $2, 'nan', TRUE) RETURNING "ID"`,
    [夹具用户ID, `fp13-${夹具后缀}-男`],
  )
  夹具男性角色ID = String(男性角色.rows[0].ID)
  const 挑战 = await 真库池.query(
    `INSERT INTO "挑战对局" ("用户ID", "角色ID", "玩家性别", "对象性别", "状态")
     VALUES ($1, $2, 'nan', 'nv', '已结束') RETURNING "ID"`,
    [夹具用户ID, 夹具角色ID],
  )
  夹具挑战ID = String(挑战.rows[0].ID)
})

afterAll(async () => {
  if (!真库池) return
  if (夹具挑战ID) await 真库池.query('DELETE FROM "挑战对局" WHERE "ID" = $1', [夹具挑战ID])
  if (夹具男性角色ID) await 真库池.query('DELETE FROM "角色" WHERE "ID" = $1', [夹具男性角色ID])
  if (夹具角色ID) await 真库池.query('DELETE FROM "角色" WHERE "ID" = $1', [夹具角色ID])
  if (夹具用户ID) await 真库池.query('DELETE FROM "用户" WHERE "ID" = $1', [夹具用户ID])
  await 真库池.end().catch(() => undefined)
})

describe('迁移 024 与唯一解析入口同源（无库依赖）', () => {
  const 识别表 = 抽取SQL识别表(SQL)

  it('SQL 恰好登记六种写法，无多无少', () => {
    expect([...识别表.keys()].sort()).toEqual(
      ['男', 'nan', 'male', '女', 'nv', 'female'].sort(),
    )
  })

  it.each(六种写法)('写法 %s 两侧归一结果一致（SQL CASE === TS 解析性别）', (写法, 期望) => {
    expect(识别表.get(写法)).toBe(期望)
    expect(解析性别(写法)).toBe(期望)
  })

  it.each(六种写法)('大小写/带空格变体两侧同解：%s', (写法, 期望) => {
    expect(解析性别(` ${写法.toUpperCase()} `)).toBe(期望)
  })

  it('SQL 的无法识别兜底与 读回性别 兜底同为 nan', () => {
    expect(SQL).toMatch(/ELSE\s+'nan'/)
    expect(读回性别('不认识的写法', '测试', 'probe')).toBe('nan')
  })

  it('SQL 对 NULL 不归一，留给列上的 NOT NULL 拒绝（漏传不得被洗成男性）', () => {
    expect(SQL).toMatch(/IF 原始值 IS NULL THEN\s*\n\s*RETURN NULL/)
  })

  it('幂等结构：UPDATE 带二值 WHERE、触发器/CHECK 先 DROP IF EXISTS、函数 CREATE OR REPLACE、列宽先判后改', () => {
    expect(SQL).toContain(`WHERE "性别" IS NULL OR "性别" NOT IN ('nan', 'nv')`)
    expect(SQL).toContain(`WHERE "玩家性别" IS NULL OR "玩家性别" NOT IN ('nan', 'nv')`)
    expect(SQL).toContain('CREATE OR REPLACE FUNCTION')
    expect(SQL).toContain('DROP TRIGGER IF EXISTS')
    expect(SQL).toContain('DROP CONSTRAINT IF EXISTS')
    expect(SQL).toContain('character_maximum_length < 10')
  })

  it('新库只应用了部分增量时不报错：两张表都有 to_regclass 存在性守卫', () => {
    expect(SQL).toContain(`to_regclass('public."角色"')`)
    expect(SQL).toContain(`to_regclass('public."挑战对局"')`)
  })

  it('数据安全：不删行、不删表、不截断，也不越界改 用户/游戏档案', () => {
    expect(SQL).not.toMatch(/\bDELETE\b/i)
    expect(SQL).not.toMatch(/\bTRUNCATE\b/i)
    expect(SQL).not.toMatch(/DROP\s+TABLE/i)
    expect(SQL).not.toMatch(/ALTER\s+TABLE\s+"用户"/)
    expect(SQL).not.toMatch(/UPDATE\s+"用户"/)
    expect(SQL).not.toMatch(/UPDATE\s+"游戏档案"/)
  })

  it('命名与既有迁移一致：024 前缀 + 中文后缀，落在 database/migrations', () => {
    expect(迁移文件.replace(/\\/g, '/')).toContain('database/migrations/024_')
    expect(resolve(迁移目录).replace(/\\/g, '/').endsWith('/backend/database/migrations')).toBe(true)
  })
})

describe.skipIf(!有真库)('迁移 024 真库行为', () => {
  const 池 = 真库池 as Pool

  it('台账登记 024 且校验和与文件字节一致（防 L-01 那类台账漂移）', async () => {
    const 结果 = await 池.query(
      'SELECT checksum FROM "schema_migrations" WHERE version = $1',
      ['024'],
    )
    expect(结果.rows).toHaveLength(1)
    // 口径改由 scripts/迁移器 的 计算迁移校验和 提供（FP-15：行尾归一后哈希），
    // 台账值与磁盘字节在任一检出平台都同解；断言本身未弱化。
    expect(结果.rows[0].checksum).toBe(计算迁移校验和(SQL))
  })

  it('库内只剩二值：角色.性别 与 挑战对局.玩家性别/对象性别 无第三种写法', async () => {
    const 角色域 = await 池.query('SELECT "性别" FROM "角色" GROUP BY 1')
    expect(角色域.rows.map((行) => 行.性别).sort()).toEqual(['nan', 'nv'])
    const 角色残留 = await 池.query(
      `SELECT count(*)::int AS n FROM "角色" WHERE "性别" NOT IN ('nan','nv')`,
    )
    expect(角色残留.rows[0].n).toBe(0)
    const 对局残留 = await 池.query(
      `SELECT count(*)::int AS n FROM "挑战对局"
        WHERE "玩家性别" NOT IN ('nan','nv') OR "对象性别" NOT IN ('nan','nv')`,
    )
    expect(对局残留.rows[0].n).toBe(0)
  })

  it('三列 CHECK 与两个归一触发器都已生效，且列宽已放宽到可容纳 nan', async () => {
    const 约束 = await 池.query(
      `SELECT conname FROM pg_constraint WHERE conname IN
         ('ck_角色_性别','ck_挑战对局_玩家性别','ck_挑战对局_对象性别')`,
    )
    expect(约束.rows.map((行) => 行.conname).sort()).toEqual(
      ['ck_挑战对局_对象性别', 'ck_挑战对局_玩家性别', 'ck_角色_性别'].sort(),
    )
    const 触发器 = await 池.query(
      `SELECT tgname FROM pg_trigger
        WHERE tgname IN ('trg_角色_归一性别','trg_挑战对局_归一性别')`,
    )
    expect(触发器.rows.map((行) => 行.tgname).sort()).toEqual(
      ['trg_挑战对局_归一性别', 'trg_角色_归一性别'].sort(),
    )
    const 列宽 = await 池.query(
      `SELECT column_name, character_maximum_length AS 长 FROM information_schema.columns
        WHERE table_name = '挑战对局' AND column_name IN ('玩家性别','对象性别')`,
    )
    for (const 行 of 列宽.rows) {
      expect(行.长).toBeGreaterThanOrEqual(10)
    }
  })

  it('SQL 侧归一函数与 TS 侧逐写法一致（真跑函数）', async () => {
    const 参数 = 六种写法.map((项) => 项[0]).concat([' NV ', 'Zzz'])
    const 结果 = await 池.query(
      `SELECT v, hanShu_xingBieErZhi(v) AS g FROM (SELECT unnest($1::text[]) AS v) t`,
      [参数],
    )
    expect(结果.rows.map((行) => 行.g)).toEqual([
      'nan',
      'nan',
      'nan',
      'nv',
      'nv',
      'nv',
      'nv',
      'nan',
    ])
    expect(解析性别('Zzz')).toBeNull()
  })

  it('触发器把旧镜像仍会写入的 男/女 就地归一（不报错、不留第三种写法）', async () => {
    const 客户端 = await 池.connect()
    try {
      await 客户端.query('BEGIN')
      const 甲 = await 客户端.query(
        `INSERT INTO "角色" ("用户ID","名字","性别","封存")
         VALUES ($1,$2,$3,TRUE)
         RETURNING "性别"`,
        [夹具用户ID, `fp13-${夹具后缀}-探针-女`, '女'],
      )
      const 乙 = await 客户端.query(
        `INSERT INTO "挑战对局" ("用户ID","角色ID","玩家性别","对象性别","状态")
         VALUES ($1,$2,$3,$4,'已结束')
         RETURNING "玩家性别","对象性别"`,
        [夹具用户ID, 夹具角色ID, '男', '女'],
      )
      await 客户端.query('ROLLBACK')
      expect(甲.rows[0].性别).toBe('nv')
      expect(乙.rows[0].玩家性别).toBe('nan')
      expect(乙.rows[0].对象性别).toBe('nv')
    } finally {
      客户端.release()
    }
  })

  it('漏传性别不被洗成 nan，仍由 NOT NULL 拒绝', async () => {
    const 客户端 = await 池.connect()
    try {
      await 客户端.query('BEGIN')
      let 错误: unknown = null
      try {
        await 客户端.query(
          `INSERT INTO "角色" ("用户ID","名字","性别","封存")
           VALUES ($1,$2,NULL,TRUE)`,
          [夹具用户ID, `fp13-${夹具后缀}-探针-NULL`],
        )
      } catch (捕获) {
        错误 = 捕获
      }
      await 客户端.query('ROLLBACK')
      expect((错误 as { code?: string })?.code).toBe('23502')
    } finally {
      客户端.release()
    }
  })

  it('绕过触发器直写第三种写法必须被 CHECK 拒绝（23514）', async () => {
    const 客户端 = await 池.connect()
    try {
      await 客户端.query('BEGIN')
      await 客户端.query('DROP TRIGGER trg_角色_归一性别 ON "角色"')
      let 错误: unknown = null
      try {
        await 客户端.query(
          `INSERT INTO "角色" ("用户ID","名字","性别","封存")
           VALUES ($1,$2,$3,TRUE)`,
          [夹具用户ID, `fp13-${夹具后缀}-探针-CHECK`, '女'],
        )
      } catch (捕获) {
        错误 = 捕获
      }
      await 客户端.query('ROLLBACK')
      expect(错误, '第三种写法未被 CHECK 拦截').toBeTruthy()
      expect((错误 as { code?: string }).code).toBe('23514')
    } finally {
      客户端.release()
    }
  })

  it('重复执行迁移：三张表行数不变且不报错（幂等，整段回滚）', async () => {
    const 取量 = () =>
      池.query(
        `SELECT (SELECT count(*) FROM "角色") AS j,
                (SELECT count(*) FROM "挑战对局") AS t,
                (SELECT count(*) FROM "游戏档案") AS a`,
      )
    const 前 = (await 取量()).rows[0]
    const 客户端 = await 池.connect()
    try {
      await 客户端.query('BEGIN')
      await 客户端.query(SQL)
      await 客户端.query('ROLLBACK')
    } finally {
      客户端.release()
    }
    const 后 = (await 取量()).rows[0]
    expect(后).toEqual(前)
  })

  it('同一角色：清洗前公式判成 nan、清洗后 AI输入准备 判成 nv（缺陷对照）', async () => {
    const 样本 = await 池.query('SELECT "ID" FROM "角色" WHERE "ID" = $1', [夹具角色ID])
    expect(样本.rows).toHaveLength(1)
    const 角色Id = String(样本.rows[0].ID)
    // 旧实现：`存储值 === '女' ? 'nv' : 'nan'` —— 对库内规范形态 nv 判成男性
    const 旧公式 = (存储值: unknown): 'nan' | 'nv' => (存储值 === '女' ? 'nv' : 'nan')
    expect(旧公式('nv')).toBe('nan')

    peiZhi.shuJuKuLianJie = 取可连通连接串()
    const { huoQuAIJiaoSeXinXi } = await import('../../src/services/AI输入准备')
    const 人设 = await huoQuAIJiaoSeXinXi(角色Id)
    expect(人设).not.toBeNull()
    expect(人设!.xing_bie).toBe('nv')
    expect(人设!.ba_da_mo_kuai.ji_ben_xin_xi).toContain('女')
  })
})
