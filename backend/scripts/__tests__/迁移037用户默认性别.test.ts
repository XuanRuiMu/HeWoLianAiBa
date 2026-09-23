import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { peiZhi } from '../../src/config'
import {
  性别内部形态列表,
  性别合法写法,
  内部转用户形态,
  解析性别,
} from '../../src/utils/性别'
import { 计算迁移校验和 } from '../迁移器'

/**
 * FP-15a（需求 #16 的数据层前置）迁移 037 `用户.默认性别`（+ 同批收口 `图片授权`）测试。
 *
 * A 组无库依赖：037 声明的值域必须**由 utils/性别 这一个真源导出**（不新造第二套字面量）；
 *   列定义必须与 baseline 里 `目标性别` 列的实际定义**逐 token 同族**（比对基准取自 baseline，不是本文件抄的字符串；
 *   FP-28b 起基准由 `性别` 换到 `目标性别`——`用户.性别` 是 FP-28 判定的死列；
 *   FP-28c 已把它从两份建表脚本与库中**真删**（迁移 038 `DROP COLUMN IF EXISTS`），
 *   拿待删列当基准会让删列当天只产生假红灯；B 组的库侧同族比对同口径换列）；
 *   幂等结构与「纯增量」边界；头注释的 旧→新 与 删除语义 段必须在位（文档存在性检查，非行为代理）。
 *   FP-28c 追加：`期望用户列`/`静态口径自证` 的列数由 24 → 23（少的正是 `性别`），
 *   「删列反证」的夹具由**删向**翻为**删向(仍在位的两列) + 回流向**双向（对已删列构造删向变异在物理上
 *   已不可能，夹具自身会抛＝设计好的失效红灯）；B 组的现网路径现在会重放到 038，故逐列全等同时钉住
 *   「库内确实没有 性别」这一事实（静态模型不减 DROP 也对得上，因为真库跑了 DROP）。
 *   FP-28d 追加（2026-09-23，第六轮裁定②）：上条 28c 成对回退 —— 管理端已提交版本仍读 `用户.性别`、
 *   容器启动自动迁移链会 DROP 该列打挂管理端 ⇒ 038 移入 `migrations/pending/`（顶层非递归 + `.sql`
 *   过滤不进链；本文件 `迁移列定义`/`迁移清单` 同口径），baseline 成对回带 `性别`：
 *   `期望用户列`/`静态口径自证` 翻回 24（含 `性别`、`toContain('性别')`），「删列反证」③ 由
 *   「已删列回流必红」翻回**删向**（`基线用户列.has('性别')` false → true、三列全在位 + 加回防空判），
 *   B 组现网路径重放的顶层链已不含 038 ⇒ 库内含 `性别`、与静态收敛态仍逐列全等；
 *   放行条件见证据文件 `.agents/evidence/traces/FP-28d放行条件-20260923.md`。
 * B 组真连库（连不上整组跳过，不伪造通过）：**只连自建临时库** `fp15a_verify_*`，
 *   自己 CREATE、afterAll 无条件 DROP，对 `lovewithme` 主库零建表/零改表/零台账写入
 *   （PROGRESS L-02：本地库与「恋爱吧管理中心」共用）；迁移链一律跳过 034（禁止执行也禁止修改）。
 *   现网真实路径 = `database/000_baseline.sql` + `database/001_haoyou_yu_shezhi.sql`（compose 挂的
 *   就是 ./database 整个目录）+ 顺序重放 migrations；逐列比对库内实际列集合与静态解析的收敛态。
 *   另外覆盖两种起点：列已在位（baseline 建的库）重复执行 037 零变更；列缺失（老库，用 DROP COLUMN
 *   在临时库里模拟）执行 037 必须补齐且定义与 baseline 一致。
 */

const 后端根 = resolve(__dirname, '..', '..')
const 仓库根 = resolve(后端根, '..')
const 迁移目录 = resolve(后端根, 'database', 'migrations')
const 迁移文件 = resolve(迁移目录, '037_用户默认性别.sql')
const 基线路径 = resolve(仓库根, 'database', '000_baseline.sql')
const 全量夹具路径 = resolve(仓库根, 'database', '001_haoyou_yu_shezhi.sql')

/** 034 是用户自测提权脚本（L-02），任何情况下都不执行 */
const 跳过迁移 = /^034_/

function 读(路径: string): string {
  return readFileSync(路径, 'utf-8').replace(/\r\n/g, '\n')
}

