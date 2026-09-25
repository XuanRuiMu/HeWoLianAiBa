import { randomUUID } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import express from 'express'
import request from 'supertest'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RenZhengQingQiu } from '../../middleware/认证'
import { ZHAN_JI_PEI_ZHI } from '../../config/战绩配置'
import zhanJiLuYou from '../战绩'

const 真实库状态 = vi.hoisted(() => ({ 池: null as Pool | null }))

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => {
      if (!真实库状态.池) throw new Error('真实数据库尚未初始化')
      return 真实库状态.池.query(文本, 参数)
    },
    connect: async () => {
      if (!真实库状态.池) throw new Error('真实数据库尚未初始化')
      return 真实库状态.池.connect()
    },
  },
}))

const 后端根 = resolve(__dirname, '..', '..', '..')
const 服务器入口路径 = resolve(后端根, 'src', 'server.ts')
const 仓库根 = resolve(后端根, '..')
const 迁移目录 = resolve(后端根, 'database', 'migrations')
const 管理连接串 = String(process.env.TEST_DATABASE_URL ?? '').replace(/\/[^/?#]*(\?.*)?$/, '/postgres$1')
const 库名 = `fp11_api_${randomUUID().replace(/-/g, '').slice(0, 12)}`
let 管理库: Pool
let 业务库: Pool
let 应用: express.Express

function 随机手机号(): string {
  return `138${String(BigInt(`0x${randomUUID().replace(/-/g, '')}`) % 100000000n).padStart(8, '0')}`
}

async function 重放(路径: string): Promise<void> {
  await 业务库.query(readFileSync(路径, 'utf8'))
}

async function 建立用户(标记: string): Promise<{ id: string; archiveIds: string[] }> {
  const 用户ID = randomUUID()
  const 用户名 = `fp11-${标记}-${randomUUID().slice(0, 8)}`
  await 业务库.query(`INSERT INTO "用户" ("ID", "手机号", "用户名", "昵称") VALUES ($1, $2, $3, $3)`, [用户ID, 随机手机号(), 用户名])
  const archiveIds: string[] = []
  for (let 序号 = 0; 序号 < 3; 序号++) {
    const 角色ID = randomUUID()
    const 档案ID = randomUUID()
    await 业务库.query(`INSERT INTO "角色" ("ID", "用户ID", "名字", "性别", "封存") VALUES ($1, $2, $3, 'female', TRUE)`, [角色ID, 用户ID, `角色${序号}`])
    await 业务库.query(
      `INSERT INTO "游戏档案" ("ID", "用户ID", "角色ID", "结果类型", "模式") VALUES ($1, $2, $3, $4, $5)`,
      [档案ID, 用户ID, 角色ID, 序号 === 2 ? '' : 'sheng_li_ai_qing', 序号 === 2 ? 'tiaozhan' : 'putong'],
    )
    archiveIds.push(档案ID)
  }
  return { id: 用户ID, archiveIds }
}

beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL 未配置')
  管理库 = new Pool({ connectionString: 管理连接串, max: 2 })
  await 管理库.query(`CREATE DATABASE "${库名}"`)
  业务库 = new Pool({ connectionString: 管理连接串.replace(/\/[^/?#]*(\?.*)?$/, `/${库名}$1`), max: 8 })
  真实库状态.池 = 业务库
  await 重放(resolve(仓库根, 'database', '000_baseline.sql'))
  await 重放(resolve(仓库根, 'database', '001_haoyou_yu_shezhi.sql'))
  const 迁移 = readdirSync(迁移目录)
    .filter((名) => 名.endsWith('.sql') && !名.startsWith('034_'))
    .sort()
  for (const 名 of 迁移) await 重放(resolve(迁移目录, 名))
  应用 = express()
  应用.use(express.json())
  应用.use((qingQiu, _xiangYing, xiaYiBu) => {
    const 用户ID = qingQiu.get('x-fp11-user')
    if (用户ID) (qingQiu as RenZhengQingQiu).yong_hu = { yongHuId: 用户ID } as never
    xiaYiBu()
  })
  应用.use(encodeURI('/api/战绩'), zhanJiLuYou)
}, 420000)

beforeEach(async () => {
  await 业务库.query(`DELETE FROM "用户" WHERE "用户名" LIKE 'fp11-%'`)
})

afterAll(async () => {
  真实库状态.池 = null
  if (业务库) await 业务库.end().catch(() => undefined)
  if (管理库) {
    await 管理库.query(`DROP DATABASE IF EXISTS "${库名}"`).catch(() => undefined)
    await 管理库.end().catch(() => undefined)
  }
}, 420000)

describe('FP-11 战绩分类 HTTP 真库契约', () => {
  it('服务器以编码后的战绩挂载路径注册路由', () => {
    const 源 = readFileSync(服务器入口路径, 'utf8')
    expect(源).toContain("yingYong.use(encodeURI('/api/战绩'), zhanJiLuYou)")
  })

  it('无战绩的新用户首次读取也初始化且重复读取保持同一默认分类 ID', async () => {
    const 用户ID = randomUUID()
    await 业务库.query(`INSERT INTO "用户" ("ID", "手机号", "用户名", "昵称") VALUES ($1, $2, $3, '新用户')`, [用户ID, 随机手机号(), `fp11-新用户-${randomUUID().slice(0, 8)}`])
    const 首次 = await request(应用).get('/api/战绩/分类').set('x-fp11-user', 用户ID)
    const 再次 = await request(应用).get('/api/战绩/分类').set('x-fp11-user', 用户ID)
    expect(首次.status).toBe(200)
    expect(首次.body.shu_ju).toEqual({
      moRenFenLeiId: 再次.body.shu_ju.moRenFenLeiId,
      fenLeiLieBiao: [{ id: 再次.body.shu_ju.moRenFenLeiId, name: '默认分类', is_default: true, record_count: 0, version: 0 }],
    })
  })

  it('未登录不能读取或修改分类', async () => {
    const 响应 = await request(应用).get('/api/战绩/分类')
    expect(响应.status).toBe(401)
    expect(响应.body).toMatchObject({ cheng_gong: false, ti_shi: '未授权，请先登录' })
  })

  it('分类列表自动包含稳定默认分类，自定义名称创建时 trim', async () => {
    const 用户 = await 建立用户('分类')
    const 列表 = await request(应用).get('/api/战绩/分类').set('x-fp11-user', 用户.id)
    expect(列表.status).toBe(200)
    expect(列表.body.shu_ju.moRenFenLeiId).toMatch(/^[0-9a-f-]{36}$/i)
    expect(列表.body.shu_ju.fenLeiLieBiao).toEqual([
      {
        id: 列表.body.shu_ju.moRenFenLeiId,
        name: '默认分类',
        is_default: true,
        record_count: 2,
        version: 0,
      },
    ])
    const 创建 = await request(应用)
      .post('/api/战绩/分类')
      .set('x-fp11-user', 用户.id)
      .send({ mingCheng: '  收藏夹  ' })
    expect(创建.status).toBe(200)
    expect(创建.body.shu_ju).toMatchObject({ name: '收藏夹', is_default: false, record_count: 0, version: 0 })
    expect(创建.body.shu_ju.id).toMatch(/^[0-9a-f-]{36}$/i)
    const 再取 = await request(应用).get('/api/战绩/分类').set('x-fp11-user', 用户.id)
    expect(再取.body.shu_ju.fenLeiLieBiao.map((项: { name: string }) => 项.name)).toEqual(['默认分类', '收藏夹'])
  })

  it('拒绝 null、空白、超长与重名分类，并返回最终中文文案', async () => {
    const 用户 = await 建立用户('名称')
    for (const mingCheng of [null, '', ' \t\n ']) {
      const 响应 = await request(应用)
        .post('/api/战绩/分类')
        .set('x-fp11-user', 用户.id)
        .send({ mingCheng })
      expect(响应.status).toBe(400)
      expect(响应.body).toMatchObject({ ti_shi: '分类名称不能为空' })
    }
    const 非法改名 = await request(应用)
      .put(`/api/战绩/分类/${randomUUID()}`)
      .set('x-fp11-user', 用户.id)
      .send({ mingCheng: null, expectedVersion: 0 })
    expect(非法改名.status).toBe(400)
    const 临界长度 = await request(应用)
      .post('/api/战绩/分类')
      .set('x-fp11-user', 用户.id)
      .send({ mingCheng: '字'.repeat(ZHAN_JI_PEI_ZHI.fenLeiMingChengZuiDaChangDu) })
    expect(临界长度.status).toBe(200)
    const 超长 = await request(应用)
      .post('/api/战绩/分类')
      .set('x-fp11-user', 用户.id)
      .send({ mingCheng: '字'.repeat(ZHAN_JI_PEI_ZHI.fenLeiMingChengZuiDaChangDu + 1) })
    expect(超长.status).toBe(400)
    expect(超长.body.ti_shi).toBe(`分类名称不能超过${ZHAN_JI_PEI_ZHI.fenLeiMingChengZuiDaChangDu}个字`)
    const 已创建 = await request(应用).post('/api/战绩/分类').set('x-fp11-user', 用户.id).send({ mingCheng: 'Archive' })
    for (const mingCheng of [null, '  ', '字'.repeat(ZHAN_JI_PEI_ZHI.fenLeiMingChengZuiDaChangDu + 1)]) {
      const 改名 = await request(应用)
        .put(`/api/战绩/分类/${已创建.body.shu_ju.id}`)
        .set('x-fp11-user', 用户.id)
        .send({ mingCheng, expectedVersion: 0 })
      expect(改名.status).toBe(400)
    }
    const 分类列表 = await request(应用).get('/api/战绩/分类').set('x-fp11-user', 用户.id)
    const 默认重名 = await request(应用)
      .put(`/api/战绩/分类/${分类列表.body.shu_ju.moRenFenLeiId}`)
      .set('x-fp11-user', 用户.id)
      .send({ mingCheng: 'archive', expectedVersion: 0 })
    expect(默认重名.status).toBe(409)
    const 重名 = await request(应用)
      .post('/api/战绩/分类')
      .set('x-fp11-user', 用户.id)
      .send({ mingCheng: '  archive  ' })
    expect(重名.status).toBe(409)
    expect(重名.body).toMatchObject({ ti_shi: '分类名称已存在', cuo_wu_ma: 'ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU', code: 'ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU', retryable: false })
    expect(重名.body.traceId).toBe(重名.headers['x-request-id'])
  })

  it('默认分类和自定义分类均可改名，ID 不变且旧版本并发更新确定失败', async () => {
    const 用户 = await 建立用户('改名')
    const 他人 = await 建立用户('他人')
    const 初始 = await request(应用).get('/api/战绩/分类').set('x-fp11-user', 用户.id)
    const 默认分类 = 初始.body.shu_ju.fenLeiLieBiao[0]
    const 自定义 = await request(应用)
      .post('/api/战绩/分类')
      .set('x-fp11-user', 用户.id)
      .send({ mingCheng: '初名' })
    const 改默认 = await request(应用)
      .put(`/api/战绩/分类/${默认分类.id}`)
      .set('x-fp11-user', 用户.id)
      .send({ mingCheng: '  默认收藏  ', expectedVersion: 默认分类.version })
    expect(改默认.status).toBe(200)
    expect(改默认.body.shu_ju).toMatchObject({ id: 默认分类.id, name: '默认收藏', version: 1 })
    const 改自定义 = await request(应用)
      .put(`/api/战绩/分类/${自定义.body.shu_ju.id}`)
      .set('x-fp11-user', 用户.id)
      .send({ mingCheng: ' 新名 ', expectedVersion: 0 })
    expect(改自定义.status).toBe(200)
    expect(改自定义.body.shu_ju).toMatchObject({ id: 自定义.body.shu_ju.id, name: '新名', version: 1 })
    const 旧版本 = await request(应用)
      .put(`/api/战绩/分类/${默认分类.id}`)
      .set('x-fp11-user', 用户.id)
      .send({ mingCheng: '再次修改', expectedVersion: 0 })
    expect(旧版本.status).toBe(409)
    expect(旧版本.body).toMatchObject({ ti_shi: '分类已发生变化，请刷新后重试' })
    const 越权 = await request(应用)
      .put(`/api/战绩/分类/${默认分类.id}`)
      .set('x-fp11-user', 他人.id)
      .send({ mingCheng: '盗改', expectedVersion: 1 })
    expect(越权.status).toBe(404)
    expect(越权.body.ti_shi).toBe('战绩分类不存在')
  })

  it('列表可按分类筛选并承接完整持久顺序，未筛选仍返回全部既有战绩', async () => {
    const 用户 = await 建立用户('列表')
    const 自定义 = await request(应用)
      .post('/api/战绩/分类')
      .set('x-fp11-user', 用户.id)
      .send({ mingCheng: '重点' })
    const 分类ID = 自定义.body.shu_ju.id as string
    await 业务库.query(
      `UPDATE "游戏档案" SET "分类ID" = $1, "排序" = CASE "ID" WHEN $2 THEN 1 ELSE 0 END
        WHERE "ID" = ANY($3::uuid[])`,
      [分类ID, 用户.archiveIds[1], 用户.archiveIds.slice(0, 2)],
    )
    const 分类列表 = await request(应用)
      .get('/api/战绩/列表')
      .query({ categoryId: 分类ID })
      .set('x-fp11-user', 用户.id)
    expect(分类列表.status).toBe(200)
    expect(分类列表.body.shu_ju.dangAnLieBiao.map((项: { id: string }) => 项.id)).toEqual([
      用户.archiveIds[0],
      用户.archiveIds[1],
    ])
    expect(分类列表.body.shu_ju.dangAnLieBiao).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category_id: 分类ID, sort_order: 0 }),
        expect.objectContaining({ category_id: 分类ID, sort_order: 1 }),
      ]),
    )
    const 全量 = await request(应用).get('/api/战绩/列表').set('x-fp11-user', 用户.id)
    expect(全量.body.shu_ju.dangAnLieBiao.map((项: { id: string }) => 项.id)).toEqual(
      expect.arrayContaining(用户.archiveIds.slice(0, 2)),
    )
    expect(全量.body.shu_ju.dangAnLieBiao).toHaveLength(2)
    const 不存在 = await request(应用)
      .get('/api/战绩/列表')
      .query({ categoryId: randomUUID() })
      .set('x-fp11-user', 用户.id)
    expect(不存在.status).toBe(404)
    expect(不存在.body.ti_shi).toBe('战绩分类不存在')
  })

  it('默认分类禁止删除，自定义分类删除时全部记录同事务回落并保持完整顺序', async () => {
    const 用户 = await 建立用户('删除')
    const 他人 = await 建立用户('删除他人')
    const 初始 = await request(应用).get('/api/战绩/分类').set('x-fp11-user', 用户.id)
    const 默认分类 = 初始.body.shu_ju.fenLeiLieBiao[0]
    const 自定义 = await request(应用)
      .post('/api/战绩/分类')
      .set('x-fp11-user', 用户.id)
      .send({ mingCheng: '待删除' })
    const 自定义ID = 自定义.body.shu_ju.id as string
    await 业务库.query(
      `UPDATE "游戏档案" SET "分类ID" = $1, "排序" = "排序" + 10
        WHERE "ID" = ANY($2::uuid[])`,
      [自定义ID, 用户.archiveIds.slice(1)],
    )
    const 删默认 = await request(应用)
      .delete(`/api/战绩/分类/${默认分类.id}`)
      .query({ expectedVersion: 默认分类.version })
      .set('x-fp11-user', 用户.id)
    expect(删默认.status).toBe(409)
    expect(删默认.body.ti_shi).toBe('默认分类不能删除')
    const 越权 = await request(应用)
      .delete(`/api/战绩/分类/${自定义ID}`)
      .query({ expectedVersion: 0 })
      .set('x-fp11-user', 他人.id)
    expect(越权.status).toBe(404)
    const 删除 = await request(应用)
      .delete(`/api/战绩/分类/${自定义ID}`)
      .query({ expectedVersion: 0 })
      .set('x-fp11-user', 用户.id)
    expect(删除.status).toBe(200)
    expect(删除.body.shu_ju).toEqual({
      deleted_id: 自定义ID,
      fallback_category_id: 默认分类.id,
      moved_record_count: 2,
    })
    const 记录 = await 业务库.query(
      `SELECT "ID", "分类ID", "排序" FROM "游戏档案" WHERE "用户ID" = $1 ORDER BY "排序", "ID"`,
      [用户.id],
    )
    expect(记录.rows.map((行) => 行.ID)).toEqual(用户.archiveIds)
    expect(new Set(记录.rows.map((行) => 行.分类ID))).toEqual(new Set([默认分类.id]))
    expect(记录.rows.map((行) => 行.排序)).toEqual([0, 1, 2])
    const 再取 = await request(应用).get('/api/战绩/分类').set('x-fp11-user', 用户.id)
    expect(再取.body.shu_ju.fenLeiLieBiao).toEqual([
      expect.objectContaining({ id: 默认分类.id, record_count: 2, version: 1 }),
    ])
    const 再删 = await request(应用)
      .delete(`/api/战绩/分类/${自定义ID}`)
      .query({ expectedVersion: 0 })
      .set('x-fp11-user', 用户.id)
    expect(再删.status).toBe(404)
    expect(再删.body.shu_ju).toBeNull()
  })

  it('同一自定义分类并发删除仅一次成功，输家不得返回旧 ID', async () => {
    const 用户 = await 建立用户('并发删除')
    const 自定义 = await request(应用)
      .post('/api/战绩/分类')
      .set('x-fp11-user', 用户.id)
      .send({ mingCheng: '并发' })
    const 路径 = `/api/战绩/分类/${自定义.body.shu_ju.id}`
    const [甲, 乙] = await Promise.all([
      request(应用).delete(路径).query({ expectedVersion: 0 }).set('x-fp11-user', 用户.id),
      request(应用).delete(路径).query({ expectedVersion: 0 }).set('x-fp11-user', 用户.id),
    ])
    expect([甲.status, 乙.status].sort()).toEqual([200, 404])
    const 成功 = 甲.status === 200 ? 甲 : 乙
    expect(成功.body.shu_ju.deleted_id).toBe(自定义.body.shu_ju.id)
    const 失败 = 甲.status === 200 ? 乙 : 甲
    expect(失败.body.shu_ju).toBeNull()
  })

  it('记录跨分类移动校验双方归属与来源版本，成功后只属于一个目标分类', async () => {
    const 用户 = await 建立用户('移档')
    const 他人 = await 建立用户('移档他人')
    const 初始 = await request(应用).get('/api/战绩/分类').set('x-fp11-user', 用户.id)
    const 默认分类 = 初始.body.shu_ju.moRenFenLeiId as string
    const 目标 = await request(应用)
      .post('/api/战绩/分类')
      .set('x-fp11-user', 用户.id)
      .send({ mingCheng: '目标' })
    const 目标ID = 目标.body.shu_ju.id as string
    const 路径 = `/api/战绩/分类/${默认分类}/记录/${用户.archiveIds[0]}`
    const 不存在目标 = await request(应用)
      .put(路径)
      .set('x-fp11-user', 用户.id)
      .send({ targetCategoryId: randomUUID(), expectedVersion: 0 })
    expect(不存在目标.status).toBe(404)
    expect(不存在目标.body.ti_shi).toBe('战绩分类不存在')
    const 越权分类 = await request(应用)
      .put(路径)
      .set('x-fp11-user', 他人.id)
      .send({ targetCategoryId: 目标ID, expectedVersion: 0 })
    expect(越权分类.status).toBe(404)
    const 同分类 = await request(应用)
      .put(路径)
      .set('x-fp11-user', 用户.id)
      .send({ targetCategoryId: 默认分类, expectedVersion: 0 })
    expect(同分类.status).toBe(400)
    expect(同分类.body.ti_shi).toBe('不能移动到当前分类')
    const 移动 = await request(应用)
      .put(路径)
      .set('x-fp11-user', 用户.id)
      .send({ targetCategoryId: 目标ID, expectedVersion: 0 })
    expect(移动.status).toBe(200)
    expect(移动.body.shu_ju).toEqual({
      record_id: 用户.archiveIds[0],
      source_category_id: 默认分类,
      category_id: 目标ID,
      sort_order: 0,
      source_version: 1,
      target_version: 1,
    })
    const 详情 = await request(应用)
      .get(`/api/战绩/详情/${用户.archiveIds[0]}`)
      .set('x-fp11-user', 用户.id)
    expect(详情.status).toBe(200)
    expect(详情.body.shu_ju).toMatchObject({
      id: 用户.archiveIds[0],
      category_id: 目标ID,
      sort_order: 0,
      jie_guo_lei_xing_yuan: 'sheng_li_ai_qing',
    })
    const 记录 = await 业务库.query(`SELECT "分类ID", "排序" FROM "游戏档案" WHERE "ID" = $1`, [用户.archiveIds[0]])
    expect(记录.rows[0]).toMatchObject({ 分类ID: 目标ID, 排序: 0 })
    const 来源列表 = await request(应用)
      .get('/api/战绩/列表')
      .query({ categoryId: 默认分类 })
      .set('x-fp11-user', 用户.id)
    expect(来源列表.body.shu_ju.dangAnLieBiao.map((项: { id: string }) => 项.id)).toEqual([
      用户.archiveIds[1],
    ])
    const 目标列表 = await request(应用)
      .get('/api/战绩/列表')
      .query({ categoryId: 目标ID })
      .set('x-fp11-user', 用户.id)
    expect(目标列表.body.shu_ju.dangAnLieBiao.map((项: { id: string }) => 项.id)).toEqual([
      用户.archiveIds[0],
    ])
    const 旧版本 = await request(应用)
      .put(路径)
      .set('x-fp11-user', 用户.id)
      .send({ targetCategoryId: 目标ID, expectedVersion: 0 })
    expect(旧版本.status).toBe(409)
    expect(旧版本.body.ti_shi).toBe('分类已发生变化，请刷新后重试')
  })

  it('同一来源版本的并发移档只有一个成功，另一个确定冲突', async () => {
    const 用户 = await 建立用户('并发移档')
    const 初始 = await request(应用).get('/api/战绩/分类').set('x-fp11-user', 用户.id)
    const 默认分类 = 初始.body.shu_ju.moRenFenLeiId as string
    const 甲目标 = await request(应用).post('/api/战绩/分类').set('x-fp11-user', 用户.id).send({ mingCheng: '甲' })
    const 乙目标 = await request(应用).post('/api/战绩/分类').set('x-fp11-user', 用户.id).send({ mingCheng: '乙' })
    const 路径 = `/api/战绩/分类/${默认分类}/记录/${用户.archiveIds[0]}`
    const [甲, 乙] = await Promise.all([
      request(应用).put(路径).set('x-fp11-user', 用户.id).send({ targetCategoryId: 甲目标.body.shu_ju.id, expectedVersion: 0 }),
      request(应用).put(路径).set('x-fp11-user', 用户.id).send({ targetCategoryId: 乙目标.body.shu_ju.id, expectedVersion: 0 }),
    ])
    expect([甲.status, 乙.status].sort()).toEqual([200, 409])
    const 冲突 = 甲.status === 409 ? 甲 : 乙
    expect(冲突.body.ti_shi).toBe('分类已发生变化，请刷新后重试')
  })

  it('批量排序只接受完整无重复 ID 集合，并原子持久化后再次读取承接', async () => {
    const 用户 = await 建立用户('排序')
    const 他人 = await 建立用户('排序他人')
    const 初始 = await request(应用).get('/api/战绩/分类').set('x-fp11-user', 用户.id)
    const 默认分类 = 初始.body.shu_ju.moRenFenLeiId as string
    const 路径 = `/api/战绩/分类/${默认分类}/排序`
    const 重复 = await request(应用)
      .put(路径)
      .set('x-fp11-user', 用户.id)
      .send({ recordIds: [用户.archiveIds[0], 用户.archiveIds[0]], expectedVersion: 0 })
    expect(重复.status).toBe(400)
    expect(重复.body.ti_shi).toBe('排序ID不能重复')
    const 缺失 = await request(应用)
      .put(路径)
      .set('x-fp11-user', 用户.id)
      .send({ recordIds: [用户.archiveIds[0]], expectedVersion: 0 })
    expect(缺失.status).toBe(409)
    expect(缺失.body.ti_shi).toBe('排序必须包含该分类全部可见战绩')
    const 越权ID = await request(应用)
      .put(路径)
      .set('x-fp11-user', 用户.id)
      .send({ recordIds: [用户.archiveIds[0], 他人.archiveIds[0]], expectedVersion: 0 })
    expect(越权ID.status).toBe(409)
    expect(越权ID.body.ti_shi).toBe('排序必须包含该分类全部可见战绩')
    const 排序 = await request(应用)
      .put(路径)
      .set('x-fp11-user', 用户.id)
      .send({ recordIds: [用户.archiveIds[1].toUpperCase(), 用户.archiveIds[0].toUpperCase()], expectedVersion: 0 })
    expect(排序.status).toBe(200)
    expect(排序.body.shu_ju).toEqual({
      category_id: 默认分类,
      record_ids: [用户.archiveIds[1], 用户.archiveIds[0]],
      version: 1,
    })
    const 列表 = await request(应用)
      .get('/api/战绩/列表')
      .query({ categoryId: 默认分类 })
      .set('x-fp11-user', 用户.id)
    expect(列表.body.shu_ju.dangAnLieBiao.map((项: { id: string }) => 项.id)).toEqual([
      用户.archiveIds[1],
      用户.archiveIds[0],
    ])
    const 全部排序 = await 业务库.query(
      `SELECT "ID", "排序" FROM "游戏档案" WHERE "分类ID" = $1 ORDER BY "排序", "ID"`,
      [默认分类],
    )
    expect(全部排序.rows.map((行) => 行.ID)).toEqual([
      用户.archiveIds[1],
      用户.archiveIds[0],
      用户.archiveIds[2],
    ])
    expect(全部排序.rows.map((行) => 行.排序)).toEqual([0, 1, 2])
    const 幂等 = await request(应用)
      .put(路径)
      .set('x-fp11-user', 用户.id)
      .send({ recordIds: [用户.archiveIds[1], 用户.archiveIds[0]], expectedVersion: 1 })
    expect(幂等.status).toBe(200)
    expect(幂等.body.shu_ju.version).toBe(1)
    const 旧版本 = await request(应用)
      .put(路径)
      .set('x-fp11-user', 用户.id)
      .send({ recordIds: 用户.archiveIds.slice(0, 2), expectedVersion: 0 })
    expect(旧版本.status).toBe(409)
    expect(旧版本.body.ti_shi).toBe('分类已发生变化，请刷新后重试')
  })

  it('同一分类同一版本的并发排序仅提交一次', async () => {
    const 用户 = await 建立用户('并发排序')
    await 业务库.query(`UPDATE "游戏档案" SET "结果类型" = 'sheng_li_ai_qing' WHERE "ID" = $1`, [用户.archiveIds[2]])
    const 初始 = await request(应用).get('/api/战绩/分类').set('x-fp11-user', 用户.id)
    const 默认分类 = 初始.body.shu_ju.moRenFenLeiId as string
    const 路径 = `/api/战绩/分类/${默认分类}/排序`
    const [甲, 乙] = await Promise.all([
      request(应用).put(路径).set('x-fp11-user', 用户.id).send({ recordIds: [用户.archiveIds[2], 用户.archiveIds[0], 用户.archiveIds[1]], expectedVersion: 0 }),
      request(应用).put(路径).set('x-fp11-user', 用户.id).send({ recordIds: [用户.archiveIds[1], 用户.archiveIds[2], 用户.archiveIds[0]], expectedVersion: 0 }),
    ])
    expect([甲.status, 乙.status].sort()).toEqual([200, 409])
    const 冲突 = 甲.status === 409 ? 甲 : 乙
    expect(冲突.body.ti_shi).toBe('分类已发生变化，请刷新后重试')
    const 版本 = await 业务库.query(`SELECT "版本" FROM "战绩分类" WHERE "ID" = $1`, [默认分类])
    expect(版本.rows[0].版本).toBe(1)
  })

  it('删除分类中途数据库失败时回滚全部回落移动与版本更新', async () => {
    const 用户 = await 建立用户('删除回滚')
    const 自定义 = await request(应用)
      .post('/api/战绩/分类')
      .set('x-fp11-user', 用户.id)
      .send({ mingCheng: '回滚' })
    const 自定义ID = 自定义.body.shu_ju.id as string
    await 业务库.query(
      `UPDATE "游戏档案" SET "分类ID" = $1, "排序" = "排序" + 10 WHERE "ID" = $2`,
      [自定义ID, 用户.archiveIds[0]],
    )
    await 业务库.query(`
      CREATE OR REPLACE FUNCTION fp11_delete_category_failure()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'forced failure';
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER fp11_delete_category_failure
      BEFORE DELETE ON "战绩分类"
      FOR EACH ROW EXECUTE FUNCTION fp11_delete_category_failure();
    `)
    try {
      const 响应 = await request(应用)
        .delete(`/api/战绩/分类/${自定义ID}`)
        .query({ expectedVersion: 0 })
        .set('x-fp11-user', 用户.id)
      expect(响应.status).toBe(503)
      expect(响应.body.ti_shi).toBe('出错了，稍后再试')
      const 分类 = await 业务库.query(`SELECT "ID" FROM "战绩分类" WHERE "ID" = $1`, [自定义ID])
      expect(分类.rows).toHaveLength(1)
      const 记录 = await 业务库.query(`SELECT "分类ID", "排序" FROM "游戏档案" WHERE "ID" = $1`, [用户.archiveIds[0]])
      expect(记录.rows[0].分类ID).toBe(自定义ID)
      expect(记录.rows[0].排序).toBe(10)
      const 默认 = await 业务库.query(
        `SELECT "版本" FROM "战绩分类" WHERE "用户ID" = $1 AND "是否默认" = TRUE`,
        [用户.id],
      )
      expect(默认.rows[0].版本).toBe(0)
    } finally {
      await 业务库.query('DROP TRIGGER IF EXISTS fp11_delete_category_failure ON "战绩分类"; DROP FUNCTION IF EXISTS fp11_delete_category_failure()')
    }
  })

  it('数据库唯一冲突稳定映射为分类重名，不暴露内部错误', async () => {
    const 用户 = await 建立用户('数据库冲突')
    await 业务库.query(`
      CREATE OR REPLACE FUNCTION fp11_unique_category_failure()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION USING ERRCODE = '23505', CONSTRAINT = '战绩分类_用户名称唯一';
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER fp11_unique_category_failure
      BEFORE INSERT ON "战绩分类"
      FOR EACH ROW EXECUTE FUNCTION fp11_unique_category_failure();
    `)
    try {
      const 响应 = await request(应用)
        .post('/api/战绩/分类')
        .set('x-fp11-user', 用户.id)
        .send({ mingCheng: '数据库冲突' })
      expect(响应.status).toBe(409)
      expect(响应.body).toMatchObject({
        ti_shi: '分类名称已存在',
        cuo_wu_ma: 'ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU',
      })
    } finally {
      await 业务库.query('DROP TRIGGER IF EXISTS fp11_unique_category_failure ON "战绩分类"; DROP FUNCTION IF EXISTS fp11_unique_category_failure()')
    }
  })

  it('移档拒绝不存在、他人记录与当前不在来源分类的记录', async () => {
    const 用户 = await 建立用户('移档边界')
    const 他人 = await 建立用户('移档边界他人')
    const 初始 = await request(应用).get('/api/战绩/分类').set('x-fp11-user', 用户.id)
    const 默认分类 = 初始.body.shu_ju.moRenFenLeiId as string
    const 自定义 = await request(应用).post('/api/战绩/分类').set('x-fp11-user', 用户.id).send({ mingCheng: '边界' })
    const 源外 = await request(应用)
      .put(`/api/战绩/分类/${自定义.body.shu_ju.id}/记录/${用户.archiveIds[0]}`)
      .set('x-fp11-user', 用户.id)
      .send({ targetCategoryId: 默认分类, expectedVersion: 0 })
    expect(源外.status).toBe(409)
    expect(源外.body.ti_shi).toBe('战绩记录不属于该分类')
    const 他人记录 = await request(应用)
      .put(`/api/战绩/分类/${默认分类}/记录/${他人.archiveIds[0]}`)
      .set('x-fp11-user', 用户.id)
      .send({ targetCategoryId: 自定义.body.shu_ju.id, expectedVersion: 0 })
    expect(他人记录.status).toBe(404)
    expect(他人记录.body.ti_shi).toBe('战绩记录不存在')
    const 不存在 = await request(应用)
      .put(`/api/战绩/分类/${默认分类}/记录/${randomUUID()}`)
      .set('x-fp11-user', 用户.id)
      .send({ targetCategoryId: 自定义.body.shu_ju.id, expectedVersion: 0 })
    expect(不存在.status).toBe(404)
    expect(不存在.body.ti_shi).toBe('战绩记录不存在')
  })

  it('空分类接受完整空数组并幂等返回当前版本', async () => {
    const 用户 = await 建立用户('空排序')
    const 自定义 = await request(应用).post('/api/战绩/分类').set('x-fp11-user', 用户.id).send({ mingCheng: '空' })
    const 路径 = `/api/战绩/分类/${自定义.body.shu_ju.id}/排序`
    const 首次 = await request(应用).put(路径).set('x-fp11-user', 用户.id).send({ recordIds: [], expectedVersion: 0 })
    const 再次 = await request(应用).put(路径).set('x-fp11-user', 用户.id).send({ recordIds: [], expectedVersion: 0 })
    expect(首次.status).toBe(200)
    expect(首次.body.shu_ju).toEqual({ category_id: 自定义.body.shu_ju.id, record_ids: [], version: 0 })
    expect(再次.body.shu_ju).toEqual(首次.body.shu_ju)
  })

  it('非法版本、ID 与排序集合形状在进入事务前返回 400', async () => {
    const 用户 = await 建立用户('非法输入')
    const 初始 = await request(应用).get('/api/战绩/分类').set('x-fp11-user', 用户.id)
    const 分类ID = 初始.body.shu_ju.moRenFenLeiId as string
    for (const expectedVersion of [null, -1, 1.5, '0']) {
      const 改名 = await request(应用)
        .put(`/api/战绩/分类/${分类ID}`)
        .set('x-fp11-user', 用户.id)
        .send({ mingCheng: '合法', expectedVersion })
      expect(改名.status).toBe(400)
    }
    const 非法ID = await request(应用)
      .put(`/api/战绩/分类/${分类ID}/记录/not-a-uuid`)
      .set('x-fp11-user', 用户.id)
      .send({ targetCategoryId: 分类ID, expectedVersion: 0 })
    expect(非法ID.status).toBe(400)
    const 非法排序 = await request(应用)
      .put(`/api/战绩/分类/${分类ID}/排序`)
      .set('x-fp11-user', 用户.id)
      .send({ recordIds: null, expectedVersion: 0 })
    expect(非法排序.status).toBe(400)
    const 非法删除版本 = await request(应用)
      .delete(`/api/战绩/分类/${分类ID}`)
      .query({ expectedVersion: -1 })
      .set('x-fp11-user', 用户.id)
    expect(非法删除版本.status).toBe(400)
  })
})
