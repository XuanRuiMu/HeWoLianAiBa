import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 令牌键, 刷新令牌ID键 } from '@/constants/auth'

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

    localStorage.clear()
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
    localStorage.setItem(令牌键, 'guo-qi-ling-pai')
    localStorage.setItem(刷新令牌ID键, 'yong-hu-1:shua-xin-id')
    yuanShengPost.mockResolvedValue({
      data: { cheng_gong: true, shu_ju: { 令牌: 'xin-ling-pai', 刷新令牌: 'xin-shua', 刷新令牌ID: 'yong-hu-1:xin-id' } },
    })
    shiLiHanShu.mockResolvedValue({ data: { cheng_gong: true, shu_ju: {} } })

    const jieGuo = await errorHandler!(chuangJian401())
    expect(yuanShengPost).toHaveBeenCalledWith('/api/认证/刷新', { refreshToken: 'yong-hu-1:shua-xin-id' }, { timeout: 10000 })
    expect(localStorage.getItem(令牌键)).toBe('xin-ling-pai')
    expect(shiLiHanShu).toHaveBeenCalledTimes(1)
    const zhongFang = shiLiHanShu.mock.calls[0][0] as { headers: Record<string, string> }
    expect(zhongFang.headers.Authorization).toBe('Bearer xin-ling-pai')
    expect(清空用户状态).not.toHaveBeenCalled()
    expect(routerPush).not.toHaveBeenCalled()
    expect(jieGuo).toEqual({ data: { cheng_gong: true, shu_ju: {} } })
  })

  it('无刷新凭证时走原有登出流程', async () => {
    localStorage.setItem(令牌键, 'guo-qi-ling-pai')
    await expect(errorHandler!(chuangJian401())).rejects.toMatchObject({ message: '未授权' })
    expect(yuanShengPost).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(清空用户状态).toHaveBeenCalled())
    expect(routerPush).toHaveBeenCalledTimes(1)
  })

  it('认证接口自身401不触发刷新', async () => {
    localStorage.setItem(令牌键, 'guo-qi-ling-pai')
    localStorage.setItem(刷新令牌ID键, 'yong-hu-1:shua-xin-id')
    await expect(errorHandler!(chuangJian401('/认证/登录'))).rejects.toMatchObject({ message: '未授权' })
    expect(yuanShengPost).not.toHaveBeenCalled()
  })

  it('刷新失败时走原有登出流程', async () => {
    localStorage.setItem(令牌键, 'guo-qi-ling-pai')
    localStorage.setItem(刷新令牌ID键, 'yong-hu-1:shua-xin-id')
    yuanShengPost.mockRejectedValue(new Error('wang-luo-duan-kai'))
    await expect(errorHandler!(chuangJian401())).rejects.toMatchObject({ message: '未授权' })
    await vi.waitFor(() => expect(清空用户状态).toHaveBeenCalled())
    expect(routerPush).toHaveBeenCalledTimes(1)
  })
})
