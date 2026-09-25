import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import type { Express } from 'express'
import request from 'supertest'

const 假 = vi.hoisted(() => ({
  db: { query: vi.fn() },
  users: vi.fn(),
  dialogues: vi.fn(),
  dialogue: vi.fn(),
  role: vi.fn(),
  testUser: vi.fn(),
  testLogin: vi.fn(),
  system: vi.fn(),
  auth: vi.fn(),
  deleteUser: vi.fn(),
  takeover: vi.fn(),
  takeoverUser: vi.fn(),
  heartbeat: vi.fn(),
  returnRole: vi.fn(),
  banList: vi.fn(),
  unban: vi.fn(),
  review: vi.fn(),
  audit: vi.fn(),
  redis: { scan: vi.fn(), get: vi.fn() },
  favorCache: vi.fn(),
  favor: vi.fn(),
  io: vi.fn(),
  stats: vi.fn(),
  retry: vi.fn(),
}))

vi.mock('../../数据库', () => ({ 数据库: 假.db }))
vi.mock('../../services/管理员', () => ({
  huoQuYongHuLieBiao: 假.users,
  huoQuDuiHuaLieBiao: 假.dialogues,
  huoQuDuiHuaXiangQing: 假.dialogue,
  huoQuJiaoSeXinXi: 假.role,
  chuangJianCeShiYongHu: 假.testUser,
  dengLuCeShiYongHu: 假.testLogin,
  shanChuYongHu: 假.deleteUser,
  huoQuXiTongZhuangTai: 假.system,
  sheZhiGuanLiYuanZhuangTai: 假.auth,
}))
vi.mock('../../services/夺舍', () => ({
  jieShuDuoShe: 假.returnRole,
  huoQuJiaoSeYongHuId: 假.takeoverUser,
  sheZhiDuoSheZhuangTai: 假.takeover,
  duoSheXinTiao: 假.heartbeat,
}))
vi.mock('../../services/账号封禁', () => ({
  lieChuFengJinShenSu: 假.banList,
  jieChuZhangHaoFengJin: 假.unban,
  shenHeShenSu: 假.review,
}))
vi.mock('../../services/审计日志', () => ({ jiLuShenJiRiZhi: 假.audit }))
vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('../../services/好感度缓存', () => ({ huoQuZengLiangQuXian: 假.favorCache }))
vi.mock('../../services/好感度', () => ({ huoQuWanZhengHaoGanDu: 假.favor }))
vi.mock('../../socket/聊天', () => ({ zhongDuanJiaoSeTiaoDuQi: vi.fn() }))
vi.mock('../../utils/真实IP', () => ({ huoQuZhenShiIP: () => '127.0.0.1' }))
vi.mock('../../utils/debug日志', () => ({ debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('../../middleware/限流', () => ({ guanLiCaoZuoXianLiu: (_q: unknown, _r: unknown, 下一步: () => void) => 下一步() }))
vi.mock('../../middleware/管理员', () => {
  const 门 = (请求: { yong_hu?: unknown }, 响应: { status: (码: number) => { json: (值: unknown) => unknown } }, 下一步: () => void) => {
    if (!请求.yong_hu) {
      响应.status(401).json({})
      return
    }
    下一步()
  }
  return { guanLiZhiDuMenKong: 门, guanLiGaoWeiMenKong: 门, guanLiFengJinMenKong: 门, guanLiFengJinShenHeMenKong: 门 }
})
vi.mock('../../services/用量统计', () => ({ huoQuJinRiHuiZong: 假.stats }))
vi.mock('../../services/重试队列', () => ({ duQuZhongShiDuiLieChangDu: 假.retry }))

import 路由 from '../管理员'

const 用户ID = '11111111-1111-4111-8111-111111111111'
const 角色ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function 建应用(登录: string | null = 用户ID): Express {
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
  应用.use('/api/管理员', 路由)
  return 应用
}

function 请(方法: 'get' | 'post' | 'delete', 路径: string, 登录: string | null = 用户ID, 数据?: unknown) {
  const 实例 = request(建应用(登录))
  return (实例[方法] as (路径: string) => ReturnType<typeof request>)(encodeURI(路径)).send(数据 as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  假.users.mockResolvedValue([{ id: 用户ID }])
  假.dialogues.mockResolvedValue([{ id: 'd' }])
  假.dialogue.mockResolvedValue({ id: 'd' })
  假.role.mockResolvedValue({ id: 角色ID })
  假.testUser.mockResolvedValue({ cheng_gong: true, yong_hu: { id: 用户ID }, chu_ShiMiMa: 'pass' })
  假.testLogin.mockResolvedValue({ cheng_gong: true, ling_pai: 'token', yong_hu: { id: 用户ID } })
  假.system.mockResolvedValue({ yong_hu_shu: 1 })
  假.auth.mockResolvedValue({ cheng_gong: true, jiao_se: 'chao_guan', yi_bian_geng: false })
  假.deleteUser.mockResolvedValue({ cheng_gong: true })
  假.takeover.mockResolvedValue({ qiang_zhan: true })
  假.takeoverUser.mockResolvedValue(用户ID)
  假.heartbeat.mockResolvedValue({ ok: true })
  假.returnRole.mockResolvedValue(true)
  假.banList.mockResolvedValue([{ id: 1 }])
  假.unban.mockResolvedValue(undefined)
  假.review.mockResolvedValue(undefined)
  假.audit.mockResolvedValue(undefined)
  假.redis.scan.mockResolvedValue(['0', [`ai_yu_suan:${用户ID}:2026-01-01`]])
  假.redis.get.mockResolvedValue('2')
  假.db.query.mockResolvedValue({ rows: [{ ID: 用户ID, 手机号: '13800138000', 用户名: 'test' }], rowCount: 1 })
  假.favor.mockResolvedValue({ zong_fen: 100, 互动次数: 2 })
  假.favorCache.mockResolvedValue({ muBiaoQuXian: 120, dangQianXiShu: 1, lianXuWeiDaBiao: false, pingJunShuaiJianHou: 1, lieBiao: [] })
  假.stats.mockResolvedValue([{ moXingLeiXing: 'writer', ciShu: 1, shuRuToken: 2, shuChuToken: 3, zongToken: 5, mingZhongToken: 1 }])
  假.retry.mockResolvedValue(0)
})

describe('管理只读接口', () => {
  it('用户、对话、角色和系统状态覆盖成功、资源不存在和异常', async () => {
    await 请('get', '/api/管理员/用户', null).expect(401)
    await 请('get', '/api/管理员/用户').expect(200)
    await 请('get', '/api/管理员/对话').expect(200)
    await 请('get', `/api/管理员/对话/${角色ID}`).expect(200)
    await 请('get', `/api/管理员/角色/${角色ID}`).expect(200)
    await 请('get', '/api/管理员/系统状态').expect(200)
    假.dialogue.mockResolvedValueOnce(null)
    await 请('get', `/api/管理员/对话/${角色ID}`).expect(404)
    假.role.mockResolvedValueOnce(null)
    await 请('get', `/api/管理员/角色/${角色ID}`).expect(404)
    假.users.mockRejectedValueOnce(new Error('db'))
    await 请('get', '/api/管理员/用户').expect(500)
    假.dialogues.mockRejectedValueOnce(new Error('db'))
    await 请('get', '/api/管理员/对话').expect(500)
    假.system.mockRejectedValueOnce(new Error('db'))
    await 请('get', '/api/管理员/系统状态').expect(500)
  })

  it('用量看板和增益曲线覆盖空数据、成功与异常', async () => {
    假.redis.scan.mockResolvedValueOnce(['0', []])
    await 请('get', '/api/管理员/用量看板').expect(200)
    await 请('get', `/api/管理员/增益曲线/${用户ID}/${角色ID}`).expect(200)
    假.favor.mockResolvedValueOnce(null)
    await 请('get', `/api/管理员/增益曲线/${用户ID}/${角色ID}`).expect(404)
    假.favor.mockRejectedValueOnce(new Error('db'))
    await 请('get', `/api/管理员/增益曲线/${用户ID}/${角色ID}`).expect(500)
    假.redis.scan.mockRejectedValueOnce(new Error('redis'))
    await 请('get', '/api/管理员/用量看板').expect(500)
  })
})

describe('管理写操作', () => {
  it('夺舍、心跳、归还、测试用户和测试登录覆盖成功、拒绝与异常', async () => {
    await 请('post', `/api/管理员/夺舍/${角色ID}`).expect(200)
    await 请('post', `/api/管理员/夺舍/${角色ID}/心跳`).expect(200)
    await 请('post', `/api/管理员/归还/${角色ID}`).expect(200)
    await 请('post', '/api/管理员/测试用户', 用户ID, {}).expect(400)
    await 请('post', '/api/管理员/测试用户', 用户ID, { shouJiHao: '13800138000', yongHuMing: 'test' }).expect(200)
    await 请('post', '/api/管理员/测试用户登录', 用户ID, {}).expect(400)
    await 请('post', '/api/管理员/测试用户登录', 用户ID, { shou_ji_hao: '13800138000' }).expect(200)
    假.heartbeat.mockResolvedValueOnce(null)
    await 请('post', `/api/管理员/夺舍/${角色ID}/心跳`).expect(403)
    假.returnRole.mockResolvedValueOnce(false)
    await 请('post', `/api/管理员/归还/${角色ID}`).expect(403)
    假.testUser.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '失败' })
    await 请('post', '/api/管理员/测试用户', 用户ID, { shouJiHao: '13800138000', yongHuMing: 'test' }).expect(400)
    假.testLogin.mockRejectedValueOnce(new Error('db'))
    await 请('post', '/api/管理员/测试用户登录', 用户ID, { shouJiHao: '13800138000' }).expect(500)
  })

  it('授权、回收、删除、封禁列表、解封和申诉审核覆盖参数、成功与异常', async () => {
    await 请('post', '/api/管理员/授权', 用户ID, {}).expect(400)
    await 请('post', '/api/管理员/授权', 用户ID, { yongHuId: 用户ID }).expect(200)
    await 请('post', '/api/管理员/回收', 用户ID, { yong_hu_id: 用户ID }).expect(200)
    await 请('delete', `/api/管理员/用户/${用户ID}`).expect(200)
    await 请('get', '/api/管理员/账号封禁').expect(200)
    await 请('post', '/api/管理员/账号封禁/解封', 用户ID, { yongHuId: 'bad' }).expect(400)
    await 请('post', '/api/管理员/账号封禁/解封', 用户ID, { yongHuId: 用户ID }).expect(200)
    await 请('post', '/api/管理员/申诉/审核', 用户ID, { yongHuId: 用户ID, tongGuo: 'bad' }).expect(400)
    await 请('post', '/api/管理员/申诉/审核', 用户ID, { yong_hu_id: 用户ID, tong_guo: true }).expect(200)
    假.auth.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '失败' })
    await 请('post', '/api/管理员/授权', 用户ID, { yongHuId: 用户ID }).expect(400)
    假.deleteUser.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '失败' })
    await 请('delete', `/api/管理员/用户/${用户ID}`).expect(400)
    假.banList.mockRejectedValueOnce(new Error('db'))
    await 请('get', '/api/管理员/账号封禁').expect(500)
    假.unban.mockRejectedValueOnce(new Error('db'))
    await 请('post', '/api/管理员/账号封禁/解封', 用户ID, { yongHuId: 用户ID }).expect(500)
    假.review.mockRejectedValueOnce(new Error('db'))
    await 请('post', '/api/管理员/申诉/审核', 用户ID, { yongHuId: 用户ID, tongGuo: true }).expect(500)
  })
})
