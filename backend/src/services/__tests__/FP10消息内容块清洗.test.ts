import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Pool, PoolClient } from 'pg'
import { Pool as 池类 } from 'pg'
import { peiZhi } from '../../config'
import { LEI_BIE_DAO_XIAO_XI_LEI_XING, YUN_XU_XIAO_XI_LEI_XING } from '../../config/媒体配置'
import { XIAO_XI_PEI_ZHI } from '../../config/消息配置'
import { huoQuFanYi } from '../../config/translations'
import {
  XIAO_XI_KUAI_LEI_XING,
  fanGouKuai,
  paiShengJianRong,
  qingLiLuoKuKuai,
  qingLiTiJiaoKuai,
  shiTuWenHunPaiKuai,
  shunXuKeDuWenBen,
  yingYongMeiTiPanDing,
  diuQiDaoCuoWuJian,
} from '../消息内容块'
import { anIdChaXiaoXi, chuangJianYongHuXiaoXi, huoQuXiaoXiLieBiao, type XiaoXiXinXi } from '../消息'
import { huoQuZuiJinDuiHuaLiShi } from '../AI输入准备'
import { zhanShiXiaoXiZhengWen } from '../对话渲染'
import { 聊天内容验证中间件 } from '../../middleware/输入验证'

/**
 * FP-10（缺陷9）图文混排的后端语义层：消息内容块的清洗 / 兼容投影 / 历史反构。
 *
 * 每条断言都对应 services/消息内容块.ts 头部声明的三条不变式之一：
 *  ①派生（内容 === 块的顺序可读文本，无第二真源）
 *  ②兼容（历史行反构后 nei_rong 出参逐字不变）
 *  ③降级（脏块丢块 + warn，不整条失败）
 * 以及「拼写债的边界归一」：块值域 tupian 与消息类型 tuPian 是两个命名空间，唯一桥是映射表。
 */

const 警日志 = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }))
vi.mock('../../utils/debug日志', () => ({
  debug日志: {
    info: 警日志.info,
    warn: 警日志.warn,
    error: 警日志.error,
    debug: 警日志.debug,
  },
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
}))

beforeEach(() => {
  警日志.warn.mockClear()
})

