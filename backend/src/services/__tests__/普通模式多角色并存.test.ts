import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import { peiZhi } from '../../config'
import { CUO_WU_DAI_MA } from '../../config/错误码注册表'

vi.mock('../开场白生成', () => ({ shengChengKaiChangBai: vi.fn(async () => ({ xiao_xi_lie_biao: [] as string[] })) }))
vi.mock('../开场白概率', () => ({ jiSuanKaiChangBaiGaiLv: vi.fn(async () => 0) }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
}))
vi.mock('../../utils/邮件告警', () => ({ faSongGaoJing: vi.fn(async () => undefined) }))

import { 数据库 } from '../../数据库'
import { baoCunJiaoSe, shengChengJiaoSe, type ShengChengJiaoSeJieGuo } from '../角色生成'
import { chuangJianYongHuXiaoXi, huoQuJiaoSeSuoYouZhe, huoQuXiaoXiLieBiao } from '../消息'
import { kaiShiTiaoZhan, jieSuanTiaoZhanDuiJu, huoQuWoDeGaiKuang, huoQuDangQianDuiJu } from '../挑战积分'
import { huoQuDangAnLieBiao } from '../战绩'

/**
 * 普通模式多角色并存（迁移 040）的服务层真库回归。
 *
 * 覆盖需求原文的五条：
 *  ① 同一用户连续生成两个普通模式角色后，二者均未封存、均可发消息、战绩档案各自存在；
 *  ② 生成第三个不归档前两个；
 *  ③ 挑战侧不回归：同一用户仍只允许一局挑战进行中（409），且挑战积分照常记账；
 *  ④ 事务失败仍完整回滚，不残留角色/好感度/档案；
 *  ⑤ 用户.活跃角色ID 只承载「最近生成的角色ID」，不再是排他入口。
 *
 * 真库落点：仅当 TEST_DATABASE_URL 显式给出且连得上时才跑（连不上整组跳过，不伪造通过）。
 * 不读 XU_KE_ZHEN_SHI_WAI_HU —— 那条路径下 src/test-setup.ts 不改写连接串，
 * 服务会连 .env 里的现网库；本文件因此只认 TEST_DATABASE_URL，绝不碰现网库。
 */

const 迁移040 = readFileSync(
  resolve(__dirname, '..', '..', '..', 'database', 'migrations', '040_普通模式多角色并存.sql'),
  'utf-8',
)

function 取连接串(): string {
  return (process.env.TEST_DATABASE_URL ?? '').trim()
}

async function 真库可达(连接串: string): Promise<boolean> {
  if (连接串 === '') return false
  const 探测 = new Pool({ connectionString: 连接串, connectionTimeoutMillis: 3000 })
  try {
    await 探测.query('SELECT 1')
    return true
  } catch {
    return false
  } finally {
    await 探测.end().catch(() => undefined)
  }
}

const 连接串 = 取连接串()
const 有真库 = await 真库可达(连接串)
const 夹具手机号 = `14${randomUUID().replace(/\D/g, '').padEnd(9, '0').slice(0, 9)}`
const 故障角色名 = 'fp040-boom'
let 夹具用户ID = ''

function 新角色(覆盖: Partial<ShengChengJiaoSeJieGuo> = {}): ShengChengJiaoSeJieGuo {
  return { ...shengChengJiaoSe({ yong_hu_id: 夹具用户ID, xing_bie: 'nv' }), ...覆盖 }
}

async function 直查(文本: string, 参数: unknown[] = []): Promise<Record<string, unknown>[]> {
  return (await 数据库.query(文本, 参数)).rows as unknown as Record<string, unknown>[]
}

async function 角色行(角色ID列表: string[]): Promise<Record<string, unknown>[]> {
  return await 直查(
    `SELECT "ID", "名字", "封存", "可继续聊天", "结局状态", "对局模式"
       FROM "角色" WHERE "ID" = ANY($1::uuid[]) ORDER BY "创建时间"`,
    [角色ID列表],
  )
}