/** 去掉 `--` 行注释后的**语句体**：结构性负面断言（无 UPDATE/DELETE/CHECK…）只能在语句体上做，
 *  否则会命中本迁移头注释里对这些词的中性提及（头注释按验收要求必须写清 旧→新 / 值域 / 删除语义）。 */
function 去注释(源: string): string {
  return 源.replace(/^\s*--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

const SQL = 读(迁移文件)
const 语句体 = 去注释(SQL)
const 基线源 = 读(基线路径)

/** 取 `CREATE TABLE IF NOT EXISTS "表名" (...)` 内每列的**定义文本**（不含列名），供逐 token 比对 */
function 建表列定义(源: string, 表名: string): Map<string, string> {
  const 头 = new RegExp(`CREATE TABLE IF NOT EXISTS "${表名}" [(]`).exec(源)
  if (!头) throw new Error(`找不到 ${表名} 的建表语句`)
  let 位置 = 头.index + 头[0].length
  let 深度 = 1
  let 段起 = 位置
  const 段: string[] = []
  for (; 位置 < 源.length; 位置++) {
    const 字 = 源[位置]
    if (字 === '(') 深度++
    else if (字 === ')') {
      深度--
      if (深度 === 0) {
        段.push(源.slice(段起, 位置))
        break
      }
    } else if (字 === ',' && 深度 === 1) {
      段.push(源.slice(段起, 位置))
      段起 = 位置 + 1
    }
  }
  const 表 = new Map<string, string>()
  for (const 原始行 of 段) {
    const 行 = 原始行.trim()
    const 命 = /^"([^"]+)"/.exec(行)
    if (命) 表.set(命[1], 行.slice(命[0].length).trim())
  }
  return 表
}

/**
 * 内存变异夹具：把某表建表语句里某一列的**整行定义**删掉，返回变异后的全文。
 * 只用于删列反证（不落盘、不改仓库文件）。取不到该列即抛 —— 抛错本身就是红灯。
 */
function 删用户列定义(源: string, 表名: string, 列名: string): string {
  const 表体 = new RegExp(`CREATE TABLE IF NOT EXISTS "${表名}" [\\s\\S]*?\\n\\);`).exec(源)?.[0] ?? ''
  if (表体 === '') throw new Error(`找不到 ${表名} 的建表语句，变异夹具不成立`)
  const 变异表体 = 表体.replace(new RegExp(`^[ \\t]*"${列名}"[^\\n]*\\n`, 'm'), '')
  if (变异表体 === 表体) {
    throw new Error(
      `${表名} 里取不到 ${列名} 的定义行 ⇒ 变异夹具失效（FP-28c 已删该列？本用例的列清单需同步改判）`,
    )
  }
  return 源.replace(表体, () => 变异表体)
}

/**
 * 变异夹具的**反方向**（FP-28c 新增）：把一整行列定义插回 用户 建表语句开头。
 * 28c 曾用它做「已删列回流 baseline 必红」（当时 038 已删 性别、"删 性别" 夹具物理上不可构造）；
 * 【FP-28d】038 已移入 pending/、baseline 成对回带 性别 ⇒ "删 性别" 夹具重新可构造（清单翻回三列），
 * 本函数改回 28b 原职：删后按原样加回 ⇒ 键集必须精确回到在位态（防空判）。只在内存里造，不落盘。
 */
function 加回用户列定义(源: string, 定义行: string): string {
  const 头 = new RegExp(`CREATE TABLE IF NOT EXISTS "用户" [(]\\n`).exec(源)
  if (!头) throw new Error('找不到 baseline 的 用户 建表语句左括号 ⇒ 变异夹具不成立')
  const 起点 = 头.index + 头[0].length
  const 变异源 = `${源.slice(0, 起点)}${定义行}\n${源.slice(起点)}`
  if (变异源 === 源) throw new Error('变异夹具没生效')
  return 变异源
}

/**
 * 迁移目录里对某表的全部 ADD COLUMN（列名 → 定义文本）。
 * 【FP-15a 修正旧正则】原写法 `ALTER TABLE "表" ADD COLUMN` 要求同一行，
 * 而 002/022 用的是 `ALTER TABLE "用户"\nADD COLUMN ...` 换行形态 ⇒ 那三列从未被计入，
 * 「两方一致」判定长期偏乐观。这里按空白（含换行）匹配，判定维度只增不减。
 */
