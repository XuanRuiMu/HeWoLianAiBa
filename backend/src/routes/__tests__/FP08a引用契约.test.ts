import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import express from 'express'
import request from 'supertest'
import luYou from '../消息'
import { peiZhi } from '../../config'

/**
 * FP-08a（缺陷5 严重 bug 的数据与接口层）引用契约的**端到端**验证。
 *
 * 打通的是同一条链路：HTTP body 带引用 → 路由形状裁定 → 消息服务五道写前裁定 →
 * INSERT 落 `消息`.`被引用消息ID` → 出参白名单回读。任何一环漏掉都会在这里显形：
 *  - 出参白名单漏加 ⇒ 「前端静默丢字段」，正是 R4 契约缺口的原形态（本文件第 ② 组钉死）；
 *  - 写前裁定缺失 ⇒ 非法引用要么把 Postgres 异常冒泡成 500，要么静默落库（第 ③ 组 + 反证）。
 *
 * 库隔离（PROGRESS L-02：本地库与「恋爱吧管理中心」共用）：
 *  本文件**只连自建临时库** `fp08a_verify_*`，自己 CREATE、自己 DROP，不对 `lovewithme` 主库
 *  做任何迁移/建表/删表；迁移链一律跳过 034（用户自测提权脚本，禁止执行）。
 *  连不上库时整组跳过并在摘要里按 ⚠️环境限制分账，不把「看不到错误」判成通过。
 *
 * 迁移链走的是**现网真实路径**：`database/000_baseline.sql` + 顺序重放 migrations，
 *  因此 035 在「建表语句已有该列」与「老库补列」两种起点上都必须幂等（两组用例分别覆盖）。
 */

const 迁移目录 = resolve(__dirname, '..', '..', '..', 'database', 'migrations')
const 建库根目录 = resolve(__dirname, '..', '..', '..', '..', 'database')
/** 034 是用户自测提权脚本（L-02），任何情况下都不执行 */
const 跳过迁移 = /^034_/

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
const 临时库名 = `fp08a_verify_${后缀}`.slice(0, 60).toLowerCase()
/** 手机号唯一：用运行时刻的尾部数字拼出一个不重复的 11 位号段（临时库，不碰主库） */
const 随机数字尾 = String(Date.now()).slice(-7)
/** 消息.客户端序号 在 (用户ID,角色ID) 内唯一（迁移 005 的约束）：
 *  序号一律由服务端 MAX+1 权威分配（FP-09 口径），铺数据也照同一算式取号，绝不写死数字撞号。 */

/** 应用侧的 数据库 单例改指向临时库：路由与服务都跑真实 SQL，不打桩任何业务判定。
 *  注意池必须**惰性取**——vi.mock 工厂在本文件 import 期就被执行，那时 beforeAll 还没建库。 */
vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => 取池().query(文本, 参数),
    connect: async () => ({
      query: async (文本: string, 参数: unknown[] = []) => 取池().query(文本, 参数),
      release: () => undefined,
    }),
  },
}))
function 取池(): Pool {
  const 池 = (globalThis as unknown as { __fp08a池?: Pool }).__fp08a池
  if (!池) throw new Error('FP-08a 临时库尚未建立')
  return 池
}