async function 各表行数(): Promise<{ 角色: number; 好感度: number; 游戏档案: number }> {
  const 角色 = await 直查(`SELECT count(*)::int AS n FROM "角色" WHERE "用户ID" = $1`, [夹具用户ID])
  const 好感度 = await 直查(`SELECT count(*)::int AS n FROM "好感度" WHERE "用户ID" = $1`, [夹具用户ID])
  const 游戏档案 = await 直查(`SELECT count(*)::int AS n FROM "游戏档案" WHERE "用户ID" = $1`, [夹具用户ID])
  return { 角色: Number(角色[0].n), 好感度: Number(好感度[0].n), 游戏档案: Number(游戏档案[0].n) }
}

let 注入触发器建了 = false

/**
 * 故障注入：给 游戏档案 挂一个 BEFORE INSERT 触发器，只对配置表里指定的那个「角色名字」抛错。
 * 触发器的 WHEN 子句不允许带占位符，故目标名字走配置表单行行比对，全链路仍是参数化/无拼串。
 * 装配与拆除都在用例内成对完成，afterAll 再兜一次底。
 */
async function 装故障注入(): Promise<void> {
  await 数据库.query(
    `CREATE TABLE IF NOT EXISTS "fp040_故障配置" ("ID" INT PRIMARY KEY, "角色名字" VARCHAR(50) NOT NULL)`,
  )
  await 数据库.query(
    `INSERT INTO "fp040_故障配置" ("ID", "角色名字") VALUES (1, $1)
     ON CONFLICT ("ID") DO UPDATE SET "角色名字" = EXCLUDED."角色名字"`,
    [故障角色名],
  )
  await 数据库.query(
    `CREATE OR REPLACE FUNCTION "fp040_注入故障"() RETURNS trigger AS $fp040$
       BEGIN
         IF NEW."角色名字" = (SELECT "角色名字" FROM "fp040_故障配置" WHERE "ID" = 1) THEN
           RAISE EXCEPTION 'fp040 注入故障';
         END IF;
         RETURN NEW;
       END;
     $fp040$ LANGUAGE plpgsql`,
  )
  await 数据库.query(
    `CREATE TRIGGER "fp040_注入故障" BEFORE INSERT ON "游戏档案"
       FOR EACH ROW EXECUTE FUNCTION "fp040_注入故障"()`,
  )
  注入触发器建了 = true
}

async function 拆故障注入(): Promise<void> {
  if (!注入触发器建了) return
  await 数据库.query(`DROP TRIGGER IF EXISTS "fp040_注入故障" ON "游戏档案"`).catch(() => undefined)
  await 数据库.query(`DROP FUNCTION IF EXISTS "fp040_注入故障"()`).catch(() => undefined)
  await 数据库.query(`DROP TABLE IF EXISTS "fp040_故障配置"`).catch(() => undefined)
  注入触发器建了 = false
}

beforeAll(async () => {
  if (!有真库) return
  // 040 幂等：跑一遍即把本文件的前置条件（角色表无排他唯一索引）置成立
  await 数据库.query(迁移040)
  const 用户 = await 数据库.query(
    `INSERT INTO "用户" ("手机号", "用户名", "昵称", "测试") VALUES ($1, $2, $3, TRUE) RETURNING "ID"`,
    [夹具手机号, `fp040-${randomUUID().slice(0, 8)}`, `fp040-${randomUUID().slice(0, 8)}`],
  )
  夹具用户ID = String(用户.rows[0].ID)
}, 60000)

afterAll(async () => {
  if (!有真库) return
  await 拆故障注入()
  // 夹具用户是本文件唯一写入源，级联带走角色/好感度/档案/消息/挑战两表
  await 数据库.query('DELETE FROM "用户" WHERE "ID" = $1', [夹具用户ID]).catch(() => undefined)
})

