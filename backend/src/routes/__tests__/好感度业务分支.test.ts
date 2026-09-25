import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import 路由 from '../好感度'

const 假 = vi.hoisted(() => ({
  open: vi.fn(),
  full: vi.fn(),
  update: vi.fn(),
  secret: vi.fn(),
}))

vi.mock('../../services/好感度', () => ({
  huoQuGongKaiHaoGanDuXinXi: 假.open,
  huoQuWanZhengHaoGanDu: 假.full,
  gengXinHaoGanDu: 假.update,
  sheZhiMiJiHaoGanDu: 假.secret,
}))
vi.mock('../../middleware/限流', () => ({ liaoTianXianLiu: (_q: unknown, _r: unknown, 下一步: () => void) => 下一步() }))
vi.mock('../../middleware/管理员', () => ({ guanLiZhiDuMenKong: (_q: unknown, _r: unknown, 下一步: () => void) => 下一步() }))
vi.mock('../../utils/debug日志', () => ({ debug日志: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const 用户ID = '11111111-1111-4111-8111-111111111111'
const 角色ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function 应用(登录: string | null = 用户ID) {
  const 实例 = express()
  实例.use(express.json())
  实例.use((请求, _响应, 下一步) => { 请求.url = decodeURI(请求.url); 下一步() })
  实例.use((请求, _响应, 下一步) => { if (登录) (请求 as unknown as { yong_hu: { yongHuId: string } }).yong_hu = { yongHuId: 登录 }; 下一步() })
  实例.use('/api/好感度', 路由)
  return 实例
}

function 请(方法: 'get' | 'post', 路径: string, 登录: string | null = 用户ID, 数据?: unknown) {
  const 实例 = request(应用(登录))
  return (实例[方法] as (路径: string) => ReturnType<typeof request>)(encodeURI(路径)).send(数据 as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  假.open.mockResolvedValue({ zong_fen: 10 })
  假.full.mockResolvedValue({ zong_fen: 20, 互动次数: 2 })
  假.update.mockResolvedValue({ cheng_gong: true, hao_gan_du: { zong_fen: 11 } })
  假.secret.mockResolvedValue({ cheng_gong: true, hao_gan_du: { zong_fen: 12 } })
})

describe('好感度路由分支', () => {
  it('公开和详情接口覆盖认证、资源不存在、成功与异常', async () => {
    await 请('get', `/api/好感度/${角色ID}`, null).expect(401)
    await 请('get', `/api/好感度/${角色ID}`).expect(200)
    假.open.mockResolvedValueOnce(null)
    await 请('get', `/api/好感度/${角色ID}`).expect(404)
    假.open.mockRejectedValueOnce(new Error('db'))
    await 请('get', `/api/好感度/${角色ID}`).expect(500)
    await 请('get', `/api/好感度/${角色ID}/详情`).expect(200)
    假.full.mockResolvedValueOnce(null)
    await 请('get', `/api/好感度/${角色ID}/详情`).expect(404)
    假.full.mockRejectedValueOnce(new Error('db'))
    await 请('get', `/api/好感度/${角色ID}/详情`).expect(500)
  })

  it('更新和秘籍接口覆盖输入范围、失败、成功和异常', async () => {
    await 请('post', `/api/好感度/${角色ID}/更新`, null, {}).expect(401)
    await 请('post', `/api/好感度/${角色ID}/更新`, 用户ID, { 信任度变化: 4 }).expect(400)
    假.update.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '失败', zhuang_tai_ma: 400 })
    await 请('post', `/api/好感度/${角色ID}/更新`, 用户ID, { 信任度变化: 1 }).expect(400)
    await 请('post', `/api/好感度/${角色ID}/更新`, 用户ID, { xin_ren_du_bian_hua: 1 }).expect(200)
    假.update.mockRejectedValueOnce(new Error('db'))
    await 请('post', `/api/好感度/${角色ID}/更新`, 用户ID, { 信任度变化: 1 }).expect(500)
    await 请('post', `/api/好感度/${角色ID}/秘籍`, 用户ID, {}).expect(200)
    假.secret.mockResolvedValueOnce({ cheng_gong: false, ti_shi: '失败' })
    await 请('post', `/api/好感度/${角色ID}/秘籍`, 用户ID, { 秘籍: 'x' }).expect(400)
    假.secret.mockRejectedValueOnce(new Error('db'))
    await 请('post', `/api/好感度/${角色ID}/秘籍`, 用户ID, { mi_ji: 'x' }).expect(500)
  })
})
