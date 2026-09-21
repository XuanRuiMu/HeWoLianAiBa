import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { readFileSync, readdirSync } from 'fs'
import { relative, resolve } from 'path'

const 用户甲 = '11111111-1111-4111-8111-111111111111'
const 用户乙 = '22222222-2222-4222-8222-222222222222'
const 媒体甲一 = '33333333-3333-4333-8333-333333333333'
const 媒体甲二 = '77777777-7777-4777-8777-777777777777'
const 媒体乙一 = '44444444-4444-4444-8444-444444444444'
const 表情甲一 = '55555555-5555-4555-8555-555555555555'
const 表情甲二 = '88888888-8888-4888-8888-888888888888'
const 表情乙一 = '66666666-6666-4666-8666-666666666666'
const SHA_甲一 = 'a'.repeat(64)
const SHA_乙一 = 'b'.repeat(64)

const 语句日志: Array<{ 文本: string; 参数: unknown[]; 来源: '池' | '事务' }> = []
let 表情行: Array<Record<string, unknown>> = []
let 媒体行: Array<Record<string, unknown>> = []
/** 事务/锁形态观测量：登记路径必须「开事务→拿锁→查→计数→插/回收→提交」逐字成立 */
const 锁键: string[] = []
const 事务事件: string[] = []
const 连接计数 = { 打开: 0, 释放: 0 }
/** 按语句片段注入失败，验证失败路径必回滚并释放连接 */
let 抛错语句: string | null = null

function 连接视图(行: Record<string, unknown>): Record<string, unknown> {
  const mei = 媒体行.find((m) => m['ID'] === 行['媒体ID']) || {}
  return {
    id: 行['ID'],
    mei_ti_id: 行['媒体ID'],
    sha256: mei['SHA256'],
    mime: mei['MIME'],
    duan_ming: 行['短名'],
    pai_xu: 行['排序'],
    chuang_jian_shi_jian: 行['创建时间'],
  }
}