describe.skipIf(!有真库)('普通模式多角色并存：前置条件与角色状态列', () => {
  it('角色表上两个排他唯一索引确已不存在（040 已生效），挑战进行中唯一索引仍在', async () => {
    const 角色索引 = await 直查(
      `SELECT c.relname AS 名, i.indisunique AS 唯一
         FROM pg_class t JOIN pg_index i ON i.indrelid = t.oid JOIN pg_class c ON c.oid = i.indexrelid
        WHERE t.oid = '角色'::regclass`,
    )
    expect(角色索引.filter((行) => 行.唯一 && String(行.名).startsWith('uk_'))).toEqual([])
    expect(角色索引.some((行) => String(行.名).toLowerCase() === 'idx_角色_用户id_活跃')).toBe(true)
    const 挑战索引 = await 直查(
      `SELECT c.relname AS 名, i.indisunique AS 唯一
         FROM pg_class t JOIN pg_index i ON i.indrelid = t.oid JOIN pg_class c ON c.oid = i.indexrelid
        WHERE t.oid = '挑战对局'::regclass`,
    )
    const 进行中 = 挑战索引.find((行) => String(行.名).toLowerCase() === 'uk_挑战对局_用户_进行中')
    expect(进行中, '挑战进行中的唯一索引不在了').toBeTruthy()
    expect(进行中!.唯一).toBe(true)
  })

  it('新角色显式写入 封存=false / 可继续聊天=true / 结局状态=\'\'（不吃列默认值）', async () => {
    const 角色 = await baoCunJiaoSe(夹具用户ID, 新角色(), 'putong')
    const 行 = (await 角色行([角色.id]))[0]
    expect(行.封存).toBe(false)
    expect(行.可继续聊天).toBe(true)
    expect(行.结局状态).toBe('')
  })
})

describe.skipIf(!有真库)('普通模式多角色并存：连续生成、并行聊天、档案并存', () => {
  it('连续生成三个普通模式角色：三者都未封存、好感度和战绩档案各自存在、活跃角色ID 指向最后一个', async () => {
    const 首个 = await baoCunJiaoSe(夹具用户ID, 新角色(), 'putong')
    const 次个 = await baoCunJiaoSe(夹具用户ID, 新角色(), 'putong')
    const 第三个 = await baoCunJiaoSe(夹具用户ID, 新角色(), 'putong')
    const 三者 = [首个.id, 次个.id, 第三个.id]
    expect(new Set(三者).size).toBe(3)

    const 行 = await 角色行(三者)
    expect(行).toHaveLength(3)
    for (const 项 of 行) {
      expect(项.封存, `${String(项.ID)} 被后来的生成归档了`).toBe(false)
      expect(项.可继续聊天).toBe(true)
      expect(项.对局模式).toBe('putong')
    }

    const 好感度 = await 直查(`SELECT "角色ID" FROM "好感度" WHERE "角色ID" = ANY($1::uuid[])`, [三者])
    expect(好感度.map((项) => String(项.角色ID)).sort()).toEqual([...三者].sort())

    const 档案 = await 直查(
      `SELECT "角色ID", "模式", "是否封存" FROM "游戏档案" WHERE "角色ID" = ANY($1::uuid[])`,
      [三者],
    )
    expect(档案.map((项) => String(项.角色ID)).sort()).toEqual([...三者].sort())
    for (const 项 of 档案) {
      expect(项.模式).toBe('putong')
      expect(项.是否封存).toBe(false)
    }

    // 战绩档案读取面（唯一入口 services/战绩）：三个角色各自的档案都在列表里
    const 战绩列表 = await huoQuDangAnLieBiao(夹具用户ID)
    const 命中 = 战绩列表.filter((项) => 三者.includes(项.jiao_se_id)).map((项) => 项.jiao_se_id)
    expect(命中.sort()).toEqual([...三者].sort())

    // 用户.活跃角色ID 只剩「最近生成的角色ID」这层语义
    const 用户行 = await 直查(`SELECT "活跃角色ID" FROM "用户" WHERE "ID" = $1`, [夹具用户ID])
    expect(String(用户行[0].活跃角色ID)).toBe(第三个.id)
  })

  it('前两个角色仍可发消息，且两个会话的消息互不串（并行聊天）', async () => {
    const 行 = await 直查(
      `SELECT "ID" FROM "角色" WHERE "用户ID" = $1 AND "对局模式" = 'putong' ORDER BY "创建时间" LIMIT 2`,
      [夹具用户ID],
    )
    const [甲, 乙] = 行.map((项) => String(项.ID))
    for (const 角色ID of [甲, 乙]) {
      const 归属 = await huoQuJiaoSeSuoYouZhe(角色ID)
      expect(归属?.shi_fou_feng_cun).toBe(false)
      expect(归属?.ke_ji_xu_liao_tian).toBe(true)
    }
    const 发甲 = await chuangJianYongHuXiaoXi({ yong_hu_id: 夹具用户ID, jiao_se_id: 甲, nei_rong: '甲会话的话' })
    const 发乙 = await chuangJianYongHuXiaoXi({ yong_hu_id: 夹具用户ID, jiao_se_id: 乙, nei_rong: '乙会话的话' })
    expect(发甲.cheng_gong, JSON.stringify(发甲)).toBe(true)
    expect(发乙.cheng_gong, JSON.stringify(发乙)).toBe(true)
    expect(发甲.xiao_xi!.id).not.toBe(发乙.xiao_xi!.id)

    const 甲会话 = await huoQuXiaoXiLieBiao({ yong_hu_id: 夹具用户ID, jiao_se_id: 甲, mei_ye_tiao_shu: 50 })
    const 乙会话 = await huoQuXiaoXiLieBiao({ yong_hu_id: 夹具用户ID, jiao_se_id: 乙, mei_ye_tiao_shu: 50 })
    expect(甲会话.lie_biao.map((项) => 项.nei_rong)).toContain('甲会话的话')
    expect(甲会话.lie_biao.map((项) => 项.nei_rong)).not.toContain('乙会话的话')
    expect(乙会话.lie_biao.map((项) => 项.nei_rong)).toContain('乙会话的话')
    expect(乙会话.lie_biao.map((项) => 项.nei_rong)).not.toContain('甲会话的话')
  })
})

