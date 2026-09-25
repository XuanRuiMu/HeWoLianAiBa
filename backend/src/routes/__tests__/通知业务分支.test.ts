import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

const 假 = vi.hoisted(() => ({
  list: vi.fn(),
  read: vi.fn(),
  all: vi.fn(),
  send: vi.fn(),
  io: vi.fn(),
}))

vi.mock('../../services/通知', () => ({
  huoQuTongZhiLieBiao: 假.list,
  biaoJiTongZhiYiDu: 假.read,
  biaoJiSuoYouTongZhiYiDu: 假.all,
  guanLiYuanFaSongTongZhi: 假.send,
}))
vi.mock('../../socket/io', () => ({ huoQuIo: 假.io }))
vi.mock('../../utils/真实IP', () => ({ huoQuZhenShiIP: () => '127.0.0.1' }))
vi.mock('../../utils/debug日志', () => ({ debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('../../middleware/管理员', () => ({ guanLiGaoWeiMenKong: (_q: unknown, _r: unknown, 下一步: () => void) => 下一步() }))

import 路由 from '../通知'

const 用户ID = '11111111-1111-4111-8111-111111111111'
const 通知ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function 应用(登录: string | null = 用户ID) {
  const 实例 = express()
  实例.use(express.json())
  实例.use((请求, _响应, 下一步) => { 请求.url = decodeURI(请求.url); 下一步() })
  实例.use((请求, _响应, 下一步) => { if (登录) (请求 as unknown as { yong_hu: { yongHuId: string } }).yong_hu = { yongHuId: 登录 }; 下一步() })
  实例.use('/api/通知', 路由)
  return 实例
}

function 请(方法: 'get' | 'put' | 'post', 路径: string, 登录: string | null = 用户ID, 数据?: unknown) {
  const 实例 = request(应用(登录))
  return (实例[方法] as (路径: string) => ReturnType<typeof request>)(encodeURI(路径)).send(数据 as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  假.list.mockResolvedValue({ lie_biao: [{ id: 通知ID }], wei_du_shu: 1 })
  假.read.mockResolvedValue({ id: 通知ID })
  假.all.mockResolvedValue(undefined)
  假.send.mockResolvedValue({ cheng_gong: true, fa_song_shu: 1 })
  假.io.mockReturnValue({ to: vi.fn() })
})

describe('通知路由分支', () => {
  it('列表、单条已读和全部已读覆盖认证、数量解析、缺失、成功和异常', async () => {
    await 请('get', '/api/通知', null).expect(401)
    await 请('get', '/api/通知?xian_shi_shu=bad').expect(200)
    假.list.mockRejectedValueOnce(new Error('db'))
    await 请('get', '/api/通知').expect(500)
    await 请('put', '/api/通知/通知-id/已读', null).expect(401)
    await 请('put', `/api/通知/${通知ID}/已读`).expect(200)
    假.read.mockResolvedValueOnce(null)
    await 请('put', `/api/通知/${通知ID}/已读`).expect(404)
    假.read.mockRejectedValueOnce(new Error('db'))
    await 请('put', `/api/通知/${通知ID}/已读`).expect(500)
    await 请('put', '/api/通知/全部已读').expect(200)
    假.all.mockRejectedValueOnce(new Error('db'))
    await 请('put', '/api/通知/全部已读').expect(500)
  })

  it('管理员发送覆盖缺参、失败、成功和异常', async () => {
    await 请('post', '/api/通知/发送', null, {}).expect(401)
    await 请('post', '/api/通知/发送', 用户ID, {}).expect(400)
    假.send.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '失败', zhuang_tai_ma: 400 })
    await 请('post', '/api/通知/发送', 用户ID, { 目标: '用户', 标题: '标题', 内容: '内容' }).expect(400)
    await 请('post', '/api/通知/发送', 用户ID, { mu_biao: '用户', biao_ti: '标题', nei_rong: '内容', 接收者ID列表: [用户ID, 1] }).expect(200)
    假.send.mockRejectedValueOnce(new Error('db'))
    await 请('post', '/api/通知/发送', 用户ID, { 目标: '用户', 标题: '标题', 内容: '内容' }).expect(500)
  })
})
