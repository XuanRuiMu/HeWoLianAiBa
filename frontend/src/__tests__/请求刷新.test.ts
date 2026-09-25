import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 令牌键, 刷新令牌ID键 } from '@/constants/auth'
import { QIAN_TAI_DAI_MA } from '@/config/前台错误码'

describe('401静默刷新', () => {
  let errorHandler: ((error: unknown) => unknown) | null = null
  let routerPush: ReturnType<typeof vi.fn>
  let 清空用户状态: ReturnType<typeof vi.fn>
  let yuanShengPost: ReturnType<typeof vi.fn>
  let shiLiHanShu: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()
    errorHandler = null
    routerPush = vi.fn()
    清空用户状态 = vi.fn()
    yuanShengPost = vi.fn()
    shiLiHanShu = vi.fn()

    vi.doMock('axios', () => {
      const mockShiLi = Object.assign(shiLiHanShu, {
        interceptors: {
          request: { use: vi.fn() },
          response: {
            use: (
              _success: (response: { data: unknown }) => unknown,
              error: (err: unknown) => unknown,
            ) => {
              errorHandler = error
            },
          },
        },
        get: vi.fn(),
        post: vi.fn(),
      })
      return {
        default: Object.assign(
          {
            create: vi.fn(() => mockShiLi),
            isAxiosError: (value: unknown) => (value as { isAxiosError?: boolean }).isAxiosError === true,
          },
          { post: yuanShengPost },
        ),
      }
    })
    vi.doMock('@/router', () => ({ default: { push: routerPush } }))
    vi.doMock('@/stores/用户', () => ({
      使用用户仓库: () => Promise.resolve({ 清空用户状态 }),
    }))

    sessionStorage.clear()
    sessionStorage.clear()
    await import('@/api/请求')
  })

  function chuangJian401(url = '/好友/列表') {
    return {
      isAxiosError: true,
      response: { status: 401, data: { cheng_gong: false, ti_shi: '未授权' } },
      config: { url, headers: {} as Record<string, string> },
    }
  }

  it('有刷新凭证时静默刷新并重放原请求，不跳转', async () => {
    sessionStorage.setItem(令牌键, 'guo-qi-ling-pai')
    sessionStorage.setItem(刷新令牌ID键, 'yong-hu-1:shua-xin-id')
    yuanShengPost.mockResolvedValue({
      data: { cheng_gong: true, shu_ju: { 令牌: 'xin-ling-pai', 刷新令牌: 'xin-shua', 刷新令牌ID: 'yong-hu-1:xin-id' } },
    })
    shiLiHanShu.mockResolvedValue({ data: { cheng_gong: true, shu_ju: {} } })

    const jieGuo = await errorHandler!(chuangJian401())
    expect(yuanShengPost).toHaveBeenCalledWith('/api/认证/刷新', { refreshToken: 'yong-hu-1:shua-xin-id' }, { timeout: 10000 })
    expect(sessionStorage.getItem(令牌键)).toBe('xin-ling-pai')
    expect(shiLiHanShu).toHaveBeenCalledTimes(1)
    const zhongFang = shiLiHanShu.mock.calls[0][0] as { headers: Record<string, string> }
    expect(zhongFang.headers.Authorization).toBe('Bearer xin-ling-pai')
    expect(清空用户状态).not.toHaveBeenCalled()
    expect(routerPush).not.toHaveBeenCalled()
    expect(jieGuo).toEqual({ data: { cheng_gong: true, shu_ju: {} } })
  })

  it('刷新响应晚到且会话已更换时不写回旧令牌', async () => {
    sessionStorage.setItem(令牌键, 'old-token')
    sessionStorage.setItem(刷新令牌ID键, 'old-refresh')
    let jieShou!: (zhi: unknown) => void
    yuanShengPost.mockReturnValue(
      new Promise((resolve) => {
        jieShou = resolve
      }),
    )
    const task = errorHandler!({
      ...chuangJian401(),
      config: { url: '/好友/列表', headers: { Authorization: 'Bearer old-token' } },
    })
    sessionStorage.setItem(令牌键, 'new-token')
    sessionStorage.setItem(刷新令牌ID键, 'new-refresh')
    jieShou({
      data: { cheng_gong: true, shu_ju: { 令牌: 'late-token', 刷新令牌ID: 'late-refresh' } },
    })

    await expect(task).rejects.toMatchObject({ name: 'QianTaiCuoWu', code: QIAN_TAI_DAI_MA.AUTHENTICATION_REQUIRED })
    expect(sessionStorage.getItem(令牌键)).toBe('new-token')
    expect(sessionStorage.getItem(刷新令牌ID键)).toBe('new-refresh')
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('无刷新凭证时走原有登出流程', async () => {
    sessionStorage.setItem(令牌键, 'guo-qi-ling-pai')
    await expect(errorHandler!(chuangJian401())).rejects.toMatchObject({ name: 'QianTaiCuoWu', code: QIAN_TAI_DAI_MA.AUTHENTICATION_REQUIRED })
    expect(yuanShengPost).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(清空用户状态).toHaveBeenCalled())
    expect(routerPush).toHaveBeenCalledTimes(1)
  })

  it('认证接口自身401不触发刷新', async () => {
    sessionStorage.setItem(令牌键, 'guo-qi-ling-pai')
    sessionStorage.setItem(刷新令牌ID键, 'yong-hu-1:shua-xin-id')
    await expect(errorHandler!(chuangJian401('/认证/登录'))).rejects.toMatchObject({ name: 'QianTaiCuoWu', code: QIAN_TAI_DAI_MA.AUTHENTICATION_REQUIRED })
    expect(yuanShengPost).not.toHaveBeenCalled()
  })

  it('刷新失败时走原有登出流程', async () => {
    sessionStorage.setItem(令牌键, 'guo-qi-ling-pai')
    sessionStorage.setItem(刷新令牌ID键, 'yong-hu-1:shua-xin-id')
    yuanShengPost.mockRejectedValue(new Error('wang-luo-duan-kai'))
    await expect(errorHandler!(chuangJian401())).rejects.toMatchObject({ name: 'QianTaiCuoWu', code: QIAN_TAI_DAI_MA.AUTHENTICATION_REQUIRED })
    await vi.waitFor(() => expect(清空用户状态).toHaveBeenCalled())
    expect(routerPush).toHaveBeenCalledTimes(1)
  })
})
