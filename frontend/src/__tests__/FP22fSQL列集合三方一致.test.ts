import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * FP-15a（承接 FP-22f）**数据库建库脚本的列集合守卫**——口径已由「三方一致」改判为「两方一致」。
 *
 * 【旧 → 新（契约演进，非弱化断言）】
 *  旧口径（FP-22f 定）：被改表要求 `database/000_baseline.sql` / `backend/database/init.sql` /
 *    `backend/database/migrations/` **三方**列集合差为空。
 *  新口径（本文件）：被改表要求 **`000_baseline.sql` + 迁移链两方**列集合一致，
 *    且本次治理动过的每一列必须**两方俱在**（baseline 有 ∧ 迁移链有补列依据）。
 *
 * 【改判理由（三条都是实测事实，不是偏好）】
 *  ① `backend/database/init.sql` **不是**已应用迁移：它不在 `migrations/` 下、不受 `schema_migrations`
 *     校验和台账管辖；而 `docker-compose.yml:22` 把 `./database` 挂成 `docker-entrypoint-initdb.d`，
 *     `.github/workflows/ci.yml:120/182/261` 也是 `psql -f ../database/000_baseline.sql`
 *     ⇒ 正式建库真源只有 `000_baseline.sql`（其后由 `backend/entrypoint.sh:16` 重放迁移链）。
 *  ② 「init.sql + 顺序跑迁移」这条路**本身跑不通**：init.sql 内 `媒体文件` 命中 0 次，
 *     迁移 008/023 当场 `relation "媒体文件" does not exist`（FP-22f 记录、FP-15a 于临时库
 *     `fp15a_manual_init` 复跑实测：init.sql 单独执行 EXIT=0，随后 008/023 各 EXIT=3）
 *     ⇒ 拿它当一致性的第三方，等于把一个跑不通的产物钉成契约。
 *  ③ 用户已裁决（PROGRESS『当前决策』四项裁决第③条）：init.sql **退役该自述**、内容不重生成；
 *     已补的列不回退。本文件据此把 init.sql 从「一致性的第三方」降为「不得再自称生产建库路径」的守卫对象。
 *
 * 【判定维度只增不减（逐条对照旧版）】
 *  - 旧「基线列 == 显式期望」保留；旧「init 列 == 显式期望」→ 换成「治理列两方俱在」
 *    （baseline ∧ 迁移链 各含该列，任一侧删掉即红——比原来只比两份建表脚本更强，因为它同时盯住补列依据）；
 *  - 旧「收敛(基线,迁移) == 收敛(初始化,迁移)」→ 换成「收敛(基线,迁移) == 显式期望全集」（更强：钉绝对值）；
 *  - 旧「迁移新增列 == 显式列表」保留，并**修正了正则**（见下）；
 *  - 旧「删列反证」能力保留且扩到两方：任一侧被临时删列都会命中至少一条红灯；
 *    FP-28b 起这条反证由**可跑的用例**兜（见「删列反证」：内存变异 baseline 后逐列验判据必红），
 *    且换基准列后基准面反证仍在；
 *  - 新增值域/约束面：035 的 FK 与禁自引用 CHECK、037 的两列与既有 `目标性别` 列同族
 *    （FP-28b：基准由 `性别` 换到 `目标性别`，理由是 `性别` 是 FP-28 判定并待由 FP-28c 删除的死列，
 *    不能当比对基准）、消息.类型 至今无 CHECK；
 *  - 新增面：init.sql 退役自述守卫（防止假自述回流）。
 *
 * 【FP-21 追加（2026-09-23，FP-21 后端半区）】两处改判 + 一整节新判据：
 *  ① 「命名与编号」那条从「036 预留给 FP-21 未被占用」改判为「036 已归 FP-21 + 全目录无重号」。
 *     旧写法用"某个号还不存在"去近似"不许重号"，兑现预留的那天必然自毁（本轮就红在这里）；
 *     现在直接钉不变式本身（每号恰好一次），覆盖面只增不减。
 *  ② 新增 `好友消息` 两方口径整节。**该表的建库侧真源不是 000_baseline.sql**（那份全文 好友消息
 *     命中 0 次），而是空卷 initdb 的 `database/001_haoyou_yu_shezhi.sql` ⇒ 派单里"往 baseline
 *     补两列"这个动作在物理上不存在（详见该节注释）。本节同时钉：两列两方俱在、同名 FK/CHECK/索引、
 *     类型三方同形（数据驱动，不写死列名）、删列反证 + 回流反证。
 *  ③ 记死一条**判据边界**：静态门禁里不得再塞"迁移补的列必须同时出现在建库脚本"这类双向通用判据——
 *     那个方向不是缺陷（两条建库路径都会重放整条迁移链），实测样本 `026` 的 对话摘要.素材锚点时间。
 *     真正跨路径的全量结构等价由真库口径把守（`好友媒体真库.test.ts` 路径A/路径B 逐列全等）。
 *
 * 【FP-28c 追加改判（2026-09-23，本单）】`用户.性别` 死列由迁移 038 正式 DROP，本文件的判据同步三处：*  ① `期望用户基线列` 20 → 19 列（去掉 `性别`）、`期望收敛用户列` 24 → 23 列；
 *     旧清单里那条「FP-28c 删列时与本表/期望收敛用户列/迁移037 的 期望用户列 一起改判」的待办注释即本单落地。
 *  ② `收敛列集合` 新增第三参 `删除`：**减去迁移链的 DROP COLUMN**。038 是本仓第一条删列迁移，
 *     旧模型只会「并集」不会「差集」⇒ 不减 DROP 的静态收敛态从本单起就是错的模型。
 *     本文件是纯静态门禁、没有真库交叉验证，故必须在这里补；`迁移037用户默认性别.test.ts` 的
 *     同名模型不补，因为它有 B 组真库逐列全等比对兜底（模型错了我立刻红），补上反而是无判据来源的装饰。
 *  ③ 删列反证**翻向**：旧版在内存里删 `性别` 定义行来证明守卫不空判，038 之后该夹具取不到定义行
 *     （夹具自身抛错＝设计好的红灯），清单改为仍在位的 目标性别/默认性别，并新增 `加回用户列定义`
 *     的**回流反证**：把 `性别` 加回 baseline，`期望用户基线列` 绝对内容守卫必红。
 *     ⇒ 反证能力净增（删向 + 回流向双向），被换掉的只是一条已经不可能成立的旧夹具；无 skip、无放宽。
 *
 * 【FP-28d 追加改判（2026-09-23，第六轮裁定②）】上条 28c 的三处改判**成对回退**：
 *  管理端（`恋爱吧管理中心`）已提交版本仍按名读 `用户.性别`，容器启动自动迁移链（`backend/entrypoint.sh`
 *  → `run_migration.js` 重放顶层）一旦跑到 038 即把该列 DROP ⇒ 管理端重启即打挂。故 038 移入
 *  `backend/database/migrations/pending/`（`迁移器.ts:81-86` / `run_migration.js:25-31` 均顶层非递归 +
 *  `.sql` 过滤 ⇒ `pending/` 不进链），baseline/init 成对回退删列（列暂时保留）。本文件判据对应翻回：
 *  ① `期望用户基线列` 19 → 20 列（`性别` 回列）、`期望收敛用户列` 23 → 24、`期望用户删除列` 归 `[]`；
 *  ② 顶层 `迁移删除列集合` = `[]`，原「readFileSync 038」改钉「038 恰在 `pending/` 且不在顶层」；
 *  ③ 「038 恰在顶层一次 / 最大号 038」翻为「顶层无 038 / 最大号 037 / pending/ 恰含 038」；
 *  ④ 原「已删列回流 baseline 必红」反证**语义反转**为「038 不得回到顶层」：把 `性别` 模拟塞进删除集
 *     （= 有人移回 038 且不改 baseline）时收敛面必红；删向反证三列全数回到在位清单。
 *  放行条件与四本守卫对照表：`.agents/evidence/traces/FP-28d放行条件-20260923.md`。
 *
 * 【本文件同时修正一处旧正则的漏判】旧 `迁移新增列集合` 要求 `ALTER TABLE "表" ADD COLUMN` 写在同一行，
 *  而 002/022 用的是 `ALTER TABLE "用户"\nADD COLUMN ...` 换行形态 ⇒ 002 的 `测试`、022 的
 *  `运营`/`审核员` 三列从未被计入，「一致」判定长期偏乐观。现按空白（含换行）匹配，只增不减。
 *
 * 【已应用迁移文件字节级不可改（L-09）】`backend/scripts/__tests__/迁移台账校验和.test.ts` C 组连真库
 *  比对 `schema_migrations.checksum`，`run_migration.js:111` 对已应用迁移的内容漂移直接抛错终止迁移
 *  ⇒ 本文件永不改任何既有迁移文件，补列只能新增迁移；036 预留给 FP-21，本单用 037。
 */

