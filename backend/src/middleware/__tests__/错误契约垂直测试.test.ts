import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import {
  CUO_WU_DAI_MA,
  dengLiCuoWuXianRongLieBiao,
  huoQuCuoWuXianRong,
  shiCuoWuDaiMa,
  type CuoWuDaiMa,
} from '../../config/错误码注册表'
import { shiBaiXiangYing } from '../../utils/xiangying'
import { 全YuZhanCuoWuChuLi } from '../错误处理'
import { qingQiuShangXiaWen, 日志追踪中间件 } from '../日志追踪'

function jianYingYong(): express.Express {
  const yingYong = express()
  yingYong.use(日志追踪中间件())
  return yingYong
}

describe('FP-13 错误码注册表', () => {
  it('错误码唯一、固定大写下划线且默认语义完整', () => {
    const daiMaLieBiao = Object.values(CUO_WU_DAI_MA)
    expect(new Set(daiMaLieBiao).size).toBe(daiMaLieBiao.length)
    for (const daiMa of daiMaLieBiao) {
      expect(daiMa).toMatch(/^[A-Z][A-Z0-9_]*$/)
      const xianRong = huoQuCuoWuXianRong(daiMa)
      expect(xianRong.httpStatus).toBeGreaterThanOrEqual(400)
      expect(xianRong.httpStatus).toBeLessThan(600)
      expect(typeof xianRong.retryable).toBe('boolean')
      expect(xianRong.message).toMatch(/[\u3400-\u9fff]/)
    }
    expect(dengLiCuoWuXianRongLieBiao.every((daiMa) => shiCuoWuDaiMa(daiMa))).toBe(true)
  })

  it('FP-11 稳定码由注册表复用且角色阶段码独立固定', () => {
    expect([
      CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_MING_CHENG_WU_XIAO,
      CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_MING_CHENG_CHANG,
      CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU,
      CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BIAN_GENG,
      CUO_WU_DAI_MA.ZHAN_JI_MO_REN_FEN_LEI_BU_NENG_SHAN_CHU,
      CUO_WU_DAI_MA.ZHAN_JI_FEN_LEI_BU_CUN_ZAI,
      CUO_WU_DAI_MA.ZHAN_JI_DANG_AN_BU_CUN_ZAI,
      CUO_WU_DAI_MA.ZHAN_JI_DANG_AN_BU_SHU_YU_FEN_LEI,
      CUO_WU_DAI_MA.ZHAN_JI_BU_NENG_YIDONG_DAO_DANG_QIAN_FEN_LEI,
      CUO_WU_DAI_MA.ZHAN_JI_PAI_XU_ID_CHONG_FU,
      CUO_WU_DAI_MA.ZHAN_JI_PAI_XU_JI_LU_BU_WU_ZHEN,
    ]).toEqual([
      'ZHAN_JI_FEN_LEI_MING_CHENG_WU_XIAO',
      'ZHAN_JI_FEN_LEI_MING_CHENG_CHANG',
      'ZHAN_JI_FEN_LEI_MING_CHENG_CHONG_FU',
      'ZHAN_JI_FEN_LEI_BIAN_GENG',
      'ZHAN_JI_MO_REN_FEN_LEI_BU_NENG_SHAN_CHU',
      'ZHAN_JI_FEN_LEI_BU_CUN_ZAI',
      'ZHAN_JI_DANG_AN_BU_CUN_ZAI',
      'ZHAN_JI_DANG_AN_BU_SHU_YU_FEN_LEI',
      'ZHAN_JI_BU_NENG_YIDONG_DAO_DANG_QIAN_FEN_LEI',
      'ZHAN_JI_PAI_XU_ID_CHONG_FU',
      'ZHAN_JI_PAI_XU_JI_LU_BU_WU_ZHEN',
    ])
    expect([
      CUO_WU_DAI_MA.ROLE_GENERATION_INITIALIZATION_FAILED,
      CUO_WU_DAI_MA.ROLE_GENERATION_MODEL_CALL_FAILED,
      CUO_WU_DAI_MA.ROLE_GENERATION_RESPONSE_INVALID,
      CUO_WU_DAI_MA.ROLE_GENERATION_PERSISTENCE_FAILED,
    ]).toEqual([
      'ROLE_GENERATION_INITIALIZATION_FAILED',
      'ROLE_GENERATION_MODEL_CALL_FAILED',
      'ROLE_GENERATION_RESPONSE_INVALID',
      'ROLE_GENERATION_PERSISTENCE_FAILED',
    ])
  })
})

