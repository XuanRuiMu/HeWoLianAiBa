import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import type { Express } from 'express'
import request from 'supertest'

const 假 = vi.hoisted(() => ({
  db: { query: vi.fn() },
  mediaError: class extends Error {
    fanYiJian = '违规图片'
  },
  chaXun封禁: vi.fn(),
  jiLu违规: vi.fn(),
  shenHe: vi.fn(),
  liuShi媒体: vi.fn(),
  mediaAudit: vi.fn(),
  chaXun好友: vi.fn(),
  duQu可见: vi.fn(),
  tiJiao申诉: vi.fn(),
}))

vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../services/可见性', () => ({
  KE_JIAN_XING_LIE_BIAO: ['gong_kai', 'si_mi', 'jin_bu_fen_ren', 'hao_you'],
  shiHeFaKeJianXing: (v: unknown) => ['gong_kai', 'si_mi', 'jin_bu_fen_ren', 'hao_you'].includes(String(v)),
  panDuanKeJian: () => true,
  chaXunShiHaoYou: 假.chaXun好友,
  duQuQianMingKeJianXinXi: 假.duQu可见,
}))
vi.mock('../../services/安全审核', () => ({ shenHeNeiRongAnQuan: 假.shenHe }))
vi.mock('../../services/媒体存储', () => ({
  liuShiBaoCunMeiTi: 假.liuShi媒体,
  MeiTiCunChuCuoWu: 假.mediaError,
  shengChengMeiTiYinYong: (sha: string) => `/api/媒体/${sha}`,
  zhongXinQianMingMeiTiURL: (ref: string) => `/api/媒体/${ref}`,
}))
vi.mock('../../services/媒体审核出参', () => ({ panDingMeiTiShenHeChuCan: 假.mediaAudit }))
vi.mock('../../services/账号封禁', () => ({ chaXunZhangHaoFengJin: 假.chaXun封禁, jiLuZhangHaoWeiGui: 假.jiLu违规, tiJiaoShenSu: 假.tiJiao申诉 }))
vi.mock('../../services/IP封禁', () => ({ 获取IP: () => '127.0.0.1' }))
vi.mock('../../utils/debug日志', () => ({ debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('../../middleware/限流', () => ({ liaoTianXianLiu: (_q: unknown, _r: unknown, 下一步: () => void) => 下一步() }))

import 路由, { KE_JIAN_XING_LIE_BIAO } from '../资料'

const 用户ID = '11111111-1111-4111-8111-111111111111'
const 目标ID = '22222222-2222-4222-8222-222222222222'

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
  应用.use('/api/资料', 路由)
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
    if (text.includes('SELECT COUNT(*) AS shu')) return { rows: [{ shu: 1 }], rowCount: 1 }
    if (text.includes('SELECT * FROM "用户设置"')) return { rows: [{ 气泡自己: 'blue', 气泡AI: 'pink' }], rowCount: 1 }
    if (text.includes('SELECT "ID", "用户名"')) return { rows: [{ ID: 目标ID, 用户名: '目标', 昵称: '目标昵称', 头像: null }], rowCount: 1 }
    if (text.includes('UPDATE "用户"')) return { rows: [], rowCount: 1 }
    return { rows: [], rowCount: 0 }
  })
  假.chaXun封禁.mockResolvedValue({ beiFengJin: false, jiBie: 1, weiGuiCiShu: 0, jieFengShiJian: null, shenSuZhuangTai: null })
  假.jiLu违规.mockResolvedValue(undefined)
  假.shenHe.mockResolvedValue({ wei_gui: false })
  假.liuShi媒体.mockResolvedValue({ mediaId: 'media', sha256: 'a'.repeat(64), mime: 'image/png', daXiao: 10, leiBie: 'tupian', yuanShiWenJianMing: 'a.png' })
  假.mediaAudit.mockReturnValue({ xuYaoJiWeiGui: true, zhuangTaiMa: 403, tiShi: '头像违规' })
  假.chaXun好友.mockResolvedValue(false)
  假.duQu可见.mockResolvedValue({ qianMing: '签名', keJianXing: 'gong_kai', baiMingDan: [] })
  假.tiJiao申诉.mockResolvedValue({ cheng_gong: true })
})

