import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { Pool } from 'pg'
import express from 'express'
import request from 'supertest'

/**
 * FP-21 后端半边：`好友消息` 的 内容块 + 被引用消息ID（迁移 036）在**好友链路**上的端到端契约。
 *
 * 打通的是同一条链路：HTTP body 带块/带引用 → 好友路由取值 → services/消息.ts 那**一份**清洗与裁定
 * → INSERT 落 `好友消息`.`内容块` / `好友消息`.`被引用消息ID` → 出参按 AI 侧同口径白名单回读。
 * 任何一环漏掉都会在这里显形：漏列 = 静默丢块（库里永远 NULL、刷新读不回）、
 * 漏键 = 前端静默丢字段（R4 契约缺口的原形态）、漏裁定 = 500 或越权引用静默落库。
 *
 * 与 FP-08a（AI 侧引用契约）的分工：那份钉 `消息`，本份钉 `好友消息`；
 * 两份额外共同钉住「判定只有一份」（见最后的「单入口守卫」组）——
 * 好友侧若复制一份校验函数或第二份块清洗，本文件立刻红。
 *
 * 库隔离（PROGRESS L-02：本地 `lovewithme` 与「恋爱吧管理中心」共用 ⇒ 禁止对主库任何 DDL/DML）：
 *  本文件**只连自建临时库** `fp21_*`（三个：全链库 / 补列起点库 / 无 036 库），
 *  自己 CREATE、afterAll 无条件 DROP；对主库连只读取证都不做（避免与并行工人互扰）。
 *  迁移链一律跳过 034（用户自测提权脚本，禁止执行）。
 *  连不上库时整组跳过并在摘要里按 ⚠️环境限制分账，不把「看不到错误」判成通过。
 *
 * 建库走现网真实路径：`database/000_baseline.sql` + `database/001_haoyou_yu_shezhi.sql`
 *  + 顺序重放 migrations ⇒ 036 在「建表语句已含该列」与「老库补列」两种起点上都必须幂等（分别覆盖）。
 */

const 迁移目录 = resolve(__dirname, '..', '..', '..', 'database', 'migrations')
const 建库根目录 = resolve(__dirname, '..', '..', '..', '..', 'database')
/** 034 是用户自测提权脚本（L-02），任何情况下都不执行 */
const 跳过迁移 = /^034_/

const { peiZhi: peiZhiRef } = await import('../../config')
const { MEI_TI_PEI_ZHI } = await import('../../config/媒体配置')

function 取连接串(库名?: string): string {
  const 显式 = (process.env.TEST_DATABASE_URL ?? '').trim()
  const 基 = 显式 !== '' ? 显式 : String(peiZhiRef.shuJuKuLianJie ?? '')
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
const 全链库名 = `fp21_haoyou_${后缀}`.slice(0, 60).toLowerCase()
/** 补列起点库：只跑到 016/027，用来证 036 在「两列都不存在」的库上把结构一次建齐 */
const 老库名 = `fp21_laoku_${后缀}`.slice(0, 60).toLowerCase()
/** 反证③用的库：**永不**执行 036 ⇒ 路由同款 INSERT 必须撞 42703（否则「INSERT 写了这两列」是空判） */
const 无〇三六库名 = `fp21_no036_${后缀}`.slice(0, 60).toLowerCase()
const 随机数字尾 = String(Date.now()).slice(-7)

/** 存储根目录改指系统临时目录：绝不允许本用例往项目 uploads/ 里写一个字节（同 好友媒体.test.ts） */
const 临时存储根 = fs.mkdtempSync(path.join(os.tmpdir(), 'fp21-haoyou-store-'))
;(MEI_TI_PEI_ZHI as { cunChuGenMuLu: string }).cunChuGenMuLu = 临时存储根
process.env.BING_DU_SAO_MIAO_QI_YONG = 'false'

/** 应用侧的 数据库 单例改指向临时库：路由与服务都跑真实 SQL，不打桩任何业务判定。
 *  池必须**惰性取**——vi.mock 工厂在本文件 import 期就被执行，那时 beforeAll 还没建库。 */
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
  const 池 = (globalThis as unknown as { __fp21池?: Pool }).__fp21池
  if (!池) throw new Error('FP-21 临时库尚未建立')
  return 池
}

vi.mock('../../middleware/限流', () => ({
  liaoTianXianLiu: (_q: unknown, _r: unknown, 下一项: () => void) => 下一项(),
}))
vi.mock('../../services/安全审核', () => ({
  jianCeWeiJiXinHao: vi.fn(() => null),
  shenHeNeiRongAnQuan: vi.fn(async () => ({ wei_gui: false, lei_xing: '', li_you: '' })),
}))
vi.mock('../../services/DeepSeek视觉审核', () => ({
  shenHeTuPianAnQuan: vi.fn(async () => ({ wei_gui: false, lei_xing: '', li_you: '' })),
}))
vi.mock('../../services/账号封禁', () => ({
  chaXunZhangHaoFengJin: vi.fn(async () => ({ beiFengJin: false })),
  jiLuZhangHaoWeiGui: vi.fn(async () => undefined),
}))
vi.mock('../../services/IP封禁', () => ({ 获取IP: () => '127.0.0.1' }))
vi.mock('../../services/通知', () => ({ chuangJianTongZhi: vi.fn(async () => undefined) }))
vi.mock('../../redis', () => ({
  redis: { get: async () => null, set: async () => 'OK', del: async () => 1 },
}))

const 甲 = randomUUID()
const 乙 = randomUUID()
/** 甲 的**第二个**好友（跨好友对引用的靶子：甲↔丙 里的消息不得被 甲→乙 那条引用到） */
const 丙 = randomUUID()
/** 与甲无关的用户；乙↔丁 那条消息甲既读不到也不该引用得到（跨用户 = 403 面） */
const 丁 = randomUUID()

let 池: Pool | null = null
let 老池: Pool | null = null
let 无〇三六池: Pool | null = null
const 已建库: string[] = []

async function 重放文件(目标: Pool, 路径: string): Promise<void> {
  await 目标.query(readFileSync(路径, 'utf-8'))
}

function 迁移清单(): string[] {
  return readdirSync(迁移目录)
    .filter((名) => 名.endsWith('.sql') && !跳过迁移.test(名))
    .sort()
}

