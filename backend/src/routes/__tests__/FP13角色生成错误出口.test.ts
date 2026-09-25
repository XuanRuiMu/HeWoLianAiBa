import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CUO_WU_DAI_MA, JiaoSeShengChengCuoWu } from '../../config/错误码注册表'
import { huoQuCuoWuXianRong } from '../../config/错误码注册表'
import { 日志追踪中间件 } from '../../middleware/日志追踪'
import type { RenZhengQingQiu } from '../../middleware/认证'
import jiaoSeLuYou from '../角色'

const 假 = vi.hoisted(() => ({
  shengCheng: vi.fn(),
  baoCun: vi.fn(),
  qingXiDuiXiang: vi.fn((zhi: unknown) => zhi),
}))

vi.mock('../../services/角色生成', () => ({
  shengChengJiaoSe: 假.shengCheng,
  baoCunJiaoSe: 假.baoCun,
  qingXiRenSheDuiXiang: 假.qingXiDuiXiang,
  qingXiRenSheWenBen: (zhi: string) => zhi,
}))

function 建应用(): express.Express {
  const 应用 = express()
  应用.use(日志追踪中间件())
  应用.use((qingQiu, _xiangYing, xiaYiBu) => {
    qingQiu.url = decodeURI(qingQiu.url)
    xiaYiBu()
  })
  应用.use(express.json())
  应用.use((qingQiu, _xiangYing, xiaYiBu) => {
    ;(qingQiu as RenZhengQingQiu).yong_hu = { yongHuId: '用户-1' } as never
    xiaYiBu()
  })
  应用.use('/api/生成角色', jiaoSeLuYou)
  return 应用
}

beforeEach(() => {
  vi.clearAllMocks()
  假.qingXiDuiXiang.mockImplementation((zhi: unknown) => zhi)
})

describe('FP-13 角色生成HTTP错误出口', () => {
  it('初始化失败返回阶段码、中文消息与同一追踪ID', async () => {
    假.shengCheng.mockImplementationOnce(() => {
      throw new JiaoSeShengChengCuoWu(CUO_WU_DAI_MA.ROLE_GENERATION_INITIALIZATION_FAILED)
    })
    const 响应 = await request(建应用())
      .post(encodeURI('/api/生成角色/MBTI生成'))
      .set('X-Request-Id', 'role-init-0123456789abc')
      .send({ 性别: '女', mbti类型: 'INTJ' })
    expect(响应.status).toBe(500)
    expect(响应.body).toMatchObject({
      cheng_gong: false,
      code: CUO_WU_DAI_MA.ROLE_GENERATION_INITIALIZATION_FAILED,
      message: huoQuCuoWuXianRong(CUO_WU_DAI_MA.ROLE_GENERATION_INITIALIZATION_FAILED).message,
      retryable: false,
      traceId: 'role-init-0123456789abc',
    })
  })

  it.each([
    [CUO_WU_DAI_MA.ROLE_GENERATION_MODEL_UNAVAILABLE, 503],
    [CUO_WU_DAI_MA.ROLE_GENERATION_MODEL_CALL_FAILED, 502],
    [CUO_WU_DAI_MA.ROLE_GENERATION_RESPONSE_INVALID, 502],
    [CUO_WU_DAI_MA.ROLE_GENERATION_PERSISTENCE_FAILED, 503],
  ] as const)('确认接口的%s保持阶段状态与重试语义', async (code, status) => {
    假.baoCun.mockRejectedValueOnce(new JiaoSeShengChengCuoWu(code))
    const 响应 = await request(建应用())
      .post(encodeURI('/api/生成角色/确认'))
      .set('X-Request-Id', 'role-save-0123456789abc')
      .send({ xuanZhongJiaoSe: { id: '', xing_bie: 'nv' } })
    expect(响应.status).toBe(status)
    expect(响应.body).toMatchObject({
      code,
      message: huoQuCuoWuXianRong(code).message,
      traceId: 'role-save-0123456789abc',
    })
    expect(响应.body.retryable).toBe(huoQuCuoWuXianRong(code).retryable)
    expect(JSON.stringify(响应.body)).not.toMatch(/SQL|password|token|api[_-]?key|\.ts/)
  })

  it('未知确认异常收敛为持久化阶段错误而非空态成功', async () => {
    假.baoCun.mockRejectedValueOnce(new Error('SELECT password=secret'))
    const 响应 = await request(建应用())
      .post(encodeURI('/api/生成角色/确认'))
      .send({ xuanZhongJiaoSe: { id: '', xing_bie: 'nv' } })
    expect(响应.status).toBe(503)
    expect(响应.body.code).toBe(CUO_WU_DAI_MA.ROLE_GENERATION_PERSISTENCE_FAILED)
    expect(响应.body.cheng_gong).toBe(false)
    expect(JSON.stringify(响应.body)).not.toMatch(/SELECT|password|secret/)
  })

  it('成功响应保持既有结构', async () => {
    假.shengCheng.mockReturnValueOnce({ id: '', xing_bie: 'nv', ming_zi: '测试角色' })
    const 生成 = await request(建应用()).post(encodeURI('/api/生成角色/MBTI生成')).send({ 性别: '女' })
    expect(生成.status).toBe(200)
    expect(生成.body).toEqual({ cheng_gong: true, shu_ju: { id: '', xing_bie: 'nv', ming_zi: '测试角色' } })
    假.baoCun.mockResolvedValueOnce({ id: '角色-1', xing_bie: 'nv', ming_zi: '测试角色' })
    const 确认 = await request(建应用()).post(encodeURI('/api/生成角色/确认')).send({ xuanZhongJiaoSe: { id: '', xing_bie: 'nv' } })
    expect(确认.status).toBe(200)
    expect(确认.body).toEqual({ cheng_gong: true, shu_ju: { id: '角色-1', xing_bie: 'nv', ming_zi: '测试角色' } })
  })
})
