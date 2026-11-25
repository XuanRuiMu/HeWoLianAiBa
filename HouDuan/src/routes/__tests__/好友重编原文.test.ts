import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

const { 数据库桩 } = vi.hoisted(() => ({ 数据库桩: { query: vi.fn() } }))

vi.mock('../../数据库', () => ({ 数据库: 数据库桩 }))

vi.mock('../../redis', () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
  },
}))

vi.mock('../../utils/debug日志', () => ({
  debug日志: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  jiLuYouXiJieJu: vi.fn(),
  jiLuXiaoXiCaoZuo: vi.fn(),
  jiLuSocketShiJian: vi.fn(),
}))

vi.mock('../../services/媒体存储', () => ({
  liuShiBaoCunMeiTi: vi.fn(),
  MeiTiCunChuCuoWu: class extends Error {},
  shengChengQianMingURL: vi.fn(() => '/mei-ti'),
}))

vi.mock('../../middleware/限流', () => ({
  liaoTianXianLiu: (_qingQiu: unknown, _xiangYing: unknown, xiaYiBu: () => void) => xiaYiBu(),
}))

import luYou from '../好友'

const YongHu = '11111111-1111-4111-8111-111111111111'
const DuiFang = '22222222-2222-4222-8222-222222222222'
const XiaoXi = '33333333-3333-4333-8333-333333333333'

function chuangJianYingYong() {
  const yingYong = express()
  yingYong.use(express.json())
  yingYong.use((qingQiu, _xiangYing, xiaYiBu) => {
    ;(qingQiu as unknown as { yong_hu: { 用户ID: string } }).yong_hu = { 用户ID: YongHu }
    xiaYiBu()
  })
  yingYong.use((qingQiu, _xiangYing, xiaYiBu) => {
    qingQiu.url = decodeURI(qingQiu.url)
    xiaYiBu()
  })
  yingYong.use('/好友', luYou)
  return yingYong
}

function hang(fuGai: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    发送者ID: YongHu,
    接收者ID: DuiFang,
    类型: 'wenben',
    内容: '撤回前的话',
    内容块: null,
    撤回: true,
    创建时间: new Date(Date.now() - 10_000).toISOString(),
    ...fuGai,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /好友/消息/:id/重编原文', () => {
  it('本人已撤回文字在时限内返回原文与服务器时间', async () => {
    数据库桩.query.mockResolvedValue({ rows: [hang()] })
    const xiangYing = await request(chuangJianYingYong()).get(`/好友/消息/${XiaoXi}/重编原文`)
    expect(xiangYing.status).toBe(200)
    expect(xiangYing.body.shu_ju.yuanWen).toBe('撤回前的话')
    expect(Number.isFinite(xiangYing.body.shu_ju.fuWuQiShiJianChuo)).toBe(true)
  })

  it('他人消息返回403，不返回原文', async () => {
    数据库桩.query.mockResolvedValue({ rows: [hang({ 发送者ID: DuiFang })] })
    const xiangYing = await request(chuangJianYingYong()).get(`/好友/消息/${XiaoXi}/重编原文`)
    expect(xiangYing.status).toBe(403)
    expect(JSON.stringify(xiangYing.body)).not.toContain('撤回前的话')
  })

  it('超时返回400', async () => {
    数据库桩.query.mockResolvedValue({
      rows: [hang({ 创建时间: new Date(Date.now() - 10 * 60 * 1000).toISOString() })],
    })
    const xiangYing = await request(chuangJianYingYong()).get(`/好友/消息/${XiaoXi}/重编原文`)
    expect(xiangYing.status).toBe(400)
  })

  it('语音/表情包/文件类型不可重编返回400', async () => {
    for (const leiXing of ['yuYin', 'biaoQingBao', 'wenJian']) {
      数据库桩.query.mockResolvedValue({ rows: [hang({ 类型: leiXing })] })
      const xiangYing = await request(chuangJianYingYong()).get(`/好友/消息/${XiaoXi}/重编原文`)
      expect(xiangYing.status).toBe(400)
    }
  })

  it('未撤回消息返回400', async () => {
    数据库桩.query.mockResolvedValue({ rows: [hang({ 撤回: false })] })
    const xiangYing = await request(chuangJianYingYong()).get(`/好友/消息/${XiaoXi}/重编原文`)
    expect(xiangYing.status).toBe(400)
  })

  it('图文撤回只取文字块并按行拼接，纯图返空', async () => {
    数据库桩.query.mockResolvedValue({
      rows: [
        hang({
          类型: 'tuPian',
          内容: '[图片]看看这张[图片]',
          内容块: [
            { lei_xing: 'tupian', mei_ti_id: 'mt-1' },
            { lei_xing: 'wenzi', nei_rong: '看看这张' },
          ],
        }),
      ],
    })
    const xiangYing = await request(chuangJianYingYong()).get(`/好友/消息/${XiaoXi}/重编原文`)
    expect(xiangYing.status).toBe(200)
    expect(xiangYing.body.shu_ju.yuanWen).toBe('看看这张')

    数据库桩.query.mockResolvedValue({
      rows: [hang({ 类型: 'tuPian', 内容: '[图片]', 内容块: [{ lei_xing: 'tupian', mei_ti_id: 'mt-1' }] })],
    })
    const chunTu = await request(chuangJianYingYong()).get(`/好友/消息/${XiaoXi}/重编原文`)
    expect(chunTu.status).toBe(200)
    expect(chunTu.body.shu_ju.yuanWen).toBe('')
  })

  it('文件消息即使3小时窗口内也不允许重编', async () => {
    数据库桩.query.mockResolvedValue({
      rows: [hang({ 类型: 'wenJian', 创建时间: new Date(Date.now() - 60 * 60 * 1000).toISOString() })],
    })
    const xiangYing = await request(chuangJianYingYong()).get(`/好友/消息/${XiaoXi}/重编原文`)
    expect(xiangYing.status).toBe(400)
  })

  it('非法消息ID返回400', async () => {
    const xiangYing = await request(chuangJianYingYong()).get('/好友/消息/not-uuid/重编原文')
    expect(xiangYing.status).toBe(400)
  })
})
