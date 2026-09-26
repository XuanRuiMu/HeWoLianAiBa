import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'

const 推送列表: Array<{ 名: string; 体: Record<string, unknown> }> = []
const 复盘调用: string[] = []
const 挑战结算调用: string[] = []

vi.mock('../../socket/io', () => ({
  huoQuIo: () => ({ to: () => ({ emit: (名: string, 体: Record<string, unknown>) => 推送列表.push({ 名, 体 }) }) }),
}))
vi.mock('../复盘', () => ({ shengChengFuPan: vi.fn(async (yong_hu_id: string) => { 复盘调用.push(yong_hu_id) }) }))
vi.mock('../挑战积分', () => ({
  jieSuanTiaoZhanDuiJu: vi.fn(async (yong_hu_id: string) => { 挑战结算调用.push(yong_hu_id) }),
}))
vi.mock('../../utils/DeepSeek客户端', () => ({ genJuPeiZhiTiaoYong: vi.fn() }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  jiLuYouXiJieJu: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
}))
vi.mock('../好感度', () => ({ gengXinHaoGanDu: vi.fn(async () => undefined), huoQuWanZhengHaoGanDu: vi.fn(async () => null) }))
vi.mock('../AI输入准备', () => ({ baoCunJiaoSeXiaoXi: vi.fn(async () => ({ id: 'x' })) }))
vi.mock('../AI视觉辅助', () => ({
  gouJianDanTiaoTuXiangKuai: vi.fn(),
  meiTiZhanShiWenBen: vi.fn(),
  shiTuXiangLeiBie: vi.fn(),
}))

import { 数据库 } from '../../数据库'
import { chuLiYouXiJieShu } from '../胜利失败条件'

/**
 * 结算「四表同事务 + 整事务重试」的真库故障注入回归。
 *
 * 结算必须把四张表在同一瞬间一起落定：角色状态（封存/可继续聊天/结局状态）、游戏结局、
 * 结局文案快照、游戏档案。任何一条写失败都整条 ROLLBACK，**绝不允许**出现
 * 「角色已结束但游戏档案仍进行中」的半套态；重试的是整个事务（最多 3 次）而不是单条语句。
 *
 * 观测手段（全部真库、不 mock 业务代码）：
 *  - 故障注入用触发器。`CREATE TRIGGER` 的 WHEN 子句不接受占位符，故目标写在配置表单行行里；
 *    「游戏档案 前 N 次失败」用阈值 + 序列比较实现。
 *  - **尝试次数**用序列：nextval 不随事务回滚，失败尝试也留痕。
 *  - **提交次数**用 DEFERRABLE INITIALLY DEFERRED 约束触发器写计数表：它只在 COMMIT 时触发，
 *    随事务一起回滚，因此计数表里有多少行就等于「真正提交了几次结算」。
 *
 * 真库落点：仅认 TEST_DATABASE_URL（连不上整组 skip）；不读 XU_KE_ZHEN_SHI_WAI_HU，
 * 那条路径下 src/test-setup.ts 不改写连接串、服务会连 .env 里的现网库。
 */

const 迁移040 = readFileSync(
  resolve(__dirname, '..', '..', '..', 'database', 'migrations', '040_普通模式多角色并存.sql'),
  'utf-8',
)
const 配置表 = '"结算故障注入"'
const 尝试序列 = '"结算尝试_计数"'
const 档案序列 = '"结算档案_计数"'
const 提交计数表 = '"结算提交计数表"'
const 结局键 = 'shi_bai_bei_qi_pian'

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

const 连接串 = (process.env.TEST_DATABASE_URL ?? '').trim()
const 有真库 = await 真库可达(连接串)
const 夹具手机号 = `15${randomUUID().replace(/\D/g, '').padEnd(9, '0').slice(0, 9)}`
let 夹具用户ID = ''

async function 直查(文本: string, 参数: unknown[] = []): Promise<Record<string, unknown>[]> {
  return (await 数据库.query(文本, 参数)).rows as unknown as Record<string, unknown>[]
}

