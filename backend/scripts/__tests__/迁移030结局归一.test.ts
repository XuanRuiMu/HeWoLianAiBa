import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { peiZhi } from '../../src/config'
import { fanYi } from '../../src/config/translations'
import { 结局枚举列表, 结局翻译键一致, 解析结局类型, 解析落库枚举 } from '../../src/utils/结局'
import { 计算迁移校验和 } from '../迁移器'
import { 归一游戏结局结果状态 } from '../归一游戏结局结果状态'

/**
 * 迁移 030（游戏结局.结果状态 钉枚举键）+ 归一脚本 测试。
 *
 * A 组无库依赖：CHECK 的字面量取值集合必须与 `translations.jieJu` 键集合、
 *   `utils/结局.结局枚举列表` **三处全等** —— 这条等式就是「加结局时漏改约束」的红灯，
 *   也是 030 允许落 SQL 字面量而不另设第二真源的唯一代价对冲。
 *   同时钉住「归一脚本不得在 TS 侧另抄一份文案映射」「030 的先清洗后加约束顺序保护」。
 * B 组真连现网库（连不上整组跳过，不伪造通过）：台账登记与校验和、库内枚举键不变量、
 *   CHECK 真实拒写中文文案与 jinxing_zhong、放行合法枚举键、归一后读取走枚举快路径。
 * C 组自建临时库（自己 CREATE、自己 DROP，不碰现网库一个字节）：归一脚本幂等 +
 *   逐项映射 + 无法识别者不猜 + 030 在脏库上必拒、清洗后必成。
 */

const 后端根目录 = resolve(__dirname, '..', '..')
const 迁移目录 = resolve(后端根目录, 'database', 'migrations')
const 迁移文件 = resolve(迁移目录, '030_游戏结局结果状态钉枚举键.sql')
const SQL = readFileSync(迁移文件, 'utf-8')
const 脚本文件 = resolve(后端根目录, 'scripts', '归一游戏结局结果状态.ts')
const 脚本源码 = readFileSync(脚本文件, 'utf-8')
const 建库根目录 = resolve(后端根目录, '..', 'database')
const 约束名 = 'ck_游戏结局_结果状态'

/** 剥掉块注释与 `--` 行注释：030 的表头注释里逐字引用了归一前的中文文案，不得被当成 SQL 主体 */
function 取正文(来源: string): string {
  return 来源.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '')
}

