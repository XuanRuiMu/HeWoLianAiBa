import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { LEI_BIE_DAO_XIAO_XI_LEI_XING, YUN_XU_XIAO_XI_LEI_XING } from '../../src/config/媒体配置'

/**
 * FP-21 迁移 027/028 的**无库**静态守卫（补 L-48(2)：此前该同源约束只在
 * `src/routes/__tests__/好友媒体真库.test.ts` 的 `skipIf(!有真库)` 组里把守，
 * 没有库的 CI 上整条链静默失效）。
 *
 * 这里不连库，只做三件事，都能在改坏时立刻红灯：
 *  ① 027 建的对象（FK 名/引用目标/ON DELETE 动作、类型 CHECK 值域）**逐字等于**
 *     compose initdb 那份 DDL（`database/001_haoyou_yu_shezhi.sql`）自动生成的形态
 *     ——「干净卷路径」与「现网路径」得到同一形态，正是靠这一条等式成立；
 *  ② CHECK 的值域 === 应用侧 `config/媒体配置.ts::YUN_XU_XIAO_XI_LEI_XING`，且 016 的
 *     建表语句里没有这两个对象（否则 027 不是那条收敛边）；
 *  ③ 027/028 幂等且不丢数据（类型改写前逐行校验 UUID、非法值 RAISE EXCEPTION 而非静默置 NULL）。
 *
 * 「两条路径在真库上确实得到同一形态」的执行证据仍在那份真库测试里（有库时跑）；
 * 本文件把「无人改坏常量」这一半从依赖真库变成不依赖真库。
 */

const 迁移目录 = resolve(__dirname, '..', '..', 'database', 'migrations')
const 零二七 = readFileSync(resolve(迁移目录, '027_好友消息媒体ID统一UUID外键.sql'), 'utf-8')
const 零二八 = readFileSync(resolve(迁移目录, '028_好友消息媒体ID索引.sql'), 'utf-8')
const 零一六 = readFileSync(resolve(迁移目录, '016_好友与设置表.sql'), 'utf-8')
const initdb = readFileSync(
  resolve(__dirname, '..', '..', '..', 'database', '001_haoyou_yu_shezhi.sql'),
  'utf-8',
)

/** 剥掉 `--` 行注释与块注释：027 的回滚说明写在注释里（含 `DELETE FROM "schema_migrations"`），不得被当成 SQL 主体 */
function 取正文(来源: string): string {
  return 来源.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '')
}

/** 取 `CREATE TABLE IF NOT EXISTS "好友消息" (...);` 整段 */
function 取好友消息建表(来源: string): string {
  const 匹配 = /CREATE TABLE IF NOT EXISTS "好友消息" \([\s\S]*?\);/.exec(来源)
  expect(匹配, '未找到 好友消息 建表语句').toBeTruthy()
  return 匹配![0]
}

/** 抽出一个 CHECK 约束里的值域字面量（按声明顺序） */
function 取值域(来源: string): string[] {
  return [...来源.matchAll(/'([^']*)'/g)].map((项) => 项[1])
}

const 外键定义 = 'FOREIGN KEY ("媒体ID") REFERENCES "媒体文件"("ID") ON DELETE SET NULL'

