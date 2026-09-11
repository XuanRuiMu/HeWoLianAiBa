import { describe, it, expect, vi, beforeEach } from 'vitest'

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

  it('2xx 响应中 cheng_gong=false 时抛出中文业务错误', async () => {
    const response = {
      data: {
        cheng_gong: false,
        shu_ju: null,
        ti_shi: '缺少必要参数',
        cuo_wu_ma: 'QUE_SHAO_CAN_SHU',
      },
    }

    await expect(successHandler!(response)).rejects.toMatchObject({
      message: '缺少必要参数',
      cuo_wu_ma: 'QUE_SHAO_CAN_SHU',
    })
  })

  it('409 状态码返回中文业务错误，不再使用英文默认消息', async () => {
    const error = createAxiosError(409, {
      cheng_gong: false,
      shu_ju: null,
      ti_shi: '军师重复',
      cuo_wu_ma: 'JUN_SHI_CHONG_FU',
    })

    await expect(errorHandler!(error)).rejects.toMatchObject({
      message: '军师重复',
      cuo_wu_ma: 'JUN_SHI_CHONG_FU',
    })
  })

  it('500 状态码仍保留业务错误码与中文提示', async () => {
    const error = createAxiosError(500, {
      cheng_gong: false,
      shu_ju: null,
      ti_shi: '服务器内部错误',
      cuo_wu_ma: 'FU_WU_QI_NEI_BU_CUO_WU',
    })

    await expect(errorHandler!(error)).rejects.toMatchObject({
      message: '服务器内部错误',
      cuo_wu_ma: 'FU_WU_QI_NEI_BU_CUO_WU',
    })
  })

  it('401 状态码清空令牌并跳转登录页', async () => {
    localStorage.setItem('令牌', 'test-token')
    sessionStorage.setItem('令牌', 'session-token')

    const error = createAxiosError(401, {
      cheng_gong: false,
      shu_ju: null,
      ti_shi: '未授权，请先登录',
      cuo_wu_ma: 'WEI_SHOU_QUAN',
    })

    await expect(errorHandler!(error)).rejects.toMatchObject({
      message: '未授权，请先登录',
    })
    // D-6：本地令牌清理 + Pinia 用户态清理 + router.push 携带 redirect
    // 清理走动态 import 的微任务链，先冲刷微任务再断言
    await vi.waitFor(() => expect(清空用户状态).toHaveBeenCalled())
    expect(localStorage.getItem('令牌')).toBeNull()
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
      message: '未授权，请先登录',
    })
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('非 axios 错误原样抛出', async () => {
    const error = new Error('网络断开')

    await expect(errorHandler!(error)).rejects.toThrow('网络断开')
  })
})