/** 建一个可直接进入结算的角色（角色 + 好感度 + 游戏档案三行齐），并把两组计数与提交计数归零 */
async function 造可结算角色(标记: string): Promise<string> {
  const 角色ID = randomUUID()
  await 数据库.query(
    `INSERT INTO "角色" ("ID","用户ID","名字","性别","性格","IE类型","热身类型","封存","可继续聊天","结局状态","结局文案")
     VALUES ($1,$2,$3,'nv','测试用','I','慢热',FALSE,FALSE,'',NULL)`,
    [角色ID, 夹具用户ID, `结算-${标记}`],
  )
  await 数据库.query(
    `INSERT INTO "好感度" ("用户ID","角色ID","信任度","亲密度","趣味度","关怀度","总分","关系阶段")
     VALUES ($1,$2,10,10,10,10,40,'朋友')`,
    [夹具用户ID, 角色ID],
  )
  await 数据库.query(`INSERT INTO "游戏档案" ("用户ID","角色ID") VALUES ($1,$2)`, [夹具用户ID, 角色ID])
  await 数据库.query(`DELETE FROM ${提交计数表}`)
  await 数据库.query(`ALTER SEQUENCE ${尝试序列} RESTART WITH 1`)
  await 数据库.query(`ALTER SEQUENCE ${档案序列} RESTART WITH 1`)
  return 角色ID
}

async function 装注入(): Promise<void> {
  await 数据库.query(
    `CREATE TABLE IF NOT EXISTS ${配置表} ("ID" INT PRIMARY KEY, "类型" VARCHAR(30), "档案次数" INT NOT NULL DEFAULT 0)`,
  )
  await 数据库.query(
    `INSERT INTO ${配置表} ("ID","类型","档案次数") VALUES (1, NULL, 0)
     ON CONFLICT ("ID") DO UPDATE SET "类型" = NULL, "档案次数" = 0`,
  )
  await 数据库.query(
    `CREATE TABLE IF NOT EXISTS ${提交计数表} ("ID" SERIAL PRIMARY KEY, "备注" VARCHAR(30) NOT NULL)`,
  )
  await 数据库.query(`CREATE SEQUENCE IF NOT EXISTS ${尝试序列}`)
  await 数据库.query(`CREATE SEQUENCE IF NOT EXISTS ${档案序列}`)

  await 数据库.query(
    `CREATE OR REPLACE FUNCTION "结算注入_角色状态"() RETURNS trigger AS $fp$
       DECLARE 目标 VARCHAR(30);
       BEGIN
         PERFORM nextval('${尝试序列}');
         SELECT "类型" INTO 目标 FROM ${配置表} WHERE "ID" = 1;
         IF 目标 = '角色封存' THEN RAISE EXCEPTION '注入故障：角色封存'; END IF;
         RETURN NEW;
       END;
     $fp$ LANGUAGE plpgsql`,
  )
  await 数据库.query(
    `CREATE TRIGGER "结算注入_角色状态" BEFORE UPDATE ON "角色"
       FOR EACH ROW WHEN (NEW."结局状态" IS DISTINCT FROM OLD."结局状态")
       EXECUTE FUNCTION "结算注入_角色状态"()`,
  )
  await 数据库.query(
    `CREATE OR REPLACE FUNCTION "结算注入_结局文案"() RETURNS trigger AS $fp$
       DECLARE 目标 VARCHAR(30);
       BEGIN
         SELECT "类型" INTO 目标 FROM ${配置表} WHERE "ID" = 1;
         IF 目标 = '结局文案' THEN RAISE EXCEPTION '注入故障：结局文案'; END IF;
         RETURN NEW;
       END;
     $fp$ LANGUAGE plpgsql`,
  )
  await 数据库.query(
    `CREATE TRIGGER "结算注入_结局文案" BEFORE UPDATE ON "角色"
       FOR EACH ROW WHEN (NEW."结局文案" IS DISTINCT FROM OLD."结局文案")
       EXECUTE FUNCTION "结算注入_结局文案"()`,
  )
  await 数据库.query(
    `CREATE OR REPLACE FUNCTION "结算注入_游戏结局"() RETURNS trigger AS $fp$
       DECLARE 目标 VARCHAR(30);
       BEGIN
         SELECT "类型" INTO 目标 FROM ${配置表} WHERE "ID" = 1;
         IF 目标 = '游戏结局' THEN RAISE EXCEPTION '注入故障：游戏结局'; END IF;
         RETURN NEW;
       END;
     $fp$ LANGUAGE plpgsql`,
  )
  await 数据库.query(
    `CREATE TRIGGER "结算注入_游戏结局" BEFORE INSERT ON "游戏结局"
       FOR EACH ROW EXECUTE FUNCTION "结算注入_游戏结局"()`,
  )
  await 数据库.query(
    `CREATE OR REPLACE FUNCTION "结算注入_游戏档案"() RETURNS trigger AS $fp$
       DECLARE 阈值 INT;
       BEGIN
         SELECT "档案次数" INTO 阈值 FROM ${配置表} WHERE "ID" = 1;
         IF COALESCE(阈值, 0) > 0 AND nextval('${档案序列}')::int <= 阈值 THEN
           RAISE EXCEPTION '注入故障：游戏档案';
         END IF;
         RETURN NEW;
       END;
     $fp$ LANGUAGE plpgsql`,
  )
  await 数据库.query(
    `CREATE TRIGGER "结算注入_游戏档案" BEFORE INSERT ON "游戏档案"
       FOR EACH ROW EXECUTE FUNCTION "结算注入_游戏档案"()`,
  )
  await 数据库.query(
    `CREATE OR REPLACE FUNCTION "结算观测_提交计数"() RETURNS trigger AS $fp$
       BEGIN
         INSERT INTO ${提交计数表} ("备注") VALUES ('游戏结局');
         RETURN NULL;
       END;
     $fp$ LANGUAGE plpgsql`,
  )
  await 数据库.query(
    `CREATE CONSTRAINT TRIGGER "结算观测_提交计数" AFTER INSERT ON "游戏结局"
       DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "结算观测_提交计数"()`,
  )
}