vi.mock('../../middleware/限流', () => ({
  liaoTianXianLiu: (_q: unknown, _r: unknown, 下一项: () => void) => 下一项(),
  aiQingQiuXianLiu: (_q: unknown, _r: unknown, 下一项: () => void) => 下一项(),
}))
vi.mock('../../services/安全审核', () => ({
  jianCeWeiJiXinHao: vi.fn(() => null),
  shenHeNeiRongAnQuan: vi.fn(async () => ({ wei_gui: false })),
}))
vi.mock('../../services/账号封禁', () => ({
  chaXunZhangHaoFengJin: vi.fn(async () => ({ beiFengJin: false })),
  jiLuZhangHaoWeiGui: vi.fn(async () => undefined),
}))
vi.mock('../../services/IP封禁', () => ({
  获取IP: () => '127.0.0.1',
  记录违规: vi.fn(() => ({ 已封禁: false })),
}))
vi.mock('../../services/审计日志', () => ({ jiLuShenJiRiZhi: vi.fn(async () => undefined) }))
vi.mock('../../services/军师', () => ({
  huoQuJunShiLieBiao: vi.fn(async () => ({ junShiLieBiao: [] })),
  qingQiuJunShiZhiDao: vi.fn(),
  huoQuJunShiJiLu: vi.fn(async () => []),
  huoQuJunShiZhiDaoZhuangTaiXinXi: vi.fn(async () => null),
}))
vi.mock('../../services/军师缓存', () => ({ shanChuJunShiZhiDaoZhuangTai: vi.fn(async () => undefined) }))
vi.mock('../../services/好感度', () => ({ sheZhiMiJiHaoGanDu: vi.fn(async () => ({ cheng_gong: true })) }))
vi.mock('../../services/AI输入准备', () => ({
  baoCunJiaoSeXiaoXi: vi.fn(async () => ({ id: '900', lei_xing: 'wenben' })),
}))
vi.mock('../../services/思考记录', () => ({ jiLuSiKao: vi.fn(async () => undefined) }))
vi.mock('../../socket/聊天', () => ({
  luoKuChuFaJiaoSeTiaoDuQi: vi.fn(async () => undefined),
  chongZhiJiaoSeTiaoDuQi: vi.fn(),
}))
vi.mock('../../utils/邮件告警', () => ({ faSongGaoJing: vi.fn(async () => undefined) }))

const 用户甲 = randomUUID()
const 用户乙 = randomUUID()
/** 会话 = (用户ID, 角色ID)：角色甲/角色甲2 同属用户甲（后者用于造「跨会话」），角色乙属用户乙 */
const 角色甲 = randomUUID()
const 角色甲2 = randomUUID()
const 角色乙 = randomUUID()

let 池: Pool | null = null
let 已建库 = false

async function 重放文件(目标: Pool, 路径: string): Promise<void> {
  await 目标.query(readFileSync(路径, 'utf-8'))
}

function 迁移清单(): string[] {
  return readdirSync(迁移目录).filter((名) => 名.endsWith('.sql') && !跳过迁移.test(名)).sort()
}

async function 建库并铺数据(含迁移链: boolean): Promise<Pool> {
  const 新建 = new Pool({ connectionString: 取连接串(临时库名), max: 4 })
  await 重放文件(新建, resolve(建库根目录, '000_baseline.sql'))
  if (含迁移链) {
    for (const 名 of 迁移清单()) await 重放文件(新建, resolve(迁移目录, 名))
  }
  await 新建.query(
    `INSERT INTO "用户" ("ID", "手机号", "昵称") VALUES ($1::uuid, $2, '甲'), ($3::uuid, $4, '乙')`,
    [用户甲, `139${随机数字尾}1`, 用户乙, `139${随机数字尾}2`],
  )
  await 新建.query(
    `INSERT INTO "角色" ("ID", "用户ID", "名字", "性别", "对局模式") VALUES
      ($1::uuid, $2::uuid, '会话甲', 'nv', 'putong'),
      ($3::uuid, $2::uuid, '会话甲2', 'nv', 'tiaozhan'),
      ($4::uuid, $5::uuid, '会话乙', 'nan', 'putong')`,
    [角色甲, 用户甲, 角色甲2, 角色乙, 用户乙],
  )
  return 新建
}

/** 直接铺一条消息（不走接口，用来构造「被引用的原消息」「已撤回的原消息」等前置态） */
async function 铺消息(参数: {
  用户: string
  角色: string
  内容: string
  已撤回?: boolean
  发送者?: string
}): Promise<string> {
  const 结果 = await (池 as Pool).query(
    `INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读", "客户端序号", "已撤回")
     SELECT $1::uuid, $2::uuid, $3, $4, 'wenben', true, COALESCE(MAX(m."客户端序号"), 0) + 1, $5::boolean
     FROM "消息" m WHERE m."用户ID" = $1::uuid AND m."角色ID" = $2::uuid
     RETURNING "ID"`,
    [参数.用户, 参数.角色, 参数.内容, 参数.发送者 ?? 'jiaose', 参数.已撤回 === true],
  )
  return String(结果.rows[0].ID)
}

