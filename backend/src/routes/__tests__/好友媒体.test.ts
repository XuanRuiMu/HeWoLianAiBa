import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import express from 'express'
import request from 'supertest'
import { readFileSync, readdirSync } from 'node:fs'
import { relative, resolve } from 'node:path'

const 用户甲 = '11111111-1111-4111-8111-111111111111'
const 用户乙 = '22222222-2222-4222-8222-222222222222'
const 用户丙 = '33333333-3333-4333-8333-333333333333'

/**
 * FP-21 好友聊天媒体通路（图片/文件收发）的后端行为契约。
 *
 * 这一层刻意**不 mock 存储层**：上传直接跑真实的 services/媒体存储.ts::liuShiBaoCunMeiTi
 * （落盘目录改指系统临时目录，查毒关闭、视觉审核用可控替身），于是「大小/MIME/魔数/审核」
 * 这四道闸是同一份实现同时在 AI 链路与好友链路上生效的事实，而不是测试替身里的假设。
 * 只有 Postgres 是内存替身：它按本文件声明的语句逐条应答，未声明的语句直接抛错，
 * 以免「测试跑通、路由发的是另一串 SQL」。
 *
 * 媒体可读谓词（MEI_TI_KE_DU_YU_JU）的 **SQL 语义**（谁能读、解除好友/撤回是否即时失效）
 * 由 src/routes/__tests__/好友媒体真库.test.ts 在真库上断言；本文件断言的是
 * 「谓词一旦判不可读 ⇒ 出参与下载链路一律 403 且不留内容」这半边组合，两者不重叠。
 */

const 临时根 = fs.mkdtempSync(path.join(os.tmpdir(), 'fp21-haoyou-'))
process.env.BING_DU_SAO_MIAO_QI_YONG = 'false'

import { SHEN_HE_WEI_GUI_LEI_BIE, YUN_XU_XIAO_XI_LEI_XING, MEI_TI_PEI_ZHI } from '../../config/媒体配置'

/**
 * 存储根目录改指系统临时目录：绝不允许本用例往项目 uploads/ 里写一个字节。
 * 用「改对象属性」而不是 vi.mock 整个配置模块——媒体配置 被 routes/好友.ts 静态引入，
 * vi.mock 工厂会在本文件顶层常量初始化之前执行（vitest 把 mock 提升到顶部），改属性则
 * 走的是 媒体存储 每次调用现读 MEI_TI_PEI_ZHI.cunChuGenMuLu 的活绑定。
 * vitest 每个测试文件独立 worker，本改动不外溢到其它用例。
 */
;(MEI_TI_PEI_ZHI as { cunChuGenMuLu: string }).cunChuGenMuLu = 临时根

interface 假库句柄 {
  好友关系: Map<string, 'accepted' | 'rejected' | 'pending'>
  媒体行: Array<Record<string, unknown>>
  消息行: Array<Record<string, unknown>>
  可读键: Set<string>
  谓词抛错: boolean
  指定语句抛错: string | null
}

const 库: 假库句柄 = {
  好友关系: new Map(),
  媒体行: [],
  消息行: [],
  可读键: new Set(),
  谓词抛错: false,
  指定语句抛错: null,
}
const 语句日志: Array<{ 文本: string; 参数: unknown[] }> = []

function 关系键(a: string, b: string): string {
  return [a, b].sort().join('|')
}

function 物理文件数(): number {
  let 计数 = 0
  for (const 项 of readdirSync(临时根)) {
    const 路径 = path.join(临时根, 项)
    if (项 === 'tmp' || !fs.statSync(路径).isDirectory()) continue
    计数 += fs.readdirSync(路径).length
  }
  return 计数
}

