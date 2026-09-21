import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { createHash } from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { Pool, PoolClient } from 'pg'
import { Pool as 池类 } from 'pg'
import { peiZhi } from '../../config'

/**
 * L-47：同一张图每「添加到表情」一次就完整重过一遍视觉审核，且没有任何按 SHA256 的结果缓存
 * —— 复判非确定性 ⇒ 当初判合规的图可能复判被判违规，违规记录还记在点添加的人账上。
 * 根因修法：审核结论按内容哈希复用（029 媒体审核结论表），审核侧仍是结论的唯一写入方。
 *
 * 本文件不碰任何真实外呼：DeepSeek客户端 被替身接管，test-setup 亦把 jiChuUrl 指向 127.0.0.1:9。
 */
const 临时目录 = fs.mkdtempSync(path.join(os.tmpdir(), 'shen-he-jie-lun-'))
const 结论表 = new Map<string, Record<string, unknown>>()
const 语句日志: Array<{ 文本: string; 参数: unknown[] }> = []
const 外呼 = {
  次数: 0,
  抛错: false,
  内容: '{"违规": false, "确信度": 0.1, "类型": "", "严重程度": null, "理由": ""}',
}
const 缓存故障 = { 查: false, 写: false }

function 落文件(名: string, 字节: Buffer): string {
  const 路径 = path.join(临时目录, 名)
  fs.writeFileSync(路径, 字节)
  return 路径
}

vi.mock('../../数据库', () => ({
  数据库: {
    query: async (文本: string, 参数: unknown[] = []) => {
      语句日志.push({ 文本, 参数 })
      if (文本.includes('FROM "媒体审核结论"')) {
        if (缓存故障.查) throw new Error('relation "媒体审核结论" does not exist')
        const 存 = 结论表.get(String(参数[0]))
        // 按真库 SQL 的列别名形态回行（SELECT "违规" AS wei_gui ...），不喂内部键名
        return {
          rows: 存
            ? [
                {
                  wei_gui: 存['违规'],
                  lei_xing: 存['类别'],
                  li_you: 存['理由'],
                  yan_zhong_cheng_du: 存['严重程度'],
                },
              ]
            : [],
          rowCount: 存 ? 1 : 0,
        }
      }
      if (文本.includes('INSERT INTO "媒体审核结论"')) {
        if (缓存故障.写) throw new Error('缓存写入故障注入')
        const 哈希 = String(参数[0])
        const 已存在 = 结论表.has(哈希)
        if (!已存在) {
          结论表.set(哈希, {
            违规: 参数[1],
            类别: 参数[2],
            理由: 参数[3],
            严重程度: 参数[4],
          })
        }
        // 与真库 ON CONFLICT ("SHA256") DO NOTHING 同语义：重复写 rowCount=0，绝不覆盖首条
        return { rows: [], rowCount: 已存在 ? 0 : 1 }
      }
      throw new Error(`测试替身未覆盖的语句：${文本}`)
    },
    connect: async () => {
      throw new Error('审核结论缓存不开事务连接')
    },
  },
}))

vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../utils/DeepSeek客户端', () => ({
  genJuPeiZhiTiaoYong: async () => {
    外呼.次数 += 1
    if (外呼.抛错) throw new Error('视觉审核外呼失败注入')
    return { neiRong: 外呼.内容, siKaoNeiRong: '', yuanShuJu: {}, xinXi: { role: 'assistant' } }
  },
}))

import { shenHeTuPianAnQuan, SHEN_HE_JIE_LUN_YU_JU } from '../DeepSeek视觉审核'

function zaoPNG(种子: string): Buffer {
  const tou = Buffer.alloc(24)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(tou, 0)
  tou.writeUInt32BE(64, 16)
  tou.writeUInt32BE(64, 20)
  return Buffer.concat([tou, Buffer.from(种子, 'utf8')])
}

function 哈希Of(字节: Buffer): string {
  return createHash('sha256').update(字节).digest('hex')
}

function 查结论语句() {
  return 语句日志.filter((项) => 项.文本.includes('FROM "媒体审核结论"'))
}

function 写结论语句() {
  return 语句日志.filter((项) => 项.文本.includes('INSERT INTO "媒体审核结论"'))
}