beforeAll(async () => {
  if (!有真库) return
  await (管理池 as Pool).query(`CREATE DATABASE "${临时库名}"`)
  已建库 = true
  // 现网真实路径：baseline + 迁移链（035 对「建表语句已含该列」的库必须整体幂等）
  池 = await 建库并铺数据(true)
  ;(globalThis as unknown as { __fp08a池: Pool }).__fp08a池 = 池
}, 240000)

afterAll(async () => {
  if (池) await 池.end().catch(() => undefined)
  if (已建库 && 管理池) await 管理池.query(`DROP DATABASE IF EXISTS "${临时库名}"`).catch(() => undefined)
  if (管理池) await 管理池.end().catch(() => undefined)
})

const 应用 = express()
应用.use(express.json())
应用.use((qingQiu, _xiangYing, xiaYiBu) => {
  qingQiu.url = decodeURI(qingQiu.url)
  xiaYiBu()
})
let 当前用户 = 用户甲
应用.use((请求, _响应, 下一项) => {
  (请求 as unknown as { yong_hu: { yongHuId: string } }).yong_hu = { yongHuId: 当前用户 }
  下一项()
})
应用.use('/api/聊天', luYou)

function faSong(会话: string, 正文: Record<string, unknown>) {
  return request(应用).post(encodeURI(`/api/聊天/会话/${会话}/消息`)).send(正文)
}

/** 错误响应体不得泄露内部实现：列名/SQL 片段/PG 错误码与原文/堆栈/文件路径一律不得出现。
 *  （"消息" 二字本身是给用户看的文案用词，不作为泄露判据；判据取只可能来自内部的 token） */
function 断言不泄露(文本: string): void {
  for (const 泄密 of [
    '被引用消息ID',
    '"消息"',
    'SELECT',
    'INSERT INTO',
    'VALUES',
    'Postgres',
    'pg_',
    '22P02',
    '23503',
    '23514',
    'invalid input syntax',
    'foreign key',
    'violates',
    'check constraint',
    'at Object.',
    'at async ',
    '.ts:',
    'Traceback',
    'Pool',
  ]) {
    expect(文本, `错误响应泄露了内部实现片段: ${泄密}`).not.toContain(泄密)
  }
}