function 迁移列定义(表名: string): Map<string, string> {
  const 表 = new Map<string, string>()
  for (const 文件 of readdirSync(迁移目录).sort()) {
    if (!文件.endsWith('.sql') || 跳过迁移.test(文件)) continue
    // 只看语句体：把 `ALTER TABLE ... ADD COLUMN` 整行注释掉不算补列依据（M4 反证发现的空判面）
    const 源 = 去注释(读(resolve(迁移目录, 文件)))
    const 模式 = new RegExp(
      `ALTER TABLE "${表名}"\\s+ADD COLUMN (?:IF NOT EXISTS )?"([^"]+)"([^;]*);`,
      'g',
    )
    for (const 项 of 源.matchAll(模式)) 表.set(项[1], 项[2].replace(/\s+/g, ' ').trim())
  }
  return 表
}

const 基线用户列 = 建表列定义(基线源, '用户')
const 迁移用户列 = 迁移列定义('用户')
const 收敛用户列 = [...new Set([...基线用户列.keys(), ...迁移用户列.keys()])].sort()

/** 037 声明的值域字面量（`-- 值域字面量: 'a' | 'b'` 这一行是本文件与测试的唯一握手点） */
function 声明值域(源: string): string[] {
  const 行 = /^--\s*值域字面量:\s*(.+)$/m.exec(源)?.[1] ?? ''
  return [...行.matchAll(/'([^']+)'/g)].map((项) => 项[1])
}

/** utils/性别 导出的用户资料形态集合（真源，不抄字面量） */
const 真源用户形态 = 性别内部形态列表
  .map((形态) => 内部转用户形态(形态))
  .filter((值): 值 is string => 值 !== null)
  .sort()

// ============================ B 组：真库夹具 ============================