describe('FP-13 追踪ID与错误响应契约', () => {
  it('合法X-Request-Id被接收且日志上下文、响应头和响应体一致', async () => {
    const yingYong = jianYingYong()
    let shangXiaWenTrace = ''
    yingYong.get('/trace', (_qingQiu, xiangYing) => {
      shangXiaWenTrace = qingQiuShangXiaWen.getStore()?.trace_id || ''
      shiBaiXiangYing(xiangYing, 400, '不会被采用', CUO_WU_DAI_MA.REQUEST_PARAMETER_INVALID)
    })
    const traceId = 'request-0123456789abcdef'
    const xiangYing = await request(yingYong).get('/trace').set('X-Request-Id', traceId)
    expect(xiangYing.status).toBe(400)
    expect(xiangYing.headers['x-request-id']).toBe(traceId)
    expect(xiangYing.body.traceId).toBe(traceId)
    expect(shangXiaWenTrace).toBe(traceId)
  })

  it.each(['bad', 'a'.repeat(129), 'has space 0123456789', 'has/slash0123456789'])(
    '非法X-Request-Id被替换为高熵ID：%s',
    async (header) => {
      const yingYong = jianYingYong()
      yingYong.get('/trace', (_qingQiu, xiangYing) => {
        shiBaiXiangYing(xiangYing, 404, '不会采用', CUO_WU_DAI_MA.RESOURCE_NOT_FOUND)
      })
      const xiangYing = await request(yingYong).get('/trace').set('X-Request-Id', header)
      expect(xiangYing.headers['x-request-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      expect(xiangYing.body.traceId).toBe(xiangYing.headers['x-request-id'])
    },
  )

  it('未知异常脱敏并返回稳定内部错误语义', async () => {
    const yingYong = jianYingYong()
    yingYong.get('/boom', () => {
      throw new Error('SELECT * FROM 用户 password=super-secret token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature API_KEY=raw-key D:\\secret\\server.ts')
    })
    yingYong.use(全YuZhanCuoWuChuLi)
    const xiangYing = await request(yingYong).get('/boom').set('X-Request-Id', 'request-0123456789abcdef')
    const wenBen = JSON.stringify(xiangYing.body)
    expect(xiangYing.status).toBe(500)
    expect(xiangYing.body).toMatchObject({
      cheng_gong: false,
      code: CUO_WU_DAI_MA.INTERNAL_ERROR,
      message: '这次操作没有完成，当前内容可能仍是上次结果',
      traceId: 'request-0123456789abcdef',
      retryable: false,
    })
    expect(wenBen).not.toMatch(/SELECT|super-secret|eyJ|raw-key|D:\\|server\.ts|API_KEY/)
  })

  it('畸形JSON与超大请求分别返回400和413契约', async () => {
    const yingYong = jianYingYong()
    yingYong.use(express.json({ limit: '32b' }))
    yingYong.post('/body', (_qingQiu, xiangYing) => {
      shiBaiXiangYing(xiangYing, 200, '成功')
    })
    yingYong.use(全YuZhanCuoWuChuLi)
    const malformed = await request(yingYong).post('/body').set('Content-Type', 'application/json').send('{"a":')
    expect(malformed.status).toBe(400)
    expect(malformed.body.code).toBe(CUO_WU_DAI_MA.REQUEST_BODY_INVALID)
    const tooLarge = await request(yingYong).post('/body').send({ a: 'x'.repeat(64) })
    expect(tooLarge.status).toBe(413)
    expect(tooLarge.body.code).toBe(CUO_WU_DAI_MA.PAYLOAD_TOO_LARGE)
  })

  it('401、403、404、409、429与5xx语义及重试标志稳定', async () => {
    const cases: Array<[CuoWuDaiMa, number, boolean]> = [
      [CUO_WU_DAI_MA.AUTHENTICATION_REQUIRED, 401, false],
      [CUO_WU_DAI_MA.PERMISSION_DENIED, 403, false],
      [CUO_WU_DAI_MA.RESOURCE_NOT_FOUND, 404, false],
      [CUO_WU_DAI_MA.RESOURCE_CONFLICT, 409, false],
      [CUO_WU_DAI_MA.RATE_LIMITED, 429, true],
      [CUO_WU_DAI_MA.INTERNAL_ERROR, 500, false],
      [CUO_WU_DAI_MA.UPSTREAM_NETWORK_ERROR, 502, true],
      [CUO_WU_DAI_MA.SERVICE_UNAVAILABLE, 503, true],
      [CUO_WU_DAI_MA.UPSTREAM_TIMEOUT, 504, true],
    ]
    for (const [daiMa, zhuangTaiMa, retryable] of cases) {
      const yingYong = jianYingYong()
      yingYong.get('/error', (_qingQiu, xiangYing) => {
        shiBaiXiangYing(xiangYing, zhuangTaiMa, '不会采用', daiMa)
      })
      const xiangYing = await request(yingYong).get('/error')
      expect(xiangYing.status).toBe(zhuangTaiMa)
      expect(xiangYing.body.code).toBe(daiMa)
      expect(xiangYing.body.retryable).toBe(retryable)
      expect(xiangYing.body.message).toBe(huoQuCuoWuXianRong(daiMa).message)
      expect(xiangYing.body.traceId).toBe(xiangYing.headers['x-request-id'])
    }
  })

  it('可选重试时间与字段错误只输出安全白名单', async () => {
    const yingYong = jianYingYong()
    yingYong.get('/field', (_qingQiu, xiangYing) => {
      shiBaiXiangYing(xiangYing, 400, '不会采用', CUO_WU_DAI_MA.REQUEST_PARAMETER_INVALID, {
        retryAfterMs: 2500,
        fieldErrors: {
          username: '用户名不合法',
          password: '不得输出',
          internalSql: 'SELECT 1',
        } as never,
      })
    })
    const xiangYing = await request(yingYong).get('/field')
    expect(xiangYing.body.retryAfterMs).toBe(2500)
    expect(xiangYing.body.fieldErrors).toEqual({ username: '用户名不合法' })
  })
})