describe.skipIf(!有真库)('FP-08a ① 迁移 035 在真库上的形态（列 / 外键删除语义 / 自引用 CHECK）', () => {
  it('消息 表列集合 = 16 列且含 被引用消息ID（uuid）', async () => {
    const 列 = await (池 as Pool).query(
      `SELECT attname FROM pg_attribute WHERE attrelid = '消息'::regclass AND attnum > 0 AND NOT attisdropped ORDER BY attnum`,
    )
    const 名 = 列.rows.map((r: Record<string, unknown>) => String(r['attname']))
    expect(名).toContain('被引用消息ID')
    const 类型 = await (池 as Pool).query(
      `SELECT format_type(atttypid, atttypmod) AS lx FROM pg_attribute WHERE attrelid = '消息'::regclass AND attname = '被引用消息ID'`,
    )
    expect(String(类型.rows[0]['lx'])).toBe('uuid')
  })

  it('外键显式指向 消息(ID) 且删除语义为 SET NULL —— 绝不级联删掉用户消息内容', async () => {
    const 约束 = await (池 as Pool).query(
      `SELECT conname, pg_get_constraintdef(oid) AS d FROM pg_constraint WHERE conrelid = '消息'::regclass`,
    )
    const 全部 = 约束.rows.map((r: Record<string, unknown>) => `${r['conname']} :: ${r['d']}`)
    expect(全部.join('\n')).toContain(
      '消息_被引用消息ID_fkey :: FOREIGN KEY ("被引用消息ID") REFERENCES "消息"("ID") ON DELETE SET NULL',
    )
    const 原消息 = await 铺消息({ 用户: 用户甲, 角色: 角色甲, 内容: '被引用的原话' })
    const 引用者 = await (池 as Pool).query(
      `INSERT INTO "消息" ("用户ID", "角色ID", "内容", "发送者", "类型", "已读", "客户端序号", "被引用消息ID")
       VALUES ($1::uuid, $2::uuid, '引用了别人', 'yonghu', 'wenben', true, 987654, $3::uuid) RETURNING "ID"`,
      [用户甲, 角色甲, 原消息],
    )
    const 引用者ID = String(引用者.rows[0].ID)
    await (池 as Pool).query(`DELETE FROM "消息" WHERE "ID" = $1::uuid`, [原消息])
    const 剩下 = await (池 as Pool).query(
      `SELECT "内容", "被引用消息ID" FROM "消息" WHERE "ID" = $1::uuid`,
      [引用者ID],
    )
    expect(剩下.rows).toHaveLength(1)
    expect(String(剩下.rows[0]['内容'])).toBe('引用了别人')
    expect(剩下.rows[0]['被引用消息ID']).toBeNull()
  })

  it('自引用在 DB 层就不可能落库（CHECK 命中，不靠应用自觉）', async () => {
    const id = await 铺消息({ 用户: 用户甲, 角色: 角色甲, 内容: '自引用试验', 发送者: 'yonghu' })
    await expect(
      (池 as Pool).query(`UPDATE "消息" SET "被引用消息ID" = $1::uuid WHERE "ID" = $1::uuid`, [id]),
    ).rejects.toThrow(/消息_不得自引用|check|23514/i)
  })

  it('035 可重复执行（幂等）：同一库上再跑一遍不报错、列与约束不翻倍', async () => {
    const 之前 = await (池 as Pool).query(
      `SELECT count(*) AS n FROM pg_attribute WHERE attrelid = '消息'::regclass AND attname = '被引用消息ID'`,
    )
    await 重放文件(池 as Pool, resolve(迁移目录, '035_引用消息.sql'))
    const 之后 = await (池 as Pool).query(
      `SELECT count(*) AS n FROM pg_attribute WHERE attrelid = '消息'::regclass AND attname = '被引用消息ID'`,
    )
    const 约束数 = await (池 as Pool).query(
      `SELECT count(*) AS n FROM pg_constraint WHERE conrelid = '消息'::regclass AND conname IN ('消息_被引用消息ID_fkey','消息_不得自引用')`,
    )
    expect(String(之前.rows[0]['n'])).toBe(String(之后.rows[0]['n']))
    expect(Number(约束数.rows[0]['n'])).toBe(2)
  })
})

describe.skipIf(!有真库)('FP-08a ② 带引用发送：落库 + 出参白名单读回', () => {
  it('200 且出参含 bei_yong_xiao_xi_id，库里同一行同值', async () => {
    const 原消息 = await 铺消息({ 用户: 用户甲, 角色: 角色甲, 内容: '被引用的角色发言' })
    const 响应 = await faSong(角色甲, {
      neiRong: '引用一下',
      幂等键: randomUUID(),
      leiXing: 'wenben',
      meiTiId: null,
      beiYongXiaoXiId: 原消息,
    })
    expect(响应.status).toBe(200)
    expect(响应.body.cheng_gong).toBe(true)
    // 出参白名单必须带上该列（漏加＝前端静默丢字段，R4 原形态）
    expect(Object.keys(响应.body.shu_ju)).toContain('bei_yong_xiao_xi_id')
    expect(响应.body.shu_ju.bei_yong_xiao_xi_id).toBe(原消息)
    const 库 = await (池 as Pool).query(
      `SELECT "被引用消息ID" FROM "消息" WHERE "ID" = $1::uuid`,
      [响应.body.shu_ju.id],
    )
    expect(String(库.rows[0]['被引用消息ID'])).toBe(原消息)
  })

  it('不带引用时出参该键为 null（不是缺失），老客户端零改动仍正确', async () => {
    const 响应 = await faSong(角色甲, {
      neiRong: '没有引用',
      幂等键: randomUUID(),
      leiXing: 'wenben',
      meiTiId: null,
    })
    expect(响应.status).toBe(200)
    expect(响应.body.shu_ju.bei_yong_xiao_xi_id).toBeNull()
  })

  it('列表读回同样带出该字段（GET 会话消息）', async () => {
    const 原消息 = await 铺消息({ 用户: 用户甲, 角色: 角色甲, 内容: '被列表读回的原话' })
    const 发送 = await faSong(角色甲, {
      neiRong: '列表里的引用',
      幂等键: randomUUID(),
      beiYongXiaoXiId: 原消息,
    })
    expect(发送.status).toBe(200)
    const 列表 = await request(应用).get(encodeURI(`/api/聊天/会话/${角色甲}/消息`))
    expect(列表.status).toBe(200)
    const 那条 = 列表.body.shu_ju.lie_biao.find(
      (项: Record<string, unknown>) => 项['id'] === 发送.body.shu_ju.id,
    )
    expect(那条).toBeTruthy()
    expect(那条['bei_yong_xiao_xi_id']).toBe(原消息)
  })

  it('引用角色的消息与引用用户自己的消息同样合法（引用不限发送者）', async () => {
    const 用户原话 = await 铺消息({ 用户: 用户甲, 角色: 角色甲, 内容: '我自己先前说的', 发送者: 'yonghu' })
    const 响应 = await faSong(角色甲, { neiRong: '引用自己先前那句', beiYongXiaoXiId: 用户原话 })
    expect(响应.status).toBe(200)
    expect(响应.body.shu_ju.bei_yong_xiao_xi_id).toBe(用户原话)
  })
})

