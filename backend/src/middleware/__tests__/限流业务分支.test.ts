import { beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({ ip: vi.fn(() => '1.2.3.4'), duanXin: vi.fn(), gaoJing: vi.fn() }))
vi.mock('../../utils/真实IP', () => ({ huoQuZhenShiIP: 假.ip }))
vi.mock('../../services/短信', () => ({ duanXinRiPeiEYunXu: 假.duanXin }))
vi.mock('../../utils/邮件告警', () => ({ faSongGaoJing: 假.gaoJing }))

import { aiQingQiuXianLiu, changGuiXianLiu, dengLuIPLianLiu, dengLuXianLiu, duanXinRiPeiEZhuJi, faSongMaXianLiu, guanLiCaoZuoXianLiu, jianChaShouJiXianLiu, liaoTianXianLiu, riZhiJieShouXianLiu, shengChengXianLiuJian, zhuCeXianLiu } from '../限流'

beforeEach(() => {
  vi.clearAllMocks()
  假.ip.mockReturnValue('1.2.3.4')
  假.duanXin.mockResolvedValue({ yun_xu: true })
  假.gaoJing.mockResolvedValue(undefined)
})

describe('限流中间件业务分支', () => {
  it('所有限流器在测试环境生成键并放行', async () => {
    const req = { baseUrl: '', path: '/api/普通', body: { shou_ji_hao: '13800138000' }, yong_hu: { yongHuId: '用户' }, headers: {}, socket: {} } as never
    const res = { setHeader: vi.fn(), status: vi.fn(() => ({ json: vi.fn(), send: vi.fn() })) } as never
    const next = vi.fn()
    const limiters = [changGuiXianLiu, dengLuXianLiu, dengLuIPLianLiu, faSongMaXianLiu, liaoTianXianLiu, aiQingQiuXianLiu, guanLiCaoZuoXianLiu, riZhiJieShouXianLiu, jianChaShouJiXianLiu, zhuCeXianLiu]
    for (const limiter of limiters) await limiter(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(shengChengXianLiuJian(req)).toBeTruthy()
  })

  it('短信配额在测试环境直接放行', async () => {
    const next = vi.fn()
    await duanXinRiPeiEZhuJi({} as never, {} as never, next)
    expect(next).toHaveBeenCalledWith()
  })
})
