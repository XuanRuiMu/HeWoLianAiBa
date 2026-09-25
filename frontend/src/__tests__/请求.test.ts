import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'
import { huoQuFanYi } from '@/config/translations'

describe('请求拦截器', () => {
  let successHandler: ((response: { data: unknown }) => unknown) | null = null
  let errorHandler: ((error: unknown) => unknown) | null = null
  let routerPush: ReturnType<typeof vi.fn>
  let 清空用户状态: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    successHandler = null
    errorHandler = null
    routerPush = vi.fn()
    清空用户状态 = vi.fn()

    vi.doMock('axios', () => ({
      default: {
        create: vi.fn(() => ({
          interceptors: {
            request: { use: vi.fn() },
            response: {
              use: (
                success: (response: { data: unknown }) => unknown,
                error: (err: unknown) => unknown,
              ) => {
                successHandler = success
                errorHandler = error
              },
            },
          },
        })),
        isAxiosError: vi.fn(
          (value: unknown) => (value as { isAxiosError?: boolean }).isAxiosError === true,
        ),
      },
    }))
    // D-6：401 走 router.push 带 redirect，并清理 Pinia 用户态
    vi.doMock('@/router', () => ({ default: { push: routerPush } }))
    vi.doMock('@/stores/用户', () => ({
      使用用户仓库: () => Promise.resolve({ 清空用户状态 }),
    }))

    await import('@/api/请求')
  })

  function createAxiosError(status: number, data: unknown) {
    return {
      isAxiosError: true,
      response: { status, data },
    }
  }

  it('2xx 响应中 cheng_gong=false 时抛出归一后的业务错误（不回显后端原文）', async () => {
    const response = {
      data: {
        cheng_gong: false,
        shu_ju: null,
        ti_shi: '缺少必要参数',
        cuo_wu_ma: 'QUE_SHAO_CAN_SHU',
      },
    }

    const cuoWu = await successHandler!(response).catch((error: unknown) => error)
    expect(cuoWu).toMatchObject({
      name: 'QianTaiCuoWu',
      code: QIAN_TAI_DAI_MA.WEI_ZHI,
      jiuDaiMa: 'QUE_SHAO_CAN_SHU',
    })
    expect((cuoWu as Error).message).not.toContain('缺少必要参数')
  })

  it('白名单内的缺少参数码归一为请求参数类稳定码', async () => {
    const response = {
      data: {
        cheng_gong: false,
        shu_ju: null,
        ti_shi: '缺少必要参数',
        cuo_wu_ma: 'CAN_SHU_CUO_WU',
      },
    }

    const cuoWu = await successHandler!(response).catch((error: unknown) => error)
    expect(cuoWu).toMatchObject({
      name: 'QianTaiCuoWu',
      code: QIAN_TAI_DAI_MA.REQUEST_PARAMETER_INVALID,
    })
    expect((cuoWu as Error).message).toBe(huoQuFanYi('tongYong', 'qingQiuWenTiYingXiang'))
  })

  it('2xx 业务失败归一为 FP-14 模型并完整保留 FP-13 包络', async () => {
    const response = {
      data: {
        cheng_gong: false,
        shu_ju: null,
        ti_shi: '内部 SQL /srv/app/server.js',
        cuo_wu_ma: 'AUTH_INVALID_CREDENTIALS',
        code: 'AUTH_INVALID_CREDENTIALS',
        message: '内部 SQL /srv/app/server.js',
        traceId: 'request-0123456789abcdef',
        retryable: false,
      },
    }

    const cuoWu = await successHandler!(response).catch((error: unknown) => error)
    expect(cuoWu).toMatchObject({
      name: 'QianTaiCuoWu',
      code: QIAN_TAI_DAI_MA.AUTH_INVALID_CREDENTIALS,
      traceId: 'request-0123456789abcdef',
      retryable: false,
      houTaiBaoFeng: {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: '内部 SQL /srv/app/server.js',
        traceId: 'request-0123456789abcdef',
        retryable: false,
      },
    })
    expect((cuoWu as Error).message).not.toContain('SQL')
    expect((cuoWu as Error).message).not.toContain('/srv/app')
  })

  it('409 状态码归一为冲突类稳定码，错误实例不再回显后端原文', async () => {
    const error = createAxiosError(409, {
      cheng_gong: false,
      shu_ju: null,
      ti_shi: '军师重复',
      cuo_wu_ma: 'JUN_SHI_CHONG_FU',
    })

    const cuoWu = await errorHandler!(error).catch((cuo: unknown) => cuo)
    expect(cuoWu).toMatchObject({
      name: 'QianTaiCuoWu',
      code: QIAN_TAI_DAI_MA.JUN_SHI_CHONG_FU,
      cuo_wu_ma: QIAN_TAI_DAI_MA.JUN_SHI_CHONG_FU,
      httpStatus: 409,
    })
    expect((cuoWu as Error).message).not.toContain('军师重复')
  })

  it('500 状态码保留白名单业务码与后端包络，界面文案走安全分类', async () => {
    const error = createAxiosError(500, {
      cheng_gong: false,
      shu_ju: null,
      ti_shi: '服务器内部错误',
      cuo_wu_ma: 'FU_WU_QI_NEI_BU_CUO_WU',
    })

    const cuoWu = await errorHandler!(error).catch((cuo: unknown) => cuo)
    expect(cuoWu).toMatchObject({
      name: 'QianTaiCuoWu',
      code: QIAN_TAI_DAI_MA.WEI_ZHI,
      jiuDaiMa: 'FU_WU_QI_NEI_BU_CUO_WU',
      httpStatus: 500,
    })
    expect((cuoWu as Error).message).toBe(huoQuFanYi('tongYong', 'tongYongWenTiYingXiang'))
    expect((cuoWu as Error).message).not.toContain('服务器内部错误')
  })

  it('401 状态码清空令牌并跳转登录页', async () => {
    sessionStorage.setItem('令牌', 'test-token')
    sessionStorage.setItem('令牌', 'session-token')

    const error = createAxiosError(401, {
      cheng_gong: false,
      shu_ju: null,
      ti_shi: '未授权，请先登录',
      cuo_wu_ma: 'WEI_SHOU_QUAN',
    })

    const cuoWu = await errorHandler!(error).catch((cuo: unknown) => cuo)
    expect(cuoWu).toMatchObject({
      name: 'QianTaiCuoWu',
      code: QIAN_TAI_DAI_MA.AUTHENTICATION_REQUIRED,
      httpStatus: 401,
    })
    expect((cuoWu as Error).message).not.toContain('未授权')
    // D-6：本地令牌清理 + Pinia 用户态清理 + router.push 携带 redirect
    // 清理走动态 import 的微任务链，先冲刷微任务再断言
    await vi.waitFor(() => expect(清空用户状态).toHaveBeenCalled())
    expect(sessionStorage.getItem('令牌')).toBeNull()
    expect(sessionStorage.getItem('令牌')).toBeNull()
    expect(routerPush).toHaveBeenCalledTimes(1)
    expect(routerPush).toHaveBeenCalledWith({
      path: '/login',
      query: { redirect: expect.any(String) },
    })
  })

  it('401 时已在登录页则不重复跳转', async () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/login', search: '', href: '' },
      writable: true,
      configurable: true,
    })

    const error = createAxiosError(401, {
      cheng_gong: false,
      shu_ju: null,
      ti_shi: '未授权，请先登录',
      cuo_wu_ma: 'WEI_SHOU_QUAN',
    })

    await expect(errorHandler!(error)).rejects.toMatchObject({
      name: 'QianTaiCuoWu',
      code: QIAN_TAI_DAI_MA.AUTHENTICATION_REQUIRED,
    })
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('会话认证接口 401 清空已有会话', async () => {
    sessionStorage.setItem('令牌', 'valid-token')
    const error = {
      ...createAxiosError(401, { ti_shi: '令牌无效' }),
      config: { url: '/认证/信息', headers: {} },
    }

    await expect(errorHandler!(error)).rejects.toBeDefined()
    await vi.waitFor(() => expect(清空用户状态).toHaveBeenCalled())
    expect(sessionStorage.getItem('令牌')).toBeNull()
  })

  it('认证接口 401 不清空已有会话', async () => {
    sessionStorage.setItem('令牌', 'valid-token')
    const error = {
      ...createAxiosError(401, { ti_shi: '账号或密码错误' }),
      config: {
        url: '/认证/登录',
        headers: { Authorization: 'Bearer valid-token' },
      },
    }

    await expect(errorHandler!(error)).rejects.toBeDefined()
    await Promise.resolve()
    expect(清空用户状态).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('令牌')).toBe('valid-token')
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('旧请求 401 晚到时不清理新会话', async () => {
    sessionStorage.setItem('令牌', 'new-token')
    const error = {
      ...createAxiosError(401, { ti_shi: '令牌失效' }),
      config: {
        url: '/用户/资料',
        headers: { Authorization: 'Bearer old-token' },
      },
    }

    await expect(errorHandler!(error)).rejects.toBeDefined()
    await Promise.resolve()
    expect(清空用户状态).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('令牌')).toBe('new-token')
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('非 axios 错误也归一为稳定码，原文不上屏', async () => {
    const error = new Error('网络断开')

    const cuoWu = await errorHandler!(error).catch((cuo: unknown) => cuo)
    expect(cuoWu).toMatchObject({ name: 'QianTaiCuoWu', code: QIAN_TAI_DAI_MA.WEI_ZHI })
    expect((cuoWu as Error).message).not.toContain('网络断开')
  })
})
