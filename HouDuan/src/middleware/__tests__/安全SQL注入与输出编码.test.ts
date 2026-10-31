import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'


const 假 = vi.hoisted(() => ({ 记录违规: vi.fn(), 获取IP: vi.fn(() => '1.2.3.4') }))
vi.mock('../../services/IP封禁', () => ({ 记录违规: 假.记录违规, 获取IP: 假.获取IP }))
vi.mock('../../utils/debug日志', () => ({ debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }))

import {
  构造安全出参,
  anQuanZhongJianJian,
  qingQiuHanYouSQLZhuRu,
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

describe('出参清洗：原样送达玩家文本，只剥控制字符', () => {
  it('HTML 元字符一律原样保留（渲染层文本插值负责显示，服务端不改数据）', () => {
    const 原文 = `<a href="x">&'</a>`
    expect(构造安全出参(原文)).toBe(原文)
  })

  it('玩家文本里的尖括号与引号不被改写，且反复经过清洗不叠加', () => {
    const 原文 = '<喜欢你> & "永远"'
    const 一次 = 构造安全出参({ nei_rong: 原文 }) as Record<string, unknown>
    expect(一次.nei_rong).toBe(原文)
    const 二次 = 构造安全出参(一次) as Record<string, unknown>
    expect(二次.nei_rong).toBe(原文)
    expect(String(二次.nei_rong)).not.toContain('&lt;')
    expect(String(二次.nei_rong)).not.toContain('&amp;')
  })

  it('标量与数组逐层递归；结构键名不被改写', () => {
    expect(构造安全出参('<b>')).toBe('<b>')
    expect(构造安全出参(['<b>', 1, null])).toEqual(['<b>', 1, null])
    expect(构造安全出参({ 内部键: '<b>', 数量: 3, 空: null })).toEqual({
      内部键: '<b>',
      数量: 3,
      空: null,
    })
  })

  it('内容块数组同样下钻，块内文字原样保留', () => {
    const 出参 = 构造安全出参({
      nei_rong: '<b>',
      nei_rong_kuai: [{ lei_xing: 'wenzi', nei_rong: '<块内文字>' }],
      neiRongKuai: [{ lei_xing: 'wenzi', neiRong: '<块内文字>' }],
    }) as Record<string, unknown>
    expect(出参.nei_rong).toBe('<b>')
    expect((出参.nei_rong_kuai as Array<Record<string, unknown>>)[0].nei_rong).toBe('<块内文字>')
    expect((出参.neiRongKuai as Array<Record<string, unknown>>)[0].neiRong).toBe('<块内文字>')
  })

  it('控制字符被剥离，换行与制表保留（防伪字符不得进入任何出参）', () => {
    const 脏 = '前\u0000中\u001b[31m后\r\n次行\t制表'
    const 净 = 构造安全出参(脏) as string
    expect(净).toBe('前中[31m后\n次行\t制表')
    expect(净).not.toContain('\u0000')
    expect(净).not.toContain('\u001b')
    expect(净).not.toContain('\r')
    expect(净).toContain('\n')
  })

  it('脏值同构处理：undefined 与 NaN 不落到 JSON 的裸 undefined', () => {
    const 出参 = 构造安全出参({
      缺: undefined,
      非数: Number.NaN,
      无穷: Number.POSITIVE_INFINITY,
      大整: BigInt(42),
      函数: () => 1,
    }) as Record<string, unknown>
    expect(出参.缺).toBeUndefined()
    expect(出参.非数).toBeNull()
    expect(出参.无穷).toBeNull()
    expect(出参.大整).toBe('42')
    expect(出参.函数).toBeNull()
    expect(JSON.stringify(出参)).not.toContain('undefined')
    expect(JSON.stringify(出参)).not.toContain('NaN')
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