beforeAll(async () => {
  if (!有真库) return
  for (const 名 of [全链库名, 老库名, 无〇三六库名]) {
    await (管理池 as Pool).query(`CREATE DATABASE "${名}"`)
    已建库.push(名)
  }
  池 = new Pool({ connectionString: 取连接串(全链库名), max: 4 })
  await 重放文件(池, resolve(建库根目录, '000_baseline.sql'))
  await 重放文件(池, resolve(建库根目录, '001_haoyou_yu_shezhi.sql'))
  for (const 名 of 迁移清单()) await 重放文件(池, resolve(迁移目录, 名))
  await 池.query(
    `INSERT INTO "用户" ("ID", "手机号", "昵称") VALUES
       ($1::uuid, $5, 'FP21甲'), ($2::uuid, $6, 'FP21乙'),
       ($3::uuid, $7, 'FP21丙'), ($4::uuid, $8, 'FP21丁')`,
    [
      甲,
      乙,
      丙,
      丁,
      `13${随机数字尾}01`.slice(0, 11),
      `13${随机数字尾}02`.slice(0, 11),
      `13${随机数字尾}03`.slice(0, 11),
      `13${随机数字尾}04`.slice(0, 11),
    ],
  )
  // 好友关系：甲↔乙、甲↔丙、乙↔丁（丁 与 甲 无关系 ⇒ 甲 既进不了 乙↔丁 的对话，也不该引用到里面的消息）
  await 池.query(
    `INSERT INTO "好友申请" ("申请者ID", "接收者ID", "状态") VALUES
       ($1::uuid, $2::uuid, 'accepted'), ($1::uuid, $3::uuid, 'accepted'), ($2::uuid, $4::uuid, 'accepted')`,
    [甲, 乙, 丙, 丁],
  )
  // 补列起点库：只建到 016（好友表在、036 的两列不存在）+ 027（媒体列形态收敛）
  老池 = new Pool({ connectionString: 取连接串(老库名), max: 2 })
  await 重放文件(老池, resolve(建库根目录, '000_baseline.sql'))
  await 重放文件(老池, resolve(迁移目录, '016_好友与设置表.sql'))
  await 重放文件(老池, resolve(迁移目录, '027_好友消息媒体ID统一UUID外键.sql'))
  // 反证库：同样跑到 027，但**不**跑 036
  无〇三六池 = new Pool({ connectionString: 取连接串(无〇三六库名), max: 2 })
  await 重放文件(无〇三六池, resolve(建库根目录, '000_baseline.sql'))
  await 重放文件(无〇三六池, resolve(迁移目录, '016_好友与设置表.sql'))
  await 重放文件(无〇三六池, resolve(迁移目录, '027_好友消息媒体ID统一UUID外键.sql'))
  ;(globalThis as unknown as { __fp21池: Pool }).__fp21池 = 池
}, 480000)

afterAll(async () => {
  for (const 待关 of [池, 老池, 无〇三六池]) {
    if (待关) await 待关.end().catch(() => undefined)
  }
  if (管理池) {
    for (const 名 of 已建库) {
      await (管理池 as Pool).query(`DROP DATABASE IF EXISTS "${名}"`).catch(() => undefined)
    }
    await 管理池.end().catch(() => undefined)
  }
  fs.rmSync(临时存储根, { recursive: true, force: true })
})

const 应用 = express()
应用.use(express.json())
应用.use((qingQiu, _xiangYing, xiaYiBu) => {
  // 路由段是中文，supertest 发的是 percent-encoded 路径；与 好友媒体.test.ts 同口径解回原文
  qingQiu.url = decodeURI(qingQiu.url)
  xiaYiBu()
})
let 当前用户 = 甲
应用.use((qingQiu, _xiangYing, 下一项) => {
  ;(qingQiu as unknown as { yong_hu: { yongHuId: string } }).yong_hu = { yongHuId: 当前用户 }
  下一项()
})
应用.use('/api/好友', (await import('../好友')).default)

/** 以指定用户身份发一条好友消息（身份切换只在本次请求内生效） */
async function 发(正文: Record<string, unknown>, 作为: string = 甲) {
  const 旧 = 当前用户
  当前用户 = 作为
  try {
    return await request(应用).post(encodeURI('/api/好友/消息')).send(正文)
  } finally {
    当前用户 = 旧
  }
}

async function 列表(对端: string, 作为: string = 甲) {
  const 旧 = 当前用户
  当前用户 = 作为
  try {
    return await request(应用).get(encodeURI(`/api/好友/消息/${对端}`))
  } finally {
    当前用户 = 旧
  }
}

function PNG(正文: string): Buffer {
  const 头 = Buffer.alloc(24)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(头, 0)
  头.writeUInt32BE(64, 16)
  头.writeUInt32BE(64, 20)
  return Buffer.concat([头, Buffer.from(正文, 'utf8')])
}

/** 走**真实**上传入口拿媒体 ID（内容寻址 + 大小/MIME/魔数 + 视觉审核都在 liuShiBaoCunMeiTi 里面），
 *  不自建假媒体行 —— 否则「块引用的媒体真实存在」这条判据就成了自说自话。 */
async function 传一张图(对端: string, 正文: string, 作为: string = 甲): Promise<string> {
  const 旧 = 当前用户
  当前用户 = 作为
  try {
    const 响应 = await request(应用)
      .post('/api/好友/媒体')
      .query({ jieShouZheId: 对端, leiBie: 'tupian' })
      .attach('file', PNG(正文), { filename: 'fp21.png', contentType: 'image/png' })
    expect(响应.status).toBe(200)
    return String(响应.body.shu_ju.mediaId)
  } finally {
    当前用户 = 旧
  }
}

/** 直接铺一条好友消息（不走接口），用来构造「被引用的原消息」「已撤回的原消息」等前置态 */
async function 铺好友消息(参数: {
  发送者: string
  接收者: string
  内容: string
  已撤回?: boolean
}): Promise<string> {
  const 结果 = await (池 as Pool).query(
    `INSERT INTO "好友消息" ("发送者ID", "接收者ID", "内容", "类型", "撤回")
     VALUES ($1::uuid, $2::uuid, $3, 'wenben', $4::boolean) RETURNING "ID"`,
    [参数.发送者, 参数.接收者, 参数.内容, 参数.已撤回 === true],
  )
  return String(结果.rows[0].ID)
}

/** 错误响应体不得泄露内部实现：列名/SQL 片段/PG 错误码与原文/堆栈/文件路径一律不得出现（FP-08a 同一判据） */
function 断言不泄露(文本: string): void {
  for (const 泄密 of [
    '被引用消息ID',
    '内容块',
    '"好友消息"',
    'SELECT',
    'INSERT INTO',
    'VALUES',
    'Postgres',
    'pg_',
    '22P02',
    '23503',
    '23514',
    '42703',
    'invalid input syntax',
    'column',
    'foreign key',
    'violates',
    'check constraint',
    'does not exist',
    'at Object.',
    'at async ',
    '.ts:',
    'Traceback',
    'Pool',
  ]) {
    expect(文本, `错误响应泄露了内部实现片段: ${泄密}`).not.toContain(泄密)
  }
}

