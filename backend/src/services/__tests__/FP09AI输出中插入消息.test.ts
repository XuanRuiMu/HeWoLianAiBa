import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import type { Pool, PoolClient } from 'pg'
import { Pool as 池类 } from 'pg'
import type { Server } from 'socket.io'
import { peiZhi } from '../../config'
import { AI回复调度器 } from '../AI回复调度器'
import {
  chuangJianYongHuXiaoXi,
  huoQuXiaoXiLieBiao,
  type XiaoXiXinXi,
} from '../消息'
import { yunXingAIYinQing } from '../AI引擎'

/**
 * FP-09 缺陷8「AI 分条输出中插入用户消息」竞态取证（真库 + 真实消息服务 + 假 AI 引擎）。
 *
 * 复现链（PROGRESS F16/F17/F18）：
 *  ① 旧前端自增的 客户端序号 与服务端刚给角色消息分配的序号撞号；
 *  ② ON CONFLICT DO NOTHING 命中后回查未按发送者过滤，把用户消息当重复直接返回那条角色消息
 *     —— 用户文本从未写库（「吞消息」）；
 *  ③ 焦点消息取「DB 末条 yonghu」= 上一条旧用户消息 ⇒ 上下文没变 ⇒ 重跑出同一条回复（「连发两条一样」）；
 *  ④ 旧轮次未发出的条目不被作废、作废轮次的收尾尾巴仍在落库/推送。
 *
 * 层级说明（覆盖了什么/没覆盖什么）：
 *  - 覆盖：真实 Postgres 上的 消息落库/序号分配/幂等约束/keyset 分页 + 真实 AI输入准备（角色消息序号、历史取数）
 *          + 真实调度器的轮次推进与推送，AI 引擎按桩返回（文本与本轮焦点绑定）。
 *  - 未覆盖：HTTP 路由与 socket 认领层（另在 routes/socket 单测覆盖）、真实大模型输出、浏览器端渲染。
 *
 * 库不可达时整组跳过（不伪造通过），与 表情真库.test.ts 同口径。
 * 全程跑在同一条连接、同一个外层事务里，收尾 ROLLBACK：不在现网库留一行数据。
 */

/**
 * 应用侧 数据库 单例改指向本文件那条「外层事务里」的专用连接；服务内部的
 * BEGIN/COMMIT/ROLLBACK 映射成 SAVEPOINT，整体仍可由外层事务一次回滚。
 */
vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => 跑(文本, 参数),
    connect: async () => ({
      query: async (文本: string, 参数: unknown[] = []) => 跑(文本, 参数),
      release: () => undefined,
    }),
  },
}))

const 假 = vi.hoisted(() => ({
  AI入参: [] as Array<{ yong_hu_xin_xiao_xi: string; 焦点候选: string }>,
  AI返回: (_焦点: string) => ['第一条回复：桩', '第二条回复：桩', '第三条回复：桩'],
}))

vi.mock('../AI引擎', () => ({
  yunXingAIYinQing: vi.fn(async (输入: { yong_hu_xin_xiao_xi: string }) => {
    假.AI入参.push({ yong_hu_xin_xiao_xi: 输入.yong_hu_xin_xiao_xi, 焦点候选: 输入.yong_hu_xin_xiao_xi })
    return {
      xiao_xi_lie_biao: 假.AI返回(输入.yong_hu_xin_xiao_xi),
      shi_fou_hui_fu: true,
      shi_fou_che_hui: false,
      jiang_ji_mo_shi: false,
    }
  }),
}))