function 取连接串(库名?: string): string {
  const 显式 = (process.env.TEST_DATABASE_URL ?? '').trim()
  const 基 = 显式 !== '' ? 显式 : String(peiZhi.shuJuKuLianJie ?? '')
  if (基 === '') return ''
  const 换主机 = 基.includes('@postgres:') ? 基.replace('@postgres:', '@127.0.0.1:') : 基
  if (!库名) return 换主机
  return 换主机.replace(/\/[^/?#]*(\?.*)?$/, `/${库名}$1`)
}

async function 取管理池(): Promise<Pool | null> {
  const 串 = 取连接串('postgres')
  if (串 === '') return null
  const 池 = new Pool({ connectionString: 串, connectionTimeoutMillis: 3000 })
  try {
    await 池.query('SELECT 1')
    return 池
  } catch {
    await 池.end().catch(() => undefined)
    return null
  }
}

const 管理池 = await 取管理池()
const 有真库 = 管理池 !== null
const 后缀 = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
const 临时库名 = `fp15a_verify_${后缀}`.slice(0, 60).toLowerCase()

let 池: Pool | null = null
let 已建库 = false

async function 重放(路径: string): Promise<void> {
  await (池 as Pool).query(readFileSync(路径, 'utf-8'))
}

function 迁移清单(): string[] {
  return readdirSync(迁移目录)
    .filter((名) => 名.endsWith('.sql') && !跳过迁移.test(名))
    .sort()
}

async function 库内用户列(): Promise<string[]> {
  const 结果 = await (池 as Pool).query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`,
    ['用户'],
  )
  return 结果.rows.map((行) => String(行.column_name)).sort()
}

async function 列属性(列名: string): Promise<Record<string, string> | undefined> {
  const 结果 = await (池 as Pool).query(
    `SELECT data_type,
            coalesce(character_maximum_length::text, '-') AS 长度,
            is_nullable, coalesce(column_default, '-') AS 默认值
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    ['用户', 列名],
  )
  if (结果.rows.length === 0) return undefined
  const 行 = 结果.rows[0] as Record<string, unknown>
  return {
    data_type: String(行.data_type),
    长度: String(行.长度),
    is_nullable: String(行.is_nullable),
    默认值: String(行.默认值),
  }
}

beforeAll(async () => {
  if (!有真库) return
  await (管理池 as Pool).query(`CREATE DATABASE "${临时库名}"`)
  已建库 = true
  池 = new Pool({ connectionString: 取连接串(临时库名), max: 4 })
  await (池 as Pool).query('SELECT 1')
  await 重放(基线路径)
  await 重放(全量夹具路径)
  for (const 名 of 迁移清单()) await 重放(resolve(迁移目录, 名))
}, 420000)

afterAll(async () => {
  if (池) await 池.end().catch(() => undefined)
  // 无条件 DROP：不论前面断言成不成，临时库都不留在实例里
  if (已建库 && 管理池) {
    await 管理池.query(`DROP DATABASE IF EXISTS "${临时库名}"`).catch(() => undefined)
  }
  if (管理池) await 管理池.end().catch(() => undefined)
})

describe('迁移 037 值域与列定义与既有真源同源（无库依赖）', () => {
  it('037 声明的值域恰为 utils/性别 导出的用户资料形态，无多无少（值域漂移即红）', () => {
    expect(真源用户形态).toEqual(['female', 'male'])
    expect(声明值域(SQL).slice().sort()).toEqual(真源用户形态)
  })

  it('六种外部写法经 解析性别 + 内部转用户形态 全部落进 037 声明的值域（同源可导出，非两套表）', () => {
    const 声明 = new Set(声明值域(SQL))
    for (const 写法 of 性别合法写法) {
      const 用户形态 = 内部转用户形态(解析性别(写法))
      expect(用户形态, `写法 ${写法} 的规范形态不在 TS 值域内`).not.toBeNull()
      expect(声明.has(用户形态 as string), `写法 ${写法} → ${用户形态} 不在 037 值域内`).toBe(true)
    }
    expect(性别合法写法.length).toBe(6)
  })

  it('037 未把 024 的内部规范形态当成本列值域（族边界：默认性别不得被洗成 nan/nv）', () => {
    for (const 内部形态 of 性别内部形态列表) {
      expect(声明值域(SQL)).not.toContain(内部形态)
    }
    expect(语句体).not.toMatch(/CHECK[^\n]*'nan'/)
  })

  it('默认性别 的列定义与 baseline 里 目标性别 列的实际定义逐 token 同族（比对基准取自 baseline）', () => {
    // FP-28b 换基准：旧基准是 baseline 的 用户.性别。该列已由 FP-28 判定为死列（本仓写入者只剩
    // 注销置 NULL，FP-28b 已摘除），FP-28c 会把列本身删掉 ⇒ 拿待删列当基准，删列当天只会产生
    // **假红灯**（它守的是"某列数据还在不在"，不是契约）。新基准 = 同族、定义逐字相同、
    // 且不在 FP-28 处置范围内的 目标性别；并额外钉绝对值 'VARCHAR(10)'——旧口径只有相对判定
    // （默认性别==基准），基准列自己被改类型会跟着漂，现在不跟了。
    const 基准定义 = 基线用户列.get('目标性别')
    expect(基准定义, 'baseline 的 用户.目标性别 定义缺失或漂移，比对基准不成立').toBe('VARCHAR(10)')
    const 本迁移定义 = /ADD COLUMN IF NOT EXISTS "默认性别"([^;]*);/.exec(SQL)?.[1]
    expect(本迁移定义, '037 未以幂等方式补 默认性别').toBeTruthy()
    expect((本迁移定义 as string).replace(/\s+/g, ' ').trim(), '与 目标性别 列不同族').toBe(
      基准定义 as string,
    )
    expect(基线用户列.get('默认性别'), 'baseline 的 默认性别 定义漂移').toBe(基准定义)
  })

  it('删列反证（FP-28d：性别 成对回退仍在位，删向三列 + 加回恢复 + 038 暂捏不得回顶层）', () => {
    // 变异只在内存里造（不落盘、不改仓库文件），跑的却是本文件同一套解析函数与同一条判据：
    // ① 列集合面：删列后 `建表列定义` 的键集与在位态不同 ⇒ B 组那条逐列全等守卫必红；
    // ② 基准面：基准列 目标性别 被删 ⇒ 取回 undefined，同族守卫的 `toBe('VARCHAR(10)')` 必红
    //    （这就是"原来的删列反证没被换基准换掉"）。
    // 取不到定义行时 删用户列定义 直接抛 ⇒ 变异夹具失效本身也是红灯，不静默通过。
    //
    // 【FP-28d 改判（28c 上条成对回退）】清单翻回 ['性别','目标性别','默认性别']（性别 的删向变异
    //   随成对回退重新可构造）；28c 的「已删列回流 baseline 必红」前提（baseline 无 性别）消失，
    //   回流侧改为「删后按原样加回 ⇒ 必须精确回到在位态」的防空判，并把 28c 回流反证的职责移交给
    //   **038 暂捏反证**：顶层不得再出现 038（回顶层 ⇒ 容器启动自动迁移 DROP 性别 打挂管理端）。
    const 在位态 = [...基线用户列.keys()].sort()
    expect(基线用户列.has('性别'), 'FP-28d 已成对回退 ⇒ baseline 必须仍含 性别（038 在 pending/ 未放行）').toBe(true)
    for (const 列 of ['性别', '目标性别', '默认性别']) {
      const 变异列 = 建表列定义(删用户列定义(基线源, '用户', 列), '用户')
      expect(变异列.has(列), `${列} 的变异夹具没生效`).toBe(false)
      expect([...变异列.keys()].sort(), `${列} 被删后列集合仍等于在位态 ⇒ 守卫是空判`).not.toEqual(
        在位态,
      )
    }
    const 基准消失 = 建表列定义(删用户列定义(基线源, '用户', '目标性别'), '用户')
    expect(基准消失.get('目标性别'), '基准列被删后仍能取到定义 ⇒ 基准反证失效').not.toBe('VARCHAR(10)')
    expect(基线用户列.get('目标性别'), '基准列当前不在位 ⇒ 本文件的同族守卫无判据').toBe('VARCHAR(10)')
    // ③ 加回防空判（28d 替代 28c 的回流反证）：内存里删掉 性别 再按原样加回，键集必须精确回到在位态
    const 回流列 = 建表列定义(
      加回用户列定义(删用户列定义(基线源, '用户', '性别'), '    "性别" VARCHAR(10),'),
      '用户',
    )
    expect(回流列.has('性别')).toBe(true)
    expect([...回流列.keys()].sort(), '删后加回仍凑不回在位态 ⇒ 夹具失效').toEqual(在位态)
    // ④ FP-28d 暂捏反证：038 只准在 pending/，顶层与 pending/ 双向钉（回顶层或双份都在这里红）
    expect(
      readdirSync(迁移目录).filter((名) => 名.startsWith('038')),
      '038 回到顶层 ⇒ 容器启动自动迁移会 DROP 性别 打挂管理端',
    ).toEqual([])
    expect(readdirSync(resolve(迁移目录, 'pending')).filter((名) => 名.startsWith('038'))).toEqual([
      '038_删除用户性别死列.sql',
    ])
  })

  it('图片授权 的列定义与 baseline 逐 token 一致（同批收口，不另立编号）', () => {
    const 基线定义 = 基线用户列.get('图片授权')
    expect(基线定义, 'baseline 的 图片授权 定义缺失').toBeTruthy()
    const 本迁移定义 = /ADD COLUMN IF NOT EXISTS "图片授权"([^;]*);/.exec(SQL)?.[1]
    expect(本迁移定义, '037 未幂等补 图片授权 ⇒ 老库永远补不上').toBeTruthy()
    expect((本迁移定义 as string).replace(/\s+/g, ' ').trim(), '与 baseline 定义分叉').toBe(
      基线定义 as string,
    )
  })

  it('两列都不挂 CHECK（同族三列一律无 CHECK；加 CHECK 会因 init.sql 禁改 SQL 语义而重新分叉）', () => {
    expect(语句体).not.toMatch(/"默认性别"[^\n]*CHECK/i)
    expect(语句体).not.toMatch(/ADD CONSTRAINT[^\n]*默认性别/)
    expect(语句体).not.toMatch(/\bCHECK\b/i)
    const 基线用户表体 = /CREATE TABLE IF NOT EXISTS "用户" [\s\S]*?\n\);/.exec(基线源)?.[0] ?? ''
    expect(基线用户表体, '找不到 baseline 的 用户 建表语句').not.toBe('')
    expect(基线用户表体, 'baseline 的 用户 表出现表级 CHECK ⇒ 本用例口径需同步改判').not.toMatch(
      /\bCHECK\s*\(/,
    )
    for (const 列 of ['性别', '目标性别', '默认性别']) {
      expect(基线用户列.get(列) ?? '', `${列} 竟出现行内 CHECK`).not.toMatch(/\bCHECK\b/i)
    }
  })

  it('幂等与纯增量边界：IF NOT EXISTS 在位，无 UPDATE/DELETE/DROP，不越界改 用户 以外的表', () => {
    expect(语句体.match(/ADD COLUMN IF NOT EXISTS/g)?.length).toBe(2)
    expect(语句体).not.toMatch(/\bUPDATE\b/i)
    expect(语句体).not.toMatch(/\bDELETE\b/i)
    expect(语句体).not.toMatch(/DROP\s+(TABLE|COLUMN|CONSTRAINT|INDEX)/i)
    expect(语句体).not.toMatch(/TRUNCATE/i)
    expect([...语句体.matchAll(/ALTER TABLE "([^"]+)"/g)].map((项) => 项[1]).sort()).toEqual([
      '用户',
      '用户',
    ])
  })

  it('台账可判定：037 有归一校验和且版本号唯一（035=FP-08a、036=FP-21 已落地，不复用不改写既有迁移）', () => {
    expect(SQL.length).toBeGreaterThan(0)
    expect(计算迁移校验和(SQL)).toMatch(/^[0-9a-f]{64}$/)
    const 版本 = 迁移文件.replace(/\\/g, '/').split('/').pop()!.split('_')[0]
    expect(版本).toBe('037')
    const 版本集 = readdirSync(迁移目录)
      .filter((名) => 名.endsWith('.sql'))
      .map((名) => 名.split('_')[0])
    expect(版本集.filter((项) => 项 === '037')).toHaveLength(1)
    // 【FP-21 改判 · 契约演进，非放宽】旧断言是 `expect(版本集).not.toContain('036')`，
    // 钉的是「036 号位仍为 FP-21 预留、尚未被占」。FP-21 落地后 036 已实名存在，
    // 旧断言与事实相反 ⇒ 判据必须翻向：从"这个号还不许出现"改成"这个号恰好出现一次且归属 FP-21"。
    // 强度只增：仍然钉唯一性（重号即红），并额外钉住文件名，防止有人拿别的含义去填 036。
    expect(版本集.filter((项) => 项 === '036')).toHaveLength(1)
    expect(readdirSync(迁移目录)).toContain('036_好友消息内容与引用.sql')
    expect(版本集.filter((项) => 项 === '035')).toHaveLength(1)
  })

  it('头注释的 旧→新 与 删除语义 段在位（文档存在性检查，非行为代理；行为由上面各用例与 B 组真库实测钉）', () => {
    for (const 段 of ['-- 旧口径', '-- 新口径', '-- 值域', '-- 删除语义']) {
      expect(SQL, `037 头注释缺 ${段} 段`).toContain(段)
    }
    const 删除语义段 = /-- 删除语义[\s\S]*$/m.exec(SQL)?.[0] ?? ''
    expect(删除语义段).toContain('不被任何表引用')
    expect(删除语义段).toContain('只前进不回滚')
    expect(删除语义段).toContain('账号注销')
    expect(SQL).toContain('COMMENT ON COLUMN "用户"."默认性别"')
  })

  it('静态口径自证：037 补的两列确实在 baseline 里也有（两方一致的正向面），且收敛态含 24 列', () => {
    // FP-28d：23 → 24（28c 的 24 → 23 成对回退）。多回来的那一列是 `用户.性别` —— 它回列 baseline，
    // 仍不在迁移链的补列依据里；本用例的收敛态模型只并 ADD 不减 DROP，之所以仍然正确，
    // 是因为 B 组拿**真库实跑全链（现顶层无 038）**的列集合与它逐列全等比对兜底：模型一错即红。
    for (const 列 of ['默认性别', '图片授权']) {
      expect(迁移用户列.has(列), `${列} 无补列迁移 ⇒ 老库补不上`).toBe(true)
      expect(基线用户列.has(列), `${列} 缺于 baseline ⇒ 新库缺列`).toBe(true)
    }
    expect(收敛用户列).toHaveLength(24)
    expect(收敛用户列).toContain('性别')
  })
})