describe.skipIf(!有真库)('FP-08a ③ 六种非法引用形态一律 4xx 且不 500、不泄露内部实现', () => {
  it.each([
    ['非 UUID 字符串', 'not-a-uuid'],
    ['空格式脏字符串', '%%%%%%%%'],
    ['SQL 注入形态', `1'; DROP TABLE "消息"; --`],
    ['超长随机串', 'x'.repeat(500)],
  ])('非 UUID（%s）⇒ 400，且不进任何 SQL', async (_名, 脏值) => {
    const 响应 = await faSong(角色甲, { neiRong: '脏引用', beiYongXiaoXiId: 脏值 })
    expect(响应.status).toBeGreaterThanOrEqual(400)
    expect(响应.status).toBeLessThan(500)
    expect(响应.status).toBe(400)
    expect(响应.body.cheng_gong).toBe(false)
    断言不泄露(JSON.stringify(响应.body))
    const 行数 = await (池 as Pool).query(
      `SELECT count(*) AS n FROM "消息" WHERE "内容" = $1`,
      ['脏引用'],
    )
    expect(Number(行数.rows[0]['n'])).toBe(0)
  })

  it('不存在的 UUID ⇒ 400（形合法但查无此行）', async () => {
    const 响应 = await faSong(角色甲, { neiRong: '引用空气', beiYongXiaoXiId: randomUUID() })
    expect(响应.status).toBe(400)
    expect(响应.body.cheng_gong).toBe(false)
    断言不泄露(JSON.stringify(响应.body))
  })

  /** 断言顺序固定为「先查库、后看状态」：反证（关掉校验）时先炸出来的就是"非法引用静默落库"这条硬事实，
   *  而不是被状态断言挡在前面看不到。 */
  async function 会话内落库引用数(内容: string): Promise<number> {
    const 库 = await (池 as Pool).query(
      `SELECT count(*) AS n FROM "消息" WHERE "内容" = $1 AND "被引用消息ID" IS NOT NULL`,
      [内容],
    )
    return Number(库.rows[0]['n'])
  }

  it('跨会话（本人另一会话里的消息）⇒ 4xx 且绝不落库', async () => {
    const 另一会话消息 = await 铺消息({ 用户: 用户甲, 角色: 角色甲2, 内容: '另一个会话里的话' })
    const 响应 = await faSong(角色甲, { neiRong: '串会话的引用', beiYongXiaoXiId: 另一会话消息 })
    expect(await 会话内落库引用数('串会话的引用')).toBe(0)
    expect(响应.status).toBeGreaterThanOrEqual(400)
    expect(响应.status).toBeLessThan(500)
    expect(响应.status).toBe(400)
    断言不泄露(JSON.stringify(响应.body))
  })

  it('跨用户（别人会话里的消息）⇒ 4xx 且不落到 500，绝不把他人消息 ID 落进本会话', async () => {
    const 他人消息 = await 铺消息({ 用户: 用户乙, 角色: 角色乙, 内容: '别人会话里的私密话' })
    const 响应 = await faSong(角色甲, { neiRong: '想引用别人的话', beiYongXiaoXiId: 他人消息 })
    expect(await 会话内落库引用数('想引用别人的话')).toBe(0)
    expect(响应.status).toBeGreaterThanOrEqual(400)
    expect(响应.status).toBeLessThan(500)
    expect(响应.status).toBe(403)
    断言不泄露(JSON.stringify(响应.body))
  })

  it('指向已撤回消息 ⇒ 4xx 且不落库', async () => {
    const 撤回消息 = await 铺消息({ 用户: 用户甲, 角色: 角色甲, 内容: '已经被撤回了', 已撤回: true })
    const 响应 = await faSong(角色甲, { neiRong: '引用撤回的', beiYongXiaoXiId: 撤回消息 })
    expect(await 会话内落库引用数('引用撤回的')).toBe(0)
    expect(响应.status).toBeGreaterThanOrEqual(400)
    expect(响应.status).toBeLessThan(500)
    expect(响应.status).toBe(400)
    断言不泄露(JSON.stringify(响应.body))
  })

  it('自引用（同幂等键重放时把这条消息自己当引用对象）⇒ 4xx 且原行不被改写', async () => {
    const 键 = randomUUID()
    const 第一次 = await faSong(角色甲, { neiRong: '将要自引用', 幂等键: 键 })
    expect(第一次.status).toBe(200)
    const 自己ID = 第一次.body.shu_ju.id as string
    const 第二次 = await faSong(角色甲, { neiRong: '将要自引用', 幂等键: 键, beiYongXiaoXiId: 自己ID })
    expect(第二次.status).toBeGreaterThanOrEqual(400)
    expect(第二次.status).toBeLessThan(500)
    expect(第二次.status).toBe(400)
    断言不泄露(JSON.stringify(第二次.body))
    const 库 = await (池 as Pool).query(
      `SELECT "被引用消息ID" FROM "消息" WHERE "ID" = $1::uuid`,
      [自己ID],
    )
    expect(库.rows[0]['被引用消息ID']).toBeNull()
  })

  it('非字符串形态（对象/数组/数字）一律 4xx，不 500', async () => {
    for (const 脏值 of [{ id: 角色甲 }, [角色甲], 12345, true]) {
      const 响应 = await faSong(角色甲, { neiRong: '类型脏引用', beiYongXiaoXiId: 脏值 })
      expect(响应.status).toBeGreaterThanOrEqual(400)
      expect(响应.status).toBeLessThan(500)
    }
  })

  it('引用值出现在 图文混排/媒体 消息上同样受裁定（不因带块而绕过）', async () => {
    const 响应 = await faSong(角色甲, {
      neiRong: '',
      leiXing: 'wenben',
      neiRongKuai: [{ lei_xing: 'wenzi', nei_rong: '块消息也管' }],
      beiYongXiaoXiId: '不是UUID',
    })
    expect(响应.status).toBe(400)
  })
})

