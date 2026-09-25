import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), isLevelEnabled: vi.fn(() => true) },
  create: vi.fn(),
  setLevel: vi.fn(),
  close: vi.fn(async () => undefined),
  publish: vi.fn(),
}))

vi.mock('../日志引擎', () => ({ chuangJianRiZhiYinQing: 假.create, sheZhiRiZhiJiBie: 假.setLevel, guanBiRiZhiYinQing: 假.close }))
vi.mock('../日志订阅', () => ({ fenFaRiZhi: 假.publish }))

let api: typeof import('../debug日志')

beforeAll(async () => {
  vi.resetModules()
  api = await import('../debug日志')
})

beforeEach(() => {
  vi.clearAllMocks()
  假.create.mockReturnValue(假.logger)
  假.logger.isLevelEnabled.mockReturnValue(true)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('调试日志业务分支', () => {
  it('写入日志覆盖级别、脱敏、上下文和级别关闭', () => {
    api.sheZhiZuiDiRiZhiJiBie('warn')
    api.xieRuRiZhi('debug', '类型', '{"password":"secret"}', { yong_hu_id: '用户', jiao_se_id: '角色', qing_qiu_id: '请求', xiang_qing: { token: 'secret' } })
    api.xieRuRiZhi('info', '类型', '消息')
    api.xieRuRiZhi('warn', '类型', '消息')
    api.xieRuRiZhi('error', '类型', '消息')
    expect(假.logger.debug).toHaveBeenCalled()
    const 记录 = 假.logger.debug.mock.calls[0]
    const 文本 = JSON.stringify(记录)
    expect(文本).not.toContain('secret')
    expect(文本).toContain('***')
    expect(假.publish).toHaveBeenCalled()
    假.logger.isLevelEnabled.mockReturnValueOnce(false)
    api.xieRuRiZhi('debug', '类型', '消息')
  })

  it('内部错误摘要不会带出密码、JWT、API key或连接串凭据', () => {
    const 摘要 = api.qingLiNeiBuCuoWu(new Error('password=secret token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature API_KEY=raw-key postgresql://user:pass@localhost/db'))
    const 文本 = JSON.stringify(摘要)
    expect(文本).not.toMatch(/secret|eyJ|raw-key|pass@/)
    expect(文本).toContain('***')
  })
  it('请求包装器覆盖所有日志方法并关闭日志流', async () => {
    const 日志 = api.withRequestId('请求', '用户', '角色')
    日志.debug('类型', '消息', { a: 1 })
    日志.info('类型', '消息')
    日志.warn('类型', '消息')
    日志.error('类型', '消息')
    await expect(api.guanBiRiZhiLiu()).resolves.toBeUndefined()
    expect(假.close).toHaveBeenCalled()
  })

  it('HTTP、Socket、AI、好感度、军师、消息和结局日志覆盖输入分支', () => {
    api.jiLuHTTPQingQiu('GET', '/a', 200, 1, '用户')
    api.jiLuHTTPQingQiu('POST', '/b', 404, 1)
    api.jiLuHTTPQingQiu('PUT', '/c', 500, 1)
    const 中间件 = api.chuangJianHTTPRiZhiZhongJianJian()
    const 响应 = { statusCode: 200, on: vi.fn((事件: string, 回调: () => void) => { if (事件 === 'finish') 回调() }) }
    const 下一步 = vi.fn()
    中间件({ method: 'GET', path: '/d', kai_shi_shi_jian: Date.now() - 2 } as never, 响应 as never, 下一步)
    expect(下一步).toHaveBeenCalled()
    api.jiLuSocketShiJian('事件', '用户', { a: 1 })
    api.jiLuAIJiLu('模型', '名称', 2, true)
    api.jiLuAIJiLu('模型', '名称', 2, false, '错误')
    api.jiLuHaoGanDuBianHua('用户', '角色', { a: 1 }, 2)
    api.jiLuJunShiQiuZhu('用户', '角色', true)
    api.jiLuJunShiQiuZhu('用户', '角色', false, '错误')
    api.jiLuYouXiJieJu('用户', '角色', '胜利')
    api.jiLuXiaoXiCaoZuo('发送', '用户', '角色', 'yonghu', { b: 2 })
    expect(假.logger.info).toHaveBeenCalled()
  })
})