async function 拆注入(): Promise<void> {
  for (const [表, 名] of [
    ['角色', '结算注入_角色状态'],
    ['角色', '结算注入_结局文案'],
    ['游戏结局', '结算注入_游戏结局'],
    ['游戏档案', '结算注入_游戏档案'],
    ['游戏结局', '结算观测_提交计数'],
  ] as const) {
    await 数据库.query(`DROP TRIGGER IF EXISTS "${名}" ON "${表}"`).catch(() => undefined)
  }
  for (const 名 of [
    '结算注入_角色状态',
    '结算注入_结局文案',
    '结算注入_游戏结局',
    '结算注入_游戏档案',
    '结算观测_提交计数',
  ]) {
    await 数据库.query(`DROP FUNCTION IF EXISTS "${名}"()`).catch(() => undefined)
  }
  await 数据库.query(`DROP TABLE IF EXISTS ${配置表}`).catch(() => undefined)
  await 数据库.query(`DROP TABLE IF EXISTS ${提交计数表}`).catch(() => undefined)
  await 数据库.query(`DROP SEQUENCE IF EXISTS ${尝试序列}`).catch(() => undefined)
  await 数据库.query(`DROP SEQUENCE IF EXISTS ${档案序列}`).catch(() => undefined)
}

/** 设故障点（角色封存/游戏结局/结局文案）与「游戏档案 前 N 次失败」阈值 */
async function 设故障(类型: string | null, 档案次数 = 0): Promise<void> {
  await 数据库.query(`UPDATE ${配置表} SET "类型" = $1, "档案次数" = $2 WHERE "ID" = 1`, [类型, 档案次数])
}

async function 取计数(序列: string): Promise<number> {
  const 行 = await 直查(`SELECT last_value, is_called FROM ${序列}`)
  return 行[0].is_called ? Number(行[0].last_value) : 0
}

async function 取提交次数(): Promise<number> {
  const 行 = await 直查(`SELECT count(*)::int AS n FROM ${提交计数表}`)
  return Number(行[0].n)
}

interface 四表状态 {
  封存: unknown
  可继续聊天: unknown
  结局状态: unknown
  结局文案: unknown
  结局行数: number
  档案结果类型: unknown
  档案是否封存: unknown
}