describe.skipIf(!有真库)('FP-21 ① 迁移 036 在真库上的形态（两列 / FK 删除语义 / 自引用 CHECK / 索引 / 幂等）', () => {
  it('好友消息 列集合 = 11 列，含 内容块(jsonb) 与 被引用消息ID(uuid)', async () => {
    const 列 = await (池 as Pool).query(
      `SELECT attname, format_type(atttypid, atttypmod) AS lx FROM pg_attribute
        WHERE attrelid = '好友消息'::regclass AND attnum > 0 AND NOT attisdropped`,
    )
    const 形态 = new Map(
      列.rows.map((r: Record<string, unknown>) => [String(r['attname']), String(r['lx'])]),
    )
    expect([...形态.keys()].sort()).toEqual(
      [
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
      ].sort(),
    )
    expect(形态.get('内容块')).toBe('jsonb')
    expect(形态.get('被引用消息ID')).toBe('uuid')
  })

  it('外键指向 好友消息(ID) 且删除语义 SET NULL —— 删原消息绝不连带删掉引用方', async () => {
    const 约束 = await (池 as Pool).query(
      `SELECT conname, pg_get_constraintdef(oid) AS d FROM pg_constraint WHERE conrelid = '好友消息'::regclass`,
    )
    const 全部 = 约束.rows.map((r: Record<string, unknown>) => `${r['conname']} :: ${r['d']}`)
    expect(全部.join('\n')).toContain(
      '好友消息_被引用消息ID_fkey :: FOREIGN KEY ("被引用消息ID") REFERENCES "好友消息"("ID") ON DELETE SET NULL',
    )
    const 原消息 = await 铺好友消息({ 发送者: 乙, 接收者: 甲, 内容: '被引用的原话' })
    const 引用者 = await (池 as Pool).query(
      `INSERT INTO "好友消息" ("发送者ID", "接收者ID", "内容", "类型", "被引用消息ID")
       VALUES ($1::uuid, $2::uuid, '引用了别人', 'wenben', $3::uuid) RETURNING "ID"`,
      [甲, 乙, 原消息],
    )
    const 引用者ID = String(引用者.rows[0].ID)
    await (池 as Pool).query(`DELETE FROM "好友消息" WHERE "ID" = $1::uuid`, [原消息])
    const 剩下 = await (池 as Pool).query(
      `SELECT "内容", "被引用消息ID" FROM "好友消息" WHERE "ID" = $1::uuid`,
      [引用者ID],
    )
    expect(剩下.rows).toHaveLength(1)
    expect(String(剩下.rows[0]['内容'])).toBe('引用了别人')
    expect(剩下.rows[0]['被引用消息ID']).toBeNull()
  })

  it('自引用在 DB 层就不可能落库（CHECK 命中，不靠应用自觉）', async () => {
    const id = await 铺好友消息({ 发送者: 甲, 接收者: 乙, 内容: '自引用试验' })
    await expect(
      (池 as Pool).query(`UPDATE "好友消息" SET "被引用消息ID" = $1::uuid WHERE "ID" = $1::uuid`, [id]),
    ).rejects.toThrow(/好友消息_不得自引用|check|23514/i)
  })

  it('外键侧索引在位（注销/到期这类批量删行不退化成逐行全表扫）', async () => {
    const 索引 = await (池 as Pool).query(
      `SELECT indexdef FROM pg_indexes WHERE tablename = '好友消息' AND indexname = '好友消息_被引用消息ID_索引'`,
    )
    expect(索引.rows).toHaveLength(1)
    expect(String(索引.rows[0]['indexdef'])).toContain('被引用消息ID')
  })

  it('036 可重复执行（幂等）：同一库上再跑两遍不报错、列与约束不翻倍', async () => {
    const 前 = await (池 as Pool).query(
      `SELECT count(*) AS n FROM pg_attribute WHERE attrelid = '好友消息'::regclass AND attname IN ('内容块','被引用消息ID')`,
    )
    await 重放文件(池 as Pool, resolve(迁移目录, '036_好友消息内容与引用.sql'))
    await 重放文件(池 as Pool, resolve(迁移目录, '036_好友消息内容与引用.sql'))
    const 后 = await (池 as Pool).query(
      `SELECT count(*) AS n FROM pg_attribute WHERE attrelid = '好友消息'::regclass AND attname IN ('内容块','被引用消息ID')`,
    )
    const 约束 = await (池 as Pool).query(
      `SELECT count(*) AS n FROM pg_constraint WHERE conrelid = '好友消息'::regclass AND conname IN ('好友消息_被引用消息ID_fkey','好友消息_不得自引用')`,
    )
    expect(String(前.rows[0]['n'])).toBe(String(后.rows[0]['n']))
    expect(Number(约束.rows[0]['n'])).toBe(2)
  })

  it('老库起点（只跑 016 + 027，两列都不存在）执行 036 ⇒ 列 + FK + CHECK + 索引一次到位，再跑幂等', async () => {
    const 缺列 = await (老池 as Pool).query(
      `SELECT count(*) AS n FROM pg_attribute WHERE attrelid = '好友消息'::regclass AND attname IN ('内容块','被引用消息ID')`,
    )
    expect(Number(缺列.rows[0]['n'])).toBe(0)
    await 重放文件(老池 as Pool, resolve(迁移目录, '036_好友消息内容与引用.sql'))
    await 重放文件(老池 as Pool, resolve(迁移目录, '036_好友消息内容与引用.sql'))
    const 约束 = await (老池 as Pool).query(
      `SELECT conname FROM pg_constraint WHERE conrelid = '好友消息'::regclass
        AND conname IN ('好友消息_被引用消息ID_fkey','好友消息_不得自引用') ORDER BY conname`,
    )
    const 列 = await (老池 as Pool).query(
      `SELECT attname FROM pg_attribute WHERE attrelid = '好友消息'::regclass
        AND attname IN ('内容块','被引用消息ID') ORDER BY attname`,
    )
    const 索引 = await (老池 as Pool).query(
      `SELECT indexname FROM pg_indexes WHERE tablename = '好友消息' AND indexname = '好友消息_被引用消息ID_索引'`,
    )
    expect(约束.rows.map((r: Record<string, unknown>) => String(r['conname']))).toEqual([
      '好友消息_不得自引用',
      '好友消息_被引用消息ID_fkey',
    ])
    expect(列.rows.map((r: Record<string, unknown>) => String(r['attname']))).toEqual([
      '内容块',
      '被引用消息ID',
    ])
    expect(索引.rows).toHaveLength(1)
  })
})