describe('签名和白名单', () => {
  it('签名覆盖未认证、封禁、长度、可见性、白名单、审核和数据库异常', async () => {
    await 请('put', '/api/资料/签名', null, { qianMing: 'x' }).expect(401)
    假.chaXun封禁.mockResolvedValueOnce({ beiFengJin: true })
    await 请('put', '/api/资料/签名', 用户ID, { qianMing: 'x' }).expect(403)
    await 请('put', '/api/资料/签名', 用户ID, { qianMing: 'a'.repeat(501) }).expect(400)
    await 请('put', '/api/资料/签名', 用户ID, { qianMing: 'x', keJianXing: 'bad' }).expect(400)
    await 请('put', '/api/资料/签名', 用户ID, { qianMing: 'x', keJianXing: 'jin_bu_fen_ren', baiMingDan: ['bad'] }).expect(400)
    假.shenHe.mockResolvedValueOnce({ wei_gui: true, lei_xing: '审核服务不可用' })
    await 请('put', '/api/资料/签名', 用户ID, { qianMing: 'x' }).expect(500)
    假.shenHe.mockResolvedValueOnce({ wei_gui: true, lei_xing: '违规' })
    await 请('put', '/api/资料/签名', 用户ID, { qianMing: 'x' }).expect(403)
    await 请('put', '/api/资料/签名', 用户ID, { qian_ming: 'x', ke_jian_xing: 'gong_kai' }).expect(200)
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await 请('put', '/api/资料/签名', 用户ID, { qianMing: 'x' }).expect(500)
  })

  it('独立白名单接口覆盖参数、成功和异常', async () => {
    await 请('put', '/api/资料/签名白名单', null, {}).expect(401)
    await 请('put', '/api/资料/签名白名单', 用户ID, { baiMingDan: 'bad' }).expect(400)
    await 请('put', '/api/资料/签名白名单', 用户ID, { bai_ming_dan: [] }).expect(200)
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await 请('put', '/api/资料/签名白名单', 用户ID, { baiMingDan: [] }).expect(500)
    expect(KE_JIAN_XING_LIE_BIAO).toContain('gong_kai')
  })
})

describe('头像上传', () => {
  function 上传(登录: string | null = 用户ID, 类型 = 'image/png') {
    return 请('post', '/api/资料/头像', 登录).attach('file', Buffer.from('x'), { filename: 'a', contentType: 类型 })
  }

  it('头像覆盖认证、封禁、格式、MIME、大小、存储和保存异常', async () => {
    await 上传(null).expect(401)
    假.chaXun封禁.mockResolvedValueOnce({ beiFengJin: true })
    await 上传().expect(403)
    await 请('post', '/api/资料/头像', 用户ID).expect(400)
    await 上传(用户ID, 'application/pdf').expect(400)
    await 上传().expect(200)
    假.liuShi媒体.mockResolvedValueOnce({ ...假.liuShi媒体(), daXiao: 3 * 1024 * 1024 })
    await 上传().expect(400)
    假.liuShi媒体.mockRejectedValueOnce(new 假.mediaError())
    await 上传().expect(403)
    假.liuShi媒体.mockRejectedValueOnce(new Error('storage'))
    await 上传().expect(500)
  })
})

describe('名片、封禁状态与申诉', () => {
  it('名片覆盖参数、未找到、好友关系、签名、气泡和异常', async () => {
    await 请('get', `/api/资料/名片/${目标ID}`, null).expect(401)
    await 请('get', '/api/资料/名片/bad').expect(400)
    await 请('get', `/api/资料/名片/${目标ID}`).expect(200)
    假.db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 })
    await 请('get', `/api/资料/名片/${目标ID}`).expect(200)
    假.duQu可见.mockResolvedValueOnce(null)
    await 请('get', `/api/资料/名片/${目标ID}`).expect(200)
    假.db.query.mockRejectedValueOnce(new Error('db'))
    await 请('get', `/api/资料/名片/${目标ID}`).expect(500)
  })

  it('封禁状态和申诉覆盖未认证、空参数、失败、成功和异常', async () => {
    await 请('get', '/api/资料/封禁状态', null).expect(401)
    await 请('get', '/api/资料/封禁状态').expect(200)
    假.chaXun封禁.mockRejectedValueOnce(new Error('db'))
    await 请('get', '/api/资料/封禁状态').expect(500)
    await 请('post', '/api/资料/申诉', null, { liYou: 'x' }).expect(401)
    await 请('post', '/api/资料/申诉', 用户ID, {}).expect(400)
    假.tiJiao申诉.mockResolvedValueOnce({ cheng_gong: false })
    await 请('post', '/api/资料/申诉', 用户ID, { liYou: 'x' }).expect(400)
    await 请('post', '/api/资料/申诉', 用户ID, { li_you: 'x' }).expect(200)
    假.tiJiao申诉.mockRejectedValueOnce(new Error('db'))
    await 请('post', '/api/资料/申诉', 用户ID, { liYou: 'x' }).expect(500)
  })
})
