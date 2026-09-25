import { describe, it, expect, afterAll, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { peiZhi } from '../../config'
import { MEI_TI_KE_DU_YU_JU, shengChengQianMingURL, yanZhengQianMing } from '../../services/媒体存储'

/**
 * FP-21 真库取证（遗留 L-19 的结案证据）。三件事必须由真 Postgres 写出，而不是由注释推定：
 *  ① 两条建库路径（现网＝baseline+migrations；干净卷＝baseline+initdb 001_haoyou）在迁移 027
 *     之后 好友消息.媒体ID 的形态与约束**全等**；现网库侧只做只读取证，且比对目标由**台账**决定
 *     （FP-21/036 起：台账尚未登记的迁移所引入的对象允许在现网库里缺席，已登记则一条都不许缺）——
 *     本地主库按红线永不执行 DDL，拿「重放完整链」的形态死比现网库只会产生假红灯。
 *  ② 媒体读取判定 SQL（services/媒体存储.ts::MEI_TI_KE_DU_YU_JU）在真数据上的授权边界：
 *     上传者本人 / 好友消息的收发双方可读，陌生用户、被撤回的消息、已解除的好友一律不可读；
 *  ③ 签名 URL 的「换不了人」性质：为甲签的地址在乙的请求下不成立（第三方拿到 URL 也读不到）。
 *
 * 全程只连**临时库**（自己 CREATE、自己 DROP），不改现网库一个字节；现网库只做只读 information_schema 取证。
 * 连不上库时整组跳过（不伪造通过），与 表情真库.test.ts / 迁移024性别归一.test.ts 同口径。
 */

const 迁移目录 = resolve(__dirname, '..', '..', '..', 'database', 'migrations')
const 建库根目录 = resolve(__dirname, '..', '..', '..', '..', 'database')

function 读文件(...段: string[]): string {
  return readFileSync(resolve(...段), 'utf-8')
}

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

async function 取管理池(): Promise<Pool | null> {
  const 串 = 取可连通连接串('postgres')
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
const 已建库: string[] = []

async function 建临时库(用途: string): Promise<Pool> {
  const 库名 = `fp21_${用途}_${后缀}`.slice(0, 60).toLowerCase()
  await (管理池 as Pool).query(`CREATE DATABASE "${库名}"`)
  已建库.push(库名)
  return new Pool({ connectionString: 取可连通连接串(库名), max: 1 })
}

/** 好友消息 的列形态 + 约束集合：两条路径的比对目标 */
async function 取好友消息形态(池: Pool): Promise<{ 列: string; 约束: string[] }> {
  const 列 = await 池.query(
    `SELECT format_type(atttypid, atttypmod) AS lx FROM pg_attribute
      WHERE attrelid = '好友消息'::regclass AND attname = '媒体ID'`,
  )
  const 约束 = await 池.query(
    `SELECT conname || ' :: ' || pg_get_constraintdef(oid) AS d
       FROM pg_constraint WHERE conrelid = '好友消息'::regclass ORDER BY conname`,
  )
  return { 列: String(列.rows[0]?.['lx'] ?? ''), 约束: 约束.rows.map((r: Record<string, unknown>) => String(r['d'])) }
}

async function 重放SQL文件(池: Pool, 路径: string): Promise<void> {
  await 池.query(读文件(路径))
}

async function 重放迁移链(池: Pool): Promise<void> {
  const 清单 = readdirSync(迁移目录)
    .filter((名) => 名.endsWith('.sql'))
    .sort()
  for (const 名 of 清单) await 重放SQL文件(池, resolve(迁移目录, 名))
}

let 路径A: { 列: string; 约束: string[] } | null = null
let 路径B: { 列: string; 约束: string[] } | null = null

describe.skipIf(!有真库)('FP-21 ⑤ 两条建库路径的 好友消息.媒体ID 形态一致（真库）', () => {
  it('路径A：baseline + migrations（现网库历史路径）跑完 027/028 后为 uuid + FK + 类型 CHECK', async () => {
    const 池 = await 建临时库('patha')
    try {
      await 重放SQL文件(池, resolve(建库根目录, '000_baseline.sql'))
      await 重放迁移链(池)
      路径A = await 取好友消息形态(池)
      expect(路径A.列).toBe('uuid')
    } finally {
      await 池.end()
    }
  }, 180000)

  it('路径B：baseline + compose initdb 的 001_haoyou_yu_shezhi.sql 再跑迁移链（干净卷路径）', async () => {
    const 池 = await 建临时库('pathb')
    try {
      await 重放SQL文件(池, resolve(建库根目录, '000_baseline.sql'))
      await 重放SQL文件(池, resolve(建库根目录, '001_haoyou_yu_shezhi.sql'))
      await 重放迁移链(池)
      路径B = await 取好友消息形态(池)
      expect(路径B.列).toBe('uuid')
    } finally {
      await 池.end()
    }
  }, 180000)

  it('两条路径的列形态与约束集合逐条全等（L-19 的双份 DDL 就此闭合）', () => {
    expect(路径A && 路径B).toBeTruthy()
    expect(路径B!.约束).toEqual(路径A!.约束)
    expect(路径A!.约束.join('\n')).toContain('好友消息_媒体ID_fkey :: FOREIGN KEY ("媒体ID") REFERENCES "媒体文件"("ID") ON DELETE SET NULL')
    expect(路径A!.约束.join('\n')).toContain('好友消息_类型合法')
  })

  it('现网库（只读取证）形态 = 台账所记录那一版的形态，且 027/028 已在台账', async () => {
    const 池 = new Pool({ connectionString: 取可连通连接串(), max: 1 })
    try {
      const 现网 = await 取好友消息形态(池)
      const 台账 = await 池.query(
        `SELECT version FROM schema_migrations WHERE version IN ('027','028','036') ORDER BY version`,
      )
      const 版 = 台账.rows.map((r: Record<string, unknown>) => String(r['version']))
      expect(版.filter((v) => v === '027' || v === '028')).toEqual(['027', '028'])
      // 【FP-21 契约演进（本单，非放宽）】旧断言是 `expect(现网).toEqual(路径A)`，即拿「重放完整迁移链」
      // 的形态去比现网库。036 落地后这句话在**任何**新迁移尚未应用的库上都会红，而本地主库按红线
      // （PROGRESS L-02：与「恋爱吧管理中心」共用 ⇒ 禁止对主库任何 DDL）永远不会由本用例去应用迁移。
      // 新断言把「未应用」显式建模：现网形态必须等于「路径A 减去台账里尚未登记的迁移所引入的对象」。
      // 判据反而更强，不是更弱 ——
      //  ① 036 引入的对象必须**恰好两条**（FK + 自引用 CHECK），少一条就是 036 自己漏建（红）；
      //  ② 036 已在台账时差集必须为空，缺列即红（旧断言原样保留）；
      //  ③ 036 未在台账时，现网**多**出这两条同样红（deepEqual 双向，不是单向包含）。
      const 已登记036 = 版.includes('036')
      const 由〇三六引入 = 路径A!.约束.filter(
        (d) => d.startsWith('好友消息_被引用消息ID_fkey ::') || d.startsWith('好友消息_不得自引用 ::'),
      )
      expect(由〇三六引入, '036 应且仅应给 好友消息 增加两条约束（FK + 自引用 CHECK）').toHaveLength(2)
      expect(由〇三六引入.join('\n')).toContain(
        'FOREIGN KEY ("被引用消息ID") REFERENCES "好友消息"("ID") ON DELETE SET NULL',
      )
      expect(由〇三六引入.join('\n')).toContain('CHECK (("ID" <> "被引用消息ID"))')
      const 期望约束 = 已登记036
        ? 路径A!.约束
        : 路径A!.约束.filter((d) => !由〇三六引入.includes(d))
      expect({ 列: 现网.列, 约束: 现网.约束 }).toEqual({ 列: 路径A!.列, 约束: 期望约束 })
      const 索引 = await 池.query(
        `SELECT indexname FROM pg_indexes WHERE tablename = '好友消息' AND indexname = 'idx_好友消息_媒体ID'`,
      )
      expect(索引.rows.length).toBe(1)
    } finally {
      await 池.end()
    }
  })

  it('027 的 CHECK 值域与应用侧消息类型白名单同源（三处不各写一份）', async () => {
    const { LEI_BIE_DAO_XIAO_XI_LEI_XING, YUN_XU_XIAO_XI_LEI_XING } = await import('../../config/媒体配置')
    const 池 = new Pool({ connectionString: 取可连通连接串(), max: 1 })
    try {
      const 约 = await 池.query(
        `SELECT pg_get_constraintdef(oid) AS d FROM pg_constraint
          WHERE conrelid = '好友消息'::regclass AND conname = '好友消息_类型合法'`,
      )
      const 定义 = String(约.rows[0]['d'])
      // 配置派生出的类型码集合必须与库内 CHECK 恰好同一批（不多不少），双向比对
      expect([...YUN_XU_XIAO_XI_LEI_XING].sort()).toEqual(['biaoQingBao', 'tuPian', 'wenJian', 'wenben', 'yuYin'])
      expect(Object.values(LEI_BIE_DAO_XIAO_XI_LEI_XING).sort()).toEqual(
        ['biaoQingBao', 'tuPian', 'wenJian', 'yuYin'],
      )
      for (const 码 of YUN_XU_XIAO_XI_LEI_XING) expect(定义).toContain(`'${码}'::character varying`)
      expect(定义.match(/'[^']*'::character varying/g)?.length).toBe(YUN_XU_XIAO_XI_LEI_XING.length)
      // 路由不再自带字面量清单，改引配置单源
      const 路由源 = readFileSync(resolve(__dirname, '..', '好友.ts'), 'utf-8')
      expect(路由源).toContain('new Set<string>(YUN_XU_XIAO_XI_LEI_XING)')
      expect(路由源).not.toMatch(/new Set\(\['wenben'/)
    } finally {
      await 池.end()
    }
  })
})

const 甲 = '11111111-1111-4111-8111-111111111111'
const 乙 = '22222222-2222-4222-8222-222222222222'
const 丙 = '33333333-3333-4333-8333-333333333333'
const 媒体_甲传 = '44444444-4444-4444-8444-444444444444'
const 媒体_乙传 = '55555555-5555-4555-8555-555555555555'
const SHA_甲图 = 'a'.repeat(64)
const SHA_乙图 = 'b'.repeat(64)
const 消息_甲发乙 = '66666666-6666-4666-8666-666666666666'
const 消息_撤回 = '77777777-7777-4777-8777-777777777777'

let 判定池: Pool | null = null

// 媒体存储的签名校验内部用的是应用侧 数据库 单例与 redis：把它改指向本文件的临时库，
// 才是在「真 SQL + 真数据」上验授权边界，而不是对着宿主机不可达的 @postgres 得到一个假 false。
vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => {
      if (!判定池) throw new Error('判定库尚未建立')
      return 判定池.query(文本, 参数)
    },
  },
}))

vi.mock('../../redis', () => ({
  redis: { get: async () => null, set: async () => 'OK' },
}))

async function 建判定库(): Promise<Pool> {
  const 池 = await 建临时库('predicate')
  await 重放SQL文件(池, resolve(建库根目录, '000_baseline.sql'))
  await 重放SQL文件(池, resolve(建库根目录, '001_haoyou_yu_shezhi.sql'))
  await 池.query(
    `INSERT INTO "用户" ("ID","手机号","用户名","昵称") VALUES
       ($1,'13900000001','fp21-jia','甲'),
       ($2,'13900000002','fp21-yi','乙'),
       ($3,'13900000003','fp21-bing','丙')`,
    [甲, 乙, 丙],
  )
  await 池.query(
    `INSERT INTO "媒体文件" ("ID","SHA256","原始文件名","MIME","大小字节","类别","上传者ID") VALUES
       ($1,$2,'jia.png','image/png',10,'tupian',$3),
       ($4,$5,'yi.png','image/png',10,'tupian',$6)`,
    [媒体_甲传, SHA_甲图, 甲, 媒体_乙传, SHA_乙图, 乙],
  )
  await 池.query(
    `INSERT INTO "好友申请" ("ID","申请者ID","接收者ID","状态") VALUES (gen_random_uuid(), $1, $2, 'accepted')`,
    [甲, 乙],
  )
  await 池.query(
    `INSERT INTO "好友消息" ("ID","发送者ID","接收者ID","内容","类型","媒体ID") VALUES
       ($1,$2,$3,'','tuPian',$4),
       ($5,$2,$3,'','tuPian',$4)`,
    [消息_甲发乙, 甲, 乙, 媒体_甲传, 消息_撤回],
  )
  await 池.query(`UPDATE "好友消息" SET "撤回" = TRUE WHERE "ID" = $1`, [消息_撤回])
  return 池
}

describe.skipIf(!有真库)('FP-21 ⑥ 媒体读取判定的授权边界（真库执行路由同款 SQL）', () => {
  it('上传者可读、好友接收方可读', async () => {
    判定池 = await 建判定库()
    const keDu = async (sha: string, yongHuId: string) =>
      (await 判定池!.query(MEI_TI_KE_DU_YU_JU, [sha, yongHuId])).rows.length > 0
    expect(await keDu(SHA_甲图, 甲)).toBe(true)
    expect(await keDu(SHA_甲图, 乙)).toBe(true)
  })

  it('陌生用户不可读；解除好友后接收方立即不可读（fail-closed）', async () => {
    const keDu = async (sha: string, yongHuId: string) =>
      (await 判定池!.query(MEI_TI_KE_DU_YU_JU, [sha, yongHuId])).rows.length > 0
    expect(await keDu(SHA_甲图, 丙)).toBe(false)
    expect(await keDu(SHA_乙图, 甲)).toBe(false)
    // 未撤回的那条仍对双方可读，撤回的那条单独不构成授权（见下一条）
    await 判定池.query(`UPDATE "好友申请" SET "状态" = 'rejected' WHERE "申请者ID" = $1 AND "接收者ID" = $2`, [甲, 乙])
    expect(await keDu(SHA_甲图, 乙)).toBe(false)
    expect(await keDu(SHA_甲图, 甲)).toBe(true)
  })

  it('被撤回的好友消息不再作为授权依据', async () => {
    await 判定池!.query(`UPDATE "好友消息" SET "撤回" = TRUE WHERE "ID" = $1`, [消息_甲发乙])
    const keDu = async (sha: string, yongHuId: string) =>
      (await 判定池!.query(MEI_TI_KE_DU_YU_JU, [sha, yongHuId])).rows.length > 0
    expect(await keDu(SHA_甲图, 乙)).toBe(false)
    expect(await keDu(SHA_甲图, 甲)).toBe(true)
  })

  it('签名 URL 绑定读者：为甲签的地址在乙的请求下不成立，未签名与乱猜哈希一律 false', async () => {
    const 串_甲 = shengChengQianMingURL(SHA_甲图, 甲)
    const 参 = new URL(串_甲, 'http://x').searchParams
    const 甲的URL = { sha: SHA_甲图, e: 参.get('e'), u: 参.get('u'), t: 参.get('t'), s: 参.get('s') }
    // 地址必须是「绑定读者」形态：u 与 t 都在，且 u 就是被签的那个用户
    expect(甲的URL.u).toBe(甲)
    expect(甲的URL.t).toBeTruthy()
    // 甲自己：签名与谓词都成立 ⇒ 真取得到（这条同时证明 yanZhengQianMing 走的是本临时库的判定，
    // 而不是宿主机不可达时那个恒 false 的兜底）
    await 判定池!.query(`UPDATE "好友消息" SET "撤回" = FALSE WHERE "ID" = $1`, [消息_甲发乙])
    expect(await yanZhengQianMing(甲的URL.sha, 甲的URL.e, 甲的URL.u, 甲的URL.s, 甲的URL.t)).toBe(true)
    // 把甲地址里的 u 换成乙 ⇒ 签名不符（u 在 HMAC 输入内），拿不到内容
    expect(await yanZhengQianMing(甲的URL.sha, 甲的URL.e, 乙, 甲的URL.s, 甲的URL.t)).toBe(false)
    // 未签名 / 过期 / 哈希不是 64 位十六进制 ⇒ 一律 false，且不给「存在与否」的差异信号
    expect(await yanZhengQianMing(SHA_甲图, null, null, null, null)).toBe(false)
    expect(await yanZhengQianMing('不存在不存在', 甲的URL.e, 甲的URL.u, 甲的URL.s, 甲的URL.t)).toBe(false)
    const 过期 = shengChengQianMingURL(SHA_甲图, 甲, -10)
    const 过期参 = new URL(过期, 'http://x').searchParams
    expect(
      await yanZhengQianMing(SHA_甲图, 过期参.get('e'), 过期参.get('u'), 过期参.get('s'), 过期参.get('t')),
    ).toBe(false)
  })
})

afterAll(async () => {
  if (判定池) await 判定池.end().catch(() => undefined)
  if (管理池) {
    for (const 库名 of 已建库) {
      await 管理池.query(`DROP DATABASE IF EXISTS "${库名}"`).catch(() => undefined)
    }
    await 管理池.end().catch(() => undefined)
  }
})