function 临时残留数(): number {
  const 目录 = path.join(临时根, 'tmp')
  return fs.existsSync(目录) ? fs.readdirSync(目录).length : 0
}

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => {
      语句日志.push({ 文本, 参数 })
      const 是 = (片段: string) => 文本.includes(片段)
      if (库.指定语句抛错 && 是(库.指定语句抛错)) throw new Error('假库：连接中断（10.0.0.5:5432）')

      if (是('SELECT 1 FROM "好友申请"')) {
        const [a, b] = 参数 as [string, string]
        const 状态 = 库.好友关系.get(关系键(a, b))
        return { rows: 状态 === 'accepted' ? [{ '?column?': 1 }] : [], rowCount: 状态 === 'accepted' ? 1 : 0 }
      }
      if (是('INSERT INTO "媒体文件"')) {
        const ID = crypto.randomUUID()
        库.媒体行.push({
          ID,
          SHA256: 参数[0],
          原始文件名: 参数[1],
          MIME: 参数[2],
          大小字节: 参数[3],
          类别: 参数[4],
          上传者ID: 参数[5],
        })
        return { rows: [{ ID }], rowCount: 1 }
      }
      if (是('SELECT "上传者ID", "SHA256", "MIME", "类别" FROM "媒体文件"')) {
        const 行 = 库.媒体行.filter((m) => m['ID'] === 参数[0]).slice(0, 1)
        return { rows: 行, rowCount: 行.length }
      }
      if (是('SELECT "SHA256", "MIME", "类别" FROM "媒体文件"')) {
        const 行 = 库.媒体行.filter((m) => m['ID'] === 参数[0]).slice(0, 1)
        return { rows: 行, rowCount: 行.length }
      }
      if (是('SELECT "MIME", "原始文件名", "类别" FROM "媒体文件"')) {
        const 行 = 库.媒体行.filter((m) => String(m['SHA256']) === 参数[0]).slice(0, 1)
        return { rows: 行, rowCount: 行.length }
      }
      if (是('SELECT "ID", "SHA256", "类别" FROM "媒体文件" WHERE "ID" = ANY')) {
        // FP-21：出参块引用的图片媒体按页批量补查（services/消息.ts::gouKuaiShangXiaWen）。
        // 本替身按声明逐条应答，未声明的语句直接抛错 —— 这正是本文件的设计意图。
        const 名单 = ((参数[0] ?? []) as unknown[]).map((x) => String(x))
        const 行 = 库.媒体行
          .filter((m) => 名单.includes(String(m['ID'])))
          .map((m) => ({ ID: m['ID'], SHA256: m['SHA256'], 类别: m['类别'] }))
        return { rows: 行, rowCount: 行.length }
      }
      if (是('FROM "媒体文件" mf')) {
        // 媒体可读谓词：真 SQL 的命中结果在本文件里由 可读键 显式给出（见文件头说明）
        if (库.谓词抛错) throw new Error('假库：判定查询被打断')
        const [sha, 读者] = 参数 as [string, string]
        const 命中 = 库.可读键.has(`${sha}|${读者}`)
        return { rows: 命中 ? [{ '?column?': 1 }] : [], rowCount: 命中 ? 1 : 0 }
      }
      if (是('FROM "好友消息" m')) {
        const [a, b] = 参数 as [string, string]
        const 行 = 库.消息行
          .filter((x) => (x['发送者ID'] === a && x['接收者ID'] === b) || (x['发送者ID'] === b && x['接收者ID'] === a))
          .map((x) => {
            const 媒体 = 库.媒体行.find((m) => m['ID'] === x['媒体ID']) || {}
            return { ...x, ...媒体 }
          })
          .sort((p, q) => String(q['创建时间']).localeCompare(String(p['创建时间'])))
          .slice(0, Number(参数[2]))
        return { rows: 行, rowCount: 行.length }
      }
      if (是('INSERT INTO "好友消息"')) {
        const ID = crypto.randomUUID()
        const 创建时间 = new Date(Date.now() - 库.消息行.length * 1000)
        库.消息行.push({
          ID,
          发送者ID: 参数[0],
          接收者ID: 参数[1],
          内容: 参数[2],
          类型: 参数[3],
          媒体ID: 参数[4],
          // FP-21（迁移 036）：$6 是 JSON.stringify 后的块数组（真库由 ::jsonb 还原），
          // 这里同口径解回数组，免得替身把字符串当成块数组交给出参投影
          内容块: typeof 参数[5] === 'string' ? JSON.parse(参数[5]) : (参数[5] ?? null),
          被引用消息ID: 参数[6] ?? null,
          已读: false,
          撤回: false,
          创建时间,
        })
        return { rows: [{ ID, 创建时间 }], rowCount: 1 }
      }
      if (是('SELECT "发送者ID", "创建时间" FROM "好友消息"')) {
        const 行 = 库.消息行.filter((x) => x['ID'] === 参数[0]).slice(0, 1)
        return { rows: 行, rowCount: 行.length }
      }
      if (是('UPDATE "好友消息" SET "撤回" = TRUE')) {
        const 行 = 库.消息行.find((x) => x['ID'] === 参数[0])
        if (行) 行['撤回'] = true
        return { rows: [], rowCount: 行_有(行) }
      }
      if (是('UPDATE "好友消息" SET "已读" = TRUE')) {
        return { rows: [], rowCount: 0 }
      }
      throw new Error(`测试替身未覆盖的语句：${文本}`)
    },
  },
}))

function 行_有(行: Record<string, unknown> | undefined): number {
  return 行 ? 1 : 0
}

let 视觉审核结果: { wei_gui: boolean; lei_xing: string; li_you: string } = {
  wei_gui: false,
  lei_xing: '',
  li_you: '',
}

vi.mock('../../services/DeepSeek视觉审核', () => ({
  shenHeTuPianAnQuan: async () => 视觉审核结果,
}))

vi.mock('../../services/安全审核', () => ({
  shenHeNeiRongAnQuan: async () => ({ wei_gui: false, lei_xing: '', li_you: '' }),
}))

vi.mock('../../services/通知', () => ({
  chuangJianTongZhi: async () => undefined,
}))

vi.mock('../../services/账号封禁', () => ({
  chaXunZhangHaoFengJin: vi.fn(async () => ({ beiFengJin: false })),
  jiLuZhangHaoWeiGui: vi.fn(async () => undefined),
}))

vi.mock('../../services/IP封禁', () => ({ 获取IP: () => '127.0.0.1' }))

vi.mock('../../redis', () => ({
  redis: {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 1,
    incr: async () => 1,
    expire: async () => 1,
  },
}))

vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../middleware/限流', () => ({
  liaoTianXianLiu: (_q: unknown, _r: unknown, 下一项: () => void) => 下一项(),
}))

import 好友路由 from '../好友'
import 媒体路由 from '../媒体'
import { chaXunZhangHaoFengJin, jiLuZhangHaoWeiGui } from '../../services/账号封禁'
import { huoQuFanYi, fanYi } from '../../config/translations'
import { MEI_TI_KE_DU_YU_JU, yanZhengQianMing } from '../../services/媒体存储'

let 当前用户: string | null = 用户甲

const 应用 = express()
应用.use(express.json())
应用.use((qingQiu, _xiangYing, xiaYiBu) => {
  // 路由段是中文，supertest 发的是 percent-encoded 路径；与 routes/__tests__/表情.test.ts 同口径解回原文
  qingQiu.url = decodeURI(qingQiu.url)
  xiaYiBu()
})
应用.use((qingQiu, _xiangYing, 下一项) => {
  if (当前用户) {
    ;(qingQiu as unknown as { yong_hu: { yongHuId: string } }).yong_hu = { yongHuId: 当前用户 }
  }
  下一项()
})
应用.use('/api/好友', 好友路由)
应用.use('/api/媒体', 媒体路由)

