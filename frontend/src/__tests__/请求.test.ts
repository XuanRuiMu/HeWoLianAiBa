import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('请求拦截器', () => {
  let successHandler: ((response: { data: unknown }) => unknown) | null = null
  let errorHandler: ((error: unknown) => unknown) | null = null

  beforeEach(async () => {
    vi.resetModules()
    successHandler = null
    errorHandler = null

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
    const hrefSetter = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { pathname: '/', href: '' },
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window.location, 'href', {
      set: hrefSetter,
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
    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(hrefSetter).toHaveBeenCalledWith('/login')
  })

  it('非 axios 错误原样抛出', async () => {
    const error = new Error('网络断开')

    await expect(errorHandler!(error)).rejects.toThrow('网络断开')
  })
})