let 序号 = 0
function 新文件(种子: string): { 路径: string; 字节: Buffer; 哈希: string } {
  序号 += 1
  const 字节 = zaoPNG(`${种子}-${序号}`)
  return { 路径: 落文件(`t${序号}.png`, 字节), 字节, 哈希: 哈希Of(字节) }
}

beforeEach(() => {
  vi.clearAllMocks()
  结论表.clear()
  语句日志.length = 0
  外呼.次数 = 0
  外呼.抛错 = false
  外呼.内容 = '{"违规": false, "确信度": 0.1, "类型": "", "严重程度": null, "理由": ""}'
  缓存故障.查 = false
  缓存故障.写 = false
})

afterAll(() => {
  fs.rmSync(临时目录, { recursive: true, force: true })
})

describe('L-47 视觉审核结论按内容哈希复用', () => {
  it('同一张图连审两次只外呼一次，第二次由结论表命中且结论等价', async () => {
    const { 路径, 哈希 } = 新文件('tong-yi-zhang-tu')
    const 首次 = await shenHeTuPianAnQuan(路径)
    expect(首次.wei_gui).toBe(false)
    expect(外呼.次数).toBe(1)
    expect(结论表.has(哈希), '首次判定必须落结论表').toBe(true)

    const 二次 = await shenHeTuPianAnQuan(路径)
    expect(外呼.次数, '已有结论仍重判 ⇒ L-47 未修').toBe(1)
    expect(二次).toEqual(首次)
    expect(写结论语句()).toHaveLength(1)
  })

  it('违规结论同样按哈希复用：复判不再有翻牌机会，回的是同一条结论', async () => {
    外呼.内容 =
      '{"违规": true, "确信度": 0.95, "类型": "淫秽色情", "严重程度": "严重", "理由": "含露骨内容"}'
    const { 路径, 哈希 } = 新文件('wei-gui-tu')
    const 首次 = await shenHeTuPianAnQuan(路径)
    expect(首次).toMatchObject({
      wei_gui: true,
      lei_xing: '淫秽色情',
      li_you: '含露骨内容',
      yan_zhong_cheng_du: 'yan_zhong',
    })

    // 换一份"复判"结果（模型非确定性）也不会再被问到：结论以首次落库的那条为准
    外呼.内容 = '{"违规": false, "确信度": 0.01, "类型": "", "严重程度": null, "理由": ""}'
    const 二次 = await shenHeTuPianAnQuan(路径)
    expect(外呼.次数).toBe(1)
    expect(二次.wei_gui).toBe(true)
    expect(二次.lei_xing).toBe('淫秽色情')
    expect(结论表.get(哈希)?.['违规']).toBe(true)
  })

  it('不同字节各审一次：复用按内容而非按调用次数', async () => {
    const 甲 = 新文件('jia')
    const 乙 = 新文件('yi')
    await shenHeTuPianAnQuan(甲.路径)
    await shenHeTuPianAnQuan(乙.路径)
    expect(外呼.次数).toBe(2)
    expect(结论表.size).toBe(2)
    expect(写结论语句().map((项) => 项.参数[0])).toEqual([甲.哈希, 乙.哈希])
  })

  it('外呼失败（审核服务不可用）不是审核结论，绝不落表，下次仍真审', async () => {
    外呼.抛错 = true
    const { 路径, 哈希 } = 新文件('fu-wu-bu-ke-yong')
    const 兜底 = await shenHeTuPianAnQuan(路径)
    expect(兜底).toMatchObject({ wei_gui: true, lei_xing: '审核服务不可用' })
    expect(写结论语句()).toHaveLength(0)
    expect(结论表.has(哈希)).toBe(false)

    外呼.抛错 = false
    const 重来 = await shenHeTuPianAnQuan(路径)
    expect(外呼.次数, '故障后必须重新真审').toBe(2)
    expect(重来.wei_gui).toBe(false)
  })

  it('文件读取失败的兜底同样不落表（没有内容哈希，也没有审核结论）', async () => {
    const 不存在 = path.join(临时目录, 'bing-bu-cun-zai.png')
    const 兜底 = await shenHeTuPianAnQuan(不存在)
    expect(兜底).toMatchObject({ wei_gui: true, lei_xing: '系统错误' })
    expect(查结论语句()).toHaveLength(0)
    expect(写结论语句()).toHaveLength(0)
  })

  it('结论表查不到（旧库未跑 029 / 库不可达）一律退回真审，既不崩也不放行', async () => {
    缓存故障.查 = true
    const { 路径, 哈希 } = 新文件('biao-que-shi')
    const 结 = await shenHeTuPianAnQuan(路径)
    expect(外呼.次数, '缓存故障即失去安全屏障').toBe(1)
    expect(结.wei_gui).toBe(false)
    // 查询故障不阻止把真审出的结论补写回去（写侧仍可用时下次即可命中）
    expect(结论表.has(哈希)).toBe(true)
    expect(查结论语句()).toHaveLength(1)
  })

  it('结论写入失败只降级为「下次再审」，不改变本次判定也不外抛', async () => {
    缓存故障.写 = true
    const { 路径 } = 新文件('xie-shi-bai')
    await expect(shenHeTuPianAnQuan(路径)).resolves.toMatchObject({ wei_gui: false })
    expect(外呼.次数).toBe(1)
    缓存故障.写 = false
    await shenHeTuPianAnQuan(路径)
    expect(外呼.次数, '写失败后下次必须重审').toBe(2)
  })

  it('哈希由被审字节本地算出，调用方无从伪造（接口只有一个路径参数）', async () => {
    const { 路径, 字节, 哈希 } = 新文件('bu-ke-wei-zao')
    const 源 = fs.readFileSync(path.join(__dirname, '../DeepSeek视觉审核.ts'), 'utf-8')
    expect(源).toMatch(/export async function shenHeTuPianAnQuan\(wenJianLuJing: string\)/)
    expect(源).toContain("createHash('sha256').update(tuPianHuanChong)")
    await shenHeTuPianAnQuan(路径)
    expect(哈希Of(fs.readFileSync(路径))).toBe(哈希)
    expect(查结论语句()[0].参数).toEqual([哈希Of(字节)])
  })

  it('审核侧是结论的唯一写入方，其余模块只读不写', () => {
    function 遍历TS(目录: string, 收集: string[]): string[] {
      for (const 项 of fs.readdirSync(目录, { withFileTypes: true })) {
        const 完整 = path.join(目录, 项.name)
        if (项.isDirectory()) {
          if (项.name === '__tests__' || 项.name === 'node_modules') continue
          遍历TS(完整, 收集)
        } else if (项.name.endsWith('.ts')) {
          收集.push(完整)
        }
      }
      return 收集
    }
    const 源码根 = path.resolve(__dirname, '../..')
    const 写入方 = 遍历TS(源码根, [])
      .filter((文件) => fs.readFileSync(文件, 'utf-8').includes('INSERT INTO "媒体审核结论"'))
      .map((文件) => path.relative(源码根, 文件).replace(/\\/g, '/'))
      .sort()
    expect(写入方).toEqual(['services/DeepSeek视觉审核.ts'])
  })

  it('写结论用 ON CONFLICT DO NOTHING：并发同哈希双写不报错也不覆盖首条结论', () => {
    expect(SHEN_HE_JIE_LUN_YU_JU.写结论).toContain('ON CONFLICT ("SHA256") DO NOTHING')
    expect(SHEN_HE_JIE_LUN_YU_JU.写结论).not.toMatch(/DO UPDATE/i)
  })
})