/** 统一给请求路径做 percent 编码（路径段含中文），其余行为与 supertest 一致 */
function 请(服务端: express.Express) {
  const 实例 = request(服务端)
  const 包 =
    (方法: 'get' | 'post' | 'put') =>
    (路径: string) =>
      (实例[方法] as (子路径: string) => ReturnType<typeof request>)(encodeURI(路径))
  return { get: 包('get'), post: 包('post'), put: 包('put') }
}

function PNG(正文: string): Buffer {
  const 头 = Buffer.alloc(24)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(头, 0)
  头.writeUInt32BE(64, 16)
  头.writeUInt32BE(64, 20)
  return Buffer.concat([头, Buffer.from(正文, 'utf8')])
}

function 上传(接收者: string, 类别: string, 文件: Buffer, 文件名: string, MIME: string) {
  return 请(应用)
    .post('/api/好友/媒体')
    .query({ jieShouZheId: 接收者, leiBie: 类别 })
    .attach('file', 文件, { filename: 文件名, contentType: MIME })
}

function 可读集合() {
  // 上传成功后该媒体对上传者本人可读（规则 1）；被好友消息引用且关系仍 accepted 时对双方可读（规则 2）。
  // 这里按「当前库里到底成不成立」重算，模拟的是真库谓词的命中结果，不参与任何路由逻辑。
  库.可读键.clear()
  for (const 媒体 of 库.媒体行) 库.可读键.add(`${媒体['SHA256']}|${媒体['上传者ID']}`)
  for (const 消息 of 库.消息行) {
    if (消息['撤回'] === true || !消息['媒体ID']) continue
    const 媒体 = 库.媒体行.find((m) => m['ID'] === 消息['媒体ID'])
    if (!媒体) continue
    if (库.好友关系.get(关系键(String(消息['发送者ID']), String(消息['接收者ID']))) !== 'accepted') continue
    库.可读键.add(`${媒体['SHA256']}|${消息['发送者ID']}`)
    库.可读键.add(`${媒体['SHA256']}|${消息['接收者ID']}`)
  }
}

function 取语句(片段: string) {
  return 语句日志.filter((项) => 项.文本.includes(片段))
}

function 清空临时目录(): void {
  for (const 项 of readdirSync(临时根)) {
    fs.rmSync(path.join(临时根, 项), { recursive: true, force: true })
  }
  fs.mkdirSync(path.join(临时根, 'tmp'), { recursive: true })
}

beforeEach(() => {
  vi.clearAllMocks()
  清空临时目录()
  vi.mocked(chaXunZhangHaoFengJin).mockResolvedValue({ beiFengJin: false } as never)
  视觉审核结果 = { wei_gui: false, lei_xing: '', li_you: '' }
  语句日志.length = 0
  当前用户 = 用户甲
  库.好友关系 = new Map([[关系键(用户甲, 用户乙), 'accepted']])
  库.媒体行 = []
  库.消息行 = []
  库.可读键 = new Set()
  库.谓词抛错 = false
  库.指定语句抛错 = null
})

afterAll(() => {
  fs.rmSync(临时根, { recursive: true, force: true })
})