/** 剥掉块注释与 `//` 行注释（脚本源码无 URL 字面量，故 `//` 只可能是注释） */
function 取脚本正文(来源: string): string {
  return 来源.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

function 取值域(来源: string): string[] {
  return [...来源.matchAll(/'([^']*)'/g)].map((项) => 项[1])
}

/** 从 SQL 主体里抽出那条 CHECK 的取值字面量 */
function 抽取CHECK值域(来源: string): string[] {
  const 匹配 = /CHECK \("结果状态" IN \(([\s\S]*?)\)\s*\)/.exec(来源)
  expect(匹配, '030 里找不到 CHECK ("结果状态" IN ...) 子句').toBeTruthy()
  const 值列表 = 匹配 ? 匹配[1] : ''
  return 取值域(值列表)
}

/** 库内定义被 Postgres 归一成 `= ANY (ARRAY[...]::text[])` 形态，按 ::character varying 尾巴抽取值 */
function 抽取库内约束值域(定义: string): string[] {
  return [...定义.matchAll(/'([^']*)'::character varying/g)].map((项) => 项[1])
}

const 正文 = 取正文(SQL)
const CHECK值域 = 抽取CHECK值域(正文)

/** 全部已知结局文案：当前中性文案 + 性别变体文案 + 文案改版前的 `胜利-/失败-` 前缀 */
const 全部中性文案 = Object.values(fanYi.jieJu)
const 全部性别变体文案 = Object.entries(fanYi.xingBieBianTi)
  .filter(([组合键]) => 组合键.startsWith('jieJu.'))
  .map(([, 文案]) => 文案)

/** 真库可达连接串：与 迁移024性别归一.test.ts 同口径（不新抄任何凭据） */
function 取可连通连接串(库名?: string): string {
  const 显式 = (process.env.TEST_DATABASE_URL ?? '').trim()
  const 基 = 显式 !== ''
    ? 显式
    : process.env.XU_KE_ZHEN_SHI_WAI_HU === 'true'
      ? String(peiZhi.shuJuKuLianJie ?? '')
      : ''
  const 换主机 = 基.includes('@postgres:') ? 基.replace('@postgres:', '@127.0.0.1:') : 基
  if (!库名) return 换主机
  return 换主机.replace(/\/[^/?#]*(\?.*)?$/, `/${库名}$1`)
}

async function 取池(连接串: string): Promise<Pool | null> {
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

const 现网池 = await 取池(取可连通连接串())
const 管理池 = 现网池 === null ? null : await 取池(取可连通连接串('postgres'))
const 有真库 = 现网池 !== null && 管理池 !== null
const 现网夹具后缀 = randomUUID().replace(/-/g, '').slice(0, 12)
const 现网夹具手机号 = `19${randomUUID().replace(/\D/g, '').padEnd(9, '0').slice(0, 9)}`
let 现网夹具用户ID = ''
let 现网夹具结局ID = ''
const 后缀 = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
const 已建库: string[] = []

beforeAll(async () => {
  if (!现网池) return
  const 用户 = await 现网池.query(
    `INSERT INTO "用户" ("手机号", "用户名", "昵称", "测试")
     VALUES ($1, $2, $3, TRUE) RETURNING "ID"`,
    [现网夹具手机号, `fp30-${现网夹具后缀}`, `fp30-${现网夹具后缀}`],
  )
  现网夹具用户ID = String(用户.rows[0].ID)
  const 结局 = await 现网池.query(
    `INSERT INTO "游戏结局" ("用户ID", "结果状态", "摘要")
     VALUES ($1, 'sheng_li_ai_qing', '{}'::jsonb) RETURNING "ID"`,
    [现网夹具用户ID],
  )
  现网夹具结局ID = String(结局.rows[0].ID)
})

async function 建临时库(用途: string): Promise<Pool | null> {
  if (管理池 === null) return null
  const 库名 = `fp30_${用途}_${后缀}`.slice(0, 60).toLowerCase()
  await 管理池.query(`CREATE DATABASE "${库名}"`)
  已建库.push(库名)
  return new Pool({ connectionString: 取可连通连接串(库名), max: 1 })
}

/**
 * C 组夹具：baseline 铺出一张**未归一**的 游戏结局（无 CHECK，正是 030 落地前的现网形态），
 * 存量覆盖三层识别表的每一层：枚举键 / 当前中性文案 / 当前性别变体文案 / 历史 `失败-` 文案，
 * 外加一种故意认不出的脏值。建不起来就让整个文件红掉，不降级成静默跳过。
 */
const 存量: Array<{ 存储值: string; 期望枚举键: string | null }> = [
  { 存储值: '在一起了 💕', 期望枚举键: 'sheng_li_ai_qing' },
  { 存储值: '被渣型骗了', 期望枚举键: 'shi_bai_bei_qi_pian' },
  { 存储值: '被渣女骗了', 期望枚举键: 'shi_bai_bei_qi_pian' },
  { 存储值: '识破渣男', 期望枚举键: 'sheng_li_shi_po' },
  { 存储值: '失败-被欺骗', 期望枚举键: 'shi_bai_bei_qi_pian' },
  { 存储值: 'sheng_li_ai_qing', 期望枚举键: 'sheng_li_ai_qing' },
  { 存储值: '压根没登记过的结局值', 期望枚举键: null },
]

let 临时池: Pool | null = null
let 临时用户ID = ''
const 临时用户手机号 = `17${randomUUID().replace(/\D/g, '').padEnd(9, '0').slice(0, 9)}`

if (有真库) {
  临时池 = await 建临时库('clean')
  if (临时池 !== null) {
    await 临时池.query(readFileSync(resolve(建库根目录, '000_baseline.sql'), 'utf-8'))
    const 建用户 = await 临时池.query(
      `INSERT INTO "用户" ("手机号") VALUES ($1) RETURNING "ID"`,
      [临时用户手机号],
    )
    临时用户ID = String(建用户.rows[0].ID)
    for (const 项 of 存量) {
      await 临时池.query(
        `INSERT INTO "游戏结局" ("用户ID", "结果状态") VALUES ($1, $2)`,
        [临时用户ID, 项.存储值],
      )
    }
  }
}

/** 临时库 max:1，但事务语义仍要显式钉在同一个 client 上：BEGIN / SQL / ROLLBACK 不得散到不同连接 */
async function 在回滚事务里跑(池: Pool, 语句: string): Promise<unknown> {
  const 客户端 = await 池.connect()
  try {
    await 客户端.query('BEGIN')
    let 错误: unknown = null
    try {
      await 客户端.query(语句)
    } catch (捕获) {
      错误 = 捕获
    }
    await 客户端.query('ROLLBACK')
    return 错误
  } finally {
    客户端.release()
  }
}

const 有临时库 = 临时池 !== null

afterAll(async () => {
  if (现网池) {
    if (现网夹具结局ID) await 现网池.query('DELETE FROM "游戏结局" WHERE "ID" = $1', [现网夹具结局ID])
    if (现网夹具用户ID) await 现网池.query('DELETE FROM "用户" WHERE "ID" = $1', [现网夹具用户ID])
    await 现网池.end().catch(() => undefined)
  }
  if (临时池) await 临时池.end().catch(() => undefined)
  if (管理池) {
    for (const 库名 of 已建库) {
      await 管理池.query(`DROP DATABASE IF EXISTS "${库名}"`).catch(() => undefined)
    }
    await 管理池.end().catch(() => undefined)
  }
})

describe('迁移 030 的 CHECK 值域与唯一真源三处全等（无库依赖）', () => {
  it('迁移文件按 030 号位落在 database/migrations，且号位不重复', () => {
    expect(迁移文件.replace(/\\/g, '/')).toContain('database/migrations/030_')
    const 版本 = readdirSync(迁移目录)
      .filter((名) => 名.endsWith('.sql'))
      .map((名) => 名.split('_')[0])
    expect(new Set(版本).size).toBe(版本.length)
    expect(版本).toContain('030')
    expect(Math.max(...版本.map(Number))).toBeGreaterThanOrEqual(30)
  })

  it('CHECK 允许集合 === 结局枚举列表 === translations.jieJu 键集合（同序同集合，不多不少）', () => {
    expect(结局翻译键一致).toBe(true)
    expect([...CHECK值域].sort()).toEqual([...结局枚举列表].sort())
    expect([...CHECK值域].sort()).toEqual(Object.keys(fanYi.jieJu).sort())
    expect(CHECK值域).toHaveLength(14)
    expect(new Set(CHECK值域).size).toBe(CHECK值域.length)
  })

  it('读取态哨兵 jinxing_zhong 与一切展示文案都不在允许集合内', () => {
    expect(CHECK值域).not.toContain('jinxing_zhong')
    for (const 文案 of [...全部中性文案, ...全部性别变体文案]) {
      expect(CHECK值域).not.toContain(文案)
    }
  })

  it('允许集合的每个成员都放得进落库列 VARCHAR(50)（030 不改列宽，故长度必须自证）', () => {
    for (const 键 of CHECK值域) {
      expect(键.length).toBeLessThanOrEqual(50)
    }
    expect(正文).not.toMatch(/ALTER COLUMN/i)
  })

  it('先清洗后加约束：脏值残留时 ADD CONSTRAINT 的 check_violation 被转成指名脚本的报错', () => {
    expect(正文).toContain('EXCEPTION')
    expect(正文).toContain('WHEN check_violation THEN')
    expect(正文).toContain('归一游戏结局结果状态.ts')
    // 报错文案必须是单个字符串字面量：plpgsql 的 RAISE 不接受 `||` 或相邻字面量拼接（实测 syntax error）
    expect(正文).toMatch(/RAISE EXCEPTION '030：[^']*归一游戏结局结果状态\.ts[^']*';/)
  })

  it('幂等与容错结构：DROP CONSTRAINT IF EXISTS + to_regclass 存在性守卫', () => {
    expect(正文).toContain(`DROP CONSTRAINT IF EXISTS "${约束名}"`)
    expect(正文).toContain(`ADD CONSTRAINT "${约束名}"`)
    expect(正文).toContain(`to_regclass('public."游戏结局"')`)
  })

  it('数据安全：030 只做 DDL，不 UPDATE/DELETE/TRUNCATE，也不越界改别的表', () => {
    expect(正文).not.toMatch(/\bUPDATE\b/i)
    expect(正文).not.toMatch(/\bDELETE\b/i)
    expect(正文).not.toMatch(/\bTRUNCATE\b/i)
    expect(正文).not.toMatch(/DROP\s+TABLE/i)
    expect(正文).not.toMatch(/DROP\s+COLUMN/i)
    expect(正文.match(/ALTER TABLE\s+"([^"]+)"/g)?.sort()).toEqual([
      `ALTER TABLE "游戏结局"`,
      `ALTER TABLE "游戏结局"`,
    ])
  })

  it('归一脚本不另抄映射：识别全部走 utils/结局，正文里没有任何结局展示文案', () => {
    const 脚本正文 = 取脚本正文(脚本源码)
    expect(脚本正文).toContain(`from '../src/utils/结局'`)
    expect(脚本正文).toContain('解析落库枚举')
    for (const 文案 of [...全部中性文案, ...全部性别变体文案]) {
      expect(脚本正文).not.toContain(文案)
    }
    expect(脚本正文).not.toContain('胜利-')
    expect(脚本正文).not.toContain('失败-')
    // 也不许出现第二份枚举键清单：脚本只 import，不内联
    for (const 键 of CHECK值域) {
      expect(脚本正文).not.toContain(`'${键}'`)
    }
  })

  it('归一脚本参数化改写且幂等（谓词只命中被改写的原值，第二次跑命不中任何行）', () => {
    const 脚本正文 = 取脚本正文(脚本源码)
    expect(脚本正文).toContain(`UPDATE "游戏结局" SET "结果状态" = $1 WHERE "结果状态" = $2`)
    expect(脚本正文).not.toMatch(/SET "结果状态" = '([^']*)'/)
    expect(脚本正文).not.toMatch(/\bDELETE\b/i)
    expect(脚本正文).not.toMatch(/\bTRUNCATE\b/i)
  })

  it('清洗用的识别口无兜底：认不出返回 null，而不是静默改成一个结局', () => {
    expect(解析落库枚举('压根没登记过的结局值')).toBeNull()
    expect(解析落库枚举('')).toBeNull()
    expect(解析结局类型('压根没登记过的结局值', true)).toBe('shi_bai_hao_gan_du_gui_ling')
  })

  it('枚举键走的是识别表的第一个分支（快路径），不经任何文案映射', () => {
    for (const 键 of CHECK值域) {
      expect(解析落库枚举(键)).toBe(键)
      expect(解析结局类型(键, true)).toBe(键)
      expect(解析结局类型(键, false)).toBe(键)
    }
  })
})

describe.skipIf(!有真库)('迁移 030 在现网库的落地证据（真库）', () => {
  const 池 = 现网池 as Pool

  it('台账登记 030 且校验和与磁盘文件一致（防 L-01 那类台账漂移）', async () => {
    const 结果 = await 池.query(
      'SELECT checksum FROM "schema_migrations" WHERE version = $1',
      ['030'],
    )
    expect(结果.rows, '030 未进台账：迁移没跑过').toHaveLength(1)
    expect(结果.rows[0].checksum).toBe(计算迁移校验和(SQL))
  })

  it('库内只剩枚举键：结果状态 零残留，且中文显示文案一行都不剩', async () => {
    const 域 = await 池.query('SELECT "结果状态" FROM "游戏结局" GROUP BY 1')
    const 值集合 = 域.rows.map((行) => String(行.结果状态))
    expect(值集合.length).toBeGreaterThan(0)
    for (const 值 of 值集合) {
      expect(CHECK值域).toContain(值)
    }
    const 残留 = await 池.query(
      `SELECT count(*)::int AS n FROM "游戏结局" WHERE "结果状态" NOT IN (
         'sheng_li_ai_qing','sheng_li_hu_shan_sheng_li','sheng_li_shi_po','sheng_li_shen_jing_bing',
         'shi_bai_guo_zao_biao_bai','shi_bai_hu_shan_shi_bai','shi_bai_cuo_wu_shi_po',
         'shi_bai_hao_gan_du_gui_ling','shi_bai_ju_jue_biao_bai','shi_bai_bei_qi_pian',
         'shi_bai_bei_zha_xing_qi_pian','shi_bai_shen_jing_bing','shi_bai_fang_qi_tiao_zhan',
         'shi_bai_mian_da_rao')`,
    )
    expect(残留.rows[0].n).toBe(0)
    const 旧文案 = await 池.query(
      `SELECT count(*)::int AS n FROM "游戏结局" WHERE "结果状态" = ANY($1::text[])`,
      [[...全部中性文案, ...全部性别变体文案, '失败-被欺骗', '进行中']],
    )
    expect(旧文案.rows[0].n).toBe(0)
  })

  it('CHECK 已生效且取值集合与 030 字面量逐字一致（库内定义被 Postgres 归一成 = ANY(ARRAY[...])）', async () => {
    const 约束 = await 池.query(
      `SELECT conname, convalidated, pg_get_constraintdef(oid) AS def FROM pg_constraint
        WHERE conname = $1 AND conrelid = '游戏结局'::regclass`,
      [约束名],
    )
    expect(约束.rows).toHaveLength(1)
    expect(约束.rows[0].convalidated).toBe(true)
    expect([...抽取库内约束值域(String(约束.rows[0].def))].sort()).toEqual([...CHECK值域].sort())
  })

  it('中文文案与 jinxing_zhong 都被 CHECK 拒绝（23514），合法枚举键放行', async () => {
    const 客户端 = await 池.connect()
    try {
      await 客户端.query('BEGIN')
      const 探针 = async (值: string): Promise<string | undefined> => {
        let 错误: unknown = null
        try {
          await 客户端.query(
            `INSERT INTO "游戏结局" ("用户ID", "角色ID", "结果状态", "摘要")
             VALUES ($1, NULL, $2, '{}'::jsonb)
             ON CONFLICT ("用户ID", "角色ID") DO NOTHING`,
            [现网夹具用户ID, 值],
          )
        } catch (捕获) {
          错误 = 捕获
        }
        await 客户端.query('ROLLBACK TO SAVEPOINT sp').catch(() => undefined)
        return (错误 as { code?: string })?.code
      }
      // 探针前置 savepoint：一次失败不污染整个事务，后续用例还能接着跑
      await 客户端.query('SAVEPOINT sp')
      expect(await 探针('在一起了 💕'), '归一前的中性文案仍写得进去').toBe('23514')
      await 客户端.query('SAVEPOINT sp')
      expect(await 探针('被渣女骗了'), '性别变体文案仍写得进去').toBe('23514')
      await 客户端.query('SAVEPOINT sp')
      expect(await 探针('失败-被欺骗'), '历史文案仍写得进去').toBe('23514')
      await 客户端.query('SAVEPOINT sp')
      expect(await 探针('jinxing_zhong'), '读取侧哨兵被判成合法落库值').toBe('23514')
      await 客户端.query('SAVEPOINT sp')
      expect(await 探针('shi_bai_mian_da_rao'), '合法枚举键被误拒').toBeUndefined()
      await 客户端.query('ROLLBACK')
    } finally {
      客户端.release()
    }
  })

  it('归一后的真库值全部走枚举键快路径，不再依赖文案兜底', async () => {
    const 域 = await 池.query('SELECT "结果状态" FROM "游戏结局" GROUP BY 1')
    for (const 行 of 域.rows) {
      const 值 = String(行.结果状态)
      expect(解析落库枚举(值)).toBe(值)
      for (const 是否封存 of [true, false]) {
        expect(解析结局类型(值, 是否封存)).toBe(值)
      }
    }
  })
})

describe.skipIf(!有临时库)('归一脚本与 030 的顺序保护（自建临时库，不碰现网数据）', () => {
  const 池 = 临时池 as Pool

  it('存量含中文文案时 030 必拒，并指名清洗脚本', async () => {
    const 错误 = await 在回滚事务里跑(池, SQL)
    expect(错误, '脏库上 030 竟然加上了 CHECK').toBeTruthy()
    expect(String((错误 as { message?: string }).message)).toContain('归一游戏结局结果状态.ts')
    const 约束 = await 池.query('SELECT conname FROM pg_constraint WHERE conname = $1', [约束名])
    expect(约束.rows, '030 失败却留下了半个约束').toHaveLength(0)
  })

  it('归一脚本按三层识别表逐项改写，无法识别者保持原值并上报', async () => {
    const 客户端 = await 池.connect()
    let 计数: Awaited<ReturnType<typeof 归一游戏结局结果状态>>
    try {
      计数 = await 归一游戏结局结果状态(客户端)
    } finally {
      客户端.release()
    }
    expect(计数.扫描行数).toBe(存量.length)
    expect(计数.跳过行数).toBe(1)
    expect(计数.改写行数).toBe(存量.length - 2)
    expect(计数.逐项.filter((项) => 项.目标枚举键 === null).map((项) => 项.存储值)).toEqual([
      '压根没登记过的结局值',
    ])
    for (const 项 of 计数.逐项) {
      const 期望 = 存量.find((存) => 存.存储值 === 项.存储值)
      expect(期望, `脚本吐出了存量之外的值 ${项.存储值}`).toBeTruthy()
      expect(项.目标枚举键).toBe(期望!.期望枚举键)
    }
    const 域 = await 池.query('SELECT "结果状态" FROM "游戏结局" GROUP BY 1 ORDER BY 1')
    expect(域.rows.map((行) => String(行.结果状态)).sort()).toEqual(
      ['sheng_li_ai_qing', 'sheng_li_shi_po', 'shi_bai_bei_qi_pian', '压根没登记过的结局值'].sort(),
    )
  })

  it('幂等：第二次跑改写 0 行，跳过全部已归一行', async () => {
    const 客户端 = await 池.connect()
    let 第二次: Awaited<ReturnType<typeof 归一游戏结局结果状态>>
    try {
      第二次 = await 归一游戏结局结果状态(客户端)
    } finally {
      客户端.release()
    }
    expect(第二次.改写行数).toBe(0)
    expect(第二次.跳过行数).toBe(存量.length - 1)
    expect(第二次.扫描行数).toBe(存量.length)
  })

  it('仍有无法识别行时 030 依旧必拒；清掉脏值后 030 加上且重复执行结果一致', async () => {
    const 错误 = await 在回滚事务里跑(池, SQL)
    expect(错误, '无法识别的脏值还在，030 却加上了 CHECK').toBeTruthy()

    await 池.query(`DELETE FROM "游戏结局" WHERE "结果状态" = $1`, ['压根没登记过的结局值'])
    const 客户端 = await 池.connect()
    try {
      await 客户端.query(SQL)
      await 客户端.query(SQL)
    } finally {
      客户端.release()
    }
    const 约束 = await 池.query(
      `SELECT convalidated, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`,
      [约束名],
    )
    expect(约束.rows).toHaveLength(1)
    expect(约束.rows[0].convalidated).toBe(true)
    expect([...抽取库内约束值域(String(约束.rows[0].def))].sort()).toEqual([...CHECK值域].sort())
    await expect(
      池.query(`INSERT INTO "游戏结局" ("用户ID", "结果状态") VALUES ($1, $2)`, [
        临时用户ID,
        '在一起了 💕',
      ]),
    ).rejects.toMatchObject({ code: '23514' })
    const 行数 = await 池.query('SELECT count(*)::int AS n FROM "游戏结局"')
    expect(行数.rows[0].n).toBe(存量.length - 1)
  })
})