async function 读四表(角色ID: string): Promise<四表状态> {
  const 角色 = await 直查(`SELECT "封存", "可继续聊天", "结局状态", "结局文案" FROM "角色" WHERE "ID" = $1`, [角色ID])
  const 结局 = await 直查(`SELECT count(*)::int AS n FROM "游戏结局" WHERE "角色ID" = $1`, [角色ID])
  const 档案 = await 直查(`SELECT "结果类型", "是否封存" FROM "游戏档案" WHERE "角色ID" = $1`, [角色ID])
  return {
    封存: 角色[0].封存,
    可继续聊天: 角色[0].可继续聊天,
    结局状态: 角色[0].结局状态,
    结局文案: 角色[0].结局文案,
    结局行数: Number(结局[0].n),
    档案结果类型: 档案[0].结果类型,
    档案是否封存: 档案[0].是否封存,
  }
}

/** 事务前的基线：未结算 ⇒ 未封存、无结局行、无文案、档案仍进行中 */
function 事务前态(状态: 四表状态): void {
  expect(状态.封存).toBe(false)
  expect(状态.可继续聊天).toBe(false)
  expect(状态.结局状态).toBe('')
  expect(状态.结局文案).toBeNull()
  expect(状态.结局行数).toBe(0)
  expect(状态.档案结果类型).toBe('')
  expect(状态.档案是否封存).toBe(false)
}

/** 结算成功的完整态：四表同一个结局，档案不再进行中（不存在半套） */
function 四表一致(状态: 四表状态, 结局: string, 快照?: string): void {
  expect(状态.封存).toBe(状态.结局状态 !== 'sheng_li_ai_qing')
  expect(状态.可继续聊天).toBe(状态.结局状态 === 'sheng_li_ai_qing')
  expect(状态.结局状态).toBe(结局)
  expect(typeof 状态.结局文案).toBe('string')
  expect(String(状态.结局文案).length).toBeGreaterThan(0)
  if (快照 !== undefined) expect(状态.结局文案).toBe(快照)
  expect(状态.结局行数).toBe(1)
  expect(状态.档案结果类型).toBe(结局)
  expect(状态.档案是否封存).toBe(状态.结局状态 !== 'sheng_li_ai_qing')
}

async function 等副作用(): Promise<void> {
  await new Promise((jieJue) => setTimeout(jieJue, 20))
}

beforeAll(async () => {
  if (!有真库) return
  await 数据库.query(迁移040)
  const 用户 = await 数据库.query(
    `INSERT INTO "用户" ("手机号", "用户名", "昵称", "测试") VALUES ($1, $2, $3, TRUE) RETURNING "ID"`,
    [夹具手机号, `jieju-${randomUUID().slice(0, 8)}`, `jieju-${randomUUID().slice(0, 8)}`],
  )
  夹具用户ID = String(用户.rows[0].ID)
  await 装注入()
}, 60000)

afterAll(async () => {
  if (!有真库) return
  await 拆注入()
  await 数据库.query('DELETE FROM "用户" WHERE "ID" = $1', [夹具用户ID]).catch(() => undefined)
})