vi.mock('../../数据库', () => {
  async function 执行(文本: string, 参数: unknown[] = [], 来源: '池' | '事务' = '池') {
    语句日志.push({ 文本, 参数, 来源 })

    if (文本 === 'BEGIN' || 文本 === 'COMMIT' || 文本 === 'ROLLBACK') {
      事务事件.push(文本)
      return { rows: [], rowCount: 0 }
    }
    if (文本.includes('pg_advisory_xact_lock')) {
      事务事件.push('LOCK')
      锁键.push(String(参数[0]))
      return { rows: [], rowCount: 1 }
    }
    if (抛错语句 && 文本.includes(抛错语句)) throw new Error(`注入失败：${抛错语句}`)

    if (文本.includes('JOIN "媒体文件"')) {
      const 用户ID = 参数[0] as string
      let 行 = 表情行
        .filter((e) => e['用户ID'] === 用户ID)
        .map(连接视图)
        .sort(
          (a, b) =>
            Number(a['pai_xu']) - Number(b['pai_xu']) ||
            String(a['chuang_jian_shi_jian']).localeCompare(String(b['chuang_jian_shi_jian'])),
        )
      if (文本.includes('m."SHA256" = $2')) {
        行 = 行.filter((e) => e['sha256'] === (参数[1] as string))
      }
      return { rows: 文本.includes('LIMIT 1') ? 行.slice(0, 1) : 行, rowCount: 行.length }
    }

    if (文本.includes('COUNT(*)::int AS shu')) {
      const 属于 = 表情行.filter((e) => e['用户ID'] === 参数[0])
      const 最大 = 属于.reduce((x, e) => Math.max(x, Number(e['排序'])), -1)
      return { rows: [{ shu: 属于.length, xu: 最大 + 1 }], rowCount: 1 }
    }

    if (文本.includes('lower("ID"::text)')) {
      const 行 = 表情行
        .filter((e) => e['用户ID'] === 参数[0])
        .map((e) => ({ id: String(e['ID']).toLowerCase() }))
      return { rows: 行, rowCount: 行.length }
    }

    if (文本.includes('INSERT INTO "用户表情"')) {
      const 新行 = {
        ID: `row-${表情行.length + 1}`,
        用户ID: 参数[0],
        媒体ID: 参数[1],
        短名: 参数[2],
        排序: 参数[3],
        创建时间: '2026-09-20T00:00:00.000Z',
      }
      表情行.push(新行)
      return {
        rows: [
          {
            id: 新行.ID,
            mei_ti_id: 新行.媒体ID,
            duan_ming: 新行.短名,
            pai_xu: 新行.排序,
            chuang_jian_shi_jian: 新行.创建时间,
          },
        ],
        rowCount: 1,
      }
    }

    if (文本.includes('UPDATE "用户表情" b SET "排序"')) {
      const 用户ID = 参数[0] as string
      const 顺序 = 参数[1] as string[]
      顺序.forEach((id, 下标) => {
        const 行 = 表情行.find((e) => e['用户ID'] === 用户ID && String(e['ID']) === id)
        if (行) 行['排序'] = 下标
      })
      return { rows: [], rowCount: 顺序.length }
    }

    if (文本.includes('DELETE FROM "用户表情"')) {
      const 前 = 表情行.length
      表情行 = 表情行.filter((e) => !(e['ID'] === 参数[0] && e['用户ID'] === 参数[1]))
      const 删了 = 前 - 表情行.length
      return { rows: 删了 ? [{ ID: 参数[0] }] : [], rowCount: 删了 }
    }

    if (文本.includes('DELETE FROM "媒体文件"')) {
      媒体行 = 媒体行.filter((m) => !(m['ID'] === 参数[0] && m['上传者ID'] === 参数[1]))
      return { rows: [], rowCount: 1 }
    }

    throw new Error(`测试替身未覆盖的语句：${文本}`)
  }

  return {
    数据库: {
      query: 执行,
      // L-46：登记路径改走「单连接 + advisory 锁 + 显式事务」，替身必须支持同一种形态
      connect: async () => {
        连接计数.打开 += 1
        return {
          query: (文本: string, 参数: unknown[] = []) => 执行(文本, 参数, '事务'),
          release: () => {
            连接计数.释放 += 1
          },
        }
      },
    },
  }
})

vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../middleware/限流', () => ({
  liaoTianXianLiu: (_q: unknown, _r: unknown, 下一项: () => void) => 下一项(),
}))

vi.mock('../../services/账号封禁', () => ({
  chaXunZhangHaoFengJin: vi.fn(async () => ({ beiFengJin: false })),
  jiLuZhangHaoWeiGui: vi.fn(async () => undefined),
}))

vi.mock('../../services/IP封禁', () => ({
  获取IP: () => '127.0.0.1',
}))

vi.mock('../../services/媒体存储', () => {
  class JiaMeiTiCunChuCuoWu extends Error {
    readonly fanYiJian: string
    constructor(jian: string) {
      super(jian)
      this.name = 'MeiTiCunChuCuoWu'
      this.fanYiJian = jian
    }
  }
  return {
    MeiTiCunChuCuoWu: JiaMeiTiCunChuCuoWu,
    liuShiBaoCunMeiTi: vi.fn(async () => ({
      mediaId: 媒体甲二,
      sha256: 'c'.repeat(64),
      mime: 'image/png',
      daXiao: 12,
      leiBie: 'biaoqingshu',
      yuanShiWenJianMing: 'x.png',
    })),
    shengChengQianMingURL: vi.fn(
      (sha256: string, yongHuId: string) => `/api/媒体/${sha256}?u=${yongHuId}`,
    ),
  }
})

import luYou, { BIAO_QING_YU_JU } from '../表情'
import { chaXunZhangHaoFengJin, jiLuZhangHaoWeiGui } from '../../services/账号封禁'
import { liuShiBaoCunMeiTi, MeiTiCunChuCuoWu } from '../../services/媒体存储'
import { BIAO_QING_PEI_ZHI, BIAO_QING_MEI_TI_LEI_BIE } from '../../config/表情配置'
import { MEI_TI_PEI_ZHI, shiYunXuMIME } from '../../config/媒体配置'

