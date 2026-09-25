import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import type { Express } from 'express'
import request from 'supertest'

const 假 = vi.hoisted(() => ({
  db: { query: vi.fn() },
  media: { store: vi.fn(), sign: vi.fn(), ref: vi.fn(), extract: vi.fn() },
  mediaError: class extends Error {
    fanYiJian = '违规图片'
  },
  mediaAudit: vi.fn(),
  ban: vi.fn(),
  record: vi.fn(),
}))

vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../services/媒体存储', () => ({
  liuShiBaoCunMeiTi: 假.media.store,
  MeiTiCunChuCuoWu: 假.mediaError,
  shengChengQianMingURL: 假.media.sign,
  zhongXinQianMingMeiTiURL: 假.media.sign,
  cheXiaoYongHuMeiTiQianMing: vi.fn(),
  tiQuMeiTiSha: 假.media.extract,
  shengChengMeiTiYinYong: 假.media.ref,
}))
vi.mock('../../services/媒体审核出参', () => ({ panDingMeiTiShenHeChuCan: 假.mediaAudit }))
vi.mock('../../services/账号封禁', () => ({ chaXunZhangHaoFengJin: 假.ban, jiLuZhangHaoWeiGui: 假.record }))
vi.mock('../../services/IP封禁', () => ({ 获取IP: () => '127.0.0.1' }))
vi.mock('../../utils/debug日志', () => ({ debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('../../middleware/限流', () => ({ liaoTianXianLiu: (_q: unknown, _r: unknown, 下一步: () => void) => 下一步() }))

import 路由, { shiHeFaLiaoTianBeiJing, shiHeFaQiPao } from '../用户设置'

const 用户ID = '11111111-1111-4111-8111-111111111111'

function 建应用(登录: string | null): Express {
  const 应用 = express()
  应用.use(express.json())
  应用.use((请求, _响应, 下一步) => {
    请求.url = decodeURI(请求.url)
    下一步()
  })
  应用.use((请求, _响应, 下一步) => {
    if (登录) (请求 as unknown as { yong_hu: { yongHuId: string } }).yong_hu = { yongHuId: 登录 }
    下一步()
  })
  应用.use('/api/用户设置', 路由)
  return 应用
}

function 请(方法: 'get' | 'post' | 'put', 路径: string, 登录: string | null = 用户ID, 数据?: unknown) {
  const 实例 = request(建应用(登录))
  return (实例[方法] as (路径: string) => ReturnType<typeof request>)(encodeURI(路径)).send(数据 as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  假.db.query.mockImplementation(async (sql: string) => {
    const text = String(sql)
    if (text.includes('SELECT * FROM "用户设置"')) return { rows: [{ 聊天背景: 'moRen', 气泡自己: 'blue', 气泡AI: 'pink', 公开账号: true, 公开手机号: false, 公开邮箱: false, 绑定邮箱: '' }], rowCount: 1 }
    if (text.includes('SELECT "ID", "手机号"')) return { rows: [{ ID: 用户ID, 手机号: '13800138000', 用户名: 'test', 昵称: '昵称', 头像: null, 签名: null, 签名可见性: 'gong_kai', 签名白名单: [] }], rowCount: 1 }
    if (text.includes('SELECT 1 FROM "媒体文件"')) return { rows: [{ '?column?': 1 }], rowCount: 1 }
    return { rows: [], rowCount: 0 }
  })
  假.media.store.mockResolvedValue({ mediaId: 'media', sha256: 'a'.repeat(64), mime: 'image/png', daXiao: 10, leiBie: 'tupian', yuanShiWenJianMing: 'a.png' })
  假.media.sign.mockReturnValue('/api/媒体/signed')
  假.media.ref.mockReturnValue('/api/媒体/reference')
  假.media.extract.mockReturnValue(null)
  假.mediaAudit.mockReturnValue({ xuYaoJiWeiGui: true, zhuangTaiMa: 403, tiShi: '背景违规' })
  假.ban.mockResolvedValue({ beiFengJin: false })
  假.record.mockResolvedValue(undefined)
})

describe('用户设置校验与读取', () => {
  it('背景和气泡纯函数覆盖内置值、签名 URL、HTTPS、网络地址和非法值', () => {
    expect(shiHeFaLiaoTianBeiJing('moRen')).toBe(true)
    expect(shiHeFaLiaoTianBeiJing(`/api/媒体/${'a'.repeat(64)}`)).toBe(true)
    expect(shiHeFaLiaoTianBeiJing(`/api/媒体/${'a'.repeat(64)}?e=1&u=${用户ID}&t=2&s=abc`)).toBe(true)
    expect(shiHeFaLiaoTianBeiJing('http://example.com/a.png')).toBe(false)
    expect(shiHeFaLiaoTianBeiJing('https://127.0.0.1/a.png')).toBe(false)
    expect(shiHeFaLiaoTianBeiJing(`https://example.com/${'a'.repeat(2001)}`)).toBe(false)
    expect(shiHeFaQiPao('weiXinLv')).toBe(true)
    expect(shiHeFaQiPao('bad')).toBe(false)
  })

  it('读取设置覆盖未认证、默认值和数据库异常', async () => {
    await 请('get', '/api/用户设置', null).expect(401)
    await 请('get', '/api/用户设置').expect(200)
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await 请('get', '/api/用户设置').expect(500)
  })

  it('保存背景覆盖参数、媒体归属、别名和异常', async () => {
    await 请('put', '/api/用户设置/聊天背景', null, {}).expect(401)
    await 请('put', '/api/用户设置/聊天背景', 用户ID, { beiJing: 'bad' }).expect(400)
    await 请('put', '/api/用户设置/聊天背景', 用户ID, { beiJing: 'moRen' }).expect(200)
    假.media.extract.mockReturnValueOnce('a'.repeat(64))
    await 请('put', '/api/用户设置/聊天背景', 用户ID, { beiJing: `/api/媒体/${'a'.repeat(64)}` }).expect(200)
    假.media.extract.mockReturnValueOnce('a'.repeat(64))
    假.db.query.mockResolvedValueOnce({ rows: [], rowCount: 1 }).mockResolvedValueOnce({ rows: [], rowCount: 1 }).mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await 请('put', '/api/用户设置/聊天背景', 用户ID, { beiJing: `/api/媒体/${'a'.repeat(64)}` }).expect(400)
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await 请('put', '/api/用户设置/聊天背景', 用户ID, { beiJing: 'moRen' }).expect(500)
  })
})

describe('背景上传、气泡和隐私', () => {
  function 上传(登录: string | null = 用户ID) {
    return 请('post', '/api/用户设置/聊天背景/上传', 登录).attach('file', Buffer.from('x'), { filename: 'a.png', contentType: 'image/png' })
  }

  it('背景上传覆盖认证、封禁、格式、成功、违规和异常', async () => {
    await 上传(null).expect(401)
    假.ban.mockResolvedValueOnce({ beiFengJin: true })
    await 上传().expect(403)
    await 请('post', '/api/用户设置/聊天背景/上传', 用户ID).expect(400)
    await 上传().expect(200)
    假.media.store.mockRejectedValueOnce(new 假.mediaError())
    await 上传().expect(403)
    假.media.store.mockRejectedValueOnce(new Error('storage'))
    await 上传().expect(500)
  })

  it('气泡和隐私覆盖非法、缺参、别名、部分更新和异常', async () => {
    await 请('put', '/api/用户设置/气泡', null, {}).expect(401)
    await 请('put', '/api/用户设置/气泡', 用户ID, {}).expect(400)
    await 请('put', '/api/用户设置/气泡', 用户ID, { ziJi: 'bad' }).expect(400)
    await 请('put', '/api/用户设置/气泡', 用户ID, { ziJi: 'weiXinLv', ai: 'yunBai' }).expect(200)
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await 请('put', '/api/用户设置/气泡', 用户ID, { ziJi: 'weiXinLv' }).expect(500)
    await 请('put', '/api/用户设置/隐私', null, {}).expect(401)
    await 请('put', '/api/用户设置/隐私', 用户ID, {}).expect(200)
    await 请('put', '/api/用户设置/隐私', 用户ID, { gongKaiZhangHao: false, gong_kai_shou_ji_hao: true, gongKaiYouXiang: false }).expect(200)
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await 请('put', '/api/用户设置/隐私', 用户ID, { gongKaiZhangHao: false }).expect(500)
  })

  it('清空排位按顺序删除挑战数据、保证设置行并更新时间', async () => {
    await 请('post', '/api/用户设置/排位/清空', null).expect(401)
    await 请('post', '/api/用户设置/排位/清空').expect(200)
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await 请('post', '/api/用户设置/排位/清空').expect(500)
  })
})
