import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('模型路由：仅 magpie 模型池', () => {
  const 原值: Record<string, string | undefined> = {}
  const 键 = ['MAGPIE_MO_XING_CHI', 'MAGPIE_MO_XING_CHI_JI_CHU', 'MAGPIE_MO_XING_CHI_MI_YAO']

  beforeEach(() => {
    for (const k of 键) 原值[k] = process.env[k]
    delete process.env.MAGPIE_MO_XING_CHI
    delete process.env.MAGPIE_MO_XING_CHI_JI_CHU
    delete process.env.MAGPIE_MO_XING_CHI_MI_YAO
    vi.resetModules()
  })

  afterEach(() => {
    for (const k of 键) {
      if (原值[k] === undefined) delete process.env[k]
      else process.env[k] = 原值[k]
    }
    vi.restoreAllMocks()
  })

  it('配置 magpie 模型池时注册池内成员', async () => {
    process.env.MAGPIE_MO_XING_CHI = 'one|1,two|2'
    process.env.MAGPIE_MO_XING_CHI_JI_CHU = 'http://magpie.test'
    process.env.MAGPIE_MO_XING_CHI_MI_YAO = 'magpie-key'
    const debug = await import('../../utils/debug日志')
    const infoSpy = vi.spyOn(debug.debug日志, 'info')
    const { chuShiHuaMoXingLuYou } = await import('../模型路由')
    chuShiHuaMoXingLuYou()
    expect(infoSpy).toHaveBeenCalledWith('模型路由', '已启用对冲模型池', expect.objectContaining({
      xiang_qing: expect.objectContaining({ cheng_yuan_shu: 2 }),
    }))
  })
})