let 当前用户: string | null = 用户甲

const 应用 = express()
应用.use(express.json())
应用.use((qingQiu, _xiangYing, xiaYiBu) => {
  qingQiu.url = decodeURI(qingQiu.url)
  xiaYiBu()
})
应用.use((qingQiu, _xiangYing, 下一项) => {
  if (当前用户) {
    ;(qingQiu as unknown as { yong_hu: { yongHuId: string } }).yong_hu = { yongHuId: 当前用户 }
  }
  下一项()
})
应用.use('/api/表情', luYou)

function 路径(子路径: string) {
  return encodeURI(`/api/表情${子路径}`)
}

function 取语句(片段: string) {
  return 语句日志.filter((项) => 项.文本.includes(片段))
}

function 上传(文件名: string, 内容: string | Buffer = 'png-bytes') {
  return request(应用)
    .post(路径('/我的'))
    .attach('file', Buffer.from(内容), { filename: 文件名, contentType: 'image/png' })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(chaXunZhangHaoFengJin).mockResolvedValue({ beiFengJin: false } as never)
  vi.mocked(liuShiBaoCunMeiTi).mockImplementation(async () => ({
    mediaId: 媒体甲二,
    sha256: 'c'.repeat(64),
    mime: 'image/png',
    daXiao: 12,
    leiBie: BIAO_QING_MEI_TI_LEI_BIE,
    yuanShiWenJianMing: 'x.png',
  }))
  语句日志.length = 0
  锁键.length = 0
  事务事件.length = 0
  连接计数.打开 = 0
  连接计数.释放 = 0
  抛错语句 = null
  当前用户 = 用户甲
  表情行 = [
    {
      ID: 表情甲一,
      用户ID: 用户甲,
      媒体ID: 媒体甲一,
      短名: '甲的表情',
      排序: 0,
      创建时间: '2026-09-20T00:00:00.000Z',
    },
  ]
  媒体行 = [
    { ID: 媒体甲一, SHA256: SHA_甲一, MIME: 'image/png', 上传者ID: 用户甲 },
    { ID: 媒体乙一, SHA256: SHA_乙一, MIME: 'image/png', 上传者ID: 用户乙 },
  ]
})

describe('FP-06b 我的表情：鉴权', () => {
  it('四条路由缺身份一律 401 且不落一条 SQL', async () => {
    当前用户 = null
    const 结果 = await Promise.all([
      request(应用).get(路径('/我的')),
      request(应用).post(路径('/我的')).attach('file', Buffer.from('x'), 'x.png'),
      request(应用).delete(路径(`/我的/${表情甲一}`)),
      request(应用).put(路径('/我的/排序')).send({ shunXu: [表情甲一] }),
    ])
    expect(结果.map((r) => r.status)).toEqual([401, 401, 401, 401])
    expect(语句日志).toHaveLength(0)
  })

  it('账号封禁中禁止添加表情', async () => {
    vi.mocked(chaXunZhangHaoFengJin).mockResolvedValue({ beiFengJin: true } as never)
    const 响应 = await 上传('x.png')
    expect(响应.status).toBe(403)
    expect(liuShiBaoCunMeiTi).not.toHaveBeenCalled()
    expect(取语句('INSERT INTO "用户表情"')).toHaveLength(0)
  })
})

