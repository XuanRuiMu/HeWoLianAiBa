import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import type { Pool, PoolClient } from 'pg'
import { Pool as 池类 } from 'pg'
import { peiZhi } from '../../config'
import { BIAO_QING_YU_JU, biaoQingDengJiSuoJian } from '../表情'
import { BIAO_QING_PEI_ZHI, BIAO_QING_MEI_TI_LEI_BIE } from '../../config/表情配置'

/**
 * FP-06b 真库形态验证：路由里那串 SQL 直接从 routes/表情.ts 导入（不复制第二份），
 * 在真实 schema 上原样执行，证明 023 的建表结果与代码假设一致，且 FK / UNIQUE / CHECK
 * 三条卡口真的拦得住。
 *
 * 硬约束：所有语句必须跑在同一条连接、同一个事务里，并以 ROLLBACK 收尾 —— 中途换连接
 * 会让那条连接自动提交（第一版就因此把 媒体文件 行真写进了库，已清理），
 * 断言失败也要回滚，否则被污染的连接回到连接池会毒化后续用例（25P02）。
 * 连不上库时整组跳过（不伪造通过）。
 */

const 标记 = `fp06b-${randomUUID().replace(/-/g, '').slice(0, 12)}`
const 夹具手机号甲 = `19${randomUUID().replace(/\D/g, '').padEnd(9, '0').slice(0, 9)}`
const 夹具手机号乙 = `18${randomUUID().replace(/\D/g, '').padEnd(9, '0').slice(0, 9)}`
const 夹具用户名甲 = `fp06b-${标记}-a`
const 夹具用户名乙 = `fp06b-${标记}-b`
let 夹具用户甲ID = ''
let 夹具用户乙ID = ''

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
  const 池 = new 池类({ connectionString: 连接串, connectionTimeoutMillis: 3000 })
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

beforeAll(async () => {
  if (!真库池) return
  const 结果 = await 真库池.query(
    `INSERT INTO "用户" ("手机号", "用户名", "昵称", "测试")
     VALUES ($1, $2, $3, TRUE), ($4, $5, $6, TRUE)
     RETURNING "ID"`,
    [
      夹具手机号甲,
      夹具用户名甲,
      夹具用户名甲,
      夹具手机号乙,
      夹具用户名乙,
      夹具用户名乙,
    ],
  )
  夹具用户甲ID = String(结果.rows[0].ID)
  夹具用户乙ID = String(结果.rows[1].ID)
})

afterAll(async () => {
  if (!真库池) return
  await 真库池
    .query(`DELETE FROM "媒体文件" WHERE "原始文件名" = $1`, [标记])
    .catch(() => undefined)
  if (夹具用户甲ID) await 真库池.query('DELETE FROM "用户" WHERE "ID" = $1', [夹具用户甲ID])
  if (夹具用户乙ID) await 真库池.query('DELETE FROM "用户" WHERE "ID" = $1', [夹具用户乙ID])
  await 真库池.end().catch(() => undefined)
})

async function 在事务里(跑: (客户端: PoolClient) => Promise<void>): Promise<void> {
  const 客户端 = await 真库池!.connect()
  try {
    await 客户端.query('BEGIN')
    await 跑(客户端)
  } finally {
    await 客户端.query('ROLLBACK').catch(() => undefined)
    客户端.release()
  }
}

/** 预期失败的语句必须包在 SAVEPOINT 里，否则整个事务进入 aborted 态，后续断言全变 25P02 */
async function 期望失败(
  客户端: PoolClient,
  语句: string,
  参数: unknown[],
  错误码: string,
): Promise<void> {
  await 客户端.query('SAVEPOINT sp')
  let 抛了: unknown = null
  try {
    await 客户端.query(语句, 参数)
  } catch (cuoWu) {
    抛了 = cuoWu
  }
  await 客户端.query('ROLLBACK TO SAVEPOINT sp')
  expect(抛了, `语句未按预期失败：${语句.slice(0, 40)}`).toMatchObject({ code: 错误码 })
}