describe.skipIf(!有真库)('FP-21 ② 写路径与出参：带块发送后落库可读回，引用槽恒在（null 而非缺键）', () => {
  it('图文块消息：库里落 内容块 数组、投影逐字等于顺序可读文本、出参回读同一份块', async () => {
    const 媒体 = await 传一张图(乙, 'fp21-tu-a')
    const 响应 = await 发({
      jieShouZheId: 乙,
      neiRong: '客户端顺手带的旧文本应当被忽略',
      leiXing: 'wenben',
      nei_rong_kuai: [
        { lei_xing: 'wenzi', nei_rong: '前面' },
        { lei_xing: 'tupian', mei_ti_id: 媒体 },
        { lei_xing: 'wenzi', nei_rong: '后面' },
      ],
    })
    expect(响应.status).toBe(200)
    const 库 = await (池 as Pool).query(
      `SELECT "内容", "类型", "媒体ID", "内容块" FROM "好友消息" WHERE "ID" = $1::uuid`,
      [响应.body.shu_ju.id],
    )
    expect(库.rows).toHaveLength(1)
    // 块是唯一真源：投影由 services/消息内容块.ts 派生，客户端那段旧文本被忽略（不给第二套值留活口）
    expect(String(库.rows[0]['内容'])).toBe('前面[图片]后面')
    expect(String(库.rows[0]['类型'])).toBe('wenben')
    expect(String(库.rows[0]['媒体ID'])).toBe(媒体)
    expect(库.rows[0]['内容块']).toEqual([
      { lei_xing: 'wenzi', nei_rong: '前面' },
      { lei_xing: 'tupian', mei_ti_id: 媒体 },
      { lei_xing: 'wenzi', nei_rong: '后面' },
    ])

    const 列表响应 = await 列表(乙)
    const 那条 = 列表响应.body.shu_ju.lie_biao.find(
      (项: Record<string, unknown>) => 项['id'] === 响应.body.shu_ju.id,
    )
    expect(那条).toBeTruthy()
    // 出参键名与 AI 侧逐字相同（前端两端共用 utils/消息内容块 那一份真源的前提）
    expect(Object.keys(那条)).toContain('nei_rong_kuai')
    expect(Object.keys(那条)).toContain('bei_yong_xiao_xi_id')
    expect(那条.nei_rong).toBe('前面[图片]后面')
    expect(那条.nei_rong_kuai).toHaveLength(3)
    expect(那条.nei_rong_kuai[1].mei_ti_id).toBe(媒体)
    // 块里的图片出签名地址且绑定读者（与消息级 mei_ti_url 同一算法、同一签名主体）
    expect(那条.nei_rong_kuai[1].mei_ti_url).toContain(`u=${甲}`)
    expect(那条.nei_rong_kuai[1].mei_ti_lei_bie).toBe('tupian')
    expect(那条.bei_yong_xiao_xi_id).toBeNull()
  })

  it('纯图片块消息（零文字）不被「空内容」挡掉，类型是派生出的 tuPian', async () => {
    const 媒体 = await 传一张图(乙, 'fp21-tu-b')
    const 响应 = await 发({
      jieShouZheId: 乙,
      neiRong: '',
      leiXing: 'wenben',
      nei_rong_kuai: [{ lei_xing: 'tupian', mei_ti_id: 媒体 }],
    })
    expect(响应.status).toBe(200)
    const 那条 = (await 列表(乙)).body.shu_ju.lie_biao.find(
      (项: Record<string, unknown>) => 项['id'] === 响应.body.shu_ju.id,
    )
    expect(那条.lei_xing).toBe('tuPian')
    expect(那条.nei_rong).toBe('')
    expect(那条.nei_rong_kuai).toEqual([
      { lei_xing: 'tupian', mei_ti_id: 媒体, mei_ti_url: expect.any(String), mei_ti_lei_bie: 'tupian' },
    ])
  })

  it('历史行（无 内容块）由 内容 + 媒体ID + 类型 反构，出参块恒非空且库里不回填', async () => {
    const 媒体 = await 传一张图(乙, 'fp21-tu-c')
    const 响应 = await 发({ jieShouZheId: 乙, leiXing: 'tuPian', meiTiId: 媒体 })
    expect(响应.status).toBe(200)
    const 库 = await (池 as Pool).query(
      `SELECT "内容块" FROM "好友消息" WHERE "ID" = $1::uuid`,
      [响应.body.shu_ju.id],
    )
    expect(库.rows[0]['内容块']).toBeNull()
    const 那条 = (await 列表(乙)).body.shu_ju.lie_biao.find(
      (项: Record<string, unknown>) => 项['id'] === 响应.body.shu_ju.id,
    )
    expect(那条.nei_rong_kuai).toEqual([
      { lei_xing: 'tupian', mei_ti_id: 媒体, mei_ti_url: expect.any(String), mei_ti_lei_bie: 'tupian' },
    ])
  })

  it('带引用发送：200、出参与库里同一行同值；不带引用时该键为 null 而非缺键', async () => {
    const 原消息 = await 铺好友消息({ 发送者: 乙, 接收者: 甲, 内容: '被引用的对方原话' })
    const 响应 = await 发({ jieShouZheId: 乙, neiRong: '引用一下', beiYongXiaoXiId: 原消息 })
    expect(响应.status).toBe(200)
    const 库 = await (池 as Pool).query(
      `SELECT "被引用消息ID" FROM "好友消息" WHERE "ID" = $1::uuid`,
      [响应.body.shu_ju.id],
    )
    expect(String(库.rows[0]['被引用消息ID'])).toBe(原消息)
    const 那条 = (await 列表(乙)).body.shu_ju.lie_biao.find(
      (项: Record<string, unknown>) => 项['id'] === 响应.body.shu_ju.id,
    )
    expect(那条.bei_yong_xiao_xi_id).toBe(原消息)
    // 摘要不落库也不额外下发：出参里除了这个 ID 不得再多一个「引用摘要」之类的键
    expect(JSON.stringify(那条)).not.toContain('被引用的对方原话')

    const 无引用 = await 发({ jieShouZheId: 乙, neiRong: '没有引用' })
    expect(无引用.status).toBe(200)
    const 无引用那条 = (await 列表(乙)).body.shu_ju.lie_biao.find(
      (项: Record<string, unknown>) => 项['id'] === 无引用.body.shu_ju.id,
    )
    expect(Object.keys(无引用那条)).toContain('bei_yong_xiao_xi_id')
    expect(无引用那条.bei_yong_xiao_xi_id).toBeNull()
  })

  it('已撤回行：内容/媒体/块一律剥干净，但引用身份不因撤回而消失（与 AI 侧同口径）', async () => {
    const 原消息 = await 铺好友消息({ 发送者: 乙, 接收者: 甲, 内容: '可被引用的活消息' })
    const 发送 = await 发({ jieShouZheId: 乙, neiRong: '将被撤回', beiYongXiaoXiId: 原消息 })
    expect(发送.status).toBe(200)
    const 撤回 = await request(应用)
      .put(encodeURI(`/api/好友/消息/${发送.body.shu_ju.id}/撤回`))
      .send({})
    expect(撤回.status).toBe(200)
    const 那条 = (await 列表(乙)).body.shu_ju.lie_biao.find(
      (项: Record<string, unknown>) => 项['id'] === 发送.body.shu_ju.id,
    )
    expect(那条.yi_che_hui).toBe(true)
    expect(那条.nei_rong).toBe('')
    // 撤回行不给原块：只给一条与 nei_rong 逐字相同的空文字块（图文顺序里含着正文，不外泄）
    expect(那条.nei_rong_kuai).toEqual([{ lei_xing: 'wenzi', nei_rong: '' }])
    expect(那条.mei_ti_url).toBeNull()
    expect(那条.bei_yong_xiao_xi_id).toBe(原消息)
  })

  it('出参键集合钉绝对值（新增/改名/漏键都在这里红，不用 toContain 放过第二套键）', async () => {
    await 发({ jieShouZheId: 乙, neiRong: '绝对值探针' })
    const 行 = (await 列表(乙)).body.shu_ju.lie_biao[0]
    expect(Object.keys(行).sort()).toEqual(
      [
        'bei_yong_xiao_xi_id',
        'fa_song_zhe_id',
        'id',
        'jie_shou_zhe_id',
        'lei_xing',
        'mei_ti_da_xiao_zi_jie',
        'mei_ti_id',
        'mei_ti_lei_bie',
        'mei_ti_url',
        'mei_ti_yuan_shi_wen_jian_ming',
        'nei_rong',
        'nei_rong_kuai',
        'shi_jian_chuo',
        'yi_che_hui',
        'yi_du',
      ].sort(),
    )
  })
})

