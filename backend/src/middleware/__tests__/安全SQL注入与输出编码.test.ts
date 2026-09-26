import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'

/**
 * `middleware/安全.ts` 的行为测试：输出编码纵深 + SQL 注入检出阶梯。
 *
 * 钉的是三条对外契约：
 *  ① 输出转义只作用在白名单用户内容键上（键名/结构不被动过），且逐层递归到内容块数组里；
 *  ② 聊天路径只认「强破坏性特征单条」或「弱特征 ≥2 共现」，正常文学表达不误伤；
 *  ③ 非聊天路径按普通片段判定；命中后按 IP 违规阶梯返回 403，已封禁 IP 给封禁文案，
 *     中间件自身异常一律 500 内部文案，绝不把内部错误或凭据外泄。
 */

const 假 = vi.hoisted(() => ({ 记录违规: vi.fn(), 获取IP: vi.fn(() => '1.2.3.4') }))
vi.mock('../../services/IP封禁', () => ({ 记录违规: 假.记录违规, 获取IP: 假.获取IP }))
vi.mock('../../utils/debug日志', () => ({ debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }))

import {
  anQuanZhongJianJian,
  qingQiuHanYouSQLZhuRu,
  shuChuBianMaZhongJianJian,
  taoYiHTML,
  taoYiShuChu,
} from '../安全'
import { huoQuFanYi } from '../../config/translations'

type 响应桩 = Response & { 码: number; body: unknown }

function 造响应(): 响应桩 {
  const 桩 = {
    码: 0,
    body: null as unknown,
    statusCode: 200,
    status(码: number) {
      桩.码 = 码
      return 桩
    },
    json(体: unknown) {
      桩.body = 体
      return 桩
    },
  }
  return 桩 as unknown as 响应桩
}

function 造请求(覆盖: Partial<Request> = {}): Request {
  return {
    body: {},
    query: {},
    params: {},
    method: 'POST',
    baseUrl: '/api/好友',
    path: '/消息',
    ...覆盖,
  } as unknown as Request
}

beforeEach(() => {
  vi.clearAllMocks()
  假.记录违规.mockResolvedValue({ 已封禁: false } as never)
  假.获取IP.mockReturnValue('1.2.3.4')
})