async function 建媒体(客户端: PoolClient, 用户ID: string, 序号: number): Promise<string> {
  const sha = (
    序号 + randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')
  ).slice(0, 64)
  const 结果 = await 客户端.query(
    `INSERT INTO "媒体文件" ("SHA256", "原始文件名", "MIME", "大小字节", "类别", "上传者ID")
     VALUES ($1, $4, 'image/png', 10, $3, $2) RETURNING "ID"`,
    [sha, 用户ID, BIAO_QING_MEI_TI_LEI_BIE, 标记],
  )
  return String(结果.rows[0].ID)
}

async function 建同内容媒体(客户端: PoolClient, 用户ID: string, 内容哈希: string): Promise<string> {
  const 结果 = await 客户端.query(
    `INSERT INTO "媒体文件" ("SHA256", "原始文件名", "MIME", "大小字节", "类别", "上传者ID")
     VALUES ($1, $3, 'image/png', 10, $4, $2) RETURNING "ID"`,
    [内容哈希, 用户ID, 标记, BIAO_QING_MEI_TI_LEI_BIE],
  )
  return String(结果.rows[0].ID)
}

const 该内容剩几行媒体 = `
  SELECT COUNT(*)::int AS shu FROM "媒体文件" WHERE "SHA256" = $1 AND "原始文件名" = $2`

const 该内容被登记次数 = `
  SELECT COUNT(*)::int AS shu
    FROM "用户表情" b JOIN "媒体文件" m ON m."ID" = b."媒体ID"
   WHERE b."用户ID" = $1 AND m."SHA256" = $2`

async function 取两个用户(_客户端: PoolClient): Promise<string[]> {
  return [夹具用户甲ID, 夹具用户乙ID]
}