/**
 * 应用侧 数据库 单例改指向本文件那条「外层事务里」的专用连接（与 FP09 真库测同口径）：
 * 服务内部的 BEGIN/COMMIT/ROLLBACK 映射成 SAVEPOINT，整体仍由外层事务一次回滚 ⇒ 现网库不留一行。
 * 连不上库时下面那组真库用例整组跳过（不伪造通过）。
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
vi.mock('../../utils/邮件告警', () => ({ faSongGaoJing: vi.fn(async () => undefined) }))

const 迁移033 = resolve(__dirname, '..', '..', '..', 'database', 'migrations', '033_FP10顺序化内容块.sql')
const 迁移035 = resolve(__dirname, '..', '..', '..', 'database', 'migrations', '035_引用消息.sql')

function 取连接串(): string {
  const 显式 = (process.env.TEST_DATABASE_URL ?? '').trim()
  const 基 = 显式 !== '' ? 显式 : String(peiZhi.shuJuKuLianJie ?? '')
  if (基 === '') return ''
  return 基.includes('@postgres:') ? 基.replace('@postgres:', '@127.0.0.1:') : 基
}

let 池: Pool | null = null
let 事务客户端: PoolClient | null = null
let 保存点栈: string[] = []
let 保存点序号 = 0

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
  const 句柄 = 事务客户端
  if (!句柄) throw new Error('FP-10 真库事务尚未建立')
  if (头 === 'BEGIN') {
    保存点序号 += 1
    const 名 = `fp10_sp_${保存点序号}`
    保存点栈.push(名)
    await 句柄.query(`SAVEPOINT ${名}`)
    return { rows: [] }
  }
  if (头 === 'COMMIT') {
    const 名 = 保存点栈.pop()
    if (名) await 句柄.query(`RELEASE SAVEPOINT ${名}`)
    return { rows: [] }
  }
  if (头 === 'ROLLBACK') {
    const 名 = 保存点栈.pop()
    if (名) await 句柄.query(`ROLLBACK TO SAVEPOINT ${名}`)
    return { rows: [] }
  }
  return (await 句柄.query(文本, 参数)) as unknown as { rows: Record<string, unknown>[] }
}

async function 直查(文本: string, 参数: unknown[] = []): Promise<Record<string, unknown>[]> {
  return (await 跑(文本, 参数)).rows
}

const 归属用户 = randomUUID()
const 他人用户 = randomUUID()
const 会话角色 = randomUUID()

function 补哈希(种子: string): string {
  return (种子.repeat(80) + 'a'.repeat(64)).slice(0, 64)
}

beforeAll(async () => {
  if (!有真库) return
  池 = new 池类({ connectionString: 取连接串(), connectionTimeoutMillis: 3000, max: 2 })
  事务客户端 = await 池.connect()
  await 事务客户端.query('BEGIN')
  // 现网库应已由 run_migration 跑过 033/035；本句只为「库比代码旧」的开发环境兜底，
  // 且顺带证明 033/035 的 SQL 自身可重复执行（ADD COLUMN IF NOT EXISTS + COMMENT）。
  // 整个 beforeAll 跑在一个显式事务里、afterAll 无条件 ROLLBACK ⇒ 现网库不留任何 DDL/数据。
  await 事务客户端.query(readFileSync(迁移033, 'utf-8'))
  await 事务客户端.query(readFileSync(迁移035, 'utf-8'))
  // FP-28b：夹具不再写真值进 用户.性别（该列是待删死列，FP-28c 删列后本条 INSERT 会 42703）；
  // 改吃同族且有真实写入者的 用户.默认性别，值域按 037/utils/性别 的 male|female。
  // 本文件的断言不涉及性别取值，故列清单从 "性别" 换成 "默认性别" 后强度不变。
  await 事务客户端.query(
    `INSERT INTO "用户" ("ID","手机号","用户名","昵称","默认性别","管理员","测试")
     VALUES ($1,$2,$3,'FP10甲','female',false,true), ($4,$5,$6,'FP10乙','male',false,true)`,
    [
      归属用户, `fp10a-${randomUUID()}`.slice(0, 20), `fp10a_${randomUUID()}`.slice(0, 20),
      他人用户, `fp10b-${randomUUID()}`.slice(0, 20), `fp10b_${randomUUID()}`.slice(0, 20),
    ],
  )
  await 事务客户端.query(
    `INSERT INTO "角色" ("ID","用户ID","名字","性别","性格","IE类型","热身类型","封存","可继续聊天","回复延迟毫秒")
     VALUES ($1,$2,'FP10探针角色','nv','测试用','I','慢热',false,true,2000)`,
    [会话角色, 归属用户],
  )
  await 事务客户端.query(
    `INSERT INTO "媒体文件" ("ID","SHA256","原始文件名","MIME","大小字节","类别","上传者ID") VALUES
       ($1,$2,'a.png','image/png',10,'tupian',$3),
       ($4,$5,'b.png','image/png',10,'biaoqingshu',$3),
       ($6,$7,'c.png','image/png',10,'tupian',$8)`,
    [图A, 补哈希('a1'), 归属用户, 图B, 补哈希('b2'), 图C, 补哈希('c3'), 他人用户],
  )
}, 60000)

afterAll(async () => {
  if (事务客户端) await 事务客户端.query('ROLLBACK').catch(() => undefined)
  事务客户端?.release()
  事务客户端 = null
  if (池) await 池.end().catch(() => undefined)
  池 = null
})

function 文字(s: string) {
  return { lei_xing: XIAO_XI_KUAI_LEI_XING.wenZi, nei_rong: s }
}
function 图片(媒体ID: string) {
  return { lei_xing: XIAO_XI_KUAI_LEI_XING.tuPian, mei_ti_id: 媒体ID }
}

const 图A = randomUUID()
const 图B = randomUUID()
const 图C = randomUUID()

describe('FP-10 提交侧结构清洗：只丢脏块，不丢整条', () => {
  it('未携带块 / 空数组 / 非数组 一律按「没带块」处理，交回老口径', () => {
    expect(qingLiTiJiaoKuai(undefined).kuai).toBeNull()
    expect(qingLiTiJiaoKuai(null).kuai).toBeNull()
    expect(qingLiTiJiaoKuai('随便一句话').kuai).toBeNull()
    expect(qingLiTiJiaoKuai([]).kuai).toBeNull()
    expect(qingLiTiJiaoKuai({ lei_xing: 'wenzi' }).kuai).toBeNull()
  })

  it('坏 JSON 字符串（老序列化器双重编码的产物）不抛错、按未携带处理并记 warn', () => {
    const 结果 = qingLiTiJiaoKuai('{"lei_xing":wenzi,,,')
    expect(结果.kuai).toBeNull()
    expect(结果.chaoXian).toBe(false)
    expect(警日志.warn).toHaveBeenCalled()
    const 首条 = 警日志.warn.mock.calls[0]?.[2] as { xiang_qing: Record<string, unknown> }
    expect(首条.xiang_qing.chang_ding).toBe('消息发送')
    expect(JSON.stringify(首条)).not.toContain('wenzi,,,')
  })

  it('合法 JSON 字符串数组仍被采纳（形状无关，只认内容）', () => {
    const 结果 = qingLiTiJiaoKuai(JSON.stringify([文字('早'), 图片(图A)]))
    expect(结果.kuai).toEqual([文字('早'), 图片(图A)])
  })

  it('不认识的块类型 / 非对象块 / 空文字块 逐块丢弃，其余块按原顺序保留', () => {
    const 结果 = qingLiTiJiaoKuai([
      文字('第一句'),
      { lei_xing: 'huawen_nei_rong', nei_rong: '未来版本的块' },
      '不是对象',
      null,
      文字('   '),
      图片(图A),
      文字('第二句'),
    ])
    expect(结果.kuai).toEqual([文字('第一句'), 图片(图A), 文字('第二句')])
    expect(结果.diuQi).toEqual(['lei_xing_wu_ren', 'kuai_fei_dui_xiang', 'kuai_fei_dui_xiang'])
    expect(结果.chaoXian).toBe(false)
  })

  it('图片块只认媒体 ID：非 UUID（含前端直传 URL）一律丢块并记 warn，绝不落 URL', () => {
    const 结果 = qingLiTiJiaoKuai([
      { lei_xing: 'tupian', mei_ti_id: 'https://evil.example.com/x.png' },
      { lei_xing: 'tupian', mei_ti_id: 123 },
      { lei_xing: 'tupian' },
      文字('只剩文字'),
    ])
    expect(结果.kuai).toEqual([文字('只剩文字')])
    expect(结果.diuQi).toEqual(['mei_ti_id_bu_he_fa', 'mei_ti_id_bu_he_fa', 'mei_ti_id_bu_he_fa'])
    expect(JSON.stringify(结果.kuai)).not.toContain('evil.example.com')
  })

  it('待判定媒体 ID 去重且保持首次出现顺序', () => {
    const 结果 = qingLiTiJiaoKuai([图片(图B), 图片(图A), 图片(图B)])
    expect(结果.daiPanDingMeiTiId).toEqual([图B, 图A])
  })

  it('块数超上限：整条按超限拒收（不静默截断成半条消息）', () => {
    const 超上限 = Array.from({ length: XIAO_XI_PEI_ZHI.neiRongKuaiZuiDaKuaiShu + 1 }, () => 文字('甲'))
    const 结果 = qingLiTiJiaoKuai(超上限)
    expect(结果.chaoXian).toBe(true)
    expect(结果.kuai).toEqual([])
    expect(结果.diuQi).toContain('kuaishu_chao_xian')
  })

  it('图片块数超上限：只丢多出来的图片块，文字块不受影响', () => {
    const 图 = Array.from({ length: XIAO_XI_PEI_ZHI.neiRongKuaiZuiDaTuPianShu + 2 }, (_, i) => 图片(randomUUID()))
    const 结果 = qingLiTiJiaoKuai([文字('看图'), ...图])
    expect(结果.kuai?.filter((k) => k.lei_xing === 'tupian')).toHaveLength(
      XIAO_XI_PEI_ZHI.neiRongKuaiZuiDaTuPianShu,
    )
    expect(结果.kuai?.[0]).toEqual(文字('看图'))
    expect(结果.diuQi.filter((y) => y === 'tupianshu_chao_xian')).toHaveLength(2)
    expect(结果.chaoXian).toBe(false)
  })

  it('单块文字超上限 / 合计超上限：报超限（调用方按既有 400 过长口径回），不截断', () => {
    const 超长 = '字'.repeat(XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu + 1)
    expect(qingLiTiJiaoKuai([文字(超长)]).chaoXian).toBe(true)
    const 半长 = '字'.repeat(XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu / 2)
    const 合计超 = qingLiTiJiaoKuai([文字(半长), 文字(半长), 文字('多一个字'), 图片(图A)])
    expect(合计超.chaoXian).toBe(true)
    expect(合计超.kuai).toEqual([])
    expect(合计超.diuQi).toContain('wen_zi_chao_chang')
    const 刚好 = qingLiTiJiaoKuai([文字(半长), 文字(半长), 图片(图A)])
    expect(刚好.chaoXian).toBe(false)
    expect(刚好.kuai).toHaveLength(3)
  })
})

describe('FP-10 媒体归属判定后的最终清洗', () => {
  it('不存在 / 非本人 / 类别不是图像 的图片块逐块丢弃，文字块永不受影响', () => {
    const 表 = new Map<string, { lei_bie: string; suo_shu: boolean }>([
      [图A, { lei_bie: 'tupian', suo_shu: true }],
      [图B, { lei_bie: 'tupian', suo_shu: false }],
      [图C, { lei_bie: 'yuyin', suo_shu: true }],
    ])
    const 结果 = yingYongMeiTiPanDing(
      [文字('前'), 图片(图A), 图片(图B), 图片(图C), 图片(randomUUID()), 文字('后')],
      表,
    )
    expect(结果.baoLiu).toEqual([文字('前'), 图片(图A), 文字('后')])
    expect(结果.diuQi).toEqual(['mei_ti_wu_quan_xian', 'mei_ti_lei_bie_bu_fu', 'mei_ti_bu_cun_zai'])
  })

  it('表情包类别的媒体可以作为图片块保留（类别白名单唯一来自 图像类别判定）', () => {
    const 表情类别 = Object.keys(LEI_BIE_DAO_XIAO_XI_LEI_XING).find((类) => 类 !== 'tupian' && 类 !== 'yuyin' && 类 !== 'wenjian')
    expect(表情类别).toBe('biaoqingshu')
    const 表 = new Map([[图A, { lei_bie: 表情类别 as string, suo_shu: true }]])
    const 结果 = yingYongMeiTiPanDing([图片(图A)], 表)
    expect(结果.baoLiu).toEqual([图片(图A)])
  })

  it('全丢光时的 400 文案键按「越权 > 媒体不可用 > 空内容」定序，且全部是既有翻译键', () => {
    expect(diuQiDaoCuoWuJian(['mei_ti_bu_cun_zai', 'mei_ti_wu_quan_xian'])).toBe('meiTiWuQuanXian')
    expect(diuQiDaoCuoWuJian(['mei_ti_lei_bie_bu_fu'])).toBe('meiTiBuCunZai')
    expect(diuQiDaoCuoWuJian(['lei_xing_wu_ren'])).toBe('xiaoXiNeiRongWeiKong')
    expect(diuQiDaoCuoWuJian([])).toBe('xiaoXiNeiRongWeiKong')
    for (const 键 of ['meiTiWuQuanXian', 'meiTiBuCunZai', 'xiaoXiNeiRongWeiKong'] as const) {
      const 文案 = huoQuFanYi('liaoTian', 键)
      expect(文案, `降级文案必须走翻译文件且键真实存在: ${键}`).not.toBe(键)
      expect(文案.length).toBeGreaterThan(0)
    }
  })
})

describe('FP-10 不变式①：兼容投影与块的顺序可读文本同源', () => {
  it('图文交替（文-图-文-图）：占位符按块顺序内联，媒体ID = 首个图片块', () => {
    const 块 = [文字('这里'), 图片(图A), 文字('还有这里'), 图片(图B)]
    const 表 = new Map([
      [图A, { lei_bie: 'tupian' }],
      [图B, { lei_bie: 'tupian' }],
    ])
    const 投影 = paiShengJianRong(块, 表)
    expect(投影.nei_rong).toBe('这里[图片]还有这里[图片]')
    expect(投影.nei_rong).toBe(shunXuKeDuWenBen(块, { leiBieLeiXing: (id) => id && 表.get(id)?.lei_bie }))
    expect(投影.mei_ti_id).toBe(图A)
    expect(投影.lei_xing).toBe('wenben')
  })

  it('纯图片块与今天的图片消息逐字同形：内容空、类型取自映射表而非字面量', () => {
    const 表 = new Map([[图A, { lei_bie: 'tupian' }]])
    expect(paiShengJianRong([图片(图A)], 表)).toEqual({
      nei_rong: '',
      lei_xing: LEI_BIE_DAO_XIAO_XI_LEI_XING.tupian,
      mei_ti_id: 图A,
    })
    const 表情表 = new Map([[图B, { lei_bie: 'biaoqingshu' }]])
    expect(paiShengJianRong([图片(图B)], 表情表).lei_xing).toBe(LEI_BIE_DAO_XIAO_XI_LEI_XING.biaoqingshu)
  })

  it('派生出的 类型 恒在发送白名单内（不因为新结构造出第二个值域）', () => {
    const 白名单 = new Set<string>(YUN_XU_XIAO_XI_LEI_XING)
    const 表 = new Map([
      [图A, { lei_bie: 'tupian' }],
      [图B, { lei_bie: 'biaoqingshu' }],
    ])
    for (const 块 of [
      [文字('甲')],
      [图片(图A)],
      [图片(图B)],
      [文字('甲'), 图片(图A)],
      [图片(图B), 文字('乙')],
    ]) {
      expect(白名单.has(paiShengJianRong(块, 表).lei_xing)).toBe(true)
    }
  })

  it('图片块的媒体行已消失（读侧取不到类别）时占位符仍按图片口径展开，不产生空洞', () => {
    const 块 = [文字('配文'), 图片(图C)]
    expect(shunXuKeDuWenBen(块)).toBe('配文[图片]')
    expect(paiShengJianRong(块).nei_rong).toBe('配文[图片]')
  })

  it('撤回口径：图片块文本化为撤回占位符，与既有载体占位符同源', () => {
    expect(shunXuKeDuWenBen([图片(图A)], { yiCheHui: true })).toBe('[用户撤回了一张图片]')
  })
})

describe('FP-10 不变式②：历史行反构', () => {
  it('纯文本行 ⇒ 一个文字块，内容逐字进块（出参 nei_rong 因此不变）', () => {
    const 块 = fanGouKuai({ nei_rong: '今晚七点老地方', lei_xing: 'wenben', mei_ti_id: null })
    expect(块).toEqual([文字('今晚七点老地方')])
    expect(shunXuKeDuWenBen(块)).toBe('今晚七点老地方')
  })

  it('图片行（内容为空）⇒ 一个图片块；带说明的图片行 ⇒ 载体块在前、说明在后', () => {
    expect(fanGouKuai({ nei_rong: '', lei_xing: 'tuPian', mei_ti_id: 图A })).toEqual([图片(图A)])
    expect(fanGouKuai({ nei_rong: '看这张', lei_xing: 'tuPian', mei_ti_id: 图A })).toEqual([
      图片(图A),
      文字('看这张'),
    ])
  })

  it('表情包历史行走映射表反查，不写第二份对应关系', () => {
    expect(fanGouKuai({ nei_rong: '', lei_xing: LEI_BIE_DAO_XIAO_XI_LEI_XING.biaoqingshu, mei_ti_id: 图B })).toEqual([
      图片(图B),
    ])
  })

  it('语音/文件历史行不生成图片块（否则前端会把语音渲染成图），只保留转写文字块', () => {
    expect(fanGouKuai({ nei_rong: '[语音(3秒)]刚才那条', lei_xing: 'yuYin', mei_ti_id: 图C })).toEqual([
      文字('[语音(3秒)]刚才那条'),
    ])
    expect(fanGouKuai({ nei_rong: '视频说明', lei_xing: 'wenJian', mei_ti_id: 图C })).toEqual([文字('视频说明')])
  })

  it('媒体ID 缺失的图片行 / 内容为空的文本行：仍反构出非空块数组，出参不被换成 null', () => {
    expect(fanGouKuai({ nei_rong: '', lei_xing: 'tuPian', mei_ti_id: null })).toEqual([文字('')])
    expect(fanGouKuai({ nei_rong: '', lei_xing: 'wenben', mei_ti_id: null })).toEqual([文字('')])
  })

  it('反构块的顺序可读文本对文本行恒等于原内容（历史消息喂 AI 的文本零变化的根基）', () => {
    for (const 原文 of ['a', '含[图片]两个字面量', '多行\n内容', '  前后空格  ']) {
      const 块 = fanGouKuai({ nei_rong: 原文, lei_xing: 'wenben', mei_ti_id: null })
      expect(shunXuKeDuWenBen(块)).toBe(原文)
    }
  })
})

describe('FP-10 读取侧对库内脏块的容错（坏 JSONB 不 500）', () => {
  it('形状非数组 / 空数组 / 全是不认识的块 ⇒ 交回反构，并记 warn（不含正文）', () => {
    expect(qingLiLuoKuKuai('不是数组', 'x1')).toBeNull()
    expect(qingLiLuoKuKuai({}, 'x2')).toBeNull()
    expect(qingLiLuoKuKuai([], 'x3')).toBeNull()
    expect(qingLiLuoKuKuai([{ lei_xing: '外星块' }, '不是对象'], 'x4')).toBeNull()
    expect(警日志.warn.mock.calls.map((c) => c[1])).toContain(
      '库内内容块无一可解析，回退为按行反构',
    )
    expect(JSON.stringify(警日志.warn.mock.calls)).not.toContain('外星块')
  })

  it('部分块可解析时按可解析部分返回（脏块丢弃、好块保序），不整行降级', () => {
    const 库值 = [文字('保留'), { lei_xing: 'tupian', mei_ti_id: '不合法' }, 图片(图A), 42]
    expect(qingLiLuoKuKuai(库值, 'x5')).toEqual([文字('保留'), 图片(图A)])
  })

  it('内容块为 NULL（历史行/旧客户端）时不记 warn——那是正常态', () => {
    expect(qingLiLuoKuKuai(null, 'x6')).toBeNull()
    expect(警日志.warn).not.toHaveBeenCalled()
  })
})

describe('FP-10 图文混排行不再被「单占位符覆盖正文」吃掉半条消息（AI 上下文）', () => {
  it('shiTuWenHunPaiKuai 只认「同时含文字块与图片块」，纯图/纯文/空数组一律 false', () => {
    expect(shiTuWenHunPaiKuai([文字('甲'), 图片(图A)])).toBe(true)
    expect(shiTuWenHunPaiKuai([图片(图A), 文字('甲')])).toBe(true)
    expect(shiTuWenHunPaiKuai([文字('甲')])).toBe(false)
    expect(shiTuWenHunPaiKuai([图片(图A)])).toBe(false)
    expect(shiTuWenHunPaiKuai([])).toBe(false)
    expect(shiTuWenHunPaiKuai(undefined)).toBe(false)
    expect(shiTuWenHunPaiKuai(null)).toBe(false)
  })

  it('混排行的 prompt 正文 = 块的顺序可读文本（占位符按序内联，正文不丢）', () => {
    const 混排行 = {
      fa_song_zhe_lei_xing: 'yonghu' as const,
      fa_song_zhe_ming: '用户',
      nei_rong: '这里[图片]还有这里[表情包]',
      shi_jian: '10:00',
      meiTiLeiBie: 'tupian',
      tuWenHunPai: true,
    }
    expect(zhanShiXiaoXiZhengWen(混排行)).toBe('这里[图片]还有这里[表情包]')
  })

  it('守卫没被放宽：纯图片行仍走既有单占位符口径，撤回行不外泄原顺序正文', () => {
    const 纯图行 = {
      fa_song_zhe_lei_xing: 'yonghu' as const,
      fa_song_zhe_ming: '用户',
      nei_rong: '',
      shi_jian: '10:00',
      meiTiLeiBie: 'tupian',
    }
    expect(zhanShiXiaoXiZhengWen(纯图行)).toBe('[图片]')
    const 撤回混排行 = { ...纯图行, nei_rong: '这里[图片]', yi_che_hui: true, tuWenHunPai: true }
    expect(zhanShiXiaoXiZhengWen(撤回混排行)).toBe('[用户撤回了一张图片]')
  })
})

/**
 * 真库端到端：单元层钉的是算式，这一组钉的是「真的落进 JSONB、真的按序读回、真的不回填历史行」。
 * 全程在外层事务里跑并以 ROLLBACK 收尾；连不上库时整组跳过（不伪造通过）。
 */