describe.skipIf(!有真库)('结算四表同事务：任一SQL失败整条回滚，四表一致停在事务前', () => {
  it.each(['角色封存', '游戏结局', '结局文案'])('%s 连续失败到上限：四表全在事务前、零提交、零副作用', async (故障点) => {
    推送列表.length = 0
    复盘调用.length = 0
    挑战结算调用.length = 0
    const 角色ID = await 造可结算角色(故障点)
    await 设故障(故障点)
    await expect(chuLiYouXiJieShu(夹具用户ID, 角色ID, 结局键)).rejects.toThrow(/注入故障/)
    await 设故障(null)
    await 等副作用()

    事务前态(await 读四表(角色ID))
    expect(await 取计数(尝试序列), '整事务应恰好尝试 3 次').toBe(3)
    expect(await 取提交次数(), '一次都不该提交').toBe(0)
    expect(推送列表).toEqual([])
    expect(复盘调用).toEqual([])
    expect(挑战结算调用).toEqual([])
  })

  it('一次通过：只尝试 1 次、只提交 1 次、只推送 1 次，四表一致', async () => {
    推送列表.length = 0
    复盘调用.length = 0
    挑战结算调用.length = 0
    const 角色ID = await 造可结算角色('一次通过')
    const 结果 = await chuLiYouXiJieShu(夹具用户ID, 角色ID, 结局键)
    await 等副作用()

    四表一致(await 读四表(角色ID), 结局键, 结果.jie_guo_wen_an)
    expect(await 取计数(尝试序列)).toBe(1)
    expect(await 取提交次数()).toBe(1)
    expect(推送列表).toEqual([
      { 名: '游戏事件', 体: expect.objectContaining({ 角色ID: 角色ID, lei_xing: 结局键 }) },
    ])
    expect(复盘调用).toEqual([夹具用户ID])
    expect(挑战结算调用).toEqual([夹具用户ID])
  })

  it('重复结算同一角色：游戏结局幂等不新增行、快照换成最新结局，且不再推送第二次', async () => {
    推送列表.length = 0
    复盘调用.length = 0
    挑战结算调用.length = 0
    const 角色ID = await 造可结算角色('重复结算')
    const 首次 = await chuLiYouXiJieShu(夹具用户ID, 角色ID, 'shi_bai_hao_gan_du_gui_ling')
    const 末次 = await chuLiYouXiJieShu(夹具用户ID, 角色ID, 'sheng_li_ai_qing')
    await 等副作用()

    const 态 = await 读四表(角色ID)
    expect(态.结局行数).toBe(1)
    四表一致(态, 'sheng_li_ai_qing', 末次.jie_guo_wen_an)
    expect(末次.jie_guo_wen_an).not.toBe(首次.jie_guo_wen_an)
    expect(await 取提交次数(), '第二次结算不再新增游戏结局行 ⇒ 不该再计一次提交').toBe(1)
    expect(推送列表).toHaveLength(1)
    expect(复盘调用).toHaveLength(1)
    expect(挑战结算调用).toHaveLength(1)
  })
})

describe.skipIf(!有真库)('游戏档案写失败：重试的是整个事务，四表始终一致', () => {
  it.each([1, 2])('前 %i 次失败后重试成功：四表一致、只提交一次、只推送一次', async (失败次数) => {
    推送列表.length = 0
    复盘调用.length = 0
    挑战结算调用.length = 0
    const 角色ID = await 造可结算角色(`档案失败${失败次数}`)
    await 设故障(null, 失败次数)
    const 结果 = await chuLiYouXiJieShu(夹具用户ID, 角色ID, 结局键)
    await 设故障(null, 0)
    await 等副作用()

    四表一致(await 读四表(角色ID), 结局键, 结果.jie_guo_wen_an)
    expect(await 取计数(尝试序列), '整事务重试次数 = 失败次数 + 1').toBe(失败次数 + 1)
    expect(await 取计数(档案序列), '档案写尝试次数 = 失败次数 + 1').toBe(失败次数 + 1)
    expect(await 取提交次数(), '只该提交一次').toBe(1)
    expect(推送列表).toHaveLength(1)
    expect(复盘调用).toHaveLength(1)
    expect(挑战结算调用).toHaveLength(1)
  })

  it('连续 3 次失败：四表全部停在事务前，绝不出现「角色已结束但档案仍进行中」', async () => {
    推送列表.length = 0
    复盘调用.length = 0
    挑战结算调用.length = 0
    const 角色ID = await 造可结算角色('档案全失败')
    await 设故障(null, 99)
    await expect(chuLiYouXiJieShu(夹具用户ID, 角色ID, 结局键)).rejects.toThrow(/注入故障：游戏档案/)
    await 设故障(null, 0)
    await 等副作用()

    事务前态(await 读四表(角色ID))
    expect(await 取计数(尝试序列)).toBe(3)
    expect(await 取计数(档案序列), '档案写最多 3 次尝试').toBe(3)
    expect(await 取提交次数()).toBe(0)
    expect(推送列表).toEqual([])
    expect(复盘调用).toEqual([])
    expect(挑战结算调用).toEqual([])
  })

  it('重试周期内结局文案快照恒为同一句（重试不抽新句）', async () => {
    const 角色ID = await 造可结算角色('快照恒定')
    await 设故障(null, 2)
    const 结果 = await chuLiYouXiJieShu(夹具用户ID, 角色ID, 结局键)
    await 设故障(null, 0)
    expect((await 读四表(角色ID)).结局文案).toBe(结果.jie_guo_wen_an)
    expect(推送列表[推送列表.length - 1]?.体.jie_guo_wen_an).toBe(结果.jie_guo_wen_an)
  })
})