describe.skipIf(!有真库)('FP-21 ③ 六种非法引用形态在好友链路上同样 4xx、不 500、零落库', () => {
  async function 落库引用数(内容: string): Promise<number> {
    const 库 = await (池 as Pool).query(
      `SELECT count(*) AS n FROM "好友消息" WHERE "内容" = $1 AND "被引用消息ID" IS NOT NULL`,
      [内容],
    )
    return Number(库.rows[0]['n'])
  }
  async function 落库块数(内容: string): Promise<number> {
    const 库 = await (池 as Pool).query(
      `SELECT count(*) AS n FROM "好友消息" WHERE "内容" = $1 AND "内容块" IS NOT NULL`,
      [内容],
    )
    return Number(库.rows[0]['n'])
  }

  it.each([
    ['非 UUID 字符串', 'not-a-uuid'],
    ['空格式脏字符串', '%%%%%%%%'],
    ['SQL 注入形态', `1'; DROP TABLE "好友消息"; --`],
    ['超长随机串', 'x'.repeat(500)],
  ])('非 UUID（%s）⇒ 400，且不进任何 INSERT', async (_名, 脏值) => {
    // 断言顺序固定为「先看状态、后查库」：旁路裁定时先炸出来的必须是"非法引用静默落库"或 500
    const 响应 = await 发({ jieShouZheId: 乙, neiRong: '脏引用', beiYongXiaoXiId: 脏值 })
    expect(响应.status).toBeGreaterThanOrEqual(400)
    expect(响应.status).toBeLessThan(500)
    expect(响应.status).toBe(400)
    expect(响应.body.cheng_gong).toBe(false)
    断言不泄露(JSON.stringify(响应.body))
    expect(await 落库引用数('脏引用')).toBe(0)
  })

  it('非字符串形态（对象/数组/数字/布尔）一律 4xx，不 500', async () => {
    for (const 脏值 of [{ id: 乙 }, [乙], 12345, true]) {
      const 响应 = await 发({ jieShouZheId: 乙, neiRong: '类型脏引用', beiYongXiaoXiId: 脏值 })
      expect(响应.status).toBeGreaterThanOrEqual(400)
      expect(响应.status).toBeLessThan(500)
    }
    expect(await 落库引用数('类型脏引用')).toBe(0)
  })

  it('不存在的 UUID ⇒ 400（形合法但查无此行），绝不静默落一个悬空引用', async () => {
    const 响应 = await 发({ jieShouZheId: 乙, neiRong: '引用空气', beiYongXiaoXiId: randomUUID() })
    expect(响应.status).toBe(400)
    expect(响应.body.cheng_gong).toBe(false)
    断言不泄露(JSON.stringify(响应.body))
    expect(await 落库引用数('引用空气')).toBe(0)
  })

  it('跨好友对（本人在 甲↔丙 那一对里的消息，却被 甲→乙 这条引用）⇒ 400 且零落库', async () => {
    const 另一对消息 = await 铺好友消息({ 发送者: 甲, 接收者: 丙, 内容: '另一对里的话' })
    const 响应 = await 发({ jieShouZheId: 乙, neiRong: '串好友对的引用', beiYongXiaoXiId: 另一对消息 })
    expect(await 落库引用数('串好友对的引用')).toBe(0)
    expect(响应.status).toBeGreaterThanOrEqual(400)
    expect(响应.status).toBeLessThan(500)
    expect(响应.status).toBe(400)
    断言不泄露(JSON.stringify(响应.body))
  })

  it('跨用户（别人对话里的消息）⇒ 403，绝不把他人消息 ID 落进本对话', async () => {
    const 他人消息 = await 铺好友消息({ 发送者: 乙, 接收者: 丁, 内容: '别人对话里的私密话' })
    const 响应 = await 发({ jieShouZheId: 乙, neiRong: '想引用别人的话', beiYongXiaoXiId: 他人消息 })
    expect(await 落库引用数('想引用别人的话')).toBe(0)
    expect(响应.status).toBeGreaterThanOrEqual(400)
    expect(响应.status).toBeLessThan(500)
    expect(响应.status).toBe(403)
    断言不泄露(JSON.stringify(响应.body))
  })

  it('指向已撤回消息 ⇒ 400 且不落库', async () => {
    const 撤回消息 = await 铺好友消息({ 发送者: 甲, 接收者: 乙, 内容: '已经被撤回了', 已撤回: true })
    const 响应 = await 发({ jieShouZheId: 乙, neiRong: '引用撤回的', beiYongXiaoXiId: 撤回消息 })
    expect(await 落库引用数('引用撤回的')).toBe(0)
    expect(响应.status).toBe(400)
    断言不泄露(JSON.stringify(响应.body))
  })

  it('自引用：判据是 shiZiYinYong 那一份；结构面由 036 的 CHECK 兜（好友链路没有幂等重放口径）', async () => {
    const { shiZiYinYong } = await import('../../services/消息')
    expect(shiZiYinYong('a', 'a')).toBe(true)
    expect(shiZiYinYong('a', 'b')).toBe(false)
    expect(shiZiYinYong(null, 'a')).toBe(false)
    expect(shiZiYinYong('a', null)).toBe(false)
    // HTTP 面：新行 ID 由 gen_random_uuid() 现生成，客户端拿自己那条的 ID 当引用对象时本行还不存在，
    // 因此唯一能构造「行引用自己」的是绕过应用直写库 —— 那条路已被 ① 的 CHECK 用例证伪为不可能。
    const 自己 = await 发({ jieShouZheId: 乙, neiRong: '将要被引用的新行' })
    expect(自己.status).toBe(200)
    const 库 = await (池 as Pool).query(
      `SELECT "被引用消息ID" FROM "好友消息" WHERE "ID" = $1::uuid`,
      [自己.body.shu_ju.id],
    )
    expect(库.rows[0]['被引用消息ID']).toBeNull()
  })

  it('块 + 脏引用：带块绝不绕过引用裁定（两个入口任一失守都必须 4xx 且零落库）', async () => {
    const 媒体 = await 传一张图(乙, 'fp21-tu-d')
    const 响应 = await 发({
      jieShouZheId: 乙,
      neiRong: '',
      nei_rong_kuai: [{ lei_xing: 'wenzi', nei_rong: '块消息也管' }],
      beiYongXiaoXiId: '不是UUID',
    })
    expect(响应.status).toBe(400)
    expect(await 落库块数('块消息也管')).toBe(0)
    expect(媒体).toBeTruthy()
  })

  it('脏块降级不静默：陌生块逐块丢弃、全丢光才 400，且绝不退回发旧文本（同一份清洗序列）', async () => {
    const 半脏 = await 发({
      jieShouZheId: 乙,
      neiRong: '',
      nei_rong_kuai: [
        { lei_xing: 'wenzi', nei_rong: '留下的那句' },
        { lei_xing: 'huawen_nei_rong', nei_rong: '未来版本的块' },
      ],
    })
    expect(半脏.status).toBe(200)
    const 全脏 = await 发({
      jieShouZheId: 乙,
      neiRong: '客户端顺带上报的旧文本',
      nei_rong_kuai: [{ lei_xing: 'huawen_nei_rong', nei_rong: '陌生块' }],
    })
    expect(全脏.status).toBe(400)
    expect(全脏.body.cheng_gong).toBe(false)
    断言不泄露(JSON.stringify(全脏.body))
    const 库 = await (池 as Pool).query(
      `SELECT count(*) AS n FROM "好友消息" WHERE "内容" = $1`,
      ['客户端顺带上报的旧文本'],
    )
    expect(Number(库.rows[0]['n'])).toBe(0)
  })

  it('块里的图片块只能引用自己上传的图像媒体：他人媒体块被丢，不落死引用', async () => {
    const 他人上传 = await 传一张图(甲, 'fp21-tu-e', 乙)
    const 响应 = await 发({
      jieShouZheId: 乙,
      neiRong: '',
      nei_rong_kuai: [
        { lei_xing: 'tupian', mei_ti_id: 他人上传 },
        { lei_xing: 'wenzi', nei_rong: '这句留得下' },
      ],
    })
    expect(响应.status).toBe(200)
    const 库 = await (池 as Pool).query(
      `SELECT "内容", "内容块", "媒体ID" FROM "好友消息" WHERE "ID" = $1::uuid`,
      [响应.body.shu_ju.id],
    )
    expect(String(库.rows[0]['内容'])).toBe('这句留得下')
    expect(库.rows[0]['内容块']).toEqual([{ lei_xing: 'wenzi', nei_rong: '这句留得下' }])
    expect(库.rows[0]['媒体ID']).toBeNull()
  })

  it('非好友发送 ⇒ 403 且一条 SQL 取数都不发生（归属校验恒在引用裁定之前）', async () => {
    const 他人消息 = await 铺好友消息({ 发送者: 乙, 接收者: 丁, 内容: '陌生人的靶子' })
    const 响应 = await 发({ jieShouZheId: 丁, neiRong: '想插进别人的对话', beiYongXiaoXiId: 他人消息 }, 甲)
    expect(响应.status).toBe(403)
    expect(他人消息).toBeTruthy()
  })
})