describe.skipIf(!有真库)('迁移 037 真库行为（自建临时库 fp15a_verify_*，主库零写入）', () => {
  // FP-28c 改判 24 → 23 后由 FP-28d 成对回退：23 → 24 列，`性别` 回列（038 在 pending/ 不进链，
  //   B 组现网路径重放的顶层清单已无 038 ⇒ 库内含 `性别`，与静态收敛态逐列全等）。
  //   旧清单里 `性别` 与本文件 A 组「删列反证」的 性别 项同批改判，三处清单（本表 / FP22f 的
  //   期望用户基线列+期望收敛用户列 / 本文件 静态口径自证 的列数）必须同步，漏一处即红。
  const 期望用户列 = [
    'ID',
    '人设标签',
    '创建时间',
    '图片授权',
    '头像',
    '审核员',
    '密码哈希',
    '性别',
    '性格选择',
    '手机号',
    '昵称',
    '更新时间',
    '活跃角色ID',
    '测试',
    '渣男渣女变体',
    '生日',
    '用户名',
    '目标性别',
    '签名',
    '签名可见性',
    '签名白名单',
    '管理员',
    '运营',
    '默认性别',
  ]

  it('现网路径（baseline + database/001 + 迁移链，跳过 034）跑通后，库内 用户 列集合与静态解析的收敛态逐列相同', async () => {
    expect(await 库内用户列()).toEqual(期望用户列)
    expect(收敛用户列).toEqual(期望用户列)
  })

  it('库内列属性与 baseline 的 目标性别 列同族：默认性别 varchar(10) 可空无默认，图片授权 boolean 默认 false', async () => {
    // FP-28b：库侧基准同 A 组一起由 性别 换到 目标性别（性别 由 FP-28c 删除，不能再当参照列）
    const 基准属性 = await 列属性('目标性别')
    const 默认 = await 列属性('默认性别')
    const 授权 = await 列属性('图片授权')
    expect(基准属性, '临时库里取不到 目标性别 的列属性，比对基准不成立').toBeTruthy()
    expect(默认).toEqual(基准属性)
    expect(授权).toMatchObject({
      data_type: 'boolean',
      is_nullable: 'YES',
      默认值: 'false',
    })
  })

  it('列已在位（baseline 建的库）：重复执行 037 两次仍零变更（幂等反证点）', async () => {
    const 前 = await 库内用户列()
    const 基准属性 = await 列属性('目标性别')
    await 重放(迁移文件)
    await 重放(迁移文件)
    expect(await 库内用户列()).toEqual(前)
    expect(await 列属性('默认性别')).toEqual(基准属性)
  })

  it('列缺失（老库起点，临时库里 DROP 模拟）：执行 037 必须补齐且定义与 baseline 一致', async () => {
    const 目标 = 池 as Pool
    const 基准属性 = await 列属性('目标性别')
    await 目标.query(`ALTER TABLE "用户" DROP COLUMN "默认性别", DROP COLUMN "图片授权"`)
    const 缺 = await 库内用户列()
    expect(缺).not.toContain('默认性别')
    expect(缺).not.toContain('图片授权')
    await 重放(迁移文件)
    const 补 = await 库内用户列()
    expect(补).toEqual(期望用户列)
    expect(await 列属性('默认性别')).toEqual(基准属性)
    expect(await 列属性('图片授权')).toMatchObject({
      data_type: 'boolean',
      默认值: 'false',
    })
    // 补齐后再跑一次仍然零变更（老库起点同样幂等）
    await 重放(迁移文件)
    expect(await 库内用户列()).toEqual(期望用户列)
  })

  it('库侧只存不判：male/female/NULL 皆可写，第三种写法同样不被库拦（无 CHECK 的显式后果，卡口在应用层）', async () => {
    const 目标 = 池 as Pool
    const 号码 = `139${String(Date.now()).slice(-7)}`
    const 建 = await 目标.query(
      `INSERT INTO "用户" ("手机号", "昵称", "默认性别")
       VALUES ($1, 'fp15a-甲', $2) RETURNING "ID"`,
      [号码, 'male'],
    )
    const 用户 = String(建.rows[0].ID)
    await 目标.query(`UPDATE "用户" SET "默认性别" = $1 WHERE "ID" = $2::uuid`, ['female', 用户])
    await 目标.query(`UPDATE "用户" SET "默认性别" = NULL WHERE "ID" = $1::uuid`, [用户])
    const 读回 = await 目标.query(`SELECT "默认性别" FROM "用户" WHERE "ID" = $1::uuid`, [用户])
    expect(读回.rows[0].默认性别).toBeNull()
    const 第三种写法 = await 目标.query(
      `INSERT INTO "用户" ("手机号", "昵称", "默认性别") VALUES ($1, 'fp15a-乙', $2)
       RETURNING "默认性别"`,
      [`${号码}9`, '男'],
    )
    expect(第三种写法.rows[0].默认性别).toBe('男')
    expect(await 列属性('默认性别')).toMatchObject({ is_nullable: 'YES' })
    await 目标.query(`DELETE FROM "用户" WHERE "手机号" LIKE $1`, [`${号码}%`])
  })
})