describe.runIf(有真库)('FP-06b 用户表情真库形态（不可达即整组跳过）', () => {
  it('增/查/去重/计数/排序/删在真库跑通，顺序按 排序 生效', async () => {
    await 在事务里(async (客户端) => {
      const [甲, 乙] = await 取两个用户(客户端)
      expect(甲, '库中无用户，无法验证').toBeTruthy()
      expect(乙, '库中不足两个用户，无法验证隔离').toBeTruthy()
      const 媒体一 = await 建媒体(客户端, 甲, 1)
      const 媒体二 = await 建媒体(客户端, 甲, 2)

      const 插一 = await 客户端.query(BIAO_QING_YU_JU.插入, [甲, 媒体一, '第一张', 0])
      const 插二 = await 客户端.query(BIAO_QING_YU_JU.插入, [甲, 媒体二, '第二张', 1])
      const 标识一 = String(插一.rows[0].id)
      const 标识二 = String(插二.rows[0].id)
      expect(插一.rows[0].pai_xu).toBe(0)
      expect(插一.rows[0].duan_ming).toBe('第一张')

      const 列表 = await 客户端.query(BIAO_QING_YU_JU.查列表, [甲])
      expect(列表.rows.map((r: Record<string, unknown>) => r['id'])).toEqual([标识一, 标识二])
      expect(String(列表.rows[0].sha256)).toHaveLength(64)
      expect(String(列表.rows[0].mime)).toBe('image/png')

      const 按内容 = await 客户端.query(BIAO_QING_YU_JU.按内容查一条, [
        甲,
        列表.rows[1].sha256,
      ])
      expect(String(按内容.rows[0].id)).toBe(标识二)

      const 计数 = await 客户端.query(BIAO_QING_YU_JU.计数与下一序, [甲])
      expect(Number(计数.rows[0].shu)).toBe(2)
      expect(Number(计数.rows[0].xu)).toBe(2)

      const 标识 = await 客户端.query(BIAO_QING_YU_JU.本人标识, [甲])
      expect(标识.rows.map((r: Record<string, unknown>) => String(r['id']))).toEqual(
        [标识一, 标识二].map((id) => id.toLowerCase()),
      )

      const 改序 = await 客户端.query(BIAO_QING_YU_JU.批量改序, [甲, [标识二, 标识一]])
      expect(改序.rowCount).toBe(2)
      const 反序 = await 客户端.query(BIAO_QING_YU_JU.查列表, [甲])
      expect(反序.rows.map((r: Record<string, unknown>) => r['id'])).toEqual([标识二, 标识一])

      const 越权删 = await 客户端.query(BIAO_QING_YU_JU.删除, [标识一, 乙])
      expect(越权删.rowCount).toBe(0)
      const 本人删 = await 客户端.query(BIAO_QING_YU_JU.删除, [标识一, 甲])
      expect(本人删.rowCount).toBe(1)
      expect((await 客户端.query(BIAO_QING_YU_JU.查列表, [甲])).rows).toHaveLength(1)

      const 回收 = await 客户端.query(BIAO_QING_YU_JU.回收媒体行, [媒体二, 乙])
      expect(回收.rowCount).toBe(0)
      expect((await 客户端.query(BIAO_QING_YU_JU.回收媒体行, [媒体二, 甲])).rowCount).toBe(1)
    })
  })

  it('外键：不存在的媒体ID 被 23503 拦下', async () => {
    await 在事务里(async (客户端) => {
      const [甲] = await 取两个用户(客户端)
      await 期望失败(客户端, BIAO_QING_YU_JU.插入, [甲, randomUUID(), '', 0], '23503')
    })
  })

  it('UNIQUE(用户ID,媒体ID)：同一表情重复登记被 23505 拦下', async () => {
    await 在事务里(async (客户端) => {
      const [甲] = await 取两个用户(客户端)
      const 媒体 = await 建媒体(客户端, 甲, 3)
      await 客户端.query(BIAO_QING_YU_JU.插入, [甲, 媒体, '', 0])
      await 期望失败(客户端, BIAO_QING_YU_JU.插入, [甲, 媒体, '', 1], '23505')
    })
  })

  it('FP-20 取回再上传的完整路由序列在真库收敛：表情行与媒体行都只有一条', async () => {
    await 在事务里(async (客户端) => {
      const [甲] = await 取两个用户(客户端)
      const 同一内容 = (randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')).slice(0, 64)

      // 第一次添加：存储层建媒体行 → 按内容查不到 → 才插表情行
      const 媒体一 = await 建同内容媒体(客户端, 甲, 同一内容)
      expect((await 客户端.query(BIAO_QING_YU_JU.按内容查一条, [甲, 同一内容])).rows).toHaveLength(
        0,
      )
      const 插一 = await 客户端.query(BIAO_QING_YU_JU.插入, [甲, 媒体一, '第一次', 0])

      // 第二次把同一张图再加进来（长按「添加到表情」＝再走一次上传）：媒体层按 SHA256 内容寻址，
      // 物理字节只有一份，但存储层仍会新登记一条媒体行 —— 幂等靠的就是路由接下来这两步
      const 媒体二 = await 建同内容媒体(客户端, 甲, 同一内容)
      const 命中 = await 客户端.query(BIAO_QING_YU_JU.按内容查一条, [甲, 同一内容])
      expect(命中.rows).toHaveLength(1)
      expect(String(命中.rows[0].id)).toBe(String(插一.rows[0].id))
      await 客户端.query(BIAO_QING_YU_JU.回收媒体行, [媒体二, 甲])

      expect(
        Number((await 客户端.query(该内容剩几行媒体, [同一内容, 标记])).rows[0].shu),
      ).toBe(1)
      expect(
        Number((await 客户端.query(该内容被登记次数, [甲, 同一内容])).rows[0].shu),
      ).toBe(1)

      // 证伪「UNIQUE(用户ID,媒体ID) 保证内容幂等」：同内容只要媒体行标识不同就再插得进（不被 23505 拦），
      // 所以幂等的唯一真源是上面那次 按内容查一条（非原子的读改写）
      const 媒体三 = await 建同内容媒体(客户端, 甲, 同一内容)
      const 插三 = await 客户端.query(BIAO_QING_YU_JU.插入, [甲, 媒体三, '并发漏网', 1])
      expect(插三.rowCount).toBe(1)
      expect(
        Number((await 客户端.query(该内容被登记次数, [甲, 同一内容])).rows[0].shu),
      ).toBe(2)
    })
  })

  it('CHECK(排序 >= 0) 与 短名 列宽上限都生效', async () => {
    await 在事务里(async (客户端) => {
      const [甲] = await 取两个用户(客户端)
      const 媒体 = await 建媒体(客户端, 甲, 4)
      await 期望失败(客户端, BIAO_QING_YU_JU.插入, [甲, 媒体, '', -1], '23514')
      await 期望失败(
        客户端,
        BIAO_QING_YU_JU.插入,
        [甲, 媒体, '甲'.repeat(BIAO_QING_PEI_ZHI.duanMingZuiDaChangDu + 1), 0],
        '22001',
      )
    })
  })

  it('短名列长度与配置常量一致（改了列不改配置，截断口径就各自为政）', async () => {
    await 在事务里(async (客户端) => {
      const 结果 = await 客户端.query(
        `SELECT character_maximum_length AS chang FROM information_schema.columns
          WHERE table_name = '用户表情' AND column_name = '短名'`,
      )
      expect(Number(结果.rows[0].chang)).toBe(BIAO_QING_PEI_ZHI.duanMingZuiDaChangDu)
    })
  })

  it('表上只有本迁移声明的列（SHA256 不冗余落库，内容哈希唯一真源在 媒体文件）', async () => {
    await 在事务里(async (客户端) => {
      const 结果 = await 客户端.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = '用户表情'`,
      )
      expect(结果.rows.map((r: Record<string, unknown>) => String(r['column_name'])).sort()).toEqual(
        ['ID', '创建时间', '媒体ID', '排序', '短名', '用户ID'].sort(),
      )
    })
  })
})

/**
 * L-46 根因修的库侧取证。上一用例的「并发漏网」段已经证明 DB 里没有内容级唯一卡口，
 * 因此路由把整段读改写包进 pg_advisory_xact_lock 事务后，必须在**真实并发**下成立：
 * 后到者在拿到锁之后才开语句快照，必然看见前者已提交的条目，转命中分支回收自己的媒体行。
 *
 * 与上面那组的硬约束不同：这里必须真的提交，否则「看见前者已提交」这条无从发生。
 * 所有测试行都带 标记（媒体行的 原始文件名 / 表情行的 短名），用例自己删 + afterAll 兜底。
 */
describe.runIf(有真库)('L-46 登记读改写在库侧串行化（真库两条连接）', () => {
  async function 取一个用户(): Promise<string> {
    expect(夹具用户甲ID, '本文件夹具用户未建立').toBeTruthy()
    return 夹具用户甲ID
  }

  /** 复刻 routes/表情.ts::dengJiBiaoQing 的语句与次序；同一句 SQL 与参数形态由 BIAO_QING_YU_JU 单源 */
  async function 复刻登记(
    客户端: PoolClient,
    用户ID: string,
    媒体ID: string,
    内容哈希: string,
    短名: string,
  ): Promise<'yi_cun_zai' | 'xin_zeng'> {
    await 客户端.query(BIAO_QING_YU_JU.开启事务)
    await 客户端.query(BIAO_QING_YU_JU.取登记锁, [biaoQingDengJiSuoJian(用户ID)])
    const 命中 = await 客户端.query(BIAO_QING_YU_JU.按内容查一条, [用户ID, 内容哈希])
    if (命中.rows.length > 0) {
      await 客户端.query(BIAO_QING_YU_JU.回收媒体行, [媒体ID, 用户ID])
      await 客户端.query(BIAO_QING_YU_JU.提交事务)
      return 'yi_cun_zai'
    }
    const 计数 = await 客户端.query(BIAO_QING_YU_JU.计数与下一序, [用户ID])
    const 序 = Number((计数.rows[0] as Record<string, unknown>)['xu'] ?? 0)
    await 客户端.query(BIAO_QING_YU_JU.插入, [用户ID, 媒体ID, 短名, 序])
    await 客户端.query(BIAO_QING_YU_JU.提交事务)
    return 'xin_zeng'
  }

  async function 预建媒体(用户ID: string, 内容哈希: string): Promise<string> {
    const 客户端 = await 真库池!.connect()
    try {
      return await 建同内容媒体(客户端, 用户ID, 内容哈希)
    } finally {
      客户端.release()
    }
  }

  async function 清测试行(用户ID: string, 内容哈希: string): Promise<void> {
    await 真库池!
      .query(
        `DELETE FROM "用户表情" WHERE "用户ID" = $1 AND "短名" = $2`,
        [用户ID, 标记],
      )
      .catch(() => undefined)
    await 真库池!
      .query(`DELETE FROM "媒体文件" WHERE "SHA256" = $1 AND "原始文件名" = $2`, [
        内容哈希,
        标记,
      ])
      .catch(() => undefined)
  }

  it('advisory 锁键真互斥：前一个事务未结束，另一条连接拿不到同一个键', async () => {
    const 键 = biaoQingDengJiSuoJian('advisory-互斥取证')
    const 甲连接 = await 真库池!.connect()
    const 乙连接 = await 真库池!.connect()
    try {
      await 甲连接.query(BIAO_QING_YU_JU.开启事务)
      await 甲连接.query(BIAO_QING_YU_JU.取登记锁, [键])
      const 乙在甲未提交时 = await 乙连接.query(
        `SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS ke_yi`,
        [键],
      )
      expect(乙在甲未提交时.rows[0].ke_yi, '第二条连接竟拿到了在用的锁').toBe(false)
      await 甲连接.query(BIAO_QING_YU_JU.提交事务)
      const 乙在甲提交后 = await 乙连接.query(
        `SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS ke_yi`,
        [键],
      )
      expect(乙在甲提交后.rows[0].ke_yi, '锁未随事务结束而释放').toBe(true)
    } finally {
      await 乙连接.query(BIAO_QING_YU_JU.回滚事务).catch(() => undefined)
      甲连接.release()
      乙连接.release()
    }
  })

  it('并发两次登记同一内容：只留一条表情行，输家回收自己的媒体行', async () => {
    const 甲 = await 取一个用户()
    const 内容哈希 = (
      randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')
    ).slice(0, 64)
    const 媒体一 = await 预建媒体(甲, 内容哈希)
    const 媒体二 = await 预建媒体(甲, 内容哈希)
    const 事件: string[] = []
    const 连接一 = await 真库池!.connect()
    const 连接二 = await 真库池!.connect()
    try {
      // 甲：进事务拿锁后停在「查无」这一步，模拟窗口已经打开
      await 连接一.query(BIAO_QING_YU_JU.开启事务)
      await 连接一.query(BIAO_QING_YU_JU.取登记锁, [biaoQingDengJiSuoJian(甲)])
      expect((await 连接一.query(BIAO_QING_YU_JU.按内容查一条, [甲, 内容哈希])).rows).toHaveLength(0)
      事件.push('连接一拿到锁')

      // 乙：同一时刻进同一把锁，必须阻塞在锁上（不是"碰巧读得晚"）
      const 乙 = 复刻登记(连接二, 甲, 媒体二, 内容哈希, 标记).then((分支) => {
        事件.push(`连接二落定:${分支}`)
        return 分支
      })
      await new Promise((解决) => setTimeout(解决, 80))
      expect(事件, '第二条连接没被锁挡住，测的是时序而不是锁').toEqual(['连接一拿到锁'])

      await 连接一.query(BIAO_QING_YU_JU.插入, [甲, 媒体一, 标记, 0])
      await 连接一.query(BIAO_QING_YU_JU.提交事务)
      事件.push('连接一提交')
      expect(await 乙).toBe('yi_cun_zai')
      expect(事件[1]).toBe('连接一提交')

      expect(
        Number((await 真库池!.query(该内容被登记次数, [甲, 内容哈希])).rows[0].shu),
        '并发留下了两条表情行'
      ).toBe(1)
      expect(
        Number((await 真库池!.query(该内容剩几行媒体, [内容哈希, 标记])).rows[0].shu),
        '输家的媒体行没被回收'
      ).toBe(1)
    } finally {
      await 连接一.query(BIAO_QING_YU_JU.回滚事务).catch(() => undefined)
      await 连接二.query(BIAO_QING_YU_JU.回滚事务).catch(() => undefined)
      连接一.release()
      连接二.release()
      await 清测试行(甲, 内容哈希)
    }
  })

  it('证伪对照：不加锁的同一条读改写真的会留下双行（锁不是摆设）', async () => {
    const 甲 = await 取一个用户()
    const 内容哈希 = (
      randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')
    ).slice(0, 64)
    const 媒体一 = await 预建媒体(甲, 内容哈希)
    const 媒体二 = await 预建媒体(甲, 内容哈希)
    const 连接一 = await 真库池!.connect()
    const 连接二 = await 真库池!.connect()
    try {
      // 与上一用例同一交错，唯一区别：不取 取登记锁
      await 连接一.query(BIAO_QING_YU_JU.开启事务)
      await 连接二.query(BIAO_QING_YU_JU.开启事务)
      expect((await 连接一.query(BIAO_QING_YU_JU.按内容查一条, [甲, 内容哈希])).rows).toHaveLength(0)
      expect((await 连接二.query(BIAO_QING_YU_JU.按内容查一条, [甲, 内容哈希])).rows).toHaveLength(0)
      await 连接一.query(BIAO_QING_YU_JU.插入, [甲, 媒体一, 标记, 0])
      await 连接一.query(BIAO_QING_YU_JU.提交事务)
      await 连接二.query(BIAO_QING_YU_JU.插入, [甲, 媒体二, 标记, 1])
      await 连接二.query(BIAO_QING_YU_JU.提交事务)
      expect(
        Number((await 真库池!.query(该内容被登记次数, [甲, 内容哈希])).rows[0].shu),
        '对照组没能复现双行 ⇒ 并发用例的说服力要重估',
      ).toBe(2)
    } finally {
      await 连接一.query(BIAO_QING_YU_JU.回滚事务).catch(() => undefined)
      await 连接二.query(BIAO_QING_YU_JU.回滚事务).catch(() => undefined)
      连接一.release()
      连接二.release()
      await 清测试行(甲, 内容哈希)
    }
  })

  it('存量重复行按裁定保留（修复只对未来写入生效，删用户资产行属越权动作）', async () => {
    const 甲 = await 取一个用户()
    const 内容哈希 = (
      randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '')
    ).slice(0, 64)
    const 媒体一 = await 预建媒体(甲, 内容哈希)
    const 媒体二 = await 预建媒体(甲, 内容哈希)
    try {
      // 先造两行「历史重复」（对照组已证 DB 卡不住），再走一次新的登记路径
      const 客户端 = await 真库池!.connect()
      try {
        await 客户端.query(BIAO_QING_YU_JU.插入, [甲, 媒体一, 标记, 0])
        await 客户端.query(BIAO_QING_YU_JU.插入, [甲, 媒体二, 标记, 1])
      } finally {
        客户端.release()
      }
      expect(
        Number((await 真库池!.query(该内容被登记次数, [甲, 内容哈希])).rows[0].shu),
      ).toBe(2)

      // 命中分支取「排序最前」那条并原样回传：两行都在 ⇒ 面板仍读得到、用户仍可自己删与排序
      const 第三条 = await 预建媒体(甲, 内容哈希)
      const 连接 = await 真库池!.connect()
      try {
        expect(await 复刻登记(连接, 甲, 第三条, 内容哈希, 标记)).toBe('yi_cun_zai')
      } finally {
        连接.release()
      }
      expect(
        Number((await 真库池!.query(该内容被登记次数, [甲, 内容哈希])).rows[0].shu),
        '登记路径不得替用户删掉历史行，也不该再多留一行',
      ).toBe(2)
      expect(
        Number((await 真库池!.query(该内容剩几行媒体, [内容哈希, 标记])).rows[0].shu),
      ).toBe(2)
    } finally {
      await 真库池!
        .query(`DELETE FROM "媒体文件" WHERE "SHA256" = $1 AND "原始文件名" = $2`, [
          内容哈希,
          标记,
        ])
        .catch(() => undefined)
      await 清测试行(甲, 内容哈希)
    }
  })
})
