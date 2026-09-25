import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  redis: { incr: vi.fn(), expire: vi.fn(), decr: vi.fn() },
  debug: { warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import { huiTuiShengTuPeiE, jianChaShengTuPeiE, sheZhiShengTuMock, shengChengTuXiang, yanZhengShengTuTiShiCi } from '../图像生成'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('TU_XIANG_SHENG_CHENG_QI_YONG', 'true')
  vi.stubEnv('TU_XIANG_SHENG_CHENG_API_MI_YAO', 'test-key')
  vi.stubEnv('TU_XIANG_SHENG_CHENG_MO_XING', 'test-model')
  vi.stubEnv('TU_XIANG_SHENG_CHENG_JI_CHU_URL', 'http://127.0.0.1:9/v1/')
  vi.stubEnv('MEI_RI_SHENG_CHENG_SHANG_XIAN', '2')
  vi.stubEnv('SHENG_TU_TI_SHI_CI_ZUI_DA_ZI_FU', '10')
  假.redis.incr.mockResolvedValue(1)
  假.redis.expire.mockResolvedValue(1)
  假.redis.decr.mockResolvedValue(0)
  sheZhiShengTuMock(null)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('图像生成业务分支', () => {
  it('校验提示词并执行 mock 短路', async () => {
    expect(yanZhengShengTuTiShiCi('  你好世界  ')).toEqual({ heFa: true, qingXiHou: '你好世界' })
    expect(yanZhengShengTuTiShiCi(123)).toMatchObject({ heFa: false, qingXiHou: '' })
    const mock = vi.fn(async () => ({ cheng_gong: true, tuPianZiJie: Buffer.from('x'), mime: 'image/png' }))
    sheZhiShengTuMock(mock)
    await expect(shengChengTuXiang({ tiShiCi: '提示', yongHuId: '用户' })).resolves.toMatchObject({ cheng_gong: true })
    expect(mock).toHaveBeenCalledWith({ tiShiCi: '提示', yongHuId: '用户' })
  })

  it('配额、配置不可用、空结果和上游失败均安全降级', async () => {
    await expect(shengChengTuXiang({ tiShiCi: '', yongHuId: '用户' })).resolves.toMatchObject({ cheng_gong: false })
    vi.stubEnv('TU_XIANG_SHENG_CHENG_QI_YONG', 'false')
    await expect(shengChengTuXiang({ tiShiCi: '提示', yongHuId: '用户' })).resolves.toMatchObject({ cheng_gong: false })
    vi.stubEnv('TU_XIANG_SHENG_CHENG_QI_YONG', 'true')
    假.redis.incr.mockResolvedValueOnce(3)
    await expect(shengChengTuXiang({ tiShiCi: '提示', yongHuId: '限额' })).resolves.toMatchObject({ cheng_gong: false })
  })

  it('真实生成覆盖 b64 成功、无结果回补、非成功和异常', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ b64_json: Buffer.from('图片').toString('base64') }) })
    await expect(shengChengTuXiang({ tiShiCi: '提示', yongHuId: '成功' })).resolves.toMatchObject({ cheng_gong: true, mime: 'image/png' })
    expect(假.redis.incr).toHaveBeenCalled()
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await expect(shengChengTuXiang({ tiShiCi: '提示', yongHuId: '空结果' })).resolves.toMatchObject({ cheng_gong: false })
    expect(假.redis.decr).toHaveBeenCalled()
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 })
    await expect(shengChengTuXiang({ tiShiCi: '提示', yongHuId: '状态失败' })).resolves.toMatchObject({ cheng_gong: false })
    fetchMock.mockRejectedValueOnce(new Error('网络错误'))
    await expect(shengChengTuXiang({ tiShiCi: '提示', yongHuId: '网络失败' })).resolves.toMatchObject({ cheng_gong: false })
  })

  it('Redis 故障时使用进程内日配额，回补同步减少计数', async () => {
    假.redis.incr.mockRejectedValue(new Error('redis down'))
    假.redis.decr.mockRejectedValue(new Error('redis down'))
    const 用户 = `内存-${Date.now()}`
    await expect(jianChaShengTuPeiE(用户)).resolves.toEqual({ yunXu: true })
    await expect(jianChaShengTuPeiE(用户)).resolves.toEqual({ yunXu: true })
    await expect(jianChaShengTuPeiE(用户)).resolves.toEqual({ yunXu: false })
    await huiTuiShengTuPeiE(用户)
    await expect(jianChaShengTuPeiE(用户)).resolves.toEqual({ yunXu: false })
  })
})