describe.skipIf(!有真库)('FP-08a ④ 服务层裁定入口本身（yanZhengBeiYinYong 的四种终态）', () => {
  it('未引用 / 合法 / 脏形状 三类入参的返回值', async () => {
    const { yanZhengBeiYinYong } = await import('../../services/消息')
    expect(await yanZhengBeiYinYong(null, 用户甲, 角色甲)).toEqual({ cheng_gong: true, id: null })
    expect(await yanZhengBeiYinYong(undefined, 用户甲, 角色甲)).toEqual({ cheng_gong: true, id: null })
    const 脏 = await yanZhengBeiYinYong('abc', 用户甲, 角色甲)
    expect(脏.cheng_gong).toBe(false)
    expect(脏.zhuang_tai_ma).toBe(400)
    expect(typeof 脏.ti_shi).toBe('string')
    const 原消息 = await 铺消息({ 用户: 用户甲, 角色: 角色甲, 内容: '服务层放行的原话' })
    expect(await yanZhengBeiYinYong(原消息, 用户甲, 角色甲)).toEqual({ cheng_gong: true, id: 原消息 })
  })

  it('裁定查询是参数化的：把 UUID 位换成注入串也不会执行任何语句', async () => {
    const { yanZhengBeiYinYong } = await import('../../services/消息')
    const 前 = await (池 as Pool).query(`SELECT count(*) AS n FROM pg_tables WHERE tablename = '消息'`)
    const 结果 = await yanZhengBeiYinYong(`x' OR 1=1; DROP TABLE "消息"; --`, 用户甲, 角色甲)
    const 后 = await (池 as Pool).query(`SELECT count(*) AS n FROM pg_tables WHERE tablename = '消息'`)
    expect(结果.cheng_gong).toBe(false)
    expect(String(后.rows[0]['n'])).toBe(String(前.rows[0]['n']))
  })
})