describe('FP-06b 我的表情：跨账号隔离', () => {
  beforeEach(() => {
    表情行.push({
      ID: 表情乙一,
      用户ID: 用户乙,
      媒体ID: 媒体乙一,
      短名: '乙的表情',
      排序: 0,
      创建时间: '2026-09-20T00:00:01.000Z',
    })
  })

  it('查询只回本人表情', async () => {
    const 响应 = await request(应用).get(路径('/我的'))
    expect(响应.status).toBe(200)
    expect(响应.body.shu_ju.lie_biao).toHaveLength(1)
    expect(响应.body.shu_ju.lie_biao[0].id).toBe(表情甲一)
    expect(响应.body.shu_ju.lie_biao[0].mei_ti_url).toContain(SHA_甲一)
  })

  it('删除他人表情 404 且他人行仍在，响应不泄漏内部实现', async () => {
    const 响应 = await request(应用).delete(路径(`/我的/${表情乙一}`))
    expect(响应.status).toBe(404)
    expect(表情行.find((e) => e['ID'] === 表情乙一)).toBeDefined()
    expect(响应.body.ti_shi).toBeTruthy()
    expect(JSON.stringify(响应.body)).not.toMatch(/测试替身|Error|SQLSTATE|SELECT/)
  })

  it('排序夹带他人表情标识 404 且不改动任何顺序', async () => {
    const 响应 = await request(应用)
      .put(路径('/我的/排序'))
      .send({ shunXu: [表情甲一, 表情乙一] })
    expect(响应.status).toBe(404)
    expect(取语句('UPDATE "用户表情"')).toHaveLength(0)
    expect(表情行.find((e) => e['ID'] === 表情甲一)?.['排序']).toBe(0)
  })
})

describe('FP-06b 我的表情：输入校验', () => {
  it('删除路径参数非 UUID 一律 400，不进库', async () => {
    const 非法 = ['1', 'not-a-uuid', "'55555555-5555-4555-8555-555555555555'; DROP TABLE 用户表情"]
    for (const 值 of 非法) {
      const 响应 = await request(应用).delete(路径(`/我的/${encodeURIComponent(值)}`))
      expect(响应.status).toBe(400)
    }
    expect(取语句('DELETE FROM "用户表情"')).toHaveLength(0)
  })

  it('排序参数形态非法一律 400，不进库', async () => {
    const 非法体: unknown[] = [
      {},
      { shunXu: [] },
      { shunXu: 'abc' },
      { shunXu: ['zzz'] },
      { shunXu: [表情甲一, 表情甲一] },
      { shunXu: new Array(BIAO_QING_PEI_ZHI.meiYongHuZuiDaTiaoShu + 1).fill(表情甲一) },
    ]
    for (const 体 of 非法体) {
      const 响应 = await request(应用)
        .put(路径('/我的/排序'))
        .send(体 as Record<string, unknown>)
      expect(响应.status).toBe(400)
      expect(取语句('UPDATE "用户表情"')).toHaveLength(0)
    }
  })

  it('排序必须是本人全部表情的完整排列，缺项即 404 不改序', async () => {
    表情行.push({
      ID: 表情甲二,
      用户ID: 用户甲,
      媒体ID: 媒体甲一,
      短名: '',
      排序: 1,
      创建时间: '2026-09-20T00:00:02.000Z',
    })
    const 响应 = await request(应用).put(路径('/我的/排序')).send({ shunXu: [表情甲二] })
    expect(响应.status).toBe(404)
    expect(取语句('UPDATE "用户表情"')).toHaveLength(0)
  })

  it('完整排列提交后顺序按数组下标落库并回新序', async () => {
    表情行.push({
      ID: 表情甲二,
      用户ID: 用户甲,
      媒体ID: 媒体甲一,
      短名: '第二张',
      排序: 1,
      创建时间: '2026-09-20T00:00:02.000Z',
    })
    const 响应 = await request(应用)
      .put(路径('/我的/排序'))
      .send({ shunXu: [表情甲二, 表情甲一] })
    expect(响应.status).toBe(200)
    expect(响应.body.shu_ju.lie_biao.map((x: { id: string }) => x.id)).toEqual([
      表情甲二,
      表情甲一,
    ])
    expect(取语句('UPDATE "用户表情"')[0].参数).toEqual([用户甲, [表情甲二, 表情甲一]])
  })

  it('非 multipart 的添加请求 400', async () => {
    const 响应 = await request(应用)
      .post(路径('/我的'))
      .set('Content-Type', 'application/json')
      .send({})
    expect(响应.status).toBe(400)
    expect(liuShiBaoCunMeiTi).not.toHaveBeenCalled()
  })
})

