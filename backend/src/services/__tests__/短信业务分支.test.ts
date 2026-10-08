import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const 假 = vi.hoisted(() => ({
  redis: { get: vi.fn(), setex: vi.fn(), del: vi.fn(), incr: vi.fn(), expire: vi.fn() },
  sendSms: vi.fn(),
  smsClient: vi.fn(function (this: { sendSms: typeof vi.fn }) { this.sendSms = 假.sendSms }),
  smsRequest: vi.fn(function (this: Record<string, unknown>, data: Record<string, unknown>) { Object.assign(this, data) }),
  config: vi.fn(function (this: Record<string, unknown>, data: Record<string, unknown>) { Object.assign(this, data) }),
  mail: { faSongGaoJing: vi.fn(async () => true) },
  debug: { error: vi.fn(), warn: vi.fn() },
}))

vi.mock('../../redis', () => ({ redis: 假.redis }))
vi.mock('@alicloud/dysmsapi20170525', () => ({ default: 假.smsClient, SendSmsRequest: 假.smsRequest }))
vi.mock('@alicloud/openapi-core', () => ({ $OpenApiUtil: { Config: 假.config } }))
vi.mock('../../utils/邮件告警', () => 假.mail)
vi.mock('../../utils/debug日志', () => ({ debug日志: 假.debug }))

import { peiZhi } from '../../config'
import { faSongYanZhengMa, shanChuYanZhengMa, shengChengSuiJiYanZhengMa, duanXinRiPeiEYuLan, duanXinRiPeiEYunXu, yanZhengMaShiFouZhengQue, zhunHuaYanZhengMaYongTu, YAN_ZHENG_MA_YONG_TU } from '../短信'

const 原值 = {
  kaiFaMoShi: peiZhi.kaiFaMoShi,
  duanXin: { ...peiZhi.duanXin },
  yanZhengMa: { ...peiZhi.yanZhengMa },
  duanXinRiPeiE: { ...peiZhi.duanXinRiPeiE },
}

beforeEach(() => {
  vi.clearAllMocks()
  peiZhi.kaiFaMoShi = true
  Object.assign(peiZhi.duanXin, { fangWenMiYaoId: '', fangWenMiYaoMiMa: '', qianMing: '', moBanDaiMa: '' })
  Object.assign(peiZhi.yanZhengMa, { youXiaoQi: 300, faSongJianGe: 60, kaiFaMoShiGuDing: '123456' })
  Object.assign(peiZhi.duanXinRiPeiE, { meiShouJiHaoMeiRi: 1, meiIPMeiRi: 2 })
  假.redis.get.mockResolvedValue(null)
  假.redis.setex.mockResolvedValue('OK')
  假.redis.del.mockResolvedValue(1)
  假.redis.incr.mockResolvedValue(1)
  假.redis.expire.mockResolvedValue(1)
  假.sendSms.mockResolvedValue({ Code: 'OK' })
})

afterEach(() => {
  peiZhi.kaiFaMoShi = 原值.kaiFaMoShi
  Object.assign(peiZhi.duanXin, 原值.duanXin)
  Object.assign(peiZhi.yanZhengMa, 原值.yanZhengMa)
  Object.assign(peiZhi.duanXinRiPeiE, 原值.duanXinRiPeiE)
})

