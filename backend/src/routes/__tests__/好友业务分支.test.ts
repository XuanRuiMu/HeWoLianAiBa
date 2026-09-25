import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import type { Express } from 'express'
import request from 'supertest'

const 假 = vi.hoisted(() => ({
  db: { query: vi.fn() },
  qingLi: vi.fn(),
  yanZheng引用: vi.fn(),
  gou块上下文: vi.fn(),
  shenHe: vi.fn(),
  panDuan: vi.fn(),
  duQu可见: vi.fn(),
  chaXunHaoYou: vi.fn(),
  chaXun封禁: vi.fn(),
  jiLu违规: vi.fn(),
  liuShi媒体: vi.fn(),
  mediaPan: vi.fn(),
  tongZhi: vi.fn(),
  haoYou媒体归属: vi.fn(),
  haoYou媒体审核: vi.fn(),
  搜索结果: [] as Record<string, unknown>[],
  已好友: true,
  已有申请: false,
}))

vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../services/可见性', () => ({
  panDuanKeJian: 假.panDuan,
  shiHeFaKeJianXing: (v: unknown) => ['gong_kai', 'si_mi', 'jin_bu_fen_ren', 'hao_you'].includes(String(v)),
  chaXunShiHaoYou: 假.chaXunHaoYou,
  duQuQianMingKeJianXinXi: 假.duQu可见,
}))
vi.mock('../../services/消息', () => ({
  HAO_YOU_BEI_YIN_YONG_MIAN_XIANG: {},
  gouKuaiShangXiaWen: 假.gou块上下文,
  haoYouKuaiTouYing: () => '好友',
  qingLiXiaoXiKuaiXieRu: 假.qingLi,
  yanZhengBeiYinYong: 假.yanZheng引用,
  yingSheKuaiChuCan: (x: unknown) => x,
}))
vi.mock('../../services/消息内容块', () => ({ kuaiShenHeWenBen: (x: unknown) => String(x) }))
vi.mock('../../services/安全审核', () => ({ shenHeNeiRongAnQuan: 假.shenHe }))
vi.mock('../../services/账号封禁', () => ({ chaXunZhangHaoFengJin: 假.chaXun封禁, jiLuZhangHaoWeiGui: 假.jiLu违规 }))
vi.mock('../../services/IP封禁', () => ({ 获取IP: () => '127.0.0.1' }))
vi.mock('../../services/媒体存储', () => ({
  liuShiBaoCunMeiTi: 假.liuShi媒体,
  MeiTiCunChuCuoWu: class extends Error {},
  shengChengQianMingURL: (sha: string) => `/api/媒体/${sha}`,
}))
vi.mock('../../services/媒体审核出参', () => ({ panDingMeiTiShenHeChuCan: 假.mediaPan }))
vi.mock('../../services/通知', () => ({ chuangJianTongZhi: 假.tongZhi }))
vi.mock('../../services/好友媒体', () => ({
  yanZhengHaoYouMeiTiGuiShu: 假.haoYou媒体归属,
  shenHeHaoYouMeiTi: 假.haoYou媒体审核,
}))
vi.mock('../../utils/debug日志', () => ({ debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('../../middleware/限流', () => ({ liaoTianXianLiu: (_q: unknown, _r: unknown, 下一步: () => void) => 下一步() }))

import 路由 from '../好友'

const 用户ID = '11111111-1111-4111-8111-111111111111'
const 好友ID = '22222222-2222-4222-8222-222222222222'
const 申请ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const 消息ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

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
  应用.use('/api/好友', 路由)
  return 应用
}

function 请(方法: 'get' | 'post' | 'put' | 'delete', 路径: string, 登录: string | null = 用户ID, 数据?: unknown) {
  const 实例 = request(建应用(登录))
  return (实例[方法] as (路径: string) => ReturnType<typeof request>)(encodeURI(路径)).send(数据 as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  假.db.query.mockImplementation(async (sql: string, params: unknown[] = []) => {
    const text = String(sql)
    if (text.includes('SELECT u."ID"')) return { rows: 假.搜索结果, rowCount: 假.搜索结果.length }
    if (text.includes('SELECT 1 FROM "好友申请" WHERE "状态" = \'accepted\'')) return { rows: 假.已好友 ? [{ '?column?': 1 }] : [], rowCount: 假.已好友 ? 1 : 0 }
    if (text.includes('SELECT "ID" FROM "用户" WHERE "ID"')) return { rows: [{ ID: 好友ID }], rowCount: 1 }
    if (text.includes('SELECT "公开账号" FROM "用户设置"')) return { rows: [{ 公开账号: true }], rowCount: 1 }
    if (text.includes('SELECT "ID", "状态" FROM "好友申请"')) return { rows: 假.已有申请 ? [{ ID: 申请ID }] : [], rowCount: 假.已有申请 ? 1 : 0 }
    if (text.includes('UPDATE "好友申请" SET "状态" = \'accepted\'')) return { rows: [{ 申请者ID: 好友ID }], rowCount: 1 }
    if (text.includes('UPDATE "好友申请" SET "状态" = \'rejected\'')) return { rows: [{ ID: 申请ID }], rowCount: 1 }
    if (text.includes('SELECT a."ID", a."申请者ID"')) return { rows: [{ ID: 申请ID, 申请者ID: 好友ID, 创建时间: '2026-01-01', 用户名: '好友', 昵称: '好友昵称', 头像: null }], rowCount: 1 }
    if (text.includes('SELECT a."ID", a."接收者ID"')) return { rows: [{ ID: 申请ID, 接收者ID: 好友ID, 状态: 'pending', 创建时间: '2026-01-01', 用户名: '好友', 昵称: '好友昵称', 头像: null }], rowCount: 1 }
    if (text.includes('SELECT DISTINCT CASE')) return { rows: [{ 好友ID, 用户名: '好友', 昵称: '好友昵称', 头像: null, 签名: '签名', 签名可见性: 'gong_kai', 签名白名单: [] }], rowCount: 1 }
    if (text.includes('FROM "好友消息" m')) return { rows: [{ ID: 消息ID, 发送者ID: 好友ID, 接收者ID: 用户ID, 内容: '消息', 类型: 'wenben', 媒体ID: null, 已读: false, 撤回: false, 创建时间: '2026-01-01T00:00:00.000Z', 内容块: null, 被引用消息ID: null }], rowCount: 1 }
    if (text.includes('INSERT INTO "好友消息"')) return { rows: [{ ID: 消息ID, 创建时间: '2026-01-01T00:00:00.000Z' }], rowCount: 1 }
    if (text.includes('SELECT "发送者ID", "创建时间" FROM "好友消息"')) return { rows: [{ 发送者ID: 用户ID, 创建时间: new Date().toISOString() }], rowCount: 1 }
    if (text.includes('SELECT "ID" FROM "用户" WHERE "ID" = ANY')) return { rows: [], rowCount: 0 }
    return { rows: [], rowCount: 0 }
  })
  假.搜索结果 = [
    { ID: 好友ID, 手机号: '13800138000', 用户名: '好友', 昵称: '好友昵称', 头像: null, 签名: '签名', 签名可见性: 'gong_kai', 签名白名单: [], 公开账号: true, 公开手机号: false },
  ]
  假.已好友 = true
  假.已有申请 = false
  假.panDuan.mockReturnValue(true)
  假.duQu可见.mockResolvedValue({ qianMing: '签名', keJianXing: 'gong_kai', baiMingDan: [] })
  假.chaXunHaoYou.mockResolvedValue(true)
  假.chaXun封禁.mockResolvedValue({ beiFengJin: false })
  假.jiLu违规.mockResolvedValue(undefined)
  假.shenHe.mockResolvedValue({ wei_gui: false })
  假.qingLi.mockResolvedValue({ cheng_gong: true, kuai: null, jianYing: null })
  假.yanZheng引用.mockResolvedValue({ cheng_gong: true, id: null })
  假.gou块上下文.mockResolvedValue({})
  假.haoYou媒体归属.mockResolvedValue({ he_fa: true })
  假.haoYou媒体审核.mockResolvedValue({ wei_gui: false })
  假.tongZhi.mockResolvedValue(undefined)
})

describe('好友搜索与申请流程', () => {
  it('搜索覆盖未认证、空查询、隐私过滤、签名和数据库异常', async () => {
    await 请('get', '/api/好友/搜索?q=好友', null).expect(401)
    await 请('get', '/api/好友/搜索').expect(400)
    await 请('get', '/api/好友/搜索?q=好友').expect(200)
    假.搜索结果[0].公开账号 = false
    await 请('get', '/api/好友/搜索?q=好友').expect(200)
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await 请('get', '/api/好友/搜索?q=好友').expect(500)
  })

  it('申请覆盖参数、自荐、目标不存在、拒绝、重复、待处理和成功', async () => {
    await 请('post', '/api/好友/申请', null, { jieShouZheId: 好友ID }).expect(401)
    await 请('post', '/api/好友/申请', 用户ID, { jieShouZheId: 'bad' }).expect(400)
    await 请('post', '/api/好友/申请', 用户ID, { jieShouZheId: 用户ID }).expect(400)
    假.db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await 请('post', '/api/好友/申请', 用户ID, { jie_shou_zhe_id: 好友ID }).expect(404)
    假.db.query.mockResolvedValueOnce({ rows: [{ ID: 好友ID }], rowCount: 1 }).mockResolvedValueOnce({ rows: [{ 公开账号: false }], rowCount: 1 })
    await 请('post', '/api/好友/申请', 用户ID, { jieShouZheId: 好友ID }).expect(403)
    假.已好友 = true
    await 请('post', '/api/好友/申请', 用户ID, { jieShouZheId: 好友ID }).expect(409)
    假.已好友 = false
    假.已有申请 = true
    await 请('post', '/api/好友/申请', 用户ID, { jieShouZheId: 好友ID }).expect(409)
    假.已有申请 = false
    await 请('post', '/api/好友/申请', 用户ID, { jieShouZheId: 好友ID }).expect(200)
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await 请('post', '/api/好友/申请', 用户ID, { jieShouZheId: 好友ID }).expect(500)
  })

  it('申请列表、接受、拒绝和删除覆盖非法 UUID、资源不存在、成功与异常', async () => {
    await 请('get', '/api/好友/申请/收到的', null).expect(401)
    await 请('get', '/api/好友/申请/收到的').expect(200)
    await 请('get', '/api/好友/申请/发出的').expect(200)
    await 请('post', '/api/好友/申请/bad/接受').expect(400)
    await 请('post', `/api/好友/申请/${申请ID}/接受`).expect(200)
    await 请('post', `/api/好友/申请/${申请ID}/拒绝`).expect(200)
    假.db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await 请('post', `/api/好友/申请/${申请ID}/接受`).expect(404)
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await 请('post', `/api/好友/申请/${申请ID}/拒绝`).expect(500)
    await 请('delete', `/api/好友/${好友ID}`).expect(200)
  })
})

describe('好友列表、消息和撤回', () => {
  it('好友列表和消息列表覆盖非好友、结果与异常', async () => {
    await 请('get', '/api/好友/列表', null).expect(401)
    await 请('get', '/api/好友/列表').expect(200)
    await 请('get', `/api/好友/消息/${好友ID}`, 用户ID).expect(200)
    假.已好友 = false
    await 请('get', `/api/好友/消息/${好友ID}`).expect(403)
    假.已好友 = true
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await 请('get', `/api/好友/消息/${好友ID}`).expect(500)
  })

  it('发送好友消息覆盖输入、好友关系、封禁、清洗、审核、引用、落库和异常', async () => {
    const 路径 = '/api/好友/消息'
    await 请('post', 路径, null, { jieShouZheId: 好友ID, neiRong: 'x' }).expect(401)
    await 请('post', 路径, 用户ID, { jieShouZheId: 'bad' }).expect(400)
    await 请('post', 路径, 用户ID, { jieShouZheId: 好友ID, leiXing: 'bad', neiRong: 'x' }).expect(400)
    假.已好友 = false
    await 请('post', 路径, 用户ID, { jieShouZheId: 好友ID, neiRong: 'x' }).expect(403)
    假.已好友 = true
    假.chaXun封禁.mockResolvedValueOnce({ beiFengJin: true })
    await 请('post', 路径, 用户ID, { jieShouZheId: 好友ID, neiRong: 'x' }).expect(403)
    假.qingLi.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '块非法' })
    await 请('post', 路径, 用户ID, { jieShouZheId: 好友ID, neiRong: 'x', nei_rong_kuai: [] }).expect(400)
    假.shenHe.mockResolvedValueOnce({ wei_gui: true, lei_xing: '违规' })
    await 请('post', 路径, 用户ID, { jieShouZheId: 好友ID, neiRong: '违规' }).expect(403)
    假.shenHe.mockResolvedValueOnce({ wei_gui: true, lei_xing: '审核服务不可用' })
    await 请('post', 路径, 用户ID, { jieShouZheId: 好友ID, neiRong: '违规' }).expect(500)
    假.yanZheng引用.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '引用非法' })
    假.qingLi.mockResolvedValue({ cheng_gong: true, kuai: null, jianYing: null })
    假.shenHe.mockResolvedValue({ wei_gui: false })
    假.yanZheng引用.mockResolvedValue({ cheng_gong: true, id: null })
    await 请('post', 路径, 用户ID, { jieShouZheId: 好友ID, neiRong: 'x', beiYongXiaoXiId: 消息ID }).expect(400)
    await 请('post', 路径, 用户ID, { jie_shou_zhe_id: 好友ID, nei_rong: 'x' }).expect(200)
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await 请('post', 路径, 用户ID, { jieShouZheId: 好友ID, neiRong: 'x' }).expect(500)
  })

  it('撤回与已读覆盖非法 ID、无记录、越权、超时、成功与异常', async () => {
    await 请('put', '/api/好友/消息/bad/撤回').expect(400)
    假.db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await 请('put', `/api/好友/消息/${消息ID}/撤回`).expect(404)
    假.db.query.mockResolvedValueOnce({ rows: [{ 发送者ID: 好友ID, 创建时间: new Date().toISOString() }], rowCount: 1 })
    await 请('put', `/api/好友/消息/${消息ID}/撤回`).expect(403)
    假.db.query.mockResolvedValueOnce({ rows: [{ 发送者ID: 用户ID, 创建时间: '2000-01-01T00:00:00.000Z' }], rowCount: 1 })
    await 请('put', `/api/好友/消息/${消息ID}/撤回`).expect(400)
    await 请('put', `/api/好友/消息/${消息ID}/撤回`).expect(200)
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await 请('put', `/api/好友/消息/${消息ID}/撤回`).expect(500)
    await 请('put', `/api/好友/消息/已读/${好友ID}`).expect(200)
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await 请('put', `/api/好友/消息/已读/${好友ID}`).expect(500)
  })
})