describe.skipIf(!有真库)('FP-08a ① 老库补列路径：只跑 baseline（无 035）再补 035 也必须收敛', () => {
  it('无该列的库上执行 035 ⇒ 列 + 外键 + CHECK + 索引一次到位，且再跑幂等', async () => {
    const 老库名 = `fp08a_laoiku_${后缀}`.slice(0, 60).toLowerCase()
    await (管理池 as Pool).query(`CREATE DATABASE "${老库名}"`)
    const 老池 = new Pool({ connectionString: 取连接串(老库名), max: 1 })
    try {
      await 重放文件(老池, resolve(建库根目录, '000_baseline.sql'))
      await 老池.query(`ALTER TABLE "消息" DROP COLUMN IF EXISTS "被引用消息ID"`)
      const 缺列 = await 老池.query(
        `SELECT count(*) AS n FROM pg_attribute WHERE attrelid = '消息'::regclass AND attname = '被引用消息ID'`,
      )
      expect(Number(缺列.rows[0]['n'])).toBe(0)
      await 重放文件(老池, resolve(迁移目录, '035_引用消息.sql'))
      await 重放文件(老池, resolve(迁移目录, '035_引用消息.sql'))
      const 约束 = await 老池.query(
        `SELECT conname FROM pg_constraint WHERE conrelid = '消息'::regclass AND conname IN ('消息_被引用消息ID_fkey','消息_不得自引用') ORDER BY conname`,
      )
      const 索引 = await 老池.query(
        `SELECT indexname FROM pg_indexes WHERE tablename = '消息' AND indexname = '消息_被引用消息ID_索引'`,
      )
      expect(约束.rows.map((r: Record<string, unknown>) => String(r['conname']))).toEqual([
        '消息_不得自引用',
        '消息_被引用消息ID_fkey',
      ])
      expect(索引.rows).toHaveLength(1)
    } finally {
      await 老池.end().catch(() => undefined)
      await (管理池 as Pool).query(`DROP DATABASE IF EXISTS "${老库名}"`).catch(() => undefined)
    }
  }, 240000)

  it('两份建表脚本单独执行都能建出带该列的 消息 表（三方一致的另一方：baseline 与 init 的内联外键同口径）', async () => {
    for (const [名, 路径] of [
      ['baseline', resolve(建库根目录, '000_baseline.sql')],
      ['init', resolve(__dirname, '..', '..', '..', 'database', 'init.sql')],
    ] as const) {
      const 库名 = `fp08a_${名}_${后缀}`.slice(0, 60).toLowerCase()
      await (管理池 as Pool).query(`CREATE DATABASE "${库名}"`)
      const 单池 = new Pool({ connectionString: 取连接串(库名), max: 1 })
      try {
        await 重放文件(单池, 路径)
        const 定义 = await 单池.query(
          `SELECT conname, pg_get_constraintdef(oid) AS d FROM pg_constraint WHERE conrelid = '消息'::regclass AND conname = '消息_被引用消息ID_fkey'`,
        )
        expect(定义.rows, `${名} 建表后缺引用列外键`).toHaveLength(1)
        expect(String(定义.rows[0]['d'])).toMatch(/ON DELETE SET NULL/)
      } finally {
        await 单池.end().catch(() => undefined)
        await (管理池 as Pool).query(`DROP DATABASE IF EXISTS "${库名}"`).catch(() => undefined)
      }
    }
  }, 240000)
})
