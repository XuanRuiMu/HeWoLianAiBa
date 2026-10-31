import { describe, expect, it, vi, beforeEach } from 'vitest'
import { CUO_WU_DAI_MA, dengLiCuoWuXianRongLieBiao, huoQuCuoWuXianRong, shiCuoWuDaiMa } from '../../config/错误码注册表'
import { fanYi } from '../../config/translations'

const yanZhengMaJieGuo = { zhi: '通过' as '通过' | '错误' | '已过期' | '尝试超限' }

vi.mock('../短信', async () => {
  const zhen = await vi.importActual<typeof import('../短信')>('../短信')
  return {
    ...zhen,
    yanZhengMaShiFouZhengQue: vi.fn(async () => yanZhengMaJieGuo.zhi),
    shanChuYanZhengMa: vi.fn(async () => undefined),
  }
})

const { zhuCe, yanZhengMaShiBaiJieGuo, 注册失败错误码: jieXiZhuCeDaiMa } = await import('../认证')

function 基础参数() {
  return {
    shou_ji_hao: '+8613800000001',
    yan_zheng_ma: '123456',
    yong_hu_ming: 'cuoWuYuYi',
    mi_ma: 'XuanRui2026mu',
    tong_yi_xie_yi: true,
    chu_sheng_ri_qi: '2000-01-01',
    ip: '127.0.0.1',
  }
}

function 空库() {
  数据库桩.query.mockImplementation(async (yuJu: unknown) => {
    const wen = String(yuJu)
    if (wen.includes('COUNT(*)')) return { rows: [{ 总数: '0' }] }
    return { rows: [] }
  })
}

const 数据库桩 = vi.hoisted(() => ({
  query: vi.fn(),
}))

vi.mock('../../数据库', () => ({ 数据库: 数据库桩 }))

describe('注册失败原因不再折叠成同一个错误码', () => {
  beforeEach(() => {
    数据库桩.query.mockReset()
  })

  it('验证码错误 / 过期 / 尝试超限各自映射到不同的注册错误码', () => {
    const 码 = (['错误', '已过期', '尝试超限'] as const).map(
      (结果) => jieXiZhuCeDaiMa('CAN_SHU_CUO_WU', yanZhengMaShiBaiJieGuo(结果).juTiYuanYin),
    )
    expect(new Set(码).size).toBe(3)
    expect(码).toEqual([
      CUO_WU_DAI_MA.AUTH_VERIFICATION_CODE_INVALID,
      CUO_WU_DAI_MA.AUTH_VERIFICATION_CODE_EXPIRED,
      CUO_WU_DAI_MA.AUTH_VERIFICATION_CODE_ATTEMPTS_EXCEEDED,
    ])
  })

  it('三者都不是账号已存在，也不是通用参数错误', () => {
    for (const 结果 of ['错误', '已过期', '尝试超限'] as const) {
      const 码 = jieXiZhuCeDaiMa('CAN_SHU_CUO_WU', yanZhengMaShiBaiJieGuo(结果).juTiYuanYin)
      expect(码).not.toBe(CUO_WU_DAI_MA.AUTH_ACCOUNT_ALREADY_EXISTS)
      expect(码).not.toBe(CUO_WU_DAI_MA.REQUEST_PARAMETER_INVALID)
    }
  })

  it('账号已存在与用户名被占用是两条不同的码', () => {
    const 手机号冲突 = jieXiZhuCeDaiMa('CHONG_TU')
    const 用户名冲突 = jieXiZhuCeDaiMa('YONG_HU_MING_CHONG_FU')
    expect(手机号冲突).toBe(CUO_WU_DAI_MA.AUTH_ACCOUNT_ALREADY_EXISTS)
    expect(用户名冲突).toBe(CUO_WU_DAI_MA.AUTH_USERNAME_TAKEN)
    expect(手机号冲突).not.toBe(用户名冲突)
  })

  it('手机号地区不符与密码强度不足是两条不同的码', () => {
    const 地区 = jieXiZhuCeDaiMa('CAN_SHU_CUO_WU', 'SHOU_JI_HAO_DI_QU_BU_FU')
    const 密码 = jieXiZhuCeDaiMa('CAN_SHU_CUO_WU', 'MI_MA_FU_ZA_DU_BU_ZU')
    expect(地区).toBe(CUO_WU_DAI_MA.AUTH_PHONE_NOT_ACCEPTED)
    expect(密码).toBe(CUO_WU_DAI_MA.AUTH_PASSWORD_WEAK)
    expect(地区).not.toBe(密码)
  })

  it('每个新码的 message 都是中文精确原因，且互不相同', () => {
    const 新码 = [
      CUO_WU_DAI_MA.AUTH_VERIFICATION_CODE_INVALID,
      CUO_WU_DAI_MA.AUTH_VERIFICATION_CODE_EXPIRED,
      CUO_WU_DAI_MA.AUTH_VERIFICATION_CODE_ATTEMPTS_EXCEEDED,
      CUO_WU_DAI_MA.AUTH_PHONE_NOT_ACCEPTED,
      CUO_WU_DAI_MA.AUTH_PASSWORD_WEAK,
      CUO_WU_DAI_MA.AUTH_ACCOUNT_ALREADY_EXISTS,
      CUO_WU_DAI_MA.AUTH_USERNAME_TAKEN,
    ] as const
    const 文案 = 新码.map((码) => huoQuCuoWuXianRong(码).message)
    for (const 条 of 文案) {
      expect(条).toMatch(/[\u4e00-\u9fa5]/)
    }
    expect(new Set(文案).size).toBe(新码.length)
  })

  it('验证码错误码的 message 明确含「验证码」，不含通用参数兜底文案', () => {
    const 错误 = huoQuCuoWuXianRong(CUO_WU_DAI_MA.AUTH_VERIFICATION_CODE_INVALID).message
    expect(错误).toContain('验证码')
    expect(错误).not.toBe(fanYi.tongYong.canShuBuHeFa)
    expect(huoQuCuoWuXianRong(CUO_WU_DAI_MA.AUTH_VERIFICATION_CODE_EXPIRED).message).toContain('验证码')
    expect(huoQuCuoWuXianRong(CUO_WU_DAI_MA.AUTH_VERIFICATION_CODE_ATTEMPTS_EXCEEDED).message).toContain('验证码')
  })

  it('服务端依赖不可用的文案明确说明是服务器问题、与账号密码无关', () => {
    for (const 码 of [
      CUO_WU_DAI_MA.DEPENDENCY_POSTGRES_UNAVAILABLE,
      CUO_WU_DAI_MA.DEPENDENCIES_UNAVAILABLE,
      CUO_WU_DAI_MA.SERVICE_UNAVAILABLE,
    ] as const) {
      const 文案 = huoQuCuoWuXianRong(码).message
      expect(文案).toContain('服务器的问题')
      expect(文案).toContain('与你的账号或密码无关')
    }
  })
})