describe('FP-06b 我的表情：MIME 与大小白名单与后端媒体配置同源', () => {
  it('添加走 biaoqingshu 类别，该类别的白名单与上限就是媒体配置口径', async () => {
    expect(BIAO_QING_MEI_TI_LEI_BIE).toBe('biaoqingshu')
    expect(MEI_TI_PEI_ZHI.daXiaoShangXianZiJie[BIAO_QING_MEI_TI_LEI_BIE]).toBe(10 * 1024 * 1024)
    expect(MEI_TI_PEI_ZHI.mimeBaiMingDan[BIAO_QING_MEI_TI_LEI_BIE]).toEqual([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ])
    for (const mime of [
      'image/svg+xml',
      'image/tiff',
      'image/heic',
      'image/avif',
      'application/x-msdownload',
    ]) {
      expect(shiYunXuMIME(BIAO_QING_MEI_TI_LEI_BIE, mime)).toBe(false)
    }
  })

  it('baseline 的类别 CHECK 里确实含该码（拼写漂移会静默存成对不上号的类别）', () => {
    const 基准 = readFileSync(
      resolve(__dirname, '../../../../database/000_baseline.sql'),
      'utf-8',
    )
    const 匹配 = 基准.match(/CREATE TABLE IF NOT EXISTS "媒体文件"[\s\S]*?\);/)
    expect(匹配, '未找到 媒体文件 建表语句').toBeTruthy()
    expect(匹配![0]).toContain(`'${BIAO_QING_MEI_TI_LEI_BIE}'`)
  })

  it('023 迁移存在且版本号固定为 023（024 已被性别归一占用，不得改号）', () => {
    const 清单 = readFileSync(
      resolve(__dirname, '../../../database/migrations/023_用户表情表.sql'),
      'utf-8',
    )
    expect(清单).toContain('CREATE TABLE IF NOT EXISTS "用户表情"')
    expect(清单).toContain('REFERENCES "媒体文件"("ID") ON DELETE CASCADE')
    expect(清单).toContain('REFERENCES "用户"("ID") ON DELETE CASCADE')
  })

  it('multipart 上传把类别与上传者传给存储层，短名取原始文件名', async () => {
    const 响应 = await 上传('我的狗头.png')
    expect(响应.status).toBe(200)
    expect(liuShiBaoCunMeiTi).toHaveBeenCalledTimes(1)
    const 参数 = vi.mocked(liuShiBaoCunMeiTi).mock.calls[0]
    expect(参数[3]).toBe(BIAO_QING_MEI_TI_LEI_BIE)
    expect(参数[4]).toBe(用户甲)
    expect(响应.body.shu_ju.yi_cun_zai).toBe(false)
    expect(响应.body.shu_ju.biao_qing.duan_ming).toBe('我的狗头.png')
    expect(响应.body.shu_ju.biao_qing.mei_ti_url).toContain('/api/媒体/')
  })

  it('存储层 MIME 不符回 400 翻译文案且不落库', async () => {
    vi.mocked(liuShiBaoCunMeiTi).mockRejectedValueOnce(new MeiTiCunChuCuoWu('meiTiMIMEBuZhiChi'))
    const 响应 = await 上传('x.svg')
    expect(响应.status).toBe(400)
    expect(响应.body.ti_shi).toBe('不支持的文件类型')
    expect(取语句('INSERT INTO "用户表情"')).toHaveLength(0)
  })

  it('视觉审核违规回 403 并记账号违规一次', async () => {
    vi.mocked(liuShiBaoCunMeiTi).mockRejectedValueOnce(new MeiTiCunChuCuoWu('淫秽色情'))
    const 响应 = await 上传('x.png')
    expect(响应.status).toBe(403)
    // 类别键是 tuPianWeiGui 整句的填充值，不再把裸类别名当完整文案回给玩家
    expect(响应.body.ti_shi).toBe('图片包含违规内容：淫秽色情，已拦截')
    expect(jiLuZhangHaoWeiGui).toHaveBeenCalledWith(
      expect.objectContaining({ yongHuId: 用户甲, yuanYin: '淫秽色情', leiXing: '用户表情' }),
    )
  })

  it('审核服务不可用回 403 但不记违规（不是用户的错）', async () => {
    vi.mocked(liuShiBaoCunMeiTi).mockRejectedValueOnce(new MeiTiCunChuCuoWu('审核服务不可用'))
    const 响应 = await 上传('x.png')
    expect(响应.status).toBe(403)
    expect(jiLuZhangHaoWeiGui).not.toHaveBeenCalled()
  })

  it('未知错误只回通用文案，不外泄内部实现', async () => {
    vi.mocked(liuShiBaoCunMeiTi).mockRejectedValueOnce(
      new Error('pg connection 10.0.0.5:5432 boom'),
    )
    const 响应 = await 上传('x.png')
    expect(响应.status).toBe(500)
    expect(JSON.stringify(响应.body)).not.toMatch(/10\.0\.0\.5|boom|Error/)
  })
})