describe('FP-21 好友媒体上传：校验次序恒在读取请求体之前', () => {
  it('未认证 401，且一条 SQL 都不发、一个字节都不解析', async () => {
    当前用户 = null
    const 响应 = await 上传(用户乙, 'tupian', PNG('x'), 'x.png', 'image/png')
    expect(响应.status).toBe(401)
    expect(语句日志).toHaveLength(0)
    expect(库.媒体行).toHaveLength(0)
    expect(物理文件数()).toBe(0)
  })

  it('账号封禁 403 优先于好友关系判定（封禁者连关系都不必查）', async () => {
    vi.mocked(chaXunZhangHaoFengJin).mockResolvedValue({ beiFengJin: true } as never)
    const 响应 = await 上传(用户乙, 'tupian', PNG('x'), 'x.png', 'image/png')
    expect(响应.status).toBe(403)
    expect(响应.body.ti_shi).toBe(huoQuFanYi('anQuan', 'zhangHaoYiBeiFengJin'))
    expect(取语句('FROM "好友申请"')).toHaveLength(0)
    expect(库.媒体行).toHaveLength(0)
  })

  it('类别不在好友上传白名单 400（yuyin/biaoqingshu/乱码一律拒），且不进库', async () => {
    for (const 类别 of ['yuyin', 'biaoqingshu', 'TUPIAN', '', "tupian'; DROP TABLE"]) {
      const 响应 = await 上传(用户乙, 类别, PNG('x'), 'x.png', 'image/png')
      expect(响应.status, 类别).toBe(400)
      expect(响应.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiLeiXingFeiFa'))
    }
    expect(库.媒体行).toHaveLength(0)
    expect(物理文件数()).toBe(0)
  })

  it('接收者非 UUID / 是自己 一律 400，不查关系不进库', async () => {
    const 非UUID = await 上传('他人会话编号-不是uuid', 'tupian', PNG('x'), 'x.png', 'image/png')
    expect(非UUID.status).toBe(400)
    const 自己 = await 上传(用户甲, 'tupian', PNG('x'), 'x.png', 'image/png')
    expect(自己.status).toBe(400)
    expect(自己.body.ti_shi).toBe(huoQuFanYi('haoYou', 'buNengTianJiaZiJi'))
    expect(取语句('FROM "好友申请"')).toHaveLength(0)
    expect(库.媒体行).toHaveLength(0)
  })

  it('非好友上传 403 且库里零新增（不是只断状态码）', async () => {
    当前用户 = 用户丙
    const 响应 = await 上传(用户甲, 'tupian', PNG('x'), 'x.png', 'image/png')
    expect(响应.status).toBe(403)
    expect(响应.body.ti_shi).toBe(huoQuFanYi('haoYou', 'feiHaoYou'))
    expect(库.媒体行).toHaveLength(0)
    expect(库.消息行).toHaveLength(0)
    expect(物理文件数()).toBe(0)
    expect(临时残留数()).toBe(0)
    expect(取语句('INSERT INTO "媒体文件"')).toHaveLength(0)
  })

  it('解除好友后同一具上传立即回到 403（关系是每次请求现查，不缓存）', async () => {
    库.好友关系.set(关系键(用户甲, 用户乙), 'rejected')
    const 响应 = await 上传(用户乙, 'tupian', PNG('x'), 'x.png', 'image/png')
    expect(响应.status).toBe(403)
    expect(库.媒体行).toHaveLength(0)
  })

  it('好友上传成功：走唯一存储入口、回绑定读者的签名地址、库里落一条媒体行', async () => {
    const 内容 = PNG('fp21-tu-pian-ji-he')
    const 响应 = await 上传(用户乙, 'tupian', 内容, '我方狗头.png', 'image/png')
    expect(响应.status).toBe(200)
    const 数据 = 响应.body.shu_ju
    expect(数据.mediaId).toMatch(/^[0-9a-f-]{36}$/)
    expect(数据.sha256).toBe(crypto.createHash('sha256').update(内容).digest('hex'))
    expect(数据.leiBie).toBe('tupian')
    expect(数据.yuanShiWenJianMing).toBe('我方狗头.png')
    expect(数据.daXiao).toBe(内容.length)
    // 地址必须是被签的那个读者自己（u 进 HMAC），且形态是 /api/媒体/<sha>
    const 查询 = new URL(数据.mei_ti_url as string, 'http://x').searchParams
    expect(数据.mei_ti_url).toMatch(/^\/api\/媒体\/[0-9a-f]{64}\?/)
    expect(查询.get('u')).toBe(用户甲)
    expect(查询.get('t')).toBeTruthy()
    expect(库.媒体行).toHaveLength(1)
    expect(库.媒体行[0]['上传者ID']).toBe(用户甲)
    expect(库.媒体行[0]['类别']).toBe('tupian')
    expect(物理文件数()).toBe(1)
    expect(临时残留数()).toBe(0)
  })
})

describe('FP-21 好友媒体上传：大小/MIME/魔数/审核四道闸与 AI 链路同一实现', () => {
  it('超出类别上限：400 且零落库、零残留半成品，服务照常应答（不崩）', async () => {
    const 超限 = PNG('x'.repeat(10 * 1024 * 1024 + 4096))
    const 响应 = await 上传(用户乙, 'tupian', 超限, 'da.png', 'image/png')
    expect(响应.status).toBe(400)
    expect(响应.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiGuoDa'))
    expect(库.媒体行).toHaveLength(0)
    expect(物理文件数()).toBe(0)
    expect(临时残留数()).toBe(0)
    const 后续 = await 上传(用户乙, 'tupian', PNG('ok'), 'ok.png', 'image/png')
    expect(后续.status).toBe(200)
  })

  it('非白名单 MIME 400（svg/tiff/heic/avif/exe 一律拒），好友页与聊天页同一份白名单', async () => {
    for (const [名, MIME] of [
      ['a.svg', 'image/svg+xml'],
      ['b.tiff', 'image/tiff'],
      ['c.heic', 'image/heic'],
      ['d.avif', 'image/avif'],
      ['e.exe', 'application/x-msdownload'],
    ] as Array<[string, string]>) {
      const 响应 = await 上传(用户乙, 'tupian', PNG('x'), 名, MIME)
      expect(响应.status, 名).toBe(400)
      expect(响应.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiMIMEBuZhiChi'))
    }
    expect(库.媒体行).toHaveLength(0)
    expect(物理文件数()).toBe(0)
  })

  it('0 字节与「内容冒充 MIME」一律 400，不落半成品文件', async () => {
    const 空 = await 上传(用户乙, 'tupian', Buffer.alloc(0), '0.png', 'image/png')
    expect(空.status).toBe(400)
    expect(空.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiNeiRongYuMIMEBuFu'))
    const 冒充 = await 上传(用户乙, 'tupian', Buffer.from('MZ this is a fake png'), 'fake.png', 'image/png')
    expect(冒充.status).toBe(400)
    expect(冒充.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiNeiRongYuMIMEBuFu'))
    expect(库.媒体行).toHaveLength(0)
    expect(物理文件数()).toBe(0)
    expect(临时残留数()).toBe(0)
  })

  it('不带文件部分的 multipart 400（未收到上传的文件）', async () => {
    const 响应 = await 请(应用)
      .post('/api/好友/媒体')
      .query({ jieShouZheId: 用户乙, leiBie: 'tupian' })
      .field('jieShouZheId', 用户乙)
    expect(响应.status).toBe(400)
    expect(响应.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiQueShaoWenJian'))
    expect(库.媒体行).toHaveLength(0)
  })

  it('非 multipart 请求体 400，不进库', async () => {
    const 响应 = await 请(应用)
      .post('/api/好友/媒体')
      .query({ jieShouZheId: 用户乙, leiBie: 'tupian' })
      .set('Content-Type', 'application/json')
      .send({})
    expect(响应.status).toBe(400)
    expect(取语句('INSERT INTO "媒体文件"')).toHaveLength(0)
  })

  it('视觉审核违规 403、文件即毁、记账号违规一次；审核服务不可用同样 403 但不记账', async () => {
    视觉审核结果 = { wei_gui: true, lei_xing: '淫秽色情', li_you: '命中' }
    const 违规 = await 上传(用户乙, 'tupian', PNG('bad'), 'bad.png', 'image/png')
    expect(违规.status).toBe(403)
    expect(违规.body.ti_shi).toBe(
      huoQuFanYi('liaoTian', 'tuPianWeiGui').replace('{leiBie}', huoQuFanYi('shenHeLeiBie', '淫秽色情')),
    )
    expect(库.媒体行).toHaveLength(0)
    expect(物理文件数()).toBe(0)
    expect(jiLuZhangHaoWeiGui).toHaveBeenCalledWith(
      expect.objectContaining({ yongHuId: 用户甲, leiXing: '好友媒体', yuanYin: '淫秽色情' }),
    )

    vi.mocked(jiLuZhangHaoWeiGui).mockClear()
    视觉审核结果 = { wei_gui: true, lei_xing: '审核服务不可用', li_you: '上游不可达' }
    const 不可用 = await 上传(用户乙, 'tupian', PNG('bad'), 'bad.png', 'image/png')
    expect(不可用.status).toBe(403)
    expect(jiLuZhangHaoWeiGui).not.toHaveBeenCalled()
    expect(库.媒体行).toHaveLength(0)
  })

  it('存储层抛非预期错误：只回通用文案、不落库，且服务照常应答（非法数据不打崩进程）', async () => {
    库.指定语句抛错 = 'INSERT INTO "媒体文件"'
    const 响应 = await 上传(用户乙, 'tupian', PNG('boom'), 'boom.png', 'image/png')
    库.指定语句抛错 = null
    expect(响应.status).toBe(500)
    expect(响应.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiShangChuanShiBai'))
    expect(JSON.stringify(响应.body)).not.toMatch(/SQLSTATE|node_modules|10\.0\.0\.5|连接中断/)
    expect(库.媒体行).toHaveLength(0)
    const 后续 = await 上传(用户乙, 'tupian', PNG('ok'), 'ok.png', 'image/png')
    expect(后续.status).toBe(200)
  })
})

describe('FP-21 发送好友消息：媒体归属与类型↔类别对应', () => {
  async function 传一张图(): Promise<string> {
    const 响应 = await 上传(用户乙, 'tupian', PNG('fa-song'), 'fa.png', 'image/png')
    expect(响应.status).toBe(200)
    return String(响应.body.shu_ju.mediaId)
  }

  it('非文本消息必带自有 媒体ID：空内容 400、缺/伪 媒体ID 400，两种都零落库', async () => {
    const 空体 = await 请(应用).post('/api/好友/消息').send({ jieShouZheId: 用户乙, leiXing: 'tuPian' })
    expect(空体.status).toBe(400)
    expect(空体.body.ti_shi).toBe(huoQuFanYi('haoYou', 'xiaoXiWeiKong'))
    for (const 体 of [
      { jieShouZheId: 用户乙, neiRong: '一张图', leiXing: 'tuPian' },
      { jieShouZheId: 用户乙, neiRong: '一张图', leiXing: 'tuPian', meiTiId: '不是uuid' },
      { jieShouZheId: 用户乙, neiRong: '一个文件', leiXing: 'wenJian', meiTiId: '' },
    ]) {
      const 响应 = await 请(应用).post('/api/好友/消息').send(体)
      expect(响应.status).toBe(400)
      expect(响应.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiBiXuXianChuanShu'))
    }
    expect(库.消息行).toHaveLength(0)
  })

  it('消息类型不在白名单 400（含空串与库内不存在的类型码）', async () => {
    const 媒体Id = await 传一张图()
    for (const 类型 of ['neiXinHuoDong', 'xiaoXi', 'WENJIAN', 'tuPian ']) {
      const 响应 = await 请(应用)
        .post('/api/好友/消息')
        .send({ jieShouZheId: 用户乙, leiXing: 类型, meiTiId: 媒体Id })
      expect(响应.status, 类型).toBe(400)
    }
    expect(库.消息行).toHaveLength(0)
  })

  it('引用他人上传的 媒体ID：400 且零落库（IDOR 面）', async () => {
    const 甲上传的 = await 传一张图()
    当前用户 = 用户乙
    const 响应 = await 请(应用)
      .post('/api/好友/消息')
      .send({ jieShouZheId: 用户甲, leiXing: 'tuPian', meiTiId: 甲上传的 })
    expect(响应.status).toBe(400)
    expect(库.消息行).toHaveLength(0)
  })

  it('引用不存在的 媒体ID 与引用他人的一律同一个 400 同一条文案（不给 UUID 存在性判分）', async () => {
    const 甲上传的 = await 传一张图()
    当前用户 = 用户乙
    const 他人 = await 请(应用)
      .post('/api/好友/消息')
      .send({ jieShouZheId: 用户甲, leiXing: 'tuPian', meiTiId: 甲上传的 })
    const 不存在 = await 请(应用)
      .post('/api/好友/消息')
      .send({ jieShouZheId: 用户甲, leiXing: 'tuPian', meiTiId: crypto.randomUUID() })
    expect(他人.status).toBe(400)
    expect(不存在.status).toBe(400)
    const { traceId: 他人追踪, ...他人稳定字段 } = 他人.body
    const { traceId: 不存在追踪, ...不存在稳定字段 } = 不存在.body
    expect(不存在追踪).not.toBe(他人追踪)
    expect(不存在稳定字段).toEqual(他人稳定字段)
    expect(库.消息行).toHaveLength(0)
  })

  it('类型与媒体类别不匹配一律服务端拒（tuPian 挂 wenjian 行 ⇒ 前端破图，须在落库前拦）', async () => {
    const 文件 = await 上传(用户乙, 'wenjian', Buffer.from('一份普通文件'), 'zi.liao.txt', 'text/plain')
    expect(文件.status).toBe(200)
    const 文件Id = String(文件.body.shu_ju.mediaId)
    const 错配 = await 请(应用)
      .post('/api/好友/消息')
      .send({ jieShouZheId: 用户乙, leiXing: 'tuPian', meiTiId: 文件Id })
    expect(错配.status).toBe(400)
    expect(错配.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiBuCunZai'))
    expect(库.消息行).toHaveLength(0)
    const 对配 = await 请(应用)
      .post('/api/好友/消息')
      .send({ jieShouZheId: 用户乙, leiXing: 'wenJian', meiTiId: 文件Id })
    expect(对配.status).toBe(200)
    expect(库.消息行).toHaveLength(1)
    expect(库.消息行[0]['类型']).toBe('wenJian')
  })

  it('文本消息带 媒体ID 也拒（文本无载体可渲染，落库即成死引用）', async () => {
    const 媒体Id = await 传一张图()
    const 响应 = await 请(应用)
      .post('/api/好友/消息')
      .send({ jieShouZheId: 用户乙, neiRong: '一句话', leiXing: 'wenben', meiTiId: 媒体Id })
    expect(响应.status).toBe(400)
    expect(库.消息行).toHaveLength(0)
  })

  it('合法图片消息落库并带上发送者自己的 媒体ID；非好友发送零落库', async () => {
    const 媒体Id = await 传一张图()
    const 响应 = await 请(应用)
      .post('/api/好友/消息')
      .send({ jieShouZheId: 用户乙, leiXing: 'tuPian', meiTiId: 媒体Id })
    expect(响应.status).toBe(200)
    expect(库.消息行).toHaveLength(1)
    expect(库.消息行[0]['媒体ID']).toBe(媒体Id)
    expect(库.消息行[0]['发送者ID']).toBe(用户甲)

    语句日志.length = 0
    当前用户 = 用户丙
    const 越权 = await 请(应用)
      .post('/api/好友/消息')
      .send({ jieShouZheId: 用户甲, leiXing: 'tuPian', meiTiId: 媒体Id })
    expect(越权.status).toBe(403)
    expect(库.消息行).toHaveLength(1)
  })

  it('好友消息全程不查 AI 会话表：会话编号无法冒充归属（L-22 根因）', async () => {
    const 媒体Id = await 传一张图()
    const 响应 = await 请(应用)
      .post('/api/好友/消息')
      .send({ jieShouZheId: 用户乙, leiXing: 'tuPian', meiTiId: 媒体Id, huiHuaId: 用户丙 })
    expect(响应.status).toBe(200)
    const 全部 = 语句日志.map((项) => 项.文本).join('\n')
    expect(全部).not.toMatch(/"会话"|FROM "消息"|"角色"/)
    expect(取语句('INSERT INTO "好友消息"')[0].参数[1]).toBe(用户乙)
  })
})

describe('FP-21 出参：签名地址绑读者，撤回行剥内容+地址', () => {
  async function 发一条图片消息(): Promise<{ 消息Id: string; 媒体Id: string }> {
    const 上传响应 = await 上传(用户乙, 'tupian', PNG('chu-can'), 'chu.png', 'image/png')
    const 媒体Id = String(上传响应.body.shu_ju.mediaId)
    const 响应 = await 请(应用)
      .post('/api/好友/消息')
      .send({ jieShouZheId: 用户乙, neiRong: '看图说话', leiXing: 'tuPian', meiTiId: 媒体Id })
    return { 消息Id: String(响应.body.shu_ju.id), 媒体Id }
  }

  function 解析地址(地址: string) {
    const 查询 = new URL(地址, 'http://x').searchParams
    return {
      sha: 地址.replace('/api/媒体/', '').split('?')[0],
      e: 查询.get('e'),
      u: 查询.get('u'),
      t: 查询.get('t'),
      s: 查询.get('s'),
    }
  }

  it('列表出参对收发双方各签一条自己的地址，且双方都能真取回字节', async () => {
    const { 媒体Id } = await 发一条图片消息()
    expect(媒体Id).toBeTruthy()
    可读集合()

    const 甲看 = await 请(应用).get(`/api/好友/消息/${用户乙}`)
    expect(甲看.status).toBe(200)
    const 甲行 = 甲看.body.shu_ju.lie_biao[0]
    expect(甲行.lei_xing).toBe('tuPian')
    expect(甲行.mei_ti_lei_bie).toBe('tupian')
    expect(甲行.mei_ti_yuan_shi_wen_jian_ming).toBe('chu.png')
    expect(甲行.mei_ti_da_xiao_zi_jie).toBe(PNG('chu-can').length)
    expect(解析地址(甲行.mei_ti_url).u).toBe(用户甲)

    当前用户 = 用户乙
    const 乙看 = await 请(应用).get(`/api/好友/消息/${用户甲}`)
    const 乙行 = 乙看.body.shu_ju.lie_biao[0]
    expect(解析地址(乙行.mei_ti_url).u).toBe(用户乙)
    expect(乙行.mei_ti_url).not.toBe(甲行.mei_ti_url)

    const 甲取 = await 请(应用).get(甲行.mei_ti_url)
    expect(甲取.status).toBe(200)
    expect(甲取.body).toEqual(PNG('chu-can'))
    const 乙取 = await 请(应用).get(乙行.mei_ti_url)
    expect(乙取.status).toBe(200)
    expect(乙取.body).toEqual(PNG('chu-can'))
  })

  it('非好友读列表 403 且响应里一个媒体地址都没有', async () => {
    await 发一条图片消息()
    可读集合()
    当前用户 = 用户丙
    const 响应 = await 请(应用).get(`/api/好友/消息/${用户甲}`)
    expect(响应.status).toBe(403)
    expect(JSON.stringify(响应.body)).not.toContain('/api/媒体/')
    expect(取语句('FROM "好友消息"')).toHaveLength(0)
  })

  it('撤回后列表既不回内容也不回媒体地址', async () => {
    const { 消息Id } = await 发一条图片消息()
    可读集合()
    const 撤回前 = (await 请(应用).get(`/api/好友/消息/${用户乙}`)).body.shu_ju.lie_biao[0]
    expect(撤回前.yi_che_hui).toBe(false)
    expect(撤回前.nei_rong).toBe('看图说话')
    expect(撤回前.mei_ti_url).toBeTruthy()

    const 撤回 = await 请(应用).put(`/api/好友/消息/${消息Id}/撤回`).send({})
    expect(撤回.status).toBe(200)
    可读集合()
    const 行 = (await 请(应用).get(`/api/好友/消息/${用户乙}`)).body.shu_ju.lie_biao[0]
    expect(行.yi_che_hui).toBe(true)
    expect(行.nei_rong).toBe('')
    expect(行.mei_ti_id).toBeNull()
    expect(行.mei_ti_url).toBeNull()
    expect(行.mei_ti_lei_bie).toBeNull()
    expect(行.mei_ti_yuan_shi_wen_jian_ming).toBeNull()
    expect(行.mei_ti_da_xiao_zi_jie).toBeNull()
  })

  it('签名地址换不了读者：u 被改成别人即 403 且零字节', async () => {
    await 发一条图片消息()
    可读集合()
    const 甲行 = (await 请(应用).get(`/api/好友/消息/${用户乙}`)).body.shu_ju.lie_biao[0]
    const 参 = 解析地址(甲行.mei_ti_url)
    const 换人 = await 请(应用).get(
      `/api/媒体/${参.sha}?e=${参.e}&u=${用户丙}&t=${参.t}&s=${参.s}`,
    )
    expect(换人.status).toBe(403)
    expect(换人.body.ti_shi).toBe(huoQuFanYi('liaoTian', 'qianMingWuXiao'))
  })

  it('谓词判不可读（解除好友/撤回）⇒ 原签名地址立即 403，上传者本人仍 200', async () => {
    await 发一条图片消息()
    可读集合()
    当前用户 = 用户乙
    const 乙行 = (await 请(应用).get(`/api/好友/消息/${用户甲}`)).body.shu_ju.lie_biao[0]
    当前用户 = 用户甲
    const 甲行 = (await 请(应用).get(`/api/好友/消息/${用户乙}`)).body.shu_ju.lie_biao[0]
    expect((await 请(应用).get(乙行.mei_ti_url)).status).toBe(200)

    // 解除好友：谓词不再对乙命中（SQL 侧的即时性在 好友媒体真库.test.ts 里断言）
    库.可读键.delete(`${解析地址(乙行.mei_ti_url).sha}|${用户乙}`)
    expect((await 请(应用).get(乙行.mei_ti_url)).status).toBe(403)
    expect((await 请(应用).get(甲行.mei_ti_url)).status).toBe(200)
  })

  it('签名参数缺失/过期/哈希格式非法一律 false，谓词抛错时 fail-closed', async () => {
    库.可读键.add(`${'a'.repeat(64)}|${用户甲}`)
    expect(await yanZhengQianMing('a'.repeat(64), null, null, null, null)).toBe(false)
    expect(await yanZhengQianMing('非哈希', '9999999999', 用户甲, 'abc', '1')).toBe(false)
    expect(await yanZhengQianMing('a'.repeat(64), '1', 用户甲, 'abc', '1')).toBe(false)
    库.谓词抛错 = true
    const { shengChengQianMingURL } = await import('../../services/媒体存储')
    const 串 = shengChengQianMingURL('a'.repeat(64), 用户甲)
    const 参 = 解析地址(串)
    expect(await yanZhengQianMing(参.sha, 参.e, 参.u, 参.s, 参.t)).toBe(false)
    库.谓词抛错 = false
    expect(await yanZhengQianMing(参.sha, 参.e, 参.u, 参.s, 参.t)).toBe(true)
    const 过期 = 解析地址(shengChengQianMingURL('a'.repeat(64), 用户甲, -10))
    expect(await yanZhengQianMing(过期.sha, 过期.e, 过期.u, 过期.s, 过期.t)).toBe(false)
  })
})

describe('FP-21 媒体可读谓词与审核违规类别的同源守卫（不依赖真库）', () => {
  const 源码根 = resolve(__dirname, '../..')

  function 读源(...段: string[]): string {
    return readFileSync(resolve(源码根, ...段), 'utf-8')
  }

  it('可读谓词两条规则都在，且解除好友/撤回/抛错三个方向都不放行', () => {
    expect(MEI_TI_KE_DU_YU_JU).toContain('mf."上传者ID" = $2')
    expect(MEI_TI_KE_DU_YU_JU).toContain(`ha."状态" = 'accepted'`)
    expect(MEI_TI_KE_DU_YU_JU).toContain('hm."撤回" = FALSE')
    expect(MEI_TI_KE_DU_YU_JU).toContain('$2 IN (hm."发送者ID", hm."接收者ID")')
    expect(MEI_TI_KE_DU_YU_JU).toContain('hm."媒体ID" = mf."ID"')
    const 存储源 = 读源('services', '媒体存储.ts')
    const 判定体 = /export async function yanZhengMeiTiKeDu[\s\S]*?\n}/.exec(存储源)![0]
    expect(判定体).toContain('数据库.query(MEI_TI_KE_DU_YU_JU')
    // 抛错不在判定内吞掉：由 yanZhengQianMing 的 catch 统一 false（不退化放行）
    const 签名体 = /export async function yanZhengQianMing[\s\S]*?\n}/.exec(存储源)![0]
    expect(签名体).toMatch(/catch \{\s*\n\s*return false/)
    expect(签名体).toContain('yanZhengMeiTiKeDu')
  })

  it('好友上传类别白名单是 config 里的常量，路由零第二套大小/MIME 清单', () => {
    const 路由源 = 读源('routes', '好友.ts')
    expect(路由源).toContain('shiHaoYouShangChuanLeiBie')
    expect(路由源).toContain('liuShiBaoCunMeiTi(')
    expect(路由源).not.toMatch(/image\/(jpeg|png|gif|webp)/)
    expect(路由源).not.toMatch(/\d+\s*\*\s*1024\s*\*\s*1024/)
    const 配置源 = 读源('config', '媒体配置.ts')
    expect(配置源).toMatch(/HAO_YOU_SHANG_CHUAN_LEI_BIE = \['tupian', 'wenjian'\]/)
  })

  it('审核违规类别清单只剩一个真源，五个站点与审核侧全部引用它（改翻译键必红灯）', () => {
    // 真源 = fanYi.shenHeLeiBie 段键集去掉服务侧哨兵键
    expect([...SHEN_HE_WEI_GUI_LEI_BIE].sort()).toEqual(
      Object.keys(fanYi.shenHeLeiBie)
        .filter((项) => 项 !== '审核服务不可用')
        .sort(),
    )
    expect([...SHEN_HE_WEI_GUI_LEI_BIE].sort()).toEqual(
      ['涉政有害', '淫秽色情', '暴力恐怖', '邪教', '赌博诈骗', '侵害未成年人'].sort(),
    )
    const 配置源 = 读源('config', '媒体配置.ts')
    expect(配置源).toMatch(
      /SHEN_HE_WEI_GUI_LEI_BIE: readonly string\[\] = Object\.keys\(fanYi\.shenHeLeiBie\)/,
    )
    // 五个站点不再自带类别清单，一律走 services/媒体审核出参 这一个出口
    // （'涉政有害' 字面量在 src/ 下的全量收敛由 services/__tests__/媒体审核出参.test.ts 钉）
    for (const 文件 of ['消息.ts', '用户设置.ts', '表情.ts', '资料.ts', '好友.ts']) {
      const 源 = 读源('routes', 文件)
      expect(源, `${文件} 未接唯一出口`).toContain('panDingMeiTiShenHeChuCan(')
      expect(源).not.toMatch(/shenHeLeiBieLieBiao|TU_PIAN_SHEN_HE_LEI_BIE|TU_PIAN_WEI_GUI_LEI_BIE/)
      expect(源).not.toMatch(/SHEN_HE_WEI_GUI_LEI_BIE\.includes\(/)
    }
    // 审核侧的判定/Prompt 同引用这一个真源
    const 审核源 = 读源('services', 'DeepSeek视觉审核.ts')
    expect(审核源).toContain('SHEN_HE_WEI_GUI_LEI_BIE')
  })

  it('好友消息类型码在路由侧只有一个来源（配置派生，非页面清单）', () => {
    const 路由源 = 读源('routes', '好友.ts')
    expect(路由源).toContain('new Set<string>(YUN_XU_XIAO_XI_LEI_XING)')
    expect([...YUN_XU_XIAO_XI_LEI_XING].sort()).toEqual(
      ['wenben', 'tuPian', 'biaoQingBao', 'yuYin', 'wenJian'].sort(),
    )
  })

  it('全后端只有一份 MIME/大小白名单定义点，好友链路三个文件都不自带第二套', () => {
    function 剥注释(源: string): string {
      return 源.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '')
    }
    const 定义点: string[] = []
    function 遍历(目录: string): void {
      for (const 项 of readdirSync(目录, { withFileTypes: true })) {
        const 完整 = path.join(目录, 项.name)
        if (项.isDirectory()) {
          if (项.name === '__tests__' || 项.name === 'node_modules') continue
          遍历(完整)
        } else if (项.name.endsWith('.ts')) {
          const 源 = 剥注释(readFileSync(完整, 'utf-8'))
          if (/mimeBaiMingDan\s*:|daXiaoShangXianZiJie\s*:/.test(源)) {
            定义点.push(relative(源码根, 完整).replace(/\\/g, '/'))
          }
        }
      }
    }
    遍历(源码根)
    expect(定义点).toEqual(['config/媒体配置.ts'])
    // 好友链路的三个文件只引用配置，不各写一份（两页两套白名单必然漂移 = 用户铁律的跨端一致）
    for (const 文件 of ['routes/好友.ts', 'services/好友媒体.ts', 'config/媒体配置.ts']) {
      const 源 = 剥注释(读源(...文件.split('/')))
      expect(/['"](image|audio|video|application)\/[a-z0-9]/.test(源)).toBe(
        文件 === 'config/媒体配置.ts',
      )
    }
  })
})