describe.skipIf(!有真库)('挑战模式不回归：仍单局进行中 + 挑战积分照常记账', () => {
  it('第二局挑战被 409 拒且不留孤儿角色；结算后积分/连胜入账，再开新局放行', async () => {
    const 首局 = await kaiShiTiaoZhan(夹具用户ID, 'nan', 'nv')
    const 进行中 = await huoQuDangQianDuiJu(夹具用户ID)
    expect(进行中?.jiao_se_id).toBe(首局.id)

    const 挑战角色基数 = Number(
      (await 直查(`SELECT count(*)::int AS n FROM "角色" WHERE "用户ID" = $1 AND "对局模式" = 'tiaozhan'`, [
        夹具用户ID,
      ]))[0].n,
    )
    await expect(kaiShiTiaoZhan(夹具用户ID, 'nan', 'nv')).rejects.toMatchObject({ zhuang_tai_ma: 409 })
    const 挑战角色基数后 = Number(
      (await 直查(`SELECT count(*)::int AS n FROM "角色" WHERE "用户ID" = $1 AND "对局模式" = 'tiaozhan'`, [
        夹具用户ID,
      ]))[0].n,
    )
    expect(挑战角色基数后, '被 409 拒的第二局仍落下了角色行').toBe(挑战角色基数)
    const 进行中对局数 = Number(
      (await 直查(`SELECT count(*)::int AS n FROM "挑战对局" WHERE "用户ID" = $1 AND "状态" = '进行中'`, [
        夹具用户ID,
      ]))[0].n,
    )
    expect(进行中对局数).toBe(1)

    await jieSuanTiaoZhanDuiJu(夹具用户ID, 首局.id, 'sheng_li_ai_qing')
    const 积分行 = await 直查(`SELECT "积分", "胜场", "连胜" FROM "挑战积分" WHERE "用户ID" = $1`, [夹具用户ID])
    expect(积分行).toHaveLength(1)
    expect(Number(积分行[0].胜场)).toBe(1)
    expect(Number(积分行[0].连胜)).toBe(1)
    expect(Number(积分行[0].积分)).toBeGreaterThan(1000)
    const 概况 = await huoQuWoDeGaiKuang(夹具用户ID)
    const 已记账 = 概况.find((项) => 项.ji_fen !== null)
    expect(已记账?.ji_fen).toBe(Number(积分行[0].积分))
    expect(await huoQuDangQianDuiJu(夹具用户ID)).toBeNull()

    // 结算完即可再开一局：单局进行中的约束没有被 040 顺手放宽成「永不结束」
    const 次局 = await kaiShiTiaoZhan(夹具用户ID, 'nan', 'nv')
    expect(次局.id).not.toBe(首局.id)
    expect((await huoQuDangQianDuiJu(夹具用户ID))?.jiao_se_id).toBe(次局.id)
  })

  it('普通模式角色不受挑战局影响：开挑战局不封存任何普通模式角色', async () => {
    const 普通角色 = await 直查(
      `SELECT "ID" FROM "角色" WHERE "用户ID" = $1 AND "对局模式" = 'putong'`,
      [夹具用户ID],
    )
    expect(普通角色.length).toBeGreaterThanOrEqual(3)
    const 行 = await 角色行(普通角色.map((项) => String(项.ID)))
    for (const 项 of 行) expect(项.封存).toBe(false)
  })

  it('挑战模式保留旧行为：新开一局把同模式旧角色全部归档，普通模式角色一个都不动', async () => {
    const 当前 = await huoQuDangQianDuiJu(夹具用户ID)
    expect(当前, '上一条用例应留下一局进行中的挑战').not.toBeNull()
    await jieSuanTiaoZhanDuiJu(夹具用户ID, 当前!.jiao_se_id, 'sheng_li_ai_qing')

    const 普通角色 = await 直查(
      `SELECT "ID" FROM "角色" WHERE "用户ID" = $1 AND "对局模式" = 'putong'`,
      [夹具用户ID],
    )
    const 新局 = await kaiShiTiaoZhan(夹具用户ID, 'nan', 'nv')

    const 挑战行 = await 直查(
      `SELECT "ID", "封存" FROM "角色" WHERE "用户ID" = $1 AND "对局模式" = 'tiaozhan'`,
      [夹具用户ID],
    )
    const 未封存 = 挑战行.filter((项) => !项.封存).map((项) => String(项.ID))
    expect(未封存, '挑战模式应只剩最新一局未封存').toEqual([新局.id])
    expect(挑战行.filter((项) => 项.封存).map((项) => String(项.ID))).toContain(当前!.jiao_se_id)

    const 普通行 = await 角色行(普通角色.map((项) => String(项.ID)))
    for (const 项 of 普通行) expect(项.封存, '挑战局不得归档普通模式角色').toBe(false)
  })
})