describe('短信业务分支', () => {
  it('生成六位验证码并覆盖频率限制、开发模式和生产配置', async () => {
    expect(shengChengSuiJiYanZhengMa()).toMatch(/^\d{6}$/)
    假.redis.get.mockResolvedValueOnce('1')
    await expect(faSongYanZhengMa('13800138000')).resolves.toMatchObject({ cheng_gong: false, cuo_wu_ma: 'XIAN_LIU' })
    await expect(faSongYanZhengMa('13800138000')).resolves.toEqual({ cheng_gong: true })
    expect(假.redis.setex).toHaveBeenCalledWith('yan_zheng_ma:zhuCe:13800138000', 300, '123456')
    peiZhi.kaiFaMoShi = false
    Object.assign(peiZhi.duanXin, { fangWenMiYaoId: '', fangWenMiYaoMiMa: '', qianMing: '', moBanDaiMa: '' })
    await expect(faSongYanZhengMa('13800138000')).resolves.toMatchObject({ cheng_gong: false, cuo_wu_ma: 'NEI_BU_CUO_WU' })
    Object.assign(peiZhi.duanXin, { fangWenMiYaoId: 'id', fangWenMiYaoMiMa: 'secret', qianMing: '签名', moBanDaiMa: '模板' })
    await expect(faSongYanZhengMa('13800138000')).resolves.toEqual({ cheng_gong: true })
    expect(假.smsClient).toHaveBeenCalled()
    expect(假.sendSms).toHaveBeenCalled()
    假.sendSms.mockRejectedValueOnce(new Error('云端失败'))
    await expect(faSongYanZhengMa('13800138000')).resolves.toMatchObject({ cheng_gong: false, cuo_wu_ma: 'NEI_BU_CUO_WU' })
  })

  it('验证码校验覆盖达到上限、固定码、匹配、错误计数和删除', async () => {
    假.redis.get.mockImplementation(async (key: string) => key.startsWith('yan_zheng_ma_cuowu:') ? '5' : '123456')
    await expect(yanZhengMaShiFouZhengQue('13800138000', '123456')).resolves.toBe(false)
    假.redis.get.mockImplementation(async (key: string) => key.includes('cuowu') ? '0' : null)
    await expect(yanZhengMaShiFouZhengQue('13800138000', '123456')).resolves.toBe(true)
    假.redis.get.mockImplementation(async (key: string) => key.includes('cuowu') ? '0' : '123456')
    await expect(yanZhengMaShiFouZhengQue('13800138000', '123456')).resolves.toBe(true)
    expect(假.redis.del).toHaveBeenCalledWith('yan_zheng_ma_cuowu:zhuCe:13800138000')
    假.redis.get.mockImplementation(async (key: string) => key.includes('cuowu') ? '0' : '123456')
    await expect(yanZhengMaShiFouZhengQue('13800138000', '654321')).resolves.toBe(false)
    expect(假.redis.incr).toHaveBeenCalledWith('yan_zheng_ma_cuowu:zhuCe:13800138000')
    假.redis.incr.mockResolvedValue(5)
    await expect(yanZhengMaShiFouZhengQue('13800138000', '654321')).resolves.toBe(false)
    expect(假.redis.del).toHaveBeenCalledWith('yan_zheng_ma:zhuCe:13800138000')
    // 不传用途时清全部用途：注销场景只清一半的话，留下的重置码还能继续用
    await shanChuYanZhengMa('13800138000')
    expect(假.redis.del).toHaveBeenCalledWith('yan_zheng_ma:zhuCe:13800138000')
    expect(假.redis.del).toHaveBeenCalledWith('yan_zheng_ma:chongZhiMiMa:13800138000')
  })

  it('验证码按用途隔离：注册码不能用于重置密码，反之亦然', async () => {
    假.redis.get.mockImplementation(async (key: string) => {
      if (key.includes('cuowu')) return '0'
      return key.includes('yan_zheng_ma:zhuCe:') ? '123456' : null
    })
    await expect(yanZhengMaShiFouZhengQue('13800138000', '123456')).resolves.toBe(true)
    await expect(
      yanZhengMaShiFouZhengQue('13800138000', '123456', YAN_ZHENG_MA_YONG_TU.chongZhiMiMa),
    ).resolves.toBe(false)

    假.redis.get.mockImplementation(async (key: string) => {
      if (key.includes('cuowu')) return '0'
      return key.includes('yan_zheng_ma:chongZhiMiMa:') ? '654321' : null
    })
    await expect(
      yanZhengMaShiFouZhengQue('13800138000', '654321', YAN_ZHENG_MA_YONG_TU.chongZhiMiMa),
    ).resolves.toBe(true)
    await expect(yanZhengMaShiFouZhengQue('13800138000', '654321')).resolves.toBe(false)
  })

  it('发码按用途分键存放，且开发模式固定码不跨用途放行', async () => {
    await faSongYanZhengMa('13800138000', YAN_ZHENG_MA_YONG_TU.chongZhiMiMa)
    expect(假.redis.setex).toHaveBeenCalledWith('yan_zheng_ma:chongZhiMiMa:13800138000', 300, '123456')

    假.redis.get.mockImplementation(async (key: string) => (key.includes('cuowu') ? '0' : null))
    await expect(yanZhengMaShiFouZhengQue('13800138000', '123456')).resolves.toBe(true)
    await expect(
      yanZhengMaShiFouZhengQue('13800138000', '123456', YAN_ZHENG_MA_YONG_TU.chongZhiMiMa),
    ).resolves.toBe(false)
  })

  it('用途白名单归一：伪造用途一律按注册处理，不得凭空造出新用途', () => {
    expect(zhunHuaYanZhengMaYongTu('chongZhiMiMa')).toBe('chongZhiMiMa')
    expect(zhunHuaYanZhengMaYongTu('zhuCe')).toBe('zhuCe')
    expect(zhunHuaYanZhengMaYongTu(undefined)).toBe('zhuCe')
    expect(zhunHuaYanZhengMaYongTu(' 伪造 ')).toBe('zhuCe')
    expect(zhunHuaYanZhengMaYongTu(123)).toBe('zhuCe')
  })

  it('日配额覆盖手机号/IP上限、只读预检和 Redis 故障降级', async () => {
    假.redis.get.mockImplementation(async (key: string) => key.includes('duan_xin_ip_ri') ? '2' : '0')
    await expect(duanXinRiPeiEYunXu('13800138000', '1.1.1.1')).resolves.toMatchObject({ yun_xu: false })
    await expect(duanXinRiPeiEYuLan('13800138000', '1.1.1.1')).resolves.toMatchObject({ yun_xu: false })
    假.redis.get.mockResolvedValue('0')
    await expect(duanXinRiPeiEYunXu('13800138000', '1.1.1.1')).resolves.toEqual({ yun_xu: true })
    await expect(duanXinRiPeiEYuLan('13800138000', '1.1.1.1')).resolves.toEqual({ yun_xu: true })
    假.redis.get.mockRejectedValue(new Error('redis down'))
    await expect(duanXinRiPeiEYunXu('13800138000', '1.1.1.1')).resolves.toEqual({ yun_xu: true })
    await expect(duanXinRiPeiEYuLan('13800138000', '1.1.1.1')).resolves.toEqual({ yun_xu: true })
    expect(假.mail.faSongGaoJing).toHaveBeenCalled()
  })
})
