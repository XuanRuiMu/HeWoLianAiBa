import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import express from 'express'
import type { RequestHandler, Response } from 'express'
import request from 'supertest'

const 校验结果 = vi.hoisted(() => ({ 当前: { cheng_gong: true } as Record<string, unknown> }))
const 校验调用 = vi.hoisted(() => vi.fn())

vi.mock('../../services/人机验证', () => ({
  xiaoHaoRenJiTiaoZhan: 校验调用,
}))

vi.mock('../../services/短信', () => ({
  zhunHuaYanZhengMaYongTu: (zhi: unknown) => (zhi === 'chongZhiMiMa' ? 'chongZhiMiMa' : 'zhuCe'),
}))

vi.mock('../../utils/真实IP', () => ({
  huoQuZhenShiIP: () => '9.9.9.9',
}))

vi.mock('../../config/translations', () => ({
  huoQuFanYi: (_fenLei: string, jian: string) => jian,
}))

vi.mock('../../utils/xiangying', () => ({
  shiBaiXiangYing: (
    响应: Response,
    状态码: number,
    提示: string,
    错误码: string,
  ) => {
    响应.status(状态码).json({ code: 错误码, ti_shi: 提示 })
  },
}))

import { renJiYanZhengZhongJianJian } from '../人机验证'

function 建应用(后续: RequestHandler) {
  const 应用 = express()
  应用.use(express.json())
  应用.post('/send', renJiYanZhengZhongJianJian, 后续)
  return 应用
}

beforeEach(() => {
  校验调用.mockReset()
  校验结果.当前 = { cheng_gong: true }
  校验调用.mockImplementation(async () => 校验结果.当前)
})

describe('人机验证中间件', () => {
  it('校验失败返回400且不进入短信配额与发送链路', async () => {
    校验结果.当前 = { cheng_gong: false, yuanYin: 'daAnCuoWu' }
    const 后续 = vi.fn((_qingQiu, 响应: express.Response) => 响应.status(204).end())
    const 响应 = await request(建应用(后续))
      .post('/send')
      .send({ shouJiHao: '13800000000', yongTu: 'zhuCe', renJiPiaoJu: 'rj_0123456789abcdef0123456789abcdef', renJiDaAn: 'ABCD' })
    expect(响应.status).toBe(400)
    expect(响应.body.code).toBe('AUTH_HUMAN_VERIFICATION_FAILED')
    expect(后续).not.toHaveBeenCalled()
  })

  it('校验通过才放行，并把票据、答案、IP与用途交给校验服务', async () => {
    const 后续 = vi.fn((_qingQiu, 响应: express.Response) => 响应.status(204).end())
    const 响应 = await request(建应用(后续))
      .post('/send')
      .send({ shouJiHao: '13800000000', yongTu: 'chongZhiMiMa', renJiPiaoJu: 'rj_0123456789abcdef0123456789abcdef', renJiDaAn: 'ab2c' })
    expect(响应.status).toBe(204)
    expect(后续).toHaveBeenCalledTimes(1)
    expect(校验调用).toHaveBeenCalledWith(
      'rj_0123456789abcdef0123456789abcdef',
      'ab2c',
      '9.9.9.9',
      'chongZhiMiMa',
    )
  })

  it('缺少票据或答案直接拒绝且不触达校验服务', async () => {
    const 后续 = vi.fn((_qingQiu, 响应: express.Response) => 响应.status(204).end())
    const 响应 = await request(建应用(后续))
      .post('/send')
      .send({ shouJiHao: '13800000000', renJiDaAn: 'ABCD' })
    expect(响应.status).toBe(400)
    expect(后续).not.toHaveBeenCalled()
  })

  it('Redis异常返回503而不是放行', async () => {
    校验结果.当前 = { cheng_gong: false, yuanYin: 'neiBuCuoWu' }
    const 后续 = vi.fn((_qingQiu, 响应: express.Response) => 响应.status(204).end())
    const 响应 = await request(建应用(后续))
      .post('/send')
      .send({ shouJiHao: '13800000000', renJiPiaoJu: 'rj_0123456789abcdef0123456789abcdef', renJiDaAn: 'ABCD' })
    expect(响应.status).toBe(503)
    expect(响应.body.code).toBe('DEPENDENCY_REDIS_UNAVAILABLE')
    expect(后续).not.toHaveBeenCalled()
  })
})

describe('发送码路由顺序与公开白名单', () => {
  const 路由源码 = readFileSync(resolve(__dirname, '../../routes/认证.ts'), 'utf8')
  const 白名单元码 = readFileSync(resolve(__dirname, '../认证.ts'), 'utf8')

  it('人机校验必须排在短信限流与日配额之前', () => {
    const 行 = /luYou\.post\('\/发送码',([^\n]+)/.exec(路由源码)?.[1] ?? ''
    expect(行).toContain('手机号验证中间件')
    expect(行).toContain('faSongMaXianLiu')
    expect(行).toContain('renJiYanZhengZhongJianJian')
    expect(行).toContain('duanXinRiPeiEZhuJi')
    expect(行.indexOf('renJiYanZhengZhongJianJian')).toBeLessThan(行.indexOf('faSongMaXianLiu'))
    expect(行.indexOf('renJiYanZhengZhongJianJian')).toBeLessThan(行.indexOf('duanXinRiPeiEZhuJi'))
  })

  it('人机挑战与发送码都免登录，挑战领取按IP限流', () => {
    expect(白名单元码).toContain("{ fang_fa: 'GET', lu_jing: '/api/认证/人机挑战' }")
    const 挑战段 = /luYou\.get\('\/人机挑战',([^\n]+)/.exec(路由源码)?.[1] ?? ''
    expect(挑战段).toContain('renJiTiaoZhanXianLiu')
  })
})