describe.skipIf(!有真库)('FP-10 真库回读：落库形态、顺序保真、历史行兼容与脏数据降级', () => {
  async function 库内行(消息Id: string): Promise<Record<string, unknown>> {
    const 行 = await 直查(`SELECT "内容", "类型", "媒体ID", "客户端序号", "幂等键", "内容块" FROM "消息" WHERE "ID" = $1`, [消息Id])
    expect(行).toHaveLength(1)
    return 行[0]
  }

  function 块形状(块: unknown): string[] {
    return (块 as Array<Record<string, unknown>>).map((项) =>
      项.lei_xing === 'tupian' ? `图:${项.mei_ti_id}` : `文:${项.nei_rong}`,
    )
  }

  async function 发一条(参数: {
    nei_rong_kuai?: unknown
    nei_rong?: string
    lei_xing?: string
    mei_ti_id?: string | null
    mi_deng_jian?: string
  }): Promise<{ cheng_gong: boolean; xiao_xi?: XiaoXiXinXi; ti_shi?: string; zhuang_tai_ma?: number }> {
    return chuangJianYongHuXiaoXi({
      yong_hu_id: 归属用户,
      jiao_se_id: 会话角色,
      nei_rong: 参数.nei_rong ?? '',
      ...参数,
    })
  }

  it('文-图-文-图 写入：库内块顺序 == 写入顺序，投影 内容/媒体ID 同源派生', async () => {
    const 提交块 = [文字('这里'), 图片(图A), 文字('还有这里'), 图片(图B)]
    const 响应 = await 发一条({ nei_rong_kuai: 提交块, nei_rong: '客户端乱带的正文' })
    expect(响应.cheng_gong).toBe(true)
    const 消息Id = String(响应.xiao_xi!.id)

    const 行 = await 库内行(消息Id)
    expect(块形状(行.内容块)).toEqual([`文:这里`, `图:${图A}`, `文:还有这里`, `图:${图B}`])
    // 投影（不变式①）：内容 = 块的顺序可读文本；类型/媒体ID 由服务端派生，客户端同名字段被忽略
    expect(行.内容).toBe('这里[图片]还有这里[表情包]')
    expect(行.类型).toBe('wenben')
    expect(String(行.媒体ID)).toBe(图A)

    const 读回 = await anIdChaXiaoXi(消息Id)
    expect(读回).not.toBeNull()
    expect(读回!.nei_rong_kuai!.map((项) => (项.lei_xing === 'tupian' ? `图:${项.mei_ti_id}` : `文:${项.nei_rong}`))).toEqual([
      '文:这里',
      `图:${图A}`,
      '文:还有这里',
      `图:${图B}`,
    ])
    expect(读回!.nei_rong).toBe('这里[图片]还有这里[表情包]')
    expect(读回!.lei_xing).toBe('wenben')
    // 图片块自带签名地址与真实类别（读取侧不必再逐块查库）
    const 图块 = 读回!.nei_rong_kuai!.filter((项) => 项.lei_xing === 'tupian')
    expect(图块.map((项) => 项.mei_ti_lei_bie)).toEqual(['tupian', 'biaoqingshu'])
    for (const 项 of 图块) {
      expect(项.mei_ti_url).toMatch(/^\/api\/媒体\/[0-9a-f]{64}\?/)
      expect(项.mei_ti_url).toContain(`u=${归属用户}`)
    }
  })

  it('纯图片块与老图片消息同形：内容空、类型取映射表、媒体ID 那一张；老读取路径不受影响', async () => {
    const 响应 = await 发一条({ nei_rong_kuai: [图片(图A)] })
    expect(响应.cheng_gong).toBe(true)
    const 行 = await 库内行(String(响应.xiao_xi!.id))
    expect(行.内容).toBe('')
    expect(行.类型).toBe(LEI_BIE_DAO_XIAO_XI_LEI_XING.tupian)
    expect(String(行.媒体ID)).toBe(图A)
    expect(块形状(行.内容块)).toEqual([`图:${图A}`])
    expect(响应.xiao_xi!.nei_rong).toBe('')
    expect(响应.xiao_xi!.lei_xing).toBe('tuPian')
  })

  it('历史行（内容块 NULL）出参逐字不变，且读取绝不回填', async () => {
    const 文本行 = randomUUID()
    const 图片行 = randomUUID()
    await 直查(
      `INSERT INTO "消息" ("ID","用户ID","角色ID","内容","发送者","类型","已读","媒体ID")
       VALUES ($1,$2,$3,'今晚七点老地方','yonghu','wenben',true,NULL),
              ($4,$2,$3,'','yonghu','tuPian',true,$5)`,
      [文本行, 归属用户, 会话角色, 图片行, 图A],
    )

    const { lie_biao } = await huoQuXiaoXiLieBiao({ yong_hu_id: 归属用户, jiao_se_id: 会话角色, mei_ye_tiao_shu: 99 })
    const 读文本 = lie_biao.find((项) => 项.id === 文本行)!
    const 读图片 = lie_biao.find((项) => 项.id === 图片行)!
    expect(读文本.nei_rong).toBe('今晚七点老地方')
    expect(读文本.nei_rong_kuai).toEqual([{ lei_xing: 'wenzi', nei_rong: '今晚七点老地方' }])
    expect(读图片.nei_rong).toBe('')
    expect(读图片.nei_rong_kuai!.map((项) => 项.lei_xing)).toEqual(['tupian'])
    expect(读图片.nei_rong_kuai![0].mei_ti_id).toBe(图A)
    expect(读图片.nei_rong_kuai![0].mei_ti_url).toMatch(/^\/api\/媒体\/[0-9a-f]{64}\?/)

    // 反构只在读取侧发生：库里那两行的 内容块 仍是 NULL（不回填历史行 = 迁移 033 的硬约束）
    const 仍为空 = await 直查(
      `SELECT count(*)::int AS n FROM "消息" WHERE "ID" IN ($1,$2) AND "内容块" IS NULL`,
      [文本行, 图片行],
    )
    expect(Number(仍为空[0].n)).toBe(2)
  })

  it('库内 内容块 是坏形状（对象 / 全是陌生块）：不 500，按行反构且正文逐字不变', async () => {
    const 坏对象行 = randomUUID()
    const 陌生块行 = randomUUID()
    await 直查(
      `INSERT INTO "消息" ("ID","用户ID","角色ID","内容","发送者","类型","已读","内容块") VALUES
         ($1,$2,$3,'这条的块是个对象','yonghu','wenben',true,$4::jsonb),
         ($5,$2,$6,'这条的块全不认识','yonghu','wenben',true,$7::jsonb)`,
      [坏对象行, 归属用户, 会话角色, '{"lei_xing":"wenzi","nei_rong":"被污染的形状"}', 陌生块行, 会话角色, JSON.stringify([{ lei_xing: '外星块' }, 42])],
    )

    const 读坏对象 = await anIdChaXiaoXi(坏对象行)
    expect(读坏对象!.nei_rong).toBe('这条的块是个对象')
    expect(读坏对象!.nei_rong_kuai).toEqual([{ lei_xing: 'wenzi', nei_rong: '这条的块是个对象' }])
    const 读陌生 = await anIdChaXiaoXi(陌生块行)
    expect(读陌生!.nei_rong).toBe('这条的块全不认识')
    expect(读陌生!.nei_rong_kuai).toEqual([{ lei_xing: 'wenzi', nei_rong: '这条的块全不认识' }])
    const 场景 = 警日志.warn.mock.calls.filter(
      (次) => 次[0] === '消息内容块' && String(次[1]).includes('回退为按行反构'),
    )
    expect(场景.length).toBeGreaterThanOrEqual(2)
    expect(JSON.stringify(场景)).not.toContain('被污染的形状')
  })

  it('越权媒体 ID 只丢该块并留痕（日志不含正文与别人的媒体 ID），其余块照常落库', async () => {
    const 响应 = await 发一条({ nei_rong_kuai: [文字('看这张'), 图片(图C)] })
    expect(响应.cheng_gong).toBe(true)
    const 行 = await 库内行(String(响应.xiao_xi!.id))
    expect(块形状(行.内容块)).toEqual(['文:看这张'])
    expect(行.内容).toBe('看这张')
    expect(行.媒体ID).toBeNull()
    const 丢弃 = 警日志.warn.mock.calls.filter((次) => 次[1] === '内容块脏数据已丢弃')
    expect(JSON.stringify(丢弃)).toContain('mei_ti_wu_quan_xian')
    expect(JSON.stringify(丢弃)).not.toContain(图C)
    expect(JSON.stringify(丢弃)).not.toContain('看这张')
  })

  it('脏提交一律明确 400、零落库：纯越权图块 / 陌生块类型 / 超长文字块', async () => {
    const 计数前 = Number((await 直查(`SELECT count(*)::int AS n FROM "消息" WHERE "用户ID"=$1`, [归属用户]))[0].n)

    const 越权纯图 = await 发一条({ nei_rong_kuai: [图片(图C)] })
    expect(越权纯图.cheng_gong).toBe(false)
    expect(越权纯图.zhuang_tai_ma).toBe(400)
    expect(越权纯图.ti_shi).toBe(huoQuFanYi('liaoTian', 'meiTiWuQuanXian'))

    const 全是陌生块 = await 发一条({ nei_rong_kuai: [{ lei_xing: '外星块', nei_rong: '未来版本' }], nei_rong: '客户端旧文本' })
    expect(全是陌生块.cheng_gong).toBe(false)
    expect(全是陌生块.zhuang_tai_ma).toBe(400)
    expect(全是陌生块.ti_shi).toBe(huoQuFanYi('liaoTian', 'xiaoXiNeiRongWeiKong'))

    const 超长 = await 发一条({ nei_rong_kuai: [文字('字'.repeat(XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu + 1))] })
    expect(超长.cheng_gong).toBe(false)
    expect(超长.zhuang_tai_ma).toBe(400)
    expect(超长.ti_shi).toBe(huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'))

    const 计数后 = Number((await 直查(`SELECT count(*)::int AS n FROM "消息" WHERE "用户ID"=$1`, [归属用户]))[0].n)
    expect(计数后).toBe(计数前)
  })

  it('与 FP-09 共存：带块提交仍走服务端权威序号 + 幂等键去重，重放不重复落库', async () => {
    const 键 = randomUUID()
    const 首次 = await 发一条({ nei_rong_kuai: [文字('第一句'), 图片(图A)], mi_deng_jian: 键 })
    expect(首次.cheng_gong).toBe(true)
    const 再发 = await 发一条({ nei_rong_kuai: [文字('第一句'), 图片(图A)], mi_deng_jian: 键 })
    expect(再发.cheng_gong).toBe(true)
    expect(再发.xiao_xi!.id).toBe(首次.xiao_xi!.id)
    const 次条 = await 发一条({ nei_rong_kuai: [文字('第二句')], mi_deng_jian: randomUUID() })
    expect(次条.cheng_gong).toBe(true)

    const 行 = await 直查(
      `SELECT "ID","客户端序号","幂等键" FROM "消息" WHERE "用户ID"=$1 AND "幂等键"=$2`,
      [归属用户, 键],
    )
    expect(行).toHaveLength(1)
    expect(Number(行[0].客户端序号)).toBeGreaterThan(0)
    const 序号首 = Number((await 库内行(String(首次.xiao_xi!.id))).客户端序号)
    const 序号次 = Number((await 库内行(String(次条.xiao_xi!.id))).客户端序号)
    expect(序号次).toBeGreaterThan(序号首)
    const 重复序号 = await 直查(
      `SELECT count(*)::int AS n FROM (
         SELECT "客户端序号" FROM "消息"
          WHERE "用户ID" = $1 AND "角色ID" = $2 AND "客户端序号" IS NOT NULL
          GROUP BY "客户端序号" HAVING count(*) > 1
       ) d`,
      [归属用户, 会话角色],
    )
    expect(Number(重复序号[0].n)).toBe(0)
  })

  it('AI 上下文（真库取数）：混排行按块顺序展开，纯图行仍是占位符', async () => {
    const 混排 = await 发一条({ nei_rong_kuai: [文字('这里'), 图片(图A), 文字('还有这里'), 图片(图B)] })
    const 纯图 = await 发一条({ nei_rong_kuai: [图片(图A)] })
    const 历史 = await huoQuZuiJinDuiHuaLiShi(归属用户, 会话角色)
    const 混排序 = 历史.find((项) => 项.id === String(混排.xiao_xi!.id))!
    const 纯图序 = 历史.find((项) => 项.id === String(纯图.xiao_xi!.id))!
    expect(混排序.tuWenHunPai).toBe(true)
    expect(zhanShiXiaoXiZhengWen(混排序)).toBe('这里[图片]还有这里[表情包]')
    expect(纯图序.tuWenHunPai).toBe(false)
    expect(zhanShiXiaoXiZhengWen(纯图序)).toBe('[图片]')
    // 视觉注入仍拿得到那张图的哈希（混排不因文本化而丢图）
    expect(混排序.meiTiSha256).toBe(补哈希('a1'))
  })
})

describe('FP-10 输入闸：长度只在块维度判一次，占位符不占用户的字数预算', () => {
  function 走闸(消息体: Record<string, unknown>): { 放行: boolean; 状态?: number; 提示?: string } {
    const 记录: { 放行: boolean; 状态?: number; 提示?: string } = { 放行: false }
    const 响应 = {
      status: (码: number) => {
        记录.状态 = 码
        return 响应
      },
      json: (体: Record<string, unknown>) => {
        记录.提示 = typeof 体['ti_shi'] === 'string' ? (体['ti_shi'] as string) : undefined
        return 响应
      },
    }
    聊天内容验证中间件(
      { body: 消息体, query: {} } as never,
      响应 as never,
      () => {
        记录.放行 = true
      },
    )
    return 记录
  }

  const 满上限 = '字'.repeat(XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu / 2)

  it('文-图-文-图：用户文字合计恰为上限仍放行，哪怕投影 内容 因占位符超过 500', () => {
    const 投影 = shunXuKeDuWenBen([文字(满上限), 图片(图A), 文字(满上限), 图片(图B)])
    expect(投影.length).toBeGreaterThan(XIAO_XI_PEI_ZHI.zuiDaXiaoXiChangDu)
    const 结果 = 走闸({
      leiXing: 'wenben',
      neiRong: 投影,
      nei_rong_kuai: [文字(满上限), 图片(图A), 文字(满上限), 图片(图B)],
    })
    expect(结果.放行).toBe(true)
    expect(结果.状态).toBeUndefined()
  })

  it('块内文字合计超上限 ⇒ 400「消息内容过长」，与老口径同一文案键', () => {
    const 结果 = 走闸({
      leiXing: 'wenben',
      neiRong: '随便',
      nei_rong_kuai: [文字(满上限), 文字(满上限), 文字('多一个字')],
    })
    expect(结果.放行).toBe(false)
    expect(结果.状态).toBe(400)
    expect(结果.提示).toBe(huoQuFanYi('liaoTian', 'xiaoXiNeiRongGuoChang'))
  })

  it('守卫没被放宽：没带块的老文本超长仍 400；块是坏 JSON 字符串时按未携带回落老口径', () => {
    expect(走闸({ leiXing: 'wenben', neiRong: '字'.repeat(501) }).状态).toBe(400)
    const 坏串 = 走闸({
      leiXing: 'wenben',
      neiRong: '正常的一句话',
      nei_rong_kuai: '{{{不是 JSON',
    })
    expect(坏串.放行).toBe(true)
  })

  it('媒体消息的老口径（不查文本长度）不变', () => {
    expect(走闸({ leiXing: 'tuPian', meiTiId: 图A }).放行).toBe(true)
  })
})