describe('FP-06b 我的表情：数量上限与内容去重', () => {
  it('达到上限即 400 且零 INSERT', async () => {
    表情行 = Array.from({ length: BIAO_QING_PEI_ZHI.meiYongHuZuiDaTiaoShu }, (_, 下标) => ({
      ID: `row-${下标}`,
      用户ID: 用户甲,
      媒体ID: 媒体甲一,
      短名: '',
      排序: 下标,
      创建时间: '2026-09-20T00:00:00.000Z',
    }))
    const 响应 = await 上传('x.png')
    expect(响应.status).toBe(400)
    expect(响应.body.ti_shi).toBe('自定义表情数量已达上限，先删掉几个再加')
    expect(取语句('INSERT INTO "用户表情"')).toHaveLength(0)
  })

  it('同一 SHA256 重复添加回原条目并回收本次多建的媒体行', async () => {
    vi.mocked(liuShiBaoCunMeiTi).mockImplementationOnce(async () => ({
      mediaId: 媒体甲二,
      sha256: SHA_甲一,
      mime: 'image/png',
      daXiao: 12,
      leiBie: BIAO_QING_MEI_TI_LEI_BIE,
      yuanShiWenJianMing: 'x.png',
    }))
    const 响应 = await 上传('x.png')
    expect(响应.status).toBe(200)
    expect(响应.body.shu_ju.yi_cun_zai).toBe(true)
    expect(响应.body.shu_ju.biao_qing.id).toBe(表情甲一)
    expect(取语句('INSERT INTO "用户表情"')).toHaveLength(0)
    const 回收 = 取语句('DELETE FROM "媒体文件"')
    expect(回收).toHaveLength(1)
    expect(回收[0].参数).toEqual([媒体甲二, 用户甲])
  })

  it('短名按配置长度截断，超长不会把 VARCHAR 撑成落库错误', async () => {
    const 响应 = await 上传(`${'甲'.repeat(40)}.png`)
    expect(响应.status).toBe(200)
    const 插入 = 取语句('INSERT INTO "用户表情"')[0]
    const 短名 = String(插入.参数[2])
    expect(短名.length).toBeLessThanOrEqual(BIAO_QING_PEI_ZHI.duanMingZuiDaChangDu)
    expect(短名.startsWith('甲')).toBe(true)
  })

  it('emoji 文件名截断不得劈开代理对（半截代理落库即 invalid Unicode surrogate）', async () => {
    const 响应 = await 上传(`${'🙂'.repeat(30)}.png`)
    expect(响应.status).toBe(200)
    const 短名 = String(取语句('INSERT INTO "用户表情"')[0].参数[2])
    expect(短名.length).toBeLessThanOrEqual(BIAO_QING_PEI_ZHI.duanMingZuiDaChangDu * 2)
    expect(短名).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/)
  })
})