const 根目录 = resolve(__dirname, '../../..')
const 基线路径 = resolve(根目录, 'database/000_baseline.sql')
const 初始化路径 = resolve(根目录, 'backend/database/init.sql')
const 迁移目录 = resolve(根目录, 'backend/database/migrations')

/** 034 是未入库的本地自测提权脚本（PROGRESS『阻塞与遗留问题』L-02），禁止执行 ⇒ 也不参与扫描 */
const 跳过迁移 = /^034_/

function 读(路径: string): string {
  return readFileSync(路径, 'utf-8').replace(/\r\n/g, '\n')
}

/** 取 CREATE TABLE IF NOT EXISTS "表名" (...) 的**列定义行**首标识符，保留书写序；表级约束不以引号开头，天然被排除 */
function 建表列集合(源: string, 表名: string): string[] {
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
  return 段
    .map((行) => 行.trim())
    .map((行) => /^"([^"]+)"/.exec(行)?.[1])
    .filter((列): 列 is string => !!列)
}

/** `--` 行注释剥除器：静态扫描 SQL 结构时只看**语句体**。
 *  M4 反证实测到旧实现的空判面——把 `ALTER TABLE "用户" ADD COLUMN ...` 整行注释掉，
 *  旧正则照样把它数成「有补列依据」。注释不是依据，只有可执行语句才是。 */