describe.skipIf(!有真库)('事务失败仍完整回滚，不残留角色/好感度/档案', () => {
  it('游戏档案写入失败时整条链回滚：角色、好感度、档案零残留，活跃角色ID 不被改写', async () => {
    const 前置 = await 各表行数()
    const 前活跃 = String((await 直查(`SELECT "活跃角色ID" FROM "用户" WHERE "ID" = $1`, [夹具用户ID]))[0].活跃角色ID)

    await 装故障注入()
    try {
      await expect(
        baoCunJiaoSe(夹具用户ID, 新角色({ ming_zi: 故障角色名 }), 'putong'),
      ).rejects.toMatchObject({ code: CUO_WU_DAI_MA.ROLE_GENERATION_PERSISTENCE_FAILED })
    } finally {
      await 拆故障注入()
    }

    const 后置 = await 各表行数()
    expect(后置).toEqual(前置)
    expect(String((await 直查(`SELECT "活跃角色ID" FROM "用户" WHERE "ID" = $1`, [夹具用户ID]))[0].活跃角色ID)).toBe(
      前活跃,
    )
    expect(await 直查(`SELECT "ID" FROM "角色" WHERE "名字" = $1`, [故障角色名])).toEqual([])
  })

  it('回滚后同一用户仍能继续生成角色（连接未被留在失败事务里）', async () => {
    const 角色 = await baoCunJiaoSe(夹具用户ID, 新角色(), 'putong')
    const 行 = (await 角色行([角色.id]))[0]
    expect(行.封存).toBe(false)
    expect(行.可继续聊天).toBe(true)
  })
})