describe.skipIf(!有真库)('FP-21 ④ 服务层裁定入口本身：好友面向与 AI 面向同一条判定', () => {
  it('HAO_YOU_BEI_YIN_YONG_MIAN_XIANG 的各终态与 AI 面同码同文案，且无向性成立', async () => {
    const {
      yanZhengBeiYinYong,
      HAO_YOU_BEI_YIN_YONG_MIAN_XIANG,
      AI_BEI_YIN_YONG_MIAN_XIANG,
    } = await import('../../services/消息')
    const 面 = HAO_YOU_BEI_YIN_YONG_MIAN_XIANG
    expect(await yanZhengBeiYinYong(null, 甲, 乙, 面)).toEqual({ cheng_gong: true, id: null })
    expect(await yanZhengBeiYinYong(undefined, 甲, 乙, 面)).toEqual({ cheng_gong: true, id: null })
    const 脏好友 = await yanZhengBeiYinYong('abc', 甲, 乙, 面)
    const 脏AI = await yanZhengBeiYinYong('abc', 甲, 乙, AI_BEI_YIN_YONG_MIAN_XIANG)
    expect([脏好友.cheng_gong, 脏好友.zhuang_tai_ma]).toEqual([false, 400])
    // 同一条文案（两面向共用 translations 的那一组键，好友侧不新造第二套话术）
    expect(脏好友.ti_shi).toBe(脏AI.ti_shi)
    const 原消息 = await 铺好友消息({ 发送者: 乙, 接收者: 甲, 内容: '服务层放行的原话' })
    expect(await yanZhengBeiYinYong(原消息, 甲, 乙, 面)).toEqual({ cheng_gong: true, id: 原消息 })
    const 甲发的 = await 铺好友消息({ 发送者: 甲, 接收者: 乙, 内容: '无向性探针' })
    expect(await yanZhengBeiYinYong(甲发的, 乙, 甲, 面)).toEqual({ cheng_gong: true, id: 甲发的 })
    const 不存在 = await yanZhengBeiYinYong(randomUUID(), 甲, 乙, 面)
    expect([不存在.cheng_gong, 不存在.zhuang_tai_ma]).toEqual([false, 400])
  })

  it('裁定查询是参数化的：把 UUID 位换成注入串也不会执行任何语句', async () => {
    const { yanZhengBeiYinYong, HAO_YOU_BEI_YIN_YONG_MIAN_XIANG } = await import('../../services/消息')
    const 前 = await (池 as Pool).query(`SELECT count(*) AS n FROM pg_tables WHERE tablename = '好友消息'`)
    const 结果 = await yanZhengBeiYinYong(
      `x' OR 1=1; DROP TABLE "好友消息"; --`,
      甲,
      乙,
      HAO_YOU_BEI_YIN_YONG_MIAN_XIANG,
    )
    const 后 = await (池 as Pool).query(`SELECT count(*) AS n FROM pg_tables WHERE tablename = '好友消息'`)
    expect(结果.cheng_gong).toBe(false)
    expect(String(后.rows[0]['n'])).toBe(String(前.rows[0]['n']))
  })

  it('反证①：越权引用被挡住的全部责任在两闸；剥掉「属于本人」后 403 这一层立即消失（同一条裁定体的第一处证伪）', async () => {
    const { yanZhengBeiYinYong, HAO_YOU_BEI_YIN_YONG_MIAN_XIANG } = await import('../../services/消息')
    const 他人消息 = await 铺好友消息({ 发送者: 乙, 接收者: 丁, 内容: '反证用的私密话' })
    const 原样 = await yanZhengBeiYinYong(他人消息, 甲, 乙, HAO_YOU_BEI_YIN_YONG_MIAN_XIANG)
    expect([原样.cheng_gong, 原样.zhuang_tai_ma]).toEqual([false, 403])

    // 【本用例为什么写成两段，而不是上一名工人那一段「剥掉归属⇒放行」】
    // 实测证伪了那段的前提：好友面上「同一好友对」本身就把两端都限定在 {本人, 对端} 里，
    // 于是 同对话 ⇒ 归属 恒成立（一行不含本人的消息绝不可能通过同对话）。
    // 所以**只**剥掉归属判据不会放行，它只会把越权那条从 403 降级成 400 ——
    // 拿「放行」当判据去剥归属，得到的红灯证明的不是归属判据，而是两条判据的嵌套关系。
    // 改成两段正好把两件事各自钉住：归属判据决定状态码那一层，两道闸合起来才挡住越权落库。
    const 只剥归属 = { ...HAO_YOU_BEI_YIN_YONG_MIAN_XIANG, shuYuBenRen: () => true }
    const 降级 = await yanZhengBeiYinYong(他人消息, 甲, 乙, 只剥归属)
    expect([降级.cheng_gong, 降级.zhuang_tai_ma], '剥掉归属判据后仍回 403 ⇒ 该判据是空判').toEqual([false, 400])

    const 剥掉两闸 = {
      ...HAO_YOU_BEI_YIN_YONG_MIAN_XIANG,
      shuYuBenRen: () => true,
      shiZaiTongYiDuiHua: () => true,
    }
    const 旁路 = await yanZhengBeiYinYong(他人消息, 甲, 乙, 剥掉两闸)
    expect(旁路.cheng_gong, '两道闸都剥掉仍拒 ⇒ 整条裁定是空判').toBe(true)
    // 变异只活在本用例的内存里：HTTP 面仍走那一份真裁定 ⇒ 临时态不可能残落到库里
    const 旁路发送 = await 发({
      jieShouZheId: 乙,
      neiRong: '反证①旁路落库',
      beiYongXiaoXiId: 他人消息,
    })
    expect(旁路发送.status, '路由绕开了唯一裁定 ⇒ 面向参数被当成了可绕过的外部输入').toBe(403)
    const 库 = await (池 as Pool).query(
      `SELECT count(*) AS n FROM "好友消息" WHERE "内容" = $1`,
      ['反证①旁路落库'],
    )
    expect(Number(库.rows[0]['n'])).toBe(0)
  })

  it('反证②：把「已撤回」判据换成恒假 ⇒ 引用已撤回消息被放行（同一条裁定体的第二处证伪）', async () => {
    const { yanZhengBeiYinYong, HAO_YOU_BEI_YIN_YONG_MIAN_XIANG } = await import('../../services/消息')
    const 被剥掉的 = { ...HAO_YOU_BEI_YIN_YONG_MIAN_XIANG, quYiCheHui: () => false }
    const 撤回消息 = await 铺好友消息({ 发送者: 甲, 接收者: 乙, 内容: '反证用的撤回话', 已撤回: true })
    expect(
      (await yanZhengBeiYinYong(撤回消息, 甲, 乙, HAO_YOU_BEI_YIN_YONG_MIAN_XIANG)).cheng_gong,
    ).toBe(false)
    expect(
      (await yanZhengBeiYinYong(撤回消息, 甲, 乙, 被剥掉的)).cheng_gong,
      '剥掉撤回判据后仍拒 ⇒ 该判据是空判',
    ).toBe(true)
  })

  it('反证③：在未跑 036 的库上执行路由同款 INSERT ⇒ 必撞 42703（证明 INSERT 真的写了这两列，不是静默丢列）', async () => {
    const { HAO_YOU_YU_JU } = await import('../好友')
    const 缺列 = await (无〇三六池 as Pool).query(
      `SELECT count(*) AS n FROM pg_attribute WHERE attrelid = '好友消息'::regclass AND attname IN ('内容块','被引用消息ID')`,
    )
    expect(Number(缺列.rows[0]['n'])).toBe(0)
    await expect(
      (无〇三六池 as Pool).query(HAO_YOU_YU_JU.插入消息, [
        甲,
        乙,
        '一句话',
        'wenben',
        null,
        null,
        null,
      ]),
    ).rejects.toThrow(/42703|column .* does not exist/i)
    // 同一串语句在全链库上必须成功：否则上面的红只是「语句本身写坏了」
    const 成 = await (池 as Pool).query(HAO_YOU_YU_JU.插入消息, [
      甲,
      乙,
      '一句话',
      'wenben',
      null,
      null,
      null,
    ])
    expect(成.rows).toHaveLength(1)
  })
})