function 去注释(源: string): string {
  return 源.replace(/^\s*--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

/** 迁移目录里对某表的全部 `ADD COLUMN`（含/不含 IF NOT EXISTS、同行或换行两种写法），升序去重 */
function 迁移新增列集合(表名: string, 目录 = 迁移目录): string[] {
  const 集合 = new Set<string>()
  for (const 文件 of readdirSync(目录).sort()) {
    if (!文件.endsWith('.sql') || 跳过迁移.test(文件)) continue
    const 源 = 去注释(读(resolve(目录, 文件)))
    const 模式 = new RegExp(`ALTER TABLE "${表名}"\\s+ADD COLUMN (?:IF NOT EXISTS )?"([^"]+)"`, 'g')
    for (const 项 of 源.matchAll(模式)) 集合.add(项[1])
  }
  return [...集合].sort()
}

/**
 * 同上，但把每条 ADD COLUMN 的**来源文件与类型 token** 一起带出来（同形比对要知道依据出自哪份迁移）。
 * 首行到第一个分号之间就是列定义；只取空白分隔的第一个 token 当**类型** —— 完整定义串不能当判据：
 * 035/036 把 `REFERENCES ...` 换行写、并由 DO 块单独补同名约束，两份建表脚本的排版也各不相同，
 * 拿整行相等去比会把排版差异钉成缺陷（类型不一致才是真正的两路径分叉）。
 */
function 迁移新增列明细(表名: string): Array<{ 文件: string; 列: string; 类型: string }> {
  const 明细: Array<{ 文件: string; 列: string; 类型: string }> = []
  for (const 文件 of readdirSync(迁移目录).sort()) {
    if (!文件.endsWith('.sql') || 跳过迁移.test(文件)) continue
    const 源 = 去注释(读(resolve(迁移目录, 文件)))
    const 模式 = new RegExp(
      `ALTER TABLE "${表名}"\\s+ADD COLUMN (?:IF NOT EXISTS )?"([^"]+)"\\s+([^;]*?);`,
      'g',
    )
    for (const 项 of 源.matchAll(模式)) {
      明细.push({ 文件, 列: 项[1], 类型: 项[2].trim().split(/\s+/)[0] })
    }
  }
  return 明细
}

/** 全部被迁移链 ADD COLUMN 过的表（台账判据的枚举面，不写死表名清单） */
function 被补列的表(): string[] {
  const 表 = new Set<string>()
  for (const 文件 of readdirSync(迁移目录).sort()) {
    if (!文件.endsWith('.sql') || 跳过迁移.test(文件)) continue
    const 源 = 去注释(读(resolve(迁移目录, 文件)))
    for (const 项 of 源.matchAll(/ALTER TABLE "([^"]+)"\s+ADD COLUMN /g)) 表.add(项[1])
  }
  return [...表].sort()
}

/**
 * 内存变异夹具（通用版）：从某表建表语句里抹掉某一列的**整行定义**。
 * 与 删用户列定义 同族，但不写死表名，也不会在列本就不存在时静默放过——取不到就抛，
 * 抛错本身就是设计好的红灯（FP-28c 的 性别 就是靠这个信号被发现的）。
 */
function 删列定义(源: string, 表名: string, 列名: string): string {
  const 表体 = 某表表体(源, 表名)
  const 变异表体 = 表体.replace(new RegExp(`^[ \\t]*"${列名}"[^\\n]*\\n`, 'm'), '')
  if (变异表体 === 表体) {
    throw new Error(`${表名} 的建表语句里取不到 ${列名} 的定义行 ⇒ 变异夹具失效（该列已被删？判据需同步改判）`)
  }
  return 源.replace(表体, () => 变异表体)
}

/** 往某表建表语句开头插一整行列定义（回流反证用；只在内存里造） */
function 加列定义(源: string, 表名: string, 定义行: string): string {
  const 头 = new RegExp(`CREATE TABLE IF NOT EXISTS "${表名}" [(]\\n`).exec(源)
  if (!头) throw new Error(`找不到 ${表名} 的建表语句左括号 ⇒ 变异夹具不成立`)
  const 起点 = 头.index + 头[0].length
  const 变异源 = `${源.slice(0, 起点)}${定义行}\n${源.slice(起点)}`
  if (变异源 === 源) throw new Error('变异夹具没生效')
  return 变异源
}

/** 表体（不抛版）：baseline 里没有这张表时返回 null —— 「表由哪份建表脚本负责」本身就是判据的输入 */
function 表体或空(源: string, 表名: string): string | null {
  const 表体 = new RegExp(`CREATE TABLE IF NOT EXISTS "${表名}" [\\s\\S]*?\\n\\);`).exec(源)?.[0] ?? ''
  return 表体 === '' ? null : 表体
}

/** 某列定义的**类型 token**（建表体里那一行去掉列名后的第一个空白分隔词，尾随逗号已剥）；取不到返回 null */
function 列类型(源: string, 表名: string, 列名: string): string | null {
  const 表体 = 表体或空(源, 表名)
  if (表体 === null) return null
  const 行 = new RegExp(`^[ \\t]*"${列名}"[ \\t]*([^\\n]*)$`, 'm').exec(表体)
  if (!行) return null
  return (行[1].trim().replace(/,\s*$/, '').split(/\s+/)[0] ?? '')
}

/**
 * 迁移目录里对某表的全部 `DROP COLUMN`（038 是本仓**第一条**删列迁移，旧模型只会「并集」不会「差集」）。
 * 【FP-28d】038 已暂捏进 `pending/`，顶层扫描面内没有任何 DROP ⇒ 本函数对 用户 当前恒返回 `[]`；
 *  「038 被移回顶层」的红灯由 用户 describe 内的暂捏反证（模拟回移删除集）负责。
 * 【为什么只在静态口径这一侧补、`backend/scripts/__tests__/迁移037用户默认性别.test.ts` 不补】
 * 那条用例有真库侧的逐列全等比对兜底（库是实跑过迁移的，模型错了我立刻红）；
 * 本文件是**纯静态**门禁，没有任何真库交叉验证 ⇒ 不减去 DROP 的收敛态在 038 之后就是错的模型。
 */
function 迁移删除列集合(表名: string): string[] {
  const 集合 = new Set<string>()
  for (const 文件 of readdirSync(迁移目录).sort()) {
    if (!文件.endsWith('.sql') || 跳过迁移.test(文件)) continue
    const 源 = 去注释(读(resolve(迁移目录, 文件)))
    const 模式 = new RegExp(`ALTER TABLE "${表名}"\\s+DROP COLUMN (?:IF EXISTS )?"([^"]+)"`, 'g')
    for (const 项 of 源.matchAll(模式)) 集合.add(项[1])
  }
  return [...集合].sort()
}

/** 建表脚本 + 重放迁移后的收敛态（先并 ADD、再减 DROP，与真库重放的实际语义一致） */
function 收敛列集合(建表: string[], 迁移: string[], 删除: string[] = []): string[] {
  return [...new Set([...建表, ...迁移])].filter((列) => !删除.includes(列)).sort()
}

const 基线源 = 读(基线路径)
const 初始化源 = 读(初始化路径)

const 基线消息列 = 建表列集合(基线源, '消息')
const 基线用户列 = 建表列集合(基线源, '用户')
const 迁移消息列 = 迁移新增列集合('消息')
const 迁移用户列 = 迁移新增列集合('用户')
const 迁移删除用户列 = 迁移删除列集合('用户')

/**
 * `好友消息` 的建库侧真源（FP-21）：000_baseline.sql 不建这张表，空卷 initdb 由
 * `database/001_haoyou_yu_shezhi.sql` 建它（compose 把 ./database 挂成 initdb.d，按名序跑 000→001）。
 */
const 好友建库源文本 = 读(resolve(根目录, 'database/001_haoyou_yu_shezhi.sql'))
const 迁移好友消息列 = 迁移新增列集合('好友消息')

/** 建库侧（000 或 001）是否亲自建了这张表（整表不在 ⇒ 谈不上"漏了一列"，本判据不参与） */
function 建库侧有此表(表名: string): boolean {
  return 表体或空(基线源, 表名) !== null || 表体或空(好友建库源文本, 表名) !== null
}

/**
 * 建库侧（000_baseline.sql ∪ database/001_haoyou_yu_shezhi.sql，即 compose initdb 按名序跑的那两份）
 * 是否给了某列依据，以及它的类型 token。两种写法都算依据：建表语句里的列定义、
 * 建库脚本自己写的 `ALTER TABLE … ADD COLUMN`（000 的 R6 收敛段与 017 的气泡两列都是这一族）。
 * 返回 null = 建库侧完全没有这一列（该列只存在于迁移链）。
 */
function 建库侧列类型(表名: string, 列名: string): string | null {
  for (const 源 of [基线源, 好友建库源文本]) {
    const 直取 = 列类型(源, 表名, 列名)
    if (直取 !== null) return 直取
    const 补列 = new RegExp(
      `ALTER TABLE "${表名}"\\s+ADD COLUMN (?:IF NOT EXISTS )?"${列名}"\\s+([^;]*?);`,
    ).exec(源)
    if (补列) return 补列[1].trim().split(/\s+/)[0]
  }
  return null
}

function 某列的定义(源: string, 表名: string, 列名: string): string {
  const 行 = new RegExp(`^\\s*"${列名}"([^\\n]*)$`, 'm').exec(某表表体(源, 表名))
  return (行?.[1] ?? '').replace(/,\s*$/, '').trim()
}

/** 取某表的建表语句体（表级约束一并含在内）；取不到即抛错，避免 `expect(undefined).not.toMatch()` 空判 */
function 某表表体(源: string, 表名: string): string {
  const 表体 = new RegExp(`CREATE TABLE IF NOT EXISTS "${表名}" [\\s\\S]*?\\n\\);`).exec(源)?.[0] ?? ''
  if (表体 === '') throw new Error(`找不到 ${表名} 的建表语句`)
  return 表体
}

/**
 * 内存变异夹具：把 用户 建表里某一列的**整行定义**删掉，返回变异后的全文。
 * 只用于删列反证（不落盘、不改仓库文件）。取不到该列即抛 —— 抛错本身就是红灯，
 * 消息里写清「FP-28c 已删列？本用例清单需同步改判」，避免下一位工人对着空消息抓瞎。
 */
function 删用户列定义(源: string, 列名: string): string {
  const 表体 = 某表表体(源, '用户')
  const 变异表体 = 表体.replace(new RegExp(`^[ \\t]*"${列名}"[^\\n]*\\n`, 'm'), '')
  if (变异表体 === 表体) {
    throw new Error(
      `baseline 的 用户 里取不到 ${列名} 的定义行 ⇒ 变异夹具失效（FP-28c 已删该列？本用例的列清单需同步改判）`,
    )
  }
  return 源.replace(表体, () => 变异表体)
}

/**
 * 内存变异夹具（FP-28c 新增的**反方向**）：把一整行列定义插回 用户 建表语句的开头。
 * 用于「已删列回流」反证 —— 038 删掉 性别 之后，谁把它写回 baseline，
 * `建表列集合 != 期望用户基线列` 那条绝对内容守卫必须变红。同样只在内存里造，不落盘。
 */
function 加回用户列定义(源: string, 定义行: string): string {
  const 头 = new RegExp(`CREATE TABLE IF NOT EXISTS "用户" [(]\\n`).exec(源)
  if (!头) throw new Error('找不到 baseline 的 用户 建表语句左括号 ⇒ 变异夹具不成立')
  const 起点 = 头.index + 头[0].length
  const 变异源 = `${源.slice(0, 起点)}${定义行}\n${源.slice(起点)}`
  if (变异源 === 源) throw new Error('变异夹具没生效')
  return 变异源
}

describe('FP-15a 两方口径：消息表在 baseline + 迁移链一致（旧三方口径的迁移面原样保留）', () => {
  // 显式列出期望值（不是从被测文件反推）：改列名/加列/漏补一处都会在这里红灯。
  // 16 列 = 12 列基线原有 + 032幂等键 + 033内容块 + 035被引用消息ID + 媒体ID（无补列迁移，只写在 baseline）
  // （FP-08a 契约演进：新增 被引用消息ID；旧期望值即本列表去掉该列的 15 列形态）
  const 期望消息列 = [
    'ID',
    '用户ID',
    '角色ID',
    '内容',
    '发送者',
    '类型',
    '已读',
    '已撤回',
    '撤回时间',
    '原始内容',
    '客户端序号',
    '媒体ID',
    '幂等键',
    '内容块',
    '被引用消息ID',
    '创建时间',
  ]

  it('baseline 的 消息 建表列集合与显式期望完全相同（顺序也一致；从 baseline 删/改任一列即红）', () => {
    expect(基线消息列).toEqual(期望消息列)
  })

  it('迁移链对 消息 新增的列恰为三条且有据可查（032/033/035）；从 035 删列即红', () => {
    expect(迁移消息列).toEqual(['内容块', '幂等键', '被引用消息ID'].sort())
  })

  it('两方一致（收敛态钉绝对值）：baseline ∪ 迁移链 == 同一份显式期望 ⇒ 新库/老库同一列集合', () => {
    expect(收敛列集合(基线消息列, 迁移消息列)).toEqual([...期望消息列].sort())
  })

  it('重放幂等：迁移链在 baseline 之上不新增任何列（新库首启重放零变更）', () => {
    expect(收敛列集合(基线消息列, [])).toEqual(收敛列集合(基线消息列, 迁移消息列))
  })

  it('治理列两方俱在：三条内容/引用列既在 baseline 也有补列迁移（旧口径只比两份建表脚本，这里更强）', () => {
    for (const 列 of ['内容块', '幂等键', '被引用消息ID']) {
      expect(基线消息列, `${列} 缺于 baseline ⇒ 空卷首启的库没有该列`).toContain(列)
      expect(迁移消息列, `${列} 无补列迁移 ⇒ 存量库永远补不上（42703）`).toContain(列)
    }
  })

  it('三列的迁移依据仍在：032 定义幂等键、033 定义内容块、035 定义被引用消息ID（补进建表语句不等于作废迁移）', () => {
    const 零三二 = 读(resolve(迁移目录, '032_FP09消息幂等键.sql'))
    const 零三三 = 读(resolve(迁移目录, '033_FP10顺序化内容块.sql'))
    const 零三五 = 读(resolve(迁移目录, '035_引用消息.sql'))
    expect(零三二).toContain('ALTER TABLE "消息" ADD COLUMN IF NOT EXISTS "幂等键" UUID')
    expect(零三三).toContain('ALTER TABLE "消息" ADD COLUMN IF NOT EXISTS "内容块" JSONB')
    expect(零三五).toContain('ALTER TABLE "消息" ADD COLUMN IF NOT EXISTS "被引用消息ID" UUID')
    // 删除语义必须显式且**不得级联删用户消息内容**：引用列一律 ON DELETE SET NULL（与 对话摘要.起始消息ID 同族）
    expect(零三五).toMatch(/"被引用消息ID"[\s\S]{0,160}REFERENCES "消息"\("ID"\) ON DELETE SET NULL/)
    expect(零三五).not.toMatch(/REFERENCES "消息"\("ID"\)[^\n]*ON DELETE CASCADE/)
    expect(零三五).toContain('CHECK ("ID" <> "被引用消息ID")')
    // baseline（正式建库真源）的内联外键同口径：否则空卷建出来的库与迁移链收敛态在**约束层面**分叉
    expect(某表表体(基线源, '消息'), 'baseline 的 引用列必须显式 SET NULL').toContain(
      `"被引用消息ID" UUID REFERENCES "消息"("ID") ON DELETE SET NULL`,
    )
  })

  it('值域事实：消息.类型 至今没有任何 CHECK（types/index.ts 旧注释的假前提，由本用例钉死）', () => {
    // 有 CHECK 的是 好友消息.类型（database/001_haoyou_yu_shezhi.sql:39 与迁移 027），
    // 以及 媒体文件.类别 / 通话记录 两列；消息.类型 在正式建库真源里是裸 VARCHAR + DEFAULT。
    const 消息表体 = 某表表体(基线源, '消息')
    // 行内 CHECK 与表级 CHECK 两种写法一律排除
    expect(消息表体, 'baseline 的 消息.类型 竟出现了行内 CHECK').not.toMatch(/"类型"[^\n]*CHECK/i)
    expect(消息表体, 'baseline 的 消息.类型 竟出现了表级 CHECK').not.toMatch(/CHECK\s*\("类型"/)
    expect(消息表体, '类型 默认值变更须同步 types/index.ts 注释').toContain(
      `"类型" VARCHAR(20) DEFAULT 'wenBen'`,
    )
    const 好友定义 = /CREATE TABLE IF NOT EXISTS "好友消息" [\s\S]*?\n\);/.exec(
      读(resolve(根目录, 'database/001_haoyou_yu_shezhi.sql')),
    )?.[0]
    expect(好友定义 ?? '').toMatch(
      /CHECK \("类型" IN \('wenben', 'tuPian', 'yuYin', 'wenJian', 'biaoQingBao'\)\)/,
    )
  })
})

describe('FP-15a 两方口径：用户表（默认性别 + 图片授权 由迁移 037 收口；性别 列按 FP-28d 暂留、038 在 pending/）', () => {
  // 【FP-28c 改判（旧 → 新）】20 列 → 19 列，去掉的就是 `'性别'`。
  //   旧期望值里 `性别` 带的注释写的是「FP-28 判定的死列：FP-28c 删列时与本表 期望收敛用户列、
  //   迁移037 的 期望用户列 一起改判」——本单即该改判的落地，三处清单同步。
  //   这是**列集合收缩一格**，不是判据放宽：本 describe 里 收敛列集合 新增了「减去迁移 DROP 列」
  //   这一条旧版没有的判定面（见 迁移删除列集合），且新增「038 恰好只删 性别 一列」与
  //   「性别 回流 baseline 必红」两条守卫；判定维度净增。
  // 【FP-28d 改判（28c 上条成对回退）】038 移入 pending/、baseline 回带 `性别` ⇒ 本表期望值
  //   翻回 20 列（含 `性别`）、`期望用户删除列` 归 `[]`、期望收敛翻回 24 列；
  //   「性别 回流 baseline 必红」的回流前提消失，反证移交给「038 不得回到顶层」（见下方用例）。
  const 期望用户基线列 = [
    'ID',
    '手机号',
    '用户名',
    '密码哈希',
    '昵称',
    '性别',
    '目标性别',
    '默认性别',
    '性格选择',
    '人设标签',
    '渣男渣女变体',
    '头像',
    '生日',
    '签名',
    '管理员',
    '测试',
    '图片授权',
    '活跃角色ID',
    '创建时间',
    '更新时间',
  ]
  // 迁移链对 用户 的补列依据（037 之前的四条 + 037 的两条；038 是删列且已移入 pending/，不在此列）
  const 期望用户迁移列 = ['图片授权', '审核员', '测试', '签名可见性', '签名白名单', '运营', '默认性别']
  // 迁移链对 用户 的删列依据：FP-28d 之后顶层为**空**（038 暂捏于 pending/，不进扫描面）
  const 期望用户删除列: string[] = []
  // baseline 之外、由迁移链补进 用户 的列（= 存量库靠迁移补齐、空卷库由 baseline 直接建出的差集）
  const 期望收敛用户列 = [
    ...期望用户基线列,
    '签名可见性',
    '签名白名单',
    '运营',
    '审核员',
  ].filter((列) => !期望用户删除列.includes(列))

  it('baseline 的 用户 建表列集合与显式期望完全相同（含 性别/默认性别/图片授权；删任一列即红）', () => {
    expect(基线用户列).toEqual(期望用户基线列)
    // FP-28d 的绝对事实：成对回退后 `性别` 的**定义**重新在位（同名 角色.性别 是另一张表的另一列）
    expect(基线用户列, 'FP-28d 已成对回退 ⇒ baseline 必须仍含 性别（038 在 pending/ 未放行）').toContain(
      '性别',
    )
  })

  it('迁移链对 用户 的补列集合与显式期望相同（旧正则漏判的 测试/运营/审核员 现已计入）', () => {
    expect(迁移用户列).toEqual([...期望用户迁移列].sort())
  })

  it('迁移链对 用户 的删列集合恰为空（FP-28d：038 已移出顶层，回移即红），且 038 只在 pending/', () => {
    expect(迁移删除用户列).toEqual([])
    expect(readdirSync(迁移目录), '038 回到顶层 ⇒ 容器启动自动迁移会 DROP 性别 打挂管理端').not.toContain(
      '038_删除用户性别死列.sql',
    )
    expect(readdirSync(resolve(迁移目录, 'pending'))).toContain('038_删除用户性别死列.sql')
    const 零三八 = 读(resolve(迁移目录, 'pending', '038_删除用户性别死列.sql'))
    // 幂等（IF EXISTS）+ 只碰 用户 这一张表 + 破坏性迁移必须把删除语义写进头注释（文件除 FP-28d 登记外未改）
    expect(零三八).toContain('ALTER TABLE "用户" DROP COLUMN IF EXISTS "性别";')
    expect([...零三八.replace(/^\s*--.*$/gm, '').matchAll(/ALTER TABLE "([^"]+)"/g)].map((项) =>项[1])).toEqual([
      '用户',
    ])
    expect(零三八).toContain('-- 删除语义')
    expect(零三八).toContain('037')
    expect(零三八).toContain('fp28c_probe_')
    expect(零三八, '038 头注释缺 FP-28d 暂捏登记').toContain('FP-28d')
  })

  it('两方一致（收敛态钉绝对值）：(baseline ∪ 迁移链补列) − 迁移链删列 == 24 列全集（FP-28d：顶层无 DROP）', () => {
    expect(收敛列集合(基线用户列, 迁移用户列, 迁移删除用户列)).toEqual([...期望收敛用户列].sort())
  })

  it('FP-15a 收口项：默认性别 与 图片授权 两方俱在 ⇒ 新库由 baseline 有、老库由 037 补', () => {
    for (const 列 of ['默认性别', '图片授权']) {
      expect(基线用户列, `${列} 缺于 baseline ⇒ 空卷首启的库没有该列`).toContain(列)
      expect(迁移用户列, `${列} 无补列迁移 ⇒ 存量库永远补不上（42703）`).toContain(列)
    }
  })

  it('旧账本用例改判：FP-22f 登记的两条 init 侧分叉（默认性别 无补列迁移 / 图片授权 只写在 baseline）均已闭合', () => {
    // 旧口径（FP-22f）：
    //   ① `expect(迁移新增列集合('用户')).not.toContain('默认性别')` —— 它钉的是「全库没有补列迁移」这一
    //      **缺陷形态**（默认性别 只写在两份建表脚本里，存量库补不上），当时的账本用例已写明
    //      「FP-15 补正式迁移时须同步本用例」；
    //   ② `expect(基线收敛.filter(...)).toEqual(['图片授权'])` —— 它钉的是「init 缺 图片授权 且无人收口」，
    //      同属待收口账本（FP-22f 交回项）。
    // 新口径（本文件）：037 落地后两列都有补列依据 ⇒ ①的反向（含 默认性别）与 ②的空差集同时成立。
    // 这是**契约演进**：断言强度只增（现在同时要求 baseline 有、迁移链有、收敛态等于全集），不是放宽。
    const 基线独有 = 基线用户列.filter((列) => !迁移用户列.includes(列))
    const 迁移独有 = 迁移用户列.filter((列) => !基线用户列.includes(列))
    // baseline 有而迁移链无 = 正常（大多数列本就由 000_baseline.sql 建），但**本单治理列不得落在其中**
    for (const 列 of ['默认性别', '图片授权']) expect(基线独有, `${列} 退化为只写在 baseline`).not.toContain(列)
    // 迁移链有而 baseline 无 = 只允许这 4 列（014/022 早于 baseline 快照的既有事实）；多一条即红灯
    expect(迁移独有.sort()).toEqual(['审核员', '签名可见性', '签名白名单', '运营'])
  })

  it('037 的列定义与既有 目标性别 列同族：类型串逐字相同，且 用户 表两侧都无 CHECK（不新造第二套约束形态）', () => {
    // FP-28b 换基准：旧基准取的是 baseline 的 用户.性别。该列经 FP-28 判定为死列（本仓写入者
    // 只剩注销置 NULL，已随 FP-28b 摘除），FP-28c 要把列本身删掉 ⇒ 拿待删列当比对基准，
    // 删列当天这本守卫只会产生**假红灯**（它守的不是契约，是一列数据还在不在）。
    // 新基准 = 同族、定义逐字相同、且不在 FP-28 处置范围内的 目标性别；并且额外钉**绝对值**
    // 'VARCHAR(10)'：旧口径只有相对判定（A==B），基准列被改类型会跟着一起漂；现在基准自己也被钉住。
    const 零三七 = 读(resolve(迁移目录, '037_用户默认性别.sql'))
    const 基准定义 = 某列的定义(基线源, '用户', '目标性别')
    expect(基准定义, 'baseline 的 用户.目标性别 定义取不到或漂移，比对基准不成立').toBe('VARCHAR(10)')
    expect(某列的定义(基线源, '用户', '默认性别'), 'baseline 的 默认性别 与 目标性别 不同族').toBe(基准定义)
    expect(零三七).toContain(`ADD COLUMN IF NOT EXISTS "默认性别" ${基准定义};`)
    expect(零三七).toContain('ADD COLUMN IF NOT EXISTS "图片授权" BOOLEAN DEFAULT FALSE;')
    expect(某列的定义(基线源, '用户', '图片授权')).toBe('BOOLEAN DEFAULT FALSE')
    // 值域真源不新造：037 声明 male/female（utils/性别.ts 的用户资料形态），且不得把 024 的 nan/nv 当本列值域
    const 值域行 = /^--\s*值域字面量:\s*(.+)$/m.exec(零三七)?.[1] ?? ''
    expect([...值域行.matchAll(/'([^']+)'/g)].map((项) => 项[1]).sort()).toEqual(['female', 'male'])
    const 语句体 = 零三七.replace(/^\s*--.*$/gm, '')
    expect(语句体).not.toMatch(/\bCHECK\b/i)
    expect(某表表体(基线源, '用户'), 'baseline 的 用户 表出现表级 CHECK ⇒ 同族口径需同步改判').not.toMatch(
      /\bCHECK\s*\(/,
    )
  })

  it('删列反证 + FP-28d 暂捏反证（性别 成对回退仍在位；038 不得回到顶层）', () => {
    // 【FP-28d 翻回（旧 → 新）】28c 版这里做的是「已删列回流 baseline 必红」——那要求 baseline 无 性别。
    //   28d 成对回退后 baseline 再次含 `性别` ⇒ 回流前提消失，反证按事实翻回**删向**（三列全在位），
    //   并把 28c 那条回流反证的职责移交给**038 暂捏反证**：把 `性别` 模拟塞进删除集
    //   （= 有人把 038 移回顶层、baseline 一字未改），收敛态必须变红（DROP 会把刚回退的列又删掉）。
    //   ⇒ 反证仍是双向：baseline 被删列有红、038 被移回顶层有红；无 skip、无放宽。
    for (const 列 of ['性别', '目标性别', '默认性别']) {
      const 变异源 = 删用户列定义(基线源, 列)
      expect(建表列集合(变异源, '用户'), `${列} 被删后列集合守卫仍等于期望值 ⇒ 该守卫是空判`).not.toEqual(
        期望用户基线列,
      )
      expect(建表列集合(变异源, '用户')).not.toContain(列)
    }
    // 加回防空判：内存里删掉 性别 再按原样加回，键集必须回到期望全集（两个变异夹具都不是空转）
    const 回流源 = 加回用户列定义(删用户列定义(基线源, '性别'), '    "性别" VARCHAR(10),')
    const 回流列 = 建表列集合(回流源, '用户')
    expect(回流列).toContain('性别')
    expect([...回流列].sort(), '删后加回仍凑不回期望全集 ⇒ 夹具失效').toEqual([...期望用户基线列].sort())
    // 038 暂捏反证：模拟「有人把 038 移回顶层、baseline 一字未改」⇒ 顶层删列集合不再为空，收敛面必红
    expect(迁移删除用户列, '当前顶层必须无 DROP（038 在 pending/）').toEqual([])
    const 模拟回移删除 = [...new Set([...迁移删除用户列, '性别'])]
    expect(
      收敛列集合(基线用户列, 迁移用户列, 模拟回移删除),
      '038 移回顶层后收敛态仍等于 24 列全集 ⇒ 暂捏守卫是空判',
    ).not.toEqual([...期望收敛用户列].sort())
    // 收敛面本身（顶层无 038）：两条起点仍收敛到同一 24 列全集
    expect(收敛列集合(基线用户列, 迁移用户列, 迁移删除用户列)).toEqual([...期望收敛用户列].sort())
    // 基准面（FP-28b 换基准后必须仍然成立）：基准列 目标性别 一旦消失，`某列的定义` 取回空串
    const 基准消失 = 删用户列定义(基线源, '目标性别')
    expect(某列的定义(基准消失, '用户', '目标性别'), '基准列被删后同族守卫仍能取到定义 ⇒ 反证失效').not.toBe(
      'VARCHAR(10)',
    )
    // 反向防空判：基准现在确实在位且等于钉死的绝对值
    expect(某列的定义(基线源, '用户', '目标性别')).toBe('VARCHAR(10)')
  })

/**
 * 【本轮新增 · 台账化那一条通用判据（2026-09-23，FP-21 接续）】
 * 旧写法在这里钉的是 `'036' 尚未出现`，理由写的是「036 预留给 FP-21 未被占用」。预留已经被兑现：
 * `036_好友消息内容与引用.sql` 现在真实存在，于是旧判据当场变红。红是对的——它确实把住了
 * 「迁移台账不许漂移」，但**红完之后必须按事实改判**：这条用例真正要守的是两件事，
 *  ① FP-15a 只新增 037、FP-28c 只新增 038（这两条各自单据的编号仍然唯一）；
 *  ② 整个 migrations 目录**没有重号**——重号才是「已应用迁移字节级不可改 + 台账 checksum」
 *     那套机制唯一真正挡不住的失败形态（同版本号被两份内容抢注，谁先落库谁赢）。
 * 旧判据用「某个号还不存在」去近似「不许重号」，兑现预留的那天必然自毁（本文件刚踩到）。
 * 现在直接钉不变式本身：036 归 FP-21、每号恰好一次、最大号随事实推进。
 * 【FP-28d】038 已暂捏进 pending/ ⇒ 顶层版本集不含 038、最大号回到 037，
 *  并新增「038 恰好一份且只在 pending/」的正反两面钉（回顶层或双份都在这里红）。
 */
  it('命名与编号：036=FP-21、037=FP-15a 唯一；038 按 FP-28d 暂捏于 pending/（顶层不得出现），全目录无重号', () => {
    const 版本 = readdirSync(迁移目录)
      .filter((名) => 名.endsWith('.sql'))
      .map((名) => 名.split('_')[0])
    expect(版本.filter((项) => 项 === '036')).toHaveLength(1)
    expect(版本.filter((项) => 项 === '037')).toHaveLength(1)
    expect(
      版本.filter((项) => 项 === '038'),
      '038 回到顶层 ⇒ 容器启动自动迁移会 DROP 性别 打挂管理端',
    ).toHaveLength(0)
    expect(版本.filter((项) => 项 === '035')).toHaveLength(1)
    // 重号守卫：任何版本号出现两次都立刻红（旧写法只盯着一两个具体号，覆盖不到"新增时就撞号"）
    const 重号 = [...new Set(版本)].filter((项) => 版本.filter((它) => 它 === 项).length > 1)
    expect(重号, 'migrations 目录出现重号迁移 ⇒ 台账 checksum 与已应用迁移不可改那两条铁律都会被绕过').toEqual([])
    expect(版本).toContain('035')
    expect([...版本].sort()).toEqual([...new Set(版本)].sort())
    expect([...版本].sort().at(-1)).toBe('037')
    // FP-28d：038 恰好一份、且只存在于 pending/（顶层与 pending 双向钉）
    expect(readdirSync(迁移目录)).not.toContain('038_删除用户性别死列.sql')
    expect(readdirSync(resolve(迁移目录, 'pending')).filter((名) => 名.startsWith('038'))).toEqual([
      '038_删除用户性别死列.sql',
    ])
  })
})

/**
 * 【本轮新增 · 2026-09-23 FP-21】`好友消息` 的两方口径。
 *
 * 【为什么本表的"建库侧真源"是 database/001 而不是 000_baseline.sql】
 * 派单给的前提是「`000_baseline.sql` 的 `好友消息` 少了 036 补的两列」。实测证伪：
 * `000_baseline.sql` **根本不建 `好友消息` 这张表**（全文 好友消息 命中 0 次），
 * 该表的建表语句只存在于两处 —— 空卷 initdb 的 `database/001_haoyou_yu_shezhi.sql`
 * （compose 把 `./database` 挂进 docker-entrypoint-initdb.d，按文件名顺序跑 000 与 001）
 * 与迁移链的 `016_好友与设置表.sql`。⇒ 「往 000 里补两列」这个动作在物理上不存在，
 * 硬塞一张新表进去反而会造成**同一张表的第二份建表定义**（正是本仓根因 R5 的病灶形态）。
 * 真正的两方一致于是落在：`001_haoyou_yu_shezhi.sql`（建表侧） vs 迁移链（016 建表 + 036 补列）。
 *
 * 【本 describe 补的是什么洞】上一名工人给 `001_haoyou_yu_shezhi.sql` 补了两列，但**没在这里留任何判据**
 * —— 上一节 消息 表的用例只在值域那条里顺手取过 001 的 `好友消息.类型` CHECK。
 * 也就是说本守卫此前对 `好友消息` 是零覆盖：把它删掉一行、或把 036 的列名改一个字，
 * 本文件不会红。这正是 FP-22f 记账的 R6「声明的守卫 ≠ 实际覆盖面」的同族缺陷，故补整节判据。
 */
describe('FP-21 两方口径：好友消息表在 001_haoyou_yu_shezhi.sql + 迁移链一致', () => {
  const 好友建库源 = 好友建库源文本
  // 11 列 = 001/016 建表的 9 列 + 036 的 内容块/被引用消息ID（顺序按建表语句书写序钉死）
  const 期望好友消息列 = [
    'ID',
    '发送者ID',
    '接收者ID',
    '内容',
    '类型',
    '媒体ID',
    '已读',
    '撤回',
    '内容块',
    '被引用消息ID',
    '创建时间',
  ]

  it('建库侧 001 的 好友消息 列集合与显式期望完全相同（含 036 的两列；删任一列即红）', () => {
    expect(建表列集合(好友建库源, '好友消息')).toEqual(期望好友消息列)
  })

  it('000_baseline.sql 确实不建 好友消息 ⇒ 本表的建库侧真源只能是 001（前提本身也要钉住）', () => {
    expect(表体或空(基线源, '好友消息'), '好友消息 已进 baseline ⇒ 本节判据的比对口径需整体改判').toBeNull()
    expect(建表列集合(基线源, '消息').length).toBeGreaterThan(0)
  })

  it('迁移链对 好友消息 新增的列恰为 036 的两列；从 036 删列即红', () => {
    expect(迁移好友消息列).toEqual(['内容块', '被引用消息ID'])
  })

  it('两方一致（收敛态钉绝对值）：001 建表 ∪ 迁移链补列 == 同一份 11 列全集 ⇒ 空卷库与存量库同形', () => {
    expect(收敛列集合(建表列集合(好友建库源, '好友消息'), 迁移好友消息列)).toEqual(
      [...期望好友消息列].sort(),
    )
  })

  it('重放幂等：迁移链在 001 之上不新增任何列（干净卷首启重放零变更）', () => {
    expect(收敛列集合(建表列集合(好友建库源, '好友消息'), [])).toEqual(
      收敛列集合(建表列集合(好友建库源, '好友消息'), 迁移好友消息列),
    )
  })

  it('治理列两方俱在：两列既有建表依据（001）也有补列迁移（036）⇒ 新库靠建表、老库靠迁移，缺一即 42703', () => {
    const 建库列 = 建表列集合(好友建库源, '好友消息')
    for (const 列 of ['内容块', '被引用消息ID']) {
      expect(建库列, `${列} 缺于 001 ⇒ 空卷首启的库没有该列`).toContain(列)
      expect(迁移好友消息列, `${列} 无补列迁移 ⇒ 存量库永远补不上（42703）`).toContain(列)
    }
  })

  it('036 的列定义与 001 逐字同形：内容块=JSONB、被引用消息ID=UUID（同族于 消息 的 033/035）', () => {
    const 零三六 = 读(resolve(迁移目录, '036_好友消息内容与引用.sql'))
    expect(某列的定义(基线源, '消息', '内容块'), '比对基准 消息.内容块 漂移').toBe('JSONB')
    expect(某列的定义(基线源, '消息', '被引用消息ID').split(/\s+/)[0], '比对基准 消息.被引用消息ID 漂移').toBe(
      'UUID',
    )
    expect(列类型(好友建库源, '好友消息', '内容块')).toBe('JSONB')
    expect(列类型(好友建库源, '好友消息', '被引用消息ID')).toBe('UUID')
    expect(零三六).toContain('ALTER TABLE "好友消息" ADD COLUMN IF NOT EXISTS "内容块" JSONB;')
    expect(零三六).toContain('ALTER TABLE "好友消息" ADD COLUMN IF NOT EXISTS "被引用消息ID" UUID')
    // 删除语义与 035 逐字同构：SET NULL，绝不 CASCADE（引用只是元数据，不得因别人的生命周期删用户消息）
    expect(零三六).toMatch(/"被引用消息ID"[\s\S]{0,160}REFERENCES "好友消息"\("ID"\) ON DELETE SET NULL/)
    expect(零三六).not.toMatch(/REFERENCES "好友消息"\("ID"\)[^\n]*ON DELETE CASCADE/)
    expect(零三六).toContain('CHECK ("ID" <> "被引用消息ID")')
    expect(零三六).toContain('CREATE INDEX IF NOT EXISTS "好友消息_被引用消息ID_索引"')
    // 逐条 ADD COLUMN 的**类型**三方同形（不写死列名的那半判据）：
    // 036 补的列 == 001 建表里的同一列 == 消息 表在 baseline 里的那一族列。
    // 任一方向漂移（改名换类型、或 001 与 036 不再同形）都在这里红。
    const 明细 = 迁移新增列明细('好友消息')
    expect(明细.map((项) => `${项.文件}:${项.列}=${项.类型}`).sort()).toEqual([
      '036_好友消息内容与引用.sql:内容块=JSONB',
      '036_好友消息内容与引用.sql:被引用消息ID=UUID',
    ])
    for (const 项 of 明细) {
      expect(列类型(好友建库源, '好友消息', 项.列), `001 的 ${项.列} 与 036 不同形`).toBe(项.类型)
      expect(列类型(基线源, '消息', 项.列), `baseline 的 消息.${项.列} 与 036 不同形（同构前提失效）`).toBe(
        项.类型,
      )
    }
  })

  it('建库侧同约束：001 必须与 036 给出**同名** FK / CHECK / 索引 ⇒ 两条路径的 pg_constraint 行一致', () => {
    // 内联 REFERENCES 的自动命名就是 <表>_<列>_fkey，与 036 的 DO 分支同名；CHECK 必须显式同名，
    // 否则两条路径各拿一个系统生成名（好友消息_ID_被引用消息ID_check vs _1），
    // 「干净卷」与「现网重放」在约束层面分叉，且 036 的幂等 IF NOT EXISTS 永不补齐。
    const 建表语句 = 某表表体(好友建库源, '好友消息')
    expect(建表语句, '001 的引用列缺 FK 或非 SET NULL').toContain(
      '"被引用消息ID" UUID REFERENCES "好友消息"("ID") ON DELETE SET NULL',
    )
    expect(建表语句, '001 缺与 036 同名的禁自引用 CHECK').toContain(
      'CONSTRAINT "好友消息_不得自引用" CHECK ("ID" <> "被引用消息ID")',
    )
    expect(好友建库源, '001 缺外键侧索引 ⇒ 批量删行退化成逐行全表扫').toContain(
      'CREATE INDEX IF NOT EXISTS "好友消息_被引用消息ID_索引" ON "好友消息" ("被引用消息ID")',
    )
    // 两表同名键的写法族必须一致：000 里 消息 的引用列是内联 REFERENCES 且无表级 CHECK（035 补 CHECK），
    // 这里钉住"该 CHECK 目前只存在于 036"这一实测事实，避免下一位工人把两表当成完全同形而漏掉分叉。
    expect(表体或空(基线源, '消息'), '消息 若已有同名 CHECK，本用例的"分叉事实"陈述需改判').not.toContain(
      '消息_不得自引用',
    )
  })

  it('删列反证：从 001 的 好友消息 抹掉任一治理列 ⇒ 建库侧列集合与两方俱在两条必红（守卫不是空判）', () => {
    for (const 列 of ['内容块', '被引用消息ID']) {
      const 变异源 = 删列定义(好友建库源, '好友消息', 列)
      const 变异列 = 建表列集合(变异源, '好友消息')
      expect(变异列, `${列} 被删后建库侧列集合守卫仍等于期望值 ⇒ 该守卫是空判`).not.toEqual(期望好友消息列)
      expect(变异列).not.toContain(列)
      // 两方俱在判据也必须跟着红（只红一条 = 另一条对本列无感）
      expect(
        变异列.includes(列) && 迁移好友消息列.includes(列),
        `${列} 的两方俱在判据失效`,
      ).toBe(false)
      // 【收敛态在这里"不该"红，是语义而不是漏洞】存量库靠 036 仍会补上这一列 ⇒ 两条起点依旧同形；
      // 真正被这条夹具抓到的是「空卷首启的库缺列」。两侧同时缺，收敛态才该红 —— 下面按这个口径验。
      expect(收敛列集合(变异列, 迁移好友消息列)).toEqual([...期望好友消息列].sort())
      expect(
        收敛列集合(变异列, 迁移好友消息列.filter((它) => 它 !== 列)),
        `${列} 两侧都没依据时收敛态仍绿 ⇒ 绝对值守卫是空判`,
      ).not.toEqual([...期望好友消息列].sort())
    }
    // 回流反证（基准面）：把一列以**同定义**原样抹掉再加回去，两方俱在判据必须回到绿。
    // 这里比的是**集合**而非书写序 —— 变异夹具把列插在建表语句开头，位置本就不是原位置；
    // 顺序的绝对值由上面第一条用例钉（它要求逐字等于 期望好友消息列），两条各管一件事。
    const 回流源 = 加列定义(
      删列定义(好友建库源, '好友消息', '内容块'),
      '好友消息',
      '    "内容块" JSONB,',
    )
    expect(建表列集合(回流源, '好友消息').slice().sort()).toEqual([...期望好友消息列].sort())
    expect(列类型(回流源, '好友消息', '内容块'), '回流的列定义与 036 不同形').toBe('JSONB')
    // 反向防空判：未变异的建库侧确实含该列（否则上面那条 not.toEqual 是空判）
    expect(建表列集合(好友建库源, '好友消息')).toContain('内容块')
  })

  /**
   * 【本轮实测后新增的**唯一**一条通用判据 + 一条被否掉的候选判据（证据全部留在下面）】
   * 派单要求把「治理列两方俱在」从手写列清单泛化。两个方向都跑过一遍全仓（不推测）：
   *
   *  ① 「同一列两侧都有依据 ⇒ 类型必须同形」 ⇒ **成立**，且当前零反例：全库 8 张被补列的表、
   *     29 条 ADD COLUMN 里所有两侧俱在的列，类型 token 全部一致。已作为通用判据落在下面第一条用例。
   *     （比"整行相等"更弱也更正确：035/036 把 REFERENCES 换行写、由 DO 块补同名约束，
   *      两份建表脚本的排版本就不同，整行相等会把排版差异钉成缺陷。）
   *
   *  ② 「迁移补了列 ⇒ 建库脚本必须有这一列」 ⇒ **不成立，已否决**。两条建库路径最后都会由
   *     `backend/entrypoint.sh` 重放整条迁移链，缺的那一侧一定被补上；实测反例有 9 条且全部正常在跑：
   *     010(游戏档案.模式 / 角色.对局模式)、013(角色.音色ID)、014(用户.签名可见性 / 签名白名单)、
   *     022(用户.运营 / 审核员)、026(对话摘要.素材锚点时间)、031(角色.结局文案)。
   *     拿它当红灯只会逼出一张越写越长的假例外清单 —— 上一节 用户 表把 4 条钉成绝对值已经是这个味道，
   *     本轮不再往这个方向加判据。
   *     真正的缺陷是**反方向**：「建库脚本加了列、迁移链没有补列依据」（表已存在时
   *     `CREATE TABLE IF NOT EXISTS` 不给存量库补列 ⇒ 永远 42703），而它按定义只适用于"本轮新加的列"，
   *     脱离治理列清单就无法静态判定 ⇒ 由本 describe 的「治理列两方俱在」逐列钉住。
   *     跨路径的**全量**结构等价不在静态门禁能力范围内，那里已有真库口径把守：
   *     `backend/src/routes/__tests__/好友媒体真库.test.ts`（路径A=baseline+迁移链，
   *     路径B=baseline+001+迁移链，逐列全等）与 `scripts/__tests__/迁移027好友媒体列.test.ts` 同族。
   */
  it('通用判据：迁移链补的每一列，只要建库侧也有依据，两侧类型必须同形（全表扫描，非手写清单）', () => {
    const 比过: string[] = []
    const 类型分叉: string[] = []
    for (const 表名 of 被补列的表()) {
      if (!建库侧有此表(表名)) continue // 整表不由建库脚本建（如 LLM用量）⇒ 没有"两侧"可比
      for (const 项 of 迁移新增列明细(表名)) {
        const 建库侧 = 建库侧列类型(表名, 项.列)
        if (建库侧 === null) continue // ②方向：不是缺陷，跳过（理由见上面那段）
        比过.push(`${表名}.${项.列}=${建库侧}`)
        if (建库侧 !== 项.类型) 类型分叉.push(`${表名}.${项.列} 建库=${建库侧} 迁移=${项.类型}`)
      }
    }
    // 防空判：这条通用判据必须真的比过一批列（含本单两张表的治理列）
    expect(比过.length, '一条都没比对 ⇒ 本判据空转').toBeGreaterThanOrEqual(15)
    expect(比过).toEqual(expect.arrayContaining(['好友消息.内容块=JSONB', '好友消息.被引用消息ID=UUID', '消息.内容块=JSONB']))
    expect(类型分叉, '同一列在建库侧与迁移链上类型不一致 ⇒ 两条路径得到的表结构不同形').toEqual([])
  })

  it('判据边界（否决 ② 方向的通用红灯）：全库确有"只补迁移、未进建库脚本"的列且一切正常', () => {
    const 只补在链上: string[] = []
    for (const 表名 of 被补列的表()) {
      if (!建库侧有此表(表名)) continue
      for (const 项 of 迁移新增列明细(表名)) {
        if (建库侧列类型(表名, 项.列) === null) 只补在链上.push(`${项.文件.replace(/\.sql$/, '')}:${表名}.${项.列}`)
      }
    }
    expect(
      [...new Set(只补在链上)].sort(),
      '"只补迁移、不写进建库脚本"是**合法常态**（迁移链总会重放）。本用例钉住这一事实，' +
        '防止下一位工人把它误做成红灯；若哪天真把它全部补齐，本判据会红并提醒改判。',
    ).toEqual([
      '010_挑战模式:游戏档案.模式',
      '010_挑战模式:角色.对局模式',
      '013_角色音色ID:角色.音色ID',
      '014_头像签名与可见性:用户.签名可见性',
      '014_头像签名与可见性:用户.签名白名单',
      '022_用户RBAC运营审核员列:用户.审核员',
      '022_用户RBAC运营审核员列:用户.运营',
      '026_对话摘要素材锚点:对话摘要.素材锚点时间',
      '031_角色结局文案快照列:角色.结局文案',
    ])
    // 本单治理列不得落进这一族（否则就是"存量库永远补不上"的反方向缺陷）
    for (const 项 of 迁移新增列明细('好友消息')) {
      expect(只补在链上, `036 的 ${项.列} 只存在于迁移链 ⇒ 建库侧漏了`).not.toContain(
        `036_好友消息内容与引用:好友消息.${项.列}`,
      )
    }
  })
})

describe('FP-15a 新增面：init.sql 已退役，不得再自称生产建库路径', () => {
  it('文件头自述按事实写明：仅供开发参考 + 正式建库真源是 000_baseline.sql', () => {
    const 头 = 初始化源.slice(0, 3000)
    expect(头, 'init.sql 的退役自述缺失或被改写').toContain('仅供开发参考')
    expect(头, 'init.sql 未指明正式建库真源').toContain('database/000_baseline.sql')
    expect(头, 'init.sql 的自述未落到可核对的事实（挂载点/CI）').toContain('docker-entrypoint-initdb.d')
    expect(头, 'init.sql 未记录「跑不通」这一实测事实').toContain('媒体文件')
  })

  it('假自述不回流：全文（含 SQL 语义行）不得再出现「生产」或任何自称建库路径的写法', () => {
    expect(初始化源, 'init.sql 又自称生产建库路径（L-07 裁定已退役）').not.toMatch(/生产/)
    for (const 假自述 of [
      '首次建库脚本',
      '生产库首次建库',
      '生产环境首次建库',
      '本脚本用于建库',
      '正式建库走本文件',
      '本文件是建库路径',
    ]) {
      expect(初始化源, `init.sql 出现假自述：${假自述}`).not.toContain(假自述)
    }
  })

  it('退役不等于重生成：本文件的 SQL 语义仍只是「缺 媒体文件 表」的旧全量脚本（列集合不参与任何一致性门禁）', () => {
    // 这条钉的是「退役自述、不改 SQL 语义」这个裁定本身：SQL 侧一改动本用例即红，
    // 提醒改动者——要么按另一条路径重生成并同步本文件，要么回到 baseline + 迁移链。
    const 建表数 = [...初始化源.matchAll(/^CREATE TABLE IF NOT EXISTS "([^"]+)"/gm)].map((项) => 项[1])
    expect(建表数, 'init.sql 的 用户/角色 建表语句不该被顺手删').toEqual(
      expect.arrayContaining(['用户', '角色', '消息']),
    )
    expect(建表数, 'init.sql 仍不建 媒体文件 ⇒ 它不可能成为建库路径（该事实由守卫①②依赖）').not.toContain(
      '媒体文件',
    )
    expect(初始化源).toContain('DROP TABLE IF EXISTS "积分变动"')
  })
})