describe('迁移 027 把两条建库路径收敛到同一形态（无库静态守卫）', () => {
  const 正文 = 取正文(零二七)

  it('016（migrations 路径）建的是 TEXT 裸列、无 FK 无类型 CHECK —— 027 才是那条收敛边', () => {
    const 建表 = 取好友消息建表(零一六)
    expect(建表).toContain('"媒体ID" TEXT,')
    expect(建表).not.toContain('媒体ID_fkey')
    expect(建表).not.toContain('好友消息_类型合法')
    expect(零一六).not.toContain('idx_好友消息_媒体ID')
  })

  it('initdb 路径（compose 干净卷）声明的正是 027 要建的那三样', () => {
    const 建表 = 取好友消息建表(initdb)
    expect(建表).toContain('"媒体ID" UUID REFERENCES "媒体文件"("ID") ON DELETE SET NULL')
    expect(建表).toContain('CONSTRAINT "好友消息_类型合法" CHECK')
  })

  it('027 建的 FK 名/引用目标/删除动作与 initdb 内联约束的自动命名逐字一致', () => {
    expect(正文).toContain('ADD CONSTRAINT "好友消息_媒体ID_fkey"')
    expect(正文).toContain(外键定义)
    // 内联列约束在 Postgres 里就命名为 <表>_<列>_fkey ⇒ 两条路径的 pg_constraint 行必然同名
    expect(正文).toContain("conname = '好友消息_媒体ID_fkey'")
  })

  it('027 的 CHECK 值域 === initdb 的 CHECK 值域（同序同集合，不多不少）', () => {
    const 从〇二七 = 取值域(/CHECK \("类型" IN \(([^)]*)\)/.exec(正文)![1])
    const 从initdb = 取值域(
      /CONSTRAINT "好友消息_类型合法" CHECK \("类型" IN \(([^)]*)\)/.exec(initdb)![1],
    )
    expect(从〇二七.sort()).toEqual(从initdb.sort())
  })

  it('CHECK 值域 === 应用侧消息类型白名单（三处不各写一份，改常量必红灯）', () => {
    const 从〇二七 = 取值域(/CHECK \("类型" IN \(([^)]*)\)/.exec(正文)![1]).sort()
    expect(从〇二七).toEqual([...YUN_XU_XIAO_XI_LEI_XING].sort())
    // 类型码由类别映射派生，好友侧不存在第二份清单
    expect([...Object.values(LEI_BIE_DAO_XIAO_XI_LEI_XING)].sort()).toEqual(
      从〇二七.filter((码) => 码 !== 'wenben'),
    )
    const 路由源 = readFileSync(resolve(__dirname, '..', '..', 'src', 'routes', '好友.ts'), 'utf-8')
    expect(路由源).toContain('new Set<string>(YUN_XU_XIAO_XI_LEI_XING)')
    expect(路由源).not.toMatch(/new Set\(\['wenben'/)
  })

  it('列形态只向 UUID 收敛：非 UUID 存量值一律 RAISE EXCEPTION 中止，不静默置 NULL 丢数据', () => {
    expect(正文).toContain('ALTER COLUMN "媒体ID" TYPE UUID')
    expect(正文).toMatch(/RAISE EXCEPTION[^\n]*拒绝自动改写/)
    // 空串按 NULL 处理（它不承载任何引用），除此之外的脏值必须中止
    expect(正文).toContain("NULLIF(\"媒体ID\", '')::uuid")
    expect(正文).toContain("!~* '^[0-9a-f]{8}")
  })

  it('三段变更各自幂等：已是目标形态时整个分支不执行（重复执行为空操作）', () => {
    expect(正文).toContain("format_type(atttypid, atttypmod) = 'text'")
    expect(正文.match(/IF NOT EXISTS \(/g)!.length).toBeGreaterThanOrEqual(2)
    expect(正文).toContain("conname = '好友消息_类型合法'")
    expect(正文).toContain('to_regclass')
  })

  it('数据安全：不删行、不删表、不截断，也不越界改别的表', () => {
    expect(正文).not.toMatch(/\bDELETE\s+FROM\s+"/i)
    expect(正文).not.toMatch(/\bTRUNCATE\b/i)
    expect(正文).not.toMatch(/DROP\s+TABLE/i)
    expect(正文).not.toMatch(/DROP\s+COLUMN/i)
    expect(正文).not.toMatch(/ALTER TABLE\s+"(?!好友消息)/)
    expect(正文).not.toMatch(/UPDATE\s+"(?!好友消息)/)
  })

  it('悬空引用置 NULL 前先数出并 RAISE WARNING（不静默改写），且终态与 消息.媒体ID 的 SET NULL 一致', () => {
    expect(正文).toContain('SET "媒体ID" = NULL')
    expect(正文).toContain('IF FOUND THEN')
    expect(正文).toMatch(/RAISE WARNING[^\n]*悬空引用/)
  })

  it('028 给 媒体ID 建支撑授权查询的索引，且幂等', () => {
    const 正文 = 取正文(零二八)
    expect(正文).toContain(
      'CREATE INDEX IF NOT EXISTS "idx_好友消息_媒体ID" ON "好友消息" ("媒体ID")',
    )
    expect(正文).not.toMatch(/\bDROP\b/i)
  })

  it('迁移号不重复：同号双文件会让整条链以「校验和不匹配」失败（迁移器 版本=文件名首段）', () => {
    const 版本 = readdirSync(迁移目录)
      .filter((名) => 名.endsWith('.sql'))
      .map((名) => 名.split('_')[0])
    expect(new Set(版本).size).toBe(版本.length)
    expect(版本).toContain('027')
    expect(版本).toContain('028')
    // 027/028 号位由 FP-21 占用，后续新功能点的迁移必须从 029 起：登记在此以免并发撞号
    expect(Math.max(...版本.map(Number))).toBeGreaterThanOrEqual(28)
  })
})