describe('zhuCe 服务层返回可直接定位的原因', () => {
  it('验证码错误时返回验证码专用原因，不再是裸 CAN_SHU_CUO_WU', async () => {
    yanZhengMaJieGuo.zhi = '错误'
    空库()
    const 结果 = await zhuCe(基础参数())
    expect(结果.cheng_gong).toBe(false)
    if (结果.cheng_gong) throw new Error('不应注册成功')
    expect(结果.juTiYuanYin).toBe('YAN_ZHENG_MA_CUO_WU')
    expect(结果.ti_shi).toContain('验证码')
  })

  it('验证码过期与尝试超限给出不同原因与不同文案', async () => {
    yanZhengMaJieGuo.zhi = '已过期'
    空库()
    const 过期 = await zhuCe(基础参数())
    yanZhengMaJieGuo.zhi = '尝试超限'
    const 超限 = await zhuCe(基础参数())
    if (过期.cheng_gong || 超限.cheng_gong) throw new Error('不应注册成功')
    expect(过期.juTiYuanYin).toBe('YAN_ZHENG_MA_GUO_QI')
    expect(超限.juTiYuanYin).toBe('YAN_ZHENG_MA_CHANG_SHI_GUO_DUO')
    expect(过期.ti_shi).not.toBe(超限.ti_shi)
    expect(超限.ti_shi).toContain('重新获取')
  })

  it('密码强度不足给出密码专用原因', async () => {
    空库()
    const 结果 = await zhuCe({ ...基础参数(), mi_ma: 'abc' })
    if (结果.cheng_gong) throw new Error('不应注册成功')
    expect(结果.juTiYuanYin).toBe('MI_MA_FU_ZA_DU_BU_ZU')
    expect(jieXiZhuCeDaiMa(结果.cuo_wu_ma, 结果.juTiYuanYin)).toBe(CUO_WU_DAI_MA.AUTH_PASSWORD_WEAK)
  })
})

describe('注册相关错误码全部登记在注册表里', () => {
  it('前端可依赖的每个新码都在 dengLiCuoWuXianRongLieBiao 中，不存在野生码', () => {
    for (const 码 of [
      'AUTH_VERIFICATION_CODE_INVALID',
      'AUTH_VERIFICATION_CODE_EXPIRED',
      'AUTH_VERIFICATION_CODE_ATTEMPTS_EXCEEDED',
      'AUTH_PHONE_NOT_ACCEPTED',
      'AUTH_ACCOUNT_ALREADY_EXISTS',
      'AUTH_USERNAME_TAKEN',
      'AUTH_USERNAME_INVALID',
      'AUTH_PASSWORD_WEAK',
      'AUTH_BIRTH_DATE_INVALID',
      'AUTH_AGREEMENT_REQUIRED',
      'DEPENDENCY_POSTGRES_UNAVAILABLE',
      'DEPENDENCIES_UNAVAILABLE',
    ]) {
      expect(shiCuoWuDaiMa(码), `${码} 未登记`).toBe(true)
      expect(dengLiCuoWuXianRongLieBiao).toContain(码)
    }
  })
})