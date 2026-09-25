import express from 'express'
import request from 'supertest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CUO_WU_DAI_MA } from '../../config/错误码注册表'
import { 日志追踪中间件 } from '../../middleware/日志追踪'
import jianKangLuYou from '../健康检查'

const 状态 = vi.hoisted(() => ({ shuJuKu: true, huanCun: true }))
const 数据库 = vi.hoisted(() => ({ query: vi.fn() }))
const Redis = vi.hoisted(() => ({ ping: vi.fn() }))

vi.mock('../../数据库', () => ({ 数据库: 数据库 }))
vi.mock('../../redis', () => ({ redis: Redis }))
vi.mock('../../utils/真实IP', () => ({ huoQuZhenShiIP: () => '8.8.8.8', shiDuanKeXinDaiLi: () => false }))
vi.mock('../../utils/debug日志', () => ({ debug日志: { error: vi.fn() } }))

function 建应用(): express.Express {
  const 应用 = express()
  应用.use(日志追踪中间件())
  应用.use(jianKangLuYou)
  return 应用
}

beforeEach(() => {
  状态.shuJuKu = true
  状态.huanCun = true
  数据库.query.mockImplementation(async () => {
    if (!状态.shuJuKu) throw new Error('SELECT password=secret')
    return { rows: [{ '?column?': 1 }] }
  })
  Redis.ping.mockImplementation(async () => {
    if (!状态.huanCun) throw new Error('redis://user:pass@localhost')
    return 'PONG'
  })
})

describe('FP-13 健康检查与Docker依赖错误契约', () => {
  it('依赖正常时保持既有健康成功响应', async () => {
    const 响应 = await request(建应用()).get('/readyz').set('X-Request-Id', 'health-0123456789abcdef')
    expect(响应.status).toBe(200)
    expect(响应.body).toEqual({
      zhuangTai: 'jianKang',
      shu_ju_ku: 'zhengChang',
      huan_cun: 'zhengChang',
      shi_jian_chuo: expect.any(String),
    })
    expect(响应.headers['x-request-id']).toBe('health-0123456789abcdef')
  })

  it.each([
    ['shuJuKu', CUO_WU_DAI_MA.DEPENDENCY_POSTGRES_UNAVAILABLE],
    ['huanCun', CUO_WU_DAI_MA.DEPENDENCY_REDIS_UNAVAILABLE],
  ] as const)('%s依赖失败返回可诊断稳定码', async (依赖, code) => {
    状态[依赖] = false
    const 响应 = await request(建应用()).get('/readyz')
    expect(响应.status).toBe(503)
    expect(响应.body).toMatchObject({
      cheng_gong: false,
      code,
      retryable: true,
      traceId: 响应.headers['x-request-id'],
      zhuangTai: 'yiChang',
    })
    expect(响应.body.message).toMatch(/[\u3400-\u9fff]/)
    expect(JSON.stringify(响应.body)).not.toMatch(/SELECT|password|secret|redis:\/\/|pass@/)
  })

  it('两个依赖同时失败使用聚合码且health与readyz一致', async () => {
    状态.shuJuKu = false
    状态.huanCun = false
    const 应用 = 建应用()
    const ready = await request(应用).get('/readyz')
    const health = await request(应用).get('/health')
    expect(ready.status).toBe(503)
    expect(health.status).toBe(503)
    expect(ready.body.code).toBe(CUO_WU_DAI_MA.DEPENDENCIES_UNAVAILABLE)
    expect(health.body.code).toBe(CUO_WU_DAI_MA.DEPENDENCIES_UNAVAILABLE)
  })

  it('metrics权限拒绝也返回统一错误契约', async () => {
    const 响应 = await request(建应用()).get('/metrics')
    expect(响应.status).toBe(403)
    expect(响应.body).toMatchObject({
      code: CUO_WU_DAI_MA.PERMISSION_DENIED,
      retryable: false,
      traceId: 响应.headers['x-request-id'],
    })
  })

  it('entrypoint与server启动路径登记Docker稳定启动码', () => {
    const 后端根 = resolve(__dirname, '..', '..', '..')
    const entrypoint = readFileSync(resolve(后端根, 'entrypoint.sh'), 'utf8')
    const server = readFileSync(resolve(后端根, 'src', 'server.ts'), 'utf8')
    expect(entrypoint).toContain(CUO_WU_DAI_MA.DOCKER_STARTUP_MIGRATION_SCRIPT_MISSING)
    expect(entrypoint).toContain(CUO_WU_DAI_MA.DOCKER_STARTUP_MIGRATION_FAILED)
    for (const code of [
      CUO_WU_DAI_MA.DOCKER_STARTUP_REDIS_TLS_INVALID,
      CUO_WU_DAI_MA.DOCKER_STARTUP_REDIS_UNAVAILABLE,
      CUO_WU_DAI_MA.DOCKER_STARTUP_POSTGRES_UNAVAILABLE,
      CUO_WU_DAI_MA.DOCKER_STARTUP_MODERATION_RESOURCE_UNAVAILABLE,
    ]) {
      expect(server).toContain(`DOCKER_STARTUP_${code.replace('DOCKER_STARTUP_', '')}`)
    }
  })
})