describe('输出编码：只转义白名单用户内容键，其余结构原样保留', () => {
  it('HTML 五类元字符与斜杠全部转义（= 不属五类，保持原样）', () => {
    expect(taoYiHTML(`<a href="x">&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;&#x2F;a&gt;')
  })

  it('标量与数组逐层递归；非白名单键的原值不被改写', () => {
    expect(taoYiShuChu('<b>')).toBe('&lt;b&gt;')
    expect(taoYiShuChu(['<b>', 1, null])).toEqual(['&lt;b&gt;', 1, null])
    expect(taoYiShuChu({ 内部键: '<b>', 数量: 3, 空: null })).toEqual({
      内部键: '<b>',
      数量: 3,
      空: null,
    })
  })

  it('snake_case 与 camelCase 两种键名都覆盖，并下钻到内容块数组', () => {
    const 出参 = taoYiShuChu({
      nei_rong: '<b>',
      neiRong: '<i>',
      qian_ming: '"',
      qianMing: '"',
      yong_hu_ming: "'",
      yongHuMing: "'",
      ni_cheng: '&',
      niCheng: '&',
      shou_ji_hao: '<',
      biao_ti: '>',
      yuan_yin: '/',
      yuanYin: '/',
      li_you: '<',
      liYou: '<',
      nei_rong_kuai: [{ lei_xing: 'wenzi', nei_rong: '<块内文字>' }],
      neiRongKuai: [{ lei_xing: 'wenzi', neiRong: '<块内文字>' }],
    }) as Record<string, unknown>
    for (const 键 of [
      'nei_rong',
      'neiRong',
      'qian_ming',
      'qianMing',
      'yong_hu_ming',
      'yongHuMing',
      'ni_cheng',
      'niCheng',
      'shou_ji_hao',
      'biao_ti',
      'yuan_yin',
      'yuanYin',
      'li_you',
      'liYou',
    ]) {
      expect(String(出参[键]), `${键} 未被转义`).not.toContain('<')
      expect(String(出参[键]), `${键} 未被转义`).not.toContain('"')
    }
    expect((出参.nei_rong_kuai as Array<Record<string, unknown>>)[0].nei_rong).toBe('&lt;块内文字&gt;')
    expect((出参.neiRongKuai as Array<Record<string, unknown>>)[0].neiRong).toBe('&lt;块内文字&gt;')
  })

  it('中间件把 res.json 包一层后放行，出参仍带转义', () => {
    const 桩 = 造响应()
    let 放行 = false
    shuChuBianMaZhongJianJian(造请求(), 桩, (() => {
      放行 = true
    }) as NextFunction)
    expect(放行).toBe(true)
    桩.json({ nei_rong: '<b>', 内部: '<b>' })
    expect(桩.body).toEqual({ nei_rong: '&lt;b&gt;', 内部: '<b>' })
  })
})

describe('注入检出：聊天路径只认强特征或弱特征共现', () => {
  const 聊天请求 = (体: unknown): Request =>
    造请求({ body: 体 as never, baseUrl: '/api', path: '/聊天/会话/abc/消息' })

  it('正常文学表达里的 select / or 1=1 不误伤', async () => {
    const 放行 = vi.fn()
    await anQuanZhongJianJian(聊天请求({ nei_rong: '我 select 一门课，or 1=1 也行吧' }), 造响应(), 放行 as NextFunction)
    expect(放行).toHaveBeenCalled()
    expect(假.记录违规).not.toHaveBeenCalled()
  })

  it('单个弱特征仍放行，两个弱特征共现即 403 并记违规', async () => {
    const 单个 = 造响应()
    await anQuanZhongJianJian(聊天请求({ nei_rong: 'sleep(5) 真好' }), 单个, vi.fn() as NextFunction)
    expect(单个.码).toBe(0)

    const 共现 = 造响应()
    await anQuanZhongJianJian(聊天请求({ nei_rong: "sleep(5) 和 benchmark(1) 一起" }), 共现, vi.fn() as NextFunction)
    expect(共现.码).toBe(403)
    expect(共现.body).toMatchObject({ ti_shi: huoQuFanYi('anQuan', 'gaoWeiSQLZhuRu') })
    expect(假.记录违规).toHaveBeenCalledWith('1.2.3.4', 'SQL注入', '严重')
  })

  it('强破坏性特征单条命中即 403，且 GET 不按聊天路径判', async () => {
    const 强 = 造响应()
    await anQuanZhongJianJian(聊天请求({ nei_rong: "1'; DROP TABLE 角色;--" }), 强, vi.fn() as NextFunction)
    expect(强.码).toBe(403)

    const 只读 = 造响应()
    const 放行 = vi.fn()
    await anQuanZhongJianJian(
      造请求({ method: 'GET', body: { q: "'; DROP TABLE 角色;--" } as never }),
      只读,
      放行 as NextFunction,
    )
    expect(只读.码).toBe(403)
    expect(放行).not.toHaveBeenCalled()
  })

  it('违规阶梯判定为已封禁时改用封禁文案，不把违规细节带给调用方', async () => {
    假.记录违规.mockResolvedValue({ 已封禁: true } as never)
    const 桩 = 造响应()
    await anQuanZhongJianJian(聊天请求({ nei_rong: `x'; DROP TABLE 角色;--` }), 桩, vi.fn() as NextFunction)
    expect(桩.码).toBe(403)
    expect(桩.body).toMatchObject({ ti_shi: huoQuFanYi('anQuan', 'ipYiBeiFengJin') })
  })
})

describe('注入检出：非聊天路径与异常出口', () => {
  it('非聊天路径按普通片段判定，query 与 params 同样在检测面内', () => {
    expect(qingQiuHanYouSQLZhuRu(造请求({ body: { a: 'SELECT id FROM 用户' } as never }))).toBe(true)
    expect(qingQiuHanYouSQLZhuRu(造请求({ query: { a: 'UNION SELECT 1' } as never }))).toBe(true)
    expect(qingQiuHanYouSQLZhuRu(造请求({ params: { a: ['"; --'] } as never }))).toBe(true)
    expect(qingQiuHanYouSQLZhuRu(造请求({ body: { a: '今天天气不错' } as never }))).toBe(false)
    expect(qingQiuHanYouSQLZhuRu(造请求({ body: { a: 1, b: true, c: null } as never }))).toBe(false)
  })

  it('畸形编码路径不抛错，按非聊天路径处理后放行', async () => {
    const 桩 = 造响应()
    const 放行 = vi.fn()
    await anQuanZhongJianJian(造请求({ baseUrl: '/api', path: '/%E0%A4%A' }), 桩, 放行 as NextFunction)
    expect(放行).toHaveBeenCalled()
    expect(桩.码).toBe(0)
  })

  it('中间件自身抛错一律 500 内部文案，绝不把内部错误外泄', async () => {
    假.记录违规.mockRejectedValue(new Error('SELECT password=secret'))
    const 桩 = 造响应()
    await anQuanZhongJianJian(造请求({ body: { a: 'SELECT id FROM 用户' } as never }), 桩, vi.fn() as NextFunction)
    expect(桩.码).toBe(500)
    expect(JSON.stringify(桩.body)).not.toContain('password')
    expect(JSON.stringify(桩.body)).not.toContain('SELECT')
  })
})