describe('FP-21 ⑤ 单入口守卫：好友侧不得自带第二份引用判定与块清洗（R5 病灶不回流；无库依赖）', () => {
  const 后端根 = resolve(__dirname, '..', '..', '..')
  const 源码根 = resolve(后端根, 'src')

  function 读源(...段: string[]): string {
    return readFileSync(resolve(源码根, ...段), 'utf-8')
  }

  it('routes/好友.ts 只做取值与调用，判定一律在 services/消息.ts 那一份里', () => {
    const 路由源 = 读源('routes', '好友.ts')
    for (const 出口 of [
      'yanZhengBeiYinYong(',
      'HAO_YOU_BEI_YIN_YONG_MIAN_XIANG',
      'qingLiXiaoXiKuaiXieRu(',
      'gouKuaiShangXiaWen(',
      'yingSheKuaiChuCan(',
      'kuaiShenHeWenBen(',
    ]) {
      expect(路由源, `好友路由没接唯一出口 ${出口}`).toContain(出口)
    }
    // 第二份实现的全部特征：自己查 好友消息 的撤回态判引用归属 / 自己拼块清洗序列 / 自己造引用文案。
    // 形状取「SELECT 列表里出现 撤回 列」：路由既有的 撤回 接口取的是 发送者ID + 创建时间，
    // 只有引用裁定的那条语句会同时取 接收者ID 与 撤回 ⇒ 本判据不误伤既有语句。
    expect(路由源, '路由里出现了第二份引用裁定 SQL').not.toMatch(
      /SELECT[^\n]*"撤回"[^\n]*FROM "好友消息"/,
    )
    expect(路由源, '路由里出现了第二份块清洗').not.toMatch(
      /qingLiTiJiaoKuai\(|yingYongMeiTiPanDing\(|paiShengJianRong\(|qingLiLuoKuKuai\(/,
    )
    for (const 键 of [
      'yinYongXiaoXiBuCunZai',
      'yinYongXiaoXiWuQuanXian',
      'yinYongXiaoXiHuiHuaBuFu',
      'yinYongXiaoXiYiCheHui',
    ]) {
      expect(路由源, `路由里出现了第二套引用分支（${键}）`).not.toContain(键)
    }
  })

  it('引用裁定的五种判据只有一处：全部判定分支都在同一个函数体内；面向不携带分支', () => {
    const 服务源 = 读源('services', '消息.ts')
    const 裁定体 = /export async function yanZhengBeiYinYong[\s\S]*?\n}/.exec(服务源)
    expect(裁定体, 'yanZhengBeiYinYong 不再是导出的单入口').toBeTruthy()
    for (const 形 of [
      'yinYongXiaoXiFeiFa',
      'yinYongXiaoXiBuCunZai',
      'yinYongXiaoXiWuQuanXian',
      'yinYongXiaoXiHuiHuaBuFu',
      'yinYongXiaoXiYiCheHui',
    ]) {
      expect(裁定体![0], `裁定体里缺 ${形} 这一判据`).toContain(形)
    }
    const 面向清单 = [
      ...服务源.matchAll(/^export const (\w*BEI_YIN_YONG_MIAN_XIANG): BeiYinYongMianXiang = \{/gm),
    ].map((项) => 项[1])
    expect(面向清单.sort()).toEqual(['AI_BEI_YIN_YONG_MIAN_XIANG', 'HAO_YOU_BEI_YIN_YONG_MIAN_XIANG'])
    const 好友面向体 = /export const HAO_YOU_BEI_YIN_YONG_MIAN_XIANG[\s\S]*?\n\}/.exec(服务源)![0]
    expect(好友面向体, '面向里出现了状态码 ⇒ 判定分支被复制进面向').not.toMatch(/zhuang_tai_ma|40[03]/)
    expect([...服务源.matchAll(/function shiZiYinYong/g)].length, '自引用判据出现第二份').toBe(1)
  })

  it('两张表的裁定各只有一条语句、且都取自语句常量（不接受任何拼串）', () => {
    const 服务源 = 读源('services', '消息.ts')
    const AI面 = /export const AI_BEI_YIN_YONG_MIAN_XIANG[\s\S]*?\n\}/.exec(服务源)![0]
    const 好友面 = /export const HAO_YOU_BEI_YIN_YONG_MIAN_XIANG[\s\S]*?\n\}/.exec(服务源)![0]
    expect(AI面).toContain(`SELECT "用户ID", "角色ID", "已撤回" FROM "消息" WHERE "ID" = $1 LIMIT 1`)
    expect(好友面).toContain(
      `SELECT "发送者ID", "接收者ID", "撤回" FROM "好友消息" WHERE "ID" = $1 LIMIT 1`,
    )
    for (const 面 of [AI面, 好友面]) {
      const 语句 = /yuJu: `([^`]*)`/.exec(面)![1]
      expect(语句.match(/\$\d/g)).toEqual(['$1'])
      expect(语句).not.toMatch(/\$\{/)
    }
    // 裁定体内不得再出现第二条 SQL（唯一取数口 = mianXiang.yuJu）
    const 裁定体 = /export async function yanZhengBeiYinYong[\s\S]*?\n}/.exec(服务源)![0]
    expect([...裁定体.matchAll(/数据库\.query\(/g)].length).toBe(1)
    expect(裁定体).toContain('mianXiang.yuJu')
  })

  it('出参两键与 AI 侧同名同形，且好友出参形态只声明一处（types/index.ts）', () => {
    const 路由源 = 读源('routes', '好友.ts')
    const 服务源 = 读源('services', '消息.ts')
    for (const 键 of ['bei_yong_xiao_xi_id', 'nei_rong_kuai']) {
      expect(服务源, `AI 侧出参键 ${键} 不见了（同构前提失效）`).toContain(`${键}:`)
      expect(路由源, `好友出参缺 ${键}`).toContain(`${键}:`)
    }
    const 类型源 = 读源('types', 'index.ts')
    expect(类型源).toContain('export interface HaoYouXiaoXiChuCan')
    expect(类型源).toContain('nei_rong_kuai: XiaoXiKuaiChuCan[]')
    expect(类型源).toContain('bei_yong_xiao_xi_id: string | null')
    expect([...路由源.matchAll(/interface HaoYouXiaoXiChuCan/g)].length, '路由又声明了一份出参形态').toBe(0)
  })

  it('036 的语句体只碰 好友消息、纯增量且幂等（无 UPDATE/DELETE/DROP，列一律 IF NOT EXISTS）', () => {
    const 体 = 去注释(
      readFileSync(resolve(后端根, 'database', 'migrations', '036_好友消息内容与引用.sql'), 'utf-8'),
    )
    expect(体).toContain('ALTER TABLE "好友消息" ADD COLUMN IF NOT EXISTS "内容块" JSONB;')
    expect(体).toContain('ALTER TABLE "好友消息" ADD COLUMN IF NOT EXISTS "被引用消息ID" UUID')
    expect(体).toMatch(/"被引用消息ID"[\s\S]{0,160}REFERENCES "好友消息"\("ID"\) ON DELETE SET NULL/)
    expect(体).not.toMatch(/REFERENCES "好友消息"\("ID"\)[^\n]*ON DELETE CASCADE/)
    expect(体).toContain('CHECK ("ID" <> "被引用消息ID")')
    expect(体).toContain('CREATE INDEX IF NOT EXISTS "好友消息_被引用消息ID_索引"')
    expect(体).not.toMatch(/\bUPDATE\s+"/)
    expect(体).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(体).not.toMatch(/\bDROP\b/i)
    expect(体).not.toMatch(/\bTRUNCATE\b/i)
    expect(
      [...new Set([...体.matchAll(/ALTER TABLE\s+"([^"]+)"/g)].map((项) => 项[1]))],
      '036 越界改了别的表',
    ).toEqual(['好友消息'])
  })

  it('正式建库真源（database/001）与 036 同形态：两列 + 同名 FK/CHECK + 同索引俱在（新库靠建表、老库靠迁移）', () => {
    const 正式 = readFileSync(resolve(后端根, '..', 'database', '001_haoyou_yu_shezhi.sql'), 'utf-8')
    const 定义 = /CREATE TABLE IF NOT EXISTS "好友消息" [\s\S]*?\n\);/.exec(正式)
    expect(定义, '找不到 好友消息 建表语句').toBeTruthy()
    expect(定义![0]).toContain('"内容块" JSONB,')
    expect(定义![0]).toContain('"被引用消息ID" UUID REFERENCES "好友消息"("ID") ON DELETE SET NULL,')
    expect(定义![0]).toContain('CONSTRAINT "好友消息_不得自引用" CHECK ("ID" <> "被引用消息ID")')
    expect(正式).toContain('CREATE INDEX IF NOT EXISTS "好友消息_被引用消息ID_索引"')
  })

  /**
   * 【本轮改判 · 上一名工人留下的夹具判据被实测证伪】
   * 旧判据：`backend/database/001_haoyou_yu_shezhi.sql`（测试夹具）必须与 036 同形态，
   * 理由是「否则夹具建出来的库与正式路径分叉」。前提不成立，三条都是实测：
   *  ① 本仓**没有**任何路径读取该夹具 —— 全仓扫 `001_haoyou` 的引用点，落到文件系统的只有
   *    `database/001_haoyou_yu_shezhi.sql`（迁移027 / 迁移037 / 好友媒体真库 / 本文件 ① 组
   *    与 README 的 psql 步骤全部指向那一份），compose 挂载点也是 `./database`；
   *  ② 夹具自己头部自称的读取者「好友与设置.test.ts」在仓库里**不存在**（假自述）；
   *  ③ 它整体停在 027 之前：`媒体ID` 仍是 TEXT、`用户设置` 连 017 的两列气泡偏好都没有。
   * ⇒ 要求一份整体过期的副本单独对齐 036，只会得到一个半新半旧的假同源文件（比一致过期更坏）。
   * 这里因此改为钉住「它为什么不是建库路径」这一事实本身：哪天有人把 媒体ID 与 017 的列一起补齐，
   * 本用例就会红，那时才该把它纳回上面的门禁并同步两列。真门禁始终是上一条（正式建库真源）。
   */
  it('backend/database/001 夹具不参与两方门禁：它连 027/017 都没对齐 ⇒ 它不是任何建库路径', () => {
    const 夹具 = readFileSync(resolve(后端根, 'database', '001_haoyou_yu_shezhi.sql'), 'utf-8')
    const 定义 = /CREATE TABLE IF NOT EXISTS "好友消息" [\s\S]*?\n\);/.exec(夹具)
    expect(定义, '夹具里的 好友消息 建表语句都没了 ⇒ 本用例的比对基准不成立，改判前先确认该文件是否已退役').toBeTruthy()
    expect(定义![0], '媒体ID 已升级为 UUID ⇒ 夹具不再是 027 之前的副本，须连两列门禁一起改判').toContain(
      '"媒体ID" TEXT,',
    )
    expect(夹具).not.toContain('"气泡自己"')
    expect(夹具).not.toContain('"内容块"')
    // 假自述不得回流成第二份"看起来权威"的建库说明（同 FP-15a 对 init.sql 的那一类守卫）
    expect(定义![0]).not.toContain('REFERENCES "媒体文件"')
  })

  it('反证④（空判防护）：把 036 的补列语句整行注释掉 ⇒ 静态判据必红（注释不是补列依据）', () => {
    const 源 = readFileSync(
      resolve(后端根, 'database', 'migrations', '036_好友消息内容与引用.sql'),
      'utf-8',
    )
    const 变异 = 源.replace(
      'ALTER TABLE "好友消息" ADD COLUMN IF NOT EXISTS "内容块" JSONB;',
      '-- ALTER TABLE "好友消息" ADD COLUMN IF NOT EXISTS "内容块" JSONB;',
    )
    expect(变异, '变异夹具没生效（036 的补列文案漂移了，本用例判据要同步改判）').not.toBe(源)
    const 体 = 去注释(变异)
    expect(体, '注释掉的补列仍被当成依据 ⇒ FP-22f 修掉的空判回流').not.toContain(
      'ADD COLUMN IF NOT EXISTS "内容块"',
    )
    // 反向自检：未变异的语句体里必须含该列（否则上一条 not.toContain 是空判）
    expect(去注释(源)).toContain('ADD COLUMN IF NOT EXISTS "内容块"')
  })

  function 去注释(源: string): string {
    return 源.replace(/^\s*--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  }
})