/* ---------------- 真库形态（连不上即整组显式跳过，不伪造通过） ---------------- */

function 取可连通连接串(): string {
  const 显式 = (process.env.TEST_DATABASE_URL ?? '').trim()
  if (显式 !== '') return 显式
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

describe.runIf(有真库)('029 媒体审核结论真库形态（迁移已落到本地库的结构证据）', () => {
  it('列集合、类型与约束与迁移声明逐条一致', async () => {
    await 在事务里(async (客户端) => {
      const 列 = await 客户端.query(
        `SELECT column_name, data_type, is_nullable
           FROM information_schema.columns WHERE table_name = '媒体审核结论'
          ORDER BY ordinal_position`,
      )
      expect(列.rows.map((行: Record<string, unknown>) => String(行['column_name']))).toEqual([
        'SHA256',
        '违规',
        '类别',
        '理由',
        '严重程度',
        '审核时间',
      ])
      const 按名 = new Map(
        列.rows.map((行: Record<string, unknown>) => [String(行['column_name']), 行]),
      )
      expect(String(按名.get('SHA256')?.['data_type'])).toBe('character')
      expect(String(按名.get('违规')?.['data_type'])).toBe('boolean')
      expect(String(按名.get('严重程度')?.['is_nullable'])).toBe('YES')
      expect(String(按名.get('违规')?.['is_nullable'])).toBe('NO')

      const 约束 = await 客户端.query(
        `SELECT c.conname AS ming, c.contype AS lei, pg_get_constraintdef(c.oid) AS dingyi
           FROM pg_class t
           JOIN pg_namespace n ON n.oid = t.relnamespace
           JOIN pg_constraint c ON c.conrelid = t.oid
          WHERE t.relname = '媒体审核结论' ORDER BY c.conname`,
      )
      expect(约束.rows.map((行: Record<string, unknown>) => String(行['ming']))).toEqual([
        '媒体审核结论_pkey',
        '媒体审核结论_严重程度合法',
        '媒体审核结论_哈希形态',
      ])
      const 主键 = 约束.rows.find(
        (行: Record<string, unknown>) => String(行['ming']) === '媒体审核结论_pkey',
      ) as Record<string, unknown>
      expect(String(主键['dingyi'])).toContain('PRIMARY KEY ("SHA256")')
      const 形态 = 约束.rows.find(
        (行: Record<string, unknown>) => String(行['ming']) === '媒体审核结论_哈希形态',
      ) as Record<string, unknown>
      expect(String(形态['dingyi'])).toContain("^[0-9a-f]{64}$")
    })
  })

  it('路由同款 SQL 在真库跑通：一条结论一次命中，重复写被 ON CONFLICT 吞掉', async () => {
    await 在事务里(async (客户端) => {
      const 哈希 = 哈希Of(zaoPNG('zhen-ku-shang-xian'))
      const 写 = await 客户端.query(SHEN_HE_JIE_LUN_YU_JU.写结论, [
        哈希,
        false,
        '',
        '',
        null,
      ])
      expect(写.rowCount).toBe(1)
      const 重复 = await 客户端.query(SHEN_HE_JIE_LUN_YU_JU.写结论, [
        哈希,
        true,
        '淫秽色情',
        '试图覆盖首条结论',
        'yan_zhong',
      ])
      expect(重复.rowCount, '同哈希重复写不得报错').toBe(0)

      const 查 = await 客户端.query(SHEN_HE_JIE_LUN_YU_JU.查结论, [哈希])
      expect(查.rows).toHaveLength(1)
      expect(查.rows[0].wei_gui).toBe(false)
      expect(String(查.rows[0].lei_xing)).toBe('')
    })
  })

  it('非法形态被 CHECK 拦下（非 hex 哈希、第三种严重程度写法都进不来）', async () => {
    await 在事务里(async (客户端) => {
      for (const [参数, 码] of [
        [['ZZ', false, '', '', null], '23514'],
        [
          [哈希Of(zaoPNG('fei-fa-cheng-du')), false, '', '', 'wei_ming'],
          '23514',
        ],
      ] as Array<[unknown[], string]>) {
        await 客户端.query('SAVEPOINT sp')
        let 抛了: unknown = null
        try {
          await 客户端.query(SHEN_HE_JIE_LUN_YU_JU.写结论, 参数)
        } catch (cuoWu) {
          抛了 = cuoWu
        }
        await 客户端.query('ROLLBACK TO SAVEPOINT sp')
        expect(抛了, '非法结论竟落库').toMatchObject({ code: 码 })
      }
    })
  })

  it('台账登记 029 且未回改既有版本（027/028 属 FP-21，号位不得复用）', async () => {
    const 结果 = await 真库池!.query(
      `SELECT version, checksum FROM "schema_migrations" ORDER BY version`,
    )
    const 版本 = 结果.rows.map((行: Record<string, unknown>) => String(行['version']))
    expect(版本).toContain('029')
    // 只钉 029 自己那一格没被复用：`>= 29` 把「029 是链尾」当成了 029 的断言，
    // 后续任何新迁移（如 030 游戏结局结果状态钉枚举键）一落地就必然假红。
    expect(版本.filter((v) => Number(v) >= 29 && Number(v) < 30)).toEqual(['029'])
    expect(版本.filter((v) => ['027', '028'].includes(v))).toEqual(['027', '028'])
  })
})

describe.runIf(!有真库)('029 真库不可达（显式暴露跳过，不伪造通过）', () => {
  it('跳过真库形态验证', () => {
    expect(有真库).toBe(false)
  })
})
