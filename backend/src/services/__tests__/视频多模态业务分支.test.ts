import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  redis: { incr: vi.fn(), expire: vi.fn(), decr: vi.fn() },
  debug: { warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import { huoQuDuoMoTaiPeiZhi } from '../../config/多模态配置'
import {
  gouJianShiPinKeDuWenBen,
  huiTuiShiPinPeiE,
  jianChaShiPinPeiE,
  sheZhiShengShiPinMock,
  shengChengShiPin,
  shiShiPinMIME,
  shiShiPinWenJian,
  yanZhengShiPinTiShiCi,
} from '../视频多模态'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('SHI_PIN_SHENG_CHENG_QI_YONG', 'true')
  vi.stubEnv('SHI_PIN_SHENG_CHENG_API_MI_YAO', 'test-key')
  vi.stubEnv('SHI_PIN_SHENG_CHENG_MO_XING', 'test-model')
  vi.stubEnv('SHI_PIN_SHENG_CHENG_JI_CHU_URL', 'http://127.0.0.1:9/v1/')
  vi.stubEnv('MEI_RI_SHENG_CHENG_SHANG_XIAN', '2')
  vi.stubEnv('SHI_PIN_TI_SHI_CI_ZUI_DA_ZI_FU', '10')
  假.redis.incr.mockResolvedValue(1)
  假.redis.expire.mockResolvedValue(1)
  假.redis.decr.mockResolvedValue(0)
  sheZhiShengShiPinMock(null)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('视频多模态业务分支', () => {
  it('识别视频格式并构造撤回、画面、声音和边界文案', () => {
    expect(shiShiPinMIME('VIDEO/MP4')).toBe(true)
    expect(shiShiPinMIME('audio/mp4')).toBe(false)
    expect(shiShiPinWenJian(null, 'a.MOV')).toBe(true)
    expect(shiShiPinWenJian('video/webm', 'a.txt')).toBe(true)
    expect(shiShiPinWenJian(null, 'a.txt')).toBe(false)
    expect(gouJianShiPinKeDuWenBen({ yiCheHui: true })).toBe('[用户撤回了一个视频]')
    expect(gouJianShiPinKeDuWenBen({ wenJianMing: '  片段  ', shiChangHaoMiao: 1500, huaMianMiaoShu: '画面', zhuanXieWenBen: '声音' })).toBe('[视频：片段，2秒][画面：画面][声音转写：声音]')
    expect(gouJianShiPinKeDuWenBen({ wenJianMing: '片段', shiChangHaoMiao: 0, huaMianMiaoShu: '', zhuanXieWenBen: '' })).toBe('[视频：片段]')
    expect(gouJianShiPinKeDuWenBen({ wenJianMing: '片段', shiChangHaoMiao: Number.NaN })).toBe('[视频：片段]')
  })

  it('提示词校验、mock 短路和配置不可用路径', async () => {
    expect(yanZhengShiPinTiShiCi('  你好  ')).toEqual({ heFa: true, qingXiHou: '你好' })
    expect(yanZhengShiPinTiShiCi(null)).toMatchObject({ heFa: false, qingXiHou: '' })
    const mock = vi.fn(async () => ({ cheng_gong: true, shiPinZiJie: Buffer.from('x'), mime: 'video/mp4' }))
    sheZhiShengShiPinMock(mock)
    await expect(shengChengShiPin({ tiShiCi: '提示', yongHuId: '用户' })).resolves.toMatchObject({ cheng_gong: true })
    expect(mock).toHaveBeenCalledWith({ tiShiCi: '提示', yongHuId: '用户' })
    sheZhiShengShiPinMock(null)
    await expect(shengChengShiPin({ tiShiCi: '', yongHuId: '用户' })).resolves.toMatchObject({ cheng_gong: false })
    vi.stubEnv('SHI_PIN_SHENG_CHENG_QI_YONG', 'false')
    await expect(shengChengShiPin({ tiShiCi: '提示', yongHuId: '用户' })).resolves.toMatchObject({ cheng_gong: false })
  })

  it('配额和上游提交失败会回补配额并返回翻译文案', async () => {
    vi.stubEnv('SHI_PIN_SHENG_CHENG_QI_YONG', 'true')
    假.redis.incr.mockResolvedValueOnce(3)
    await expect(shengChengShiPin({ tiShiCi: '提示', yongHuId: '限额' })).resolves.toMatchObject({ cheng_gong: false })
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(shengChengShiPin({ tiShiCi: '提示', yongHuId: '状态失败' })).resolves.toMatchObject({ cheng_gong: false })
    expect(假.redis.decr).toHaveBeenCalled()
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    await expect(shengChengShiPin({ tiShiCi: '提示', yongHuId: '无任务' })).resolves.toMatchObject({ cheng_gong: false })
    fetchMock.mockRejectedValueOnce(new Error('网络错误'))
    await expect(shengChengShiPin({ tiShiCi: '提示', yongHuId: '网络失败' })).resolves.toMatchObject({ cheng_gong: false })
  })

  it('Redis 故障时使用进程内配额，回补可恢复一次', async () => {
    假.redis.incr.mockRejectedValue(new Error('redis down'))
    假.redis.decr.mockRejectedValue(new Error('redis down'))
    vi.stubEnv('MEI_RI_SHENG_CHENG_SHANG_XIAN', '1')
    expect(huoQuDuoMoTaiPeiZhi().meiRiShengChengShangXian).toBe(1)
    const 用户 = `视频内存-${Date.now()}-${Math.random()}`
    await expect(jianChaShiPinPeiE(用户)).resolves.toEqual({ yunXu: true })
    await expect(jianChaShiPinPeiE(用户)).resolves.toEqual({ yunXu: true })
    await huiTuiShiPinPeiE(用户)
    await expect(jianChaShiPinPeiE(用户)).resolves.toEqual({ yunXu: true })
  })
})