/**
 * L-46：内容级幂等此前是「先按内容查一条、没有再插」的非原子读改写，并发两次同一张图可留双行
 * （UNIQUE(用户ID,媒体ID) 管不到，同内容每次拿到的媒体行标识都不同）。根因修法是把整段读改写
 * 包进同一条连接的 pg_advisory_xact_lock 事务。本组钉住路由形态；库侧的真实互斥由
 * routes/__tests__/表情真库.test.ts 的并发用例把守。
 */
describe('L-46 表情登记：读改写在库侧串行化', () => {
  function 第几条(片段: string) {
    return 语句日志.findIndex((项) => 项.文本.includes(片段))
  }

  it('新内容登记：开事务→取用户锁→查→计数→插入→提交，全程同一条事务连接且连接归还', async () => {
    const 响应 = await 上传('新图.png')
    expect(响应.status).toBe(200)
    expect(响应.body.shu_ju.yi_cun_zai).toBe(false)
    expect(事务事件).toEqual(['BEGIN', 'LOCK', 'COMMIT'])
    expect(锁键).toEqual([`biaoqing-dengji:${用户甲}`])
    expect(第几条('pg_advisory_xact_lock')).toBeLessThan(第几条('m."SHA256" = $2'))
    expect(第几条('m."SHA256" = $2')).toBeLessThan(第几条('COUNT(*)::int AS shu'))
    expect(第几条('COUNT(*)::int AS shu')).toBeLessThan(第几条('INSERT INTO "用户表情"'))
    for (const 片段 of ['pg_advisory_xact_lock', 'm."SHA256" = $2', 'COUNT(*)::int AS shu', 'INSERT INTO "用户表情"']) {
      expect(取语句(片段).every((项) => 项.来源 === '事务'), `${片段} 不在事务连接上`).toBe(true)
    }
    expect(连接计数).toEqual({ 打开: 1, 释放: 1 })
  })

  it('锁按用户而非按内容：同一用户串行、不同用户各拿各的键', async () => {
    当前用户 = 用户乙
    await 上传('乙的图.png')
    expect(锁键).toEqual([`biaoqing-dengji:${用户乙}`])
    expect(锁键[0]).not.toBe(`biaoqing-dengji:${用户甲}`)
  })

  it('命中已有内容：零 INSERT，但回收本次媒体行同样在锁内与提交之内', async () => {
    vi.mocked(liuShiBaoCunMeiTi).mockImplementationOnce(async () => ({
      mediaId: 媒体甲二,
      sha256: SHA_甲一,
      mime: 'image/png',
      daXiao: 12,
      leiBie: BIAO_QING_MEI_TI_LEI_BIE,
      yuanShiWenJianMing: 'x.png',
    }))
    const 响应 = await 上传('x.png')
    expect(响应.status).toBe(200)
    expect(响应.body.shu_ju.yi_cun_zai).toBe(true)
    expect(取语句('INSERT INTO "用户表情"')).toHaveLength(0)
    expect(事务事件).toEqual(['BEGIN', 'LOCK', 'COMMIT'])
    const 回收 = 取语句('DELETE FROM "媒体文件"')[0]
    expect(回收.来源).toBe('事务')
    expect(语句日志.indexOf(回收)).toBeGreaterThan(第几条('pg_advisory_xact_lock'))
    expect(语句日志.indexOf(回收)).toBeLessThan(第几条('COMMIT'))
  })

  it('数量已满：回滚收尾、零 INSERT、连接归还', async () => {
    表情行 = Array.from({ length: BIAO_QING_PEI_ZHI.meiYongHuZuiDaTiaoShu }, (_, 下标) => ({
      ID: `row-${下标}`,
      用户ID: 用户甲,
      媒体ID: 媒体甲一,
      短名: '',
      排序: 下标,
      创建时间: '2026-09-20T00:00:00.000Z',
    }))
    const 响应 = await 上传('x.png')
    expect(响应.status).toBe(400)
    expect(取语句('INSERT INTO "用户表情"')).toHaveLength(0)
    expect(事务事件).toEqual(['BEGIN', 'LOCK', 'ROLLBACK'])
    expect(连接计数).toEqual({ 打开: 1, 释放: 1 })
  })

  it('事务内任一步失败必须回滚并释放连接（aborted 连接回池会毒化后续每次复用）', async () => {
    抛错语句 = 'INSERT INTO "用户表情"'
    const 响应 = await 上传('x.png')
    expect(响应.status).toBe(500)
    expect(事务事件).toEqual(['BEGIN', 'LOCK', 'ROLLBACK'])
    expect(事务事件).not.toContain('COMMIT')
    expect(连接计数).toEqual({ 打开: 1, 释放: 1 })
  })

  it('锁语句形态单源：路由发的就是 BIAO_QING_YU_JU.取登记锁 那一句', async () => {
    await 上传('x.png')
    const 源 = readFileSync(resolve(__dirname, '../表情.ts'), 'utf-8')
    expect(源).toContain('pg_advisory_xact_lock(hashtextextended($1, 0))')
    expect(取语句('pg_advisory_xact_lock')[0].文本).toBe(BIAO_QING_YU_JU.取登记锁)
  })

  it('全后端只有一处 INSERT "用户表情"，第二处即绕过锁的登记入口', () => {
    function 遍历TS(目录: string): string[] {
      const 结果: string[] = []
      for (const 项 of readdirSync(目录, { withFileTypes: true })) {
        const 完整 = resolve(目录, 项.name)
        if (项.isDirectory()) {
          if (项.name === '__tests__' || 项.name === 'node_modules') continue
          结果.push(...遍历TS(完整))
        } else if (项.name.endsWith('.ts')) {
          结果.push(完整)
        }
      }
      return 结果
    }
    const 源码根 = resolve(__dirname, '../..')
    const 命中 = 遍历TS(源码根)
      .filter((文件) => readFileSync(文件, 'utf-8').includes('INSERT INTO "用户表情"'))
      .map((文件) => relative(源码根, 文件).replace(/\\/g, '/'))
      .sort()
    expect(命中).toEqual(['routes/表情.ts'])
  })
})