vi.mock('../好感度', () => ({
  huoQuWanZhengHaoGanDu: vi.fn(async () => ({
    xin_ren_du: 1,
    qin_mi_du: 1,
    qu_wei_du: 1,
    guan_huai_du: 1,
    zong_fen: 4,
    guan_xi_jie_duan: 'reQing',
  })),
  gengXinHaoGanDu: vi.fn(async () => undefined),
}))
vi.mock('../好感度评判', () => ({
  pingPanHaoGanDuPiLiangNei: vi.fn(async () => ({
    jieGuo: {
      xin_ren_du_bian_hua: 0,
      qin_mi_du_bian_hua: 0,
      qu_wei_du_bian_hua: 0,
      guan_huai_du_bian_hua: 0,
      li_you: 'ce-shi',
    },
    xiShu: 1,
    muBiaoQuXian: 'reQing',
    lianXuWeiDaBiao: false,
  })),
}))
vi.mock('../认证', () => ({ anIdChaYongHu: vi.fn(async () => null) }))
vi.mock('../胜利失败条件', () => ({
  jianCeYongHuXiaoXiBingChuLi: vi.fn(async () => false),
  chuLiAIHuiFuHouJieShuJianCha: vi.fn(async () => false),
  chuLiYouXiJieShu: vi.fn(async () => undefined),
}))
vi.mock('../夺舍', () => ({ jiaoSeShiFouBeiDuoShe: vi.fn(async () => false) }))
vi.mock('../../utils/debug日志', () => ({
  jiLuSocketShiJian: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('../../config/AI参数策略', () => ({ gouJianJiaoSeShangXiaWen: vi.fn(() => ({})) }))
vi.mock('../TTS服务', () => ({ 尝试合成语音: vi.fn(async () => null) }))
vi.mock('../TTS文本预处理', () => ({ 转换TTS文本: vi.fn((文本: string) => 文本) }))
vi.mock('../TTS概率计算', () => ({ 计算TTS概率: vi.fn(() => ({ 是否触发: false })) }))
vi.mock('../主动多模态', () => ({ changShiZhuDongShengTu: vi.fn(async () => undefined) }))
vi.mock('../对话摘要', () => ({
  duQuDuiHuaZhaiYao: vi.fn(async () => ''),
  gouJianZhaiYaoZhuRuWenBen: vi.fn(() => ''),
  huanCunTongBuZhaiYao: vi.fn(),
  duQuTongBuZhaiYao: vi.fn(() => ''),
  shengChengBingLuoKuZhaiYao: vi.fn(async () => undefined),
}))
vi.mock('../AI视觉辅助', () => ({ meiTiZhanShiWenBen: vi.fn(() => ''), gouJianDanTiaoTuXiangKuai: vi.fn(async () => []), shiTuXiangLeiBie: vi.fn(() => false) }))
vi.mock('../语音理解', () => ({
  gouJianYuYinKeDuWenBen: vi.fn(() => ''),
  tiQuYinPinShiJian: vi.fn(() => null),
}))
vi.mock('../视频理解', () => ({ huoQuHuoJieXiShiPinMiaoShu: vi.fn(async () => ({ huaMianMiaoShu: '', zhuanXieWenBen: '' })) }))
vi.mock('../视频多模态', () => ({ gouJianShiPinKeDuWenBen: vi.fn(() => '') }))
vi.mock('../../utils/邮件告警', () => ({ faSongGaoJing: vi.fn(async () => undefined) }))

const 用户ID = randomUUID()
const 角色ID = randomUUID()
const 迁移目录 = resolve(__dirname, '..', '..', '..', 'database', 'migrations')

function 取连接串(): string {
  const 显式 = (process.env.TEST_DATABASE_URL ?? '').trim()
  if (显式 !== '') return 显式.includes('@postgres:') ? 显式.replace('@postgres:', '@127.0.0.1:') : 显式
  const 运行值 = String(peiZhi.shuJuKuLianJie ?? '')
  if (运行值 === '') return ''
  return 运行值.includes('@postgres:') ? 运行值.replace('@postgres:', '@127.0.0.1:') : 运行值
}

let 池: Pool | null = null
let 客户端: PoolClient | null = null
/** 嵌套事务仿真：服务内部的 BEGIN/COMMIT/ROLLBACK 映射到 SAVEPOINT，外层事务始终可整体回滚 */
let 保存点栈: string[] = []
let 保存点序号 = 0

/** 连不上库时整组跳过（不伪造通过），与 表情真库.test.ts 同口径 */
async function 真库可达(): Promise<boolean> {
  const 串 = 取连接串()
  if (串 === '') return false
  const 探测池 = new 池类({ connectionString: 串, connectionTimeoutMillis: 3000 })
  try {
    await 探测池.query('SELECT 1')
    return true
  } catch {
    return false
  } finally {
    await 探测池.end().catch(() => undefined)
  }
}
const 有真库 = await 真库可达()

async function 跑(文本: string, 参数: unknown[] = []): Promise<{ rows: Record<string, unknown>[] }> {
  const 头 = 文本.trim().toUpperCase()
  const 客户端句柄 = 客户端
  if (!客户端句柄) throw new Error('FP-09 真库事务尚未建立')
  if (头 === 'BEGIN') {
    保存点序号 += 1
    const 名 = `fp09_sp_${保存点序号}`
    保存点栈.push(名)
    await 客户端句柄.query(`SAVEPOINT ${名}`)
    return { rows: [] }
  }
  if (头 === 'COMMIT') {
    const 名 = 保存点栈.pop()
    if (名) await 客户端句柄.query(`RELEASE SAVEPOINT ${名}`)
    return { rows: [] }
  }
  if (头 === 'ROLLBACK') {
    const 名 = 保存点栈.pop()
    if (名) await 客户端句柄.query(`ROLLBACK TO SAVEPOINT ${名}`)
    return { rows: [] }
  }
  return (await 客户端句柄.query(文本, 参数)) as unknown as { rows: Record<string, unknown>[] }
}

beforeAll(async () => {
  if (!有真库) return
  池 = new 池类({ connectionString: 取连接串(), connectionTimeoutMillis: 3000, max: 2 })
  客户端 = await 池.connect()
  await 客户端.query('BEGIN')
  await 客户端.query(
    `INSERT INTO "用户" ("ID","手机号","用户名","昵称","性别","管理员","测试")
     VALUES ($1,$2,$3,'FP09探针','nv',false,true)`,
    [用户ID, `fp09-${randomUUID()}`.slice(0, 20), `fp09_${randomUUID()}`.slice(0, 20)],
  )
  await 客户端.query(
    `INSERT INTO "角色" ("ID","用户ID","名字","性别","性格","IE类型","热身类型","封存","可继续聊天","回复延迟毫秒")
     VALUES ($1,$2,'FP09探针角色','nv','测试用','I','慢热',false,true,2000)`,
    [角色ID, 用户ID],
  )
  const 迁移文件 = resolve(迁移目录, '032_FP09消息幂等键.sql')
  if (existsSync(迁移文件)) await 客户端.query(readFileSync(迁移文件, 'utf-8'))
}, 60000)

afterAll(async () => {
  if (客户端) await 客户端.query('ROLLBACK').catch(() => undefined)
  客户端?.release()
  if (池) await 池.end().catch(() => undefined)
})

interface 推送记录 {
  事件: string
  数据: Record<string, unknown>
}

function 建假Io(推送: 推送记录[]): Server {
  return {
    to: () => ({
      emit: (事件: string, 数据: unknown) => {
        推送.push({ 事件, 数据: 数据 as Record<string, unknown> })
      },
    }),
  } as unknown as Server
}

function 角色回复推送(推送: 推送记录[]): Array<{ 轮次?: number; 消息列表: XiaoXiXinXi[]; 驱动消息ID?: string }> {
  return 推送
    .filter((记) => 记.事件 === '角色回复')
    .map((记) => 记.数据 as unknown as { 轮次?: number; 消息列表: XiaoXiXinXi[]; 驱动消息ID?: string })
    .filter((记) => Array.isArray(记.消息列表) && 记.消息列表.length > 0)
}

async function 等待(条件: () => boolean | Promise<boolean>, 最多毫秒: number): Promise<boolean> {
  const 起点 = Date.now()
  for (;;) {
    if (await 条件()) return true
    if (Date.now() - 起点 > 最多毫秒) return false
    await new Promise((解决) => setTimeout(解决, 20))
  }
}

async function 查内容(发送者: string): Promise<string[]> {
  const { rows } = await 跑(
    `SELECT "内容" FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2 AND "发送者" = $3 ORDER BY "客户端序号"`,
    [用户ID, 角色ID, 发送者],
  )
  return rows.map((行) => String(行.内容))
}

describe.skipIf(!有真库)('FP-09 真库竞态：AI 分条输出中插入用户消息', () => {
  it('插入的消息不被吞、旧轮次剩余条目 0 送达、无同文本角色消息、新回复在 1~3s 内基于最新上下文', async () => {
    假.AI入参.length = 0
    假.AI返回 = (焦点: string) => [`第一条回复：${焦点}`, '第二条桩A', '第三条桩B']
    const 推送: 推送记录[] = []
    const 调度器 = new AI回复调度器(角色ID, 用户ID, 'I', 建假Io(推送), 200)

    // ① 用户第一条消息：旧客户端形状（自带客户端序号 1，无幂等键）
    const 第一条 = await chuangJianYongHuXiaoXi({
      yong_hu_id: 用户ID,
      jiao_se_id: 角色ID,
      nei_rong: '原定第一句',
      ke_hu_duan_xu_hao: 1,
    })
    expect(第一条.cheng_gong, JSON.stringify(第一条)).toBe(true)
    const 第一条ID = 第一条.xiao_xi?.id ?? ''

    // ② 第一轮：AI 开始分条输出（条间间隔 1.5~4.5s，留出插入窗口）
    void 调度器.处理用户消息(第一条ID)
    expect(
      await 等待(() => 角色回复推送(推送).length >= 1, 20000),
      '第一轮首条角色消息未在 20s 内送达',
    ).toBe(true)
    const 首条推送 = 角色回复推送(推送)[0]!
    const 轮次1 = 首条推送.轮次
    const 角色首条 = 首条推送.消息列表[0]!
    // 撞号前提：服务端给这条角色消息分配的序号，正是旧前端此刻会算出的下一个序号
    expect(角色首条.ke_hu_duan_xu_hao).toBe(2)

    // ③ 用户在「即将发出第二条」之前插入新消息：旧前端基点只在收到角色回复后才抬，故仍算出 2
    const 插入时刻 = Date.now()
    const 插入 = await chuangJianYongHuXiaoXi({
      yong_hu_id: 用户ID,
      jiao_se_id: 角色ID,
      nei_rong: '我插入的一句',
      ke_hu_duan_xu_hao: 2,
    })

    // ① 吞消息断言：返回体必须是刚插入的这条用户消息，且真的能在库里按 yonghu 查回
    expect(插入.cheng_gong, JSON.stringify(插入)).toBe(true)
    expect(插入.xiao_xi?.fa_song_zhe_lei_xing, '返回体被角色消息冒充 ⇒ 用户文本未写库').toBe('yonghu')
    expect(插入.xiao_xi?.nei_rong).toBe('我插入的一句')
    expect(await 查内容('yonghu'), '插入的用户消息必须 100% 落库').toContain('我插入的一句')

    // ④ 服务端落库触发链驱动新一轮（与 socket/聊天.ts luoKuChuFaJiaoSeTiaoDuQi 同一入口语义）
    调度器.设置回复延迟毫秒(1500)
    void 调度器.处理用户消息(插入.xiao_xi?.id ?? '')
    const 新轮次到达 = await 等待(
      () => 角色回复推送(推送).some((记) => 记.轮次 !== 轮次1),
      20000,
    )
    expect(新轮次到达, '新一轮未在 20s 内产出回复').toBe(true)
    const 新轮次推送 = 角色回复推送(推送).filter((记) => 记.轮次 !== 轮次1)
    const 新轮次条数 = 新轮次推送.reduce((总, 记) => 总 + 记.消息列表.length, 0)
    expect(新轮次条数).toBeGreaterThan(0)

    // ⑤ 旧轮次剩余条目：以轮次令牌计量「送达数」——作废后该轮次不得再多推一条
    const 旧轮次送达 = 角色回复推送(推送)
      .filter((记) => 记.轮次 === 轮次1)
      .reduce((总, 记) => 总 + 记.消息列表.length, 0)
    expect(旧轮次送达, '旧轮次在插话后仍继续投递条目').toBe(1)
    const 角色内容 = await 查内容('jiaose')
    // 首条已落库并推送（FP-04「已落库必已推送」不变式），只此一条
    const 轮次1文本 = 角色首条.nei_rong
    expect(角色内容.filter((内) => 内 === 轮次1文本).length, '作废轮次那条文本被重发').toBe(1)

    // ⑥ 无重复内容：不得出现两条内容相同的角色消息
    expect(new Set(角色内容).size, `角色消息出现同文本重复：${JSON.stringify(角色内容)}`).toBe(
      角色内容.length,
    )

    // ⑦ 新回复的上下文必须是刚插入的那条（焦点消息口径）
    const 本轮入参 = 假.AI入参[假.AI入参.length - 1]!
    expect(本轮入参.yong_hu_xin_xiao_xi, '焦点消息仍是旧的那条 ⇒ F18 未修').toContain('我插入的一句')
    expect(新轮次推送[0]!.消息列表[0]!.nei_rong).toContain('我插入的一句')

    // ⑧ 轮次令牌与驱动消息 ID 进入角色回复 payload
    expect(typeof 轮次1, '角色回复 payload 缺 轮次').toBe('number')
    expect(新轮次推送[0]!.轮次).toBeGreaterThan(轮次1 ?? 0)
    expect(新轮次推送[0]!.驱动消息ID).toBe(插入.xiao_xi?.id)

    // ⑨ 1~3s 窗口（回复延迟由角色配置决定，本用例设为 1500ms）
    const 送达时刻 = Date.now()
    expect(送达时刻 - 插入时刻).toBeGreaterThanOrEqual(1000)
    expect(送达时刻 - 插入时刻).toBeLessThan(3000 + 1500)

    调度器.重置()
  }, 90000)

  it('被作废轮次已落库文本不得在新一轮重复（内容级去重兜底，与焦点无关）', async () => {
    const 前一条角色数 = (await 查内容('jiaose')).length
    const 推送: 推送记录[] = []
    const 调度器 = new AI回复调度器(角色ID, 用户ID, 'I', 建假Io(推送), 100)
    假.AI返回 = () => ['固定同文本', '另一条文本']
    const 用户消息 = await chuangJianYongHuXiaoXi({
      yong_hu_id: 用户ID,
      jiao_se_id: 角色ID,
      nei_rong: '触发内容甲',
    })
    void 调度器.处理用户消息(用户消息.xiao_xi?.id ?? '')
    expect(await 等待(() => 角色回复推送(推送).length >= 1, 20000)).toBe(true)
    const 轮次甲 = 角色回复推送(推送)[0]!.轮次
    调度器.设置回复延迟毫秒(100)
    const 用户消息乙 = await chuangJianYongHuXiaoXi({
      yong_hu_id: 用户ID,
      jiao_se_id: 角色ID,
      nei_rong: '触发内容乙',
    })
    void 调度器.处理用户消息(用户消息乙.xiao_xi?.id ?? '')
    expect(
      await 等待(() => 角色回复推送(推送).some((记) => 记.轮次 !== 轮次甲), 20000),
    ).toBe(true)
    const 角色内容 = await 查内容('jiaose')
    expect(角色内容.filter((内) => 内 === '固定同文本').length, '同文本角色消息被写了两条').toBe(1)
    expect(角色内容.length).toBeGreaterThan(前一条角色数)
    调度器.重置()
  }, 90000)
})

describe.skipIf(!有真库)('FP-09 真库：幂等键与序号语义', () => {
  it('同一幂等键重复提交只落一条，且回查按发送者区分不冒充角色消息', async () => {
    const 键 = randomUUID()
    const 首次 = await chuangJianYongHuXiaoXi({
      yong_hu_id: 用户ID,
      jiao_se_id: 角色ID,
      nei_rong: '幂等重放内容',
      mi_deng_jian: 键,
    } as never)
    expect(首次.cheng_gong).toBe(true)
    // 让同会话存在一条角色消息，回查不得命中它
    await 跑(
      `INSERT INTO "消息" ("用户ID","角色ID","内容","发送者","类型","已读","客户端序号")
       VALUES ($1,$2,'一条角色消息','jiaose','wenben',true,
               (SELECT COALESCE(MAX("客户端序号"),0)+1 FROM "消息" WHERE "用户ID" = $1 AND "角色ID" = $2))`,
      [用户ID, 角色ID],
    )
    const 重放 = await chuangJianYongHuXiaoXi({
      yong_hu_id: 用户ID,
      jiao_se_id: 角色ID,
      nei_rong: '幂等重放内容',
      mi_deng_jian: 键,
    } as never)
    expect(重放.cheng_gong).toBe(true)
    expect(重放.xiao_xi?.id).toBe(首次.xiao_xi?.id)
    expect(重放.xiao_xi?.fa_song_zhe_lei_xing).toBe('yonghu')
    const { rows } = await 跑(
      `SELECT COUNT(*)::int AS 数 FROM "消息" WHERE "用户ID"=$1 AND "角色ID"=$2 AND "内容"='幂等重放内容'`,
      [用户ID, 角色ID],
    )
    expect(rows[0]!.数).toBe(1)
  })

  it('非 UUID 幂等键与旧客户端序号均优雅降级：不 500、不丢消息', async () => {
    const 结果 = await chuangJianYongHuXiaoXi({
      yong_hu_id: 用户ID,
      jiao_se_id: 角色ID,
      nei_rong: '脏幂等键内容',
      mi_deng_jian: 'not-a-uuid',
      ke_hu_duan_xu_hao: 1,
    } as never)
    expect(结果.cheng_gong).toBe(true)
    expect(结果.xiao_xi?.fa_song_zhe_lei_xing).toBe('yonghu')
    expect(await 查内容('yonghu')).toContain('脏幂等键内容')
  })

  it('服务端权威序号在会话内严格递增，keyset 游标分页与创建时间序一致', async () => {
    const 文本列表 = ['游标探针一', '游标探针二', '游标探针三']
    for (const 文本 of 文本列表) {
      const 结果 = await chuangJianYongHuXiaoXi({
        yong_hu_id: 用户ID,
        jiao_se_id: 角色ID,
        nei_rong: 文本,
      })
      expect(结果.cheng_gong).toBe(true)
      const 序号 = 结果.xiao_xi?.ke_hu_duan_xu_hao
      expect(typeof 序号).toBe('number')
    }
    const { rows } = await 跑(
      `SELECT "客户端序号" AS 序号, "创建时间" AS 时间 FROM "消息"
        WHERE "用户ID"=$1 AND "角色ID"=$2 AND "客户端序号" IS NOT NULL
        ORDER BY "客户端序号" ASC`,
      [用户ID, 角色ID],
    )
    const 序号列表 = rows.map((行) => Number(行.序号))
    expect(序号列表).toEqual([...new Set(序号列表)].sort((a, b) => a - b))
    const 时间列表 = rows.map((行) => new Date(String(行.时间)).getTime())
    expect([...时间列表].sort((a, b) => a - b)).toEqual(时间列表)

    // keyset：以「次旧」那条为游标，只应取到比它更旧的一页（这里恰好只剩最旧一条），
    // 且游标行自身不得再次出现——序号语义变更后分页边界仍精确。
    const 全量 = await huoQuXiaoXiLieBiao({ yong_hu_id: 用户ID, jiao_se_id: 角色ID, mei_ye_tiao_shu: 50 })
    expect(全量.lie_biao.length).toBeGreaterThanOrEqual(3)
    const 序号序列 = 全量.lie_biao.map((项) => 项.ke_hu_duan_xu_hao ?? -1)
    expect([...序号序列].sort((a, b) => b - a)).toEqual(序号序列)
    const 最旧 = 全量.lie_biao[全量.lie_biao.length - 1]!
    const 游标行 = 全量.lie_biao[全量.lie_biao.length - 2]!
    const 一页 = await huoQuXiaoXiLieBiao({
      yong_hu_id: 用户ID,
      jiao_se_id: 角色ID,
      mei_ye_tiao_shu: 50,
      you_biao_xu_hao: 游标行.ke_hu_duan_xu_hao ?? null,
      you_biao_shi_jian_chuo: 游标行.shi_jian_chuo,
      you_biao_id: 游标行.id,
    })
    expect(一页.lie_biao.map((项) => 项.id)).toEqual([最旧.id])
    expect(一页.hai_you_geng_duo).toBe(false)
    expect(全量.lie_biao.map((项) => 项.ke_hu_duan_xu_hao).filter((值) => 值 == null)).toEqual([])
  })
})

describe.skipIf(!有真库)('FP-09 迁移 032', () => {
  it('新增幂等键唯一约束、保留序号唯一约束（通话去重依赖），且存量行不破坏', async () => {
    const 文件 = resolve(迁移目录, '032_FP09消息幂等键.sql')
    expect(existsSync(文件), '缺少迁移 032：幂等键唯一约束未落地').toBe(true)
    const 语句文本 = readFileSync(文件, 'utf-8')
    expect(语句文本).not.toMatch(/DROP\s+CONSTRAINT\s+"?消息_用户ID_角色ID_客户端序号_key/i)

    const 约束 = await 跑(
      `SELECT conname, pg_get_constraintdef(oid) AS 定义 FROM pg_constraint
        WHERE conrelid = '消息'::regclass AND contype = 'u' ORDER BY conname`,
    )
    const 名单 = 约束.rows.map((行) => String(行.conname))
    expect(名单).toContain('消息_用户ID_角色ID_幂等键_key')
    expect(名单).toContain('消息_用户ID_角色ID_客户端序号_key')

    // 幂等：同一事务内再跑一次不报错、不改变结论
    await 跑(语句文本)
    const 再查 = await 跑(
      `SELECT conname FROM pg_constraint WHERE conrelid='消息'::regclass AND contype='u'`,
    )
    expect(再查.rows.map((行) => String(行.conname)).sort()).toEqual(名单.sort())

    const 存量 = await 跑(
      `SELECT COUNT(*)::int AS 数 FROM "消息" WHERE "用户ID"=$1 AND "角色ID"=$2`,
      [用户ID, 角色ID],
    )
    expect(存量.rows[0]!.数).toBeGreaterThan(0)
    const 带序号 = await 跑(
      `SELECT COUNT(*)::int AS 数 FROM "消息" WHERE "用户ID"=$1 AND "角色ID"=$2 AND "客户端序号" IS NOT NULL`,
      [用户ID, 角色ID],
    )
    expect(带序号.rows[0]!.数).toBe(存量.rows[0]!.数)
  })
})
