import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({ response: vi.fn() }))
vi.mock('../../utils/xiangying', () => ({ shiBaiXiangYing: 假.response }))

import { 获取请求字符串, 聊天内容验证中间件, 性别验证中间件, 手机号验证中间件, 用户名验证中间件, 验证聊天内容, 验证手机号, 验证用户名, 验证性别 } from '../输入验证'

const 响应 = { status: vi.fn(), json: vi.fn(), send: vi.fn() }
const 下一步 = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  响应.status.mockReturnValue(响应)
})

describe('输入验证业务分支', () => {
  it('纯验证器覆盖类型、格式和白名单', () => {
    expect(验证手机号('13800138000')).toBe(true)
    expect(验证手机号(123)).toBe(false)
    expect(验证用户名('用户_abc')).toBe(true)
    expect(验证用户名('bad name')).toBe(false)
    expect(验证用户名(1)).toBe(false)
    expect(验证性别('nv')).toBe(true)
    expect(验证性别('未知')).toBe(false)
    expect(验证聊天内容('文本')).toBe(true)
    expect(验证聊天内容('x'.repeat(501))).toBe(false)
  })

  it('请求字符串按 body、备用键和 query 顺序读取', () => {
    const request = (body: Record<string, unknown>, query: Record<string, unknown>) => ({ body, query }) as never
    expect(获取请求字符串(request({ a: 'body' }, {}), 'a', 'b')).toBe('body')
    expect(获取请求字符串(request({ b: '备用' }, {}), 'a', 'b')).toBe('备用')
    expect(获取请求字符串(request({}, { a: 'query' }), 'a')).toBe('query')
    expect(获取请求字符串(request({}, {}), 'a')).toBeUndefined()
  })

  it('手机号、用户名和性别中间件覆盖成功与拒绝', () => {
    手机号验证中间件({ body: { shouJiHao: '13800138000' } } as never, 响应, 下一步)
    手机号验证中间件({ body: { shou_ji_hao: 'bad' } } as never, 响应, 下一步)
    用户名验证中间件({ body: { yongHuMing: '用户' } } as never, 响应, 下一步)
    用户名验证中间件({ body: { yong_hu_ming: 'bad name' } } as never, 响应, 下一步)
    性别验证中间件({ body: { 性别: 'nv' } } as never, 响应, 下一步)
    性别验证中间件({ body: { xing_bie: 'unknown' } } as never, 响应, 下一步)
    expect(下一步).toHaveBeenCalledTimes(3)
  })

  it('聊天中间件覆盖媒体、内容块、超长、正常和空内容', () => {
    聊天内容验证中间件({ body: { leiXing: 'tuPian' }, query: {} } as never, 响应, 下一步)
    聊天内容验证中间件({ body: { nei_rong_kuai: [{ lei_xing: 'wenzi', nei_rong: '块文本' }] }, query: {} } as never, 响应, 下一步)
    聊天内容验证中间件({ body: { nei_rong_kuai: [{ lei_xing: 'wenzi', nei_rong: 'x'.repeat(1000) }] }, query: {} } as never, 响应, 下一步)
    聊天内容验证中间件({ body: { neiRong: '正常' }, query: {} } as never, 响应, 下一步)
    聊天内容验证中间件({ body: {}, query: {} } as never, 响应, 下一步)
    expect(下一步).toHaveBeenCalledTimes(3)
  })
})