describe('FP-06b 表情消息的 AI 文本化仍只有 对话渲染 一个入口（源码扫描）', () => {
  const 源码根 = resolve(__dirname, '../..')

  function 遍历TS(目录: string): string[] {
    const 结果: string[] = []
    for (const 项 of readdirSync(目录, { withFileTypes: true })) {
      const 完整 = resolve(目录, 项.name)
      if (项.isDirectory()) {
        if (项.name === '__tests__' || 项.name === 'node_modules') continue
        结果.push(...遍历TS(完整))
      } else if (项.name.endsWith('.ts')) {
        结果.push(完整)
      }
    }
    return 结果
  }

  it('全后端 [表情包] 占位符只有 AI视觉辅助 一处实现，无第二处渲染', () => {
    const 命中 = 遍历TS(源码根)
      .filter((文件) => readFileSync(文件, 'utf-8').includes('[表情包]'))
      .map((文件) => relative(源码根, 文件).replace(/\\/g, '/'))
      .sort()
    expect(命中).toEqual(['services/AI视觉辅助.ts'])
  })

  it('对话渲染 复用同一实现且不自带占位符字面量', () => {
    const 源 = readFileSync(resolve(__dirname, '../../services/对话渲染.ts'), 'utf-8')
    expect(源).toContain('meiTiZhanShiWenBen')
    expect(源).not.toContain("'[表情包]'")
    expect(源).not.toContain("'[图片]'")
  })

  it('表情路由与前端一致地把表情感知交给既有媒体消息链路，不自行拼 prompt', () => {
    const 源 = readFileSync(resolve(__dirname, '../表情.ts'), 'utf-8')
    expect(源).not.toContain('dui_hua_li_shi')
    expect(源).not.toContain('zhanShiXiaoXiZhengWen')
    expect(源).not.toContain('[表情包]')
  })
})

